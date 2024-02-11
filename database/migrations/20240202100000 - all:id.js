'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('incidents', 'id'),
            queryInterface.removeColumn('markers', 'id'),
            queryInterface.removeColumn('properties', 'id'),
            queryInterface.removeColumn('timelines', 'id'),
            queryInterface.removeColumn('transactions', 'id'),
        ]);
    },

    down: (queryInterface, Sequelize) => {
        const signature = {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        };

        Promise.all([
            queryInterface.addColumn('incidents', 'id', signature),
            queryInterface.addColumn('markers', 'id', signature),
            queryInterface.addColumn('properties', 'id', signature),
            queryInterface.addColumn('timelines', 'id', signature),
            queryInterface.addColumn('transactions', 'id', signature),
        ]);
    }
};
