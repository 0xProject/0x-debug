import {
    ERC20TokenContract,
    StakingContract,
    StakingProxyContract,
} from '@0x/contract-wrappers';
import { assetDataUtils } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import { constants } from '../../../constants';
import {
    DEFAULT_READALE_FLAGS,
    DEFAULT_RENDER_FLAGS,
    DEFAULT_WRITEABLE_FLAGS,
} from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { prompt } from '../../../prompt';
import { StakeStatus } from '../../../types';
import { utils } from '../../../utils';

export class Stake extends Command {
    public static description = 'Stakes a Staking Pool';

    public static examples = [`$ 0x-debug staking:pool:stake`];

    public static flags = {
        'pool-id': flags.string({ required: true }),
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        ...DEFAULT_WRITEABLE_FLAGS,
    };
    public static args = [];
    public static strict = false;

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        const { flags, argv } = this.parse(Stake);
        const {
            provider,
            selectedAddress,
            contractAddresses,
            contractWrappers,
        } = await utils.getWriteableContextAsync(flags);
        const stakingContract = new StakingContract(
            contractAddresses.stakingProxy,
            provider,
            {},
        );
        const stakingProxyContract = new StakingProxyContract(
            contractAddresses.stakingProxy,
            provider,
            {},
        );
        const poolId = flags['pool-id'];
        const undelegatedStakingPoolInfo = await stakingContract
            .getStakeDelegatedToPoolByOwner(
                selectedAddress,
                constants.UNDELEGATED_POOL.poolId,
            )
            .callAsync();
        const stakingPoolInfo = await stakingContract
            .getStakeDelegatedToPoolByOwner(selectedAddress, poolId)
            .callAsync();
        const stakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: utils.convertToUnits(
                stakingPoolInfo.currentEpochBalance,
            ),
            nextEpochBalance: utils.convertToUnits(
                stakingPoolInfo.nextEpochBalance,
            ),
        };
        const undelegatedStakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: utils.convertToUnits(
                undelegatedStakingPoolInfo.currentEpochBalance,
            ),
            nextEpochBalance: utils.convertToUnits(
                undelegatedStakingPoolInfo.nextEpochBalance,
            ),
        };
        this.log('Undelegated Stake');
        cli.styledJSON(undelegatedStakingPoolInfoUnits);
        this.log(`Delegated Stake ${poolId}`);
        cli.styledJSON(stakingPoolInfoUnits);
        const needsToDepositStake = undelegatedStakingPoolInfoUnits.nextEpochBalance.eq(
            constants.ZERO,
        );
        const [
            zrxBalanceUnits,
            zrxAllowanceUnits,
        ] = await contractWrappers.devUtils
            .getBalanceAndAssetProxyAllowance(
                selectedAddress,
                assetDataUtils.encodeERC20AssetData(contractAddresses.zrxToken),
            )
            .callAsync();
        // const [
        //     zrxBalanceUnits,
        //     zrxAllowanceUnits,
        // ] = (await contractWrappers.devUtils.getBalanceAndAssetProxyAllowance(selectedAddress, assetDataUtils.encodeERC20AssetData(contractAddresses.zrxToken),
        // )).map(convertToUnits);
        const needsToSetAllowance = zrxAllowanceUnits.eq(constants.ZERO);

        if (
            !zrxBalanceUnits.isGreaterThanOrEqualTo(
                constants.MIN_ZRX_UNIT_AMOUNT,
            )
        ) {
            this.error(
                `Insufficient balance of ZRX: ${zrxAllowanceUnits.toFixed(
                    constants.DISPLAY_DECIMALS,
                )}`,
            );
        }
        const { input } = await prompt.promptForInputAsync(
            `Input amount to stake [${zrxBalanceUnits.toFixed(
                constants.DISPLAY_DECIMALS,
            )} ZRX]`,
        );
        if (needsToDepositStake && needsToSetAllowance) {
            const erc20Token = new ERC20TokenContract(
                contractAddresses.zrxToken,
                provider,
                { from: selectedAddress },
            );
            await utils.awaitTransactionWithSpinnerAsync(
                'Setting ZRX Allowance',
                () =>
                    erc20Token
                        .approve(
                            contractAddresses.erc20Proxy,
                            constants.UNLIMITED_ALLOWANCE,
                        )
                        .awaitTransactionSuccessAsync({ from: selectedAddress }),
            );
        }
        const functionCalls: string[] = [];
        if (needsToDepositStake) {
            functionCalls.push(
                stakingContract
                    .stake(utils.convertToBaseUnits(input))
                    .getABIEncodedTransactionData(),
            );
        }
        functionCalls.push(
            stakingContract
                .moveStake(
                    constants.UNDELEGATED_POOL,
                    { status: StakeStatus.Delegated, poolId },
                    utils.convertToBaseUnits(input),
                )
                .getABIEncodedTransactionData(),
        );
        const result = await utils.awaitTransactionWithSpinnerAsync(
            `Staking ${poolId}`,
            () =>
                stakingProxyContract
                    .batchExecute(functionCalls)
                    .awaitTransactionSuccessAsync({ from: selectedAddress }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
