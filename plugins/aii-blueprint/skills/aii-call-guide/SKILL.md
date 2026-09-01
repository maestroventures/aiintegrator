---
name: aii-call-guide
description: >
  AI Integrator Blueprint: Call Guide. Builds a deep, advisor-driven sales call guide for an
  upcoming meeting and saves it as a standalone interactive HTML file in the client folder. Use
  whenever the user says "call guide," "prep me for my call with [person/company]," "build a guide
  for my meeting with [name]," "guide for [company]," or when a scheduled sweep finds an upcoming
  meeting with no guide yet. Reads the prospect + company + meeting from the CRM and the calendar,
  resolves and runs the live sales advisor sequence (never a hand-typed list — see aii-advisors
  Step 1.5) in the user's voice, produces the guide content
  as JSON, then runs the locked builder script to turn it into the live guide. Also regenerates an
  existing guide with new details. The brain is the engine — no queue, no worker, no artifact
  polling. Sibling of the Call Debrief (post-call); this is the pre-call half.
---

# Call Guide — Pre-Call Prep Loop

You are the engine. The Call Guide preps a call before it happens; the Debrief is its mirror — it processes the call after it happened. A weak artifact used to mail this job to a background worker through a queue — that's gone. You read the context yourself, run the advisors yourself, and produce the finished guide yourself. The only thing you do NOT hand-write is the HTML shell — a locked builder script does that so the formatting never drifts.

Two jobs split clean:
- **Content** = the guide JSON (you write this).
- **Shell** = the interactive HTML (`build-call-guide.js` writes this — never hand-edit it).

This skill ships with a locked builder script (`build-call-guide.js`) in the skill folder. Resolve its real path from this session's path map before running it.

---

## Step 1 — Gather the context (don't make the user repeat what's already known)

You may be triggered three ways: (a) the user asks in chat, (b) the artifact handed them a formatted prompt they pasted, (c) a scheduled sweep found an upcoming meeting. In all cases, pull what you can yourself before asking them anything.

1. **Find the person + company in the CRM.** Use the CRM connector to find the lead, prior context (note history), and the deal and its goal. Read the real records — don't guess.
2. **Find the meeting.** Use the calendar connector to get the exact date/time, title, and attendees. The date/time + person is the key that links the guide file to the meeting.
   **Capture the link keys now** — you'll write them into a pointer file in Step 4.5 so the daily brief never has to re-guess the filename later. Hold on to: the **calendar `eventId`**, the meeting **date** (`YYYYMMDD`), every outside attendee **email**, and the **email domain**. If a button handed you a pasted prompt, those keys are on a `Link keys:` line in it — use them verbatim. If you're triggered another way, read them off the calendar event.
3. **Check for a transcript** of any prior call with this person (meeting-transcript connector, matched by attendee email).
4. **If the person is NOT in the CRM:** don't stop and don't make the user go create them. Build from the details they gave you, and note in the guide's "what you already said" that they're not yet in the CRM.

**Only ask the user something if a fact that changes the guide is genuinely missing** (e.g., the goal of the call is unclear and you can't infer it). Ask in one pop-up, one question, plain language. Otherwise proceed.

---

## Step 2 — Run the advisors (this is what makes it good, not generic)

**Do not hand-type the advisor list.** Resolve it live, the same way `aii-advisors` Step 1.5 does:
pull the `sales` sequence from the sequence store, BY CATEGORY (`advisor-map` / `resolve_sequence`,
per Core §11 rule 4), and run exactly the advisors it returns, in the order it returns them. That
store is the one home for who's on the bench and what order they run in — this skill never restates
it, because a restated list drifts the moment the real one changes and nobody remembers to come back
here.

If the store returns no sequence for `sales`, say so and route it to the adjudication gate
(`aii-advisors` Step 3) — never fall back to a remembered or guessed list.

Every entry in `words` is the exact words the user would say out loud: direct, plain, specific. No corporate filler. Honor any confidentiality rules in the user's reference files. **The advisor's reasoning goes in `why` and the advisor's NAME goes in `lens`, which is carried and never shown on the live screen.**

---

## Step 3 — Produce the guide JSON (the locked schema)

Output ONE valid JSON object in exactly this shape. All fields present; arrays may vary in length.

**A section authors FIVE fields, separately — never two prose blobs.** Ruled by the operator 2026-08-07; the contract is `04 — Daily Operating System/specs/Call-Guide-Content-SPEC-v1.0.md` §3.1 and the live coverage board it feeds is §9. Every item in `sections[]`, `objectionHandlers[]`, `hookSection` and `closeSection` carries:

| field | type | what it must do |
|---|---|---|
| `words` | string[] | **the deliverable.** The exact words to say, ONE ENTRY PER SPOKEN PARAGRAPH. Rendered at full reading size on the left of the card. `<strong></strong>` is allowed inside an entry. |
| `when` | string | the moment to reach for it — a TRIGGER, not a duration. *"First 90 seconds, before anything else."* / *"The second they say the budget is already set."* |
| `why` | string | what the move is doing. May carry an advisor's reasoning; **must never name the advisor** — that is what `lens` is for. |
| `do` | string[] | the crisp DOs, one per line. |
| `dont` | string[] | the crisp DON'Ts, one per line. |
| `lens` | string | *optional.* The advisor whose lens produced `why`. **Carried, never rendered live.** |
| `label` · `hint` · `mins` · `kind` · `lane` | string | *optional.* The board row's short name, its one-line hint, its timing, its `must`/`if`/`play` tag, and its lane override. |

**Two authoring standards. An item fails if it misses either.**

- **In the room, at that second (Freese).** Every `do` and `dont` must name something the user could SAY OR DO while the call is still live. *"Raise it in the follow-up"*, *"put it in the one-pager"*, *"bring it to the next call"* are NEXT STEPS — they belong in `followups`, and may be added AFTER an in-room move but never stand in place of one. If the moment looks unrecoverable, name the EARLIER in-call move that would have prevented it; "nothing could be done in the room" is a failed derivation, not a finding. (Same rule the Call Debrief already runs on its `toImprove[].fix`.)
- **It survives a glance (Klaff).** `words` is what the user reads with a human looking at them. One idea per entry, short lines, no clause anyone has to re-read. Anything that makes them break eye contact to hunt is the defect this contract exists to end.

**Never write `advisorRead` or `sayThis` into a NEW guide.** The builder still READS them, so guides authored before this contract keep opening — but it renders them under a visible *"authored on the old contract"* marker and CANNOT produce the do/don't rail from them, because splitting a prose blob is guesswork and a builder that guesses is a hand-made artifact wearing a builder's name. A guide you author carrying those two keys is a build FAILURE, not a style choice.

```json
{
  "header": { "title": "Call Guide — <Name>", "subtitle": "<role> · <how connected> · Goal: <one phrase>" },
  "contextBar": [ {"label":"Intro via","value":"..."}, {"label":"Role","value":"..."}, {"label":"Hot objections","value":"..."}, {"label":"Win condition","value":"..."} ],
  "glance": [ {"label":"What they do","value":"2-3 sentences"}, {"label":"Why they're relevant","value":"..."}, {"label":"Where they're stuck","value":"..."}, {"label":"What you already said","value":"..."} ],
  "tags": [ {"text":"...","color":"green"}, {"text":"...","color":"yellow"}, {"text":"...","color":"red"} ],
  "sections": [ {"id":"open","title":"Open — reconnect and reframe","label":"Open","hint":"reconnect, then reframe","mins":"2 min","kind":"must","words":["exact words, one entry per spoken paragraph"],"when":"the trigger that says reach for this now","why":"what the move is doing — never name the advisor here","do":["a move they could make in the room, at that second"],"dont":["a move they must NOT make in the room, at that second"],"lens":"Carnegie"} ],
  "objectionHandlers": [ {"id":"obj1","title":"Objection — <topic>","label":"<topic>","kind":"play","concern":"exact words they'll raise","words":["the reframe in full, one entry per paragraph, <strong></strong> on key phrases"],"when":"the signal that this objection has gone live","why":"why this reframe works","do":["..."],"dont":["..."],"lens":"Klaff"} ],
  "hookSection": {"id":"hook","title":"The hook — why this matters for them","mins":"1 min","words":["..."],"when":"the opening they give you to land it","why":"why they care beyond the product","do":["..."],"dont":["..."],"lens":"Carnegie"},
  "closeSection": {"id":"close","title":"The close","mins":"This is the whole call","words":["the ask, in full, exactly as they would say it"],"when":"the moment to stop selling and ask","why":"soft yes vs real yes","do":["..."],"dont":["..."],"lens":"Freese","question":"the one closing question, verbatim","branches":[{"if":"If yes","then":"..."},{"if":"If maybe","then":"..."},{"if":"If no","then":"graceful exit"}],"icp":"ICP criteria to confirm fit"},
  "followups": [ "specific action 1", "specific action 2", "Log call + outcome in the CRM" ]
}
```

Write the JSON to a temp file, e.g. `guide.json`.

---

## Step 4 — Build the shell + save to the client folder

1. Write `config.json`:
```json
{ "guideId":"<person-slug>-<YYYYMMDD>", "eventId":"<calendar event id>", "meetingDate":"<YYYYMMDD>", "prospect":"<Name>", "company":"<Company>", "domain":"<their email domain>", "leadId":"<crm lead id — REQUIRED, see below>", "noLeadReason":"<omit entirely unless leadId is empty>", "email":"<their email or empty>", "crmName":"<your CRM>" }

> ⚠ **`leadId` IS REQUIRED. THE BUILD IS REFUSED WITHOUT IT — changed 2026-08-11, and this REVERSES what this line used to say.** It read `"<crm lead id or empty>"`, so a session doing exactly as instructed produced a guide whose **"Log Call Notes" button silently copied to the clipboard instead of saving** — the operator discovered it mid-call. Measured on real files: **12 of 20 guides** on disk carried an empty one, 8 of them from a single build run. Look up the lead in the CRM before you build; the id exists for almost every call.
>
> **If the call genuinely has no single lead** — a cohort, a group session, a room of several companies — **say so on purpose in `noLeadReason`**, in a real sentence a human wrote (e.g. *"EIT cohort call — four member companies, no single lead to attach"*). A placeholder like `"n/a"` is refused by length, deliberately. **The reason the declaration exists rather than a simple exemption:** the entire defect was that a deliberate empty and an accidental one looked identical, and nothing that restores that ambiguity is an acceptable fix.
>
> **What this reverses, named so nobody re-derives the old line as a rule.** `Log-Call-Notes-Modal-SPEC` §4 rule 4 listed *"a guide with no `leadId` on it"* among *"the only legitimate fallbacks"* — which is why this was not treated as a bug for six days: the builder was obeying the spec. Eleven lines below it, in the same section, sits the operator's own ruling from the same day: *"The user should never have to DO something extra the AI should be able to do for them."* A guide that tells him to paste his notes into Claude by hand is what that ruling forbids. The section contradicted itself and the permissive half shipped. The spec is corrected in the same batch as this line.
```
**The link keys are REQUIRED (2026-08-05, L3).** `eventId` and `meetingDate` are not optional
extras — they are what the finished document is filed under, and **a document that cannot be filed
does not get to exist.** That is deliberate: an unregistered call document is invisible to the
Command Center and looks IDENTICAL to one that was never built. You captured both in Step 2; put
them in the config. `meetingDate` must equal the `YYYYMMDD` slot in the filename.

> ⚠ **CORRECTED 2026-08-06.** This paragraph used to say *"the builder registers the file in
> `call_doc` the instant it writes it, and a registration that fails deletes the file it just
> built."* That stopped being true when the builder's own database connection was removed (it
> read a raw database password off local disk, which is why this skill could not ship). The old
> wording is quoted rather than deleted, because a session that remembers it would run one
> command, see no error, and believe the document was filed when it was not.
2. **Build and file it — three moves, and the document only gets its real name on the third.**
   You are the wire between the builder and the store: the builder has no database connection of
   its own, on purpose. Resolve the real mounted path for this session.

   **(a) Build.** This writes the HTML under a QUARANTINE name and prints a plan on stdout:
```
node "<skill-folder>/build-call-guide.js" guide.json config.json out.html
```
   The plan carries `sql`, `params`, `planPath`, `resultPath` and `quarantinePath`. The file on
   disk right now is **not** a call document — its name deliberately does not match the
   `<YYYYMMDD>_callguide_` convention, so nothing downstream can mistake it for one.

   **(b) Run the plan's `sql` with its `params`** through the board connector, resolved BY
   CATEGORY (Core §11 rule 4) — never by a connector name. **Save the FULL result** to the
   `resultPath` the plan gave you. The statement returns exactly one row: `outcome='registered'`
   or `outcome='refused'` with the reason. Do not summarise it; hand the whole thing back.

   **(c) Settle.** This is the only step that gives the document its real name:
```
node "<skill-folder>/register-call-doc.js" --settle "<planPath>" --result "<resultPath>"
```
   Registered → the file is renamed to `out.html`. Refused, or zero rows, or a row for a
   different document → **the quarantine file is DELETED and this exits non-zero.** That is the
   feature, not a failure to work around. Fix what the reason says and build again.

   **Never skip (c) and rename the file yourself.** The rename IS the proof that the row landed.
3. **Save the finished `out.html` into the client folder**, named by the meeting so it links cleanly:
```
<clients-root>/<ClientName>/<ProspectCompany>/<YYYYMMDD>_callguide_<person>_<calendar-invite-name>.html
```
(A guide and its debrief share the `<ProspectCompany>` folder and the meeting name, so they read as a matched pair: `..._callguide_<person>_...` and `..._debrief_<person>_...`.) Create the `<ProspectCompany>` subfolder if it doesn't exist.

---

## Step 4.5 — Record the meeting→file link (the pointer — DO NOT SKIP)

This is the spine of the Discovery Fix. The daily-brief modal used to *re-guess* the guide's filename from the calendar invite, which broke on email-style invites. Now you record where the guide lives, once, at build time, and the modal just looks it up.

After the guide HTML is saved, write **one tiny pointer file** to the file store:

- **Folder:** `Artifacts/_indexes/` at the workspace root. Find its folder id by searching for a folder titled `_indexes`; if it doesn't exist, create it under the `Artifacts` folder.
- **Filename:** `guideptr_<eventId>.json` when you have the calendar eventId; otherwise `guideptr_<YYYYMMDD>_<domain>.json` (domain with dots → keep them).
- **Write it as plain text, no conversion:** create the file with the JSON below as raw text content, MIME type `text/plain`, and disable any auto-conversion to a native doc type, with the parent set to the `_indexes` folder id. (Some file stores would otherwise turn it into a native document — see the file-store-limits note.)
- **Contents:**
  ```json
  {
    "eventId": "<calendar event id, if known>",
    "date": "YYYYMMDD",
    "domain": "<email domain, e.g. example.com>",
    "emails": ["<each outside attendee email>"],
    "person": "<prospect name>",
    "channel": "<which channel/folder this lives under>",
    "fileId": "<file-store id of the saved guide>",
    "fileTitle": "<the saved .html filename>",
    "viewUrl": "<the guide's file-store view URL>",
    "localPath": "<the ABSOLUTE local filesystem path where you saved the guide .html — e.g. /Users/<user>/.../Calls/<file>.html>",
    "createdAt": "<ISO timestamp>"
  }
  ```
- **`localPath` is what makes the guide open as a real page, not code.** A file store shows raw HTML *source* for an `.html` file, so the modal can't open the file-store URL on a call. Instead it opens `file://<localPath>` — a rendered browser tab the user can park behind their camera. Record the exact path you wrote the file to (the path your file tool used). Do **not** hardcode anyone's home folder in the skill: each machine writes its own `localPath`, so it's automatically correct for whoever runs that instance. If you only have the file-store URL and no local path, still write the pointer — the modal falls back to the file-store URL.
- **One writer rule:** you (the skill) are the only thing that writes pointers. The button and the scheduled sweep both reach the guide through you, so both get the pointer for free.
- **Some file stores can't overwrite** — that's why it's one file per guide, not one master index. On a **regenerate** (Step 5), the eventId/date+domain are the same, so the pointer filename is the same; if a write collides, that's fine — the old pointer already points at the same meeting. (You may delete the stale pointer first if the fileId changed.)

---

## Step 4.6 — Private prep block on the calendar (optional, safe version only)

Only do this if the user asked for calendar reach. **Hard rule: no potential attendee may ever see the guide or that one exists.**

- **NEVER** put the link on the shared meeting event — its description and attachments are visible to every invited guest.
- Create a **separate event on the user's calendar with zero guests**, titled `🔒 Prep — <person> guide`, with the guide `viewUrl` in its description.
- **Start it 5 minutes before** the meeting so it sits right ahead of the call.
- Mark it **FREE** (`transparency: transparent`) so it never blocks the user's (or the system's) scheduling.
- The guide file itself stays shared only with the user, so even a leaked link hits a "request access" wall.

---

## Step 5 — Regenerate (existing guide + new details)

**READ THE STORED GUIDE FIRST. DO NOT RE-DERIVE IT.** Every guide built from 2026-08-07 forward keeps its full content JSON in the store as versioned KEPT STATE, and the locked builder can rebuild the HTML straight from it. Re-reading the CRM, re-reading the calendar and re-running the advisor sequence when the authored guide is already sitting one query away is the single most expensive mistake this skill can make — measured on this estate: it turns a re-render into a twenty-minute re-authoring.

> ⚠ **THIS STEP USED TO READ, IN FULL:** *"Same flow, with two changes: read the existing guide's context first, fold in the user's new details (what changed, what they learned), and **overwrite the same filename** so the meeting link stays intact. Don't spawn a second file for the same meeting."*
> **IT IS QUOTED RATHER THAN DELETED BECAUSE IT WAS NOT WRONG, IT WAS INCOMPLETE — and the missing half was the expensive half.** *"Read the existing guide's context"* was read for 27 days as *read the rendered HTML and start over*, which is what it literally permits. The operator ruled the correct behaviour on **2026-08-05**: `dr_callguide_refresh_is_per_segment_20260805` D3 — *"THE GUIDE JSON IS KEPT STATE, not a build artifact — no stored JSON means no per-segment refresh, ever"* — and `dr_callguide_regen_is_server_side_20260805` D4, server-side, never the clipboard. The store, the builder flags and the server door were all built by 2026-08-07. **This body was the only thing that never learned they existed.**

**THE THREE MOVES — the same plan / result / settle seam as a first build, because the builder still has no database connection of its own and you are still the wire.**

**(a) Ask for the read plan.**
```
node "<skill-folder>/build-call-guide.js" --regen-plan <docId>
```
It prints `{sql, params}`. `docId` is `call_doc.doc_id` — it is on the guide page itself as `CONFIG.docId`, and the daily brief carries it.

**(b) Run that `sql` with its `params`** through the board connector, resolved BY CATEGORY (Core §11 rule 4), and **save the FULL result** — do not summarise it and do not trim the JSON. The row carries the kept `guide_json` and its version.

**(c) Rebuild from it.**
```
node "<skill-folder>/build-call-guide.js" --regen <readplan.json> --rows <result.json>
```
It re-renders from the stored content, bumps the kept version, and stamps the change note `regenerated from kept state`. Then file it exactly as Step 4 does — **register → settle → file → confirm is still ONE unit of work**, and Step 4.5's pointer still gets written.

**FOLD THE NEW DETAILS IN PER SEGMENT — never by rewriting the guide.** Change only the segments the operator's notes actually touch, carry every untouched segment through unchanged, and mark what changed. A regeneration that rewrites a segment nobody commented on has thrown away authored work and called it an update. (Ruling D1, same 2026-08-05 card: auto-fix anything the note touches, and every auto-changed segment is VISIBLY MARKED with one-click revert.)

⛔ **WHEN THERE IS NO KEPT STATE — SAY SO OUT LOUD AND NEVER FALL BACK SILENTLY.** 39 of the 82 guides on this estate were built before 2026-08-07 and have no stored JSON; for those the full re-derivation in Steps 1–4 is the only option and it is correct. Tell the operator in one line that this guide predates kept state and is being rebuilt from scratch — so a twenty-minute rebuild is never mistaken for the normal cost of an update.

⚠ **DO NOT TELL THE OPERATOR TO "JUST CLICK UPDATE ON THE GUIDE."** The live page's *"Update this guide"* button POSTs to the Command Center and it **refuses on a `file://` page by design** — a guide opened straight from the Mac has no session cookie and cannot sign in. Since Step 4.5's pointer deliberately opens guides at `file://<localPath>` (a file store shows raw HTML source instead of a page), the one-click path is unreachable in the way guides are normally opened. It works only on a guide the Command Center is SERVING at `/api/cc/drive?mode=serve&fileId=…`. **And the queue that button writes to has no scheduled claimer** — an ask can sit `pending` indefinitely. Until both are fixed, the route above is the working one.

---

## Step 6 — Prove it, then report (output-verified — a claim is not proof)

A guide is NOT done when the HTML saves. It is done only when **both REQUIRED OUTPUTS below are confirmed to exist** — because on an unattended sweep run nobody is watching, and a pointer that silently failed to write leaves the daily-brief modal guessing the filename (the exact break the Discovery Fix exists to kill).

1. **Guide HTML** — exists at the saved path and is non-trivial in size (re-read or stat it).
2. **Pointer** — the `guideptr_*.json` landed in `Artifacts/_indexes/` (capture the fileId on write AND re-find it by title). **A missing pointer is a build FAILURE, not a footnote** — retry the write once; if it still fails, report the guide as INCOMPLETE, not done.

Each output is either CONFIRMED (id captured / re-found) or a FAILURE — "attempted but unconfirmed" is a failure. Then report the path in one line **plus a one-line proof checklist** (HTML ✓, pointer ✓ + id), and offer to open it. Don't narrate the steps. (This is the `aii-prove-it` discipline — a claim is not proof; the check is the proof.)

If a transcript was expected but isn't in yet, note that the matching **Call Debrief** can be run once it lands.

---

## When NOT to use

Pure conversation, or when the user only wants quick talking points (not a saved interactive guide). For after-the-call processing, that's the Call Debrief skill, not this one.

---

*History (v1.0–v1.1 provenance) lives on the board — not in this always-loaded body (Context-Economy Law 3). Behavior above is current.*
