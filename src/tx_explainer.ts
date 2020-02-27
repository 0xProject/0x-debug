// Decodes any 0x transaction
import {
    ContractWrappers,
    ExchangeEventArgs,
    ExchangeEvents,
} from '@0x/contract-wrappers';
import { Web3ProviderEngine } from '@0x/subproviders';
import { Order, SignedOrder } from '@0x/types';
import { AbiDecoder, BigNumber, DecodedCalldata, RevertError } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import {
    CallData,
    DecodedLogArgs,
    LogWithDecodedArgs,
    TransactionReceipt,
    TransactionReceiptWithDecodedLogs,
} from 'ethereum-types';

import { ExplainedTransactionOutput } from './types';
import { utils } from './utils';

interface ExplainedTransaction {
    success: boolean;
    txHash: string;
    decodedInput: DecodedCalldata;
    decodedLogs?: Array<LogWithDecodedArgs<DecodedLogArgs>>;
    revertReason: RevertError | undefined;
    gasUsed?: number;
    value?: BigNumber;
    txReceipt: TransactionReceipt;
    blockNumber: number;
    from: string;
    transactionIndex: number;
}

const RELEVANT_LOGS_BLOCK_COUNT = 3;

export const txExplainerUtils = {
    async explainTransactionAsync(
        web3Wrapper: Web3Wrapper,
        txHash: string,
        abiDecoder: AbiDecoder,
    ): Promise<ExplainedTransaction> {
        let tx;
        try {
            tx = await web3Wrapper.getTransactionByHashAsync(txHash);
        } catch (err) {
            throw new Error('TX_NOT_FOUND');
        }
        const txReceipt = await web3Wrapper.getTransactionReceiptIfExistsAsync(
            txHash,
        );
        if (!tx || !tx.blockNumber || !tx.input || !txReceipt) {
            throw new Error('TX_NOT_FOUND');
        }
        const callData: CallData = {
            to: tx.to as string,
            data: tx.input,
            from: tx.from,
            nonce: tx.nonce,
            value: tx.value,
            gas: tx.gas,
            gasPrice: tx.gasPrice,
        };
        const blockNumber = tx.blockNumber;
        if (!callData.data) {
            throw new Error('No call data');
        }
        let decodedInput;
        try {
            decodedInput = abiDecoder.decodeCalldataOrThrow(callData.data);
        } catch (e) {
            const selectors = Object.keys(
                (abiDecoder as any)._selectorToFunctionInfo,
            ).map((s: string) => s.slice(2));
            const foundSelectors = selectors
                .map(s => callData.data!.indexOf(s))
                .filter(i => i !== -1);
            for (const selector of foundSelectors) {
                const cd = `0x${callData.data.slice(selector)}`;
                try {
                    decodedInput = abiDecoder.decodeCalldataOrThrow(cd);
                    break;
                } catch (e) {
                    // do nothing
                }
            }
        }
        if (!decodedInput) {
            throw new Error('Unable to decode tx');
        }
        let decodedLogs;
        let revertReason;
        const gasUsed = txReceipt.gasUsed;
        const isSuccess = txReceipt && txReceipt.status === 1;
        if (txReceipt && txReceipt.status === 1) {
            decodedLogs = await txExplainerUtils.decodeLogsAsync(
                web3Wrapper,
                txReceipt,
            );
        } else {
            // Make a call at that blockNumber to check for any revert reasons
            try {
                revertReason = await txExplainerUtils.decodeRevertReasonIfExistsAsync(
                    web3Wrapper,
                    callData,
                    blockNumber,
                );
            } catch (e) {
                console.log(e);
                console.log('Unable to perform eth_call');
            }
        }
        return {
            blockNumber,
            success: isSuccess,
            txHash,
            value: tx.value,
            gasUsed,
            decodedInput,
            decodedLogs,
            revertReason,
            txReceipt,
            from: txReceipt.from,
            transactionIndex: tx.transactionIndex as number,
        };
    },
    async decodeRevertReasonIfExistsAsync(
        web3Wrapper: Web3Wrapper,
        callData: CallData,
        blockNumber: number,
    ): Promise<RevertError | undefined> {
        let result;
        try {
            result = await web3Wrapper.callAsync(callData, blockNumber);
        } catch (e) {
            // Handle the case where an error is thrown as "Reverted <revert with reason>" i.e Parity via RPCSubprovider
            if (e.data) {
                const errorPrefixIndex = e.data.indexOf('0x');
                result = e.data.slice(errorPrefixIndex);
            }
        }
        if (result) {
            const revertError = RevertError.decode(result, true);
            return revertError;
        }

        return undefined;
    },
    async decodeLogsAsync(
        web3Wrapper: Web3Wrapper,
        txReceipt: TransactionReceiptWithDecodedLogs,
    ): Promise<Array<LogWithDecodedArgs<DecodedLogArgs>>> {
        // Extract the logs
        const decodedLogs: Array<LogWithDecodedArgs<DecodedLogArgs>> = [];
        for (const log of txReceipt.logs) {
            const decodedLog = web3Wrapper.abiDecoder.tryToDecodeLogOrNoop(log);
            // tslint:disable:no-unnecessary-type-assertion
            decodedLogs.push(decodedLog as LogWithDecodedArgs<DecodedLogArgs>);
        }
        return decodedLogs;
    },
};

export class TxExplainer {
    private _web3Wrapper: Web3Wrapper;
    private _contractWrappers: ContractWrappers;
    constructor(provider: Web3ProviderEngine, networkId: number) {
        this._contractWrappers = utils.getContractWrappersForChainId(
            provider,
            networkId,
        );
        this._web3Wrapper = utils.getWeb3Wrapper(provider);
    }

    public async explainTransactionAsync(
        txHash: string,
    ): Promise<ExplainedTransactionOutput> {
        if (txHash === undefined) {
            throw new Error('txHash must be defined');
        }
        const decodedTx = await txExplainerUtils.explainTransactionAsync(
            this._web3Wrapper,
            txHash,
            this._web3Wrapper.abiDecoder,
        );
        const inputArguments = decodedTx.decodedInput.functionArguments;
        const orders: Order[] = utils.extractOrders(
            inputArguments,
            decodedTx.txReceipt.to,
        );
        const { accounts, tokens } = utils.extractAccountsAndTokens(orders);
        const devUtils = this._contractWrappers.devUtils;
        let relevantLogs: Array<LogWithDecodedArgs<ExchangeEventArgs>> = [];
        let orderInfos;
        let balancesAndAllowances;
        try {
            // Fetch the balances and allowances at the block height
            balancesAndAllowances = await this._getBalancesAndAllowancesAsync(
                decodedTx.from,
                orders,
                decodedTx.blockNumber,
            );
            // Fetch the status of the orders
            const [
                orderStatus,
                fillableTakerAssetAmounts,
                isValidSignature,
            ] = await devUtils
                .getOrderRelevantStates(
                    orders as SignedOrder[],
                    orders.map(o => (o as SignedOrder).signature),
                )
                .callAsync({}, decodedTx.blockNumber);
            orderInfos = orderStatus.map((_o, i) => ({
                orderStatus: orderStatus[i],
                fillableTakerAssetAmounts: fillableTakerAssetAmounts[i],
                isValidSignature: isValidSignature[i],
            }));
            // Fetch any logs related to the maker or order hash
            relevantLogs = await this._getRelevantLogsAsync(
                orders.map(o => o.makerAddress),
                orderInfos.map(o => o.orderStatus.orderHash),
                decodedTx.blockNumber,
            );
        } catch (e) {
            console.log(
                'Unable to determine order validity at block: ',
                decodedTx.blockNumber,
            );
        }
        const relevantLogsTrimmed = relevantLogs.map(
            // tslint:disable-next-line:no-shadowed-variable
            ({ event, args, blockNumber, transactionIndex }) => ({
                event,
                args,
                blockNumber,
                transactionIndex,
            }),
        );
        const { status, gasUsed, blockNumber } = decodedTx.txReceipt;
        const output = {
            accounts: {
                ...accounts,
                sender: decodedTx.txReceipt.from,
            },
            tokens,
            orders,
            logs: decodedTx.decodedLogs,
            revertReason: decodedTx.revertReason,
            functionName: decodedTx.decodedInput.functionName,
            inputArguments,
            transactionIndex: decodedTx.transactionIndex,
            tx: txHash,
            status,
            gasUsed,
            blockNumber,
            orderInfos,
            balancesAndAllowances,
            relevantLogs: relevantLogsTrimmed,
        };
        return output;
    }

    private async _getBalancesAndAllowancesAsync(
        address: string,
        orders: Order[],
        blockNumber: number,
    ): Promise<{ [key: string]: BigNumber[] }> {
        const takerAssetDatas = Array.from(
            new Set(orders.map(o => o.takerAssetData)),
        );
        const [
            balances,
            allowances,
        ] = await this._contractWrappers.devUtils
            .getBatchBalancesAndAssetProxyAllowances(address, takerAssetDatas)
            .callAsync({}, blockNumber);
        return balances.reduce((p: { [key: string]: BigNumber[] }, _b, i) => {
            p[takerAssetDatas[i]] = [balances[i], allowances[i]];
            return p;
        }, {});
    }

    private async _getRelevantLogsAsync(
        _makers: string[],
        orderHashes: string[],
        blockNumber: number,
    ): Promise<Array<LogWithDecodedArgs<ExchangeEventArgs>>> {
        let relevantLogs: Array<LogWithDecodedArgs<ExchangeEventArgs>> = [];
        const makers = Array.from(new Set(_makers));
        const relevantLogsBlockRange = {
            toBlock: blockNumber,
            fromBlock: blockNumber - RELEVANT_LOGS_BLOCK_COUNT,
        };
        for (const orderHash of orderHashes) {
            const [fillLogs, cancelLogs] = await Promise.all([
                this._contractWrappers.exchange.getLogsAsync(
                    ExchangeEvents.Fill,
                    relevantLogsBlockRange,
                    { orderHash },
                ),
                this._contractWrappers.exchange.getLogsAsync(
                    ExchangeEvents.Cancel,
                    relevantLogsBlockRange,
                    { orderHash },
                ),
            ]);
            relevantLogs = [...relevantLogs, ...fillLogs, ...cancelLogs];
        }
        for (const maker of makers) {
            const cancelOrdersUpToLogs = await this._contractWrappers.exchange.getLogsAsync(
                ExchangeEvents.CancelUpTo,
                relevantLogsBlockRange,
                { makerAddress: maker },
            );
            relevantLogs = [...relevantLogs, ...cancelOrdersUpToLogs];
        }
        return relevantLogs;
    }
}
