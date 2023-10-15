//@ts-nocheck
export default (sequelize, DataTypes) => {
    const model = sequelize.define(
        'Postcode',
        {
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
            },
            lat: {
                type: DataTypes.DECIMAL(12, 9),
            },
            lng: {
                type: DataTypes.DECIMAL(12, 9),
            },
        },
        {
            tableName: 'postcodes',
            timestamps: false,
        }
    );

    model.associate = ({ Postcode, Property }) => {
        Postcode.hasMany(Property, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Property.belongsTo(Postcode, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
