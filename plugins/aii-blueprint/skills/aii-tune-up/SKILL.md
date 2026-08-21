---
name: aii-tune-up
description: >
  AI Integrator Blueprint: Tune-Up / Alignment Check. Runs the Ideal-State & Reconciliation
  Engine for one company against one goal: pulls the right Blueprint Models from the library,
  lays the company's real stuff and workflows against them, sorts every job into a state, ranks
  the gaps by what most blocks the goal, and lands a decided punch-list on the Initiatives Board.
  Use whenever the user says "tune-up," "run my tune-up," "alignment check," "run an alignment
  check," or any natural variant — both phrases are the same skill. Also fires as the deep first
  run at onboarding and on the per-client cadence. Reads the company + goal from the CRM/intake,
  runs the model-fit advisors (Goldratt, Dunford, Lochhead, Allen) plus the Experience-Designer
  model-selection step, and writes Board records — it does NOT draft or build any deliverable
  until the owner asks. The brain is the engine — no queue, no worker.
---

# Tune-Up / Alignment Check — the Ideal-State & Reconciliation Engine

You are the engine. For **one company with one stated goal**, you assemble the **ideal way that
company should run** — not by inventing it, but by **pulling the right Blueprint Models from the
library and instantiating them** for this company. Those models define the discrete jobs that must
get done. You lay the company's **actual** stuff and workflows against that ideal, sort every item
into a state, rank the gaps by what most blocks the goal, and hand a human a decided punch-list.

> **The one sentence:** *we adjudicate any business against our Blueprint models, frameworks,
> discrete operating models, and building blocks.* The models are the source of truth for what
> should exist. The advisors apply them. The company is what gets measured.

**Two hard rules that never bend:**
- **You never invent the ideal.** It is the **Blueprint Model Library** (`model-library.md` —
  15 Experience Models + 6 Building Blocks). You select, instantiate, and tailor; you do not free-build.
- **You never create a deliverable until a human asks.** The engine stops at the decided punch-list
  (keep / fix / build / retire). Drafting, writing, building = a separate, owner-triggered action.

Full design lives in the engine's spec doc (Ideal-State & Reconciliation Engine SPEC) in the
operating-system specs folder.

> **Connector gate — the build half runs connector-less; the reconcile half needs Live connectors.**
> **Steps 1–2** (goal + model-select + design the ideal) are the **build half**: they read the goal +
> the CEO/executive audit + the intake — **not** the company's live tools. So they run **before any
> connector is hooked up, including before the onboarding call**, and their output **pre-seeds the
> Initiatives Board from the CEO audit** (a board so seeded is an **ideal, *not yet reconciled*** —
> mark it that way). **Steps 3–4.5** are the **reconcile half**: they read the company's real stuff
> *through* its connectors, so they are **gated behind healthy connectors** — the gate Patch Me Up
> (`aii-patch-me-up`, Step 4) hands off to. Two bounded contexts (Evans); the gate lives on the seam
> between them, not around the whole skill.

---

## Step 1 — Set the goal and the scope (the only exec input you need)

1. **Get the one primary goal + a timeframe.** From the CEO/executive interview or the CRM/intake.
   You do NOT collect a separate "what the execs think they have" inventory — the only exec input is
   the goal + context. **Echo it back against a live CRM fact before Step 2 starts** (deal value,
   status, pipeline reality) and get an explicit correction pass — a stated goal is routinely off in
   the same shape a real client's will be (proven on both dogfood runs: Cinergy was handed as "first
   paying client," actually a $0 beta + evangelist; VR's "dealer accounts" needed translating to
   agency-partner accounts), and a wrong goal re-runs the whole engine. This is the Source-First
   duty (§8) applied at the one moment Tune-Up takes an exec's word for something checkable.
2. **Find the nearest binding milestone.** A goal is usually a **ladder** (e.g. break-even → first
   hire → out-of-founder-sales). Each rung has a different binding constraint and a different model
   emphasis. **Build against the nearest binding milestone, store the full ladder, and re-derive
   when a milestone flips.** Don't build the end-state machine while the real constraint is two rungs down.
3. **Apply the company-size collapse test (function, not headcount).** Fold company + department +
   individual into a **single founder-level run UNLESS there are 2+ departments each with a
   non-founder lead.** A flat 15-person founder-run shop still has no real departments → stays
   collapsed. When collapsed: drop the staged weekly cascade and defer the personal/professional
   individual slices.
4. **Pick the run mode — keyed on willingness/style, not bottleneck-status.** Being the bottleneck
   doesn't mean they won't do the work. **Self-serve** = the exec runs the tune-up themselves
   (delegating, systems-minded). **Done-with-you** = you run the cascade for them in a working
   session (default for bottleneck-founders who won't self-run). Ties to the 3-tier delivery model.

---

## Step 2 — Build the ideal: select and instantiate the models (the Experience-Designer lock)

This is the **build half** — it runs **connector-less and can run pre-call**, off the CEO audit +
intake, and its output **pre-seeds the board** (see the connector-gate note above). **The ideal is the
Model Library, not a blank slate.** Run it as the Experience-Designer step — the **ED owns the model
pick; the client never sees a model name.**

1. **Read the company's model and classify it** (Company Profile / intake). The classification is
   top-down: **category first** (a wrong category is the biggest correction — it re-runs the whole
   pick), then the models under it.
2. **Ask in the client's language, map to models behind the curtain.** The audit asks plain
   questions about how the business runs — never framework terms: *"When someone buys, do they pay
   once or on a recurring plan?" "Do you send people to a customer's location?" "Do you quote a job
   before you win it?" "After the sale, is there a project with stages, or is it one-and-done?"* The
   system maps answers to Experience Models invisibly. (These live on the existing intake instrument.)
3. **Select the Experience Models + Building Blocks** that fit, from `model-library.md`. Pick the
   advisors that fit the model on top of the default marketing/sales/ops set.
4. **Instantiate each model for the company** — supply its **Term Map** (Core §5.6) so the generic
   model speaks the company's language, and point it at the goal. **Tune intensity** — the goal
   decides which models are load-bearing.
5. **List the jobs each model defines.** The unit of the ideal is **a model's job, not a document.**
   Each model's 10-field card already carries the gates, decision-rights (config-vs-locked),
   escalation, and outcome-validation — so processes/automations/gates are NOT a separate inventory;
   they're fields on the model. For every job: its name, what it is, the model + field it comes from,
   and why the goal needs it.
6. **Empty-slot rule — never force-fit.** A model only counts if its fill has cleared the framework's
   §8 Adjudication Gate. If a real part of the business has **no validated model** (e.g. construction
   = Model #9, on permanent hold pending a validated client in that category), **name the gap and
   route it to adjudication** — never fake the closest model. Same for a missing advisor lens.
7. **ED confirms — four moves:** confirm / remove a wrong pick / add a missed one / re-weight primary
   vs supporting. Log each correction back to the classification step so the next company is better.

> **Hard lock:** the confirmed model set is a prerequisite. **The Executive Summary and the 90-Day
> Plan cannot be generated until the set is locked** — both are built against the selected models.
> Store the confirmed set as the ED-owned `<Company> - Experience Models.md`; it seeds into the
> client CRM at onboarding (the self-onboarding system runs on the client's machine and can't read
> the delivery team's drive).

> **Client echo-back (safety net):** the kickoff/onboarding call guide reads the selection back in
> the client's own words ("recurring paydays, techs sent to job sites, quotes before you win work —
> did we miss anything?"). A miss = a missing-model signal → back to the ED. Nothing self-onboards
> until the client has nodded at it in plain words. (Owned by the call-guide skill.)

---

## Step 3 — Ingest "today" and stand up the source of truth

> **Reconcile half starts here — needs Live connectors.** From this step down the engine reads the
> company's *real* stuff *through* its connectors, so Steps 3–4.5 are **gated behind healthy
> connectors** (the connector-gate note up top). Don't run them against a half-connected setup — a
> down connector produces a false, half-blind reconcile.

1. **Take the company's actual stuff and how it works.** At most companies this is scattered across
   tools — that's expected.
2. **Plant the source of truth first: the Initiatives Board goes into the CRM on day one.** It does
   not wait for a clean CRM — it is **how the company gets one.** Once everything that must happen is
   tracked there, the CRM *becomes* the source of truth for the work even while contact data is still
   scattered; cleanup itself becomes tracked Board items; the system seeds the CRM from uploaded
   docs/sheets; it compounds each cycle. (Fallback when there's no CRM at all: a local MD Board, which
   moves into the CRM the instant one exists.)
3. **Seed the `aii_` custom fields.** One tool-agnostic dictionary
   (`aii-Canonical-Field-Dictionary`), `aii_`-prefixed at client-seed time to avoid collision
   with the client's existing fields. The onboarding walkthrough creates the `aii_*` fields.

---

## Step 4 — Reconcile: match every item, then sort it into a state

**Match is a dialogue — auto-match, human confirms.** Read each actual item/process and propose
**which model job it answers**, or flag it **"extra — no model asked for this."** When you can't find
an actual thing for a model job, **ask the human to point to what exists (or hand it over).**

**Run the business-model-fit check BEFORE the Extra sort** so genuine differentiators (channel-
protective pricing, partner-referral economics, a network/membership moat) aren't mistaken for clutter.

**Sort every job/item into exactly one state, judged against the model's 10-field card:**

| State | Meaning | What happens |
|---|---|---|
| **Meets the line** | Done the way the model says it should run | Nothing to do — protect it |
| **Falls short** | Done, but not to the model's standard (wrong validation, missing gate, no escalation) | Gap described in words; on request, a **sample** of the model's version so ideal-vs-actual sit side by side |
| **Missing** | The model defines this job; the company doesn't do it | Build gap; **drafted/specified only at the owner's request** (process/decision-right gaps land here too) |
| **Extra** | The company does this; no model asked for it | A lens asks **why it exists / what job it serves** — surfaced WITH reasoning; human keeps or retires; **never auto-retired** |

> The quality check is the heart of it: two call scripts asked for + two owned ≠ done. Field 7
> (Validation) and field 8 (Config-vs-Locked) on the model card define the true line.

> **Sample/draft timing — text first, design later.** Describe the gap in words first. Generate the
> sample (falls short) or draft (missing) **only when the adjudicator clicks "show me your version,"**
> and even then it's a high-quality CONTENT version (MD/text) for review — NOT designed collateral.
> Two gates: text approval, then design (brand rules, canvas-design).

---

## Step 4.5 — Check the scoreboard lights up (the KPI-instrument gap pass)

Right after the model set is locked and the jobs are sorted, run one more reconcile pass — on the
**scoreboard**, not the jobs. For **every number a selected model should track**, check whether the
company's **actual bound tool can even produce that number.** A model is not "done" if its dashboard
is dead. (This is the operating form of Experience-Model **Signal #5 — "every model ships with its
own KPI instrument,"** Core §5.16.)

**Three layers, one comparison (mirrors Step 4, but for measurement):**
- **The ideal = the category's KPI set.** Tool-blind, from the catalog (`kpi-catalog.json`). A KPI
  names a **category + the field it needs**, never a brand.
- **The reality = what the bound tool can drive.** Read live from the Tool-Capability DB
  (the Framework Registry on Neon, `fw_capabilities`), resolved by CATEGORY `framework-capability` / `read_capability` per Core §11 rule 4 — never a connector name.
  The limit always lives on the **tool**, never on the KPI.
- **The binding = this company's category → tool** (the same binding the rest of the engine uses).

**Sort every model KPI into one of four outcomes — they map onto Step 4's four states (one taxonomy, not a second):**

| KPI outcome | Step 4 state | What happens |
|---|---|---|
| **A — Live** | Meets the line | Tool can drive it → it lights up. Protect it. |
| **B — Tool-limited** | Falls short | Tool can't drive it → 90-day punch-list item naming the **tool fix.** The KPI is right; the tool is the gap. |
| **C — Spec'd, not released** | Falls short | KPI designed but untested → surfaced "ready to test"; turning it on is a Board item. |
| **D — No KPI yet** | Missing | Category bound, no KPI exists → ask "what do you want to track here?" + the Experience Designer suggests candidates → route to §8 adjudication to become a future default. Never a silent blank. |

> **Tufte rule:** an unlit KPI shows a **stub** ("Set a revenue target to light this up" / "Connect a
> calendar to light this up") — **never a fake number, never a zero.** Stubs + punch-list items
> together = the wire/upgrade checklist.

> **Goldratt honesty:** a measurement gap is a *visibility* gap and usually sits **downstream** of the
> operating constraint — so §4.5 gaps do **not** auto-rank high. The one exception that ranks near #1:
> when the missing instrument is what's **hiding the binding constraint itself** (e.g. you can't see
> deal velocity *and* "deals stall in the middle" is the suspected #1 blocker). A cosmetic dashboard
> gap never outranks a real Step-4 operating gap.

**Where it runs + when.** Inside the deep first-run audit, as a sub-pass of Step 4 — after the model
lock (Step 2), because you can't check a model's scoreboard before you know which models run. It
re-runs each cadence **and** whenever a tool binding changes (a tool is added or swapped). Output
lands as Board punch-list items: A = a live tile, B/C = a punch-list line with its fix, D = an
elicitation + an adjudication card. It **surfaces the gap and the fix; it does NOT build the KPI or
wire the tool until the owner asks** (Step 2's hard rule holds).

**Where the detail lives.** This is the engine-side hook only. The full design — the KPI catalog, the
capability map, auto-discovery + operator-notify ("here's what's newly possible," Dunford, *before*
the client review), and the API auto-probe — is the source of truth in `KPI-Library-SPEC-v0.1.md`
§6/§6b and the engine spec (Ideal-State & Reconciliation Engine SPEC) §3.5. Do not copy the catalog
into this skill; point at it.

---

## Step 5 — Rank by leverage to the goal (Goldratt, never alphabetical)

Order surfaced gaps by **biggest blocker to the goal first.** Because the unit is a model's job
(gates, decision-rights, validation included), the true constraint always enters the ranking — the
"founder is the system," "no repeatable sales process," a sole-supplier dependency, etc. all rank as
model jobs that fall short or are missing, and outrank any cosmetic asset gap. This is the Goldratt
constraint lens, and it is the engine's real sharpening over a hand-built audit: rank the constraint
that **gates everything upstream** at #1, even if a human would have listed something more visible first.

> **A broken or absent decision gate is the prototypical #1 constraint.** A missing go/no-go gate —
> the founder's sign-off everything waits on, an approval step with no owner, a quote that no rule
> can clear without one person — sits upstream of every job it releases, so it throttles the whole
> system. When a decision gate falls short or is missing, it ranks at or near #1 by default; a
> visible-but-downstream asset gap never outranks the gate that is holding the line behind it.

> **Tag jobs operate-the-company vs. product/deliverable when they blur** (e.g. when the company's
> product *is* an operating system), so the ranking doesn't compare "ship a feature" against "fix our
> own go/no-go gate."

---

## Step 6 — Land it: punch-list to the Board, then prove it

1. **Turn every surfaced gap into a runnable Board item with a clear done-state** (Allen). Each model
   job, its state, its rank, and its keep/fix/build/retire decision is a Board record in the CRM.
   Named gaps (unbuilt models, missing advisor lenses) land as openly-flagged items routed to
   adjudication — not buried.
2. **Hold the line: nothing is built until the owner asks.** The engine's job ends at the decided
   punch-list. The construction/build leg is out of scope.
3. **Set the re-run cadence.** This is a recurring tune-up, not change-detection — the cadence *is*
   the ongoing value. Cadence is a per-client setting, targeted to coincide with the quarterly
   Blueprint firmware upgrades (or more frequent early on). On a re-run: the instantiated ideal is
   re-derived only when the goal changes or a milestone flips; the reconciliation re-runs against
   current inventory each cadence. Cascading rollout (exec → dept heads → individuals) applies only
   when the company is un-collapsed; the ~1-week stage windows are **advisory in v1, not enforced.**
4. **Prove it before you say done** (`aii-prove-it`). On a first run at a company that has a hand-built
   audit, the bar is reproduction: a blind run must surface the same top constraints. Otherwise,
   confirm every job got sorted, the ranking leads with the real constraint, every named gap is
   flagged (not dropped), and the Board records actually wrote. A claim is not proof — the check is
   the proof. Report the result in a line; don't narrate the steps.

---

## Advisors for this engine

- **Goldratt** — reconciliation *is* constraint-finding: rank the model jobs by leverage to the goal.
- **Dunford + Lochhead** — classify the company's model + category so the right Experience Models get
  selected. (Positioning/category — NOT the channel/partner-GTM lens.)
- **Allen** — turn every surfaced gap into a runnable Board item with a clear done-state.
- **Experience Designer (human layer)** — owns the model pick and the confirmation (Step 2).

**When a company's moat is partner-referral or membership/recurring, pull the matching lens —
don't fake it with a generic advisor.** Both lenses now live on the roster (advisor-registry.md):
**Bob Moore** (Domain: Channel & Partnerships — *Ecosystem-Led Growth*, co-sell + partner economics)
for a partner-referral/channel moat, and **Robbie Kellman Baxter** (Domain: Membership & Recurring
Revenue — *The Forever Transaction*, retention + renewal) for a subscription/membership moat. Invoke
them by name and apply the lens. If a company needs a perspective the roster still doesn't carry,
name the gap and route to adjudication rather than letting a generic advisor fake it.

---

## When NOT to use

Pure conversation, or a quick one-off question about a single workflow. This skill is the full
company-vs-models reconciliation; for prepping a single call use the Call Guide, for processing one
after the fact use the Call Debrief.

---

*v1.0 — generic master promoted into the framework from the proven engine run (which passed its
acceptance test: a blind run reproduced a hand-built audit's bottlenecks, "founder is the system,"
and gap ideas). Mirrors the `aii-call-guide.md` format: "the user" / `<Company>` / generic-path
placeholders, no personal overlay. Carries the decision-gate-as-#1-constraint sharpening into Step 5.
Going forward, the personal copy = this master + a thin personal overlay; edit the master here,
regenerate the personal copy from it.*
*v1.1 — §8 advisor-adds gate closed the two known-missing lenses: the channel/partner-GTM and
membership/recurring gaps are now filled by Bob Moore and Robbie Kellman Baxter on the roster
(advisor-registry.md v1.7). Updated the "Advisors for this engine" note to invoke them by name
instead of flagging them as missing.*
*v1.2 — wired the KPI-instrument gap pass in as **Step 4.5** (the pop-up-gated promotion of engine
SPEC §3.5 / v0.9). The reconcile half now checks each selected model's scoreboard against the
company's bound tool — four outcomes (A Live / B Tool-limited / C Spec'd / D No-KPI-yet) that map
onto Step 4's four states — so a model can't pass with a dead dashboard. Engine-side hook only;
catalog + capability map + auto-discovery + API auto-probe stay the source of truth in
`KPI-Library-SPEC-v0.1.md` §6/§6b. Carries the Tufte stub-not-fake-number rule and Goldratt's
"a measurement gap doesn't auto-rank high" discipline. Operating form of Signal #5 (Core §5.16).*
*v1.3 — 2026-07-20. Build/reconcile carve-out (T17·S8, Bryce pop-up-approved; mechanism ruled T17·S7,
card neon_fwc_company_activation_audit_seed_20260720). Named the seam that was already implicit: added
the top-of-skill **connector gate** note (build half = Steps 1–2, connector-less, runs pre-call,
pre-seeds the board from the CEO audit; reconcile half = Steps 3–4.5, gated behind Live connectors),
marked Step 2 as the connector-less pre-call build half, and marked Step 3 as where the reconcile half
(and the connector gate) begins. Unblocks pre-call board pre-seed without weakening the rule that
reconciling real data needs Live connectors. Sibling edits: `aii-patch-me-up` v1.2 (Step 4 split) +
engine spec §6 (lifecycle split). Lens: Evans (two bounded contexts; gate on the seam). No change to
what the engine reconciles or how it ranks.*
