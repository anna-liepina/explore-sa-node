#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const fs = require('fs');
const os = require('os');
const csv = require('csv-parse');
const yargs = require('yargs');
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
const argv = yargs
    .command('--file', 'absolute path to csv file to parse')
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

perfObserver.observe({ entryTypes: ['measure'], buffer: true });

const { file, sql: logging, dry: dryRun, limit } = argv;

console.log(`
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

file to parse: ${file}
`);

if (!file) {
    console.log(`>>> NO FILE TO PARSE`);

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
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, updateOnDuplicate: ['c'], hooks: false });

    const queue = new PQueue({ concurrency: os.cpus().length });

    const parser = fs
        .createReadStream(file)
        .pipe(csv());

    let i = 0;
    let iter = 0;

    const postcodes = [];
    const postcodeMap = new Map();

    performance.mark(`iter-${iter}`);

    for await (const row of parser) {
        const [postcode, _1, _2, _3, _4, _5, _6, lat, lng] = row;

        i++;

        if (isNaN(lat) || isNaN(lng)) {
            continue;
        }

        const obj = {
            postcode,
            /** https://postgis.net/workshops/postgis-intro/geography.html */
            /** @link https://www.compose.com/articles/geofile-using-openstreetmap-data-in-compose-postgresql-part-ii/ */
            c: {
                type: 'Point',
                coordinates: [lat, lng],
                // crs: {
                //     type: 'name',
                //     properties: { name: 'EPSG:4326' },
                // },
            },
        };

        if (!postcodeMap.has(postcode)) {
            postcodeMap.set(postcode);

            postcodes.push(obj);
        }

        if (postcodes.length === limit) {
            const job = queue.add(persist(orm.Geo, [...postcodes]));

            console.log(`
------------------------------------
>>> missing data on postcodes: ${(i - postcodeMap.size).toLocaleString()}
>>> postcodes proccessed: ${postcodeMap.size.toLocaleString()}
>>> postcodes in this batch: ${postcodes.length.toLocaleString()}
>>> SQL transactions in queue: ${queue.size.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

            postcodes.length = 0;
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

    queue.add(persist(orm.Geo, postcodes));

    if (!dryRun) {
        console.log(`
------------------------------------
execute queued SQL ...
------------------------------------`);

        await queue.onEmpty();
    }

    console.log(`
------------------------------------
FINAL BATCH
------------------------------------
>>> >> missing data on postcodes: ${(i - postcodeMap.size).toLocaleString()}
>>> >> postcodes so far parsed: ${postcodeMap.size.toLocaleString()}
>>> >> postcodes proccessed: ${postcodeMap.size.toLocaleString()}
>>> >> postcodes in this batch: ${postcodes.length.toLocaleString()}
memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
------------------------------------`);
    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
