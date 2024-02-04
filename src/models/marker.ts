import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import { coordinateFields } from './utils';

export type MarkerType = {
    id: number,
    lat: number,
    lng: number,
    type: string,
    label: string,
}

export const enum MarkerTypeEnum {
    police = 'police',
    property = 'property'
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
            ...coordinateFields(),
            type: DataTypes.STRING,
            label: DataTypes.STRING,
        },
        {
            tableName: 'markers',
            timestamps: false,
        }
    );

    return model;
};
