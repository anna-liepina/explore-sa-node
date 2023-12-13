import type { PostcodeType } from "../models/postcode";

export default {
    typeDefs: `
        extend type Query {
            postcodeSearch(
                pattern: String!
                perPage: Int = 100
                page: Int = 1
            ): [Postcode]
        }

        type Postcode {
            postcode: String
            lat: Float
            lng: Float
            url: String
            lsoa: String
        }
    `,
    resolvers: {
        Query: {
            postcodeSearch: (entity, { pattern, perPage: limit, page }, { orm }): Promise<PostcodeType[]> => {
                const offset: number = (page - 1) * limit;

                return orm.Postcode.findAll({
                    where: {
                        postcode: {
                            [orm.Sequelize.Op.like]: `${pattern}%`,
                        },
                    },
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
        Postcode: {
            url: (entity: PostcodeType): string => `https://www.google.com/maps/search/?api=1&query=${entity.lat},${entity.lng}`,
        }
    },
}
