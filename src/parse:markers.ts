#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import { performance } from 'perf_hooks';
import fs from 'fs';
import os from 'os';
import yargs from 'yargs';
import PQueue from 'p-queue';
import orm from './orm';
import { MigrationsDirection, OperationMarker, Output, composeOperation, perfObserver2 } from './parse:utils';
import type { PropertyType } from './models/property';
import type { TransactionType } from './models/transaction';
import type { MarkerType } from './models/marker';

const executeMigrations = composeOperation(OperationMarker.markers, orm);

//@ts-ignore
const { sql: logging, dry: dryRun, limit, update } = yargs
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

const output = new Output(`processing markers`);
perfObserver2(output).observe({ entryTypes: ['measure'], buffered: true });
    
console.log(`
--------------------------------------------------
--------------------- CONFIG ---------------------

name\t\tdescription
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
    const persist = (model, entities) => async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false, ignoreDuplicates: true });

    if (!dryRun && !update) {
        // await executeMigrations(MigrationsDirection.down);

        output.sections[0] = [
            '✅ dropping table\'s indexes ...',
        ];
    }

    const markersHashmap: Set<string> = new Set();
    const markersRaw: Map<string, Partial<MarkerType>> = new Map();

    const createIndex = (lat: number, lng: number, type: string) => `${lat}|${lng}|${type}`;
    // const createIndex = (lat: number, lng: number) => `${lat}|${lng}`;
    let results = [];
    let markers = [];

    const dataSources = [
        {
            model: orm.Property,
            queryCount: {
                attributes: [
                    [
                        orm.sequelize.fn('COUNT', orm.sequelize.col('id')),
                        'total'
                    ],
                ],
                raw: true,
            },
            queryParams: {
                attributes: [],
                include: [
                    {
                        model: orm.Postcode,
                        required: true,
                        attributes: ['lat', 'lng'],
                    },
                ],
                offset: 0,
                limit,
                raw: true,
            },
            parser: (data: Partial<PropertyType>[]) => {
                // results.forEach((v) => {
                //@ts-ignore
                results = data;
                //@ts-ignore
                return data.reduce((acc, v) => {
                    const lat = v['Postcode.lat'];
                    const lng = v['Postcode.lng'];
                    const type = 'property';

                    const index = createIndex(lat, lng, type);

                    if (!markersHashmap.has(index)) {
                        markersHashmap.add(index);

                        const marker = {
                            lat,
                            lng,
                            type
                        };
                        // markersRaw.set(
                        //     index,
                        //     marker
                        // );

                        markers.push(marker);
                    }

                    return acc;
                }, []);

                return markers;
            }
        },
    ];

    let i = 0;
    let iter = 0;
    let corrupted = 0;

    const concurrency = os.cpus().length;
    const queue = new PQueue({ concurrency });

    performance.mark(`iter-${iter}`);
        
    // let offset = 0;
    let cycle = 0;
    let dataSourceIndex = 0;

    const out = (final?: boolean) => 
        output.processingInfo(i, corrupted, markers.length, queue, final);

    while (dataSources.length > dataSourceIndex) {
        if (!dataSources[dataSourceIndex]) {
            break;
        }

        const { model, queryCount, queryParams, parser } = dataSources[dataSourceIndex];

        while (cycle === 0 || results.length) {
            //@ts-ignore
            markers = await model.findAll({
                ...queryParams,
                offset: cycle * limit,
                //@ts-ignore
            }).then(parser);
            i += markers.length;

            // markersRaw.forEach((marker) => {
            //     markers.push(marker);
            // });

            queue.add(persist(orm.Marker, [ ...markers ]));
            output.sections[1] = out();

            markers.length = 0;

            cycle++;
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

                output.sections.length = 2;
            }
        }            

        cycle = 0;
        dataSourceIndex++;
    }

    if (!dryRun) {
        output.sections.push([
            Output.line,
            '✅ await queued SQL ...',
        ]);

        await queue.onEmpty();
    }

    if (!dryRun && !update) {
        output.sections.push([
            Output.line,
            '✅ restore table\'s indexes ...',
        ]);

        await executeMigrations(MigrationsDirection.up);
    }

    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
