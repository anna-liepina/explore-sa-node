import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import { coordinateFields } from './utils';

export type IncidentType = {
    date: string,
    lat: number,
    lng: number,
    type: string,
    outcome: string,
}

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Incident',
        {
            date: DataTypes.DATEONLY,
            ...coordinateFields(),
            type: DataTypes.STRING,
            outcome: DataTypes.STRING,
        },
        {
            tableName: 'incidents',
            timestamps: false,
        }
    );
    model.removeAttribute('id');

    return model;
};
