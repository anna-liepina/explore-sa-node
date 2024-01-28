import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

import type { GloballyIdentifiedModel, IdentifiedModel } from "../orm.types";

export type PropertyType = {
    postcode: string,
    propertyType: string,
    propertyForm: string,
    paon: string,
    saon: string,
    street: string,
    city: string,
} & GloballyIdentifiedModel & IdentifiedModel;

export default (sequelize: Sequelize) => {
    const model = sequelize.define(
        'Property',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            guid: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
            },
            postcode: {
                type: DataTypes.STRING(9),
                allowNull: false,
            },
            // Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
            propertyType: DataTypes.STRING(1),
            // Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
            // Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
            propertyForm: DataTypes.STRING(1),
            // PAON	Primary Addressable Object Name. Typically the house number or name.
            paon: DataTypes.STRING,
            // SAON	Secondary Addressable Object Name. Where a property has been divided into separate units (for example, flats),
            // the PAON (above) will identify the building and a SAON will be specified that identifies the separate unit/flat.
            saon: DataTypes.STRING,
            street: DataTypes.STRING,
            city: DataTypes.STRING,
        },
        {
            tableName: 'properties',
            timestamps: false,
        }
    );

    return model;
};
