'use strict';

module.exports = {
    /** @see parse:properties.js */
    'parse:properties': true,

    up: (queryInterface, Sequelize) => {
        return queryInterface.addConstraint('properties', {
            fields: ['guid'],
            type: 'unique',
            name: 'properties_guid',
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeConstraint('properties', 'properties_guid');
    }
};
