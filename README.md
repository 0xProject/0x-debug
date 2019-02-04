# 0x-debug

[![Version](https://img.shields.io/npm/v/0x-debug.svg)](https://npmjs.org/package/0x-debug)
[![Downloads/week](https://img.shields.io/npm/dw/0x-debug.svg)](https://npmjs.org/package/0x-debug)
[![License](https://img.shields.io/npm/l/0x-debug.svg)](https://github.com/dekz/0x-debug/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
  <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g 0x-debug
$ 0x-debug COMMAND
running command...
$ 0x-debug (-v|--version|version)
0x-debug/0.0.1 darwin-x64 node-v10.12.0
$ 0x-debug --help [COMMAND]
USAGE
  $ 0x-debug COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`0x-debug explain [TX]`](#0-x-debug-explain-tx)
- [`0x-debug help [COMMAND]`](#0-x-debug-help-command)
- [`0x-debug order_hash`](#0-x-debug-order-hash)

## `0x-debug explain [TX]`

Explain the Ethereum transaction

```
USAGE
  $ 0x-debug explain [TX]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  (required) [default: 1] Ethereum network id

EXAMPLE
  $ 0x-debug explain <tx>
```

_See code: [src/commands/explain.ts](https://github.com/dekz/0x-debug/blob/v0.0.1/src/commands/explain.ts)_

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
  --validate                   Validate the signature of the order

EXAMPLE
  $ 0x-debug orderhash --order <JSON_ORDER>
```

_See code: [src/commands/order_hash.ts](https://github.com/dekz/0x-debug/blob/v0.0.1/src/commands/order_hash.ts)_

<!-- commandsstop -->
