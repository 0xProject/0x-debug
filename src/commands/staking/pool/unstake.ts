import { getContractAddressesForChainOrThrow, StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS, DEFAULT_WRITEABLE_FLAGS } from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';
import { prompt } from '../../../prompt';
import { BigNumber } from '@0x/utils';
import { cli } from 'cli-ux';
import { Web3Wrapper } from '@0x/web3-wrapper';

enum StakeStatus {
    Undelegated,
    Delegated,
}
const NIL_POOL_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';

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
        const convertToUnits = (b: BigNumber): BigNumber => Web3Wrapper.toUnitAmount(b, 18);
        const convertToBaseUnits = (b: BigNumber): BigNumber => Web3Wrapper.toBaseUnitAmount(b, 18);
        const stakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: convertToUnits(stakingPoolInfo.currentEpochBalance),
            nextEpochBalance: convertToUnits(stakingPoolInfo.nextEpochBalance),
        };
        cli.styledJSON(stakingPoolInfoUnits);
        const { input } = await prompt.promptForInputAsync('Input new Stake Amount (in ZRX)');
        const stakeDiffAmount = convertToBaseUnits(stakingPoolInfoUnits.nextEpochBalance.minus(new BigNumber(input)));
        const result = await utils.awaitTransactionWithSpinnerAsync('Unstaking', () =>
            stakingContract.moveStake.awaitTransactionSuccessAsync(
                { status: StakeStatus.Delegated, poolId },
                { status: StakeStatus.Undelegated, poolId: NIL_POOL_ID },
                stakeDiffAmount,
                { from: selectedAddress },
            ),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
