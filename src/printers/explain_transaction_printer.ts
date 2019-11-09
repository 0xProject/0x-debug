import { Web3Wrapper } from '@0x/web3-wrapper';
import { Provider } from 'ethereum-types';
import _ = require('lodash');

import { ExplainedTransactionOutput } from '../types';
import { utils } from '../utils';

import { PrintUtils } from './print_utils';

export const explainTransactionPrinter = {
    printConsole(output: ExplainedTransactionOutput, provider: Provider, networkId: number): void {
        const contractWrappers = utils.getContractWrappersForChainId(provider, networkId);
        const web3Wrapper = utils.getWeb3Wrapper(provider);

        const printUtils = new PrintUtils(web3Wrapper, contractWrappers, output.accounts, output.tokens);
        const additionalInfo = output.revertReason ? [['Reason', output.revertReason]] : [];
        printUtils.printAccounts();
        PrintUtils.printTransaction(
            output.functionName,
            output.tx,
            output.txStatus,
            output.gasUsed,
            output.logs,
            additionalInfo,
        );
        _.forEach(output.orders, order => PrintUtils.printOrder(order));
    },
};
