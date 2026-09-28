# GymERP Desktop Shell (Tauri 2.0)

Native desktop application for Windows and Linux wrapping the GymERP web client and bundling the local WhatsApp Bridge and Cloudflare Tunnel.

## System Prerequisites

### Linux (Ubuntu / Debian)
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Rust Toolchain
Install the official Rust compiler:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

## Development

1. Start the web app or point `tauri.conf.json` to your local dev server:
   ```bash
   npm run dev # In root GYM-ERP-2 directory
   ```

2. Launch the desktop application:
   ```bash
   cd desktop
   npm install
   npm run dev
   ```

## Production Build

Build native installers for your operating system:
```bash
cd desktop
npm run build
```

Artifacts will be produced in:
- Linux: `src-tauri/target/release/bundle/deb/` (.deb) and `bundle/appimage/` (.AppImage)
- Windows: `src-tauri/target/release/bundle/msi/` (.msi) and `bundle/nsis/` (.exe)

## Architecture

- **WebView Core**: Uses Microsoft Edge WebView2 on Windows, WebKitGTK on Linux.
- **Sidecar Binaries**:
  - `baileys-engine`: Standalone WhatsApp Web bridge.
  - `cloudflared`: Cloudflare Zero Trust tunnel client.
- **System Tray**: Persistent background icon allowing one-click dashboard access and bridge monitoring.
