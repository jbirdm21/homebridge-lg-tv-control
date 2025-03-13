"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGClient = void 0;
const client_1 = require("./lg-client/webos/client");
const commands_1 = require("./lg-client/webos/commands");
const auth_1 = require("./lg-client/thinq/auth");
const commands_2 = require("./lg-client/thinq/commands");
/**
 * LG Client for controlling LG TVs
 * Combines WebOS and ThinQ APIs
 */
class LGClient {
    /**
     * Create a new LG Client
     */
    constructor(log, ipAddress, macAddress, clientKey, thinqUsername, thinqPassword, thinqCountry = 'US', thinqLanguage = 'en-US', token) {
        this.ipAddress = ipAddress;
        this.macAddress = macAddress;
        this.clientKey = clientKey;
        this.thinqUsername = thinqUsername;
        this.thinqPassword = thinqPassword;
        this.thinqCountry = thinqCountry;
        this.thinqLanguage = thinqLanguage;
        this.token = token;
        // State
        this.connected = false;
        this.deviceId = '';
        this.log = log;
        // Initialize WebOS client and commands
        this.webosClient = new client_1.WebOSClient(ipAddress, clientKey, this.log);
        this.webosCommands = new commands_1.WebOSCommands(this.webosClient, log);
        // Initialize ThinQ if credentials are provided
        if (macAddress && token) {
            this.thinqAuth = new auth_1.ThinQAuth(this.log, this.thinqUsername, this.thinqPassword, this.thinqCountry, this.thinqLanguage, token);
            this.thinqCommands = new commands_2.ThinQCommands(this.thinqAuth, macAddress);
        }
        // Set up event handlers
        this.webosClient.on('connect', () => {
            this.connected = true;
            this.log.debug(`WebOS connected to ${this.ipAddress}`);
        });
        this.webosClient.on('disconnect', () => {
            this.connected = false;
            this.log.debug(`WebOS disconnected from ${this.ipAddress}`);
        });
        this.webosClient.on('error', (error) => {
            this.log.error(`WebOS client error: ${error}`);
        });
        this.webosClient.on('prompt', () => {
            this.log.warn('WebOS client requires pairing. Please accept the prompt on the TV.');
        });
    }
    /**
     * Connect to the TV
     */
    async connect() {
        try {
            const connected = await this.webosClient.connect();
            this.connected = connected;
            return connected;
        }
        catch (error) {
            this.log.error('Failed to connect to WebOS:', error);
            this.connected = false;
            return false;
        }
    }
    /**
     * Disconnect from the TV
     */
    disconnect() {
        this.webosClient.disconnect();
        this.connected = false;
    }
    /**
     * Get current connection state
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Power on the TV
     */
    async powerOn() {
        if (!this.thinqCommands) {
            this.log.warn('Cannot power on: ThinQ not configured');
            return false;
        }
        try {
            return await this.thinqCommands.powerOn();
        }
        catch (error) {
            this.log.error('Failed to power on via ThinQ:', error);
            return false;
        }
    }
    /**
     * Power off the TV
     */
    async powerOff() {
        if (!this.connected) {
            if (!this.thinqCommands) {
                this.log.warn('Cannot power off: Not connected and ThinQ not configured');
                return false;
            }
            try {
                return await this.thinqCommands.powerOff();
            }
            catch (error) {
                this.log.error('Failed to power off via ThinQ:', error);
                return false;
            }
        }
        try {
            return await this.webosCommands.powerOff();
        }
        catch (error) {
            this.log.error('Failed to power off via WebOS:', error);
            return false;
        }
    }
    /**
     * Get TV volume
     */
    async getVolume() {
        if (!this.connected) {
            this.log.warn('Cannot get volume: Not connected');
            return null;
        }
        try {
            return await this.webosCommands.getVolume();
        }
        catch (error) {
            this.log.error('Failed to get volume:', error);
            return null;
        }
    }
    /**
     * Set volume
     */
    async setVolume(volume) {
        if (!this.connected) {
            this.log.warn('Cannot set volume: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.setVolume(volume);
        }
        catch (error) {
            this.log.error('Failed to set volume:', error);
            return false;
        }
    }
    /**
     * Volume up
     */
    async volumeUp() {
        if (!this.connected) {
            this.log.warn('Cannot increase volume: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.volumeUp();
        }
        catch (error) {
            this.log.error('Failed to increase volume:', error);
            return false;
        }
    }
    /**
     * Volume down
     */
    async volumeDown() {
        if (!this.connected) {
            this.log.warn('Cannot decrease volume: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.volumeDown();
        }
        catch (error) {
            this.log.error('Failed to decrease volume:', error);
            return false;
        }
    }
    /**
     * Set mute
     */
    async setMute(mute) {
        if (!this.connected) {
            this.log.warn('Cannot set mute: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.setMute(mute);
        }
        catch (error) {
            this.log.error('Failed to set mute:', error);
            return false;
        }
    }
    /**
     * Get mute state
     */
    async getMute() {
        if (!this.connected) {
            this.log.warn('Cannot get mute state: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.getMute();
        }
        catch (error) {
            this.log.error('Failed to get mute state:', error);
            return false;
        }
    }
    /**
     * Set input source
     */
    async setInput(inputId) {
        if (!this.connected) {
            this.log.warn('Cannot set input: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.setInput(inputId);
        }
        catch (error) {
            this.log.error('Failed to set input:', error);
            return false;
        }
    }
    /**
     * Get current input source
     */
    async getCurrentInput() {
        try {
            const foregroundApp = await this.webosCommands.getCurrentApp();
            if (foregroundApp && foregroundApp.appId) {
                return foregroundApp.appId;
            }
            return null;
        }
        catch (error) {
            this.log.error(`Error getting current input: ${error}`);
            return null;
        }
    }
    /**
     * Play media
     */
    async play() {
        if (!this.connected) {
            this.log.warn('Cannot play: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.play();
        }
        catch (error) {
            this.log.error('Failed to play:', error);
            return false;
        }
    }
    /**
     * Pause media
     */
    async pause() {
        if (!this.connected) {
            this.log.warn('Cannot pause: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.pause();
        }
        catch (error) {
            this.log.error('Failed to pause:', error);
            return false;
        }
    }
    /**
     * Stop media
     */
    async stop() {
        if (!this.connected) {
            this.log.warn('Cannot stop: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.stop();
        }
        catch (error) {
            this.log.error('Failed to stop:', error);
            return false;
        }
    }
    /**
     * Rewind media
     */
    async rewind() {
        if (!this.connected) {
            this.log.warn('Cannot rewind: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.rewind();
        }
        catch (error) {
            this.log.error('Failed to rewind:', error);
            return false;
        }
    }
    /**
     * Fast forward media
     */
    async fastForward() {
        if (!this.connected) {
            this.log.warn('Cannot fast forward: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.fastForward();
        }
        catch (error) {
            this.log.error('Failed to fast forward:', error);
            return false;
        }
    }
    /**
     * Launch app
     */
    async launchApp(appId) {
        if (!this.connected) {
            this.log.warn('Cannot launch app: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.launchApp(appId);
        }
        catch (error) {
            this.log.error(`Failed to launch app ${appId}:`, error);
            return false;
        }
    }
    /**
     * Send a remote control button press
     */
    async sendRemoteButton(button) {
        if (!this.connected) {
            this.log.warn('Cannot send remote button: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.sendButton(button);
        }
        catch (error) {
            this.log.error(`Failed to send button ${button}:`, error);
            return false;
        }
    }
    /**
     * Set channel by number
     */
    async setChannel(channelId) {
        if (!this.connected) {
            this.log.warn('Cannot set channel: Not connected');
            return false;
        }
        try {
            return await this.webosCommands.setChannel(channelId);
        }
        catch (error) {
            this.log.error('Failed to set channel:', error);
            return false;
        }
    }
    /**
     * Set energy saving mode
     */
    async setEnergySaving(enabled) {
        if (!this.thinqCommands) {
            this.log.warn('Cannot set energy saving: ThinQ not configured');
            return false;
        }
        try {
            return await this.thinqCommands.setEnergySaving(enabled ? 'on' : 'off');
        }
        catch (error) {
            this.log.error('Failed to set energy saving:', error);
            return false;
        }
    }
    /**
     * Get energy saving status
     */
    async getEnergySaving() {
        if (!this.thinqCommands) {
            this.log.warn('Cannot get energy saving status: ThinQ not configured');
            return false;
        }
        try {
            // This is a placeholder - you'd need to implement the actual API call
            // in the ThinqCommands class
            const status = await this.thinqCommands.getStatus();
            return (status === null || status === void 0 ? void 0 : status.energySaving) === 'on';
        }
        catch (error) {
            this.log.error('Failed to get energy saving status:', error);
            return false;
        }
    }
    /**
     * Enable or disable AI recommendations
     */
    async enableAIRecommendation(enabled) {
        if (!this.thinqCommands) {
            this.log.warn('Cannot set AI recommendation: ThinQ not configured');
            return false;
        }
        try {
            return await this.thinqCommands.enableAIRecommendation(enabled);
        }
        catch (error) {
            this.log.error('Failed to set AI recommendation:', error);
            return false;
        }
    }
    /**
     * Get AI recommendation status
     */
    async getAIRecommendation() {
        if (!this.thinqCommands) {
            this.log.warn('Cannot get AI recommendation status: ThinQ not configured');
            return false;
        }
        try {
            // This is a placeholder - you'd need to implement the actual API call
            // in the ThinqCommands class
            const status = await this.thinqCommands.getStatus();
            return (status === null || status === void 0 ? void 0 : status.aiRecommendation) === true;
        }
        catch (error) {
            this.log.error('Failed to get AI recommendation status:', error);
            return false;
        }
    }
    /**
     * Set picture mode
     */
    async setPictureMode(mode) {
        if (!this.connected) {
            if (!this.thinqCommands) {
                this.log.warn('Cannot set picture mode: Not connected and ThinQ not configured');
                return false;
            }
            try {
                return await this.thinqCommands.setPictureMode(mode);
            }
            catch (error) {
                this.log.error('Failed to set picture mode via ThinQ:', error);
                return false;
            }
        }
        try {
            return await this.webosCommands.setPictureMode(mode);
        }
        catch (error) {
            this.log.error('Failed to set picture mode via WebOS:', error);
            return false;
        }
    }
    /**
     * Get current picture mode
     */
    async getPictureMode() {
        if (!this.connected) {
            if (!this.thinqCommands) {
                this.log.warn('Cannot get picture mode: Not connected and ThinQ not configured');
                return null;
            }
            try {
                // This is a placeholder - you'd need to implement the actual API call
                const status = await this.thinqCommands.getStatus();
                return (status === null || status === void 0 ? void 0 : status.pictureMode) || null;
            }
            catch (error) {
                this.log.error('Failed to get picture mode via ThinQ:', error);
                return null;
            }
        }
        try {
            // This is a placeholder - you'd need to implement the actual API call
            // For now, we'll return a default value
            return 'standard';
        }
        catch (error) {
            this.log.error('Failed to get picture mode via WebOS:', error);
            return null;
        }
    }
}
exports.LGClient = LGClient;
//# sourceMappingURL=lg-client.js.map