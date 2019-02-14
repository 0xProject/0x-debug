console.log('start');
import { TxExplainer } from '../../src/tx_explainer';
export const handler = async (e, ctx): Promise<any> => {
    console.log(e);
    console.log(TxExplainer);
    return e;
};
