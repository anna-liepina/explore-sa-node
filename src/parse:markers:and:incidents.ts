import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import orm from './orm';
import {
    OperationMarker,
    createQueue,
    createCSVParser,
    composeMigrationRunner,
    Output,
    Performance,
} from './parse:utils';
import type { IncidentType } from './models/incident';
import type { MarkerType } from './models/marker';
import { MarkerTypeEnum } from './models/marker';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

//@ts-ignore
const { path: _path, sql, dry: dryRun, limit, update } = yargs
    .command('--path', 'absolute path to csvs to parse')
    .option('limit', {
        type: 'number',
        description: 'amount of records in one bulk SQL qeuery',
        default: 10000,
    })
    .option('sql', {
        type: 'boolean',
        description: 'print out SQL queries',
    })
    .option('dry', {
        type: 'boolean',
        description: 'dry run - do not affect a database',
    })
    .option('update', {
        type: 'boolean',
        description: 'flush update [do not drop/restore indexes, useful with small csv files]',
    })
    .help()
    .argv;

console.info(`
--------------------------------------------------
--------------------- CONFIG ---------------------

name\t\tdescription
--path\t\tabsolute path to csv file to parse
--limit\t\tamount of records in one bulk SQL qeuery
--sql\t\tprint out SQL queries
--dry\t\tdry run do not execute SQL
--update\tflush update [do not drop/restore indexes, useful with small csv files]

--------------------------------------------------
database connection info:
host: \t\t${process.env.DB_HOSTNAME}
port: \t\t${process.env.DB_PORT}
database: \t${process.env.DB_NAME}
dialect: \t${process.env.DB_DIALECT}

--------------------------------------------------

files to parse: ${_path}
`);

function scanDirectory(directoryPath: string): string[] {
    const result: string[] = [];
  
    function scanDirRecursive(dir: string): void {
        const files = fs.readdirSync(dir);
  
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
  
            if (stat.isDirectory()) {
                scanDirRecursive(filePath);
            } else {
                result.push(filePath);
            }
        });
    }
  
    scanDirRecursive(directoryPath);
    return result;
}

if (!_path || !fs.existsSync(_path)) {
    console.error(`ERROR: NO PATH TO PARSE OR IT DO NOT EXISTS`);
    console.error(`ensure that you pass file's absolute path using --path=%PATH%`);
    console.error(`example: --path=/media/incidents`);

    process.exit(0);
}

const files = scanDirectory(_path).filter((str) => str.endsWith('.csv'));
if (!files.length) {
    console.error(`ERROR: NO FILES .CSV TO PARSE`);

    process.exit(0);    
}

const logging = !!sql && console.log;
const migrate = composeMigrationRunner(OperationMarker.incidents, orm);
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false });

const output = new Output(` processing ${_path}`);
const performance = new Performance(output);
const conditionIndexDrop = (!dryRun && !update);

(async () => {
    performance.mark();

    output.messageIndexDrop(conditionIndexDrop);
    conditionIndexDrop && await migrate.down();

    let processedInvalidRecords = 0;
    let processedRecords = 0;
    let iter = 0;

    const queue = createQueue();

    performance.mark();

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[1] = output.processingInfo(processedRecords, processedInvalidRecords, incidents.length, queue, final);
    }

    const markersStore: Set<string> = new Set();
    const incidents = [];
    const markers = [];

    output.sections[1] = [
        Output.line,
        ' ✅ fetch postcodes\' | marker\'s | transactions ...',
    ];

    performance.mark();

    await Promise.all([
        orm.Marker.findAll({
            attributes: ['lat', 'lng'],
            where: {
                type: {
                    //@ts-ignore
                    [orm.Sequelize.Op.eq]: MarkerTypeEnum.police
                }
            },
            raw: true,
            logging
        })
            .then((data) => (data as Partial<MarkerType>[]).forEach((v) => markersStore.add(`${v.lat}|${v.lng}`))),
    ]);

    performance.mark();

    const resolveDate = (row: Record<string, string>) => {
        const dateString = row.Month || row.Date;
        const isValidDate = !isNaN(Date.parse(dateString));
    
        return isValidDate ? new Date(dateString).toISOString().split('T')[0] : false;
    }

    const resolveOutcome = (row: Record<string, string>) => {
        const result = row['Last outcome category'];

        if (!result || String(result).toLowerCase() === 'status update unavailable') {
            return undefined;
        }

        return result;
    }

    const resolveType = (row: Record<string, string>) => {
        return row['Crime type'] || [row.Type, row["Object of search"]].filter(Boolean).join(' ');
    }

    performance.mark();
    for await (const [ index, file ] of files.entries() ) {
        output.title = `processing: ${file} (${index + 1} of ${files.length})`; 
        const parser = createCSVParser(file, { columns: true });
 
        for await (const row of parser) {
            const { 
                Longitude: lng,
                Latitude: lat,
                // 'LSOA code': lsoa,
                // 'LSOA name': lsoa,
                Location: label,

                /** will be used later on to generate reports */
                // 'Reported by': creator,
                // 'Falls within': assignee,
            } = row;

            const date = resolveDate(row);

            if (
                !date
                || isNaN(lat) || lat === ''
                || isNaN(lng) || lng === ''
            ) {
                processedInvalidRecords++;
                continue;
            }

            const type = resolveType(row);
            const outcome = resolveOutcome(row);

            const obj: Partial<IncidentType> = {
                date,
                lat,
                lng,
                type,
                outcome
            };

            incidents.push(obj);
            const markerIndex = `${lat}|${lng}`;

            if (!markersStore.has(markerIndex)) {
                markersStore.add(markerIndex);

                markers.push({
                    lat,
                    lng,
                    type: MarkerTypeEnum.police,
                    label
                });
            }

            if (incidents.length === limit) {
                iter++;
                processedRecords += incidents.length;

                queue.add(persist(orm.Marker, [...markers]));
                queue.add(persist(orm.Incident, [...incidents]));

                outputProcessingInfo();
                performance.mark();

                markers.length = 0;
                incidents.length = 0;

                if (queue.size > queue.concurrency) {
                    output.messageCatchUpWithSQLQueue();
    
                    await queue.onEmpty();
                    output.removeLastMessage();
                }
            }
        }
    }

    queue.add(persist(orm.Marker, markers));
    queue.add(persist(orm.Incident, incidents));

    processedRecords += incidents.length;
    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(!dryRun);
    await queue.onEmpty();
    performance.mark();

    output.messageIndexRestore(conditionIndexDrop);
    conditionIndexDrop && await migrate.up();

    performance.mark(0);
    process.exit(0);
})()
