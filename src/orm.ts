import Sequelize from 'sequelize';
import type SequelizeType from "sequelize/types/sequelize";
import type { ORM } from './orm.types';

//@ts-ignore
import conf from './orm-config';

// will be fixed later with dynamic import and typescript
import Area from './models/area';
import Postcode from './models/postcode';
import Property from './models/property';
import Timeline from './models/timeline';
import Transaction from './models/transaction';
import Incident from './models/incident';
import Marker from './models/marker';

const sequelizeConfig = conf[process.env.NODE_ENV];

// @ts-ignore
const sequelize = new Sequelize(sequelizeConfig);

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

const orm: Partial<ORM> = [
    Area,
    Postcode,
    Property,
    Timeline,
    Transaction,
    Marker,
    Incident
].reduce(
    (acc, construct) => {
        const model = construct(sequelize);
        acc[model.name] = model;

        return acc;
    },
    {
        sequelize,
        Sequelize: Sequelize as unknown as SequelizeType
    }
);

for (const name in orm) {
    const model = orm[name];

    if (model.associate) {
        model.associate(orm);
    }
}

export default orm as ORM;
