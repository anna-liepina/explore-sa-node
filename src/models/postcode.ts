import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import { coordinateFields } from './utils';

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
            lsoa: DataTypes.STRING,
            ...coordinateFields()
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
