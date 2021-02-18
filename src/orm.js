const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const conf = require('./orm-config');

// /******************************************* */
// /** to tackle sequelize issue for MySQL 5.7+ */
// /******************************************* */
// const wkx = require('wkx');

// if ('mysql' === conf[process.env.NODE_ENV].dialect) {
//     Sequelize.GEOMETRY.prototype._stringify = function _stringify(value, options) {
//         return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
//     }
//     Sequelize.GEOMETRY.prototype._bindParam = function _bindParam(value, options) {
//         return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
//     }
//     Sequelize.GEOGRAPHY.prototype._stringify = function _stringify(value, options) {
//         return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
//     }
//     Sequelize.GEOGRAPHY.prototype._bindParam = function _bindParam(value, options) {
//         return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
//     }
// }
// /******************************************* */

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
