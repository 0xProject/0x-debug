import { AssetProxyOwner, ERC20Proxy, Exchange, Forwarder } from '@0x/contract-artifacts';
import { ContractWrappers } from '@0x/contract-wrappers';
import { DecodedCalldata, Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { abiDecodePrinter } from '../printers/abi_decode_printer';
import { jsonPrinter } from '../printers/json_printer';
import { txExplainerUtils } from '../tx_explainer';
import { utils } from '../utils';

const revertWithReasonABI = {
    constant: true,
    inputs: [
        {
            name: 'error',
            type: 'string',
        },
    ],
    name: 'Error',
    outputs: [
        {
            name: 'error',
            type: 'string',
        },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
};
const erc20TokenAbi = {
    constant: true,
    inputs: [
        {
            name: 'token',
            type: 'address',
        },
    ],
    name: 'ERC20Token',
    outputs: [
        {
            name: 'token',
            type: 'string',
        },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
};

const erc721TokenAbi = {
    constant: true,
    inputs: [
        {
            name: 'token',
            type: 'address',
        },
        {
            name: 'id',
            type: 'uint256',
        },
    ],
    name: 'ERC721Token',
    outputs: [],
    payable: false,
    stateMutability: 'view',
    type: 'function',
};

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
        const contractWrappers = new ContractWrappers(provider, { networkId });
        const abiDecoder = contractWrappers.getAbiDecoder();
        abiDecoder.addABI((Exchange as any).compilerOutput.abi, 'Exchange');
        abiDecoder.addABI((ERC20Proxy as any).compilerOutput.abi, 'ERC20Proxy');
        abiDecoder.addABI((Forwarder as any).compilerOutput.abi, 'Forwarder');
        abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi, 'AssetProxyOwner');
        abiDecoder.addABI([erc20TokenAbi], 'ERC20Token');
        abiDecoder.addABI([erc721TokenAbi], 'ERC721Token');
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
        const outputs: DecodedCalldata[] = [];
        if (flags.tx) {
            const web3Wrapper = new Web3Wrapper(provider);
            for (const arg of argv) {
                const explainedTx = await txExplainerUtils.explainTransactionAsync(web3Wrapper, arg, abiDecoder);
                outputs.push(explainedTx.decodedInput);
            }
        } else {
            for (const arg of argv) {
                const decodedCallData = abiDecoder.decodeCalldataOrThrow(arg);
                outputs.push(decodedCallData);
            }
        }
        for (const output of outputs) {
            flags.json ? jsonPrinter.printConsole(output) : abiDecodePrinter.printConsole(output);
        }
        provider.stop();
    }
}
