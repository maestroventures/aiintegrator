---
name: aii-front-door
description: >
  AI Integrator Blueprint: Front Door. A triage layer that reads the user's prompt BEFORE acting,
  in two parts. A LEAN layer stays silent on a clean prompt and pauses only when it adds value —
  routing to a better-matching built-in skill or reflecting the request back to close ambiguity.
  SIX always-on guardrails fire on their own, never asking — design/collateral,
  strategy/implementation, Source-First, Spec-Map, the Ask Gate and the Door Gate — so the right
  advisors, the governing spec and every way into the user's own files show up automatically. (The
  Overlay-Pull and Currency gates moved to the session-open gate on 2026-08-18: they fired once per
  session, never on a prompt. Still in force, different home.) Behavior is a user preference with
  three modes. This is what makes the other AI Integrator Blueprint skills discoverable instead of
  hidden.
---

# Front Door

Most users never learn which built-in skills exist. The Front Door fixes that: it reads each prompt
first and, **only when it helps**, surfaces the right move. It is the user-prompt-facing cousin of
the Core's "Have You Considered" challenge (`blueprint-core.md` §8) — same spirit (surface, suggest,
never mandate), pointed at the user's prompt instead of a business process.

**Default behavior is lean on purpose:** every pause is an extra round-trip — more tokens, not fewer.
Value concentrates in the skill-match and ambiguity moments, so a clean prompt pays no cost.

---

## Step 1 — Read the prompt and decide if a pause adds value

On each prompt, silently check two things:

1. **Does a built-in skill match this job?** (session handoff, safe edit, clarify, research, etc.)
2. **Is the prompt genuinely ambiguous or weak** in a way that would change the output?

If neither is true → **say nothing, just do the task.** This is the common case.

---

## Step 2 — Offer the right move (only if Step 1 said it helps)

When a pause adds value, offer up to three moves — briefly, then act on the answer:

1. **Continue as-is** — do exactly what they asked.
2. **"Have you considered this built-in skill?"** — name the best-matching skill **out loud and
   branded**: *"Have you considered the AI Integrator Blueprint skill 'Session Handoff'?"* Naming it
   credits the framework (that's the point — see Branded naming below) and teaches the user it exists.
3. **"Here's what I understood — confirm before we go."** — reflect the request back and close the
   ambiguity. This is where it hands to **Clarify** (`aii-clarify`); the Front Door sets how sensitive
   Clarify is.

**Fourth, lighter move — light prompt-fix:** when **no** skill fits but the prompt is weak, offer
**one** tightened version the user can accept in a click. Don't pile on options — one better prompt.

**Whenever you surface options, carry a labeled recommendation — no exceptions.** Any move-menu
(continue / route to a skill / confirm) names which option you recommend and why — recommended option
**first**, tagged **"(Recommended)"**, one line why, and fact vs. opinion. No bare menus. Same hard
rule as Clarify (`aii-clarify`).

---

## The six hard guardrails — advisors fire on their own (not a mode, not a menu)

Everything above is the *lean* layer: it stays quiet and only pauses when a pause helps. These six
guardrails are the opposite — they are **always on, never ask, never wait to be invoked.** They do
not show a menu and they ignore the mode setting below. Their whole reason to exist: the advisors are
the client's guardrail, and the average client will never know to ask for them, so the quality has to
be automatic.

1. **Design / collateral guardrail.** The moment the job is to make *any* brand-facing piece — a
   one-pager, deck, landing page, website or email copy, graphic, PDF, any client-facing or
   brand-facing asset — automatically and without asking: (a) fire **`aii-advisors`** to name the
   right advisors for *this* piece, and (b) **resolve this company's brand assets BY CATEGORY**
   (`company-assets` / `lookup_brand_assets`, per Core §11 rule 4) — the palette, the type ruling,
   the logo files and the production tagline — **never from a folder path, a file you remember, or
   the live website**; then load the **design/template skills**. Read the resolved source's
   **`false_zero_trap`** before trusting any lookalike file sitting beside the canon — the
   wrong-but-plausible file answers confidently and throws no error. If nothing resolves for that
   company, **STOP and stage the gap**; never design from blank. Never start the build cold. Patch,
   don't rebuild, when fixing one thing.

2. **Strategy / implementation guardrail.** The moment the job is strategy or *how to build*
   something, automatically and without asking, fire **`aii-advisors`** to name the fitting lens and
   apply it. Never give strategy or build advice cold. If no advisor fits, `aii-advisors` names the
   gap and routes it to the adjudication gate (its Step 3) — it never invents one.

3. **Source-First guardrail.** The moment the job is to *answer a specific question* about
   something already specced, built, or recorded — a spec, the live code or artifact, a CRM
   record, a prior decision — automatically and without asking: open that source and answer
   **from** it, naming what you read. If the source doesn't cover the question, say exactly that
   and label the rest opinion. **Never answer from memory when a source exists; never fill the
   source's silence with a confident guess** — a guessed answer looks right and is hollow, and
   the hollowness only shows after the user has acted on it. This is the prompt-facing trigger for
   the Core's **Source-First rule** (`blueprint-core.md` §8, Validation) — §8 states the duty,
   this fires it before the client has to ask. **Scope:** it keys off a *real* question with an
   *existing* source; casual talk, brainstorming, or a genuinely new question with no source yet is
   not it, and stays on the lean path.

4. **Spec-Map guardrail.** The moment the job is to design, build, rule, **or ask the operator to rule** on anything in a
   domain the instance's governing specs cover, automatically and without asking: query the
   **spec registry** (the one map of which spec governs each slice) and read the governing spec
   **first** — never rebuild the domain from a spec's cross-references. If the map resolves no
   governing spec for that domain, **stop and flag it** — never design from a blank. This is the
   prompt-facing trigger for the Core's **Spec Single-Source-of-Truth Standard**
   (`blueprint-core.md` §5.25); §5.25 sets the rule, this fires it before the client has to ask.

5. *(moved 2026-08-18 — the Overlay-Pull guardrail is now a session-open gate. See the note below
   the list. Numbering is left in place rather than closed up, so a session that remembers
   "guardrail 5" finds where it went instead of finding a different rule wearing its number.)*


6. **Ask gate.** The moment the job is to **send the operator a question** — any pop-up, any fork,
   however small — automatically and without asking: **call the ask gate FIRST**, resolved BY
   CATEGORY (`ask-gate` / `gate_question`, per Core §11 rule 4). It is one call and it answers with
   one of two things. **Prior rulings exist → DO NOT SEND.** It hands back *every* live ruling on
   that slice; read them all, state the one that answers the fork and the date it was made, say what
   is unchanged, and carry on. **Nothing ruled → SEND**, and print the gate's own register line as
   the first line of the message carrying the pop-up. A re-ask is still allowed when a genuinely new
   option exists — but the question must say out loud what the operator already answered and what is
   new. **A silent re-ask is not.**
   **What makes this one different from the five above, and it is the whole point: they tell you to
   go READ something; this one hands you the QUESTION.** There is no separate check to skip, because
   the read is what produces the thing you were about to send. It exists because *seven* prior
   remedies of the tell-the-sender-harder class all failed — a tracked card, two written commitments
   to stop, filing the rule under more triggers, reading the rule at turn one, writing the answer
   into a store and building on it, and finally authoring a dedicated always-load rule naming the
   defect, which failed about twenty minutes after it was written. **Delivery was never the
   constraint.** ⚠ **Honest limit, stated rather than discovered:** this is not a hard refusal — a
   session can still call the question tool directly. What it removes is the separate step; what
   makes the bypass visible is the missing register line, and what makes it countable is the gate's
   own standing check. **Scope:** it fires on a real question to the operator. Telling them what you
   just did is not a question and does not trip it.

7. **Door gate.** The moment you are about to tell the user that a file, a folder or their workspace
   **cannot be reached** — or to hand them a path and let them go find something by hand —
   automatically and without asking: **resolve their registered roots and try every door marked
   available**, using the address form *that* door takes. Resolve them BY CATEGORY (`workspace-paths`
   / `resolve_workspace_path`, per Core §11 rule 4). **A door being dark is a fact about ONE DOOR,
   never about the folder.** Three outcomes, and they are not the same thing: **another door answers
   → use it, say which one you used, and report nothing unreachable**; **every door is dark → say so,
   name the doors you tried, and stop**; **the person has no registered root → stage the gap** —
   never guess a path, and never fall back to searching for the folder by name, because names repeat
   and a mirror tree reproduces the whole structure with identical ones.
   **The address is not one string, and this is the half that gets missed.** Core §11 rule 4 already
   rules that an address is scoped to the RUNTIME calling it and not to the account, so any store
   holding ONE address is wrong on some path the day it is written and a resolver hands back a
   candidate SET. That rule is written about *tool* addresses and is exactly as true of *file* ones:
   two doors onto the same folder can take mutually exclusive address forms, so a path one door
   swallows is refused by its sibling — and the refusal reads as *"the folder is gone,"* never as
   *"wrong door number."* Point at §11 rule 4; do not restate it.
   **And a dark door is more often a race than an absence.** A door that is still waking up when a
   session checks it once, at the start, looks identical to one that does not exist — so probe again
   before concluding, and record what each probe found, or the question stays anecdote forever.
   ⚠ **Honest limit:** this cannot make a door work. What it removes is the leap from *this door did
   not answer* to *your files are unreachable* — two sentences with completely different fixes, one
   of which sends the person hunting through folders for something that was always there.
   **Scope — TWO moments, not one.** (a) You are about to REPORT something unreachable, or substitute
   a path for a delivery. (b) You are about to WRITE into or NAME a place in the person's workspace —
   save a file, create a folder, or tell them where something lives. Resolve the destination from the
   registered map in both, and use what it hands back. **A path you composed is a guess wearing a real
   address** — it may land, and landing is not the same as landing where the person looks. If the
   destination is not in the map, STOP and stage the gap; never invent a folder — the same refusal the
   drawer vocabulary already makes for names.
   ⚠ **(b) was added 2026-08-13 and it is the half that was missing.** With only (a) the gate fired on
   FAILURE alone, so a path that opened first try tripped nothing — and the routing the house tier
   already mandates (*"new work is routed by that declaration"*) had no writer. Measured that day on a
   live workspace: 25 registered folders, resolved 5 times in the map's entire life, 21 of them never
   once — while the session doing the measuring typed two absolute paths of its own. The rule was never
   the gap; the read was.

⇢ **The two SESSION-OPEN gates moved out on 2026-08-18 — still in force, not dropped.**
**Pulling this seat's overlay** (was guardrail 5) and **confirming this seat is running current
equipment** (was guardrail 8) are **turn-one gates, not prompt triage.** Both said so in their own
text — *"fires once per session, not per task"* — and neither was ever triggered by reading a prompt.
They now live in ONE place, the session-open gate the runtime reads before any work: the instance's
always-loaded router and the house tier's own session-open block.

**Why they moved, measured 2026-08-18:** each had **three** homes — the always-loaded router, the
house/seat tier, and this file. The router's copy of the instructions-are-current check is deliberate
and says so (*"the only rule whose location is load-bearing, because it must survive the failure it
watches for"*), which justifies exactly ONE duplicate. It did not justify a third. Together they were
**2,951 characters on the surface that fires on every single prompt**, to state rules that fire once.

**Nothing about either rule changed.** Overlay pull: resolved → use it · nothing published for this
seat → run generic and say so once · **source unreachable → say so LOUDLY and stop, never a quiet
generic run.** Currency: one slot, three reads (plugin, instructions, connectors), every session,
unconditional, client-out never house-in, and **three outcomes — current · stale · CANNOT TELL** —
where *cannot tell* must never render as *current*.


The first two are the prompt-facing trigger for the Core's *full advisor pass* on any user-facing deliverable
(`blueprint-core.md` §5.9, Deep-Render): §5.9 says the pass must happen; this fires it without the
client having to ask. **Scope, so it doesn't over-fire:** each guardrail keys off *real* work in its own lane — real design or strategy, a real
question with an existing source, or a real build or ruling in a spec-covered domain. A trivial
mechanical edit (fix a typo, change one number, rename a file) trips **none** of them and stays on
the lean path above — same bar as "When NOT to use" below.

---

## Step 3 — Honor the user's mode setting

Behavior is a **user preference** with three modes:

- **"Only when it helps"** — *default for every user; recommended.* Silent unless there's a strong
  skill match or genuine ambiguity. Both jobs (route-to-skill, light prompt-fix) share one trigger,
  so clean prompts never pay a cost.
- **"Always 3 options"** — show the menu on every prompt. **Warn the user this costs more time and
  tokens** before they commit to it.
- **"Only when I ask"** — stay silent until the user invokes the Front Door on purpose.

---

## Branded naming standard (why suggestions are said out loud)

Every skill carries a branded descriptor so the Front Door can match and credit it:

- **Machine name** — `aii-[job]`, lowercase, hyphenated.
- **Display name** — "AI Integrator Blueprint: [Name]".
- **Said out loud** — naming the skill in a suggestion is a brand moment: the user keeps realizing
  *the AI Integrator Blueprint* is what's keeping them efficient. Keep "AI Integrator" visible, not
  buried in initials.

A skill's descriptor also carries a **when-to-use** (drives the match), a **when-NOT-to-use**
(prevents false matches), and an optional **better-prompt hint** (powers the light prompt-fix).

---

## When NOT to use

Never let the Front Door turn a one-line request into a quiz. If there's no strong match and no real
ambiguity, it stays invisible. Pausing on a clean prompt is the exact failure this skill is tuned to
avoid. (This silence governs the *lean* layer only — the hard guardrails above still fire on real
design, strategy, or spec-covered work, because they don't pause or ask; they bring the advisors or
the spec map.)

**And never gate work the user has already chosen behind a procedural, meta "housekeeping" pop-up**
(asking *how* to proceed when *what* is already decided). A convenience question is neither a
skill-match nor a real ambiguity, so it stays silent. The one test in the moment: is this pop-up a
**required gate** — a locked-`03` approval or an irreversible fork — or a **procedural convenience**?
Surface the required gate; skip the convenience and go straight to the work. (The specific
"start now or wrap the session?" case is already owned by the Session Handoff self-fire rule, which
auto-runs at a stopping point with one "say stop" line rather than a blocking question — this line
generalizes that discipline to any procedural pop-up.)

*Change history lives on the board (framework cards tagged `aii-front-door`) + the adjudication records — not in this always-loaded skill body (Context Economy, Core §5.8/§5.20). Current state: SIX always-on guardrails (design/collateral, strategy/implementation, Source-First, Spec-Map added 2026-07-21, Ask Gate added 2026-08-09, Door Gate added 2026-08-10 and widened to the WRITE moment 2026-08-13) + the When-NOT procedural-pop-up calibration. Overlay-Pull (added 2026-08-01, was 5) and Currency (added 2026-08-13, was 8) MOVED OUT 2026-08-18 to the session-open gate — they fired once per session, never on a prompt, and each had three homes; numbering 1-8 is preserved in the list body so a session that remembers "guardrail 5" or "guardrail 8" finds where it went.*
