---
name: aii-advisors
description: >
  AI Integrator Blueprint: Advisors. Automatically pulls the RIGHT expert lens for the job instead
  of making the user ask for it. Use this whenever a task would benefit from a named perspective —
  sales, marketing, operations, design, CEO, legal, etc. It selects the one or few advisors that
  actually fit the work (never the whole roster), names them, and applies their lens. When a useful
  lens doesn't exist yet, it flags the gap for the adjudication gate rather than inventing one. It
  layers on the existing advisor roster — it is not a second list.
---

# Advisors

Good advice should arrive without the user knowing to ask for it. This skill selects the expert
**lens** a task needs and applies it automatically — but only the lens that fits, not a parade of
every advisor.

It **layers on** the framework's advisor roster (the advisor registry) — it never creates a second,
competing list. The roster is the source of truth for who the advisors are; this skill decides
*which* of them to bring to *this* job.

---

## Step 1 — Read the job and pick the fitting lens(es)

Look at what the task actually is and match it to the smallest set of advisors that improve it:

- A sales message, objection, or deal call → the sales lens.
- Positioning, naming, story, demand → the marketing lens.
- Process, throughput, bottlenecks, runnability → the operations lens.
- Layout, clarity, usability of an output → the design lens.
- A company-level or strategic call → the CEO lens.

Pick **one to three**, not all of them. Bringing every advisor to every task is noise, not insight —
the value is in choosing the relevant few.

---

## Step 1.5 — Resolve the ORDER, don't invent it

Once you know WHICH advisors, **the order is not yours to choose.** Resolve it from the
**sequence store** — resolved BY CATEGORY (`advisor-map` / `resolve_sequence`, per Core §11 rule 4),
never by a table or connector name. ONE call returns the WHOLE string, in order and already
de-duplicated. You do not assemble it, and you do not remember it.

**Every call runs the same loop.** Ruled by the operator 2026-08-29. The steps around the lens are
fixed; the LENS in the middle is the only part that changes with the situation:

```
Observe → Orient → WHY → FRAME → Decide → look up LENS → Act → back to Observe
```

- **Observe / Orient** — is the picture you are acting on CURRENT, or the one you last looked at?
- **WHY** — what this is FOR.
- **FRAME** — what this is ABOUT. A fence you stay inside, never a step you pass.
- **Decide** — NAME THE SITUATION: which department, which moment, which registered job. This is
  what the lookup takes as its INPUT, which is why it cannot come after it. Decide does not mean
  pick the answer; a lens that arrives after the answer can only decorate it.
- **look up LENS** — the moment / department / job benches. Never a list you typed from memory.
- **Act** — carry it out, then go back to Observe. Your own decision and action are new
  information, and that is what makes it a loop rather than a line.

State what CAME BACK, never what you remembered — and name the roles, because the bench is
per-client and a rule keyed to a surname cannot be inherited:

```
Resolved for marketing — 10 steps: the rails, then price → positioning → message → copy →
distribution, then act. Frame owned by the corporate umbrella; price is inside marketing.
```

- **⛔ NEVER TYPE A RUNNING ORDER INTO A FILE — INCLUDING THIS ONE.** A hand-maintained list of
  names loses members. Two advisors went missing from the written marketing order between
  2026-08-14 and 2026-08-29 and nothing went red, because a grep runs over FILES and can never
  see a STORE. This block deliberately names no surname for that reason.
- **ONE ADVISOR MAY HOLD SEVERAL POSITIONS IN THE LOOP.** Observe, Orient, Decide and Act are one
  advisor's four moves. A resolution that returns the same name more than once across the rails is
  correct; the same name twice below the rails, or once as a rail and again as a lens, is a defect.
- **A sequence that declares NO fixed order is a stated fact, not a miss.** Say so and pick by fit.
- **A conditional member carries the condition that admits it.** Name the condition, never the
  advisor alone — an advisor admitted by a condition nobody stated is an invented order.
- **No sequence registered for that domain → say so and route it to the adjudication gate**
  (Step 3). Never invent an order to fill the silence. An unregistered sequence is a roster gap.
- **An area with a bench and no standing order is legal.** The door returns a DECLARED-ABSENCE row
  naming the missing layer plus the job's own bench. Report that as the answer it is — never as
  "that advisor is not for this," which is a false statement about someone sitting right there.

*Why the order is load-bearing and not taste: the sequence IS the alignment mechanism. You cannot
state a why about a picture you have not looked at, purpose is what a person tests an offer
against, a frame is what makes an incentive legible, and pain is the incentive stated out loud — so
running the lenses out of order asks someone to act before they have a reason.*

---

## Step 2 — Name them and apply the lens

Use the advisors' **real names** from the roster, not "an advisor." Naming makes the perspective
concrete and credits the framework's expert bench. State in a line which lens you're applying and why,
then let it shape the work:

```
Applying the sales lens (Klaff — pitch structure; Freese — question-based selling)
to tighten this outreach.
```

Draw the *substance* of each lens from what that advisor is known for. Keep the framing tight — the
user wants the better output, not a lecture on the advisor.

---

## Step 3 — Flag a missing lens (don't invent one)

If the job clearly needs a perspective the roster doesn't carry, **name the gap** and route it to the
**adjudication gate** (the user's approval process for adding a new framework default). Do **not**
fabricate an advisor or guess at one. Example:

> "This touches data-privacy law and there's no legal advisor on the roster yet. Flagging it for
> adjudication — want me to proceed with general caution in the meantime?"

This keeps the bar high: advisors become defaults only through the gate, the same way every other
framework default earns its place.

---

## Step 4 — Say how it did

Applying a lens is half the job. The other half is one line saying how it went, written **now** —
the moment of use is the only moment anyone can tell. Nothing else records it, so a lens used and
never judged leaves no trace that it was ever used at all.

Record it **BY CATEGORY** (`advisor-map` / `record_fitness`, per Core §11 rule 4), never by a table
or connector name. Four answers and only four:

- **it landed** — they acted for their own reasons, and the goal moved.
- **right lens, wrong moment** — the lens fits this job; it fired too early or too late for where
  the person actually was. A timing answer, never a reason to drop the advisor.
- **wrong lens for this job** — this advisor should not have been on the bench here.
- **it fired and nothing moved** — right lens, right moment, and they still did not act, usually
  because it told them something they already believed, so there was no gap to close.

**The last two mean different things and the difference is the whole point.** Repeated *wrong lens
for this job* says re-cut the bench. Repeated *it fired and nothing moved* says **sharpen** this
advisor rather than replace them — a completely different operation, and one nothing could see
before this step existed.

- **The store refuses a row that does not say.** The verdict is not optional metadata; it is the
  reason the row is worth writing.
- **If you cannot judge it yet, do not guess.** Say so plainly and do not write the row. A guessed
  verdict is worse than a missing one, because it counts.
- **Name who judged it.** The record carries the session, job or person that made the call, so a
  verdict is always attributable.

*Why this is the fitness signal and not the alternatives: an override ("someone reached past the
bench") is symptom-shaped — silence means either a perfect bench or nobody logging, and the two are
indistinguishable. An outcome ("the deal moved") is truer and arrives too late, or never. The
verdict at the moment of use is the only signal that is both available and honest.*

---

## Two jobs where this fires automatically — no invocation, no asking

For **design/collateral** work and **strategy/implementation** work, this skill is not optional and is
not waited on. The Front Door (`aii-front-door`) fires it on its own the moment it sees either kind of
job — the client never has to ask. The "When NOT to use" note below does **not** exempt these two: a
real collateral or strategy job always gets the lens. (This is the same pair of hard guardrails named
in `aii-front-door`; the trigger lives there, the lens lives here. One fact, one file.)

---

## The fan-out move — when one creative choice carries the whole asset

When a single creative decision *is* the asset — a hero line, a headline, a key visual, a book
opening, a campaign concept — don't single-pass it. Run several passes in parallel, **each one a
single distinct named advisor lens** from the roster, and have each return **two or more** real
options. Then the operator picks the winning *concept*, and the system fuses the strongest options
into one.

This is the design/collateral guardrail made concrete: it turns "run the advisors before building"
into a repeatable generation step, and it visibly puts the lenses to work. Reserve it for the
high-stakes creative choices — a routine asset still gets the normal single-or-few-lens pass above,
not a fan-out. (First instance: the 10 opening-scene options across 5 lenses for the book, 2026-06-20.)

---

## When NOT to use

Skip it for tasks where no expert lens changes the outcome (simple lookups, mechanical edits). And
never stack lenses for show — relevance over volume, always. The one exception is the two auto-fire
jobs above — real design/collateral or strategy/implementation work always gets the lens, even when
the rest of this clause would otherwise stay quiet.
