#!/usr/bin/env bash
# Publish the current version on the server. Run as root (or with sudo) ON THE SERVER, in /opt/att:
#   cd /opt/att && sudo ./deploy/deploy.sh
# What it does: takes the latest code, copies the site files to nginx's folder, installs server packages,
# applies database migrations, restarts the API, and checks that it answers. Safe to repeat.
set -euo pipefail
APP=/opt/att
WEB=/var/www/att
cd "$APP"

echo "→ code"
sudo -u att git pull --ff-only

echo "→ site files (only what the browser needs; never server/, .env or scripts)"
mkdir -p "$WEB/vendor"
install -m 644 index.html manifest.json schedule.json favicon-16.png favicon-32.png apple-touch-icon.png icon-192.png icon-512.png "$WEB/"
rsync -a --delete vendor/ "$WEB/vendor/"

echo "→ server packages and database"
cd "$APP/server"
sudo -u att npm ci --omit=dev --no-audit --no-fund
sudo -u att npm run -s migrate

echo "→ restart"
if ! systemctl list-unit-files att-api.service | grep -q att-api; then
  echo "The att-api service is not installed yet: continue with step 5 of docs/DEPLOY.md."
  exit 0
fi
systemctl restart att-api
sleep 2
if curl -fsS http://127.0.0.1:3050/health >/dev/null; then
  echo "OK: the API answers"
else
  echo "FAILED: the API does not answer. Look at:  journalctl -u att-api -n 50 --no-pager" >&2
  exit 1
fi
