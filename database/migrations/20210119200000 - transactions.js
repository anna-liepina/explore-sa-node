'use strict';

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
                    guid: {
                        type: Sequelize.STRING,
                        allowNull: false,
                    },
                    price: {
                        type: Sequelize.INTEGER,
                    },
                    date: {
                        type: Sequelize.DATEONLY,
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('transactions');
    }
};
