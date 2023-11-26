#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yargs from 'yargs';
import csv from 'csv-parse';
import PQueue from 'p-queue';
import orm from './orm';
import { MigrationsDirection, OperationMarker, composeOperation, perfObserver } from './parse:utils';
import type { PostcodeType } from './models/postcode';
import type { IncidentType } from './models/incident';

const executeMigrations = composeOperation(OperationMarker.incidents, orm);
perfObserver().observe({ entryTypes: ['measure'], buffered: true });

//@ts-ignore
const { path: _path, areaPath, sql: logging, dry: dryRun, limit, update } = yargs
    .command('--path', 'absolute path to csvs to parse')
    .command('--areaPath', 'area')
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
--path\t\tabsolute path to csv file to parse
--areaPath\tabsolute path to csv file to parse
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

files to parse: ${_path}
`);

function scanDirectory(directoryPath: string): string[] {
    const result: string[] = [];
  
    function scanDirRecursive(dir: string): void {
      const files = fs.readdirSync(dir);
  
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
  
        if (stat.isDirectory()) {
          scanDirRecursive(filePath);
        } else {
          result.push(filePath);
        }
      });
    }
  
    scanDirRecursive(directoryPath);
    return result;
}

if (!_path || !areaPath) {
    console.log(`>>> PATH NOT PROVIDED`);

    process.exit(0);
}

if (!fs.existsSync(_path) || !fs.existsSync(areaPath)) {
    console.log(`>>> PATH / AREA DO NOT EXITS`);

    process.exit(0);
}

const files = scanDirectory(_path).filter((str) => str.endsWith('.csv'));
if (!files.length) {
    console.log(`>>> NO FILES .CSV TO PARSE`);

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

    if (!dryRun && !update) {
        await executeMigrations(MigrationsDirection.down);
    }

    let total = 0;
    let iter = 0;
    let corrupted = 0;
    let missingPostcode = 0;

    const concurrency = os.cpus().length;
    const queue = new PQueue({ concurrency });

    const lsoaStream = fs
        .createReadStream(areaPath)
        .pipe(csv({ columns: true }));

    performance.mark('lsoa-start');
    const postcodes = await orm.Postcode.findAll({
        attributes: ['postcode', 'lat', 'lng'],
        raw: true,
    }).then((v) => v.reduce((acc, v) => {
        acc[(v as Partial<PostcodeType>).postcode] = v;

        return acc;
    }, []));

    const lsoas: Map<string, PostcodeType[]> = await new Promise((resolve) => {
        const store = new Map<string, PostcodeType[]>();
      
        lsoaStream
          .on('data', (area) => {
            const lsoa = area.lsoa11cd;
            const postcode = area.pcds;
            const verifiedPostcode = postcodes[postcode];

            if (!verifiedPostcode) {
                missingPostcode++;
            }  

            if (verifiedPostcode && lsoa) {
                if (!store.has(lsoa)) {
                    store.set(lsoa, []);
                }

                store.get(lsoa).push(verifiedPostcode);
            }
          })
          .on('end', () => resolve(store));
    });

    performance.mark('lsoa-end');
    performance.measure('lsoa', 'lsoa-start', 'lsoa-end');
    performance.mark(`iter-${iter}`);

    console.log(`
------------------------------------
>>> LSOA (Lower Super Output Areas)
>>> total LSOAs: ${lsoas.size.toLocaleString()}
>>> total POSTCODES: ${postcodes.length.toLocaleString()}
>>> total missing POSTCODES ${missingPostcode.toLocaleString()}
`);

    const incidents = [];
    let processingFile = 0;
    
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.pow(Math.sin(dLon / 2), 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }
    
    function findClosestPostcode(lat: number, lng: number, postcodes: PostcodeType[], threshold: number): string {
        return postcodes.reduce((closestPostcode, postcode) => {
            const distance = calculateDistance(lat, lng, postcode.lat, postcode.lng);
        
            if (distance < threshold || distance < closestPostcode.distance) {
                return { postcode: postcode.postcode, distance };
            }
        
            return closestPostcode;
        }, { postcode: postcodes[0].postcode, distance: Infinity }).postcode;
    }
    
    for await (const file of files) {
        processingFile++;
        const parser = fs
            .createReadStream(file)
            .pipe(csv({ columns: true }));

            console.log(`
------------------------------------
>>> processing: ${file}
>>> ${processingFile} of ${files.length}`);
        for await (const row of parser) {
            const { 
                'Crime ID': guid,
                Month: date,
                'Reported by': creator,
                'Falls within': assignee,
                Longitude: lng,
                Latitude: lat,
                // Location: location,
                'LSOA code': lsoa,
                'LSOA name': area,
                'Crime type': type,
                'Last outcome category': outcome,
                // Context: context
            } = row;

            if (!date || (date as string).indexOf('-') === -1 || lat === undefined || lng === undefined || !lsoa) {
                corrupted++;
                continue;
            }

            if (!lsoas.get(lsoa)) {
                corrupted++;
                continue;
            }

            const postcode = findClosestPostcode(lat, lng, lsoas.get(lsoa), Infinity)
            const obj: Partial<IncidentType> = {
                guid,
                date,
                postcode,
                lat,
                lng,
                type,
                outcome,
                lsoa,
                area,
                creator,
                assignee,
                json: JSON.stringify(row)
            };

            incidents.push(obj);

            if (incidents.length === limit) {
                total += incidents.length;

                queue.add(persist(orm.Incident, [...incidents]));

                console.log(`
------------------------------------
>>> processed incidents: ${total.toLocaleString()}
>>> corrupted records so far: ${corrupted.toLocaleString()}
>>> unique incidents in batch: ${incidents.length.toLocaleString()}
>>> unique incidents so far: ${'guidMap.size'.toLocaleString()}
>>> SQL transactions in queue: ${queue.size.toLocaleString()}
>>> SQL workers used ${queue.pending} of ${queue.concurrency}`);

                incidents.length = 0;
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
    }


    await queue.onEmpty();

    queue.add(persist(orm.Incident, incidents));

    total += incidents.length;

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
>>> >> processed incidents: ${total.toLocaleString()}
>>> >> corrupted records: ${corrupted.toLocaleString()}
>>> >> unique incidents in batch: ${incidents.length.toLocaleString()}
>>> >> unique incidents: ${'guidMap.size'.toLocaleString()}
------------------------------------`);
    performance.mark('end');
    performance.measure('total', 'init', 'end');
})()
