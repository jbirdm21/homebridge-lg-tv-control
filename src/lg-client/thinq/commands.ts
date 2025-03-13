import { Logger } from 'homebridge';
import { ThinQAuth } from './auth';
import { AxiosError } from 'axios';

/**
 * Device profile types based on LG ThinQ documentation
 */
export enum DeviceType {
  TV = 'DEVICE_TV',
  AIR_CONDITIONER = 'DEVICE_AIR_CONDITIONER',
  REFRIGERATOR = 'DEVICE_REFRIGERATOR',
  WASHER = 'DEVICE_WASHER',
  DRYER = 'DEVICE_DRYER',
  AIR_PURIFIER = 'DEVICE_AIR_PURIFIER',
  ROBOT_CLEANER = 'DEVICE_ROBOT_CLEANER',
  OVEN = 'DEVICE_OVEN',
  DISH_WASHER = 'DEVICE_DISH_WASHER',
  STYLER = 'DEVICE_STYLER',
  WATER_PURIFIER = 'DEVICE_WATER_PURIFIER',
  DEHUMIDIFIER = 'DEVICE_DEHUMIDIFIER',
  CEILING_FAN = 'DEVICE_CEILING_FAN',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Commands to control LG TVs using the ThinQ API
 */
export class ThinQCommands {
  private readonly log: Logger;
  private deviceProfile: any = null;
  private deviceType: DeviceType = DeviceType.TV;
  private lastStatus: any = null;
  private statusTimestamp: number = 0;
  private readonly statusCacheTime = 10000; // 10 seconds

  constructor(
    private readonly auth: ThinQAuth,
    private readonly deviceId: string,
  ) {
    this.log = auth.getLogger();
  }

  /**
   * Initialize by fetching device profile
   */
  async initialize(): Promise<boolean> {
    try {
      // Get device info first to determine device type
      const deviceInfo = await this.getDeviceInfo();
      if (deviceInfo) {
        // Set device type if available
        if (deviceInfo.deviceType) {
          this.deviceType = deviceInfo.deviceType as DeviceType;
        }
        
        // Log device info
        this.log.debug(`Initialized ThinQ device: ${deviceInfo.alias || 'Unknown'} (${this.deviceType})`);
      }
      
      // Get device profile for capabilities
      this.deviceProfile = await this.auth.getDeviceProfile(this.deviceId);
      
      if (this.deviceProfile) {
        this.log.debug('Successfully retrieved device profile');
        return true;
      } else {
        this.log.warn('Failed to retrieve device profile, limited functionality available');
        return false;
      }
    } catch (error) {
      this.log.error('Failed to initialize ThinQ device:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<any> {
    try {
      // First try to get the device from the ThinQ API devices list
      const devices = await this.auth.getDevices();
      
      if (Array.isArray(devices) && devices.length > 0) {
        const device = devices.find((d: any) => d.deviceId === this.deviceId);
        if (device) {
          return device;
        }
      }
      
      // If not found, fall back to dashboard method
      const dashboard = await this.getDashboard();
      
      if (dashboard && dashboard.result === 'SUCCESS') {
        const devices = dashboard.item?.devices || [];
        const device = devices.find((d: any) => d.deviceId === this.deviceId);
        return device || null;
      }
      
      return null;
    } catch (error) {
      this.log.debug('Error getting device info:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get the current device status with caching
   */
  async getDeviceStatus(forceRefresh = false): Promise<any> {
    // Return cached status if available and not expired
    const now = Date.now();
    if (!forceRefresh && this.lastStatus && (now - this.statusTimestamp < this.statusCacheTime)) {
      return this.lastStatus;
    }
    
    try {
      // Get status from auth class
      const status = await this.auth.getDeviceStatus(this.deviceId);
      
      if (status) {
        this.lastStatus = status;
        this.statusTimestamp = now;
        return status;
      }
      
      // If that fails, try getting it directly
      const client = await this.auth.getClient();
      const response = await client.get(`devices/${this.deviceId}/polling`);
      
      if (response.status === 200 && response.data && response.data.result === 'ok') {
        this.lastStatus = response.data;
        this.statusTimestamp = now;
        return response.data;
      }
      
      this.log.error('Failed to get device status:', response.data);
      throw new Error(`Failed to get device status: ${response.data.result}`);
    } catch (error) {
      this.log.error('Failed to get device status:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Send a command to the device
   */
  private async sendCommand(command: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      // Try sending through the auth class first
      const result = await this.auth.sendDeviceCommand(this.deviceId, command, parameters);
      if (result) {
        return result;
      }
      
      // Fall back to direct API call
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
    } catch (error) {
      this.log.error('Failed to send command:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Check if device supports a specific capability
   */
  supportsCapability(capability: string): boolean {
    if (!this.deviceProfile) {
      return false;
    }
    
    // Check if the capability exists in the device profile
    try {
      const capabilities = this.deviceProfile.capabilities || [];
      return capabilities.some((cap: any) => cap.name === capability);
    } catch (error) {
      return false;
    }
  }

  /**
   * Authenticate with ThinQ API
   */
  async authenticate(): Promise<boolean> {
    try {
      await this.auth.authenticate();
      
      // Check if we need to initialize
      if (!this.deviceProfile) {
        await this.initialize();
      }
      
      // Verify we can get device info
      const deviceInfo = await this.getDeviceInfo();
      if (deviceInfo) {
        this.log.debug('Successfully authenticated with ThinQ API');
        return true;
      } else {
        this.log.warn('Authenticated with ThinQ API but device not found');
        return false;
      }
    } catch (error) {
      this.log.error('Failed to authenticate with ThinQ API:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Power Controls
   */
  async powerOn(): Promise<boolean> {
    try {
      // Check if device is already on - this may be device type specific
      const status = await this.getStatus();
      if (status && status.powerState === 'on') {
        this.log.debug('Device is already powered on');
        return true;
      }

      // Try sending the command
      await this.sendCommand('Start');
      
      // Force status update after power command
      setTimeout(() => this.getDeviceStatus(true), 2000);
      
      return true;
    } catch (error) {
      this.log.error('Failed to power on via ThinQ:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async powerOff(): Promise<boolean> {
    try {
      // Check if device is already off - this may be device type specific
      const status = await this.getStatus();
      if (status && status.powerState === 'off') {
        this.log.debug('Device is already powered off');
        return true;
      }
      
      await this.sendCommand('Stop');
      
      // Force status update after power command
      setTimeout(() => this.getDeviceStatus(true), 2000);
      
      return true;
    } catch (error) {
      this.log.error('Failed to power off via ThinQ:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get current power state
   */
  async getPowerState(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status?.powerState === 'on';
    } catch (error) {
      this.log.error('Failed to get power state:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get TV status
   */
  async getStatus(): Promise<any | null> {
    try {
      const deviceStatus = await this.getDeviceStatus();
      
      // Parse the status based on device type
      if (this.deviceType === DeviceType.TV) {
        // TV-specific status parsing
        const tvStatus = {
          powerState: this.extractPowerState(deviceStatus),
          volume: this.extractVolume(deviceStatus),
          muted: this.extractMuteState(deviceStatus),
          input: this.extractInputSource(deviceStatus),
          channel: this.extractChannelInfo(deviceStatus),
          pictureMode: this.extractPictureMode(deviceStatus),
          energySaving: this.extractEnergySaving(deviceStatus),
          aiRecommendation: this.extractAIRecommendation(deviceStatus)
        };
        
        return tvStatus;
      }
      
      // Return raw status for other device types
      return deviceStatus;
    } catch (error) {
      this.log.error('Error getting TV status:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Extract power state from device status
   */
  private extractPowerState(status: any): string {
    try {
      // Different TVs might store power state differently
      if (status?.state?.reported?.power) {
        return status.state.reported.power;
      }
      if (status?.snapshot?.power) {
        return status.snapshot.power;
      }
      if (status?.device?.status?.power) {
        return status.device.status.power;
      }
      // Default to 'off' if we can't determine
      return 'off';
    } catch (error) {
      return 'off';
    }
  }

  /**
   * Extract volume from device status
   */
  private extractVolume(status: any): number {
    try {
      // Different TVs might store volume differently
      if (status?.state?.reported?.volume !== undefined) {
        return Number(status.state.reported.volume);
      }
      if (status?.snapshot?.volume !== undefined) {
        return Number(status.snapshot.volume);
      }
      if (status?.device?.status?.volume !== undefined) {
        return Number(status.device.status.volume);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract mute state from device status
   */
  private extractMuteState(status: any): boolean {
    try {
      // Different TVs might store mute state differently
      if (status?.state?.reported?.mute !== undefined) {
        return status.state.reported.mute === true || status.state.reported.mute === 'true';
      }
      if (status?.snapshot?.mute !== undefined) {
        return status.snapshot.mute === true || status.snapshot.mute === 'true';
      }
      if (status?.device?.status?.mute !== undefined) {
        return status.device.status.mute === true || status.device.status.mute === 'true';
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract input source from device status
   */
  private extractInputSource(status: any): string {
    try {
      // Different TVs might store input source differently
      if (status?.state?.reported?.inputSource) {
        return status.state.reported.inputSource;
      }
      if (status?.snapshot?.inputSource) {
        return status.snapshot.inputSource;
      }
      if (status?.device?.status?.inputSource) {
        return status.device.status.inputSource;
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract channel info from device status
   */
  private extractChannelInfo(status: any): any {
    try {
      // Different TVs might store channel info differently
      if (status?.state?.reported?.channel) {
        return status.state.reported.channel;
      }
      if (status?.snapshot?.channel) {
        return status.snapshot.channel;
      }
      if (status?.device?.status?.channel) {
        return status.device.status.channel;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract picture mode from device status
   */
  private extractPictureMode(status: any): string {
    try {
      // Different TVs might store picture mode differently
      if (status?.state?.reported?.pictureMode) {
        return status.state.reported.pictureMode;
      }
      if (status?.snapshot?.pictureMode) {
        return status.snapshot.pictureMode;
      }
      if (status?.device?.status?.pictureMode) {
        return status.device.status.pictureMode;
      }
      return 'standard';
    } catch (error) {
      return 'standard';
    }
  }

  /**
   * Extract energy saving from device status
   */
  private extractEnergySaving(status: any): string {
    try {
      // Different TVs might store energy saving differently
      if (status?.state?.reported?.energySaving) {
        return status.state.reported.energySaving;
      }
      if (status?.snapshot?.energySaving) {
        return status.snapshot.energySaving;
      }
      if (status?.device?.status?.energySaving) {
        return status.device.status.energySaving;
      }
      return 'off';
    } catch (error) {
      return 'off';
    }
  }

  /**
   * Extract AI recommendation from device status
   */
  private extractAIRecommendation(status: any): boolean {
    try {
      // Different TVs might store AI recommendation differently
      if (status?.state?.reported?.aiRecommendation !== undefined) {
        return status.state.reported.aiRecommendation === true || status.state.reported.aiRecommendation === 'true';
      }
      if (status?.snapshot?.aiRecommendation !== undefined) {
        return status.snapshot.aiRecommendation === true || status.snapshot.aiRecommendation === 'true';
      }
      if (status?.device?.status?.aiRecommendation !== undefined) {
        return status.device.status.aiRecommendation === true || status.device.status.aiRecommendation === 'true';
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboard(): Promise<any> {
    try {
      // For now, use the stub implementation
      // In a real implementation, you would call the appropriate API
      // This would ideally be implemented in the ThinQAuth class
      return {
        result: 'SUCCESS',
        item: {
          devices: [
            {
              deviceId: this.deviceId,
              alias: 'LG TV',
              modelName: 'OLED C3',
              type: 'TV',
              deviceType: DeviceType.TV,
              online: true
            }
          ]
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Volume Controls
   */
  async setVolume(volume: number): Promise<boolean> {
    try {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      const result = await this.sendCommand('SetVolume', { volume: clampedVolume });
      return result !== null;
    } catch (error) {
      this.log.error(`Failed to set volume to ${volume} via ThinQ:`, error);
      throw error;
    }
  }

  async setMute(mute: boolean): Promise<boolean> {
    try {
      const result = await this.sendCommand('SetMute', { mute });
      return result !== null;
    } catch (error) {
      this.log.error(`Failed to set mute to ${mute} via ThinQ:`, error);
      throw error;
    }
  }

  /**
   * Input Controls
   */
  async setInput(inputId: string): Promise<boolean> {
    try {
      const result = await this.sendCommand('SetInput', { input: inputId });
      return result !== null;
    } catch (error) {
      this.log.error(`Failed to set input to ${inputId} via ThinQ:`, error);
      throw error;
    }
  }

  /**
   * Media Controls
   */
  async play(): Promise<boolean> {
    try {
      await this.sendCommand('Play');
      return true;
    } catch (error) {
      this.log.error('Failed to play:', error);
      return false;
    }
  }

  async pause(): Promise<boolean> {
    try {
      await this.sendCommand('Pause');
      return true;
    } catch (error) {
      this.log.error('Failed to pause:', error);
      return false;
    }
  }

  async stop(): Promise<boolean> {
    try {
      await this.sendCommand('Stop');
      return true;
    } catch (error) {
      this.log.error('Failed to stop:', error);
      return false;
    }
  }

  async rewind(): Promise<boolean> {
    try {
      await this.sendCommand('Rewind');
      return true;
    } catch (error) {
      this.log.error('Failed to rewind:', error);
      return false;
    }
  }

  async fastForward(): Promise<boolean> {
    try {
      await this.sendCommand('FastForward');
      return true;
    } catch (error) {
      this.log.error('Failed to fast forward:', error);
      return false;
    }
  }

  /**
   * Picture Controls
   */
  async setPictureMode(mode: string): Promise<boolean> {
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
    } catch (error) {
      this.log.error(`Failed to set picture mode to ${mode} via ThinQ:`, error);
      throw error;
    }
  }

  /**
   * App Controls
   */
  async launchApp(appId: string): Promise<boolean> {
    try {
      await this.sendCommand('LaunchApp', { appId });
      return true;
    } catch (error) {
      this.log.error(`Failed to launch app ${appId}:`, error);
      return false;
    }
  }

  /**
   * Channel Controls
   */
  async setChannel(channelId: string): Promise<boolean> {
    try {
      await this.sendCommand('SetChannel', { channelId });
      return true;
    } catch (error) {
      this.log.error(`Failed to set channel to ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Advanced Controls
   */
  async sendRemoteButton(button: string): Promise<boolean> {
    try {
      await this.sendCommand('SendRemoteButton', { button });
      return true;
    } catch (error) {
      this.log.error(`Failed to send remote button ${button}:`, error);
      return false;
    }
  }

  /**
   * ThinQ-specific Features
   */
  async getEnergyData(): Promise<any> {
    try {
      const client = await this.auth.getClient();
      const response = await client.get(`devices/${this.deviceId}/energy-usage`);
      
      if (response.status === 200 && response.data && response.data.result === 'ok') {
        return response.data;
      }
      
      this.log.error('Failed to get energy data:', response.data);
      throw new Error(`Failed to get energy data: ${response.data.result}`);
    } catch (error) {
      this.log.error('Failed to get energy data:', error);
      throw error;
    }
  }

  async setEnergySaving(level: string): Promise<boolean> {
    try {
      const validLevels = ['off', 'min', 'med', 'max', 'auto', 'screen_off'];
      const normalizedLevel = level.toLowerCase();
      
      if (!validLevels.includes(normalizedLevel)) {
        throw new Error(`Invalid energy saving level: ${level}. Must be one of: ${validLevels.join(', ')}`);
      }
      
      await this.sendCommand('SetEnergySaving', { level: normalizedLevel });
      return true;
    } catch (error) {
      this.log.error(`Failed to set energy saving to ${level} via ThinQ:`, error);
      return false;
    }
  }

  async enableAIRecommendation(enabled: boolean): Promise<boolean> {
    try {
      await this.sendCommand('SetAIRecommendation', { enabled });
      return true;
    } catch (error) {
      this.log.error(`Failed to set AI recommendation to ${enabled} via ThinQ:`, error);
      return false;
    }
  }

  async getAudioSettings(): Promise<any> {
    try {
      const status = await this.getDeviceStatus();
      if (status?.sound) {
        return status.sound;
      }
      throw new Error('Audio settings not found in device status');
    } catch (error) {
      this.log.error('Failed to get audio settings:', error);
      throw error;
    }
  }

  async setSoundMode(mode: string): Promise<boolean> {
    try {
      await this.sendCommand('SetSoundMode', { mode });
      return true;
    } catch (error) {
      this.log.error(`Failed to set sound mode to ${mode}:`, error);
      return false;
    }
  }

  async getNetworkInfo(): Promise<any> {
    try {
      const status = await this.getDeviceStatus();
      if (status?.network) {
        return status.network;
      }
      throw new Error('Network info not found in device status');
    } catch (error) {
      this.log.error('Failed to get network info:', error);
      throw error;
    }
  }

  /**
   * Advanced ThinQ-specific APIs
   */
  async getThinQDevices(): Promise<any[]> {
    try {
      const dashboard = await this.getDashboard();
      return dashboard?.item?.devices || [];
    } catch (error) {
      return [];
    }
  }

  async sendCustomCommand(commandName: string, params: Record<string, any> = {}): Promise<any> {
    try {
      return await this.sendCommand(commandName, params);
    } catch (error) {
      this.log.error(`Failed to send custom command ${commandName}:`, error);
      throw error;
    }
  }

  /**
   * Turn on the TV via ThinQ Cloud API
   */
  async turnOn(): Promise<boolean> {
    try {
      const result = await this.auth.sendDeviceCommand(
        this.deviceId,
        'airConditionerOperation',
        { operation: 'Power', opValue: 'On' }
      );
      return result.resultCode === '0000';
    } catch (error) {
      this.log.error('Error turning on TV via ThinQ:', error);
      return false;
    }
  }
} 