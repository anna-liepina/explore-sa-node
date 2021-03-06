export default {
    typeDefs: `
        extend type Query {
            timelineSearch(
                pattern: String
                postcodes: [String]
                from: String
                to: String
                perPage: Int = 100
                page: Int = 1
            ): [Timeline]
        }

        type Timeline {
            postcode: String
            date: String
            avg: Int
            count: Int
        }
    `,
    resolvers: {
        Query: {
            timelineSearch: (entity, { postcodes, pattern, from, to, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;

                const where = {
                    postcode: {
                        [orm.Sequelize.Op.or]: [],
                    },
                };

                if (postcodes) {
                    where.postcode[orm.Sequelize.Op.or].push({
                        [orm.Sequelize.Op.in]: postcodes
                    });
                    // where.postcode[orm.Sequelize.Op.in] = postcodes;
                }

                if (pattern) {
                    where.postcode[orm.Sequelize.Op.or].push({
                        [orm.Sequelize.Op.like]: `${pattern}%`
                    });

                    // where.postcode[orm.Sequelize.Op.like] = `${pattern}%`;
                }

                if (from) {
                    where.date = {
                        [orm.Sequelize.Op.gte]: from,
                    }

                }
                if (to) {
                    where.date = {
                        [orm.Sequelize.Op.lte]: to,
                    }
                }

                if (from || to) {
                    where.date = {
                        [orm.Sequelize.Op.between]: [from, to],
                    }
                }

                return orm.Timeline.findAll({
                    where,
                    offset,
                    order: [['date', 'ASC']],
                    limit,
                    raw: true,
                });
            },
        },
    },
}
