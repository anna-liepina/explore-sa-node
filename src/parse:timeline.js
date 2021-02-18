#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const os = require('os');
const { default: PQueue } = require('p-queue');
const orm = require('./orm');

const { performance, PerformanceObserver } = require('perf_hooks');

const perfObserver = new PerformanceObserver(
    (items) => {
        items
            .getEntries()
            .forEach((o) => {
                console.log(`duration: ${(o.duration / 1000).toFixed(2)}s`);
            });
    }
)

perfObserver.observe({ entryTypes: ['measure'], buffer: true });

const defaultLimit = 10000;
const limit = parseInt(process.env.LIMIT, 10) || defaultLimit;
const logging = process.env.LOGGING ? console.log : false;
const dryRun = !!process.env.DRY;

console.log(`
--------------------------------------------------
--------------------- CONFIG ---------------------

env. variables:
name\t| default\t| current
LIMIT\t| ${defaultLimit}\t\t| ${limit}
LOGGING\t| ${false}\t\t| ${!!logging}
DRY\t| ${false}\t\t| ${!!dryRun}
--------------------------------------------------
database connection info:
host: \t\t${process.env.DB_HOSTNAME}
port: \t\t${process.env.DB_PORT}
database: \t${process.env.DB_NAME}
dialect: \t${process.env.DB_DIALECT}
--------------------------------------------------
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
            [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
        ],
        where: {
            postcode: {
                [orm.Sequelize.Op.ne]: '',
            },
        },
        group: ['area'],
        raw: true,
        logging,
    });

    console.log(`
------------------------------------
>>> to process areas: ${areas.length.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

    let i = 0;
    let iter = 0;

    const queue = new PQueue({ concurrency: os.cpus().length });
    performance.mark(`iter-${iter}`);

    for (const row of areas) {
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
                [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('guid'), '-', 1), 'Property.postcode'],
                // [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('guid'), '-', 1), 'postcode'],
            ],
            where: {
                guid: {
                    [orm.Sequelize.Op.like]: `${row.area}%`,
                },
            },
            raw: true,
            logging,
        });

        iter++;
        console.log(`
------------------------------------
>>> area ${row.area}, ${iter.toLocaleString()} of ${areas.length.toLocaleString()}
>>> transactions in batch: ${transactions.length.toLocaleString()}
>>> SQL transactions in queue: ${queue.size.toLocaleString()}
>>> SQL workers used ${queue.pending} of ${queue.concurrency}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

        const t = {};
        for (const transaction of transactions) {
            const { 'Property.postcode': postcode, price } = transaction;

            const [year, month,] = transaction.date.split('-');
            const date = `${year}-${month}`;

            if (!t[date]) {
                t[date] = {};
            }

            if (!t[date][postcode]) {
                t[date][postcode] = {
                    count: 0,
                    price: 0,
                };
            }

            t[date][postcode].price += price;
            t[date][postcode].count++;
        }

        const series = [];
        for (const date in t) {
            const o = t[date];
            let tCount = 0;
            let tPrice = 0;

            for (const postcode in o) {
                const { count, price } = o[postcode];

                tCount += count;
                tPrice += price;

                const avg = Math.round(price / count);

                series.push({ date, postcode, count, avg });
            }

            const avg = Math.round(tPrice / tCount);

            series.push({ date, postcode: row.area, count: tCount, avg });
        }

        const job = queue.add(persist(orm.Timeline, series));

        i += transactions.length;

        performance.mark(`iter-${iter}`);
        performance.measure(`diff-${i - 1}->${i}`, `iter-${iter - 1}`, `iter-${iter}`);

        if (queue.size > queue.concurrency) {
            console.log(`
------------------------------------
>>> catching up with SQL queue ...
------------------------------------`);
            await job;
        }
    }

    console.log(`
------------------------------------
>>> execute remaining SQL queue ...
------------------------------------`);
    await queue.onEmpty();

    console.log(`
------------------------------------
FINAL BATCH
------------------------------------
>>> >> processed transactions: ${i.toLocaleString()}
>>> >> postcode areas proccessed: ${areas.length.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
------------------------------------`);
    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
