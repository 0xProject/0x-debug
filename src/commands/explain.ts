import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { explainTransactionPrinter } from '../printers/explain_transaction_printer';
import { jsonPrinter } from '../printers/json_printer';
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

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Explain);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        (provider as any)._ready.go();
        const explainer = new TxExplainer(provider, networkId);
        const output = await explainer.explainTransactionAsync(args.tx);
        flags.json
            ? await jsonPrinter.printConsole(output)
            : await explainTransactionPrinter.printConsole(output, provider, networkId);
        provider.stop();
    }
}
