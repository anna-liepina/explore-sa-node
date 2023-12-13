import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type IncidentType = {
    id: number,
    guid: string,
    date: string,
    postcode: string,
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
            guid: {
                type: DataTypes.STRING,
                // unique: true,
                allowNull: false,
            },
            /// Month
            date: {
                type: DataTypes.DATEONLY,
            },
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
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
            // LSOA code
            // lsoa: {
            //     type: DataTypes.STRING,
            // },
            // LSOA name
            // area: {
            //     type: DataTypes.STRING,
            // },
            // Reported By
            creator: {
                type: DataTypes.STRING,
            },
            // Reported by	Falls within
            assignee: {
                type: DataTypes.STRING,
            },
            // // Context
            // json: {
            //     type: DataTypes.TEXT,
            // }
        },
        {
            tableName: 'incidents',
            timestamps: false,
        }
    );

    //@ts-ignore
    model.associate = ({ Postcode, Incident }) => {
        Postcode.hasMany(Incident, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Incident.belongsTo(Postcode, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
