export default {
    typeDefs: `
        extend type Query {
            areaSearch(
                pattern: String
                perPage: Int = 100
                page: Int = 1
            ): [Area]
        }

        type Area {
            area: String
            city: String
        }
    `,
    resolvers: {
        Query: {
            areaSearch: (entity, { pattern, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;
                const where = {};

                if (pattern) {
                    where[orm.Sequelize.Op.or] = [
                        {
                            area: {
                                [orm.Sequelize.Op.like]: `${pattern}%`,
                            },
                        },
                        {
                            city: {
                                [orm.Sequelize.Op.like]: `${pattern}%`,
                            },
                        }
                    ];
                }

                return orm.Area.findAll({
                    where,
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
    },
}
