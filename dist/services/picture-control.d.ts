import { Service, PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import { LGClient } from '../lg-client';
/**
 * Picture Mode Control Service
 * Uses Lightbulb service to control picture settings like brightness
 */
export declare class PictureControlService {
    private readonly accessory;
    private readonly log;
    private readonly lgClient;
    private readonly platform;
    private brightnessService;
    private currentBrightness;
    private pictureMode;
    private readonly POLLING_INTERVAL;
    private pollingInterval?;
    private readonly PICTURE_MODES;
    constructor(accessory: PlatformAccessory, log: Logger, lgClient: LGClient, platform: any);
    /**
     * Start polling for picture setting changes
     */
    private startPolling;
    /**
     * Stop polling
     */
    stopPolling(): void;
    /**
     * Handle requests to set the brightness
     */
    setBrightness(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the current brightness
     */
    getBrightness(): Promise<CharacteristicValue>;
    /**
     * Handle requests to set the on/off state
     * When turned off, we'll switch to eco mode
     * When turned on, we'll restore previous brightness
     */
    setOnState(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the on/off state
     * We'll consider it "on" if the TV is not in eco mode
     */
    getOnState(): Promise<CharacteristicValue>;
    /**
     * Get the service instance
     */
    getService(): Service;
}
//# sourceMappingURL=picture-control.d.ts.map