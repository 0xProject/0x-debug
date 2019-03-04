import { OrderHashOutput } from '../types';

import { PrintUtils } from './print_utils';

export const orderHashPrinter = {
    printConsole(output: OrderHashOutput): void {
        PrintUtils.printOrderInfos({ order: output.orderInfo });
    },
};
