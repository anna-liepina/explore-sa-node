//@ts-nocheck
export default {
    typeDefs: `
        extend type Query {
            transaction(id: ID!): Transaction
            transactionSearch(
                postcode: String
                from: String
                to: String
                perPage: Int = 100
                page: Int = 1
            ): [Transaction]
        }

        type Transaction {
            id: ID
            price: Int
            date: String
            property: Property
        }
    `,
    resolvers: {
        Query: {
            transaction: (entity, args, { orm }, info) => {
                return orm.Transaction.findOne({
                    where: args,
                    raw: true,
                });
            },
            transactionSearch: (entity, { postcode, from, to, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;

                const where = {};

                if (postcode) {
                    where.guid = {
                        [orm.Sequelize.Op.like]: `${postcode}%`,
                    }
                }

                if (from) {
                    where.date = {
                        [orm.Sequelize.Op.gte]: from,
                    };
                }

                if (to) {
                    where.date = {
                        [orm.Sequelize.Op.lte]: to,
                    };
                }

                if (from && to) {
                    where.date = {
                        [orm.Sequelize.Op.between]: [from, to],
                    };
                }

                return orm.Transaction.findAll({
                    where,
                    offset,
                    limit,
                    order: [
                        ['guid', 'ASC'],
                        ['date', 'ASC'],
                    ],
                    raw: true,
                });
            },
        },
        Transaction: {
            property: (entity, args, { dataloader }, info) => {
                return dataloader.getProperty.load(entity.guid);
            },
        },
    },
}
