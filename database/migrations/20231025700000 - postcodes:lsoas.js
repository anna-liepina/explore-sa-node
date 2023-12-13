'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('postcodes', 'lsoa', Sequelize.STRING)
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeColumn('postcodes', 'lsoa');
    }
};
