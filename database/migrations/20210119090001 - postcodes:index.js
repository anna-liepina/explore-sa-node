'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('postcodes', ['lat', 'lng']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('postcodes', ['lat', 'lng']);
    }
};
