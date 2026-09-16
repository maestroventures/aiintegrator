---
name: aii-build
description: >
  AI Integrator Blueprint: Build. The one way ANYTHING gets built — a page, an app, an automation,
  an engine, a store, a document, a process — from the smallest job up, so nobody has to eyeball it
  to know it is complete. Reads the jobs and steps already on record before building, breaks the
  work into its smallest jobs and each job into steps, answers every advisor test on every step IN
  THE STORE (the fixed core tests plus the tests of the advisor sequence for what is being built),
  groups repeating steps into flows, walks the whole journey, rolls each job up level by level
  (person, day, department, company, partner), and only then builds — then proves it with a check
  that goes red. Fires on "build," "design," "model," "redraw," "mock up," "stand up," "automate,"
  or any request to make or rebuild something a person or a system will use.
---

# Build — anything, from the smallest job up

## Why this exists

Something built top-down looks finished and is not. Every round of "does this look right?" makes a
person simulate the thing in their head and find the holes themselves. The fix is one fixed order for
**everything that gets built**: start at the smallest job, answer every advisor's question on every
step **in the store**, and end with a check that goes red where an answer is missing. Then "is it
complete?" is a query, not a review.

**The rule this skill carries out lives in the Core, not here:** enumerate the job set before you
build, break every job down until one person or one run can finish each part and say plainly whether
it did, and an activity is not a job (`blueprint-core.md`, Mandate 2 — the precondition and its
sub-job clause). This skill is the **procedure** for that rule. It does not restate it.

**Words.** step → **flow** (two or more steps that go together) → job → job set → the thing built
(a card, a room, an automation, a document, an engine). A control or trigger starts a flow or runs one
step; it is not the flow.

## GATE 0 — Read what is on record. Build nothing yet.

1. **Resolve the store and the tenant** from the overlay. Say which database answered before any write.
2. **Name what kind of thing is being built** — something a person looks at or uses, something that
   runs with nobody watching, a store, a message to a person, a document. The kind picks the advisor
   sequence in step 4.
3. **Read the jobs and every step already on record** for it, and run the build check for the tenant
   to see where each job stands. If the jobs and steps are not on record, recording them is the first
   work — not building.
4. **Resolve the advisor sequences BY CATEGORY** from the sequence store — the MOMENT that matches the
   kind (for example: building something a person will use; work that runs unattended; writing to a
   store; reaching a person) and the DEPARTMENT that owns the outcome. Print them. Never a hand-typed
   roster.
5. **Read the rulings too — they are a source of jobs, not background.** Every ruling about the thing
   is a source of jobs. A ruling that names something it must do, with no job pointing back at that
   ruling, is a **missing job**: add the job before answering any test. Jobs read only from existing
   code are incomplete by default — a check over an incomplete job list reads GREEN and proves nothing.

Skipping Gate 0 is the failure this skill exists to stop: rounds of building while the jobs and steps
that answered the question already sat in the store unread.

## Step 1 — The smallest unit: one actor, one moment, one job

For a business the smallest unit is a location. For anything built it is one actor — a person, or the
system itself — doing one job.
- **Sinek:** what is it for, in their words.
- **Christensen:** what job is it being hired for.
- **Klaff:** what is anyone being asked to believe or decide.

Break an activity into its smallest jobs first, and keep breaking until each part can be finished by
one person or one run.

## Step 2 — Break each job into steps; answer every test on every step

Every answer is a **row in the store**, one per step per test. The test list is read from the
registered `build_test` vocabulary, never typed into this body. The state is `answered` or
`not-needed`, never blank, and a `not-needed` says why.

**The core tests — every step of anything built owes these:**

| test | the question |
|---|---|
| `why` | why this step exists, in the words of whoever it serves (Sinek) |
| `asks_to_believe` | what it asks anyone to believe or decide (Klaff) |
| `who_does_it` | the system, or a person — and if a person, should it be the system (Goldratt) |
| `bad_data_state` | what happens when what it reads is missing, slow or wrong — unknown stays unknown, never a zero (Nygard) |
| `stored_and_logged` | what is kept and what is logged |

**Plus the tests of the moment's advisor sequence.** Each advisor in the resolved sequence adds its
question as a test. For something a person uses that is the one obvious action (Krug), what they type
(Wroblewski), the way back and the way out (Norman). For something that runs unattended it is what
happens at 3am and what raises the alarm (Nygard), whether it stops the line (Ohno), whether the state
it reads is still true when it wakes (Redman). The sequence store is the list; this table is an example.

Say which answers describe what is built **today** and which are **proposed**. An answer that needs a
business ruling only the operator can make is not guessed — it goes to the operator as one narrow
question, and the proposed answer is marked as waiting on it.

If a step exists to show a frame someone must be able to correct (for example, why a message matters
to its recipient), show that frame, let them change it, and ask in the same flow where the change
applies.

## Step 3 — Group repeating steps into flows

Build each flow once and reuse it everywhere it repeats. Name it with the registered `flow` word.

## Step 4 — The whole journey, not one piece

- **Stickdorn:** what comes before and after each step (its hand-off).
- **Carlzon:** which steps decide the relationship (the *think* steps).
- **Goldratt:** which steps still sit on a person that the system should do.

## Step 5 — Roll up, the way a location rolls up

One row per job per level, the levels read from the registered `rollup_level` vocabulary: **person →
day → department → company → partner**. At each level answer three things: what is different here,
whose interests compete, and how they are aligned. "Nothing differs at this level, because …" is an
answer; a blank is not.

## Step 6 — Only now build it

Smallest piece first, then assemble: steps into flows, flows into jobs, jobs into the thing.
**Tufte:** show only what matters. **Allen:** every job ends in a clear next action or done. Every
element carries its off-switches (partner, company, department, person).

A model handed to the operator is something they can **use** — a page they can click, a run they can
watch — never a table describing what it would do. And it **behaves like the real thing**: an AI
action shows its round trip and what changed, a control that cannot be used yet is off. Use it end to
end yourself first, as a newcomer would; a scripted click is not proof.

## Step 7 — It proves itself

- The build check reads **GREEN** for every job the thing carries out.
- Every step has a way forward, a way back and a way out (for a person) or a recovery path and an alarm
  (for a run), and the thing's own check goes red if not.
- It has been used as a newcomer would, including combinations.
- Nothing is called done while either check is red. Report the check's rows, not a claim.

## What goes RED when this skill is skipped

- The build check stays RED for the thing's jobs — and anything built anyway is built over a red check.
- The operator finds the gaps by using it — the exact work this skill exists to take off them.

## What this skill does NOT close

- It does not make the business rulings a step needs; those are asked narrowly and recorded.
- It does not release what it built; the build and its release follow their own path.
