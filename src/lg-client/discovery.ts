import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import { Logger } from 'homebridge';
import * as http from 'http';
import * as url from 'url';

interface DiscoveredDevice {
  name: string;
  ip: string;
  mac?: string;
  modelName?: string;
}

export class TVDiscovery extends EventEmitter {
  private readonly SSDP_ADDRESS = '239.255.255.250';
  private readonly SSDP_PORT = 1900;
  private readonly SEARCH_TARGET = 'urn:dial-multiscreen-org:service:dial:1';
  private readonly TV_SEARCH_TIMEOUT = 10000; // 10 seconds
  private socket: dgram.Socket | null = null;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private isSearching = false;

  constructor(private readonly log: Logger) {
    super();
  }

  /**
   * Search for LG TVs on the network using SSDP
   */
  public async search(timeout?: number): Promise<DiscoveredDevice[]> {
    if (this.isSearching) {
      this.log.warn('TV discovery is already in progress');
      return Array.from(this.discoveredDevices.values());
    }

    this.isSearching = true;
    this.discoveredDevices.clear();

    try {
      return await this.performSearch(timeout || this.TV_SEARCH_TIMEOUT);
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Perform the SSDP search
   */
  private performSearch(timeout: number): Promise<DiscoveredDevice[]> {
    return new Promise((resolve) => {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        this.log.error('SSDP discovery error:', err);
        this.socket?.close();
        this.socket = null;
      });

      this.socket.on('message', (msg, rinfo) => {
        const message = msg.toString();
        if (message.includes('LG') && (message.includes('WebOS') || message.includes('webOS'))) {
          this.log.debug(`Received SSDP response from ${rinfo.address}`);
          this.processResponse(message, rinfo.address);
        }
      });

      this.socket.bind(() => {
        // Send M-SEARCH request
        const searchMessage = Buffer.from(
          'M-SEARCH * HTTP/1.1\r\n' +
          `HOST: ${this.SSDP_ADDRESS}:${this.SSDP_PORT}\r\n` +
          'MAN: "ssdp:discover"\r\n' +
          'MX: 5\r\n' +
          `ST: ${this.SEARCH_TARGET}\r\n` +
          '\r\n'
        );

        this.socket!.send(
          searchMessage,
          0,
          searchMessage.length,
          this.SSDP_PORT,
          this.SSDP_ADDRESS
        );

        this.log.debug('Sent SSDP discovery message, waiting for responses');
      });

      // Set timeout to finish discovery
      setTimeout(() => {
        if (this.socket) {
          this.socket.close();
          this.socket = null;
        }
        resolve(Array.from(this.discoveredDevices.values()));
      }, timeout);
    });
  }

  /**
   * Process a SSDP response
   */
  private processResponse(message: string, ipAddress: string): void {
    // Extract the location URL from the SSDP response
    const locationMatch = message.match(/LOCATION: (.*)/i);
    if (!locationMatch || !locationMatch[1]) {
      return;
    }

    const locationUrl = locationMatch[1].trim();
    
    // Get device information from the location URL
    this.fetchDeviceInfo(locationUrl, ipAddress);
  }

  /**
   * Fetch device information from the location URL
   */
  private fetchDeviceInfo(locationUrl: string, ipAddress: string): void {
    const parsedUrl = url.parse(locationUrl);
    if (!parsedUrl.hostname || !parsedUrl.path) {
      return;
    }

    const req = http.get(locationUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Parse the device info XML
        const friendlyNameMatch = data.match(/<friendlyName>([^<]*)<\/friendlyName>/i);
        const modelNameMatch = data.match(/<modelName>([^<]*)<\/modelName>/i);
        
        if (friendlyNameMatch) {
          const name = friendlyNameMatch[1];
          const modelName = modelNameMatch ? modelNameMatch[1] : undefined;
          
          const device: DiscoveredDevice = {
            name,
            ip: ipAddress,
            modelName,
          };
          
          this.discoveredDevices.set(ipAddress, device);
          this.emit('deviceFound', device);
          this.log.debug(`Found LG TV: ${name} (${ipAddress})`);
        }
      });
    });
    
    req.on('error', (err) => {
      this.log.error(`Error fetching device info from ${locationUrl}:`, err);
    });
    
    req.end();
  }

  /**
   * Static method to search for TVs
   */
  public static async discoverTVs(log: Logger): Promise<DiscoveredDevice[]> {
    const discovery = new TVDiscovery(log);
    return discovery.search();
  }
} 