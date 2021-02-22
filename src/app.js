#!/usr/bin/env node

import https from 'https';
import http from 'http';
import fs from 'fs';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import { typeDefs, resolvers } from './graphql';
import orm from './orm';
import compose from './dataloader';

const apollo = new ApolloServer({
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
});

const app = express();
app.use(cors({
    origin: '*',
    methods: 'GET,PATCH',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
}));

apollo.applyMiddleware({
    app,
});

const ssl = process.env.SSL_KEY && process.env.SSL_CERT;
const server = ssl
    ? https.createServer(
        {
            key: fs.readFileSync(process.env.SSL_KEY),
            cert: fs.readFileSync(process.env.SSL_CERT),
        },
        app
    )
    : http.createServer(app);


server
    .listen({ port: process.env.PORT }, () => {
        console.log(`GraphQL ready on: http${ssl ? 's' : ''}://localhost:${process.env.PORT}${apollo.graphqlPath}`);
    });
