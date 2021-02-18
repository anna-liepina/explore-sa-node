'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'areas',
                {
                    area: {
                        type: Sequelize.STRING(4),
                        primaryKey: true,
                    },
                    city: {
                        type: Sequelize.STRING,
                        primaryKey: true,
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('areas');
    }
};
