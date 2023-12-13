import DataLoader from 'dataloader';
import { resolveSQLResult } from './utils';
import type { ORM } from '../orm.types';

export default (orm: ORM) => ({
    getTransactions: new DataLoader(
        async (guid: string[]) => {
            return orm.Transaction.findAll({
                order: [['date', 'ASC']],
                where: {
                    guid,
                },
                raw: true,
            })
                .then((v) => resolveSQLResult(guid, 'guid', v, true))
        }
    ),
})
