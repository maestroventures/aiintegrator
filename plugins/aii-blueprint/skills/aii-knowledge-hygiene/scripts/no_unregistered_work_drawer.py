#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""no_unregistered_work_drawer.py — standing check #12 on the builder's own seat.

⚠ THE ORDINAL IS A BUILDER-SEAT LABEL AND IT HAS MOVED TWICE IN ONE DAY. Built as #11 on
2026-08-10 and renumbered to #12 the same day (a concurrent session took #11 for
no_machine_clock_in_python.py); a third session then took #12 for no_zone_literal_in_shipped_js.py
and had to renumber to #13. So: NAME THIS CHECK BY ITS JOB, never by its number, anywhere a client
can read it — a client seat has no standing-checks block and no ordinal at all.
⚠ AND THIS LINE ITSELF WAS THE STRAGGLER: §9.4 of the governing standard recorded the renumber as
landing "in the script's own banner" on 2026-08-10 (leg 2). It landed at the --self-test print and
NOT here, so the file went on introducing itself as the ELEVENTH check for a full leg. A manifest
line is a claim; the grep is the proof (fixed leg 3, 2026-08-10).

Same family as no_hardcoded_tool_address.py / no_shadow_duplicates.py /
no_dangling_pointers.py / no_retired_pointers.py / no_vocabulary_drift.py /
no_ungranted_scheduled_verb.py / no_shared_db_client_credential.py /
no_undeclared_gate0_dependency.py / no_client_data_on_the_house_store.py /
no_stale_published_skill_body.py.

WHY THIS EXISTS — AND IT IS NOT THE DEFECT ANYONE ASSUMED
  Bryce, 2026-08-10, verbatim: "our AI leaves an absolute trail of crap and never comes back
  to clean it."  MEASURED THE SAME HOUR, and the measurement INVERTED the premise:

    loose .bak files outside a drawer ..........    9   (of 1,115 on disk)
    loose _MANIFEST files outside a drawer .....    9   (of 357 on disk)
    UNDERSCORE WORKING DIRECTORIES ............. 132

  The files were put away. The 2026-08-07 root fix in bak-stamp.js worked and held. What is
  NOT fixed is that nobody named the drawer, so every session invented its own:

    _tmp · _scratch · _staged · _publish-staging · _STAGING-board-oauth · _s64-staging
    _probes · _mpull · _memrows · _verify_tmp · _design-scratch-cc-skin · _baseline-check-20260804
    _parked-from-deploy-2026-07-31 · _retired-cited-20260807 · _superseded · _superseded-v1.0

  ~20 words for THREE ideas. So this is not a cleanup problem and a sweeper is the wrong tool.
  It is a VOCABULARY problem, and Bryce already owns the machine for vocabulary problems.

  Governing rule: the operator's own weight-3 memory
  `feedback-the-one-field-nothing-constrains-is-the-one-that-inflates.md` —
  "Constrain the INFLOW at write time, or a periodic sweep never catches up."
  Canon: blueprint-core.md `core-canon:file-lifecycle` — location equals status; for a
  file's status the filesystem is the source of truth.
  Ruling: dr_park_non_governing_files_20260730 (Bryce) · dec_bryce_marked_dead_backups_are_a_set_20260806.

THE REGISTRY IS THE INPUT. THIS SCRIPT CONTAINS NO DRAWER LIST.
  Same discipline as no_vocabulary_drift.py (#5) and no_ungranted_scheduled_verb.py (#6): a
  value list typed into a script is a second copy that is wrong the day the registry moves and
  never says so. This script REFUSES to run without --drawers <snapshot.json> (exit 6, prints
  the SQL) and REFUSES a snapshot older than --max-age-days (exit 7).
  The canon lives at term_registry: domain `file-lifecycle`, term `work_drawer`, for the TENANT
  passed in --tenant. Never a tenant written into this file.

THE ONE-QUESTION TEST
  For every directory a person can SEE while looking for their own work:
  is its name a registered work_drawer?
  Legal = the exact registered name, or that name followed by a HYPHEN and a suffix
  (`_to_delete-shadow-duplicates-2026-07-30` is the shape 38 live folders already use, and
  Bryce ruled park-never-delete on them). `_to_deleteX` with no hyphen is NOT legal — that
  precision is load-bearing, see C5.

WHAT IS DELIBERATELY NOT A FINDING
  - Anything NESTED INSIDE a legal drawer. Once a session is on its own desk it may organise
    however it likes; the invariant is about what a PERSON SEES, not about tidiness. Without
    this, the check reds on correct behaviour, gets baselined away, and takes the real reds
    with it (C6).
  - `__pycache__`, `node_modules`, `.git` and friends — tool machinery, not a drawer (C7).
  - FILES. The invariant is about directories (C8).

⚠ HONEST LIMIT, PRINTED ON EVERY RUN — IT SEES DIRECTORIES ONLY.
  A session that writes sixty loose files into a VISIBLE folder is invisible to this check BY
  CONSTRUCTION, and that is the other half of the same complaint: measured 2026-08-10,
  `04 — Daily Operating System` carries 60 loose files at its top level, 18 of them named
  `Track-11-Framework-Engine-S*-Ledger.md`. Naming the drawer does not by itself move them.
  Do NOT read a green here as "the workspace is findable."

USAGE
  python3 no_unregistered_work_drawer.py --print-sql            # the snapshot query, then exit 6
  python3 no_unregistered_work_drawer.py --root "<workspace root>" \
          --drawers "04 — Daily Operating System/scripts/work-drawer-snapshot.json" \
          --known   "04 — Daily Operating System/scripts/known-work-drawers.txt"
  python3 no_unregistered_work_drawer.py --self-test

EXIT CODES
  0 green · 1 RED · 3 nothing walked (blindness, NEVER a pass) · 4 self-test failed
  6 no drawer snapshot handed in · 7 the snapshot is stale or malformed

⚠ A PIPE EATS THE EXIT CODE.  Piping any check into tail reports tail's status, which
  is always 0.  Capture it instead:  out=$(python3 <this script> --root "$R" ... 2>&1); rc=$?
  (Written without a filename on purpose: an example path in prose reads as a real
   pointer to no_dangling_pointers.py, and it went red on this very comment.)
"""

# ── SELF-DECLARED STANDING-CHECK MARKER ─────────────────────────────────────────────
# Read by scripts/standing_check_marker.py (AST, never import, never grep) and by
# no_unregistered_standing_check.py, whose population is the no_*.py glob UNIONED with
# every file carrying this marker. It declares exactly two things: how this file derives
# its own subjects, and who reads its exit code. Self-test / --known set / exit-code
# contract are QUALITY properties and live in the `standing_check` registry as columns.
# ────────────────────────────────────────────────────────────────────────────────────
STANDING_CHECK = {
    "population":
        "walks every directory under --root and derives its subjects from the filesystem: directory "
        "names beginning with an underscore, judged against the work_drawer term snapshot supplied by "
        "--drawers. It carries no drawer list of its own. It sees DIRECTORIES only.",
    "reds_at":
        "the CLAUDE.md standing-check block (run before reporting any file work done); exit 1 = a "
        "finding",
}

import argparse
import datetime
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DEFAULT_DRAWERS = os.path.join(HERE, "work-drawer-snapshot.json")
DEFAULT_KNOWN = os.path.join(HERE, "known-work-drawers.txt")

SCHEMA = "work-drawer-snapshot/1"

# THE TENANT IS AN ARGUMENT, NOT A LITERAL (added 2026-08-10, leg 3, for the plugin ship).
# This script now ships to client seats inside aii-knowledge-hygiene. Until this edit the snapshot
# SQL named tenant 'bryce' in two places, so a client seat would have produced the BUILDER's drawer
# vocabulary and read it as its own — a wrong answer, silently, with nothing going red. Same defect
# class as feedback-a-fallback-that-fires-every-time-is-a-hardcode.
SNAPSHOT_SQL_TEMPLATE = """-- Produces the snapshot no_unregistered_work_drawer.py reads.
-- Run through the board reader resolved BY CATEGORY (initiatives-board / query_board,
-- Core §11 rule 4 — never a connector name), then save the single returned text value to
-- the path this script reads with --drawers (default: work-drawer-snapshot.json beside it).
SELECT json_build_object(
  'schema','work-drawer-snapshot/1',
  'tenant','{tenant}',
  'term','work_drawer',
  'fetched_at', now(),
  'drawers', (SELECT json_agg(json_build_object(
                'name', k,
                'label', v->>'label',
                'plain', v->>'plain',
                'user_facing', (v->>'user_facing')::boolean) ORDER BY k)
              FROM term_registry t, jsonb_each(t.allowed) AS e(k, v)
              WHERE t.tenant_id='{tenant}' AND t.domain='file-lifecycle'
                AND t.term='work_drawer' AND t.governs)
)::text AS snapshot;"""


def render_snapshot_sql(tenant):
    """The snapshot SQL for ONE tenant. Refuses a blank tenant rather than defaulting to one."""
    if not tenant or not str(tenant).strip():
        raise SystemExit(
            "no_unregistered_work_drawer.py: --tenant is required to print the snapshot SQL.\n"
            "  There is no default. A snapshot built for the wrong seat returns the wrong drawer\n"
            "  vocabulary and this check would then pass or fail against somebody else's rules.")
    return SNAPSHOT_SQL_TEMPLATE.replace("{tenant}", str(tenant).strip())

# Directory names that are tool machinery, never a work drawer. Not a drawer list — these are
# names no human ever chose as a place to put working files.
MACHINERY = {".git", ".svn", ".hg", "node_modules", "__pycache__", ".vercel", ".next",
             ".venv", "venv", ".pytest_cache", ".mypy_cache", ".DS_Store", ".idea", ".vscode"}


# ---------------------------------------------------------------------------
# The invariant
# ---------------------------------------------------------------------------

def is_drawer_candidate(name):
    """A directory a session created as a place to put working files.

    Underscore-prefixed only. That is the measured convention in this workspace (132 of them)
    and it is what a person sees sorted to the top of a folder listing. A single leading
    underscore, not the dunder form: `__pycache__` is machinery, not a drawer.
    """
    if name in MACHINERY:
        return False
    if not name.startswith("_"):
        return False
    if name.startswith("__"):
        return False
    return True


def classify(name, legal_names):
    """LEGAL if the name IS a registered drawer, or is that drawer plus `-<suffix>`.

    The hyphen is required and it is not cosmetic. Without it `_to_deleteX` and
    `_workingcopy` read as legal, which is how a prefix rule silently forgives the next
    invented drawer — the exact class this check exists to stop (C5).
    """
    for legal in legal_names:
        if name == legal:
            return True
        if name.startswith(legal + "-"):
            return True
    return False


def load_known(path):
    """Accepted debt as a SET, and every entry MUST carry a reason.

    A bare path is a PERMANENT MUTE — nothing ever re-asks whether its reason still holds.
    Learned from check #8's `--known` guard (2026-08-08). A bare line is reported as
    UNGUARDED-EXEMPTION rather than honoured, because a mute nobody can audit is worse than
    the finding it hides.
    """
    known, unguarded = {}, []
    if not path or not os.path.exists(path):
        return known, unguarded
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "|" not in line:
                unguarded.append(line)
                continue
            rel, reason = line.split("|", 1)
            rel, reason = rel.strip(), reason.strip()
            if not reason:
                unguarded.append(line)
                continue
            known[rel] = reason
    return known, unguarded


def walk(root, legal_names, known):
    """Return (findings, walked_dirs, skipped_inside_drawer).

    Prunes the walk INSIDE a legal drawer: once a session is on its own desk, what it does
    there is not a finding. Pruning (rather than filtering after the fact) is also what keeps
    this cheap on a 10,000-file tree.
    """
    findings = []
    walked = 0
    pruned = 0
    for dirpath, dirnames, _filenames in os.walk(root):
        keep = []
        for d in sorted(dirnames):
            walked += 1
            if d in MACHINERY:
                continue                       # never descend into machinery
            if is_drawer_candidate(d):
                if classify(d, legal_names):
                    pruned += 1
                    continue                   # legal drawer: do not descend, do not report
                rel = os.path.relpath(os.path.join(dirpath, d), root)
                if rel in known:
                    pruned += 1
                    continue                   # accepted debt, with a stated reason
                findings.append({"rel": rel, "name": d, "class": "UNREGISTERED-DRAWER"})
                continue                       # do not descend into a drawer being reported
            keep.append(d)
        dirnames[:] = keep
    return findings, walked, pruned


# ---------------------------------------------------------------------------
# Snapshot loading — data only, never logic
# ---------------------------------------------------------------------------

def load_snapshot(path, max_age_days):
    if not path or not os.path.exists(path):
        return None, ("no drawer snapshot at %r. This check will not guess a drawer list — "
                      "run with --print-sql, run that SQL through the board reader resolved "
                      "BY CATEGORY, and save the result here." % path)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            snap = json.load(fh)
    except Exception as exc:
        return None, "snapshot is not readable JSON: %s" % exc
    if isinstance(snap, str):
        try:
            snap = json.loads(snap)
        except Exception as exc:
            return None, "snapshot is a string that is not JSON: %s" % exc
    if snap.get("schema") != SCHEMA:
        return None, "snapshot schema is %r, expected %r" % (snap.get("schema"), SCHEMA)
    drawers = snap.get("drawers")
    if not drawers:
        return None, ("snapshot carries no drawers — an empty registry is a DEFECT, never a "
                      "green. With no legal names every drawer on disk would read as red.")
    fa = snap.get("fetched_at")
    if not fa:
        return None, "snapshot has no fetched_at — an undated read cannot be trusted"
    try:
        stamp = datetime.datetime.fromisoformat(str(fa).replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=datetime.timezone.utc)
    except Exception as exc:
        return None, "snapshot fetched_at %r is not a timestamp: %s" % (fa, exc)
    age = (datetime.datetime.now(datetime.timezone.utc) - stamp).total_seconds() / 86400.0
    if age > max_age_days:
        return None, ("snapshot is %.1f days old (limit %g). A read goes stale the moment you "
                      "stop looking." % (age, max_age_days))
    if age < -1:
        return None, "snapshot fetched_at is in the future by %.1f days" % (-age)
    return snap, None


# ---------------------------------------------------------------------------
# Self-test — refuses to report green if its own matcher is broken.
# A zero from a broken check is "I could not look," not "nothing is wrong."
# ---------------------------------------------------------------------------

FIXTURE_DRAWERS = ["_working", "_to_delete", "_Archive"]


def self_test():
    """10 controls. Each one is named with WHAT IT HOLDS, and the load-bearing ones are the
    false positives that would get this check baselined away on its first real run."""
    fails = []
    legal = FIXTURE_DRAWERS

    def red(name):
        return not classify(name, legal) and is_drawer_candidate(name)

    # C1 — THE REAL DEFECT, VERBATIM. `_s64-staging` is a live directory in this workspace.
    if not red("_s64-staging"):
        fails.append(("C1 real defect _s64-staging is RED", "red", "green"))

    # C2/C3 — the legal names are green. Baseline; not load-bearing on their own.
    for ok in ("_working", "_Archive"):
        if red(ok):
            fails.append(("C%d %s is GREEN" % (2 if ok == "_working" else 3, ok), "green", "red"))

    # C4 — LOAD-BEARING. The suffix form is legal; 38 live folders use it and Bryce ruled
    # park-never-delete on them. Without this the check reds on 38 correct folders on run one.
    if red("_to_delete-shadow-duplicates-2026-07-30"):
        fails.append(("C4 suffix form _to_delete-<why>-<date> is GREEN", "green", "red"))

    # C5 — LOAD-BEARING, AND IT IS WHY THE HYPHEN IS REQUIRED. Without the hyphen the prefix
    # rule forgives every future invented drawer that happens to start with a legal name.
    if not red("_to_deleteX"):
        fails.append(("C5 _to_deleteX (no hyphen) is RED", "red", "green"))
    if not red("_workingcopy"):
        fails.append(("C5b _workingcopy (no hyphen) is RED", "red", "green"))

    # C6 — LOAD-BEARING FALSE POSITIVE. Nesting inside a legal drawer is not a finding.
    # Proven against the walker, not the matcher, because pruning is where it is decided.
    tmp = tempfile.mkdtemp()
    os.makedirs(os.path.join(tmp, "_working", "_probes", "_tmp"))
    f6, _, _ = walk(tmp, legal, {})
    if f6:
        fails.append(("C6 _probes nested inside _working is GREEN", "green", [x["rel"] for x in f6]))

    # C7 — LOAD-BEARING FALSE POSITIVE. Tool machinery is not a drawer.
    for machine in ("__pycache__", "node_modules", ".git"):
        if is_drawer_candidate(machine):
            fails.append(("C7 %s is not a drawer" % machine, "not-a-drawer", "drawer"))

    # C8 — LOAD-BEARING. The invariant is about DIRECTORIES. A FILE named _staged is not a
    # drawer; reporting it confuses two different problems and the fix for one breaks the other.
    tmp8 = tempfile.mkdtemp()
    with open(os.path.join(tmp8, "_staged"), "w", encoding="utf-8") as fh:
        fh.write("a file, not a folder")
    f8, _, _ = walk(tmp8, legal, {})
    if f8:
        fails.append(("C8 a FILE named _staged is GREEN", "green", [x["rel"] for x in f8]))

    # C9 — BLINDNESS IS NOT A PASS. An empty tree walks zero directories, and the caller must
    # exit 3 on that rather than printing a green.
    tmp9 = tempfile.mkdtemp()
    _, walked9, _ = walk(tmp9, legal, {})
    if walked9 != 0:
        fails.append(("C9 empty tree walks 0 dirs", 0, walked9))

    # C10 — LOAD-BEARING. A bare --known line is an UNAUDITABLE MUTE and must be refused,
    # never honoured. Learned from check #8, 2026-08-08.
    tmp10 = tempfile.mkdtemp()
    kp = os.path.join(tmp10, "known.txt")
    with open(kp, "w", encoding="utf-8") as fh:
        fh.write("# comment\n_probes\n_mpull | still being drained, card X\n_bad |\n")
    known10, unguarded10 = load_known(kp)
    if "_mpull" not in known10:
        fails.append(("C10 a guarded entry is honoured", "honoured", sorted(known10)))
    if sorted(unguarded10) != sorted(["_probes", "_bad |"]):
        fails.append(("C10b bare and reason-less entries are refused", ["_probes", "_bad |"],
                      sorted(unguarded10)))

    # C11 — an empty snapshot is refused, not read as an empty-and-therefore-green list.
    tmp11 = tempfile.mkdtemp()
    sp = os.path.join(tmp11, "snap.json")
    with open(sp, "w", encoding="utf-8") as fh:
        json.dump({"schema": SCHEMA, "drawers": [],
                   "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}, fh)
    snap11, err11 = load_snapshot(sp, 7)
    if snap11 is not None or not err11:
        fails.append(("C11 empty snapshot refused", "refused", "accepted"))

    return fails


# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--root", default=DEFAULT_ROOT)
    ap.add_argument("--drawers", default=DEFAULT_DRAWERS,
                    help="the term_registry snapshot JSON. REQUIRED — this check never "
                         "carries a drawer list of its own.")
    ap.add_argument("--known", default=DEFAULT_KNOWN,
                    help="accepted-debt SET. Every entry must be `path | reason`.")
    ap.add_argument("--tenant", default=None,
                    help="whose work_drawer vocabulary to snapshot. REQUIRED with --print-sql: "
                         "there is no default tenant and guessing one is the defect this flag "
                         "exists to prevent.")
    ap.add_argument("--max-age-days", type=float, default=7.0)
    ap.add_argument("--print-sql", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)

    if args.print_sql:
        print(render_snapshot_sql(args.tenant))
        return 6

    fails = self_test()
    if fails:
        print("SELF-TEST FAILED — this run proves nothing. A zero from a broken check is")
        print("\"I could not look,\" not \"nothing is wrong.\"")
        for name, want, got in fails:
            print("  %-52s expected %r, got %r" % (name, want, got))
        return 4
    if args.self_test:
        print("self-test: 11 controls, 0 failures.")
        return 0

    snap, err = load_snapshot(args.drawers, args.max_age_days)
    if err:
        print("REFUSED: %s" % err)
        print()
        print(render_snapshot_sql(args.tenant))
        return 7 if os.path.exists(args.drawers or "") else 6

    legal = [d["name"] for d in snap["drawers"]]
    known, unguarded = load_known(args.known)

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print("REFUSED: --root %r is not a directory. Blindness is not a pass." % root)
        return 3

    findings, walked, pruned = walk(root, legal, known)

    print("no_unregistered_work_drawer.py — standing check #12")
    print("  root ............ %s" % root)
    print("  legal drawers ... %s   (from term_registry, never from this script)"
          % ", ".join(sorted(legal)))
    print("  directories ..... %d walked, %d legal-or-accepted drawers pruned" % (walked, pruned))
    print()
    print("  ⚠ LIMIT: this check sees DIRECTORIES ONLY. Loose files in a visible folder are")
    print("    invisible to it BY CONSTRUCTION. A green here does not mean the workspace is")
    print("    findable — it means no session invented a new drawer.")
    print()

    if walked == 0:
        print("REFUSED: walked 0 directories. Blindness is not a pass.")
        return 3

    rc = 0
    if unguarded:
        rc = 1
        print("RED — UNGUARDED-EXEMPTION (%d): a --known entry with no stated reason is a"
              % len(unguarded))
        print("      permanent mute nobody can audit. Write it as `path | why`.")
        for line in unguarded:
            print("        %s" % line)
        print()

    if findings:
        rc = 1
        print("RED — UNREGISTERED-DRAWER (%d): a directory a person can see whose name is not"
              % len(findings))
        print("      a registered work_drawer. Move its contents into the right drawer, or —")
        print("      if it is genuinely accepted debt — add ONE line to %s" % args.known)
        print("      in the form `path | why`. Never regenerate that file to clear a red:")
        print("      that is how a SET silently becomes a COUNT.")
        for f in sorted(findings, key=lambda x: x["rel"]):
            print("        %s" % f["rel"])
        print()
    if rc == 0:
        print("GREEN — every visible working directory is a registered drawer.")
    return rc


if __name__ == "__main__":
    sys.exit(main())
