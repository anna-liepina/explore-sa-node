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
                    date: {
                        type: Sequelize.DATEONLY,
                    },
                    ...coordinates(Sequelize),
                    type: {
                        type: Sequelize.STRING,
                    },
                    outcome: {
                        type: Sequelize.STRING,
                    },
                    creator: {
                        type: Sequelize.STRING,
                    },
                    assignee: {
                        type: Sequelize.STRING,
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('incidents');
    }
};
