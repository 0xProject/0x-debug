import { DecodedCalldata } from "@0x/web3-wrapper";
import _ = require("lodash");

import { PrintUtils } from "./print_utils";

const decodeObj = (obj: any): any => {
    const tableData = [];
    for (var property in obj) {
        if (typeof obj[property] === "object") {
            PrintUtils.printData(property, [[]]);
            tableData.push(decodeObj(obj[property]));
        } else {
            PrintUtils.printData('', [[property, obj[property]]]);
        }
    }
};
export const abiDecodePrinter = {
    printConsole(output: DecodedCalldata): void {
        PrintUtils.printHeader(output.functionName);
        decodeObj(
            JSON.parse(JSON.stringify(output.functionArguments))
        );
    }
};
