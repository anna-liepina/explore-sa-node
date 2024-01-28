#!/usr/bin/env node

require('dotenv');

import { performance } from 'perf_hooks';
import fs from 'fs';
import yargs from 'yargs';
import csv from 'csv-parse';
import orm from './orm';
import { Output, createQueue, perfObserver2 } from './parse:utils';
import type { PostcodeType } from './models/postcode';

//@ts-ignore
const { file, sql: logging, dry: dryRun, limit } = yargs
    .command('--file', 'absolute path to csv to parse')
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

console.log(`
--------------------------------------------------
--------------------- CONFIG ---------------------

name\t\tdescription
--path\t\tabsolute path to csv file to parse
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

if (!file) {
    console.log(`>>> PATH NOT PROVIDED`);

    process.exit(0);
}

if (!fs.existsSync(file)) {
    console.log(`>>> PATH / AREA DO NOT EXITS`);

    process.exit(0);
}

const output = new Output(`processing ${file}`);
perfObserver2(output).observe({ entryTypes: ['measure'], buffered: true });

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
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false, updateOnDuplicate: ['lsoa']});
    output.sections = [[], []];

    let iter = 0;
    let total = 0;
    let missingPostcodes = 0;

    const queue = createQueue();

    const postcodes = await orm.Postcode.findAll({
        attributes: ['postcode', 'lat', 'lng', 'lsoa'],
        raw: true,
    }).then((v) => {
        const map = new Map<string, PostcodeType>();
        
        (v as unknown as PostcodeType[]).forEach((v: PostcodeType) => {
            map.set(v.postcode, v);
        })

        return map;
    });

    output.sections[0] = [
        '✅ fetch postcodes\' data ...',
    ];

    performance.mark(`iter-${iter}`);

    const verifiedPostcodes = [];
    const out = (final?: boolean) => 
        output.processingInfo(total, missingPostcodes, verifiedPostcodes.length, queue, final);
    
    const parser = fs
        .createReadStream(file)
        .pipe(csv({ columns: true }));

    for await (const row of parser) {
        const lsoa = row.lsoa11cd;
        const postcode = row.pcds;
        const verifiedPostcode = postcodes.get(postcode);

        if (!verifiedPostcode || !lsoa) {
            missingPostcodes++;
            continue;
        }

        total++;

        verifiedPostcode.lsoa = lsoa;
        verifiedPostcodes.push(verifiedPostcode);

        if (verifiedPostcodes.length === limit) {
            queue.add(persist(orm.Postcode, [...verifiedPostcodes]));
            output.sections[1] = out();

            verifiedPostcodes.length = 0;
            iter++;

            performance.mark(`iter-${iter}`);
            performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

            if (queue.size > queue.concurrency) {
                output.sections.push([
                    '',
                    '⏱️ catching up with SQL queue ...',
                ]);

                // await queue.onSizeLessThan(concurrency);
                await queue.onEmpty();
            }
            output.sections.length = 2;
        }
    }

    queue.add(persist(orm.Postcode, verifiedPostcodes));
    output.sections[1] = out(true);

    if (!dryRun) {
        output.sections.push([
            Output.line,
            '✅ await queued SQL ...',
        ]);

        await queue.onEmpty();
    }

    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
