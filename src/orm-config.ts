/** maintained as separate file, because of Sequlize CLI way of including config */

import type { Dialect, Options } from "sequelize";

const orm: Options = {
    host: process.env.DB_HOSTNAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: process.env.DB_DIALECT as Dialect,
    pool: {
        acquire: 60000,
        idle: 10000,
        max: 20,
        min: 0,
    }
};

if (process.env.DB_REPLICA_HOSTNAME && process.env.DB_REPLICA_USERNAME && process.env.DB_REPLICA_PASSWORD) {
    orm.replication = {
        read: [
            {
                host: process.env.DB_REPLICA_HOSTNAME,
                username: process.env.DB_REPLICA_USERNAME,
                password: process.env.DB_REPLICA_PASSWORD,
            },
        ],
        write: {
            host: process.env.DB_HOSTNAME,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
        },
    };
}

const test = {
    ...orm,
    logging: false,
    database: `${orm.database}_test`,
    // dialect: 'sqlite',
    // storage: `${__dirname}/../var/database-${process.pid}.sqlite`,
};

module.exports = {
    production: orm,
    development: orm,
    'undefined': orm,
    test,
}
