import { ContractWrappers } from '@0x/contract-wrappers';
import { BigNumber, providerUtils } from '@0x/utils';
import { BlockParamLiteral, CallData, Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { jsonPrinter } from '../printers/json_printer';
import { utils } from '../utils';

export class Call extends Command {
    public static description = 'Call the Ethereum transaction';

    public static examples = [`$ 0x-debug call [address] [callData]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        'network-id': defaultFlags.networkId(),
        value: flags.string({ description: 'Ether value to send', default: '1' }),
        from: flags.string({ description: 'from account' }),
        blockNumber: flags.integer({ description: 'block number' }),
        gas: flags.integer({ description: 'gas amount' }),
        json: renderFlags.json,
    };

    public static args = [{ name: 'address' }, { name: 'callData' }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Call);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        const callDataInput = args.callData;
        const address = args.address;
        const blockNumber: number | BlockParamLiteral = flags.blockNumber
            ? flags.blockNumber
            : BlockParamLiteral.Latest;
        // tslint:disable-next-line:custom-no-magic-numbers
        const value = Web3Wrapper.toBaseUnitAmount(new BigNumber(flags.value as string), 18);
        const callData: CallData = {
            to: address,
            data: callDataInput,
            from: flags.from,
            gas: flags.gas,
            value,
        };
        providerUtils.startProviderEngine(provider);
        const web3Wrapper = new Web3Wrapper(provider);
        const contractWrappers = new ContractWrappers(provider, { networkId });
        utils.loadABIs(web3Wrapper, contractWrappers);
        let callResult;
        try {
            // Result can throw (out of gas etc)
            callResult = await web3Wrapper.callAsync(callData, blockNumber);
        } catch (e) {
            console.log(e);
            return;
        }
        const gasEstimate = await web3Wrapper.estimateGasAsync(callData);
        console.log('gasEstimate', gasEstimate);
        let output;
        try {
            // check output is an revert with reason
            output = web3Wrapper.abiDecoder.decodeCalldataOrThrow(callResult);
            await jsonPrinter.printConsole(output);
            provider.stop();
            return;
        } catch (e) {}
        try {
            const parsedCallData = web3Wrapper.abiDecoder.decodeCalldataOrThrow(callDataInput);
            let decoder;
            const contractInstances = [await (contractWrappers.forwarder as any)._getForwarderContractAsync()];
            for (const instance of contractInstances) {
                const foundDecoder = instance._abiEncoderByFunctionSignature[parsedCallData.functionSignature];
                if (foundDecoder) {
                    decoder = foundDecoder;
                }
            }
            output = decoder.strictDecodeReturnValue(callResult);
        } catch (e) {
            output = callResult;
        }
        await jsonPrinter.printConsole(output);
        provider.stop();
    }
}
