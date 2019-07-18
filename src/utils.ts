import { AssetProxyOwner, Forwarder } from '@0x/contract-artifacts';
import { ContractWrappers } from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { ERC20AssetData, Order, SignedOrder } from '@0x/types';
import { MethodAbi, Web3Wrapper } from '@0x/web3-wrapper';
import _ = require('lodash');
// tslint:disable:no-implicit-dependencies no-var-requires
const Web3ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js');

enum Networks {
    Mainnet = 1,
    Rinkeby = 4,
    Goerli = 5,
    Ropsten = 3,
    Kovan = 42,
    Ganache = 50,
}

const NETWORK_ID_TO_RPC_URL: { [key in Networks]: string } = {
    [Networks.Kovan]: 'https://kovan.infura.io/v3/d88014795f184ec4acc54d90bbf06dac',
    [Networks.Mainnet]: 'https://mainnet.infura.io/v3/d88014795f184ec4acc54d90bbf06dac',
    [Networks.Ropsten]: 'https://ropsten.infura.io/v3/d88014795f184ec4acc54d90bbf06dac',
    [Networks.Rinkeby]: 'https://rinkeby.infura.io/v3/d88014795f184ec4acc54d90bbf06dac',
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
    loadABIs(web3Wrapper: Web3Wrapper, contractWrappers: ContractWrappers): void {
        const abiDecoder = contractWrappers.getAbiDecoder();
        web3Wrapper.abiDecoder.addABI(contractWrappers.exchange.abi);
        web3Wrapper.abiDecoder.addABI(contractWrappers.erc20Token.abi);
        web3Wrapper.abiDecoder.addABI(contractWrappers.erc721Token.abi);
        abiDecoder.addABI([revertWithReasonABI], 'Revert');
        web3Wrapper.abiDecoder.addABI([revertWithReasonABI], 'Revert');
        abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi, 'AssetProxyOwner');
        web3Wrapper.abiDecoder.addABI((AssetProxyOwner as any).compilerOutput.abi);
        abiDecoder.addABI((Forwarder as any).compilerOutput.abi, 'Forwarder');
        web3Wrapper.abiDecoder.addABI(contractWrappers.forwarder.abi);
    },
    getNetworkId(flags: any): number {
        const networkId = flags['network-id'];
        if (!networkId) {
            throw new Error('NETWORK_ID_REQUIRED');
        }
        return networkId;
    },
    getProvider(flags: any): any {
        const networkId = utils.getNetworkId(flags);
        const rpcSubprovider = new RpcSubprovider({ rpcUrl: utils.getNetworkRPCOrThrow(networkId) });
        const provider = new Web3ProviderEngine();
        provider.addProvider(rpcSubprovider);
        (provider as any)._ready.go();
        return provider;
    },
    getNetworkRPCOrThrow(networkId: Networks): string {
        const url = NETWORK_ID_TO_RPC_URL[networkId];
        if (url === undefined) {
            throw new Error('UNSUPPORTED_NETWORK');
        }
        return url;
    },
    extractOrders(inputArguments: any, to: string, contractWrappers: ContractWrappers): Order[] | SignedOrder[] {
        let orders: Order[] = [];
        if (inputArguments.order) {
            orders.push(inputArguments.order);
        } else if (inputArguments.orders) {
            orders = inputArguments.orders;

            if (inputArguments.signatures) {
                _.forEach(orders, (order, index) => {
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
                order.takerAssetData = assetDataUtils.encodeERC20AssetData(
                    contractWrappers.forwarder.etherTokenAddress,
                );
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
