import { ContractWrappers } from '@0x/contract-wrappers';
import { BigNumber, providerUtils } from '@0x/utils';
import { BlockParamLiteral, CallData, Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../../global_flags';
import { jsonPrinter } from '../../printers/json_printer';
import { utils } from '../../utils';

export class Call extends Command {
    public static description = 'Gets the current ethereum block';

    public static examples = [`$ 0x-debug misc:current_block`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        json: renderFlags.json,
    };

    public static args = [{ name: 'address' }, { name: 'callData' }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Call);
        const provider = utils.getProvider(flags);
        const web3Wrapper = new Web3Wrapper(provider);
        const result = await web3Wrapper.getBlockNumberAsync();
        console.log(result);
        provider.stop();
    }
}
