import DataLoader from 'dataloader';
import { processSQLResult } from './utils';

export default (orm) => ({
    getPostcode: new DataLoader(
        (postcode) => {
            return orm.Postcode.findAll({
                attributes: ['postcode', 'lat', 'lng'],
                where: {
                    postcode,
                },
                raw: true,
            })
                .then((v) => processSQLResult(postcode, 'postcode', v))
        }
    ),
})
