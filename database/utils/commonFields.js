module.exports = {
    coordinates: (Sequelize) => ({
        // Latitude
        lat: {
            type: Sequelize.DECIMAL(12, 9),
        },
        // Longitude
        lng: {
            type: Sequelize.DECIMAL(12, 9),
        },
    }),
    postcode: (Sequelize) => ({
        postcode: {
            type: Sequelize.STRING(9),
        },
    })
}