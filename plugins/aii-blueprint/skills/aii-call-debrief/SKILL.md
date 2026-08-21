---
name: aii-call-debrief
description: >
  AI Integrator Blueprint: Call Debrief. Builds a deep, advisor-driven debrief of a call that
  already happened and saves it as a standalone interactive HTML file in the client folder. Use
  whenever the user says "debrief," "debrief my call with [person/company]," "I just got off a
  call with [name]," "what did I learn on the [company] call," or when a transcript lands for a
  call that has no debrief yet. Reads the transcript, the user's own notes, and the
  prospect/company/deal from the CRM, resolves and runs the live sales advisor sequence (never a
  hand-typed list — see aii-advisors Step 1.5) plus Allen for next actions in the user's voice,
  flags any place the notes and the transcript
  disagree, produces the debrief content as JSON, then runs the locked builder script to turn it
  into the live debrief. The brain is the engine — no queue, no worker, no artifact polling.
  Sibling of the Call Guide (pre-call); this is the post-call half.
---

# Call Debrief — After-Call Learning Loop

You are the engine. The Call Guide preps a call before it happens; the Debrief is its mirror — it processes the call after it happened. Same locked-shell rule: you write only the content (the debrief JSON), the builder writes the HTML. Never hand-write the HTML.

Two jobs split clean:
- **Content** = the debrief JSON (you write this).
- **Shell** = the interactive HTML (`build-call-debrief.js` writes this — never hand-edit it).

This skill ships with a locked builder script (`build-call-debrief.js`) in the skill folder. Resolve its real path from this session's path map before running it.

---

## Step 1 — Gather all three sources (don't write from one)

A debrief merges up to **three** inputs. Pull every one you can before writing a word:

1. **The transcript.** From the meeting-transcript tool — match the call to the person by attendee email (titles and dates on transcript tools are loose). This is the record of what was actually said.
2. **The user's own notes.** Whatever they pasted or jotted *about this call* (live notes, a quick "here's how it went"). This is their read. A pre-call referral brief, CRM history, or a call guide is NOT the user's own notes — that's prior context (source 3), not their read of how the call went.
3. **The CRM + prior context.** Search the CRM for the person, their note history, and the deal and its goal. If a **call guide** exists for this meeting, read it — the guide's goal is what you measure "plan vs reality" against.

If the person isn't in the CRM, build from what you have and note it. If there's no transcript yet, you can still debrief from the user's notes — say in the output that it's notes-only and the transcript can be folded in when it lands.

**Only ask the user something if a fact that changes the debrief is genuinely missing.** One pop-up, one question, plain language. Otherwise proceed.

**Source-completeness check (don't go silent).** A finished call should have BOTH a transcript and the user's own notes *about this call*. Test for each one specifically — do NOT let other material stand in for it. A pre-call referral brief, CRM history, or a call guide does NOT count as the user's notes; if those exist but the user wrote no notes of their own on this call, notes still count as MISSING. If exactly one of the two is present, build from what you have AND flag the gap — never quietly proceed as if nothing's missing. Say in the output which source is missing, and in Step 7 drop a `⚑ NEEDS [USER]` flag naming it (e.g. "transcript captured but no call notes from you" or "your notes are in but no transcript landed"). If NEITHER is present, do not build — flag that the call has no source material at all.

---

## Step 2 — Run the advisors (this is what makes it good, not generic)

**Do not hand-type the advisor list.** Resolve it live, the same way `aii-advisors` Step 1.5 does:
pull the `sales` sequence from the sequence store, BY CATEGORY (`advisor-map` / `resolve_sequence`,
per Core §11 rule 4), and apply exactly the advisors it returns, in the order it returns them —
reading back on what already happened rather than opening one. If the store returns no sequence for
`sales`, say so and route it to the adjudication gate (`aii-advisors` Step 3) — never fall back to a
remembered or guessed list.

Then, separately: **David Allen (GTD)** — next actions. Turn the call into clear, specific next
steps. Allen sits outside the sales sequence on purpose — he isn't evaluating how the call went, he's
converting it into what happens next.

Be specific and honest — name the actual moment, quote the actual line. Generic praise is worthless. Honor any confidentiality rules in the user's reference files.

---

## Step 3 — The conflict gate (do not skip)

Compare the three sources pairwise (notes vs transcript, pre-call vs live, etc.). **Wherever two sources genuinely disagree on something that matters** — how committed they are, what was promised, who decides — put it in the `conflicts` array. Show both readings and how to settle it. **Never silently pick one.** If the sources agree, leave `conflicts` empty and move on — the gate fires only on real conflict.

---

## Step 4 — Auto-done / Needs-you / Needs-info (the next-steps split)

Sort every follow-up into three buckets:
- **autoDone** — internal things you (the system) already did or can do now: logged the outcome, **created the follow-up email as a real draft in the user's email (say it's in their drafts)**, set a build to-do. State where it landed.
- **needsYou** — anything that leaves the user's name on it (an external send) or is their judgment call (pricing, packaging). These are theirs to approve.
- **needsInfo** — things blocked waiting on someone else; name who and what's needed.

**Follow-up emails are STAGED AS REAL DRAFTS — created in the user's drafts folder, never sent.** "Staged" means an actual draft exists where they look for it; it does NOT mean copy-only-in-the-document. Always create the draft (Step 7) AND keep the full text in the debrief so they can read, tweak, and send it themselves. Never auto-send anything external.

---

## Step 4b — Write the capture questions (the loop's fuel)

This is the **Correction → Training Loop's capture affordance** (Core §8) landing on the debrief surface — the *why* that loop requires, collected here. Core §8 governs **whether and when** to capture; this step governs **how to write one worth answering.**

Two signals a transcript **cannot** see, and they are the only reason the loop can improve a future guide:

1. **The trigger** — what pulled the user off their plan.
2. **The reception** — did it actually click for the other side, or was it a polite nod?

Write **1–3** questions into `captureQuestions`. Fewer, sharper questions beat a form, and **zero is a valid answer** (Core §8 — a vague question is worse than none). **If you mean zero, write `captureQuestions: []`** — an empty array is a deliberate zero and builds silently. See the warning below for why saying it out loud matters.

**THREE FIELDS ARE REQUIRED ON EVERY QUESTION. A question missing any one of them is DELETED by the builder, not repaired:** `text` · `questionCode` · **`beachhead`**.

**`beachhead` is the one that gets forgotten, so it is stated here and not only in the schema.** It is a closed set of exactly three values, read from the `call_beachhead` table and never invented:

| value | what it means |
|---|---|
| `open_two_unit` | the open, with two companies in the room |
| `landing_example` | the example that lands the ah-ha |
| `general` | not tied to a beachhead — a call-level reception or trigger answer |

Most questions are `general`. Use it rather than omitting the field.

> ⚠ **ADDED 2026-08-11, and it is a correction, not a decoration.** Until this date `beachhead` appeared **zero times in this entire skill body** while the builder silently required it. The result was exactly what that arrangement produces: the brain wrote good questions, the builder deleted every one of them for missing a field nobody had been told about, and shipped a debrief with no question panel at all — reporting success. Measured on real files: **3 of 15 debriefs** shipped that way (Cynthia Davis 2026-08-10, Tim Fitzpatrick 2026-08-06, LAGE cohort 2026-07-30). It survived a month because *"zero is a valid answer"* is true, so an all-deleted result and a deliberate empty array produced **byte-identical output** — indistinguishable to the operator, to this skill's own self-check #6, and to any session re-reading its work. The builder now REFUSES that case (non-zero in, zero out) and names each dropped question. Both halves shipped in one batch: if you are reading this paragraph and the builder does not refuse, one of the two did not land. This is the 4th instance of one defect class — *a field the finished page needs is optional at the gate and unstated in the instructions the author reads*; the other three were `logWebhookUrl`, `apiBase` and `leadId`.

**Four hard rules — every question, no exceptions:**

1. **Plain language, 10-year-old standard.** No jargon, no framework words. They should not have to decode it.
2. **Name the habit plainly**, tied to the user's known blind spots from their own reference files. Say the thing.
3. **Anchored to the transcript.** Quote the actual line and give a pointer that opens that exact moment. An unanchored question makes them hunt, and they won't.
4. **Specific or nothing.** Name the moment, the example, the objection. A question about how the call *felt* is not a question.

**Answer buttons are supplied by the builder — never invent choices.** Never put a free-text box in a question; every answer is a tap. The one exception is a *"something else"* escape, which then requires a note.

**If a question asks which approved option the user reached for, read those options live from the Content Library (§7 Part 3) — this skill holds none of them.** Registered, active options only, named verbatim. If none are registered for that topic, **omit the question** rather than shipping one with nothing to choose.

**Placement is not cosmetic:** the builder renders this section **above** your analysis. Core §8, *ask before you tell.*

---

## Step 4c — The `toImprove` contract

Every `fix` must satisfy **Core §9's look-back rule**: name what the user could have **said or done while the call was still live.** Best form — the actual words, in their voice, in quotes.

- Downstream repair — *"raise it in the follow-up," "put it in the one-sheet," "bring it to the next call"* — is **not a fix.** It is a next step. Put it in `nextSteps` / `followups`, where it belongs.
- A fix MAY add the downstream repair **after** the in-room move. Never instead of it.
- **The test, on every item before you build:** *could they have done this during the call?* If no, rewrite it. An item that fails does not ship (Step 9 item 7 refuses it).
- **No moment is unrecoverable.** If the second was already gone, name the **earlier** in-call move that would have prevented it.
- **`point` names the moment. `fix` names the move.** Re-describing the gap, or explaining why it matters, is not a fix.

**Failing vs. passing, same gap:**

- ❌ *"The person who could approve the partnership went quiet for the part that mattered. Name it in the follow-up — ask for twenty minutes with them specifically, framed as the partnership conversation."* — every word of that is an email. The user reads it and asks **"what should I have done?"**
- ✅ *"The moment their colleague pulled them back in was your opening — go straight at them while they are still on the line: 'You're the one who would have to live with this. What would have to be true for it to be worth your team's time?' A decision-maker who has gone quiet is either bored or unconvinced, and a question they have to answer is the only way to find out which. Ask for the twenty minutes in the follow-up too — but the room was where you could have found out."*

---

## Step 4d — Feed the voice profile

The debrief is the one moment the system holds **both** the raw record **and** the user's own read of it — exactly the harvest point Voice Capture names (`aii-voice-capture`, Step 3). Run that harvest here, under its floors: **only the user's own turns**, **no quote no trait**, **one call one vote**.

**Reusable lines are not voice.** This captures *how they sound*, not *what to say*. If a line is good enough to hand them again, register it in the Content Library (§7 Part 3).

Report it in **one plain line**, including how many calls the profile now runs on — and if that is under the pattern floor, say so rather than letting it read as settled.

---

## Step 5 — Produce the debrief JSON (the locked schema)

Output ONE valid JSON object in exactly this shape. All keys present; arrays may be empty (`conflicts` especially). Use `\n\n` for paragraph breaks; `<strong></strong>` allowed inside `point`/`draft`/`why`.

```json
{
  "header": { "title": "Call Debrief — <Name>", "subtitle": "<role>, <Company> · Called <date> · Outcome: <one phrase>" },
  "contextBar": [ {"label":"Call","value":"..."}, {"label":"Length","value":"..."}, {"label":"Outcome","value":"..."}, {"label":"Sources","value":"Transcript + your notes"} ],
  "planVsReality": { "planned":"what the call set out to do (from the guide/goal)", "happened":"what actually happened", "verdict":"on-track | partial | off-plan" },
  "conflicts": [ {"topic":"...","operatorSaid":"what your notes say","transcriptSaid":"what the transcript shows","resolve":"how to settle it before logging"} ],
  "captureQuestions": [ {"questionCode":"reception|trigger|repertoire","beachhead":"general|open_two_unit|landing_example","text":"the question, in plain words, naming the actual moment","why":"one line — why only they can answer this","anchorMs":762000,"anchorQuote":"the real line from the transcript, trimmed","transcriptUrl":"deep link to that moment","askAttribution":true,"options":[]} ],
  "wentWell": [ {"point":"specific moment","why":"named-advisor read of why it worked"} ],
  "toImprove": [ {"point":"the specific moment","fix":"named-advisor fix that names what the user could have SAID OR DONE while the call was still live — Core §9, non-negotiable"} ],
  "prospectRead": "where their head is now — 2-4 sentences, what they're really blocked on",
  "nextCallGoal": "the one goal for the next conversation",
  "nextSteps": {
    "autoDone": [ "internal thing done + where it landed" ],
    "needsYou": [ {"action":"external send / judgment call","why":"why it's yours to approve"} ],
    "needsInfo": [ {"waitingOn":"who/what","for":"what you need from them"} ]
  },
  "followups": [ {"channel":"Email|Text|Call","to":"<name>","subject":"<if email>","draft":"the full draft text (this becomes the real Gmail/email draft body in Step 7), use \\n\\n for breaks"} ],
  "nextGuideSeed": "one tight paragraph seeding the next call guide — goal + where they're stuck + the play",
  "crmLog": "the clean summary to log to the CRM — outcome, what held/slipped, blocker, next, any watch-out"
}
```

Write the JSON to a temp file, e.g. `debrief.json`.

---

## Step 6 — Build the shell + save to the client folder

1. Write `config.json`:
```json
{ "debriefId":"<person-slug>-<YYYYMMDD>", "eventId":"<calendar event id>", "meetingDate":"<YYYYMMDD>", "callRef":"<the call/transcript id>", "prospect":"<Name>", "company":"<Company>", "domain":"<their email domain>", "leadId":"<crm lead id — REQUIRED, see below>", "noLeadReason":"<omit entirely unless leadId is empty>", "email":"<their email or empty>", "crmName":"<your CRM>" }
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
node "<skill-folder>/build-call-debrief.js" debrief.json config.json out.html
```
   The plan carries `sql`, `params`, `planPath`, `resultPath` and `quarantinePath`. The file on
   disk right now is **not** a call document — its name deliberately does not match the
   `<YYYYMMDD>_debrief_` convention, so nothing downstream can mistake it for one.

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
3. **Save the finished `out.html` into the client folder**, named by the call so it sits next to its guide:
```
<clients-root>/<ClientName>/<ProspectCompany>/<YYYYMMDD>_debrief_<person>_<calendar-invite-name>.html
```
(Same convention as the guide — a guide and its debrief share the `<ProspectCompany>` folder and the meeting name, so they read as a matched pair: `..._callguide_<person>_...` and `..._debrief_<person>_...`.) Create the `<ProspectCompany>` subfolder if it doesn't exist.

---

## Step 7 — Act on what the debrief found

The debrief isn't just a document — it should leave the workspace better than it found it. **The four side-effects below are this build's REQUIRED OUTPUTS, not nice-to-haves.** Step 9 confirms each one actually landed before the build is allowed to say "done" — so do them here, capturing the id each create call returns:
- **Log it to the CRM.** Write the `crmLog` as a note on the prospect's lead (one note on the lead — shows on both the company timeline and the contact). This is internal, so do it.
- **Stage the follow-up as a REAL email draft — required, not optional — and it must be UNSENDABLE BY REFLEX.** For every Email item in `followups`, create an actual draft in the user's email tool so it lands in their drafts folder ready to review and send. NEVER send it. The in-HTML copy block is a convenience, not a substitute — the draft must exist in the drafts folder. If the email connector can't attach files, put any attachment in as a link in the body.
  - ⚠ **The recipients come OUT of the send bar and are listed inside the body instead, and the draft carries a SYSTEM NOTE block.** Resolve the exact shape from the spec map, slice `follow-through` — do not write it from memory and do not restate it here. Every other element of that rule is advisory; taking the recipients out of the send bar is the only one that makes an accidental send physically impossible rather than merely unlikely. A draft that LOOKS finished gets sent, and what it costs is a relationship the user already has, not a rework.
  - This is the same rule for every drafter in the fleet, not a debrief special case. If you are reading this in a skill that drafts email and it is absent there, that skill is out of date — it is not evidence the rule changed.
- **Stage calendar invites, don't fire them.** Any follow-up call invite is pre-seeded for one-click OK and always includes the meeting-transcript bot — created with notifications OFF so the other party isn't emailed until the user sends it. Never fired silently.
- **A promised DOCUMENT is not a follow-up email — route it.** If any next action promises the other side something they will READ that does not exist yet — a sheet, a one-pager, "I'll write something up for you" — that is collateral owed, and an email saying it is coming does not discharge it. Hand it to `aii-collateral-sheet`, which owns building it. If this run cannot reach the files, brand assets and renderer that builder needs, RAISE it as a named ⚑ flag naming what was promised and stop — **never report a document as produced when no file exists.** A promise to send an EXISTING file is not this; a promise to MAKE one is.
- **Surface the review + any missing source.** If the deal has a real lead, drop a `⚑ NEEDS [USER] — Review call debrief: <Name>` task on the lead so it shows up where the user already looks. If the source-completeness check (Step 1) found a missing transcript or missing notes, drop the `⚑ NEEDS [USER]` flag naming it here too. Skip gracefully if there's no lead.

---

## Step 8 — Regenerate (transcript landed after a notes-only debrief)

If a notes-only debrief already exists and the transcript now arrives: read the existing debrief, fold in the transcript (this is where the conflict gate earns its keep — notes vs transcript), and **overwrite the same filename** so the call's debrief stays one file. Don't spawn a second file for the same call.

---

## Step 9 — Prove it, then report (output-verified — a claim is not proof)

A debrief is NOT done when the HTML saves. It is done only when **every REQUIRED OUTPUT below is confirmed to exist.** This is the whole point of this step: on an unattended sweep run nobody is watching, so a side-effect that silently failed — connector hiccup, no lead, attachment size cap — has to surface as NOT-DONE, never slip through as "done."

For each required output the state is either **CONFIRMED** (you captured the id the create call returned, or you re-read / re-listed and found it) or **N/A — `<reason>`** (a stated reason it doesn't apply, e.g. "no lead in the CRM → note skipped"). **"Attempted but unconfirmed" is a FAILURE, not a pass.**

1. **Debrief HTML** — exists at the saved path and is non-trivial in size (re-read or stat it). Confirm the conflict gate rendered if there were conflicts.
2. **Email draft** — for every Email item in `followups`, a real draft exists (the id the create-draft call returned, or re-list drafts and find it). N/A only if there were no Email follow-ups.
3. **CRM note** — the `crmLog` note exists on the lead (its note id). N/A only if there's no lead.
4. **Review task** — the `⚑ NEEDS [USER] — Review call debrief` task exists on the lead (its task id). N/A only if there's no lead.
5. **Missing-source flag** — if Step 1's source-completeness check tripped, the `⚑ NEEDS [USER]` flag naming what's missing exists. N/A if both transcript and notes were present.
6. **Capture questions** — if `captureQuestions` is non-empty, the built HTML actually contains the panel AND it renders **above** the analysis (Core §8). N/A only if the array is empty. **Since 2026-08-11 the builder enforces the first half itself** (it refuses when a non-empty array renders zero questions), so this step is now a *confirmation* rather than the only thing standing between you and a silently empty debrief. **That change is the lesson, not a footnote:** this check was written correctly, would have caught the defect every time, and caught it zero times in three occurrences — because a check that runs only when a session remembers to run it is not a gate. When a self-check here proves load-bearing, move it into the builder and leave the confirmation behind.
7. **`toImprove` in-the-moment test** — read every `fix` back, one at a time, and answer: *could the user have done this while the call was still live?* Report how many you tested (e.g. "4/4 name an in-room move"). An item that fails is rewritten, never shipped. N/A only if `toImprove` is empty.
8. **Voice sightings** — the number of traits written from this call, plus the total number of calls the profile now runs on. Zero traits for a call that had a transcript is a **FAILURE**, not an N/A.

If any required output is a FAILURE: do NOT report done. Retry that one output once; if it still fails, say plainly which output did not land (the saved file is still useful — keep it). Then report the saved path in one line **plus a one-line proof checklist** — what landed with ids, what's N/A and why — and offer to open it. Don't narrate the steps. (This is the `aii-prove-it` discipline — a claim is not proof; the check is the proof.)

---

## When NOT to use

Pre-call prep — that's the Call Guide skill. Pure conversation, or when the user only wants a quick verbal takeaway (not a saved interactive debrief).

---

*History (v1.1–v1.3 provenance) lives on the board — not in this always-loaded body (Context-Economy Law 3). Behavior above is current.*
