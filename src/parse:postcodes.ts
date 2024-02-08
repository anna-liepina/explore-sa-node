require('dotenv');

import fs from 'fs';
import yargs from 'yargs';
import orm from './orm';
import {
    MigrationsDirection,
    OperationMarker,
    Output,
    createQueue,
    createCSVParser,
    composeMigrationRunner,
    Performance,
} from './parse:utils';
import type { PostcodeType } from './models/postcode';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

const executeMigrations = composeMigrationRunner(OperationMarker.postcodes, orm);

//@ts-ignore
const { file, sql, dry: dryRun, limit, update } = yargs
    .command('--file', 'absolute path to csv file to parse')
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
--file\t\tabsolute path to csv file to parse
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

files to parse: ${file}
`);

if (!file || !fs.existsSync(file)) {
    console.error(`ERROR: NO FILE TO PARSE OR IT DO NOT EXISTS`);
    console.error(`ensure that you pass file's absolute path using --file=%PATH%`);
    console.error(`example: --file=/media/file.csv`);

    process.exit(0);
}

const logging = !!sql && console.log;
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, updateOnDuplicate: ['lat', 'lng'], hooks: false });
const output = new Output(` processing ${file}`);
const performance = new Performance(output);
const conditionIndexDrop = (!dryRun && !update);

(async () => {
    performance.mark();

    const queue = createQueue();
    const parser = createCSVParser(file);

    output.messageIndexDrop(conditionIndexDrop);
    conditionIndexDrop && await executeMigrations(MigrationsDirection.down);

    const postcodes: Partial<PostcodeType>[] = [];
    const postcoreStore: Set<string> = new Set();

    performance.mark();

    await Promise.all([
        orm.Postcode.findAll({
            attributes: ['postcode'],
            raw: true,
            logging,
        })
            .then((data) => (data as Partial<PostcodeType>[]).forEach(({ postcode }) => postcoreStore.add(postcode))),
    ]);

    let processedInvalidRecords = 0;

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[1] = output.processingInfo(parser.info.records, processedInvalidRecords, postcodes.length, queue, final);
    }

    performance.mark();
    for await (const row of parser) {
        const [postcode, _status, _2, _3, _4, _5, _6, lat, lng] = row;

        if (/*_status !== 'live' && **/ isNaN(lat) || isNaN(lng)) {
            processedInvalidRecords++;

            continue;
        }

        if (!postcoreStore.has(postcode)) {
            postcoreStore.add(postcode);

            postcodes.push({
                postcode,
                lat,
                lng,
            });
        }

        if (postcodes.length === limit) {
            const job = queue.add(persist(orm.Postcode, [...postcodes]));

            outputProcessingInfo();
            performance.mark();

            postcodes.length = 0;

            if (queue.size > queue.concurrency) {
                output.messageCatchUpWithSQLQueue(!dryRun);

                // await queue.onSizeLessThan(concurrency);
                await job;

                output.sections.length = 2;
            }
        }
    }

    queue.add(persist(orm.Postcode, postcodes));

    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(!dryRun);
    await queue.onEmpty();

    output.messageIndexRestore(conditionIndexDrop);
    conditionIndexDrop && await executeMigrations(MigrationsDirection.up);

    performance.mark(0);
    process.exit(0);
})()
