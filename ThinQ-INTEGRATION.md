# LG ThinQ Integration for Homebridge LG TV Control

This document explains how the LG ThinQ integration works in the `homebridge-lg-tv-control` plugin and provides guidance on how to use it effectively.

## Overview

The LG ThinQ integration allows controlling LG TVs through LG's cloud API. This is particularly useful when the TV is not directly accessible on the local network or when you need to perform operations that are only available through the ThinQ platform, such as power on when the TV is completely off.

## Setup Requirements

To use the ThinQ integration, you need to provide the following information in your Homebridge configuration:

1. **LG ThinQ Credentials**: Your LG account username and password
2. **TV MAC Address**: The MAC address of your TV (required for Wake-on-LAN functionality)
3. **Region**: Your country/region (US, EU, KR, etc.)

## Authentication Flow

The ThinQ integration follows this authentication process:

1. The plugin uses your LG account credentials to obtain authorization from LG's servers
2. The ThinQ API returns authentication tokens
3. The plugin uses these tokens to discover and control your devices
4. Tokens are securely stored locally to avoid frequent re-authentication

## Key Features

### 1. Device Discovery

The ThinQ integration can discover all LG devices registered to your account, including TVs, air conditioners, refrigerators, and more. For this plugin, we specifically look for TV devices.

### 2. Power Control

One of the most useful features of the ThinQ integration is the ability to power on your TV remotely, even when it's completely off (unlike the WebOS API, which only works when the TV is in standby mode).

### 3. Status Monitoring

The integration can retrieve detailed status information about your TV, including:
- Power state
- Volume/mute status
- Current input source
- Picture mode
- Energy saving settings
- And more

### 4. Advanced Controls

Beyond basic operations, ThinQ provides access to advanced TV features:
- Energy saving mode
- AI recommendations
- Picture mode settings
- Sound settings

## Fallback Mechanism

The plugin implements a tiered approach to TV control:

1. **WebOS First**: The plugin attempts to connect via WebOS (local network) first
2. **ThinQ Fallback**: If WebOS connection fails, it falls back to ThinQ
3. **Command Routing**: Based on the TV's state and the nature of the command, the plugin routes commands to the appropriate API

## Troubleshooting

If you encounter issues with the ThinQ integration:

1. **Authentication Failures**: Make sure your LG account credentials are correct
2. **Region Issues**: Verify you've selected the correct region for your account
3. **API Changes**: LG occasionally updates their API - the plugin implements multiple fallback endpoints to handle this

## Advanced Configuration

The plugin supports advanced ThinQ configuration options:

```json
"platforms": [
  {
    "platform": "LGTVControl",
    "name": "LG TV",
    "tvs": [
      {
        "name": "Living Room TV",
        "ip": "192.168.1.100",
        "mac": "AA:BB:CC:DD:EE:FF",
        "thinq": {
          "username": "your.email@example.com",
          "password": "your-password",
          "region": "US",
          "language": "en-US"
        }
      }
    ]
  }
]
```

## Technical Implementation

Under the hood, the integration consists of two main components:

1. **ThinQAuth**: Handles authentication, device discovery, and direct API communication
2. **ThinQCommands**: Implements TV-specific commands and status parsing

The integration is designed to be robust against API changes, with multiple fallback endpoints and error handling mechanisms.

## Limitations

The ThinQ integration has some limitations:

1. **Internet Dependency**: Unlike WebOS control, ThinQ requires an internet connection
2. **Response Time**: Cloud API responses may be slower than local WebOS control
3. **API Rate Limits**: LG may impose rate limits on their API calls

## Future Enhancements

Planned improvements to the ThinQ integration include:

1. **Event Subscription**: Implementing real-time status updates via LG's notification system
2. **Enhanced Device Profiles**: Better utilization of device capabilities based on TV model
3. **Automatic Mode Selection**: Smart switching between WebOS and ThinQ based on command success rates 