import { ERC20TokenContract } from '@0x/contract-wrappers';
import { Command, flags } from '@oclif/command';
import { BlockParamLiteral } from 'ethereum-types';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../global_flags';
import { utils } from '../utils';

export class Balance extends Command {
    public static description = 'Balance of the user';

    public static examples = [
        `$ 0x-debug balance --tokens [TOKENS] --block [BLOCK] [address]`,
    ];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        tokens: flags.string({
            char: 't',
            name: 'tokens',
            description: 'The tokens to look up',
            required: true,
            default: 'ETH',
        }),
        block: flags.string({
            char: 'b',
            name: 'block',
            description: 'The block number to use',
        }),
    };

    public static args = [{ name: 'address', required: true }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Balance);
        const { provider, networkId } = utils.getReadableContext(flags);
        const tokens = flags.tokens.split(',');

        try {
            const web3Wrapper = utils.getWeb3Wrapper(provider);
            const contracts = tokens.map(t => new ERC20TokenContract(t, web3Wrapper.getProvider()),
            );
            const balances = await Promise.all(
                contracts.map(c =>
                    c
                        .balanceOf(args.address)
                        .callAsync(
                            {},
                            flags.block
                                ? Number.parseInt(flags.block)
                                : BlockParamLiteral.Latest,
                        ),
                ),
            );
            console.log({ args, flags, tokens, balances });
        } catch (e) {
            return this.error(e.message);
        }
    }
}
