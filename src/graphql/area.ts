import type { WhereAttributeHash } from "sequelize/types/model";
import type { AreaType } from "../models/area";

export default {
    typeDefs: `
        extend type Query {
            areaSearch(
                postcodePattern: String
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
            areaSearch: (entity, { postcodePattern, perPage: limit, page }, { orm }): Promise<AreaType[]> => {
                const where: WhereAttributeHash = {};
                const offset: number = (page - 1) * limit;

                if (postcodePattern) {
                    where[orm.Sequelize.Op.or] = [
                        {
                            area: {
                                [orm.Sequelize.Op.startsWith]: postcodePattern,
                            },
                        },
                        {
                            city: {
                                [orm.Sequelize.Op.startsWith]: postcodePattern,
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
