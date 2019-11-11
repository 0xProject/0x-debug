import { getContractAddressesForChainOrThrow, StakingContract } from '@0x/abi-gen-wrappers';
import { BigNumber } from '@0x/utils';
import { Command } from '@oclif/command';
import inquirer = require('inquirer');

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';

export class Create extends Command {
    public static description = 'Creates a Staking Pool';

    public static examples = [`$ 0x-debug staking:pool:create`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Create);
        const { provider, selectedAddress } = await utils.getWriteableContextAsync(flags);
        const networkId = utils.getNetworkId(flags);
        const addresses = getContractAddressesForChainOrThrow(networkId);
        const stakingContract = new StakingContract(addresses.stakingProxy, provider, {});
        const { ppm } = await inquirer.prompt([
            { message: 'Enter Operator Share (in ppm)', type: 'input', name: 'ppm' },
        ]);
        const result = await utils.awaitTransactionWithSpinnerAsync('Create Staking Pool', () =>
            stakingContract.createStakingPool.awaitTransactionSuccessAsync(new BigNumber(ppm), true, {
                from: selectedAddress,
            }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
