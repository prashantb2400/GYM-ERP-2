<div align="center">

  <img src="public/gymerp_app_logo.jpg" alt="GymERP Logo" width="140" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.35);" />

  # 🏋️‍♂️ GymERP v2.5

  ### **Enterprise Multi-Tenant Gym SaaS • Autonomous AI Voice Kiosk • CCTV Surveillance & Vigilance Matrix**

  [![Next.js](https://img.shields.io/badge/Next.js-16.2_(Turbopack)-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![FastAPI](https://img.shields.io/badge/CCTV_Edge-FastAPI_Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![MCP](https://img.shields.io/badge/MCP_Server-Model_Context_Protocol-8A2BE2?style=for-the-badge)](https://modelcontextprotocol.io/)
  [![Vitest](https://img.shields.io/badge/Tests-30%2F30_Passing_(248_Tests)-22c55e?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

  <br />

  **GymERP** is an all-in-one, enterprise-grade multi-tenant gym management platform. It pairs comprehensive member management, GST invoicing, lead CRM, and WhatsApp broadcasts with **four synchronized attendance modalities**:
  1. **Autonomous AI Voice Kiosk** (Android lobby tablet with circular water visual UI, voice conversation, automated registration, KYC OCR, and receipt printing)
  2. **CCTV Surveillance & Vigilance Hub** (RTSP multi-feed matrix with edge AI face detection fail-safe for members missing the kiosk)
  3. **Zero-Install In-Browser WebGL Face Kiosk** (Client-side 128-d vector matching in Chrome with zero native desktop software)
  4. **Dynamic QR Code & Optical Fingerprint Stations** (Mantra / SecuGen USB biometric drivers & mobile passes)

  <br />

  [✨ Features](#-key-features) • [🏛️ Architecture](#-system-architecture) • [🚀 Deployment Guide](#-step-by-step-production-deployment-guide) • [📹 CCTV Integration](#-complete-cctv--vigilance-integration-guide) • [📱 Tablet Kiosk Setup](#-autonomous-ai-voice-tablet-kiosk-setup) • [🤖 MCP Server](#-model-context-protocol-mcp-server) • [🔒 Security](#-security--compliance)

  <hr />

</div>

---

## 🌟 Key Features

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   GYMERP PLATFORM MATRIX                               │
├───────────────────────┬────────────────────────┬───────────────────────────────────────┤
│ 🏢 Multi-Tenant SaaS  │ 🤖 Autonomous AI Kiosk │ 📹 CCTV & Attendance Ecosystem        │
├───────────────────────┼────────────────────────┼───────────────────────────────────────┤
│ • Tenant & Branch RLS │ • Voice Water Halo UI  │ • Live RTSP Camera Matrix (1x1, 2x2)  │
│ • Super Admin Portal  │ • Zero-Password Code   │ • Automated Attendance Fail-Safe      │
│ • GST Tax Invoicing   │ • Speech-to-Speech AI  │ • Browser WebGL Face Kiosk            │
│ • Razorpay Gateway    │ • KYC ID Document OCR  │ • Mantra / SecuGen Fingerprint Reader │
│ • WhatsApp Cloud CRM  │ • Thermal ESC-POS Print│ • Dynamic QR Pass & HTML5 Scanner     │
│ • Role-Based Access   │ • Secret Server LLM    │ • Universal Station Quick-Switcher    │
└───────────────────────┴────────────────────────┴───────────────────────────────────────┘
```

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Kiosks["Lobby & Physical Entry Layer"]
        TabletKiosk["📱 Android Voice Tablet Kiosk<br/>(/kiosk/agent • Voice Water UI)"]
        WebKiosk["💻 Reception Web Kiosk<br/>(/dashboard/attendance/face-kiosk)"]
        CCTVCams["📹 IP Security Cameras<br/>(Hikvision / Dahua / CP Plus RTSP)"]
        BioUSB["👆 Biometric USB Scanners<br/>(Mantra MFS100 / SecuGen)"]
    end

    subgraph EdgeServices["Local Gym Hardware & Edge Bridges"]
        CCTVEdge["🐍 Python CCTV Edge Service<br/>(cctv-service • OpenCV/dlib)"]
        HWBridge["🔌 Go/Node Hardware Bridge<br/>(hardware-bridge • USB HID)"]
        CFTunnel["🚇 Cloudflare Tunnel (cloudflared)<br/>(Zero-NAT Secure Ingress)"]
    end

    subgraph CloudApp["Cloud Application Layer (Next.js 16)"]
        Middleware["Security & Auth Middleware<br/>(Tenant Isolation & Dev Auth)"]
        CCTVAPI["/api/cctv/*<br/>(Cameras, Streams & HMAC Webhook)"]
        KioskAPI["/api/kiosk/*<br/>(6-Char Pairing & Voice Check-In)"]
        AttendAPI["/api/attendance/*<br/>(Face Roster, QR & Logs)"]
        BillingAPI["/api/payments & /api/invoices<br/>(GST Engine & Razorpay Webhooks)"]
        MCPServer["MCP Server (port 8080)<br/>(Agentic Tool Protocol)"]
    end

    subgraph DatabaseCloud["Cloud Data & Storage (Supabase)"]
        SupaAuth["Supabase Authentication"]
        SupaDB[("PostgreSQL with Row-Level Security<br/>18 Sequential Migrations")]
        SupaStorage["Supabase Storage S3<br/>(Private Buckets & Signed URLs)"]
    end

    CCTVCams -->|RTSP H.264| CCTVEdge
    CCTVEdge -->|HTTPS Webhook| CFTunnel
    CFTunnel --> CCTVAPI
    TabletKiosk -->|HTTPS / WSS| KioskAPI
    BioUSB --> HWBridge
    HWBridge --> AttendAPI
    WebKiosk --> AttendAPI

    Middleware --> CCTVAPI & KioskAPI & AttendAPI & BillingAPI & MCPServer
    CCTVAPI & KioskAPI & AttendAPI & BillingAPI --> SupaAuth & SupaDB & SupaStorage
```

---

## 🚀 Step-by-Step Production Deployment Guide

You can deploy GymERP using any of the following 4 methods depending on your infrastructure:

### Method A: Vercel Cloud (Recommended for SaaS)

1. **Fork or Clone Repository**:
   ```bash
   git clone https://github.com/prashantb2400/GYM-ERP-2.git
   cd GYM-ERP-2
   ```

2. **Provision Supabase Project**:
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Open **SQL Editor** and run migrations `001_initial.sql` through `017_cctv_and_vigilance.sql` in sequential order (or use `supabase db push`).

3. **Deploy on Vercel**:
   - Import the repository on [Vercel](https://vercel.com).
   - Set the Framework Preset to **Next.js**.
   - Configure Environment Variables (refer to [Environment Variables](#-environment-variables-reference)).
   - Click **Deploy**.

4. **Add Custom Domain & SSL**:
   - In Vercel Project Settings > Domains, attach your custom domain (e.g. `app.yourgym.com`).
   - SSL certificates are automatically provisioned.

---

### Method B: Docker & Docker Compose (Full Stack with Edge Microservices)

Deploy the full stack including the Next.js app, CCTV edge service, and hardware bridge on a single server:

1. **Clone repository and configure environment files**:
   ```bash
   git clone https://github.com/prashantb2400/GYM-ERP-2.git
   cd GYM-ERP-2
   cp .env.example .env
   cp cctv-service/.env.example cctv-service/.env
   cp hardware-bridge/.env.example hardware-bridge/.env
   ```

2. **Edit root `.env` with your Supabase credentials**:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CCTV_WEBHOOK_SECRET=your-secure-random-token
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Launch all containers**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify running services**:
   ```bash
   docker compose ps
   # Services running:
   # nextjs-app       -> http://localhost:3000
   # cctv-service     -> http://localhost:5001
   # hardware-bridge  -> http://localhost:5002
   # redis            -> http://localhost:6379
   ```

---

### Method C: Linux VPS Deployment (Ubuntu / Debian + Nginx + PM2)

For deployment on your own dedicated server or cloud VPS (DigitalOcean, AWS EC2, Hetzner):

#### Step 1: Install Node.js 20+, Python 3.10+, and Nginx
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential cmake

# Install PM2 process manager
sudo npm install -g pm2
```

#### Step 2: Clone and Build GymERP
```bash
cd /var/www
sudo git clone https://github.com/prashantb2400/GYM-ERP-2.git gymerp
sudo chown -R $USER:$USER /var/www/gymerp
cd /var/www/gymerp

# Install dependencies & build Next.js
npm install
cp .env.example .env.local
nano .env.local  # Fill in your production Supabase & LLM keys
npm run build
```

#### Step 3: Start Application with PM2
```bash
pm2 start npm --name "gymerp-web" -- start -- -p 3000
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx Reverse Proxy with WebSocket Support
Create `/etc/nginx/sites-available/gymerp`:

```nginx
server {
    server_name app.yourgym.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: Direct proxy to CCTV Edge Service
    location /cctv-api/ {
        proxy_pass http://127.0.0.1:5001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

Enable site and configure SSL with Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/gymerp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install free Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourgym.com
```

---

### Method D: Cloudflare Tunnel (Zero Port-Forwarding / Remote Webhooks)

When hosting in a gym facility behind CGNAT or without a public static IP, Cloudflare Tunneling securely exposes the dashboard, tablet pairing, and WhatsApp webhooks:

1. **Install cloudflared on the gym server**:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel**:
   ```bash
   cloudflared tunnel create gymerp-hub
   ```

4. **Configure `~/.cloudflared/config.yml`**:
   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

   ingress:
     - hostname: kiosk.yourgym.com
       service: http://localhost:3000
     - hostname: cctv.yourgym.com
       service: http://localhost:5001
     - service: http_status:404
   ```

5. **Route DNS and start tunnel as a background service**:
   ```bash
   cloudflared tunnel route dns gymerp-hub kiosk.yourgym.com
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```

Now your gym kiosks, CCTV edge microservice, and WhatsApp webhooks can communicate securely without router port-forwarding!

---

## 📹 Complete CCTV & Vigilance Integration Guide

The CCTV system connects standard IP security cameras directly to GymERP for **live matrix surveillance** and **automated attendance fail-safe** (capturing members who bypass the reception kiosk).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CCTV ATTENDANCE FLOW                            │
│                                                                        │
│   [ 📹 Entrance RTSP Camera ]                                          │
│             │                                                          │
│             ▼  (RTSP Stream H.264 @ 15fps)                             │
│   [ 🐍 cctv-service / Edge Watchdog ]                                  │
│             │                                                          │
│             ├─► Detect Face -> Extract 128-d Vector                   │
│             ├─► Compare Vector with Member Roster                     │
│             │                                                          │
│             ▼  (POST /api/cctv/webhook)                                │
│   [ ⚡ GymERP Next.js Backend ]                                         │
│             │                                                          │
│             ├─► If Member Found -> Log Attendance (method: 'cctv')     │
│             ├─► If Overdue / Expired -> Create Vigilance Triage Alert  │
│             └─► If Unrecognized Person -> Log Unknown Visitor Snapshot │
│             │                                                          │
│             ▼                                                          │
│   [ 🖥️ Owner Dashboard: /dashboard/cctv ]                             │
│       • Live 1x1, 2x2, 3x3 Camera Grid                                 │
│       • Realtime Auto-Attendance Log                                   │
│       • One-Click "Convert Visitor to Lead"                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Supported Cameras & Protocol Requirements

GymERP connects to any standard IP camera that exposes an **RTSP stream** (H.264 / H.265 / MJPEG):
* **Hikvision**: `rtsp://admin:<password>@<camera-ip>:554/Streaming/Channels/101` (Main) or `/102` (Sub)
* **CP Plus**: `rtsp://admin:<password>@<camera-ip>:554/cam/realmonitor?channel=1&subtype=0`
* **Dahua**: `rtsp://admin:<password>@<camera-ip>:554/cam/realmonitor?channel=1&subtype=1`
* **Uniview**: `rtsp://admin:<password>@<camera-ip>:554/unicast/c1/s0/live`
* **TP-Link Tapo**: `rtsp://<account>:<password>@<camera-ip>:554/stream1`
* **USB / V4L2 Webcams**: Supported on edge via `/dev/video0`.

> **Recommendation**: For face detection and attendance, use the **Sub-stream** (e.g. 720p or 1080p @ 15fps). Sub-streams provide near-instant low-latency AI processing with minimal CPU overhead.

---

### 2. Adding Cameras in the GymERP Dashboard

1. Log in to the GymERP Owner/Admin Dashboard.
2. In the sidebar, click **CCTV & Vigilance** (or navigate to `/dashboard/cctv`).
3. Click the **Add Camera** button in the top right.
4. Fill in camera parameters:
   - **Camera Name**: e.g. `Main Entrance Gate 1`
   - **RTSP Stream URL**: e.g. `rtsp://admin:Pass123@192.168.1.108:554/Streaming/Channels/102`
   - **Location**: e.g. `Lobby Entrance`
   - **Target Branch**: Assign to a specific branch or Master HQ
   - **Face Auto-Attendance**: Toggle **ON** (automatically logs attendance when enrolled member faces are detected)
   - **Record Vigilance Events**: Toggle **ON** (captures snapshots of unknown visitors or defaulters)
5. Click **Save Camera Feed**. The camera feed appears in the multi-view grid immediately.

---

### 3. Running the Edge Recognition Microservice (`cctv-service`)

The edge service captures the RTSP feed, runs face detection using OpenCV and dlib, and delivers webhooks back to GymERP:

```bash
cd cctv-service

# 1. Create Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# 2. Install Dependencies
pip install -r requirements.txt

# 3. Configure .env
cp .env.example .env
```

Edit `cctv-service/.env`:
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GYMERP_WEBHOOK_URL=http://localhost:3000/api/cctv/webhook
GYMERP_WEBHOOK_SECRET=your-shared-cctv-secret
FACE_TOLERANCE=0.45
LOG_LEVEL=INFO
```

Start the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

---

### 4. CCTV Webhook Payload Contract

The edge service sends event notifications to `/api/cctv/webhook`:

```json
POST /api/cctv/webhook
Headers:
  x-cctv-token: your-shared-cctv-secret
  Content-Type: application/json

Body:
{
  "camera_id": "c1f73b88-1234-4a21-9988-123456789abc",
  "gym_id": "gym-hq-uuid",
  "event_type": "auto_attendance",
  "member_id": "member-uuid",
  "confidence": 0.94,
  "snapshot_url": "https://storage.supabase.co/cctv/snapshot-123.jpg",
  "metadata": {
    "camera_name": "Main Entrance",
    "bounding_box": [120, 150, 280, 310]
  }
}
```

**Actions Executed by GymERP**:
* **`auto_attendance`**: Marks attendance for the member with `method: 'cctv'`. If already checked in today, ignores duplicates cleanly.
* **`unknown_visitor`**: Adds an entry to the Vigilance Triage feed. Staff can click **"Create Lead"** to start an automated WhatsApp guest pass.
* **`expired_member`**: Flags the check-in and triggers an automated WhatsApp renewal link to the member.
* **`due_defaulter`**: Displays an overdue indicator on the reception topbar.

---

## 📱 Autonomous AI Voice Tablet Kiosk Setup

GymERP features an autonomous voice kiosk interface for lobby Android tablets (`/kiosk/agent`):
* **Circular Voice Water Animation**: Visual audio waveform response that expands, ripples, and pulses dynamically during speech.
* **Zero-Password Hardware Pairing**: Pair any tablet in 5 seconds using a 6-character short code without revealing gym credentials.
* **Continuous Vision Watchdog**: Hardware-accelerated client-side face recognition checks in members as they step in front of the tablet.
* **Automated Voice Registration & KYC**: Speech assistant conducts member registration, captures ID proof photos, and extracts details via server OCR.

```
┌───────────────────────────────────────────────────────────┐
│              ZERO-PASSWORD TABLET PAIRING                 │
├─────────────────────────────┬─────────────────────────────┤
│ 1. Open Tablet Browser      │ 2. Authorize in Dashboard   │
│                             │                             │
│ Navigate to:                │ Open GymERP Dashboard >     │
│ https://app.yourgym.com/    │ Settings > Kiosk Tablets.   │
│ kiosk/agent                 │                             │
│                             │ Click "Pair New Tablet".    │
│ Screen displays code:       │ Type 6-char code:           │
│ ┌───────────────────────┐   │ ┌───────────────────────┐   │
│ │        K 9 X 2 P 4    │   │ │       [ K9X2P4 ]      │   │
│ └───────────────────────┘   │ └───────────────────────┘   │
│                             │                             │
│ The tablet is paired instantly and authorized permanently! │
└─────────────────────────────┴─────────────────────────────┘
```

### Steps to Deploy on an Android Tablet:

1. **Hardware Recommendation**:
   - Any Android tablet (Samsung Galaxy Tab A8/A9, Lenovo M10, Xiaomi Pad, or Amazon Fire HD 10).
   - Minimum 3GB RAM, Android 10+, Front Camera 5MP+.

2. **Kiosk Lockdown (Prevent App Tampering)**:
   - Install **Fully Kiosk Browser** from Google Play Store.
   - Set Start URL to: `https://app.yourgym.com/kiosk/agent`.
   - Enable:
     - *Kiosk Mode* (disables status bar, home button, back button).
     - *Webcam & Microphone Autostart Permission*.
     - *Keep Screen On while plugged in*.

3. **Pair Tablet**:
   - The tablet displays a 6-character pairing code (e.g. `K9X2P4`).
   - Log into your GymERP Owner Dashboard on your computer or phone.
   - Go to **Settings > Self-Kiosk & AI Voice Tablets**.
   - Click **Pair New Tablet**, select the branch location, enter the code, and click **Authorize Tablet**.
   - The tablet instantly switches to active mode and begins autonomous operation!

4. **Configuring Thermal Receipt & Invoice Printer**:
   - Connect any standard **80mm USB / Bluetooth ESC/POS printer** (Epson, TVS, Rongta, NGX).
   - In Fully Kiosk Browser settings, enable *Direct Thermal ESC/POS USB Printing*.
   - When a new member registers or pays dues via the tablet, GymERP prints their tax invoice and personalized diet plan automatically.

---

## 🤖 Model Context Protocol (MCP) Server

GymERP includes an **MCP Server** (`mcp-server/`) allowing AI assistants (Claude Desktop, Cursor, DeepMind Antigravity, Custom LLM Agents) to manage the gym via standardized tools:

### Available MCP Tools

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `get_attendance_stats` | `gym_id`, `branch_id`, `date` | Fetch real-time attendance counts and hourly breakdown |
| `search_members` | `gym_id`, `query`, `status` | Query member profiles, dues, phone numbers, and validity |
| `create_member` | `gym_id`, `name`, `phone`, `plan_id` | Enroll new gym members with automatic code generation |
| `log_cctv_event` | `camera_id`, `member_id`, `event_type` | Post synthetic or camera vigilance events into the triage queue |
| `list_cameras` | `gym_id`, `branch_id` | View configured CCTV cameras and online status |
| `generate_invoice` | `gym_id`, `member_id`, `amount`, `gst` | Issue GST-compliant invoice and return download link |

### Running the MCP Server

```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

Or connect it to Claude Desktop / Cursor in `mcp_config.json`:

```json
{
  "mcpServers": {
    "gymerp": {
      "command": "node",
      "args": ["/var/www/gymerp/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

---

## 🗄️ Database Migrations Reference

GymERP uses 17 sequential PostgreSQL migrations located in `supabase/migrations/`:

| Migration | File | Description |
| :---: | :--- | :--- |
| **001** | `001_initial.sql` | Core schema: gyms, users, members, plans, invoices, attendance, RLS policies |
| **002** | `002_v2_features.sql` | Expenses, inventory, diet charts, exercise routines, KYC documents |
| **003** | `003_push_subscriptions.sql` | Web Push notification subscriptions and delivery queue |
| **004** | `004_platform_subscriptions.sql` | SaaS billing tiers, Super Admin metrics, platform invoices |
| **005** | `005_qr_attendance.sql` | Member dynamic QR tokens (`gym_token`) and kiosk methods |
| **006** | `006_in_browser_face_attendance.sql` | 128-d biometric descriptor array and DPDP consent tracking |
| **007** | `007_branch_isolation.sql` | Multi-branch gym isolation, branch managers, branch-scoped RLS |
| **008** | `008_fix_users_recursion.sql` | Optimized RLS helper functions eliminating recursive policy checks |
| **009** | `009_storage_buckets.sql` | S3 storage buckets: avatars, member-photos, kyc-documents, invoices |
| **010** | `010_qr_and_face_biometrics.sql` | Check-in constraints, liveness metrics, and duplicate windows |
| **011** | `011_fix_users_infinite_recursion.sql` | High-concurrency RLS policy optimizations for tenant isolation |
| **012** | `012_fingerprint_biometrics.sql` | Minutiae template storage for Mantra MFS100 / SecuGen devices |
| **013** | `013_leads.sql` | Sales pipeline CRM, lead capture, trial visits, follow-up scheduler |
| **014** | `014_admission_fee.sql` | One-time registration fees, invoice breakdowns, GST calculations |
| **015** | `015_staff_access_hardening.sql` | Granular permission arrays (`cctv.view`, `settings.manage`, etc.) |
| **016** | `016_kiosk_device_pairings.sql` | 6-char pairing tokens, tablet device registration, device heartbeats |
| **017** | `017_cctv_and_vigilance.sql` | `cctv_cameras`, `vigilance_events`, RTSP parameters, `cctv` method |

Apply all migrations at once via Supabase CLI:
```bash
supabase db push
```

---

## 🔑 Environment Variables Reference

| Variable Name | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase Project API URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase Public Anonymous Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase Service Role Key (Server-Only) | `eyJhbGciOi...` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public canonical URL of your GymERP app | `https://app.yourgym.com` |
| `GEMINI_API_KEY` | Optional | Google Gemini API Key for Voice Kiosk & OCR | `AIzaSy...` |
| `OPENAI_API_KEY` | Optional | Alternative LLM Key for Voice Agent | `sk-...` |
| `CCTV_WEBHOOK_SECRET` | Optional | Shared token between `cctv-service` & Next.js | `openssl rand -hex 32` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay Merchant Key for online fees | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay Key Secret | `...` |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Razorpay Webhook Secret for signature validation | `...` |
| `WHATSAPP_TOKEN` | Optional | Meta WhatsApp Cloud API access token | `EAAx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | Meta WhatsApp Business Phone Number ID | `10599283...` |
| `CRON_SECRET` | Optional | Bearer secret for automated midnight crons | `openssl rand -hex 32` |

---

## 🔒 Security & Compliance

* **DPDP Act 2023 Compliance**: Biometric facial descriptors are stored as mathematical vectors only. Raw camera images are never stored permanently unless explicitly captured as part of temporary security vigilance. Members have an immediate **Right to Erasure** button.
* **BOLA-Hardened Tenant Boundaries**: Every API endpoint validates that the target `gym_id` matches the authenticated user context. Cross-gym spoofing is rejected at the database and middleware layers (`supabaseAdmin` queries explicitly scope `gym_id`).
* **Private Storage & Signed URLs**: KYC buckets (`kyc`, `kyc-documents`) are completely private with tenant-scoped RLS policies. Documents are accessed exclusively via short-lived pre-signed URLs (60-minute expiry) to eliminate unauthorized data leaks.
* **Constant-Time HMAC Verification**: Webhooks for Razorpay, WhatsApp, cron endpoints, and CCTV edge ingestion use constant-time cryptographic verification (`crypto.timingSafeEqual`) to eliminate side-channel timing attacks.
* **Cryptographic Kiosk Pairing**: Kiosk pairing codes utilize CSPRNG (`crypto.randomInt`) with 15-minute TTL and IP rate-limiting to eliminate brute-force vector surfaces.
* **Encrypted Secrets & Server-Side LLMs**: LLM API keys are kept strictly server-side and never exposed to the browser or kiosk client bundle.

---

## 🧪 Testing & Automated Verification

GymERP is backed by an automated test suite powered by **Vitest**:

```bash
# Run unit & integration test suite (30 test suites, 248 tests)
npm test

# Run TypeScript compiler verification
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Build production bundle
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>GymERP — Empowering gym owners with autonomous AI and unified biometric intelligence.</sub>
</div>
