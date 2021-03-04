export default {
    typeDefs: `
        extend type Query {
            postcodeSearch(pattern: String!, perPage: Int = 25, page: Int = 1): [Postcode]
        }

        type Postcode {
            postcode: String
            lat: Float
            lng: Float
            url: String
        }
    `,
    resolvers: {
        Query: {
            postcodeSearch: (entity, { pattern, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;

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
            url: (entity, args, context, info) => `https://www.google.com/maps/search/?api=1&query=${entity.lat},${entity.lng}`,
        }
    },
}
