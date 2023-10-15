#!/usr/bin/env node

import https from "https";
import http from "http";
import fs from "fs";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
//@ts-ignore
import { typeDefs, resolvers } from "./graphql/schema";
//@ts-ignore
import orm from "./orm";
//@ts-ignore
import compose from "./dataloader";

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
app.use(
  cors({
    origin: "*",
    methods: "GET,PATCH",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  })
);

apollo.applyMiddleware({
  app,
});

const { SSL_KEY, SSL_CERT, PORT } = process.env;
const ssl = SSL_KEY && SSL_CERT;
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
  console.log(
    `GraphQL ready on: http${ssl ? "s" : ""}://localhost:${PORT}${
      apollo.graphqlPath
    }`
  );
});
