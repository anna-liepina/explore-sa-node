import { gql } from 'apollo-server-express';
import { merge } from 'lodash';

import area from './area';
import postcode from './postcode';
import property from './property';
import timeline from './timeline';
import transaction from './transaction';

export const typeDefs = gql`
    type Query

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
