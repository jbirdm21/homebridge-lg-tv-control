import { Logger } from 'homebridge';
import { WebOSClient } from './client';

/**
 * WebOS Commands for controlling LG TV
 */
export class WebOSCommands {
  /**
   * Create a new WebOS commands instance
   */
  constructor(
    private readonly client: WebOSClient,
    private readonly log: Logger,
  ) {}

  /**
   * Power off the TV
   */
  async powerOff(): Promise<boolean> {
    const response = await this.client.request('ssap://system/turnOff');
    return response.returnValue === true;
  }

  /**
   * Get the current volume
   */
  async getVolume(): Promise<number> {
    try {
      const response = await this.client.request('ssap://audio/getVolume');
      if (response.returnValue === true) {
        return response.volume || 0;
      }
      return 0;
    } catch (error) {
      this.log.error('Error getting volume:', error);
      return 0;
    }
  }

  /**
   * Set the volume
   */
  async setVolume(volume: number): Promise<boolean> {
    const response = await this.client.request('ssap://audio/setVolume', {
      volume: Math.max(0, Math.min(100, volume))
    });
    return response.returnValue === true;
  }

  /**
   * Increase the volume
   */
  async volumeUp(): Promise<boolean> {
    const response = await this.client.request('ssap://audio/volumeUp');
    return response.returnValue === true;
  }

  /**
   * Decrease the volume
   */
  async volumeDown(): Promise<boolean> {
    const response = await this.client.request('ssap://audio/volumeDown');
    return response.returnValue === true;
  }

  /**
   * Set the mute state
   */
  async setMute(mute: boolean): Promise<boolean> {
    const response = await this.client.request('ssap://audio/setMute', {
      mute
    });
    return response.returnValue === true;
  }

  /**
   * Get current mute state
   */
  async getMute(): Promise<boolean> {
    try {
      const response = await this.client.request('ssap://audio/getVolume');
      if (response.returnValue === true) {
        return response.muted === true;
      }
      return false;
    } catch (error) {
      this.log.error('Error getting mute state:', error);
      return false;
    }
  }

  /**
   * Set the input source
   */
  async setInput(inputId: string): Promise<boolean> {
    const response = await this.client.request('ssap://tv/switchInput', {
      inputId
    });
    return response.returnValue === true;
  }

  /**
   * Get the list of input sources
   */
  async getInputList(): Promise<any[] | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://tv/getExternalInputList',
      });

      if (response.returnValue === true) {
        return response.payload.devices;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting input list:', error);
      return null;
    }
  }

  /**
   * Set the channel
   */
  async setChannel(channelId: string): Promise<boolean> {
    const response = await this.client.request('ssap://tv/openChannel', {
      channelId
    });
    return response.returnValue === true;
  }

  /**
   * Get the current channel
   */
  async getCurrentChannel(): Promise<any | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://tv/getCurrentChannel',
      });

      if (response.returnValue === true) {
        return response.payload;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting current channel:', error);
      return null;
    }
  }

  /**
   * Get the current app
   */
  async getCurrentApp(): Promise<any | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.applicationManager/getForegroundAppInfo',
      });

      if (response.returnValue === true) {
        return response.payload;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting current app:', error);
      return null;
    }
  }

  /**
   * Launch an app
   */
  async launchApp(appId: string): Promise<boolean> {
    const response = await this.client.request('ssap://system.launcher/launch', {
      id: appId
    });
    return response.returnValue === true;
  }

  /**
   * Close an app
   */
  async closeApp(appId: string): Promise<boolean> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.applicationManager/close',
        payload: { id: appId },
      });
      return response.returnValue === true;
    } catch (error) {
      this.log.error('Error closing app:', error);
      return false;
    }
  }

  /**
   * Get the list of apps
   */
  async getAppList(): Promise<any[] | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.applicationManager/listApps',
      });

      if (response.returnValue === true) {
        return response.payload.apps;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting app list:', error);
      return null;
    }
  }

  /**
   * Send a remote control button
   */
  async sendButton(button: string): Promise<boolean> {
    // Map common button strings to button codes
    const buttonMap: { [key: string]: string } = {
      UP: 'UP',
      DOWN: 'DOWN',
      LEFT: 'LEFT',
      RIGHT: 'RIGHT',
      ENTER: 'ENTER',
      BACK: 'BACK',
      EXIT: 'EXIT',
      HOME: 'HOME',
      INFO: 'INFO',
      PLAY: 'PLAY',
      PAUSE: 'PAUSE',
      STOP: 'STOP',
      REWIND: 'REWIND',
      FASTFORWARD: 'FASTFORWARD',
      CHANNEL_UP: 'CH_UP',
      CHANNEL_DOWN: 'CH_DOWN',
      NUMBER_0: '0',
      NUMBER_1: '1',
      NUMBER_2: '2',
      NUMBER_3: '3',
      NUMBER_4: '4',
      NUMBER_5: '5',
      NUMBER_6: '6',
      NUMBER_7: '7',
      NUMBER_8: '8',
      NUMBER_9: '9'
    };

    // Convert button name to code if mapped
    const buttonCode = buttonMap[button] || button;

    const response = await this.client.request('ssap://com.webos.service.networkinput/getPointerInputSocket');
    if (response.returnValue !== true) {
      this.log.error('Failed to get pointer input socket');
      return false;
    }

    try {
      await this.client.sendButton(buttonCode);
      return true;
    } catch (error) {
      this.log.error(`Error sending button ${button}:`, error);
      return false;
    }
  }

  /**
   * Play media
   */
  async play(): Promise<boolean> {
    const response = await this.client.request('ssap://media.controls/play');
    return response.returnValue === true;
  }

  /**
   * Pause media
   */
  async pause(): Promise<boolean> {
    const response = await this.client.request('ssap://media.controls/pause');
    return response.returnValue === true;
  }

  /**
   * Stop media
   */
  async stop(): Promise<boolean> {
    const response = await this.client.request('ssap://media.controls/stop');
    return response.returnValue === true;
  }

  /**
   * Rewind media
   */
  async rewind(): Promise<boolean> {
    const response = await this.client.request('ssap://media.controls/rewind');
    return response.returnValue === true;
  }

  /**
   * Fast forward media
   */
  async fastForward(): Promise<boolean> {
    const response = await this.client.request('ssap://media.controls/fastForward');
    return response.returnValue === true;
  }

  /**
   * Get 3D status
   */
  async get3DStatus(): Promise<any | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.service.tv.display/get3DStatus',
      });

      if (response.returnValue === true) {
        return response.payload;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting 3D status:', error);
      return null;
    }
  }

  /**
   * Set 3D mode
   */
  async set3DOn(): Promise<boolean> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.service.tv.display/set3DOn',
      });
      return response.returnValue === true;
    } catch (error) {
      this.log.error('Error setting 3D on:', error);
      return false;
    }
  }

  /**
   * Set 3D off
   */
  async set3DOff(): Promise<boolean> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.service.tv.display/set3DOff',
      });
      return response.returnValue === true;
    } catch (error) {
      this.log.error('Error setting 3D off:', error);
      return false;
    }
  }

  /**
   * Get system info
   */
  async getSystemInfo(): Promise<any | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://system/getSystemInfo',
      });

      if (response.returnValue === true) {
        return response.payload;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting system info:', error);
      return null;
    }
  }

  /**
   * Get sound output
   */
  async getSoundOutput(): Promise<any | null> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.service.apiadapter/audio/getSoundOutput',
      });

      if (response.returnValue === true) {
        return response.payload;
      }
      return null;
    } catch (error) {
      this.log.error('Error getting sound output:', error);
      return null;
    }
  }

  /**
   * Set sound output
   */
  async setSoundOutput(output: string): Promise<boolean> {
    try {
      const response = await this.client.sendMessage({
        type: 'request',
        uri: 'ssap://com.webos.service.apiadapter/audio/changeSoundOutput',
        payload: { output },
      });
      return response.returnValue === true;
    } catch (error) {
      this.log.error('Error setting sound output:', error);
      return false;
    }
  }

  /**
   * Get TV inputs (HDMI, etc.)
   */
  async getInputs(): Promise<any[] | null> {
    try {
      const response = await this.client.request('ssap://tv/getExternalInputList');
      if (response.returnValue === true) {
        return response.devices || [];
      }
      return null;
    } catch (error) {
      this.log.error('Error getting inputs:', error);
      return null;
    }
  }

  /**
   * Get launchable apps
   */
  async getLaunchPoints(): Promise<any[] | null> {
    try {
      const response = await this.client.request('ssap://com.webos.applicationManager/listLaunchPoints');
      if (response.returnValue === true) {
        return response.launchPoints || [];
      }
      return null;
    } catch (error) {
      this.log.error('Error getting launch points:', error);
      return null;
    }
  }

  /**
   * Set picture mode
   */
  async setPictureMode(mode: string): Promise<boolean> {
    try {
      const response = await this.client.request('ssap://settings/setPictureMode', { mode });
      return response.returnValue === true;
    } catch (error) {
      this.log.error('Error setting picture mode:', error);
      return false;
    }
  }
} 