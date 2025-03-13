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
exports.wakeOnLan = void 0;
const dgram = __importStar(require("dgram"));
/**
 * Send a Wake-on-LAN packet to power on a device
 */
async function wakeOnLan(macAddress, options = {}) {
    const { address = '255.255.255.255', port = 9, log } = options;
    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
        const error = `Invalid MAC address format: ${macAddress}`;
        if (log)
            log.error(error);
        throw new Error(error);
    }
    // Normalize MAC address
    const normalizedMac = macAddress
        .toLowerCase()
        .replace(/[:-]/g, '');
    // Create magic packet
    const magicPacket = Buffer.alloc(102);
    // First 6 bytes of 0xFF
    for (let i = 0; i < 6; i++) {
        magicPacket[i] = 0xff;
    }
    // Repeat MAC 16 times
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 6; j++) {
            magicPacket[i * 6 + j + 6] = parseInt(normalizedMac.substr(j * 2, 2), 16);
        }
    }
    return new Promise((resolve, reject) => {
        try {
            const socket = dgram.createSocket('udp4');
            socket.on('error', (err) => {
                if (log)
                    log.error('Wake-on-LAN error:', err);
                socket.close();
                reject(err);
            });
            socket.once('listening', () => {
                socket.setBroadcast(true);
                socket.send(magicPacket, 0, magicPacket.length, port, address, (err) => {
                    socket.close();
                    if (err) {
                        if (log)
                            log.error('Error sending Wake-on-LAN packet:', err);
                        reject(err);
                        return;
                    }
                    if (log)
                        log.debug(`Wake-on-LAN packet sent to ${macAddress}`);
                    resolve(true);
                });
            });
            socket.bind();
        }
        catch (err) {
            if (log)
                log.error('Failed to create Wake-on-LAN socket:', err);
            reject(err);
        }
    });
}
exports.wakeOnLan = wakeOnLan;
//# sourceMappingURL=wake-on-lan.js.map