'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('incidents', 'creator'),
            queryInterface.removeColumn('incidents', 'assignee'),
        ]);
    },

    down: (queryInterface, Sequelize) => {
        Promise.all([
            queryInterface.addColumn('incidents', 'creator', Sequelize.STRING),
            queryInterface.addColumn('incidents', 'assignee', Sequelize.STRING),
        ]);
    }
};
