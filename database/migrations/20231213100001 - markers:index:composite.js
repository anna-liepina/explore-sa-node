'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:markers': true,
    'parse:properties': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('markers', ['lat', 'lng']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('markers', ['lat', 'lng']);
    }
};
