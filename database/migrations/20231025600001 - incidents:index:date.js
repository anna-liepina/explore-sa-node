'use strict';

module.exports = {
    /** @see parse:incidents.js */
    'parse:incidents': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('incidents', ['date']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('incidents', ['date']);
    }
};
