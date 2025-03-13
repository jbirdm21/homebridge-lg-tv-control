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

    // Initialize HAP Service and Characteristic
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

    // If ThinQ authentication is enabled, try to get devices from ThinQ API
    if (this.thinqAuth) {
      try {
        const devices = await this.thinqAuth.getDevices();
        this.log.debug('ThinQ devices:', devices);

        // TODO: Match ThinQ devices with configured TVs
      } catch (error) {
        this.log.error('Failed to get devices from ThinQ API:', error);
      }
    }

    // Loop over the configured TVs
    for (const tv of tvs) {
      // Generate a unique id for the accessory based on the MAC address
      const uuid = this.api.hap.uuid.generate(tv.mac);

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