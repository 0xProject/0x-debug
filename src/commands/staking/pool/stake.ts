import {
    getContractAddressesForChainOrThrow,
    StakingContract,
    ERC20TokenContract,
    StakingProxyContract,
} from '@0x/abi-gen-wrappers';
import { Command, flags } from '@oclif/command';

import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS, DEFAULT_WRITEABLE_FLAGS } from '../../../global_flags';
import { basicReceiptPrinter } from '../../../printers/basic_receipt_printer';
import { utils } from '../../../utils';
import { prompt } from '../../../prompt';
import { BigNumber } from '@0x/utils';
import { cli } from 'cli-ux';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { assetDataUtils } from '@0x/order-utils';

enum StakeStatus {
    Undelegated,
    Delegated,
}
const NIL_POOL_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';

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
        const { provider, selectedAddress, contractAddresses, contractWrappers } = await utils.getWriteableContextAsync(
            flags,
        );
        const stakingContract = new StakingContract(contractAddresses.stakingProxy, provider, {});
        const stakingProxyContract = new StakingProxyContract(contractAddresses.stakingProxy, provider, {});
        const poolId = flags['pool-id'];
        const undelegatedStakingPoolInfo = await stakingContract.getStakeDelegatedToPoolByOwner.callAsync(
            selectedAddress,
            NIL_POOL_ID,
        );
        const stakingPoolInfo = await stakingContract.getStakeDelegatedToPoolByOwner.callAsync(selectedAddress, poolId);
        const convertToUnits = (b: BigNumber | string): BigNumber => Web3Wrapper.toUnitAmount(new BigNumber(b), 18);
        const convertToBaseUnits = (b: BigNumber | string): BigNumber =>
            Web3Wrapper.toBaseUnitAmount(new BigNumber(b), 18);
        const stakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: convertToUnits(stakingPoolInfo.currentEpochBalance),
            nextEpochBalance: convertToUnits(stakingPoolInfo.nextEpochBalance),
        };
        const undelegatedStakingPoolInfoUnits = {
            ...stakingPoolInfo,
            currentEpochBalance: convertToUnits(undelegatedStakingPoolInfo.currentEpochBalance),
            nextEpochBalance: convertToUnits(undelegatedStakingPoolInfo.nextEpochBalance),
        };
        this.log('Undelegated Stake');
        cli.styledJSON(undelegatedStakingPoolInfoUnits);
        this.log(`Delegated Stake ${poolId}`);
        cli.styledJSON(stakingPoolInfoUnits);
        const needsToDepositStake = undelegatedStakingPoolInfoUnits.nextEpochBalance.eq(0);
        const [
            zrxBalanceUnits,
            zrxAllowanceUnits,
        ] = (await contractWrappers.devUtils.getBalanceAndAssetProxyAllowance.callAsync(
            selectedAddress,
            assetDataUtils.encodeERC20AssetData(contractAddresses.zrxToken),
        )).map(convertToUnits);
        const needsToSetAllowance = zrxAllowanceUnits.eq(0);

        if (!zrxBalanceUnits.isGreaterThanOrEqualTo(100)) {
            this.error(`Insufficient balance of ZRX: ${zrxAllowanceUnits.toFixed(4)}`);
        }
        if (needsToDepositStake && needsToSetAllowance) {
            const erc20Token = new ERC20TokenContract(contractAddresses.zrxToken, provider, { from: selectedAddress });
            await utils.awaitTransactionWithSpinnerAsync('Setting ZRX Allowance', () =>
                erc20Token.approve.awaitTransactionSuccessAsync(
                    contractAddresses.erc20Proxy,
                    new BigNumber(2).pow(256).minus(1),
                    { from: selectedAddress },
                ),
            );
        }
        const { input } = await prompt.promptForInputAsync(`Input amount to stake [${zrxBalanceUnits.toFixed(4)} ZRX]`);
        const functionCalls: string[] = [];
        if (needsToDepositStake) {
            functionCalls.push(stakingContract.stake.getABIEncodedTransactionData(convertToBaseUnits(input)));
        }
        functionCalls.push(
            stakingContract.moveStake.getABIEncodedTransactionData(
                { status: StakeStatus.Undelegated, poolId: NIL_POOL_ID },
                { status: StakeStatus.Delegated, poolId },
                convertToBaseUnits(input),
            ),
        );
        const result = await utils.awaitTransactionWithSpinnerAsync(`Staking ${poolId}`, () =>
            stakingProxyContract.batchExecute.awaitTransactionSuccessAsync(functionCalls, { from: selectedAddress }),
        );
        basicReceiptPrinter.printConsole(result);
        utils.stopProvider(provider);
    }
}
