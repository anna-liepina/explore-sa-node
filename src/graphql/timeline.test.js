describe('GraphQL: Timeline', () => {
    describe('timelineSearch [presets: perPage 3]', () => {
        it(`without criteria`, async () => {
            const { data: { timelineSearch: data } } = await query({
                query: `
                {
                    timelineSearch(perPage: 3) {
                        date
                        avg
                        count
                        postcode
                    }

                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`without criteria: 2nd page`, async () => {
            const { data: { timelineSearch: data } } = await query({
                query: `
                {
                    timelineSearch(perPage: 3, page: 2) {
                        date
                        avg
                        count
                        postcode
                    }

                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`in date range [::from, ::to]`, async () => {
            const { data: { timelineSearch: data } } = await query({
                query: `
                {
                    timelineSearch(from: "2010-01-01", to: "2021-01-01", perPage: 3) {
                        date
                        avg
                        count
                        postcode
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by postcode wildcard [::pattern]`, async () => {
            const { data: { timelineSearch: data } } = await query({
                query: `
                {
                    timelineSearch(pattern: "E20 1A", perPage: 3) {
                        date
                        avg
                        count
                        postcode
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by exact postcodes [::postcodes]`, async () => {
            const { data: { timelineSearch: data } } = await query({
                query: `
                {
                    timelineSearch(postcodes: ["E20"], perPage: 3) {
                        date
                        avg
                        count
                        postcode
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
