# Homebridge LG TV Control

[![npm](https://img.shields.io/npm/v/homebridge-lg-tv-control.svg)](https://www.npmjs.com/package/homebridge-lg-tv-control)
[![npm](https://img.shields.io/npm/dt/homebridge-lg-tv-control.svg)](https://www.npmjs.com/package/homebridge-lg-tv-control)
[![GitHub last commit](https://img.shields.io/github/last-commit/your-username/homebridge-lg-tv-control.svg)](https://github.com/your-username/homebridge-lg-tv-control)

A Homebridge plugin for controlling LG TVs using both WebOS and ThinQ APIs.

## Features

- Power on/off control
- Volume control (including a volume slider option)
- Input source selection
- Media playback controls
- Remote control buttons
- Energy saving mode
- AI recommendation settings
- Turn off switch for easy power off from HomeKit

## Requirements

- LG WebOS TV with ThinQ compatibility (2018 or newer models)
- TV must be on the same network as your Homebridge server
- Node.js v14 or later
- Homebridge v1.3.5 or later
- LG ThinQ account credentials (for ThinQ API features)

## Installation

Install this plugin using the Homebridge UI or manually via npm:

```bash
npm install -g homebridge-lg-tv-control
```

## Configuration

Add the following to your Homebridge config.json:

```json
{
  "platforms": [
    {
      "platform": "LG-TV-Control",
      "name": "LG TV",
      "tvs": [
        {
          "name": "Living Room TV",
          "ip": "192.168.1.100",
          "mac": "00:11:22:33:44:55",
          "clientKey": "YOUR_CLIENT_KEY",
          "inputs": [
            {
              "name": "HDMI 1",
              "id": "HDMI_1",
              "type": "HDMI"
            },
            {
              "name": "HDMI 2",
              "id": "HDMI_2",
              "type": "HDMI"
            },
            {
              "name": "Netflix",
              "id": "netflix",
              "type": "APPLICATION"
            }
          ],
          "volumeSlider": true,
          "turnOffSwitch": true,
          "energySaving": true,
          "aiRecommendation": true
        }
      ]
    }
  ]
}
```

### Configuration Options

#### TV Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | String | - | Name of the TV (required) |
| `ip` | String | - | IP address of the TV (required) |
| `mac` | String | - | MAC address of the TV (required for power on) |
| `clientKey` | String | - | WebOS client key (will be auto-generated on first connection if not provided) |
| `inputs` | Array | [] | Array of input sources (see below) |
| `volumeSlider` | Boolean | false | Add a volume slider as a fan control |
| `turnOffSwitch` | Boolean | false | Add a switch to turn off the TV |
| `energySaving` | Boolean | false | Add a switch to control energy saving mode |
| `aiRecommendation` | Boolean | false | Add a switch to control AI recommendation |

#### Input Source Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | String | Name of the input source |
| `id` | String | ID of the input source |
| `type` | String | Type of input source (HDMI, APPLICATION, TUNER, etc.) |

## Getting the Client Key

The first time you connect to your LG TV, you'll need to approve the connection on the TV. The plugin will automatically save the client key for future connections.

## ThinQ API Integration

For ThinQ API integration, you need to provide your LG account credentials in the config. This allows for additional features like power on via ThinQ.

## Development

### Building the Plugin

```bash
npm run build
```

### Testing

```bash
npm run test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Homebridge](https://homebridge.io/) community
- Contributors to various LG TV control projects 