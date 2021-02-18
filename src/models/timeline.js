export default (sequelize, DataTypes) => {
    const model = sequelize.define(
        'Timeline',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            postcode: {
                type: DataTypes.STRING(9),
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATEONLY,
                primaryKey: true,
            },
            avg: {
                type: DataTypes.INTEGER,
            },
            count: {
                type: DataTypes.INTEGER,
            },
        },
        {
            tableName: 'timelines',
            timestamps: false,
        }
    );

    model.associate = ({ Postcode, Timeline }) => {
        Postcode.hasMany(Timeline, { foreignKey: 'postcode', sourceKey: 'postcode' });
        Timeline.belongsTo(Postcode, { foreignKey: 'postcode', targetKey: 'postcode' });
    }

    return model;
};
