# Mirage Telemetry mobile app

Expo/React Native companion app for iOS, Android, and web. The first release connects directly to Mirage Telemetry OS over the user's private local network. It never substitutes mock values for unavailable vehicle signals.

## Develop

```sh
cd apps/mobile
npm install
npm start
```

The default device URL is `http://mirage.local:8080`. Override it inside Settings or with `EXPO_PUBLIC_MIRAGE_API_URL`.

## Store builds

1. Add the EAS project ID by running `npx eas-cli init` under the intended Expo account.
2. Confirm the bundle identifier/package name and prepare store listing/privacy metadata.
3. Build with `npx eas-cli build --platform all --profile production`.
4. Submit reviewed binaries with `npx eas-cli submit --platform ios` and `--platform android`.

Apple and Google developer accounts are required for public store submission. Signing credentials must never be committed.

## Transport roadmap

Local Wi-Fi is implemented. Bluetooth provisioning and signed software updates intentionally remain disabled until Mirage Telemetry OS exposes an authenticated BLE service on the Pi.
