import type SequelizeType from "sequelize/types/sequelize";
import type Model from "sequelize/types/model";
import type { ModelStatic } from 'sequelize';

// will be fixed later with dynamic import and typescript
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

    Area: ModelStatic<Model<AreaType, AreaType>>,
    Postcode: ModelStatic<Model<PostcodeType, PostcodeType>>,
    Property: ModelStatic<Model<PropertyType, PropertyType>>,
    Timeline: ModelStatic<Model<TimelineType, TimelineType>>,
    Transaction: ModelStatic<Model<TransactionType, TransactionType>>,
    Incident: ModelStatic<Model<IncidentType, IncidentType>>,
    Marker: ModelStatic<Model<MarkerType, MarkerType>>,
};

export type IdentifiedModel = {
    id: number
}

export type GloballyIdentifiedModel = {
    guid: string
}
