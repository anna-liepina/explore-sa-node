import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

export type TimelineType = {
    postcode: string,
    date: string,
    avg: number,
    count: number,
};

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Timeline',
        {
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATEONLY,
                primaryKey: true,
            },
            avg: DataTypes.INTEGER,
            count: DataTypes.INTEGER,
        },
        {
            tableName: 'timelines',
            timestamps: false,
        }
    );
    model.removeAttribute('id');

    //@ts-ignore
    model.associate = ({ Postcode, Timeline }) => {
        Postcode.hasMany(Timeline, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Timeline.belongsTo(Postcode, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
