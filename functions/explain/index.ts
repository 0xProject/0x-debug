import { TxExplainer } from '../../src/tx_explainer';
import { utils } from '../../src/utils';

export const handle = async (event, _ctx, _cb): Promise<any> => {
    const networkId = parseInt(event.queryStringParameters.networkId || '1', 10);
    const txHash = event.queryStringParameters.tx;
    const flags = { 'network-id': networkId };
    console.log(event.queryStringParameters);
    const { provider } = utils.getReadableContext(flags);
    const explainer = new TxExplainer(provider, networkId);
    const result = await explainer.explainTransactionAsync(txHash);
    utils.stopProvider(provider);
    const httpResponse = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result),
    };
    return httpResponse;
};
