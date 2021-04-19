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

interface GethTrace {
    structLogs: GethTraceLine[];
}

interface GethTraceLine {
    op: string;
    depth: number;
    stack: string[];
    memory: string[];
    gas: number;
    gasCost: number;
}

interface AnnotatedTraceLine {
    op: string;
    depth: number;
    gasCost: number;
    subCalls: AnnotatedTraceLine[];
    address: string;
    callData: string;
    signature: string;
    decodedCallData?: DecodedCalldata;
    parent?: AnnotatedTraceLine;
    returnData?: string;
    decodedReturnData?: any;
    reverted?: boolean;
    events?: { event: string; args: any; gasCost: number }[];
}

interface GethCustomEventTrace {
    topics: string[]; // hex, no padding, no prefix
    input: string; // hex, prefix, padded
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
}

interface AnnotatedGethCustomEventTrace extends GethCustomEventTrace {
    name: string;
    args: any;
}

interface AnnotatedGethCustomCallTrace
    extends Omit<GethCustomCallTrace, "gas" | "gasUsed" | "calls" | "events"> {
    decodedInput?: DecodedCalldata;
    decodedOutput?: any;
    gas: number;
    gasUsed: number;
    calls: AnnotatedGethCustomCallTrace[];
    events: AnnotatedGethCustomEventTrace[];
}

const CALL_OP_CODES = ["CALL", "CALLCODE", "STATICCALL", "DELEGATECALL"];
const RETURN_OP_CODES = ["RETURN", "REVERT", "INVALID", "SELFDESTRUCT"];
const LOG_OP_CODES = ["LOG0", "LOG1", "LOG2", "LOG3", "LOG4"];

const isString = (x: any): x is string => {
    return Object.prototype.toString.call(x) === "[object String]";
};

const _parseReturnData = (
    line: GethTraceLine,
    encoder?: any
): { decodedReturnData: any; returnData: string } => {
    const offsetBytes = new BigNumber(
        line.stack[line.stack.length - 1],
        16
    ).toNumber();
    const lengthBytes = new BigNumber(
        line.stack[line.stack.length - 2],
        16
    ).toNumber();
    const data = line.memory
        .join("")
        .slice(offsetBytes * 2, offsetBytes * 2 + lengthBytes * 2);
    let decoded;
    if (encoder && encoder.length > 0) {
        decoded = encoder[0].abiEncoder.decodeReturnValues(`0x${data}`);
    }
    return { decodedReturnData: decoded, returnData: data };
};

const _parseEvent = (
    line: GethTraceLine,
    abiDecoder: AbiDecoder
): { event: string; args: any; gasCost: number } | undefined => {
    const numIndexed = parseInt(line.op.split("LOG")[1]);
    // DATA
    // indexed topics[]
    // length
    // offset
    const indexedRaw = line.stack.slice(
        line.stack.length - 2 - numIndexed,
        line.stack.length
    );
    const offsetBytes = new BigNumber(indexedRaw.pop()!, 16).toNumber();
    const lengthBytes = new BigNumber(indexedRaw.pop()!, 16).toNumber();
    const topic = indexedRaw.pop()!;
    const indexedData = [...indexedRaw];
    const logData = line.memory
        .join("")
        .slice(offsetBytes * 2, offsetBytes * 2 + lengthBytes * 2);
    const decoded = abiDecoder.tryToDecodeLogOrNoop({
        address: "0x",
        logIndex: 0,
        transactionIndex: 0,
        transactionHash: "0x",
        blockHash: "0x",
        blockNumber: 1,
        topics: [topic, ...indexedData].map((t) => `0x${t}`),
        data: `0x${logData}`,
    });
    return (decoded as LogWithDecodedArgs<any>).args
        ? { ...(decoded as LogWithDecodedArgs<any>), gasCost: line.gas }
        : undefined;
};

const _parseCall = (
    line: GethTraceLine,
    abiDecoder: AbiDecoder
): AnnotatedTraceLine => {
    const stackIdx = ["CALL", "CALLCODE"].includes(line.op) ? 4 : 3;
    const offsetBytes = new BigNumber(
        line.stack[line.stack.length - stackIdx],
        16
    ).toNumber();
    const lengthBytes = new BigNumber(
        line.stack[line.stack.length - stackIdx - 1],
        16
    ).toNumber();
    const callData = line.memory
        .join("")
        .slice(offsetBytes * 2, offsetBytes * 2 + lengthBytes * 2);
    const signature = callData.slice(0, 8);
    let address = line.stack[line.stack.length - 2];
    address = `0x${new BigNumber(address, 16).toString(16)}`;
    let decoded: DecodedCalldata | undefined;
    try {
        decoded = abiDecoder.decodeCalldataOrThrow(`0x${callData}`);
    } catch (e) {
        // Do nothing
    }
    const annotatedLine: AnnotatedTraceLine = {
        decodedCallData: decoded,
        signature,
        address,
        callData,
        gasCost: line.gas,
        subCalls: [],
        op: line.op,
        depth: line.depth,
    };
    return annotatedLine;
};

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

    private static _decodeGethTrace(
        trace: GethTrace,
        abiDecoder: AbiDecoder,
        txTo: string,
        txCallData: string
    ): AnnotatedTraceLine {
        const annotatedTrace: AnnotatedTraceLine = {
            op: "FALLBACK",
            gasCost: 0,
            subCalls: [],
            callData: txCallData,
            address: txTo,
            depth: 0,
            signature: txCallData.slice(0, 10),
        };

        try {
            const txDecoded = abiDecoder.decodeCalldataOrThrow(txCallData);
            annotatedTrace.decodedCallData = txDecoded;
        } catch (e) {}

        const parentByDepth: { [depth: number]: AnnotatedTraceLine } = {
            0: annotatedTrace,
        };
        const structLogs = trace.structLogs.filter((l) =>
            [...CALL_OP_CODES, ...RETURN_OP_CODES, ...LOG_OP_CODES].includes(
                l.op
            )
        );
        for (const [i, currentStep] of structLogs.entries()) {
            if (CALL_OP_CODES.includes(currentStep.op)) {
                const annotatedLine = _parseCall(currentStep, abiDecoder);
                // If it's a DELEGATECALL then the real address making the outgoing call is the parent
                if (currentStep.op === "DELEGATECALL") {
                    annotatedLine.address =
                        parentByDepth[annotatedLine.depth - 1].address;
                }
                if (!parentByDepth[annotatedLine.depth - 1]) {
                    console.log("missing parent at depth", annotatedLine);
                }
                parentByDepth[annotatedLine.depth] = annotatedLine;
                parentByDepth[annotatedLine.depth - 1].subCalls.push(
                    annotatedLine
                );
            }
            if (RETURN_OP_CODES.includes(currentStep.op)) {
                const parent = parentByDepth[currentStep.depth - 1];
                if (currentStep.op === "RETURN") {
                    const { decodedReturnData, returnData } = _parseReturnData(
                        currentStep,
                        (abiDecoder as any)._selectorToFunctionInfo[
                            `0x${parent.signature}`
                        ]
                    );
                    if (parent.returnData) {
                        throw new Error("Parent already has return data");
                    }
                    parent.returnData = returnData;
                    parent.decodedReturnData = decodedReturnData;
                }
                if (currentStep.op === "REVERT") {
                    parent.reverted = true;
                    const { returnData } = _parseReturnData(
                        currentStep,
                        (abiDecoder as any)._selectorToFunctionInfo[
                            `0x${parent.signature}`
                        ]
                    );
                    try {
                        const decoded = abiDecoder.decodeCalldataOrThrow(
                            `0x${returnData}`
                        );
                        parent.decodedReturnData = decoded.functionArguments;
                    } catch (e) {
                        try {
                            const decodedRevertError = RevertError.decode(
                                `0x${returnData}`
                            );
                            parent.decodedReturnData = {
                                error: decodedRevertError.name,
                                args: decodedRevertError.values,
                            };
                        } catch (e) {}
                    }
                }
            }
            if (LOG_OP_CODES.includes(currentStep.op)) {
                const parent = parentByDepth[currentStep.depth - 1];
                const decodedEvent = _parseEvent(currentStep, abiDecoder);
                if (decodedEvent) {
                    parent.events = parent.events || [];
                    parent.events.push(decodedEvent);
                }
            }
        }
        return annotatedTrace;
    }

    private async execute(
        state: State,
        opts: { compact: boolean }
    ): Promise<void> {
        const { tx, web3 } = state;
        let trace: GethTrace;
        let txDetail: { to: string; from: string; data: string; value: string };
        if (tx.startsWith("0x")) {
            // https://geth.ethereum.org/docs/rpc/ns-debug#debug_tracetransaction
            trace = await web3.sendRawPayloadAsync({
                method: "debug_traceTransaction",
                params: [tx, { disableStorage: true, disableMemory: false }],
            });
            const txDetails = await web3.getTransactionByHashAsync(tx);
            txDetail = {
                from: txDetails.from,
                to: txDetails.to!,
                data: txDetails.input,
                value: txDetails.value.toString(),
            };
        }
        if (tx.startsWith("http")) {
            const tracer = fs
                .readFileSync(path.join(__dirname, "../", "call_tracer.js"))
                .toString();
            const response = await (await fetch(tx)).json();
            txDetail = {
                from: response.from,
                to: response.to,
                data: response.data,
                value: response.value,
            };
            const payload = {
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
                    {
                        disableStorage: true,
                        disableMemory: false,
                        tracer,
                    },
                ],
            };

            let timeBefore = Date.now();
            const customTrace = await web3.sendRawPayloadAsync(payload);
            let timeAfter = Date.now();
            console.log(
                "time",
                timeAfter - timeBefore,
                "size",
                JSON.stringify(customTrace).length
            );
            timeBefore = Date.now();
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
                    { disableStorage: true, disableMemory: false },
                ],
            });
            timeAfter = Date.now();
            console.log(
                "time",
                timeAfter - timeBefore,
                "size",
                JSON.stringify(trace).length
            );
            console.log(JSON.stringify(customTrace, null, 2));
        } else {
            throw new Error(`Invalid tx: ${tx}`);
        }

        const semanticAddressNames = {
            ...utils.loadContractAddressNames(),
            "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "ExchangeProxy",
            "0x22f9dcf4647084d6c31b2765f6910cd85c178c18": "FlashWallet",
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH",
            [txDetail.from]: "Sender",
            [txDetail.to!]: "To",
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

        const semanticOp = (l: AnnotatedTraceLine): string => {
            const length = 4;
            switch (l.op) {
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

        const printLine = (l: AnnotatedTraceLine) => {
            const prefix = semanticOp(l);
            const pad = "  ";
            const padding = [...Array(l.depth)].map(() => pad).join("");
            const status = l.reverted ? colors.error(`[REVERT]`) : "";
            const returnData = l.decodedReturnData
                ? Object.values(l.decodedReturnData)
                      .map((v) => semanticValue(v))
                      .join(", ")
                : l.returnData
                ? semanticValue(l.returnData)
                : "0x";
            const call = `${colors.yellow(semanticValue(l.address))}.${
                l.decodedCallData ? l.decodedCallData.functionName : l.signature
            }(${
                l.decodedCallData
                    ? Object.entries(l.decodedCallData.functionArguments)
                          .map(([a, b]) => `${a}=${semanticValue(b)}`)
                          .join(", ")
                    : `...`
            }) => ${l.reverted ? colors.red(returnData) : returnData}`;
            const str = [
                prefix,
                `[${_.padStart(l.gasCost.toString(), 6, " ")}] `,
                padding,
                status,
                call,
            ].join("");
            console.log(str);
            l.subCalls.forEach((ll) => printLine(ll));
            l.events &&
                l.events.forEach((e) =>
                    console.log(
                        [
                            colors.green(_.padEnd("[E]", 4, " ")),
                            `[${_.padStart(e.gasCost.toString(), 6, " ")}] `,
                            padding,
                            pad,
                            colors.green(e.event),
                            "(",
                            Object.entries(e.args)
                                .map(([k, v]) => `${k}=${semanticValue(v)}`)
                                .join(", "),
                            ")",
                        ].join("")
                    )
                );
        };

        const annotated = Trace._decodeGethTrace(
            trace,
            web3.abiDecoder,
            txDetail.to,
            txDetail.data
        );
        printLine(annotated);
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
