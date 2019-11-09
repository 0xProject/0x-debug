// tslint:disable:forin
import {
    ContractWrappers,
    ERC20TokenContract,
    Order,
    OrderInfo,
    OrderStatus,
    SignedOrder,
} from '@0x/contract-wrappers';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import {
    BlockParam,
    BlockParamLiteral,
    DecodedLogArgs,
    LogEntry,
    LogWithDecodedArgs,
    TransactionReceiptStatus,
    TransactionReceiptWithDecodedLogs,
} from 'ethereum-types';
import * as _ from 'lodash';
import ora = require('ora');

import { utils } from '../utils';

const DECIMALS = 18;
const UNLIMITED_ALLOWANCE_IN_BASE_UNITS = new BigNumber(2).pow(256).minus(1);

// tslint:disable-next-line:no-var-requires
const Table = require('cli-table');

type TableCol = string[] | BigNumber[];
type TableData = string[][] | BigNumber[][];

interface Table {
    push(data: TableCol): void;
    toString(): string;
}
const EMPTY_DATA: TableData = [];
const DEFAULT_EVENTS = ['Fill', 'Transfer', 'CancelUpTo', 'Cancel'];

const defaultSchema = {
    style: {
        head: ['green'],
    },
};

const borderlessSchema = {
    ...defaultSchema,
    chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: ' ',
    },
    style: { 'padding-left': 1, 'padding-right': 0, head: ['blue'] },
};

const dataSchema = {
    ...borderlessSchema,
    style: { 'padding-left': 1, 'padding-right': 0, head: ['yellow'] },
};

export class PrintUtils {
    private readonly _contractWrappers: ContractWrappers;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _accounts: { [name: string]: string };
    private readonly _tokens: { [name: string]: string };
    public static printScenario(header: string): void {
        const table = new Table({
            ...defaultSchema,
            head: [header],
        });
        PrintUtils.pushAndPrint(table, EMPTY_DATA);
    }
    public static printData(header: string, tableData: TableData): void {
        const table = new Table({
            ...dataSchema,
            head: [header, ''],
        });
        PrintUtils.pushAndPrint(table, tableData);
    }
    public static printHeader(header: string): void {
        const table = new Table({
            ...borderlessSchema,
            style: { 'padding-left': 0, 'padding-right': 0, head: ['blue'] },
            head: [header],
        });
        console.log('');
        PrintUtils.pushAndPrint(table, EMPTY_DATA);
    }
    public static pushAndPrint(table: Table, tableData: TableData): void {
        for (const col of tableData) {
            for (const i in col) {
                if (col[i] === UNLIMITED_ALLOWANCE_IN_BASE_UNITS.toString()) {
                    col[i] = 'MAX_UINT';
                }
            }
            table.push(col);
        }
        console.log(table.toString());
    }
    public static printOrderInfos(orderInfos: { [orderName: string]: OrderInfo }): void {
        const data: string[][] = [];
        _.forOwn(orderInfos, (value, key) => data.push([key, OrderStatus[value.orderStatus], value.orderHash]));
        PrintUtils.printData('Order Info', data);
    }
    public static printOrder(order: Order | SignedOrder): void {
        PrintUtils.printData('Order', Object.entries(order));
    }
    public static printTransaction(
        header: string,
        txHash: string,
        txStatus: TransactionReceiptStatus,
        gasUsed: number,
        decodedLogs: LogEntry[] | Array<LogWithDecodedArgs<{}>> | undefined,
        data: string[][] = [],
        eventNames: string[] = DEFAULT_EVENTS,
    ): void {
        PrintUtils.printHeader('Transaction');
        const headerColor = txStatus === 1 ? 'green' : 'red';
        const table = new Table({
            ...defaultSchema,
            head: [header, txHash],
            style: { ...defaultSchema.style, head: [headerColor] },
        });
        const status = txStatus === 1 ? 'Success' : 'Failure';
        const tableData = [...data, ['gasUsed', gasUsed.toString()], ['status', status]];
        PrintUtils.pushAndPrint(table, tableData);

        if (decodedLogs && decodedLogs.length > 0) {
            PrintUtils.printHeader('Logs');
            for (const log of decodedLogs) {
                // tslint:disable:no-unnecessary-type-assertion
                const eventName = (log as LogWithDecodedArgs<DecodedLogArgs>).event;
                if (eventName && eventNames.includes(eventName)) {
                    // tslint:disable:no-unnecessary-type-assertion
                    const args = (log as LogWithDecodedArgs<DecodedLogArgs>).args;
                    const logData = [['contract', log.address], ...Object.entries(args)];
                    PrintUtils.printData(`${eventName}`, logData as any);
                }
            }
        }
    }
    constructor(
        web3Wrapper: Web3Wrapper,
        contractWrappers: ContractWrappers,
        accounts: { [name: string]: string },
        tokens: { [name: string]: string },
    ) {
        this._contractWrappers = contractWrappers;
        this._web3Wrapper = web3Wrapper;
        this._accounts = accounts;
        this._tokens = tokens;
    }
    public printAccounts(): void {
        const data: string[][] = [];
        _.forOwn(this._accounts, (address, name) => {
            const accountName = name.charAt(0).toUpperCase() + name.slice(1);
            data.push([accountName, address]);
        });
        PrintUtils.printData('Accounts', data);
    }
    public async fetchAndPrintContractBalancesAsync(blockNumber: BlockParam = BlockParamLiteral.Latest): Promise<void> {
        const flattenedBalances = [];
        const flattenedAccounts = Object.keys(this._accounts).map(
            account => account.charAt(0).toUpperCase() + account.slice(1),
        );
        for (const tokenSymbol in this._tokens) {
            const balances = [tokenSymbol];
            const tokenAddress = this._tokens[tokenSymbol];
            for (const account in this._accounts) {
                const address = this._accounts[account];
                const tokenContract = new ERC20TokenContract(tokenAddress, this._web3Wrapper.getProvider());
                const balanceBaseUnits = await tokenContract.balanceOf.callAsync(address, {}, blockNumber);
                const balance = Web3Wrapper.toUnitAmount(balanceBaseUnits, DECIMALS);
                balances.push(balance.toString());
            }
            flattenedBalances.push(balances);
        }
        const ethBalances = ['ETH'];
        // ETH
        for (const account in this._accounts) {
            const address = this._accounts[account];
            const balanceBaseUnits = await this._web3Wrapper.getBalanceInWeiAsync(address);
            const balance = Web3Wrapper.toUnitAmount(balanceBaseUnits, DECIMALS);
            ethBalances.push(balance.toString());
        }
        flattenedBalances.push(ethBalances);
        const table = new Table({
            ...dataSchema,
            head: ['Token', ...flattenedAccounts],
        });
        PrintUtils.printHeader('Balances');
        PrintUtils.pushAndPrint(table, flattenedBalances);
    }
    public async fetchAndPrintContractAllowancesAsync(
        blockNumber: BlockParam = BlockParamLiteral.Latest,
    ): Promise<void> {
        const erc20ProxyAddress = this._contractWrappers.erc20Proxy.address;
        const flattenedAllowances = [];
        const flattenedAccounts = Object.keys(this._accounts).map(
            account => account.charAt(0).toUpperCase() + account.slice(1),
        );
        for (const tokenSymbol in this._tokens) {
            const allowances = [tokenSymbol];
            const tokenAddress = this._tokens[tokenSymbol];
            for (const account in this._accounts) {
                const address = this._accounts[account];
                const tokenContract = new ERC20TokenContract(tokenAddress, this._web3Wrapper.getProvider());
                const approvalBaseUnits = await tokenContract.allowance.callAsync(
                    address,
                    erc20ProxyAddress,
                    {},
                    blockNumber,
                );
                allowances.push(approvalBaseUnits.toString());
            }
            flattenedAllowances.push(allowances);
        }
        const table = new Table({
            ...dataSchema,
            head: ['Token', ...flattenedAccounts],
        });
        PrintUtils.printHeader('Allowances');
        PrintUtils.pushAndPrint(table, flattenedAllowances);
    }
    public async awaitTransactionMinedSpinnerAsync(
        message: string,
        txHash: string,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        const spinner = ora(`${message}: ${txHash}`).start();
        if (!spinner.isSpinning) {
            console.log(message, txHash);
        }
        try {
            const receipt = await this._web3Wrapper.awaitTransactionMinedAsync(txHash);
            receipt.status === 1 ? spinner.stop() : spinner.fail(message);
            return receipt;
        } catch (e) {
            spinner.fail(message);
            throw e;
        }
    }
}
