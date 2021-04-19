// tslint:disable-next-line:no-implicit-dependencies
import * as ethers from "ethers";
ethers.errors.setLogLevel("error");

import { ContractWrappers, MethodAbi } from "@0x/contract-wrappers";
import {
    MnemonicWalletSubprovider,
    PrivateKeyWalletSubprovider,
    RPCSubprovider,
    Web3ProviderEngine,
} from "@0x/subproviders";
import { BigNumber, providerUtils } from "@0x/utils";
import { AbiDefinition, Web3Wrapper } from "@0x/web3-wrapper";
import * as fs from "fs";
import * as path from "path";
import { config } from "./config";
import { constants } from "./constants";
import { prompt } from "./prompt";
import {
    Networks,
    Profile,
    ProfileKeys,
    ReadableContext,
    WriteableContext,
    WriteableProviderType,
} from "./types";
import _ = require("lodash");

// HACK prevent ethers from printing 'Multiple definitions for'
ethers.errors.setLogLevel("error");
let LOADED_ABIS: AbiDefinition[];
let CONTRACT_ADDRESS_NAMES: { [address: string]: string | undefined };

const NETWORK_ID_TO_RPC_URL: { [key in Networks]: string } = {
    [Networks.Mainnet]: "https://mainnet.0x.org",
    [Networks.Kovan]:
        "https://kovan.infura.io/v3/1e72108f28f046ae911df32c932c9bc6",
    [Networks.Ropsten]:
        "https://ropsten.infura.io/v3/1e72108f28f046ae911df32c932c9bc6",
    [Networks.Rinkeby]:
        "https://rinkeby.infura.io/v3/1e72108f28f046ae911df32c932c9bc6",
    [Networks.Goerli]: "http://localhost:8545",
    [Networks.Ganache]: "http://localhost:8545",
    [Networks.GanacheChainId]: "http://localhost:8545",
};

const revertWithReasonABI: MethodAbi = {
    constant: true,
    inputs: [
        {
            name: "error",
            type: "string",
        },
    ],
    name: "Error",
    outputs: [
        {
            name: "error",
            type: "string",
        },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
};

let contractWrappers: ContractWrappers;
let web3Wrapper: Web3Wrapper;

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
    getContractWrappersForChainId(
        provider: Web3ProviderEngine,
        chainId: number
    ): ContractWrappers {
        if (!contractWrappers) {
            contractWrappers = new ContractWrappers(provider, { chainId });
        }
        return contractWrappers;
    },
    knownABIs(): Array<AbiDefinition> {
        if (LOADED_ABIS) {
            return LOADED_ABIS;
        }
        const dirs = ["./abis"];
        let abis: AbiDefinition[] = [];
        dirs.forEach((dir) => {
            const files = fs.readdirSync(path.join(__dirname, dir));
            for (const f of files) {
                const contents = fs
                    .readFileSync(path.join(__dirname, dir, f))
                    .toString();
                const abi: AbiDefinition[] = JSON.parse(contents);
                abis = [...abis, ...abi];
            }
        });
        LOADED_ABIS = abis;
        return LOADED_ABIS;
    },
    loadABIs(wrapper: ContractWrappers | Web3Wrapper): void {
        const abiDecoder =
            (wrapper as Web3Wrapper).abiDecoder ||
            (wrapper as ContractWrappers).getAbiDecoder();
        abiDecoder.addABI(utils.knownABIs(), "0x");
        abiDecoder.addABI([revertWithReasonABI], "Revert");
    },
    loadContractAddressNames() {
        const dirs = ["./tokenlists"];
        if (CONTRACT_ADDRESS_NAMES) {
            return CONTRACT_ADDRESS_NAMES;
        }
        const semanticNames: { [address: string]: string | undefined } = {};
        dirs.forEach((dir) => {
            const files = fs.readdirSync(path.join(__dirname, dir));
            for (const f of files) {
                const contents = fs
                    .readFileSync(path.join(__dirname, dir, f))
                    .toString();
                const tokens: {
                    address: string;
                    name: string;
                    symbol: string;
                }[] = JSON.parse(contents).tokens;
                for (const t of tokens) {
                    semanticNames[t.address] = t.symbol;
                    semanticNames[t.address.toLowerCase()] = t.symbol;
                }
            }
        });
        CONTRACT_ADDRESS_NAMES = semanticNames;
        return CONTRACT_ADDRESS_NAMES;
    },
    getRpcSubprovider(profile: Profile): any {
        const rpcUrl = profile["rpc-url"]
            ? profile["rpc-url"]
            : utils.getNetworkRPCOrThrow(profile["network-id"] || 1);
        const rpcSubprovider = new RPCSubprovider(rpcUrl);
        return rpcSubprovider;
    },
    getReadableContext(flags: any): ReadableContext {
        const provider = new Web3ProviderEngine();
        const profile = utils.mergeFlagsAndProfile(flags);
        const networkId = (profile["network-id"] as number) || 1;
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
        ethers.errors.setLogLevel("error");
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
                `profiles.${config.get("profile")}`
            ) as Profile;
            profile =
                profile || (config.get(`profiles.default`) as Profile) || {};
        }
        ProfileKeys.map((k) => {
            if (flags[k]) {
                profile = { ...profile, [k]: flags[k] };
            }
        });
        return profile;
    },
    async getWritableProviderAsync(): Promise<{
        provider:
            | MnemonicWalletSubprovider
            | PrivateKeyWalletSubprovider
            | RPCSubprovider;
        providerType: WriteableProviderType;
        "private-key": string | undefined;
        mnemonic: string | undefined;
        "base-derivation-path": string | undefined;
        "rpc-url": string | undefined;
        address: string | undefined;
    }> {
        let writeableProvider;
        let walletDetails: any;
        const providerType = (await prompt.selectWriteableProviderAsync())
            .providerType;
        switch (providerType) {
            case WriteableProviderType.PrivateKey:
                const { privateKey } = await prompt.promptForPrivateKeyAsync();
                walletDetails = { "private-key": privateKey };
                writeableProvider = new PrivateKeyWalletSubprovider(privateKey);
                break;
            case WriteableProviderType.Mnemonic:
                const {
                    baseDerivationPath,
                    mnemonic,
                } = await prompt.promptForMnemonicDetailsAsync();
                walletDetails = {
                    "base-derivation-path": baseDerivationPath,
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
                walletDetails = { "rpc-url": address };
                writeableProvider = new RPCSubprovider(rpcUrl);
                break;
            default:
                throw new Error("Provider is currently unsupported");
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
        if (profile["private-key"]) {
            writeableProvider = new PrivateKeyWalletSubprovider(
                profile["private-key"]
            );
            providerType = WriteableProviderType.PrivateKey;
        }
        if (profile.mnemonic) {
            writeableProvider = new MnemonicWalletSubprovider({
                mnemonic: profile.mnemonic,
                baseDerivationPath: profile["base-derivation-path"],
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
            throw new Error("Unable to determine providerType");
        }
        const networkId = profile["network-id"] || 1;
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
            selectedAddress && accounts.find((a) => selectedAddress === a);
        if (!selectedAddress || !selectedAddressExists) {
            selectedAddress =
                accounts.length > 1
                    ? (
                          await prompt.selectAddressAsync(
                              accounts,
                              contractWrappers.devUtils
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
    },
    getNetworkRPCOrThrow(networkId: Networks): string {
        const url = NETWORK_ID_TO_RPC_URL[networkId];
        if (url === undefined) {
            throw new Error("UNSUPPORTED_NETWORK");
        }
        return url;
    },
};
