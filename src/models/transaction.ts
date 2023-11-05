import type { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import type { GloballyIdentifiedModel, IdentifiedModel } from "../orm.types";

export type TransactionType = {
    price: number,
    date: string,
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
        'Transaction',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            guid: {
                type: DataTypes.STRING,
            },
            price: {
                type: DataTypes.INTEGER,
            },
            date: {
                type: DataTypes.DATEONLY,
            },
        },
        {
            tableName: 'transactions',
            timestamps: false,
        }
    );

    //@ts-ignore
    model.associate = ({ Property, Transaction }) => {
        Property.hasMany(Transaction, { foreignKey: 'guid', sourceKey: 'guid' });
        Transaction.belongsTo(Property, { foreignKey: 'guid', targetKey: 'guid' });
    }

    return model;
};
