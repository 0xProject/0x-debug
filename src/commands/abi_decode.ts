import { ContractWrappers } from '@0x/contract-wrappers';
import { RevertError } from '@0x/utils';
import { DecodedCalldata, Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { abiDecodePrinter } from '../printers/abi_decode_printer';
import { jsonPrinter } from '../printers/json_printer';
import { txExplainerUtils } from '../tx_explainer';
import { utils } from '../utils';

export class AbiDecode extends Command {
    public static description = 'Decodes ABI data for known ABI';

    public static examples = [`$ 0x-debug abidecode [abi encoded data]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        tx: flags.boolean({ required: false }),
        json: renderFlags.json,
    };
    public static args = [{ name: 'abiEncodedData' }];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags, argv } = this.parse(AbiDecode);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        const contractWrappers = utils.getContractWrappersForChainId(provider, networkId);
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
        provider.stop();
    }
}
