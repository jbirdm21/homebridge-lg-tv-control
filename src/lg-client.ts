import { Logger } from 'homebridge';
import { WebOSClient } from './lg-client/webos/client';
import { WebOSCommands } from './lg-client/webos/commands';
import { ThinQAuth } from './lg-client/thinq/auth';
import { ThinQCommands } from './lg-client/thinq/commands';

/**
 * LG Client for controlling LG TVs
 * Combines WebOS and ThinQ APIs
 */
export class LGClient {
  private readonly log: Logger;
  private webOSClient: WebOSClient;
  private webOSCommands: WebOSCommands;
  private thinQAuth?: ThinQAuth;
  private thinQCommands?: ThinQCommands;
  
  // State
  private connected = false;
  private deviceId = '';

  /**
   * Create a new LG Client
   */
  constructor(
    log: Logger,
    private readonly ipAddress: string,
    private readonly macAddress: string,
    private readonly clientKey?: string, 
    private readonly thinQUsername?: string,
    private readonly thinQPassword?: string,
    private readonly thinQCountry: string = 'US',
    private readonly thinQLanguage: string = 'en-US',
    private readonly token?: string
  ) {
    this.log = log;
    
    // Initialize WebOS client and commands
    this.webOSClient = new WebOSClient(ipAddress, clientKey, this.log);
    this.webOSCommands = new WebOSCommands(this.webOSClient, log);

    // Initialize ThinQ if credentials are provided
    if (macAddress && token) {
      this.thinQAuth = new ThinQAuth(
        this.log,
        this.thinQUsername!,
        this.thinQPassword!,
        this.thinQCountry,
        this.thinQLanguage,
        token
      );
      this.thinQCommands = new ThinQCommands(this.thinQAuth, macAddress);
    }

    // Set up event handlers
    this.webOSClient.on('connect', () => {
      this.connected = true;
      this.log.debug(`WebOS connected to ${this.ipAddress}`);
    });

    this.webOSClient.on('disconnect', () => {
      this.connected = false;
      this.log.debug(`WebOS disconnected from ${this.ipAddress}`);
    });

    this.webOSClient.on('error', (error) => {
      this.log.error(`WebOS client error: ${error}`);
    });

    this.webOSClient.on('prompt', () => {
      this.log.warn('WebOS client requires pairing. Please accept the prompt on the TV.');
    });
  }

  /**
   * Connect to the TV
   */
  async connect(): Promise<boolean> {
    let connected = false;

    // First, try WebOS direct connection
    try {
      this.log.debug('Attempting to connect via WebOS...');
      connected = await this.webOSClient.connect();
      
      if (connected) {
        this.log.info('Connected to TV via WebOS');
        this.connected = true;
        return true;
      }
    } catch (error) {
      this.log.error('WebOS connection failed:', error instanceof Error ? error.message : String(error));
    }

    // If WebOS fails and ThinQ client exists, try ThinQ
    if (!connected && this.thinQCommands) {
      try {
        this.log.debug('WebOS connection failed, trying ThinQ...');
        
        // Initialize ThinQ client if needed
        await this.thinQCommands.initialize();
        
        // Authenticate with ThinQ
        connected = await this.thinQCommands.authenticate();
        
        if (connected) {
          this.log.info('Connected to TV via ThinQ');
          this.connected = true;
          return true;
        }
      } catch (error) {
        this.log.error('ThinQ connection failed:', error instanceof Error ? error.message : String(error));
      }
    }

    this.log.error('Failed to connect to TV via any method');
    this.connected = false;
    return false;
  }

  /**
   * Disconnect from the TV
   */
  disconnect(): void {
    this.webOSClient.disconnect();
    this.connected = false;
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Power on the TV
   */
  async powerOn(): Promise<boolean> {
    if (!this.thinQCommands) {
      this.log.warn('Cannot power on: ThinQ not configured');
      return false;
    }

    try {
      return await this.thinQCommands.powerOn();
    } catch (error) {
      this.log.error('Failed to power on via ThinQ:', error);
      return false;
    }
  }

  /**
   * Power off the TV
   */
  async powerOff(): Promise<boolean> {
    if (!this.connected) {
      if (!this.thinQCommands) {
        this.log.warn('Cannot power off: Not connected and ThinQ not configured');
        return false;
      }

      try {
        return await this.thinQCommands.powerOff();
      } catch (error) {
        this.log.error('Failed to power off via ThinQ:', error);
        return false;
      }
    }

    try {
      return await this.webOSCommands.powerOff();
    } catch (error) {
      this.log.error('Failed to power off via WebOS:', error);
      return false;
    }
  }

  /**
   * Get TV volume
   */
  async getVolume(): Promise<number | null> {
    if (!this.connected) {
      this.log.warn('Cannot get volume: Not connected');
      return null;
    }

    try {
      return await this.webOSCommands.getVolume();
    } catch (error) {
      this.log.error('Failed to get volume:', error);
      return null;
    }
  }

  /**
   * Set volume
   */
  async setVolume(volume: number): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot set volume: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.setVolume(volume);
    } catch (error) {
      this.log.error('Failed to set volume:', error);
      return false;
    }
  }

  /**
   * Volume up
   */
  async volumeUp(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot increase volume: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.volumeUp();
    } catch (error) {
      this.log.error('Failed to increase volume:', error);
      return false;
    }
  }

  /**
   * Volume down
   */
  async volumeDown(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot decrease volume: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.volumeDown();
    } catch (error) {
      this.log.error('Failed to decrease volume:', error);
      return false;
    }
  }

  /**
   * Set mute
   */
  async setMute(mute: boolean): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot set mute: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.setMute(mute);
    } catch (error) {
      this.log.error('Failed to set mute:', error);
      return false;
    }
  }

  /**
   * Get mute state
   */
  async getMute(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot get mute state: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.getMute();
    } catch (error) {
      this.log.error('Failed to get mute state:', error);
      return false;
    }
  }

  /**
   * Set input source
   */
  async setInput(inputId: string): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot set input: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.setInput(inputId);
    } catch (error) {
      this.log.error('Failed to set input:', error);
      return false;
    }
  }

  /**
   * Get current input source
   */
  async getCurrentInput(): Promise<string | null> {
    try {
      const foregroundApp = await this.webOSCommands.getCurrentApp();
      if (foregroundApp && foregroundApp.appId) {
        return foregroundApp.appId;
      }
      return null;
    } catch (error) {
      this.log.error(`Error getting current input: ${error}`);
      return null;
    }
  }

  /**
   * Play media
   */
  async play(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot play: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.play();
    } catch (error) {
      this.log.error('Failed to play:', error);
      return false;
    }
  }

  /**
   * Pause media
   */
  async pause(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot pause: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.pause();
    } catch (error) {
      this.log.error('Failed to pause:', error);
      return false;
    }
  }

  /**
   * Stop media
   */
  async stop(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot stop: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.stop();
    } catch (error) {
      this.log.error('Failed to stop:', error);
      return false;
    }
  }

  /**
   * Rewind media
   */
  async rewind(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot rewind: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.rewind();
    } catch (error) {
      this.log.error('Failed to rewind:', error);
      return false;
    }
  }

  /**
   * Fast forward media
   */
  async fastForward(): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot fast forward: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.fastForward();
    } catch (error) {
      this.log.error('Failed to fast forward:', error);
      return false;
    }
  }

  /**
   * Launch app
   */
  async launchApp(appId: string): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot launch app: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.launchApp(appId);
    } catch (error) {
      this.log.error(`Failed to launch app ${appId}:`, error);
      return false;
    }
  }

  /**
   * Send a remote control button press
   */
  async sendRemoteButton(button: string): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot send remote button: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.sendButton(button);
    } catch (error) {
      this.log.error(`Failed to send button ${button}:`, error);
      return false;
    }
  }

  /**
   * Set channel by number
   */
  async setChannel(channelId: string): Promise<boolean> {
    if (!this.connected) {
      this.log.warn('Cannot set channel: Not connected');
      return false;
    }

    try {
      return await this.webOSCommands.setChannel(channelId);
    } catch (error) {
      this.log.error('Failed to set channel:', error);
      return false;
    }
  }

  /**
   * Set energy saving mode
   */
  async setEnergySaving(enabled: boolean): Promise<boolean> {
    if (!this.thinQCommands) {
      this.log.warn('Cannot set energy saving: ThinQ not configured');
      return false;
    }

    try {
      return await this.thinQCommands.setEnergySaving(enabled ? 'on' : 'off');
    } catch (error) {
      this.log.error('Failed to set energy saving:', error);
      return false;
    }
  }

  /**
   * Get energy saving status
   */
  async getEnergySaving(): Promise<boolean> {
    if (!this.thinQCommands) {
      this.log.warn('Cannot get energy saving status: ThinQ not configured');
      return false;
    }

    try {
      // Use the improved status method
      const status = await this.thinQCommands.getStatus();
      return status?.energySaving === 'on';
    } catch (error) {
      this.log.error('Failed to get energy saving status:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Enable or disable AI recommendations
   */
  async enableAIRecommendation(enabled: boolean): Promise<boolean> {
    if (!this.thinQCommands) {
      this.log.warn('Cannot set AI recommendation: ThinQ not configured');
      return false;
    }

    try {
      return await this.thinQCommands.enableAIRecommendation(enabled);
    } catch (error) {
      this.log.error('Failed to set AI recommendation:', error);
      return false;
    }
  }

  /**
   * Get AI recommendation status
   */
  async getAIRecommendation(): Promise<boolean> {
    if (!this.thinQCommands) {
      this.log.warn('Cannot get AI recommendation status: ThinQ not configured');
      return false;
    }

    try {
      // Use the improved status method
      const status = await this.thinQCommands.getStatus();
      return status?.aiRecommendation === true;
    } catch (error) {
      this.log.error('Failed to get AI recommendation status:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Set picture mode
   */
  async setPictureMode(mode: string): Promise<boolean> {
    if (!this.connected) {
      if (!this.thinQCommands) {
        this.log.warn('Cannot set picture mode: Not connected and ThinQ not configured');
        return false;
      }

      try {
        return await this.thinQCommands.setPictureMode(mode);
      } catch (error) {
        this.log.error('Failed to set picture mode via ThinQ:', error);
        return false;
      }
    }

    try {
      return await this.webOSCommands.setPictureMode(mode);
    } catch (error) {
      this.log.error('Failed to set picture mode via WebOS:', error);
      return false;
    }
  }

  /**
   * Get current picture mode
   */
  async getPictureMode(): Promise<string | null> {
    if (!this.connected) {
      if (!this.thinQCommands) {
        this.log.warn('Cannot get picture mode: Not connected and ThinQ not configured');
        return null;
      }

      try {
        // Use the improved status method
        const status = await this.thinQCommands.getStatus();
        return status?.pictureMode || null;
      } catch (error) {
        this.log.error('Failed to get picture mode via ThinQ:', error instanceof Error ? error.message : String(error));
        return null;
      }
    }

    try {
      // This is a placeholder - you'd need to implement the actual API call
      // For now, we'll return a default value
      return 'standard';
    } catch (error) {
      this.log.error('Failed to get picture mode via WebOS:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Check if a device capability is supported
   */
  supportsCapability(capability: string): boolean {
    if (this.thinQCommands) {
      return this.thinQCommands.supportsCapability(capability);
    }
    return false;
  }

  /**
   * Get current power state 
   */
  async isPoweredOn(): Promise<boolean> {
    // First try WebOS connection state
    if (this.connected) {
      return true;
    }
    
    // If not connected via WebOS, try ThinQ
    if (this.thinQCommands) {
      try {
        return await this.thinQCommands.getPowerState();
      } catch (error) {
        this.log.debug('Failed to get power state via ThinQ:', error instanceof Error ? error.message : String(error));
      }
    }
    
    return false;
  }
} 