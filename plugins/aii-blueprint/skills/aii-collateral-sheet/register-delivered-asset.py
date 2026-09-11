#!/usr/bin/env python3
"""register-delivered-asset.py — THE ONE WRITER for the `assets` pointer.

============================================================================
WHY THIS EXISTS — read this before changing anything in here.
============================================================================
Measured 2026-09-10: 112 finished documents sat in `02 — Clients` and the library
could account for 34. The other 78 had no `assets` row. Root cause, unchanged since
the card was written on 2026-08-20: DELIVERY (a builder writing to out/, a file
copied into a client folder, SendUserFile) and REGISTRATION (an `assets` row) are
TWO SEPARATE ACTS, and nothing joins them. A second act runs without the first,
forever.

⛔ THE BACKFILL DONE THAT AFTERNOON IS NOT THE FIX AND MUST NOT BE READ AS ONE.
   64 rows were written on Bryce's ruling "log all 64 now", and #193 fell 78 -> 14.
   That cleared the backlog and changed NOTHING about the mechanism: the 65th
   document built the next day is an orphan again. A one-time backfill linking two
   stores is not a mechanism.

THE RULE IT IMPLEMENTS — Bryce's own, two standing rulings:
  fw_registration_at_build_time_never_on_a_schedule_20260802:
    "the writer of the state is the ACT that changes it ... so the store cannot
     drift from reality without the act itself failing. A scheduled check is then
     a redundancy, never the mechanism."
  dr_registration_is_a_precondition_of_existing_not_a_step_20260824_064500:
    "I should never have to say register this. I only ask because I have so many
     freaking problems trying to make sure that, hey, we just did this. Did you
     register it? I should never have to ask. Ever. No user should."

⭐ THIS IS A PORT OF A SHAPE THAT ALREADY EXISTS AND WAS ALREADY ARGUED, NOT A NEW
   DESIGN. register-call-doc.js is the same fix, one family over, for call_doc:
   a SEPARATE one-writer module the builder must call, never a block of code inside
   the builder. Same reason it is separate here — there are two live copies of the
   collateral builder today (the master under 00 — User Preferences and a parked
   patch under 02 — Clients/AI Integrator/sales/templates), and a registration step
   living inside either of them is a registration step that half the estate does not
   have.

============================================================================
THE UPDATE HALF — Bryce asked for it directly and the answer is MEASURED
============================================================================
His question, 2026-09-10, verbatim: "Maybe the delivery step includes, hey. I need
to update this. I don't know. Maybe it's not needed if it's the same file name.
That I don't know either."

THE FILE NAME IS NOT THE QUESTION. Measured on the live store that day, the estate
already answered it BOTH ways and the two answers contradict each other on the same
row: `asset_visitorresolve_sales_ghost-to-guest-sca-family-entertainment_v1` carries
version = 4 — rebuilt three times, with `_v1` still in its own id and nothing
anywhere saying what changed. Three other rows were re-minted as brand new `_v2`
ids with NO `_v1` sibling left, so their history is simply gone. `valid_from` was
NULL on all 167 rows. There was no history table.

So the door keys on the PATH and decides on the BYTES, and it has FOUR outcomes,
not two — each one written because collapsing it into its neighbour would store a
false fact:

  registered  the path has never been delivered      -> insert, version 1
  first-hash  the row exists and was never hashed    -> record the hash, DO NOT bump
              (all 167 rows on 2026-09-10 are this)     the version. Nobody knows
                                                        whether it ever changed.
  unchanged   same path, byte-identical              -> WRITE NOTHING. Not the row,
                                                        not history, not updated_at.
  rebuilt     same path, different bytes             -> version + 1, and the OLD
                                                        hash stays readable

⛔ `unchanged` IS THE ANSWER TO HIS ACTUAL QUESTION. A rebuild that produces the
   same file is not an event, and recording a version bump for it would be a lie
   about what happened. register-call-doc.js reached the same conclusion in its own
   words for kept state: "a new version here would be a lie about what happened."

============================================================================
THE RUN CHAIN — 2026-09-11, and why this script stopped choosing a dispatch mode
============================================================================
Until 2026-09-11 every asset_put() this script emitted carried the literal
'stationed'. The `assets` table forbids a stationed row from carrying a step
(assets_only_dispatched_has_timing), so every file registered through here was
BARRED from ever being placed in a campaign — 0 of 71 pieces registered 2026-09-09/10
reached one. Bryce ruled the fix (dr_touchpoint_record_may_reach_client_stores_20260911_084747;
spec 04 — Daily Operating System/specs/Campaign-Engine-Touchpoint-Record-SPEC-DRAFT.md §4.5):

  --dispatch-mode   REQUIRED. dispatched | stationed | governing. No default: a default
                    is how sent sheets were filed as stationed without anyone choosing.
  --touchpoint      the step a MESSAGE was made for (asset_touchpoint.touchpoint_id).
  --inherited-from  the canonical asset a personalised piece was made from. A piece
                    with --inherited-from and no --touchpoint is refused HERE and at the
                    door: a message must name its moment.

⛔ THIS SCRIPT NEVER TAKES A POSITION OR AN OFFSET. Placement is written only by
   asset_touchpoint_put(), and the caller READS which step a piece is for from the
   debrief or program that asked for it. Nothing here infers a step.

============================================================================
NO NETWORK, BY DESIGN — the two-step door, same as every other script here
============================================================================
Local scripts cannot reach Neon; that credential path was deliberately removed
estate-wide. So: --sql emits the statements, the SESSION runs them through the
board connector resolved BY CATEGORY, and hands the rows back to --settle. This
script never holds a credential and never guesses a result.

USAGE
  register-delivered-asset.py --scan <dir> --deliver-to <path under 02 — Clients> \
      --tenant bryce --company ai-integrator --department sales \
      --asset-type concept_sheet --program <program_id> --by session:<id> \
      --dispatch-mode dispatched|stationed|governing \
      [--template <touchpoint template id>] [--touchpoint <touchpoint_id>] \
      [--inherited-from <canonical asset_id>] [--channel <text>] [--note <change note>]
                                          # hashes every deliverable, writes _delivery.json
  register-delivered-asset.py --plan <_delivery.json> --sql
                                          # prints one asset_put() per file
  register-delivered-asset.py --plan <_delivery.json> --settle <rows.json>
                                          # judges the RETURNED ROWS. exit 0 only if
                                          # every built file came back with a verdict.
  register-delivered-asset.py --selftest  # inverse control, no network, no writes

EXIT CODES
  0  every delivered file has a verdict from the store
  1  a delivered file came back with NO row — the delivery is NOT registered
  2  the scan directory could not be read
  3  the returned rows were not row-shaped, or carried an unknown verdict
  6  called with no plan
"""
import argparse, hashlib, json, os, sys

DELIVERABLE_EXTS = (".pdf", ".html", ".docx", ".pptx")

# ⛔ NOT A VALUE LIST THIS SCRIPT INVENTED. These are the four verdicts asset_put()
#    itself returns, and they are asserted here so that a door that grows a FIFTH
#    outcome breaks this reader loudly instead of having it silently pass an
#    unrecognised verdict through as success. Same reason register-call-doc.js reads
#    its vocabulary rather than typing it: a value list typed into a script is the
#    defect the registry exists to end. The difference — and it is stated rather than
#    hidden — is that this one CANNOT read term_registry, because it has no network.
#    So it fails loud on an unknown verdict instead of pretending to know the set.
KNOWN_VERDICTS = {"registered", "first-hash", "unchanged", "rebuilt"}


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def scan(args):
    """Hash every deliverable in --scan and write the plan. This is the half that
    makes the registration UNAVOIDABLE rather than available: the plan names the
    exact files that were produced, so a missing row later is a countable fact
    about a named file rather than a vague feeling that something was skipped."""
    d = os.path.abspath(args.scan)
    if not os.path.isdir(d):
        print("EXIT 2 — cannot read the scan directory: %s" % d, file=sys.stderr)
        raise SystemExit(2)
    files = sorted(f for f in os.listdir(d)
                   if f.lower().endswith(DELIVERABLE_EXTS) and not f.startswith("."))
    if not files:
        # ⚠ AN EMPTY SCAN IS A LOUD FINDING, NEVER A QUIET PASS. "the builder produced
        #   nothing" and "everything is registered" must never exit the same way.
        print("EXIT 2 — %s holds no .pdf/.html/.docx/.pptx. A build that produced no "
              "deliverable is not a delivery, and an empty plan would register nothing "
              "while exiting clean." % d, file=sys.stderr)
        raise SystemExit(2)
    deliver_to = args.deliver_to.rstrip("/")
    if not deliver_to.startswith("02 — Clients/"):
        print("EXIT 2 — --deliver-to must be the path the file will actually LIVE at, "
              "under '02 — Clients/'. Got: %r. The path is the key: it is what the row "
              "is joined on and the only thing standing check #193 can see when it walks "
              "the client folders. A registration naming out/ describes a staging folder "
              "nobody delivers from." % deliver_to, file=sys.stderr)
        raise SystemExit(2)
    plan = {"tenant": args.tenant, "by": args.by, "deliver_to": deliver_to,
            "company_id": args.company, "department": args.department,
            "asset_type": args.asset_type, "program_id": args.program,
            "template_id": args.template or "", "channel": args.channel or "",
            "dispatch_mode": args.dispatch_mode, "touchpoint_id": args.touchpoint or "",
            "inherited_from": args.inherited_from or "",
            "change_note": args.note or "", "files": []}
    for f in files:
        p = os.path.join(d, f)
        stem, ext = os.path.splitext(f)
        plan["files"].append({
            "file": f,
            "source_ref": "%s/%s" % (deliver_to, f),
            "canonical_name": stem,
            "format": ext.lstrip(".").lower(),
            "content_sha": sha256_of(p),
            "content_bytes": os.path.getsize(p),
        })
    out = os.path.join(d, "_delivery.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(plan, fh, indent=1, ensure_ascii=False)
    print("PLANNED %d deliverable(s) -> %s" % (len(plan["files"]), out))
    for r in plan["files"]:
        print("   %s  %s  %d bytes" % (r["content_sha"][:12], r["file"], r["content_bytes"]))
    print("\n⛔ NOT DELIVERED YET. These files are hashed, not registered. Run --sql, put the\n"
          "   statements through the board, then hand the rows back with --settle.")
    return 0


def sql_for(plan):
    lines = ["-- ONE asset_put() PER DELIVERED FILE. Run them all; save the FULL result.",
             "-- Every one returns a verdict: registered | first-hash | unchanged | rebuilt.",
             "-- `unchanged` is a PASS and writes nothing — a rebuild producing the same bytes",
             "-- is not an event. Hand the rows back with --settle."]
    for r in plan["files"]:
        # A plan written before 2026-09-11 has no dispatch_mode key. It is emitted as NULL on
        # purpose, so asset_put() refuses a NEW row rather than this script supplying a mode.
        lines.append(
            "SELECT * FROM asset_put(%s, %s, %s, %d, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
            % (q(plan["tenant"]), q(r["source_ref"]), q(r["content_sha"]), r["content_bytes"],
               q(plan["by"]), q(plan["company_id"]), q(plan["department"]), q(plan["asset_type"]),
               q(plan["program_id"]), q(r["format"]), q(r["canonical_name"]),
               q_or_null(plan.get("channel")), q_or_null(plan.get("template_id")),
               q_or_null(plan.get("dispatch_mode")), q(plan.get("change_note", "")),
               q_or_null(plan.get("touchpoint_id")), q_or_null(plan.get("inherited_from"))))
    return "\n".join(lines)


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def q_or_null(s):
    return q(s) if s else "NULL"


DISPATCH_MODES = ("dispatched", "stationed", "governing")


def placement_problem(dispatch_mode, touchpoint, inherited_from):
    """The same refusals asset_put() makes, said before anything is hashed, so a caller
    learns at the scan that a message has no step - not after running the SQL."""
    if dispatch_mode not in DISPATCH_MODES:
        return ("--dispatch-mode is required and must be one of %s. There is no default: the old "
                "hardcoded 'stationed' filed sent sheets where no step can ever be recorded."
                % "|".join(DISPATCH_MODES))
    if inherited_from and not touchpoint:
        return ("--inherited-from %s makes this a personalised piece - a MESSAGE - and a message must "
                "name the touchpoint it was made for. Read the step from the debrief or program that "
                "asked for it, create it with asset_touchpoint_put() if it does not exist, and pass "
                "--touchpoint." % inherited_from)
    if touchpoint and dispatch_mode == "governing":
        return "a governing asset reaches no one, so it cannot sit at touchpoint %s." % touchpoint
    return None


def settle(plan, rows_path):
    """JUDGE THE RETURNED ROWS. Not 'did I send the statement' — what came back.

    ⚠ THIS IS THE HALF THAT MAKES IT A MECHANISM. Everything above is a helpful
      script; this is the part that can say NO. A delivery whose files did not all
      come back with a verdict exits 1, and the caller is told which file."""
    try:
        with open(rows_path, "r", encoding="utf-8") as fh:
            blob = json.load(fh)
    except Exception as e:
        print("EXIT 3 — could not read --settle: %s" % e, file=sys.stderr)
        raise SystemExit(3)
    rows = blob.get("rows", blob) if isinstance(blob, dict) else blob
    if not isinstance(rows, list):
        print("EXIT 3 — the connector result was not row-shaped. Hand settle the FULL result "
              "of the run, not a summary of it. A result you paraphrased cannot be judged.",
              file=sys.stderr)
        raise SystemExit(3)
    by_path = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        # asset_put returns out_asset_id; the source_ref is not echoed, so the rows are
        # matched positionally against the plan ONLY when the counts agree — and when they
        # do not, that is reported rather than guessed at.
        by_path[r.get("out_asset_id") or r.get("asset_id") or len(by_path)] = r
    verdicts = [r.get("verdict") for r in rows if isinstance(r, dict)]
    unknown = [v for v in verdicts if v not in KNOWN_VERDICTS]
    if unknown:
        print("EXIT 3 — asset_put returned verdict(s) this reader does not know: %s. It knows "
              "%s. An unrecognised verdict must never pass as success: either the door grew a "
              "fifth outcome and this file has not been told, or the rows are not from asset_put."
              % (sorted(set(unknown)), sorted(KNOWN_VERDICTS)), file=sys.stderr)
        raise SystemExit(3)
    want = len(plan["files"])
    got = len(verdicts)
    print("SETTLE — %d file(s) delivered, %d verdict(s) returned" % (want, got))
    for v in sorted(set(verdicts)):
        print("   %-11s x%d" % (v, verdicts.count(v)))
    if got < want:
        print("\nEXIT 1 — RED. %d of %d delivered file(s) came back with NO row. Those files are "
              "on disk and invisible to the content library — which is the exact defect this "
              "program exists to end. Name them, register them, and re-settle." % (want - got, want),
              file=sys.stderr)
        raise SystemExit(1)
    if got > want:
        print("\nEXIT 3 — more rows came back than files were delivered (%d vs %d). Something "
              "else was registered in the same run; do not read this as a pass." % (got, want),
              file=sys.stderr)
        raise SystemExit(3)
    print("\n✅ DELIVERED AND REGISTERED. Every file produced by this build has a row.")
    return 0


def selftest():
    """INVERSE CONTROL, BOTH DIRECTIONS — a control that can only pass proves nothing."""
    ok = True
    plan = {"files": [{"file": "a.pdf"}, {"file": "b.pdf"}]}
    import tempfile
    d = tempfile.mkdtemp()
    short = os.path.join(d, "short.json")
    with open(short, "w") as fh:
        json.dump({"rows": [{"verdict": "registered", "out_asset_id": "x"}]}, fh)
    try:
        settle(plan, short); ok = False; print("  FAIL  a missing row did not go RED")
    except SystemExit as e:
        if e.code == 1: print("  pass  a delivered file with no row exits 1")
        else: ok = False; print("  FAIL  wrong exit for a missing row: %s" % e.code)
    bad = os.path.join(d, "bad.json")
    with open(bad, "w") as fh:
        json.dump({"rows": [{"verdict": "registered"}, {"verdict": "sort-of"}]}, fh)
    try:
        settle(plan, bad); ok = False; print("  FAIL  an unknown verdict passed as success")
    except SystemExit as e:
        if e.code == 3: print("  pass  an unknown verdict exits 3")
        else: ok = False; print("  FAIL  wrong exit for an unknown verdict: %s" % e.code)
    good = os.path.join(d, "good.json")
    with open(good, "w") as fh:
        json.dump({"rows": [{"verdict": "registered"}, {"verdict": "unchanged"}]}, fh)
    try:
        settle(plan, good); print("  pass  a complete set (including `unchanged`) exits 0")
    except SystemExit as e:
        ok = False; print("  FAIL  a complete set was refused: %s" % e.code)

    # the run chain (2026-09-11): the script may never choose a dispatch mode, and a message needs a step
    base = {"tenant": "t", "by": "b", "company_id": "c", "department": "d", "asset_type": "a",
            "program_id": "p", "channel": "", "template_id": "tmpl_x", "change_note": "",
            "files": [{"source_ref": "02 — Clients/x.pdf", "content_sha": "a" * 64, "content_bytes": 1,
                       "format": "pdf", "canonical_name": "x"}]}
    legacy_sql = sql_for(base)
    if "'stationed'" in legacy_sql or "asset_put(" not in legacy_sql:
        ok = False; print("  FAIL  a plan with no dispatch_mode still emitted a hardcoded mode")
    elif legacy_sql.count(", NULL") >= 3:
        print("  pass  a plan written before the run chain emits dispatch_mode NULL, so the door refuses a new row")
    else:
        ok = False; print("  FAIL  legacy plan did not emit NULLs for dispatch_mode/touchpoint/inherited_from")
    msg = dict(base, dispatch_mode="dispatched", touchpoint_id="tp_x_1", inherited_from="asset_parent")
    msg_sql = sql_for(msg)
    if "'dispatched'" in msg_sql and msg_sql.rstrip(";").endswith("'tp_x_1', 'asset_parent')"):
        print("  pass  dispatch mode, touchpoint and parent reach asset_put() as its last three arguments")
    else:
        ok = False; print("  FAIL  touchpoint/inherited_from not emitted in position: %s" % msg_sql[-90:])
    cases = [(None, None, None, True, "no --dispatch-mode"),
             ("dispatched", None, "asset_parent", True, "a message with no --touchpoint"),
             ("governing", "tp_x_1", None, True, "a governing piece at a touchpoint"),
             ("dispatched", "tp_x_1", "asset_parent", False, "a message with its touchpoint"),
             ("stationed", None, None, False, "a stationed canonical piece")]
    for mode, tp, parent, want_refused, label in cases:
        refused = placement_problem(mode, tp, parent) is not None
        if refused == want_refused:
            print("  pass  %s is %s" % (label, "REFUSED" if want_refused else "accepted"))
        else:
            ok = False; print("  FAIL  %s was %s" % (label, "refused" if refused else "accepted"))
    print("SELF-TEST %s" % ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--scan"); ap.add_argument("--deliver-to", dest="deliver_to")
    ap.add_argument("--tenant"); ap.add_argument("--company"); ap.add_argument("--department")
    ap.add_argument("--asset-type", dest="asset_type"); ap.add_argument("--program")
    ap.add_argument("--by"); ap.add_argument("--template"); ap.add_argument("--channel")
    ap.add_argument("--note")
    ap.add_argument("--dispatch-mode", dest="dispatch_mode")
    ap.add_argument("--touchpoint"); ap.add_argument("--inherited-from", dest="inherited_from")
    ap.add_argument("--plan"); ap.add_argument("--sql", action="store_true")
    ap.add_argument("--settle"); ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        raise SystemExit(selftest())
    if a.scan:
        for need in ("deliver_to", "tenant", "company", "department", "asset_type", "program", "by"):
            if not getattr(a, need):
                print("EXIT 6 — --%s is required for a scan. There is no default here on "
                      "purpose: every one of these is either NOT NULL on `assets` or a foreign "
                      "key, so a guess would be a false fact rather than a convenience."
                      % need.replace("_", "-"), file=sys.stderr)
                raise SystemExit(6)
        problem = placement_problem(a.dispatch_mode, a.touchpoint, a.inherited_from)
        if problem:
            print("EXIT 6 — %s" % problem, file=sys.stderr)
            raise SystemExit(6)
        raise SystemExit(scan(a))
    if not a.plan:
        print(__doc__.split("USAGE")[1].split("EXIT CODES")[0], file=sys.stderr)
        print("EXIT 6 — no --plan. Nothing here guesses what was delivered.", file=sys.stderr)
        raise SystemExit(6)
    with open(a.plan, "r", encoding="utf-8") as fh:
        plan = json.load(fh)
    if a.sql:
        print(sql_for(plan)); raise SystemExit(0)
    if a.settle:
        raise SystemExit(settle(plan, a.settle))
    print("EXIT 6 — a plan was given but neither --sql nor --settle.", file=sys.stderr)
    raise SystemExit(6)


if __name__ == "__main__":
    main()
