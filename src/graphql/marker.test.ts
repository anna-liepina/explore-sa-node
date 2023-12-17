//@ts-nocheck
describe.skip('GraphQL: Marker', () => {
    describe('postcodeSearch [presets: perPage 3]', () => {
        it(`by exact postcode`, async () => {
            const { data: { postcodeSearch: data } } = await query({
                query: `
                {
                    postcodeSearch(pattern: "E20 1AA", perPage: 3) {
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

        it(`by wildcard`, async () => {
            const { data: { postcodeSearch: data } } = await query({
                query: `
                {
                    postcodeSearch(pattern: "E20", perPage: 3) {
                        postcode
                        lat
                        lng
                        url
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by wildcard: 2nd page`, async () => {
            const { data: { postcodeSearch: data } } = await query({
                query: `
                {
                    postcodeSearch(pattern: "E20", perPage: 3, page: 2) {
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
