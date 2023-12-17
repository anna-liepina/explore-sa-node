'use strict';

const { postcode } = require('../utils/commonFields');

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.
            createTable(
                'properties',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        primaryKey: true,
                        autoIncrement: true,
                    },
                    guid: {
                        type: Sequelize.STRING,
                        // unique: true,
                        allowNull: false,
                    },
                    // uuid: {
                    //     type: Sequelize.STRING,
                    // },
                    // price: {
                    //     type: Sequelize.INTEGER,
                    // },
                    // date: {
                    //     type: Sequelize.DATEONLY,
                    // },
                    postcode: {
                        ...postcode(Sequelize).postcode,
                        allowNull: false,
                    },
                    // Property Type. D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other
                    propertyType: {
                        type: Sequelize.STRING(1),
                    },
                    // old/new Y = a newly built property, N = an established residential building
                    // purchaseType: {
                    //     type: Sequelize.STRING(1),
                    // },
                    // Duration	Relates to the tenure: F = Freehold, L= Leasehold etc.
                    // Note that HM Land Registry does not record leases of 7 years or less in the Price Paid Dataset.
                    propertyForm: {
                        type: Sequelize.STRING(1),
                    },
                    // PAON	Primary Addressable Object Name. Typically the house number or name.
                    paon: {
                        type: Sequelize.STRING,
                    },
                    // SAON	Secondary Addressable Object Name. Where a property has been divided into separate units (for example, flats),
                    // the PAON (above) will identify the building and a SAON will be specified that identifies the separate unit/flat.
                    saon: {
                        type: Sequelize.STRING,
                    },
                    street: {
                        type: Sequelize.STRING,
                    },
                    // locality: {
                    //     type: Sequelize.STRING,
                    // },
                    city: {
                        type: Sequelize.STRING,
                    },
                    // district: {
                    //     type: Sequelize.STRING,
                    // },
                    // county: {
                    //     type: Sequelize.STRING,
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
                    //     type: Sequelize.STRING,
                    // },
                    // Record Status - monthly file only
                    // Indicates additions, changes and deletions to the records.(see guide below).
                    // A = Addition
                    // C = Change
                    // D = Delete.

                    // Note that where a transaction changes category type due to misallocation (as above) it will be deleted from the original category
                    // type and added to the correct category with a new transaction unique identifier.
                    // status: {
                    //     type: Sequelize.STRING(1),
                    // },
                }
            );
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('properties');
    }
};
