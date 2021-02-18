'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // const conf = require('../../src/orm-config');
        // if ('postgres' === conf[process.env.NODE_ENV].dialect) {
        //     await queryInterface.sequelize.query('CREATE EXTENSION postgis;');
        // }

        return queryInterface.
            createTable(
                'geo',
                {
                    postcode: {
                        type: Sequelize.STRING(9),
                        primaryKey: true,
                        allowNull: false,
                    },
                    c: {
                        type: Sequelize.GEOMETRY('POINT', 4326),
                        allowNull: false,
                    }
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('geo');
    }
};
