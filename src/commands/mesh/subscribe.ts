import { OrderEvent, WSClient } from '@0x/mesh-rpc-client';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../global_flags';

export class Subscribe extends Command {
    public static description = 'Subscribe to a feed of order events';

    public static examples = [`$ 0x-debug mesh:subscribe`];

    public static flags = {
        'mesh-url': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Subscribe);
        const client = new WSClient(flags['mesh-url']);
        const printMeshUpdate = (o: OrderEvent[]) => {
            const json = flags.json ? JSON.stringify(o) : JSON.stringify(o, null, 2);
            console.log(json);
        };
        await client.subscribeToOrdersAsync(printMeshUpdate);
    }
}
