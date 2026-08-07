#!/usr/bin/env bash
# Backup harian database P2H (MySQL) dari DATABASE_URL di .env aplikasi.
# Contoh cron (setiap hari jam 02:00 WITA / server local time):
#   0 2 * * * /var/www/p2h/scripts/backup-p2h-db.sh >> /home/hendiksaputra/backups/p2h/backup.log 2>&1

set -euo pipefail

ENV_FILE="${P2H_ENV_FILE:-/var/www/p2h/.env}"
BACKUP_DIR="${P2H_BACKUP_DIR:-$HOME/backups/p2h}"
KEEP_DAYS="${P2H_BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M)"
OUT_SQL="${BACKUP_DIR}/p2h-${STAMP}.sql"
OUT_GZ="${OUT_SQL}.gz"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[$(date -Iseconds)] ERROR: .env tidak ditemukan: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] ERROR: mysqldump tidak terpasang (apt install mysql-client)" >&2
  exit 1
fi

# Parse DATABASE_URL dengan Python agar password berisi * / @ / # aman.
eval "$(
  python3 - "${ENV_FILE}" <<'PY'
import re, sys, urllib.parse
path = sys.argv[1]
text = open(path, encoding="utf-8", errors="replace").read()
m = re.search(r'(?m)^DATABASE_URL\s*=\s*(.*)$', text)
if not m:
    raise SystemExit("DATABASE_URL tidak ada di .env")
raw = m.group(1).strip().strip('"').strip("'")
u = urllib.parse.urlparse(raw)
if u.scheme not in ("mysql", "mysql2"):
    raise SystemExit(f"scheme tidak didukung: {u.scheme}")
user = urllib.parse.unquote(u.username or "")
password = urllib.parse.unquote(u.password or "")
host = u.hostname or "127.0.0.1"
port = str(u.port or 3306)
db = (u.path or "").lstrip("/")
if not user or not db:
    raise SystemExit("user/database kosong di DATABASE_URL")
def sh(s: str) -> str:
    return "'" + s.replace("'", "'\"'\"'") + "'"
print(f"MYSQL_USER={sh(user)}")
print(f"MYSQL_PASSWORD={sh(password)}")
print(f"MYSQL_HOST={sh(host)}")
print(f"MYSQL_PORT={sh(port)}")
print(f"MYSQL_DATABASE={sh(db)}")
PY
)"

export MYSQL_PWD="${MYSQL_PASSWORD}"

echo "[$(date -Iseconds)] Mulai backup ${MYSQL_DATABASE}@${MYSQL_HOST}:${MYSQL_PORT} → ${OUT_GZ}"

mysqldump \
  -h "${MYSQL_HOST}" \
  -P "${MYSQL_PORT}" \
  -u "${MYSQL_USER}" \
  "${MYSQL_DATABASE}" \
  --single-transaction \
  --routines \
  --triggers \
  --no-tablespaces \
  > "${OUT_SQL}"

gzip -f "${OUT_SQL}"
unset MYSQL_PWD

# Hapus backup lebih lama dari KEEP_DAYS
find "${BACKUP_DIR}" -type f -name 'p2h-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true

SIZE="$(du -h "${OUT_GZ}" | awk '{print $1}')"
echo "[$(date -Iseconds)] Selesai: ${OUT_GZ} (${SIZE}), simpan ${KEEP_DAYS} hari terakhir"
