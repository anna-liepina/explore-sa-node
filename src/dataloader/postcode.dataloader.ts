import DataLoader from 'dataloader';
import { resolveSQLResult } from './utils';
import type { ORM } from '../orm.types';

export default (orm: ORM) => ({
    getPostcode: new DataLoader(
        (postcode: string[]) => {
            return orm.Postcode.findAll({
                where: {
                    postcode,
                },
                raw: true,
            })
                .then((v: Object[]) => resolveSQLResult(postcode, 'postcode', v))
        }
    ),
})
