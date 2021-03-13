const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const conf = require('./orm-config');

const c = conf[process.env.NODE_ENV];

const sequelize = new Sequelize(c.database, c.username, c.password, c);

const context = fs
    .readdirSync(`${__dirname}/models`)
    .reduce(
        (acc, file) => {
            if ((file.indexOf('.') !== 0) && (file.slice(-3) === '.js')) {
                const model = require(path.join(__dirname, '/models', file)).default(
                    sequelize,
                    Sequelize.DataTypes,
                );
                acc[model.name] = model;
            }

            return acc;
        },
        {}
    );

for (const name in context) {
    const model = context[name];

    if (model.associate) {
        model.associate(context);
    }
}

context.sequelize = sequelize;
context.Sequelize = Sequelize;

module.exports = context;
