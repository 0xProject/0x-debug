import {
    ContractAddresses,
    ContractWrappers,
    DecodedLogArgs,
    LogWithDecodedArgs,
    OrderInfo,
} from '@0x/contract-wrappers';
import { Web3ProviderEngine } from '@0x/subproviders';
import { Order } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
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
    orderAndTraderInfo: any[];
    revertReason?: string;
    logs?: Array<LogWithDecodedArgs<DecodedLogArgs>>;
    functionName: string;
    callData?: string;
}

export interface OrderInfoOutput {
    orderInfo: OrderInfo;
    balanceAndAllowance?: any;
}

export interface OrderHashOutput {
    orderInfo: OrderInfo;
    isValidSignature?: boolean;
}

export enum WriteableProviderType {
    PrivateKey = 'PRIVATE_KEY',
    Mnemonic = 'MNEMONIC',
    WalletConnect = 'WALLET_CONNECT',
    EthereumNode = 'ETHEREUM_NODE',
}
export interface ReadableContext {
    provider: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    contractWrappers: ContractWrappers;
    networkId: number;
    chainId: number;
    contractAddresses: ContractAddresses;
}

export interface WriteableContext extends ReadableContext {
    providerType: WriteableProviderType;
    selectedAddress: string;
}

export enum Networks {
    Mainnet = 1,
    Ropsten = 3,
    Rinkeby = 4,
    Goerli = 5,
    Kovan = 42,
    Ganache = 50,
    GanacheChainId = 1337,
}

export enum StakeStatus {
    Undelegated,
    Delegated,
}

export const ProfileKeys = [
    'network-id',
    'private-key',
    'rpc-url',
    'address',
    'mnemonic',
    'base-derivation-path',
    'walletconnect',
];

export interface Profile {
    'network-id': number | undefined;
    'private-key': string | undefined;
    'rpc-url': string | undefined;
    address: string | undefined;
    mnemonic: string | undefined;
    'base-derivation-path': string | undefined;
    walletconnect: boolean | undefined;
}
