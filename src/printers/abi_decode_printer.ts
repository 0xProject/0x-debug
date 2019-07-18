import { DecodedCalldata } from '@0x/web3-wrapper';
import _ = require('lodash');

import { PrintUtils } from './print_utils';

export const abiDecodePrinter = {
    printConsole(output: DecodedCalldata): void {
        PrintUtils.printHeader(output.functionName);
        PrintUtils.printData(output.functionSignature, Object.entries(output.functionArguments) as any);
    },
};
