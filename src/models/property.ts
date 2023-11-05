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

// https://www.gov.uk/guidance/about-the-price-paid-data#download-options
// [
//    '{7F5EA220-E2DC-46E0-80EF-83B601ABFD78}', // id
//    '59999',                                  // price
//    '1995-01-31 00:00',                       // data of transfer
//    'OX11 0AA',                               // postcode
//    'S',                                      // Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
//    'N',                                      // old/new Y = a newly built property, N = an established residential building
//    'F',                                      // Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
                                                // Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
//    '10',                                     // PAON	Primary Addressable Object Name. Typically the house number or name.
//    '',                                       // SAON	Secondary Addressable Object Name. Where a property has been divided into separate units (for example, flats),
                                                // the PAON (above) will identify the building and a SAON will be specified that identifies the separate unit/flat.
//    'PARK CLOSE',                             // Street
//    'DIDCOT',                                 // Locality
//    'DIDCOT',                                 // Town/City
//    'SOUTH OXFORDSHIRE',                      // District
//    'OXFORDSHIRE',                            // County
//    'A',                                      // PPD Category Type
                                                // Indicates the type of Price Paid transaction.
                                                // A = Standard Price Paid entry, includes single residential property sold for value.
                                                // B = Additional Price Paid entry including transfers under a power of sale/repossessions,
                                                // buy-to-lets (where they can be identified by a Mortgage) and transfers to non-private individuals.
                                                // Note that category B does not separately identify the transaction types stated.
                                                // HM Land Registry has been collecting information on Category A transactions from January 1995. Category B transactions were identified from October 2013.
//    'A'                                       // Record Status - monthly file only
                                                // Indicates additions, changes and deletions to the records.(see guide below).
                                                // A = Addition
                                                // C = Change
                                                // D = Delete.
                                                // Note that where a transaction changes category type due to misallocation (as above) it will be deleted from the original category type and added to the correct category with a new transaction unique identifier.
// ]

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
            // uuid: {
            //     type: DataTypes.STRING,
            // },
            // price: {
            //     type: DataTypes.INTEGER,
            // },
            // date: {
            //     type: DataTypes.DATEONLY,
            // },
            postcode: {
                type: DataTypes.STRING(9),
                allowNull: false,
            },
            // Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
            propertyType: {
                type: DataTypes.STRING(1),
            },
            // Y = a newly built property, N = an established residential building
            // purchaseType: {
            //     type: DataTypes.STRING(1),
            // },
            // Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
            // Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
            propertyForm: {
                type: DataTypes.STRING(1),
            },
            // PAON	Primary Addressable Object Name. Typically the house number or name.
            paon: {
                type: DataTypes.STRING,
            },
            // SAON	Secondary Addressable Object Name. Where a property has been divided into separate units (for example, flats),
            // the PAON (above) will identify the building and a SAON will be specified that identifies the separate unit/flat.
            saon: {
                type: DataTypes.STRING,
            },
            street: {
                type: DataTypes.STRING,
            },
            // locality: {
            //     type: DataTypes.STRING,
            // },
            city: {
                type: DataTypes.STRING,
            },
            // district: {
            //     type: DataTypes.STRING,
            // },
            // county: {
            //     type: DataTypes.STRING,
            // },
            // PPD Category Type
            // Indicates the type of Price Paid transaction.
            // A = Standard Price Paid entry, includes single residential property sold for value.
            // B = Additional Price Paid entry including transfers under a power of sale/repossessions,
            // buy-to-lets (where they can be identified by a Mortgage) and transfers to non-private individuals.

            // Note that category B does not separately identify the transaction types stated.
            // HM Land Registry has been collecting information on Category A transactions from January 1995.
            // Category B transactions were identified from October 2013.
            // ppd: {
            //     type: DataTypes.STRING,
            // },
            // Record Status - monthly file only
            // Indicates additions, changes and deletions to the records.(see guide below).
            // A = Addition
            // C = Change
            // D = Delete.

            // Note that where a transaction changes category type due to misallocation (as above) it will be deleted from the original category
            // type and added to the correct category with a new transaction unique identifier.
            // status: {
            //     type: DataTypes.STRING(1),
            // },
        },
        {
            tableName: 'properties',
            timestamps: false,
        }
    );

    return model;
};
