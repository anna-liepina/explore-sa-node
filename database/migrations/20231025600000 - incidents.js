'use strict';

const { coordinates, postcode } = require('../utils/commonFields');

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
                    // Crime ID
                    guid: {
                        type: Sequelize.STRING,
                        // unique: true,
                        // allowNull: false,
                    },
                    // Month
                    date: {
                        type: Sequelize.DATEONLY,
                    },
                    ...postcode(Sequelize),
                    ...coordinates(Sequelize),
                    // Crime type
                    type: {
                        type: Sequelize.STRING,
                    },
                    // Last outcome category
                    outcome: {
                        type: Sequelize.STRING,
                    },
                    // LSOA code
                    // lsoa: {
                    //     type: Sequelize.STRING,
                    // },
                    // LSOA name
                    // area: {
                    //     type: Sequelize.STRING,
                    // },
                    // Reported By
                    creator: {
                        type: Sequelize.STRING,
                    },
                    // Reported by
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
