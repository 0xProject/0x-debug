import { ERC20TokenContract } from '@0x/abi-gen-wrappers';
import { BigNumber } from '@0x/utils';
import { Command, flags as oclifFlags } from '@oclif/command';

import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../global_flags';
import { basicReceiptPrinter } from '../../printers/basic_receipt_printer';
import { utils } from '../../utils';

export class Enable extends Command {
    public static description = 'Enables a token for trading';

    public static examples = [`$ 0x-debug tokens:enable`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_WRITEABLE_FLAGS,
        token: oclifFlags.string({ name: 'token', required: true }),
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Enable);
        const {
            provider,
            selectedAddress,
            contractAddresses,
        } = await utils.getWriteableContextAsync(flags);
        const tokenContract = new ERC20TokenContract(flags.token, provider, {
            from: selectedAddress,
        });
        const result = await utils.awaitTransactionWithSpinnerAsync(
            'Approve token for trading',
            () =>
                tokenContract
                    .approve(
                        contractAddresses.erc20Proxy,
                        new BigNumber(10).pow(256).minus(1),
                    )
                    .awaitTransactionSuccessAsync(),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
