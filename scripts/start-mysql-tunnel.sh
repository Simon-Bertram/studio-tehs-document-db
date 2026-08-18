#!/usr/bin/env bash
# Local port-forward to DreamHost MySQL. Start this before Cursor loads the
# tehs-images-mysql MCP server. MYSQL_HOST in .cursor/mcp.json stays 127.0.0.1.
#
# Pattern A (default): SSH to the site host, forward to mysql.the2nomads.site:3306
#   SSH_USER=your_dreamhost_user ./scripts/start-mysql-tunnel.sh
#
# Pattern B: SSH directly to the MySQL hostname (only if that host has a shell)
#   TUNNEL_PATTERN=B SSH_USER=your_dreamhost_user ./scripts/start-mysql-tunnel.sh
set -euo pipefail

LOCAL_PORT="${MYSQL_TUNNEL_PORT:-3307}"
MYSQL_REMOTE_HOST="${MYSQL_REMOTE_HOST:-mysql.the2nomads.site}"
MYSQL_REMOTE_PORT="${MYSQL_REMOTE_PORT:-3306}"
SSH_PORT="${SSH_PORT:-22}"
PATTERN="${TUNNEL_PATTERN:-A}"

usage() {
	cat <<'EOF'
Start an SSH tunnel so Cursor MCP can reach DreamHost MySQL on 127.0.0.1:3307.

Do not put mysql.the2nomads.site in mcp.json MYSQL_HOST. That stays 127.0.0.1.

Required:
  SSH_USER     DreamHost SSH / shell username (panel → Users / SSH).
               Not the MySQL user (images_ro). Those passwords are different.

Optional:
  TUNNEL_PATTERN   A (default) or B
  SSH_HOST         Login host override
  SSH_PORT         SSH port (default 22)
  MYSQL_TUNNEL_PORT   Local port (default 3307)
  MYSQL_REMOTE_HOST   Forward destination host (Pattern A, default mysql.the2nomads.site)
  MYSQL_REMOTE_PORT   Forward destination port (Pattern A, default 3306)

Pattern A (typical DreamHost):
  ssh -N -L 3307:mysql.the2nomads.site:3306 USER@the2nomads.site

Pattern B (shell on the MySQL hostname):
  ssh -N -L 3307:127.0.0.1:3306 USER@mysql.the2nomads.site

Examples:
  SSH_USER=dh_user ./scripts/start-mysql-tunnel.sh
  TUNNEL_PATTERN=B SSH_USER=dh_user ./scripts/start-mysql-tunnel.sh
  ./scripts/stop-mysql-tunnel.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
	usage
	exit 0
fi

if [[ -z "${SSH_USER:-}" ]]; then
	echo "SSH_USER is required (your DreamHost SSH username)." >&2
	echo >&2
	usage >&2
	exit 1
fi

MYSQL_USER_NAMES='images_ro tehs_images_ro'
LOOKS_LIKE_MYSQL_USER=0
for mysql_name in $MYSQL_USER_NAMES; do
	if [[ "$SSH_USER" == "$mysql_name" ]]; then
		LOOKS_LIKE_MYSQL_USER=1
		break
	fi
done
if [[ "$LOOKS_LIKE_MYSQL_USER" -eq 1 ]]; then
	echo "SSH_USER=${SSH_USER} is the MySQL account from mcp.json, not an SSH login." >&2
	echo "DreamHost MySQL users cannot SSH. Use the shell user from Panel → Users / SSH, e.g.:" >&2
	echo "  SSH_USER=your_shell_user bun run mysql-tunnel" >&2
	echo "images_ro / MYSQL_PASS are only for the tunnel's MySQL client after SSH succeeds." >&2
	exit 2
fi

if [[ "$PATTERN" == "B" ]]; then
	SSH_HOST="${SSH_HOST:-mysql.the2nomads.site}"
	FORWARD="127.0.0.1:${MYSQL_REMOTE_PORT}"
else
	SSH_HOST="${SSH_HOST:-the2nomads.site}"
	FORWARD="${MYSQL_REMOTE_HOST}:${MYSQL_REMOTE_PORT}"
fi

if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "Port ${LOCAL_PORT} is already listening — tunnel may already be running."
	exit 0
fi

echo "Starting SSH tunnel (Pattern ${PATTERN})"
echo "  ${SSH_USER}@${SSH_HOST}  ->  127.0.0.1:${LOCAL_PORT} => ${FORWARD}"

if ! ssh -f -N \
	-o ExitOnForwardFailure=yes \
	-o ServerAliveInterval=60 \
	-o ServerAliveCountMax=3 \
	-L "${LOCAL_PORT}:${FORWARD}" \
	-p "$SSH_PORT" \
	"${SSH_USER}@${SSH_HOST}"; then
	echo "Tunnel did not start. If Pattern A refused login, try:" >&2
	echo "  TUNNEL_PATTERN=B SSH_USER=${SSH_USER} $0" >&2
	exit 1
fi

sleep 1
if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "Tunnel is up. Point MCP at 127.0.0.1:${LOCAL_PORT} (SSH_ENABLED=false)."
	echo "Smoke-test: bun run csv-export:images"
else
	echo "Tunnel did not start. If Pattern A refused login, try:" >&2
	echo "  TUNNEL_PATTERN=B SSH_USER=${SSH_USER} $0" >&2
	exit 1
fi
