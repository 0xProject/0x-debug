import { PromiseWithTransactionHash } from '@0x/base-contract';
import {
    ContractWrappers,
    CoordinatorContract,
    ERC20TokenContract,
    ERC721TokenContract,
    EventAbi,
    ExchangeContract,
    FallbackAbi,
    ForwarderContract,
    MethodAbi,
    RevertErrorAbi,
    StakingContract,
} from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import {
    MnemonicWalletSubprovider,
    PrivateKeyWalletSubprovider,
    RPCSubprovider,
    Web3ProviderEngine,
} from '@0x/subproviders';
import { ERC20AssetData, Order, SignedOrder } from '@0x/types';
import { BigNumber, providerUtils } from '@0x/utils';
import {
    TransactionReceiptWithDecodedLogs,
    Web3Wrapper,
} from '@0x/web3-wrapper';
import { cli } from 'cli-ux';
// tslint:disable-next-line:no-implicit-dependencies
import * as ethers from 'ethers';
import _ = require('lodash');
import { printTextAsQR, WalletConnect } from 'walletconnect-node';

import { config } from './config';
import { constants } from './constants';
import { prompt } from './prompt';
import {
    Networks,
    Profile,
    ProfileKeys,
    ReadableContext,
    WriteableContext,
    WriteableProviderType,
} from './types';
import { WalletConnectSubprovider } from './wallet_connnect_subprovider';

// HACK prevent ethers from printing 'Multiple definitions for'
ethers.errors.setLogLevel('error');

const NETWORK_ID_TO_RPC_URL: { [key in Networks]: string } = {
    [Networks.Mainnet]: 'https://mainnet.0x.org',
    [Networks.Kovan]:
        'https://kovan.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Ropsten]:
        'https://ropsten.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Rinkeby]:
        'https://rinkeby.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Goerli]: 'http://localhost:8545',
    [Networks.Ganache]: 'http://localhost:8545',
    [Networks.GanacheChainId]: 'http://localhost:8545',
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
    convertToUnits: (b: BigNumber | string | number): BigNumber =>
        Web3Wrapper.toUnitAmount(new BigNumber(b), constants.ETH_DECIMALS),
    convertToBaseUnits: (b: BigNumber | string | number): BigNumber =>
        Web3Wrapper.toBaseUnitAmount(new BigNumber(b), constants.ETH_DECIMALS),
    getWeb3Wrapper(provider: Web3ProviderEngine): Web3Wrapper {
        if (!web3Wrapper) {
            web3Wrapper = new Web3Wrapper(provider);
            utils.loadABIs(web3Wrapper);
        }
        return web3Wrapper;
    },
    parsePoolId: (poolId: string): BigNumber => {
        if (poolId.startsWith('0x')) {
            return new BigNumber(poolId, 16);
        }
        return new BigNumber(poolId);
    },
    encodePoolId: (poolId: number) =>
        `0x${new BigNumber(poolId).toString(16).padStart(64, '0')}`,
    decodePoolId: (poolIdHex: string) =>
        new BigNumber(poolIdHex, 16).toNumber(),
    getContractWrappersForChainId(
        provider: Web3ProviderEngine,
        chainId: number,
    ): ContractWrappers {
        if (!contractWrappers) {
            contractWrappers = new ContractWrappers(provider, { chainId });
        }
        return contractWrappers;
    },
    knownABIs(): Array<FallbackAbi | EventAbi | RevertErrorAbi> {
        const ABIS = [
            ...ExchangeContract.ABI(),
            ...ForwarderContract.ABI(),
            ...CoordinatorContract.ABI(),
            ...StakingContract.ABI(),
            ...ERC20TokenContract.ABI(),
            ...ERC721TokenContract.ABI(),
        ];
        return ABIS;
    },
    loadABIs(wrapper: ContractWrappers | Web3Wrapper): void {
        const abiDecoder =
            (wrapper as Web3Wrapper).abiDecoder ||
            (wrapper as ContractWrappers).getAbiDecoder();
        abiDecoder.addABI(utils.knownABIs(), '0x');
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
    },
    getRpcSubprovider(profile: Profile): any {
        const rpcUrl = profile['rpc-url']
            ? profile['rpc-url']
            : utils.getNetworkRPCOrThrow(profile['network-id'] || 1);
        const rpcSubprovider = new RPCSubprovider(rpcUrl);
        return rpcSubprovider;
    },
    getReadableContext(flags: any): ReadableContext {
        const provider = new Web3ProviderEngine();
        const profile = utils.mergeFlagsAndProfile(flags);
        const networkId = (profile['network-id'] as number) || 1;
        provider.addProvider(utils.getRpcSubprovider(profile));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        contractWrappers = new ContractWrappers(provider, {
            chainId: networkId,
        });
        const context = {
            networkId,
            chainId: networkId,
            provider,
            web3Wrapper,
            contractWrappers,
            contractAddresses: contractWrappers.contractAddresses,
        };
        utils.loadABIs(contractWrappers);
        utils.loadABIs(web3Wrapper);
        return context;
    },
    mergeFlagsAndProfile(flags: any): Profile {
        let profile: Profile;
        if (flags.profile) {
            profile =
                (config.get(`profiles.${flags.profile}`) as Profile) || {};
        } else {
            profile = config.get(
                `profiles.${config.get('profile')}`,
            ) as Profile;
            profile =
                profile || (config.get(`profiles.default`) as Profile) || {};
        }
        ProfileKeys.map(k => {
            if (flags[k]) {
                profile = { ...profile, [k]: flags[k] };
            }
        });
        return profile;
    },
    async getWritableProviderAsync(): Promise<{
        provider:
            | WalletConnectSubprovider
            | MnemonicWalletSubprovider
            | PrivateKeyWalletSubprovider
            | RPCSubprovider;
        providerType: WriteableProviderType;
        'private-key': string | undefined;
        mnemonic: string | undefined;
        'base-derivation-path': string | undefined;
        'rpc-url': string | undefined;
        address: string | undefined;
    }> {
        let writeableProvider;
        let walletDetails: any;
        const providerType = (await prompt.selectWriteableProviderAsync())
            .providerType;
        switch (providerType) {
            case WriteableProviderType.WalletConnect:
                writeableProvider = await utils.getWalletConnectProviderAsync();
                break;
            case WriteableProviderType.PrivateKey:
                const { privateKey } = await prompt.promptForPrivateKeyAsync();
                walletDetails = { 'private-key': privateKey };
                writeableProvider = new PrivateKeyWalletSubprovider(privateKey);
                break;
            case WriteableProviderType.Mnemonic:
                const {
                    baseDerivationPath,
                    mnemonic,
                } = await prompt.promptForMnemonicDetailsAsync();
                walletDetails = {
                    'base-derivation-path': baseDerivationPath,
                    mnemonic,
                };
                writeableProvider = new MnemonicWalletSubprovider({
                    mnemonic,
                    baseDerivationPath,
                });
                break;
            case WriteableProviderType.EthereumNode:
                const {
                    rpcUrl,
                    address,
                } = await prompt.promptForEthereumNodeRPCUrlAsync();
                walletDetails = { 'rpc-url': address };
                writeableProvider = new RPCSubprovider(rpcUrl);
                break;
            default:
                throw new Error('Provider is currently unsupported');
        }
        return {
            provider: writeableProvider,
            providerType,
            ...walletDetails,
        };
    },
    async getWriteableContextAsync(flags: any): Promise<WriteableContext> {
        const profile = utils.mergeFlagsAndProfile(flags);
        let writeableProvider;
        let providerType: WriteableProviderType | undefined;
        if (profile['private-key']) {
            writeableProvider = new PrivateKeyWalletSubprovider(
                profile['private-key'],
            );
            providerType = WriteableProviderType.PrivateKey;
        }
        if (profile.mnemonic) {
            writeableProvider = new MnemonicWalletSubprovider({
                mnemonic: profile.mnemonic,
                baseDerivationPath: profile['base-derivation-path'],
            });
            providerType = WriteableProviderType.Mnemonic;
        }
        let selectedAddress = profile.address;
        if (!writeableProvider) {
            const result = await utils.getWritableProviderAsync();
            writeableProvider = result.provider;
            selectedAddress = result.address;
            providerType = result.providerType;
        }
        if (providerType === undefined) {
            throw new Error('Unable to determine providerType');
        }
        const networkId = profile['network-id'] || 1;
        const provider = new Web3ProviderEngine();
        provider.addProvider(writeableProvider);
        provider.addProvider(utils.getRpcSubprovider(profile));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        contractWrappers = new ContractWrappers(provider, {
            chainId: networkId,
        });
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const selectedAddressExists =
            selectedAddress && accounts.find(a => selectedAddress === a);
        if (!selectedAddress || !selectedAddressExists) {
            selectedAddress =
                accounts.length > 1
                    ? (
                          await prompt.selectAddressAsync(
                              accounts,
                              contractWrappers.devUtils,
                          )
                      ).selectedAddress
                    : accounts[0];
        }
        utils.loadABIs(contractWrappers);
        utils.loadABIs(web3Wrapper);
        return {
            provider,
            providerType,
            selectedAddress,
            web3Wrapper,
            networkId,
            chainId: networkId,
            contractWrappers,
            contractAddresses: contractWrappers.contractAddresses,
        };
    },
    stopProvider(provider: Web3ProviderEngine): void {
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
        walletConnectSubprovider = new WalletConnectSubprovider(
            walletConnector,
        );
        return new Promise((resolve, reject) => {
            if (!walletConnector.connected) {
                walletConnector
                    .createSession()
                    .then(() => printTextAsQR(walletConnector.uri));
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
        if (url === undefined) {
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
                    (order as SignedOrder).signature =
                        inputArguments.signatures[index];
                });
            }
        }
        return orders;
    },
    extractAccountsAndTokens(
        orders: Order[],
    ): {
        accounts: { [key: string]: string };
        tokens: { [key: string]: string };
    } {
        let accounts = { taker: '' };
        let tokens = {};
        _.forEach(orders, (order, index) => {
            const extractedMakerTaker = utils.extractMakerTaker(
                order,
                index.toString(),
            );
            const extractedTokens = utils.extractTokens(
                order,
                index.toString(),
            );
            accounts = _.merge(accounts, extractedMakerTaker);
            tokens = _.merge(tokens, extractedTokens);
        });
        return {
            accounts,
            tokens,
        };
    },
    extractMakerTaker(
        order: Order,
        position: string = '',
    ): { [key: string]: string } {
        const accounts = {
            [`maker${position}`]: order.makerAddress,
        };
        return accounts;
    },
    async awaitTransactionWithSpinnerAsync(
        name: string,
        fnAsync: () => PromiseWithTransactionHash<
            TransactionReceiptWithDecodedLogs
        >,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        cli.action.start(name);
        let result;
        try {
            result = await fnAsync();
        } catch (e) {
            console.log(JSON.stringify(e));
            cli.action.stop(e.message);
            throw e;
        }
        cli.action.stop();
        return result;
    },
    extractTokens(
        order: Order,
        position: string = '',
    ): { [key: string]: string } {
        const makerAssetData = assetDataUtils.decodeAssetDataOrThrow(
            order.makerAssetData,
        ) as ERC20AssetData;
        const takerAssetData = assetDataUtils.decodeAssetDataOrThrow(
            order.takerAssetData,
        ) as ERC20AssetData;
        const tokens = {
            [`makerToken${position}`]: makerAssetData.tokenAddress,
            [`takerToken${position}`]: takerAssetData.tokenAddress,
        };
        return tokens;
    },
};
