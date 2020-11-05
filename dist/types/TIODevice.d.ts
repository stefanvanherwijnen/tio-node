import { Stream, Source, Timebase } from './types';
import { TIOSession } from './TIOSession';
export declare class TIODevice {
    session: TIOSession;
    routing?: Array<number>;
    name: string;
    description: string;
    timebases: Record<string, Timebase>;
    sources: Record<string, Source>;
    streams: Record<string, Stream>;
    columns: Array<string>;
    publishedData: Record<string, []>;
    queue: Record<string, any>;
    connected: boolean;
    started: boolean;
    constructor({ session, routing }: {
        session: TIOSession;
        routing?: Array<number>;
    });
    connect(): Promise<{
        name: string;
        description: string;
    }>;
    start(): void;
    ready(): boolean;
    samplingPeriod(): number | undefined;
    generateColumns(): void;
    heartbeat(): void;
    mappedData(): Record<string, any> | undefined;
}
