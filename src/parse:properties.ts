#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import { performance } from 'perf_hooks';
import fs from 'fs';
import os from 'os';
import yargs from 'yargs';
import csv from 'csv-parse';
import PQueue from 'p-queue';
import orm from './orm';
import { MigrationsDirection, OperationMarker, composeOperation, perfObserver } from './parse:utils';
import type { PropertyType } from './models/property';
import type { TransactionType } from './models/transaction';

const executeMigrations = composeOperation(OperationMarker.properties, orm);
perfObserver().observe({ entryTypes: ['measure'], buffered: true });

//@ts-ignore
const { file, sql: logging, dry: dryRun, limit, update } = yargs
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
    .option('update', {
        type: 'boolean',
        description: 'flush update [do not drop/restore indexes, useful with small csv files]',
    })
    .help()
    .argv;

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

--------------------------------------------------

file to parse: ${file}
`);

if (!file) {
    console.log(`>>> NO FILE TO PARSE`);

    process.exit(0);
}

if (!fs.existsSync(file)) {
    console.log(`>>> FILE DO NOT EXISTS`);

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
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false });

    const f = (v) => !v ? undefined : v;

    if (!dryRun && !update) {
        await executeMigrations(MigrationsDirection.down);
    }

    const properties: Partial<PropertyType>[] = [];
    const transactions: Partial<TransactionType>[] = [];

    const propertiesGUIDMap: Set<string> = new Set();

    await orm.Property.findAll({
        attributes: ['guid'],
        raw: true,
    }).then((data) => (data as Partial<PropertyType>[]).forEach((v) => propertiesGUIDMap.add(v.guid)));

    let i = 0;
    let iter = 0;
    let corrupted = 0;

    const concurrency = os.cpus().length;
    const queue = new PQueue({ concurrency });

    performance.mark(`iter-${iter}`);

    const parser = fs
        .createReadStream(file)
        .pipe(csv());

    for await (const row of parser) {
        const date = row[2].split(' ')[0];
        const price = parseInt(row[1], 10);
        const postcode = row[3];
        /** some records do not contain postcode */
        if (postcode.indexOf(' ') < 1) {
            corrupted++;
            i++;

            continue;
        }

        const obj: Partial<PropertyType> = {
            // uuid: row[0],
            // price,
            // date,
            postcode,
            propertyType: row[4],
            // purchaseType: row[5],
            propertyForm: row[6],
            paon: f(row[7]),
            saon: f(row[8]),
            street: f(row[9]),
            // locality: row[10],
            city: f(row[11]),
            // district: row[12],
            // county: row[13],
            // ppd: row[14],
            // status: row[15],
        };

        obj.guid = `${obj.postcode}-${obj.street || ''}${obj.paon ? ` ${obj.paon}` : ''}${obj.saon ? `-${obj.saon}` : ''}`.toUpperCase();

        transactions.push({
            guid: obj.guid,
            price,
            date,
            // type: row[5] === 'Y',
            // sale: row[14] === 'A',
        });

        if (!propertiesGUIDMap.has(obj.guid)) {
            propertiesGUIDMap.add(obj.guid);

            properties.push(obj);
        }

        if (transactions.length === limit) {
            i += transactions.length;

            queue.add(persist(orm.Property, [...properties]));
            queue.add(persist(orm.Transaction, [...transactions]));

            console.log(`
------------------------------------
>>> processed transactions: ${i.toLocaleString()}
>>> corrupted records so far: ${corrupted.toLocaleString()}
>>> unique properties in batch: ${properties.length.toLocaleString()}
>>> unique properties so far: ${propertiesGUIDMap.size.toLocaleString()}
>>> SQL transactions in queue: ${queue.size.toLocaleString()}
>>> SQL workers used ${queue.pending} of ${queue.concurrency}`);

            transactions.length = 0;
            properties.length = 0;
            iter++;

            performance.mark(`iter-${iter}`);
            performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

            if (queue.size > queue.concurrency) {
                console.log(`
------------------------------------
>>> catching up with SQL queue ...
------------------------------------`);

                // await queue.onSizeLessThan(concurrency);
                await queue.onEmpty();
            }
        }
    }

    await queue.onEmpty();

    queue.add(persist(orm.Property, properties));
    queue.add(persist(orm.Transaction, transactions));

    i += transactions.length;

    console.log(`
------------------------------------
>>> execute remaining SQL queue ...
------------------------------------`);

    if (!dryRun && !update) {
        await queue.onEmpty();

        console.log(`
------------------------------------
>>> restoring database indexes ...
------------------------------------`);

        await executeMigrations(MigrationsDirection.up);
    }

    console.log(`
------------------------------------
FINAL BATCH
------------------------------------
>>> >> processed transactions: ${i.toLocaleString()}
>>> >> corrupted records: ${corrupted.toLocaleString()}
>>> >> unique properties in batch: ${properties.length.toLocaleString()}
>>> >> unique properties: ${propertiesGUIDMap.size.toLocaleString()}
------------------------------------`);
    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
