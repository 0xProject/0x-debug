import { StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import { constants } from '../../../constants';
import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../../global_flags';
import { StakeStatus } from '../../../types';
import { utils } from '../../../utils';

export class Stats extends Command {
    public static description = 'Details for the current Staking Epoch';

    public static examples = [`$ 0x-debug staking:pool:stats`];

    public static flags = {
        'pool-id': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Stats);
        const { provider, contractAddresses } = utils.getReadableContext(flags);
        const stakingContract = new StakingContract(contractAddresses.stakingProxy, provider, {});
        const currentEpoch = await stakingContract.currentEpoch.callAsync();
        const rawPoolId = flags['pool-id'];
        const globalDelegatedStake = await stakingContract.getGlobalStakeByStatus.callAsync(StakeStatus.Delegated);
        let poolDetails = {};
        if (rawPoolId) {
            const delegatedStakeByPool = await stakingContract.getTotalStakeDelegatedToPool.callAsync(rawPoolId);
            const stakingPoolStatus = await stakingContract.getStakingPoolStatsThisEpoch.callAsync(rawPoolId);
            poolDetails = { delegatedStakeByPool, stakingPoolStatus, poolId: rawPoolId };
        }
        const epochStartTimeSeconds = await stakingContract.currentEpochStartTimeInSeconds.callAsync();
        const epochDurationInSeconds = await stakingContract.epochDurationInSeconds.callAsync();
        const epochEndTimeSeconds = epochStartTimeSeconds.plus(epochDurationInSeconds);
        const [
            rewardsAvailable,
            numPoolsToFinalize,
            totalFeesCollected,
            totalWeightedStake,
            totalRewardsFinalized,
        ] = await stakingContract.aggregatedStatsByEpoch.callAsync(currentEpoch);
        const epochEnded = epochEndTimeSeconds.isLessThan(Date.now() / constants.MS_IN_SECONDS);
        const output = {
            currentEpoch,
            epochStartTimeSeconds,
            epochDurationInSeconds,
            epochEndTimeSeconds,
            epochEnded,
            epochStats: {
                rewardsAvailable,
                numPoolsToFinalize,
                totalFeesCollected,
                totalWeightedStake,
                totalRewardsFinalized,
            },
            globalDelegatedStake,
            poolDetails,
        };
        cli.styledJSON(output);
    }
}