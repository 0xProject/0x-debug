import { DevUtilsContract } from '@0x/contract-wrappers';
import { Web3Wrapper } from '@0x/web3-wrapper';
import inquirer = require('inquirer');

import { constants } from './constants';
import { WriteableProviderType } from './types';

export const prompt = {
    async promptForInputAsync(message: string): Promise<{ input: string }> {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'input',
                message,
            },
        ]);
        return result;
    },
    async promptForEthereumNodeRPCUrlAsync(): Promise<{
        rpcUrl: string;
        address: string;
    }> {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'rpcUrl',
                message: 'Input the Ethereum Node RPC URL',
            },
            {
                type: 'input',
                name: 'address',
                message: 'Input the Ethereum Address',
            },
        ]);
        return result;
    },
    async promptForMnemonicDetailsAsync(): Promise<{
        mnemonic: string;
        baseDerivationPath: string;
    }> {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'baseDerivationPath',
                message: 'Input the HD Derivation path',
                default: `44'/60'/0'/0`,
            },
            {
                type: 'input',
                name: 'mnemonic',
                message: 'Input the Mnemonic',
            },
        ]);
        return result;
    },
    async promptForPrivateKeyAsync(): Promise<{ privateKey: string }> {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'privateKey',
                message: 'Input the Private Key',
            },
        ]);
        return result;
    },
    async selectWriteableProviderAsync(): Promise<{
        providerType: WriteableProviderType;
    }> {
        const result = await inquirer.prompt({
            type: 'list',
            name: 'providerType',
            message:
                'This operation requires an Ethereum Transaction. Please select from one of the providers:',
            choices: [
                {
                    key: 'w',
                    name: 'WalletConnect',
                    value: WriteableProviderType.WalletConnect,
                },
                {
                    key: 'p',
                    name: 'Private Key',
                    value: WriteableProviderType.PrivateKey,
                },
                {
                    key: 'm',
                    name: 'Mnemonic',
                    value: WriteableProviderType.Mnemonic,
                },
                {
                    key: 'e',
                    name: 'Ethereum Node',
                    value: WriteableProviderType.EthereumNode,
                },
            ],
        });
        return result;
    },
    async selectAddressAsync(
        addresses: string[],
        devUtils: DevUtilsContract,
    ): Promise<{ selectedAddress: string }> {
        const ethBalances = await devUtils
            .getEthBalances(addresses)
            .callAsync();
        const result = await inquirer.prompt({
            type: 'list',
            name: 'selectedAddress',
            message: 'Select the address to use',
            choices: addresses.map((a, i) => ({
                key: a,
                name: `${a} [${Web3Wrapper.toUnitAmount(
                    ethBalances[i],
                    constants.ETH_DECIMALS,
                ).toFormat(constants.DISPLAY_DECIMALS)} ETH]`,
                value: a,
            })),
        });
        return result;
    },
};
