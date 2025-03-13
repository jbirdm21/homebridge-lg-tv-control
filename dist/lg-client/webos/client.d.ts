/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logger } from 'homebridge';
export declare enum ConnectionState {
    DISCONNECTED = "DISCONNECTED",
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTING = "DISCONNECTING"
}
interface WebOSMessage {
    id?: string;
    type: string;
    uri?: string;
    payload?: any;
}
interface WebOSResponse {
    id?: string;
    type: string;
    returnValue: boolean;
    payload?: any;
    [key: string]: any;
}
/**
 * WebOS Client for communicating with LG TVs
 */
export declare class WebOSClient extends EventEmitter {
    private readonly ipAddress;
    private readonly log;
    private connectionState;
    private ws;
    private clientKey;
    private messageCallbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectInterval;
    private storageDir;
    private keyFilePath;
    private connected;
    private commandSocketUrl;
    private commandWs;
    /**
     * Create a new WebOS client
     */
    constructor(ipAddress: string, clientKey?: string, log?: Logger);
    /**
     * Load client key from storage
     */
    private loadClientKey;
    /**
     * Save client key to storage
     */
    private saveClientKey;
    /**
     * Connect to the TV
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the TV
     */
    disconnect(): Promise<void>;
    /**
     * Attempt to reconnect to the TV
     */
    private attemptReconnect;
    /**
     * Power on the TV using Wake on LAN
     */
    powerOn(macAddress: string): Promise<void>;
    /**
     * Send a message to the TV
     */
    sendMessage(message: WebOSMessage): Promise<any>;
    /**
     * Handle incoming messages from the TV
     */
    private handleMessage;
    /**
     * Send registration message to the TV
     */
    private sendRegisterMessage;
    /**
     * Send a request to the TV
     */
    request(uri: string, payload?: any): Promise<WebOSResponse>;
    /**
     * Send a button to the TV
     */
    sendButton(button: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=client.d.ts.map