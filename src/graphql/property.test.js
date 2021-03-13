describe('GraphQL: Property', () => {
    describe('property', () => {
        it(`by exact ID`, async () => {
            const { data: { property: data } } = await query({
                query: `
                {
                    property(id: 1) {
                        saon
                        paon
                        street
                        postcode {
                            postcode
                        }
                        distance
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });

    describe('propertySearch [presets: perPage 3]', () => {
        it(`by postcode wildcard`, async () => {
            const { data: { propertySearch: data } } = await query({
                query: `
                {
                    propertySearch(postcode: "E20", perPage: 3) {
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
                    propertySearch(postcode: "E20", perPage: 3, page: 2) {
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

    describe('propertySearchWithInRange [presets: perPage 3]', () => {
        it(`by coordinates, in kilometers`, async () => {
            const { data: { propertySearchWithInRange: data } } = await query({
                query: `
                {
                    propertySearchWithInRange(
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
                        distance
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by coordinates, in miles`, async () => {
            const { data: { propertySearchWithInRange: data } } = await query({
                query: `
                {
                    propertySearchWithInRange(
                        pos: {
                            lat: 51.547915089,
                            lng: -0.00743124
                        },
                        rangeUnit: ml,
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
                        distance
                        transactions {
                            date
                        }
                    }
                }`
            });

            expect(data).toMatchSnapshot();
        });

        it(`by coordinates, in miles: 2nd page`, async () => {
            const { data: { propertySearchWithInRange: data } } = await query({
                query: `
                {
                    propertySearchWithInRange(
                        pos: {
                            lat: 51.547915089,
                            lng: -0.00743124
                        },
                        rangeUnit: ml,
                        range: 10,
                        perPage: 3,
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
                        distance
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
