import { StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../../global_flags';
import { utils } from '../../utils';

enum StakeStatus {
    Undelegated,
    Delegated,
}

const stakingProxyContractAddress = '0xbab9145f1d57cd4bb0c9aa2d1ece0a5b6e734d34';

export class Epoch extends Command {
    public static description = 'Details for the current Staking Epoch';

    public static examples = [`$ 0x-debug staking:epoch`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        'pool-id': flags.string(),
        json: renderFlags.json,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Epoch);
        const provider = utils.getProvider(flags);
        const stakingContract = new StakingContract(stakingProxyContractAddress, provider, {});
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
        const output = {
            currentEpoch,
            epochStartTimeSeconds,
            epochDurationInSeconds,
            epochEndTimeSeconds,
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
        console.log(output);
    }
}
