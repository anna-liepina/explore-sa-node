import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type MarkerType = {
    id: number,
    lat: number,
    lng: number,
    type: string,
}

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Marker',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            lat: {
                type: DataTypes.DECIMAL(12, 9),
            },
            lng: {
                type: DataTypes.DECIMAL(12, 9),
            },
            type: {
                type: DataTypes.STRING,
            },
        },
        {
            tableName: 'markers',
            timestamps: false,
        }
    );

    return model;
};