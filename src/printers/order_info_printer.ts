import { OrderInfoOutput } from '../types';

import { PrintUtils } from './print_utils';

export const orderInfoPrinter = {
    printConsole(output: OrderInfoOutput): void {
        PrintUtils.printData('Orderhash', [[output.orderInfo.orderHash]]);
        PrintUtils.printData('Remaining', [[output.orderInfo.orderTakerAssetFilledAmount]]);
        PrintUtils.printOrderInfos({ order: output.orderInfo });
        if (output.balanceAndAllowance) {
            PrintUtils.printData('Balance', [[output.balanceAndAllowance.balance.toString()]]);
            PrintUtils.printData('Allowance', [[output.balanceAndAllowance.allowance.toString()]]);
        }
    },
};
