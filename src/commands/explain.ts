import { Command, flags } from '@oclif/command';
import inquirer = require('inquirer');

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../global_flags';
import { explainTransactionPrinter } from '../printers/explain_transaction_printer';
import { jsonPrinter } from '../printers/json_printer';
import { TxExplainer } from '../tx_explainer';
import { utils } from '../utils';

export class Explain extends Command {
    public static description = 'Explain the Ethereum transaction';

    public static examples = [`$ 0x-debug explain [tx]`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };

    public static args = [{ name: 'tx' }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Explain);
        const { provider, networkId } = utils.getReadableContext(flags);
        const explainer = new TxExplainer(provider, networkId);
        let tx = args.tx;
        if (!tx) {
            const { txHash } = await inquirer.prompt([{ message: 'Enter txHash', type: 'input', name: 'txHash' }]);
            tx = txHash;
        }
        const output = await explainer.explainTransactionAsync(tx);
        flags.json
            ? await jsonPrinter.printConsole(output)
            : await explainTransactionPrinter.printConsole(output, provider, networkId);
        utils.stopProvider(provider);
    }
}
