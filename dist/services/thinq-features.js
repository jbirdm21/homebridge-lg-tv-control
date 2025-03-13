"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinQFeaturesService = void 0;
/**
 * ThinQ Features Service
 * Provides HomeKit controls for LG ThinQ-specific features like energy saving and AI recommendations
 */
class ThinQFeaturesService {
    constructor(accessory, log, lgClient, platform, // Platform contains Service and Characteristic references
    config) {
        this.accessory = accessory;
        this.log = log;
        this.lgClient = lgClient;
        this.platform = platform;
        this.config = config;
        this.energySavingEnabled = false;
        this.aiRecommendationEnabled = false;
        this.POLLING_INTERVAL = 30000; // 30 seconds
        // Set up the services based on config
        if (config.energySaving) {
            this.setupEnergySavingService();
        }
        if (config.aiRecommendation) {
            this.setupAIRecommendationService();
        }
        if (config.turnOffSwitch) {
            this.setupTurnOffSwitchService();
        }
        // Start polling for status updates if any ThinQ features are enabled
        if (config.energySaving || config.aiRecommendation) {
            this.startPolling();
        }
        this.log.debug('ThinQ Features service initialized');
    }
    /**
     * Set up Energy Saving service
     */
    setupEnergySavingService() {
        this.energySavingService = this.accessory.getService('Energy Saving Mode') ||
            this.accessory.addService(this.platform.Service.Switch, 'Energy Saving Mode', 'energy-saving');
        this.energySavingService.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setEnergySaving.bind(this))
            .onGet(this.getEnergySaving.bind(this));
        this.log.debug('Energy Saving service configured');
    }
    /**
     * Set up AI Recommendation service
     */
    setupAIRecommendationService() {
        this.aiRecommendationService = this.accessory.getService('AI Recommendation') ||
            this.accessory.addService(this.platform.Service.Switch, 'AI Recommendation', 'ai-recommendation');
        this.aiRecommendationService.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setAIRecommendation.bind(this))
            .onGet(this.getAIRecommendation.bind(this));
        this.log.debug('AI Recommendation service configured');
    }
    /**
     * Set up Turn Off Switch service
     */
    setupTurnOffSwitchService() {
        this.turnOffSwitchService = this.accessory.getService('Turn Off TV') ||
            this.accessory.addService(this.platform.Service.Switch, 'Turn Off TV', 'turn-off-tv');
        this.turnOffSwitchService.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setTurnOffSwitch.bind(this))
            .onGet(this.getTurnOffSwitch.bind(this));
        this.log.debug('Turn Off Switch service configured');
    }
    /**
     * Start polling for status updates
     */
    startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                // Only poll if the client is connected
                if (this.lgClient.isConnected()) {
                    // Poll for ThinQ features status
                    await this.updateFeatureStates();
                }
            }
            catch (error) {
                this.log.debug('Failed to poll ThinQ features:', error);
            }
        }, this.POLLING_INTERVAL);
    }
    /**
     * Update feature states from the TV
     */
    async updateFeatureStates() {
        try {
            // In a real implementation, we'd get these from the ThinQ API
            // For now, we'll use simplified states
            if (this.energySavingService) {
                this.energySavingEnabled = false; // Default state
                this.energySavingService.updateCharacteristic(this.platform.Characteristic.On, this.energySavingEnabled);
            }
            if (this.aiRecommendationService) {
                this.aiRecommendationEnabled = false; // Default state
                this.aiRecommendationService.updateCharacteristic(this.platform.Characteristic.On, this.aiRecommendationEnabled);
            }
        }
        catch (error) {
            this.log.error('Failed to update feature states:', error);
        }
    }
    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }
    /**
     * Handle requests to set the energy saving mode
     */
    async setEnergySaving(value) {
        const enabled = value;
        try {
            this.log.debug(`Setting energy saving mode to ${enabled}`);
            await this.lgClient.setEnergySaving(enabled);
            this.energySavingEnabled = enabled;
        }
        catch (error) {
            this.log.error('Failed to set energy saving mode:', error);
        }
    }
    /**
     * Handle requests to get the energy saving mode
     */
    async getEnergySaving() {
        return this.energySavingEnabled;
    }
    /**
     * Handle requests to set the AI recommendation mode
     */
    async setAIRecommendation(value) {
        const enabled = value;
        try {
            this.log.debug(`Setting AI recommendation mode to ${enabled}`);
            await this.lgClient.enableAIRecommendation(enabled);
            this.aiRecommendationEnabled = enabled;
        }
        catch (error) {
            this.log.error('Failed to set AI recommendation mode:', error);
        }
    }
    /**
     * Handle requests to get the AI recommendation mode
     */
    async getAIRecommendation() {
        return this.aiRecommendationEnabled;
    }
    /**
     * Handle requests to set the turn off switch
     * Note: This is a stateless switch that always returns to OFF
     */
    async setTurnOffSwitch(value) {
        const on = value;
        if (on) {
            try {
                this.log.info('Turning off TV via Turn Off Switch');
                await this.lgClient.powerOff();
                // Reset the switch state after a short delay
                setTimeout(() => {
                    var _a;
                    (_a = this.turnOffSwitchService) === null || _a === void 0 ? void 0 : _a.updateCharacteristic(this.platform.Characteristic.On, false);
                }, 1000);
            }
            catch (error) {
                this.log.error('Failed to turn off TV:', error);
            }
        }
    }
    /**
     * Handle requests to get the turn off switch state
     * Note: This is a stateless switch that always returns OFF
     */
    async getTurnOffSwitch() {
        return false;
    }
    /**
     * Get all services
     */
    getServices() {
        const services = [];
        if (this.energySavingService) {
            services.push(this.energySavingService);
        }
        if (this.aiRecommendationService) {
            services.push(this.aiRecommendationService);
        }
        if (this.turnOffSwitchService) {
            services.push(this.turnOffSwitchService);
        }
        return services;
    }
}
exports.ThinQFeaturesService = ThinQFeaturesService;
//# sourceMappingURL=thinq-features.js.map