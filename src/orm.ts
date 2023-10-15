//@ts-nocheck
import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import conf from './orm-config';

// will be fixed later with dynamic import and typescript
import Area from './models/area';
import Geo from './models/geo';
import Postcode from './models/postcode';
import Property from './models/property';
import Timeline from './models/timeline';
import Transaction from './models/transaction';

const c = conf[process.env.NODE_ENV];

const s = new Sequelize(c.database, c.username, c.password, c);

// const orm = fs
//     .readdirSync(`${__dirname}/models`)
//     .reduce(
//         (acc, file) => {
//             if ((file.indexOf('.') !== 0) && (file.slice(-3) === '.js')) {
//                 const model = require(path.join(__dirname, '/models', file)).default(
//                     sequelize,
//                     Sequelize.DataTypes,
//                 );
//                 acc[model.name] = model;
//             }

//             return acc;
//         },
//         {}
//     );

const orm = [
    Area,
    Geo,
    Postcode,
    Property,
    Timeline,
    Transaction,
].reduce(
    (acc, construct) => {
        const model = construct(
            s,
            Sequelize.DataTypes,
        );
        acc[model.name] = model;

        return acc;
    },
    {}
);

for (const name in orm) {
    const model = orm[name];

    if (model.associate) {
        model.associate(orm);
    }
}

orm.sequelize = s;
orm.Sequelize = Sequelize;

export default orm;
