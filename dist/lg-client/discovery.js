"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TVDiscovery = void 0;
const events_1 = require("events");
const dgram = __importStar(require("dgram"));
const http = __importStar(require("http"));
const url = __importStar(require("url"));
class TVDiscovery extends events_1.EventEmitter {
    constructor(log) {
        super();
        this.log = log;
        this.SSDP_ADDRESS = '239.255.255.250';
        this.SSDP_PORT = 1900;
        this.SEARCH_TARGET = 'urn:dial-multiscreen-org:service:dial:1';
        this.TV_SEARCH_TIMEOUT = 10000; // 10 seconds
        this.socket = null;
        this.discoveredDevices = new Map();
        this.isSearching = false;
    }
    /**
     * Search for LG TVs on the network using SSDP
     */
    async search(timeout) {
        if (this.isSearching) {
            this.log.warn('TV discovery is already in progress');
            return Array.from(this.discoveredDevices.values());
        }
        this.isSearching = true;
        this.discoveredDevices.clear();
        try {
            return await this.performSearch(timeout || this.TV_SEARCH_TIMEOUT);
        }
        finally {
            this.isSearching = false;
        }
    }
    /**
     * Perform the SSDP search
     */
    performSearch(timeout) {
        return new Promise((resolve) => {
            this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.socket.on('error', (err) => {
                var _a;
                this.log.error('SSDP discovery error:', err);
                (_a = this.socket) === null || _a === void 0 ? void 0 : _a.close();
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
                const searchMessage = Buffer.from('M-SEARCH * HTTP/1.1\r\n' +
                    `HOST: ${this.SSDP_ADDRESS}:${this.SSDP_PORT}\r\n` +
                    'MAN: "ssdp:discover"\r\n' +
                    'MX: 5\r\n' +
                    `ST: ${this.SEARCH_TARGET}\r\n` +
                    '\r\n');
                this.socket.send(searchMessage, 0, searchMessage.length, this.SSDP_PORT, this.SSDP_ADDRESS);
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
    processResponse(message, ipAddress) {
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
    fetchDeviceInfo(locationUrl, ipAddress) {
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
                    const device = {
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
    static async discoverTVs(log) {
        const discovery = new TVDiscovery(log);
        return discovery.search();
    }
}
exports.TVDiscovery = TVDiscovery;
//# sourceMappingURL=discovery.js.map