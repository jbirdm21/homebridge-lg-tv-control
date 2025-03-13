import { EventEmitter } from 'events';

declare module 'homebridge' {
  export interface Logger {
    prefix: string;
    debug(message: string, ...parameters: any[]): void;
    info(message: string, ...parameters: any[]): void;
    warn(message: string, ...parameters: any[]): void;
    error(message: string, ...parameters: any[]): void;
  }

  export type Logging = {
    info(message: string, ...parameters: any[]): void;
    warn(message: string, ...parameters: any[]): void;
    error(message: string, ...parameters: any[]): void;
    debug(message: string, ...parameters: any[]): void;
    log(message: string, ...parameters: any[]): void;
  };

  export type PlatformName = string;
  export type PluginName = string;
  export type PluginIdentifier = string;
  export type AccessoryName = string;
  export type SerialNumber = string;
  export type UUID = string;
  export type AccessoryCategory = number;
  export type CharacteristicValue = string | number | boolean | null;

  export interface PlatformConfig {
    platform: string;
    name: string;
    [key: string]: any;
  }

  export interface AccessoryConfig {
    accessory: string;
    name: string;
    [key: string]: any;
  }

  export interface DynamicPlatformPlugin {
    configureAccessory(accessory: PlatformAccessory): void;
    discoverDevices(): void;
  }

  export interface StaticPlatformPlugin {
    accessories(callback: (accessories: AccessoryPlugin[]) => void): void;
  }

  export interface API {
    version: string;
    serverVersion: string;
    user: {
      configPath(): string;
      storagePath(): string;
    };
    hap: HAP;
    on(event: string, callback: () => void): void;
    registerAccessory(pluginName: PluginName, accessoryName: AccessoryName, constructor: new (...args: any[]) => AccessoryPlugin): void;
    registerPlatform(pluginName: PluginName, platformName: PlatformName, constructor: new (...args: any[]) => DynamicPlatformPlugin | StaticPlatformPlugin): void;
    publishExternalAccessories(pluginName: PluginName, accessories: AccessoryPlugin[]): void;
  }

  export interface HAP {
    uuid: {
      generate(data: string): UUID;
    };
  }

  export interface AccessoryPlugin {
    getServices(): Service[];
  }

  export interface PlatformAccessory {
    UUID: UUID;
    displayName: string;
    context: any;
    category: AccessoryCategory;
    services: Service[];
    reachable: boolean;
    getService(name: string | Service): Service | undefined;
    getServiceById(uuid: string, subType: string): Service | undefined;
    addService(service: Service, ...constructorArgs: any[]): Service;
    removeService(service: Service): void;
    updateReachability(reachable: boolean): void;
    on(event: string, callback: (paired: boolean) => void): void;
    getCharacteristic(name: string): Characteristic;
  }

  export interface Service {
    displayName: string;
    UUID: string;
    subtype?: string;
    characteristics: Characteristic[];
    addCharacteristic(characteristic: Characteristic): Characteristic;
    getCharacteristic(name: string | Characteristic): Characteristic;
    setCharacteristic(name: string | Characteristic, value: CharacteristicValue): Service;
    updateCharacteristic(name: string | Characteristic, value: CharacteristicValue): Service;
    removeCharacteristic(characteristic: Characteristic): void;
    addOptionalCharacteristic(characteristic: Characteristic): void;

    // Service Types
    static readonly AccessoryInformation: typeof Service;
    static readonly Television: typeof Service;
    static readonly TelevisionSpeaker: typeof Service;
    static readonly InputSource: typeof Service;
    static readonly Fan: typeof Service;
    static readonly Switch: typeof Service;
  }

  export interface Characteristic {
    UUID: string;
    displayName: string;
    value: CharacteristicValue;
    props: {
      format: string;
      unit: string;
      minValue: number;
      maxValue: number;
      minStep: number;
      perms: string[];
    };
    on(event: string, callback: (value: CharacteristicValue) => void): void;
    onGet(callback: () => Promise<CharacteristicValue>): Characteristic;
    onSet(callback: (value: CharacteristicValue) => Promise<void>): Characteristic;
    updateValue(value: CharacteristicValue): void;

    // Characteristic Types
    static readonly Manufacturer: typeof Characteristic;
    static readonly Model: typeof Characteristic;
    static readonly SerialNumber: typeof Characteristic;
    static readonly Name: typeof Characteristic;
    static readonly ConfiguredName: typeof Characteristic;
    static readonly Active: typeof Characteristic;
    static readonly SleepDiscoveryMode: typeof Characteristic;
    static readonly ActiveIdentifier: typeof Characteristic;
    static readonly RemoteKey: typeof Characteristic;
    static readonly Mute: typeof Characteristic;
    static readonly Volume: typeof Characteristic;
    static readonly VolumeControlType: typeof Characteristic;
    static readonly RotationSpeed: typeof Characteristic;
    static readonly On: typeof Characteristic;
    static readonly Identifier: typeof Characteristic;
    static readonly IsConfigured: typeof Characteristic;
    static readonly InputSourceType: typeof Characteristic;
    static readonly CurrentVisibilityState: typeof Characteristic;

    // Characteristic Values
    static readonly Active: {
      readonly INACTIVE: 0;
      readonly ACTIVE: 1;
    };
    static readonly SleepDiscoveryMode: {
      readonly NOT_DISCOVERABLE: 0;
      readonly ALWAYS_DISCOVERABLE: 1;
    };
    static readonly VolumeControlType: {
      readonly NONE: 0;
      readonly RELATIVE: 1;
      readonly ABSOLUTE: 2;
      readonly RELATIVE_WITH_CURRENT: 3;
      readonly ABSOLUTE_WITH_CURRENT: 4;
    };
    static readonly RemoteKey: {
      readonly REWIND: 0;
      readonly FAST_FORWARD: 1;
      readonly NEXT_TRACK: 2;
      readonly PREVIOUS_TRACK: 3;
      readonly ARROW_UP: 4;
      readonly ARROW_DOWN: 5;
      readonly ARROW_LEFT: 6;
      readonly ARROW_RIGHT: 7;
      readonly SELECT: 8;
      readonly BACK: 9;
      readonly EXIT: 10;
      readonly PLAY_PAUSE: 11;
      readonly INFORMATION: 15;
    };
    static readonly InputSourceType: {
      readonly OTHER: 0;
      readonly HOME_SCREEN: 1;
      readonly TUNER: 2;
      readonly HDMI: 3;
      readonly COMPOSITE_VIDEO: 4;
      readonly S_VIDEO: 5;
      readonly COMPONENT_VIDEO: 6;
      readonly DVI: 7;
      readonly AIRPLAY: 8;
      readonly USB: 9;
      readonly APPLICATION: 10;
    };
    static readonly IsConfigured: {
      readonly NOT_CONFIGURED: 0;
      readonly CONFIGURED: 1;
    };
    static readonly CurrentVisibilityState: {
      readonly SHOWN: 0;
      readonly HIDDEN: 1;
    };
  }
} 