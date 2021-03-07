/** maintained as separate file, because of Sequlize CLI way of including config */
/**
export interface Config {
  readonly database: string;
  readonly dialectModule?: object;
  readonly host?: string;
  readonly port?: string;
  readonly username: string;
  readonly password: string | null;
  readonly pool?: {
    readonly acquire: number;
    readonly idle: number;
    readonly max: number;
    readonly min: number;
  };
  readonly protocol: 'tcp';
  readonly native: boolean;
  readonly ssl: boolean;
  readonly replication: boolean;
  readonly dialectModulePath: null | string;
  readonly keepDefaultTimezone?: boolean;
  readonly dialectOptions?: {
    readonly charset?: string;
    readonly timeout?: number;
  };
}
*/

const orm = {
    host: process.env.DB_HOSTNAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: process.env.DB_DIALECT,
    storage: `${__dirname}/../var/database.sqlite`,
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
    development: orm,
    production: orm,
    'undefined': orm,
    test,
}
