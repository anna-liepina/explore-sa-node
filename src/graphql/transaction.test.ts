//@ts-nocheck
describe('GraphQL: Transaction', () => {
    describe('transactionSearch [presets: perPage 3]', () => {
        it(`without criteria`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(perPage: 3) {
                        id
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
                    transactionSearch(from: "2010-01-01", to: "2021-01-01", perPage: 3) {
                        id
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
                    transactionSearch(from: "2010-01-01", to: "2021-01-01", perPage: 3, page: 2) {
                        id
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        /** there are only 3 results with this postcode, which should fall on 1st page */
        it(`with postcode range: 1st page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(postcode: "E20 1AB", perPage: 3) {
                        id
                        price
                        date
                        property {
                            street
                            paon
                            saon
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        /** there are only 3 results with this postcode, which should fall on 1st page */
        it(`with postcode range: 2nd page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(postcode: "E20 1AB", perPage: 3, page: 2) {
                        id
                        price
                        date
                        property {
                            street
                            paon
                            saon
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
