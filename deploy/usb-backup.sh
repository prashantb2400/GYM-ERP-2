#!/usr/bin/env bash
set -e

# ======================================================================
#             GymERP Automated USB Flash Drive Backup Utility
# ======================================================================
# Scans for mounted USB flash drives and writes an automated, compressed
# database snapshot (gymerp-backup-YYYY-MM-DD.sql.gz).
# ======================================================================

echo "==> GymERP USB Backup Daemon checking for removable drives..."

# Detect mounted USB drive mountpoint
find_usb_mount() {
  # Check standard Linux removable mount directories
  for dir in /media/*/* /mnt/* /run/media/*/*; do
    if [ -d "$dir" ] && [ -w "$dir" ]; then
      echo "$dir"
      return 0
    fi
  done
  return 1
}

USB_DIR="$(find_usb_mount || true)"

if [ -z "$USB_DIR" ]; then
  echo "[INFO] No writable USB flash drive detected. Skipping backup."
  exit 0
fi

echo "[OK] USB Flash Drive detected at: $USB_DIR"

BACKUP_DIR="${USB_DIR}/GymERP-Backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="${BACKUP_DIR}/gymerp-backup-${TIMESTAMP}.sql.gz"

echo "==> Generating database snapshot to ${BACKUP_FILE}..."

# Export from Docker container or local PostgreSQL
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "gymerp-db"; then
  docker exec gymerp-db pg_dump -U postgres gymerp | gzip > "$BACKUP_FILE"
elif command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump -U "${POSTGRES_USER:-postgres}" -h localhost -p 5432 gymerp | gzip > "$BACKUP_FILE"
else
  echo "[ERROR] Neither Docker container 'gymerp-db' nor local 'pg_dump' was found."
  exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "[SUCCESS] Backup completed successfully! File size: ${SIZE}"
echo "[$(date -Iseconds)] Backup created: gymerp-backup-${TIMESTAMP}.sql.gz (${SIZE})" >> "${BACKUP_DIR}/backup-log.txt"

# Keep only the last 14 backups to preserve flash drive space
ls -tp "${BACKUP_DIR}"/gymerp-backup-*.sql.gz 2>/dev/null | tail -n +15 | xargs -I {} rm -- "{}" 2>/dev/null || true

sync
echo "==> USB Flash Drive synced and safe for removal."
