#!/usr/bin/env bash
set -e

# ======================================================================
#                 GYMERP LOCAL APPLIANCE LAUNCHER (LINUX/MAC)
# ======================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo "                GYMERP LOCAL APPLIANCE LAUNCHER"
echo "======================================================================"
echo ""

# Find local LAN IP address for multi-device access
get_local_ip() {
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}' && return
  fi
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' && return
  fi
  if command -v ifconfig >/dev/null 2>&1; then
    ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 && return
  fi
  echo "localhost"
}

LOCAL_IP="$(get_local_ip)"

# 1. Try Docker Compose first
if command -v docker >/dev/null 2>&1; then
  echo "[INFO] Docker detected on your system."
  echo "[INFO] Starting GymERP all-in-one offline stack..."
  echo ""

  if docker compose -f docker-compose.offline.yml up -d; then
    echo ""
    echo "=================================================================="
    echo "  GymERP is now running in Docker!"
    echo "  This Computer:     http://localhost:3000"
    echo "  Lobby Tablets/LAN: http://${LOCAL_IP}:3000"
    echo "  First-Run Setup:   http://localhost:3000/setup"
    echo "=================================================================="
    echo ""

    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://localhost:3000" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
      open "http://localhost:3000" >/dev/null 2>&1 &
    fi
    exit 0
  else
    echo "[WARN] Docker compose failed. Falling back to native Node.js mode..."
  fi
fi

# 2. Native Node.js fallback
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Neither Docker nor Node.js was found on your system."
  echo ""
  echo "Please install Node.js 20 LTS: https://nodejs.org"
  exit 1
fi

echo "[OK] Node.js detected: $(node -v)"

# Configure .env.local if not present
if [ ! -f .env.local ]; then
  echo "[INFO] Creating local configuration..."
  cat > .env.local << 'EOF'
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder
INTERNAL_POSTGREST_URL=http://localhost:54321
PGRST_JWT_SECRET=gymerp-offline-local-jwt-secret-minimum-32-chars-long
WHATSAPP_BRIDGE_URL=http://localhost:48291
EOF
fi

if [ ! -d node_modules ]; then
  echo "[INFO] Installing dependencies (first run only)..."
  npm install
fi

if [ ! -d .next ]; then
  echo "[INFO] Building GymERP production bundle (first run only)..."
  npm run build
fi

echo ""
echo "=================================================================="
echo "  GymERP is ready! Starting local server..."
echo "  This Computer:     http://localhost:3000"
echo "  Lobby Tablets/LAN: http://${LOCAL_IP}:3000"
echo "=================================================================="
echo ""

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:3000" >/dev/null 2>&1) &
elif command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://localhost:3000" >/dev/null 2>&1) &
fi

npm start
