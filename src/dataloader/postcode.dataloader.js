import DataLoader from 'dataloader';
import { processSQLResult } from './utils';

export default (orm) => ({
    getPostcode: new DataLoader(
        (postcode) => {
            return orm.Postcode.findAll({
                where: {
                    postcode,
                },
                raw: true,
            })
                .then((v) => processSQLResult(postcode, 'postcode', v))
        }
    ),
})
