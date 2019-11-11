import {
    CoordinatorContract,
    ExchangeContract,
    ForwarderContract,
    StakingContract,
    StakingProxyContract,
} from '@0x/abi-gen-wrappers';
import { MethodAbi } from '@0x/contract-wrappers';
import { AbiEncoder } from '@0x/utils';
import { Command, flags } from '@oclif/command';
import * as _ from 'lodash';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../global_flags';
import { PrintUtils } from '../../printers/print_utils';
import { utils } from '../../utils';

// const REGISTRY_ABI = [
//     {
//         constant: false,
//         inputs: [{ internalType: 'string[]', name: 'signatures', type: 'string[]' }],
//         name: 'registerSignatures',
//         outputs: [{ internalType: 'bool[]', name: '', type: 'bool[]' }],
//         payable: false,
//         stateMutability: 'nonpayable',
//         type: 'function',
//     },
//     {
//         constant: true,
//         inputs: [{ internalType: 'bytes4[]', name: 'selectors', type: 'bytes4[]' }],
//         name: 'getEntries',
//         outputs: [{ internalType: 'string[]', name: '', type: 'string[]' }],
//         payable: false,
//         stateMutability: 'view',
//         type: 'function',
//     },
// ];
const PARITY_MASS_REGISTRY_ADDRESS = '0x576e64b24a6b7bfd651e5e63fc0dc431dd3ef518';

export class FunctionRegistryCheck extends Command {
    public static description = 'Checks if known 0x functions are registered with Parity Registry';

    public static examples = [`$ 0x-debug function_registration_check`];

    public static flags = {
        list: flags.boolean(),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags, argv } = this.parse(FunctionRegistryCheck);
        // Registry only exists on Mainnet
        const { provider, web3Wrapper } = utils.getReadableContext({ ...flags, 'network-id': 1 });
        const entriesFunctionAi: MethodAbi = {
            constant: true,
            inputs: [{ name: 'selectors', type: 'bytes4[]' }],
            name: 'getEntries',
            outputs: [{ name: '', type: 'string[]' }],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        };
        const entriesSignature = new AbiEncoder.Method(entriesFunctionAi);

        const ABIS = [
            ...ExchangeContract.ABI(),
            ...ForwarderContract.ABI(),
            ...CoordinatorContract.ABI(),
            ...StakingProxyContract.ABI(),
            ...StakingContract.ABI(),
        ];
        const filteredDefinitions = _.filter(ABIS, abiDefinition => {
            const stateMutability = (abiDefinition as any).stateMutability;
            return stateMutability && stateMutability !== 'pure' && stateMutability !== 'view';
        });
        const allSignatures: string[] = [];
        const chunks = _.chunk(filteredDefinitions, 50);
        const unregisteredSigs: string[] = [];
        for (const chunk of chunks) {
            try {
                const selectors: string[] = [];
                const sigs: string[] = [];
                for (const abiDefinition of chunk) {
                    const abiMethod = new AbiEncoder.Method(abiDefinition as MethodAbi);
                    const selector = abiMethod.getSelector();
                    const sig = abiMethod.getSignature();
                    selectors.push(selector);
                    allSignatures.push(sig);
                    sigs.push(sig);
                }
                const encodedQuery = entriesSignature.encode([selectors]);
                const rawCallResult = await web3Wrapper.callAsync({
                    to: PARITY_MASS_REGISTRY_ADDRESS,
                    data: encodedQuery,
                });
                const result = entriesSignature.strictDecodeReturnValue<string[]>(rawCallResult);
                result.map((r, i) => {
                    if (r === '' && sigs[i].indexOf('undefined') === -1) {
                        unregisteredSigs.push(sigs[i]);
                    }
                });
            } catch (e) {
                this.warn(e);
            }
        }
        PrintUtils.printHeader('Function Registry Check');
        if (flags.list) {
            PrintUtils.printData(`Signatures`, allSignatures.map(s => [s]));
            process.exit(0);
        }
        if (unregisteredSigs.length > 0) {
            PrintUtils.printData(
                `Need to register the following signatures at ${PARITY_MASS_REGISTRY_ADDRESS}`,
                unregisteredSigs.map(s => [s]),
            );
            if (flags.json) {
                console.log(JSON.stringify(unregisteredSigs));
            }
        } else {
            PrintUtils.printData('All good :)', []);
        }
        utils.stopProvider(provider);
    }
}
