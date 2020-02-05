// Decodes any 0x transaction
import { ContractWrappers } from '@0x/contract-wrappers';
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
}
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
        };
        const blockNumber = tx.blockNumber;
        if (!callData.data) {
            throw new Error('No call data');
        }
        const decodedInput = abiDecoder.decodeCalldataOrThrow(callData.data);
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

        let orderInfos;
        try {
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
            orderInfos = orderStatus.map((_o, i) => {
                return {
                    orderStatus: orderStatus[i],
                    fillableTakerAssetAmounts: fillableTakerAssetAmounts[i],
                    isValidSignature: isValidSignature[i],
                };
            });
        } catch (e) {
            console.log(
                'Unable to determine order validity at block: ',
                decodedTx.blockNumber,
            );
        }
        const output = {
            accounts: {
                ...accounts,
                sender: decodedTx.txReceipt.from,
            },
            tokens,
            orders,
            orderAndTraderInfo: {},
            logs: decodedTx.decodedLogs,
            revertReason: decodedTx.revertReason,
            functionName: decodedTx.decodedInput.functionName,
            tx: txHash,
            txStatus: decodedTx.txReceipt.status,
            gasUsed: decodedTx.txReceipt.gasUsed,
            blockNumber: decodedTx.txReceipt.blockNumber,
            orderInfos,
        };
        return output as any;
    }
}
