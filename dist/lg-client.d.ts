import { Logger } from 'homebridge';
/**
 * LG Client for controlling LG TVs
 * Combines WebOS and ThinQ APIs
 */
export declare class LGClient {
    private readonly ipAddress;
    private readonly macAddress;
    private readonly clientKey?;
    private readonly thinqUsername?;
    private readonly thinqPassword?;
    private readonly thinqCountry;
    private readonly thinqLanguage;
    private readonly token?;
    private readonly log;
    private webosClient;
    private webosCommands;
    private thinqAuth?;
    private thinqCommands?;
    private connected;
    private deviceId;
    /**
     * Create a new LG Client
     */
    constructor(log: Logger, ipAddress: string, macAddress: string, clientKey?: string | undefined, thinqUsername?: string | undefined, thinqPassword?: string | undefined, thinqCountry?: string, thinqLanguage?: string, token?: string | undefined);
    /**
     * Connect to the TV
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the TV
     */
    disconnect(): void;
    /**
     * Get current connection state
     */
    isConnected(): boolean;
    /**
     * Power on the TV
     */
    powerOn(): Promise<boolean>;
    /**
     * Power off the TV
     */
    powerOff(): Promise<boolean>;
    /**
     * Get TV volume
     */
    getVolume(): Promise<number | null>;
    /**
     * Set volume
     */
    setVolume(volume: number): Promise<boolean>;
    /**
     * Volume up
     */
    volumeUp(): Promise<boolean>;
    /**
     * Volume down
     */
    volumeDown(): Promise<boolean>;
    /**
     * Set mute
     */
    setMute(mute: boolean): Promise<boolean>;
    /**
     * Get mute state
     */
    getMute(): Promise<boolean>;
    /**
     * Set input source
     */
    setInput(inputId: string): Promise<boolean>;
    /**
     * Get current input source
     */
    getCurrentInput(): Promise<string | null>;
    /**
     * Play media
     */
    play(): Promise<boolean>;
    /**
     * Pause media
     */
    pause(): Promise<boolean>;
    /**
     * Stop media
     */
    stop(): Promise<boolean>;
    /**
     * Rewind media
     */
    rewind(): Promise<boolean>;
    /**
     * Fast forward media
     */
    fastForward(): Promise<boolean>;
    /**
     * Launch app
     */
    launchApp(appId: string): Promise<boolean>;
    /**
     * Send a remote control button press
     */
    sendRemoteButton(button: string): Promise<boolean>;
    /**
     * Set channel by number
     */
    setChannel(channelId: string): Promise<boolean>;
    /**
     * Set energy saving mode
     */
    setEnergySaving(enabled: boolean): Promise<boolean>;
    /**
     * Get energy saving status
     */
    getEnergySaving(): Promise<boolean>;
    /**
     * Enable or disable AI recommendations
     */
    enableAIRecommendation(enabled: boolean): Promise<boolean>;
    /**
     * Get AI recommendation status
     */
    getAIRecommendation(): Promise<boolean>;
    /**
     * Set picture mode
     */
    setPictureMode(mode: string): Promise<boolean>;
    /**
     * Get current picture mode
     */
    getPictureMode(): Promise<string | null>;
}
//# sourceMappingURL=lg-client.d.ts.map