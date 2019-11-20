import { StakingContract } from '@0x/abi-gen-wrappers';
import { BigNumber } from '@0x/utils';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { prompt } from '../../../prompt';
import { utils } from '../../../utils';

export class DecreaseShare extends Command {
    public static description =
        'Decreases the Operator Share in the Staking pool';

    public static examples = [`$ 0x-debug staking:pool:decrease_share`];

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
        const { flags, argv } = this.parse(DecreaseShare);
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
        const poolId = flags['pool-id'];
        const stakingPoolInfo = await stakingContract
            .getStakingPool(poolId)
            .callAsync();
        cli.styledJSON(stakingPoolInfo);
        const { input } = await prompt.promptForInputAsync(
            'Input new Operator Share (in ppm)',
        );
        const result = await utils.awaitTransactionWithSpinnerAsync(
            'Decrease Operator Share',
            () =>
                stakingContract
                    .decreaseStakingPoolOperatorShare(
                        poolId,
                        new BigNumber(input),
                    )
                    .awaitTransactionSuccessAsync({
                        from: selectedAddress,
                    }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
