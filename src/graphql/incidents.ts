import type { IncidentType } from "../models/incident";
import { coordinatesWithinRange } from "./utils";

export default {
    typeDefs: `
        extend type Query {
            incidentSearchInRange(
                pos: Point!
                range: Float = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 100
                page: Int = 1
            ): [Incident]
        }

        type Incident {
            lat: Float
            lng: Float
            date: String
            type: String
            outcome: String
            creator: String
            assignee: String
        }
    `,
    resolvers: {
        Query: {
            incidentSearchInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }): Promise<Partial<IncidentType>[]> => {
                const { latitudeRange, longitudeRange } = coordinatesWithinRange(pos.lat, pos.lng, range, rangeUnit);
                const offset: number = (page - 1) * limit;

                return orm.Incident.findAll({
                    where: {
                        lat: {
                            [orm.Sequelize.Op.between]: latitudeRange,
                        },
                        lng: {
                            [orm.Sequelize.Op.between]: longitudeRange,
                        },
                    },
                    offset,
                    limit,
                    raw: true,
                });
            },
        }
    },
}
