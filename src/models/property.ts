import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';

import type { GloballyIdentifiedModel, IdentifiedModel } from "../orm.types";

export type PropertyType = {
    postcode: string,
    propertyType: string,
    propertyForm: string,
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
            // Duration	Relates to the tenure: F = Freehold, L = Leasehold etc.
            // Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
            propertyForm: DataTypes.STRING(1),
            city: DataTypes.STRING,
        },
        {
            tableName: 'properties',
            timestamps: false,
        }
    );

    return model;
};
