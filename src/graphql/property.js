export default {
    typeDefs: `
        extend type Query {
            property(id: ID!): Property
            propertySearch(
                postcode: String!
                perPage: Int = 100
                page: Int = 1
            ): [Property]
            propertySearchWithInRange(
                pos: Point!
                range: Float = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 100
                page: Int = 1
            ): [Property]
        }

        input Point {
            lat: Float!
            lng: Float!
        }

        enum GeoUnit {
            km
            ml
        }

        type Property {
            id: ID!
            postcode: Postcode
        # Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
            propertyType: String
        # Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
        # Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
            propertyForm: String,
        # PAON	Primary Addressable Object Name. Typically the house number or name.
            paon: String
        # SAON	Secondary Addressable Object Name. Where a property has been divided into separate units (for example, flats),
        # the PAON (above) will identify the building and a SAON will be specified that identifies the separate unit/flat.
            saon: String
            street: String
            city: String

            transactions: [Transaction]
        # distance fields, used only in propertySearchWithInRange
            distance: Float
        }
    `,
    resolvers: {
        Query: {
            property: (entity, args, { orm }, info) => {
                return orm.Property.findOne({
                    where: args,
                    raw: true,
                });
            },
            propertySearch: (entity, { postcode, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;

                return orm.Property.findAll({
                    where: {
                        postcode: {
                            [orm.Sequelize.Op.like]: `${postcode}%`,
                        },
                    },
                    offset,
                    limit,
                    raw: true,
                });
            },
            propertySearchWithInRange: (entity, { pos, range, rangeUnit, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;
                /** 1ml = 1.60934km */
                const coefficient = 'ml' === rangeUnit ? 1.60934 : 1;
                const distance = range * 1000 * coefficient;
                /** 1 lat/lng is ~111km */
                const adjust = range / 111 * coefficient;
                const { lat, lng } = pos;

                return orm.Property.findAll({
                    include: [
                        {
                            model: orm.Postcode,
                            required: true,
                            attributes: [
                                [
                                    orm.Sequelize.fn(
                                        'ST_Distance_Sphere',
                                        orm.Sequelize.fn('POINT', lat, lng),
                                        orm.Sequelize.fn('POINT', orm.Sequelize.col('Postcode.lat'), orm.Sequelize.col('Postcode.lng')),
                                    ),
                                    'distance'
                                ],
                            ],
                            where: {
                                lat: {
                                    [orm.Sequelize.Op.between]: [lat - adjust, lat + adjust],
                                },
                                lng: {
                                    [orm.Sequelize.Op.between]: [lng - adjust, lng + adjust],
                                },
                            },
                        },
                    ],
                    having: {
                        'Postcode.distance': {
                            [orm.Sequelize.Op.lte]: distance,
                        },
                    },
                    order: [
                        [orm.Sequelize.literal('`Postcode.distance`'), 'ASC'],
                    ],
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
        Property: {
            postcode: (entity, args, { dataloader }, info) => {
                return dataloader.getPostcode.load(entity.postcode);
            },
            distance: (entity, args, context, info) => {
                /** check propertySearchWithInRange resolver */
                return entity['Postcode.distance'];
            },
            transactions: (entity, args, { dataloader }, info) => {
                return dataloader.getTransactions.load(entity.guid);
            }
        }
    },
}
