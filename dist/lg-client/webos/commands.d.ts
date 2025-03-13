import { Logger } from 'homebridge';
import { WebOSClient } from './client';
/**
 * WebOS Commands for controlling LG TV
 */
export declare class WebOSCommands {
    private readonly client;
    private readonly log;
    /**
     * Create a new WebOS commands instance
     */
    constructor(client: WebOSClient, log: Logger);
    /**
     * Power off the TV
     */
    powerOff(): Promise<boolean>;
    /**
     * Get the current volume
     */
    getVolume(): Promise<number>;
    /**
     * Set the volume
     */
    setVolume(volume: number): Promise<boolean>;
    /**
     * Increase the volume
     */
    volumeUp(): Promise<boolean>;
    /**
     * Decrease the volume
     */
    volumeDown(): Promise<boolean>;
    /**
     * Set the mute state
     */
    setMute(mute: boolean): Promise<boolean>;
    /**
     * Get current mute state
     */
    getMute(): Promise<boolean>;
    /**
     * Set the input source
     */
    setInput(inputId: string): Promise<boolean>;
    /**
     * Get the list of input sources
     */
    getInputList(): Promise<any[] | null>;
    /**
     * Set the channel
     */
    setChannel(channelId: string): Promise<boolean>;
    /**
     * Get the current channel
     */
    getCurrentChannel(): Promise<any | null>;
    /**
     * Get the current app
     */
    getCurrentApp(): Promise<any | null>;
    /**
     * Launch an app
     */
    launchApp(appId: string): Promise<boolean>;
    /**
     * Close an app
     */
    closeApp(appId: string): Promise<boolean>;
    /**
     * Get the list of apps
     */
    getAppList(): Promise<any[] | null>;
    /**
     * Send a remote control button
     */
    sendButton(button: string): Promise<boolean>;
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
     * Get 3D status
     */
    get3DStatus(): Promise<any | null>;
    /**
     * Set 3D mode
     */
    set3DOn(): Promise<boolean>;
    /**
     * Set 3D off
     */
    set3DOff(): Promise<boolean>;
    /**
     * Get system info
     */
    getSystemInfo(): Promise<any | null>;
    /**
     * Get sound output
     */
    getSoundOutput(): Promise<any | null>;
    /**
     * Set sound output
     */
    setSoundOutput(output: string): Promise<boolean>;
    /**
     * Get TV inputs (HDMI, etc.)
     */
    getInputs(): Promise<any[] | null>;
    /**
     * Get launchable apps
     */
    getLaunchPoints(): Promise<any[] | null>;
    /**
     * Set picture mode
     */
    setPictureMode(mode: string): Promise<boolean>;
}
//# sourceMappingURL=commands.d.ts.map