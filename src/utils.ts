import {
    AssetProxyOwnerContract,
    ERC20TokenContract,
    ERC721TokenContract,
    ExchangeContract,
    ForwarderContract,
} from '@0x/abi-gen-wrappers';
import { ContractWrappers, MethodAbi } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { PrivateKeyWalletSubprovider } from '@0x/subproviders';
import { ERC20AssetData, Order, SignedOrder } from '@0x/types';
import { providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import _ = require('lodash');
// tslint:disable:no-implicit-dependencies no-var-requires
const Web3ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js');

enum Networks {
    Mainnet = 1,
    Goerli = 5,
    Ropsten = 3,
    Kovan = 42,
    Ganache = 50,
}

const NETWORK_ID_TO_RPC_URL: { [key in Networks]: string } = {
    [Networks.Mainnet]: 'https://mainnet.0x.org',
    [Networks.Kovan]: 'https://kovan.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
    [Networks.Ropsten]: 'https://ropsten.infura.io/v3/1e72108f28f046ae911df32c932c9bc6',
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

export const utils = {
    getNetworkId(flags: any): number {
        const networkId = flags['network-id'];
        if (!networkId) {
            throw new Error('NETWORK_ID_REQUIRED');
        }
        return networkId;
    },
    loadABIs(wrapper: ContractWrappers | Web3Wrapper): void {
        const abiDecoder = (wrapper as Web3Wrapper).abiDecoder || (wrapper as ContractWrappers).getAbiDecoder();
        abiDecoder.addABI(ExchangeContract.ABI(), 'Exchange');
        abiDecoder.addABI(ERC20TokenContract.ABI(), 'ERC20Token');
        abiDecoder.addABI(ERC721TokenContract.ABI(), 'ERC721Token');
        abiDecoder.addABI(ForwarderContract.ABI(), 'Forwarder');
        abiDecoder.addABI(AssetProxyOwnerContract.ABI(), 'AssetProxyOwner');
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
    },
    getPrivateKeyProvider(flags: any): any {
        const networkId = utils.getNetworkId(flags);
        const rpcSubprovider = new RpcSubprovider({ rpcUrl: utils.getNetworkRPCOrThrow(networkId) });
        const privateKeySubprovider = new PrivateKeyWalletSubprovider(flags['private-key']);
        const provider = new Web3ProviderEngine();
        provider.addProvider(privateKeySubprovider);
        provider.addProvider(rpcSubprovider);
        providerUtils.startProviderEngine(provider);
        return provider;
    },
    getProvider(flags: any): any {
        const networkId = utils.getNetworkId(flags);
        const rpcSubprovider = new RpcSubprovider({ rpcUrl: utils.getNetworkRPCOrThrow(networkId) });
        const provider = new Web3ProviderEngine();
        provider.addProvider(rpcSubprovider);
        providerUtils.startProviderEngine(provider);
        return provider;
    },
    getNetworkRPCOrThrow(networkId: Networks): string {
        const url = NETWORK_ID_TO_RPC_URL[networkId];
        if (_.isUndefined(url)) {
            throw new Error('UNSUPPORTED_NETWORK');
        }
        return url;
    },
    extractOrders(inputArguments: any, to: string, contractWrappers: ContractWrappers): Order[] | SignedOrder[] {
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
                    console.log(inputArguments.signatures);
                    (order as SignedOrder).signature = inputArguments.signatures[index];
                });
            }
        }
        // Normalize orders
        const firstOrder = orders[0];
        // Order call data can be optimised as it is assumed they are
        // all the same asset data in some scenarios
        _.forEach(orders, order => {
            if (order.makerAssetData === '0x') {
                order.makerAssetData = firstOrder.makerAssetData;
            }
            if (order.takerAssetData === '0x') {
                order.takerAssetData = firstOrder.takerAssetData;
            }
            // Forwarder assumes the taker asset is WETH
            if (order.takerAssetData === '0x' && to === contractWrappers.forwarder.address) {
                order.takerAssetData = assetDataUtils.encodeERC20AssetData(contractWrappers.weth9.address);
            }
        });
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
