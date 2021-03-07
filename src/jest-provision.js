import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import orm from './orm';
import { typeDefs, resolvers } from './graphql';
import compose from './dataloader';

const server = new ApolloServer({
    typeDefs,
    resolvers,
    dataSources: () => ({}),
    context: () => ({ orm, dataloader: compose(orm) }),
});

const { query, mutate } = createTestClient(server);

global.server = server;
global.query = query;
global.mutate = mutate;

afterAll(() => {
    return orm.sequelize.close()
});
