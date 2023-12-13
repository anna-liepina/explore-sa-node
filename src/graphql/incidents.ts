import type { WhereAttributeHash } from "sequelize/types/model";
import type { IncidentType } from "../models/incident";
import type { PostcodeType } from "../models/postcode";
import { coordinatesWithinRange } from "./utils";

export default {
    typeDefs: `
        extend type Query {
            incidentSearchWithInRange(
                pos: Point!
                range: Float = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 100
                page: Int = 1
            ): [Incident]
        }

        type Incident {
            guid: String
            postcode: Postcode
            lat: Float
            lng: Float
            lsoa: String
            date: String
            type: String
            outcome: String
            creator: String
            assignee: String
        }
    `,
    resolvers: {
        Query: {
            incidentSearchWithInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }): Promise<Partial<IncidentType>[]> => {
                const { latitudeRange, longitudeRange } = coordinatesWithinRange(pos.lat, pos.lng, range, rangeUnit);
                const offset: number = (page - 1) * limit;

                return orm.Incident.findAll({
                    // attributes: [
                    //     '*',
                    //     [
                    //         orm.Sequelize.fn(
                    //             'ST_Distance_Sphere',
                    //             orm.Sequelize.fn('POINT', lat, lng),
                    //             orm.Sequelize.fn('POINT', orm.Sequelize.col('Incident.lat'), orm.Sequelize.col('Incident.lng')),
                    //         ),
                    //         'distance'
                    //     ],
                    // ],
                    where: {
                        lat: {
                            [orm.Sequelize.Op.between]: latitudeRange,
                        },
                        lng: {
                            [orm.Sequelize.Op.between]: longitudeRange,
                        },
                    },
                    // having: {
                    //     'distance': {
                    //         [orm.Sequelize.Op.lte]: distance,
                    //     },
                    // },
                    // order: [
                    //     [orm.Sequelize.literal('`distance`'), 'ASC'],
                    // ],
                    offset,
                    limit,
                    raw: true,
                });
            },
            // incidentSearch: (entity, { pattern, from, to, perPage: limit, page }, { orm }): Promise<PostcodeType[]> => {
            //     const offset: number = (page - 1) * limit;
            //     const where: WhereAttributeHash = {};

            //     where.postcode = {
            //         [orm.Sequelize.Op.like]: `${pattern}%`,
            //     };
            //     if (from) {
            //         where.date = {
            //             [orm.Sequelize.Op.gte]: from,
            //         }

            //     }
            //     if (to) {
            //         where.date = {
            //             [orm.Sequelize.Op.lte]: to,
            //         }
            //     }

            //     if (from && to) {
            //         where.date = {
            //             [orm.Sequelize.Op.between]: [from, to],
            //         }
            //     }
            //     return orm.Incident.findAll({
            //         where,
            //         offset,
            //         limit,
            //         raw: true,
            //     });
            // },
        },
        Incident: {
            postcode: (entity: IncidentType, args, { dataloader }): Promise<PostcodeType> => {
                return dataloader.getPostcode.load(entity.postcode);
            }
        }
    },
}
