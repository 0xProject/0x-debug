import { Command, flags } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';

export class Finalize extends Command {
    public static description = 'Finalizes the Staking pool';

    public static examples = [`$ 0x-debug staking:pool:finalize`];

    public static flags = {
        'pool-id': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_WRITEABLE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Finalize);
        const {
            contractWrappers,
            provider,
            selectedAddress,
        } = await utils.getWriteableContextAsync(flags);
        const stakingContract = contractWrappers.staking;
        const result = await utils.awaitTransactionWithSpinnerAsync(
            'Finalizing Pool',
            () =>
                stakingContract
                    .finalizePool(flags['pool-id'])
                    .awaitTransactionSuccessAsync({
                        from: selectedAddress,
                    }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
