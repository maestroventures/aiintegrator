#!/usr/bin/env python3
"""
home_folder_guard.py — the ONE home of the three-folder rule: ~/Claude, the AIOS folder, ~/aios-workshop.
(Until 2026-09-11 this read "nothing lives outside AIOS, except git-db"; git-db is now INSIDE the
workshop, and the text below keeps its original measurements.)

Two things are refused, and both were measured before this file existed (2026-09-11,
slog_solo_20260911_055344_c1a0d7):

1. A SEARCH ROOTED AT THE HOME FOLDER OR ABOVE. `find "$HOME" ...` walks into Mail, Messages,
   Safari and Photos, and macOS answers with the dialog *"claude" would like to access data
   from other apps* — which names nothing and explains nothing. Two sessions did exactly this
   (2026-09-10 13:13, 2026-09-11 05:37), each hunting a repo it had lost track of.

2. A NEW FOLDER DIRECTLY IN THE HOME FOLDER. Run files and sessions made ~30 throwaway copies
   of aii-site at `$HOME/aios-s18-ship`, `$HOME/.aios-proof`, `$HOME/.aios/deploy-stage/...`
   and never removed them — 1.5 GB, every file already on GitHub. Bryce's ruling: "You have
   ONE folder outside of the AIOS directory structure" — /Users/bebeling/git-db. A throwaway
   copy goes in /Users/bebeling/git-db/_scratch/<name> and is removed when the run ends.

Used by BOTH doors that can create the problem, so the rule cannot drift between them:
  - build-run-file.py (a run file the operator double-clicks — no hook can see those)
  - guard-home-folder-hook.py (a Claude Code session's own Bash / Grep / Glob calls)

HONEST LIMITS, stated so nobody reads a green as proof:
  - A path built at run time from pieces (`D=$HOME; W="$D/x"`) is not resolvable here.
  - Dot-folders are only refused by the known scratch names (`.aios-*`, and `.aios/` scratch
    subfolders). `~/.aios` itself holds live services and secrets and is NOT refused — where
    that folder should live is Bryce's ruling to make, not this file's.
"""
import os
import re

HOME = os.path.expanduser("~")

# Home-level names a path may legitimately start with. Everything else directly under the
# home folder is a stray by Bryce's 2026-09-10 ruling.
#  "Claude" added 2026-09-11 (same session): it is the DESKTOP APP'S own folder — named in
#  claude_desktop_config.json as coworkUserFilesPath, and Cowork's scheduled tasks run from
#  ~/Claude/Scheduled. It is not a stray, and refusing to even name it blocked reading it.
#  "aios-workshop" added 2026-09-11 on Bryce's ruling: THREE folders are allowed — ~/Claude (the
#  app's), the AIOS folder (the user's), and ~/aios-workshop (granted; git databases, background
#  programs, keys; needed by anyone who manages a website). git-db and .aios moved INSIDE it.
#  "git-db" stays allowed ONLY while its forwarding link exists (removal date on the card).
#  GENERIC 2026-09-11 (shipped in the plugin): nothing here names one seat. The allow-list is the
#  three folder ROLES (house tier v25) resolved on whatever machine this runs on:
#    - the app's folder ("Claude") and the workshop ("aios-workshop"),
#    - the operating system's own folders and the common cloud-drive roots a working folder lives in,
#    - PLUS the top folder of the session's own working directory (see allowed_tops(cwd)), so a
#      person whose AIOS sits somewhere unusual is never refused inside their own working folder.
ALLOWED_TOP = {"aios-workshop", "Claude", "Library", "Desktop", "Documents", "Downloads",
               "Applications", "Movies", "Music", "Pictures", "Public",
               "Google Drive", "Dropbox", "OneDrive", "Box", "Box Sync", "iCloud Drive (Archive)"}
#  "git-db" is the OLD name of the workshop's git folder on the builder's seat. It is allowed ONLY
#  while ~/git-db is still a forwarding link — no clock, so it cannot go stale — and never on a seat
#  that never had one.
LEGACY_LINKS = {"git-db"}


def allowed_tops(cwd=None):
    tops = set(ALLOWED_TOP)
    tops |= {n for n in LEGACY_LINKS if os.path.islink(os.path.join(HOME, n))}
    if cwd:
        rel = os.path.relpath(os.path.abspath(os.path.expanduser(cwd)), HOME)
        if not rel.startswith("..") and rel != ".":
            tops.add(rel.split(os.sep)[0])
    extra = os.environ.get("AIOS_ALLOWED_TOPS", "")
    tops |= {t.strip() for t in extra.split(",") if t.strip()}
    return tops
# Known scratch dumping grounds inside or beside the workshop (and its old name, ~/.aios).
SCRATCH_DOT = re.compile(r"^\.aios-[\w.-]+$")
SCRATCH_AIOS_SUB = re.compile(r"^(deploy-stage|runs|testbed|scratch[\w.-]*|proof[\w.-]*)$")
WORKSHOP_NAMES = {".aios", "aios-workshop"}

# The spellings of "the home folder" a shell line can carry.
_HOME_TOKEN = r"(?:\$HOME|\$\{HOME\}|~|" + re.escape(HOME) + r")"
_QUOTE_END = r"(?=$|[\s\"';|&)<>])"
_HOME_PREFIX = re.compile(r"(?<![\w/.$-])" + _HOME_TOKEN + r"/")
_SEG = re.compile(r"((?:[^/\s\"';|&)<>]|\\ )+)(?:/([^/\s\"';|&)<>]+))?")
_BARE_ROOT = re.compile(r"(?<![\w/.$-])(?:" + _HOME_TOKEN + r"/?|/Users/?|/)" + _QUOTE_END)

# A search command only counts in COMMAND POSITION — start of line, after ; | & ( $( ` or after
# do/then/xargs/sudo/exec/time. v1 matched anywhere after whitespace, so the prose "--- process
# tree of the run window" inside an echo read as the `tree` command (2026-09-11, a false block).
_SEARCH_CMD = re.compile(
    r"(?:^|[;|&(`]|\$\(|\b(?:do|then|else|xargs|sudo|exec|time|nice)\b)\s*"
    r"(?:find|fd|rg|ag|ack|mdfind|locate|tree|du|grep\s+(?:-[a-zA-Z]*[rR]|--recursive)|"
    r"ls\s+(?:-[a-zA-Z]*R))(?=\s|$)")
_SINGLE_Q = re.compile(r"'[^']*'")   # the shell never expands ~ or $HOME inside single quotes
_DOUBLE_Q = re.compile(r'"[^"]*"')   # prose in double quotes is not a command


def _exec_lines(text):
    return [l for l in text.splitlines() if not l.lstrip().startswith("#")]


def stray_home_paths(text, cwd=None):
    """Every home-level path in executable lines that names a folder outside the three roles."""
    tops = allowed_tops(cwd)
    hits = []
    for line in _exec_lines(text):
        for p in _HOME_PREFIX.finditer(line):
            rest = line[p.end():].replace("\\ ", " ")
            # The workshop is allowed, but its OLD scratch dumping grounds are not — a throwaway
            # copy goes in <workshop>/_scratch/<name>, never <workshop>/deploy-stage|runs|testbed.
            m = _SEG.match(line, p.end())
            if m and m.group(1) in WORKSHOP_NAMES and SCRATCH_AIOS_SUB.match(m.group(2) or ""):
                hits.append(line[p.start():m.end()])
                continue
            # An allowed name may itself contain a space ("Google Drive"), which a
            # delimiter-based split would cut in half — so test the allow-list first.
            if any(rest == n or rest.startswith(n) and rest[len(n)] in "/\"' ;|&)<>"
                   for n in tops if len(rest) >= len(n)):
                continue
            m = _SEG.match(line, p.end())
            if not m:
                continue
            top = m.group(1)
            sub = m.group(2) or ""
            if SCRATCH_DOT.match(top) or (top == ".aios" and SCRATCH_AIOS_SUB.match(sub)):
                hits.append(line[p.start():m.end()])
            elif not top.startswith("."):
                hits.append(line[p.start():m.end()])
    return hits


def home_rooted_search(text):
    """A search command on a line that names the home folder (or / or /Users) bare."""
    for line in _exec_lines(text):
        unsingle = _SINGLE_Q.sub("''", line)          # `awk '$4 ~ /^0/'` is not the home folder
        commands = _DOUBLE_Q.sub('""', unsingle)       # `echo "process tree"` is not `tree`
        if _SEARCH_CMD.search(commands) and _BARE_ROOT.search(unsingle):
            return line.strip()
    return None


def tool_path_is_home_or_above(path):
    """For Grep/Glob: a search root at the home folder, /Users, or /."""
    if not path:
        return False
    p = os.path.normpath(os.path.expanduser(path.replace("$HOME", HOME)))
    return p in {HOME, os.path.dirname(HOME), "/"}


REMEDY = (
    "    The rule (house tier, 'When you need to put a file somewhere, or find one'): a seat's machine\n"
    "    has THREE folders — the app's own folder (~/Claude), the person's working folder (their AIOS),\n"
    "    and, only if they have one, the workshop (~/aios-workshop). Nothing else in the home folder.\n"
    "    - Looking for something? Search inside the working folder or the workshop. Not found → STOP\n"
    "      and ask the person in chat. Never widen the search to the home folder.\n"
    "    - Need a throwaway copy? ~/aios-workshop/_scratch/<name>, removed when done.\n"
    "    - Your seat's own paths are in your seat tier and your registered workspace roots."
)
