#!/bin/bash
# run-guard.sh — the plugin's launcher for the home-folder guard (hooks/hooks.json calls this).
#
# WHY A LAUNCHER AND NOT `python3 guard.py` DIRECTLY: this runs before EVERY Bash, Grep and Glob
# call a session makes. On a Mac without the command-line developer tools, /usr/bin/python3 is a
# stub that pops "install developer tools?" each time it is run — a guard that fires that on every
# command would be worse than the pop-up it exists to prevent. So: find a real python3, and if there
# is none, allow the call silently (exit 0). The rule still reaches the session through the house
# tier; only the automatic block is skipped on that machine.
PY=""
if [ "$(uname)" = "Darwin" ]; then
  for c in /opt/homebrew/bin/python3 /usr/local/bin/python3; do
    [ -x "$c" ] && PY="$c" && break
  done
  if [ -z "$PY" ] && xcode-select -p >/dev/null 2>&1; then PY=/usr/bin/python3; fi
else
  PY="$(command -v python3 2>/dev/null)"
fi
[ -z "$PY" ] && exit 0
exec "$PY" "$(dirname "$0")/guard-home-folder-hook.py"
