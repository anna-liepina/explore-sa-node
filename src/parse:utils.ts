//@ts-nocheck
const fs = require('fs');

module.exports = (migrationMarker, orm) => (direction) => {
    const executeFiles = async (path) => {
        const files = fs.readdirSync(path);
        for (const file of files) {
            const obj = require(require.resolve(`${path}/${file}`));

            if (!obj[migrationMarker]) {
                continue;
            }

            await obj[direction](orm.sequelize.queryInterface, orm.Sequelize);
        }
    }

    return executeFiles(`${__dirname}/../database/migrations`);
}
