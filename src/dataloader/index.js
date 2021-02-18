import postcode from './postcode.dataloader';
import transaction from './transaction.dataloader';

export default (orm) => ({
    ...postcode(orm),
    ...transaction(orm),
})
