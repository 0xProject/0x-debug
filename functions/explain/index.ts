import { TxExplainer } from '../../src/tx_explainer';
import { utils } from '../../src/utils';

export const handle = async (e, ctx, cb): Promise<any> => {
    const flags = { 'network-id': 1 };
    const provider = utils.getProvider(flags);
    const networkId = utils.getNetworkId(flags);
    provider.start();
    const explainer = new TxExplainer(provider, networkId);
    const result = await explainer.explainTransactionJSONNoPrintAsync(
        '0x31d1cdd2d0384e83d501280a3ff6d2c1d7074f34c34128d490face45c41c0260',
    );
    provider.stop();
    const webhookBody = { content: result.revertReason };
    await fetch(
        'https://discordapp.com/api/webhooks/545667663972663317/oYP8N41c09bUEvCs17rfgXI-nni8XyFBQ2iT_7owsOcyLGOd8ylRaywEgVz5ukAuv9_r',
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(webhookBody),
        },
    );
    return result;
};
