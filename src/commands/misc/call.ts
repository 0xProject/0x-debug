import { BigNumber, providerUtils } from '@0x/utils';
import { BlockParamLiteral, CallData, Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../global_flags';
import { jsonPrinter } from '../../printers/json_printer';
import { utils } from '../../utils';

export class Call extends Command {
    public static description = 'Call the Ethereum transaction';

    public static examples = [`$ 0x-debug misc:call [address] [callData]`];

    public static flags = {
        value: flags.string({ description: 'Ether value to send', default: '1' }),
        from: flags.string({ description: 'from account' }),
        blockNumber: flags.integer({ description: 'block number' }),
        gas: flags.integer({ description: 'gas amount' }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };

    public static args = [{ name: 'address' }, { name: 'callData' }];

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Call);
        const { provider, web3Wrapper, contractWrappers } = utils.getReadableContext(flags);
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
        let callResult;
        try {
            // Result can throw (out of gas etc)
            callResult = await web3Wrapper.callAsync(callData, blockNumber);
        } catch (e) {
            return this.error(e);
        }
        let output;
        try {
            // check output is an revert with reason
            output = web3Wrapper.abiDecoder.decodeCalldataOrThrow(callResult);
            await jsonPrinter.printConsole(output);
            utils.stopProvider(provider);
            return;
        } catch (e) {
            this.warn(e);
        }
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
        utils.stopProvider(provider);
    }
}
