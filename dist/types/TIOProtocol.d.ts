/// <reference types="node" />
import { Parser } from 'binary-parser-encoder';
export declare const TL_PTYPE_NONE = 0;
export declare const TL_PTYPE_INVALID = 0;
export declare const TL_PTYPE_LOG = 1;
export declare const TL_PTYPE_RPC_REQ = 2;
export declare const TL_PTYPE_RPC_REP = 3;
export declare const TL_PTYPE_RPC_ERROR = 4;
export declare const TL_PTYPE_HEARTBEAT = 5;
export declare const TL_PTYPE_TIMEBASE = 6;
export declare const TL_PTYPE_SOURCE = 7;
export declare const TL_PTYPE_STREAM = 8;
export declare const TL_PTYPE_USER = 64;
export declare const TL_PTYPE_STREAM0 = 128;
export declare const TL_PTYPE_OTHER_ROUTING = -1;
export declare const dataTypes: {
    16: string;
    17: string;
    32: string;
    33: string;
    48: string;
    49: string;
    64: string;
    65: string;
    128: string;
    129: string;
    66: string;
    130: string;
    3: string;
    0: string;
};
export declare const headerParser: Parser;
export declare const routingParser: Parser;
export declare const rpcPayloadParser: (rpcPayload?: boolean) => Parser;
export declare const payloadParser: (type: number, payloadLength: number, payload: Buffer) => any;
export declare const generateHeartbeat: (routing?: number[] | undefined) => Buffer;
export declare const defaultPacketParser: (payloadLength: number) => Parser;
export declare const sourcePacketParser: Parser;
export declare const streamPacketParser: Parser;
export declare const timebasePacketParser: Parser;
export declare const publishedDataParser: Parser;
export declare const generateRequest: (requestId: number, methodId: number, topic: string, rpcPayload: any, routing: Array<number>) => Buffer;
export declare class TIOProtocol {
    routing: Array<number>;
    constructor();
    parsePacket(rawPacket: Buffer): {
        header: any;
        payload: any;
        routing: any;
    };
    createRequest(topic: string, rpcPayload?: any, payloadType?: 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32', routing?: Array<number>): {
        request: Buffer;
        requestId: number;
    };
}
