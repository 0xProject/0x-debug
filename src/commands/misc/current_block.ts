import { Command } from '@oclif/command';
import { cli } from 'cli-ux';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../global_flags';
import { utils } from '../../utils';

export class Call extends Command {
    public static description = 'Gets the current ethereum block';

    public static examples = [`$ 0x-debug misc:current_block`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };

    public static args = [{ name: 'address' }, { name: 'callData' }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Call);
        const { provider, web3Wrapper } = utils.getReadableContext(flags);
        const result = await web3Wrapper.getBlockNumberAsync();
        console.log(result);
        utils.stopProvider(provider);
    }
}
