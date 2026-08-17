#!/usr/bin/env bash
# Stop the local SSH port-forward started by start-mysql-tunnel.sh.
set -euo pipefail

LOCAL_PORT="${MYSQL_TUNNEL_PORT:-3307}"

PIDS="$(lsof -tiTCP:"$LOCAL_PORT" -sTCP:LISTEN || true)"
if [[ -z "$PIDS" ]]; then
	echo "No listener on port ${LOCAL_PORT}."
	exit 0
fi

echo "Stopping tunnel on port ${LOCAL_PORT} (PID ${PIDS})"
# shellcheck disable=SC2086
kill $PIDS
echo "Stopped."
