import {
    ContractFunctionObj,
    ContractWrappers,
    StakingProxyContract,
} from '@0x/contract-wrappers';
import { BigNumber } from '@0x/utils';
import { Command } from '@oclif/command';
import { cli } from 'cli-ux';

import { constants } from '../../../constants';
import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
} from '../../../global_flags';
import { jsonPrinter } from '../../../printers/json_printer';
import { PrintUtils } from '../../../printers/print_utils';
import { StakeStatus } from '../../../types';
import { utils } from '../../../utils';

export const batchStakingCallAsync = async (
    batchCalls: Array<ContractFunctionObj<any>>,
    contractWrappers: ContractWrappers,
): Promise<any[]> => {
    const abiDecoder = contractWrappers.getAbiDecoder();
    const { staking } = contractWrappers;
    const batchEncodedCalls = batchCalls.map(fn =>
        fn.getABIEncodedTransactionData(),
    );
    const proxy = new StakingProxyContract(
        staking.address,
        contractWrappers.getProvider(),
    );
    const batchResults = await proxy
        .batchExecute(batchEncodedCalls)
        .callAsync();
    const decodedReturnData = batchResults.map((result, i) => {
        const decodedCallData = abiDecoder.decodeCalldataOrThrow(
            batchEncodedCalls[i],
        );
        return staking.getABIDecodedReturnData(
            decodedCallData.functionName,
            result,
        );
    });
    return decodedReturnData;
};

export class Stats extends Command {
    public static description = 'Details for the current Staking Epoch';

    public static examples = [`$ 0x-debug staking:epoch:stats`];

    public static flags = {
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
            globalUndelegatedStake,
            lastPoolId: new BigNumber(lastPoolIdHex, 16),
        };
        PrintUtils.printHeader('Epoch Stats');
        flags.json
            ? jsonPrinter.printConsole(output)
            : cli.table(
                  [
                      { name: 'epoch', value: output.currentEpoch },
                      {
                          name: 'starts',
                          value: new Date(
                              output.epochStartTimeSeconds
                                  .times(constants.MS_IN_SECONDS)
                                  .toNumber(),
                          ),
                      },
                      {
                          name: 'ends',
                          value: new Date(
                              output.epochEndTimeSeconds
                                  .times(constants.MS_IN_SECONDS)
                                  .toNumber(),
                          ),
                      },
                      { name: 'ended', value: output.epochEnded },
                      {
                          name: 'duration',
                          value: output.epochDurationInSeconds,
                      },
                      {
                          name: 'rewards available (ETH)',
                          value: utils
                              .convertToUnits(
                                  output.epochStats.rewardsAvailable,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'fees collected (ETH)',
                          value: utils
                              .convertToUnits(
                                  output.epochStats.totalFeesCollected,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'delegated balance (ZRX)',
                          value: utils
                              .convertToUnits(
                                  output.globalDelegatedStake
                                      .currentEpochBalance,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'undelegated balance (ZRX)',
                          value: utils
                              .convertToUnits(
                                  output.globalUndelegatedStake
                                      .currentEpochBalance,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'pools to finalize',
                          value: output.epochStats.numPoolsToFinalize,
                      },
                      {
                          name: 'pools created',
                          value: output.lastPoolId,
                      },
                  ],
                  {
                      name: {
                          minWidth: 7,
                      },
                      value: {
                          minWidth: 7,
                      },
                  },
                  { printLine: this.log, ...flags },
              );
    }
}
