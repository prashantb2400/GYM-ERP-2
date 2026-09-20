# 📱 GymERP Autonomous AI Tablet Kiosk & Hardware Architecture

Complete hardware deployment, Android tablet setup, thermal printer configuration, and Cloudflare Tunneling guide for the GymERP Self-Service Kiosk.

---

## 🏛️ System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ANDROID TABLET SELF-SERVICE KIOSK                    │
│                                                                        │
│   [ 📷 Front Camera ]         [ 🖥️ Touch Display ]    [ 🔊 Speaker ]   │
│   (Face Watchdog @ 15fps)     (Next.js /kiosk/agent)   (Voice Agent)   │
│                                                                        │
│           │                           │                     │          │
│           └───────────────────────────┼─────────────────────┘          │
│                                       ▼                                │
│                          [ Android Kiosk Runtime ]                     │
│                        (Fully Kiosk Browser / Chrome)                  │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ Wi-Fi / LAN
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     GYMERP NEXT.JS & BACKEND CLOUD                     │
│                                                                        │
│   🔒 Server-Side Secret LLM    📑 KYC Document OCR     🍽️ Personalized  │
│      (Gemini / OpenAI API)        (Aadhaar/DL Parser)     Diet & Workout│
│                                                                        │
│   💳 Dynamic Bharat UPI QR     🛡️ Multi-Tenant DB      💬 WhatsApp CRM │
│      (GPay / PhonePe / Paytm)     (Supabase RLS)          Cloud Engine │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
┌───────────────────────────────────┐     ┌──────────────────────────────┐
│     🖨️ CONNECTED KIOSK PRINTER    │     │   🌐 CLOUDFLARE TUNNEL       │
│                                   │     │                              │
│ • 80mm ESC-POS Thermal Slip (USB) │     │ • Secure HTTPS Webhook Ingress│
│ • A4 Print Packet (Invoice+Diet)  │     │ • WhatsApp QR Device Pairing │
│ • Direct Paper Cut Command        │     │ • Zero Port-Forwarding / NAT │
└───────────────────────────────────┘     └──────────────────────────────┘
```

---

## 1. 🛡️ Secret LLM Configuration (Zero Client Exposure)

The AI Agent Vision OCR and Personalized Diet & Workout Blueprint engines execute **strictly on the server**. The API key is **never** delivered to the Android tablet, never included in JavaScript bundles, and never exposed in browser developer tools.

Add your LLM API key to `.env.local` on the server:

```bash
# Recommended: Google Gemini (High-speed vision OCR & nutritional planning)
GEMINI_API_KEY="AIzaSy..."

# Alternative: OpenAI / Groq / OpenRouter
# OPENAI_API_KEY="sk-..."
```

---

## 2. 🌐 Cloudflare Tunneling for WhatsApp Pairing QR & Webhooks

When hosting locally or on an office server, WhatsApp Cloud API webhooks and WhatsApp Web browser QR pairing require a public, SSL-secured HTTPS endpoint. **Cloudflare Tunnel (`cloudflared`)** provides a free, enterprise-grade tunnel without modifying router NAT or opening external ports.

### Quick Cloudflare Tunnel Setup

1. **Install `cloudflared` on your server**:
   ```bash
   # Linux (Debian / Ubuntu)
   curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
   echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
   sudo apt-get update && sudo apt-get install cloudflared
   ```

2. **Launch Instant Ad-Hoc Tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Cloudflare will generate a secure public HTTPS URL (e.g. `https://random-subdomain.trycloudflare.com`).

3. **Configure WhatsApp Webhook URL**:
   In your Meta Developer Console or WhatsApp Bridge:
   - **Callback URL**: `https://your-tunnel.trycloudflare.com/api/whatsapp/webhook`
   - **Verify Token**: Configured in `.env.local` under `WHATSAPP_VERIFY_TOKEN`.

4. **Permanent Production Named Tunnel (Optional)**:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create gymerp-kiosk
   cloudflared tunnel route dns gymerp-kiosk kiosk.yourgym.com
   cloudflared tunnel run gymerp-kiosk
   ```

---

## 3. 📱 Android Tablet Kiosk Deployment

### Recommended Device Specifications
- **Display**: 10.1-inch or 12-inch IPS Display (1920x1200 or 1280x800).
- **Front Camera**: 5MP or higher, wide-angle lens.
- **Audio**: Dual front-facing stereo speakers.
- **OS**: Android 10, 11, 12, 13, or 14.

### Setting Up Fully Kiosk Browser (Recommended)
1. Install **Fully Kiosk Browser & Launcher** from Google Play Store.
2. In Fully Kiosk settings:
   - **Start URL**: `https://your-gym-domain.com/kiosk/agent` (or `http://local-ip:3000/kiosk/agent`).
   - **Web Camera & Microphone Access**: Set to `Always Allow` (no permission prompts).
   - **Kiosk Mode**: Enable `Single App Mode` (blocks notification bar, back button, and home button).
   - **Motion Detection**: Turn on `Auto-wake on Front Camera Motion` (tablet wakes up as soon as someone approaches!).
   - **Screen Off Timer**: Set idle screen sleep to 120 seconds.
   - **PIN Protection**: Set staff exit PIN to exit the app.

---

## 4. 🖨️ Hardware Printer Integration

### Setup A: 80mm Thermal Receipt Printer (ESC-POS)
- **Supported Brands**: TVS, Epson TM-T82, Xprinter, Rongta, Everycom.
- **Connection Methods**:
  1. **USB OTG**: Connect printer directly to tablet USB-C port via USB OTG adapter.
  2. **Bluetooth**: Pair printer via Android Bluetooth settings.
  3. **Wi-Fi LAN**: Connect printer to gym Wi-Fi router (raw port `9100`).
- **Printed Slips**:
  - GST Tax Invoice with sequential number, CGST/SGST, and QR check-in token.
  - Quick diet calories and daily meal split.

### Setup B: Standard A4 Document Printer
- **Supported Brands**: HP, Canon, Epson, Brother Wi-Fi printers.
- **Connection**:
  - Tablet and printer on the same Wi-Fi network.
  - Install the **Mopria Print Service** or manufacturer print plugin on Android.
- **Print Output**:
  - Full-color / monochrome 3-page packet:
    - Page 1: Official GST Tax Invoice.
    - Page 2: Personalized Nutrition & Meal Blueprint.
    - Page 3: Personalized 6-Day Progressive Workout Routine.
