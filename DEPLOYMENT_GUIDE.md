# 🚀 GymERP — Complete Step-by-Step Production Deployment Guide

This guide walks you through deploying **GymERP** from scratch in the easiest, most reliable way possible.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites Checklist](#2-prerequisites-checklist)
3. [Step 1: Setup Supabase Database & Auth](#step-1-setup-supabase-database--auth)
4. [Step 2: Run Database Migrations (001 – 006)](#step-2-run-database-migrations-001--006)
5. [Step 3: Generate Security Secrets & VAPID Keys](#step-3-generate-security-secrets--vapid-keys)
6. [Step 4: Configure Razorpay Payments & Webhooks](#step-4-configure-razorpay-payments--webhooks)
7. [Step 5: Configure Meta WhatsApp Cloud API](#step-5-configure-meta-whatsapp-cloud-api)
8. [Step 6: Deploy Main App to Vercel](#step-6-deploy-main-app-to-vercel)
9. [Step 7: Create Super Admin & Initial Onboarding](#step-7-create-super-admin--initial-onboarding)
10. [Step 8: (Optional) Deploy CCTV & Hardware Bridge at Gym](#step-8-optional-deploy-cctv--hardware-bridge-at-gym)
11. [Step 9: Docker / VPS Full-Stack Deployment](#step-9-docker--vps-full-stack-deployment)
12. [Production Health & Troubleshooting Checklist](#12-production-health--troubleshooting-checklist)

---

## 1. Architecture Overview

| Component | Technology | Where It Runs |
|---|---|---|
| **Frontend & API** | Next.js 16 (App Router), Tailwind CSS v4 | **Vercel** or **Docker VPS** |
| **Database & Auth** | PostgreSQL, Row Level Security, Supabase Auth | **Supabase Cloud** |
| **Automation Crons** | Vercel Cron (`vercel.json`) or Node worker | **Vercel** |
| **CCTV Face AI** | Python FastAPI + OpenCV Face Recognition | **Local Gym PC** (or VPS) |
| **Biometric Bridge** | Node.js + ZKTeco SDK + Socket.IO | **Local Gym Reception PC** |

---

## 2. Prerequisites Checklist

Before you start, make sure you have:
- [ ] A free account on [Supabase.com](https://supabase.com)
- [ ] A free account on [Vercel.com](https://vercel.com)
- [ ] A [GitHub](https://github.com) account with your repository pushed
- [ ] (Optional) A [Razorpay](https://razorpay.com) account for payment collection
- [ ] (Optional) A [Meta for Developers](https://developers.facebook.com) account for WhatsApp

---

## Step 1: Setup Supabase Database & Auth

1. Go to [database.new](https://database.new) and create a **New Project**.
   - **Name:** `GymERP Production`
   - **Database Password:** Save this securely.
   - **Region:** Choose the region closest to your users (e.g. `ap-south-1` Mumbai for India).
2. Once provisioned, go to **Project Settings -> API**:
   - Copy **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - Copy **anon / public key**
   - Copy **service_role key** *(Keep this private!)*
3. Configure Auth:
   - Go to **Authentication -> URL Configuration**.
   - Set **Site URL** to your production URL (e.g., `https://gymerp.yourdomain.com`).
   - Add Redirect URLs:
     - `https://gymerp.yourdomain.com/**`
     - `https://gymerp.yourdomain.com/api/auth/callback`
     - `http://localhost:3000/**` (for local development)

---

## Step 2: Run Database Migrations (001 – 006)

In your Supabase Dashboard, click on **SQL Editor -> New Query**.

Execute the following 6 migration files in exact numerical order from the `supabase/migrations/` folder:

1. Copy & run [`001_initial.sql`](supabase/migrations/001_initial.sql) (Core schema: gyms, users, members, invoices, attendance, RLS)
2. Copy & run [`002_v2_features.sql`](supabase/migrations/002_v2_features.sql) (Branches, expenses, inventory)
3. Copy & run [`003_push_subscriptions.sql`](supabase/migrations/003_push_subscriptions.sql) (Web push notification tables)
4. Copy & run [`004_platform_subscriptions.sql`](supabase/migrations/004_platform_subscriptions.sql) (SaaS tiers: Free, Pro, Enterprise, Super Admin)
5. Copy & run [`005_security_and_integrations.sql`](supabase/migrations/005_security_and_integrations.sql) (CCTV cameras, hardware users, security definers)
6. Copy & run [`006_trainer_commissions_and_financials.sql`](supabase/migrations/006_trainer_commissions_and_financials.sql) (Trainer commissions and query indexes)

> 💡 **Storage Buckets Setup:**
> Go to **Storage -> Create Bucket**:
> - Create a bucket named `encodings` (Private) for face recognition JSON encodings.
> - Create a bucket named `kyc-documents` (Private) for member ID proofs.
> - Create a bucket named `gym-logos` (Public) for gym branding images.

---

## Step 3: Generate Security Secrets & VAPID Keys

Run the following commands on your terminal or generate them online:

### A. Generate Cron Secret & CCTV Auth Token:
```bash
# Generate CRON_SECRET:
openssl rand -hex 32

# Generate CCTV_AUTH_TOKEN:
openssl rand -hex 24
```

### B. Generate Web Push VAPID Keys:
```bash
npx web-push generate-vapid-keys
```
*Output will give you:*
- `Public Key:` (used for `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- `Private Key:` (used for `VAPID_PRIVATE_KEY`)

---

## Step 4: Configure Razorpay Payments & Webhooks

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings -> API Keys** and generate a Key Id & Key Secret.
3. Go to **Settings -> Webhooks -> Add New Webhook**:
   - **Webhook URL:** `https://your-domain.com/api/payments/razorpay/webhook`
   - **Secret:** Enter a strong secret (e.g. `gym_rzp_hook_sec_2026`).
   - **Active Events:** Check `payment.captured` and `payment.failed`.

---

## Step 5: Configure Meta WhatsApp Cloud API

1. Go to [Meta Developers Portal](https://developers.facebook.com) -> Create App -> Type **Business**.
2. Add the **WhatsApp** product.
3. In **API Setup**:
   - Copy **Temporary Access Token** (or create a permanent System User token).
   - Copy **Phone Number ID**.
   - Copy **App Secret** from App Settings -> Basic.
4. In **Configuration -> Webhooks**:
   - **Callback URL:** `https://your-domain.com/api/whatsapp/webhook`
   - **Verify Token:** Set any custom string (e.g. `gym_wa_verify_2026`).
   - **Webhook Fields:** Subscribe to `messages`.

---

## Step 6: Deploy Main App to Vercel (Recommended)

### Method A: Via Vercel Web Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository (`GYM-ERP-2`).
3. Under **Environment Variables**, paste the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://your-deployed-domain.vercel.app

CRON_SECRET=your_cron_secret_from_step_3

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourgymdomain.com

NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=1092837465...
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=gym_wa_verify_2026

CCTV_AUTH_TOKEN=your_cctv_auth_token
```

4. Click **Deploy**.
5. Once deployment completes, Vercel automatically detects `vercel.json` and activates all automated daily background cron jobs!

---

## Step 7: Create Super Admin & Initial Onboarding

### 1. Create Super Admin Account
Open Supabase SQL Editor and run this snippet to grant super admin privileges:

```sql
-- Replace with your admin email and secure password
SELECT public.create_super_admin(
  'superadmin@gymerp.com',
  'MasterAdmin',
  'YourSecurePassword123!'
);
```

Or sign up normally through `/login`, then run:
```sql
INSERT INTO public.super_admins (user_id, name, email, role, is_active)
SELECT id, 'Super Admin', email, 'super_admin', true
FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

### 2. Access Admin Portals:
- **Super Admin Platform Console:** `https://your-domain.com/superadmin/login`
- **Gym Owner Signup & Portal:** `https://your-domain.com/login`
- **Member Mobile Portal:** `https://your-domain.com/member/login`
- **Staff / Trainer Login:** `https://your-domain.com/staff/login`

---

## Step 8: (Optional) Deploy CCTV & Hardware Bridge at Gym

If your gym uses biometric scanners or CCTV AI face recognition, run the microservices on a local PC connected to the gym's LAN / WiFi.

### A. CCTV Face Recognition Service
1. Navigate to `cctv-service/`:
   ```bash
   cd cctv-service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Create `cctv-service/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CCTV_AUTH_TOKEN=your_cctv_auth_token
   NEXTJS_API_URL=https://your-domain.com
   ```
3. Start the service:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 5001
   ```

### B. Hardware Bridge (ZKTeco Biometrics & USB Scanners)
1. Navigate to `hardware-bridge/`:
   ```bash
   cd hardware-bridge
   npm install
   ```
2. Create `hardware-bridge/.env`:
   ```env
   PORT=5002
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXTJS_APP_URL=https://your-domain.com
   ```
3. Run the service:
   ```bash
   npm run build && npm start
   ```

---

## Step 9: Docker / VPS Full-Stack Deployment

To host everything on an Ubuntu / Debian VPS (e.g. AWS EC2, DigitalOcean, Hetzner):

1. **Install Docker & Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```
2. **Clone your repository & create `.env`:**
   ```bash
   git clone https://github.com/your-username/GYM-ERP-2.git
   cd GYM-ERP-2
   cp .env.example .env
   # Edit .env with your production keys:
   nano .env
   ```
3. **Launch the stack:**
   ```bash
   docker compose up -d --build
   ```
4. **Setup Nginx reverse proxy with SSL (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx nginx -y
   sudo certbot --nginx -d gymerp.yourdomain.com
   ```

---

## 12. Production Health & Troubleshooting Checklist

| Test Item | Verification Method | Expected Result |
|---|---|---|
| **Gym Owner Registration** | Visit `/login` -> Create Gym | Creates gym, triggers 14-day Pro trial |
| **30s Quick Add Member** | Click `Quick Add` on dashboard | Generates member, GST invoice, and WhatsApp welcome |
| **Razorpay Payments** | Member renews plan on `/member/plan` | Payment popups, captures order, updates status to `paid` |
| **WhatsApp Message** | Send test reminder | Member receives template WhatsApp notification |
| **Vercel Cron Execution** | Check Vercel Dashboard -> Cron Jobs | Status 200 on all scheduled runs |
| **P&L Financial Export** | Click `Export P&L Statement (CSV)` | Downloads clean CSV with revenue, expenses, and profit |

---
*GymERP is now fully deployed, secure, and ready for multi-tenant gym operations!*
