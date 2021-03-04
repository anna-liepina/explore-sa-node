describe('GraphQL: Transaction', () => {
    describe('transaction', () => {
        it(`should fetch transaction by ID`, async () => {
            const { data: { transaction: data } } = await query({
                query: `
                {
                    transaction(id: 1) {
                        id
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });

    describe('transactionSearch [presets: perPage 3]', () => {
        it(`search without date range`, async () => {
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

        it(`search in data range, first page, 3 per page`, async () => {
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

        it(`search in data range, seconds page, 3 per page`, async () => {
            const { data: { transactionSearch: data } } = await query({
                query: `
                {
                    transactionSearch(from: "2010-01-01", to: "2021-01-01", page: 2, perPage: 3) {
                        id
                        price
                        date
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
