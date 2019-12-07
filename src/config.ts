import * as Conf from 'conf';
import { JSONSchema } from 'json-schema-typed';

const schema: { [key: string]: JSONSchema } = {
    profile: {
        type: 'string',
    },
    profiles: {
        type: 'object',
        additionalProperties: {
            type: 'object',
            properties: {
                'private-key': {
                    type: 'string',
                },
                rpc: {
                    type: 'string',
                },
                mnemonic: {
                    type: 'string',
                },
                'base-derivation-path': {
                    type: 'string',
                },
                walletconnect: {
                    type: 'boolean',
                },
                address: {
                    type: 'string',
                },
                'network-id': {
                    type: 'number',
                    default: 1,
                },
            },
        },
    },
};
export const config = new Conf({ schema, projectName: '0x-debug' });
