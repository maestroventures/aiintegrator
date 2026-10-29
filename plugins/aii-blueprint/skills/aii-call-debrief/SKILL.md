---
name: aii-call-debrief
version: v1.9 (2026-10-29 — the guide's research joins the conflict gate and new learnings feed the next guide; Step 4g records the door they came in through and the offer that actually got their interest; the debrief is filed through the connector and never saved on the user's computer). Previously v1.8 (2026-10-26 — Step 4f keeps the buyer's own words, buyerWords). Before that v1.7 (2026-10-15 — what was said comes only from the full transcript, never a notetaker's summary; dr_we_read_the_full_transcript_never_a_transcription_service_summary_20261015)
description: >
  AI Integrator Blueprint: Call Debrief. Builds a deep, advisor-driven debrief of a call that
  already happened and files it as an interactive page through the connector. Use
  whenever the user says "debrief," "debrief my call with [person/company]," "I just got off a
  call with [name]," "what did I learn on the [company] call," or when a transcript lands for a
  call that has no debrief yet. Reads the full transcript, what we had on file (the invite, the
  call guide, earlier decisions), and the prospect/company/deal from the CRM, resolves and runs the live sales advisor sequence (never a
  hand-typed list — see aii-advisors Step 1.5) plus Allen for next actions in the user's voice,
  flags any place what we had on file and the full transcript
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

## Step 1 — Gather both sources (don't write from one)

A debrief sets **two** inputs side by side. Pull both before writing a word:

1. **The full transcript.** Through Blueprint: `do_action` "See meeting" (`occurred_after` / `occurred_before` around the call; `person_email` narrows the notetaker's meetings, not Google Meet calls) to find the call, then "See transcript" with its `meeting_id` — match the call to the person by attendee email (titles and dates on transcript tools are loose). This is the ONLY record of what was said. Read the full transcript, every line. **Never read the notetaker's or transcription service's summary, recap, action items or attendee summary as a source** — not for what was said, not for what was promised, not to fill a gap. *(Why, ruled 2026-10-15, `dr_we_read_the_full_transcript_never_a_transcription_service_summary_20261015`, the user's own words: "we read the full transcript -- full stop.")*
2. **What we had on file going in.** The invite and its attendee list, the call guide for this meeting, earlier decisions, and the CRM: the person, their note history, the deal and its goal. If a **call guide** exists, its goal is what you measure "plan vs reality" against. The user is not expected to take notes; if they tell you something about the call, use it, but never wait for it or flag that it is missing.

**Read mail and transcripts only through the AI Integrator connector; if it isn't connected, stop and say so - never fall back to another mail or notetaker tool.** *(Why, ruled 2026-10-12, `dr_skills_read_mail_and_transcripts_only_through_our_connector_20261012`: text read through Claude's own mail connector or a notetaker connected straight to Claude never reaches our server, so it is not marked as information-not-orders, and a send it leads to skips the Ask-first approval click.)*

**Look the person up first; only create if none is found.** Before you write any person or link any address for an attendee, look them up by every address you have (`do_action` "See person", or the store's person read). One match: use that person. None: create one. More than one: stop and say so; never create another. *(Why: a debrief once created a second record for a person instead of finding the first, and the duplicate hid their email from their record.)*

If the person isn't in the CRM, build from what you have and note it. If there's no transcript yet, wait for it; a summary or recap never stands in. If none will ever exist (no recorder joined), build from what is on file with `--no-transcript "<why>"`, record no promises, and say plainly that nothing said on the call is in it. Fold the transcript in if it lands later (Step 8).

**Only ask the user something if a fact that changes the debrief is genuinely missing.** One pop-up, one question, plain language. Otherwise proceed.

**Source-completeness check (don't go silent).** A finished call should have its full transcript. Test for it specifically — do NOT let other material stand in for it: a recap email, the notetaker's summary or action items, a pre-call brief or a call guide is not a transcript. If it is missing, say so in the output and in Step 7 drop a `⚑ NEEDS [USER]` flag naming it (e.g. "no transcript landed for this call"). Never flag missing notes from the user: they are not expected to take any. If there is neither a transcript nor anything on file about this call, do not build — flag that the call has no source material at all.

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

Compare what we had on file (the invite, the guide, earlier decisions, the CRM) with what the full transcript shows. **Wherever they genuinely disagree on something that matters** — who is coming, how committed they are, what was promised, who decides — put it in the `conflicts` array. Name the on-file source in `onFileSource` ("the invite", "the guide", "Oct 8 decision", "the CRM") and who said it and when in `saidBy` ("Sam, 23:26"); the page shows "On file (the invite)" vs "Said on the call (Sam, 23:26)". Show both readings and how to settle it. **Never silently pick one.** If the sources agree, leave `conflicts` empty and move on — the gate fires only on real conflict.

**The guide's research is on file too (added 2026-10-29).** When the call guide carried researched
facts (its cited glance facts, its "Lead with" and its fit of your offers to theirs), each one is an
on-file source. Where the call contradicts one, it is a conflict like any other, with `onFileSource`
`"the research"`. Then write `newLearnings`: what the call taught that the research did not have,
each one line with who said it and when. The next guide for this company reads them before it
researches again, so a fact learned on a call is never re-researched or contradicted.

---

## Step 4 — Auto-done / Needs-you / Needs-info (the next-steps split)

**Take the user's own send-promises from the TRANSCRIPT, never the transcriber's summary.** A summary lists what each side owes and drops what the user said in passing they would send ("I'll send an invite for..."); every such line becomes a `followups` item or a staged invite.

**Every promise the user makes on the call is also one `promises` item (v0.9.50), on top of its `followups` or `needsYou` line.** **A promise passes three tests, read off the words said (v0.9.63).** (a) **He commits**: first-person future words ("I'll send", "I will", "let me", "you'll get it from me", "will do"). "I can", "I could", a question, or an offer that waits for them ("if you want", "when you want to dig in") is not a promise until they say yes. Quote that yes, verbatim, in `acceptedBy`. (b) **A concrete thing**: write it in `deliverable`, using the words that were said. If the thing has to be inferred ("it" is the link he showed), add the line that names it as `contextLine`, verbatim. A deliverable nobody said is an invented promise. (c) **Not talk**: a turn of phrase ("I'll tell you what"), a reaction he predicts ("you're going to be flabbergasted"), a hypothetical ("imagine", "let's say") is conversation. Put it in `notPromises` with the reason. When unsure, it is NOT a promise: a false promise puts a due date on him that he never agreed to. The builder refuses (exit 21) an item that fails any test. Each one becomes a row in the company's promise store, and a row is kept only when a SENT message carries it (Call-Record-Lifecycle stage 11). Write who it was promised to, what, the user's own words copied verbatim from the transcript (`sourceLine`), and the due date only if one was said out loud (`spokenDue` plus `spokenDueAt`). Never put a date nobody said: leave both null and the store sets 2 business days, and labels the row `due_basis = two-business-days` so every reader can tell it is a default, not a date he gave. When the promise waits on the other side first ("send me the docs and I'll review them"), say so in `what` ("once they send the docs"). **Also set `waitsOn` to what they owe first, in plain words ("they send the docs by email"), and leave `spokenDue` null: the builder refuses (exit 21) a promise whose own `sourceLine` waits on them without it, and the store then starts its clock when their message lands, not on a date nobody said. A line that only reads conditional ("if you give me a second, I'll pull it up") takes `waitsOnWhyNot` with the reason instead; never set `waitsOn` for a condition nobody said.** A promise the OTHER side makes is `needsInfo`, not a promise row. If the transcript has a send-promise line that is not the user's promise (theirs, or one already kept on the call), name it in `notPromises` with the reason. **A promise a TEAMMATE will do (v0.9.62) is still the user's, so still one `promises` item: add `"handed_to": {"name": "<the teammate, as said>"}` ("Sam will send you the steps" -> `{"name":"Sam"}`), the name exactly as said, never a person id; the store decides who that is and puts it on their list too. `handed_to` is optional: leave it out (or null) when the user does it himself, so a debrief without it stays valid.** The builder reads the transcript and **refuses the build (exit 21)** when a send-promise line is in neither list.

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

> ⚠ **ADDED 2026-08-11, and it is a correction, not a decoration.** Until this date `beachhead` appeared **zero times in this entire skill body** while the builder silently required it. The result was exactly what that arrangement produces: the brain wrote good questions, the builder deleted every one of them for missing a field nobody had been told about, and shipped a debrief with no question panel at all — reporting success. Measured on real files: **3 of 15 debriefs** shipped that way (2026-08-10, 2026-08-06 and 2026-07-30). It survived a month because *"zero is a valid answer"* is true, so an all-deleted result and a deliberate empty array produced **byte-identical output** — indistinguishable to the operator, to this skill's own self-check #6, and to any session re-reading its work. The builder now REFUSES that case (non-zero in, zero out) and names each dropped question. Both halves shipped in one batch: if you are reading this paragraph and the builder does not refuse, one of the two did not land. This is the 4th instance of one defect class — *a field the finished page needs is optional at the gate and unstated in the instructions the author reads*; the other three were `logWebhookUrl`, `apiBase` and `leadId`.

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

## Step 4e — Open questions for you: the shape of what we could do together (added 2026-09-25)

Ruled by the operator 2026-09-25 (`dr_call_guide_carries_evolving_demo_talk_track_and_debrief_asks_shape_20260925`):
the debrief asks him *anything you don't know or need clarification on about … what the shape of
this could look like.* His answers feed the next guide's talk track (`aii-call-guide` 3.5c), which
is how the walkthrough gets better every call.

After the content above is written, list what is still NOT known about the shape, across four
questions only:
1. **Co-creation** — what would building it together look like with this person?
2. **Product X** — what would a product in their name be: its parts, and who it is for?
3. **Go-to-market** — how would it reach buyers? *(Ask it. Do NOT add a go-to-market step to the
   walkthrough — ruled out for now.)*
4. **1+1=10** — where do their strengths and ours multiply rather than add?

**Read first, never re-ask.** Drop any question the transcript, the CRM record or a prior debrief's
shape answers already settle. Zero questions is a valid result — say so in one line.

**Where they go.** Put each remaining question in the debrief as a `nextSteps.needsYou` item whose
`action` starts `Open question for you —` and whose `why` names which of the four it is (the builder
has no block of its own yet; this renders under ⚑ Needs you). **When he answers, write his words
verbatim as a CRM note on the lead titled `Shape answers — <YYYY-MM-DD>`** (`do_action` "Create
note", the same door Step 7 uses). That is where the next guide reads them: its Step 1 already
reads the lead's notes. No lead → say so out loud; the answers have no home until the lead exists.

---

## Step 4f — Keep the buyer's own words (added 2026-10-26)

**Why:** the other side's words are the best material the next guide can have. That's true for this
person, and for the next person like them. Today the next guide only hears from the user. This keeps
the buyer's half, so every call teaches the next call with a similar buyer, in the buyer's own
language instead of ours.

From the **transcript** (a recap email is not enough), keep **up to five** of the other side's own
lines in `buyerWords`:
- **Their turns only, quoted exactly, never paraphrased.** No quote, nothing kept.
- **Tag each line** with what it is: how they named the problem, an objection, what had just
  happened that made them take the call, or a sign they want to move or not.
- **Tag each line with the kind of person who said it:** title, responsibility or level, the same
  person type the prospecting engine uses.
- **Zero is a valid answer.** A call with nothing worth keeping writes `buyerWords: []`.

The lines travel inside the debrief's own content, so they are kept with its stored record and need
no other home. The call guide reads them for the next buyer of the same kind (`aii-call-guide` 3.5c).

---

## Step 4g — The door they came in through, and the offer that got their interest (added 2026-10-29)

**Why:** a company sells several things and reaches people several ways. Which way brought them in,
and which offer they actually leaned into, are two different facts, and they often disagree. Kept on
every debrief, they show which outreach brings in which buyers, and which offer each kind of buyer
really wants, so the next campaign leads with what works instead of what was assumed.

- **`doorIn`** — how this person reached the call: the outbound campaign or message that started it
  (its name or id as the store holds it), a referral (who), a partner (which), or inbound. Read it
  from the record of how the meeting was booked; if nothing on file says, write `"unknown"` and never
  guess.
- **`offerThatBit`** — the one offer they leaned into on the call, with the transcript line that
  shows it, verbatim, and `"none"` when nothing landed. It is often not the offer the guide led with;
  say so when it differs.

Both travel inside the debrief's own content, like `buyerWords`.

---

## Step 5 — Produce the debrief JSON (the locked schema)

Output ONE valid JSON object in exactly this shape. All keys present; arrays may be empty (`conflicts` especially). Use `\n\n` for paragraph breaks; `<strong></strong>` allowed inside `point`/`draft`/`why`.

```json
{
  "header": { "title": "Call Debrief — <Name>", "subtitle": "<role>, <Company> · Called <date> · Outcome: <one phrase>" },
  "contextBar": [ {"label":"Call","value":"..."}, {"label":"Length","value":"..."}, {"label":"Outcome","value":"..."}, {"label":"Sources","value":"Full transcript + on file (invite, guide, CRM)"} ],
  "planVsReality": { "planned":"what the call set out to do (from the guide/goal)", "happened":"what actually happened", "verdict":"on-track | partial | off-plan" },
  "conflicts": [ {"topic":"...","operatorSaid":"what we had on file","onFileSource":"the invite | the guide | <date> decision | the CRM","transcriptSaid":"what the full transcript shows","saidBy":"<who>, <mm:ss>","resolve":"how to settle it before logging"} ],
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
  "buyerWords": [ {"quote":"<the other side's own line, VERBATIM from the transcript>","kind":"problem|objection|trigger|signal","said_by":"<name>","person_type":"<their title, responsibility or level>","at":"<mm:ss>"} ],
  "newLearnings": [ {"learned":"<what the call taught that the research did not have, one line>","said_by":"<name>","at":"<mm:ss>"} ],
  "doorIn": {"kind":"campaign|referral|partner|inbound|unknown","name":"<the campaign, referrer or partner, as the store holds it>","source":"<where on file this came from>"},
  "offerThatBit": {"offer":"<the offer they leaned into, or none>","line":"<their line, VERBATIM from the transcript>","at":"<mm:ss>","ledWith":"<the offer the guide led with>"},
  "crmLog": "the clean summary to log to the CRM — outcome, what held/slipped, blocker, next, any watch-out",
  "promises": [ {"to":{"name":"<who it was promised to>","email":"<their address, or empty when the lead is attached>"},"what":"<the thing promised, short, one per row>","sourceLine":"<the user's own words, VERBATIM from the transcript>","sourceKind":"transcript","deliverable":"<the thing, in the words said>","contextLine":"<the line that names it, verbatim> | null","acceptedBy":"<their yes to an offer, verbatim> | null","spokenDue":"<the words said, e.g. 'by Friday'> | null","spokenDueAt":"<ISO time with offset, only when a date was said> | null","waitsOn":"<what THEY owe before he can deliver, plain words, only when his words wait on them> | null","waitsOnWhyNot":"<why a line that reads conditional does not wait on them> | null","handed_to":{"name":"<the teammate who will do it, as said>"} | null} ],
  "notPromises": [ {"line":"<a send-promise line from the transcript that is not the user's promise>","why":"<why: the other side's promise, already kept on the call, an offer they did not take up, or talk (a turn of phrase, a hypothetical)>"} ]
}
```

`promises` is REQUIRED (v0.9.50). Write `"promises": []` only when the user promised nothing; an absent key is refused. Two items can't share one `what` (one row per item). `notPromises` is optional.

Write the JSON to a temp file, e.g. `debrief.json`.

---

## Step 6 — Build the shell and file it through the connector

⛔ **NOTHING IS SAVED ON THE USER'S COMPUTER (2026-10-29).** Same rule as `aii-call-guide` Step 4: the
debrief is filed to the company's Drive through the connector and opens from the store, with no local
copy. A scheduled build runs only in a cloud routine; a build in a live chat always uses `--cloud`,
keeps its working files in a temporary folder (`--out-dir`) and deletes them once filed.

1. Write `config.json`:
```json
{ "tenant":"<your company: see below>", "debriefId":"<person-slug>-<YYYYMMDD>", "eventId":"<calendar event id>", "meetingDate":"<YYYYMMDD>", "callRef":"<the call/transcript id>", "prospect":"<Name>", "company":"<Company>", "domain":"<their email domain>", "leadId":"<crm lead id — REQUIRED, see below>", "noLeadReason":"<omit entirely unless leadId is empty>", "email":"<their email or empty>", "crmName":"<your CRM>", "callEndedAt":"<ISO time with offset — REQUIRED when there are promises>", "operatorSpeaker":"<the user's name as the transcript labels them — optional>" }
```
`callEndedAt` is when the call ended; the promise store counts the default due date from it. With `operatorSpeaker` set, the builder scans only the user's own turns for send-promises.
**`tenant` IS REQUIRED (0.9.64).** It is the company this seat's Blueprint connector is signed in to: the
`house_tier.for_client` value that **Read my working instructions** (`read_my_working_instructions`, the
`skill_overlay` read you made at the start of the session) returns. Copy it exactly; never type a company from memory
or from a file. The builder hands it to the registrar, and a build that names no company is refused
(`REFUSED - no tenant`): nothing assumes one for you. Pass the same value as `--tenant <it>` to `--print-folder-sql`
and to `--regen-plan`. (`AIOS_TENANT`, if a seat sets it, must agree with it or the build is refused.)

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
node "<skill-folder>/build-call-debrief.js" debrief.json config.json out.html --folder folder.json --transcript transcript.txt --promise-by session:<this session id>
```
   `--transcript` is the transcript section itself, never the assistant's summary. A debrief for a call with no recording passes
   `--no-transcript "<why>"` instead, and records no promises (a recap is refused as a source, exit 21). A scheduled job leaves off `--promise-by`: its `builtBy` writes the rows as `job:<builtBy>`.
   **The health badge (0.9.53).** The builder draws a badge at the top of the debrief from what it was built from. It reads "Built from a recap email only — no transcript", "No transcript — built from your notes only", "No notes from you on this call", or "N promise(s) have no due date", and it turns red when there is neither a transcript nor the user's notes. Tell it what it cannot work out on its own. Add `"health": {"source": "transcript" | "recap" | "notes", "operatorNotes": true | false, "crmMissingEmails": <n>, "newestEmailAt": "<ISO>"}` to the debrief JSON. Leave out any key you did not check; the builder then falls back to the Sources line and `--no-transcript`. Problems only you can see go in `"health": {"problems": [{"tone": "amber" | "red", "say": "<one plain sentence>"}]}`, under the same plain-words rule as the guide (exit 23 on internal words). Every debrief also carries a "Something wrong? Report it" button. You do nothing for it.
   **Something wrong? Report it:** on every page, in every color. Opened from the Command Center, one click sends the report. Opened from a file, it copies "Report: <kind> <doc_id> for <person> <date> — <reasons> — <note>" plus a `[call-doc-report {...}]` line. When a user pastes that into a session, file it with `call_doc_report_put('<tenant>', '<the JSON after call-doc-report>'::jsonb, 'pasted', 'session:<your session id>')` through the board connector (resolve it by category). Then tell them in one line what the store said back.
   The plan carries `sql`, `params`, `planPath`, `resultPath` and `quarantinePath`. The file on
   disk right now is **not** a call document — its name deliberately does not match the
   `<YYYYMMDD>_debrief_` convention, so nothing downstream can mistake it for one.

   ⛔ **A BUILD IS DONE ONLY WHEN IT CAN BE OPENED — ADDED 2026-09-24, v0.9.50.** Done means `call_doc.file_id`
   and `view_url` are set and `hosted_gap` is empty (blueprint-core v1.210; Call-Record-Lifecycle-SPEC stages 4
   and 8). A local copy is not done, and neither is a row that says "filing pending". So **always build with
   `--folder`**:
   - Get the Calls folder first: `node "<skill-folder>/build-call-debrief.js" --print-folder-sql --channel <c> --company <x> [--partner <p>] --tenant <your company>`.
     Run that SQL through the board connector and save the rows to `folder.json`. If the resolver raised, save
     `{"error": "<message>"}` instead.
   - Add `--folder folder.json --cloud --run-id <job_run id, or your session id in a live chat> --out-dir <a temporary folder>`
     to EVERY build, on every seat (2026-10-29): the row registers with no local path, and the bytes sit in
     the temporary folder only until they're uploaded. *(Until then a desktop build left out `--cloud` and kept
     a copy in the user's folders.)*
   - **Exit 0** means stdout carries `hosted` (`status: "ready"`, `hostedHalf: "planned"`). Run `hosted.steps`
     1–7 **in order, in this same run**: register, settle, mint one ticket, upload, read the row, confirm, then
     prove. Step 4 uploads through `upload-call-doc.js`. If that exits 3 with `door_unreachable` (a cloud
     container whose network blocks our host), take `steps[3].staged`: run `register-call-doc.js --stage-sql`
     and push every chunk it prints through the board connector, then read `call_doc_upload_status` until the
     state is `filed`. Never send the HTML through the storage connector's create call.
   - **Exit 20 = NOT OPENABLE.** No `--folder` was given, so the build could only land a local copy
     (`openable: false`, with the reason in `notOpenable`). The files and plan are still written, but **this is
     not done, and a sweep must count it as not-done.** Resolve the folder and rebuild.
   - **Exit 4 = `folder_address_unresolved`.** Nothing was registered and nothing was written. Raise
     `hosted.marker` and move on to the next call.
   - **Exit 21 = PROMISE UNRECORDED (v0.9.50).** The transcript shows a send-promise with no `promises` item, or an
     item the promise store would refuse (no writer, no `callEndedAt`, a date with no spoken words, a `sourceLine`
     that is not in the transcript). Nothing was written. Fix the JSON from what the refusal names and build again.
   - **The promise rows (v0.9.50).** Stdout `promises` (also saved as `out.html.promises.json`) holds one
     `promise_put` call per promise. Run them through the board connector **after hosted step 2 (settle)**, since the
     row has to exist first, and in the same run. Then run `promises.check`, save the rows to `promise-rows.json`, and run
     `node "<skill-folder>/build-call-debrief.js" --promises-check out.html.promises.json --rows promise-rows.json`.
     **Exit 0 = every promise has its row. Exit 22 = PROMISE ROWS SHORT**: the debrief is not done. Re-running the
     calls is safe, because the same `what` returns the existing row.
   - **The only "done" is step 7's judge:** save the read-back row to `readback.json`, then run
     `node "<skill-folder>/register-call-doc.js" --openable readback.json`. **Exit 0 = OPENABLE. Exit 20 = NOT
     OPENABLE**, with the reason. Then write the pointer (Step 4.5) from that row's `file_id` / `view_url`.
   **(b) Run the plan's `sql` with its `params`** through the board connector, resolved BY
   CATEGORY (Core §11 rule 4) — never by a connector name. **Save the FULL result** to the
   `resultPath` the plan gave you. The statement returns exactly one row: `outcome='registered'`
   or `outcome='refused'` with the reason. Do not summarise it; hand the whole thing back.

   **Send the SHORT call, never the statement (0.9.64).** Before (b), turn the plan into one short call:
```
node "<skill-folder>/register-call-doc.js" --short "<planPath>"
```
   It writes `<plan>.short.plan.json` and prints its sizes. Its `sql` is
   `SELECT * FROM call_doc_register($1, $2::jsonb)` (46 characters; the plan's statement is 15,122) and its
   `params` are `[tenant, plan]`: send `params[1]` as the JSON object it is, unchanged. The store function runs the
   SAME guarded write, with the same refusals in the same words, so (b) and (c) do not change: run the short `sql`
   with its `params`, save the FULL result, and `--settle` with the SHORT plan file. Do the same for `hosted.steps`
   step 1, and for step 6's confirm (`--short <confirm-plan.json>`, then `--confirm-settle` with the short file).
   `refused` with `REGISTER-PLAN: ...` means the plan changed on the way: print it again and send it unchanged.
   **If the store answers that `call_doc_register` does not exist** (42883: a company store the house catch-up has
   not reached yet), nothing was written: run the long plan exactly as before.

   **(c) Settle.** This is the only step that gives the document its real name:
```
node "<skill-folder>/register-call-doc.js" --settle "<planPath>" --result "<resultPath>"
```
   Registered → the file is renamed to `out.html`. Refused, or zero rows, or a row for a
   different document → **the quarantine file is DELETED and this exits non-zero.** That is the
   feature, not a failure to work around. Fix what the reason says and build again.

   **Never skip (c) and rename the file yourself.** The rename IS the proof that the row landed.
3. **Delete the temporary folder once the build is OPENABLE.** The filed copy, named
`<YYYYMMDD>_debrief_<person>_<calendar-invite-name>.html` in the company's Calls folder on Drive, is the
only copy, beside its guide (`..._callguide_<person>_...`).
> *This step used to read "Save the finished `out.html` into the client folder", at
> `<clients-root>/<ClientName>/<ProspectCompany>/`. Withdrawn 2026-10-29: nothing is written on the
> user's computer.*

---

## Step 7 — Act on what the debrief found

The debrief isn't just a document — it should leave the workspace better than it found it. **The four side-effects below are this build's REQUIRED OUTPUTS, not nice-to-haves.** Step 9 confirms each one actually landed before the build is allowed to say "done" — so do them here, capturing the id each create call returns:
- **Log it to the CRM.** Through Blueprint, `do_action` "Create note" with the `crmLog` on the prospect's lead (one note on the lead — shows on both the company timeline and the contact). This is internal, so do it.
- **Stage the follow-up as a REAL email draft — required, not optional — and it must be UNSENDABLE BY REFLEX.** For every Email item in `followups`, create an actual draft through Blueprint's `do_action` (check the act with `check_action` first) so it lands in their drafts folder ready to review and send. NEVER send it. The in-HTML copy block is a convenience, not a substitute — the draft must exist in the drafts folder. If the draft act can't attach files, put any attachment in as a link in the body.
  - ⚠ **The recipients come OUT of the send bar and are listed inside the body instead, and the draft carries a SYSTEM NOTE block.** Resolve the exact shape from the spec map, slice `follow-through` — do not write it from memory and do not restate it here. Every other element of that rule is advisory; taking the recipients out of the send bar is the only one that makes an accidental send physically impossible rather than merely unlikely. A draft that LOOKS finished gets sent, and what it costs is a relationship the user already has, not a rework.
  - This is the same rule for every drafter in the fleet, not a debrief special case. If you are reading this in a skill that drafts email and it is absent there, that skill is out of date — it is not evidence the rule changed.
- **Stage calendar invites, don't fire them.** Through Blueprint, `do_action` "Create appointment" (always-ask by default, so it lands as a card in the Command Center). Any follow-up call invite is pre-seeded for one-click OK and always includes the meeting-transcript bot — created with notifications OFF so the other party isn't emailed until the user sends it. Never fired silently.
- **A promised DOCUMENT is not a follow-up email — route it.** If any next action promises the other side something they will READ that does not exist yet — a sheet, a one-pager, "I'll write something up for you" — that is collateral owed, and an email saying it is coming does not discharge it. Hand it to `aii-collateral-sheet`, which owns building it. If this run cannot reach the files, brand assets and renderer that builder needs, RAISE it as a named ⚑ flag naming what was promised and stop — **never report a document as produced when no file exists.** A promise to send an EXISTING file is not this; a promise to MAKE one is.
- **The business plan after the call (cc_job step 8).** After a held call whose debrief names a deal (a prospect or a client), a
  business plan is owed: what shape their business should take and what happens first, built from what THEY said on the call, in
  their words. It is drafted for the user and sent only by him.
  1. **Shape.** Default: a mini business plan in ONE email whose job is story alignment, no pilot and no 90-day phases unless he asked
     (the operator's standing ruling). When he asks for the document, run the
     locked builder `scripts/exec-summary-plan/build_exec_summary_plan.py` (content JSON, `"shape": "why-first"`, its checks green),
     register the docx and pdf as `assets` rows of type `exec_summary`, and the email covers it.
  2. **Stage it** as a Command Center draft (the same door the follow-up email uses), never sent.
  3. **Link it**: `SELECT call_business_plan_link('<tenant>', '<calendar event id>', '<draft id>', <exec_summary asset id or NULL>, 'session:<id>');`
     Read the answer: `linked; waits for his send`. A refusal names what is missing (no deal on the debrief: say so to him, step 8 reads
     "person" until the call is linked to its deal). When he releases the draft, the store writes the sheet-sent event itself.
  4. **Nothing to plan.** If the person is not someone to plan a business for (a partner, an introducer, a vendor), do NOT decide it:
     ask him in one line. On his answer, register his ruling, then
     `SELECT call_business_plan_not_owed('<tenant>', '<event>', 'he-ruled-none', '<what you saw>', '<his ruling id>', 'session:<id>');`
     If the deal already got its plan after an earlier call, use `'sent-after-an-earlier-call'` (no ruling; the door checks deal_event).
  5. **Prove it**: `SELECT event_id, s8_prescribe, next_step FROM call_record_s8('<tenant>', now() - interval '7 days', now() + interval '1 day', true) WHERE event_id = '<event>';`
     Before his send it reads waiting or late; after his send, done; after the exit, not-needed.
- **Never mark a promise delivered from here.** A staged draft is not a delivery, and the store refuses one. A promise is delivered only by a SENT message to that person carrying it: the `promise-due-watch` job matches it, or a session that has read the sent message calls `promise_mark_delivered` with its message id, account and sent time.
- **Surface the review + any missing source.** If the deal has a real lead, drop a `⚑ NEEDS [USER] — Review call debrief: <Name>` task on the lead so it shows up where the user already looks. If the source-completeness check (Step 1) found a missing transcript, drop the `⚑ NEEDS [USER]` flag naming it here too. Skip gracefully if there's no lead.
- **Say whether this was the right conversation.** Record whether this person and company fit the profile for where they sit in the business web — right fit, wrong fit, or unsure — with the reason in their words, and place the company on its line through `web_gap_raise` (a company that fits no line raises a gap). This verdict is what the prospecting loop learns from: a slice earns autonomy from these, so they are not optional. Until the fit store exists (layer two of the business web), the verdict goes in the CRM note as its first line. (`dr_a_constant_research_loop_and_prospecting_goes_autonomous_once_fit_is_proven_20260928`)

---

## Step 8 — Regenerate (transcript landed after a debrief built without one)

If a debrief built without a transcript already exists and the transcript now arrives: read the existing debrief, fold in the full transcript (this is where the conflict gate earns its keep — on file vs the full transcript), and **overwrite the same filename** so the call's debrief stays one file. Don't spawn a second file for the same call.

**Re-file a debrief that was built but never filed, and don't re-author it (v0.9.50).** Every debrief built since 2026-09-17 keeps its content as kept state. To re-file one from any seat, cloud included:
```
node "<skill-folder>/build-call-debrief.js" --regen-plan <docId> --tenant <your company>
node "<skill-folder>/build-call-debrief.js" --regen <readplan.json> --rows <result.json> --folder folder.json --cloud --run-id <id> --out-dir <a temporary folder>
```
Run the first command's SQL through the board connector and save the FULL result for `--rows`. When the kept content carries `promises`, the regen prints the same `promises` plan as a build. Run it after settle: it is idempotent, so it also writes any row an earlier run missed. A cloud job's rows write as `job:<built_by>`; a session passes `--promise-by session:<id>`. A promise that was reworded makes a new row, and the old row stays until it is delivered or waived. Never delete one. The regen renders from kept state under the row's own `file_title`, keeps its `local_path` and any `NO TRANSCRIPT:` declaration, and prints the same `hosted.steps` as Step 6. It says whether the bytes match the recorded render (`reproducedStored`). Exit 0 means it produced a ready handoff. **Exit 20 = NOT OPENABLE** (no `--folder`). Exit 4 = the folder is unresolved. Exit 4 with **NO KEPT STATE** (a debrief from before 2026-09-17) means there is nothing to re-render: file the existing local copy through the hosted steps from the seat that holds it, or re-author it.

---

## Step 9 — Prove it, then report (output-verified — a claim is not proof)

A debrief is NOT done when the HTML saves. It is done only when **every REQUIRED OUTPUT below is confirmed to exist.** This is the whole point of this step: on an unattended sweep run nobody is watching, so a side-effect that silently failed — connector hiccup, no lead, attachment size cap — has to surface as NOT-DONE, never slip through as "done."

For each required output the state is either **CONFIRMED** (you captured the id the create call returned, or you re-read / re-listed and found it) or **N/A — `<reason>`** (a stated reason it doesn't apply, e.g. "no lead in the CRM → note skipped"). **"Attempted but unconfirmed" is a FAILURE, not a pass.**

0. **Openable (v0.9.50): check this first, and there is no N/A.** `register-call-doc.js --openable readback.json` exits 0 on the row read back by `doc_id`. Exit 20 = the debrief is **NOT done** (done means the operator can open it within 24h of the call). A build that exited 20 is not done either.
1. **Debrief HTML** — the filed copy exists on Drive (read back by its `fileId`) and is non-trivial in size, and the temporary folder is gone. Confirm the conflict gate rendered if there were conflicts.
2. **Email draft** — for every Email item in `followups`, a real draft exists (the id the create-draft call returned, or re-list drafts and find it). N/A only if there were no Email follow-ups.
3. **CRM note** — the `crmLog` note exists on the lead (its note id). N/A only if there's no lead.
4. **Review task** — the `⚑ NEEDS [USER] — Review call debrief` task exists on the lead (its task id). N/A only if there's no lead.
5. **Missing-source flag** — if Step 1's source-completeness check tripped, the `⚑ NEEDS [USER]` flag naming what's missing exists. N/A if the transcript was present.
6. **Capture questions** — if `captureQuestions` is non-empty, the built HTML actually contains the panel AND it renders **above** the analysis (Core §8). N/A only if the array is empty. **Since 2026-08-11 the builder enforces the first half itself** (it refuses when a non-empty array renders zero questions), so this step is now a *confirmation* rather than the only thing standing between you and a silently empty debrief. **That change is the lesson, not a footnote:** this check was written correctly, would have caught the defect every time, and caught it zero times in three occurrences — because a check that runs only when a session remembers to run it is not a gate. When a self-check here proves load-bearing, move it into the builder and leave the confirmation behind.
7. **`toImprove` in-the-moment test** — read every `fix` back, one at a time, and answer: *could the user have done this while the call was still live?* Report how many you tested (e.g. "4/4 name an in-room move"). An item that fails is rewritten, never shipped. N/A only if `toImprove` is empty.
8. **Voice sightings** — the number of traits written from this call, plus the total number of calls the profile now runs on. Zero traits for a call that had a transcript is a **FAILURE**, not an N/A.
9. **Promise rows (v0.9.50)** — the `promise_id` for every `promises` item, from `--promises-check` exit 0. N/A only when `promises` is empty. Exit 22, or rows you tried to write and could not confirm, is a **FAILURE**.
10. **Step 8 (business plan)** — the draft id and call_business_plan_link's answer, or the exit and his ruling, or the ⚑ flag naming why neither happened.

If any required output is a FAILURE: do NOT report done. Retry that one output once; if it still fails, say plainly which output did not land (the saved file is still useful — keep it). Then report the saved path in one line **plus a one-line proof checklist** — what landed with ids, what's N/A and why — and offer to open it. Don't narrate the steps. (This is the `aii-prove-it` discipline — a claim is not proof; the check is the proof.)

---

## When NOT to use

Pre-call prep — that's the Call Guide skill. Pure conversation, or when the user only wants a quick verbal takeaway (not a saved interactive debrief).

---

*History (v1.1–v1.3 provenance) lives on the board — not in this always-loaded body (Context-Economy Law 3). Behavior above is current.*
