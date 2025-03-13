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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinQAuth = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ThinQ client ID
const CLIENT_ID = 'LGAO221A02';
// ThinQ gateway URLs
const GATEWAY_URL = {
    'US': 'https://us.lgthinq.com',
    'EU': 'https://eu.lgthinq.com',
    'KR': 'https://kr.lgthinq.com',
    'JP': 'https://jp.lgthinq.com',
    'CN': 'https://cn.lgthinq.com',
};
// Language codes
const DEFAULT_LANGUAGE = 'en-US';
/**
 * ThinQ authentication for LG TVs
 */
class ThinQAuth {
    constructor(log, username, password, country = 'US', language = DEFAULT_LANGUAGE, storageDir = path.join(process.env.HOME || '', '.homebridge'), authFilePath) {
        this.log = log;
        this.username = username;
        this.password = password;
        this.country = country;
        this.language = language;
        this.storageDir = storageDir;
        this.authFilePath = authFilePath;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        this.userId = null;
        this.client = axios_1.default.create({
            baseURL: 'https://us.lgeapi.com/thinq/v1',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        // Create storage directory if it doesn't exist
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
        this.tokenStoragePath = path.join(this.storageDir, 'lg-thinq-token.json');
        this.loadTokenFromStorage();
        // Set gateway URL based on country
        this.gateway = GATEWAY_URL[country] || GATEWAY_URL.US;
        // Set auth file path if not provided
        if (!authFilePath) {
            const homedir = process.env.HOME || process.env.USERPROFILE || '';
            this.authFilePath = path.join(homedir, '.homebridge', 'lg-thinq-auth.json');
        }
        // Load saved authentication data if available
        this.loadAuthData();
    }
    /**
     * Get client for API requests
     */
    async getClient() {
        // Ensure we're authenticated
        await this.authenticate();
        return this.client;
    }
    /**
     * Ensure the client is authenticated
     */
    async ensureAuthenticated() {
        const now = Date.now();
        // If token is valid and not expired, return
        if (this.accessToken && this.tokenExpiresAt > now + 60000) {
            return;
        }
        // If we have a refresh token, try to refresh
        if (this.refreshToken) {
            try {
                await this.refreshAccessToken();
                return;
            }
            catch (error) {
                this.log.warn('Failed to refresh token, will try to login again:', error);
            }
        }
        // If refresh failed or no refresh token, login again
        await this.login();
    }
    /**
     * Login to ThinQ API
     */
    async login() {
        try {
            // First, get a signature for the login request
            const signature = await this.getLoginSignature();
            if (!signature) {
                throw new Error('Failed to get login signature');
            }
            // Now, log in with username, password, and signature
            const loginUrl = `${this.gateway}/member/login`;
            const loginData = {
                countryCode: this.country,
                langCode: this.language,
                loginType: 'EMP',
                mobile: '',
                password: this.password,
                userID: this.username,
            };
            const loginResponse = await axios_1.default.post(loginUrl, loginData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-thinq-signature': signature,
                    'x-thinq-application-key': 'LGAO221A02',
                    'x-thinq-security-key': 'nuts_securitykey',
                },
            });
            const loginResult = loginResponse.data;
            if (!loginResult.account) {
                throw new Error('ThinQ login failed, invalid account');
            }
            // Get access token
            this.userId = loginResult.account.userID;
            const tokenUrl = `${this.gateway}/oauth2/token`;
            const tokenData = {
                grant_type: 'password',
                account_type: 'EMP',
                client_id: CLIENT_ID,
                username: this.userId,
                password: loginResult.account.accessToken,
            };
            const tokenResponse = await axios_1.default.post(tokenUrl, tokenData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const tokenResult = tokenResponse.data;
            this.accessToken = tokenResult.access_token;
            this.refreshToken = tokenResult.refresh_token;
            this.tokenExpiresAt = Date.now() + (tokenResult.expires_in * 1000);
            // Save the authentication data
            this.saveAuthData();
            this.saveTokenToStorage();
            this.log.info('Successfully logged in to ThinQ API');
        }
        catch (error) {
            this.log.error('Failed to login to ThinQ API:', error);
            throw error;
        }
    }
    /**
     * Get a signature for the login request
     */
    async getLoginSignature() {
        try {
            // Get login URL from gateway
            const gatewayUrl = `${this.gateway}/application/controllers/api/common/gateway`;
            const gatewayResponse = await axios_1.default.get(gatewayUrl);
            const gatewayResult = gatewayResponse.data;
            // Get login signature
            const signatureUrl = `${this.gateway}${gatewayResult.thinqUrl}/service/users/signIn`;
            const signatureResponse = await axios_1.default.post(signatureUrl, {
                username: this.username,
                password: this.password,
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-thinq-application-key': 'LGAO221A02',
                    'x-thinq-security-key': 'nuts_securitykey',
                },
            });
            const signatureResult = signatureResponse.data;
            if (!signatureResult.signature) {
                this.log.error('ThinQ login signature failed');
                return null;
            }
            return signatureResult.signature;
        }
        catch (error) {
            this.log.error('ThinQ login signature failed:', error);
            return null;
        }
    }
    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            const tokenUrl = `${this.gateway}/oauth2/token`;
            const tokenData = {
                grant_type: 'refresh_token',
                client_id: CLIENT_ID,
                refresh_token: this.refreshToken,
            };
            const tokenResponse = await axios_1.default.post(tokenUrl, tokenData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const tokenResult = tokenResponse.data;
            this.accessToken = tokenResult.access_token;
            this.refreshToken = tokenResult.refresh_token;
            this.tokenExpiresAt = Date.now() + (tokenResult.expires_in * 1000);
            // Save the authentication data
            this.saveAuthData();
            this.saveTokenToStorage();
            this.log.debug('Successfully refreshed ThinQ API token');
        }
        catch (error) {
            this.log.error('Failed to refresh ThinQ API token:', error);
            throw error;
        }
    }
    /**
     * Get devices from ThinQ API
     */
    async getDevices() {
        try {
            const client = await this.getClient();
            const response = await client.get('devices');
            if (response.status === 200 && response.data && response.data.result === 'ok') {
                return response.data.devices || [];
            }
            throw new Error('Failed to get devices');
        }
        catch (error) {
            this.log.error('Failed to get devices from ThinQ API:', error);
            throw error;
        }
    }
    /**
     * Save token to storage
     */
    saveTokenToStorage() {
        try {
            const tokenData = {
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                tokenExpiresAt: this.tokenExpiresAt,
                userId: this.userId,
            };
            fs.writeFileSync(this.tokenStoragePath, JSON.stringify(tokenData, null, 2));
        }
        catch (error) {
            this.log.error('Failed to save token to storage:', error);
        }
    }
    /**
     * Load token from storage
     */
    loadTokenFromStorage() {
        try {
            if (fs.existsSync(this.tokenStoragePath)) {
                const tokenData = JSON.parse(fs.readFileSync(this.tokenStoragePath, 'utf8'));
                this.accessToken = tokenData.accessToken;
                this.refreshToken = tokenData.refreshToken;
                this.tokenExpiresAt = tokenData.tokenExpiresAt;
                this.userId = tokenData.userId;
                this.log.debug('Loaded ThinQ API token from storage');
            }
        }
        catch (error) {
            this.log.error('Failed to load token from storage:', error);
        }
    }
    /**
     * Save the authentication data to a file
     */
    saveAuthData() {
        if (!this.authFilePath) {
            return;
        }
        try {
            const authData = {
                access_token: this.accessToken || '',
                refresh_token: this.refreshToken || '',
                expires_at: this.tokenExpiresAt,
                user_id: this.userId || '',
            };
            // Ensure directory exists
            const dir = path.dirname(this.authFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.authFilePath, JSON.stringify(authData, null, 2));
        }
        catch (error) {
            this.log.error('Error saving ThinQ auth data:', error);
        }
    }
    /**
     * Load the authentication data from a file
     */
    loadAuthData() {
        if (!this.authFilePath || !fs.existsSync(this.authFilePath)) {
            return;
        }
        try {
            const data = fs.readFileSync(this.authFilePath, 'utf8');
            const authData = JSON.parse(data);
            this.accessToken = authData.access_token;
            this.refreshToken = authData.refresh_token;
            this.tokenExpiresAt = authData.expires_at;
            this.userId = authData.user_id;
        }
        catch (error) {
            this.log.error('Error loading ThinQ auth data:', error);
        }
    }
    /**
     * Check if the token is valid
     */
    isTokenValid() {
        return !!this.accessToken && this.tokenExpiresAt > Date.now();
    }
    /**
     * Authenticate with the ThinQ API
     */
    async authenticate() {
        try {
            // If we have a valid token, use it
            if (this.isTokenValid()) {
                this.log.debug('Using cached ThinQ token');
                return true;
            }
            // If we have a refresh token, try to refresh
            if (this.refreshToken) {
                this.log.debug('Refreshing ThinQ token');
                try {
                    await this.refreshAccessToken();
                    return true;
                }
                catch (error) {
                    this.log.error('Failed to refresh token:', error);
                }
            }
            // Otherwise, log in with username and password
            this.log.debug('Logging in to ThinQ');
            try {
                await this.login();
                return true;
            }
            catch (error) {
                this.log.error('Failed to login:', error);
                return false;
            }
        }
        catch (error) {
            this.log.error('ThinQ authentication failed:', error);
            return false;
        }
    }
    /**
     * Make an authenticated request to the ThinQ API
     */
    async request(url, method = 'GET', data) {
        try {
            // Make sure we're authenticated
            if (!await this.authenticate()) {
                throw new Error('Authentication failed');
            }
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`,
            };
            let response;
            if (method === 'GET') {
                response = await this.client.get(url, { headers });
            }
            else if (method === 'POST') {
                response = await this.client.post(url, data, { headers });
            }
            else if (method === 'PUT') {
                response = await this.client.put(url, data, { headers });
            }
            else {
                throw new Error(`Unsupported method: ${method}`);
            }
            return response.data;
        }
        catch (error) {
            this.log.error(`ThinQ API request failed (${method} ${url}):`, error);
            throw error;
        }
    }
    /**
     * Get the status of a device
     */
    async getDeviceStatus(deviceId) {
        try {
            const url = `${this.gateway}/service/devices/${deviceId}/status`;
            const result = await this.request(url);
            return result.result;
        }
        catch (error) {
            this.log.error(`Error getting ThinQ device status for ${deviceId}:`, error);
            return null;
        }
    }
    /**
     * Send a command to a device
     */
    async sendDeviceCommand(deviceId, commandName, command) {
        try {
            const url = `${this.gateway}/service/devices/${deviceId}/control`;
            const data = {
                command: commandName,
                dataKey: null,
                dataValue: command,
            };
            const result = await this.request(url, 'POST', data);
            return result;
        }
        catch (error) {
            this.log.error(`Error sending ThinQ command to ${deviceId}:`, error);
            throw error;
        }
    }
    /**
     * Get the logger
     */
    getLogger() {
        return this.log;
    }
}
exports.ThinQAuth = ThinQAuth;
//# sourceMappingURL=auth.js.map