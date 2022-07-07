import {
    BalanceAndAllowance,
    DecodedLogArgs,
    LogWithDecodedArgs,
    OrderAndTraderInfo,
    OrderInfo,
} from '@0x/contract-wrappers';
import { Order } from '@0x/types';
import { TransactionReceiptStatus } from 'ethereum-types';

export interface NetworkSpecificConfigs {
    rpcUrl: string;
    networkId: number;
}

export interface Accounts {
    [key: string]: string;
}

export interface Tokens {
    [key: string]: string;
}

export interface ExplainedTransactionOutput {
    blockNumber: number;
    gasUsed: number;
    tx: string;
    txStatus: TransactionReceiptStatus;
    accounts: Accounts;
    tokens: Tokens;
    orders: Order[];
    orderAndTraderInfo: OrderAndTraderInfo[];
    revertReason?: string;
    logs?: Array<LogWithDecodedArgs<DecodedLogArgs>>;
    functionName: string;
}

export interface OrderInfoOutput {
    orderInfo: OrderInfo;
    balanceAndAllowance?: BalanceAndAllowance;
}

export interface OrderHashOutput {
    orderInfo: OrderInfo;
    isValidSignature?: boolean;
}
