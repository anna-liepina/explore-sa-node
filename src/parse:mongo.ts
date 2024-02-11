import yargs from 'yargs';
import orm from './orm';
import {
    createQueue,
    composeNoSQLPersist,
    Output,
    Performance,
} from './parse:utils';
import type { MarkerType } from './models/marker';
import { mongo } from './odm';
import { MarkerTypeEnum } from './models/marker';

import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import compose from './dataloader';
import { typeDefs, resolvers } from './graphql/schema';
import { IncidentType } from './models/incident';

//@ts-ignore
const { dry: dryRun, limit } = yargs
    .option('limit', {
        type: 'number',
        description: 'amount of records in one bulk SQL qeuery',
        default: 10000,
    })
    // .option('sql', {
    //     type: 'boolean',
    //     description: 'print out SQL queries',
    //     default: false,
    // })
    .option('dry', {
        type: 'boolean',
        description: 'dry run - do not affect a database',
    })
    .help()
    .argv;

// const logging = !!sql && console.log;
const persist = composeNoSQLPersist(dryRun);
const output = new Output(` processing NoSQL`);
const performance = new Performance(output);

const queue = createQueue();

(async () => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        dataSources: () => ({}),
        context: () => ({ orm, dataloader: compose(orm) }),
    });

    const { query } = createTestClient(server);

    let page = 0;
    let processedInvalidRecords = 0;
    let processedRecords = 0;
    let recordsInBatch = 0;

    let markers: Partial<MarkerType>[];

    const resolveKey = (obj: { lat: number, lng: number }) => `${obj.lat}|${obj.lng}`;
    const processingInfo = (final?: boolean) => {
        output.sections[1] = [
            Output.line,
            ` ${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` total records processed`,
            `   valid: ${processedRecords.toLocaleString()}`,
            `   corrupred or invalid: ${processedInvalidRecords.toLocaleString()}`,
            ``,
            ` valid records in the last batch: ${recordsInBatch.toLocaleString()}`,
            ` page ${page}`,
            `  up to ${limit} Markers per iteration`,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    while (!Array.isArray(markers) || markers.length) {
        performance.mark();
        recordsInBatch = 0;
        markers = await orm.Marker.findAll({
            attributes: [`lat`, `lng`, `type`],
            raw: true,
            limit,
            offset: limit * page
        }) as Partial<MarkerType>[];
        page++;

        performance.mark();
        for await (const marker of markers) {
            performance.mark();

            if (marker.type === MarkerTypeEnum.property) {
                const { data: { propertySearchInRange: properties } } = await query({
                    query: `
                    {
                        propertySearchInRange(
                            pos: { lat: ${marker.lat}, lng: ${marker.lng} }
                            range: 0
                            perPage: 10000000
                        ) {
                            postcode {
                                postcode
                                lat
                                lng
                                lsoa
                            }
                            propertyType
                            propertyForm
                            city
                            street
                            paon
                            saon
                            transactions {
                                price
                                date
                            }
                        }
                    }`
                });

                let recordsPerMarker = 0;
                const items = properties
                    .reduce((acc: Record<string, any>[], p: Record<string, any>) => {
                        if (!Array.isArray(p.transactions) || !p.transactions.length) {
                            processedInvalidRecords++;

                            return acc;
                        }

                        recordsPerMarker += p.transactions.length;

                        acc.push({
                            coordinates: resolveKey(p.postcode),
                            address: [ p.postcode.postcode, [p.street, p.paon].filter(Boolean).join(' '), p.saon ].filter(Boolean).join(', '),
                            city: p.city,
                            ...p.postcode,
                            transactions: p.transactions
                        })

                        return acc;
                    }, []);

                recordsInBatch += recordsPerMarker;
                processedRecords += recordsPerMarker;

                queue.add(persist(mongo.collection('properties'), items));
            }

            if (marker.type === MarkerTypeEnum.police) {
                const { data: { incidentSearchInRange: incidents } } = await query({
                    query: `
                    {
                        incidentSearchInRange(
                            pos: { lat: ${marker.lat}, lng: ${marker.lng} }
                            range: 0
                            perPage: 10000000
                        ) {
                            lat
                            lng
                            date
                            type
                            outcome
                        }
                    }`
                });

                recordsInBatch += incidents.length;
                processedRecords += incidents.length;

                const cache = incidents.reduce((acc: Record<string, any>, incident: IncidentType) => {
                    const { lat, lng, ...i } = incident;

                    const key = resolveKey(incident);

                    acc[key] ||= [];
                    acc[key].push(i);

                    return acc;
                }, {});

                const items = Object.keys(cache).map((coordinates) => ({
                    coordinates,
                    incidents: cache[coordinates]
                }));
                queue.add(persist(mongo.collection('incidents'), items));
            }
        }

        processingInfo();
        performance.mark();

        if (queue.size > queue.concurrency) {
            output.messageCatchUpWithSQLQueue();

            await queue.onEmpty();

            output.removeLastMessage();
        }
    }

    processingInfo(true);
    performance.mark();

    output.messageAwaitQueuedSQL(dryRun);
    await queue.onEmpty();

    performance.mark(0);
    process.exit(0);
})()
