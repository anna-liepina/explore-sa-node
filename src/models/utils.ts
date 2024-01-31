import { DataTypes } from 'sequelize';

export type CoordinateFields = {
    lat: number,
    lng: number,
}

export const coordinateFields = () => ({
    lat: DataTypes.DECIMAL(12, 9),
    lng: DataTypes.DECIMAL(12, 9),
});