---
name: aii-knowledge-hygiene
description: >
  AI Integrator Blueprint: Knowledge Hygiene. Keeps the user's reference files clean over time. On
  a schedule (and on request), it scans the file set for bloat, duplicated facts, and stale or
  contradictory content, then hands the user a punch-list of suggested fixes for one-click confirm.
  Use this for a periodic review ("monthly review," "clean up my files," "audit my reference
  files") or whenever files feel overgrown. It DRAFTS the cleanup — it never auto-deletes or
  auto-edits. The user acts on the list.
---

# Knowledge Hygiene

Reference files rot quietly: a section doubles in size, the same fact ends up in two files, a date
passes, a decision gets reversed but the old note stays. This skill runs a scheduled scan and hands
the user a punch-list — it **flags and drafts, it never deletes on its own.**

This mirrors the framework's passive, draft-first capture pattern (operating-method §2.8): the system
does the noticing so no human has to remember; the human stays in control of the change.

**Two tiers, two disciplines.** A *machine-written* store (an auto-appended index, a generated log)
**self-cleans**: it auto-compacts and tiers into a **hot** half (always-loaded) and a **cold** half
(greppable, not auto-loaded), measured against its load budget in **bytes**, and it prevents bloat
**at the write step** (one tight line, detail pushed to a topic file) rather than only sweeping
later. A *human-written* reference file stays **draft-first** — this skill flags, the human approves
(Steps 1–3 below). Never auto-edit a human store; never make a machine store wait on a human to stay
under budget. (The write-step index cap that keeps the memory index from refilling is homed in
`aii-session-handoff` Step 2 — this points to it, it does not restate it.)

---

## Step 1 — Scan the set against the hygiene checks

Walk the file set and flag, with the exact file + location for each finding:

- **Bloat** — a section past its size limit (use the set's own rule if it has one, e.g. "prune if a section exceeds 20 lines"). Note the line count. **For a machine index measured against a load budget, the driver is ENTRY COUNT, not per-line length** — trimming long single lines cuts bytes but not the count that drives load-truncation; measure the real size and **retire entries** to get under budget.
- **Duplication** — the same fact living in more than one file (violates "one fact, one file"). Name both locations and which should own it.
- **Stale** — dates that have passed, "current" status that's no longer current, references to tools/people/projects no longer in use.
- **Contradiction** — two files (or two lines) that disagree. Quote both.
- **Orphans** — links or pointers to files/sections that no longer exist.

---

## Step 2 — Hand over a punch-list (never auto-fix)

Output a numbered punch-list the user can act on. Each item: what, where, and the suggested fix —
phrased so a single "do 1, 3, 4" reply is enough.

```
Hygiene punch-list — [set name] — [date]
1. BLOAT  — preferences.md "Context" section is 34 lines (limit 20). Suggest: split or trim.
2. DUPE   — mortgage rate appears in personal.md AND finances.md. Suggest: finances.md owns it; personal.md links.
3. STALE  — project-x.md says "launching this month" (dated 3 months ago). Suggest: update or archive.
4. ORPHAN — index links [[old-notes]] which no longer exists. Suggest: remove the link.
```

Do **not** delete, merge, or rewrite anything in this step. The list is a recommendation.

---

## Step 3 — Apply only what's approved, as a safe batch

When the user says which items to fix, apply them — and route through **Safe Edit** (`aii-safe-edit`):
batch the changes, version-bump only what changed, ship a changed-vs-unchanged manifest, and honor
the locked-folder pop-up rule. Then **Prove It** (`aii-prove-it`): grep for the old values, confirm
zero stragglers.

Leave anything the user didn't approve exactly as it was.

---

## Step 4 — The File Lifecycle sweep (findable workspace)

This skill is also the enforcement home for the **File Lifecycle Standard** (Core §8): keeping the *workspace* findable, alongside keeping *reference files* clean. The rule itself lives in Core — **location = status** (a file in its folder is live, the same file in that folder's own `_Archive/` is dead), the **filesystem is the source of truth for file status**, **park never delete**, and a **verify-then-park sweep** that drafts an approve-list, grep-checks no live file still references a candidate, and never auto-deletes. This skill does not restate those mechanics — it runs them (one fact, one file). Buildable detail and cadence live in `04 — Daily Operating System/specs/File-Lifecycle-Cleanup-Standard-SPEC-DRAFT.md`. Same draft-first discipline as Steps 1–3: it proposes, the user approves, nothing is deleted.

**A file can also be dead by being a COPY — and location = status cannot see that.** Core §8 mechanism 1 reads a file's status from where it sits, so an unmarked duplicate (`name (1).ext`, `name copy.ext`) sitting in the working folder reads as LIVE. Two live files, one rule, nothing saying which is current — every grep of that folder returns two answers. This is the failure mode that let 138 of them accumulate in a real workspace with nothing ever going red, including a framework Core copy fourteen versions behind that answered a live rule wrongly. So the sweep carries a **detector**, and the detector is what makes the standard enforceable rather than aspirational:

- **It runs a real check, and the check reports a SET, not a count.** Accepted debt is a recorded set of paths — anything not in that set is red the first time it is seen, even while the backlog is still being worked down. A count baseline cannot do this: sweep one old duplicate, create one new one, and the count is unchanged and the check stays green.
- **SHADOW vs ORPHAN, never merged.** A duplicate-form name WITH a live sibling in the same folder is a **shadow** (sweepable). One with NO live sibling is an **orphan** — reported separately and **never** swept, because it may be the only copy of that content. Merging the two turns the sweep into a filename matcher, and a filename matcher deletes work.
- **Detecting is not sweeping, so the detector runs everywhere — including the locked folder.** The locked-folder rule and the spec's own "the sweep never touches the locked folder" govern MOVES. A read-only detector moves nothing, so a stale shadow inside the locked folder is *reported*; whether it moves is still a pop-up. The check must have no move path and no delete path at all, by construction, for this separation to hold.
- **It names its exclusions and asserts its buckets partition the whole walked set**, so an unrecognised naming form shows up as an unexplained residual rather than as a green run. And a run whose own positive control fails reports **"I could not check"** — never green (`aii-prove-it`: a zero is only evidence if the control passed).

**And a folder can be a dump without a single duplicate in it — so this step also checks the DRAWERS.** The house tier's *When you put working files away* block is the rule; this is where it is enforced. The detector above answers *are there two copies of this file?* It cannot answer the question a person actually asks, which is *why can I not find anything in here?* Measured on one real workspace: 132 working directories carrying roughly twenty invented words for three ideas, while the loose-file count the sweep DOES watch was 9 of 1,115. The files were being put away. Nobody had named the drawer.

- **Run the work-drawer check as part of this step:** `scripts/no_unregistered_work_drawer.py`, alongside this skill. For every directory a person can SEE while looking for their own work, it asks one question — is this name a registered drawer? Legal is the exact registered name, or that name followed by a HYPHEN and a suffix.
- **It carries no drawer list of its own and REFUSES to run without one.** Hand it `--tenant <this seat>` and `--print-sql`, run that SQL through the store resolved BY CATEGORY, save the snapshot, then run the check against it. A missing or stale snapshot is a loud refusal with its own exit code, never a green run — a check that invents the vocabulary it is policing is a second copy that is wrong the day the registry moves and never says so.
- ⚠ **A green here means no session invented a new drawer. It does NOT mean the workspace is findable** — the check sees DIRECTORIES ONLY, so sixty loose files in a visible folder are invisible to it by construction. Say that when reporting it; the honest half of a green is what stops it being over-read.
- **A red is a punch-list item like any other in Step 2 — proposed, never auto-fixed.** Moving a session's working folder is exactly the kind of edit that breaks something quietly.
- **Before proposing ANY file move in this step, grep for the file's PATH — not its basename.** A pointer check that matches on basename reclassifies a moved file's old citations from *dangling* to *moved (info)*, so the address rots into a lie while the check stays green. Measured 2026-08-10: a routine tidy of one folder was about to break 61 citations across 26 files, two of them inside the framework itself. Zero hits means move freely.
- **A repoint is not a rewrite.** A backup, an archive, an edit receipt or a cold log describes where a file WAS on the day it was written; rewriting one falsifies a record. Name that split in the batch manifest, or the next grep reads them as missed stragglers.

Where the check lives, its accepted-debt file, the drawer vocabulary for this seat, and the sweep cadence are instance-specific — see the overlay.

---

## Running on a schedule

This skill is meant to run on a cadence (e.g., a monthly review) as well as on demand. When run on a
schedule, it produces the punch-list and surfaces it — it still waits for the user to act. A scan
that finds nothing is a valid, useful result: report "clean, nothing to prune."

---

## When NOT to use

Don't run a full hygiene scan mid-task when the user just wants one thing done — it's a review
ritual, not an interruption. And never let it delete on its own, even if a finding looks obvious.

---

*v1.2 — 2026-07-30 (T7·S8; additive + one false clause removed): **Step 4 gains the duplicate-copy mechanism and a real detector.** Core §8's File Lifecycle Standard was correctly worded with NO enforcement anywhere, and could not SEE its own worst violation — mechanism 1 reads status from location, and an unmarked ` (1)` copy sits in the working folder, so 138 of them accumulated in a live workspace with nothing going red (one was a framework Core 14 versions behind that answered a live rule wrongly). Added: dead-by-being-a-copy as a readable state; accepted debt is a SET of paths not a count (a count goes green when one old violation is swept and one new one appears); SHADOW (has a live sibling → sweepable) vs ORPHAN (no sibling → never sweepable, may be the only copy); detecting-is-not-sweeping, so the detector is read-only and runs even inside the locked folder while MOVES there stay a pop-up; named exclusions + a partition assertion + a positive control that turns a broken run into "I could not check" instead of green. REMOVED as now-false: the clause claiming the sweep and schedule were "open build on initiative `oppo_caXSIN…`" — the detector exists and is mutation-proven. Personal `00/personal-skills/aii-knowledge-hygiene` needs a re-paste to inherit.*

*v1.1 — 2026-07-13 (framework-maintenance-meta batch · T11 · S9; additive): two Adopt-sharpens.
Added the **two-tier self-clean distinction** after the intro — a machine-written store self-cleans
(auto-compact + hot/cold tiering against a byte load budget, bloat stopped at the write step); a
human-written store stays draft-first (flag, human approves). Points to `aii-session-handoff` Step 2
for the write-step index cap rather than restating it (advisors Redman + Goldratt; source card
`oppo_NUl8…`). **Step 1 Bloat check** gains the rule that a machine index's bloat driver is **entry
count, not per-line length** — retire entries to get under budget (advisor Goldratt; source
`neon_fwc_index_prune_verify_glue_20260707`, entry-count facet; the adjacency-glue facet of that same
card is homed by scope in `aii-prove-it` Step 2). Four-test + one-fact-one-file passed. Personal
`00/personal-skills/aii-knowledge-hygiene` needs a re-paste to inherit.*
