import { Service, PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import { LGClient } from '../lg-client';
/**
 * ThinQ Features Service
 * Provides HomeKit controls for LG ThinQ-specific features like energy saving and AI recommendations
 */
export declare class ThinQFeaturesService {
    private readonly accessory;
    private readonly log;
    private readonly lgClient;
    private readonly platform;
    private readonly config;
    private energySavingService?;
    private aiRecommendationService?;
    private turnOffSwitchService?;
    private energySavingEnabled;
    private aiRecommendationEnabled;
    private readonly POLLING_INTERVAL;
    private pollingInterval?;
    constructor(accessory: PlatformAccessory, log: Logger, lgClient: LGClient, platform: any, // Platform contains Service and Characteristic references
    config: any);
    /**
     * Set up Energy Saving service
     */
    private setupEnergySavingService;
    /**
     * Set up AI Recommendation service
     */
    private setupAIRecommendationService;
    /**
     * Set up Turn Off Switch service
     */
    private setupTurnOffSwitchService;
    /**
     * Start polling for status updates
     */
    private startPolling;
    /**
     * Update feature states from the TV
     */
    private updateFeatureStates;
    /**
     * Stop polling
     */
    stopPolling(): void;
    /**
     * Handle requests to set the energy saving mode
     */
    setEnergySaving(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the energy saving mode
     */
    getEnergySaving(): Promise<CharacteristicValue>;
    /**
     * Handle requests to set the AI recommendation mode
     */
    setAIRecommendation(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the AI recommendation mode
     */
    getAIRecommendation(): Promise<CharacteristicValue>;
    /**
     * Handle requests to set the turn off switch
     * Note: This is a stateless switch that always returns to OFF
     */
    setTurnOffSwitch(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to get the turn off switch state
     * Note: This is a stateless switch that always returns OFF
     */
    getTurnOffSwitch(): Promise<CharacteristicValue>;
    /**
     * Get all services
     */
    getServices(): Service[];
}
//# sourceMappingURL=thinq-features.d.ts.map