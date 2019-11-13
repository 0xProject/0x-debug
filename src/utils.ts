import {
    ContractAddresses,
    CoordinatorContract,
    ERC1155MintableContract,
    ERC20TokenContract,
    ERC721TokenContract,
    ExchangeContract,
    ForwarderContract,
    getContractAddressesForChainOrThrow,
    StakingContract,
    StakingProxyContract,
} from '@0x/abi-gen-wrappers';
import { PromiseWithTransactionHash } from '@0x/base-contract';
import { ContractWrappers, EventAbi, FallbackAbi, MethodAbi, RevertErrorAbi } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import {
    MnemonicWalletSubprovider,
    PrivateKeyWalletSubprovider,
    RPCSubprovider,
    Web3ProviderEngine,
} from '@0x/subproviders';
import { ERC20AssetData, Order, SignedOrder } from '@0x/types';
import { providerUtils, BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs, Web3Wrapper } from '@0x/web3-wrapper';
import * as ethers from 'ethers';
import _ = require('lodash');
import { printTextAsQR, WalletConnect } from 'walletconnect-node';

import { prompt } from './prompt';
import { Networks, ReadableContext, WriteableContext, WriteableProviderType, Profile, ProfileKeys } from './types';
import { WalletConnectSubprovider } from './wallet_connnect_subprovider';
import { constants } from './constants';
import { config } from './config';
const ora = require('ora');
// HACK prevent ethers from printing 'Multiple definitions for'
ethers.errors.setLogLevel('error');

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
    convertToUnits: (b: BigNumber): BigNumber => Web3Wrapper.toUnitAmount(b, constants.ETH_DECIMALS),
    convertToBaseUnits: (b: BigNumber): BigNumber => Web3Wrapper.toBaseUnitAmount(b, constants.ETH_DECIMALS),
    getContractAddressesForChainOrThrow(chainId: number): ContractAddresses {
        // HACK(dekz) temporarily provide WIP mainnet addresses
        if (chainId === 1) {
            return {
                exchangeV2: '0x080bf510fcbf18b91105470639e9561022937712',
                exchange: '0xb27f1db0a7e473304a5a06e54bdf035f671400c0',
                erc20Proxy: '0x95e6f48254609a6ee006f7d493c8e5fb97094cef',
                erc721Proxy: '0xefc70a1b18c432bdc64b596838b4d138f6bc6cad',
                forwarder: '0x132a04f3f6196b499a7ed512c15e002d5dcefa9a',
                orderValidator: '0x0000000000000000000000000000000000000000',
                zrxToken: '0xe41d2489571d322189246dafa5ebde1f4699f498',
                etherToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                assetProxyOwner: '0xdffe798c7172dd6deb32baee68af322e8f495ce0',
                zeroExGovernor: '0x7d3455421bbc5ed534a83c88fd80387dc8271392',
                dutchAuction: '0x0000000000000000000000000000000000000000',
                coordinatorRegistry: '0x45797531b873fd5e519477a070a955764c1a5b07',
                coordinator: '0x9401f3915c387da331b9b6af5e2a57e580f6a201',
                multiAssetProxy: '0xef701d5389ae74503d633396c4d654eabedc9d78',
                staticCallProxy: '0x3517b88c19508c08650616019062b898ab65ed29',
                erc1155Proxy: '0x7eefbd48fd63d441ec7435d024ec7c5131019add',
                zrxVault: '0xce2a4b118813cbfa27ee11cf8e67b101867fa85e',
                staking: '0xe533d7eb513bc90230ec9069a92eac25e1356beb',
                stakingProxy: '0x5fc73bf8c6158fbe205a5e14126b363ab915b8b1',
                devUtils: '0xf15fbafc74e10a9761b6aefd5d2239f098f8fb1e',
                erc20BridgeProxy: '0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0',
            };
        } else {
            return getContractAddressesForChainOrThrow(chainId);
        }
    },
    getWeb3Wrapper(provider: Web3ProviderEngine): Web3Wrapper {
        if (!web3Wrapper) {
            web3Wrapper = new Web3Wrapper(provider);
            utils.loadABIs(web3Wrapper);
        }
        return web3Wrapper;
    },
    getContractWrappersForChainId(provider: Web3ProviderEngine, chainId: number): ContractWrappers {
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
    getRpcSubprovider(profile: Profile): any {
        const rpcUrl = profile['rpc-url'] ? profile['rpc-url'] : utils.getNetworkRPCOrThrow(profile['network-id'] || 1);
        const rpcSubprovider = new RPCSubprovider(rpcUrl);
        return rpcSubprovider;
    },
    getReadableContext(flags: any): ReadableContext {
        const provider = new Web3ProviderEngine();
        const profile = utils.mergeFlagsAndProfile(flags);
        const networkId = profile['network-id'] as number;
        provider.addProvider(utils.getRpcSubprovider(profile));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        const contractAddresses = utils.getContractAddressesForChainOrThrow(networkId);
        contractWrappers = new ContractWrappers(provider, {
            chainId: networkId,
            contractAddresses,
        });
        const context = {
            networkId,
            chainId: networkId,
            provider,
            web3Wrapper,
            contractWrappers,
            contractAddresses,
        };
        return context;
    },
    mergeFlagsAndProfile(flags: any): Profile {
        let profile: Profile;
        if (flags.profile) {
            profile = (config.get(`profiles.${flags.profile}`) as Profile) || {};
        } else {
            profile = (config.get(`profiles.default`) as Profile) || {};
        }
        ProfileKeys.map(k => {
            if (flags[k]) {
                profile = { ...profile, [k]: flags[k] };
            }
        });
        return profile;
    },
    async getWritableProviderAsync(): Promise<{
        provider: WalletConnectSubprovider | MnemonicWalletSubprovider | PrivateKeyWalletSubprovider | RPCSubprovider;
        providerType: WriteableProviderType;
        'private-key': string | undefined;
        mnemonic: string | undefined;
        'base-derivation-path': string | undefined;
        'rpc-url': string | undefined;
        address: string | undefined;
    }> {
        let writeableProvider;
        let walletDetails: any;
        const providerType = (await prompt.selectWriteableProviderAsync()).providerType;
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
                const { baseDerivationPath, mnemonic } = await prompt.promptForMnemonicDetailsAsync();
                walletDetails = { 'base-derivation-path': baseDerivationPath, mnemonic };
                writeableProvider = new MnemonicWalletSubprovider({
                    mnemonic,
                    baseDerivationPath,
                });
                break;
            case WriteableProviderType.EthereumNode:
                const { rpcUrl, address } = await prompt.promptForEthereumNodeRPCUrlAsync();
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
            writeableProvider = new PrivateKeyWalletSubprovider(profile['private-key']);
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
        const networkId = profile['network-id'] as number;
        const provider = new Web3ProviderEngine();
        provider.addProvider(writeableProvider);
        provider.addProvider(utils.getRpcSubprovider(profile));
        providerUtils.startProviderEngine(provider);
        web3Wrapper = new Web3Wrapper(provider);
        const contractAddresses = utils.getContractAddressesForChainOrThrow(networkId);
        contractWrappers = new ContractWrappers(provider, { chainId: networkId, contractAddresses });
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const selectedAddressExists = selectedAddress && accounts.find(a => selectedAddress === a);
        if (!selectedAddress || !selectedAddressExists) {
            selectedAddress =
                accounts.length > 1
                    ? (await prompt.selectAddressAsync(accounts, contractWrappers.devUtils)).selectedAddress
                    : accounts[0];
        }
        return {
            provider,
            providerType,
            selectedAddress,
            web3Wrapper,
            networkId,
            chainId: networkId,
            contractWrappers,
            contractAddresses,
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
            console.log(JSON.stringify(e));
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
