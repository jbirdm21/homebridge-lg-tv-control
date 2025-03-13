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
exports.LGTVPlatform = void 0;
const settings_1 = require("./settings");
const accessory_1 = require("./accessory");
const auth_1 = require("./lg-client/thinq/auth");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * LG TV Platform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
class LGTVPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        // This is used to track restored cached accessories
        this.accessories = [];
        this.configuredTVs = [];
        this.log.debug('Finished initializing platform:', this.config.name);
        // Initialize HAP Service and Characteristic - using api.hap for Homebridge v2 compatibility
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        // Initialize ThinQ authentication if credentials are provided
        if (this.config.thinqUsername && this.config.thinqPassword) {
            this.initializeThinQAuth();
        }
        // Get the configured TVs from the config
        this.configuredTVs = this.config.tvs || [];
        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        if (this.api.on) {
            this.api.on('didFinishLaunching', () => {
                this.log.debug('Executed didFinishLaunching callback');
                // Run the method to discover / register your devices as accessories
                this.discoverDevices();
            });
        }
        else {
            // For testing purposes, call discoverDevices directly
            this.discoverDevices();
        }
    }
    /**
     * Initialize ThinQ authentication
     */
    initializeThinQAuth() {
        try {
            // Create storage directory if it doesn't exist
            const storageDir = path.join(this.api.user.storagePath(), 'lg-thinq');
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            this.thinqAuth = new auth_1.ThinQAuth(this.log, this.config.thinqUsername, this.config.thinqPassword, this.config.thinqCountry || 'US', this.config.thinqLanguage || 'en-US', storageDir);
            this.log.info('ThinQ authentication initialized');
        }
        catch (error) {
            this.log.error('Failed to initialize ThinQ authentication:', error);
        }
    }
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        // Add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    async discoverDevices() {
        var _a, _b, _c, _d, _e, _f;
        // Get TVs from config
        const tvs = this.config.tvs || [];
        // Store ThinQ devices if found
        let thinqDevices = [];
        // If ThinQ authentication is enabled, try to get devices from ThinQ API
        if (this.thinqAuth) {
            try {
                this.log.debug('Attempting to retrieve devices from ThinQ API...');
                thinqDevices = await this.thinqAuth.getDevices();
                this.log.debug(`Found ${thinqDevices.length} devices from ThinQ API`);
                // If autoDiscover is enabled, add any TVs found in ThinQ that are not in the config
                if (this.config.autoDiscover && thinqDevices.length > 0) {
                    // Filter for TV devices only
                    const tvDevices = thinqDevices.filter(device => device.type === 'TV' ||
                        device.deviceType === 'TV' ||
                        (device.modelName && device.modelName.includes('TV')));
                    this.log.debug(`Found ${tvDevices.length} TV devices from ThinQ API`);
                    // Add any TVs not already in the config
                    for (const tvDevice of tvDevices) {
                        const deviceName = tvDevice.name || tvDevice.alias || tvDevice.modelName || 'LG TV';
                        const deviceId = tvDevice.deviceId || tvDevice.id;
                        // Check if this TV is already in the config by deviceId or name
                        const existingTv = tvs.find(tv => (tv.deviceId && tv.deviceId === deviceId) ||
                            (tv.name && deviceName && tv.name.toLowerCase() === deviceName.toLowerCase()));
                        if (!existingTv) {
                            this.log.info(`Auto-discovered TV from ThinQ: ${deviceName}`);
                            // Create a new TV config
                            const newTv = {
                                name: deviceName,
                                deviceId: deviceId,
                                // Use IP and MAC from ThinQ if available
                                ip: tvDevice.ip || ((_a = tvDevice.networkInfo) === null || _a === void 0 ? void 0 : _a.ip),
                                mac: tvDevice.mac || ((_b = tvDevice.networkInfo) === null || _b === void 0 ? void 0 : _b.macAddress),
                                volumeSlider: true,
                                turnOffSwitch: true,
                                energySaving: true,
                                inputs: [{ type: 'HDMI' }]
                            };
                            tvs.push(newTv);
                        }
                    }
                }
            }
            catch (error) {
                this.log.error('Failed to get devices from ThinQ API:', error);
            }
        }
        // Loop over the configured TVs
        for (const tv of tvs) {
            // If we have ThinQ devices, try to match and enhance the TV config
            if (thinqDevices.length > 0 && !tv.deviceId) {
                const matchingDevice = thinqDevices.find(device => {
                    // Match by IP if available
                    if (tv.ip && device.ip && tv.ip === device.ip) {
                        return true;
                    }
                    // Match by MAC if available
                    if (tv.mac && device.mac && tv.mac.toLowerCase() === device.mac.toLowerCase()) {
                        return true;
                    }
                    // Match by name as last resort
                    if (tv.name && device.name && tv.name.toLowerCase() === device.name.toLowerCase()) {
                        return true;
                    }
                    return false;
                });
                if (matchingDevice) {
                    this.log.debug(`Matched TV ${tv.name} with ThinQ device ${matchingDevice.name || matchingDevice.modelName}`);
                    // Enhance the TV config with ThinQ information
                    tv.deviceId = matchingDevice.deviceId || matchingDevice.id;
                    tv.modelName = matchingDevice.modelName || tv.modelName;
                    // If IP or MAC are missing, add from ThinQ
                    if (!tv.ip && (matchingDevice.ip || ((_c = matchingDevice.networkInfo) === null || _c === void 0 ? void 0 : _c.ip))) {
                        tv.ip = matchingDevice.ip || ((_d = matchingDevice.networkInfo) === null || _d === void 0 ? void 0 : _d.ip);
                    }
                    if (!tv.mac && (matchingDevice.mac || ((_e = matchingDevice.networkInfo) === null || _e === void 0 ? void 0 : _e.macAddress))) {
                        tv.mac = matchingDevice.mac || ((_f = matchingDevice.networkInfo) === null || _f === void 0 ? void 0 : _f.macAddress);
                    }
                }
            }
            // Generate a unique id for the accessory
            // Try to use MAC address first, then deviceId, or finally fallback to name
            const identifier = tv.mac || tv.deviceId || tv.name;
            if (!identifier) {
                this.log.error('TV configuration is missing required identifiers (MAC, deviceId, or name). Skipping this TV.');
                continue;
            }
            const uuid = this.api.hap.uuid.generate(identifier);
            // Check if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
            if (existingAccessory) {
                // The accessory already exists
                this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
                // Update the accessory context
                existingAccessory.context.config = tv;
                // Create the accessory handler for the restored accessory
                new accessory_1.LGTVAccessory(this, existingAccessory);
                // Update accessory cache
                this.api.updatePlatformAccessories([existingAccessory]);
            }
            else {
                // The accessory does not yet exist, so we need to create it
                this.log.info('Adding new accessory:', tv.name);
                // Create a new accessory
                const accessory = new this.api.platformAccessory(tv.name, uuid);
                // Store a copy of the device object in the `accessory.context`
                accessory.context.config = tv;
                // Create the accessory handler for the newly created accessory
                new accessory_1.LGTVAccessory(this, accessory);
                // Link the accessory to your platform
                this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
            }
        }
    }
}
exports.LGTVPlatform = LGTVPlatform;
//# sourceMappingURL=platform.js.map