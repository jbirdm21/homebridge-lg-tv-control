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
   * Remove duplicate accessories from the platform
   */
  private removeDuplicateAccessories(): void {
    // Map to track accessories by their display name
    const accessoriesByName = new Map<string, PlatformAccessory[]>();
    
    // Group accessories by display name
    this.accessories.forEach(accessory => {
      const name = accessory.displayName;
      if (!accessoriesByName.has(name)) {
        accessoriesByName.set(name, []);
      }
      accessoriesByName.get(name)!.push(accessory);
    });
    
    // Find duplicate accessories (same name but different UUIDs)
    for (const [name, accessories] of accessoriesByName.entries()) {
      if (accessories.length > 1) {
        this.log.warn(`Found ${accessories.length} accessories with the same name "${name}". Removing duplicates.`);
        
        // Keep the first accessory, remove the rest
        const keepAccessory = accessories[0];
        const removeAccessories = accessories.slice(1);
        
        this.log.debug(`Keeping accessory with UUID ${keepAccessory.UUID}`);
        
        // Remove duplicate accessories from HomeKit and our cache
        removeAccessories.forEach(accessory => {
          this.log.debug(`Removing duplicate accessory with UUID ${accessory.UUID}`);
          
          // Remove from HomeKit
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          
          // Find and remove from our accessories array
          const accessoryIndex = this.accessories.findIndex(a => a.UUID === accessory.UUID);
          if (accessoryIndex !== -1) {
            this.accessories.splice(accessoryIndex, 1);
          }
        });
      }
    }
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices(): Promise<void> {
    // First, remove any duplicate accessories that may exist in the cache
    this.removeDuplicateAccessories();
    
    // Get TVs from config
    let tvs = this.config.tvs || [];
    
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
            
            // Check if this TV is already in the config
            const existingTv = tvs.find(configTv => 
              (configTv.deviceId && configTv.deviceId === deviceId) ||
              (configTv.ip && tvDevice.ip && configTv.ip === tvDevice.ip) ||
              (configTv.mac && tvDevice.mac && configTv.mac.toLowerCase() === tvDevice.mac.toLowerCase())
            );
            
            if (!existingTv) {
              this.log.info(`Auto-discovered TV from ThinQ: ${deviceName}`);
              
              // Add the TV to our config
              tvs.push({
                name: deviceName,
                ip: tvDevice.ip || '',
                mac: tvDevice.mac || '',
                deviceId: deviceId,
                thinqEnabled: true,
              });
            }
          }
        }
      } catch (error) {
        // If ThinQ login fails, log the error but continue using manually configured TVs
        this.log.error(`Failed to get devices from ThinQ API: ${(error as Error).message}`);
        
        // Continue with local TV discovery methods if ThinQ fails
        if (tvs.length === 0) {
          this.log.warn('No TVs configured and ThinQ discovery failed. Please add your TVs manually in the Homebridge config.');
        }
      }
    }

    // Create a map to track unique TVs and avoid duplicates
    const processedTVs: any[] = [];
    const seenIdentifiers = new Set<string>();

    // First pass: enhance TVs with ThinQ data and deduplicate
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
      
      // Generate a possible unique identifier for the TV
      let possibleIdentifiers: string[] = [];
      
      if (tv.mac) {
        possibleIdentifiers.push(tv.mac.toLowerCase());
      }
      if (tv.deviceId) {
        possibleIdentifiers.push(tv.deviceId);
      }
      if (tv.ip) {
        possibleIdentifiers.push(tv.ip);
      }
      
      // Skip TV if no identifiers
      if (possibleIdentifiers.length === 0) {
        if (tv.name) {
          // Use name as a last resort identifier
          possibleIdentifiers.push(tv.name.toLowerCase());
        } else {
          this.log.error('TV configuration is missing required identifiers (MAC, deviceId, IP, or name). Skipping this TV.');
          continue;
        }
      }
      
      // Check if this TV is already seen
      const isDuplicate = possibleIdentifiers.some(id => seenIdentifiers.has(id));
      
      if (isDuplicate) {
        this.log.warn(`Found duplicate TV configuration for "${tv.name}". Skipping duplicate.`);
        continue;
      }
      
      // Add all identifiers to the seen set
      possibleIdentifiers.forEach(id => seenIdentifiers.add(id));
      
      // Add to processed TVs
      processedTVs.push(tv);
    }
    
    this.log.info(`Processing ${processedTVs.length} unique TV configurations`);

    // Process each TV and register it
    for (const tv of processedTVs) {
      try {
        // Make sure we have a valid IP address
        if (!tv.ip) {
          this.log.warn(`TV ${tv.name} does not have a valid IP address. Skipping WebOS initialization.`);
          continue;
        }

        // Generate a unique identifier that's consistent across restarts
        // Prefer MAC address, then deviceId, then IP address, and finally name as a last resort
        const identifier = tv.mac || tv.deviceId || tv.ip || tv.name;
        const uuid = this.api.hap.uuid.generate(`lg-tv-${identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        
        this.log.debug(`Generated UUID ${uuid} for TV ${tv.name} using identifier: ${identifier}`);
        
        // Check if the accessory already exists
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        
        if (existingAccessory) {
          this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
          
          // Update accessory context with latest config
          existingAccessory.context.config = tv;
          this.api.updatePlatformAccessories([existingAccessory]);
          
          // Create the TV accessory handler
          const lgTvAccessory = new LGTVAccessory(this, existingAccessory);
          this.configuredTVs.push(lgTvAccessory);
        } else {
          // Create a new accessory
          this.log.info(`Adding new TV accessory: ${tv.name}`);
          
          const accessory = new this.api.platformAccessory(tv.name, uuid);
          accessory.category = this.api.hap.Categories.TELEVISION;
          
          // Store TV config in context
          accessory.context.config = tv;
          
          // Create the TV accessory handler
          const lgTvAccessory = new LGTVAccessory(this, accessory);
          this.configuredTVs.push(lgTvAccessory);
          
          // Register the accessory
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      } catch (error) {
        this.log.error(`Failed to initialize TV ${tv.name}:`, error);
      }
    }
  }
} 