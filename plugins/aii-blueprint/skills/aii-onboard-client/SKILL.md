---
name: aii-onboard-client
description: >
  AI Integrator Blueprint: Onboard Client. The one skill that owns standing a new client up on the
  Blueprint, end to end, so nobody re-derives the order. It knows where the setup walk ends and where
  the session takes over: the walk owns every step that happens inside the AI platform's own Settings
  screens — connect the workspace, install the plugin, install and authorize each connector, enable the
  required account skills — because a session physically cannot click Settings. Everything after that
  is a conversation and runs here: verify the equipment, run the interview, write every answer back to
  the client's own store, then hand off to the audit. Fires on "onboard," "new client setup," "get them
  started," "stand up their Blueprint," "run the install," or the first working session on a fresh
  seat. It never reports a step done that it cannot see.
---

# Onboard Client

Standing a client up has always been four things in four rooms — a walk page, a plugin, a spec, and a
card library — and **no single thing owned the order.** So every session re-derived it, each one drew
the boundary somewhere slightly different, and the honest answer to *"can this be done in session?"*
came back different every time. That is not a documentation problem. **It is a missing procedure**, and
this is the procedure.

**The one sentence this skill exists to hold: a session cannot click Settings.** Everything that is a
click inside the AI platform's own settings screens belongs to the walk, because a page that shows one
screenshot at a time is the right instrument and a session physically cannot do it. Everything that is
a *question* belongs here, because answering questions is a conversation and a web form is the weaker
version of one. Every argument about "what onboarding means" has been this line, undrawn.

---

## Step 0 — Know which side of the line you are on

Before anything else, establish **where this client is**: have they finished the setup walk, or not?

- **Not started / mid-walk** → your job is Step 1 and Step 2. Do **not** start the interview. A client
  answering questions before their equipment is live produces answers with nowhere to land.
- **Walk complete** → your job is Step 3 onward.

If you cannot tell, **say so and ask them one plain question** — *"have you finished the setup page
yet?"* — rather than guessing. Guessing here is how a client gets asked to redo work they already did.

---

## Step 1 — The door-opener carries two things and nothing else

Somebody has to reach the person before any of this can start, and the only job of that first message
is to **get them to the door.** It carries exactly two things:

1. **A brief overview of what they are about to do** — plain, short, no jargon, no step list.
2. **The link** that takes them to the setup walk.

**It does NOT carry the connector how-to** (the walk teaches that, one card at a time, with a picture),
and it does **NOT** carry what happens after they are connected (that is Step 3 onward, and it happens
in a conversation, not in an email nobody re-reads).

The reasoning, and it is the whole design principle: *you cannot follow instructions if you do not know
where you are supposed to get the instructions from.* The message is a handoff to the surface that
carries the instructions — never a second copy of them.

*(Lens: Krug — one obvious next action. Carnegie — say why they should care before you say what to do.)*

---

## Step 2 — The walk owns every step that is a click in Settings

These are the steps a session cannot perform, in the order they must happen. **Each one is a card on
the walk, not a message in a chat.**

1. **Confirm the environment** — which machine, which platform, which browser. Everything downstream
   branches on it, and getting it wrong sends the client a screenshot of a screen they do not have.
2. **Connect the workspace** — so the system can reach their files.
3. **Install the plugin** — this is what delivers the framework's own skills. **They arrive with the
   plugin; there is no separate step for them, and telling a client to install them individually sends
   them hunting for something that is already there.**
4. **Install and authorize each connector the client actually uses** — installing and authorizing are
   **two acts, in that order**, and a connector that is installed but not authorized is not connected.
   Never report the second act as done because the first one succeeded.
5. **Enable the required account-level skills.** These are **not** the framework's own skills and they
   do **not** arrive with the plugin — they are enabled per account, in Settings, one at a time. Which
   ones are required is a property of the JOBS the framework performs for this client, read from the
   capability floor; it is never inferred from what happens to be installed. **This step is on the walk
   precisely because it is a Settings click** — the same test that put steps 1–4 there.

**The walk ends when the last of these is done.** Nothing that asks the client a question about their
business belongs on the walk, no matter how convenient the form is.

⚠ **Verifying a step is part of the step.** A card that says *do this* and cannot say *here is how you
know it worked* has taught the client to guess. If a step has no way to show its own result, say that
out loud on the card rather than leaving a silent success.

*(Lens: Norman — the instrument must match the action. Nygard — never let an unverified step read as
a completed one.)*

---

## Step 3 — First thing in the session: check the equipment before you ask anything

The client arrives in their session having done the walk. **Do not open with a question about their
business.** Open by confirming that what they just set up is actually live — hand this to
**`aii-patch-me-up`**, which owns it: it reads their connector inventory and the required-capability
floor, sorts everything into plain buckets, and offers the one fix for anything that is not live.

This is a hand-off, not a re-implementation. **One fact, one file.**

Two things this skill insists on, because the walk cannot check either:

- **A step the client ticked is a claim, not a proof.** Re-read the live state. A client who clicked
  "authorize" and landed on an error page will tick the box anyway, because the page told them to.
- **A missing skill announces nothing.** A missing connector fails loudly the first time something
  reaches for it; a missing skill just quietly does not fire. So the floor gets checked explicitly,
  every time, and a floor read that comes back empty is a **defect, never a clean result.**

---

## Step 3b — Give their workspace its shape BEFORE anything is filed into it

Numbered 3b on purpose rather than renumbering the steps below it: this is a small step that has to
happen at a specific moment, not a re-cut of the walk.

The client's folders get their declared shape and their drawer vocabulary **now**, before the
interview writes the first thing into them. The house tier's *When you put working files away* block
is the rule; this is the only moment it can be applied for free.

- **Register this client's drawer vocabulary in their OWN store first, then create the folders.** The
  order matters: the standing work-drawer check refuses to run without a vocabulary for the seat it
  is checking, so folders created before the vocabulary exists are folders nothing can police. If the
  write target cannot be resolved, **stop and say so** — the Step 4 rule about never falling through
  to a default store applies here too, and it applies harder, because a drawer vocabulary written to
  the wrong seat makes every later check answer confidently about somebody else.
- **Say the shape out loud, in their words, before creating anything, and get a yes.** What each
  top-level folder is for, in one plain line each. This is a client-facing structure they will live
  in for years, so it is a question, not a default — and per Step 6 it is *said*, one at a time,
  recommendation first. Never a rendered list they are expected to approve by looking at it.
- **Then create the shape, and write the declaration down where they will find it.** A shape that
  exists only in this conversation is not declared. The folder that holds the declaration is part of
  the shape.
- **Why this is a step and not a cleanup task later:** measured 2026-08-10 on a workspace with no
  declared shape, the folders that had none held 86, 35, 16 and 13 things and the one with a written
  taxonomy held 5 — and untangling one of them afterwards nearly broke the product, because by then a
  personal folder had become a load-bearing address for something else. People adopt what is already
  there. Born with the shape costs one step; retrofitting it costs a session and risks a regression.
- **Do not report this step done if you cannot see the folders.** Same rule as every other step here.

*(Lens: Rogers — an innovation is adopted on its observability and its complexity, and a folder that
already exists scores on both where a written rule scores on neither. Evans — one bounded context,
one owner: the client's vocabulary lives in the client's store.)*

---

## Step 4 — The interview is a conversation, and every answer is written back

Now the questions. They already exist as data — this skill does not author them and must not restate
them; it **runs** them, in order, in the client's own words.

- **Ask them here, one at a time, in plain language.** This is the half the walk was always doing
  badly: a form cannot follow up, cannot notice an answer that contradicts an earlier one, and cannot
  tell the difference between *"I do not know"* and *"that does not apply to us."* A conversation can.
- **Write every answer back to the client's own record, as it is given** — not at the end, not in a
  summary. An answer held in the conversation and never written is lost the moment the chat closes.
- **A question that belongs to somebody else gets handed to them**, with enough context to answer it,
  and the answer lands beside the client's rather than replacing it.
- **Whose store the answers land in is not a detail.** A client's answers about their own company
  belong in the client's own record. If the write target cannot be resolved, **stop and say so** —
  never fall through to a default store and report success. A wrong write here succeeds silently, and
  a silent success is the worst outcome available.

*(Lens: Evans — one bounded context, one owner. Nygard — a fallback that fires on failure is a defect
wearing a helpful face.)*

---

## Step 5 — Then, and only then, the audit

Once the equipment is live and the interview is captured, hand off to **`aii-tune-up`** for the deep
audit of the company against the framework. This skill does not perform the audit and does not
duplicate any part of it.

Note the seam that already exists and do not re-litigate it: the Tune-Up's **build half** needs no
connectors and can run early; its **reconcile half** waits until the connectors are live, because it
reads the company's real stuff through them.

---

## Step 6 — Never leave an offer as a rendered affordance

Everything this skill hands a client — a step, an install, an enable, a fix — is **said, in words, one
at a time, recommendation first.** Drawing a button or a list on a screen is not asking. The rule and
its lived proof are homed in **`aii-patch-me-up`** Step 3; this skill enforces it and does not restate
it.

---

## Fail loud, and never fake a finish

- **A step you cannot verify is reported as unverified**, by name. Never fold it into a count of
  completed steps.
- **A capability floor that reads empty is a defect**, not an empty result.
- **A client store that cannot be reached stops the run.** Say which store and say what you tried.
- **"The walk says it is done" is not evidence.** The live read is the evidence.

---

## When NOT to use

Not for a client who is already stood up and running — that is `aii-patch-me-up` for the setup and
`aii-tune-up` for the company. Not for adding one connector to an existing seat. This is the first
run, once, for a new client.

---

*v1.0 — 2026-08-06. New deployable body, Bryce pop-up-approved (T14 S74). Adopted via `aii-adjudicate`:
KIND = SKILL (a procedure that must run in order); classify = **Absent** — 18 bodies in
`deployable-skills/` and none owns the onboarding walk; **sharpen-first tested and failed to find a
home** — `aii-patch-me-up`'s moment is "check my setup" and `aii-tune-up`'s is "audit the company,"
neither is "walk this person from the door to done." Three-strikes cleared: it RECURRED (the operator,
verbatim: "we keep going round and round about what onboarding actually means," and separately "what I
was told multiple sessions was everything could be done in session, then they couldn't, and I could
never get a straight answer"), it COST DIAGNOSIS every time, and a FIXED SEQUENCE would have prevented
it; the severity override also applies, since the gap blocks an install. Stage: **4 (Do)** —
`blueprint-skills.md` §9. It does **not** close §9's stage-7 hole, which is about confirming that a
written rule or shipped file reached its reader; that hole stays named. Spine is two operator rulings
of 2026-08-06: the walk ends at the last Settings step and everything after is a conversation, and the
first message is a door-opener carrying an overview plus a link and nothing else. Master is
instance-ID-free per §7 — it names the walk, the floor, the question set and the client's own record as
SLOTS; the overlay fills them. Lens: Evans (onboarding is one bounded context with one vocabulary),
Krug (one obvious next action, never a screen to interpret), Norman (the instrument must match the
action — a page for a click, a conversation for a question), Nygard (an unverified step is never a
completed one), Rogers (adoption friction is what the first walk surfaces). Register:
dr_onboarding_is_a_skill_20260806.*
