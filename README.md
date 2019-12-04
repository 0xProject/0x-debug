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
0x-debug/1.0.0 darwin-x64 node-v11.13.0
$ 0x-debug --help [COMMAND]
USAGE
  $ 0x-debug COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`0x-debug abi_decode [ABIENCODEDDATA]`](#0x-debug-abi_decode-abiencodeddata)
* [`0x-debug config [KEY] [VALUE]`](#0x-debug-config-key-value)
* [`0x-debug explain [TX]`](#0x-debug-explain-tx)
* [`0x-debug help [COMMAND]`](#0x-debug-help-command)
* [`0x-debug mesh:orders`](#0x-debug-meshorders)
* [`0x-debug mesh:stats`](#0x-debug-meshstats)
* [`0x-debug mesh:subscribe`](#0x-debug-meshsubscribe)
* [`0x-debug misc:call [ADDRESS] [CALLDATA]`](#0x-debug-misccall-address-calldata)
* [`0x-debug misc:current_block [ADDRESS] [CALLDATA]`](#0x-debug-misccurrent_block-address-calldata)
* [`0x-debug misc:function_registry_check`](#0x-debug-miscfunction_registry_check)
* [`0x-debug order:create`](#0x-debug-ordercreate)
* [`0x-debug order:hash`](#0x-debug-orderhash)
* [`0x-debug order:info`](#0x-debug-orderinfo)
* [`0x-debug profile:create`](#0x-debug-profilecreate)
* [`0x-debug staking:epoch:end`](#0x-debug-stakingepochend)
* [`0x-debug staking:epoch:stats`](#0x-debug-stakingepochstats)
* [`0x-debug staking:pool:create`](#0x-debug-stakingpoolcreate)
* [`0x-debug staking:pool:decrease_share`](#0x-debug-stakingpooldecrease_share)
* [`0x-debug staking:pool:finalize`](#0x-debug-stakingpoolfinalize)
* [`0x-debug staking:pool:stake`](#0x-debug-stakingpoolstake)
* [`0x-debug staking:pool:stats`](#0x-debug-stakingpoolstats)
* [`0x-debug staking:pool:unstake`](#0x-debug-stakingpoolunstake)
* [`0x-debug staking:pool:withdraw_rewards`](#0x-debug-stakingpoolwithdraw_rewards)
* [`0x-debug tokens:enable`](#0x-debug-tokensenable)

## `0x-debug abi_decode [ABIENCODEDDATA]`

Decodes ABI data for known ABI

```
USAGE
  $ 0x-debug abi_decode [ABIENCODEDDATA]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL
  --tx

EXAMPLE
  $ 0x-debug abi_decode [abi encoded data]
```

_See code: [src/commands/abi_decode.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/abi_decode.ts)_

## `0x-debug config [KEY] [VALUE]`

Store and retrieve config

```
USAGE
  $ 0x-debug config [KEY] [VALUE]

OPTIONS
  -d, --delete  delete config key

EXAMPLE
  $ 0x-debug config [KEY] [VALUE]
```

_See code: [src/commands/config.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/config.ts)_

## `0x-debug explain [TX]`

Explain the Ethereum transaction

```
USAGE
  $ 0x-debug explain [TX]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug explain [tx]
```

_See code: [src/commands/explain.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/explain.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.1/src/commands/help.ts)_

## `0x-debug mesh:orders`

Retrieves the orders from a Mesh node

```
USAGE
  $ 0x-debug mesh:orders

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mesh-url=mesh-url          (required)
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug mesh:orders
```

_See code: [src/commands/mesh/orders.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/mesh/orders.ts)_

## `0x-debug mesh:stats`

Print the stats of a Mesh node

```
USAGE
  $ 0x-debug mesh:stats

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mesh-url=mesh-url          (required)
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug mesh:stats
```

_See code: [src/commands/mesh/stats.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/mesh/stats.ts)_

## `0x-debug mesh:subscribe`

Subscribe to a feed of order events

```
USAGE
  $ 0x-debug mesh:subscribe

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mesh-url=mesh-url          (required)
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug mesh:subscribe
```

_See code: [src/commands/mesh/subscribe.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/mesh/subscribe.ts)_

## `0x-debug misc:call [ADDRESS] [CALLDATA]`

Call the Ethereum transaction

```
USAGE
  $ 0x-debug misc:call [ADDRESS] [CALLDATA]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --blockNumber=blockNumber    block number
  --from=from                  from account
  --gas=gas                    gas amount
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL
  --value=value                [default: 1] Ether value to send

EXAMPLE
  $ 0x-debug misc:call [address] [callData]
```

_See code: [src/commands/misc/call.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/misc/call.ts)_

## `0x-debug misc:current_block [ADDRESS] [CALLDATA]`

Gets the current ethereum block

```
USAGE
  $ 0x-debug misc:current_block [ADDRESS] [CALLDATA]

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug misc:current_block
```

_See code: [src/commands/misc/current_block.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/misc/current_block.ts)_

## `0x-debug misc:function_registry_check`

Checks if known 0x functions are registered with Parity Registry

```
USAGE
  $ 0x-debug misc:function_registry_check

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --list
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug function_registration_check
```

_See code: [src/commands/misc/function_registry_check.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/misc/function_registry_check.ts)_

## `0x-debug order:create`

Creates a signed order

```
USAGE
  $ 0x-debug order:create

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug order:create
```

_See code: [src/commands/order/create.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/order/create.ts)_

## `0x-debug order:hash`

Hashes the provided order

```
USAGE
  $ 0x-debug order:hash

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -o, --order=order            (required) The order in JSON format
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL
  --validate                   Validate the signature of the order

EXAMPLE
  $ 0x-debug order:hash --order [JSON_ORDER]
```

_See code: [src/commands/order/hash.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/order/hash.ts)_

## `0x-debug order:info`

Order Info for the provided order

```
USAGE
  $ 0x-debug order:info

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -o, --order=order            (required) The order in JSON format
  -p, --profile=profile        The config profile to use
  --balances                   Fetch the balances and allowances for the maker address
  --blockNumber=blockNumber    The block number to fetch at
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug order:info --order-hash [ORDER_HASH]
```

_See code: [src/commands/order/info.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/order/info.ts)_

## `0x-debug profile:create`

Creates a profile

```
USAGE
  $ 0x-debug profile:create

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug profile:create
```

_See code: [src/commands/profile/create.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/profile/create.ts)_

## `0x-debug staking:epoch:end`

Ends the current epoch

```
USAGE
  $ 0x-debug staking:epoch:end

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:epoch:end
```

_See code: [src/commands/staking/epoch/end.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/epoch/end.ts)_

## `0x-debug staking:epoch:stats`

Details for the current Staking Epoch

```
USAGE
  $ 0x-debug staking:epoch:stats

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:epoch:stats
```

_See code: [src/commands/staking/epoch/stats.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/epoch/stats.ts)_

## `0x-debug staking:pool:create`

Creates a Staking Pool

```
USAGE
  $ 0x-debug staking:pool:create

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:create
```

_See code: [src/commands/staking/pool/create.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/create.ts)_

## `0x-debug staking:pool:decrease_share`

Decreases the Operator Share in the Staking pool

```
USAGE
  $ 0x-debug staking:pool:decrease_share

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --pool-id=pool-id            (required)
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:decrease_share
```

_See code: [src/commands/staking/pool/decrease_share.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/decrease_share.ts)_

## `0x-debug staking:pool:finalize`

Finalizes the Staking pool

```
USAGE
  $ 0x-debug staking:pool:finalize

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --pool-id=pool-id            (required)
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:finalize
```

_See code: [src/commands/staking/pool/finalize.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/finalize.ts)_

## `0x-debug staking:pool:stake`

Stakes a Staking Pool

```
USAGE
  $ 0x-debug staking:pool:stake

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --pool-id=pool-id            (required)
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:stake
```

_See code: [src/commands/staking/pool/stake.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/stake.ts)_

## `0x-debug staking:pool:stats`

Details for the current Staking Epoch

```
USAGE
  $ 0x-debug staking:pool:stats

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --pool-id=pool-id            (required)
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:stats
```

_See code: [src/commands/staking/pool/stats.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/stats.ts)_

## `0x-debug staking:pool:unstake`

Unstakes a Staking Pool

```
USAGE
  $ 0x-debug staking:pool:unstake

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --pool-id=pool-id            (required)
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:unstake
```

_See code: [src/commands/staking/pool/unstake.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/unstake.ts)_

## `0x-debug staking:pool:withdraw_rewards`

Withdraws Delegator Rewards from a Poo

```
USAGE
  $ 0x-debug staking:pool:withdraw_rewards

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --pool-id=pool-id            (required)
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL

EXAMPLE
  $ 0x-debug staking:pool:withdraw_rewards
```

_See code: [src/commands/staking/pool/withdraw_rewards.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/staking/pool/withdraw_rewards.ts)_

## `0x-debug tokens:enable`

Enables a token for trading

```
USAGE
  $ 0x-debug tokens:enable

OPTIONS
  -h, --help                   show CLI help
  -n, --network-id=network-id  Ethereum network id
  -p, --profile=profile        The config profile to use
  --json                       Output as JSON
  --mnemonic=mnemonic          Mnemonic
  --private-key=private-key    Private Key
  --rpc-url=rpc-url            Ethereum Node RPC URL
  --token=token                (required)

EXAMPLE
  $ 0x-debug tokens:enable
```

_See code: [src/commands/tokens/enable.ts](https://github.com/dekz/0x-debug/blob/v1.0.0/src/commands/tokens/enable.ts)_
<!-- commandsstop -->
