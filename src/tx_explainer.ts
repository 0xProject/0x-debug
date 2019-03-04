// Decodes any 0x transaction
import { OrderValidatorContract } from '@0x/abi-gen-wrappers';
import { AssetProxyOwner, Forwarder } from '@0x/contract-artifacts';
import { ContractWrappers } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { Order, SignedOrder } from '@0x/types';
import { AbiDecoder, BigNumber, DecodedCalldata } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import {
    CallData,
    DecodedLogArgs,
    LogWithDecodedArgs,
    MethodAbi,
    Provider,
    TransactionReceipt,
    TransactionReceiptWithDecodedLogs,
} from 'ethereum-types';
import * as _ from 'lodash';

import { ExplainedTransactionOutput } from './types';
import { utils } from './utils';

const ERROR_PREFIX = '08c379a0';

interface ExplainedTransaction {
    success: boolean;
    txHash: string;
    decodedInput: DecodedCalldata;
    decodedLogs?: Array<LogWithDecodedArgs<DecodedLogArgs>>;
    revertReason: string | undefined;
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
        const txReceipt = await web3Wrapper.getTransactionReceiptIfExistsAsync(txHash);
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
            decodedLogs = await txExplainerUtils.decodeLogsAsync(web3Wrapper, txReceipt);
        } else {
            // Make a call at that blockNumber to check for any revert reasons
            revertReason = await txExplainerUtils.decodeRevertReasonAsync(
                web3Wrapper,
                callData,
                blockNumber,
                abiDecoder,
            );
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
    async decodeRevertReasonAsync(
        web3Wrapper: Web3Wrapper,
        callData: CallData,
        blockNumber: number,
        abiDecoder: AbiDecoder,
    ): Promise<string | undefined> {
        let result;
        try {
            result = await web3Wrapper.callAsync(callData, blockNumber);
        } catch (e) {
            // Handle the case where an error is thrown as "Reverted <revert with reason>" i.e Parity via RPCSubprovider
            const errorPrefixIndex = e.data.indexOf(ERROR_PREFIX);
            if (errorPrefixIndex >= 0) {
                const resultRaw = e.data.slice(errorPrefixIndex);
                result = `0x${resultRaw}`;
            }
        }
        if (!_.isUndefined(result)) {
            const decodedRevertReason = abiDecoder.decodeCalldataOrThrow(result);
            if (decodedRevertReason.functionArguments.error) {
                return decodedRevertReason.functionArguments.error;
            }
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

const revertWithReasonABI: MethodAbi = {
    constant: true,
    inputs: [
        {
            name: 'error',
            type: 'string',
        },
    ],
    name: 'Error',
    outputs: [
        {
            name: 'error',
            type: 'string',
        },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
};

export class TxExplainer {
    private _web3Wrapper: Web3Wrapper;
    private _contractWrappers: ContractWrappers;
    constructor(provider: Provider, networkId: number) {
        this._contractWrappers = new ContractWrappers(provider, { networkId });
        const web3Wrapper = new Web3Wrapper(provider);
        const abiDecoder = this._contractWrappers.getAbiDecoder();
        web3Wrapper.abiDecoder.addABI(this._contractWrappers.exchange.abi);
        web3Wrapper.abiDecoder.addABI(this._contractWrappers.erc20Token.abi);
        web3Wrapper.abiDecoder.addABI(this._contractWrappers.erc721Token.abi);
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
        abiDecoder.addABI((Forwarder as any).compilerOutput.abi, 'Forwarder');
        abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi, 'AssetProxyOwner');
        web3Wrapper.abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi);
        this._web3Wrapper = web3Wrapper;
    }

    public async explainTransactionAsync(txHash: string): Promise<ExplainedTransactionOutput> {
        if (_.isUndefined(txHash)) {
            throw new Error('txHash must be defined');
        }
        const decodedTx = await txExplainerUtils.explainTransactionAsync(
            this._web3Wrapper,
            txHash,
            this._contractWrappers.getAbiDecoder(),
        );
        const inputArguments = decodedTx.decodedInput.functionArguments;
        const orders: Order[] = utils.extractOrders(inputArguments, decodedTx.txReceipt.to, this._contractWrappers);
        const { accounts, tokens } = utils.extractAccountsAndTokens(orders);
        const taker = decodedTx.txReceipt.from;
        const contract: OrderValidatorContract = await (this._contractWrappers
            .orderValidator as any)._getOrderValidatorContractAsync();
        const ordersAndTradersInfo = await contract.getOrdersAndTradersInfo.callAsync(
            orders as SignedOrder[],
            _.map(orders, _o => taker),
            {},
            decodedTx.blockNumber,
        );
        const orderInfos = ordersAndTradersInfo[0];
        const traderInfos = ordersAndTradersInfo[1];
        const orderAndTraderInfo = _.map(orderInfos, (orderInfo, index) => {
            const traderInfo = traderInfos[index];
            return {
                orderInfo,
                traderInfo,
            };
        });
        const output = {
            accounts: {
                ...accounts,
                taker: decodedTx.txReceipt.from,
            },
            tokens,
            orders,
            orderAndTraderInfo,
            logs: decodedTx.decodedLogs,
            revertReason: decodedTx.revertReason,
            functionName: decodedTx.decodedInput.functionName,
            tx: txHash,
            txStatus: decodedTx.txReceipt.status,
            gasUsed: decodedTx.txReceipt.gasUsed,
            blockNumber: decodedTx.txReceipt.blockNumber,
        };
        return output;
    }
}
