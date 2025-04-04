"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PictureControlService = void 0;
/**
 * Picture Mode Control Service
 * Uses Lightbulb service to control picture settings like brightness
 */
class PictureControlService {
    constructor(accessory, log, lgClient, platform) {
        this.accessory = accessory;
        this.log = log;
        this.lgClient = lgClient;
        this.platform = platform;
        this.currentBrightness = 50; // Default to 50%
        this.pictureMode = 'standard'; // Default picture mode
        this.POLLING_INTERVAL = 15000; // 15 seconds
        // Picture modes mapping
        this.PICTURE_MODES = {
            vivid: 'Vivid',
            standard: 'Standard',
            eco: 'Eco',
            cinema: 'Cinema',
            sports: 'Sports',
            game: 'Game',
            filmmaker: 'Filmmaker',
            expert: 'Expert',
            user: 'User',
        };
        // Create a Lightbulb service for brightness control
        this.brightnessService = this.accessory.getService('Picture Brightness') ||
            this.accessory.addService(this.platform.Service.Lightbulb, 'Picture Brightness', 'picture-brightness');
        // Set display name
        this.brightnessService.setCharacteristic(this.platform.Characteristic.Name, 'Picture Brightness');
        // Configure the brightness characteristic
        this.brightnessService.getCharacteristic(this.platform.Characteristic.Brightness)
            .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: 1
        })
            .onSet(this.setBrightness.bind(this))
            .onGet(this.getBrightness.bind(this));
        // Configure the on/off characteristic
        this.brightnessService.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setOnState.bind(this))
            .onGet(this.getOnState.bind(this));
        // Start polling for picture settings changes
        this.startPolling();
        this.log.debug('Picture Control service initialized');
    }
    /**
     * Start polling for picture setting changes
     */
    startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                if (this.lgClient.isConnected()) {
                    // In a real implementation, we'd poll for actual picture settings
                    // For now, we'll use the cached values
                    // This is just a placeholder for demonstration
                }
            }
            catch (error) {
                this.log.debug('Failed to poll picture settings:', error);
            }
        }, this.POLLING_INTERVAL);
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
     * Handle requests to set the brightness
     */
    async setBrightness(value) {
        const brightness = value;
        try {
            this.log.debug(`Setting picture brightness to ${brightness}%`);
            // Determine appropriate picture mode based on brightness
            let newMode = this.pictureMode;
            if (brightness <= 20) {
                newMode = 'eco';
            }
            else if (brightness <= 40) {
                newMode = 'cinema';
            }
            else if (brightness <= 60) {
                newMode = 'standard';
            }
            else if (brightness <= 80) {
                newMode = 'sports';
            }
            else {
                newMode = 'vivid';
            }
            // Only send command if mode changed
            if (newMode !== this.pictureMode) {
                await this.lgClient.setPictureMode(newMode);
                this.pictureMode = newMode;
                this.log.debug(`Changed picture mode to ${this.PICTURE_MODES[newMode]}`);
            }
            this.currentBrightness = brightness;
        }
        catch (error) {
            this.log.error('Failed to set picture brightness:', error);
        }
    }
    /**
     * Handle requests to get the current brightness
     */
    async getBrightness() {
        // In a real implementation, we'd get the actual brightness from the TV
        // For now, return the cached value
        return this.currentBrightness;
    }
    /**
     * Handle requests to set the on/off state
     * When turned off, we'll switch to eco mode
     * When turned on, we'll restore previous brightness
     */
    async setOnState(value) {
        const on = value;
        try {
            if (on) {
                this.log.debug('Turning picture settings on');
                // Restore previous brightness
                await this.setBrightness(this.currentBrightness);
            }
            else {
                this.log.debug('Turning picture settings off (eco mode)');
                // Switch to eco mode
                await this.lgClient.setPictureMode('eco');
                this.pictureMode = 'eco';
            }
        }
        catch (error) {
            this.log.error('Failed to set picture on/off state:', error);
        }
    }
    /**
     * Handle requests to get the on/off state
     * We'll consider it "on" if the TV is not in eco mode
     */
    async getOnState() {
        return this.pictureMode !== 'eco';
    }
    /**
     * Get the service instance
     */
    getService() {
        return this.brightnessService;
    }
}
exports.PictureControlService = PictureControlService;
//# sourceMappingURL=picture-control.js.map