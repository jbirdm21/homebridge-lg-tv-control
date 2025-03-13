"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./settings");
const platform_1 = require("./platform");
/**
 * This method registers the platform with Homebridge
 */
exports.default = (api) => {
    api.registerPlatform(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, platform_1.LGTVPlatform);
};
//# sourceMappingURL=index.js.map