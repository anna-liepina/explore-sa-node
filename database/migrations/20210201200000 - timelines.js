'use strict';

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
                    postcode: {
                        type: Sequelize.STRING(9),
                    },
                    date: {
                        type: Sequelize.DATEONLY,
                    },
                    avg: {
                        type: Sequelize.INTEGER,
                    },
                    count: {
                        type: Sequelize.INTEGER,
                    },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('timelines');
    }
};
