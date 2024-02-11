'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('properties', 'street'),
            queryInterface.removeColumn('properties', 'paon'),
            queryInterface.removeColumn('properties', 'saon'),
        ]);
    },

    down: (queryInterface, Sequelize) => {
        Promise.all([
            queryInterface.addColumn('properties', 'street', Sequelize.STRING),
            queryInterface.addColumn('properties', 'paon', Sequelize.STRING),
            queryInterface.addColumn('properties', 'saon', Sequelize.STRING),
        ]);
    }
};