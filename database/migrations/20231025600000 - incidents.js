'use strict';

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
                    /// Crime ID
                    guid: {
                        type: Sequelize.STRING,
                        // unique: true,
                        allowNull: false,
                    },
                    /// Month
                    date: {
                        type: Sequelize.DATEONLY,
                    },
                    postcode: {
                        type: Sequelize.STRING(9),
                        primaryKey: true,
                    },
                    // Latitude
                    lat: {
                        type: Sequelize.DECIMAL(12, 9),
                    },
                    // Longitude
                    lng: {
                        type: Sequelize.DECIMAL(12, 9),
                    },
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
                    // Reported by	Falls within
                    assignee: {
                        type: Sequelize.STRING,
                    },
                    // Context
                    // json: {
                    //     type: Sequelize.TEXT,
                    // }
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('incidents');
    }
};
