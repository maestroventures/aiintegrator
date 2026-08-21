---
name: aii-adjudicate
description: >
  AI Integrator Blueprint: Adjudicate. Runs BEFORE any framework edit so a candidate is never
  adopted, merged, or closed by memory. Names the KIND first — fact, lens, decision, memory, or skill. Fires automatically whenever the work touches the framework —
  a framework candidate, a Raw-triage ruling, an "adopt / covered / merge / retire" decision, a
  promote-to-Core, or ANY edit/move/rename inside the locked framework. For every candidate it greps
  the framework for the canonical home, decides whether the idea already exists CORRECTLY (one home,
  others point to it) vs scattered vs absent, gates every Adopt through the four-test + the
  one-fact-one-file rule, prefers sharpening an existing line over adding bloat, pops up before any
  framework change, then writes the ruling live to the board and grep-verifies. Trigger on
  "adjudicate," "adopt this," "is this covered," "promote to Core," "fold into the framework,"
  "framework candidate," or any framework edit. No framework change happens without it.
---

# Adjudicate

## Step 0 — REACHABILITY. Run this before anything else, every time.

This skill needs something that is **not on every seat**. Before you read another line, find out
whether it is on THIS one, and if it is not, **say so plainly and stop.** A half-run is worse than
a refusal: it looks like the skill worked.

**The check.** Resolve capability **`spec-map` / `lookup_governing_spec`** BY CATEGORY per Core §11 rule 4 —
never by a connector name, never by a table name — and count the connectors that answer `CAN`:

```sql
SELECT count(*) AS live_connectors
  FROM capability c JOIN connector_capability cc ON cc.capability_id = c.id
 WHERE c.category = 'spec-map' AND c.action = 'lookup_governing_spec' AND cc.verdict = 'CAN'
```

**Then, and only then:**

- **One or more → carry on.** Say nothing about this check; a passing gate that announces itself is noise.
- **Zero, or the query errors → STOP and say exactly this, in your own plain words:**

  > I can't reach the spec map on this seat, so I can't tell you whether this decision has already been made somewhere. Adjudicating without it would just be me guessing with a formal-sounding process on top.

  Then stop. Do not improvise a workaround, do not fall back to a different store, and do not do
  "the part that works." Adjudication is the already-exists check; without the map there is nothing to check against, and a confident ruling made from nothing is the exact defect this skill exists to prevent.

**Why this block exists, stated so it does not get tidied away.** Until 2026-08-06 this skill was
kept OUT of the AI Integrator Blueprint plugin, on the grounds that a client would not have what it
needs. Bryce retired that test: *"Even if the user is never gonna use the AII adjudicate, doesn't
mean the user shouldn't have it."* **Non-use is not a reason to withhold.** A skill is withheld only
if it would MISLEAD or FAIL LOUDLY — **and that guard belongs INSIDE the skill, which is this block,
not in a packing list where the skill itself can never see it.** Card:
`neon_seven_builder_only_skills_reach_nobody_including_bryce_20260805`, step F.

---

You are about to decide the fate of a framework candidate, or you are about to edit the
framework. **Stop and run this first.** Adjudication is not "does this idea exist somewhere?"
— it is **"does it exist *correctly* within the framework?"** A lesson can be present but homed
badly (restated in three files, or stated at the wrong altitude). That is its own defect, not a
clean "covered." This skill exists so that judgment never depends on anyone remembering where a
fact lives or whether a new one would create a duplicate.

This skill **enforces** Core §8.5 (the Adjudication Gate four-test) — it does not restate that
rule, it carries it out — and it pairs with `aii-prove-it` (proves the edit landed) and
`aii-safe-edit` (batches the file changes). One fact, one file.

---

## Step 1 — Find the home (never rule from memory)

`grep` the real framework files for the candidate's key phrases — the Core file, the relevant
`deployable-skills/*`, the relevant standard. **Read the actual lines.** You may not form a
ruling before you have looked.

**Query the map BEFORE you grep the content (🗂 SPEC GATE).** When the
candidate is a spec/standard question — does this domain already have a governing spec, and which
one? — query the instance's **spec registry** (the one map of which spec governs each slice) FIRST,
then open the governing spec it points at. The registry owns the *map*; the spec file owns the
*content*. Never rebuild the domain picture from memory or a file's cross-references. A domain with
no governing spec **fails loud** (STOP → escalate), never rule from a blank. New work then UPDATES
the one governing spec (`aii-safe-edit` Spec-set clause), never forks a rival.

**Check the home's SCOPE, not just its folder.** A universal tenet's home must be a
**framework-scope** file. A client- or instance-specific asset (one client's own positioning
narrative, an instance's config) is **never** a valid home for a universal tenet — even when it
lives inside the locked framework folder — because it buries the rule where no other client
inherits it and drags client copy into a reusable tenet. Re-home to a framework-scope file, state
it generically, strip the client example.

---

## Step 1.5 — Name the KIND before you classify (the Type Test)

Step 1 found where the idea lives. Before Step 2 asks *how* it exists, say **what KIND of thing it
is** — because the kind decides **which artifact is under the knife**, and getting that wrong is how
a lesson ends up filed somewhere it can never fire from. Five kinds, exactly one applies. The rule
lives in `blueprint-core.md` §8 (The Type Test); this step carries it out.

| The lesson is… | So the artifact you are about to edit is… |
|---|---|
| a **fact** | a **registry row** |
| a **lens** | an **advisor** entry |
| a **decision already made** | a **spec or the Core** |
| a thing to **know at a moment** | a **memory** file |
| a **procedure that must run in order** | a **SKILL BODY** |

**The discriminator, in one line.** *"Know this"* → memory. *"Do these steps, in this order, and
don't skip one"* → a skill.

**Why this step exists at all.** Without it every ruling defaults to editing a document, because
documents are what this door has always edited. Measured 2026-08-04: a skill body was the artifact
under the knife **3 times in 1,261 cards**, while memory grew to **907 files against 19 skills.**
The failure was not that new skills went uncreated — it is that **existing skills were never
sharpened either**, because nothing in this door could point at one. A lesson like *"prove-it must
also check X"* had no landing place and became note number 908.

**Sharpen the skill; do not reach for a new one.** When the kind is SKILL, the expected outcome is
Step 2's **Adopt-sharpen aimed at an existing body.** A NEW skill is the exception and must clear
the extra gate in Step 3.

**State the kind out loud in the ruling.** A ruling that never names its kind is *unclassified*, not
neutral — and unclassified is exactly how the document default reasserts itself.

---

## Step 2 — Classify how it exists

The five classes below describe **how the thing exists in the home Step 1.5 named** — they are not a
list of document edits. Read each one as “…in that artifact,” whether the artifact is a Core section,
a registry row, an advisor entry, a memory file, or a skill body.

- **Exists-correctly** — one canonical home states it once; everything else points to it. → **Covered**: close the source card(s), no edit.
- **Exists-scattered** — the same fact is re-typed in 2+ places (drift risk). → **Consolidate**: pick the one canonical home, convert the others to pointers ("enforces Core §X"). Any home inside the locked framework → locked-folder pop-up.
- **Absent** — no home anywhere. → eligible for **Adopt-fresh** (create the one home).
- **Partially present** — the headline is homed, but a real net-new facet is missing. → close the headline as Covered; **Adopt-sharpen** only the net-new facet, by enhancing the existing line (anti-bloat), never a parallel tenet.
- **Exists-but-wrong** — a canonical home EXISTS but asserts the **opposite** of what lived instance-proof has since shown (the framework states the reverse of reality). → **Adopt-sharpen (corrective/reversal)**, never Covered. Lived proof usually beats a just-adopted tenet; carry the downstream-break note, fix **every** home in one pass, and prefer sharpening an existing carve-out that already permits the corrected behavior so it reads as internal consistency, not a new parallel tenet.

---

## Step 3 — Gate every Adopt (do not skip)

An Adopt clears **only if it passes all of** (this is Core §8.5's four-test plus the two standing
guards):

1. **Generalizes** — true beyond the one case that produced it.
2. **Exceptional** — a real improvement, not a restatement. If it only re-says an existing line, it fails → route to Covered.
3. **Advisor-attributed** — a named lens (the roster) actually reasoned about it.
4. **Additive-or-justified** — additive by default; any breaking change to a Mandate, stage, or generic noun is called out with its downstream-break note.
5. **One-fact-one-file** — the Adopt either **creates** the single canonical home, or **sharpens** it in place. It may **never** restate a fact that already has a home. If it would, it is Covered or Consolidate, not Adopt.
6. **Anti-bloat** — it enhances an existing rule rather than padding the doc. Prefer extending the closest existing line over a new paragraph.
7. **Skill-only — the three-strikes bar.** Fires ONLY when Step 1.5 said SKILL. Owned by
   `blueprint-skills.md` §9 — carried out here, not restated. A **new** skill clears only if all three
   hold: it **recurred** (same failure shape at least twice), it **cost diagnosis** each time, and a
   **fixed sequence would have prevented it**. **Severity override:** one instance is enough if it could
   leak, hurt a client, or block an install. **Sharpen-first is the default** — a new body exists only if
   **no existing skill's MOMENT matches**. And name the **stage** it fires at (§9's seven); a new skill
   that names no stage does not clear this gate.

---

## Step 4 — Locked-folder gate (hard stop)

Any edit/move/rename inside the locked framework requires a **pop-up FIRST**: (1) what changes,
(2) why, (3) what it could break downstream. Show the exact wording you intend to write. No
framework change happens silently — not even a one-line sharpen.

### The pop-up shape — plain, not congested (the decision, not the proof)

The pop-up is for the **person to decide** — so it carries only what changes their answer, written
at the **10-year-old standard** (plain words, no jargon). Everything that merely *proves you made
the call correctly* goes on the **card**, never in the question. Keep the pop-up to four plain lines:

- **What changes** — in real words, what the new/edited rule actually does. Not the section it lives in.
- **Why it matters** — the gap it fills or the problem it fixes, in one line.
- **What could break** — the downstream-break note, or "nothing — it only adds."
- **The recommendation, first** — the recommended option leads and is tagged, per the standing rule.

**Keep OUT of the pop-up (these go on the card / manifest):** section + line numbers, the four-test
results, advisor names, the classify call (Adopt-fresh / sharpen / Covered), "what it references,"
"no renumbering," version bumps, grep findings. None of that changes the person's yes/no — it is
audit trail.

**Rule of thumb:** if a detail only proves the call was made correctly, it rides on the card. If it
would change the person's answer, it goes in the pop-up. **Section numbers never change the answer.**
(Lived proof: a resilience decision once went out as one congested, jargon-dense wall — section
numbers, four-test, cross-refs all crammed into the question — and the user flagged it. The same
decision in four plain lines was a quarter the words and lost nothing.)

---

## Step 5 — Write the ruling live to the board (Board Truth)

The moment the ruling is decided, write it to the candidate's card — status is a field, never
prose:

- **Adopt / Consolidate survivor** → `Staged` **while the edit is still pending**; it graduates to the terminal **done-verified** state **only once the edit has landed AND been grep/prove-verified** (`aii-prove-it`). A finished, proven promotion must not sit at the interim `Staged` — a done item that still reads in-progress makes the board lie. The concrete terminal status id is instance-specific — see the overlay.
- **Covered / Retire / merged cousins** → `Retired`, with a stamp that names the canonical home
  (file + §/line) and the source map, e.g. *"COVERED — homed in Core §X line NNN; skill + standard
  point to it. No edit."*

Every stamp points to where the fact lives; it never restates the status elsewhere. The exact
board location, the status field ids, and any dual-write to a second store are instance-specific —
see the overlay.

---

## Step 6 — Prove it

Before calling the bucket/edit done, `grep` the set for the old/duplicate value and confirm zero
stragglers; if the framework was edited, confirm exactly one canonical form survives (hand to
`aii-prove-it` / `aii-safe-edit`). If the ruling was dual-written to a second store, also confirm
that write landed before calling it done. A ruling line is a claim; the grep — and the row-count —
is the proof.

### 6b — The registry write is PART OF THIS DOOR, not a chore after it

If the edit just ruled on **created, renamed, retired or re-homed a thing that is registered
somewhere** — an advisor, a spec, a tool capability, a scheduled job, a skill — then writing its
registry row happens **inside this step**. The ruling is not done until the row is written and
the write has been read back.

**Why it lives in the door and nowhere else.** Things get created in one place and registered in
none because registering was somebody's *memory* rather than the door's *job*. Every registry
drifts the same way, for the same reason. The fix is not a sweep that finds the drift afterwards —
a sweep is a scanner reporting a defect that already shipped, and it trains everyone to expect a
cleanup instead of a clean write. The fix is that **the door that creates the thing writes the row,
and fails when it cannot.**

**Run it:**

1. **Name the registry** the edited thing belongs to. If you cannot name one, say so out loud — a
   class of thing with no registry is itself a finding, not a pass.
2. **Run that registry's checker** against the file just edited.
3. **A non-zero exit FAILS this door.** The card does not reach a done state, the batch is not
   complete, and the edit is not reported as landed. Fix the row, re-run, then continue.
4. **Read the row back.** A write you did not read back is a claim. Where the store's own
   row-count is unreliable, make the statement return the row and count what came back.
5. **Retire by status, never by DELETE** — another table may still point at the row.
6. **A SKILL is a registered thing too.** When Step 1.5 said SKILL, this step's registry write is not
   optional and is not only the catalog row: record **which of the seven stages** (`blueprint-skills.md`
   §9) the skill owns, in the instance's stage store, resolved BY CATEGORY per `blueprint-core.md` §11
   rule 4 — never by a table or connector name. **A new or re-homed skill that leaves its stage
   unrecorded FAILS this door.** An unowned stage is the one thing the coverage map exists to make loud;
   a skill that never claims one puts the map back to being prose.

**Scope discipline — check only what the edited file is authoritative FOR.** A derived index
usually carries routing keys the source file never owned. Comparing those to the source file
manufactures findings, and "fixing" them silently renames live keys other tables join against.
Fail the door on what the file genuinely owns; report the rest as INFO for a ruling.

---

## When NOT to use

Pure conversation, or work that doesn't touch the framework at all. The instant a candidate is
being ruled on, or any framework file is about to change, this runs.

---

*Version history + adopt-provenance live on the Initiatives Board (framework cards +
adjudication records) and the Adjudication-Discipline spec — not in this
always-loaded body (Context-Economy Law 3).*
