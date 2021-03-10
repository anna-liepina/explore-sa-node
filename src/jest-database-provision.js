import fs from 'fs';
import orm from './orm';

export default async () => {
    await orm
        .sequelize
        .drop()
        .then(
            async () => {
                const executeFiles = async (path) => {
                    const files = fs.readdirSync(path);

                    for (const file of files) {

                        const { up } = require(require.resolve(`${path}/${file}`));

                        console.log(`execute: ${path.split('/').pop()}/${file}`);

                        await up(orm.sequelize.queryInterface, orm.Sequelize);
                    }
                }

                console.log(`
reset & seed database...`);

                await executeFiles(`${__dirname}/../database/migrations`);
                await executeFiles(`${__dirname}/../database/fixtures`);
            }
        )
};

