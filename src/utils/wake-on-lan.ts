import * as dgram from 'dgram';
import { Logger } from 'homebridge';

/**
 * Send a Wake-on-LAN packet to power on a device
 */
export async function wakeOnLan(macAddress: string, options: {
  address?: string;
  port?: number;
  log?: Logger;
} = {}): Promise<boolean> {
  const { address = '255.255.255.255', port = 9, log } = options;

  // Validate MAC address format
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  if (!macRegex.test(macAddress)) {
    const error = `Invalid MAC address format: ${macAddress}`;
    if (log) log.error(error);
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
        if (log) log.error('Wake-on-LAN error:', err);
        socket.close();
        reject(err);
      });

      socket.once('listening', () => {
        socket.setBroadcast(true);
        
        socket.send(magicPacket, 0, magicPacket.length, port, address, (err) => {
          socket.close();
          
          if (err) {
            if (log) log.error('Error sending Wake-on-LAN packet:', err);
            reject(err);
            return;
          }
          
          if (log) log.debug(`Wake-on-LAN packet sent to ${macAddress}`);
          resolve(true);
        });
      });

      socket.bind();
    } catch (err) {
      if (log) log.error('Failed to create Wake-on-LAN socket:', err);
      reject(err);
    }
  });
} 