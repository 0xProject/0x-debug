import { Provider } from 'ethereum-types';
import _ = require('lodash');

import { ExplainedTransactionOutput } from '../types';
import { utils } from '../utils';

import { PrintUtils } from './print_utils';
import { Web3ProviderEngine } from '@0x/subproviders';

export const explainTransactionPrinter = {
    printConsole(output: ExplainedTransactionOutput, provider: Web3ProviderEngine, networkId: number): void {
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
