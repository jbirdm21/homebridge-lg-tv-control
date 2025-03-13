"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGClient = void 0;
const events_1 = require("events");
const dgram = __importStar(require("dgram"));
const client_1 = require("./webos/client");
const commands_1 = require("./webos/commands");
const commands_2 = require("./thinq/commands");
const wake_on_lan_1 = require("../utils/wake-on-lan");
/**
 * Integrated client for communicating with LG TVs via both WebOS and ThinQ API
 */
class LGClient extends events_1.EventEmitter {
    constructor(log, ipAddress, deviceId, thinqAuth, options = {}) {
        super();
        this.log = log;
        this.ipAddress = ipAddress;
        this.deviceId = deviceId;
        this.thinqAuth = thinqAuth;
        this.options = options;
        this.thinqCommands = null;
        this.connected = false;
        this.currentState = {};
        this.pollingInterval = null;
        // Initialize WebOS client
        this.webosClient = new client_1.WebOSClient(ipAddress, options === null || options === void 0 ? void 0 : options.manualIP);
        this.webosCommands = new commands_1.WebOSCommands(this.webosClient, log);
        // Initialize ThinQ client if available
        if (thinqAuth && deviceId) {
            this.thinqCommands = new commands_2.ThinQCommands(thinqAuth, deviceId);
        }
        // Subscribe to connection events
        this.webosClient.on('connect', () => {
            this.connected = true;
            this.emit('connect');
        });
        this.webosClient.on('disconnect', () => {
            this.connected = false;
            this.emit('disconnect');
        });
        // Subscribe to WebOS state updates
        this.webosClient.on('state', (state) => {
            this.currentState = { ...this.currentState, ...state };
            this.emit('state', this.currentState);
        });
    }
    /**
     * TV Discovery
     */
    static async discoverTVs() {
        return new Promise((resolve) => {
            const discoveredTVs = {};
            const socket = dgram.createSocket('udp4');
            // Handle messages from devices
            socket.on('message', (message, remote) => {
                const messageString = message.toString();
                if (messageString.includes('LG WebOS TV') || messageString.includes('webOS')) {
                    const ip = remote.address;
                    // Extract TV name if possible
                    let name = 'LG WebOS TV';
                    const nameMatch = messageString.match(/friendlyName: (.*?)(\r\n|\n)/);
                    if (nameMatch && nameMatch[1]) {
                        name = nameMatch[1];
                    }
                    // Extract model name if possible
                    let modelName;
                    const modelMatch = messageString.match(/modelName: (.*?)(\r\n|\n)/);
                    if (modelMatch && modelMatch[1]) {
                        modelName = modelMatch[1];
                    }
                    // Save the TV info
                    discoveredTVs[ip] = { name, ip, modelName };
                }
            });
            // Send discovery message
            socket.bind(0, () => {
                socket.setBroadcast(true);
                const ssdpMessage = Buffer.from('M-SEARCH * HTTP/1.1\r\n' +
                    'HOST: 239.255.255.250:1900\r\n' +
                    'MAN: "ssdp:discover"\r\n' +
                    'MX: 5\r\n' +
                    'ST: urn:dial-multiscreen-org:service:dial:1\r\n' +
                    '\r\n');
                socket.send(ssdpMessage, 0, ssdpMessage.length, 1900, '239.255.255.250');
                // Wait for responses and close after timeout
                setTimeout(() => {
                    socket.close();
                    resolve(Object.values(discoveredTVs));
                }, 5000);
            });
        });
    }
    /**
     * Connection Management
     */
    async connect() {
        try {
            // Try WebOS connection if allowed
            const controlPriority = this.options.controlPriority || 'Local First';
            if (controlPriority !== 'Cloud Only') {
                const webosConnected = await this.webosClient.connect();
                if (webosConnected) {
                    return true;
                }
            }
            // If WebOS connection failed or not allowed, we're not connected
            return false;
        }
        catch (error) {
            this.log.error(`Connection failed: ${error}`);
            return false;
        }
    }
    disconnect() {
        // Clear polling interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        // Disconnect WebOS client
        this.webosClient.disconnect();
        this.connected = false;
    }
    setupPolling() {
        // Skip if no ThinQ commands available
        if (!this.thinqCommands) {
            return;
        }
        // Clear existing interval if any
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        // Set up polling interval (default: every 60 seconds)
        const pollingIntervalMs = (this.options.cloudPollingInterval || 60) * 1000;
        this.pollingInterval = setInterval(async () => {
            try {
                // Get device state from ThinQ API
                const deviceState = await this.thinqCommands.getDeviceStatus();
                // Update current state
                if (deviceState) {
                    this.currentState = { ...this.currentState, ...deviceState };
                    this.emit('state', this.currentState);
                }
            }
            catch (error) {
                this.log.debug('Failed to poll device state from ThinQ:', error);
            }
        }, pollingIntervalMs);
    }
    /**
     * Power Control
     */
    async powerOn() {
        // Try Wake-on-LAN first if MAC address is provided
        if (this.options.macAddress) {
            try {
                this.log.debug(`Sending Wake-on-LAN to ${this.options.macAddress}`);
                await (0, wake_on_lan_1.wakeOnLan)(this.options.macAddress);
            }
            catch (error) {
                this.log.warn('Wake-on-LAN failed:', error);
            }
        }
        // Try ThinQ power on if available
        if (this.thinqCommands) {
            try {
                this.log.debug('Sending power on command via ThinQ API');
                await this.thinqCommands.powerOn();
            }
            catch (error) {
                this.log.warn('ThinQ power on failed:', error);
            }
        }
        // Try to connect to WebOS client (this will keep trying if TV is powering on)
        return this.connect();
    }
    async powerOff() {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.powerOff();
            }
            catch (error) {
                this.log.warn('Local power off failed:', error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.powerOff();
            }
            catch (error) {
                this.log.warn('ThinQ power off failed:', error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.powerOff();
            }
            catch (error) {
                this.log.warn('Local power off failed as fallback:', error);
            }
        }
        throw new Error('No available method to power off the TV');
    }
    /**
     * Volume Control
     */
    async getVolume() {
        if (this.connected) {
            try {
                return await this.webosCommands.getVolume();
            }
            catch (error) {
                this.log.warn('Failed to get volume via WebOS:', error);
            }
        }
        // Return from current state if available
        if (this.currentState.volume !== undefined) {
            return this.currentState.volume;
        }
        throw new Error('Cannot get volume: TV not available');
    }
    async setVolume(volume) {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.setVolume(volume);
            }
            catch (error) {
                this.log.warn('Local volume control failed:', error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.setVolume(volume);
            }
            catch (error) {
                this.log.warn('ThinQ volume control failed:', error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.setVolume(volume);
            }
            catch (error) {
                this.log.warn('Local volume control failed as fallback:', error);
            }
        }
        throw new Error('No available method to control volume');
    }
    async volumeUp() {
        if (this.connected) {
            try {
                return await this.webosCommands.volumeUp();
            }
            catch (error) {
                this.log.warn('Failed to increase volume:', error);
            }
        }
        // Alternative approach via ThinQ if webOS is not available
        if (this.thinqCommands) {
            try {
                // Get current volume first if available
                let currentVolume = 10; // default if unknown
                if (this.currentState.volume !== undefined) {
                    currentVolume = this.currentState.volume;
                }
                // Increase by a small amount
                return await this.thinqCommands.setVolume(currentVolume + 5);
            }
            catch (error) {
                this.log.warn('Failed to increase volume via ThinQ:', error);
            }
        }
        throw new Error('No available method to increase volume');
    }
    async volumeDown() {
        if (this.connected) {
            try {
                return await this.webosCommands.volumeDown();
            }
            catch (error) {
                this.log.warn('Failed to decrease volume:', error);
            }
        }
        // Alternative approach via ThinQ if webOS is not available
        if (this.thinqCommands) {
            try {
                // Get current volume first if available
                let currentVolume = 10; // default if unknown
                if (this.currentState.volume !== undefined) {
                    currentVolume = this.currentState.volume;
                }
                // Decrease by a small amount
                return await this.thinqCommands.setVolume(Math.max(0, currentVolume - 5));
            }
            catch (error) {
                this.log.warn('Failed to decrease volume via ThinQ:', error);
            }
        }
        throw new Error('No available method to decrease volume');
    }
    async setMute(mute) {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.setMute(mute);
            }
            catch (error) {
                this.log.warn('Local mute control failed:', error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.setMute(mute);
            }
            catch (error) {
                this.log.warn('ThinQ mute control failed:', error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.setMute(mute);
            }
            catch (error) {
                this.log.warn('Local mute control failed as fallback:', error);
            }
        }
        throw new Error('No available method to control mute');
    }
    /**
     * Input Control
     */
    async getInputs() {
        try {
            const inputs = await this.webosCommands.getInputs();
            return inputs || [];
        }
        catch (error) {
            this.log.error('Failed to get inputs:', error);
            return [];
        }
    }
    async setInput(inputId) {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.setInput(inputId);
            }
            catch (error) {
                this.log.warn(`Local input selection failed for ${inputId}:`, error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.setInput(inputId);
            }
            catch (error) {
                this.log.warn(`ThinQ input selection failed for ${inputId}:`, error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.setInput(inputId);
            }
            catch (error) {
                this.log.warn(`Local input selection failed as fallback for ${inputId}:`, error);
            }
        }
        throw new Error(`No available method to select input ${inputId}`);
    }
    /**
     * App Control
     */
    async getLaunchPoints() {
        try {
            const apps = await this.webosCommands.getLaunchPoints();
            return apps || [];
        }
        catch (error) {
            this.log.error('Failed to get launch points:', error);
            return [];
        }
    }
    async launchApp(appId) {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.launchApp(appId);
            }
            catch (error) {
                this.log.warn(`Local app launch failed for ${appId}:`, error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.launchApp(appId);
            }
            catch (error) {
                this.log.warn(`ThinQ app launch failed for ${appId}:`, error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.launchApp(appId);
            }
            catch (error) {
                this.log.warn(`Local app launch failed as fallback for ${appId}:`, error);
            }
        }
        throw new Error(`No available method to launch app ${appId}`);
    }
    /**
     * Media Control
     */
    async play() {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.play();
            }
            catch (error) {
                this.log.warn('Local play control failed:', error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.play();
            }
            catch (error) {
                this.log.warn('ThinQ play control failed:', error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.play();
            }
            catch (error) {
                this.log.warn('Local play control failed as fallback:', error);
            }
        }
        throw new Error('No available method to control playback');
    }
    async pause() {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.pause();
            }
            catch (error) {
                this.log.warn('Local pause control failed:', error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.pause();
            }
            catch (error) {
                this.log.warn('ThinQ pause control failed:', error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.pause();
            }
            catch (error) {
                this.log.warn('Local pause control failed as fallback:', error);
            }
        }
        throw new Error('No available method to control playback');
    }
    /**
     * Picture Control
     */
    async setPictureMode(mode) {
        const controlPriority = this.options.controlPriority || 'Local First';
        // Try local control first if prioritized
        if ((controlPriority === 'Local First' || controlPriority === 'Local Only') && this.connected) {
            try {
                return await this.webosCommands.setPictureMode(mode);
            }
            catch (error) {
                this.log.warn(`Local picture mode control failed for ${mode}:`, error);
                // If local only, return failure
                if (controlPriority === 'Local Only') {
                    return false;
                }
            }
        }
        // Try ThinQ if available and allowed
        if ((controlPriority === 'Cloud First' || controlPriority === 'Cloud Only' || controlPriority === 'Local First') && this.thinqCommands) {
            try {
                return await this.thinqCommands.setPictureMode(mode);
            }
            catch (error) {
                this.log.warn(`ThinQ picture mode control failed for ${mode}:`, error);
            }
        }
        // If cloud first and local is available, try local as fallback
        if (controlPriority === 'Cloud First' && this.connected) {
            try {
                return await this.webosCommands.setPictureMode(mode);
            }
            catch (error) {
                this.log.warn(`Local picture mode control failed as fallback for ${mode}:`, error);
            }
        }
        throw new Error(`No available method to set picture mode to ${mode}`);
    }
    /**
     * ThinQ-specific Features
     */
    async getEnergyData() {
        if (!this.thinqCommands) {
            throw new Error('ThinQ integration not available');
        }
        return this.thinqCommands.getEnergyData();
    }
    async setEnergySaving(level) {
        if (!this.thinqCommands) {
            throw new Error('ThinQ integration not available');
        }
        return this.thinqCommands.setEnergySaving(level);
    }
    async enableAIRecommendation(enable) {
        if (!this.thinqCommands) {
            throw new Error('ThinQ integration not available');
        }
        return this.thinqCommands.enableAIRecommendation(enable);
    }
}
exports.LGClient = LGClient;
//# sourceMappingURL=index.js.map