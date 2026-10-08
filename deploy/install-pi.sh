#!/usr/bin/env bash
set -e

# 🏋️ GymERP - Automated Raspberry Pi / Debian Linux Appliance Setup
# Compatible with Raspberry Pi OS (Debian 12 Bookworm, aarch64 / arm64) and Ubuntu

echo "=========================================================="
echo "    GymERP Local Offline Appliance Setup (Raspberry Pi)"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this installation script as root or with sudo:"
  echo "  sudo bash deploy/install-pi.sh"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-pi}"
APP_DIR="/opt/gymerp"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Step 1: Updating system packages and installing prerequisites..."
apt-get update -y
apt-get install -y curl git build-essential avahi-daemon avahi-utils libnss-mdns postgresql postgresql-contrib

# Install Node.js 20 LTS if not present
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "==> Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "    Node version: $(node -v)"
echo "    NPM version:  $(npm -v)"

echo "==> Step 2: Configuring PostgreSQL for local offline database..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'gymerp'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE gymerp;"

echo "==> Step 3: Running GymERP database initialization and migrations..."
POSTGRES_USER=postgres POSTGRES_DB=gymerp bash "$REPO_DIR/deploy/init-db.sh"

echo "==> Step 4: Installing PostgREST for native Supabase-compatible API..."
ARCH=$(uname -m)
PGRST_VER="v12.2.0"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  PGRST_FILE="postgrest-${PGRST_VER}-linux-static-aarch64.tar.xz"
else
  PGRST_FILE="postgrest-${PGRST_VER}-linux-static-x64.tar.xz"
fi

if ! command -v postgrest >/dev/null 2>&1; then
  echo "    Downloading PostgREST binary for $ARCH..."
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/${PGRST_VER}/${PGRST_FILE}" -o "/tmp/${PGRST_FILE}"
  tar -xf "/tmp/${PGRST_FILE}" -C /usr/local/bin
  chmod +x /usr/local/bin/postgrest
  rm -f "/tmp/${PGRST_FILE}"
fi

# Configure PostgREST service
cat > /etc/postgrest.conf << 'EOF'
db-uri = "postgres://postgres:postgres@localhost:5432/gymerp"
db-schemas = "public"
db-anon-role = "anon"
server-port = 54321
jwt-secret = "gymerp-offline-local-jwt-secret-minimum-32-chars-long"
EOF

cat > /etc/systemd/system/postgrest.service << 'EOF'
[Unit]
Description=PostgREST Offline API Gateway
After=postgresql.service
Wants=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest.conf
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable postgrest
systemctl restart postgrest

echo "==> Step 5: Copying and building GymERP application..."
mkdir -p "$APP_DIR"
cp -r "$REPO_DIR/." "$APP_DIR/"
chown -R "$CURRENT_USER:$CURRENT_USER" "$APP_DIR"

cd "$APP_DIR"
sudo -u "$CURRENT_USER" npm install --production=false
sudo -u "$CURRENT_USER" npm run build

echo "==> Step 6: Setting up Avahi mDNS discovery (gymerp.local)..."
cp "$REPO_DIR/deploy/avahi-gymerp.service" /etc/avahi/services/gymerp.service
systemctl restart avahi-daemon

echo "==> Step 7: Configuring systemd service for auto-boot..."
sed -i "s/User=pi/User=$CURRENT_USER/g" "$APP_DIR/deploy/gymerp.service"
cp "$APP_DIR/deploy/gymerp.service" /etc/systemd/system/gymerp.service
systemctl daemon-reload
systemctl enable gymerp
systemctl restart gymerp

HOST_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================================="
echo "  SUCCESS: GymERP Local Offline Appliance is LIVE!"
echo "=========================================================="
echo "Access URLs on this local Wi-Fi network:"
echo "  1. http://gymerp.local:3000   (Zero-configuration mDNS)"
echo "  2. http://${HOST_IP}:3000     (Direct IP connection)"
echo ""
echo "Android Kiosk & Manager APKs can now connect directly"
echo "to http://gymerp.local:3000 without any internet connection."
echo "=========================================================="
