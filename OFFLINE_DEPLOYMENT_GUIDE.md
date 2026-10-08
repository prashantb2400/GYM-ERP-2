# GymERP Offline Deployment Guide (Zero-Internet LAN Appliance)

This guide documents the complete setup, configuration, and operation of GymERP as an offline local appliance ("Gym-in-a-Box"). The system runs completely without an active internet connection across Raspberry Pi (ARM64), Linux (x86_64), and Windows environments.

---

## 1. Architecture Overview

In an offline deployment, all backend services, databases, authentication, biometric matching, and frontend dashboards run entirely inside the gym's local area network (LAN):

```
+---------------------------------------------------------------------------------+
|                                Local Wi-Fi Router                               |
|                         (No WAN / Internet Required)                            |
+---------------------------------------------------------------------------------+
          |                                               |
          v                                               v
+-----------------------------+        +------------------------------------------+
|  GymERP Local Host Device   |        |          Client Devices on Wi-Fi         |
|  (Raspberry Pi 4/5, Linux,  |        |                                          |
|   or Windows PC)            |        |  1. Android Tablet Kiosks                |
|                             |        |     (GymERP Kiosk APK - Face Check-in)   |
|  - Postgres 16 (Port 5432)  |<-------|                                          |
|  - PostgREST   (Port 54321) |        |  2. Manager Smartphones                  |
|  - GymERP App  (Port 3000)  |<-------|     (GymERP Manager APK - Operations)    |
|  - WhatsApp    (Port 48291) |        |                                          |
|  - Avahi mDNS (gymerp.local)|        |  3. Receptionist Desktop / Laptop        |
|                             |        |     (Web Browser at http://gymerp.local) |
+-----------------------------+        +------------------------------------------+
```

### Key Components

1. **PostgreSQL 16 Engine**:
   - Runs locally with `uuid-ossp` and `pgcrypto` extensions.
   - Configured with Supabase emulation functions (`auth.uid()`, `auth.jwt()`, `request.jwt.claim.sub`) so all standard migrations and Row Level Security (RLS) policies execute natively without requiring cloud Supabase.
   - Database migrations 0001 through 0020 applied automatically during initialization.

2. **PostgREST v12.2.0 API Gateway**:
   - Exposes standard REST endpoints conforming to the `@supabase/supabase-js` API schema on port 54321.
   - Web clients connect directly to `http://localhost:54321` or `http://<HOST_IP>:54321`.

3. **GymERP Next.js Standalone Application**:
   - Pre-compiled Next.js standalone server running under Node.js 20 on port 3000.
   - CSP headers configured to allow LAN IPs (`192.168.x.x`, `10.x.x.x`), `localhost`, and `*.local` mDNS domains.
   - Embedded local diagnostics API at `/api/local/status`.

4. **Avahi / mDNS Service Discovery**:
   - Broadcasts `gymerp.local` across the local Wi-Fi subnet.
   - Allows tablets, kiosks, and phones to connect instantly without remembering IP addresses.

5. **WhatsApp Bridge (Baileys Engine)**:
   - Standalone Node.js microservice running on port 48291.
   - Persists session and outbound queue in local SQLite database.

---

## 2. Hardware and Network Prerequisites

### Recommended Hardware

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Appliance Host** | Raspberry Pi 4 Model B (4GB RAM) | Raspberry Pi 5 (8GB RAM) with NVMe SSD base |
| **Alternative Host** | Mini PC (Intel N100, 8GB RAM, SSD) | Mini PC (Intel Core i3/i5, 16GB RAM) |
| **Local Router** | Any standard Wi-Fi 5 router (2.4/5GHz) | Wi-Fi 6 router with Gigabit Ethernet ports |
| **Kiosk Tablet** | Android 8.0+ tablet (2GB RAM, front camera) | Android 11+ 10-inch tablet (4GB RAM) |
| **Manager Phone** | Android 7.0+ smartphone | Android 10+ smartphone |

### Network Configuration (No Internet Required)

1. Connect the Host Device to the Wi-Fi router using an Ethernet cable for maximum stability.
2. In the router admin settings:
   - Enable DHCP server.
   - (Recommended) Assign a static DHCP reservation for the host MAC address (e.g., `192.168.1.100`).
   - Enable Multicast / mDNS / Bonjour forwarding if present in router settings.
3. No active WAN or broadband internet subscription is required. The local router routes traffic exclusively between local LAN IP addresses.

---

## 3. Deployment Option A: Docker Compose (All Platforms)

Docker Compose provides the simplest multi-container deployment across Linux, Raspberry Pi OS, and Windows.

### Step 1: Install Docker and Docker Compose

- **Raspberry Pi OS / Ubuntu / Debian**:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```
- **Windows**:
  - Install Docker Desktop for Windows with WSL2 backend.

### Step 2: Clone or Copy Project Directory

Ensure the repository contents are present on the host device:
```bash
git clone https://github.com/prashantb2400/GYM-ERP-2.git
cd GYM-ERP-2
```

### Step 3: Launch the Stack

Run the following command in the project root:
```bash
docker compose -f docker-compose.offline.yml up -d
```

### Step 4: Verify Running Services

```bash
docker compose -f docker-compose.offline.yml ps
```

You should see 4 healthy containers:
- `gymerp-db` (Port 5432)
- `gymerp-postgrest` (Port 54321)
- `gymerp-whatsapp` (Port 48291)
- `gymerp-web` (Port 3000)

### Step 5: Test Diagnostics Endpoint

In your browser or via curl:
```bash
curl http://localhost:3000/api/local/status
```

Response returns host uptime, platform, LAN IPs, and mDNS URL (`http://gymerp.local:3000`).

---

## 4. Deployment Option B: Turnkey Native Setup on Raspberry Pi

For dedicated appliances running without Docker overhead, use the native installer.

### Step 1: Flash Raspberry Pi OS

1. Use Raspberry Pi Imager to flash **Raspberry Pi OS (64-bit Debian 12 Bookworm)** to a high-end MicroSD card or USB 3.0 SSD.
2. Set the hostname to `gymerp` during OS configuration.
3. Enable SSH.

### Step 2: Run Automated Installer

Log into the Raspberry Pi via terminal or SSH, then run:
```bash
cd /path/to/GYM-ERP-2
chmod +x deploy/install-pi.sh
sudo ./deploy/install-pi.sh
```

### What the Installer Automates

1. Installs PostgreSQL 16, Avahi mDNS daemon, PostgREST binary (aarch64), and Node.js 20 LTS.
2. Configures local PostgreSQL databases, roles (`authenticator`, `anon`, `authenticated`, `service_role`), and applies all 20 schema migrations.
3. Builds the Next.js standalone application.
4. Registers and starts the Avahi mDNS service (`gymerp.local`).
5. Configures and enables the `gymerp.service` systemd unit for automatic boot and crash recovery.

### Managing the Native Service

- Check status: `sudo systemctl status gymerp`
- Restart service: `sudo systemctl restart gymerp`
- View live application logs: `sudo journalctl -u gymerp -f`

---

## 5. Deployment Option C: Windows Host Setup

### Method 1: Docker Compose on Windows

Run the provided batch script:
```bat
deploy\install-windows.bat
```
Select Option 1 to start via Docker Compose.

### Method 2: Native Node.js & Local PostgreSQL on Windows

1. Install PostgreSQL 16 for Windows (from enterprisedb.com).
2. Install Node.js 20 LTS for Windows.
3. Download PostgREST for Windows (win-x64) and place `postgrest.exe` in `C:\gymerp\bin`.
4. Run migrations using `deploy/init-db.sh` via Git Bash or execute the migration SQL files through pgAdmin / psql.
5. In the project directory:
   ```cmd
   npm install
   npm run build
   node .next/standalone/server.js
   ```

---

## 6. Connecting Android Tablets & Phones

Both mobile wrapper APKs (`android-kiosk` and `android-manager`) include built-in zero-configuration gateways:

### Connecting the Kiosk Tablet

1. Install `GymERP Kiosk` (`app-debug.apk` or release build) on the tablet.
2. Connect the tablet to the gym Wi-Fi router.
3. Launch the app. The gateway screen displays connection options.
4. Tap the preset button: **Raspberry Pi (gymerp.local)** or enter `http://<HOST_LAN_IP>:3000`.
5. Tap **Connect & Launch Kiosk**.
6. The app opens the kiosk attendance interface (`/kiosk/agent`).
7. **Reconfiguration Tip**: Triple-tap anywhere on the screen to open the server reconfiguration dialog at any time.

### Connecting the Manager App

1. Install `GymERP Manager` on the gym owner or trainer smartphone.
2. Connect the phone to the gym Wi-Fi network.
3. Tap **Raspberry Pi (gymerp.local)** or enter `http://<HOST_LAN_IP>:3000`.
4. Tap **Connect & Launch Dashboard**.
5. The app opens the operations dashboard (`/dashboard`).

---

## 7. Offline Feature Operation

### Face Recognition Attendance

- Face recognition models (face-api.js / SSD MobileNet / 68-point landmarks) are loaded directly from local static assets (`/models/*`) stored inside the app.
- Check-in calculations happen in the browser or tablet WebView via WebGL hardware acceleration.
- Roster comparison occurs against local database vectors with zero external cloud calls.

### Offline Attendance Queue & Sync

- If the tablet briefly loses Wi-Fi connection, attendance logs are buffered in IndexedDB on the tablet.
- Once Wi-Fi reconnects, pending records automatically sync to the local PostgreSQL database.

### Offline PDF Report & Invoice Printing

- All PDF templates (`diet-template.ts`, `exercise-template.ts`, `invoice-template.ts`, `member-report-template.ts`) use robust system font stacks (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`).
- Document generation, printing, and saving work immediately without stalling on Google Fonts network timeouts.

### WhatsApp Bridge in Local Mode

- The Baileys WhatsApp bridge runs on port 48291.
- In zero-internet mode, outbound messages (such as renewal reminders or receipts) are held in the persistent SQLite queue.
- When an administrator connects the host or phone to an active mobile hotspot, queued messages are dispatched immediately without data loss.

---

## 8. Database Backups and Disaster Recovery

### Automated Daily Backup

Create a daily backup cron job on Linux or Raspberry Pi:

```bash
sudo crontab -e
```

Add the following entry (runs every night at 2:00 AM):
```bash
0 2 * * * docker exec gymerp-db pg_dump -U postgres gymerp > /home/pi/gymerp_backups/gymerp_$(date +\%Y\%m\%d).sql
```

### Manual Backup Command

```bash
# Docker Compose
docker exec gymerp-db pg_dump -U postgres gymerp > gymerp_manual_backup.sql

# Native Linux / Pi
pg_dump -U postgres -d gymerp > gymerp_manual_backup.sql
```

### Full Database Restore Command

```bash
# Docker Compose
cat gymerp_manual_backup.sql | docker exec -i gymerp-db psql -U postgres gymerp

# Native Linux / Pi
psql -U postgres -d gymerp < gymerp_manual_backup.sql
```

---

## 9. Troubleshooting Common Issues

### Issue 1: Tablet cannot find `gymerp.local`

- **Cause**: Some Android devices do not resolve mDNS over older Wi-Fi routers that block multicast packets.
- **Remedy**:
  1. Open router settings and enable "IGMP Snooping" or "Multicast".
  2. Alternatively, look up the host IP using `hostname -I` on the host, and enter the static IP directly in the app (e.g., `http://192.168.1.100:3000`).

### Issue 2: Port 3000 or 5432 is already in use

- **Cause**: An existing PostgreSQL or Node instance is running on the host.
- **Remedy**: Stop conflicting services or modify the external port mappings in `docker-compose.offline.yml` (e.g., `"3001:3000"`).

### Issue 3: Camera permission denied on Kiosk Tablet

- **Cause**: Android runtime permission not yet granted.
- **Remedy**: Open Android Settings > Apps > GymERP Kiosk > Permissions > enable Camera and Microphone.
