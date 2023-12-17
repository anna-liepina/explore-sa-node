import { gql } from 'apollo-server-express';
import { merge } from 'lodash';

import area from './area';
import postcode from './postcode';
import property from './property';
import timeline from './timeline';
import transaction from './transaction';
import incidents from './incidents';
import markers from './marker';

export const typeDefs = gql`
    type Query

    input Point {
        lat: Float!
        lng: Float!
    }

    enum GeoUnit {
        km
        ml
    }

    ${area.typeDefs}
    ${postcode.typeDefs}
    ${property.typeDefs}
    ${timeline.typeDefs}
    ${transaction.typeDefs}
    ${incidents.typeDefs}
    ${markers.typeDefs}
`;

export const resolvers = merge(
    area.resolvers,
    postcode.resolvers,
    property.resolvers,
    timeline.resolvers,
    transaction.resolvers,
    incidents.resolvers,
    markers.resolvers,
);
