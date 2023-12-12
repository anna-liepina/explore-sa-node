'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:properties': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('properties', ['postcode']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('properties', ['postcode']);
    }
};
