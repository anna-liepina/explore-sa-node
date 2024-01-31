import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import { coordinateFields } from './utils';

export type IncidentType = {
    id: number,
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
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            date: DataTypes.DATEONLY,
            ...coordinateFields(),
            type: DataTypes.STRING,
            outcome: DataTypes.STRING,
            creator: DataTypes.STRING,
            assignee: DataTypes.STRING,
        },
        {
            tableName: 'incidents',
            timestamps: false,
        }
    );

    return model;
};
