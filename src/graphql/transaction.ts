import type { WhereAttributeHash } from "sequelize/types/model";
import type { PropertyType } from "../models/property";
import type { TransactionType } from "../models/transaction";

export default {
    typeDefs: `
        extend type Query {
            transactionSearch(
                postcodePattern: String
                dateFrom: String
                dateTo: String
                perPage: Int = 100
                page: Int = 1
            ): [Transaction]
        }

        type Transaction {
            price: Int
            date: String
            property: Property
        }
    `,
    resolvers: {
        Query: {
            transactionSearch: (entity, { postcodePattern, dateFrom, dateTo, perPage: limit, page }, { orm }): Promise<TransactionType[]> => {
                const offset: number = (page - 1) * limit;
                const where: WhereAttributeHash = {};

                if (postcodePattern) {
                    where.guid = {
                        [orm.Sequelize.Op.like]: `${postcodePattern}%`,
                    }
                }

                if (dateFrom) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.gte] = dateFrom;
                }

                if (dateTo) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.lte] = dateTo;
                }

                return orm.Transaction.findAll({
                    where,
                    offset,
                    limit,
                    order: [
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
