import fs from "fs";
import os from "os";
import path from "path";
import { performance, PerformanceObserver } from "perf_hooks";
import csv from "csv-parse";
import PQueue from "p-queue";
import type { ORM } from "./orm.types";
import type { BulkCreateOptions } from "sequelize";

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

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

export const composeMigrationRunner = (operationMarker: OperationMarker, orm: ORM) => {
    const execute = async (direction: MigrationsDirection) => {
        const executeFiles = async (filePath: string) => {
            for (const file of fs.readdirSync(filePath)) {
                const obj = require(path.join(filePath, file));

                if (!obj[operationMarker]) {
                    continue;
                }

                await obj[direction](orm.sequelize.getQueryInterface(), orm.Sequelize);
            }
        };

        return executeFiles(path.join(__dirname, '..', 'database', 'migrations'));
    };

    return {
        up: async () => execute(MigrationsDirection.up),
        down: async () => execute(MigrationsDirection.down)
    }
}

export const composePersist = (dryRun?: boolean, options?: BulkCreateOptions) => 
    (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
        async () => (!dryRun && model.bulkCreate(entities, { hooks: false, ...options }));

export const createQueue = () => new PQueue({ concurrency: os.cpus().length });
export const createCSVParser = (path: string, options: csv.Options = {}) =>
    fs
        .createReadStream(path)
        .pipe(csv(options));
        
export class Performance {
    observer: PerformanceObserver;

    constructor(public output: Output, public iter: number = 0) {
        const updateConsoleLog = (lines: string[]) => {
            process.stdout.write('\x1Bc');
            process.stdout.write(lines.join('\n'));
        }

        this.observer = new PerformanceObserver((items) => {
            items.getEntries().forEach((entry) => {
                const durationInSec = entry.duration / 1000;
                const usedMemoryInMB = process.memoryUsage().heapUsed / 1024 / 1024;
    
                updateConsoleLog(output.out(durationInSec, usedMemoryInMB));
            });
        });
        this.observer.observe({ entryTypes: ['measure'], buffered: true });

        performance.mark(`iter-${iter}`);
    }

    mark(from?: number) {
        from ||= this.iter;
        const iter = ++this.iter;
        performance.mark(`iter-${iter}`);
        performance.measure(`diff-${iter - 1}->${iter}`, `iter-${from}`, `iter-${iter}`);
    }
}

export class Output {
    static line = '-'.repeat(50);
    constructor(public title: string, public sections: string[][] = [], public debugInfo = []) {}

    performanceHeaders(durationInSec: number, usedMemoryInMB: number) {
        return [
            Output.line,
            ' 📊 MEMORY USAGE',
            Output.line,
            `between updates: ${durationInSec.toFixed(2)}s`,
            `used memory (heapsize): ${usedMemoryInMB.toFixed(2)} MB`
        ]
    }

    debugInformation() {
        if (!this.debugInfo.length) {
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
            ` ${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` records processed`,
            `   total: ${total.toLocaleString()}`,
            `     valid: ${(total - totalCorrupedOrInvalid).toLocaleString()}`,
            `     corrupred or invalid: ${totalCorrupedOrInvalid.toLocaleString()}`,
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

    removeLastMessage(): void {
        this.sections.length -= 1;
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
