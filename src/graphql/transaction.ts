import type { PropertyType } from "../models/property";
import type { TransactionType } from "../models/transaction";
import type { WhereCondition } from "../orm.types";

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
            transaction: (entity, args, { orm }): Promise<TransactionType> => {
                return orm.Transaction.findOne({
                    where: args as WhereCondition,
                    raw: true,
                });
            },
            transactionSearch: (entity, { postcode, from, to, perPage: limit, page }, { orm }): Promise<TransactionType[]> => {
                const offset: number = (page - 1) * limit;
                const where: WhereCondition = {};

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
            property: (entity, args, { dataloader }): Promise<PropertyType> => {
                return dataloader.getProperty.load(entity.guid);
            },
        },
    },
}
