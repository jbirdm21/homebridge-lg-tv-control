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
    private messageIdCounter;
    constructor(log: Logger, username: string, password: string, country?: string, language?: string, storageDir?: string, authFilePath?: string | undefined);
    /**
     * Generate a unique message ID for request tracking
     * Based on documentation section 2.3
     */
    private generateMessageId;
    /**
     * Get standardized headers for API requests
     * Based on documentation section 2.3
     */
    private getStandardHeaders;
    /**
     * Parse error response and get meaningful error message
     */
    private getErrorMessage;
    /**
     * Get client for API requests
     */
    getClient(): Promise<any>;
    /**
     * Ensure the client is authenticated and set up with proper headers
     */
    authenticate(): Promise<boolean>;
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
     * Get devices from ThinQ API with improved error handling and regional endpoints
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
     * Make an authenticated request to the ThinQ API with improved error handling
     */
    private request;
    /**
     * Get device profile from ThinQ API
     * Based on documentation section 3.1.2
     */
    getDeviceProfile(deviceId: string): Promise<any | null>;
    /**
     * Get the status of a device with improved error handling
     */
    getDeviceStatus(deviceId: string): Promise<any | null>;
    /**
     * Send a command to a device with improved error handling
     */
    sendDeviceCommand(deviceId: string, commandName: string, command: any): Promise<any>;
    /**
     * Get the logger
     */
    getLogger(): Logger;
}
//# sourceMappingURL=auth.d.ts.map