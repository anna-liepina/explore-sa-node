#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');
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

const cwd = path.join(__dirname, '..');
const defaultLimit = 10000;
const limit = parseInt(process.env.LIMIT, 10) || defaultLimit;
const file = `${cwd}/${process.env.FILE || 'var/csv.csv'}`;
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
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, ignoreDuplicates: true, hooks: false });

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

    const areas = await orm.Property.findAll({
        attributes: [
            'city',
            [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('postcode'), ' ', 1), 'area'],
            // [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
        ],
        where: {
            postcode: {
                [orm.Sequelize.Op.like]: '% %',
            }
        },
        group: ['area', 'city'],
        raw: true,
        logging,
    });

    let i = 0;
    let iter = 0;
    let data = [];

    const queue = new PQueue({ concurrency: os.cpus().length });
    performance.mark(`iter-${iter}`);

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

    for (const row of areas) {
        let { area, city } = row;
        city = city.toUpperCase();

        if (hashMap[city]) {
            collisions++;
            city = hashMap[city];
        };

        data.push({ area, city });

        if (data.length === limit) {

            i += data.length;

            const job = queue.add(persist(orm.Area, [...data]));

            console.log(`
------------------------------------
>>> parsed records: ${i.toLocaleString()}
>>> collisions detected: ${collisions.toLocaleString()}
>>> areas in batch: ${data.length.toLocaleString()}
>>> SQL transactions in queue: ${queue.size.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

            data.length = 0;
            iter++;

            performance.mark(`iter-${iter}`);
            performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

            if (queue.size > queue.concurrency) {
                console.log(`
------------------------------------
>>> catching up with SQL queue ...
------------------------------------`);
                await job;
            }
        }
    }

    i += data.length;
    queue.add(persist(orm.Area, data));

    console.log(`
------------------------------------
>>> execute remaining SQL queue ...
------------------------------------`);
    await queue.onEmpty();

    console.log(`
------------------------------------
FINAL BATCH
------------------------------------
>>> >> parsed records: ${i.toLocaleString()}
>>> >> areas in batch: ${data.length.toLocaleString()}
>>> >> collisions detected: ${collisions.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
------------------------------------`);
    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
