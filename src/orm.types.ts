import type SequelizeType from "sequelize/types/sequelize";
import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

import type { AreaType } from './models/area';
import type { PostcodeType } from './models/postcode';
import type { PropertyType } from './models/property';
import type { TimelineType } from './models/timeline';
import type { TransactionType } from './models/transaction';
import type { IncidentType } from "./models/incident";
import type { MarkerType } from "./models/marker";

export type ORM = {
    sequelize: SequelizeType;
    Sequelize: SequelizeType;

    Area: ModelStatic<Model<AreaType>>,
    Postcode: ModelStatic<Model<PostcodeType>>,
    Property: ModelStatic<Model<PropertyType>>,
    Timeline: ModelStatic<Model<TimelineType>>,
    Transaction: ModelStatic<Model<TransactionType>>,
    Incident: ModelStatic<Model<IncidentType>>,
    Marker: ModelStatic<Model<MarkerType>>,
};
