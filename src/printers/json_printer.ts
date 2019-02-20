export const jsonPrinter = {
    printConsole(output: any): void {
        const prettyOutput = JSON.stringify(output, null, 2);
        console.log(prettyOutput);
    },
};
