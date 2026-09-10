#!/usr/bin/env python3
"""Build the four AI Integrator vertical sheets as two-sided PDFs.

Brand source of truth (SPEC GATE, domain='brand-visual'):
  - AI-Integrator-Brand-Guide  -> palette + one-pager zone structure
  - Type: Archivo everywhere; IBM Plex Mono for labels/eyebrows only
  - Teal appears exactly ONCE per view  (asserted below)
  - Logo: embedded from brand/logo/, never redrawn
Collateral & Messaging Standard v1.0:
  - numerals not words | spine word 'Throughline' threaded | customer is hero
    ('What we handle / What you bring') | pain before solution | audience named at top

⛔ THE SENDING COMPANY'S WORDS DO NOT LIVE IN THIS FILE — PORTED 2026-09-09.
   Ported from build-call-guide.js (04 — Daily Operating System/▶ RUN/_scratch/
   call-guide-pr-20260909, built 06:43 the same morning), which had removed its own
   workspace-file fallback for exactly this reason. This is a PORT of a shape that
   already exists and was already argued, not a new design.

   WHAT WAS WRONG HERE. front() and back() carried nine AI Integrator literals —
   the 90/10 line, The Throughline, both CTAs, the signature block, the two split
   headings, the closer, and the STEPS strip (Audit -> Deploy -> Maintain). Bryce
   ruled 2026-09-09: "a sheet is a RECIPIENT DOCUMENT, not an AI Integrator
   document. Structure generic; logo, teal, Archivo, Audit->Deploy->Maintain are
   the INSTANCE layer, swapped per sending company." A hardcoded literal wearing a
   generic builder is the collateral twin of the call guide's finding (b): another
   company building on this file would have shipped AI INTEGRATOR'S PITCH inside
   their own client's sheet, and it would have looked perfect on the way out.
   And per the aii-collateral-sheet overlay, The Throughline is brand language,
   NOT a framework word: "Never put it in another company's collateral."

   THE WORDS NOW LIVE IN asset_template_body, read by the CALLER and passed in:
     --frame <frame.json>   the nine anchors, read out of the store. --print-sql
                            emits the exact SELECT that produces it.
   ABSENT OR INCOMPLETE = REFUSE, exit 1, AND NO FILE IS WRITTEN. There is
   deliberately no second source and no default. Because the only source is a
   store this machine reaches through the board, and the board refuses an actor
   with no open session_log row, PRODUCING A SHEET NOW REQUIRES AN OPEN SESSION
   AND A RESOLVED STORE. That is the whole point of the port.

   ⚠ WHY A FALLBACK IS NOT COMING BACK. The call-guide block this was ported from
   says it best: a fallback that works on the author's own machine is not a safety
   net, it is the thing that hides the failure from the only person who could fix
   it. The sweep job auto-guide-debrief-sweep broke eight times in eight weeks
   while its Gate 0 stayed green, because Gate 0 resolves the storage CATEGORY and
   never the ARTIFACT. If you are about to add `or "Start with the audit."` to any
   line below, read this paragraph again.

   ⚠ WHAT THIS DOES NOT GUARD, stated so nobody reads it as more than it is. It
   guards the ACT of building a sheet with this program. A sheet hand-written in a
   chat, or a file dropped into a client folder by any other means, is untouched —
   that is standing check #193's job (the room), and #193 in turn cannot see a
   deliverable that was never written to disk. Neither of them is a write door on
   `assets`; there is still no asset_put.
"""
import base64, pathlib, re, sys, asyncio

# ⛔ content.py IS NOT IMPORTED AT MODULE LEVEL — GENERICIZED 2026-09-09, same reason
#    as the frame below. content.py holds the SHEETS for ONE prospect and is written
#    by the caller, per sheet, beside this file. As a top-level `from content import
#    SHEETS` it made the seat's FIRST instruction (--print-sql) die on a Python
#    traceback before this file could say anything, and a ModuleNotFoundError is not
#    a refusal: it names Python's problem, not the reader's. See load_sheets().

# ⛔ THERE IS NO `HERE`. GENERICIZED 2026-09-09, ruled by Bryce the same day.
#    This program used to read content.py, assets/ and write out/ RELATIVE TO ITSELF, which is
#    correct for a copy sitting in one delivery's _source/ and impossible for the ONE copy that
#    ships in the plugin at skills/aii-collateral-sheet/build.py. Shipped that way it died on a
#    missing font before it could say a word, and AI Integrator's own logo-dark.png would have had
#    to ride along into every client seat — which the port note above calls the instance layer and
#    forbids. Every per-delivery path now hangs off --work, exactly as build-call-guide.js takes
#    guide.json, config.json and output.html as arguments and reads nothing beside itself.
WORK = None   # set by require_work(); a default here is what would hide the failure
OUT  = None

# ⛔ BRAND IS A PARAMETER. RESTORED 2026-09-10 by session slog_solo_20260910_113552_b3e91c.
#    THIS IS A RESTORATION, NOT A NEW DESIGN. The 2026-08-20 copy of this family
#    (two-sided-sheet-source-20260820.zip) already had BRANDS{} + css_for(brand); its own
#    README says "BRAND IS A PARAMETER ... so one family serves two registered brands.
#    Layout, zones and type scale untouched. The accent-once-per-view assert is per brand."
#    The 2026-09-09 port moved the sending company's WORDS out to asset_template_body and
#    correctly refused a default for them -- and in the same move put the sending company's
#    COLOUR back in as a literal (PRIMARY/ACCENT/BLACK/OFFWHITE/MUTED plus three inline
#    hexes in the stylesheet). So a VisitorResolve sheet built here came out with
#    VisitorResolve's logo and AI Integrator's accent.
#
#    That is the defect this file's own docstring warns about, committed against colour
#    instead of words: "a hardcoded literal wearing a generic builder ... would have
#    shipped AI INTEGRATOR'S PITCH inside their own client's sheet, and it would have
#    looked perfect on the way out."
#
#    ⚠ ONLY THE COLOURS LIVE HERE. The spine line and the STEPS strip were in the
#    2026-08-20 BRANDS map too; they are NOT restored here, because they are WORDS and
#    the 2026-09-09 ruling put words in asset_template_body, read through --frame. Two
#    homes for one fact is the defect this program already fixed once.
BRANDS = {
    "aii": {"PRIMARY": "#4F46E5", "ACCENT": "#00D4AA", "BLACK": "#0D0D24",
            "OFFWHITE": "#F0EFFF", "MUTED": "#6366A0",
            "RULE": "#DEDCF5", "RULE2": "#D5D2F2", "FOOTRULE": "#262647"},
    "vr":  {"PRIMARY": "#007FFF", "ACCENT": "#B5F44A", "BLACK": "#2B2D42",
            "OFFWHITE": "#EDF2F4", "MUTED": "#857F74",
            "RULE": "#D8DEE2", "RULE2": "#CFD7DC", "FOOTRULE": "#3E4157"},
}

PRIMARY = ACCENT = BLACK = OFFWHITE = MUTED = RULE = RULE2 = FOOTRULE = None


def load_palette():
    """The sending company's COLOURS, chosen by --brand. REQUIRED, no default -- same
    discipline as --work/--frame/--gate and for the same reason: a default paints one
    company's identity onto another company's sheet and it looks finished on the way out."""
    global PRIMARY, ACCENT, BLACK, OFFWHITE, MUTED, RULE, RULE2, FOOTRULE
    b = _flag("--brand")
    if not b:
        raise SystemExit(
            "build.py: REFUSED - no --brand given, and no sheet was written.\n"
            "--brand names the SENDING company's palette. Registered: %s\n"
            "There is no default: the accent colour is an identity, not a style."
            % ", ".join(sorted(BRANDS)))
    if b not in BRANDS:
        raise SystemExit(
            "build.py: REFUSED - --brand %r is not registered. No sheet written.\n"
            "Registered: %s" % (b, ", ".join(sorted(BRANDS))))
    P = BRANDS[b]
    PRIMARY, ACCENT, BLACK = P["PRIMARY"], P["ACCENT"], P["BLACK"]
    OFFWHITE, MUTED = P["OFFWHITE"], P["MUTED"]
    RULE, RULE2, FOOTRULE = P["RULE"], P["RULE2"], P["FOOTRULE"]
    return P


BRAND_FILES = ["assets/Archivo-400.ttf", "assets/Archivo-600.ttf", "assets/Archivo-700.ttf",
               "assets/PlexMono.ttf", "assets/logo-dark.png"]

A400 = A600 = A700 = PLEX = LOGO_DARK = None
CSS = None


def require_work():
    """--work is the folder holding THIS delivery: content.py, assets/, and out/. REQUIRED,
    no default. See the block where HERE used to be."""
    global WORK, OUT
    w = _flag("--work")
    if not w:
        raise SystemExit(
            "build.py: REFUSED — no --work given, and no sheet was written.\n"
            "--work is the folder for THIS delivery. It must hold:\n"
            "  content.py   the SHEETS for this prospect, which you write\n"
            "  assets/      the SENDING company's fonts and logo (5 files, see BRAND_FILES)\n"
            "and out/ is created inside it. There is no default: the one copy of this program\n"
            "ships in the plugin and does not know whose delivery it is being run for.")
    WORK = pathlib.Path(w).expanduser()
    if not WORK.is_dir():
        raise SystemExit("build.py: REFUSED — --work %s is not a folder. No sheet written." % w)
    OUT = WORK / "out"
    return WORK


def b64(p):
    return base64.b64encode((WORK / p).read_bytes()).decode()


def load_brand():
    """The sending company's fonts and logo, from --work/assets. FAILS LOUD and NAMES every
    missing file, because a half-loaded brand renders a sheet that looks finished."""
    global A400, A600, A700, PLEX, LOGO_DARK, CSS
    missing = [f for f in BRAND_FILES if not (WORK / f).exists()]
    if missing:
        raise SystemExit(
            "build.py: REFUSED — %d of %d brand file(s) missing under %s. NO SHEET WRITTEN.\n"
            "  MISSING: %s\n"
            "These are the SENDING company's fonts and logo and they are deliberately not shipped\n"
            "with this program: a default set would render another company's identity onto this\n"
            "sheet and it would look perfect on the way out."
            % (len(missing), len(BRAND_FILES), WORK, ", ".join(missing)))
    A400 = b64("assets/Archivo-400.ttf")
    A600 = b64("assets/Archivo-600.ttf")
    A700 = b64("assets/Archivo-700.ttf")
    PLEX = b64("assets/PlexMono.ttf")
    LOGO_DARK = b64("assets/logo-dark.png")
    CSS = _css()
    return CSS


def _css():
    return f"""
@font-face {{ font-family:'Archivo'; src:url(data:font/ttf;base64,{A400}) format('truetype');
             font-weight:400; font-style:normal; }}
@font-face {{ font-family:'Archivo'; src:url(data:font/ttf;base64,{A600}) format('truetype');
             font-weight:600; font-style:normal; }}
@font-face {{ font-family:'Archivo'; src:url(data:font/ttf;base64,{A700}) format('truetype');
             font-weight:700; font-style:normal; }}
@font-face {{ font-family:'PlexMono'; src:url(data:font/ttf;base64,{PLEX}) format('truetype');
             font-weight:500; font-style:normal; }}
@page {{ size:letter; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html,body {{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
body {{ font-family:'Archivo', Helvetica, Arial, sans-serif; color:{BLACK}; }}
.page {{ width:8.5in; height:11in; overflow:hidden; position:relative;
         display:flex; flex-direction:column; page-break-after:always; background:#fff; }}
.page:last-child {{ page-break-after:auto; }}

/* ---- top bar ---- */
.bar {{ background:{BLACK}; padding:.19in .55in; display:flex; align-items:center;
        justify-content:space-between; }}
.bar img {{ height:20px; }}
.mono {{ font-family:'PlexMono', 'Courier New', monospace; font-weight:500;
         letter-spacing:.10em; text-transform:uppercase; }}
.bar .mono {{ font-size:6.6pt; color:{MUTED}; text-align:right; line-height:1.5; }}

/* ---- hero ---- */
.hero {{ background:{PRIMARY}; padding:.25in .55in .27in; }}
.hero .eyebrow {{ font-size:6.8pt; color:{OFFWHITE}; opacity:.78; margin-bottom:.11in; }}
.hero h1 {{ font-size:21pt; line-height:1.06; font-weight:700; letter-spacing:-.018em;
            color:#fff; margin-bottom:.115in; }}
.hero p {{ font-size:8.6pt; line-height:1.44; color:{OFFWHITE}; opacity:.92; max-width:6.4in; }}

/* ---- body ---- */
.body {{ flex:1; padding:.22in .55in .06in; }}
h2 {{ font-size:13.4pt; font-weight:700; letter-spacing:-.012em; margin-bottom:.06in; }}
.note {{ font-size:8.2pt; line-height:1.4; color:{MUTED}; margin-bottom:.115in; max-width:6.4in; }}

.leak {{ display:grid; grid-template-columns:.30in 1fr; margin-bottom:.058in; }}
.leak .n {{ font-family:'PlexMono','Courier New',monospace; font-weight:500; font-size:8pt;
            color:{PRIMARY}; padding-top:.022in; }}
.leak h3 {{ font-size:9.1pt; font-weight:700; line-height:1.26; margin-bottom:.028in; }}
.leak .what {{ font-size:7.7pt; line-height:1.35; color:{MUTED}; margin-bottom:.032in; }}
.orch {{ display:grid; grid-template-columns:1fr 1fr; background:{OFFWHITE};
          border-left:2px solid {PRIMARY}; }}
.orch > div {{ padding:.05in .11in .055in; }}
.orch > div + div {{ border-left:1px solid {RULE2}; }}
.orch .k {{ font-family:'PlexMono','Courier New',monospace; font-weight:500; font-size:5.9pt;
            letter-spacing:.09em; text-transform:uppercase; color:{PRIMARY}; margin-bottom:.028in; }}
.orch > div + div .k {{ color:{MUTED}; }}
.orch p {{ font-size:7.6pt; line-height:1.34; color:{BLACK}; }}

/* ---- questions ---- */
.q {{ display:grid; grid-template-columns:.32in 1fr; margin-bottom:.185in; }}
.q .n {{ font-family:'PlexMono','Courier New',monospace; font-weight:500; font-size:8pt;
         color:{PRIMARY}; padding-top:.03in; }}
.q h3 {{ font-size:10.6pt; font-weight:700; line-height:1.28; margin-bottom:.035in; }}
.q p {{ font-size:8.8pt; line-height:1.42; color:{MUTED}; }}
.q p b {{ color:{BLACK}; font-weight:600; }}

/* ---- handle / bring ---- */
.split {{ display:grid; grid-template-columns:1fr 1fr; gap:.34in; margin-top:.30in;
          border-top:1px solid {RULE}; padding-top:.24in; }}
.split h4 {{ font-size:10pt; font-weight:700; margin-bottom:.08in; }}
.split ul {{ list-style:none; }}
.split li {{ font-size:9.1pt; line-height:1.42; color:{MUTED}; padding-left:.15in;
             position:relative; margin-bottom:.055in; }}
.split li:before {{ content:'—'; position:absolute; left:0; color:{PRIMARY}; }}

/* ---- footer band ---- */
.closer {{ margin-top:.30in; border-left:3px solid {PRIMARY}; background:{OFFWHITE};
             padding:.16in .20in; font-size:9.1pt; line-height:1.45; color:{BLACK}; }}
.closer b {{ font-weight:700; }}
.foot {{ background:{BLACK}; padding:.22in .55in .21in; }}
.foot .line {{ font-size:8.9pt; line-height:1.34; color:#fff; font-weight:600;
               margin-bottom:.12in; }}
.foot .line span {{ color:{OFFWHITE}; opacity:.72; font-weight:400; }}
.steps {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:.26in; margin-bottom:.14in; }}
.steps .s .k {{ font-size:6.6pt; color:{MUTED}; margin-bottom:.05in; }}
.steps .s h5 {{ font-size:9.4pt; color:#fff; font-weight:700; margin-bottom:.04in; }}
.steps .s p {{ font-size:7.0pt; line-height:1.34; color:{OFFWHITE}; opacity:.70; }}
.cta {{ border-top:1px solid {FOOTRULE}; padding-top:.14in; display:flex;
        justify-content:space-between; align-items:baseline; }}
.cta .big {{ font-size:9.5pt; font-weight:700; color:{ACCENT}; }}
.cta .sm {{ font-size:7.4pt; color:{MUTED}; text-align:right; line-height:1.55; }}
"""

# ---------------------------------------------------------------------------
# THE FRAME — the sending company's own words, read from the store, never here.
# See the refusal block in the module docstring for why there is no default.
# ---------------------------------------------------------------------------

FRAME_REQUIRED_ANCHORS = [
    "frame-ninety-ten", "frame-throughline", "frame-cta-front", "frame-cta-back",
    "frame-signature", "frame-handle-label", "frame-bring-label", "frame-closer",
    "frame-steps",
]

# ⛔ THE TENANT AND THE TEMPLATE ARE ARGUMENTS, NOT LITERALS — GENERICIZED 2026-09-09.
#    This file used to hardcode tenant_id = 'bryce' and template_id =
#    'tmpl_aii_concept-sheet-two-sided' inside FRAME_SQL. That is the ONE line of this
#    program a client seat is told to run first, so every seat would have been handed
#    the BUILDER'S tenant and AI INTEGRATOR'S template, and the SELECT would have
#    returned zero rows or somebody else's words with nothing going red either way.
#    Same defect, same fix, as no_unregistered_work_drawer.py, whose own pack.config
#    note records: "its --print-sql now REQUIRES --tenant with no default, because
#    until then the snapshot SQL named the builder's tenant in two places and a client
#    seat would have policed itself against the BUILDER's drawer names with nothing
#    going red." There is deliberately no default for either.

_ID_OK = re.compile(r"\A[A-Za-z0-9_.:-]{1,120}\Z")


def frame_sql(tenant, template):
    """The SELECT that produces a --frame. Both halves are REQUIRED and neither has a
    default: a default here is how the builder's own tenant reaches a client seat."""
    missing = [f for f, v in (("--tenant", tenant), ("--template", template)) if not v]
    if missing:
        raise SystemExit(
            "build.py: REFUSED — --print-sql needs %s, and there is no default.\n"
            "  --tenant    the tenant whose words these are — the SENDING company, not ours.\n"
            "  --template  the asset_template_body template_id holding this sheet's frame.\n"
            "A default here would hand you the builder's tenant and somebody else's\n"
            "words, and the SELECT would look perfectly well-formed on the way out."
            % " and ".join(missing))
    for flag, v in (("--tenant", tenant), ("--template", template)):
        if not _ID_OK.match(v):
            raise SystemExit(
                "build.py: REFUSED — %s %r is not a plain identifier. No SQL printed."
                % (flag, v))
    return ("""SELECT anchor, body\n"""
            """  FROM asset_template_body\n"""
            """ WHERE tenant_id = '%s'\n"""
            """   AND template_id = '%s'\n"""
            """ ORDER BY anchor""" % (tenant, template))


def gate_sql(tenant, template, review_due=None):
    """The SELECT that produces a --gate. Same no-defaults rule as frame_sql, and the
    same reason: a default tenant here would clear a build against somebody else's row.

    THE GATE IS NOT THE FRAME AND NEITHER REPLACES THE OTHER. --frame proves the WORDS
    arrived. --gate proves this template is allowed to be built at all: that it is in
    the catalogue, that its stored hash still matches its stored body, and that it
    carries a review date in the future. A frame can be complete on a template nobody
    may build from, and that is exactly the case this adds.

    review_due is OPTIONAL on purpose. Ruled 2026-09-09
    (dr_an_asset_is_measured_against_company_state_every_time_the_function_is_called):
    ninety days is the RECOMMENDED PACING and a shorter interval is explicitly allowed
    ("can happen more often"). Omit it and the gate defaults to ninety days itself -
    the default lives in the store, never in this file."""
    missing = [f for f, v in (("--tenant", tenant), ("--template", template)) if not v]
    if missing:
        raise SystemExit(
            "build.py: REFUSED - --print-sql needs %s, and there is no default.\n"
            "  --tenant    the tenant whose words these are - the SENDING company, not ours.\n"
            "  --template  the asset_template template_id this sheet is built from.\n"
            % " and ".join(missing))
    for flag, v in (("--tenant", tenant), ("--template", template), ("--review-due", review_due)):
        if v and not _ID_OK.match(v):
            raise SystemExit(
                "build.py: REFUSED - %s %r is not a plain identifier. No SQL printed."
                % (flag, v))
    due = "'%s'::date" % review_due if review_due else "NULL"
    return ("""SELECT ok, detail\n"""
            """  FROM asset_build_gate('%s', '%s', %s)""" % (tenant, template, due))


def load_gate(path):
    """FAILS LOUD, and REFUSES ON A FALSE VERDICT rather than warning about one.

    THIS IS THE HALF THAT WAS MISSING UNTIL 2026-09-09. asset_build_gate existed in the
    store and NOTHING CALLED IT - a wall standing beside an open door. The gate can only
    stop a build if a builder asks it and then obeys the answer, which is why this
    refuses instead of printing a caution: a caution in a build log is read by nobody
    and the PDF still lands in a client folder.

    The pattern is register-call-doc.js's registerOrUnlink(), one family over: the
    artifact does not survive a failed registration. That single mechanism is why
    call_doc is the only store on this estate at 100%."""
    import json
    if not path:
        raise SystemExit(
            "build.py: REFUSED - no --gate given, and no sheet was written.\n"
            "The gate says whether this template may be built AT ALL: is it in the\n"
            "catalogue, does its stored hash still match its stored words, does it carry\n"
            "a review date in the future. Run --print-sql, run the asset_build_gate\n"
            "SELECT through the board connector, save the row, and pass it with --gate.\n"
            "Ruled 2026-09-09: the database is the master and a file is a projection, so\n"
            "a sheet built without asking the store is a projection of nothing.")
    p = pathlib.Path(path)
    if not p.exists():
        raise SystemExit("build.py: REFUSED - --gate %s does not exist. No sheet written." % path)
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except ValueError as e:
        raise SystemExit(
            "build.py: REFUSED - --gate %s is not readable JSON (%s). No sheet written."
            % (path, e))
    row = raw[0] if isinstance(raw, list) and raw else raw
    if not isinstance(row, dict) or "ok" not in row:
        raise SystemExit(
            "build.py: REFUSED - --gate %s carries no `ok` column. No sheet written.\n"
            "Expected the row asset_build_gate returns: ok and detail. An empty result is\n"
            "NOT a pass - a gate that returned nothing was never asked." % path)
    if row.get("ok") in (True, "true", "t", 1):
        return row
    raise SystemExit(
        "build.py: REFUSED BY THE GATE - no sheet was written.\n\n%s\n\n"
        "This is the store refusing, not this file. Fix what it names and re-run; do not\n"
        "re-run with --gate omitted, which is the one move that turns this wall back into\n"
        "a door." % (row.get("detail") or "(the gate returned ok=false and no detail)"))


def load_sheets():
    """The prospect's own content, written by the caller beside this file. FAILS LOUD
    in this file's own words rather than as a Python traceback — see the import block."""
    if str(WORK) not in sys.path:
        sys.path.insert(0, str(WORK))
    try:
        from content import SHEETS
    except ModuleNotFoundError:
        raise SystemExit(
            "build.py: REFUSED — no content.py in the --work folder, and no sheet was written.\n"
            "content.py holds SHEETS: the audiences, headings and body for THIS prospect.\n"
            "It is written per sheet by whoever is building it and it is deliberately not\n"
            "shipped, because a default content.py would produce a plausible sheet for the\n"
            "wrong company. Write it into %s, then re-run." % WORK)
    if not SHEETS:
        raise SystemExit(
            "build.py: REFUSED — content.py defines SHEETS but it is empty. No sheet written.")
    return SHEETS


def load_frame(path):
    """FAILS LOUD, never quietly generic (Nygard). A sheet with the wrong company's
    footer looks exactly like a correct sheet, which is why this refuses instead of
    substituting anything. Mirror of build-call-guide.js loadDefaultAspects()."""
    import json
    if not path:
        raise SystemExit(
            "build.py: REFUSED — no --frame given, and no sheet was written.\n"
            "The sending company's words (the 90/10 line, The Throughline, both CTAs,\n"
            "the signature, the two split headings, the closer, the 3-step strip) live in\n"
            "asset_template_body, not in this file. Run --print-sql, run that SELECT\n"
            "through the board connector, save the rows, and pass them with --frame.\n"
            "There is deliberately no fallback: read the refusal block at the top of\n"
            "this file before you add one.")
    p = pathlib.Path(path)
    if not p.exists():
        raise SystemExit("build.py: REFUSED — --frame %s does not exist. No sheet written."
                         % path)
    blob = json.loads(p.read_text(encoding="utf-8"))
    rows = blob.get("rows", blob) if isinstance(blob, dict) else blob
    F = {}
    if isinstance(rows, dict):
        F = {str(k): str(v) for k, v in rows.items() if v is not None}
    else:
        for r in rows:
            if isinstance(r, dict) and r.get("anchor") and r.get("body") is not None:
                F[str(r["anchor"])] = str(r["body"])
    missing = [a for a in FRAME_REQUIRED_ANCHORS if not F.get(a, "").strip()]
    if missing:
        raise SystemExit(
            "build.py: REFUSED — --frame %s resolved %d of %d anchors. NO SHEET WRITTEN.\n"
            "  MISSING: %s\n"
            "A partial frame ships a sheet with somebody else's footer or none at all,\n"
            "and both look fine on the way out. Re-run the SELECT from --print-sql."
            % (path, len(FRAME_REQUIRED_ANCHORS) - len(missing),
               len(FRAME_REQUIRED_ANCHORS), ", ".join(missing)))
    steps = []
    for line in F["frame-steps"].splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) != 3:
            raise SystemExit(
                "build.py: REFUSED — frame-steps line %r is not key|name|description. "
                "No sheet written." % line)
        steps.append((parts[0].strip(), parts[1].strip(), parts[2].strip()))
    if not steps:
        raise SystemExit("build.py: REFUSED — frame-steps parsed to zero steps. "
                         "No sheet written.")
    F["_steps"] = steps
    return F


def esc(s):
    return s


def front(s, F):
    def _leak(row):
        # 4-tuple = legacy (Waldon sheets, unchanged default label).
        # 5-tuple = per-item label for the last 10%, so the sheet can say WHO decides.
        if len(row) == 5:
            t, w, ninety, ten, ten_label = row
        else:
            t, w, ninety, ten = row
            ten_label = "The last 10% — you"
        return t, w, ninety, ten, ten_label

    leaks = "".join(
        f"""<div class="leak"><div class="n">{i+1:02d}</div><div>
              <h3>{t}</h3>
              <div class="what">{w}</div>
              <div class="orch">
                <div><div class="k">The first 90% — the system</div><p>{ninety}</p></div>
                <div><div class="k">{ten_label}</div><p>{ten}</p></div>
              </div>
            </div></div>"""
        for i, (t, w, ninety, ten, ten_label) in enumerate(_leak(r) for r in s["leaks"]))
    steps = "".join(
        f"""<div class="s"><div class="k mono">{k}</div><h5>{n}</h5><p>{d}</p></div>"""
        for k, n, d in F["_steps"])
    return f"""
<div class="page">
  <div class="bar">
    <img src="data:image/png;base64,{LOGO_DARK}" alt="{F['frame-signature'].split('<br>')[0]}">
    <div class="mono">{s['meta']}<br>Side 1 of 2</div>
  </div>
  <div class="hero">
    <div class="eyebrow mono">{s['eyebrow']}</div>
    <h1>{s['h1']}</h1>
    <p>{s['sub']}</p>
  </div>
  <div class="body">
    <h2>{s['leaks_title']}</h2>
    <div class="note">{s['leaks_note']}</div>
    {leaks}
  </div>
  <div class="foot">
    <div class="line">{F['frame-ninety-ten']} <span>{F['frame-throughline']}</span></div>
    <div class="steps">{steps}</div>
    <div class="cta">
      <div class="big">{F['frame-cta-front']}</div>
      <div class="sm mono">{F['frame-signature']}</div>
    </div>
  </div>
</div>"""


def back(s, F):
    qs = "".join(
        f"""<div class="q"><div class="n">{i+1:02d}</div><div>
              <h3>{q}</h3>
              <p><b>What you are listening for.</b> {l}</p>
            </div></div>"""
        for i, (q, l) in enumerate(s["questions"]))
    handle = "".join(f"<li>{x}</li>" for x in s["handle"])
    bring = "".join(f"<li>{x}</li>" for x in s["bring"])
    return f"""
<div class="page">
  <div class="bar">
    <img src="data:image/png;base64,{LOGO_DARK}" alt="{F['frame-signature'].split('<br>')[0]}">
    <div class="mono">{s['meta']}<br>Side 2 of 2</div>
  </div>
  <div class="body" style="padding-top:.44in">
    <h2>{s['q_title']}</h2>
    <div class="note">{s['q_sub']}</div>
    {qs}
    <div class="split">
      <div><h4>{F['frame-handle-label']}</h4><ul>{handle}</ul></div>
      <div><h4>{F['frame-bring-label']}</h4><ul>{bring}</ul></div>
    </div>
    <div class="closer">
      {F['frame-closer']}
    </div>
  </div>
  <div class="foot">
    <div class="cta" style="border-top:none; padding-top:0">
      <div class="big">{F['frame-cta-back']}</div>
      <div class="sm mono">{F['frame-signature']}</div>
    </div>
  </div>
</div>"""


def html_for(s, F):
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head>" \
           f"<body>{front(s, F)}{back(s, F)}</body></html>"


# ---------------------------------------------------------------------------
# RESTORED 2026-08-20. Lines 220-266 of the Waldon original (render + main +
# both asserts) were dropped when the 5-tuple last-10% patch was applied, so
# this file defined a builder that could not build and could not prove.
# Restored verbatim, with ONE change: the output filename is now assembled
# from the four slots ruled in Content-Library-Asset-Schema §2 instead of one
# free-text label. Empty slots collapse, so a sheet that declares only
# file_label produces the identical string it produced before.
# ---------------------------------------------------------------------------


def file_name(s):
    """Content-Library-Asset-Schema §2 v1.6 (Bryce, 2026-08-20 — the SECOND
    ruling that day, superseding the four-slot form quoted below):
        <Company>[ + <Partner>][ & <Vertical>][ <Family>]   slots collapse.

    QUOTED, NOT DELETED — the v1.5 form this replaced was:
        <Company> - <Family> - <Vertical> - <Audience>
    Nine files were delivered under v1.5 on 2026-08-20 and are correctly named
    for the rule that was live when they shipped. The four-slot string is not
    lost: canonical_name() computes it and assets.canonical_name stores it.
    Moved 2026-08-20 by slog_jason_weamer_followup_sheets_20260820 — the spec
    was amended the same day it landed and this builder never moved with it."""
    out = s.get("company", "AI Integrator")
    if s.get("partner"):
        out += " + %s" % s["partner"]
    vertical = s.get("vertical", s.get("file_label", ""))
    if vertical:
        out += " & %s" % vertical
    if s.get("family_in_filename"):
        out += " %s" % s["family_in_filename"]
    return out


def canonical_name(s):
    """The v1.5 four-slot string. NOT the filename any more — this is what the
    asset row stores in assets.canonical_name, because faceting is a registry
    job and addressing an inbox is a filename job (§2 v1.6)."""
    slots = [s.get("company", "AI Integrator"),
             s.get("family", "Where AI Fits"),
             s.get("vertical", s.get("file_label", "")),
             s.get("audience", "")]
    return " - ".join(x.strip() for x in slots if x and x.strip())


PROBE_JS = """() => [...document.querySelectorAll('.page')].map(p => {
                const foot = p.querySelector('.foot');
                const body = p.querySelector('.body');
                const last = body.lastElementChild;
                const ov = Math.max(0, p.scrollHeight - p.clientHeight);
                const slack = Math.round(foot.getBoundingClientRect().top
                                         - last.getBoundingClientRect().bottom);
                return {ov, slack};
            })"""


def render_via_chrome(items):
    """FALLBACK, ADDED 2026-09-10 (session slog_solo_20260910_113552_b3e91c) because
    Playwright is NOT on this operator's Mac and the plugin install shipped no build.py
    either, so the contracted path could not run at all.

    ⛔ THIS PATH PRODUCES THE PDF AND DOES NOT RUN THE ASSERTION. Chrome's --print-to-pdf
    gives no page handle, so the ov/slack probe cannot run here. It therefore REFUSES to
    report a pass. PROBE_JS above is the probe, lifted verbatim out of render() so there is
    exactly one copy of it: run it against the emitted HTML in a real browser and read the
    numbers yourself. A build that silently skipped a layout assertion and printed nothing
    about it is the failure this whole family exists to prevent."""
    import shutil, subprocess
    chrome = next((c for c in [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        shutil.which("google-chrome"), shutil.which("chromium")] if c and pathlib.Path(c).exists()), None)
    if not chrome:
        raise SystemExit(
            "build.py: REFUSED - playwright is not installed and no Chrome/Chromium was found.\n"
            "Install one, or run: python3 -m pip install playwright && python3 -m playwright install chromium")
    for name, path in items:
        pdf = OUT / f"{name}.pdf"
        subprocess.run([chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf}", f"file://{path}"],
                       check=True, capture_output=True)
        print(f"  {name:>52}  PDF via Chrome", file=sys.stderr)
    print("\n⚠ LAYOUT ASSERTION NOT RUN ON THIS PATH - Chrome --print-to-pdf exposes no page\n"
          "  handle. The PDFs above are built and UNVERIFIED for overflow/collision. Run\n"
          "  build.PROBE_JS against each emitted .html in a browser and read ov/slack.\n"
          "  ov must be 0 and slack must be >= 0 on every page.", file=sys.stderr)
    return None   # NOT 0. 0 would read as "zero bad pages" and this path cannot know that.


async def render(items):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        for name, path in items:
            await pg.goto(f"file://{path}")
            await pg.wait_for_timeout(350)
            over = await pg.evaluate(PROBE_JS)
            print(f"  {name[-28:]:>28}  {over}", file=sys.stderr)
            pdf = OUT / f"{name}.pdf"
            await pg.pdf(path=str(pdf), format="Letter", print_background=True,
                         margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await b.close()


def selftest_frame_refusal():
    """THE INVERSE CONTROL, BOTH DIRECTIONS IN ONE RUN. A guard nobody has watched
    refuse is decoration. Proves: (a) no frame -> refuse, (b) a frame short one
    anchor -> refuse and NAME it, (c) the complete frame -> loads and parses.
    It writes nothing to OUT and touches no sheet."""
    import json, tempfile, os
    ok = True
    try:
        load_frame(None); ok = False; print("  FAIL  no-frame did not refuse")
    except SystemExit as e:
        print("  pass  no --frame REFUSED: %s" % str(e).splitlines()[0])
    full = {a: ("x" if a != "frame-steps" else "STEP 1|Audit|d") for a in FRAME_REQUIRED_ANCHORS}
    d = tempfile.mkdtemp()
    partial = dict(full); partial.pop("frame-throughline")
    pp = os.path.join(d, "partial.json"); open(pp, "w").write(json.dumps(partial))
    try:
        load_frame(pp); ok = False; print("  FAIL  partial frame did not refuse")
    except SystemExit as e:
        msg = str(e)
        if "frame-throughline" not in msg:
            ok = False; print("  FAIL  refusal did not NAME the missing anchor")
        else:
            print("  pass  partial frame REFUSED and named frame-throughline")
    fp = os.path.join(d, "full.json"); open(fp, "w").write(json.dumps(full))
    try:
        F = load_frame(fp)
        if F["_steps"] == [("STEP 1", "Audit", "d")]:
            print("  pass  complete frame LOADED and parsed 1 step "
                  "(the other direction — this guard is not a wall that refuses everything)")
        else:
            ok = False; print("  FAIL  complete frame parsed wrong: %r" % (F["_steps"],))
    except SystemExit as e:
        ok = False; print("  FAIL  complete frame was refused: %s" % e)
    print("SELF-TEST %s" % ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


def _flag(name):
    """Value of --name, or None. No defaults live here on purpose."""
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith("--"):
            return sys.argv[i + 1]
    return None


def main():
    if "--print-sql" in sys.argv:
        # BOTH statements, always, in the order they must be run. Printing only the
        # frame is how the gate went uncalled for the whole of its existence.
        print("-- 1 of 2 - THE GATE. Run this FIRST and save the row for --gate.")
        print("--   If ok is false, STOP: nothing below matters and no sheet may be built.")
        print(gate_sql(_flag("--tenant"), _flag("--template"), _flag("--review-due")))
        print()
        print("-- 2 of 2 - THE FRAME. Save these rows for --frame.")
        print(frame_sql(_flag("--tenant"), _flag("--template")))
        return
    if "--selftest-frame" in sys.argv:
        raise SystemExit(selftest_frame_refusal())

    # ⚠ THE REFUSAL RUNS BEFORE A BYTE IS ASSEMBLED, let alone written. Ordering is
    #   the guard: load_frame() above any write_text() is what makes "REFUSES and
    #   writes no file" true rather than aspirational.
    require_work()
    # THE GATE RUNS BEFORE THE FRAME, AND BOTH RUN BEFORE ANY WRITE. Ordering is the
    # guard. The gate is first because it answers the bigger question - may this be
    # built at all - and a complete frame on a template nobody may build from is the
    # case that would otherwise sail straight through.
    G = load_gate(_flag("--gate"))
    F = load_frame(_flag("--frame"))
    load_palette()
    load_brand()
    OUT.mkdir(exist_ok=True)

    items = []
    for s in load_sheets():
        h = html_for(s, F)
        # ---- teal-once-per-view check, countable in the source
        for i, page in enumerate(h.split('<div class="page">')[1:]):
            n = len(re.findall(re.escape(ACCENT), page))
            assert n == 0, f"{s['slug']} page {i+1}: literal accent {ACCENT} in markup"
        assert CSS.count(ACCENT) == 1, \
            "accent %s declared more than once in the stylesheet" % ACCENT
        name = file_name(s)
        p = WORK / f"{s['slug']}.html"
        p.write_text(h, encoding="utf-8")
        items.append((name, p))
    try:
        import playwright  # noqa: F401
        bad = asyncio.run(render(items))
    except ModuleNotFoundError:
        bad = render_via_chrome(items)
    print("built:")
    for n, _ in items:
        print("  ", (OUT / f"{n}.pdf").name)

    # ══════════════════════════════════════════════════════════════════════════════
    # ⛔ A BUILD IS NOT A DELIVERY. THIS PROGRAM NO LONGER EXITS 0 HERE.
    # ══════════════════════════════════════════════════════════════════════════════
    # Added 2026-09-10 (session:slog_solo_20260910_183000_a55et2) on Bryce's instruction
    # to "build the registration into the delivery step".
    #
    # WHY IT IS A REFUSAL AND NOT A REMINDER. Delivery and registration have always been
    # TWO ACTS, and the second one runs without the first, forever — measured that day at
    # 112 finished documents in the client folders against 34 the library could name. A
    # printed suggestion to go register the file is act two wearing act one's clothes.
    # The only thing this program can do that a reminder cannot is REFUSE TO SUCCEED.
    #
    # ⚠ THE PDFs ARE WRITTEN AND THEY ARE FINE. This is not a rollback and nothing is
    #   deleted — the exit code is the whole mechanism. A caller that reads exit 0 as
    #   "done" now gets 9 instead, and 9 has exactly one meaning: the file exists and
    #   the library cannot see it yet.
    #
    # THE REGISTRAR IS A SEPARATE FILE ON PURPOSE, and that is a port, not a preference:
    # register-call-doc.js is the same fix one family over for call_doc, and it is its own
    # module rather than a block inside build-call-guide.js. Same reason here — on
    # 2026-09-10 there were TWO live copies of this builder (this one and a parked patch
    # under 02 — Clients/AI Integrator/sales/templates), so registration living INSIDE a
    # builder is registration half the estate does not have.
    print()
    print("⛔ BUILT, NOT DELIVERED — exit 9. The library cannot see these files yet.")
    print("   Register them, then this build counts as done:")
    print()
    # ⛔ THE PATH IS DERIVED FROM THIS FILE, NEVER TYPED. The registrar ships BESIDE this
    #    program in the plugin (skills/aii-collateral-sheet/) and sits in 04/scripts in the
    #    workspace. A hardcoded workspace path is a path NO SEAT HAS — which is the very
    #    defect this skill was fixed for on 2026-09-09, when its body told a reader to run a
    #    builder that was not on the machine. Caught 2026-09-10 by unzipping the built
    #    plugin and reading it, not by any gate.
    _reg = pathlib.Path(__file__).resolve().parent / "register-delivered-asset.py"
    if not _reg.exists():
        _reg = pathlib.Path("04 — Daily Operating System/scripts/register-delivered-asset.py")
    print('     python3 "%s" \\' % _reg)
    print('       --scan "%s" \\' % OUT)
    print('       --deliver-to "02 — Clients/<where these will actually live>" \\')
    print("       --tenant <t> --company <c> --department sales --asset-type concept_sheet \\")
    print("       --program <program_id> --by session:<your session id>")
    print()
    print("   then --sql, run it through the board, and hand the rows back with --settle.")
    print("   ⚠ A rebuild that produces the SAME BYTES comes back `unchanged` and writes")
    print("     nothing. That is a pass, not a miss: the file name was never the question.")
    raise SystemExit(9)
    if bad is None:
        print("layout overflow/collision pages: UNVERIFIED (see the warning above)")
    else:
        print("layout overflow/collision pages:", bad)


if __name__ == "__main__":
    main()
