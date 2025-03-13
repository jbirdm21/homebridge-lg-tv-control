"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./settings");
const platform_1 = require("./platform");
// Create a simple test that doesn't rely on the Homebridge API
console.log('Testing LG TV Control Plugin');
console.log('-------------------------------');
// Mock API
const mockAPI = {
    registerPlatform: (pluginName, platformName, constructor) => {
        console.log(`Registered platform: ${pluginName} - ${platformName}`);
    },
};
// Test plugin registration
console.log(`Plugin name: ${settings_1.PLUGIN_NAME}`);
console.log(`Platform name: ${settings_1.PLATFORM_NAME}`);
mockAPI.registerPlatform(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, platform_1.LGTVPlatform);
// Test platform class
console.log(`Platform class: ${platform_1.LGTVPlatform.name}`);
console.log('Platform methods:');
const platformMethods = Object.getOwnPropertyNames(platform_1.LGTVPlatform.prototype)
    .filter(method => method !== 'constructor');
platformMethods.forEach(method => console.log(`- ${method}`));
console.log('Test completed successfully');
//# sourceMappingURL=test.js.map