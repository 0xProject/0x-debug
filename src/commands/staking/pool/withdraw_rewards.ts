import { StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';

export class WithdrawRewards extends Command {
    public static description = 'Withdraws Delegator Rewards from a Poo';

    public static examples = [`$ 0x-debug staking:pool:withdraw_rewards`];

    public static flags = {
        'pool-id': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_WRITEABLE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(WithdrawRewards);
        const {
            provider,
            selectedAddress,
            contractAddresses,
        } = await utils.getWriteableContextAsync(flags);
        const stakingContract = new StakingContract(
            contractAddresses.stakingProxy,
            provider,
            {},
        );
        const result = await utils.awaitTransactionWithSpinnerAsync(
            'Withdraw Rewards',
            () =>
                stakingContract
                    .withdrawDelegatorRewards(flags['pool-id'])
                    .awaitTransactionSuccessAsync({
                        from: selectedAddress,
                    }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
