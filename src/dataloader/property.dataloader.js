import DataLoader from 'dataloader';
import { processSQLResult } from './utils';

export default (orm) => ({
    getProperty: new DataLoader(
        (guid) => {
            return orm.Property.findAll({
                where: {
                    guid,
                },
                raw: true,
            })
                .then((v) => processSQLResult(guid, 'guid', v))
        }
    ),
})
