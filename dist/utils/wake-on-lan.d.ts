import { Logger } from 'homebridge';
/**
 * Send a Wake-on-LAN packet to power on a device
 */
export declare function wakeOnLan(macAddress: string, options?: {
    address?: string;
    port?: number;
    log?: Logger;
}): Promise<boolean>;
//# sourceMappingURL=wake-on-lan.d.ts.map