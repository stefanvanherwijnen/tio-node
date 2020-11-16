/// <reference types="node" />
import * as net from 'net';
import { TIOProtocol } from './TIOProtocol';
import { EventEmitter } from 'events';
import { TIODevice } from './TIODevice';
export declare class TIOSession {
    host: string;
    port: number;
    socket: net.Socket;
    protocol: TIOProtocol;
    devices: Record<string, TIODevice>;
    streamingDevices: Array<string>;
    packetEmitter: EventEmitter;
    constructor({ host, port, streamingDevices }?: {
        host?: string;
        port?: number;
        streamingDevices?: Array<string>;
    });
    connect(): Promise<unknown>;
    end(): Promise<unknown>;
    setup(): Promise<void>;
    start(): Promise<void[]>;
    rpc(topic: string, rpcPayload?: any, payloadType?: 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32', routing?: Array<number>): Promise<string>;
    checkIfSynchronized(sampleNumber: number): boolean;
    getSynchronizedSamples(sampleNumber: number): Record<string, any> | undefined;
    getDevice(route: number): TIODevice;
    on(event: string, fn: (data: any) => void): void;
}
