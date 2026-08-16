# GymERP Hardware Bridge

Standalone Node.js + TypeScript service for connecting to local biometric devices (ZKTeco, USB HID, Serial) and syncing attendance logs to Supabase.

## Features
- ZKTeco TCP integration (port 4370)
- USB HID fingerprint reader monitoring
- Serial port biometric adapter
- Local network device discovery
- Automatic background attendance sync
- Real-time updates via Socket.IO

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in the values
3. `npm run dev`

## Deployment

Deploy on a local server within the same LAN as the biometric hardware. Use the included Dockerfile to run as a containerized service.
