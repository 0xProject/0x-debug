// import { ContractWrappers, orderHashUtils, signatureUtils, } from '0x.js';
import { ContractWrappers } from '@0x/contract-wrappers';
import { orderHashUtils, signatureUtils } from '@0x/order-utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags } from '../global_flags';
import { PrintUtils } from '../print_utils';
import { utils } from '../utils';

export class OrderHash extends Command {
    public static description = 'Hashes the provided order';

    public static examples = [`$ 0x-debug orderhash --order [JSON_ORDER]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        order: flags.string({ char: 'o', description: 'The order in JSON format', required: true }),
        validate: flags.boolean({ description: 'Validate the signature of the order', default: false }),
        'network-id': defaultFlags.networkId(),
    };

    public async run() {
        const { flags } = this.parse(OrderHash);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        provider.start();
        const order = JSON.parse(flags.order);
        const orderHash = orderHashUtils.getOrderHashHex(order);
        console.log(orderHash);
        if (flags.validate) {
            const isValidSignature = await signatureUtils.isValidSignatureAsync(
                provider,
                orderHash,
                order.signature,
                order.makerAddress,
            );
            isValidSignature ? console.log('Signature is valid!') : console.log('Signature INVALID');
        }
        const contractWrappers = new ContractWrappers(provider, { networkId });
        const orderInfo = await contractWrappers.exchange.getOrderInfoAsync(order);
        const web3Wrapper = new Web3Wrapper(provider);
        const printUtils = new PrintUtils(web3Wrapper, contractWrappers, {}, {});
        printUtils.printOrderInfos({ order: orderInfo });
        provider.stop();
    }
}
