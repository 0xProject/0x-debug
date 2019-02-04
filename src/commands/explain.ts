import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { TxExplainer } from '../tx_explainer';
import { utils } from '../utils';

export class Explain extends Command {
    public static description = 'Explain the Ethereum transaction';

    public static examples = [`$ 0x-debug explain [tx]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        json: renderFlags.json,
    };

    public static args = [{ name: 'tx' }];

    public async run() {
        const { args, flags } = this.parse(Explain);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        provider.start();
        const explainer = new TxExplainer(provider, networkId);
        flags.json
            ? await explainer.explainTransactionJSONAsync(args.tx)
            : await explainer.explainTransactionAsync(args.tx);
        provider.stop();
    }
}
