# Open Surround View

Open Surround View is an experimental four-camera viewer for Android-based vehicle head units. It supports Android Camera2 device IDs and local MJPEG/HTTP camera streams.

## Features

- Camera discovery through Android Camera2
- Configurable front, rear, left, and right camera IDs
- MJPEG/HTTP stream support for devices that expose local camera servers
- 2×2 grid, focused camera, and bird's-eye diagram views
- Local, persistent camera configuration
- Compatibility mode for Android devices that do not support React Native's New Architecture

## Privacy

The application does not include analytics, advertising, telemetry, user accounts, or cloud services. Camera configuration is stored locally on the device. MJPEG URLs are entered by the user and are not transmitted anywhere by the project.

## Build

### Requirements

- Node.js 18 or later
- npm
- Android build tooling, or an Expo Application Services account

```bash
git clone https://github.com/REPOSITORY_OWNER/open-surround-view.git
cd open-surround-view
npm install
npx expo run:android
```

For an EAS build, link the cloned project to your own EAS account first. This repository intentionally contains no EAS account or project identifiers.

## Camera configuration

Open **Setup** in the application.

### Camera2 mode

Camera identifiers vary by head unit. A common arrangement is:

- Rear: ID 0
- Front: ID 1
- Left: ID 2
- Right: ID 3

Use the camera finder and change the assignments if your hardware exposes a different order.

### MJPEG/HTTP mode

If the head unit runs a local camera server, select MJPEG mode and enter the full local stream URLs. Cleartext HTTP is supported because many embedded head units expose streams only on a private local network.

## Safety limitations

This software is experimental and is not a replacement for mirrors, direct observation, or certified vehicle safety systems. Do not configure or operate it while driving. Camera availability and identifiers depend on the device firmware and hardware vendor.

## Compatibility

The implementation was developed for generic Android head units. Vendor-specific compatibility reports are welcome, but the project is independent and is not affiliated with or endorsed by any hardware manufacturer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please do not include personal data, credentials, private stream URLs, or identifiable vehicle images in issues or pull requests.

## License

MIT. See [LICENSE](LICENSE).
