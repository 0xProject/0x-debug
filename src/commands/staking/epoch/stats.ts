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
        const currentEpoch = await stakingContract.currentEpoch().callAsync();
        const globalDelegatedStake = await stakingContract
            .getGlobalStakeByStatus(StakeStatus.Delegated)
            .callAsync();
        const epochStartTimeSeconds = await stakingContract
            .currentEpochStartTimeInSeconds()
            .callAsync();
        const epochDurationInSeconds = await stakingContract
            .epochDurationInSeconds()
            .callAsync();
        const epochEndTimeSeconds = epochStartTimeSeconds.plus(
            epochDurationInSeconds,
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
        };
        PrintUtils.printHeader('Epoch Stats');
        flags.json
            ? jsonPrinter.printConsole(output)
            : cli.table(
                  [
                      { name: 'id', value: output.currentEpoch },
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
                          name: 'rewards available',
                          value: utils
                              .convertToUnits(
                                  output.epochStats.rewardsAvailable,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'fees collected',
                          value: utils
                              .convertToUnits(
                                  output.epochStats.totalFeesCollected,
                              )
                              .toFixed(constants.DISPLAY_DECIMALS),
                      },
                      {
                          name: 'pools to finalize',
                          value: output.epochStats.numPoolsToFinalize,
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
