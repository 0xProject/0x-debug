import { AbiDecoder, DecodedCalldata, Web3Wrapper } from "@0x/web3-wrapper";
import { Command, flags } from "@oclif/command";
import { DEFAULT_READALE_FLAGS, DEFAULT_RENDER_FLAGS } from "../global_flags";
import { utils } from "../utils";
import inquirer = require("inquirer");
import Web3ProviderEngine = require("web3-provider-engine");
import _ = require("lodash");
import { BigNumber } from "@0x/utils";
var colors = require("colors/safe");
import * as nodeUtil from "util";
import { LogWithDecodedArgs } from "../../../workspace-remote/workspace/tools/ethereum-types/lib";
import { RevertError } from "@0x/protocol-utils";
import * as fs from "fs";
import * as path from "path";

colors.setTheme({
    address: "yellow",
    fn: "green",
    gas: "grey",
    eth: "grey",
    warn: "yellow",
    debug: "blue",
    error: "red",
});

interface State {
    provider: Web3ProviderEngine;
    web3: Web3Wrapper;
    networkId: number;
    tx: string;
}

interface GethCustomEventTrace {
    topics: string[]; // hex, no padding, no prefix
    input: string; // hex, prefix, padded
    gas: string; // hex encoded value
    gasUsed: string; // hex encoded value
}

interface GethCustomCallTrace {
    type: string;
    from: string;
    to: string;
    gas: string; // hex encoded value
    gasUsed: string; // hex encoded value
    input: string;
    output: string;
    calls: GethCustomCallTrace[];
    events: GethCustomEventTrace[];
    reverted: boolean;
}

interface AnnotatedGethCustomEventTrace
    extends Omit<GethCustomEventTrace, "gas" | "gasUsed"> {
    name?: string;
    args?: any;
    gas: number;
    gasUsed: number;
}

interface AnnotatedGethCustomCallTrace
    extends Omit<GethCustomCallTrace, "gas" | "gasUsed" | "calls" | "events"> {
    signature: string;
    decodedInput?: DecodedCalldata;
    decodedOutput?: any;
    gas: number;
    gasUsed: number;
    calls: AnnotatedGethCustomCallTrace[];
    events: AnnotatedGethCustomEventTrace[];
}

const isString = (x: any): x is string => {
    return Object.prototype.toString.call(x) === "[object String]";
};
const TRACER = fs
    .readFileSync(path.join(__dirname, "../", "call_tracer.js"))
    .toString();

export class Trace extends Command {
    public static description = "Trace the Ethereum transaction";

    public static examples = [`$ 0x-debug trace [tx]`];

    public static flags = {
        ...DEFAULT_RENDER_FLAGS,
        ...DEFAULT_READALE_FLAGS,
        compact: flags.boolean({
            default: true,
            name: "compact",
            description: "Compact output",
            char: "c",
            required: false,
        }),
    };

    public static args = [{ name: "tx" }];

    private static _annotateGethTrace(
        customTrace: GethCustomCallTrace,
        abiDecoder: AbiDecoder
    ): AnnotatedGethCustomCallTrace {
        const annotateTrace = (
            gethTrace: GethCustomCallTrace
        ): AnnotatedGethCustomCallTrace => {
            const aTrace: AnnotatedGethCustomCallTrace = {
                ...gethTrace,
                gas: parseInt(gethTrace.gas, 16),
                gasUsed: parseInt(gethTrace.gasUsed, 16),
                calls: [],
                events: [],
                signature: gethTrace.input.slice(0, 10),
            };

            // input => decodedInput
            try {
                aTrace.decodedInput = abiDecoder.decodeCalldataOrThrow(
                    aTrace.input
                );
            } catch (e) {}

            // output => decodedOutput
            try {
                if (aTrace.reverted) {
                    const decodedRevertError = RevertError.decode(
                        aTrace.output
                    );
                    aTrace.decodedOutput = {
                        error: decodedRevertError.name,
                        args: decodedRevertError.values,
                    };
                } else {
                    const encoders: any = (abiDecoder as any)
                        ._selectorToFunctionInfo[aTrace.input.slice(0, 10)];

                    if (encoders && encoders.length > 0) {
                        aTrace.decodedOutput = encoders[0].abiEncoder.decodeReturnValues(
                            aTrace.output
                        );
                    }
                }
            } catch (e) {}
            // Calls
            aTrace.calls = (gethTrace.calls || []).map((c) => annotateTrace(c));
            // Event
            aTrace.events = (gethTrace.events || []).map((event) => {
                const gas = parseInt(event.gas, 16);
                const gasUsed = parseInt(event.gasUsed, 16);
                try {
                    const decoded = abiDecoder.tryToDecodeLogOrNoop({
                        address: "0x",
                        logIndex: 0,
                        transactionIndex: 0,
                        transactionHash: "0x",
                        blockHash: "0x",
                        blockNumber: 1,
                        // Call Tracer doesn't return these as 32 bytes
                        // We pad which could be a bad idea
                        topics: event.topics.map(
                            (t) => `0x${_.padStart(t, 64, "0")}`
                        ),
                        data: event.input,
                    });
                    return {
                        ...event,
                        name:
                            (decoded as LogWithDecodedArgs<any>).event ||
                            event.topics[0],
                        args: (decoded as LogWithDecodedArgs<any>).args,
                        gas,
                        gasUsed,
                    };
                } catch (err) {
                    console.log(err);
                    return { ...event, gas, gasUsed };
                }
            });

            return aTrace;
        };

        const annotatedTrace = annotateTrace(customTrace);
        return annotatedTrace;
    }

    private async execute(
        state: State,
        opts: { compact: boolean }
    ): Promise<void> {
        const { tx, web3 } = state;
        let trace: GethCustomCallTrace;
        const traceOpts = {
            disableStorage: true,
            disableMemory: false,
            tracer: TRACER,
        };
        if (tx.startsWith("0x")) {
            // https://geth.ethereum.org/docs/rpc/ns-debug#debug_tracetransaction
            trace = await web3.sendRawPayloadAsync({
                method: "debug_traceTransaction",
                params: [tx, traceOpts],
            });
        } else if (tx.startsWith("http")) {
            const response = await (await fetch(tx)).json();
            const txDetail = {
                from: response.from,
                to: response.to,
                data: response.data,
                value: response.value,
            };
            // https://geth.ethereum.org/docs/rpc/ns-debug#debug_tracecall
            trace = await web3.sendRawPayloadAsync({
                method: "debug_traceCall",
                params: [
                    {
                        ...txDetail,
                        value: `0x${new BigNumber(txDetail.value).toString(
                            16
                        )}`,
                        gas: `0x${new BigNumber(response.gas).toString(16)}`,
                    },
                    "latest",
                    traceOpts,
                ],
            });
        } else {
            throw new Error(`Invalid tx: ${tx}`);
        }

        const annotatedTrace = Trace._annotateGethTrace(trace, web3.abiDecoder);

        const semanticAddressNames = {
            ...utils.loadContractAddressNames(),
            "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "ExchangeProxy",
            "0x22f9dcf4647084d6c31b2765f6910cd85c178c18": "FlashWallet",
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
            [annotatedTrace.from]: "Sender",
            [annotatedTrace.to]: "To",
        } as { [address: string]: string | undefined };

        const truncate = <T>(a: T): T => {
            if (!opts.compact) {
                return a;
            }
            if (isString(a)) {
                if (a.length === 42) {
                    return `${a.slice(0, 8)}...${a.slice(-6)}` as any;
                } else {
                    return `${a.slice(0, 10)}...${a.slice(-8)}` as any;
                }
            }
            return a;
        };
        const inspect = (a: any) =>
            nodeUtil.inspect(a, {
                depth: null,
                compact: true,
                breakLength: Infinity,
                // colors: true,
            });
        const semanticValue = (a: any): any => {
            if (a === undefined || a === null) {
                return a;
            }
            // Hex Address
            if (isString(a) && a.length === 42) {
                return semanticAddressNames[a]
                    ? semanticAddressNames[a]
                    : truncate(a);
            }

            if (isString(a) && a.startsWith("0x") && a.length > 42) {
                return truncate(a);
            }

            if (BigNumber.isBigNumber(a) || isString(a)) {
                if (
                    new BigNumber(a).isEqualTo(
                        new BigNumber(2).pow(256).minus(1)
                    )
                ) {
                    return "MAX_UINT";
                } else {
                    return a.toString();
                }
            }

            if (typeof a === "object") {
                const semanticObj = _.fromPairs(
                    Object.entries(a).map(([k, v]) => [k, semanticValue(v)])
                );
                return inspect(semanticObj);
            }
            return inspect(a);
        };

        const semanticOp = (l: AnnotatedGethCustomCallTrace): string => {
            const length = 4;
            switch (l.type) {
                case "CALL":
                    return _.padEnd("[C]", length, " ");
                case "CALLCODE":
                    return _.padEnd("[CC]", length, " ");
                case "CREATE2":
                    return _.padEnd("[C2]", length, " ");
                case "DELEGATECALL":
                    return _.padEnd("[DC]", length, " ");
                case "STATICCALL":
                    return _.padEnd("[S]", length, " ");
                default:
                    return _.padEnd("", length, " ");
            }
        };

        const pad = "  ";
        const printTrace = (
            l: AnnotatedGethCustomCallTrace,
            paddingOffset: number = 0
        ) => {
            const prefix = semanticOp(l);
            const padding = _.times(paddingOffset)
                .map(() => pad)
                .join("");
            const returnData = l.decodedOutput
                ? Object.values(l.decodedOutput)
                      .map((v) => semanticValue(v))
                      .join(", ")
                : l.output
                ? semanticValue(l.output)
                : "0x";
            const call = `${colors.yellow(semanticValue(l.to))}.${
                l.decodedInput ? l.decodedInput.functionName : l.signature
            }(${
                l.decodedInput
                    ? Object.entries(l.decodedInput.functionArguments)
                          .map(([a, b]) => `${a}=${semanticValue(b)}`)
                          .join(", ")
                    : `...`
            }) => ${l.reverted ? colors.red(returnData) : returnData}`;
            const str = [
                l.reverted ? colors.error(prefix) : prefix,
                `[${_.padStart(l.gasUsed.toString(), 6, " ")}] `,
                padding,
                call,
            ].join("");

            console.log(str);
            l.calls.forEach((c) => printTrace(c, paddingOffset + 1));
            l.events.forEach((e) => {
                console.log(
                    [
                        colors.green(_.padEnd("[E]", 4, " ")),
                        `[${_.padStart(e.gasUsed.toString(), 6, " ")}] `,
                        padding,
                        pad,
                        colors.green(e.name || semanticValue(e.topics[0])),
                        "(",
                        Object.entries(e.args || {})
                            .map(([k, v]) => `${k}=${semanticValue(v)}`)
                            .join(", "),
                        ")",
                    ].join("")
                );
            });
        };

        printTrace(annotatedTrace);
    }

    // tslint:disable-next-line:async-suffix
    public async run(): Promise<void> {
        // tslint:disable-next-line:no-shadowed-variable
        const { args, flags } = this.parse(Trace);
        const { provider, networkId, web3Wrapper } = utils.getReadableContext(
            flags
        );
        let tx = args.tx;
        if (!tx) {
            const { txHash } = await inquirer.prompt([
                { message: "Enter txHash", type: "input", name: "txHash" },
            ]);
            tx = txHash;
        }
        try {
            await this.execute(
                {
                    provider,
                    networkId,
                    tx: tx,
                    web3: web3Wrapper,
                },
                { compact: flags.compact }
            );
            utils.stopProvider(provider);
        } catch (e) {
            console.log(e);
            return this.error(e.message);
        }
    }
}
