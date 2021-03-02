describe('GraphQL: Transaction', () => {
    describe('query', () => {
        it(`should fetch transaction by ID`, async () => {
            const { data } = await query({
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

        describe('paginated queries', () => {
            it(`search without date range`, async () => {
                const { data } = await query({
                    query: `
                    {
                        transactionSearch(perPage: 5) {
                            id
                            price
                            date
                        }
                    }`
                });

                expect(data).toMatchSnapshot();
            });

            it(`search in data range, first page, 5 per page`, async () => {
                const { data } = await query({
                    query: `
                    {
                        transactionSearch(from: "2010-01-01", to: "2021-01-01", perPage: 5) {
                            id
                            price
                            date
                        }
                    }`
                });

                expect(data).toMatchSnapshot();
            });

            it(`search in data range, seconds page, 5 per page`, async () => {
                const { data } = await query({
                    query: `
                    {
                        transactionSearch(from: "2010-01-01", to: "2021-01-01", page: 2, perPage: 5) {
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
});
