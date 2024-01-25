import type { MarkerType } from "../models/marker";
import { coordinatesWithinRange } from "./utils";

export default {
    typeDefs: `
        extend type Query {
            markerSearchInRange(
                pos: Point!
                range: Float = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 100
                page: Int = 1
            ): [Marker]
        }

        type Marker {
            type: String
            lat: Float
            lng: Float
            label: String
        }
    `,
    resolvers: {
        Query: {
            markerSearchInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }): Promise<Partial<MarkerType>[]> => {
                const { latitudeRange, longitudeRange } = coordinatesWithinRange(pos.lat, pos.lng, range, rangeUnit);
                const offset: number = (page - 1) * limit;

                return orm.Marker.findAll({
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
