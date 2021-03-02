'use strict';

const fs = require('fs');
const csv = require('csv-parse/lib/sync');
const path = require('path');

const tables = [
    /**
        SELECT
            area,
            city
        FROM
            areas
        WHERE
            area LIKE "E20%"
    */
    'areas',
    /**
        SELECT
            postcode,
            lat,
            lng
        FROM
            postcodes
        WHERE
            postcode LIKE "E20%"
    */
    'postcodes',
    /**
        SELECT
            CONCAT(
                postcode,
                '-',
                IF(street IS NULL OR street = '', '', street),
                IF(paon IS NULL OR paon = '', '', CONCAT(' ', SHA1(paon))),
                IF(saon IS NULL OR saon = '', '', CONCAT('-', SHA1(saon)))
            ) AS guid,
            postcode,
            SHA1(paon) AS paon,
            SHA1(saon) AS saon,
            street
        FROM
            properties AS a
        WHERE
            postcode LIKE "E20%"
    */
    'properties',
    /**
        SELECT
            postcode,
            date,
            avg,
            count
        FROM
            timelines
        WHERE
            postcode LIKE "E20%"
    */
    'timelines',
    /**
        SELECT
            CONCAT(
                postcode,
                '-',
                IF(street IS NULL OR street = '', '', street),
                IF(paon IS NULL OR paon = '', '', CONCAT(' ', SHA1(paon))),
                IF(saon IS NULL OR saon = '', '', CONCAT('-', SHA1(saon)))
            ) AS guid,
            price,
            date
        FROM
            properties AS a
            JOIN transactions AS b on a.guid = b.guid
        WHERE
            postcode LIKE "E20%"
    */
    'transactions',
];

module.exports = {
    up: async (queryInterface, Sequelize) => {
        for (const table of tables) {

            const p = path.join(__dirname, '..', `fixtures-data/${table}.csv`);

            const content = fs
                .readFileSync(p);

            const data = csv(content, { columns: true });

            /**
             * Create and insert multiple instances in bulk.
             *
             * The success handler is passed an array of instances, but please notice that these may not completely represent the state of the rows in the DB. This is because MySQL
             * and SQLite do not make it easy to obtain back automatically generated IDs and other default values in a way that can be mapped to multiple records.
             * To obtain Instances for the newly created values, you will need to query for them again.
             *
             * If validation fails, the promise is rejected with an array-like AggregateError
             *
             * @param  {Array}          records                          List of objects (key/value pairs) to create instances from
             * @param  {object}         [options]                        Bulk create options
             * @param  {Array}          [options.fields]                 Fields to insert (defaults to all fields)
             * @param  {boolean}        [options.validate=false]         Should each row be subject to validation before it is inserted. The whole insert will fail if one row fails validation
             * @param  {boolean}        [options.hooks=true]             Run before / after bulk create hooks?
             * @param  {boolean}        [options.individualHooks=false]  Run before / after create hooks for each individual Instance? BulkCreate hooks will still be run if options.hooks is true.
             * @param  {boolean}        [options.ignoreDuplicates=false] Ignore duplicate values for primary keys? (not supported by MSSQL or Postgres < 9.5)
             * @param  {Array}          [options.updateOnDuplicate]      Fields to update if row key already exists (on duplicate key update)? (only supported by MySQL, MariaDB, SQLite >= 3.24.0 & Postgres >= 9.5). By default, all fields are updated.
             * @param  {Transaction}    [options.transaction]            Transaction to run query under
             * @param  {Function}       [options.logging=false]          A function that gets executed while running the query to log the sql.
             * @param  {boolean}        [options.benchmark=false]        Pass query execution time in milliseconds as second argument to logging function (options.logging).
             * @param  {boolean|Array}  [options.returning=false]        If true, append RETURNING <model columns> to get back all defined values; if an array of column names, append RETURNING <columns> to get back specific columns (Postgres only)
             * @param  {string}         [options.searchPath=DEFAULT]     An optional parameter to specify the schema search_path (Postgres only)
             *
             * @returns {Promise<Array<Model>>}
             */
            await queryInterface.bulkInsert(
                table,
                data
            );
        }
    },

    down: async (queryInterface, Sequelize) => {
        for (const table of tables) {
            await queryInterface.bulkDelete(table);
        }
    },
};
