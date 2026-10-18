#!/usr/bin/env python3
"""Build the four AI Integrator vertical sheets as two-sided PDFs.

Brand source of truth (SPEC GATE, domain='brand-visual'):
  - AI-Integrator-Brand-Guide  -> palette + one-pager zone structure
  - Type: the SENDING company's own, read from its brand rows (company_asset kind 'type') -
    see load_type(). Since 2026-10-18; it was Archivo + IBM Plex Mono for every company before.
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
   headings, the closer, and the STEPS strip (Audit -> Deploy -> Maintain). The
   operator ruled 2026-09-09: "a sheet is a RECIPIENT DOCUMENT, not an AI Integrator
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
import base64, hashlib, json, os, pathlib, re, sys

# ⛔ content.py IS NOT IMPORTED AT MODULE LEVEL — GENERICIZED 2026-09-09, same reason
#    as the frame below. content.py holds the SHEETS for ONE prospect and is written
#    by the caller, per sheet, beside this file. As a top-level `from content import
#    SHEETS` it made the seat's FIRST instruction (--print-sql) die on a Python
#    traceback before this file could say anything, and a ModuleNotFoundError is not
#    a refusal: it names Python's problem, not the reader's. See load_sheets().

# ⛔ THERE IS NO `HERE`. GENERICIZED 2026-09-09, ruled by the operator the same day.
#    This program used to read content.py, assets/ and write out/ RELATIVE TO ITSELF, which is
#    correct for a copy sitting in one delivery's _source/ and impossible for the ONE copy that
#    ships in the plugin at skills/aii-collateral-sheet/build.py. Shipped that way it died on a
#    missing font before it could say a word, and AI Integrator's own logo-dark.png would have had
#    to ride along into every client seat — which the port note above calls the instance layer and
#    forbids. Every per-delivery path now hangs off --work, exactly as build-call-guide.js takes
#    guide.json, config.json and output.html as arguments and reads nothing beside itself.
WORK = None   # set by require_work(); a default here is what would hide the failure
OUT  = None

# ⛔ BRAND IS A PARAMETER. RESTORED 2026-09-10 by a session that day.
#    THIS IS A RESTORATION, NOT A NEW DESIGN. The 2026-08-20 copy of this family
#    (two-sided-sheet-source-20260820.zip) already had BRANDS{} + css_for(brand); its own
#    README says "BRAND IS A PARAMETER ... so one family serves two registered brands.
#    Layout, zones and type scale untouched. The accent-once-per-view assert is per brand."
#    The 2026-09-09 port moved the sending company's WORDS out to asset_template_body and
#    correctly refused a default for them -- and in the same move put the sending company's
#    COLOUR back in as a literal (PRIMARY/ACCENT/BLACK/OFFWHITE/MUTED plus three inline
#    hexes in the stylesheet). So another product's sheet built here came out with
#    that product's logo and AI Integrator's accent.
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
# ⛔ BRANDS{} DELETED 2026-09-10. Two keys, aii and vr, compiled into a builder every client
#    is meant to run. It was a second home for a fact the `brand` + `company_asset` stores
#    already own, and it was the mechanical reason a partner sheet could not be branded as the
#    partner. The colours are READ now — see load_palette() and --palette.

PRIMARY = ACCENT = BLACK = OFFWHITE = MUTED = RULE = RULE2 = FOOTRULE = None
# Set by load_palette() from the STORE, never by a flag: true when the sending company's
# brand is a `candidate` — derived from their own website rather than given to us.
BRAND_IS_REPRESENTATIVE = False
REPRESENTATIVE_NOTE = "Branding shown is representative, based on publicly available materials."


def palette_sql(tenant, brand_key):
    """The SELECT that produces --palette. Printed by --print-sql, run by the caller through
    the board, handed back as rows. Same two-step door as --frame and --gate, and for the same
    reason: this program holds no credential and never will."""
    # ⭐ 2026-10-18 (dr_the_sheet_builder_uses_each_companys_own_fonts_greycliff_not_bought_yet_20261018):
    #    the same read now carries the company's TYPE rows and its PALETTE RULES, and says which kind each
    #    row is. Type, because the fonts are the sending company's exactly as the colours are; rules,
    #    because the accent is found by its ROLE (the company's "<colour>-once" / highlight rule), not by
    #    what the colour happens to be called. One read, so the type can never be skipped while the
    #    colours are fetched. A --palette saved from the older SELECT (no asset_kind) is refused.
    return (
        "-- 3 of 3 - THE BRAND ROWS. The SENDING company's colours, colour roles and type, out of the store.\n"
        "--   `candidate` rows are DERIVED (sampled off that company's own website) and are a\n"
        "--   PASS: representative, not canonical, is the standard. `retired` is refused below.\n"
        "SELECT ca.asset_kind, ca.asset_key, ca.value, ca.file_path, ca.notes,\n"
        "       b.status AS brand_status, ca.status AS element_status\n"
        "  FROM company_asset ca\n"
        "  JOIN brand b ON b.tenant_id = ca.tenant_id AND b.brand_key = ca.company\n"
        " WHERE ca.tenant_id = %s AND ca.company = %s\n"
        "   AND ca.asset_kind IN ('palette', 'palette-rule', 'type') AND ca.status <> 'retired' AND b.active\n"
        " ORDER BY ca.asset_kind, ca.asset_key;\n"
        "-- params: tenant=%s brand=%s"
        % (_q(tenant), _q(brand_key), tenant, brand_key))


def _q(v):
    return "'" + str(v).replace("'", "''") + "'"


# ⛔ THE EIGHT SLOTS THIS PROGRAM PAINTS WITH. Not a brand — a CONTRACT. The store may hold
#    sixty palette rows (AI Integrator holds 61) or two (a freshly derived partner holds two);
#    either way a sheet needs exactly these eight, and the mapping below is how a store of any
#    size becomes a sheet. Missing slots FALL BACK ALONG A STATED CHAIN rather than refusing,
#    because "representative, not canonical" is the ruling and a two-colour partner brand must
#    still produce a sheet.
SLOTS = ["PRIMARY", "ACCENT", "BLACK", "OFFWHITE", "MUTED", "RULE", "RULE2", "FOOTRULE"]
SLOT_KEYS = {
    "PRIMARY":  ["primary", "indigo", "blue", "navy"],
    "ACCENT":   ["accent", "teal", "lime"],
    "BLACK":    ["black", "near-black", "ink-reading", "navy", "ink"],
    "OFFWHITE": ["offwhite", "off-white", "surface", "surface-page"],
    "MUTED":    ["muted", "slate", "taupe", "ink-quiet"],
    "RULE":     ["rule", "hairline"],
    "RULE2":    ["rule2", "hairline-soft"],
    "FOOTRULE": ["footrule", "brand-bar-control", "near-black"],
}
# ⛔ WHERE THE LINE SITS, AND IT IS THE WHOLE ARGUMENT. Only TWO of the eight slots are
#    IDENTITY: PRIMARY and ACCENT. Those must come out of the store or the sheet is not that
#    company's. The other six are PAPER AND INK — a page background, a text colour, three
#    hairlines and a footer bar — and neutral paper is not a brand claim about anybody.
#
#    THE FIRST VERSION FELL EVERYTHING BACK TO PRIMARY and it was caught by running it: a
#    two-colour partner brand produced navy text on a navy page. Unreadable is worse than
#    wrong-coloured, and "representative" was never a licence to ship something nobody can
#    read. So the neutrals fall back to neutrals, and the identity slots fall back to nothing —
#    ACCENT to PRIMARY (one identity colour is still theirs) and PRIMARY to a REFUSAL.
NEUTRAL = {"BLACK": "#111111", "OFFWHITE": "#FFFFFF", "MUTED": "#6B6B6B",
           "RULE": "#E3E3E3", "RULE2": "#EDEDED", "FOOTRULE": "#111111"}
FALLBACK_OF = {"ACCENT": "PRIMARY"}

# ⭐ THE ACCENT IS FOUND BY ITS ROLE — 2026-10-18, recorded as a session reading under
#    dr_the_sheet_builder_uses_each_companys_own_fonts_greycliff_not_bought_yet_20261018.
#    SLOT_KEYS finds ACCENT by what the colour is CALLED (accent, teal, lime). A company whose brand
#    guide calls its accent "orange" got PRIMARY instead, and the accent-once assertion then fired on
#    a sheet that was never wrong. Every brand guide in the store already states the accent's ROLE as a
#    palette-rule: a highlight rule (`highlight` = lime) or a once-per-view rule named for the colour
#    (`teal-once-per-view`, `lime-once`, `orange-once`). That rule is read first. The name chain stays
#    as the FALLBACK, in the same order, so a company with no such rule paints exactly as before.
ACCENT_ROLE_KEYS = ("accent", "highlight")
ACCENT_ONCE = re.compile(r"\A(.+?)-once(?:-per-view)?\Z")
HEX = re.compile(r"\A#[0-9A-Fa-f]{6}\Z")


def accent_by_role(rules, have):
    """(hex, how) for the colour the company's own palette rules name as its accent, or None."""
    for k in ACCENT_ROLE_KEYS:
        v = (rules.get(k) or "").strip()
        if HEX.match(v):
            return v, "palette-rule %r (role)" % k
        if v.lower() in have:
            return have[v.lower()], "palette-rule %r -> %s (role)" % (k, v.lower())
    found = []
    for k in sorted(rules):
        m = ACCENT_ONCE.match(k)
        if m and m.group(1) in have:
            found.append((have[m.group(1)], "palette-rule %r -> %s (role)" % (k, m.group(1))))
    if len({f[0].upper() for f in found}) == 1:
        return found[0]
    if found:
        print("   ⚠ %d once-per-view rules name DIFFERENT colours (%s) - not a role; the name chain decides"
              % (len(found), ", ".join(f[1] for f in found)), file=sys.stderr)
    return None


def load_palette():
    """The sending company's COLOURS, READ OUT OF THE STORE. REQUIRED, no default.

    ⛔ THE HARDCODED BRANDS{} MAP IS GONE, 2026-09-10. It held two keys, `aii` and `vr`, and
       that was the whole reason a partner's sheet came out in the plugin maker's colours: a required
       parameter whose value set is two rows deep is a WALL for every partner, and a wall
       invites shipping without their identity. It was also a SECOND HOME for a fact the
       database already owned — this file's own docstring forbids exactly that for WORDS, and
       colour is no different. The operator, naming the root: "I am a tenant of the platform ... we
       need to make sure this works for any client." A map compiled into a builder cannot serve
       a client whose partners nobody typed in.

    ⭐ A `candidate` BRAND IS A PASS. That is the ruling, in his words: "perfection without us
       having their canonical is not the goal. It's to be representative." A palette sampled
       off a partner's own website paints a sheet. What is refused is `retired`, and nothing.
    """
    global PRIMARY, ACCENT, BLACK, OFFWHITE, MUTED, RULE, RULE2, FOOTRULE, BRAND_IS_REPRESENTATIVE
    b = _flag("--brand")
    p = _flag("--palette")
    if not b:
        raise SystemExit(
            "build.py: REFUSED - no --brand given, and no sheet was written.\n"
            "--brand names the SENDING company's brand_key in the store. There is no default:\n"
            "the accent colour is an identity, not a style.\n"
            "Run --print-sql to get the SELECT that lists what this tenant actually has.")
    if not p:
        raise SystemExit(
            "build.py: REFUSED - no --palette given, and no sheet was written.\n"
            "The colours live in the STORE, not in this file. Run --print-sql --brand %s,\n"
            "put statement 3 through the board, save the rows, and pass them as --palette.\n"
            "⚠ IF THAT SELECT COMES BACK EMPTY, that company has no brand yet - and the fix is\n"
            "  NOT to paint the sheet in ours. Derive one from their own website:\n"
            "    derive-brand-from-site.py --url <their site> --company %s --name <Name> \\\n"
            "        --tenant <tenant> --by session:<id>\n"
            "  Representative, not canonical, is the standard." % (b, b))
    try:
        with open(p, encoding="utf-8") as fh:
            blob = json.load(fh)
    except Exception as e:
        raise SystemExit("build.py: REFUSED - could not read --palette %s: %s" % (p, e))
    rows = blob.get("rows", blob) if isinstance(blob, dict) else blob
    if not isinstance(rows, list) or not rows:
        raise SystemExit(
            "build.py: REFUSED - --palette carried NO ROWS, and no sheet was written.\n"
            "An empty palette and a palette nobody looked up are the same file, so this cannot\n"
            "be read as 'they have no colours'. Either that brand is unregistered - derive it -\n"
            "or the SELECT was never run.")
    global TYPE_ROWS
    if any(isinstance(r, dict) and "asset_kind" not in r for r in rows):
        raise SystemExit(
            "build.py: REFUSED - --palette %s was saved from the OLDER statement 3, which read colours only\n"
            "and never asked for the company's TYPE rows. No sheet was written. A read that did not ask for\n"
            "the fonts and a company with no fonts are the same file, so this cannot be built as either.\n"
            "Re-run --print-sql --brand %s, put statement 3 through the board, and pass the new rows."
            % (p, b))
    have, rules, TYPE_ROWS = {}, {}, {}
    for r in rows:
        if not (isinstance(r, dict) and r.get("asset_key")):
            continue
        kind, key = str(r.get("asset_kind")), str(r["asset_key"]).lower()
        if kind == "palette" and r.get("value"):
            have[key] = r["value"]
        elif kind == "palette-rule" and r.get("value"):
            rules[key] = str(r["value"])
        elif kind == "type":
            TYPE_ROWS[key] = r
    picked, how = {}, {}
    role = accent_by_role(rules, have)
    if role:
        picked["ACCENT"], how["ACCENT"] = role
    for slot in SLOTS:
        if slot in picked:
            continue
        for k in SLOT_KEYS[slot]:
            if k in have:
                picked[slot], how[slot] = have[k], k
                break
    for slot, src in FALLBACK_OF.items():   # identity may borrow ONLY from identity
        if slot not in picked and src in picked:
            picked[slot], how[slot] = picked[src], "fell back to " + src + " (identity)"
    for slot, hexv in NEUTRAL.items():      # paper and ink, stated, never a brand claim
        if slot not in picked:
            picked[slot], how[slot] = hexv, "NEUTRAL default - paper/ink, not their brand"
    if "PRIMARY" not in picked:
        raise SystemExit(
            "build.py: REFUSED - this brand has no PRIMARY colour and no sheet was written.\n"
            "The store returned: %s\n"
            "PRIMARY is IDENTITY: there is no neutral that can stand in for it, because a sheet\n"
            "with no identity colour is not that company's sheet. Everything else on this page\n"
            "has an honest default; this one cannot. Add it:\n"
            "  brand_element_put(<tenant>,'%s','palette','primary',session:<id>,'#RRGGBB')\n"
            "or derive the whole brand from their own website with derive-brand-from-site.py."
            % (", ".join(sorted(have)) or "nothing", b))
    PRIMARY, ACCENT, BLACK = picked["PRIMARY"], picked["ACCENT"], picked["BLACK"]
    OFFWHITE, MUTED = picked["OFFWHITE"], picked["MUTED"]
    RULE, RULE2, FOOTRULE = picked["RULE"], picked["RULE2"], picked["FOOTRULE"]
    st = {str(r.get("brand_status")) for r in rows if isinstance(r, dict) and r.get("brand_status")}
    print("palette for %r, read from the store (%d row(s), brand status: %s)"
          % (b, len(rows), ", ".join(sorted(st)) or "unstated"), file=sys.stderr)
    for slot in SLOTS:
        print("   %-9s %s   <- %s" % (slot, picked[slot], how[slot]), file=sys.stderr)
    BRAND_IS_REPRESENTATIVE = ("candidate" in st)
    if "candidate" in st:
        print("   ⚠ CANDIDATE BRAND - these colours were DERIVED from that company's own site,\n"
              "     not given to us. Representative, not canonical. That is a pass.", file=sys.stderr)
    return picked


# ⛔ ONLY THE LOGO IS A REQUIRED FILE NOW — 2026-10-18. Until then this list also named four font files,
#    Archivo-400/600/700.ttf and PlexMono.ttf: AI Integrator's type, compiled into a builder every client
#    runs, so every company's sheet came out in AI Integrator's fonts (a partner company's draft of
#    2026-10-17 did, and said so in its notes). The fonts are the SENDING company's and come off its
#    brand rows now — see load_type().
BRAND_FILES = ["assets/logo-dark.png"]

LOGO_DARK = None
CSS = None

# ══════════════════════════════════════════════════════════════════════════════════════════════
# ⭐ THE TYPE IS THE SENDING COMPANY'S, READ FROM ITS BRAND ROWS — 2026-10-18.
#    Ruling dr_the_sheet_builder_uses_each_companys_own_fonts_greycliff_not_bought_yet_20261018 (the
#    operator, by pop-up): "Yes" - the builder takes its fonts from each company's brand rows, the way it
#    already takes its colours; and for a font the company has not bought, "use backup".
#
#    TWO FACES, because the layout has two: BODY (every headline and every line of text) and LABEL
#    (eyebrows, row numbers, step keys, meta - the .mono class). Each is read from the company's `type`
#    rows by ROLE KEY (TYPE_ROLE_KEYS). A row's value names the family first; the rest of the row names
#    the BACKUP, either as the rest of a CSS stack ("Archivo, system-ui, ...") or in words ("fallback ...:
#    system sans (...)").
#
#    THE FILE. A face is EMBEDDED only when its font file is ON HAND: the row's own file_path (resolved
#    against --workspace-root, then --work, then --work/assets), else a file in --work/assets named for the
#    family (foundry word optional: "IBM Plex Mono" finds PlexMono.ttf). When the file is NOT on hand the
#    sheet uses the BACKUP THE COMPANY'S OWN ROW NAMES and the build log says so, line by line. There is no
#    builder-wide default face: a company with no type rows gets the neutral system sans, said in the log,
#    which is paper and ink, not somebody else's brand.
#
#    ⚠ NOT LOOKED UP ON THE MACHINE. A font installed on this Mac is never used by name: the sheet would
#    then change with the machine it was built on. Embedded, or the named backup. Nothing in between.
# ══════════════════════════════════════════════════════════════════════════════════════════════
TYPE_ROWS = {}
TYPE_ROLE_KEYS = {"BODY": ("display-and-body", "body", "display", "text"),
                  "LABEL": ("label", "labels", "eyebrow", "mono")}
TYPE_DEFAULT_WEIGHT = {"BODY": 400, "LABEL": 500}
# The builder's own last-resort tail BEHIND AN EMBEDDED FACE. It never draws (the face is in the file);
# it is what a viewer would fall to for a missing glyph. Unchanged from the stylesheet before 2026-10-18.
TAIL_SANS = "Helvetica, Arial, sans-serif"
TAIL_MONO = "'Courier New', monospace"
SYSTEM_SANS = ["system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Helvetica", "Arial", "sans-serif"]
GENERIC_FAMILIES = {"sans-serif", "serif", "monospace", "ui-monospace", "system-ui", "-apple-system",
                    "blinkmacsystemfont", "ui-sans-serif", "ui-serif", "cursive", "fantasy"}
WEIGHT_WORDS = {"thin": 100, "hairline": 100, "extralight": 200, "ultralight": 200, "light": 300,
                "regular": 400, "normal": 400, "book": 400, "medium": 500, "semibold": 600, "demibold": 600,
                "bold": 700, "extrabold": 800, "ultrabold": 800, "black": 900, "heavy": 900}
FONT_TYPES = {".ttf": ("font/ttf", "truetype"), ".otf": ("font/otf", "opentype"),
              ".woff2": ("font/woff2", "woff2"), ".woff": ("font/woff", "woff")}
FONT_FACES = ""                                  # the @font-face block, built by load_type()
BODY_FAMILY = LABEL_FAMILY = LABEL_FAMILY_TIGHT = None
LABEL_WEIGHT = None


def _norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def parse_type_value(value, notes=None):
    """(family, weight or None, backup as a list of CSS families or None, how the backup was found).
    The family is the row's first name, with a trailing weight word taken off it ("Encode Sans Condensed
    SemiBold" -> "Encode Sans Condensed", 600)."""
    v = (value or "").strip()
    head = re.split(r"\s+-\s+|,|\(|;|:|\.\s", v, maxsplit=1)[0].strip().strip('"\'')
    words, weight = head.split(), None
    while len(words) > 1 and _norm(words[-1]) in WEIGHT_WORDS:
        weight = weight or WEIGHT_WORDS[_norm(words[-1])]
        words = words[:-1]
    family = " ".join(words)
    said = _backup_in_words(v)                       # 1. the row's value says it in words
    if said:
        return family, weight, _stack_from_words(said), "named in the row: %r" % said
    rest = v[len(v.split(",", 1)[0]):].lstrip(",").strip() if "," in v else ""
    items = [x.strip() for x in rest.split(",") if x.strip()]
    if items and all(re.fullmatch(r"\"[^\"]+\"|'[^']+'|[A-Za-z0-9 -]+", x) and len(x) <= 40 for x in items) \
            and any(_norm(x) in {_norm(g) for g in GENERIC_FAMILIES} for x in items):
        return family, weight, items, "the rest of the row's own stack"   # 2. the value is a CSS stack
    said = _backup_in_words(notes or "")             # 3. the row's notes say it in words
    if said:
        return family, weight, _stack_from_words(said), "named in the row's notes: %r" % said
    return family, weight, None, None


def _backup_in_words(text):
    """The words after 'fallback'/'backup' up to the end of that sentence; after its colon when it has one."""
    m = re.search(r"fall\s*-?\s*back|backup", text or "", re.I)
    if not m:
        return None
    seg = re.split(r"\.(?:\s|\Z)", text[m.end():], maxsplit=1)[0]
    if ":" in seg:
        seg = seg.split(":", 1)[1]
    seg = seg.strip(" ,;-")
    return seg or None


def _stack_from_words(text):
    """'system sans (San Francisco, Segoe, Helvetica)' or 'Myriad Pro, then system sans' -> CSS families."""
    t = re.sub(r"\([^)]*\)", " ", text)
    out = []
    for tok in re.split(r",|\bthen\b|\bor\b|\band\b", t):
        tok = tok.strip().strip('"\'')
        if not tok:
            continue
        if _norm(tok) in ("systemsans", "systemsansserif", "system", "systemfont", "systemui"):
            out += SYSTEM_SANS
        elif _norm(tok) in {_norm(g) for g in GENERIC_FAMILIES}:
            out.append(tok)
        else:
            out.append('"%s"' % tok if " " in tok else tok)
    if not any(_norm(x) in {_norm(g) for g in GENERIC_FAMILIES} for x in out):
        out.append("sans-serif")
    seen, uniq = set(), []
    for x in out:
        if _norm(x) not in seen:
            seen.add(_norm(x))
            uniq.append(x)
    return uniq


def _file_weight(stem, family_part, default):
    rest = stem[len(family_part):].lstrip("-_ ")
    if re.fullmatch(r"\d{3}", rest):
        return int(rest)
    if _norm(rest) in WEIGHT_WORDS:
        return WEIGHT_WORDS[_norm(rest)]
    return default if not rest else None      # an unreadable suffix (Italic, a variable range) is not used


def font_files_for(family, row, default_weight):
    """[(weight, alias, path)] for the faces of `family` that are ON HAND, lightest first, one per weight."""
    found = []
    fp = (row or {}).get("file_path") or ""
    for raw in [x.strip() for x in re.split(r"[;|]", fp) if x.strip()]:
        cands = [pathlib.Path(raw)] if pathlib.PurePath(raw).is_absolute() else \
                [workspace_root() / raw, WORK / raw, WORK / "assets" / pathlib.PurePath(raw).name]
        hit = next((c for c in cands if c.is_file()), None)
        if hit and hit.suffix.lower() in FONT_TYPES:
            part = re.split(r"[-_]", hit.stem, maxsplit=1)[0]
            w = _file_weight(hit.stem, part, default_weight)
            if w:
                found.append((w, part, hit))
    if not found and (WORK / "assets").is_dir():
        words = family.split()
        names = {_norm(" ".join(words[i:])) for i in range(len(words)) if i == 0 or len(words) - i >= 2}
        for f in sorted((WORK / "assets").iterdir()):
            if f.suffix.lower() not in FONT_TYPES:
                continue
            part = re.split(r"[-_]", f.stem, maxsplit=1)[0]
            if _norm(part) in names and len(_norm(part)) >= 4:
                w = _file_weight(f.stem, part, default_weight)
                if w:
                    found.append((w, part, f))
    by_w = {}
    for w, part, f in found:
        by_w.setdefault(w, (w, part, f))
    alias = by_w[min(by_w)][1] if by_w else None
    return [(w, alias, f) for w, _p, f in sorted(by_w.values(), key=lambda x: x[0])]


def _face_css(alias, weight, path):
    mime, fmt = FONT_TYPES[path.suffix.lower()]
    data = base64.b64encode(path.read_bytes()).decode()
    return ("@font-face {{ font-family:'{a}'; src:url(data:{m};base64,{d}) format('{f}');\n"
            "             font-weight:{w}; font-style:normal; }}").format(a=alias, m=mime, d=data, f=fmt, w=weight)


def load_type():
    """Resolve the BODY and LABEL faces from TYPE_ROWS (set by load_palette from the same store read)."""
    global FONT_FACES, BODY_FAMILY, LABEL_FAMILY, LABEL_FAMILY_TIGHT, LABEL_WEIGHT
    b = _flag("--brand")
    print("type for %r, read from the store (%d type row(s): %s)"
          % (b, len(TYPE_ROWS), ", ".join(sorted(TYPE_ROWS)) or "none"), file=sys.stderr)
    faces, fam, wt = [], {}, {}
    body_backup = None
    for role in ("BODY", "LABEL"):
        key = next((k for k in TYPE_ROLE_KEYS[role] if k in TYPE_ROWS), None)
        row = TYPE_ROWS.get(key) if key else None
        if not row and role == "LABEL" and "BODY" in fam:
            fam["LABEL"], wt["LABEL"] = fam["BODY"], TYPE_DEFAULT_WEIGHT["LABEL"]
            print("   LABEL     no label row - labels use the body face (%s)" % fam["BODY"], file=sys.stderr)
            continue
        if not row:
            fam[role], wt[role] = ", ".join(SYSTEM_SANS), TYPE_DEFAULT_WEIGHT[role]
            print("   %-9s NO type row - the neutral system sans, not anybody's brand" % role, file=sys.stderr)
            continue
        family, weight, backup, backup_how = parse_type_value(row.get("value"), row.get("notes"))
        if role == "BODY":
            body_backup = (backup, backup_how)
        files = font_files_for(family, row, weight or TYPE_DEFAULT_WEIGHT[role])
        if files:
            for w, alias, f in files:
                faces.append(_face_css(alias, w, f))
            mono = bool(backup) and any("mono" in _norm(x) for x in backup)
            tail = TAIL_MONO if (role == "LABEL" and mono) else TAIL_SANS
            fam[role] = "'%s', %s" % (files[0][1], tail)
            wts = [w for w, _a, _f in files]
            want = weight or TYPE_DEFAULT_WEIGHT[role]
            wt[role] = min(wts, key=lambda x: (abs(x - want), x))
            print("   %-9s %s <- row %r, EMBEDDED from %s"
                  % (role, family, key, ", ".join("%s (%d)" % (f.name, w) for w, _a, f in files)), file=sys.stderr)
            continue
        if not backup and role == "LABEL" and body_backup and body_backup[0]:
            backup, backup_how = body_backup[0], "the company's body backup (%s)" % body_backup[1]
        if not backup:
            backup, backup_how = list(SYSTEM_SANS), "the row names no backup - the neutral system sans"
        fam[role], wt[role] = ", ".join(backup), weight or TYPE_DEFAULT_WEIGHT[role]
        print("   %-9s %s <- row %r: ITS FILE IS NOT ON HAND, so the sheet uses the BACKUP - %s, %s"
              % (role, family, key, ", ".join(backup), backup_how), file=sys.stderr)
    FONT_FACES = "\n".join(faces)
    BODY_FAMILY = fam["BODY"]
    LABEL_FAMILY = fam["LABEL"]
    LABEL_FAMILY_TIGHT = ",".join(x.strip() for x in fam["LABEL"].split(","))
    LABEL_WEIGHT = wt["LABEL"]
    return fam


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
            "  assets/      the SENDING company's logo (see BRAND_FILES) and any font files its\n"
            "               type rows name (a font not on hand falls to the backup its row names)\n"
            "and out/ is created inside it. There is no default: the one copy of this program\n"
            "ships in the plugin and does not know whose delivery it is being run for.")
    # ⛔ RESOLVED TO AN ABSOLUTE PATH — 2026-09-14, operator-approved safety fix. A relative --work reached Chrome as
    #    file://relative/path, Chrome printed its own "This site can't be reached" page, and that PDF looked built.
    WORK = pathlib.Path(w).expanduser().resolve()
    if not WORK.is_dir():
        raise SystemExit("build.py: REFUSED — --work %s is not a folder. No sheet written." % w)
    OUT = WORK / "out"
    return WORK


# ⛔ THE REGISTRATION INPUTS, REFUSED UP FRONT — added 2026-09-12.
#    Until today this program ended by PRINTING a register-delivered-asset.py command with
#    <angle-bracket> placeholders in it, and a person had to notice, fill them in and run it.
#    Two acts, and the second one ran without the first — the exact shape the registrar's own
#    header was written against, quoting the operator: "I should never have to say register this...
#    I should never have to ask. Ever. No user should."
#    (dr_registration_is_a_precondition_of_existing_not_a_step_20260824_064500, and
#     fw_registration_at_build_time_never_on_a_schedule_20260802: "the writer of the state is
#     the ACT that changes it ... so the store cannot drift from reality without the act itself
#     failing.")
#
#    So this builder now CALLS its registrar instead of naming it, and these are the values it
#    has to be handed in order to do that. THEY ARE REFUSED HERE, BEFORE A BYTE IS RENDERED,
#    for the same reason the gate and the frame are: a refusal that arrives after the file
#    exists is a cleanup instruction, not a refusal.
#
#    ⚠ PRESENCE ONLY. Whether `dispatched` is a legal mode, and whether a piece carrying
#    --inherited-from also names a --touchpoint, are register-delivered-asset.py's rules and
#    they stay in its placement_problem(). Re-stating them here would be one fact in two files,
#    and they would drift the first time the run chain changes.
#    --asset-type is not a flag: this builder makes exactly one kind of thing, and
#    `concept_sheet` is what framework_builder already records it as making.
REGISTRATION_FLAGS = ("--deliver-to", "--tenant", "--company", "--department",
                      "--program", "--by", "--dispatch-mode")


# ⭐ WHERE A SHEET LIVES — 2026-09-18, the sheet-homes ruling: THE RECIPIENT DECIDES FIRST, THEN THE BRAND.
#    (1) made for ONE named recipient (personalized, co-branded or not) -> that recipient's own folder;
#    (2) carries a PARTNER'S brand and is made for no single recipient -> that partner's folder;
#    (3) neither -> the channel's generic home.
#    WHY THIS BUILDER HAD TO LEARN IT. One content.py can hold a generic AND a personalized sheet, and until
#    today the whole build took ONE --deliver-to. So whichever folder the build ran from, one of the two was
#    registered in the wrong home: generics landed in a prospect's folder and a personalized piece landed in
#    the generic home. Measured on the 2026-09-18 re-file: 43 sheets had to be moved by hand.
#    ⛔ NO FOLDER NAME LIVES HERE. This program ships to every seat and does not know any company's folders.
#    The CALLER resolves each destination from the tenant's own folder addresses (resolve_folder_address in
#    the store, which this machine cannot reach) and passes it per RULE. The folder text passed is the same
#    workspace-relative string the asset row is keyed on, so the path written and the path registered are one
#    value. Absent all three flags the old single --deliver-to still works, but ONLY for a build whose sheets
#    all fall under one rule: a mixed build with one destination is the defect itself, and it is refused.
ROUTE_FLAGS = {"personalized": "--folder-personalized", "partner": "--folder-partner", "generic": "--folder-generic"}
ROUTE_RULE = {"personalized": "rule 1: made for one named recipient -> that recipient's folder",
              "partner": "rule 2: a partner's brand, no single recipient -> that partner's folder",
              "generic": "rule 3: no recipient, no partner brand -> the channel's generic home"}


def route_of(s, pbrand):
    """Which of the three rules places this sheet. The recipient decides first, then the brand."""
    if s.get("kind") == "personalized":
        return "personalized"
    if pbrand or s.get("partner"):
        return "partner"
    return "generic"


def routed_mode():
    return any(_flag(f) for f in ROUTE_FLAGS.values())


def workspace_root():
    """The folder the --folder-* paths are relative to. --workspace-root, else the directory the build runs from."""
    return pathlib.Path(_flag("--workspace-root") or ".").expanduser().resolve()


def resolve_routes(sheets, pbrand):
    """{route: workspace-relative folder} for every rule this build needs, or None in single-destination mode.
    REFUSES, before any sheet is written, a build whose destination cannot be right for every sheet in it."""
    need = sorted({route_of(s, pbrand) for s in sheets})
    if not routed_mode():
        if len(need) > 1:
            raise SystemExit(
                "build.py: REFUSED - no sheet was written. This content.py holds sheets under %d different home "
                "rules (%s), and one --deliver-to cannot be right for all of them - that is how generic sheets "
                "ended up in a prospect's folder. Pass one folder per rule instead:\n  %s"
                % (len(need), ", ".join(need), "\n  ".join("%s  <%s>" % (ROUTE_FLAGS[r], ROUTE_RULE[r]) for r in need)))
        return None
    missing = [r for r in need if not _flag(ROUTE_FLAGS[r])]
    if missing:
        raise SystemExit(
            "build.py: REFUSED - no sheet was written. This build holds sheets for rule(s) with no folder given:\n  %s\n"
            "Resolve each from the tenant's folder addresses; there is no default."
            % "\n  ".join("%s  <%s>" % (ROUTE_FLAGS[r], ROUTE_RULE[r]) for r in missing))
    root, out = workspace_root(), {}
    for r in need:
        v = _flag(ROUTE_FLAGS[r]).strip().rstrip("/")
        if pathlib.PurePath(v).is_absolute() or ".." in pathlib.PurePath(v).parts:
            raise SystemExit("build.py: REFUSED - %s %r must be RELATIVE to the workspace root (%s), the same string "
                             "the asset row is keyed on. No sheet written." % (ROUTE_FLAGS[r], v, root))
        dest = (root / v).resolve()
        if dest == WORK or WORK in dest.parents:
            raise SystemExit("build.py: REFUSED - %s %r is inside --work (%s). --work is the staging area for this "
                             "build, never a sheet's home. No sheet written." % (ROUTE_FLAGS[r], v, WORK))
        out[r] = v
    return out


def print_routes(sheets, pbrand, routes):
    """--dry-route: say where every sheet in this build would live, and write nothing."""
    root = workspace_root()
    print("dry route - nothing rendered, nothing written:")
    for s in sheets:
        r = route_of(s, pbrand)
        folder = routes[r] if routes else _flag("--deliver-to")
        print("  %-12s %s.pdf\n               -> %s\n               (%s)"
              % (r, file_name(s), root / folder if folder else "(no destination given)", ROUTE_RULE[r]))


def require_registration_inputs():
    """The values this build must hand its registrar. No defaults, and no build without them.
    In routed mode --deliver-to is not asked for: each rule's folder IS that group's --deliver-to."""
    need = [f for f in REGISTRATION_FLAGS if not (f == "--deliver-to" and routed_mode())]
    missing = [f for f in need if not _flag(f)]
    if missing:
        raise SystemExit(
            "build.py: REFUSED \u2014 no sheet was written.\n"
            "A built sheet that cannot be registered is a file the content library can never\n"
            "see, which is indistinguishable from a sheet nobody built. These are missing:\n"
            "  " + "  ".join(missing) + "\n"
            "There are no defaults: every one is either NOT NULL on `assets` or a foreign key,\n"
            "so a guess would be a false fact rather than a convenience.\n"
            "  --deliver-to     the path under '02 \u2014 Clients/' the file will actually LIVE at\n"
            "  --dispatch-mode  dispatched | stationed | governing\n"
            "  --touchpoint / --inherited-from  a PERSONALISED sheet is a message and needs both")
    return {f: _flag(f) for f in need}


def b64(p):
    return base64.b64encode((WORK / p).read_bytes()).decode()


def load_brand():
    """The sending company's logo from --work/assets, and its type from its brand rows (load_type).
    FAILS LOUD and NAMES a missing logo, because a half-loaded brand renders a sheet that looks finished.
    A font whose file is not on hand is NOT a refusal: the company's own row names its backup, and the
    build log says which face was embedded and which fell to its backup."""
    global LOGO_DARK, CSS
    missing = [f for f in BRAND_FILES if not (WORK / f).exists()]
    if missing:
        raise SystemExit(
            "build.py: REFUSED — %d of %d brand file(s) missing under %s. NO SHEET WRITTEN.\n"
            "  MISSING: %s\n"
            "This is the SENDING company's logo and it is deliberately not shipped with this\n"
            "program: a default would render another company's identity onto this sheet and it\n"
            "would look perfect on the way out."
            % (len(missing), len(BRAND_FILES), WORK, ", ".join(missing)))
    load_type()
    LOGO_DARK = b64("assets/logo-dark.png")
    CSS = _css()
    return CSS


REPNOTE_CSS = (".repnote{font-family:'PlexMono',ui-monospace,monospace;font-size:6.2pt;"
               "letter-spacing:.02em;color:%s;opacity:.75;margin:0 0 3pt 0;}")


def _css():
    # The faces and the two families come from load_type() (the SENDING company's type rows). For a company
    # whose fonts are all on hand this renders the same bytes the literal Archivo/PlexMono stylesheet did.
    return f"""
{FONT_FACES}
@page {{ size:letter; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html,body {{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
body {{ font-family:{BODY_FAMILY}; color:{BLACK}; }}
.page {{ width:8.5in; height:11in; overflow:hidden; position:relative;
         display:flex; flex-direction:column; page-break-after:always; background:#fff; }}
.page:last-child {{ page-break-after:auto; }}

/* ---- top bar ---- */
.bar {{ background:{BLACK}; padding:.19in .55in; display:flex; align-items:center;
        justify-content:space-between; }}
.bar img {{ height:20px; }}
.bar .logos {{ display:flex; align-items:center; gap:14px; }}
.bar .logos .sep {{ width:1px; height:18px; background:{MUTED}; }}
.mono {{ font-family:{LABEL_FAMILY}; font-weight:{LABEL_WEIGHT};
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
.leak .n {{ font-family:{LABEL_FAMILY_TIGHT}; font-weight:{LABEL_WEIGHT}; font-size:8pt;
            color:{PRIMARY}; padding-top:.022in; }}
.leak h3 {{ font-size:9.1pt; font-weight:700; line-height:1.26; margin-bottom:.028in; }}
.leak .what {{ font-size:7.7pt; line-height:1.35; color:{MUTED}; margin-bottom:.032in; }}
.orch {{ display:grid; grid-template-columns:1fr 1fr; background:{OFFWHITE};
          border-left:2px solid {PRIMARY}; }}
.orch > div {{ padding:.05in .11in .055in; }}
.orch > div + div {{ border-left:1px solid {RULE2}; }}
.orch .k {{ font-family:{LABEL_FAMILY_TIGHT}; font-weight:{LABEL_WEIGHT}; font-size:5.9pt;
            letter-spacing:.09em; text-transform:uppercase; color:{PRIMARY}; margin-bottom:.028in; }}
.orch > div + div .k {{ color:{MUTED}; }}
.orch p {{ font-size:7.6pt; line-height:1.34; color:{BLACK}; }}

/* ---- questions ---- */
.q {{ display:grid; grid-template-columns:.32in 1fr; margin-bottom:.185in; }}
.q .n {{ font-family:{LABEL_FAMILY_TIGHT}; font-weight:{LABEL_WEIGHT}; font-size:8pt;
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
    # ⭐ 2026-09-14 (operator ruling dr_collateral_sheet_labels_from_stored_words_20260914): the two
    #    column/answer labels were typed into this file ("The first 90% — the system" and
    #    "What you are listening for."), so every recipient of every sheet read seller language
    #    no template could remove. They are STORED WORDS now, with no fallback.
    "frame-col-handle-label", "frame-q-why-label",
]

# ⛔ THE TENANT AND THE TEMPLATE ARE ARGUMENTS, NOT LITERALS — GENERICIZED 2026-09-09.
#    This file used to hardcode tenant_id = <tenant> and template_id =
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
    validate_kinds(SHEETS)
    refuse_sender_fields(SHEETS)   # 2026-09-15: no sender-facing field on a recipient page (see SENDER_FACING_KEYS)
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
    F["_steps"] = _parse_steps(F["frame-steps"])
    return F


# ⭐ CO-BRAND VARIABLES — 2026-09-14, operator ruling dr_one_variable_cobrand_template_20260914:
#   "There is just a cobranded template that is variable in nature. So [two different sending
#    companies] would use the same template." Stored words may carry {{name}} tokens. Values come from the PARTNER's
#   brand record (--partner-vars, read from the store) and from the sheet's own "vars" (recipient
#   values such as the card's name). An unresolved token REFUSES the build: a sheet that ships
#   "{{partner_name}}" to a recipient is the same class of defect as another company's footer.
_TOKEN = re.compile(r"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")


def load_partner_vars():
    """--partner-brand names the co-branding partner; --partner-vars is the store read for it
    (rows of {key, value}). Both or neither. Returns (brand_key or None, dict)."""
    b, p = _flag("--partner-brand"), _flag("--partner-vars")
    if bool(b) != bool(p):
        raise SystemExit("build.py: REFUSED - --partner-brand and --partner-vars go together. "
                         "No sheet was written.")
    if not b:
        return None, {}
    try:
        blob = json.load(open(p, encoding="utf-8"))
    except Exception as e:
        raise SystemExit("build.py: REFUSED - could not read --partner-vars %s: %s" % (p, e))
    rows = blob.get("rows", blob) if isinstance(blob, dict) else blob
    out = {}
    for r in rows or []:
        if isinstance(r, dict) and r.get("key") and r.get("value") is not None:
            out[str(r["key"])] = str(r["value"])
    if not out:
        raise SystemExit("build.py: REFUSED - --partner-vars for %r carried no rows. An empty read and "
                         "a read nobody ran are the same file. No sheet was written." % b)
    return b, out


def frame_for_sheet(F, s, pvars):
    """Resolve {{tokens}} in every stored word for ONE sheet, then parse the steps."""
    vals = dict(pvars)
    vals.update({str(k): str(v) for k, v in (s.get("vars") or {}).items()})
    R = {}
    for k, v in F.items():
        if k.startswith("_"):
            continue
        for _ in range(4):
            nv = _TOKEN.sub(lambda m: vals.get(m.group(1), m.group(0)), v)
            if nv == v:
                break
            v = nv
        left = _TOKEN.findall(v)
        if left:
            raise SystemExit(
                "build.py: REFUSED - stored word %s for sheet %s still carries {{%s}} after resolution. "
                "NO SHEET WRITTEN. Supply it from the partner's brand record (--partner-vars) or the "
                "sheet's own vars; there is no default." % (k, s.get("slug"), ", ".join(sorted(set(left)))))
        R[k] = v
    R["_steps"] = _parse_steps(R["frame-steps"])
    return R


def _parse_steps(raw):
    steps = []
    for line in raw.splitlines():
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
    return steps


def esc(s):
    return s


def _rep_note():
    """⛔ THE SHEET SAYS SO ON ITS OWN FACE WHEN THE BRANDING IS DERIVED.

    The operator, 2026-09-10: "It can even have a small little identifier. This is representative,
    which we continuously do that inside of the email bodies anyway."

    It is NOT a disclaimer and it is not an apology — representative branding is a PASS, and
    the standard he set is "perfection without us having their canonical is not the goal."
    What it prevents is the other thing: a partner seeing their own colours on a document and
    reasonably concluding we hold their brand guide. Small, quiet, and only when it is true —
    the flag comes off the STORE (brand.status = candidate), never off a caller's opinion.
    """
    if not BRAND_IS_REPRESENTATIVE:
        return ""
    return ('<div class="repnote">%s</div>' % esc(REPRESENTATIVE_NOTE))


PARTNER_LOGO = None


def _logos(F):
    """Sender logo, and the co-branding partner's beside it when the sheet is co-branded."""
    main = '<img src="data:image/png;base64,%s" alt="%s">' % (LOGO_DARK, F['frame-signature'].split('<br>')[0])
    if not PARTNER_LOGO:
        return main
    return ('<div class="logos">%s<span class="sep"></span>'
            '<img src="data:image/png;base64,%s" alt="%s"></div>' % (main, PARTNER_LOGO, F.get('partner_name', '')))


def front(s, F):
    rep_note = _rep_note()
    def _leak(row):
        # 4-tuple = legacy (the original sheets, unchanged default label).
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
                <div><div class="k">{F['frame-col-handle-label']}</div><p>{ninety}</p></div>
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
    {_logos(F)}
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
    {rep_note}
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
              <p><b>{F['frame-q-why-label']}</b> {l}</p>
            </div></div>"""
        for i, (q, l) in enumerate(s["questions"]))
    handle = "".join(f"<li>{x}</li>" for x in s["handle"])
    bring = "".join(f"<li>{x}</li>" for x in s["bring"])
    return f"""
<div class="page">
  <div class="bar">
    {_logos(F)}
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
# RESTORED 2026-08-20. Lines 220-266 of the original (render + main +
# both asserts) were dropped when the 5-tuple last-10% patch was applied, so
# this file defined a builder that could not build and could not prove.
# Restored verbatim, with ONE change: the output filename is now assembled
# from the four slots ruled in Content-Library-Asset-Schema §2 instead of one
# free-text label. Empty slots collapse, so a sheet that declares only
# file_label produces the identical string it produced before.
# ---------------------------------------------------------------------------


# ══════════════════════════════════════════════════════════════════════════════════════════════
# ⛔ GENERIC OR PERSONALIZED — NEVER A MIX. 2026-09-14, ruling
#    dr_collateral_sheet_generic_or_personalized_never_mixed_20260914. The operator, on a sheet named
#    for a company, a partner and a vertical that nonetheless carried one recipient's loyalty-program
#    name, a person's name and that recipient's domain: "A generic piece needs to be completely
#    generic, so that someone at [another company in the vertical] isn't reading it and saying 'what
#    the hell is this [program] thing?' Otherwise it should have been named for that recipient, or the
#    company name."
#    So every sheet DECLARES its kind (no default). A personalized sheet names its recipient company and
#    every instance-specific noun it uses, and its FILENAME carries the recipient company. A generic sheet
#    may carry none of: "Prepared for", any recipient noun of a sibling personalized sheet in the same
#    content.py, its own forbid_terms, or any recipient noun of a personalized asset that inherits from it
#    in the STORE (--inheritors, the read --print-sql emits). A lookup that was not done is a refusal.
# ══════════════════════════════════════════════════════════════════════════════════════════════
KINDS = ("generic", "personalized")
# A personalized filename may carry ONE short parenthetical after the recipient, to tell two sheets for the
# same company apart (e.g. "(GM)"). Ruled 2026-09-14 (coordinator relay of the operator): two people at
# the same recipient company can each have their own sheet. Anything longer is a second name, not a suffix.
SUFFIX_OK = re.compile(r"\A\([A-Za-z0-9][A-Za-z0-9 .&'-]{0,23}\)\Z")
PAGE_MARK = '<div class="page">'
ERROR_PAGE_NEEDLES = ("This site can\u2019t be reached", "This site can't be reached", "ERR_")


def validate_kinds(sheets):
    for s in sheets:
        slug = s.get("slug", "?")
        k = s.get("kind")
        if k not in KINDS:
            raise SystemExit(
                "build.py: REFUSED — sheet %r declares no kind (got %r). Every sheet is kind \"generic\" or "
                "\"personalized\"; there is no default, because a sheet nobody classified is how a generic "
                "filename ended up carrying one prospect's nouns. No sheet written." % (slug, k))
        rc, rt = s.get("recipient_company"), s.get("recipient_terms")
        if k == "personalized":
            if not (isinstance(rc, str) and rc.strip()):
                raise SystemExit("build.py: REFUSED — personalized sheet %r has no recipient_company. It goes in the "
                                 "filename; without it the sheet reads as generic. No sheet written." % slug)
            sfx = s.get("filename_suffix")
            if sfx is not None and not SUFFIX_OK.match(str(sfx)):
                raise SystemExit("build.py: REFUSED — personalized sheet %r has filename_suffix %r. It must be one short "
                                 "parenthetical, e.g. \"(GM)\" (max 24 characters inside). No sheet written." % (slug, sfx))
            if not (isinstance(rt, (list, tuple)) and [t for t in rt if str(t).strip()]):
                raise SystemExit("build.py: REFUSED — personalized sheet %r has no recipient_terms. List every "
                                 "instance-specific noun it uses (program names, person names, their domain), so "
                                 "the generic it inherits from can be checked against them. No sheet written." % slug)
        else:
            if s.get("filename_suffix"):
                raise SystemExit("build.py: REFUSED — generic sheet %r carries a filename_suffix; only a personalized "
                                 "sheet may. No sheet written." % slug)
            if rc or rt:
                raise SystemExit("build.py: REFUSED — generic sheet %r names a recipient (%r). A generic sheet names "
                                 "nobody; if it is for one prospect it is personalized and its filename must say "
                                 "who. No sheet written." % (slug, rc or rt))


# ⛔ 2026-09-15 — A PAGE THE RECIPIENT READS CARRIES NO NOTES TO THE SENDER (the operator's standing
#    rule; an internal card, raised by a session that day). The plugin copy rendered "What you are listening for"
#    under every question, so each recipient read the seller's coaching. Two walls, both BEFORE a byte
#    is written: (1) content.py may not carry a sender-facing FIELD on a sheet or a question - the
#    render prints only (question, why) pairs; (2) the ASSEMBLED page's visible text may not carry a
#    sender-facing PHRASE, whoever typed it (content, stored words, or a future edit to this file).
#    Coaching belongs in the covering note, never on the sheet. There is no override flag on purpose.
SENDER_FACING_KEYS = ("listen_for", "listening_for", "what_you_are_listening_for", "listen", "coaching",
                      "coach", "seller_notes", "seller_note", "rep_notes", "rep_note", "sender_notes",
                      "sender_note", "notes_to_sender", "stop_talking", "talk_track", "internal_notes")
SENDER_FACING_PHRASES = ("what you are listening for", "what you're listening for", "listening for",
                         "listen for", "stop talking", "talk track", "seller note", "note to the seller",
                         "notes to the sender")


def refuse_sender_fields(sheets):
    for s in sheets:
        slug = s.get("slug", "?")
        hits = [k for k in s if str(k).lower() in SENDER_FACING_KEYS]
        for i, q in enumerate(s.get("questions") or []):
            if isinstance(q, dict):
                hits += ["questions[%d].%s" % (i, k) for k in q if str(k).lower() in SENDER_FACING_KEYS]
                hits.append("questions[%d] is a dict (must be a (question, why) pair)" % i)
            elif not (isinstance(q, (list, tuple)) and len(q) == 2):
                hits.append("questions[%d] has %s parts (must be exactly (question, why); a third part is "
                            "where coaching hides)" % (i, len(q) if isinstance(q, (list, tuple)) else "?"))
        if hits:
            raise SystemExit(
                "build.py: REFUSED - SENDER-FACING FIELD ON A RECIPIENT PAGE. Sheet %r carries: %s.\n"
                "A document the recipient reads carries no notes to the sender. Move the coaching into the\n"
                "covering note and remove the field from content.py. No sheet written." % (slug, "; ".join(hits)))


def refuse_sender_text(s, text):
    low = text.lower()
    hits = [p for p in SENDER_FACING_PHRASES if p in low]
    if hits:
        raise SystemExit(
            "build.py: REFUSED - SENDER-FACING WORDS ON A RECIPIENT PAGE. Sheet %r would print: %s.\n"
            "A document the recipient reads carries no notes to the sender; that text belongs in the\n"
            "covering note. Fix content.py or the stored words it came from. No sheet written."
            % (s.get("slug"), ", ".join(repr(h) for h in hits)))


def check_filename(s, name):
    if s.get("kind") == "personalized" and s["recipient_company"].lower() not in name.lower():
        raise SystemExit("build.py: REFUSED — personalized sheet %r would be named %r, which does not carry its "
                         "recipient %r. No sheet written." % (s.get("slug"), name, s["recipient_company"]))


def sibling_terms(sheets):
    out = []
    for s in sheets:
        if s.get("kind") == "personalized":
            out.append(s["recipient_company"])
            out.extend(str(t) for t in s["recipient_terms"])
    return [t for t in out if t.strip()]


def visible_text_of(h):
    import html as _html
    t = re.sub(r"<style.*?</style>", " ", h, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", _html.unescape(t))


def refuse_mixed(s, text, siblings, inheritors):
    low = text.lower()
    hits = []
    for term in ["Prepared for"] + [str(x) for x in (s.get("forbid_terms") or [])] + list(siblings) + list(inheritors):
        if term.strip() and term.lower() in low and term not in hits:
            hits.append(term)
    if hits:
        raise SystemExit("build.py: REFUSED — MIXED SHEET. %r is declared GENERIC but its page carries: %s. A generic "
                         "sheet must read the same to every prospect; move those words to the personalized sheet. "
                         "No sheet written." % (s.get("slug"), ", ".join(hits)))


def inheritors_sql(tenant, deliver_to):
    return ("-- 4 of 4 - THE INHERITORS. Every personalized piece that inherits from a generic sheet delivered to\n"
            "--   --deliver-to, with its recipient nouns. Save the rows for --inheritors. An EMPTY result is a valid\n"
            "--   answer (no children yet); a file that was never produced is a refusal.\n"
            "SELECT c.asset_id, c.source_ref, c.recipient_company, c.recipient_terms\n"
            "  FROM assets g JOIN assets c ON c.tenant_id = g.tenant_id AND c.inherited_from = g.asset_id\n"
            " WHERE g.tenant_id = %s AND g.source_ref LIKE %s AND c.status <> 'retired';"
            % (_q(tenant), _q((deliver_to or "<deliver-to>").rstrip("/") + "/%")))


def load_inheritors(sheets):
    if not any(s.get("kind") == "generic" for s in sheets):
        return []
    p = _flag("--inheritors")
    if not p:
        raise SystemExit(
            "build.py: REFUSED — this content.py holds a GENERIC sheet and no --inheritors was given, so the STORE "
            "lookup of personalized sheets that inherit from it was NOT DONE. That is not a pass: it is the exact "
            "check that catches a generic carrying a prospect's nouns. Run --print-sql (statement 4), save the rows "
            "(an empty list is fine) and pass --inheritors. No sheet written.")
    try:
        blob = json.load(open(p, encoding="utf-8"))
    except Exception as e:
        raise SystemExit("build.py: REFUSED — could not read --inheritors %s: %s. No sheet written." % (p, e))
    rows = blob.get("rows", blob) if isinstance(blob, dict) else blob
    if not isinstance(rows, list):
        raise SystemExit("build.py: REFUSED — --inheritors %s is not a list of rows. No sheet written." % p)
    terms = []
    for r in rows:
        if not isinstance(r, dict) or not r.get("recipient_company") or not r.get("recipient_terms"):
            raise SystemExit(
                "build.py: REFUSED — inheritor %r has no recipient declared in the store, so the lookup is "
                "INCOMPLETE. Declare its audience (asset_audience_put) first. No sheet written."
                % (r.get("asset_id") if isinstance(r, dict) else r))
        terms.append(str(r["recipient_company"]))
        terms.extend(str(t) for t in r["recipient_terms"])
    print("inheritors read from the store: %d personalized piece(s), %d recipient noun(s)" % (len(rows), len(terms)),
          file=sys.stderr)
    return terms


def count_pdf_pages(path):
    return len(re.findall(rb"/Type\s*/Page(?!s)", pathlib.Path(path).read_bytes()))


def pdf_text(path):
    """The PDF's text through macOS PDFKit (osascript JXA). None when that cannot be done — the caller says so."""
    import subprocess
    js = ('ObjC.import("PDFKit"); function run(a){var d=$.PDFDocument.alloc.initWithURL('
          '$.NSURL.fileURLWithPath(a[0])); return d.isNil() ? "" : (d.string.isNil() ? "" : d.string.js)}')
    try:
        r = subprocess.run(["osascript", "-l", "JavaScript", "-e", js, str(path)], capture_output=True, text=True,
                           timeout=60)
    except Exception:
        return None
    return r.stdout if r.returncode == 0 else None


def judge_pdf_text(name, text):
    for needle in ERROR_PAGE_NEEDLES:
        if needle in (text or ""):
            raise SystemExit("build.py: REFUSED — %s carries %r: the renderer printed a browser ERROR PAGE, not the "
                             "sheet." % (name, needle))


def verify_pdfs(items, expect, door=None):
    """After the cloud print. The page count must equal the template's page count, the text may not be a browser
    error page, and (with the door's answer) no page may overflow or collide: PROBE_JS's ov must be 0 and slack
    >= 0 on every page. A bad PDF is DELETED and the build exits non-zero — it must never sit in out/ looking built."""
    for name, _p in items:
        pdf = OUT / ("%s.pdf" % name)
        want = expect[name]
        got = count_pdf_pages(pdf) if pdf.exists() else 0
        if got != want:
            if pdf.exists():
                pdf.unlink()
            raise SystemExit("build.py: REFUSED — %s.pdf has %d page(s); this template renders %d. The PDF was "
                             "DELETED. No sheet delivered." % (name, got, want))
        ans = (door or {}).get(name)
        if ans is not None:
            bad = [i + 1 for i, pg in enumerate(ans.get("probe") or []) if not (pg.get("ov") == 0 and (pg.get("slack") or 0) >= 0
                                                                                 and isinstance(pg.get("slack"), (int, float)))]
            if len(ans.get("probe") or []) != want:
                bad = bad or ["the probe read %d page(s), not %d" % (len(ans.get("probe") or []), want)]
            if bad or ans.get("error_page"):
                pdf.unlink()
                raise SystemExit("build.py: REFUSED — %s.pdf: %s. The PDF was DELETED. No sheet delivered."
                                 % (name, ("page(s) %s overflow or collide (ov must be 0, slack >= 0): %s"
                                           % (", ".join(str(b) for b in bad), ans.get("probe"))) if bad
                                  else "the print door read a browser ERROR PAGE (%r)" % ans.get("error_page")))
        txt = pdf_text(pdf)
        if txt is None:
            print("  ⚠ %s.pdf: PDF TEXT COULD NOT BE READ on this machine (no PDFKit) — the error-page check is "
                  "UNVERIFIED. The page-count check passed (%d)." % (name, got), file=sys.stderr)
        else:
            try:
                judge_pdf_text(name + ".pdf", txt)
            except SystemExit:
                pdf.unlink()
                raise
        print("  %s.pdf: %d page(s) = template, no error page%s" % (name, got, ", no overflow (cloud probe)" if ans else ""),
              file=sys.stderr)


def file_name(s):
    """Content-Library-Asset-Schema §2 v1.6 (the operator, 2026-08-20 — the SECOND
    ruling that day, superseding the four-slot form quoted below):
        <Company>[ + <Partner>][ & <Vertical>][ <Family>]   slots collapse.

    QUOTED, NOT DELETED — the v1.5 form this replaced was:
        <Company> - <Family> - <Vertical> - <Audience>
    Nine files were delivered under v1.5 on 2026-08-20 and are correctly named
    for the rule that was live when they shipped. The four-slot string is not
    lost: canonical_name() computes it and assets.canonical_name stores it.
    Moved 2026-08-20 by a session that day — the spec
    was amended the same day it landed and this builder never moved with it."""
    if s.get("kind") == "personalized":
        # A PERSONALIZED filename names the recipient company. The vertical never goes here; it stays in
        # canonical_name only (ruling dr_collateral_sheet_generic_or_personalized_never_mixed_20260914).
        out = _sender_company(s)
        if s.get("partner"):
            out += " + %s" % s["partner"]
        out += " & %s" % s["recipient_company"]
        if s.get("filename_suffix"):
            out += " %s" % s["filename_suffix"]
        return out
    out = _sender_company(s)
    if s.get("partner"):
        out += " + %s" % s["partner"]
    vertical = s.get("vertical", s.get("file_label", ""))
    if vertical:
        out += " & %s" % vertical
    if s.get("family_in_filename"):
        out += " %s" % s["family_in_filename"]
    return out


def _sender_company(s):
    """The company SENDING the sheet. Required: there is no safe default. It used to fall back to the
    plugin maker's own name, which would have printed another company's name on a client's sheet.
    Refused rather than guessed (2026-09-18)."""
    c = (s.get("company") or "").strip()
    if not c:
        raise SystemExit("REFUSED: this sheet has no 'company' (the company sending it). Set it in the sheet spec; nothing was built.")
    return c


def canonical_name(s):
    """The v1.5 four-slot string. NOT the filename any more — this is what the
    asset row stores in assets.canonical_name, because faceting is a registry
    job and addressing an inbox is a filename job (§2 v1.6)."""
    slots = [_sender_company(s),
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


# ══════════════════════════════════════════════════════════════════════════════
# ⛔ NO BROWSER RUNS ON THIS MACHINE. THE PDF IS MADE IN THE CLOUD — 2026-10-18 (0.9.66).
# ══════════════════════════════════════════════════════════════════════════════
# Card neon_chrome_exits_2_after_writing_the_pdf_so_the_sheet_builder_skips_its_page_check_20261018. Until today
# this file printed its PDFs with a local browser: Playwright when it was installed, else the Mac's own Chrome
# (--print-to-pdf). That Chrome exited 2 after writing the PDF whenever the owner's Chrome was open, and its path
# never ran the overflow probe at all — so the page check was silently skipped, a false green. The owner,
# 2026-10-18: "It should be a cloud element yes, nothing should be running because my Mac is needed, that I
# don't know about". So render_via_chrome() and render() (the Playwright launch) are GONE, and so is every way
# this file had of starting a browser:
#   --html-only   THE DEFAULT. Writes each sheet's HTML (and words/) and stops, exit 8. No PDF, so no page check
#                 and no filing plan: the filing plan waits for a PDF.
#   --pdf cloud   sends each sheet's HTML, with PROBE_JS, to the house's print door (PDF_DOOR, the aii-site
#                 function api/collateral/print-pdf) with the PRINT TOKEN from the local keys file
#                 (AIOS_COLLATERAL_PRINT_TOKEN in KEYS_FILES). The door prints it at Letter and answers the PDF, its
#                 page count, the error-page check and this probe's numbers. verify_pdfs() then judges the PDF
#                 that came back, here, before anything is filed.
# No print token on this machine -> --pdf cloud says so and stops (exit 10) before a byte is written.
#
# ⛔ THE PRINT DOOR HAS ITS OWN TOKEN — 2026-10-18 (0.9.67). 0.9.66 sent the video publish token to this door.
#    Store Ops ruled the same day that the print door gets its OWN explicitly scoped token ('collateral-print-pdf'),
#    minted by one run file into ~/aios-workshop/aios-bootstrap.env as AIOS_COLLATERAL_PRINT_TOKEN, and that the
#    publish token must not gain print power. So this file reads ONLY the print key. There is deliberately NO
#    fallback to the publish token: a fallback here is exactly how the publish token would gain print power.
PDF_DOOR = "https://app.aiintegratorhq.com/api/collateral/print-pdf"
KEYS_FILES = ("~/aios-workshop/aios-bootstrap.env", "~/.aios/aios-bootstrap.env")
TOKEN_KEY = "AIOS_COLLATERAL_PRINT_TOKEN"   # the ONLY key read. Never the publish token, never a fallback.
PDF_MODES = ("cloud",)
EXIT_HTML_ONLY = 8
EXIT_NO_PRINT_TOKEN = 10


def pdf_mode():
    """'html-only' (the default) or 'cloud'. Anything else is refused before a byte is written."""
    m = _flag("--pdf")
    if "--pdf" in sys.argv and m is None:
        raise SystemExit("build.py: REFUSED - --pdf needs a value: --pdf cloud. Nothing was written.")
    if m is not None and m not in PDF_MODES:
        raise SystemExit("build.py: REFUSED - --pdf %r is not a way this builder makes a PDF. The one way is --pdf cloud "
                         "(the house's print door). No browser runs on this machine. Nothing was written." % m)
    if m and "--html-only" in sys.argv:
        raise SystemExit("build.py: REFUSED - --html-only and --pdf cloud were both given; pick one. Nothing was written.")
    return m or "html-only"


def print_token():
    """The print token (TOKEN_KEY) from the local keys file, or None. Read only; never printed, never logged."""
    for f in KEYS_FILES:
        p = pathlib.Path(f).expanduser()
        try:
            lines = p.read_text(encoding="utf-8").splitlines()
        except Exception:
            continue
        for line in lines:
            m = re.match(r"\s*(?:export\s+)?%s\s*=\s*(.*?)\s*$" % TOKEN_KEY, line)
            if m:
                v = m.group(1).strip().strip("'\"")
                if v:
                    return v
    return None


def require_print_token():
    t = print_token()
    if not t:
        print(
            "build.py: STOPPED - --pdf cloud needs the print token, and it is not on this Mac yet.\n"
            "  Looked for %s in: %s\n"
            "  One run file makes it: it mints the print door's own token and writes it to the keys file. Until that\n"
            "  has run, no PDF can be made here and none is faked. The publish token is not used for this. Nothing\n"
            "  was written. Build with --html-only (the default) to get the sheets' HTML now."
            % (TOKEN_KEY, ", ".join(KEYS_FILES)), file=sys.stderr)
        raise SystemExit(EXIT_NO_PRINT_TOKEN)
    return t


def _door_call(token, payload):
    import urllib.request, urllib.error
    door = os.environ.get("AII_PRINT_PDF_DOOR") or PDF_DOOR
    # The token goes to the house's own door and nowhere else: an override may only name this machine (the proof's stand-in door).
    if door != PDF_DOOR and not re.match(r"\Ahttp://127\.0\.0\.1:\d+/", door):
        raise SystemExit("build.py: REFUSED - AII_PRINT_PDF_DOOR %r is not the house's print door; the print token is "
                         "never sent anywhere else. Nothing was written." % door)
    req = urllib.request.Request(door, data=json.dumps(payload).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            said = json.loads(e.read().decode("utf-8"))
        except Exception:
            said = {}
        raise SystemExit("build.py: REFUSED - the print door said no (HTTP %d %s): %s No PDF was made."
                         % (e.code, said.get("error", ""), said.get("message", "")))
    except Exception as e:
        raise SystemExit("build.py: REFUSED - the print door could not be reached (%s). No PDF was made."
                         % type(e).__name__)


def render_via_cloud(items, token):
    """Each sheet to the house's print door. Writes OUT/<name>.pdf from the answer and returns {name: door answer}.
    The door's verdict is not taken on trust: verify_pdfs() judges the returned PDF here."""
    want_probe = hashlib.sha256(PROBE_JS.encode("utf-8")).hexdigest()
    seen = {}
    for name, path in items:
        ans = _door_call(token, {"html": pathlib.Path(path).read_text(encoding="utf-8"), "probe_js": PROBE_JS, "name": name})
        if not isinstance(ans, dict) or ans.get("ok") is not True or not ans.get("pdf_b64"):
            raise SystemExit("build.py: REFUSED - the print door answered without a PDF for %s. No sheet delivered." % name)
        if ans.get("probe_sha256") != want_probe:
            raise SystemExit("build.py: REFUSED - the print door ran a different overflow probe than this builder's PROBE_JS "
                             "for %s. No sheet delivered." % name)
        (OUT / ("%s.pdf" % name)).write_bytes(base64.b64decode(ans["pdf_b64"]))
        print("  %52s  PDF via the cloud print door: %s page(s), probe %s"
              % (name[-52:], ans.get("pages"), ans.get("probe")), file=sys.stderr)
        seen[name] = ans
    return seen


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
    tok = dict(full); tok["frame-closer"] = "Ask {{partner_name}} first."
    tp = os.path.join(d, "tok.json"); open(tp, "w").write(json.dumps(tok))
    FT = load_frame(tp)
    try:
        frame_for_sheet(FT, {"slug": "t"}, {}); ok = False; print("  FAIL  unresolved token did not refuse")
    except SystemExit as e:
        print("  pass  unresolved {{partner_name}} REFUSED" if "partner_name" in str(e) else "  FAIL  refusal did not name the token")
        ok = ok and "partner_name" in str(e)
    R = frame_for_sheet(FT, {"slug": "t"}, {"partner_name": "Acme Co"})
    if R["frame-closer"] == "Ask Acme Co first.":
        print("  pass  token RESOLVED from partner vars (the other direction)")
    else:
        ok = False; print("  FAIL  token resolved wrong: %r" % R["frame-closer"])
    ok = selftest_root_fix() and ok
    ok = selftest_type_and_accent() and ok
    print("SELF-TEST %s" % ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


def selftest_root_fix():
    """INVERSE CONTROLS for the 2026-09-14 root fix. Every refusal is watched firing, and a clean case is watched
    passing, so none of these guards is a wall that refuses everything."""
    global OUT, WORK
    import tempfile, os
    ok = True

    def expect_refuse(label, fn, needle):
        nonlocal ok
        try:
            fn()
            ok = False
            print("  FAIL  %s did not refuse" % label)
        except SystemExit as e:
            if needle.lower() in str(e).lower():
                print("  pass  %s REFUSED" % label)
            else:
                ok = False
                print("  FAIL  %s refused without naming %r: %s" % (label, needle, str(e)[:120]))

    gen = {"slug": "g", "kind": "generic", "company": "Acme Co", "partner": "Northwind", "vertical": "Casino Marketing"}
    per = {"slug": "p", "kind": "personalized", "company": "Acme Co", "partner": "Northwind",
           "vertical": "Tribal Casino Marketing", "recipient_company": "Riverbend Resort",
           "recipient_terms": ["Sphere Club", "Pat Doe", "riverbend.example"]}
    expect_refuse("a sheet with no kind", lambda: validate_kinds([{"slug": "x"}]), "no kind")
    expect_refuse("a personalized sheet with no recipient_company", lambda: validate_kinds([dict(per, recipient_company="")]), "recipient_company")
    expect_refuse("a personalized sheet with no recipient_terms", lambda: validate_kinds([dict(per, recipient_terms=[])]), "recipient_terms")
    expect_refuse("a generic sheet that names a recipient", lambda: validate_kinds([dict(gen, recipient_company="Riverbend")]), "generic sheet")
    validate_kinds([gen, per]); print("  pass  a clean generic + personalized pair is ACCEPTED")
    expect_refuse("a MIXED sheet (generic page carrying a sibling's 'Sphere Club')",
                  lambda: refuse_mixed(gen, "Join Sphere Club today", sibling_terms([gen, per]), []), "Sphere Club")
    expect_refuse("a generic page carrying 'Prepared for'", lambda: refuse_mixed(gen, "Prepared for Pat", [], []), "Prepared for")
    expect_refuse("a generic page carrying its own forbid_terms", lambda: refuse_mixed(dict(gen, forbid_terms=["Zenith"]), "Zenith Rewards", [], []), "Zenith")
    expect_refuse("a generic page carrying a STORE inheritor's noun", lambda: refuse_mixed(gen, "visit riverbend.example", [], ["riverbend.example"]), "riverbend.example")
    refuse_mixed(gen, "Your players club", sibling_terms([gen, per]), ["Sphere Club"]); print("  pass  a truly generic page is ACCEPTED")
    expect_refuse("a personalized filename with no recipient in it",
                  lambda: check_filename(per, "Acme Co + Northwind & Tribal Casino Marketing"), "does not carry")
    n = file_name(per)
    if n == "Acme Co + Northwind & Riverbend Resort" and "Tribal Casino" not in n:
        check_filename(per, n); print("  pass  a personalized filename is <Company> + <Partner> & <recipient>: %r" % n)
    else:
        ok = False; print("  FAIL  personalized filename came out %r" % n)
    gm = dict(per, filename_suffix="(GM)")
    validate_kinds([gm])
    ngm = file_name(gm)
    if ngm == "Acme Co + Northwind & Riverbend Resort (GM)":
        check_filename(gm, ngm); print("  pass  a short parenthetical suffix is ACCEPTED after the recipient: %r" % ngm)
    else:
        ok = False; print("  FAIL  suffixed filename came out %r" % ngm)
    expect_refuse("a suffix that is not a short parenthetical",
                  lambda: validate_kinds([dict(per, filename_suffix="for the General Manager and his team")]), "short parenthetical")
    expect_refuse("a generic sheet carrying a suffix",
                  lambda: validate_kinds([dict(gen, filename_suffix="(GM)")]), "only a personalized")
    if file_name(gen) != "Acme Co + Northwind & Casino Marketing":
        ok = False; print("  FAIL  generic filename changed: %r" % file_name(gen))
    saved_argv = list(sys.argv)
    try:
        sys.argv = [sys.argv[0]]
        expect_refuse("a generic build with no --inheritors (store lookup not done)", lambda: load_inheritors([gen]), "NOT DONE")
    finally:
        sys.argv = saved_argv
    cwd, saved_work, saved_out = os.getcwd(), WORK, OUT
    d = tempfile.mkdtemp()
    try:
        os.chdir(d); os.mkdir("w")
        sys.argv = [saved_argv[0], "--work", "w"]
        require_work()
        if WORK.is_absolute() and WORK == pathlib.Path(d, "w").resolve():
            print("  pass  a relative --work is RESOLVED to an absolute path (%s)" % WORK)
        else:
            ok = False; print("  FAIL  relative --work stayed %r" % str(WORK))
        OUT = pathlib.Path(d, "out"); OUT.mkdir()
        one = OUT / "bad.pdf"; one.write_bytes(b"%PDF-1.4\n1 0 obj << /Type /Pages /Kids [2 0 R] >>\n2 0 obj << /Type /Page >>\n%%EOF")
        expect_refuse("a PDF with the wrong page count (1, template renders 2)", lambda: verify_pdfs([("bad", None)], {"bad": 2}), "page(s)")
        if one.exists():
            ok = False; print("  FAIL  the wrong-page-count PDF was not deleted")
        else:
            print("  pass  the wrong-page-count PDF was DELETED")
        expect_refuse("a Chrome error page", lambda: judge_pdf_text("x.pdf", "This site can\u2019t be reached ERR_FILE_NOT_FOUND"), "ERROR PAGE")
        judge_pdf_text("x.pdf", "Your website is full of future members."); print("  pass  ordinary sheet text is ACCEPTED")
    finally:
        os.chdir(cwd); sys.argv = saved_argv; WORK, OUT = saved_work, saved_out
    return ok


def selftest_type_and_accent():
    """INVERSE CONTROLS for the 2026-10-18 type-and-accent change. Each direction is watched: a font file on hand
    is EMBEDDED, the same row with no file falls to the BACKUP ITS ROW NAMES, a company with no type rows gets the
    neutral system sans, and the accent comes by ROLE with the old name chain still deciding when no rule names one.
    Writes only into a temporary folder; touches no sheet."""
    global WORK, TYPE_ROWS
    import tempfile, io, contextlib
    ok = True

    def check(label, cond, detail=""):
        nonlocal ok
        ok = ok and bool(cond)
        print("  %s  %s%s" % ("pass" if cond else "FAIL", label, (" (%s)" % detail) if detail and not cond else ""))

    have = {"orange": "#FF7A1A", "blue": "#1F5BD8", "teal": "#00D4AA", "lime": "#B5F44A"}
    r = accent_by_role({"orange-once": "a single highlight"}, have)
    check("accent by ROLE: an 'orange-once' rule names orange", r and r[0] == "#FF7A1A", r)
    r = accent_by_role({"highlight": "lime"}, have)
    check("accent by ROLE: a 'highlight' rule naming lime", r and r[0] == "#B5F44A", r)
    check("no accent rule -> None, so the name chain (accent, teal, lime) decides as before",
          accent_by_role({"fill": "blue"}, have) is None)
    check("two once-rules naming different colours are not a role",
          accent_by_role({"orange-once": "x", "teal-once-per-view": "y"}, have) is None)
    fam, w, bk, how = parse_type_value("Greycliff CF - Bold for headlines. Web fallback until a licence: system sans "
                                       "(San Francisco, Segoe, Helvetica).")
    check("a prose row: family Greycliff CF, backup the system sans it names",
          fam == "Greycliff CF" and bk and bk[0] == "system-ui", (fam, bk))
    fam, w, bk, how = parse_type_value("Encode Sans Condensed SemiBold, UPPERCASE, letter-spaced.")
    check("a weight word comes off the family: Encode Sans Condensed, 600", (fam, w) == ("Encode Sans Condensed", 600), (fam, w))
    fam, w, bk, how = parse_type_value('"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace')
    check("a CSS-stack row: family IBM Plex Mono, backup the rest of the stack",
          fam == "IBM Plex Mono" and bk == ["ui-monospace", '"SF Mono"', "Menlo", "monospace"], (fam, bk))
    saved_work, saved_rows, saved_argv = WORK, dict(TYPE_ROWS), list(sys.argv)
    d = pathlib.Path(tempfile.mkdtemp())
    try:
        (d / "assets").mkdir()
        WORK = d
        sys.argv = [sys.argv[0], "--brand", "selftest", "--workspace-root", str(d)]
        rows = {"display-and-body": {"value": "Greycliff CF - Bold. Web fallback: system sans."},
                "label": {"value": "Encode Sans Condensed SemiBold, UPPERCASE.",
                          "file_path": "fonts/EncodeSansCondensed-SemiBold.ttf"}}
        TYPE_ROWS = rows
        log = io.StringIO()
        with contextlib.redirect_stderr(log):
            load_type()
        check("file NOT on hand -> the label uses the backup and the log says so",
              "encode" not in LABEL_FAMILY.lower() and "NOT ON HAND" in log.getvalue() and not FONT_FACES, LABEL_FAMILY)
        (d / "fonts").mkdir()
        (d / "fonts" / "EncodeSansCondensed-SemiBold.ttf").write_bytes(b"not a real font - selftest bytes")
        with contextlib.redirect_stderr(io.StringIO()):
            load_type()
        check("file ON HAND at the row's file_path -> EMBEDDED as 'EncodeSansCondensed' 600, body still on its backup",
              LABEL_FAMILY.startswith("'EncodeSansCondensed'") and LABEL_WEIGHT == 600
              and "font-family:'EncodeSansCondensed'" in FONT_FACES and "font-weight:600" in FONT_FACES
              and BODY_FAMILY.startswith("system-ui"), (LABEL_FAMILY, LABEL_WEIGHT))
        TYPE_ROWS = {"label": {"value": '"IBM Plex Mono", ui-monospace, monospace'}}
        (d / "assets" / "PlexMono.ttf").write_bytes(b"selftest")
        with contextlib.redirect_stderr(io.StringIO()):
            load_type()
        check("a file in --work/assets named for the family, foundry word optional (PlexMono.ttf for IBM Plex Mono)",
              LABEL_FAMILY == "'PlexMono', 'Courier New', monospace" and LABEL_WEIGHT == 500, LABEL_FAMILY)
        check("no body row -> the neutral system sans, never another company's face", BODY_FAMILY.startswith("system-ui"),
              BODY_FAMILY)
    finally:
        WORK, TYPE_ROWS, sys.argv = saved_work, saved_rows, saved_argv
    return ok


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
        print("-- 2 of 3 - THE FRAME. Save these rows for --frame.")
        print(frame_sql(_flag("--tenant"), _flag("--template")))
        print()
        # ⭐ THIRD STATEMENT ADDED 2026-09-10 — the COLOURS, which used to be a two-key map
        #    compiled into this file. Printing it here rather than in a separate tool is the
        #    same reason the gate is printed with the frame: a step that has to be remembered
        #    is a step that runs without the one before it, forever.
        print(palette_sql(_flag("--tenant"), _flag("--brand")))
        print()
        print(inheritors_sql(_flag("--tenant"), _flag("--folder-generic") or _flag("--deliver-to")))
        return
    if "--selftest-frame" in sys.argv:
        raise SystemExit(selftest_frame_refusal())

    # ⚠ THE REFUSAL RUNS BEFORE A BYTE IS ASSEMBLED, let alone written. Ordering is
    #   the guard: load_frame() above any write_text() is what makes "REFUSES and
    #   writes no file" true rather than aspirational.
    require_work()
    MODE = pdf_mode()
    TOKEN = require_print_token() if MODE == "cloud" else None   # before a byte is written, so a missing token writes nothing
    if "--dry-route" in sys.argv:
        # Reads content.py and the flags only - no store rows, no fonts, no render - and writes nothing.
        _sheets = load_sheets()
        _pb = _flag("--partner-brand")
        print_routes(_sheets, _pb, resolve_routes(_sheets, _pb))
        return
    # BEFORE THE GATE, because it is the cheapest of the three and needs no store read.
    REG = require_registration_inputs()
    # THE GATE RUNS BEFORE THE FRAME, AND BOTH RUN BEFORE ANY WRITE. Ordering is the
    # guard. The gate is first because it answers the bigger question - may this be
    # built at all - and a complete frame on a template nobody may build from is the
    # case that would otherwise sail straight through.
    G = load_gate(_flag("--gate"))
    F = load_frame(_flag("--frame"))
    load_palette()
    load_brand()
    PBRAND, PVARS = load_partner_vars()
    if PBRAND:
        global PARTNER_LOGO
        lp = WORK / "assets" / "partner-logo.png"
        if not lp.exists():
            raise SystemExit("build.py: REFUSED - --partner-brand %s given but assets/partner-logo.png is "
                             "missing. A co-branded header with one logo is not co-branded. No sheet "
                             "written." % PBRAND)
        PARTNER_LOGO = b64("assets/partner-logo.png")
    OUT.mkdir(exist_ok=True)

    items = []
    SHEETS_ALL = load_sheets()
    # WHERE EACH SHEET LIVES, settled BEFORE a byte is rendered (see ROUTE_FLAGS).
    ROUTES = resolve_routes(SHEETS_ALL, PBRAND)
    ROUTE_OF = {}
    INHERITORS = load_inheritors(SHEETS_ALL)
    SIBLINGS = sibling_terms(SHEETS_ALL)
    EXPECT, AUD = {}, {}
    for s in SHEETS_ALL:
        SF = frame_for_sheet(F, s, PVARS)
        SF["partner_name"] = PVARS.get("partner_name", "")
        h = html_for(s, SF)
        refuse_sender_text(s, visible_text_of(h))   # 2026-09-15: every sheet, generic AND personalized, before any write
        check_filename(s, file_name(s))
        if s["kind"] == "generic":
            refuse_mixed(s, visible_text_of(h), SIBLINGS, INHERITORS)
        # ---- teal-once-per-view check, countable in the source
        for i, page in enumerate(h.split('<div class="page">')[1:]):
            n = len(re.findall(re.escape(ACCENT), page))
            assert n == 0, f"{s['slug']} page {i+1}: literal accent {ACCENT} in markup"
        assert CSS.count(ACCENT) == 1, \
            "accent %s declared more than once in the stylesheet" % ACCENT
        name = file_name(s)
        p = WORK / f"{s['slug']}.html"
        p.write_text(h, encoding="utf-8")
        # 2026-09-11 (Campaign Engine Assets S2): the same source, named like its PDF, in words/ - OUTSIDE out/ so
        # it is never scanned as a deliverable. register-delivered-asset.py --body-from reads the sheet's WORDS from
        # here, because asset_put() now refuses a delivered piece that does not carry its words.
        (WORK / "words").mkdir(exist_ok=True)
        (WORK / "words" / f"{name}.html").write_text(h, encoding="utf-8")
        items.append((name, p))
        ROUTE_OF[name] = route_of(s, PBRAND)
        EXPECT[name] = h.count(PAGE_MARK)
        AUD[name + ".pdf"] = {"audience_kind": s["kind"],
                              "recipient_company": s.get("recipient_company") if s["kind"] == "personalized" else None,
                              "recipient_terms": list(s.get("recipient_terms") or []) if s["kind"] == "personalized" else None,
                              "audience_label": s.get("audience_label") or s.get("audience") or ""}
    if MODE == "html-only":
        # ⛔ HTML ONLY (the default since 0.9.66): no PDF, so no page check and no filing plan. exit 8, never 0.
        print("built (HTML only):")
        for n, p in items:
            print("  ", p, "\n     words:", WORK / "words" / ("%s.html" % n))
        print()
        print("⛔ HTML ONLY — exit %d. No PDF was made, so the page check, the error-page check and the" % EXIT_HTML_ONLY)
        print("   overflow probe have NOT run, and nothing is planned for filing (the filing plan waits for a PDF).")
        print("   No browser ran on this machine. To make the PDFs and run their checks in the cloud: --pdf cloud.")
        raise SystemExit(EXIT_HTML_ONLY)
    DOOR = render_via_cloud(items, TOKEN)
    verify_pdfs(items, EXPECT, DOOR)
    (OUT / "_audience.json").write_text(json.dumps(AUD, ensure_ascii=False, indent=1), encoding="utf-8")
    print("built:")
    for n, _ in items:
        print("  ", (OUT / f"{n}.pdf").name)
    # The layout proof prints HERE, before the exit-9 block below. Until 2026-09-11 these lines sat
    # AFTER `raise SystemExit(9)` and never ran, so "no layout overflow on any page" (the collateral
    # skill's Step 5 proof) never reached the person running the build. Since 0.9.66 the probe RUNS on every
    # PDF (in the cloud) and verify_pdfs() refuses a page that overflows, so reaching this line means none did.
    print("layout overflow/collision pages: none (PROBE_JS run by the cloud print door on %d sheet(s))" % len(items))

    # ══════════════════════════════════════════════════════════════════════════════
    # ⛔ A BUILD IS NOT A DELIVERY. THIS PROGRAM NO LONGER EXITS 0 HERE.
    # ══════════════════════════════════════════════════════════════════════════════
    # Added 2026-09-10 (a session that day) on the operator's instruction
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
    print()
    # ⛔ THE PATH IS DERIVED FROM THIS FILE, NEVER TYPED. The registrar ships BESIDE this
    #    program in the plugin (skills/aii-collateral-sheet/) and sits in 04/scripts in the
    #    workspace. A hardcoded workspace path is a path NO SEAT HAS — which is the very
    #    defect this skill was fixed for on 2026-09-09, when its body told a reader to run a
    #    builder that was not on the machine. Caught 2026-09-10 by unzipping the built
    #    plugin and reading it, not by any gate.
    _reg = pathlib.Path(__file__).resolve().parent / "register-delivered-asset.py"
    if not _reg.exists():   # the workspace master sits three folders above 00 — User Preferences/personal-skills/collateral-sheet
        _cand = pathlib.Path(__file__).resolve().parents[3] / "04 — Daily Operating System" / "scripts" / "register-delivered-asset.py"
        if _cand.exists():
            _reg = _cand
    if not _reg.exists():
        _reg = pathlib.Path("04 — Daily Operating System/scripts/register-delivered-asset.py")
    # ⭐ 2026-09-12 — THIS PROGRAM NOW RUNS THE REGISTRAR INSTEAD OF PRINTING IT.
    #   What stood here was a command with <angle-bracket> placeholders for a person to fill in
    #   and run. That is act two wearing act one's clothes, and standing check #256 named it:
    #   of the three makers the framework ships, this was the only one whose framework_builder
    #   row claimed a registrar its own source never called. The other two — build-call-guide.js
    #   and build-call-debrief.js — have always called theirs in-process.
    #
    # ⚠ IT RUNS THE SCAN, WHICH IS THE HALF A BUILDER CAN DO. --sql and --settle need the board
    #   connector, and no local script in this estate holds a credential. That is the same
    #   two-step shape register-call-doc.js uses, where the builder calls planRegistration() and
    #   the SESSION settles. So the exit 9 STAYS and means what it always meant: the files exist,
    #   the plan exists, and the library cannot see them until the rows land.
    #
    # ⭐ THE RUN CHAIN (Campaign-Engine-Touchpoint-Record-SPEC-DRAFT §4.6; ruling
    #   dr_touchpoint_record_may_reach_client_stores_20260911_084747). The canonical sheet is the
    #   content of a TOUCHPOINT TEMPLATE (never the layout); a personalised sheet is a MESSAGE and
    #   must name the touchpoint it was made for, which the caller READS from the debrief that
    #   asked for it. Those rules are ENFORCED BY THE REGISTRAR and are deliberately not restated
    #   here — one fact, one file.
    import subprocess, shutil

    def _register(scan_dir, deliver_to):
        cmd = [sys.executable, str(_reg), "--scan", str(scan_dir),
               "--asset-type", "concept_sheet",
               "--body-from", str(WORK / "words")]
        for flag in REG:
            cmd += [flag, deliver_to if flag == "--deliver-to" else REG[flag]]
        if "--deliver-to" not in REG:
            cmd += ["--deliver-to", deliver_to]
        # ⭐ 2026-09-15 (an internal card, raised by a session that day): --brand and --partner-brand were
        #   REQUIRED by this build (load_palette / load_partner_vars) but never handed on, so the registrar exited 6
        #   ("no --brand given") on every build. --brand is always present by here; --partner-brand only when given.
        cmd += ["--brand", _flag("--brand")]
        for flag in ("--partner-brand", "--template", "--touchpoint", "--inherited-from", "--channel", "--note"):
            v = _flag(flag)
            if v:
                cmd += [flag, v]
        print("   running the registrar: %s --scan %s" % (_reg.name, scan_dir))
        r = subprocess.run(cmd)
        if r.returncode != 0:
            # ⛔ THE REGISTRAR'S REFUSAL IS THIS BUILD'S REFUSAL, AND ITS EXIT CODE PASSES STRAIGHT
            #   THROUGH rather than being flattened into 9: 2 means it could not read the folder and
            #   6 means a required value or the sheet's words are missing. Collapsing those into
            #   "not delivered yet" would tell the caller to go run a step that fails the same way.
            print()
            print("⛔ THE REGISTRAR REFUSED (exit %d). The sheets are written; the delivery is NOT "
                  "planned." % r.returncode)
            raise SystemExit(r.returncode)
        return scan_dir / "_delivery.json"

    plans = []
    if ROUTES is None:
        plans.append(_register(OUT, REG["--deliver-to"]))
    else:
        # ⭐ ROUTED (2026-09-18): each rule's sheets are planned against THEIR OWN home and then MOVED there, so the
        #   path registered and the path on disk are one value and nothing is left behind in out/. Each group is
        #   staged in its own folder first because the registrar plans every deliverable in the folder it scans,
        #   and a home folder already holds other sheets.
        root = workspace_root()
        for route in sorted(set(ROUTE_OF.values())):
            names = [n for n in ROUTE_OF if ROUTE_OF[n] == route]
            stage = OUT / ("_route-" + route)
            stage.mkdir(exist_ok=True)
            for n in names:
                os.replace(OUT / (n + ".pdf"), stage / (n + ".pdf"))
            (stage / "_audience.json").write_text(
                json.dumps({k: v for k, v in AUD.items() if k[:-4] in names}, ensure_ascii=False, indent=1),
                encoding="utf-8")
            plans.append(_register(stage, ROUTES[route]))
            home = root / ROUTES[route]
            home.mkdir(parents=True, exist_ok=True)
            for n in names:
                os.replace(stage / (n + ".pdf"), home / (n + ".pdf"))
                print("   %-12s %s.pdf -> %s" % (route, n, home))
    print()
    print("   PLANNED. Now run these through the board — they need the connector:")
    for plan in plans:
        print('     python3 "%s" --plan "%s" --sql' % (_reg, plan))
        print('     python3 "%s" --plan "%s" --settle <rows.json>' % (_reg, plan))
    print("   ⚠ A rebuild that produces the SAME BYTES comes back `unchanged` and writes")
    print("     nothing. That is a pass, not a miss: the file name was never the question.")
    raise SystemExit(9)


if __name__ == "__main__":
    main()
