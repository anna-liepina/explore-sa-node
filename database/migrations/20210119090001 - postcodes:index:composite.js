'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:postcodes': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('postcodes', ['lat', 'lng']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('postcodes', ['lat', 'lng']);
    }
};
