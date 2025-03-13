import { Service, PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import { LGClient } from '../lg-client';
export declare class VolumeControlService {
    private readonly accessory;
    private readonly log;
    private readonly lgClient;
    private readonly platform;
    private service;
    private currentVolume;
    private readonly DEFAULT_MIN_STEP;
    private readonly VOLUME_POLLING_INTERVAL;
    private volumePollingInterval?;
    constructor(accessory: PlatformAccessory, log: Logger, lgClient: LGClient, platform: any);
    /**
     * Start polling for volume changes
     */
    private startVolumePolling;
    /**
     * Stop volume polling
     */
    stopVolumePolling(): void;
    /**
     * Handle requests to set the volume
     */
    setVolume(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the current volume
     */
    getVolume(): Promise<CharacteristicValue>;
    /**
     * Handle requests to set the mute state
     * Note: The Fan's "On" characteristic is the inverse of mute
     */
    setMute(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the current mute state
     * Note: The Fan's "On" characteristic is the inverse of mute
     */
    getMute(): Promise<CharacteristicValue>;
    /**
     * Get the service instance
     */
    getService(): Service;
}
//# sourceMappingURL=volume-control.d.ts.map