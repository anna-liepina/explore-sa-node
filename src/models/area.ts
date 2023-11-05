import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type AreaType = {
    area: string,
    city: string,
}

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Area',
        {
            area: {
                type: DataTypes.STRING(4),
                primaryKey: true,
            },
            city: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            tableName: 'areas',
            timestamps: false,
        }
    );

    return model;
};
