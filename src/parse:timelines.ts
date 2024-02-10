require('dotenv');

import yargs from 'yargs';
import orm from './orm';
import { MigrationsDirection, OperationMarker, composeMigrationRunner, createQueue, Performance, Output } from './parse:utils';
import type { TransactionType } from './models/transaction';

import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';
import { TimelineType } from './models/timeline';

const executeMigrations = composeMigrationRunner(OperationMarker.timeline, orm);

//@ts-ignore
const { sql, dry: dryRun, limit } = yargs
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

const logging = !!sql && console.log;
const output = new Output(` 📊 processing timelines series`);
const performance = new Performance(output);
const persist = (model: ModelStatic<Model<any>>, entities: Record<string, any>[]) =>
    async () => !dryRun && model.bulkCreate(entities, { logging, hooks: false });

console.info(`
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
`);

(async () => {
    performance.mark();

    output.messageIndexDrop(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.down);
    performance.mark();

    output.sections.push([
        Output.line,
        Output.resolveMessage('✅ truncate timelines table ...', !dryRun),
    ]);
    !dryRun && await orm.Timeline.truncate();

    performance.mark();
    output.sections.push([
        Output.line,
        Output.resolveMessage('✅ fetch areas ...', true),
    ]);
    const areas = await orm.Property.findAll({
        attributes: [
            [orm.Sequelize.fn('SUBSTRING_INDEX', orm.Sequelize.col('postcode'), ' ', 1), 'area'],
            // [orm.Sequelize.fn('COUNT', orm.Sequelize.col('postcode')), 'unique'],
        ],
        group: ['area'],
        raw: true,
        logging,
    }) as Partial<{ area: string }>[];
    performance.mark();
 
    const queue = createQueue();
 
    let processedRecords = 0;
    let proccessedArea = '';
    let proccessedFile = 1;
    const series: Partial<TimelineType>[] = [];

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[3] = [
            Output.line,
            ` ${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` proccessing area: ${proccessedArea} (${proccessedFile.toLocaleString()} of ${areas.length.toLocaleString()})`,
            Output.line,
            ` total data series processed`,
            `   ${processedRecords.toLocaleString()}`,
            ``,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    for (const [index, row] of areas.entries()) {
        proccessedArea = row.area;
        proccessedFile = index + 1;

        const cache = await orm.Transaction.findAll({
            attributes: [
                [orm.Sequelize.fn('DATE_FORMAT', orm.Sequelize.col('date'), '%Y-%m'), 'formattedDate'],
                [orm.Sequelize.fn('SUM', orm.Sequelize.col('price')), 'totalPrice'],
                [orm.Sequelize.fn('COUNT', '*'), 'totalTransactions'],
            ],
            where: {
                guid: {
                    //@ts-ignore
                    [orm.Sequelize.Op.startsWith]: row.area,
                },
            },
            group: ['formattedDate'],
            order: ['formattedDate'],
            raw: true,
            logging,
        }) as Partial<{ formattedDate: string, totalPrice: number, totalTransactions: number }>[];

        outputProcessingInfo();
        performance.mark();

        for (const row of cache) {
            const { formattedDate: date, totalPrice, totalTransactions: count } = row;

            series.push({
                date,
                postcode: proccessedArea,
                avg: Math.round(totalPrice / count),
                count,
            });

            if (series.length === limit) {
                const job = queue.add(persist(orm.Timeline, [...series]));
                performance.mark();

                series.length = 0;

                if (queue.size > queue.concurrency) {
                    output.messageAwaitQueuedSQL(!dryRun);
    
                    await job;
                    output.removeLastMessage();
                }
            }

            performance.mark();
        }
        processedRecords += cache.length;
    }

    queue.add(persist(orm.Timeline, series));

    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(true);
    await queue.onEmpty();
    performance.mark();

    output.messageIndexRestore(!dryRun);
    !dryRun && await executeMigrations(MigrationsDirection.up);

    performance.mark(0);
    process.exit(0);
})()