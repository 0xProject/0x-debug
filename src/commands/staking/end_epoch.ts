import { StakingContract } from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import { Web3Wrapper } from '../../../../workspace-remote/workspace/0x-monorepo/packages/web3-wrapper/lib/src';
import { defaultFlags, renderFlags } from '../../global_flags';
import { utils } from '../../utils';

enum StakeStatus {
    Undelegated,
    Delegated,
}

const stakingProxyContractAddress = '0xbab9145f1d57cd4bb0c9aa2d1ece0a5b6e734d34';

export class EndEpoch extends Command {
    public static description = 'Ends the current epoch';

    public static examples = [`$ 0x-debug staking:end_epoch`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        'private-key': flags.string({ required: true }),
        json: renderFlags.json,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(EndEpoch);
        const provider = utils.getPrivateKeyProvider(flags);
        const web3Wrapper = new Web3Wrapper(provider);
        const [address] = await web3Wrapper.getAvailableAddressesAsync();
        const stakingContract = new StakingContract(stakingProxyContractAddress, provider, {});
        await stakingContract.endEpoch.callAsync({ from: address });
        const result = await stakingContract.endEpoch.awaitTransactionSuccessAsync({ from: address });
        console.log(result);
        provider.stop();
    }
}
