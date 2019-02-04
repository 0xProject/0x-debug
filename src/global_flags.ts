import { flags } from '@oclif/command';
export const defaultFlags = {
    networkId: flags.build({
        char: 'n',
        description: 'Ethereum network id',
        required: true,
        default: () => 1,
        // tslint:disable-next-line:custom-no-magic-numbers
        parse: input => parseInt(input, 10),
    }),
};
export const renderFlags = {
    json: flags.boolean({
        description: 'Output as JSON',
        required: false,
    }),
};
