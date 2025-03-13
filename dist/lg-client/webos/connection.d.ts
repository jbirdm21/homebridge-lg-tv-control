/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logger } from 'homebridge';
interface WebOSClientOptions {
    connectionTimeout?: number;
    reconnectInterval?: number;
}
interface WebOSResponse {
    id: string;
    type: string;
    payload?: any;
    returnValue?: boolean;
    [key: string]: any;
}
/**
 * WebOS client for communicating with LG TVs
 */
export declare class WebOSClient extends EventEmitter {
    private readonly ipAddress;
    private readonly log;
    private readonly config;
    private readonly options;
    private ws;
    private clientKey;
    private keyFile;
    private connected;
    private connecting;
    private commandId;
    private reconnectTimeout;
    private pingInterval;
    private responseCallbacks;
    private requestIdCounter;
    private pendingRequests;
    private connectionTimeout;
    private reconnectInterval;
    private connectionAttempts;
    private readonly maxReconnectAttempts;
    constructor(ipAddress: string, log: Logger, config: any, options?: WebOSClientOptions, storagePath?: string);
    private loadClientKey;
    private saveClientKey;
    connect(): Promise<boolean>;
    private register;
    private handleMessage;
    private formatState;
    private handleDisconnect;
    private scheduleReconnect;
    private setupPingInterval;
    sendCommand(uri: string, payload?: any, ignoreClientKey?: boolean): Promise<any>;
    disconnect(): void;
    /**
     * Send handshake message to start the connection
     */
    private sendHandshake;
    /**
     * Send a message to the TV
     */
    private sendMessage;
    /**
     * Get the next unique request ID
     */
    private getNextRequestId;
    /**
     * Send a request to the TV and wait for a response
     */
    request(uri: string, payload?: any): Promise<WebOSResponse>;
}
export {};
//# sourceMappingURL=connection.d.ts.map