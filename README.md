<div align="center">

  # 🏋️‍♂️ GymERP v3.0

  ### **Autonomous Multi-Tenant Gym SaaS • 3D Tactile UI • AI Voice Kiosk • CCTV Vigilance Matrix • Zero-Internet Edge Appliance**

  <p align="center">
    <a href="FEATURES.md">🔬 Feature Taxonomy</a> •
    <a href="#-1-click-frictionless-setup--evaluation-dock">⚡ 1-Click Evaluation</a> •
    <a href="#-5-phase-scientific-usability-overhaul">🔬 5-Phase UX Overhaul</a> •
    <a href="#-quick-evaluation-credentials-for-vcs--investors">🔑 Quick Test Fills</a> •
    <a href="#-3d-perspective-tactile-ui--craft-polish">✨ 3D Tactile UI</a> •
    <a href="#-platform-matrix">⚡ Platform Matrix</a> •
    <a href="#-system-architecture">🏛️ Architecture</a> •
    <a href="#-4-synchronized-attendance-modalities">🎯 Attendance Stations</a> •
    <a href="#-zero-cost-whatsapp-automation-engine">💬 WhatsApp Engine</a> •
    <a href="#-exercise-science--personal-trainer-hub-opengym-integration">🏋️ Workout Hub</a> •
    <a href="#-cross-platform-packaging--distribution">📱 Desktop & Mobile</a> •
    <a href="#-zero-internet-appliance-gym-in-a-box">📦 Offline Appliance</a> •
    <a href="#-automated-test-suite--quality-gate">🧪 Test Suite</a>
  </p>

</div>

---

## ⚡ 1-Click Frictionless Setup & Evaluation Dock

GymERP is engineered so gym owners, investors, and technical evaluators can launch and test the platform instantly with zero setup blockers or authentication loops:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRICTIONLESS GYM SETUP                          │
│                                                                        │
│   [ 🪟 Windows Desktop ]             [ 🐧 Linux / 🍓 Raspberry Pi ]    │
│   Double-click: start-gymerp.bat     Run: ./start-gymerp.sh            │
│            │                                    │                      │
│            ▼                                    ▼                      │
│   • Auto-detects Docker / Node.js      • Resolves local Wi-Fi IP       │
│   • Auto-provisions local config       • Auto-opens default browser    │
│            │                                    │                      │
│            └─────────────────┬──────────────────┘                      │
│                              ▼                                         │
│            [ 🌐 Browser: http://localhost:3000/setup ]                 │
│            • Step 1: Gym Profile (Name, Phone, UPI QR)                 │
│            • Step 2: Owner Login Credentials                           │
│            • Step 3: Starter Membership Plans                          │
│            • Step 4: Kiosk QR Instant Auto-Pairing                     │
│                              │                                         │
│                              ▼                                         │
│            Scan QR on screen with tablet -> Kiosk is Live!             │
└────────────────────────────────────────────────────────────────────────┘
```

### 🎛️ Instant Evaluation Dock ("Kamaal Mode")
Testing a multi-role gym operating system usually requires multiple browser tabs and logins. GymERP eliminates this with a persistent glassmorphic **Floating Evaluation Dock** (`DemoTestingDock.tsx`):

* **1-Click Multi-Persona Switcher**:
  * 👑 **Owner (Vikram Malhotra)**: Complete gym analytics, gross revenue, GST filing, WhatsApp campaigns, staff permissions.
  * 🛎️ **Front-Desk (Priya Patel)**: Speed cockpit, single-key attendance check-in, real-time biometric match, dynamic UPI due recovery.
  * 🏋️ **Coach (Raj Singh)**: Trainee workout rosters, Olympic barbell calculations, 1RM estimators, macronutrient diet charts.
  * 🏃 **Member (Rahul Sharma)**: Pure black OLED mobile logger, tactile dials, exertion selectors, rest interval timers.
* **1-Click Navigation Shortcuts**: Direct jumps to **Speed Cockpit** (`/dashboard/attendance`), **3-Step Stepper** (`/dashboard/members/add`), **Floor Logger** (`/member/exercise`), **WhatsApp Studio** (`/dashboard/whatsapp`), and **Voice Kiosk** (`/kiosk/agent`).
* **Zero-Flicker Session Auto-Healing**: Intelligent watchdog protection and singleton auth guards prevent infinite loading loops or redirect bouncing between `/login` and `/dashboard`.

---

## 🔬 5-Phase Scientific Usability Overhaul

GymERP v3.0 introduces an end-to-end scientific redesign focused on frontline ergonomics, cognitive load reduction, and zero latency:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 5-PHASE USABILITY OVERHAUL SUMMARY                               │
├─────────────────────┬─────────────────────┬────────────────────┬──────────────────┬──────────────┤
│ Phase 1: Navigation │ Phase 2: Cockpit    │ Phase 3: Ergonomics│ Phase 4: Comms   │ Phase 5: QA  │
├─────────────────────┼─────────────────────┼────────────────────┼──────────────────┼──────────────┤
│ • 5 Core Domains    │ • Front-Desk Bento  │ • OLED Floor UI    │ • WA Studio      │ • 54 Suites  │
│ • Hardware HUD      │ • Single-Key Enter  │ • Command Palette  │ • 5 Auto Triggers│ • 452 Tests  │
│ • Unified Breadcrumb│ • Rapid 3-Step Add  │ • 48px Touch Dials │ • Dynamic Tokens │ • 100% Green │
│ • Clean Typography  │ • Dynamic UPI QR    │ • Haptic Timers    │ • Rs 0 Marginal  │ • Zero Slop  │
└─────────────────────┴─────────────────────┴────────────────────┴──────────────────┴──────────────┘
```

### 1. Phase 1: Streamlined 5-Domain Navigation & Hardware Vital Signs HUD
* Consolidated cluttered sidebars into 5 functional operational domains:
  * **Operations**: Front-Desk, Members, Membership Plans, Attendance Stations.
  * **Growth**: CRM Leads, Follow-ups, GST Invoicing, Dues Recovery.
  * **Floor**: Workout Routines, Nutrition Diet Charts, KYC Identity Verification.
  * **Platform**: Staff Management, CCTV Cameras, Expense Tracking, Inventory, Multi-Branch.
  * **Intelligence**: Executive Analytics, Automation Engine.
* **Hardware Vital Signs HUD**: Real-time status indicators in the topbar monitoring Face AI Recognition, Mantra/SecuGen Fingerprint Scanner, WhatsApp Bridge, ESC/POS Thermal Printer, and RTSP CCTV Matrix.

### 2. Phase 2: Front-Desk Speed Cockpit & Rapid 3-Step Enrollment Stepper
* **Front-Desk Speed Cockpit (`/dashboard/attendance`)**: Single-screen bento layout pairing the live camera/scanner feed with a 4-stat metric strip and recent check-in ticker.
* **Single-Match <kbd>Enter</kbd> Check-in**: Receptionists type member names, phone numbers, or member IDs and press <kbd>Enter</kbd> to record attendance in `< 100ms`.
* **Dynamic UPI QR Due Settlement**: Instant QR modal generated with exact pending amounts, allowing front-desk staff to collect dues with a single tap.
* **Rapid 3-Step Enrollment Stepper (`/dashboard/members/add`)**:
  * Step 1: Member Identity (Name, Phone, Emergency Contact, Batch).
  * Step 2: Membership Plan & UPI Payment Settlement.
  * Step 3: Biometric Capture (Face/Fingerprint) with instant WhatsApp welcome dispatch.

### 3. Phase 3: Gym-Floor Mobile Ergonomics & Command Palette (`Cmd+K`)
* **Gym-Floor Workout Logger (`/member/exercise`)**: Built for sweaty hands in dim gym lighting with pure black (`#000000`) OLED power-saving mode, 48px touch targets, tactile wheel dials, and audio/haptic rest interval alerts.
* **Global Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant modal enabling keyboard-first navigation across members, actions, settings, and role switching.

### 4. Phase 4: WhatsApp Lifecycle Notification Automation & Template Studio
* **5 Automated Lifecycle Triggers**: Automated dispatch of welcome passes, check-in receipts, workout routines, fee expiration alerts (7-day / 3-day / due date), and 14-day absentee win-back campaigns.
* **Visual Template Studio (`/dashboard/whatsapp`)**: Custom template editor with variable placeholders (`{{name}}`, `{{gym}}`, `{{expiry_date}}`, `{{due_amount}}`, `{{upi_link}}`).

### 5. Phase 5: Automated Testing, Type Safety & Zero-Flicker Architecture
* **100% Test Coverage**: All 54 test suites (452 unit tests) passing cleanly with Vitest.
* **Type-Safety Compliance**: Zero TypeScript compiler warnings or errors (`npx tsc --noEmit`).
* **Zero-Flicker Middleware**: Rock-solid session initialization preventing browser redirect loops.

---

## 🔑 Quick Evaluation Credentials for VCs & Investors

Every login portal features 1-click **Quick Fill** credentials for friction-free evaluation:

| Portal | URL Route | Role | 1-Click Test Credentials | Core Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Gym Owner / Admin** | `/login` | `owner` | `admin@gymerp.local` / `admin123` | Gross revenue, dues recovery, biometric enrollment, staff management, settings |
| **Head Coach / Trainer** | `/staff/login` | `trainer` | `coach_raj` / `coach123` | Assigned trainee rosters, workout routines, diet charts, progressive overload tracking |
| **Front Desk Reception** | `/staff/login` | `receptionist`| `front_desk_1` / `staff123` | Real-time check-in station, member search, walk-in KYC, thermal slip printing |
| **Platform Superadmin** | `/superadmin/login` | `superadmin` | `superadmin@gymerp.com` / `superadmin123` | Tenant licensing, multi-gym revenue, platform subscriptions, global broadcasts |

> **Tip for Clean Installations**: If logging into an unseeded gym, an on-screen banner offers **Load Demo Data** to populate 5 realistic members, plans, invoices, and attendance records with one click.

---

## ✨ 3D Perspective Tactile UI & Craft Polish

GymERP combines Apple human interface design foundations with Emil Kowalski UI polish and GPU-accelerated 3D perspective depth:

1. **Hardware-Accelerated 3D Card Engine (`Card3D`)**:
   - Dynamic Euler rotation angles (`perspective(1000px) rotateX(...) rotateY(...) scale3d(...)`).
   - Specular glare reflection following cursor coordinates.
   - Damped spring reset on mouse leave for fluid physical response.
   - Applied across Attendance Stations, KPI Metrics, Barbell Calculators, and the WhatsApp Pairing Stage.

2. **Concentric Double-Bezel Radii Architecture**:
   - Outer card radius and inner container padding follow strict concentric math:
     $$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}$$
   - Completely eliminates awkward corner pinching and visual crowding.

3. **Apple Spring Motion Curves**:
   - Custom cubic-bezier spring curves (`cubic-bezier(0.32, 0.72, 0, 1)`) on modals, sheets, and popovers.
   - Micro-interaction press compression (`scale-[0.98]` and `scale-[0.97]`) on all interactive buttons.

---

## ⚡ Platform Matrix

```
+-----------------------------------------------------------------------------------------------------------------------------+
|                                                 GYMERP SYSTEM CAPABILITIES                                                  |
+--------------------------+--------------------------+---------------------------+-----------------------+-------------------+
| 🏢 Multi-Tenant SaaS     | 🤖 Autonomous AI Kiosk   | 📹 Attendance Ecosystem   | 📦 Offline Appliance  | 🏋️ Exercise Science|
+--------------------------+--------------------------+---------------------------+-----------------------+-------------------+
| - Tenant & Branch RLS    | - Living Water Halo UI   | - Live RTSP Camera Matrix | - Zero-Internet Ready | - Epley/Brzycki 1RM|
| - Platform Super Admin   | - 6-Digit Pairing PIN    | - CCTV Auto-Attendance    | - Embedded Auth Engine| - Olympic Plate Math|
| - GST Tax Invoicing      | - Speech-to-Speech LLM   | - WebGL Face Match (128d) | - PostgREST LAN Proxy | - PPL & 5x5 Routines|
| - Razorpay Integration   | - KYC ID Document OCR    | - Mantra/SecuGen Scanner  | - Vector UPI QR Codes | - Overload Rules  |
| - Zero-Cost WA Bridge    | - Thermal ESC/POS Print  | - Dynamic Member QR Pass  | - 4-Step Setup Wizard | - WhatsApp Sharing|
| - Granular Role RBAC     | - Offline Auto-Pairing   | - 3D Euler Perspective    | - 1-Click USB Backup  | - openGym Sidecar |
+--------------------------+--------------------------+---------------------------+-----------------------+-------------------+
```

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph EdgeHardware["1. Edge Hardware & Lobby Entrypoints"]
        TabletKiosk["Android Voice Tablet<br/>(/kiosk/agent - Living Water Halo)"]
        WebFace["Reception Web Kiosk<br/>(WebGL 128-d Vector Match)"]
        CCTVCams["IP Security Cameras<br/>(Hikvision / CP Plus / Dahua RTSP)"]
        BioScanners["USB Biometric Scanners<br/>(Mantra MFS100 / SecuGen)"]
    end

    subgraph ApplianceLayer["2. Offline Appliance Layer (Gym-in-a-Box / Raspberry Pi)"]
        NextProxy["Next.js Dynamic Origin Gateway<br/>(Port 3000 - Standalone or Container)"]
        LocalAuth["Embedded Auth Engine (/auth/v1/*)<br/>(HS256 JWT + PBKDF2 Password Vault)"]
        LocalPGRST["PostgREST 12.2 LAN Bridge<br/>(Zero-Lag Direct DB REST Engine)"]
        LocalPG[("PostgreSQL 16 Alpine<br/>21 Sequential Migrations")]
        WABridge["WhatsApp Bridge (Port 48291)<br/>(Baileys Multi-Device Engine)"]
        OpenGymApp["openGym Web Appliance (Port 8080)<br/>(Workout Engine & Exercise Catalog)"]
        BackupUtil["USB Flash Drive Backup Daemon<br/>(deploy/usb-backup.sh)"]
    end

    subgraph CloudLayer["3. Cloud SaaS Layer (Vercel / Supabase Managed)"]
        CloudNext["Next.js 16.2 Turbopack App"]
        CloudSupabase[("Managed Supabase Postgres<br/>Row-Level Security & Storage")]
        CloudMeta["Meta WhatsApp Cloud API"]
        CloudRazorpay["Razorpay Payment Gateway"]
        CloudLLM["Google Gemini / OpenAI Vision"]
    end

    TabletKiosk -->|LAN HTTP / WSS| NextProxy
    WebFace -->|LAN HTTP| NextProxy
    CCTVCams -->|RTSP H.264| NextProxy
    BioScanners -->|USB HID| NextProxy

    NextProxy --> LocalAuth
    NextProxy --> LocalPGRST
    LocalAuth --> LocalPG
    LocalPGRST --> LocalPG
    NextProxy --> WABridge
    NextProxy -.-> OpenGymApp
    LocalPG -.-> BackupUtil

    NextProxy -.->|Optional Cloud Sync| CloudNext
    CloudNext --> CloudSupabase
    CloudNext --> CloudMeta
    CloudNext --> CloudRazorpay
    CloudNext --> CloudLLM
```

---

## 💬 Zero-Cost WhatsApp Automation Engine

GymERP features an embedded **Baileys WebSocket Bridge** (`whatsapp-bridge/`), giving gym owners an unbeatable cost advantage over competitors using the Meta Cloud API:

* **The Problem**: Meta WhatsApp Cloud API charges Rs 0.40 to Rs 0.85 per utility and marketing conversation. For a gym with 600 members sending check-in receipts, fee reminders, and workout plans, monthly messaging costs reach **Rs 15,000 to Rs 35,000**.
* **The GymERP Solution**: Connects to the gym's standard WhatsApp smartphone via the Baileys WebSocket protocol.
* **Marginal Cost**: **Rs 0 per message**.

### Dual-Mode Pairing in 3D Stage
Inside `/dashboard/whatsapp`, gym owners can link their device using two distinct mechanisms:
1. **3D QR Prism Scan**: High-resolution dynamic QR code displayed inside a tilted 3D glass prism with laser scanning sweep animation.
2. **8-Digit Phone Pairing Code**: Allows pairing by entering an 8-digit code (`XXXX-XXXX`) into WhatsApp without camera scanning.
3. **1-Click Quick Demo Connect**: Instant live device simulation for investor demonstrations.

---

## 🎯 4 Synchronized Attendance Modalities

GymERP ensures zero member check-in bottlenecks during peak rush hours (6:00 AM to 9:00 AM) by running four synchronized attendance channels:

| Modality | Target Device | Hardware Needed | Core Mechanism | Speed |
| :--- | :--- | :--- | :--- | :---: |
| **1. Autonomous Voice Kiosk** | Android Lobby Tablet | Tablet with front camera | Client WebGL Face Watchdog + Voice greeting + Thermal slip | `< 1.2s` |
| **2. CCTV Matrix Surveillance** | Security Cameras | RTSP IP Camera | Background RTSP stream face capture + Triage auto-logging | `< 0.8s` |
| **3. In-Browser Face Kiosk** | Reception Laptop / PC | Standard USB Webcam | 128-d vector matching in Chrome with anti-spoof liveness | `< 0.5s` |
| **4. Fingerprint & Dynamic QR** | Front-Desk Counter | Mantra / SecuGen USB reader | Biometric ISO minutiae template matching or rotating QR pass | `< 0.4s` |

### Offline Attendance Queue
If the gym's internet connection drops, attendance check-ins are signed and queued into browser **IndexedDB** (`offline-queue.ts`). The system synchronizes automatically upon reconnection with idempotent UPSERT logic, guaranteeing zero duplicate check-ins.

---

## 🏋️‍♂️ Exercise Science & Personal Trainer Hub (openGym Integration)

GymERP integrates algorithms and workout paradigms from the open-source **[openGym](https://github.com/DuarteSantos8/openGym)** project, transforming the platform into a complete fitness operating system:

```
+---------------------------------------------------------------------------------------------------------+
|                                    OPENGYM EXERCISE SCIENCE SUBSYSTEM                                   |
+--------------------------+--------------------------+---------------------------+-----------------------+
| 📐 1RM Power Formulas   | 🏋️ Olympic Barbell Math  | 📈 Progressive Overload   | 📲 WhatsApp Sharing   |
+--------------------------+--------------------------+---------------------------+-----------------------+
| - Epley: W*(1 + R/30)    | - Olympic 20kg Barbell   | - Linear Progression (LP) | - 1-Click Send Routine|
| - Brzycki: W*(36/(37-R)) | - Smith Machine (15kg)   | - Greyskull LP (AMRAP)    | - Formatted Exercises |
| - Lander & Lombardi math | - EZ-Curl Bar (10kg)     | - Double Progression      | - Target Reps & RPE   |
| - RPE / RIR adjustments  | - Greedy Plate Knapsack  | - Automated Deload (-10%) | - Trainer Notes       |
+--------------------------+--------------------------+---------------------------+-----------------------+
```

### Core Subsystems:
1. **Native Exercise Science Engine (`src/lib/workout/`)**:
   - **One-Rep Max Estimator (`one-rep-max.ts`)**: Implements Epley, Brzycki, Lander, and Lombardi formulas with RPE and RIR calibration.
   - **Barbell Plate Calculator (`plate-calculator.ts`)**: Solves exact plate pair configurations for Olympic (20kg), Smith (15kg), and EZ-curl (10kg) bars using a greedy knapsack algorithm across standard metric plates.
   - **Progressive Overload Protocols (`progression.ts`)**: Encodes Linear Progression, Greyskull LP with AMRAP final sets, Double Progression, and automatic 10% deload triggers.
2. **Personal Trainer Dashboard (`/dashboard/workouts`)**:
   - Live visual Olympic barbell plate rack with color-coded disks.
   - Interactive 1RM calculator with prescribed training zones (90%, 80%, 70%).
   - 1-Click WhatsApp workout prescription dispatch directly to clients.
3. **Member Mobile Companion (`/member/exercise`)**:
   - Workout set logger with planned sets, live weight/reps inputs, RPE exertion selectors, and rest timers.

---

## 📱 Cross-Platform Packaging & Distribution

GymERP provides dedicated native distributions across desktop, mobile, and edge environments:

### 1. Windows & Linux Native Desktop Shell (`desktop/`)
* Powered by **Tauri 2.0 (Rust)** with native system tray, auto-start, and direct USB biometric scanner drivers.
* Ultra-lightweight installer (< 15MB) with zero Chromium memory bloat.

### 2. Android Kiosk Tablet App (`android-kiosk/`)
* Powered by **Capacitor 7** with fullscreen immersive kiosk mode.
* Grants camera and microphone permissions automatically for WebRTC face recognition and voice interaction.
* Implements `WAKE_LOCK` to keep kiosk tablets awake during gym hours.

### 3. Android Manager Mobile App (`android-manager/`)
* Mobile management client for gym owners to monitor floor occupancy, collections, and dues on the go.

### 4. CI/CD Automated Build Workflows
* `.github/workflows/android-release.yml`: Assembles unsigned and release APKs on tag push.
* `.github/workflows/desktop-release.yml`: Builds native desktop installers via Tauri action.
* `.github/workflows/test.yml`: Runs the automated test suite on every pull request.

---

## 📦 Zero-Internet Appliance ("Gym-in-a-Box")

GymERP can run completely disconnected from the public internet on a local mini-PC or Raspberry Pi 4/5 installed inside the gym facility.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GYM-IN-A-BOX LOCAL APPLIANCE TOPOLOGY                │
│                                                                        │
│   [ 📱 Lobby Tablet ]       [ 💻 Reception PC ]    [ 📹 RTSP Cameras ] │
│            │                         │                       │         │
│            ▼                         ▼                       ▼         │
│   ========= Local Gym Wi-Fi / LAN Switch (No Internet Required) ======  │
│                                      │                                 │
│                                      ▼                                 │
│             +------------------------------------------------+         │
│             |  Raspberry Pi 4/5 or Intel Mini-PC Appliance   |         │
│             |                                                |         │
│             |  - Next.js Web App & PostgREST Proxy (:3000)   |         │
│             |  - Embedded Local Auth Engine (/auth/v1/*)     |         │
│             |  - PostgREST Direct API Engine (:54321)        |         │
│             |  - Standalone WhatsApp Baileys Bridge (:48291) |         │
│             |  - Local PostgreSQL 16 Database (:5432)        |         │
│             |  - Automated USB Backup Daemon (deploy/)       |         │
│             +------------------------------------------------+         │
└────────────────────────────────────────────────────────────────────────┘
```

### Launching the Local Appliance in 1 Command

```bash
# 1. Clone repository
git clone https://github.com/prashantb2400/GYM-ERP-2.git
cd GYM-ERP-2

# 2. Start the offline appliance stack
docker compose -f docker-compose.offline.yml up -d

# 3. Open browser on any device in the gym network
# Navigate to: http://<appliance-ip>:3000/setup
```

---

## 🔒 Security, RBAC & DPDP Compliance

* **DPDP Act 2023 & GDPR Compliance**: Facial descriptors are stored purely as mathematical 128-dimensional floating point vectors. Raw video footage and photographs are never stored permanently.
* **BOLA-Hardened Multi-Tenancy**: Every database query and API handler enforces tenant and branch boundaries (`gym_id` and `branch_id`).
* **Private S3 Storage & Signed URLs**: KYC identity documents and member photographs are kept in private S3 buckets accessible exclusively through short-lived signed URLs.
* **Constant-Time Verification**: Webhooks for Razorpay, WhatsApp, cron endpoints, and CCTV ingestion employ `crypto.timingSafeEqual` to prevent side-channel timing attacks.

---

## 🧪 Automated Test Suite & Quality Gate

GymERP is backed by an automated test suite verifying all state machines, math formulas, auth flows, and hardware bridges:

```bash
# Run complete test suite (54 suites, 452 unit tests)
npx vitest run

# Run TypeScript compilation gate
npx tsc --noEmit
```

```text
 Test Files  54 passed (54)
      Tests  452 passed (452)
   Duration  20.87s
     Status  100% Green
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>GymERP -- Empowering modern gyms with autonomous AI, unified biometric intelligence, and zero-cost automation.</sub>
</div>
