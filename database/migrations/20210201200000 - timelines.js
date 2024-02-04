'use strict';

const { postcode } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'timelines',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    ...postcode(Sequelize, { allowNull: false }),
                    date: Sequelize.DATEONLY,
                    avg: Sequelize.INTEGER,
                    count: Sequelize.INTEGER,
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('timelines');
    }
};
