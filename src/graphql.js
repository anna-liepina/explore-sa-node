import { gql } from 'apollo-server-express';
import { merge } from 'lodash';

import area from './graphql/area';
import postcode from './graphql/postcode';
import property from './graphql/property';
import timeline from './graphql/timeline';
import transaction from './graphql/transaction';

export const typeDefs = gql`
    type Query
    type Mutation

    ${area.typeDefs}
    ${postcode.typeDefs}
    ${property.typeDefs}
    ${timeline.typeDefs}
    ${transaction.typeDefs}
`;

export const resolvers = merge(
    area.resolvers,
    postcode.resolvers,
    property.resolvers,
    timeline.resolvers,
    transaction.resolvers,
);
