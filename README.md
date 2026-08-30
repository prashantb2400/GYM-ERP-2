<div align="center">

# 🏋️‍♂️ GymERP

### **Enterprise-Grade Multi-Tenant SaaS Platform for Modern Gym & Fitness Center Operations**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-CCTV_Service-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<br />

**GymERP** is an all-in-one, multi-tenant cloud software designed for fitness centers, athletic clubs, and multi-branch gym franchises. It combines core member lifecycle management, automated billing and GST invoicing, WhatsApp automation, and biometric/CCTV face recognition attendance microservices.

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Project Structure](#-project-structure) • [Getting Started](#-getting-started) • [Microservices](#-microservices) • [Security & Compliance](#-security--compliance)

---

</div>

## 🌟 Key Features

### 🏢 Multi-Tenant SaaS & Super Admin
* **Tier Gating**: Built-in `Free`, `Pro`, and `Enterprise` subscription tiers with feature flags and quota enforcement (member limits, CCTV camera counts, storage limits).
* **Super Admin Portal**: Platform overview with recurring revenue metrics, gym onboarding, subscription lifecycle management, and administrative gym impersonation.
* **Granular RBAC**: Role-based access control with distinct permission policies for `owner`, `receptionist`, `trainer`, and `member`.

### 👥 Member & CRM Management
* **Complete Lifecycle**: Lead acquisition, onboarding, membership assignment, plan renewals, and KYC document uploads with verification workflows.
* **Member Portal**: Mobile-first member portal for workout plans, dietary charts, digital attendance logs, and invoice downloads.
* **Smart Follow-ups**: Automated tracking of inactive members, renewal reminders, and payment due collections.

### 💳 Invoicing, GST & Payment Gateway
* **Automated Invoicing**: Auto-generating GST-compliant invoices with customizable tax breakdowns (CGST/SGST), discount rules, and sequential numbering.
* **Razorpay Integration**: Instant payment link generation, order creation, and HMAC SHA-256 signature-verified webhook processing for automatic plan activations.
* **PDF Engine**: Dynamic, server-side PDF invoice, diet chart, and member report generation.

### 💬 WhatsApp Cloud API Automation
* **Automated Alerts**: Automated notification triggers for expiry reminders, birthday greetings, welcome kits, and payment receipts.
* **Interactive Bot**: Webhook-powered auto-responder providing instant membership status and renewal details via chat.
* **Broadcast Engine**: Rate-limited template broadcasting for gym-wide announcements and promotional campaigns.

### 🎥 CCTV Face Recognition & Biometric Attendance
* **AI Face Recognition**: Dedicated Python/FastAPI microservice (`cctv-service`) utilizing OpenCV and ONVIF discovery to automatically mark member attendance via security cameras.
* **Hardware Bridge**: Node.js service (`hardware-bridge`) interfacing with USB RFID scanners, serial adapters, and ZKTeco biometric devices.
* **Duplicate Prevention**: Intraday deduplication algorithms preventing repeated triggers within configurable time windows.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client[Web Browser / Mobile PWA] -->|HTTPS| NextApp[Next.js 16 App Router]
    
    subgraph "Core SaaS Engine (Next.js)"
        NextApp --> SSR[Server Components & Pages]
        NextApp --> API[Secure API Routes]
        NextApp --> Middleware[Auth & Tenant Routing Middleware]
    end

    subgraph "Data & Persistence (Supabase)"
        API -->|Row Level Security| Postgres[(PostgreSQL 15)]
        API --> Auth[Supabase Auth Engine]
        API --> Storage[Supabase S3 Storage]
    end

    subgraph "Integrations & Services"
        API --> Razorpay[Razorpay Payment Gateway]
        API --> WhatsApp[Meta WhatsApp Cloud API]
        API --> VercelCron[Automated Cron Engine]
    end

    subgraph "Hardware & Edge Microservices"
        API <-->|Token Authenticated| CCTV[CCTV Face Recognition Service (Python)]
        API <-->|Socket Bridge| Bridge[Hardware Bridge (ZKTeco / RFID)]
        CCTV -->|RTSP / ONVIF| IP_Cameras[(IP Cameras)]
        Bridge -->|USB / Serial| Biometric_Devices[(Biometric Scanners)]
    end
```

---

## 📂 Project Structure

```
.
├── cctv-service/             # Python FastAPI + OpenCV face recognition microservice
│   ├── app/                  # Camera managers, face engine, ONVIF discovery
│   ├── models/               # Data models & detection event schemas
│   └── Dockerfile            # Containerized CCTV engine
│
├── hardware-bridge/          # Node.js hardware integration service
│   ├── src/devices/          # ZKTeco, HID RFID, and Serial device adapters
│   ├── src/services/         # Attendance sync, socket bridge, health monitor
│   └── Dockerfile            # Hardware bridge deployment container
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Authentication views (Owner, Staff, Member)
│   │   ├── api/              # Secure REST APIs & Webhook handlers
│   │   │   ├── attendance/   # Biometric & CCTV face check-in endpoints
│   │   │   ├── cron/         # Automated background jobs (dues, alerts)
│   │   │   ├── payments/     # Razorpay order generation & signed webhooks
│   │   │   ├── staff/        # Owner-authorized staff account creation
│   │   │   ├── superadmin/   # Platform SaaS billing & administration
│   │   │   └── whatsapp/     # Meta Cloud API senders & webhook handlers
│   │   ├── dashboard/        # Owner & Staff Admin Portal
│   │   ├── member/           # Member self-service portal
│   │   └── superadmin/       # SaaS platform master dashboard
│   │
│   ├── components/           # UI Components
│   │   ├── hardware/         # Real-time CCTV & biometric live status monitors
│   │   ├── layout/           # Sidebars, topbars, command menu
│   │   ├── magicui/          # Animated UI elements (particles, shimmer, borders)
│   │   ├── shared/           # Permission guards, face enrollers, badges
│   │   └── ui/               # Radix UI primitives with Tailwind CSS
│   │
│   ├── hooks/                # Custom React hooks (auth, plan limits, permissions)
│   ├── lib/                  # Server utilities, PDF generators, Supabase clients
│   ├── store/                # Zustand client state stores
│   └── types/                # Strict TypeScript database & domain definitions
│
├── supabase/
│   └── migrations/           # PostgreSQL Schemas, RLS policies, triggers (001-004)
│
├── docker-compose.yml        # Multi-container orchestration (App, CCTV, Bridge, Redis)
└── next.config.ts            # Next.js configuration with strict CSP headers
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: `v20.x` or higher
* **npm** / **pnpm** / **bun**
* **Python**: `3.10+` *(required only for CCTV microservice)*
* **Supabase Project**: Active Supabase instance (cloud or self-hosted)
* **Docker & Docker Compose** *(optional, for containerized deployment)*

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/prashantb2400/GYM-ERP-2.git
cd GYM-ERP-2

# Install root Next.js dependencies
npm install
```

---

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

| Variable | Description | Example / Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret admin key (server-only) | Supabase Dashboard > Settings > API |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | Razorpay Dashboard > Settings > API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret | Razorpay Dashboard > Settings > API Keys |
| `WHATSAPP_TOKEN` | Meta System User Access Token | Meta Developer Console |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business Phone ID | Meta Developer Console |
| `WHATSAPP_APP_SECRET` | Meta App Secret for Webhooks | Meta Developer Console > App Settings |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification handshake token | Custom random secret |
| `CRON_SECRET` | Secret for authenticating cron endpoints | Generate with `openssl rand -hex 32` |
| `CCTV_AUTH_TOKEN` | Shared secret between CCTV microservice and SaaS API | Custom secure string |

---

### 3. Apply Database Migrations

Apply the database schema and RLS policies via the Supabase CLI or the SQL Editor:

```bash
# Using Supabase CLI
supabase db push

# Or run the migrations located in /supabase/migrations in order:
# 1. 001_initial.sql
# 2. 002_v2_features.sql
# 3. 003_push_subscriptions.sql
# 4. 004_platform_subscriptions.sql
```

---

### 4. Run the Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Microservices

### 📹 CCTV Face Recognition (`cctv-service`)

The CCTV service connects to ONVIF/RTSP IP cameras, extracts facial embeddings, and pushes verified attendance logs to the core SaaS API:

```bash
cd cctv-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start microservice
uvicorn app:app --host 0.0.0.0 --port 5001 --reload
```

### 🔌 Hardware Bridge (`hardware-bridge`)

Interfacing layer for ZKTeco fingerprint terminals and USB RFID readers:

```bash
cd hardware-bridge

# Install dependencies
npm install

# Start bridge in development mode
npm run dev
```

### 🐳 Full Stack with Docker Compose

Run the entire ecosystem (Next.js web app, CCTV service, Hardware Bridge, and Redis cache) with a single command:

```bash
docker-compose up --build
```

---

## 🔒 Security & Compliance

GymERP implements a multi-layered security architecture:

* **Row Level Security (RLS)**: Enforced across all 15+ PostgreSQL tables. Tenant data is isolated at the database level using `get_user_gym_id()` and `auth.uid()` predicates.
* **Cryptographic Webhook Verification**:
  * Razorpay payments verified using `crypto.timingSafeEqual` over HMAC SHA-256 signatures (`X-Razorpay-Signature`).
  * WhatsApp payloads verified against Meta's `X-Hub-Signature-256`.
* **Server-Side Price Validation**: Payment order creation resolves item pricing strictly from the database, preventing client-side amount tampering.
* **Fail-Closed Principle**: All webhook endpoints and integration services reject unauthenticated or unconfigured payloads by default.
* **Container Hardening**: Microservices run with non-root least privilege and specific Linux capability grants (`SYS_RAWIO` for USB HID) rather than broad `privileged: true` flags.
* **HTTP Security Headers**: Strict Content Security Policy (CSP), `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, and `X-Content-Type-Options: nosniff` configured in `next.config.ts`.

---

## 🧪 Testing & Quality Assurance

```bash
# Run unit & integration tests
npm run test

# Run End-to-End browser tests (Playwright)
npx playwright test

# Run TypeScript typecheck
npm run typecheck

# Run ESLint linter
npm run lint
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with ❤️ for modern gym owners and fitness communities.</sub>
</div>
