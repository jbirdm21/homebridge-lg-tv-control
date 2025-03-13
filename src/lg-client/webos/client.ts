import { EventEmitter } from 'events';
import WebSocket from 'ws';
import * as wol from 'wake_on_lan';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'homebridge';

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
}

// WebOS message interface
interface WebOSMessage {
  id?: string;
  type: string;
  uri?: string;
  payload?: any;
}

interface WebOSResponse {
  id?: string;
  type: string;
  returnValue: boolean;
  payload?: any;
  [key: string]: any;
}

/**
 * WebOS Client for communicating with LG TVs
 */
export class WebOSClient extends EventEmitter {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private ws: WebSocket | null = null;
  private clientKey: string | undefined;
  private messageCallbacks: { [key: string]: (response: WebOSResponse) => void } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 2000;
  private storageDir: string;
  private keyFilePath: string;
  private connected = false;
  private commandSocketUrl: string | null = null;
  private commandWs: WebSocket | null = null;

  /**
   * Create a new WebOS client
   */
  constructor(
    private readonly ipAddress: string,
    clientKey?: string,
    private readonly log: Logger = console as unknown as Logger,
  ) {
    super();
    
    if (clientKey) {
      this.clientKey = clientKey;
    }

    // Set up storage directory
    this.storageDir = path.join(process.env.HOME || '', '.homebridge');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // Set up key file path
    this.keyFilePath = path.join(this.storageDir, `lg-webos-key-${this.ipAddress}.json`);
    this.loadClientKey();
  }

  /**
   * Load client key from storage
   */
  private loadClientKey(): void {
    if (this.clientKey) {
      return; // Already have a client key
    }

    if (fs.existsSync(this.keyFilePath)) {
      try {
        const data = fs.readFileSync(this.keyFilePath, 'utf8');
        const keyData = JSON.parse(data);
        if (keyData.clientKey) {
          this.clientKey = keyData.clientKey;
          this.log.debug(`Loaded client key for ${this.ipAddress}`);
        }
      } catch (error) {
        this.log.error(`Error loading WebOS client key: ${error}`);
      }
    }
  }

  /**
   * Save client key to storage
   */
  private saveClientKey(): void {
    if (!this.clientKey) {
      return;
    }

    try {
      const data = JSON.stringify({ clientKey: this.clientKey });
      fs.writeFileSync(this.keyFilePath, data, 'utf8');
      this.log.debug(`Saved client key for ${this.ipAddress}`);
    } catch (error) {
      this.log.error(`Error saving WebOS client key: ${error}`);
    }
  }

  /**
   * Connect to the TV
   */
  async connect(): Promise<boolean> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return true;
    }

    if (this.connectionState === ConnectionState.CONNECTING) {
      this.log.debug('Already connecting to TV');
      return false;
    }

    this.connectionState = ConnectionState.CONNECTING;
    
    return new Promise<boolean>((resolve) => {
      try {
        // Connect WebSocket to TV
        this.log.debug(`Connecting to WebOS TV at ${this.ipAddress}`);
        
        try {
          this.ws = new WebSocket(`ws://${this.ipAddress}:3000`);
        } catch (wsError) {
          // Try dynamic import if constructor fails
          this.log.debug('WebSocket constructor failed, trying dynamic import:', wsError);
          try {
            const WS = require('ws');
            this.ws = new WS(`ws://${this.ipAddress}:3000`);
          } catch (requireError) {
            this.log.error('Failed to create WebSocket connection:', requireError);
            this.connectionState = ConnectionState.DISCONNECTED;
            resolve(false);
            return;
          }
        }

        // Handle WebSocket open event
        this.ws.on('open', () => {
          this.log.debug('WebSocket connection established');
          this.reconnectAttempts = 0;
          this.sendRegisterMessage();
        });

        // Handle WebSocket message event
        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.log.error('Failed to parse WebSocket message:', error);
          }
        });

        // Handle WebSocket close event
        this.ws.on('close', () => {
          this.log.debug('WebSocket connection closed');
          this.connectionState = ConnectionState.DISCONNECTED;
          this.emit('disconnect');
          this.attemptReconnect();
          resolve(false);
        });

        // Handle WebSocket error event
        this.ws.on('error', (error) => {
          this.log.error('WebSocket error:', error);
          this.connectionState = ConnectionState.DISCONNECTED;
          this.emit('error', error);
          resolve(false);
        });

        // Set a timeout in case connection hangs
        setTimeout(() => {
          if (this.connectionState !== ConnectionState.CONNECTED) {
            this.log.error('Connection timeout');
            this.connectionState = ConnectionState.DISCONNECTED;
            if (this.ws) {
              this.ws.terminate();
              this.ws = null;
            }
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        this.log.error('Failed to connect to WebOS TV:', error);
        this.connectionState = ConnectionState.DISCONNECTED;
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from the TV
   */
  async disconnect(): Promise<void> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }

    this.connectionState = ConnectionState.DISCONNECTING;

    return new Promise<void>((resolve) => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.connectionState = ConnectionState.DISCONNECTED;
      this.emit('disconnect');
      resolve();
    });
  }

  /**
   * Attempt to reconnect to the TV
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.reconnectAttempts = 0;
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  /**
   * Power on the TV using Wake on LAN
   */
  async powerOn(macAddress: string): Promise<void> {
    if (!macAddress) {
      throw new Error('MAC address is required for power on');
    }

    return new Promise<void>((resolve, reject) => {
      wol.wake(macAddress, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Send a message to the TV
   */
  async sendMessage(message: WebOSMessage): Promise<any> {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return Promise.reject(new Error('Not connected to TV'));
    }

    if (!this.ws) {
      return Promise.reject(new Error('WebSocket is not initialized'));
    }

    return new Promise((resolve, reject) => {
      // Generate a random message ID
      const messageId = crypto.randomBytes(16).toString('hex');
      message.id = messageId;

      // Register callback for this message
      this.messageCallbacks[messageId] = (response: WebOSResponse) => {
        if (response.type === 'error') {
          reject(new Error(response.error || 'Unknown error'));
        } else {
          resolve(response);
        }
        delete this.messageCallbacks[messageId];
      };

      // Send the message
      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          delete this.messageCallbacks[messageId];
          reject(error);
        }
      });
    });
  }

  /**
   * Handle incoming messages from the TV
   */
  private handleMessage(message: any): void {
    // Handle registration response
    if (message.type === 'registered') {
      this.log.debug('WebOS client registered with TV');
      this.connectionState = ConnectionState.CONNECTED;
      this.emit('connect');
      return;
    }

    // Handle registration prompt
    if (message.type === 'response' && message.payload?.pairingType === 'PROMPT') {
      this.log.warn('WebOS client requires pairing. Please accept the prompt on the TV.');
      this.emit('prompt');
      return;
    }

    // Handle client key response
    if (message.type === 'response' && message.payload?.client_key) {
      this.clientKey = message.payload.client_key;
      this.log.debug('Received client key from TV');
      this.saveClientKey();
      this.emit('clientKey', this.clientKey);
    }

    // Handle response messages
    if (message.id && this.messageCallbacks[message.id]) {
      const callback = this.messageCallbacks[message.id];
      callback(message);
    }
  }

  /**
   * Send registration message to the TV
   */
  private sendRegisterMessage(): void {
    if (!this.ws) {
      return;
    }

    const registerMessage: WebOSMessage = {
      type: 'register',
      payload: {
        pairingType: 'PROMPT',
        manifest: {
          manifestVersion: 1,
          appVersion: '1.0',
          signed: {
            created: new Date().toISOString(),
            appId: 'com.homebridge.lg-tv-control',
            vendorId: 'com.homebridge',
            localizedAppNames: {
              '': 'Homebridge LG TV Control',
            },
            localizedVendorNames: {
              '': 'Homebridge',
            },
            permissions: [
              'CONTROL_POWER',
              'CONTROL_DISPLAY',
              'CONTROL_AUDIO',
              'CONTROL_INPUT',
              'CONTROL_MOUSE_AND_KEYBOARD',
              'READ_INSTALLED_APPS',
              'READ_LGE_TV_INPUT_LIST',
              'READ_TV_CURRENT_CHANNEL',
              'LAUNCH',
              'LAUNCH_WEBAPP',
              'APP_TO_APP',
              'READ_UPDATE_INFO',
              'UPDATE_FROM_REMOTE_APP',
              'READ_CURRENT_CHANNEL',
              'READ_RUNNING_APPS',
              'READ_INPUT_DEVICE_LIST',
            ],
            serial: crypto.randomBytes(16).toString('hex'),
          },
        },
      },
    };

    // Add client key if available
    if (this.clientKey) {
      registerMessage.payload.client_key = this.clientKey;
    }

    // Send registration message
    this.ws.send(JSON.stringify(registerMessage), (error) => {
      if (error) {
        this.log.error('Failed to send registration message:', error);
      }
    });
  }

  /**
   * Send a request to the TV
   */
  request(uri: string, payload: any = {}): Promise<WebOSResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject(new Error('Not connected'));
        return;
      }

      const id = crypto.randomBytes(16).toString('hex');
      const message: WebOSMessage = {
        id,
        type: 'request',
        uri,
        payload
      };

      // Register callback for this message
      this.messageCallbacks[id] = (response: WebOSResponse) => {
        resolve(response);
      };

      // Set timeout to clean up callback if no response
      setTimeout(() => {
        if (this.messageCallbacks[id]) {
          delete this.messageCallbacks[id];
          reject(new Error('Request timed out'));
        }
      }, 5000);

      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        delete this.messageCallbacks[id];
        reject(error);
      }
    });
  }

  /**
   * Send a button to the TV
   */
  async sendButton(button: string): Promise<boolean> {
    if (!this.commandSocketUrl && !this.commandWs) {
      // Get the command socket URL if we don't have it
      try {
        const response = await this.request('ssap://com.webos.service.networkinput/getPointerInputSocket');
        if (response.returnValue === true && response.socketPath) {
          this.commandSocketUrl = response.socketPath;
        } else {
          throw new Error('Failed to get pointer input socket');
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('Unknown error getting pointer input socket');
        }
      }
    }

    return new Promise((resolve, reject) => {
      // Function to send the button command
      const sendButtonCommand = () => {
        if (!this.commandWs) {
          reject(new Error('Command socket not available'));
          return;
        }
        
        try {
          const buttonCommand = {
            type: 'button',
            name: button
          };
          
          this.commandWs.send(JSON.stringify(buttonCommand));
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      // Connect to the command socket if not already connected
      if (!this.commandWs && this.commandSocketUrl) {
        this.commandWs = new WebSocket(this.commandSocketUrl);
        
        this.commandWs.on('error', (error) => {
          this.commandWs = null;
          reject(error);
        });

        this.commandWs.on('close', () => {
          this.commandWs = null;
        });

        // Wait for the connection to open before sending the button
        this.commandWs.on('open', () => {
          sendButtonCommand();
        });
      } else if (this.commandWs) {
        // If already connected, send the button
        sendButtonCommand();
      } else {
        reject(new Error('Cannot send button: No command socket'));
      }
    });
  }
} 