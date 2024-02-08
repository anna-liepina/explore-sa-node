require('dotenv');

import { performance } from 'perf_hooks';
import yargs from 'yargs';
import orm from './orm';
import { MigrationsDirection, OperationMarker, composeMigrationRunner, createQueue, perfObserver2, Output } from './parse:utils';
import type { TransactionType } from './models/transaction';

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
perfObserver2(output).observe({ entryTypes: ['measure'], buffered: true });

console.log(`
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
`);

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

    output.messageIndexDrop(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.down);
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
    performance.mark(`iter-${iter}`);

    let processedRecords = 0;
    let processedUniqueSeries = 0;
    let proccessedArea = '';

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
            `   ${iter.toLocaleString()} of ${areas.length.toLocaleString()}`,
            ``,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    for (const row of areas) {
        proccessedArea = row.area;
        iter++;
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

                    iter++;
        
                    performance.mark(`iter-${iter}`);
                    performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

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

        performance.mark(`iter-${iter}`);
        performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

        if (queue.size > queue.concurrency) {
            output.messageCatchUpWithSQLQueue();

            await job;
            output.sections.length = 2;
        }
    }

    outputProcessingInfo(true);

    output.messageAwaitQueuedSQL();
    await queue.onEmpty();

    output.messageIndexRestore(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.up);

    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
