import { StakingProxyContract } from '@0x/contract-wrappers';
import { BigNumber } from '@0x/utils';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import { constants } from '../../../constants';
import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
} from '../../../global_flags';
import { StakeStatus } from '../../../types';
import { utils } from '../../../utils';
import { batchStakingCallAsync } from '../epoch/stats';

const decodeCallResultsForPool = (rawResults: any[], poolId: string) => {
    const [
        delegatedStakeByPool,
        stakingPoolStatus,
        stakingPool,
        rewardsByPoolId,
    ]: any[] = rawResults;
    return {
        delegatedStakeByPool,
        stakingPoolStatus,
        poolId,
        stakingPool,
        rewardsByPoolId,
    };
};

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
        const { contractWrappers } = utils.getReadableContext(flags);
        const stakingContract = contractWrappers.staking;

        const [
            currentEpoch,
            globalDelegatedStake,
            globalUndelegatedStake,
            epochStartTimeSeconds,
            epochDurationInSeconds,
            epochEndTimeSeconds,
            lastPoolIdHex,
        ]: any[] = await batchStakingCallAsync(
            [
                stakingContract.currentEpoch(),
                stakingContract.getGlobalStakeByStatus(StakeStatus.Delegated),
                stakingContract.getGlobalStakeByStatus(StakeStatus.Undelegated),
                stakingContract.currentEpochStartTimeInSeconds(),
                stakingContract.epochDurationInSeconds(),
                stakingContract.getCurrentEpochEarliestEndTimeInSeconds(),
                stakingContract.lastPoolId(),
            ],
            contractWrappers,
        );
        let poolDetails;
        const allPoolDetails: any = {};
        const batchCallsForPool = (poolId: string) => {
            return [
                stakingContract.getTotalStakeDelegatedToPool(poolId),
                stakingContract.getStakingPoolStatsThisEpoch(poolId),
                stakingContract.getStakingPool(poolId),
                stakingContract.rewardsByPoolId(poolId),
            ];
        };
        const rawPoolId = flags['pool-id'];

        if (rawPoolId === 'all') {
            let batchCalls: any[] = [];
            const lastPoolId = utils.decodePoolId(lastPoolIdHex);
            for (let i = 1; i <= lastPoolId; i++) {
                const poolId = utils.encodePoolId(i);
                batchCalls = [...batchCalls, ...batchCallsForPool(poolId)];
            }
            const response = await batchStakingCallAsync(
                batchCalls,
                contractWrappers,
            );
            for (let i = 1; i <= lastPoolId; i++) {
                const rawResultsForPool = response.splice(
                    0,
                    batchCalls.length / lastPoolId,
                );
                const poolId = utils.encodePoolId(i);
                allPoolDetails[poolId] = decodeCallResultsForPool(
                    rawResultsForPool,
                    poolId,
                );
            }
        } else if (rawPoolId) {
            const poolIdParsed = utils.parsePoolId(rawPoolId);
            poolDetails = decodeCallResultsForPool(
                await batchStakingCallAsync(
                    batchCallsForPool(
                        utils.encodePoolId(poolIdParsed.toNumber()),
                    ),
                    contractWrappers,
                ),
                utils.encodePoolId(poolIdParsed.toNumber()),
            );
        }
        const [
            rewardsAvailable,
            numPoolsToFinalize,
            totalFeesCollected,
            totalWeightedStake,
            totalRewardsFinalized,
        ] = await stakingContract
            .aggregatedStatsByEpoch(currentEpoch)
            .callAsync();
        const epochEnded = epochEndTimeSeconds.isLessThan(
            Date.now() / constants.MS_IN_SECONDS,
        );
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
            poolDetails: poolDetails || allPoolDetails,
        };
        cli.styledJSON(output);
    }
}
