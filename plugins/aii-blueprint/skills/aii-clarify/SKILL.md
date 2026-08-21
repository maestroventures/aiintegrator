---
name: aii-clarify
description: >
  AI Integrator Blueprint: Clarify. Closes real ambiguity before acting on a request. Use this
  whenever a task has a gap, an unstated assumption, or more than one reasonable reading that would
  change what you build. It asks the smallest set of pointed questions needed to remove the
  ambiguity — one at a time — then proceeds. It also RESETS after any correction: once the user
  fixes or redirects something, re-check the next step for new ambiguity instead of assuming the
  path is clear. Calibrated by the Front Door so a clean, obvious request never gets interrogated.
---

# Clarify

Acting on a half-understood request wastes the user's time twice — once building the wrong thing,
once redoing it. This skill closes the gap *before* the work, with the fewest questions possible.

Its sensitivity is set by the Front Door (`aii-front-door`): a clean, unambiguous request should
just get done. Clarify fires when a gap would actually change the output — not to cover every
theoretical unknown.

---

## Step 1 — Find the gaps that would change the output

Before starting, scan the request for:

- **Missing inputs** — something you need that wasn't given (a file, a number, a name, a target).
- **Ambiguity** — more than one reasonable reading, where the readings lead to different work.
- **Unstated scope** — how much, how deep, what format, who it's for.
- **Hidden assumptions** — anything you'd otherwise guess that, if wrong, wastes the effort.
- **Check the source before you ask.** If an existing spec, record, or artifact already answers it, read it (**Source-First**, `blueprint-core.md` §8) — don't ask. Ask only for the genuine gaps no source covers.

If none of these would change what you produce, **don't ask — just do it.** Asking for the sake of
asking is its own failure.

---

## Step 2 — Ask the smallest set, one at a time

When you do need input:

- Ask in a **pop-up / direct question**, not buried in prose. A question the user must answer is a
  pop-up; a thing you're just noting is plain-text FYI — don't dress an FYI up as a question.
- **One question per pop-up.** If several are coming, say so up front ("3 things before I start")
  and ask them in order so each can be read in context.
- **Every question carries a labeled recommendation — no exceptions.** Give **numbered options**, list
  the one you recommend **first** and tag it **"(Recommended)"**, add one plain line on **why**, and say
  whether that pick is **fact-based or your opinion**. This lets the user answer point-by-point instead
  of writing an essay. If you can't form a recommendation, the question isn't ready — do the homework and
  form one first. Pull what you can figure out yourself; only ask for the genuine gaps.
- Keep every question at a plain, no-jargon level.

---

## Step 3 — Reset the loop after any correction

This is the part most systems skip. When the user **corrects you, redirects, or gives feedback**,
don't assume the next step is now clear just because the last one was answered. **Re-run Step 1** on
the new direction: the correction often opens a fresh gap. Loop until nothing material is unclear,
then proceed.

---

## When NOT to use

Don't clarify a request that's already clear and self-contained — that's friction, not care. Don't
re-ask something the user already answered earlier in the session. And don't use a question to stall;
once the gaps are closed, build.

*Change history (dated entries) lives on the board — framework cards + `aii-adjudicate` rulings — per Context-Economy Law 3 (`Context-Economy-Standard-SPEC-DRAFT` §Law 3; Core §5.8/§5.20). The Source-First behavior is in Step 1 above.*
