import { Logger } from 'homebridge';
/**
 * ThinQ authentication for LG TVs
 */
export declare class ThinQAuth {
    private readonly log;
    private readonly username;
    private readonly password;
    private readonly country;
    private readonly language;
    private readonly storageDir;
    private readonly authFilePath?;
    private client;
    private accessToken;
    private refreshToken;
    private tokenExpiresAt;
    private userId;
    private tokenStoragePath;
    private gateway;
    constructor(log: Logger, username: string, password: string, country?: string, language?: string, storageDir?: string, authFilePath?: string | undefined);
    /**
     * Get client for API requests
     */
    getClient(): Promise<any>;
    /**
     * Ensure the client is authenticated
     */
    private ensureAuthenticated;
    /**
     * Login to ThinQ API
     */
    private login;
    /**
     * Get a signature for the login request
     */
    private getLoginSignature;
    /**
     * Refresh access token
     */
    private refreshAccessToken;
    /**
     * Get devices from ThinQ API
     */
    getDevices(): Promise<any[]>;
    /**
     * Save token to storage
     */
    private saveTokenToStorage;
    /**
     * Load token from storage
     */
    private loadTokenFromStorage;
    /**
     * Save the authentication data to a file
     */
    private saveAuthData;
    /**
     * Load the authentication data from a file
     */
    private loadAuthData;
    /**
     * Check if the token is valid
     */
    private isTokenValid;
    /**
     * Authenticate with the ThinQ API
     */
    authenticate(): Promise<boolean>;
    /**
     * Make an authenticated request to the ThinQ API
     */
    private request;
    /**
     * Get the status of a device
     */
    getDeviceStatus(deviceId: string): Promise<any | null>;
    /**
     * Send a command to a device
     */
    sendDeviceCommand(deviceId: string, commandName: string, command: any): Promise<any>;
    /**
     * Get the logger
     */
    getLogger(): Logger;
}
//# sourceMappingURL=auth.d.ts.map