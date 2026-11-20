#!/usr/bin/env bash
# Proves that a backup works: restores the newest dump into a throw-away database and counts rows.
# Run it once after the first backup and then about once a month.  sudo ./deploy/restore-test.sh
set -euo pipefail
LAST=$(ls -1t /var/backups/att/att-*.dump | head -1)
echo "restoring $LAST into att_restore_test"
sudo -u postgres dropdb --if-exists att_restore_test
sudo -u postgres createdb att_restore_test
sudo -u postgres pg_restore --no-owner -d att_restore_test "$LAST"
sudo -u postgres psql -d att_restore_test -Atc "select 'users: ' || count(*) from users"
sudo -u postgres dropdb att_restore_test
echo "restore OK"
