import { BigNumber } from '@0x/utils';
import { StakeStatus } from './types';

const NIL_POOL_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const constants = {
    MS_IN_SECONDS: 1000,
    UNLIMITED_ALLOWANCE: new BigNumber(2).pow(256).minus(1),
    ZERO: new BigNumber(0),
    MIN_ZRX_UNIT_AMOUNT: 100,
    ETH_DECIMALS: 18,
    NIL_POOL_ID,
    UNDELEGATED_POOL: { status: StakeStatus.Undelegated, poolId: NIL_POOL_ID },
    DISPLAY_DECIMALS: 4,
};
