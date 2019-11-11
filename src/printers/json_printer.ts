import { cli } from 'cli-ux';

export const jsonPrinter = {
    printConsole(output: any): void {
        cli.styledJSON(output);
    },
};
