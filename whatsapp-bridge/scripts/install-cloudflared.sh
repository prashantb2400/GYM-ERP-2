#!/usr/bin/env bash
# =========================================================================
# GymERP: Automatic cloudflared installer for Linux and Windows (WSL/Git Bash)
# Installs official Cloudflare Tunnel daemon for zero-config bridge hosting
# =========================================================================

set -e

if command -v cloudflared &> /dev/null; then
  echo "[OK] cloudflared is already installed: $(cloudflared --version)"
  exit 0
fi

echo "[*] Detecting OS and CPU architecture..."
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*)
    case "$ARCH" in
      x86_64)  FILE="cloudflared-linux-amd64" ;;
      aarch64) FILE="cloudflared-linux-arm64" ;;
      armv7l)  FILE="cloudflared-linux-arm" ;;
      *) echo "[ERROR] Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/$FILE"
    echo "[*] Downloading cloudflared from $URL..."
    curl -L --output /tmp/cloudflared "$URL"
    chmod +x /tmp/cloudflared
    if [ -w /usr/local/bin ]; then
      mv /tmp/cloudflared /usr/local/bin/cloudflared
    else
      echo "[*] Elevating with sudo to place binary in /usr/local/bin..."
      sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
    fi
    echo "[SUCCESS] cloudflared installed to /usr/local/bin/cloudflared"
    ;;
  Darwin*)
    if command -v brew &> /dev/null; then
      brew install cloudflared
    else
      echo "[ERROR] Please install Homebrew or download cloudflared manually for macOS."
      exit 1
    fi
    ;;
  *)
    echo "[ERROR] Unsupported operating system: $OS"
    echo "For Windows, download cloudflared.exe from:"
    echo "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    exit 1
    ;;
esac

echo "[DONE] Verify installation with: cloudflared --version"
