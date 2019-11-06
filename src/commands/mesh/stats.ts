import { WSClient } from '@0x/mesh-rpc-client';
import { Command, flags } from '@oclif/command';

import { renderFlags } from '../../global_flags';

export class Stats extends Command {
    public static description = 'Print the stats of a Mesh node';

    public static examples = [`$ 0x-debug staking:epoch`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'mesh-url': flags.string({ required: true }),
        json: renderFlags.json,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Stats);
        const client = new WSClient(flags['mesh-url']);
        const result = await client.getStatsAsync();
        const output = flags.json ? JSON.stringify(result) : result;
        console.log(output);
        await client.destroy();
    }
}
