#!/bin/sh
# Swap a running Meme.app for a freshly downloaded copy, then relaunch it.
# Runs detached from the app, which quits right before this script starts.
#
# usage: install-update.sh <pid> <target.app> <source.app> <staging dir>
#
# MEME_UPDATE_SKIP_OPEN=1 skips the relaunch (used by tests).
set -u

PID="$1"
TARGET="$2"
SOURCE="$3"
STAGE="$4"
BACKUP="${TARGET}.bak"

# Never wipe the freshly installed bundle if the staging dir overlaps it.
case "$TARGET" in
  "$STAGE"|"$STAGE"/*) STAGE="" ;;
esac

# Wait up to 60s for the old process to exit.
i=0
while [ "$i" -lt 120 ]; do
  kill -0 "$PID" 2>/dev/null || break
  sleep 0.5
  i=$((i + 1))
done
sleep 1

/bin/rm -rf "$TARGET.new"
if ! /usr/bin/ditto "$SOURCE" "$TARGET.new"; then
  /bin/rm -rf "$TARGET.new"
  exit 1
fi
/usr/bin/xattr -dr com.apple.quarantine "$TARGET.new" 2>/dev/null || true

/bin/rm -rf "$BACKUP"
if ! /bin/mv "$TARGET" "$BACKUP"; then
  /bin/rm -rf "$TARGET.new"
  exit 1
fi

if /bin/mv "$TARGET.new" "$TARGET"; then
  if [ "${MEME_UPDATE_SKIP_OPEN:-0}" != "1" ]; then
    /usr/bin/open "$TARGET"
  fi
  if [ -n "$STAGE" ]; then
    /bin/rm -rf "$BACKUP" "$STAGE"
  else
    /bin/rm -rf "$BACKUP"
  fi
else
  # Roll back to the previous bundle if the swap failed halfway.
  /bin/mv "$BACKUP" "$TARGET"
  /bin/rm -rf "$TARGET.new"
  if [ "${MEME_UPDATE_SKIP_OPEN:-0}" != "1" ]; then
    /usr/bin/open "$TARGET"
  fi
  exit 1
fi
