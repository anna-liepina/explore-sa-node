//@ts-nocheck
import fs from 'fs';
import orm from '../src/orm';

export default async () => {
    const executeFiles = async (dir) => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const path = require.resolve(`${dir}/${file}`);
            const { up, down } = require(path);

            console.log(`execute: ${path.split("/").slice(-2).join("/")}`);

            try {
                await up(orm.sequelize.queryInterface, orm.Sequelize);
            } catch (e) {
                // for some reason this is a fix
                await down(orm.sequelize.queryInterface, orm.Sequelize);
                await up(orm.sequelize.queryInterface, orm.Sequelize);
            }
        }
    }

    await orm
        .sequelize
        .drop()
        .then(async () => {
    console.log(`
reset & seed database...`);

            await executeFiles(`${__dirname}/../database/migrations`);
            await executeFiles(`${__dirname}/../database/fixtures`);
        });
};
