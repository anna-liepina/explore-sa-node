require('dotenv');

import yargs from 'yargs';
import orm from './orm';
import { MigrationsDirection, OperationMarker, composeMigrationRunner, createQueue, Performance, Output } from './parse:utils';
import type { TransactionType } from './models/transaction';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

const executeMigrations = composeMigrationRunner(OperationMarker.timeline, orm);

//@ts-ignore
const { sql: logging, dry: dryRun, limit } = yargs
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
    .help()
    .argv;

const output = new Output(`processing timelines`);
const performance = new Performance(output);
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false });

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
`);

(async () => {
    performance.mark();


    output.messageIndexDrop(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.down);
    performance.mark();

    output.sections.push([
        '',
        Output.resolveMessage('⏱️ truncate areas table ...', !dryRun),
    ]);
    !dryRun && await orm.Timeline.truncate();

    performance.mark();
    /** fast but INCLUDE empty cycles ~2,978 */
    // SELECT
    //     SUBSTRING_INDEX(postcode, ' ', 1) AS area,
    //     COUNT(postcode) as `unique`
    // FROM
    //     postcodes
    // GROUP BY
    //     area
    // const areas = await orm.Postcode.findAll({
    //     attributes: [
    //         [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('postcode'), ' ', 1), 'area'],
    //         [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
    //     ],
    //     group: ['area'],
    //     raw: true,
    //     logging,
    // });

    /** slow but EXCLUDE empty cycles ~ 2,387 */
    // SELECT
    //     SUBSTRING_INDEX(postcode, ' ', 1) AS area,
    //     COUNT(postcode) as `unique`
    // FROM
    //     properties
    // GROUP BY
    //     area
    const areas = await orm.Property.findAll({
        attributes: [
            [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('postcode'), ' ', 1), 'area'],
            // [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
        ],
        group: ['area'],
        raw: true,
        logging,
    }) as Partial<{ area: string }>[];

    let iter = 0;

    const queue = createQueue();
    performance.mark();

    let processedRecords = 0;
    let processedUniqueSeries = 0;
    let proccessedArea = '';
    let proccessedFile = 1;

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[0] = [
            `proccess area ${proccessedArea}`
        ];
        output.sections[1] = [
            Output.line,
            `${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` total transactions processed`,
            `   valid: ${processedRecords.toLocaleString()}`,
            ` total data series processed`,
            `   ${processedUniqueSeries.toLocaleString()}`,
            ` total areas processed`,
            `   ${proccessedFile.toLocaleString()} of ${areas.length.toLocaleString()}`,
            ``,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    for (const [index, row] of areas.entries()) {
        proccessedArea = row.area;
        proccessedFile = index + 1;

        const cache = {};
        /** slow. but should work without side function */
        // const transactions = await orm.Transaction.findAll({
        //     attributes: ['date', 'price'],
        //     include: [
        //         {
        //             model: orm.Property,
        //             attributes: ['postcode'],
        //             required: true,
        //             where: {
        //                 postcode: {
        //                     [orm.Sequelize.Op.like]: `${row.area}%`,
        //                 }
        //             },
        //         },
        //     ],
        //     raw: true,
        //     logging,
        // });

        /** fast. but relay on SUBSTRING_INDEX function */
        const transactions = await orm.Transaction.findAll({
            attributes: [
                'date',
                'price',
                [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('guid'), ',', 1), 'postcode'],
            ],
            where: {
                guid: {
                    //@ts-ignore
                    [orm.Sequelize.Op.like]: `${row.area}%`,
                },
            },
            raw: true,
            logging,
        }) as Partial<TransactionType & { postcode: string }>[];

        outputProcessingInfo();
        performance.mark();

        processedRecords += transactions.length;
        for (const transaction of transactions) {
            const { postcode, price } = transaction;
            const [ year, month ] = transaction.date.split('-');
            const date = `${year}-${month}`;

            cache[date] ||= {};
            cache[date][postcode] ||= {
                count: 0,
                price: 0,
            };

            cache[date][postcode].price += price;
            cache[date][postcode].count++;
        }

        const series = [];
        for (const date in cache) {
            const cursor = cache[date];
            let tCount = 0;
            let tPrice = 0;

            for (const postcode in cursor) {
                const { count, price } = cursor[postcode];

                tCount += count;
                tPrice += price;

                series.push({
                    date,
                    postcode,
                    count,
                    avg: Math.round(price / count)
                });

                if (series.length === limit) {
                    processedUniqueSeries += series.length;

                    const job = queue.add(persist(orm.Timeline, [...series]));

                    series.length = 0;

                    performance.mark();

                    if (queue.size > queue.concurrency) {
                        output.messageAwaitQueuedSQL(!dryRun);
        
                        await job;
                        output.sections.length = 2;
                    }
                }

                // if (areas.length === limit) {
                //     const job = queue.add(persist(orm.Area, [...areas]));
        
                //     outputProcessingInfo();
        
                //     areas.length = 0;
                //     iter++;
        
                //     performance.mark(`iter-${iter}`);
                //     performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);
        
                //     if (queue.size > queue.concurrency) {
                //         output.messageAwaitQueuedSQL(!dryRun);
        
                //         await job;
                //         output.sections.length = 2;
                //     }
                // }
            }

            series.push({
                date,
                postcode: proccessedArea,
                count: tCount,
                avg: Math.round(tPrice / tCount)
            });
        }

        processedUniqueSeries += series.length;

        const job = queue.add(persist(orm.Timeline, series));

        performance.mark();

        if (queue.size > queue.concurrency) {
            output.messageCatchUpWithSQLQueue();

            await job;
            output.sections.length = 2;
        }
    }

    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL();
    await queue.onEmpty();
    performance.mark();

    output.messageIndexRestore(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.up);

    performance.mark(0);
    process.exit(0);
})()
