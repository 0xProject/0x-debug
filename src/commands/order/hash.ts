import { Command, flags } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
} from '../../global_flags';
import { jsonPrinter } from '../../printers/json_printer';
import { orderHashPrinter } from '../../printers/order_hash_printer';
import { OrderHashOutput } from '../../types';
import { utils } from '../../utils';

export class Hash extends Command {
    public static description = 'Hashes the provided order';

    public static examples = [`$ 0x-debug order:hash --order [JSON_ORDER]`];

    public static flags = {
        order: flags.string({
            char: 'o',
            description: 'The order in JSON format',
            required: true,
        }),
        validate: flags.boolean({
            description: 'Validate the signature of the order',
            default: false,
        }),
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_RENDER_FLAGS,
    };

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(Hash);
        const { provider, contractWrappers } = utils.getReadableContext(flags);
        const order = JSON.parse(flags.order);
        const [
            orderInfo,
            remainingFillableTakerAssetAmount,
            isValidSignature,
        ] = await contractWrappers.devUtils
            .getOrderRelevantState(order, order.signature)
            .callAsync();
        if (flags.validate) {
            isValidSignature
                ? console.log('Signature is valid!')
                : console.log('Signature INVALID');
        }
        const output: OrderHashOutput = {
            orderInfo,
            isValidSignature,
        };
        flags.json
            ? jsonPrinter.printConsole(output)
            : orderHashPrinter.printConsole(output);
        utils.stopProvider(provider);
    }
}
