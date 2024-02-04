'use strict';

const { guid } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'transactions',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    /** @see orm.Property.guid */
                    ...guid(Sequelize),
                    price: Sequelize.INTEGER,
                    date: Sequelize.DATEONLY,
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('transactions');
    }
};
