/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'LG-TV-Control';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-lg-tv-control';

/**
 * WebOS Client Settings
 */
export const WEBOS_CLIENT_KEY_FILE = '.lgtvkey';
export const WEBOS_CLIENT_TIMEOUT = 10000; // 10 seconds
export const WEBOS_RECONNECT_INTERVAL = 5000; // 5 seconds
export const WEBOS_MAX_RECONNECT_ATTEMPTS = 5;

/**
 * ThinQ Settings
 */
export const THINQ_TOKEN_DIR = '.thinq-token';
export const THINQ_POLLING_INTERVAL = 60000; // 1 minute 