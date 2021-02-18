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
const limit = parseInt(process.env.LIMIT, 10) || 10000;
const file = `${cwd}/${process.env.FILE || 'var/ukpostcodes.csv'}`;
const logging = process.env.LOGGING ? console.log : false;
const dryRun = !!process.env.DRY;

console.log(`
--------------------------------------------------
--------------------- CONFIG ---------------------

env. variables:
name\t| default\t| current
LIMIT\t| 10000\t\t| ${limit}
FILE\t| \t\t| ${file}
LOGGING\t| ${false}\t\t| ${!!logging}
DRY\t| ${false}\t\t| ${!!dryRun}
--------------------------------------------------
database connection info:
host: \t\t${process.env.DB_HOSTNAME}
port: \t\t${process.env.DB_PORT}
database: \t${process.env.DB_NAME}
dialect: \t${process.env.DB_DIALECT}
--------------------------------------------------
file to parse: ${file}
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
        const [, postcode, lat, lng] = row;

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

        i++;

        if (!lat || !lng) {
            continue;
        }

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

    console.log(`
------------------------------------
execute queued SQL ...
------------------------------------`);

    if (!dryRun) {
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

// 352910,SK7 0AY,53.335323,-2.17216
// 1773486,EN77 1AA,,
// 1773487,EN77 1AB,,
// 1773488,EN77 1AD,,
// 1773489,EN77 1AE,,
// 1773490,EN77 1AN,,
// 1773491,EN77 1AS,,
// 1773492,EN77 1AU,,
// 1773493,EN77 1AW,,
// 1773494,EN77 1AZ,,
// 1773495,EN77 1BA,,
// 1773496,EN77 1BD,,
// 1773497,EN77 1BE,,
// 1773498,EN77 1DL,,
// 1773499,EN77 1ES,,
// 1773500,EN77 1EW,,
// 1773501,EN77 1FF,,
// 1773502,EN77 1FN,,
// 1773503,EN77 1FP,,
// 1773504,EN77 1HQ,,
// 1773505,EN77 1JL,,
// 1773506,EN77 1LD,,
// 1773507,EN77 1LG,,
// 1773508,EN77 1LJ,,
// 1773509,EN77 1LL,,
// 1773510,EN77 1LX,,
// 1773511,EN77 1NF,,
// 1773512,EN77 1NS,,
// 1773513,EN77 1NT,,
// 1773514,EN77 1NU,,
// 1773515,EN77 1NW,,
// 1773516,EN77 1PH,,
// 1773517,EN77 1PS,,
// 1773518,EN77 1QA,,
// 1773519,EN77 1RB,,
// 1773520,EN77 1RG,,
// 1773521,EN77 1RP,,
// 1773522,EN77 1RS,,
// 1773523,EN77 1RZ,,
// 1773524,EN77 1SA,,
// 1773525,EN77 1SE,,
// 1773526,EN77 1SF,,
// 1773527,EN77 1SP,,
// 1773528,EN77 1SR,,
// 1773529,EN77 1SW,,
// 1773530,EN77 1SZ,,
// 1773531,EN77 1TA,,
// 1773532,EN77 1TE,,
// 1773533,EN77 1TF,,
// 1773534,EN77 1TG,,
// 1773535,EN77 1TJ,,
// 1773536,EN77 1TQ,,
// 1773537,EN77 1TS,,
// 1773538,EN77 1TW,,
// 1773539,EN77 1TX,,
// 1773540,EN77 1UA,,
// 1773541,EN77 1UB,,
// 1773542,EN77 1UF,,
// 1773543,EN77 1WB,,
// 1773544,EN77 1XY,,
// 1773545,EN77 1YL,,
// 1773546,EN77 1ZA,,
