'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:properties': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('transactions', ['guid']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('transactions', ['guid']);
    }
};
