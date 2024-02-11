import type { PostcodeType } from "../models/postcode";
import type { PropertyType } from "../models/property";
import type { TransactionType } from "../models/transaction";
import { coordinateRanges } from "./utils";

export default {
    typeDefs: `
        extend type Query {
            propertySearch(
                postcodePattern: String!
                perPage: Int = 100
                page: Int = 1
            ): [Property]
            propertySearchInRange(
                pos: Point!
                range: Float = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 100
                page: Int = 1
            ): [Property]
        }

        type Property {
            id: ID!
            address: String
            postcode: Postcode
            transactions: [Transaction]
        # Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
            propertyType: String
        # Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
        # Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
            propertyForm: String
        }
    `,
    resolvers: {
        Query: {
            propertySearch: (entity, { postcodePattern, perPage: limit, page }, { orm }): Promise<PropertyType[]>  => {
                const offset: number = (page - 1) * limit;

                return orm.Property.findAll({
                    where: {
                        postcode: {
                            [orm.Sequelize.Op.startsWith]: postcodePattern,
                        },
                    },
                    offset,
                    limit,
                    raw: true,
                });
            },
            propertySearchInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }): Promise<Partial<PropertyType>[]> => {
                const { latitudeRange, longitudeRange } = coordinateRanges(pos.lat, pos.lng, range, rangeUnit);
                const offset: number = (page - 1) * limit;

                return orm.Property.findAll({
                    include: [
                        {
                            model: orm.Postcode,
                            required: true,
                            attributes: [],
                            where: {
                                lat: {
                                    [orm.Sequelize.Op.between]: latitudeRange,
                                },
                                lng: {
                                    [orm.Sequelize.Op.between]: longitudeRange,
                                },
                            },
                        },
                    ],
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
        Property: {
            address: (entity: PropertyType): string => entity.guid.slice(entity.postcode.length + 2),
            postcode: (entity: PropertyType, args, { dataloader }): Promise<PostcodeType> => {
                return dataloader.getPostcode.load(entity.postcode);
            },
            transactions: (entity: PropertyType, args, { dataloader }): Promise<TransactionType[]> => {
                return dataloader.getTransactions.load(entity.guid);
            }
        }
    },
}
