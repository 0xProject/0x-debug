import { StakingContract } from '@0x/abi-gen-wrappers';
import { Command } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';

export class End extends Command {
    public static description = 'Ends the current epoch';

    public static examples = [`$ 0x-debug staking:epoch:end`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_WRITEABLE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(End);
        const {
            provider,
            selectedAddress,
            contractAddresses,
        } = await utils.getWriteableContextAsync(flags);
        const stakingContract = new StakingContract(
            contractAddresses.stakingProxy,
            provider,
            {},
        );
        const result = await utils.awaitTransactionWithSpinnerAsync(
            'End Epoch',
            () =>
                stakingContract.endEpoch().awaitTransactionSuccessAsync({
                    from: selectedAddress,
                }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
