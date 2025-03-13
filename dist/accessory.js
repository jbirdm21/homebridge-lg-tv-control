"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGTVAccessory = void 0;
const lg_client_1 = require("./lg-client");
/**
 * LG TV Accessory
 */
class LGTVAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.inputServices = [];
        // State
        this.tvActive = false;
        this.tvMuted = false;
        this.tvVolume = 0;
        this.currentInputId = '';
        this.energySavingEnabled = false;
        this.aiRecommendationEnabled = false;
        this.log = platform.log;
        this.name = accessory.context.config.name;
        // Initialize LG client
        this.lgClient = new lg_client_1.LGClient(this.log, accessory.context.config.ip, accessory.context.config.mac, accessory.context.config.clientKey, accessory.context.config.thinqUsername, accessory.context.config.thinqPassword, accessory.context.config.thinqCountry, accessory.context.config.thinqLanguage);
        // Set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG Electronics')
            .setCharacteristic(this.platform.Characteristic.Model, 'C3 OLED TV')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.config.mac || 'Unknown');
        // Television service
        this.tvService = this.accessory.getService(this.platform.Service.Television) ||
            this.accessory.addService(this.platform.Service.Television);
        this.tvService
            .setCharacteristic(this.platform.Characteristic.Name, this.name)
            .setCharacteristic(this.platform.Characteristic.ConfiguredName, this.name)
            .setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode, this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
        // Television Active characteristic
        this.tvService.getCharacteristic(this.platform.Characteristic.Active)
            .onSet(this.setActive.bind(this))
            .onGet(this.getActive.bind(this));
        // Television Active Identifier characteristic (input source)
        this.tvService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
            .onSet(this.setActiveIdentifier.bind(this))
            .onGet(this.getActiveIdentifier.bind(this));
        // Remote control
        this.tvService.getCharacteristic(this.platform.Characteristic.RemoteKey)
            .onSet(this.remoteKeyPress.bind(this));
        // Speaker service
        this.speakerService = this.accessory.getService(this.platform.Service.TelevisionSpeaker) ||
            this.accessory.addService(this.platform.Service.TelevisionSpeaker);
        this.speakerService
            .setCharacteristic(this.platform.Characteristic.Name, `${this.name} Speaker`)
            .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE)
            .setCharacteristic(this.platform.Characteristic.VolumeControlType, this.platform.Characteristic.VolumeControlType.ABSOLUTE);
        // Speaker mute characteristic
        this.speakerService.getCharacteristic(this.platform.Characteristic.Mute)
            .onSet(this.setMute.bind(this))
            .onGet(this.getMute.bind(this));
        // Speaker volume characteristic
        this.speakerService.getCharacteristic(this.platform.Characteristic.Volume)
            .onSet(this.setVolume.bind(this))
            .onGet(this.getVolume.bind(this));
        // Optional volume slider (as a fan)
        if (accessory.context.config.volumeSlider) {
            this.volumeSliderService = this.accessory.getService('Volume Slider') ||
                this.accessory.addService(this.platform.Service.Fan, 'Volume Slider', 'volume-slider');
            this.volumeSliderService
                .setCharacteristic(this.platform.Characteristic.Name, `${this.name} Volume`)
                .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
            this.volumeSliderService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
                .onSet(this.setVolume.bind(this))
                .onGet(this.getVolume.bind(this));
        }
        // Optional turn off switch
        if (accessory.context.config.turnOffSwitch) {
            this.turnOffSwitchService = this.accessory.getService('Turn Off') ||
                this.accessory.addService(this.platform.Service.Switch, 'Turn Off', 'turn-off-switch');
            this.turnOffSwitchService
                .setCharacteristic(this.platform.Characteristic.Name, `Turn Off ${this.name}`);
            this.turnOffSwitchService.getCharacteristic(this.platform.Characteristic.On)
                .onSet(this.setTurnOffSwitch.bind(this))
                .onGet(this.getTurnOffSwitch.bind(this));
        }
        // Optional energy saving service
        if (accessory.context.config.energySaving) {
            this.energySavingService = this.accessory.getService('Energy Saving') ||
                this.accessory.addService(this.platform.Service.Switch, 'Energy Saving', 'energy-saving-switch');
            this.energySavingService
                .setCharacteristic(this.platform.Characteristic.Name, `${this.name} Energy Saving`);
            this.energySavingService.getCharacteristic(this.platform.Characteristic.On)
                .onSet(this.setEnergySaving.bind(this))
                .onGet(this.getEnergySaving.bind(this));
        }
        // Optional AI recommendation service
        if (accessory.context.config.aiRecommendation) {
            this.aiRecommendationService = this.accessory.getService('AI Recommendation') ||
                this.accessory.addService(this.platform.Service.Switch, 'AI Recommendation', 'ai-recommendation-switch');
            this.aiRecommendationService
                .setCharacteristic(this.platform.Characteristic.Name, `${this.name} AI Recommendation`);
            this.aiRecommendationService.getCharacteristic(this.platform.Characteristic.On)
                .onSet(this.setAIRecommendation.bind(this))
                .onGet(this.getAIRecommendation.bind(this));
        }
        // Set up input sources
        this.setupInputSources();
        // Connect to the TV and update state
        this.connectToTV();
    }
    /**
     * Set up input sources from config
     */
    setupInputSources() {
        const inputs = this.accessory.context.config.inputs || [];
        // Remove any existing input services
        this.inputServices.forEach(service => {
            this.accessory.removeService(service);
        });
        this.inputServices = [];
        // Add input services from config
        inputs.forEach((input, i) => {
            const inputService = this.accessory.addService(this.platform.Service.InputSource, input.name, `input-${i}`);
            inputService
                .setCharacteristic(this.platform.Characteristic.Identifier, i)
                .setCharacteristic(this.platform.Characteristic.ConfiguredName, input.name)
                .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.platform.Characteristic.InputSourceType, this.getInputSourceType(input.type))
                .setCharacteristic(this.platform.Characteristic.CurrentVisibilityState, this.platform.Characteristic.CurrentVisibilityState.SHOWN);
            // Link input to TV service
            this.tvService.addLinkedService(inputService);
            this.inputServices.push(inputService);
        });
    }
    /**
     * Map input type string to HomeKit InputSourceType
     */
    getInputSourceType(type) {
        const InputSourceType = this.platform.Characteristic.InputSourceType;
        switch (type.toLowerCase()) {
            case 'hdmi':
                return InputSourceType.HDMI;
            case 'usb':
                return InputSourceType.USB;
            case 'application':
                return InputSourceType.APPLICATION;
            case 'tuner':
                return InputSourceType.TUNER;
            default:
                return InputSourceType.OTHER;
        }
    }
    /**
     * Connect to the TV and update state
     */
    async connectToTV() {
        try {
            const connected = await this.lgClient.connect();
            if (connected) {
                this.log.info(`Connected to ${this.name}`);
                this.tvActive = true;
                this.updateTVState();
            }
            else {
                this.log.warn(`Failed to connect to ${this.name}`);
                this.tvActive = false;
            }
            this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
        }
        catch (error) {
            this.log.error(`Error connecting to ${this.name}:`, error);
            this.tvActive = false;
            this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
        }
    }
    /**
     * Update TV state (volume, input, etc.)
     */
    async updateTVState() {
        if (!this.tvActive) {
            return;
        }
        try {
            // Update volume
            const volume = await this.lgClient.getVolume();
            if (typeof volume === 'number') {
                this.tvVolume = volume;
                this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, this.tvVolume);
                if (this.volumeSliderService) {
                    this.volumeSliderService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.tvVolume);
                }
            }
            // Update input (not implemented yet, would need to get current input from TV)
            // this.currentInputId = ...
            // this.tvService.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, this.getInputIdentifier(this.currentInputId));
        }
        catch (error) {
            this.log.error(`Error updating TV state for ${this.name}:`, error);
        }
    }
    /**
     * Get input identifier from input ID
     */
    getInputIdentifier(inputId) {
        const inputs = this.accessory.context.config.inputs || [];
        const input = inputs.find(i => i.id === inputId);
        return input ? inputs.indexOf(input) : 0;
    }
    /**
     * Get input ID from identifier
     */
    getInputId(identifier) {
        var _a;
        const inputs = this.accessory.context.config.inputs || [];
        return ((_a = inputs[identifier]) === null || _a === void 0 ? void 0 : _a.id) || '';
    }
    /**
     * Set TV active state
     */
    async setActive(value) {
        const active = value;
        this.log.debug(`Setting ${this.name} active to ${active}`);
        if (active) {
            // Turn on
            const success = await this.lgClient.powerOn();
            if (success) {
                this.tvActive = true;
                // Wait for TV to boot up
                setTimeout(() => {
                    this.connectToTV();
                }, 5000);
            }
        }
        else {
            // Turn off
            const success = await this.lgClient.powerOff();
            if (success) {
                this.tvActive = false;
                this.lgClient.disconnect();
            }
        }
    }
    /**
     * Get TV active state
     */
    async getActive() {
        return this.tvActive;
    }
    /**
     * Set active input
     */
    async setActiveIdentifier(value) {
        const identifier = value;
        this.log.debug(`Setting ${this.name} input to ${identifier}`);
        const inputId = this.getInputId(identifier);
        if (inputId) {
            const success = await this.lgClient.setInput(inputId);
            if (success) {
                this.currentInputId = inputId;
            }
        }
    }
    /**
     * Get active input
     */
    async getActiveIdentifier() {
        return this.getInputIdentifier(this.currentInputId);
    }
    /**
     * Handle remote key press
     */
    async remoteKeyPress(value) {
        const key = value;
        this.log.debug(`Remote key pressed: ${key}`);
        const RemoteKey = this.platform.Characteristic.RemoteKey;
        switch (key) {
            case RemoteKey.REWIND:
                await this.lgClient.rewind();
                break;
            case RemoteKey.FAST_FORWARD:
                await this.lgClient.fastForward();
                break;
            case RemoteKey.NEXT_TRACK:
                // Not directly supported
                break;
            case RemoteKey.PREVIOUS_TRACK:
                // Not directly supported
                break;
            case RemoteKey.ARROW_UP:
                await this.lgClient.sendRemoteButton('UP');
                break;
            case RemoteKey.ARROW_DOWN:
                await this.lgClient.sendRemoteButton('DOWN');
                break;
            case RemoteKey.ARROW_LEFT:
                await this.lgClient.sendRemoteButton('LEFT');
                break;
            case RemoteKey.ARROW_RIGHT:
                await this.lgClient.sendRemoteButton('RIGHT');
                break;
            case RemoteKey.SELECT:
                await this.lgClient.sendRemoteButton('ENTER');
                break;
            case RemoteKey.BACK:
                await this.lgClient.sendRemoteButton('BACK');
                break;
            case RemoteKey.EXIT:
                await this.lgClient.sendRemoteButton('EXIT');
                break;
            case RemoteKey.PLAY_PAUSE:
                // Toggle between play and pause
                await this.lgClient.sendRemoteButton('PLAY');
                break;
            case RemoteKey.INFORMATION:
                await this.lgClient.sendRemoteButton('INFO');
                break;
        }
    }
    /**
     * Set speaker mute
     */
    async setMute(value) {
        const mute = value;
        this.log.debug(`Setting ${this.name} mute to ${mute}`);
        const success = await this.lgClient.setMute(mute);
        if (success) {
            this.tvMuted = mute;
        }
    }
    /**
     * Get speaker mute
     */
    async getMute() {
        return this.tvMuted;
    }
    /**
     * Set speaker volume
     */
    async setVolume(value) {
        const volume = value;
        this.log.debug(`Setting ${this.name} volume to ${volume}`);
        const success = await this.lgClient.setVolume(volume);
        if (success) {
            this.tvVolume = volume;
            // Update other volume services
            this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, this.tvVolume);
            if (this.volumeSliderService) {
                this.volumeSliderService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.tvVolume);
            }
        }
    }
    /**
     * Get speaker volume
     */
    async getVolume() {
        return this.tvVolume;
    }
    /**
     * Set turn off switch
     */
    async setTurnOffSwitch(value) {
        const on = value;
        if (on) {
            // Turn off the TV when the switch is turned on
            await this.lgClient.powerOff();
            this.tvActive = false;
            this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
            // Reset the switch after a delay
            setTimeout(() => {
                var _a;
                (_a = this.turnOffSwitchService) === null || _a === void 0 ? void 0 : _a.updateCharacteristic(this.platform.Characteristic.On, false);
            }, 1000);
        }
    }
    /**
     * Get turn off switch state (always returns false)
     */
    async getTurnOffSwitch() {
        return false;
    }
    /**
     * Set energy saving
     */
    async setEnergySaving(value) {
        const enabled = value;
        this.log.debug(`Setting ${this.name} energy saving to ${enabled}`);
        const success = await this.lgClient.setEnergySaving(enabled);
        if (success) {
            this.energySavingEnabled = enabled;
        }
    }
    /**
     * Get energy saving state
     */
    async getEnergySaving() {
        return this.energySavingEnabled;
    }
    /**
     * Set AI recommendation
     */
    async setAIRecommendation(value) {
        const enabled = value;
        this.log.debug(`Setting ${this.name} AI recommendation to ${enabled}`);
        const success = await this.lgClient.enableAIRecommendation(enabled);
        if (success) {
            this.aiRecommendationEnabled = enabled;
        }
    }
    /**
     * Get AI recommendation state
     */
    async getAIRecommendation() {
        return this.aiRecommendationEnabled;
    }
    /**
     * Get services
     */
    getServices() {
        return [
            this.tvService,
            this.speakerService,
            ...(this.volumeSliderService ? [this.volumeSliderService] : []),
            ...(this.turnOffSwitchService ? [this.turnOffSwitchService] : []),
            ...(this.energySavingService ? [this.energySavingService] : []),
            ...(this.aiRecommendationService ? [this.aiRecommendationService] : []),
            ...this.inputServices,
        ];
    }
}
exports.LGTVAccessory = LGTVAccessory;
//# sourceMappingURL=accessory.js.map