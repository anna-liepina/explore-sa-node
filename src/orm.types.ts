import type SequelizeType from "sequelize/types/sequelize";
import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

// will be fixed later with dynamic import and typescript
import type { AreaType } from './models/area';
import type { GeoType } from './models/geo';
import type { PostcodeType } from './models/postcode';
import type { PropertyType } from './models/property';
import type { TimelineType } from './models/timeline';
import type { TransactionType } from './models/transaction';


export type ORM = {
    sequelize: SequelizeType;
    Sequelize: SequelizeType;

    Area: ModelStatic<Model<AreaType>>,
    Geo: ModelStatic<Model<GeoType>>,
    Postcode: ModelStatic<Model<PostcodeType>>,
    Property: ModelStatic<Model<PropertyType>>,
    Timeline: ModelStatic<Model<TimelineType>>,
    Transaction: ModelStatic<Model<TransactionType>>,
};

export type IdentifiedModel = {
    id: number
}

export type GloballyIdentifiedModel = {
    guid: string
}
  
export interface WhereCondition {
    [key: string]: any;
}