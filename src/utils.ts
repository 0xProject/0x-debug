import {
    CoordinatorContract,
    DevUtilsContract,
    ERC1155MintableContract,
    ERC20TokenContract,
    ERC721TokenContract,
    ExchangeContract,
    ForwarderContract,
    StakingContract,
    StakingProxyContract,
} from '@0x/abi-gen-wrappers';
import { PromiseWithTransactionHash } from '@0x/base-contract';
import { ContractWrappers, EventAbi, FallbackAbi, MethodAbi, RevertErrorAbi } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { MnemonicWalletSubprovider, PrivateKeyWalletSubprovider } from '@0x/subproviders';
import { ERC20AssetData, Order, SignedOrder } from '@0x/types';
import { providerUtils } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs, Web3Wrapper } from '@0x/web3-wrapper';
import * as ethers from 'ethers';
import inquirer = require('inquirer');
import _ = require('lodash');
import { printTextAsQR, WalletConnect } from 'walletconnect-node';

import { prompt } from './prompt';
import { Networks, ReadableContext, WriteableContext, WriteableProviderType } from './types';
import { WalletConnectSubprovider } from './wallet_connnect_subprovider';
const ora = require('ora');
// HACK prevent ethers from printing 'Multiple definitions for'
ethers.errors.setLogLevel('error');
// tslint:disable:no-implicit-dependencies no-var-requires
const Web3ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js');

const NETWORK_ID_TO_RPC_URL: { [key in Networks]: string } = {
    [Networks.Mainnet]: 'https://mainnet.0x.org',
    [Networks.Kovan]: 'https://kovan.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Ropsten]: 'https://ropsten.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Rinkeby]: 'https://rinkeby.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Goerli]: 'http://localhost:8545',
    [Networks.Ganache]: 'http://localhost:8545',
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

let contractWrappers: ContractWrappers;
let web3Wrapper: Web3Wrapper;
let walletConnector: WalletConnect;
let walletConnectSubprovider: WalletConnectSubprovider;

export const utils = {
    getWeb3Wrapper(provider: any): Web3Wrapper {
        if (!web3Wrapper) {
            web3Wrapper = new Web3Wrapper(provider);
            utils.loadABIs(web3Wrapper);
        }
        return web3Wrapper;
    },
    getContractWrappersForChainId(provider: any, chainId: number): ContractWrappers {
        if (!contractWrappers) {
            contractWrappers = new ContractWrappers(provider, { chainId });
        }
        return contractWrappers;
    },
    getNetworkId(flags: any): number {
        const networkId = flags['network-id'];
        if (!networkId) {
            throw new Error('NETWORK_ID_REQUIRED');
        }
        return networkId;
    },
    knownABIs(): Array<FallbackAbi | EventAbi | RevertErrorAbi> {
        const ABIS = [
            ...ExchangeContract.ABI(),
            ...ForwarderContract.ABI(),
            ...CoordinatorContract.ABI(),
            ...StakingProxyContract.ABI(),
            ...StakingContract.ABI(),
            ...ERC20TokenContract.ABI(),
            ...ERC721TokenContract.ABI(),
            ...ERC1155MintableContract.ABI(),
        ];
        return ABIS;
    },
    loadABIs(wrapper: ContractWrappers | Web3Wrapper): void {
        const abiDecoder = (wrapper as Web3Wrapper).abiDecoder || (wrapper as ContractWrappers).getAbiDecoder();
        abiDecoder.addABI(utils.knownABIs(), '0x');
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
    },
    getRpcSubprovider(flags: any): any {
        const networkId = utils.getNetworkId(flags);
        const rpcSubprovider = new RpcSubprovider({ rpcUrl: utils.getNetworkRPCOrThrow(networkId) });
        return rpcSubprovider;
    },
    getReadableContext(flags: any): ReadableContext {
        const networkId = utils.getNetworkId(flags);
        const provider = new Web3ProviderEngine();
        provider.addProvider(utils.getRpcSubprovider(flags));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        contractWrappers = new ContractWrappers(provider, { chainId: networkId });
        const context = {
            networkId,
            chainId: networkId,
            provider,
            web3Wrapper,
            contractWrappers,
        };
        return context;
    },
    async getWriteableContextAsync(flags: any): Promise<WriteableContext> {
        const privKeyFlag = flags['private-key'];
        const mnemonicFlag = flags.mnemonic;
        let writeableProvider;
        let providerType: WriteableProviderType;
        if (!privKeyFlag && !mnemonicFlag) {
            providerType = (await prompt.selectWriteableProviderAsync()).providerType;
            switch (providerType) {
                case WriteableProviderType.WalletConnect:
                    writeableProvider = await utils.getWalletConnectProviderAsync();
                    break;
                case WriteableProviderType.PrivateKey:
                    const { privateKey } = await prompt.promptForPrivateKeyAsync();
                    writeableProvider = new PrivateKeyWalletSubprovider(privateKey);
                    break;
                case WriteableProviderType.Mnemonic:
                    const { baseDerivationPath, mnemonic } = await prompt.promptForMnemonicDetailsAsync();
                    writeableProvider = new MnemonicWalletSubprovider({
                        mnemonic,
                        baseDerivationPath,
                    });
                    break;
                default:
                    throw new Error('Provider is currently unsupported');
            }
        } else {
            if (privKeyFlag) {
                writeableProvider = new PrivateKeyWalletSubprovider(privKeyFlag);
                providerType = WriteableProviderType.PrivateKey;
            } else {
                writeableProvider = new MnemonicWalletSubprovider({ mnemonic: mnemonicFlag });
                providerType = WriteableProviderType.Mnemonic;
            }
        }
        const networkId = utils.getNetworkId(flags);
        const provider = new Web3ProviderEngine();
        provider.addProvider(writeableProvider);
        provider.addProvider(utils.getRpcSubprovider(flags));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        contractWrappers = new ContractWrappers(provider, { chainId: networkId });
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const selectedAddress =
            accounts.length > 1
                ? (await prompt.selectAddressAsync(accounts, contractWrappers.devUtils)).selectedAddress
                : accounts[0];
        return {
            provider,
            providerType,
            selectedAddress,
            web3Wrapper,
            networkId,
            chainId: networkId,
            contractWrappers,
        };
    },
    stopProvider(provider: any): void {
        provider.stop();
        if (walletConnector) {
            void walletConnector.killSession();
        }
    },
    async getWalletConnectProviderAsync(): Promise<WalletConnectSubprovider> {
        if (walletConnectSubprovider) {
            return walletConnectSubprovider;
        }
        walletConnector = new WalletConnect({
            bridge: 'https://bridge.walletconnect.org',
        });
        walletConnectSubprovider = new WalletConnectSubprovider(walletConnector);
        return new Promise((resolve, reject) => {
            if (!walletConnector.connected) {
                walletConnector.createSession().then(() => printTextAsQR(walletConnector.uri));
            }
            walletConnector.on('connect', (error, payload) =>
                error ? reject(error) : resolve(walletConnectSubprovider),
            );
            walletConnector.on('session_update', (error, payload) => {
                if (error) {
                    throw error;
                }
            });

            walletConnector.on('disconnect', (error, payload) => {
                if (error) {
                    throw error;
                }
            });
        });
    },
    getNetworkRPCOrThrow(networkId: Networks): string {
        const url = NETWORK_ID_TO_RPC_URL[networkId];
        if (_.isUndefined(url)) {
            throw new Error('UNSUPPORTED_NETWORK');
        }
        return url;
    },
    extractOrders(inputArguments: any, to: string): Order[] | SignedOrder[] {
        let orders: Order[] = [];
        if (inputArguments.order) {
            const order = inputArguments.order;
            if (inputArguments.signature) {
                (order as SignedOrder).signature = inputArguments.signature;
            }
            orders.push(order);
        } else if (inputArguments.orders) {
            orders = inputArguments.orders;

            if (inputArguments.signatures) {
                _.forEach(orders, (order, index) => {
                    (order as SignedOrder).signature = inputArguments.signatures[index];
                });
            }
        }
        return orders;
    },
    extractAccountsAndTokens(
        orders: Order[],
    ): { accounts: { [key: string]: string }; tokens: { [key: string]: string } } {
        let accounts = { taker: '' };
        let tokens = {};
        _.forEach(orders, (order, index) => {
            const extractedMakerTaker = utils.extractMakerTaker(order, index.toString());
            const extractedTokens = utils.extractTokens(order, index.toString());
            accounts = _.merge(accounts, extractedMakerTaker);
            tokens = _.merge(tokens, extractedTokens);
        });
        return {
            accounts,
            tokens,
        };
    },
    extractMakerTaker(order: Order, position: string = ''): { [key: string]: string } {
        const accounts = {
            [`maker${position}`]: order.makerAddress,
        };
        return accounts;
    },
    async awaitTransactionWithSpinnerAsync(
        name: string,
        fnAsync: () => PromiseWithTransactionHash<TransactionReceiptWithDecodedLogs>,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        const spinner = ora(name).start();
        let result;
        try {
            result = await fnAsync();
        } catch (e) {
            spinner.fail(e.message);
            throw e;
        }
        spinner.stop();
        return result;
    },
    extractTokens(order: Order, position: string = ''): { [key: string]: string } {
        const makerAssetData = assetDataUtils.decodeAssetDataOrThrow(order.makerAssetData) as ERC20AssetData;
        const takerAssetData = assetDataUtils.decodeAssetDataOrThrow(order.takerAssetData) as ERC20AssetData;
        const tokens = {
            [`makerToken${position}`]: makerAssetData.tokenAddress,
            [`takerToken${position}`]: takerAssetData.tokenAddress,
        };
        return tokens;
    },
};
