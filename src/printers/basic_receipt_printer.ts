import { DecodedLogArgs, LogWithDecodedArgs, TransactionReceiptWithDecodedLogs } from '@0x/web3-wrapper';
import { cli } from 'cli-ux';

export const basicReceiptPrinter = {
    printConsole(result: TransactionReceiptWithDecodedLogs): void {
        const { logs, ...rest } = result;
        cli.styledObject(rest);
        for (const log of logs) {
            const { event, address, args } = log as LogWithDecodedArgs<DecodedLogArgs>;
            if (event) {
                cli.styledObject({ event, address, ...args });
            } else {
                cli.styledObject(log);
            }
        }
    },
};
