import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import compose from '../src/dataloader';
import orm from '../src/orm';
import { typeDefs, resolvers } from '../src/graphql/schema';

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
global.orm = orm;

afterAll(() => {
    return orm.sequelize.close();
});
