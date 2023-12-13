'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addIndex('postcodes', ['lsoa']);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeIndex('postcodes', ['lsoa']);
    }
};
