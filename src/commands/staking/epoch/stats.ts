import { getContractAddressesForChainOrThrow, StakingContract } from '@0x/abi-gen-wrappers';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../../global_flags';
import { jsonPrinter } from '../../../printers/json_printer';
import { PrintUtils } from '../../../printers/print_utils';
import { utils } from '../../../utils';

enum StakeStatus {
    Undelegated,
    Delegated,
}

const MS_IN_SECONDS = 1000;

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
        const { provider, contractAddresses } = utils.getReadableContext(flags);
        console.log(contractAddresses);
        const stakingContract = new StakingContract(contractAddresses.stakingProxy, provider, {});
        const currentEpoch = await stakingContract.currentEpoch.callAsync();
        const globalDelegatedStake = await stakingContract.getGlobalStakeByStatus.callAsync(StakeStatus.Delegated);
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
        const epochEnded = epochEndTimeSeconds.isLessThan(Date.now() / MS_IN_SECONDS);
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
                      { name: 'starts', value: new Date(output.epochStartTimeSeconds.times(MS_IN_SECONDS).toNumber()) },
                      { name: 'ends', value: new Date(output.epochEndTimeSeconds.times(MS_IN_SECONDS).toNumber()) },
                      { name: 'ended', value: output.epochEnded },
                      { name: 'duration', value: output.epochDurationInSeconds },
                      {
                          name: 'rewards available',
                          value: Web3Wrapper.toUnitAmount(output.epochStats.rewardsAvailable, 18).toFixed(6),
                      },
                      {
                          name: 'fees collected',
                          value: Web3Wrapper.toUnitAmount(output.epochStats.totalFeesCollected, 18).toFixed(6),
                      },
                      { name: 'pools to finalize', value: output.epochStats.numPoolsToFinalize },
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
