import DataLoader from 'dataloader';
import { processSQLResult } from './utils';

export default (orm) => ({
    getTransactions: new DataLoader(
        (guid) => {
            return orm.Transaction.findAll({
                attributes: ['id', 'guid', 'price', 'date'],
                order: [['date', 'ASC']],
                where: {
                    guid,
                },
                raw: true,
            })
                .then((v) => processSQLResult(guid, 'guid', v, true))
        }
    ),
})
