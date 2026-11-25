#!/usr/bin/env bash
# Takes the latest timetables (kept up to date by the GitHub Action that reads the academy's site: the group
# timetable and the teachers' timetable), puts the group one next to the site (the app's offline copy) and loads both
# into the database. Runs every hour from cron (docs/DEPLOY.md, step 9).
# It touches nothing but schedule.json and the schedule tables, so it is safe to run at any time.
set -euo pipefail
REPO="${ATT_REPO:-p58nh46dsz-bit/att-app}"
# The branch the timetables are read from: main once the work is merged; until then the branch that carries them
# (set ATT_BRANCH=db in the cron file, docs/DEPLOY.md step 9).
BRANCH="${ATT_BRANCH:-main}"
TMP=$(mktemp)
curl -fsS --max-time 30 "https://raw.githubusercontent.com/$REPO/$BRANCH/schedule.json" -o "$TMP"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' "$TMP"   # refuse anything that is not valid JSON
install -m 644 "$TMP" /var/www/att/schedule.json
rm -f "$TMP"
cd /opt/att/server
sudo -u att env SCHEDULE_FILE=/var/www/att/schedule.json npm run -s import:schedule

# the teachers' timetable (every teacher and group); optional, so a missing file does not fail the whole script
TMP=$(mktemp)
if curl -fsS --max-time 30 "https://raw.githubusercontent.com/$REPO/$BRANCH/teacher_schedule.json" -o "$TMP" \
   && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' "$TMP"; then
  install -m 644 "$TMP" /opt/att/teacher_schedule.json.live
  sudo -u att env TEACHER_SCHEDULE_FILE=/opt/att/teacher_schedule.json.live npm run -s import:teachers
else
  echo "teacher_schedule.json is not available yet; skipped" >&2
fi
rm -f "$TMP"
