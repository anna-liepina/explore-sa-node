describe.skip('GraphQL: Area', () => {
    describe('query', () => {
        it(`xxx`, async () => {
            const { data } = await query({
                query: `
                {
                }`
            });

            expect(data).toMatchSnapshot();
        });

    });

    describe('mutation', () => {
        it(`xxx`, async () => {
            const { data, errors } = await query({
                query: `
                mutation {
                }`
            });

            expect(data).toMatchSnapshot();
        });
    });
});
