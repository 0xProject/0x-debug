# 0x-debug

[![Version](https://img.shields.io/npm/v/0x-debug.svg)](https://npmjs.org/package/0x-debug)
[![Downloads/week](https://img.shields.io/npm/dw/0x-debug.svg)](https://npmjs.org/package/0x-debug)
[![License](https://img.shields.io/npm/l/0x-debug.svg)](https://github.com/dekz/0x-debug/blob/master/package.json)

<!-- toc -->
* [0x-debug](#0x-debug)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g 0x-debug
$ 0x-debug COMMAND
running command...
$ 0x-debug (-v|--version|version)
0x-debug/0.0.2 darwin-x64 node-v11.13.0
$ 0x-debug --help [COMMAND]
USAGE
  $ 0x-debug COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`0x-debug abi_decode [ABIENCODEDDATA]`](#0x-debug-abi_decode-abiencodeddata)
* [`0x-debug call [ADDRESS] [CALLDATA]`](#0x-debug-call-address-calldata)
* [`0x-debug explain [TX]`](#0x-debug-explain-tx)
* [`0x-debug help [COMMAND]`](#0x-debug-help-command)
* [`0x-debug order_hash`](#0x-debug-order_hash)
* [`0x-debug order_info`](#0x-debug-order_info)

## `0x-debug abi_decode [ABIENCODEDDATA]`

Decodes ABI data for known ABI

```
USAGE
  $ 0x-debug abi_decode [ABIENCODEDDATA]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id
  --json                       Output as JSON
  --tx

EXAMPLE
  $ 0x-debug abidecode [abi encoded data]
```

_See code: [src/commands/abi_decode.ts](https://github.com/dekz/0x-debug/blob/v0.0.2/src/commands/abi_decode.ts)_

## `0x-debug call [ADDRESS] [CALLDATA]`

Call the Ethereum transaction

```
USAGE
  $ 0x-debug call [ADDRESS] [CALLDATA]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id
  --blockNumber=blockNumber    block number
  --from=from                  from account
  --gas=gas                    gas amount
  --json                       Output as JSON
  --value=value                [default: 1] Ether value to send

EXAMPLE
  $ 0x-debug call [address] [callData]
```

_See code: [src/commands/call.ts](https://github.com/dekz/0x-debug/blob/v0.0.2/src/commands/call.ts)_

## `0x-debug explain [TX]`

Explain the Ethereum transaction

```
USAGE
  $ 0x-debug explain [TX]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id
  --json                       Output as JSON

EXAMPLE
  $ 0x-debug explain [tx]
```

_See code: [src/commands/explain.ts](https://github.com/dekz/0x-debug/blob/v0.0.2/src/commands/explain.ts)_

## `0x-debug help [COMMAND]`

display help for 0x-debug

```
USAGE
  $ 0x-debug help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_

## `0x-debug order_hash`

Hashes the provided order

```
USAGE
  $ 0x-debug order_hash

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id
  -o, --order=order            (required) The order in JSON format
  --json                       Output as JSON
  --validate                   Validate the signature of the order

EXAMPLE
  $ 0x-debug orderhash --order [JSON_ORDER]
```

_See code: [src/commands/order_hash.ts](https://github.com/dekz/0x-debug/blob/v0.0.2/src/commands/order_hash.ts)_

## `0x-debug order_info`

Order Info for the provided order

```
USAGE
  $ 0x-debug order_info

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id
  -o, --order=order            (required) The order in JSON format
  --balances                   Fetch the balances and allowances for the maker address
  --blockNumber=blockNumber    The block number to fetch at
  --json                       Output as JSON

EXAMPLE
  $ 0x-debug order-info --order-hash [ORDER_HASH]
```

_See code: [src/commands/order_info.ts](https://github.com/dekz/0x-debug/blob/v0.0.2/src/commands/order_info.ts)_
<!-- commandsstop -->
