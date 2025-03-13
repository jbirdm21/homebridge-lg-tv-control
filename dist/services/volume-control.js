"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeControlService = void 0;
class VolumeControlService {
    constructor(accessory, log, lgClient, platform // Platform contains Service and Characteristic references
    ) {
        this.accessory = accessory;
        this.log = log;
        this.lgClient = lgClient;
        this.platform = platform;
        this.currentVolume = 0;
        this.DEFAULT_MIN_STEP = 1;
        this.VOLUME_POLLING_INTERVAL = 10000; // 10 seconds
        // Create a fan service to represent volume as a rotational speed
        this.service = this.accessory.getService('Volume Control') ||
            this.accessory.addService(this.platform.Service.Fan, 'Volume Control', 'volume-control');
        // Set display name
        this.service.setCharacteristic(this.platform.Characteristic.Name, 'TV Volume');
        // Configure the rotation speed characteristic for volume
        this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .setProps({
            minValue: 0,
            maxValue: 100,
            minStep: this.DEFAULT_MIN_STEP
        })
            .onSet(this.setVolume.bind(this))
            .onGet(this.getVolume.bind(this));
        // Configure the on/off characteristic to represent mute state (inverted)
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setMute.bind(this))
            .onGet(this.getMute.bind(this));
        // Start polling for volume changes
        this.startVolumePolling();
        this.log.debug('Volume Control service initialized');
    }
    /**
     * Start polling for volume changes
     */
    startVolumePolling() {
        this.volumePollingInterval = setInterval(async () => {
            try {
                if (this.lgClient.isConnected()) {
                    const volume = await this.lgClient.getVolume();
                    if (volume !== null && volume !== this.currentVolume) {
                        this.currentVolume = volume;
                        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.currentVolume);
                    }
                    const muted = await this.lgClient.getMute();
                    this.service.updateCharacteristic(this.platform.Characteristic.On, !muted);
                }
            }
            catch (error) {
                this.log.debug('Failed to poll volume:', error);
            }
        }, this.VOLUME_POLLING_INTERVAL);
    }
    /**
     * Stop volume polling
     */
    stopVolumePolling() {
        if (this.volumePollingInterval) {
            clearInterval(this.volumePollingInterval);
            this.volumePollingInterval = undefined;
        }
    }
    /**
     * Handle requests to set the volume
     */
    async setVolume(value) {
        const volume = value;
        try {
            this.log.debug(`Setting volume to ${volume}%`);
            await this.lgClient.setVolume(volume);
            this.currentVolume = volume;
        }
        catch (error) {
            this.log.error('Failed to set volume:', error);
        }
    }
    /**
     * Handle requests to get the current volume
     */
    async getVolume() {
        try {
            if (this.lgClient.isConnected()) {
                const volume = await this.lgClient.getVolume();
                if (volume !== null) {
                    this.currentVolume = volume;
                }
            }
        }
        catch (error) {
            this.log.debug('Failed to get volume:', error);
        }
        return this.currentVolume;
    }
    /**
     * Handle requests to set the mute state
     * Note: The Fan's "On" characteristic is the inverse of mute
     */
    async setMute(value) {
        const on = value;
        try {
            this.log.debug(`Setting mute state to ${!on}`);
            await this.lgClient.setMute(!on);
        }
        catch (error) {
            this.log.error('Failed to set mute state:', error);
        }
    }
    /**
     * Handle requests to get the current mute state
     * Note: The Fan's "On" characteristic is the inverse of mute
     */
    async getMute() {
        try {
            if (this.lgClient.isConnected()) {
                const muted = await this.lgClient.getMute();
                return !muted;
            }
        }
        catch (error) {
            this.log.debug('Failed to get mute state:', error);
        }
        // Default to on if we can't determine the state
        return true;
    }
    /**
     * Get the service instance
     */
    getService() {
        return this.service;
    }
}
exports.VolumeControlService = VolumeControlService;
//# sourceMappingURL=volume-control.js.map