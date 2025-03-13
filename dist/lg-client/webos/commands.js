"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebOSCommands = void 0;
/**
 * WebOS Commands for controlling LG TV
 */
class WebOSCommands {
    /**
     * Create a new WebOS commands instance
     */
    constructor(client, log) {
        this.client = client;
        this.log = log;
    }
    /**
     * Power off the TV
     */
    async powerOff() {
        const response = await this.client.request('ssap://system/turnOff');
        return response.returnValue === true;
    }
    /**
     * Get the current volume
     */
    async getVolume() {
        try {
            const response = await this.client.request('ssap://audio/getVolume');
            if (response.returnValue === true) {
                return response.volume || 0;
            }
            return 0;
        }
        catch (error) {
            this.log.error('Error getting volume:', error);
            return 0;
        }
    }
    /**
     * Set the volume
     */
    async setVolume(volume) {
        const response = await this.client.request('ssap://audio/setVolume', {
            volume: Math.max(0, Math.min(100, volume))
        });
        return response.returnValue === true;
    }
    /**
     * Increase the volume
     */
    async volumeUp() {
        const response = await this.client.request('ssap://audio/volumeUp');
        return response.returnValue === true;
    }
    /**
     * Decrease the volume
     */
    async volumeDown() {
        const response = await this.client.request('ssap://audio/volumeDown');
        return response.returnValue === true;
    }
    /**
     * Set the mute state
     */
    async setMute(mute) {
        const response = await this.client.request('ssap://audio/setMute', {
            mute
        });
        return response.returnValue === true;
    }
    /**
     * Get current mute state
     */
    async getMute() {
        try {
            const response = await this.client.request('ssap://audio/getVolume');
            if (response.returnValue === true) {
                return response.muted === true;
            }
            return false;
        }
        catch (error) {
            this.log.error('Error getting mute state:', error);
            return false;
        }
    }
    /**
     * Set the input source
     */
    async setInput(inputId) {
        const response = await this.client.request('ssap://tv/switchInput', {
            inputId
        });
        return response.returnValue === true;
    }
    /**
     * Get the list of input sources
     */
    async getInputList() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://tv/getExternalInputList',
            });
            if (response.returnValue === true) {
                return response.payload.devices;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting input list:', error);
            return null;
        }
    }
    /**
     * Set the channel
     */
    async setChannel(channelId) {
        const response = await this.client.request('ssap://tv/openChannel', {
            channelId
        });
        return response.returnValue === true;
    }
    /**
     * Get the current channel
     */
    async getCurrentChannel() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://tv/getCurrentChannel',
            });
            if (response.returnValue === true) {
                return response.payload;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting current channel:', error);
            return null;
        }
    }
    /**
     * Get the current app
     */
    async getCurrentApp() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.applicationManager/getForegroundAppInfo',
            });
            if (response.returnValue === true) {
                return response.payload;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting current app:', error);
            return null;
        }
    }
    /**
     * Launch an app
     */
    async launchApp(appId) {
        const response = await this.client.request('ssap://system.launcher/launch', {
            id: appId
        });
        return response.returnValue === true;
    }
    /**
     * Close an app
     */
    async closeApp(appId) {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.applicationManager/close',
                payload: { id: appId },
            });
            return response.returnValue === true;
        }
        catch (error) {
            this.log.error('Error closing app:', error);
            return false;
        }
    }
    /**
     * Get the list of apps
     */
    async getAppList() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.applicationManager/listApps',
            });
            if (response.returnValue === true) {
                return response.payload.apps;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting app list:', error);
            return null;
        }
    }
    /**
     * Send a remote control button
     */
    async sendButton(button) {
        // Map common button strings to button codes
        const buttonMap = {
            UP: 'UP',
            DOWN: 'DOWN',
            LEFT: 'LEFT',
            RIGHT: 'RIGHT',
            ENTER: 'ENTER',
            BACK: 'BACK',
            EXIT: 'EXIT',
            HOME: 'HOME',
            INFO: 'INFO',
            PLAY: 'PLAY',
            PAUSE: 'PAUSE',
            STOP: 'STOP',
            REWIND: 'REWIND',
            FASTFORWARD: 'FASTFORWARD',
            CHANNEL_UP: 'CH_UP',
            CHANNEL_DOWN: 'CH_DOWN',
            NUMBER_0: '0',
            NUMBER_1: '1',
            NUMBER_2: '2',
            NUMBER_3: '3',
            NUMBER_4: '4',
            NUMBER_5: '5',
            NUMBER_6: '6',
            NUMBER_7: '7',
            NUMBER_8: '8',
            NUMBER_9: '9'
        };
        // Convert button name to code if mapped
        const buttonCode = buttonMap[button] || button;
        const response = await this.client.request('ssap://com.webos.service.networkinput/getPointerInputSocket');
        if (response.returnValue !== true) {
            this.log.error('Failed to get pointer input socket');
            return false;
        }
        try {
            await this.client.sendButton(buttonCode);
            return true;
        }
        catch (error) {
            this.log.error(`Error sending button ${button}:`, error);
            return false;
        }
    }
    /**
     * Play media
     */
    async play() {
        const response = await this.client.request('ssap://media.controls/play');
        return response.returnValue === true;
    }
    /**
     * Pause media
     */
    async pause() {
        const response = await this.client.request('ssap://media.controls/pause');
        return response.returnValue === true;
    }
    /**
     * Stop media
     */
    async stop() {
        const response = await this.client.request('ssap://media.controls/stop');
        return response.returnValue === true;
    }
    /**
     * Rewind media
     */
    async rewind() {
        const response = await this.client.request('ssap://media.controls/rewind');
        return response.returnValue === true;
    }
    /**
     * Fast forward media
     */
    async fastForward() {
        const response = await this.client.request('ssap://media.controls/fastForward');
        return response.returnValue === true;
    }
    /**
     * Get 3D status
     */
    async get3DStatus() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.service.tv.display/get3DStatus',
            });
            if (response.returnValue === true) {
                return response.payload;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting 3D status:', error);
            return null;
        }
    }
    /**
     * Set 3D mode
     */
    async set3DOn() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.service.tv.display/set3DOn',
            });
            return response.returnValue === true;
        }
        catch (error) {
            this.log.error('Error setting 3D on:', error);
            return false;
        }
    }
    /**
     * Set 3D off
     */
    async set3DOff() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.service.tv.display/set3DOff',
            });
            return response.returnValue === true;
        }
        catch (error) {
            this.log.error('Error setting 3D off:', error);
            return false;
        }
    }
    /**
     * Get system info
     */
    async getSystemInfo() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://system/getSystemInfo',
            });
            if (response.returnValue === true) {
                return response.payload;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting system info:', error);
            return null;
        }
    }
    /**
     * Get sound output
     */
    async getSoundOutput() {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.service.apiadapter/audio/getSoundOutput',
            });
            if (response.returnValue === true) {
                return response.payload;
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting sound output:', error);
            return null;
        }
    }
    /**
     * Set sound output
     */
    async setSoundOutput(output) {
        try {
            const response = await this.client.sendMessage({
                type: 'request',
                uri: 'ssap://com.webos.service.apiadapter/audio/changeSoundOutput',
                payload: { output },
            });
            return response.returnValue === true;
        }
        catch (error) {
            this.log.error('Error setting sound output:', error);
            return false;
        }
    }
    /**
     * Get TV inputs (HDMI, etc.)
     */
    async getInputs() {
        try {
            const response = await this.client.request('ssap://tv/getExternalInputList');
            if (response.returnValue === true) {
                return response.devices || [];
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting inputs:', error);
            return null;
        }
    }
    /**
     * Get launchable apps
     */
    async getLaunchPoints() {
        try {
            const response = await this.client.request('ssap://com.webos.applicationManager/listLaunchPoints');
            if (response.returnValue === true) {
                return response.launchPoints || [];
            }
            return null;
        }
        catch (error) {
            this.log.error('Error getting launch points:', error);
            return null;
        }
    }
    /**
     * Set picture mode
     */
    async setPictureMode(mode) {
        try {
            const response = await this.client.request('ssap://settings/setPictureMode', { mode });
            return response.returnValue === true;
        }
        catch (error) {
            this.log.error('Error setting picture mode:', error);
            return false;
        }
    }
}
exports.WebOSCommands = WebOSCommands;
//# sourceMappingURL=commands.js.map