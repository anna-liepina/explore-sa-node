import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type IncidentType = {
    id: number,
    date: string,
    lat: number,
    lng: number,
    type: string,
    outcome: string,
    creator: string,
    assignee: string,
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
            date: {
                type: DataTypes.DATEONLY,
            },
            // Latitude
            lat: {
                type: DataTypes.DECIMAL(12, 9),
            },
            // Longitude
            lng: {
                type: DataTypes.DECIMAL(12, 9),
            },
            // Crime type
            type: {
                type: DataTypes.STRING,
            },
            // Last outcome category
            outcome: {
                type: DataTypes.STRING,
            },
            // Reported By
            creator: {
                type: DataTypes.STRING,
            },
            // Reported by
            assignee: {
                type: DataTypes.STRING,
            },
        },
        {
            tableName: 'incidents',
            timestamps: false,
        }
    );

    return model;
};
