import type { WhereAttributeHash } from "sequelize/types/model";
import type { IncidentType } from "../models/incident";
import type { PostcodeType } from "../models/postcode";

export default {
    typeDefs: `
        extend type Query {
            incidentSearch(
                pattern: String!
                from: String
                to: String
                perPage: Int = 100
                page: Int = 1
            ): [Incident]
        }

        type Incident {
            guid: String
            postcode: Postcode
            lsoa: String
            date: String
            type: String
            outcome: String
            creator: String
            assignee: String
        }
    `,
    resolvers: {
        Query: {
            incidentSearch: (entity, { pattern, from, to, perPage: limit, page }, { orm }): Promise<PostcodeType[]> => {
                const offset: number = (page - 1) * limit;
                const where: WhereAttributeHash = {};

                where.postcode = {
                    [orm.Sequelize.Op.like]: `${pattern}%`,
                };
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

                if (from && to) {
                    where.date = {
                        [orm.Sequelize.Op.between]: [from, to],
                    }
                }
                return orm.Incident.findAll({
                    where,
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
        Incident: {
            postcode: (entity: IncidentType, args, { dataloader }): Promise<PostcodeType> => {
                return dataloader.getPostcode.load(entity.postcode);
            },
        }
    },
}
