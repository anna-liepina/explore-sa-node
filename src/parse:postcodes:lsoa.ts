import fs from 'fs';
import yargs from 'yargs';
import orm from './orm';
import {
    createQueue,
    createCSVParser,
    composeSQLPersist,
    Output,
    Performance,
} from './parse:utils';
import type { PostcodeType } from './models/postcode';

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

if (!file || !fs.existsSync(file)) {
    console.error(`ERROR: NO FILE TO PARSE OR IT DO NOT EXISTS`);
    console.error(`ensure that you pass file's absolute path using --file=%PATH%`);
    console.error(`example: --file=/media/file.csv`);

    process.exit(0);
}

const logging = !!sql && console.log;
const persist = composeSQLPersist(dryRun, { logging, updateOnDuplicate: ['lsoa'] });
const output = new Output(` processing ${file}`);
const performance = new Performance(output);

(async () => {
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
                output.removeLastMessage();
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
