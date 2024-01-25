#!/usr/bin/env node

require('dotenv');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import { performance } from 'perf_hooks';
import yargs from 'yargs';
import orm from './orm';
import { Output, createQueue, perfObserver2 } from './parse:utils';
import type { MarkerType } from './models/marker';
import { mongo } from './odm';
import { MarkerTypeEnum } from './models/marker';

import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import compose from './dataloader';
import { typeDefs, resolvers } from './graphql/schema';

import { Collection } from 'mongodb';

//@ts-ignore
const { sql: logging, dry: dryRun, limit } = yargs
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

const output = new Output(`processing NoSQL`);
perfObserver2(output).observe({ entryTypes: ['measure'], buffered: true });

const queue = createQueue();
    
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

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        dataSources: () => ({}),
        context: () => ({ orm, dataloader: compose(orm) }),
    });

    const { query } = createTestClient(server);

    const persistODM = (collection: Collection<any>, items: any[]) => async () => !dryRun && collection.insertMany(items);

    let iter = 0;
    let processedInvalidRecords = 0;
    let processedRecords = 0;
    let recordsInBatch = 0;

    performance.mark(`iter-${iter}`);

    let markers: MarkerType[];

    const resolveKey = (obj: { lat: number, lng: number }) => `${obj.lat}|${obj.lng}`;
    const processingInfo = (final?: boolean) => {
        output.sections[1] = [
            Output.line,
            `${final ? '✅' : '⏱️ '} data processing ...`,
            Output.line,
            ` total records processed`,
            `   valid: ${processedRecords.toLocaleString()}`,
            `   corrupred or invalid: ${processedInvalidRecords.toLocaleString()}`,
            ``,
            ` valid records in the last batch: ${recordsInBatch.toLocaleString()}`,
            ` iteration ${iter}`,
            `  up to ${limit} Markers per iteration`,
            ` SQL workers used ${queue.pending.toLocaleString()} of ${queue.concurrency.toLocaleString()} ( queue: ${queue.size.toLocaleString()} )`,
        ];
    }

    while (!Array.isArray(markers) || markers.length) {
        recordsInBatch = 0;
        markers = await orm.Marker.findAll({
            attributes: [`lat`, `lng`, `type`],
            raw: true,
            limit,
            offset: limit * iter
        }) as unknown as MarkerType[];

        for await (const marker of markers) {
            if (marker.type === MarkerTypeEnum.property) {
                let { data: { propertySearchInRange: properties } } = await query({
                    query: `
                    {
                        propertySearchInRange(
                            pos: { lat: ${marker.lat}, lng: ${marker.lng} }
                            range: 0
                            perPage: 10000000
                        ) {
                            # id
                            postcode {
                                postcode
                                lat
                                lng
                                # url
                                # lsoa
                            }
                            # propertyType
                            # propertyForm
                            city
                            street
                            paon
                            saon
                            transactions {
                                # id
                                price
                                date
                            }
                        }
                    }`
                });

                let recordPerMarker = 0;
                const items = properties
                    .reduce((acc, p) => {
                        if (!Array.isArray(p.transactions) || !p.transactions.length) {
                            processedInvalidRecords++;

                            return acc;
                        }

                        recordPerMarker += p.transactions.length;

                        acc.push({
                            coordinates: resolveKey(p.postcode),
                            address: [ p.postcode.postcode, p.street, p.paon, p.saon ].filter(Boolean).join(', '),
                            city: p.city,
                            ...p.postcode,
                            transactions: p.transactions
                        })

                        return acc;
                    }, []);

                recordsInBatch += recordPerMarker;
                processedRecords += recordPerMarker;

                queue.add(persistODM(mongo.collection('properties'), items));
            }

            if (marker.type === MarkerTypeEnum.police) {
                let { data: { incidentSearchInRange: incidents } } = await query({
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
                            # creator
                            # assignee
                        }
                    }`
                });
                // const incidents = await orm.Incident.findAll({
                //     attributes: [
                //         `lat`,
                //         `lng`,
                //         `date`,
                //         `type`,
                //         `outcome`
                //     ],
                //     where: {
                //         lat: marker.lat,
                //         lng: marker.lng,
                //     },
                //     limit,
                //     offset: limit * iter
                //     raw: true,
                // }) as unknown as IncidentType[];

                recordsInBatch += incidents.length;
                processedRecords += incidents.length;

                const cache = incidents.reduce((acc, incident) => {
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
                queue.add(persistODM(mongo.collection('incidents'), items));
            }
        }

        iter++;
        performance.mark(`iter-${iter}`);
        performance.measure(`diff-${iter - 1}->${iter}`, `iter-${iter - 1}`, `iter-${iter}`);

        processingInfo();

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

    performance.mark(`iter-${iter}`);

    processingInfo(true);

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
