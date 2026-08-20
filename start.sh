#!/bin/sh
set -e
cd "$(dirname "$0")"

PORT="${1:-9000}"
URL="http://localhost:$PORT"

echo "Tower Defense → $URL  (Ctrl+C to stop)"
( sleep 1; command -v open >/dev/null 2>&1 && open "$URL" ) &
exec python3 -m http.server "$PORT"
