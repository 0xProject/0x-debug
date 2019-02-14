import { BalanceAndAllowance, ContractWrappers, OrderInfo } from '@0x/contract-wrappers';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';

import { defaultFlags, renderFlags } from '../global_flags';
import { PrintUtils } from '../print_utils';
import { utils } from '../utils';

interface Output {
    orderInfo: OrderInfo;
    balanceAndAllowance?: BalanceAndAllowance;
}

export class OrderInfoCommand extends Command {
    public static description = 'Order Info for the provided order';

    public static examples = [`$ 0x-debug order-info --order-hash [ORDER_HASH]`];

    public static flags = {
        help: flags.help({ char: 'h' }),
        order: flags.string({ char: 'o', description: 'The order in JSON format', required: true }),
        balances: flags.boolean({ description: 'Fetch the balances and allowances for the maker address' }),
        'network-id': defaultFlags.networkId(),
        json: renderFlags.json,
    };
    private _web3Wrapper!: Web3Wrapper;
    private _contractWrappers!: ContractWrappers;

    public async run() {
        const { flags } = this.parse(OrderInfoCommand);
        const provider = utils.getProvider(flags);
        const networkId = utils.getNetworkId(flags);
        provider.start();
        this._web3Wrapper = new Web3Wrapper(provider);
        const order = JSON.parse(flags.order);
        this._contractWrappers = new ContractWrappers(provider, { networkId });
        const orderInfo = await this._contractWrappers.exchange.getOrderInfoAsync(order);
        let balanceAndAllowance;
        if (flags.balances) {
            balanceAndAllowance = await this._contractWrappers.orderValidator.getBalanceAndAllowanceAsync(
                order.makerAddress,
                order.makerAssetData,
            );
        }
        const output = {
            orderInfo,
            balanceAndAllowance,
        };
        flags.json ? this._renderJSON(output) : this._renderConsole(output);
        provider.stop();
    }
    private _renderConsole(output: Output): void {
        const printUtils = new PrintUtils(this._web3Wrapper, this._contractWrappers, {}, {});
        PrintUtils.printData('Orderhash', [[output.orderInfo.orderHash]]);
        PrintUtils.printData('Remaining', [[output.orderInfo.orderTakerAssetFilledAmount]]);
        printUtils.printOrderInfos({ order: output.orderInfo });
        if (output.balanceAndAllowance) {
            PrintUtils.printData('Balance', [[output.balanceAndAllowance.balance.toString()]]);
            PrintUtils.printData('Allowance', [[output.balanceAndAllowance.allowance.toString()]]);
        }
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _renderJSON(output: Output): void {
        console.log(JSON.stringify(output, null, 2));
    }
}
