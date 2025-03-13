/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logger } from 'homebridge';
interface DiscoveredDevice {
    name: string;
    ip: string;
    mac?: string;
    modelName?: string;
}
export declare class TVDiscovery extends EventEmitter {
    private readonly log;
    private readonly SSDP_ADDRESS;
    private readonly SSDP_PORT;
    private readonly SEARCH_TARGET;
    private readonly TV_SEARCH_TIMEOUT;
    private socket;
    private discoveredDevices;
    private isSearching;
    constructor(log: Logger);
    /**
     * Search for LG TVs on the network using SSDP
     */
    search(timeout?: number): Promise<DiscoveredDevice[]>;
    /**
     * Perform the SSDP search
     */
    private performSearch;
    /**
     * Process a SSDP response
     */
    private processResponse;
    /**
     * Fetch device information from the location URL
     */
    private fetchDeviceInfo;
    /**
     * Static method to search for TVs
     */
    static discoverTVs(log: Logger): Promise<DiscoveredDevice[]>;
}
export {};
//# sourceMappingURL=discovery.d.ts.map