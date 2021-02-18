'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:timelines': true,

    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addIndex('timelines', ['postcode']),
            queryInterface.addIndex('timelines', ['postcode', 'date']),
        ]);
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeIndex('timelines', ['postcode']),
            queryInterface.removeIndex('timelines', ['postcode', 'date']),
        ])
    }
};
