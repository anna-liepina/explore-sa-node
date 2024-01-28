import type { WhereAttributeHash } from "sequelize/types/model";
import type { TimelineType } from "../models/timeline";

export default {
    typeDefs: `
        extend type Query {
            timelineSearch(
                postcodePattern: String
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
            timelineSearch: (entity, { postcodePattern, postcodes, dateFrom, dateTo, perPage: limit, page }, { orm }): Promise<TimelineType[]> => {
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

                    // where.postcode[orm.Sequelize.Op.like] = `${pattern}%`;
                }

                if (postcodes) {
                    where.postcode[orm.Sequelize.Op.or].push({
                        [orm.Sequelize.Op.in]: postcodes
                    });
                    // where.postcode[orm.Sequelize.Op.in] = postcodes;
                }

                if (from) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.gte] = from;
                }

                if (to) {
                    where.date ||= {};
                    where.date[orm.Sequelize.Op.lte] = to;
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
