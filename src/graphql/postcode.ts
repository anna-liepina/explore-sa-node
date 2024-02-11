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
                            [orm.Sequelize.Op.startsWith]: pattern,
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
