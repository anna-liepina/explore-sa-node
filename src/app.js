#!/usr/bin/env node

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import { typeDefs, resolvers } from './graphql';
import orm from './orm';
import compose from './dataloader';

const server = new ApolloServer({
    // cors: {
    //     origin: "*",
    //     methods: "POST",
    //     preflightContinue: false,
    //     optionsSuccessStatus: 204,
    //     credentials: true,
    // },
    typeDefs,
    resolvers,
    tracing: true,
    context: {
        orm,
        dataloader: compose(orm),
    },
    /** if you want console.log */
    formatError: (r) => {
        return r;
    },
    /** if you want console.log */
    formatResponse: (r) => {
        return r;
    },
})

const app = express();
app.use(cors({
    origin: "*",
    methods: "POST",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
}))

server.applyMiddleware({
    app,
});

app
    .listen({ port: process.env.PORT }, () => {
        console.log(`GraphQL ready on: http://localhost:${process.env.PORT}${server.graphqlPath}`);
    });
