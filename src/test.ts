import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { LGTVPlatform } from './platform';

// Create a simple test that doesn't rely on the Homebridge API
console.log('Testing LG TV Control Plugin');
console.log('-------------------------------');

// Mock API
const mockAPI: any = {
  registerPlatform: (pluginName: string, platformName: string, constructor: any) => {
    console.log(`Registered platform: ${pluginName} - ${platformName}`);
  },
};

// Test plugin registration
console.log(`Plugin name: ${PLUGIN_NAME}`);
console.log(`Platform name: ${PLATFORM_NAME}`);
mockAPI.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, LGTVPlatform);

// Test platform class
console.log(`Platform class: ${LGTVPlatform.name}`);
console.log('Platform methods:');
const platformMethods = Object.getOwnPropertyNames(LGTVPlatform.prototype)
  .filter(method => method !== 'constructor');
platformMethods.forEach(method => console.log(`- ${method}`));

console.log('Test completed successfully'); 