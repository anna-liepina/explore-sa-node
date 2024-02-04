//@ts-nocheck
describe('GraphQL: Property', () => {
    describe('propertySearch [presets: perPage 3]', () => {
        it(`by postcode wildcard`, async () => {
            const { data: { propertySearch: data } } = await query({
                query: `
                {
                    propertySearch(postcodePattern: "E20", perPage: 3) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                        }
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by postcode wildcard: 2nd page`, async () => {
            const { data: { propertySearch: data } } = await query({
                query: `
                {
                    propertySearch(postcodePattern: "E20", perPage: 3, page: 2) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                        }
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });

    describe('propertySearchInRange [presets: perPage 2]', () => {
        it(`by coordinates, in kilometers`, async () => {
            const { data: { propertySearchInRange: data } } = await query({
                query: `
                {
                    propertySearchInRange(
                        pos: {
                            lat: 51.547915089,
                            lng: -0.00743124
                        },
                        range: 10,
                        perPage: 3
                    ) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                            lat
                            lng
                        }
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by coordinates, in miles`, async () => {
            const { data: { propertySearchInRange: data } } = await query({
                query: `
                {
                    propertySearchInRange(
                        pos: {
                            lat: 51.547915089,
                            lng: -0.00743124
                        },
                        rangeUnit: ml,
                        range: 10,
                        perPage: 2
                    ) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                            lat
                            lng
                        }
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by coordinates, in miles: 2nd page`, async () => {
            const { data: { propertySearchInRange: data } } = await query({
                query: `
                {
                    propertySearchInRange(
                        pos: {
                            lat: 51.547915089,
                            lng: -0.00743124
                        },
                        rangeUnit: ml,
                        range: 10,
                        perPage: 2,
                        page: 2
                    ) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                            lat
                            lng
                        }
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
