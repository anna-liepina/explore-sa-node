import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type GeoType = {
    postcode: string,
    c: any,
}

export default (sequelize: Sequelize) => {
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

    // @ts-ignore
    model.associate = ({ Geo, Property }) => {
        Geo.hasMany(Property, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Property.belongsTo(Geo, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
