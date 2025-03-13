import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from 'homebridge';

interface WebOSClientOptions {
  connectionTimeout?: number;
  reconnectInterval?: number;
}

interface WebOSResponse {
  id: string;
  type: string;
  payload?: any;
  returnValue?: boolean;
  [key: string]: any;
}

/**
 * WebOS client for communicating with LG TVs
 */
export class WebOSClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private clientKey: string | null = null;
  private keyFile: string;
  private connected = false;
  private connecting = false;
  private commandId = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private responseCallbacks: Map<number, { 
    resolve: (value: any) => void; 
    reject: (reason: any) => void; 
    timeout: NodeJS.Timeout;
  }> = new Map();
  private requestIdCounter = 0;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private connectionAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(
    private readonly ipAddress: string,
    private readonly log: Logger,
    private readonly config: any,
    private readonly options: WebOSClientOptions = {},
    storagePath?: string,
  ) {
    super();
    
    // Set up file path for storing client key
    const storageDir = storagePath || process.env.HOME || '.';
    this.keyFile = path.join(storageDir, `webos-${ipAddress.replace(/\./g, '-')}.key`);
    
    // Try to load the client key from the key file
    this.loadClientKey();
  }
  
  private loadClientKey() {
    try {
      if (fs.existsSync(this.keyFile)) {
        this.clientKey = fs.readFileSync(this.keyFile, 'utf8');
        this.log.debug(`Loaded client key for ${this.ipAddress}`);
      }
    } catch (error) {
      this.log.error(`Error loading client key for ${this.ipAddress}:`, error);
    }
  }
  
  private saveClientKey() {
    try {
      fs.writeFileSync(this.keyFile, this.clientKey!, 'utf8');
      this.log.debug(`Saved client key for ${this.ipAddress}`);
    } catch (error) {
      this.log.error(`Error saving client key for ${this.ipAddress}:`, error);
    }
  }
  
  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }
    
    if (this.connecting) {
      this.log.debug(`Already connecting to ${this.ipAddress}`);
      return new Promise((resolve) => {
        this.once('connect', () => resolve(true));
        this.once('error', () => resolve(false));
      });
    }
    
    this.connecting = true;
    
    // Clear any existing reconnection timer
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset connection attempts if it's a fresh connection
    if (this.connectionAttempts === 0) {
      this.connectionAttempts = 0;
    }
    
    try {
      const wsUrl = `ws://${this.ipAddress}:3000`;
      this.log.debug(`Connecting to ${wsUrl}`);
      
      // Create a promise for the connection attempt
      return new Promise((resolve, reject) => {
        // Set a timeout for the connection attempt
        const timeoutMs = this.options.connectionTimeout || 10000;
        this.connectionTimeout = setTimeout(() => {
          this.log.debug(`Connection to ${this.ipAddress} timed out`);
          this.connecting = false;
          this.ws?.close();
          reject(new Error('Connection timed out'));
        }, timeoutMs);
        
        // Create the WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        // Handle WebSocket events
        this.ws.on('open', () => {
          this.log.debug(`WebSocket connection established to ${this.ipAddress}`);
          clearTimeout(this.connectionTimeout!);
          
          // Start the registration/handshake process
          this.register();
        });
        
        this.ws.on('message', (data: string) => {
          this.handleMessage(data);
        });
        
        this.ws.on('close', () => {
          this.log.debug(`WebSocket connection closed to ${this.ipAddress}`);
          this.handleDisconnect();
          resolve(false);
        });
        
        this.ws.on('error', (error) => {
          this.log.error(`WebSocket error for ${this.ipAddress}:`, error);
          clearTimeout(this.connectionTimeout!);
          this.handleDisconnect();
          reject(error);
        });
        
        // Resolve the connection promise when we're fully connected
        this.once('connect', () => {
          clearTimeout(this.connectionTimeout!);
          resolve(true);
        });
      });
    } catch (error) {
      this.log.error(`Failed to connect to ${this.ipAddress}:`, error);
      this.connecting = false;
      return false;
    }
  }
  
  private async register() {
    try {
      // Check if we have a client key
      if (this.clientKey) {
        // Try registering with the stored client key
        const registerResponse = await this.sendCommand('ssap://pairing/registerClient', {
          'client-key': this.clientKey,
          'pairingType': 'PROMPT',
          'manifest': {
            'appId': 'homebridge-lg-c3-tv-control',
            'manifestVersion': 1,
            'permissions': [
              'LAUNCH',
              'LAUNCH_WEBAPP',
              'APP_TO_APP',
              'CONTROL_AUDIO',
              'CONTROL_DISPLAY',
              'CONTROL_INPUT_JOYSTICK',
              'CONTROL_INPUT_MEDIA_PLAYBACK',
              'CONTROL_INPUT_TV',
              'CONTROL_POWER',
              'READ_APP_STATUS',
              'READ_CURRENT_CHANNEL',
              'READ_INPUT_DEVICE_LIST',
              'READ_NETWORK_STATE',
              'READ_TV_CHANNEL_LIST',
              'WRITE_NOTIFICATION_ALERT',
            ],
          },
        }, true);
        
        if (registerResponse.type === 'registered') {
          this.log.info(`Successfully registered with ${this.ipAddress} using stored client key`);
          this.connected = true;
          this.connecting = false;
          this.setupPingInterval();
          this.emit('connect');
        } else if (registerResponse.type === 'error') {
          this.log.warn(`Failed to register with stored client key: ${registerResponse.error}`);
          // Try registering without the client key
          this.clientKey = null;
          await this.register();
        }
      } else {
        // Register without a client key
        const registerResponse = await this.sendCommand('ssap://pairing/registerClient', {
          'pairingType': 'PROMPT',
          'manifest': {
            'appId': 'homebridge-lg-c3-tv-control',
            'manifestVersion': 1,
            'permissions': [
              'LAUNCH',
              'LAUNCH_WEBAPP',
              'APP_TO_APP',
              'CONTROL_AUDIO',
              'CONTROL_DISPLAY',
              'CONTROL_INPUT_JOYSTICK',
              'CONTROL_INPUT_MEDIA_PLAYBACK',
              'CONTROL_INPUT_TV',
              'CONTROL_POWER',
              'READ_APP_STATUS',
              'READ_CURRENT_CHANNEL',
              'READ_INPUT_DEVICE_LIST',
              'READ_NETWORK_STATE',
              'READ_TV_CHANNEL_LIST',
              'WRITE_NOTIFICATION_ALERT',
            ],
          },
        }, true);
        
        if (registerResponse.type === 'registered') {
          this.clientKey = registerResponse.payload['client-key'];
          this.saveClientKey();
          this.log.info(`Successfully registered with ${this.ipAddress} and saved new client key`);
          this.connected = true;
          this.connecting = false;
          this.setupPingInterval();
          this.emit('connect');
        } else {
          this.log.error(`Failed to register with ${this.ipAddress}: ${JSON.stringify(registerResponse)}`);
          this.connecting = false;
          this.scheduleReconnect();
        }
      }
    } catch (error) {
      this.log.error(`Registration error with ${this.ipAddress}:`, error);
      this.connecting = false;
      this.scheduleReconnect();
    }
  }
  
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      const id = message.id;
      
      // Log messages except for pings
      if (!message.uri || message.uri !== 'ssap://com.webos.service.networkinput/getPointerInputSocket') {
        this.log.debug(`Received message from ${this.ipAddress}: ${data}`);
      }
      
      // Update state based on message type
      if (message.type === 'error') {
        // For registration errors, we might need to prompt the user
        if (message.uri === 'ssap://pairing/registerClient') {
          this.log.warn(`Registration error: ${message.error}`);
        }
      } else if (message.type === 'registered') {
        // Successfully registered with the TV
        this.clientKey = message.payload['client-key'];
        this.saveClientKey();
      }
      
      // If this is a response to a command, resolve the promise
      if (id && this.responseCallbacks.has(id)) {
        const { resolve, reject, timeout } = this.responseCallbacks.get(id)!;
        clearTimeout(timeout);
        
        if (message.type === 'error') {
          reject(new Error(message.error || 'Unknown error'));
        } else {
          resolve(message);
        }
        
        this.responseCallbacks.delete(id);
      }
      
      // Emit the message for event listeners
      this.emit('message', message);
      
      // Emit state updates for specific services
      if (message.payload) {
        // Each service has its own event with the formatted payload
        this.emit('state', this.formatState(message));
      }
    } catch (error) {
      this.log.error(`Error parsing message from ${this.ipAddress}:`, error, data);
    }
  }
  
  private formatState(message: any) {
    // Extract the service name from the URI
    const uri = message.uri || '';
    const serviceName = uri.split('://')[1]?.split('/')[0];
    
    if (!serviceName) {
      return {};
    }
    
    // Extract relevant data based on the service
    switch (serviceName) {
      case 'audio':
        return { 
          volume: message.payload.volume,
          muted: message.payload.muted
        };
        
      case 'tv':
        return { 
          channel: message.payload.channelNumber,
          channelName: message.payload.channelName 
        };
        
      case 'system':
        if (uri.includes('getSystemInfo')) {
          return { 
            modelName: message.payload.modelName,
            serialNumber: message.payload.serialNumber
          };
        }
        break;
        
      case 'system.launcher':
        return { 
          appId: message.payload.id,
          appName: message.payload.name 
        };
        
      default:
        return message.payload;
    }
    
    return {};
  }
  
  private handleDisconnect() {
    this.connected = false;
    this.connecting = false;
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clear all outstanding callbacks
    this.responseCallbacks.forEach((value, id) => {
      clearTimeout(value.timeout);
      value.reject(new Error('Connection closed'));
      this.responseCallbacks.delete(id);
    });
    
    // Close WebSocket if it's still open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    
    this.ws = null;
    
    // Emit disconnect event
    this.emit('disconnect');
    
    // Schedule reconnection
    this.scheduleReconnect();
  }
  
  private scheduleReconnect() {
    if (!this.reconnectTimeout) {
      const reconnectInterval = this.options.reconnectInterval || 5000;
      this.log.debug(`Scheduling reconnect to ${this.ipAddress} in ${reconnectInterval}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect().catch(error => {
          this.log.error(`Reconnect failed: ${error.message}`);
        });
      }, reconnectInterval);
    }
  }
  
  private setupPingInterval() {
    // Clear any existing ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Set up a new ping interval to keep the connection alive
    this.pingInterval = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendCommand('ssap://com.webos.service.networkinput/getPointerInputSocket')
          .catch(error => {
            this.log.debug(`Ping failed: ${error.message}`);
          });
      }
    }, 30000); // Send a ping every 30 seconds
  }
  
  async sendCommand(uri: string, payload: any = {}, ignoreClientKey = false): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to TV');
    }
    
    // Increment the command ID
    this.commandId++;
    const id = this.commandId;
    
    // Prepare the command message
    const message: any = {
      id,
      type: 'request',
      uri,
      payload
    };
    
    // Add client key if we have one and this command type needs it
    if (this.clientKey && !ignoreClientKey) {
      payload['client-key'] = this.clientKey;
    }
    
    return new Promise((resolve, reject) => {
      // Set up a timeout for the command
      const timeout = setTimeout(() => {
        if (this.responseCallbacks.has(id)) {
          this.responseCallbacks.delete(id);
          reject(new Error(`Command timed out: ${uri}`));
        }
      }, 10000);
      
      // Store the callbacks
      this.responseCallbacks.set(id, { resolve, reject, timeout });
      
      // Send the command
      try {
        this.ws!.send(JSON.stringify(message));
        this.log.debug(`Sent command to ${this.ipAddress}: ${uri}`);
      } catch (error) {
        clearTimeout(timeout);
        this.responseCallbacks.delete(id);
        reject(error);
      }
    });
  }
  
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.connecting = false;
    
    // Reject any pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
  
  /**
   * Send handshake message to start the connection
   */
  private sendHandshake() {
    const handshake = {
      type: 'register',
      id: this.getNextRequestId(),
      payload: {
        forcePairing: false,
        pairingType: 'PROMPT',
        manifest: {
          manifestVersion: 1,
          appVersion: '1.0.0',
          signed: {
            created: new Date().toISOString(),
            appId: 'com.lgtv.homebridge',
            vendorId: 'com.lgtv.homebridge',
            localizedAppNames: {
              '': 'Homebridge LG TV Control',
              'en-US': 'Homebridge LG TV Control',
            },
            localizedVendorNames: {
              '': 'Homebridge',
              'en-US': 'Homebridge',
            },
            permissions: [
              'CONTROL_TV_POWER',
              'READ_TV_CURRENT_CHANNEL',
              'CONTROL_TV_VOLUME',
              'CONTROL_TV_SCREEN_SHARE',
              'CONTROL_TV_CONTENT_SHARE',
              'READ_TV_INSTALLATIONS',
              'CONTROL_TV_CHANNELS_SWITCH',
              'READ_TV_CHANNELS',
              'CONTROL_TV_TUNERS',
              'CONTROL_TV_3D_MODE',
            ],
          },
        },
        clientKey: this.clientKey || undefined,
      },
    };
    
    this.sendMessage(handshake);
  }
  
  /**
   * Send a message to the TV
   */
  private sendMessage(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    this.log.debug('Sending message:', JSON.stringify(message));
    this.ws.send(JSON.stringify(message));
  }
  
  /**
   * Get the next unique request ID
   */
  private getNextRequestId(): string {
    return `req_${++this.requestIdCounter}`;
  }
  
  /**
   * Send a request to the TV and wait for a response
   */
  async request(uri: string, payload: any = {}): Promise<WebOSResponse> {
    if (!this.connected) {
      await this.connect();
    }
    
    return new Promise<WebOSResponse>((resolve, reject) => {
      try {
        const id = this.getNextRequestId();
        
        // Split the URI into service and method
        const [service, method] = uri.split('.');
        const formattedUri = `ssap://${service}/${method}`;
        
        const message = {
          id,
          type: 'request',
          uri: formattedUri,
          payload,
        };
        
        // Store the request with timeout management
        this.pendingRequests.set(id, {
          resolve: (value: WebOSResponse) => {
            clearTimeout(timeout);
            resolve(value);
          },
          reject: (reason: any) => {
            clearTimeout(timeout);
            reject(reason);
          }
        });
        
        // Set a timeout for the request
        const timeoutMs = this.options.connectionTimeout || 10000;
        const timeout = setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`Request timeout: ${uri}`));
          }
        }, timeoutMs);
        
        // Send the request
        this.sendMessage(message);
      } catch (error) {
        reject(error);
      }
    });
  }
} 