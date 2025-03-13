import { ThinQAuth } from './auth';
/**
 * Device profile types based on LG ThinQ documentation
 */
export declare enum DeviceType {
    TV = "DEVICE_TV",
    AIR_CONDITIONER = "DEVICE_AIR_CONDITIONER",
    REFRIGERATOR = "DEVICE_REFRIGERATOR",
    WASHER = "DEVICE_WASHER",
    DRYER = "DEVICE_DRYER",
    AIR_PURIFIER = "DEVICE_AIR_PURIFIER",
    ROBOT_CLEANER = "DEVICE_ROBOT_CLEANER",
    OVEN = "DEVICE_OVEN",
    DISH_WASHER = "DEVICE_DISH_WASHER",
    STYLER = "DEVICE_STYLER",
    WATER_PURIFIER = "DEVICE_WATER_PURIFIER",
    DEHUMIDIFIER = "DEVICE_DEHUMIDIFIER",
    CEILING_FAN = "DEVICE_CEILING_FAN",
    UNKNOWN = "UNKNOWN"
}
/**
 * Commands to control LG TVs using the ThinQ API
 */
export declare class ThinQCommands {
    private readonly auth;
    private readonly deviceId;
    private readonly log;
    private deviceProfile;
    private deviceType;
    private lastStatus;
    private statusTimestamp;
    private readonly statusCacheTime;
    constructor(auth: ThinQAuth, deviceId: string);
    /**
     * Initialize by fetching device profile
     */
    initialize(): Promise<boolean>;
    /**
     * Get device info
     */
    getDeviceInfo(): Promise<any>;
    /**
     * Get the current device status with caching
     */
    getDeviceStatus(forceRefresh?: boolean): Promise<any>;
    /**
     * Send a command to the device
     */
    private sendCommand;
    /**
     * Check if device supports a specific capability
     */
    supportsCapability(capability: string): boolean;
    /**
     * Authenticate with ThinQ API
     */
    authenticate(): Promise<boolean>;
    /**
     * Power Controls
     */
    powerOn(): Promise<boolean>;
    powerOff(): Promise<boolean>;
    /**
     * Get current power state
     */
    getPowerState(): Promise<boolean>;
    /**
     * Get TV status
     */
    getStatus(): Promise<any | null>;
    /**
     * Extract power state from device status
     */
    private extractPowerState;
    /**
     * Extract volume from device status
     */
    private extractVolume;
    /**
     * Extract mute state from device status
     */
    private extractMuteState;
    /**
     * Extract input source from device status
     */
    private extractInputSource;
    /**
     * Extract channel info from device status
     */
    private extractChannelInfo;
    /**
     * Extract picture mode from device status
     */
    private extractPictureMode;
    /**
     * Extract energy saving from device status
     */
    private extractEnergySaving;
    /**
     * Extract AI recommendation from device status
     */
    private extractAIRecommendation;
    /**
     * Get dashboard data
     */
    getDashboard(): Promise<any>;
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
}
//# sourceMappingURL=commands.d.ts.map