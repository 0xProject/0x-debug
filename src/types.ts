import { DecodedLogArgs, LogWithDecodedArgs, OrderAndTraderInfo } from '@0x/contract-wrappers';
import { Order } from '@0x/types';
import { BigNumber } from '@0x/utils';
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
    accounts: Accounts;
    blockNumber: number;
    gasUsed: number;
    tokens: Tokens;
    orders: Order[];
    orderAndTraderInfo: OrderAndTraderInfo[];
    revertReason?: string;
    logs?: Array<LogWithDecodedArgs<DecodedLogArgs>>;
    tx: string;
    txStatus: TransactionReceiptStatus;
    functionName: string;
}
