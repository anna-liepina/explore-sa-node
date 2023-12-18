#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yargs from 'yargs';
import csv from 'csv-parse';
import PQueue from 'p-queue';
import orm from './orm';
import { MigrationsDirection, OperationMarker, Output, composeOperation, perfObserver, perfObserver2 } from './parse:utils';
import type { IncidentType } from './models/incident';

const executeMigrations = composeOperation(OperationMarker.incidents, orm);

//@ts-ignore
const { path: _path, sql: logging, dry: dryRun, limit, update } = yargs
    .command('--path', 'absolute path to csvs to parse')
    .option('limit', {
        type: 'number',
        description: 'amount of records in one bulk SQL qeuery',
        default: 10000,
    })
    .option('sql', {
        type: 'boolean',
        description: 'print out SQL queries',
        default: false,
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

const output = new Output(`processing ${_path}`);
perfObserver2(output).observe({ entryTypes: ['measure'], buffered: true });

console.log(`
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

if (!_path) {
    console.log(`>>> PATH NOT PROVIDED`);

    process.exit(0);
}

if (!fs.existsSync(_path)) {
    console.log(`>>> PATH / AREA DO NOT EXITS`);

    process.exit(0);
}

const files = scanDirectory(_path).filter((str) => str.endsWith('.csv'));
if (!files.length) {
    console.log(`>>> NO FILES .CSV TO PARSE`);

    process.exit(0);    
}

(async () => {
    performance.mark('init');

    /**
     * Create and insert multiple instances in bulk.
     *
     * The success handler is passed an array of instances, but please notice that these may not completely represent the state of the rows in the DB. This is because MySQL
     * and SQLite do not make it easy to obtain back automatically generated IDs and other default values in a way that can be mapped to multiple records.
     * To obtain Instances for the newly created values, you will need to query for them again.
     *
     * If validation fails, the promise is rejected with an array-like AggregateError
     *
     * @param  {Array}          records                          List of objects (key/value pairs) to create instances from
     * @param  {object}         [options]                        Bulk create options
     * @param  {Array}          [options.fields]                 Fields to insert (defaults to all fields)
     * @param  {boolean}        [options.validate=false]         Should each row be subject to validation before it is inserted. The whole insert will fail if one row fails validation
     * @param  {boolean}        [options.hooks=true]             Run before / after bulk create hooks?
     * @param  {boolean}        [options.individualHooks=false]  Run before / after create hooks for each individual Instance? BulkCreate hooks will still be run if options.hooks is true.
     * @param  {boolean}        [options.ignoreDuplicates=false] Ignore duplicate values for primary keys? (not supported by MSSQL or Postgres < 9.5)
     * @param  {Array}          [options.updateOnDuplicate]      Fields to update if row key already exists (on duplicate key update)? (only supported by MySQL, MariaDB, SQLite >= 3.24.0 & Postgres >= 9.5). By default, all fields are updated.
     * @param  {Transaction}    [options.transaction]            Transaction to run query under
     * @param  {Function}       [options.logging=false]          A function that gets executed while running the query to log the sql.
     * @param  {boolean}        [options.benchmark=false]        Pass query execution time in milliseconds as second argument to logging function (options.logging).
     * @param  {boolean|Array}  [options.returning=false]        If true, append RETURNING <model columns> to get back all defined values; if an array of column names, append RETURNING <columns> to get back specific columns (Postgres only)
     * @param  {string}         [options.searchPath=DEFAULT]     An optional parameter to specify the schema search_path (Postgres only)
     *
     * @returns {Promise<Array<Model>>}
     */
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false });

    if (!dryRun && !update) {
        await executeMigrations(MigrationsDirection.down);

        output.sections[0] = [
            '✅ dropping table\'s indexes ...',
        ];
    }

    let processedInvalidRecords = 0;
    let processedRecords = 0;
    let iter = 0;

    const queue = new PQueue({ concurrency: os.cpus().length });

    performance.mark(`iter-${iter}`);

    const out = (final?: boolean) => 
        output.processingInfo(processedRecords, processedInvalidRecords, incidents.length, queue, final);

    const markersStore: Set<string> = new Set();
    const incidents = [];
    const markers = [];
    let processingFile = 0;

    const resolveDate = (row) => {
        const d = new Date(row.Month || row.Date);
        if (isNaN(+d)) {
            return false;
        }

        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    const resolveOutcome = (row) => {
        return row['Last outcome category'];
    }

    const resolveType = (row) => {
        return row['Crime type'] || [row.Type, row["Object of search"]].filter(Boolean).join(' ');
    }

    for await (const file of files) {
        processingFile++;
        const parser = fs
            .createReadStream(file)
            .pipe(csv({ columns: true }));

        output.title = `processing: ${file} ${processingFile} of ${files.length}`; 

        for await (const row of parser) {
            const { 
                Longitude: lng,
                Latitude: lat,

                /** will be used later on to generate reports */
                'Reported by': creator,
                'Falls within': assignee,
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
                outcome,
                // creator,
                // assignee,
            };

            incidents.push(obj);
            const markerIndex = `${lat}|${lng}`;

            if (!markersStore.has(markerIndex)) {
                markersStore.add(markerIndex);

                markers.push({
                    lat,
                    lng,
                    type: 'police'
                });
            }

            if (incidents.length === limit) {
                iter++;
                processedRecords += incidents.length;

                queue.add(persist(orm.Marker, [...markers]));
                queue.add(persist(orm.Incident, [...incidents]));

                output.sections[1] = out();

                markers.length = 0;
                incidents.length = 0;

                performance.mark(`iter-${iter}`);
                performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

                if (queue.size > queue.concurrency) {
                    output.sections.push([
                        '',
                        '⏱️ catching up with SQL queue ...',
                    ]);
    
                    // await queue.onSizeLessThan(concurrency);
                    await queue.onEmpty();
    
                    output.sections.length = 2;
                }
            }
        }        
    }

    processedRecords += incidents.length;
    queue.add(persist(orm.Marker, markers));
    queue.add(persist(orm.Incident, incidents));
    output.sections[1] = out(true);

    if (!dryRun) {
        output.sections.push([
            Output.line,
            '✅ await queued SQL ...',
        ]);

        await queue.onEmpty();

        if (!update) {
            output.sections.push([
                Output.line,
                '✅ restore table\'s indexes ...',
            ]);
    
            await executeMigrations(MigrationsDirection.up);
        }
    }

    performance.mark('end');
    performance.measure('processedRecords', 'init', 'end');
})()
