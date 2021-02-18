'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'postcodes',
                {
                    postcode: {
                        type: Sequelize.STRING(9),
                        primaryKey: true,
                    },
                    lat: {
                        type: Sequelize.DECIMAL(12, 9),
                    },
                    lng: {
                        type: Sequelize.DECIMAL(12, 9),
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('postcodes');
    }
};
