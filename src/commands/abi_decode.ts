import { ContractWrappers } from '0x.js';
import { AssetProxyOwner, ERC20Proxy, Exchange, Forwarder } from '@0x/contract-artifacts';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags } from '../global_flags';
import { PrintUtils } from '../print_utils';
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
    };
    public static args = [{ name: 'abiEncodedData' }];
    public static strict = false;

    public async run() {
        const { flags, argv } = this.parse(AbiDecode);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        provider.start();
        const contractWrappers = new ContractWrappers(provider, { networkId });
        const abiDecoder = contractWrappers.getAbiDecoder();
        abiDecoder.addABI((Exchange as any).compilerOutput.abi, 'Exchange');
        abiDecoder.addABI((ERC20Proxy as any).compilerOutput.abi, 'ERC20Proxy');
        abiDecoder.addABI((Forwarder as any).compilerOutput.abi, 'Forwarder');
        abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi, 'AssetProxyOwner');
        abiDecoder.addABI([erc20TokenAbi], 'ERC20Token');
        abiDecoder.addABI([erc721TokenAbi], 'ERC721Token');
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
        for (const arg of argv) {
            const decodedCallData = abiDecoder.decodeCalldataOrThrow(arg);
            PrintUtils.printHeader(decodedCallData.functionName);
            PrintUtils.printData(decodedCallData.functionSignature, Object.entries(decodedCallData.functionArguments));
        }

        provider.stop();
    }
}
