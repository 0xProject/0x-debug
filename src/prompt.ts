import { DevUtilsContract } from '@0x/abi-gen-wrappers';
import { Web3Wrapper } from '@0x/web3-wrapper';
import inquirer = require('inquirer');

import { WriteableProviderType } from './types';

export const prompt = {
    async promptForMnemonicDetailsAsync(): Promise<{ mnemonic: string; baseDerivationPath: string }> {
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
    async selectWriteableProviderAsync(): Promise<{ providerType: WriteableProviderType }> {
        const result = await inquirer.prompt({
            type: 'list',
            name: 'providerType',
            message: 'This operation requires an Ethereum Transaction. Please select from one of the providers:',
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
            ],
        });
        return result;
    },
    async selectAddressAsync(addresses: string[], devUtils: DevUtilsContract): Promise<{ selectedAddress: string }> {
        const ethBalances = await devUtils.getEthBalances.callAsync(addresses);
        const result = await inquirer.prompt({
            type: 'list',
            name: 'selectedAddress',
            message: 'Select the address to use',
            choices: addresses.map((a, i) => ({
                key: a,
                name: `${a} [${Web3Wrapper.toUnitAmount(ethBalances[i], 18).toFormat(4)} ETH]`,
                value: a,
            })),
        });
        return result;
    },
};
