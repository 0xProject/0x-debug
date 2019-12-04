import { Command, flags } from '@oclif/command';

import { config } from '../config';
import { cli } from 'cli-ux';

export class Config extends Command {
    public static description = 'Store and retrieve config';

    public static examples = [`$ 0x-debug config [KEY] [VALUE]`];

    public static flags = {
        delete: flags.boolean({ char: 'd', description: 'delete config key' }),
    };
    public static args = [{ name: 'key' }, { name: 'value' }];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags, argv } = this.parse(Config);
        const [key, value] = argv;
        if (flags.delete && key) {
            config.delete(key);
        } else if (key && value) {
            let v;
            try {
                v = JSON.parse(value);
            } catch (e) {
                v = value;
            }
            config.set(key, v);
        } else if (key) {
            config.get(key);
        } else {
            cli.styledJSON(config.store);
        }
    }
}
