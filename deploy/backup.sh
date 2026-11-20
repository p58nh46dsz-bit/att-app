#!/usr/bin/env bash
# Nightly copy of the database. Installed in cron by the instruction (docs/DEPLOY.md, step 9).
# Keeps 30 days in /var/backups/att. COPY THAT FOLDER OFF THIS SERVER (another machine or storage):
# a backup that lives only on the same disk is lost together with it.
set -euo pipefail
DIR=/var/backups/att
KEEP_DAYS=30
mkdir -p "$DIR"
FILE="$DIR/att-$(date +%Y%m%d-%H%M%S).dump"
sudo -u postgres pg_dump -Fc att > "$FILE.part"
mv "$FILE.part" "$FILE"
chmod 600 "$FILE"
find "$DIR" -name 'att-*.dump' -mtime +"$KEEP_DAYS" -delete
# A dump that can't be read back is not a backup: list its contents as a quick check.
pg_restore -l "$FILE" >/dev/null
echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
