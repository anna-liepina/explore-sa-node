import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type PostcodeType = {
    postcode: string,
    lat: number,
    lng: number,
    lsoa: string,
}

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Postcode',
        {
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
            },
            lsoa: {
                type: DataTypes.STRING,
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

    //@ts-ignore
    model.associate = ({ Postcode, Property }) => {
        Postcode.hasMany(Property, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Property.belongsTo(Postcode, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
