import type { WhereAttributeHash } from "sequelize/types/model";
import type { TimelineType } from "../models/timeline";

export default {
    typeDefs: `
        extend type Query {
            timelineSearch(
                postcodePattern: String
                postcodes: [String]
                dateFrom: String
                dateTo: String
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
            timelineSearch: (entity, { postcodePattern, postcodes, from, to, perPage: limit, page }, { orm }): Promise<TimelineType[]> => {
                const offset: number = (page - 1) * limit;
                const where: WhereAttributeHash = {
                    postcode: {
                        [orm.Sequelize.Op.or]: [],
                    },
                };

                if (postcodePattern) {
                    where.postcode[orm.Sequelize.Op.or].push({
                        [orm.Sequelize.Op.like]: `${postcodePattern}%`
                    });
                }

                if (postcodes) {
                    where.postcode[orm.Sequelize.Op.or].push({
                        [orm.Sequelize.Op.in]: postcodes
                    });
                }

                if (dateFrom) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.gte] = dateFrom;
                }

                if (dateTo) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.lte] = dateTo;
                }

                return orm.Timeline.findAll({
                    where,
                    offset,
                    order: [
                        ['date', 'ASC']
                    ],
                    limit,
                    raw: true,
                });
            },
        },
    },
}
