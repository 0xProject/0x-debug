import { flags } from '@oclif/command';
const defaultFlags = {
    networkId: flags.build({
        char: 'n',
        description: 'Ethereum network id',
        required: true,
        default: () => 1,
        // tslint:disable-next-line:custom-no-magic-numbers
        parse: input => parseInt(input, 10),
    }),
    rpcUrl: flags.string({
        description: 'Ethereum Node RPC URL',
    }),
};
const renderFlags = {
    json: flags.boolean({
        description: 'Output as JSON',
        required: false,
    }),
    help: flags.help({ char: 'h' }),
};
export const DEFAULT_READALE_FLAGS = { 'network-id': defaultFlags.networkId(), 'rpc-url': defaultFlags.rpcUrl };
export const DEFAULT_WRITEABLE_FLAGS = {
    'private-key': flags.string({ description: 'Private Key' }),
    mnemonic: flags.string({ description: 'Mnemonic' }),
};
export const DEFAULT_RENDER_FLAGS = { json: renderFlags.json, help: renderFlags.help };
