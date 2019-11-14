import { StakingContract } from '@0x/abi-gen-wrappers';
import { BigNumber } from '@0x/utils';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import { constants } from '../../../constants';
import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS, DEFAULT_WRITEABLE_FLAGS } from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { prompt } from '../../../prompt';
import { utils } from '../../../utils';
import { StakeStatus } from '../../../types';

export class Unstake extends Command {
    public static description = 'Unstakes a Staking Pool';

    public static examples = [`$ 0x-debug staking:pool:unstake`];

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
        const { flags, argv } = this.parse(Unstake);
        const { provider, selectedAddress, contractAddresses } = await utils.getWriteableContextAsync(flags);
        const stakingContract = new StakingContract(contractAddresses.stakingProxy, provider, {});
        const poolId = flags['pool-id'];
        const stakingPoolInfo = await stakingContract.getStakeDelegatedToPoolByOwner.callAsync(selectedAddress, poolId);
        const stakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: utils.convertToUnits(stakingPoolInfo.currentEpochBalance),
            nextEpochBalance: utils.convertToUnits(stakingPoolInfo.nextEpochBalance),
        };
        cli.styledJSON(stakingPoolInfoUnits);
        const { input } = await prompt.promptForInputAsync('Input new Stake Amount (in ZRX)');
        const stakeDiffAmount = utils.convertToBaseUnits(
            stakingPoolInfoUnits.nextEpochBalance.minus(new BigNumber(input)),
        );
        const result = await utils.awaitTransactionWithSpinnerAsync('Unstaking', () =>
            stakingContract.moveStake.awaitTransactionSuccessAsync(
                { status: StakeStatus.Delegated, poolId },
                constants.UNDELEGATED_POOL,
                stakeDiffAmount,
                { from: selectedAddress },
            ),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
