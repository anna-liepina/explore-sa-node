describe('GraphQL: Postcode', () => {
    describe('query', () => {
        it(`fetching postcodes by exact postcodes`, async () => {
            const { data: { postcodeSearch: data } } = await query({
                query: `
                {
                    postcodeSearch(pattern: "E20 1AA") {
                        postcode
                        lat
                        lng
                        url
                    }
                }`
            });

            expect(data).toHaveLength(1);
            expect(data).toMatchSnapshot();
        });

        it(`fetching postcodes by wildcard`, async () => {
            const { data: { postcodeSearch: data } } = await query({
                query: `
                {
                    postcodeSearch(pattern: "E20") {
                        postcode
                        lat
                        lng
                        url
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
