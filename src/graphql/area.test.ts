//@ts-nocheck
describe('GraphQL: Area', () => {
    describe('areaSearch [presets: perPage 3]', () => {
        it(`without criteria`, async () => {
            const { data: { areaSearch: data } } = await query({
                query: `
                {
                    areaSearch(perPage: 3) {
                        area
                        city
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`without criteria: 2nd page`, async () => {
            const { data: { areaSearch: data } } = await query({
                query: `
                {
                    areaSearch(perPage: 3, page: 2) {
                        area
                        city
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by wildcard`, async () => {
            const { data: { areaSearch: data } } = await query({
                query: `
                {
                    areaSearch(pattern: "E20", perPage: 3) {
                        area
                        city
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
