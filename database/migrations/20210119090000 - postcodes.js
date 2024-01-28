'use strict';

const { coordinates, postcode } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'postcodes',
                {
                    ...postcode(Sequelize, { primaryKey: true }),
                    ...coordinates(Sequelize)
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('postcodes');
    }
};
