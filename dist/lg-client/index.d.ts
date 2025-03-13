/// <reference types="node" />
import { Logger } from 'homebridge';
import { EventEmitter } from 'events';
import { WebOSCommands } from './webos/commands';
import { ThinQAuth } from './thinq/auth';
interface LGClientOptions {
    controlPriority?: 'Local First' | 'Cloud First' | 'Local Only' | 'Cloud Only';
    manualIP?: string;
    macAddress?: string;
    connectionTimeout?: number;
    reconnectInterval?: number;
    cloudPollingInterval?: number;
}
interface DiscoveredTV {
    name: string;
    ip: string;
    modelName?: string;
}
/**
 * Integrated client for communicating with LG TVs via both WebOS and ThinQ API
 */
export declare class LGClient extends EventEmitter {
    private readonly log;
    private readonly ipAddress;
    private readonly deviceId;
    private readonly thinqAuth;
    private readonly options;
    private webosClient;
    webosCommands: WebOSCommands;
    private thinqCommands;
    private connected;
    private currentState;
    private pollingInterval;
    constructor(log: Logger, ipAddress: string, deviceId: string | null, thinqAuth: ThinQAuth | null, options?: LGClientOptions);
    /**
     * TV Discovery
     */
    static discoverTVs(): Promise<DiscoveredTV[]>;
    /**
     * Connection Management
     */
    connect(): Promise<boolean>;
    disconnect(): void;
    private setupPolling;
    /**
     * Power Control
     */
    powerOn(): Promise<boolean>;
    powerOff(): Promise<boolean>;
    /**
     * Volume Control
     */
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<boolean>;
    volumeUp(): Promise<boolean>;
    volumeDown(): Promise<boolean>;
    setMute(mute: boolean): Promise<boolean>;
    /**
     * Input Control
     */
    getInputs(): Promise<any[]>;
    setInput(inputId: string): Promise<boolean>;
    /**
     * App Control
     */
    getLaunchPoints(): Promise<any[]>;
    launchApp(appId: string): Promise<boolean>;
    /**
     * Media Control
     */
    play(): Promise<boolean>;
    pause(): Promise<boolean>;
    /**
     * Picture Control
     */
    setPictureMode(mode: string): Promise<boolean>;
    /**
     * ThinQ-specific Features
     */
    getEnergyData(): Promise<any>;
    setEnergySaving(level: string): Promise<boolean>;
    enableAIRecommendation(enable: boolean): Promise<boolean>;
}
export {};
//# sourceMappingURL=index.d.ts.map