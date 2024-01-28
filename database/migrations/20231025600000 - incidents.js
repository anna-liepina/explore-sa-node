'use strict';

const { coordinates } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'incidents',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    date: Sequelize.DATEONLY,
                    ...coordinates(Sequelize),
                    type: Sequelize.STRING,
                    outcome: Sequelize.STRING,
                    creator: Sequelize.STRING,
                    assignee: Sequelize.STRING,
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('incidents');
    }
};
