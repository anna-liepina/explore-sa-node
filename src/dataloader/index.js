import postcode from './postcode.dataloader';
import property from './property.dataloader';
import transaction from './transaction.dataloader';

export default (orm) => ({
    ...postcode(orm),
    ...property(orm),
    ...transaction(orm),
})
