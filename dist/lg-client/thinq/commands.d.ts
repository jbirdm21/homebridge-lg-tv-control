import { ThinQAuth } from './auth';
/**
 * Commands to control LG TVs using the ThinQ API
 */
export declare class ThinQCommands {
    private readonly auth;
    private readonly deviceId;
    private readonly log;
    constructor(auth: ThinQAuth, deviceId: string);
    /**
     * Get device info
     */
    getDeviceInfo(): Promise<any>;
    /**
     * Get the current device status
     */
    getDeviceStatus(): Promise<any>;
    /**
     * Send a command to the device
     */
    private sendCommand;
    /**
     * Power Controls
     */
    powerOn(): Promise<boolean>;
    powerOff(): Promise<boolean>;
    /**
     * Volume Controls
     */
    setVolume(volume: number): Promise<boolean>;
    setMute(mute: boolean): Promise<boolean>;
    /**
     * Input Controls
     */
    setInput(inputId: string): Promise<boolean>;
    /**
     * Media Controls
     */
    play(): Promise<boolean>;
    pause(): Promise<boolean>;
    stop(): Promise<boolean>;
    rewind(): Promise<boolean>;
    fastForward(): Promise<boolean>;
    /**
     * Picture Controls
     */
    setPictureMode(mode: string): Promise<boolean>;
    /**
     * App Controls
     */
    launchApp(appId: string): Promise<boolean>;
    /**
     * Channel Controls
     */
    setChannel(channelId: string): Promise<boolean>;
    /**
     * Advanced Controls
     */
    sendRemoteButton(button: string): Promise<boolean>;
    /**
     * ThinQ-specific Features
     */
    getEnergyData(): Promise<any>;
    setEnergySaving(level: string): Promise<boolean>;
    enableAIRecommendation(enabled: boolean): Promise<boolean>;
    getAudioSettings(): Promise<any>;
    setSoundMode(mode: string): Promise<boolean>;
    getNetworkInfo(): Promise<any>;
    /**
     * Advanced ThinQ-specific APIs
     */
    getThinQDevices(): Promise<any[]>;
    sendCustomCommand(commandName: string, params?: Record<string, any>): Promise<any>;
    /**
     * Turn on the TV via ThinQ Cloud API
     */
    turnOn(): Promise<boolean>;
    /**
     * Get TV status
     */
    getStatus(): Promise<any | null>;
    /**
     * Get dashboard data
     */
    getDashboard(): Promise<any>;
}
//# sourceMappingURL=commands.d.ts.map