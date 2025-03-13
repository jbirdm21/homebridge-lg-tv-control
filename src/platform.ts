import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { LGTVAccessory } from './accessory';
import { ThinQAuth } from './lg-client/thinq/auth';
import * as path from 'path';
import * as fs from 'fs';

/**
 * LG TV Platform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class LGTVPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // This is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  
  // ThinQ Authentication if credentials are provided
  private thinqAuth?: ThinQAuth;
  private configuredTVs: any[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
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
    } else {
      // For testing purposes, call discoverDevices directly
      this.discoverDevices();
    }
  }

  /**
   * Initialize ThinQ authentication
   */
  private initializeThinQAuth(): void {
    try {
      // Create storage directory if it doesn't exist
      const storageDir = path.join(this.api.user.storagePath(), 'lg-thinq');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      this.thinqAuth = new ThinQAuth(
        this.log,
        this.config.thinqUsername as string,
        this.config.thinqPassword as string,
        this.config.thinqCountry as string || 'US',
        this.config.thinqLanguage as string || 'en-US',
        storageDir
      );

      this.log.info('ThinQ authentication initialized');
    } catch (error) {
      this.log.error('Failed to initialize ThinQ authentication:', error);
    }
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // Add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices(): Promise<void> {
    // Get TVs from config
    const tvs = this.config.tvs || [];
    
    // Store ThinQ devices if found
    let thinqDevices: any[] = [];

    // If ThinQ authentication is enabled, try to get devices from ThinQ API
    if (this.thinqAuth) {
      try {
        this.log.debug('Attempting to retrieve devices from ThinQ API...');
        thinqDevices = await this.thinqAuth.getDevices();
        this.log.debug(`Found ${thinqDevices.length} devices from ThinQ API`);
        
        // If autoDiscover is enabled, add any TVs found in ThinQ that are not in the config
        if (this.config.autoDiscover && thinqDevices.length > 0) {
          // Filter for TV devices only
          const tvDevices = thinqDevices.filter(device => 
            device.type === 'TV' || 
            device.deviceType === 'TV' || 
            (device.modelName && device.modelName.includes('TV'))
          );
          
          this.log.debug(`Found ${tvDevices.length} TV devices from ThinQ API`);
          
          // Add any TVs not already in the config
          for (const tvDevice of tvDevices) {
            const deviceName = tvDevice.name || tvDevice.alias || tvDevice.modelName || 'LG TV';
            const deviceId = tvDevice.deviceId || tvDevice.id;
            
            // Check if this TV is already in the config by deviceId or name
            const existingTv = tvs.find(tv => 
              (tv.deviceId && tv.deviceId === deviceId) || 
              (tv.name && deviceName && tv.name.toLowerCase() === deviceName.toLowerCase())
            );
            
            if (!existingTv) {
              this.log.info(`Auto-discovered TV from ThinQ: ${deviceName}`);
              
              // Create a new TV config
              const newTv = {
                name: deviceName,
                deviceId: deviceId,
                // Use IP and MAC from ThinQ if available
                ip: tvDevice.ip || tvDevice.networkInfo?.ip,
                mac: tvDevice.mac || tvDevice.networkInfo?.macAddress,
                volumeSlider: true,
                turnOffSwitch: true,
                energySaving: true,
                inputs: [{ type: 'HDMI' }]
              };
              
              tvs.push(newTv);
            }
          }
        }
      } catch (error) {
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
          if (!tv.ip && (matchingDevice.ip || matchingDevice.networkInfo?.ip)) {
            tv.ip = matchingDevice.ip || matchingDevice.networkInfo?.ip;
          }
          
          if (!tv.mac && (matchingDevice.mac || matchingDevice.networkInfo?.macAddress)) {
            tv.mac = matchingDevice.mac || matchingDevice.networkInfo?.macAddress;
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
        new LGTVAccessory(this, existingAccessory);

        // Update accessory cache
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        // The accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', tv.name);

        // Create a new accessory
        const accessory = new this.api.platformAccessory(tv.name, uuid);

        // Store a copy of the device object in the `accessory.context`
        accessory.context.config = tv;

        // Create the accessory handler for the newly created accessory
        new LGTVAccessory(this, accessory);

        // Link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
} 