import type { ORM } from '../orm.types';
import postcode from './postcode.dataloader';
import property from './property.dataloader';
import transaction from './transaction.dataloader';

export default (orm: ORM) => ({
    ...postcode(orm),
    ...property(orm),
    ...transaction(orm),
})
