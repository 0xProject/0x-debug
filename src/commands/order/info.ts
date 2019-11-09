import { BlockParamLiteral, ContractWrappers, Order } from '@0x/contract-wrappers';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../../global_flags';
import { jsonPrinter } from '../../printers/json_printer';
import { orderInfoPrinter } from '../../printers/order_info_printer';
import { utils } from '../../utils';

export class OrderInfoCommand extends Command {
    public static description = 'Order Info for the provided order';

    public static examples = [`$ 0x-debug order:info --order-hash [ORDER_HASH]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        order: flags.string({ char: 'o', description: 'The order in JSON format', required: true }),
        balances: flags.boolean({ description: 'Fetch the balances and allowances for the maker address' }),
        blockNumber: flags.integer({ description: 'The block number to fetch at' }),
        'network-id': defaultFlags.networkId(),
        json: renderFlags.json,
    };

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { flags } = this.parse(OrderInfoCommand);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        const rawOrder: Order = JSON.parse(flags.order);
        const contractWrappers = utils.getContractWrappersForChainId(provider, networkId);
        let order = rawOrder;
        const blockNumber = flags.blockNumber || BlockParamLiteral.Latest;
        if (!rawOrder.exchangeAddress) {
            order = {
                ...rawOrder,
                exchangeAddress: contractWrappers.exchange.address,
            };
        }
        const orderInfo = await contractWrappers.exchange.getOrderInfo.callAsync(order, {}, blockNumber);
        let balanceAndAllowance;
        if (flags.balances) {
            balanceAndAllowance = await contractWrappers.devUtils.getBalanceAndAssetProxyAllowance.callAsync(
                order.makerAddress,
                order.makerAssetData,
                {},
                blockNumber,
            );
        }
        const output = {
            orderInfo,
            balanceAndAllowance,
        };
        flags.json ? jsonPrinter.printConsole(output) : orderInfoPrinter.printConsole(output);
        provider.stop();
    }
}
