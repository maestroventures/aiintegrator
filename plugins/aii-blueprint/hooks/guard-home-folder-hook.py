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
        # ⭐ 2026-09-12 — WHICH OF THE TWO CASES THIS IS, because they have different causes and
        #    different remedies and until today they printed the same sentence.
        #    ASKED   the tool NAMED a home-or-above path. The session did something wrong.
        #    LANDED  the tool named NO path, so it searches the working folder — and the working
        #            folder IS the home folder. The session did nothing wrong; it was STARTED in
        #            the wrong place, and nothing it can do from inside will change that.
        #    MEASURED: the LANDED case blocks every pathless Grep and Glob for the whole session,
        #    Bash keeps working, and there was NO override of any kind — AIOS_ALLOWED_TOPS does
        #    not reach this test, which is a flat set membership. A seat in that state cannot
        #    search at all and the old message pointed it at rules it could not act on. Bryce hit
        #    it on 2026-09-11 (stuck at v0.9.13) and had to hand-upload a plugin to get out.
        asked_for = inp.get("path") or ""
        root = asked_for or call.get("cwd") or ""
        pattern = inp.get("pattern") or ""
        if tool == "Glob" and pattern.startswith(("/", "~", "$HOME")):
            head = pattern.split("*", 1)[0].rstrip("/") or "/"
            if g.tool_path_is_home_or_above(head):
                block(tool + " pattern is rooted at the home folder or above: " + pattern[:120])
        if g.tool_path_is_home_or_above(root):
            if asked_for:
                block(tool + " search root is the home folder or above: " + root)
            if g.home_search_opted_in():
                sys.exit(0)     # deliberately allowed for this session, by the person
            block(
                "THIS SESSION'S WORKING FOLDER IS THE HOME FOLDER (" + root + "), so a "
                + tool + " with no path searches all of it.\n"
                "    You did not ask for that root — it is where the session was started, and it "
                "blocks\n    every " + tool + " for as long as the session runs.\n"
                "    TWO WAYS OUT, and the first is the real fix:\n"
                "      1. Start Claude in your working folder instead of your home folder.\n"
                "      2. If you truly mean to search the home folder, set "
                + g.HOME_SEARCH_OPT_IN + "=1 for the session.")

    sys.exit(0)


if __name__ == "__main__":
    main()
