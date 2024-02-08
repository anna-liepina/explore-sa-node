import fs from 'fs';
import yargs from 'yargs';
import orm from './orm';
import { createQueue, createCSVParser, Output, Performance } from './parse:utils';
import type { PostcodeType } from './models/postcode';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

//@ts-ignore
const { file, sql, dry: dryRun, limit } = yargs
    .command('--file', 'absolute path to csv to parse')
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
    async () => !dryRun && model.bulkCreate(entities, { logging, updateOnDuplicate: ['lsoa'], hooks: false });
const output = new Output(` processing ${file}`);
const performance = new Performance(output);

(async () => {
    performance.mark();

    const queue = createQueue();
    const parser = createCSVParser(file, { columns: true });

    const postcodes: Partial<PostcodeType>[] = [];
    const postcoreStore: Set<string> = new Set();

    output.sections[0] = [
        ' ✅ fetch postcodes\' data ...',
    ];

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
        const { lsoa11cd: lsoa, pcds: postcode } = row;

        if (!lsoa || !postcoreStore.has(postcode)) {
            processedInvalidRecords++;

            continue;
        }

        postcodes.push({
            postcode,
            lsoa
        })

        if (postcodes.length === limit) {
            const job = queue.add(persist(orm.Postcode, [...postcodes]));

            outputProcessingInfo();
            performance.mark();

            postcodes.length = 0;

            if (queue.size > queue.concurrency) {
                output.messageCatchUpWithSQLQueue(!dryRun);

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

    performance.mark(0);
    process.exit(0);
})()
