import DataLoader from 'dataloader';
import { resolveSQLResult } from './utils';
import type { ORM } from '../orm.types';

export default (orm: ORM) => ({
    getProperty: new DataLoader(
        (guid: string[]) => {
            return orm.Property.findAll({
                where: {
                    guid,
                },
                raw: true,
            })
                .then((v: Object[]) => resolveSQLResult(guid, 'guid', v))
        }
    ),
})
