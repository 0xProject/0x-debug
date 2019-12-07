import { Command } from '@oclif/command';

import { config } from '../../config';
import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
} from '../../global_flags';
import { prompt } from '../../prompt';
import { Profile, WriteableProviderType } from '../../types';
import { utils } from '../../utils';

export class Create extends Command {
    public static description = 'Creates a profile';

    public static examples = [`$ 0x-debug profile:create`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        let profile: Profile;
        const profileName = (await prompt.promptForInputAsync('Profile name'))
            .input;
        const networkId = (await prompt.promptForInputAsync('Network Id'))
            .input;
        const {
            provider,
            providerType,
            ...rest
        } = await utils.getWritableProviderAsync();
        profile = {
            ...rest,
            walletconnect: providerType === WriteableProviderType.WalletConnect,
            'network-id': Number.parseInt(networkId),
        };
        config.set(`profiles.${profileName}`, profile);
    }
}
