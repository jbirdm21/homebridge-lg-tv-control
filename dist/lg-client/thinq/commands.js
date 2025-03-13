"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinQCommands = void 0;
/**
 * Commands to control LG TVs using the ThinQ API
 */
class ThinQCommands {
    constructor(auth, deviceId) {
        this.auth = auth;
        this.deviceId = deviceId;
        this.log = auth.getLogger();
    }
    /**
     * Get device info
     */
    async getDeviceInfo() {
        var _a;
        try {
            const dashboard = await this.getDashboard();
            if (dashboard && dashboard.result === 'SUCCESS') {
                const devices = ((_a = dashboard.item) === null || _a === void 0 ? void 0 : _a.devices) || [];
                const device = devices.find((d) => d.deviceId === this.deviceId);
                return device || null;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get the current device status
     */
    async getDeviceStatus() {
        try {
            const client = await this.auth.getClient();
            const response = await client.get(`devices/${this.deviceId}/polling`);
            if (response.status === 200 && response.data && response.data.result === 'ok') {
                return response.data;
            }
            this.log.error('Failed to get device status:', response.data);
            throw new Error(`Failed to get device status: ${response.data.result}`);
        }
        catch (error) {
            this.log.error('Failed to get device status:', error);
            throw error;
        }
    }
    /**
     * Send a command to the device
     */
    async sendCommand(command, parameters = {}) {
        try {
            const client = await this.auth.getClient();
            const response = await client.post(`devices/${this.deviceId}/control`, {
                command,
                ...parameters,
            });
            if (response.status === 200 && response.data && response.data.result === 'ok') {
                return response.data;
            }
            this.log.error('Failed to send command:', response.data);
            throw new Error(`Failed to send command: ${response.data.result}`);
        }
        catch (error) {
            this.log.error('Failed to send command:', error);
            throw error;
        }
    }
    /**
     * Power Controls
     */
    async powerOn() {
        try {
            await this.sendCommand('Start');
            return true;
        }
        catch (error) {
            this.log.error('Failed to power on via ThinQ:', error);
            return false;
        }
    }
    async powerOff() {
        try {
            await this.sendCommand('Stop');
            return true;
        }
        catch (error) {
            this.log.error('Failed to power off via ThinQ:', error);
            return false;
        }
    }
    /**
     * Volume Controls
     */
    async setVolume(volume) {
        try {
            const clampedVolume = Math.max(0, Math.min(100, volume));
            const result = await this.sendCommand('SetVolume', { volume: clampedVolume });
            return result !== null;
        }
        catch (error) {
            this.log.error(`Failed to set volume to ${volume} via ThinQ:`, error);
            throw error;
        }
    }
    async setMute(mute) {
        try {
            const result = await this.sendCommand('SetMute', { mute });
            return result !== null;
        }
        catch (error) {
            this.log.error(`Failed to set mute to ${mute} via ThinQ:`, error);
            throw error;
        }
    }
    /**
     * Input Controls
     */
    async setInput(inputId) {
        try {
            const result = await this.sendCommand('SetInput', { input: inputId });
            return result !== null;
        }
        catch (error) {
            this.log.error(`Failed to set input to ${inputId} via ThinQ:`, error);
            throw error;
        }
    }
    /**
     * Media Controls
     */
    async play() {
        try {
            await this.sendCommand('Play');
            return true;
        }
        catch (error) {
            this.log.error('Failed to play:', error);
            return false;
        }
    }
    async pause() {
        try {
            await this.sendCommand('Pause');
            return true;
        }
        catch (error) {
            this.log.error('Failed to pause:', error);
            return false;
        }
    }
    async stop() {
        try {
            await this.sendCommand('Stop');
            return true;
        }
        catch (error) {
            this.log.error('Failed to stop:', error);
            return false;
        }
    }
    async rewind() {
        try {
            await this.sendCommand('Rewind');
            return true;
        }
        catch (error) {
            this.log.error('Failed to rewind:', error);
            return false;
        }
    }
    async fastForward() {
        try {
            await this.sendCommand('FastForward');
            return true;
        }
        catch (error) {
            this.log.error('Failed to fast forward:', error);
            return false;
        }
    }
    /**
     * Picture Controls
     */
    async setPictureMode(mode) {
        try {
            const validModes = [
                'vivid', 'standard', 'eco', 'cinema', 'sports',
                'game', 'filmmaker', 'expert', 'user'
            ];
            const normalizedMode = mode.toLowerCase();
            if (!validModes.includes(normalizedMode)) {
                throw new Error(`Invalid picture mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
            }
            await this.sendCommand('SetPictureMode', { mode: normalizedMode });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to set picture mode to ${mode} via ThinQ:`, error);
            throw error;
        }
    }
    /**
     * App Controls
     */
    async launchApp(appId) {
        try {
            await this.sendCommand('LaunchApp', { appId });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to launch app ${appId}:`, error);
            return false;
        }
    }
    /**
     * Channel Controls
     */
    async setChannel(channelId) {
        try {
            await this.sendCommand('SetChannel', { channelId });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to set channel to ${channelId}:`, error);
            return false;
        }
    }
    /**
     * Advanced Controls
     */
    async sendRemoteButton(button) {
        try {
            await this.sendCommand('SendRemoteButton', { button });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to send remote button ${button}:`, error);
            return false;
        }
    }
    /**
     * ThinQ-specific Features
     */
    async getEnergyData() {
        try {
            const client = await this.auth.getClient();
            const response = await client.get(`devices/${this.deviceId}/energy-usage`);
            if (response.status === 200 && response.data && response.data.result === 'ok') {
                return response.data;
            }
            this.log.error('Failed to get energy data:', response.data);
            throw new Error(`Failed to get energy data: ${response.data.result}`);
        }
        catch (error) {
            this.log.error('Failed to get energy data:', error);
            throw error;
        }
    }
    async setEnergySaving(level) {
        try {
            const validLevels = ['off', 'min', 'med', 'max', 'auto', 'screen_off'];
            const normalizedLevel = level.toLowerCase();
            if (!validLevels.includes(normalizedLevel)) {
                throw new Error(`Invalid energy saving level: ${level}. Must be one of: ${validLevels.join(', ')}`);
            }
            await this.sendCommand('SetEnergySaving', { level: normalizedLevel });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to set energy saving to ${level} via ThinQ:`, error);
            return false;
        }
    }
    async enableAIRecommendation(enabled) {
        try {
            await this.sendCommand('SetAIRecommendation', { enabled });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to set AI recommendation to ${enabled} via ThinQ:`, error);
            return false;
        }
    }
    async getAudioSettings() {
        try {
            const status = await this.getDeviceStatus();
            if (status === null || status === void 0 ? void 0 : status.sound) {
                return status.sound;
            }
            throw new Error('Audio settings not found in device status');
        }
        catch (error) {
            this.log.error('Failed to get audio settings:', error);
            throw error;
        }
    }
    async setSoundMode(mode) {
        try {
            await this.sendCommand('SetSoundMode', { mode });
            return true;
        }
        catch (error) {
            this.log.error(`Failed to set sound mode to ${mode}:`, error);
            return false;
        }
    }
    async getNetworkInfo() {
        try {
            const status = await this.getDeviceStatus();
            if (status === null || status === void 0 ? void 0 : status.network) {
                return status.network;
            }
            throw new Error('Network info not found in device status');
        }
        catch (error) {
            this.log.error('Failed to get network info:', error);
            throw error;
        }
    }
    /**
     * Advanced ThinQ-specific APIs
     */
    async getThinQDevices() {
        var _a;
        try {
            const dashboard = await this.getDashboard();
            return ((_a = dashboard === null || dashboard === void 0 ? void 0 : dashboard.item) === null || _a === void 0 ? void 0 : _a.devices) || [];
        }
        catch (error) {
            return [];
        }
    }
    async sendCustomCommand(commandName, params = {}) {
        try {
            return await this.sendCommand(commandName, params);
        }
        catch (error) {
            this.log.error(`Failed to send custom command ${commandName}:`, error);
            throw error;
        }
    }
    /**
     * Turn on the TV via ThinQ Cloud API
     */
    async turnOn() {
        try {
            const result = await this.auth.sendDeviceCommand(this.deviceId, 'airConditionerOperation', { operation: 'Power', opValue: 'On' });
            return result.resultCode === '0000';
        }
        catch (error) {
            this.log.error('Error turning on TV via ThinQ:', error);
            return false;
        }
    }
    /**
     * Get TV status
     */
    async getStatus() {
        try {
            return await this.auth.getDeviceStatus(this.deviceId);
        }
        catch (error) {
            this.log.error('Error getting TV status:', error);
            return null;
        }
    }
    /**
     * Get dashboard data
     */
    async getDashboard() {
        try {
            // This is a stub implementation since we don't have the actual ThinQ API
            // In a real implementation, you would use the auth.getClient() method
            return {
                result: 'SUCCESS',
                item: {
                    devices: [
                        {
                            deviceId: this.deviceId,
                            alias: 'LG TV',
                            modelName: 'OLED C3',
                            type: 'TV',
                            online: true
                        }
                    ]
                }
            };
        }
        catch (error) {
            return null;
        }
    }
}
exports.ThinQCommands = ThinQCommands;
//# sourceMappingURL=commands.js.map