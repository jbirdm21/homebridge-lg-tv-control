"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THINQ_POLLING_INTERVAL = exports.THINQ_TOKEN_DIR = exports.WEBOS_MAX_RECONNECT_ATTEMPTS = exports.WEBOS_RECONNECT_INTERVAL = exports.WEBOS_CLIENT_TIMEOUT = exports.WEBOS_CLIENT_KEY_FILE = exports.PLUGIN_NAME = exports.PLATFORM_NAME = void 0;
/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
exports.PLATFORM_NAME = 'LG-TV-Control';
/**
 * This must match the name of your plugin as defined the package.json
 */
exports.PLUGIN_NAME = 'homebridge-lg-tv-control';
/**
 * WebOS Client Settings
 */
exports.WEBOS_CLIENT_KEY_FILE = '.lgtvkey';
exports.WEBOS_CLIENT_TIMEOUT = 10000; // 10 seconds
exports.WEBOS_RECONNECT_INTERVAL = 5000; // 5 seconds
exports.WEBOS_MAX_RECONNECT_ATTEMPTS = 5;
/**
 * ThinQ Settings
 */
exports.THINQ_TOKEN_DIR = '.thinq-token';
exports.THINQ_POLLING_INTERVAL = 60000; // 1 minute 
//# sourceMappingURL=settings.js.map