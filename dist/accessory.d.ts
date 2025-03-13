import { PlatformAccessory, Service, CharacteristicValue } from 'homebridge';
import { LGTVPlatform } from './platform';
/**
 * LG TV Accessory
 */
export declare class LGTVAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly log;
    private readonly name;
    private readonly lgClient;
    private readonly tvService;
    private readonly speakerService;
    private readonly volumeSliderService?;
    private readonly turnOffSwitchService?;
    private readonly energySavingService?;
    private readonly aiRecommendationService?;
    private inputServices;
    private tvActive;
    private tvMuted;
    private tvVolume;
    private currentInputId;
    private energySavingEnabled;
    private aiRecommendationEnabled;
    constructor(platform: LGTVPlatform, accessory: PlatformAccessory);
    /**
     * Set up input sources from config
     */
    private setupInputSources;
    /**
     * Map input type string to HomeKit InputSourceType
     */
    private getInputSourceType;
    /**
     * Connect to the TV and update state
     */
    private connectToTV;
    /**
     * Update TV state (volume, input, etc.)
     */
    private updateTVState;
    /**
     * Get input identifier from input ID
     */
    private getInputIdentifier;
    /**
     * Get input ID from identifier
     */
    private getInputId;
    /**
     * Set TV active state
     */
    setActive(value: CharacteristicValue): Promise<void>;
    /**
     * Get TV active state
     */
    getActive(): Promise<CharacteristicValue>;
    /**
     * Set active input
     */
    setActiveIdentifier(value: CharacteristicValue): Promise<void>;
    /**
     * Get active input
     */
    getActiveIdentifier(): Promise<CharacteristicValue>;
    /**
     * Handle remote key press
     */
    remoteKeyPress(value: CharacteristicValue): Promise<void>;
    /**
     * Set speaker mute
     */
    setMute(value: CharacteristicValue): Promise<void>;
    /**
     * Get speaker mute
     */
    getMute(): Promise<CharacteristicValue>;
    /**
     * Set speaker volume
     */
    setVolume(value: CharacteristicValue): Promise<void>;
    /**
     * Get speaker volume
     */
    getVolume(): Promise<CharacteristicValue>;
    /**
     * Set turn off switch
     */
    setTurnOffSwitch(value: CharacteristicValue): Promise<void>;
    /**
     * Get turn off switch state (always returns false)
     */
    getTurnOffSwitch(): Promise<CharacteristicValue>;
    /**
     * Set energy saving
     */
    setEnergySaving(value: CharacteristicValue): Promise<void>;
    /**
     * Get energy saving state
     */
    getEnergySaving(): Promise<CharacteristicValue>;
    /**
     * Set AI recommendation
     */
    setAIRecommendation(value: CharacteristicValue): Promise<void>;
    /**
     * Get AI recommendation state
     */
    getAIRecommendation(): Promise<CharacteristicValue>;
    /**
     * Get services
     */
    getServices(): Service[];
}
//# sourceMappingURL=accessory.d.ts.map