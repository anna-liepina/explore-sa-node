import DataLoader from 'dataloader';
import { resolveSQLResult } from './utils';

import type { ORM } from '../orm.types';
import type { WhereAttributeHash } from 'sequelize';

export default (orm: ORM) => ({
    getTransactions: new DataLoader(
        (guid: string[]) => {
            return orm.Transaction.findAll({
                order: [['date', 'ASC']],
                where: {
                    guid,
                } as WhereAttributeHash,
                raw: true,
            })
                .then((v) => resolveSQLResult(guid, 'guid', v, true))
        }
    ),
})
