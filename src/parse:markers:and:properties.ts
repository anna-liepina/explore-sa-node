import fs from 'fs';
import yargs from 'yargs';
import orm from './orm';
import {
    OperationMarker,
    createQueue,
    createCSVParser,
    composeMigrationRunner,
    composePersist,
    Output,
    Performance,
} from './parse:utils';
import type { MarkerType } from './models/marker';
import { MarkerTypeEnum } from './models/marker';
import type { PostcodeType } from './models/postcode';
import type { PropertyType } from './models/property';
import type { TransactionType } from './models/transaction';

//@ts-ignore
const { file, sql, dry: dryRun, limit, update } = yargs
    .command('--file', 'absolute path to csv file to parse')
    .option('limit', {
        type: 'number',
        description: 'amount of records in one bulk SQL qeuery',
        default: 10000,
    })
    .option('sql', {
        type: 'boolean',
        description: 'print out SQL queries',
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

if (!file || !fs.existsSync(file)) {
    console.error(`ERROR: NO FILE TO PARSE OR IT DO NOT EXISTS`);
    console.error(`ensure that you pass file's absolute path using --file=%PATH%`);
    console.error(`example: --file=/media/postcodes.csv`);

    process.exit(0);
}

const logging = !!sql && console.log;
const migrate = composeMigrationRunner(OperationMarker.properties, orm);
const persist = composePersist(dryRun, { logging });

const output = new Output(` processing ${file}`);
const performance = new Performance(output);
const conditionIndexDrop = (!dryRun && !update);

(async () => {
    output.messageIndexDrop(conditionIndexDrop);
    conditionIndexDrop && await migrate.down();

    const queue = createQueue();

    performance.mark();

    const parser = createCSVParser(file);

    const markers: Partial<MarkerType>[] = [];
    const properties: Partial<PropertyType>[] = [];
    const transactions: Partial<TransactionType>[] = [];

    const postcodes = new Map<string, Partial<PostcodeType>>();
    const markersStore = new Set<string>();
    const propertiesStore = new Map<string, Set<string>>();

    output.sections[1] = [
        Output.line,
        ' ✅ fetch postcodes | markers | transactions ...',
    ];

    performance.mark();

    await Promise.all([
        orm.Postcode.findAll({
            attributes: ['postcode', 'lat', 'lng'],
            raw: true,
            logging
        })
            .then((data) => (data as Partial<PostcodeType>[]).forEach(({ postcode, ...v }) => postcodes.set(postcode, v))),
        orm.Marker.findAll({
            attributes: ['label'],
            where: {
                type: {
                    //@ts-ignore
                    [orm.Sequelize.Op.eq]: MarkerTypeEnum.property
                }
            },
            raw: true,
            logging
        })
            .then((data) => (data as Partial<MarkerType>[]).forEach((v) => markersStore.add(v.label))),
        orm.Transaction.findAll({
            attributes: ['guid', 'date', 'price'],
            raw: true,
            logging
        })
            .then((data) => (data as Partial<TransactionType>[]).forEach(({ guid, date, price }) => {
                if (!propertiesStore.has(guid)) {
                    propertiesStore.set(guid, new Set);
                }
                propertiesStore.get(guid).add(`${date}|${price}`);
            })),
    ]);

    let processedInvalidRecords = 0;
    let duplicateTransactions = 0;

    const outputProcessingInfo = (final?: boolean) => {
        output.sections[2] = output.processingInfo(parser.info.records, processedInvalidRecords, transactions.length, queue, final);
        output.sections[3] = [
            Output.line,
            ' extra information',
            Output.line,
            ` duplicate transactions (only 1st will be recorded)`,
            `  same address/date/price: ${duplicateTransactions.toLocaleString()}`,
        ];
    }

    performance.mark();
    for await (const row of parser) {
        const postcode = row[3];
        /** some records do not contain postcode */
        if (!postcodes.has(postcode)) {
            processedInvalidRecords++;
            continue;
        }

        const paon = row[7] || undefined;
        const saon = row[8] || undefined;
        const street = row[9] || undefined;
        const city = row[11] || undefined;
        const date = row[2].split(' ')[0];
        const price = parseInt(row[1], 10);

        const guid = [postcode, [street, paon].filter(Boolean).join(' '), saon].filter(Boolean).join(', ').toUpperCase();

        if (!propertiesStore.has(guid)) {
            propertiesStore.set(guid, new Set);

            properties.push({
                postcode,
                propertyType: row[4],
                propertyForm: row[6],
                city,
                guid,
            });

            if (!markersStore.has(postcode)) {
                markersStore.add(postcode);

                const { lat, lng } = postcodes.get(postcode);

                markers.push({
                    lat,
                    lng,
                    type: MarkerTypeEnum.property,
                    label: postcode
                });
            }
        }

        const transactionHash = `${date}|${price}`;
        const transactionStore = propertiesStore.get(guid);
        if (!transactionStore.has(transactionHash)) {
            transactionStore.add(transactionHash);

            transactions.push({
                guid,
                date,
                price,
            });
        } else {
            duplicateTransactions++;
        }

        if (transactions.length === limit) {
            queue.add(persist(orm.Marker, [...markers]));
            queue.add(persist(orm.Property, [...properties]));
            queue.add(persist(orm.Transaction, [...transactions]));

            outputProcessingInfo();
            performance.mark();

            markers.length = 0;
            properties.length = 0;
            transactions.length = 0;

            if (queue.size > queue.concurrency) {
                output.messageCatchUpWithSQLQueue();

                await queue.onEmpty();
                output.removeLastMessage();
            }
        }
    }

    queue.add(persist(orm.Marker, markers));
    queue.add(persist(orm.Property, properties));
    queue.add(persist(orm.Transaction, transactions));

    postcodes.clear();
    markersStore.clear();
    propertiesStore.clear();

    outputProcessingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(!dryRun);
    await queue.onEmpty();
    performance.mark();

    output.messageIndexRestore(conditionIndexDrop);
    conditionIndexDrop && await migrate.up();

    performance.mark(0);
    process.exit(0);
})()
