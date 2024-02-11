import fs from 'fs';
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
import type { PostcodeType } from './models/postcode';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

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

if (!file || !fs.existsSync(file)) {
    console.error(`ERROR: NO FILE TO PARSE OR IT DO NOT EXISTS`);
    console.error(`ensure that you pass file's absolute path using --file=%PATH%`);
    console.error(`example: --file=/media/file.csv`);

    process.exit(0);
}

const logging = !!sql && console.log;
const migrate = composeMigrationRunner(OperationMarker.postcodes, orm);
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, updateOnDuplicate: ['lat', 'lng'], hooks: false });

const output = new Output(` processing ${file}`);
const performance = new Performance(output);
const conditionIndexDrop = (!dryRun && !update);

(async () => {
    const queue = createQueue();
    const parser = createCSVParser(file);

    output.messageIndexDrop(conditionIndexDrop);
    conditionIndexDrop && await migrate.down();

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

                await job;
                output.removeLastMessage();
            }
        }
    }

    queue.add(persist(orm.Postcode, postcodes));

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
