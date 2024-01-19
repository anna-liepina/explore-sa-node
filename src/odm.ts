import { MongoClient } from 'mongodb';

const {
    DB_MONGODB_PROTOCOL: protocol,
    DB_MONGODB_HOSTNAME: hostname,
    DB_MONGODB_USERNAME: username,
    DB_MONGODB_PASSWORD: password,
    DB_MONGODB_NAME: db,
    DB_MONGODB_PORT: port,
} = process.env;

const url = `${protocol}://${username}:${password}@${hostname}${port ? `:${port}` : ''}/${db}`;
const client = new MongoClient(url);

client.connect();

export const mongo = client.db(db);