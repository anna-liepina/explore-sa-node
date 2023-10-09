//@ts-nocheck
export default (sequelize, DataTypes) => {
    const model = sequelize.define(
        'Area',
        {
            area: {
                type: DataTypes.STRING(4),
                primaryKey: true,
            },
            city: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            tableName: 'areas',
            timestamps: false,
        }
    );

    return model;
};
