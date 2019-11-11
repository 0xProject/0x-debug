import { RevertError } from '@0x/utils';
import { DecodedCalldata } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../global_flags';
import { abiDecodePrinter } from '../printers/abi_decode_printer';
import { jsonPrinter } from '../printers/json_printer';
import { txExplainerUtils } from '../tx_explainer';
import { utils } from '../utils';

export class AbiDecode extends Command {
    public static description = 'Decodes ABI data for known ABI';

    public static examples = [`$ 0x-debug abidecode [abi encoded data]`];

    public static flags = {
        tx: flags.boolean({ required: false }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [{ name: 'abiEncodedData' }];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags, argv } = this.parse(AbiDecode);
        const { provider, contractWrappers } = utils.getReadableContext(flags);
        const abiDecoder = contractWrappers.getAbiDecoder();
        const outputs: DecodedCalldata[] = [];
        if (flags.tx) {
            const web3Wrapper = utils.getWeb3Wrapper(provider);
            for (const arg of argv) {
                const explainedTx = await txExplainerUtils.explainTransactionAsync(web3Wrapper, arg, abiDecoder);
                outputs.push(explainedTx.decodedInput);
            }
        } else {
            // HACK: (dekz) clean this up
            for (const arg of argv) {
                let decodedCallData;
                try {
                    decodedCallData = RevertError.decode(arg, false);
                    outputs.push({
                        functionName: decodedCallData.name,
                        functionSignature: decodedCallData.selector,
                        functionArguments: [decodedCallData.toString()],
                    });
                } catch {
                    // do nothing
                }
                try {
                    decodedCallData = abiDecoder.decodeCalldataOrThrow(arg);
                    outputs.push(decodedCallData);
                } catch (e) {
                    // do nothing
                }
            }
        }
        for (const output of outputs) {
            flags.json ? jsonPrinter.printConsole(output) : abiDecodePrinter.printConsole(output);
        }
        utils.stopProvider(provider);
    }
}
