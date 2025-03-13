import {
  Logger,
  PlatformAccessory,
  Service,
  CharacteristicValue,
} from 'homebridge';

import { LGTVPlatform } from './platform';
import { LGClient } from './lg-client';

/**
 * LG TV Accessory
 */
export class LGTVAccessory {
  private readonly log: Logger;
  private readonly name: string;
  private readonly lgClient: LGClient;

  // Services
  private readonly tvService: Service;
  private readonly speakerService: Service;
  private readonly volumeSliderService?: Service;
  private readonly turnOffSwitchService?: Service;
  private readonly energySavingService?: Service;
  private readonly aiRecommendationService?: Service;
  private inputServices: Service[] = [];

  // State
  private tvActive = false;
  private tvMuted = false;
  private tvVolume = 0;
  private currentInputId = '';
  private energySavingEnabled = false;
  private aiRecommendationEnabled = false;

  constructor(
    private readonly platform: LGTVPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.log = platform.log;
    this.name = accessory.context.config.name;

    // Initialize LG client
    this.lgClient = new LGClient(
      this.log,
      accessory.context.config.ip,
      accessory.context.config.mac,
      accessory.context.config.clientKey,
      accessory.context.config.thinqUsername,
      accessory.context.config.thinqPassword,
      accessory.context.config.thinqCountry,
      accessory.context.config.thinqLanguage,
    );

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG Electronics')
      .setCharacteristic(this.platform.Characteristic.Model, 'C3 OLED TV')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.config.mac || 'Unknown');

    // Television service
    this.tvService = this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);

    this.tvService
      .setCharacteristic(this.platform.Characteristic.Name, this.name)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, this.name)
      .setCharacteristic(
        this.platform.Characteristic.SleepDiscoveryMode, 
        this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
      );

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
      .setCharacteristic(
        this.platform.Characteristic.VolumeControlType, 
        this.platform.Characteristic.VolumeControlType.ABSOLUTE
      );

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
   * Set up TV input sources from configuration
   */
  private setupInputSources(): void {
    const inputs = this.accessory.context.config.inputs || [];
    
    // Ensure we have unique names for each input
    const processedInputs = inputs.map((input, index) => {
      // If input doesn't have a name, generate one based on type and index
      if (!input.name) {
        input.name = input.type ? `${input.type} ${index + 1}` : `Input ${index + 1}`;
      }
      return input;
    });
    
    // Check for duplicate names and make them unique
    const inputNames = new Set<string>();
    processedInputs.forEach((input) => {
      let uniqueName = input.name;
      let counter = 1;
      
      // If the name already exists, append a number to make it unique
      while (inputNames.has(uniqueName)) {
        uniqueName = `${input.name} ${counter}`;
        counter++;
      }
      
      // Update the input name to the unique version
      input.name = uniqueName;
      inputNames.add(uniqueName);
    });
    
    // Remove any existing input services
    this.inputServices.forEach(service => {
      try {
        this.accessory.removeService(service);
      } catch (error) {
        this.platform.log.warn(`Error removing input service: ${error}`);
      }
    });
    this.inputServices = [];

    // Add input services from config with unique identifiers
    processedInputs.forEach((input, i) => {
      try {
        const serviceId = `input-${i}`;
        
        // Check if the service already exists
        const existingService = this.accessory.getService(serviceId);
        if (existingService) {
          this.platform.log.debug(`Removing existing input service: ${serviceId}`);
          this.accessory.removeService(existingService);
        }
        
        const inputService = this.accessory.addService(
          this.platform.Service.InputSource,
          input.name,
          serviceId
        );

        inputService
          .setCharacteristic(this.platform.Characteristic.Identifier, i)
          .setCharacteristic(this.platform.Characteristic.ConfiguredName, input.name)
          .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
          .setCharacteristic(this.platform.Characteristic.InputSourceType, this.getInputSourceType(input.type))
          .setCharacteristic(this.platform.Characteristic.CurrentVisibilityState, this.platform.Characteristic.CurrentVisibilityState.SHOWN);

        // Link input to TV service
        this.tvService.addLinkedService(inputService);
        this.inputServices.push(inputService);
      } catch (error) {
        this.platform.log.error(`Error adding input service ${input.name}: ${error}`);
      }
    });
  }

  /**
   * Map input type string to HomeKit InputSourceType
   */
  private getInputSourceType(type: string): number {
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
  private async connectToTV(): Promise<void> {
    try {
      const connected = await this.lgClient.connect();
      
      if (connected) {
        this.log.info(`Connected to ${this.name}`);
        this.tvActive = true;
        this.updateTVState();
      } else {
        this.log.warn(`Failed to connect to ${this.name}`);
        this.tvActive = false;
      }
      
      this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
    } catch (error) {
      this.log.error(`Error connecting to ${this.name}:`, error);
      this.tvActive = false;
      this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
    }
  }

  /**
   * Update TV state (volume, input, etc.)
   */
  private async updateTVState(): Promise<void> {
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
    } catch (error) {
      this.log.error(`Error updating TV state for ${this.name}:`, error);
    }
  }

  /**
   * Get input identifier from input ID
   */
  private getInputIdentifier(inputId: string): number {
    const inputs = this.accessory.context.config.inputs || [];
    const input = inputs.find(i => i.id === inputId);
    return input ? inputs.indexOf(input) : 0;
  }

  /**
   * Get input ID from identifier
   */
  private getInputId(identifier: number): string {
    const inputs = this.accessory.context.config.inputs || [];
    return inputs[identifier]?.id || '';
  }

  /**
   * Set TV active state
   */
  async setActive(value: CharacteristicValue): Promise<void> {
    const active = value as boolean;
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
    } else {
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
  async getActive(): Promise<CharacteristicValue> {
    return this.tvActive;
  }

  /**
   * Set active input
   */
  async setActiveIdentifier(value: CharacteristicValue): Promise<void> {
    const identifier = value as number;
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
  async getActiveIdentifier(): Promise<CharacteristicValue> {
    return this.getInputIdentifier(this.currentInputId);
  }

  /**
   * Handle remote key press
   */
  async remoteKeyPress(value: CharacteristicValue): Promise<void> {
    const key = value as number;
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
  async setMute(value: CharacteristicValue): Promise<void> {
    const mute = value as boolean;
    this.log.debug(`Setting ${this.name} mute to ${mute}`);

    const success = await this.lgClient.setMute(mute);
    if (success) {
      this.tvMuted = mute;
    }
  }

  /**
   * Get speaker mute
   */
  async getMute(): Promise<CharacteristicValue> {
    return this.tvMuted;
  }

  /**
   * Set speaker volume
   */
  async setVolume(value: CharacteristicValue): Promise<void> {
    const volume = value as number;
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
  async getVolume(): Promise<CharacteristicValue> {
    return this.tvVolume;
  }

  /**
   * Set turn off switch
   */
  async setTurnOffSwitch(value: CharacteristicValue): Promise<void> {
    const on = value as boolean;
    
    if (on) {
      // Turn off the TV when the switch is turned on
      await this.lgClient.powerOff();
      this.tvActive = false;
      this.tvService.updateCharacteristic(this.platform.Characteristic.Active, this.tvActive);
      
      // Reset the switch after a delay
      setTimeout(() => {
        this.turnOffSwitchService?.updateCharacteristic(this.platform.Characteristic.On, false);
      }, 1000);
    }
  }

  /**
   * Get turn off switch state (always returns false)
   */
  async getTurnOffSwitch(): Promise<CharacteristicValue> {
    return false;
  }

  /**
   * Set energy saving
   */
  async setEnergySaving(value: CharacteristicValue): Promise<void> {
    const enabled = value as boolean;
    this.log.debug(`Setting ${this.name} energy saving to ${enabled}`);

    const success = await this.lgClient.setEnergySaving(enabled);
    if (success) {
      this.energySavingEnabled = enabled;
    }
  }

  /**
   * Get energy saving state
   */
  async getEnergySaving(): Promise<CharacteristicValue> {
    return this.energySavingEnabled;
  }

  /**
   * Set AI recommendation
   */
  async setAIRecommendation(value: CharacteristicValue): Promise<void> {
    const enabled = value as boolean;
    this.log.debug(`Setting ${this.name} AI recommendation to ${enabled}`);

    const success = await this.lgClient.enableAIRecommendation(enabled);
    if (success) {
      this.aiRecommendationEnabled = enabled;
    }
  }

  /**
   * Get AI recommendation state
   */
  async getAIRecommendation(): Promise<CharacteristicValue> {
    return this.aiRecommendationEnabled;
  }

  /**
   * Get services
   */
  getServices(): Service[] {
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