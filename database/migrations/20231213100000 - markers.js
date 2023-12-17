'use strict';

const { coordinates } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'markers',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    ...coordinates(Sequelize),
                    // Marker type e.g. property, incident etc
                    type: {
                        type: Sequelize.STRING,
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('markers');
    }
};
