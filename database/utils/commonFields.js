module.exports = {
    coordinates: (Sequelize) => ({
        lat: Sequelize.DECIMAL(12, 9),
        lng: Sequelize.DECIMAL(12, 9),
    }),
    postcode: (Sequelize, config) => ({
        postcode: {
            type: Sequelize.STRING(9),
            ...config
        },
    }),
    guid: (Sequelize) => ({
        guid: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    })
}