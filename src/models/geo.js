export default (sequelize, DataTypes) => {
    const model = sequelize.define(
        'Geo',
        {
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
            },
            c: {
                type: DataTypes.GEOMETRY('POINT', 4326),
                allowNull: false,
            },
        },
        {
            tableName: 'geo',
            timestamps: false,
        }
    );

    model.associate = ({ Geo, Property }) => {
        Geo.hasMany(Property, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Property.belongsTo(Geo, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
