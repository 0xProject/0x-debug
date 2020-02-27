import { Command, flags } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
} from '../../global_flags';
import { jsonPrinter } from '../../printers/json_printer';
import { utils } from '../../utils';

export class Call extends Command {
    public static description = 'Prints all known 0x Contract addresses';

    public static examples = [`$ 0x-debug misc:addresses`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };

    public static args = [];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Call);
        const { provider, contractWrappers } = utils.getReadableContext(flags);
        await jsonPrinter.printConsole(contractWrappers.contractAddresses);
        utils.stopProvider(provider);
    }
}
