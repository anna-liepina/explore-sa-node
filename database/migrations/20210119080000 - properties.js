'use strict';

const { postcode, guid } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'properties',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    ...guid(Sequelize),
                    ...postcode(Sequelize, { allowNull: false }),
                    propertyType: Sequelize.STRING(1),
                    propertyForm: Sequelize.STRING(1),
                    paon: Sequelize.STRING,
                    saon: Sequelize.STRING,
                    street: Sequelize.STRING,
                    city: Sequelize.STRING,
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('properties');
    }
};
