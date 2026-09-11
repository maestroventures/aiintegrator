#!/usr/bin/env python3
"""
guard-home-folder-hook.py — Claude Code PreToolUse hook (Bash | Grep | Glob).

Refuses, BEFORE it runs, a session's search rooted at the home folder or above and any
command that names a new folder directly in the home folder. The rule itself lives in
home_folder_guard.py; this file only reads the tool call and answers.

Exit 2 = blocked (stderr is handed back to the session as the reason). Exit 0 = allowed.
Ships in the AI Integrator Blueprint plugin (hooks/hooks.json, via hooks/run-guard.sh) so every seat
gets it; the builder's seat also registered it in AIOS/.claude/settings.local.json first. Added
2026-09-11, slog_solo_20260911_055344_c1a0d7, on Bryce's instructions "add the hook" and "make it work"
for every user. The rule it enforces is the house tier's.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import home_folder_guard as g  # noqa: E402


def block(why):
    sys.stderr.write("BLOCKED by the home-folder guard: " + why + "\n" + g.REMEDY + "\n")
    sys.exit(2)


def main():
    try:
        call = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # not a tool call we can read; never break the session over it
    tool = call.get("tool_name", "")
    inp = call.get("tool_input") or {}

    if tool == "Bash":
        cmd = inp.get("command") or ""
        line = g.home_rooted_search(cmd)
        if line:
            block("this searches from the home folder (or above). A walk like that reaches into\n"
                  "    Mail, Messages, Safari and Photos and makes macOS show Bryce the pop-up\n"
                  "    \"claude would like to access data from other apps\".\n    Line: " + line[:160])
        strays = g.stray_home_paths(cmd, call.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR"))
        if strays:
            block("this names a folder directly in the home folder, outside the three allowed folders: "
                  + ", ".join(sorted(set(strays)))[:200])

    elif tool in ("Grep", "Glob"):
        root = inp.get("path") or call.get("cwd") or ""
        pattern = inp.get("pattern") or ""
        if tool == "Glob" and pattern.startswith(("/", "~", "$HOME")):
            head = pattern.split("*", 1)[0].rstrip("/") or "/"
            if g.tool_path_is_home_or_above(head):
                block(tool + " pattern is rooted at the home folder or above: " + pattern[:120])
        if g.tool_path_is_home_or_above(root):
            block(tool + " search root is the home folder or above: " + root)

    sys.exit(0)


if __name__ == "__main__":
    main()
