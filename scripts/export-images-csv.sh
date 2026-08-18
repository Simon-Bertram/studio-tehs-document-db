#!/usr/bin/env bash
# Fallback export that needs the mysql CLI. Prefer:
#   MYSQL_PASS='…' bun run csv-export:images
#
# Export image metadata (never psImages / BLOB columns) through the local
# SSH tunnel into migrations/data/sample-images.csv.
#
# Requires: running tunnel (scripts/start-mysql-tunnel.sh), mysql client,
#           MYSQL_USER MYSQL_PASS MYSQL_DB (same values as .cursor/mcp.json).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${CSV_OUT:-$ROOT/migrations/data/sample-images.csv}"
HOST="${MYSQL_HOST:-127.0.0.1}"
PORT="${MYSQL_PORT:-3307}"
USER="${MYSQL_USER:-images_ro}"
DB="${MYSQL_DB:-tehsimages2}"

if [[ -z "${MYSQL_PASS:-}" ]]; then
	echo "MYSQL_PASS is required (read-only DreamHost user password)." >&2
	echo "Example:" >&2
	echo "  MYSQL_USER=images_ro MYSQL_PASS='…' MYSQL_DB=tehsimages2 \\" >&2
	echo "    ./scripts/export-images-csv.sh" >&2
	exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
	echo "mysql client not found. Install it (e.g. brew install mysql-client) and retry." >&2
	exit 1
fi

MYSQL=(mysql -h "$HOST" -P "$PORT" -u "$USER" "-p${MYSQL_PASS}" -D "$DB" -N --batch --raw)

if ! "${MYSQL[@]}" -e "SELECT 1" >/dev/null; then
	echo "Cannot reach MySQL at ${HOST}:${PORT}. Start the tunnel first:" >&2
	echo "  SSH_USER=your_dreamhost_user ./scripts/start-mysql-tunnel.sh" >&2
	exit 1
fi

TABLE="$(
	"${MYSQL[@]}" -e "
SELECT TABLE_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
	AND COLUMN_NAME IN ('imageLocation', 'fileLocation')
ORDER BY CASE COLUMN_NAME WHEN 'imageLocation' THEN 0 ELSE 1 END
LIMIT 1;
"
)"

if [[ -z "$TABLE" ]]; then
	echo "No table with imageLocation or fileLocation in database ${DB}." >&2
	echo "Use Cursor MCP to SHOW TABLES / DESCRIBE, then set IMAGE_TABLE=…" >&2
	exit 1
fi

TABLE="${IMAGE_TABLE:-$TABLE}"

COLS="$(
	"${MYSQL[@]}" -e "
SELECT CONCAT('\`', COLUMN_NAME, '\`')
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
	AND TABLE_NAME = '${TABLE}'
	AND DATA_TYPE NOT IN ('blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary')
	AND COLUMN_NAME NOT IN ('psImages', 'psimages')
ORDER BY ORDINAL_POSITION;
" | paste -sd, -
)"

if [[ -z "$COLS" ]]; then
	echo "No exportable columns on ${TABLE}." >&2
	exit 1
fi

echo "Exporting ${DB}.${TABLE} (excluding BLOB / psImages) -> ${OUT}"

"${MYSQL[@]}" --skip-column-names=false -e "SELECT ${COLS} FROM \`${TABLE}\`;" \
	| python3 -c "
import csv, sys
rows = [line.rstrip('\n').split('\t') for line in sys.stdin]
if not rows:
	sys.exit('empty mysql result')
with open(sys.argv[1], 'w', encoding='utf-8', newline='') as f:
	writer = csv.writer(f, lineterminator='\n')
	writer.writerows(rows)
print(f'Wrote {len(rows) - 1} data rows, {len(rows[0])} columns')
" "$OUT"
