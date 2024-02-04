import fs from "fs";
import os from "os";
import { PerformanceObserver } from "perf_hooks";
import type { ORM } from "./orm.types";
import PQueue from "p-queue";

export enum MigrationsDirection {
    up = "up",
    down = "down",
}

export enum OperationMarker {
    properties = "parse:properties",
    postcodes = "parse:postcodes",
    timeline = "parse:timeline",
    incidents = "parse:incidents",
    markers = "parse:markers",
}

export const composeOperation =
    (operationMarker: OperationMarker, orm: ORM) =>
        async (direction: MigrationsDirection) => {
            const executeFiles = async (path: string) => {
                const files = fs.readdirSync(path);
                for (const file of files) {
                    const obj = require(require.resolve(`${path}/${file}`));

                    if (!obj[operationMarker]) {
                        continue;
                    }

                    await obj[direction](orm.sequelize.getQueryInterface(), orm.Sequelize);
                }
            };

            return executeFiles(`${__dirname}/../database/migrations`);
        };

export const perfObserver2 = (output: Output) =>
    new PerformanceObserver((items) => {
        items.getEntries().forEach((o) => {
            const durationInSec = o.duration / 1000;
            const usedMemoryInMB = process.memoryUsage().heapUsed / 1024 / 1024;

            updateConsoleLog(output.out(durationInSec, usedMemoryInMB));
        });
    });

export const perfObserver = () =>
    new PerformanceObserver((items) => {
        items.getEntries().forEach((o) => {
            const durationInSec = o.duration / 1000;
            const usedMemoryInMB = process.memoryUsage().heapUsed / 1024 / 1024;

            console.log(`
PERFORMANCE OBSERVER METRICS
duration: ${durationInSec.toFixed(2)}s      
heapsize: ${usedMemoryInMB.toFixed(2)} MB`);
        });
    });

export const updateConsoleLog = (lines: string[]) => {
    process.stdout.write('\x1Bc');
    process.stdout.write(lines.join('\n'));
}

export const createQueue = () => new PQueue({ concurrency: os.cpus().length });

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
// export const persist = (model: ModelStatic<Model>, entities: Object[], options: BulkCreateOptions = {}) => model.bulkCreate(entities, { ...options, hooks: false });

export class Output {
    static line = '-'.repeat(50);
    constructor(public title: string, public sections = [], public debugInfo = []) {}

    performanceHeaders(durationInSec: number, usedMemoryInMB: number) {
        return [
            Output.line,
            '📊 MEMORY USAGE',
            Output.line,
            `between updates: ${durationInSec.toFixed(2)}s`,
            `used memory (heapsize): ${usedMemoryInMB.toFixed(2)} MB`
        ]
    }

    debugInformation() {
        if (this.debugInfo.length === 0) {
            return [];
        }

        return [
            Output.line,
            ' DEBUG INFORMATION',
            Output.line,
            ...this.debugInfo,
        ];
    }

    processingInfo(
        total: number,
        totalCorrupedOrInvalid: number,
        inBatch: number,
        queue: PQueue,
        final?: boolean
    ): string[] {
        return [
            Output.line,
            `${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` total records processed`,
            `   valid: ${total.toLocaleString()}`,
            `   corrupred or invalid: ${totalCorrupedOrInvalid.toLocaleString()}`,
            ``,
            ` valid records in the last batch: ${inBatch.toLocaleString()}`,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    out(durationInSec: number, usedMemoryInMB: number): string[] {
        return [
            Output.line,
            this.title,
            Output.line,
            ...this.sections.reduce((acc, section) => acc.concat(section), []),
            ...this.performanceHeaders(durationInSec, usedMemoryInMB),
            ...this.debugInformation(),
            ''
        ]
    }

    messageIndexDrop(executed?: boolean): void {
        this.sections.push([
            Output.resolveMessage('✅ dropping table\'s indexes ...', executed),
        ]);
    }

    messageIndexRestore(executed?: boolean): void {
        this.sections.push([
            Output.line,
            Output.resolveMessage('✅ restore table\'s indexes ...', executed),
        ]);
    }

    messageCatchUpWithSQLQueue(executed?: boolean): void {
        this.sections.push([
            '',
            Output.resolveMessage('⏱️ catching up with SQL queue ...', executed),
        ]);
    }

    messageAwaitQueuedSQL(executed?: boolean): void {
        this.sections.push([
            Output.line,
            Output.resolveMessage('✅ await queued SQL ...', executed),
        ]);
    }

    static resolveMessage = (msg: string, executed?: boolean) => `${!executed ? ' [SKIPPED] ': ''} ${msg}`;
}

const updateConsoleLog = (lines: string[]) => {
    process.stdout.write('\x1Bc');
    process.stdout.write(lines.join('\n'));
}
export const perfObserver2 = (output: Output) =>
    new PerformanceObserver((items) => {
        items.getEntries().forEach((o) => {
            const durationInSec = o.duration / 1000;
            const usedMemoryInMB = process.memoryUsage().heapUsed / 1024 / 1024;

            updateConsoleLog(output.out(durationInSec, usedMemoryInMB));
        });
    });

export const perfObserver = () =>
    new PerformanceObserver((items) => {
        items.getEntries().forEach((o) => {
            const durationInSec = o.duration / 1000;
            const usedMemoryInMB = process.memoryUsage().heapUsed / 1024 / 1024;

            console.log(`
PERFORMANCE OBSERVER METRICS
duration: ${durationInSec.toFixed(2)}s      
heapsize: ${usedMemoryInMB.toFixed(2)} MB`);
        });
    });
