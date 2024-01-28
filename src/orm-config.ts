/** maintained as separate file, because of Sequlize CLI way of including config */

import type { Dialect, Options } from "sequelize";

const {
    DB_HOSTNAME: host,
    DB_USERNAME: username,
    DB_PASSWORD: password,
    DB_PORT: port,
    DB_NAME: database,
    DB_DIALECT: dialect,

    DB_REPLICA_HOSTNAME: replicaHost,
    DB_REPLICA_USERNAME: replicaUsername,
    DB_REPLICA_PASSWORD: replicaPassword
} = process.env;

const orm: Options = {
    host,
    username,
    password,
    port: parseInt(port, 10),
    database,
    dialect: dialect as Dialect,
    pool: {
        acquire: 60000,
        idle: 10000,
        max: 20,
        min: 0,
    }
};

if (replicaHost && replicaUsername && replicaPassword) {
    orm.replication = {
        read: [
            {
                host: replicaHost,
                username: replicaUsername,
                password: replicaPassword,
            },
        ],
        write: {
            host,
            username,
            password,
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
