'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('markers', 'label', Sequelize.STRING);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeColumn('markers', 'label');
    }
};
