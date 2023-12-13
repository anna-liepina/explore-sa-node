import type { WhereAttributeHash } from "sequelize/types/model";
import type { IncidentType } from "../models/incident";
import type { PostcodeType } from "../models/postcode";

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
            distance: Float
        }
    `,
    resolvers: {
        Query: {
            incidentSearchWithInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }): Promise<Partial<IncidentType>[]> => {
                const offset: number = (page - 1) * limit;
                /** 1ml = 1.60934km */
                const coefficient: number = 'ml' === rangeUnit ? 1.60934 : 1;
                const distance: number = range * 1000 * coefficient;
                /** 1 lat/lng is ~111km */
                const adjust: number = range / 111 * coefficient;
                const { lat, lng } = pos;

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
                            [orm.Sequelize.Op.between]: [lat - adjust, lat + adjust],
                        },
                        lng: {
                            [orm.Sequelize.Op.between]: [lng - adjust, lng + adjust],
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
            },
            distance: (entity: Partial<PostcodeType>) => {
                /** check propertySearchWithInRange resolver */
                return entity['Incident.distance'];
            },
        }
    },
}
