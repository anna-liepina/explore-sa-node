#!/usr/bin/env node

import https from "https";
import http from "http";
import fs from "fs";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import { typeDefs, resolvers } from "./graphql/schema";
import orm from "./orm";
import compose from "./dataloader";

const app = express();
app.use(
    cors({
        origin: "*",
        methods: "GET,PATCH",
        preflightContinue: false,
        optionsSuccessStatus: 204,
        credentials: true,
    })
);

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
apollo.applyMiddleware({ app, path: '/' });

const { SSL_KEY, SSL_CERT, PORT } = process.env;
const ssl = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);
const server = ssl
  ? https.createServer(
        {
            key: fs.readFileSync(SSL_KEY),
            cert: fs.readFileSync(SSL_CERT),
        },
        app
    )
  : http.createServer(app);

server.listen({ port: PORT }, () => {
    console.info(`GraphQL ready on: http${ssl ? "s" : ""}://localhost:${PORT}${apollo.graphqlPath}`);
});
