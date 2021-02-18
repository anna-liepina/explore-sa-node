export default {
    typeDefs: `
        extend type Query {
            postcode(postcode: String!): Postcode
            postcodeSearch(pattern: String!, perPage: Int = 25, page: Int = 1): [Postcode]
        }

        extend type Mutation {
            addPostcode(input: AddPostcodeInput!): Postcode
            updatePostcode(postcode: String!, input: UpdatePostcodeInput!): Postcode
        }

        input AddPostcodeInput {
            postcode: String!
            lat: Float
            lng: Float
        }

        input UpdatePostcodeInput {
            lat: Float
            lng: Float
        }

        type Postcode {
            postcode: String
            lat: Float
            lng: Float
            url: String
        }
    `,
    resolvers: {
        Query: {
            postcode: (entity, args, { orm }, info) => {
                return orm.Postcode.findOne({
                    where: args,
                    raw: true,
                });
            },
            postcodeSearch: (entity, { pattern, perPage: limit, page }, { orm }, info) => {
                const offset = (page - 1) * limit;

                return orm.Postcode.findAll({
                    where: {
                        postcode: {
                            [orm.Sequelize.Op.like]: `${pattern}%`,
                        },
                    },
                    offset,
                    limit,
                    raw: true,
                });
            },
        },
        Mutation: {
            addPostcode: (entity, { input }, { orm }, info) => {
                return orm.Postcode.create(
                    { ...input },
                    {}
                );
            },
            updatePostcode: (entity, { postcode, input }, { orm }, info) => {
                const { id, ...values } = input;

                return orm.Status.update(
                    { ...values },
                    {
                        where: {
                            postcode,
                        }
                    }
                );
            },
        },
        Postcode: {
            url: (entity, args, context, info) => `https://www.google.com/maps/search/?api=1&query=${entity.lat},${entity.lng}`,
        }
    },
}
