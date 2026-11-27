#!/usr/bin/env bash
# One-time preparation of a clean Debian 12 server. Run as root:  bash setup-debian12.sh
# Installs Node 24, PostgreSQL 16, nginx, certbot, creates the "att" user and the folders.
# It does NOT create the database password or any secret: those are typed by you in docs/DEPLOY.md.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates gnupg git rsync ufw unattended-upgrades postgresql-common nginx certbot python3-certbot-nginx

# PostgreSQL 16 (Debian 12 ships 15, so use the official PostgreSQL repository)
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
apt-get install -y postgresql-16

# Node.js 24 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# application user and folders
id att >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/att --shell /usr/sbin/nologin att
mkdir -p /opt/att /var/www/att /var/backups/att
chown att:att /opt/att
chmod 700 /var/backups/att

# firewall: SSH, HTTP, HTTPS only (the database and Node are never reachable from outside)
ufw allow OpenSSH
# SSH may listen on another port (e.g. 22222): open every port sshd really uses, or enabling the firewall cuts you off
SSH_PORTS=$(sshd -T 2>/dev/null | awk '$1=="port"{print $2}' || true)
[ -n "$SSH_PORTS" ] || SSH_PORTS=$(cat /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null | awk 'tolower($1)=="port"{print $2}' || true)
[ -n "$SSH_PORTS" ] || SSH_PORTS=22
for p in $SSH_PORTS; do ufw allow "$p/tcp"; done
echo "firewall: SSH open on port(s) $SSH_PORTS"
ufw allow 'Nginx Full'
ufw --force enable

# automatic security updates
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "ready. node $(node -v), $(psql --version)"
