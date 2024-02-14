//@ts-nocheck
describe('GraphQL: Transaction', () => {
    describe('transactionSearch [presets: perPage 3]', () => {
        it(`without criteria`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(perPage: 3) {
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`within date range`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(dateFrom: "2010-01-01", dateTo: "2021-01-01", perPage: 3) {
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`within date range: 2nd page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(dateFrom: "2010-01-01", dateTo: "2021-01-01", perPage: 3, page: 2) {
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        /** there are only 5 results with this postcode, 3 of which should fall on 1st page */
        it(`with postcodePattern range: 1st page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(postcodePattern: "E20 1AB", perPage: 3) {
                        price
                        date
                        property {
                            address
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        /** there are only 4 results with this postcode, which should fall on 1st page */
        it(`with postcodePattern range: 2nd page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(postcodePattern: "E20 1AB", perPage: 4, page: 2) {
                        price
                        date
                        property {
                            address
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
