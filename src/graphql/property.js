export default {
    typeDefs: `
        extend type Query {
            property(id: ID!): Property
            propertySearch(postcode: String!, perPage: Int = 25, page: Int = 1): [Property]
            propertySearchWithInRange(
                pos: Point!
                range: Int = 1
                rangeUnit: GeoUnit = km
                perPage: Int = 25
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
                const { lat, lng } = pos;

                /**
                One degree of latitude equals approximately 364,000 feet (69 miles)
                One-degree of longitude equals 288,200 feet (54.6 miles)
                */
                const coefficient = 'ml' === rangeUnit ? 1 : 1 / 0.621371;

                const adjustLat = (range / 69) * coefficient;
                const adjustLng = (range / 54.6) * coefficient;

                /** ST_Distance_Sphere */
                const radius = range * 1000 * ('ml' === rangeUnit ? 1 / 0.621371 : 1);

                const planetRadius = 'ml' === rangeUnit ? 3961 : 6371;

                return orm.Property.findAll({
                    include: [
                        {
                            model: orm.Postcode,
                            required: true,
                            attributes: [
                                [
                                    // orm.Sequelize.fn(
                                    //     'ST_Distance_Sphere',
                                    //     orm.Sequelize.fn('POINT', lat, lng),
                                    //     orm.Sequelize.fn('POINT', orm.Sequelize.col('Postcode.lat'), orm.Sequelize.col('Postcode.lng')),
                                    // ),
                                    orm.Sequelize.literal(`
( ${planetRadius} * acos(
    cos( radians(${lat}) )
    * cos( radians(Postcode.lat) )
    * cos( radians(Postcode.lng) - radians(${lng}) )
    + sin( radians(${lat}) )
    * sin( radians(Postcode.lat) )
    )
)`),
                                    'distance'
                                ],
                            ],
                            where: {
                                lat: {
                                    [orm.Sequelize.Op.between]: [lat - adjustLat, lat + adjustLat],
                                },
                                lng: {
                                    [orm.Sequelize.Op.between]: [lng - adjustLng, lng + adjustLng],
                                },
                            },
                        },
                    ],
                    having: {
                        'Postcode.distance': {
                            [orm.Sequelize.Op.lte]: radius,
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
