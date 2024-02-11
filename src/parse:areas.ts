import yargs from 'yargs';
import orm from './orm';
import {
    createQueue,
    Output,
    Performance,
} from './parse:utils';
import type { AreaType } from './models/area';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

//@ts-ignore
const { sql, dry: dryRun, limit } = yargs
    .option('limit', {
        type: 'number',
        description: 'amount of records in one bulk SQL qeuery',
        default: 100,
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

const logging = !!sql && console.log;
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, ignoreDuplicates: true, hooks: false });
const output = new Output(` processing postcode areas`);
const performance = new Performance(output);

(async () => {
    performance.mark();

    output.sections.push([
        '',
        Output.resolveMessage('✅ truncate areas table ...', !dryRun),
    ]);
    !dryRun && await orm.Area.truncate();

    // await orm.sequelize.query(`
    //     INSERT INTO areas SELECT
    //         city,
    //         SUBSTRING_INDEX(postcode, ' ', 1) AS area
    //     FROM
    //         properties
    //     WHERE
    //         postcode NOT IN ('', 'UNKNOWN')
    //     GROUP BY
    //         area, city;
    // `,);

    performance.mark();
    const results = await orm.Property.findAll({
        attributes: [
            'city',
            [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('postcode'), ' ', 1), 'area'],
            // [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
        ],
        group: ['area', 'city'],
        raw: true,
        logging,
    }) as Partial<{ area: string, city: string }>[];

    const queue = createQueue();

    let collisions = 0;
    const hashMap = {
        'ST AGNES': 'ST. AGNES',
        'ST ALBANS': 'ST. ALBANS',
        'ST ASAPH': 'ST. ASAPH',
        'ST AUSTELL': 'ST. AUSTELL',
        'ST BEES': 'ST. BEES',
        'ST COLUMB': 'ST. COLUMB',
        'ST HELENS': 'ST. HELENS',
        'ST IVES': 'ST. IVES',
        'ST LEONARDS-ON-SEA': 'ST. LEONARDS-ON-SEA',
        'ST NEOTS': 'ST. NEOTS',
    }
    
    const areas: Partial<AreaType>[] = [];
    let processedRecords = 0;

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[1] = [
            Output.line,
            ` ${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` records processed`,
            `   total: ${processedRecords.toLocaleString()}`,
            `     collisions: ${collisions.toLocaleString()}`,
            ``,
            ` valid records in the last batch: ${areas.length.toLocaleString()}`,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    performance.mark();
    for await (const row of results) {
        let { area, city } = row;
        processedRecords++;

        city = city.toUpperCase();

        if (hashMap[city]) {
            collisions++;
            city = hashMap[city];
        };

        areas.push({ area, city });

        if (areas.length === limit) {
            const job = queue.add(persist(orm.Area, [...areas]));

            outputProcessingInfo();
            performance.mark();

            areas.length = 0;

            if (queue.size > queue.concurrency) {
                output.messageAwaitQueuedSQL(!dryRun);

                await job;
                output.removeLastMessage();
            }
        }
    }

    queue.add(persist(orm.Area, areas));

    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(!dryRun);
    await queue.onEmpty();

    performance.mark(0);
    process.exit(0);
})()
