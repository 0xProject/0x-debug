import { getContractAddressesForChainOrThrow, StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';

export class WithdrawRewards extends Command {
    public static description = 'Withdraws Delegator Rewards from a Poo';

    public static examples = [`$ 0x-debug staking:pool:withdraw_rewards`];

    public static flags = {
        'private-key': flags.string(),
        'pool-id': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(WithdrawRewards);
        const { provider, selectedAddress } = await utils.getWriteableContextAsync(flags);
        const networkId = utils.getNetworkId(flags);
        const addresses = getContractAddressesForChainOrThrow(networkId);
        const stakingContract = new StakingContract(addresses.stakingProxy, provider, {});
        const result = await utils.awaitTransactionWithSpinnerAsync('Withdraw Rewards', () =>
            stakingContract.withdrawDelegatorRewards.awaitTransactionSuccessAsync(flags['pool-id'], {
                from: selectedAddress,
            }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
