---
name: aii-onboard-client
description: >
  AI Integrator Blueprint: Onboard Client. The one skill that owns standing a new client up on the
  Blueprint, end to end, so nobody re-derives the order. It knows where the email ends and where the
  session takes over: the email does only what cannot wait for a session — add the plugin and connect
  the Workspace connector — and hands the person into a task. Everything after that runs here, with
  someone on the line: every remaining connector installed, authorized and given its permissions while
  the person clicks, the required account skills, the equipment check, the interview with every answer
  written back to the client's own store, then the hand-off to the audit. Fires on "onboard," "new client setup," "get them
  started," "stand up their Blueprint," "run the install," or the first working session on a fresh
  seat. It never reports a step done that it cannot see.
---

# Onboard Client

Standing a client up used to be four things in four rooms — a walk page, a plugin, a spec, and a
card library — and **no single thing owned the order.** So every session re-derived it, each one drew
the boundary somewhere slightly different, and the honest answer to *"can this be done in session?"*
came back different every time. That is not a documentation problem. **It is a missing procedure**, and
this is the procedure.

**The one sentence this skill exists to hold: the email does as little as possible, and everything a
session can carry, the session carries.** The line is not "is this a click in Settings" — a person can
click while a session guides them. **The line is whether anyone is on the line with them.** Before the
Workspace connector is connected, nobody is, so those steps have to be written down in an email. The
moment it is connected, a session is there, and it can do what an email never can: see whether a step
actually landed, notice when it did not, and keep track. Every argument about "what onboarding means"
has been this line, undrawn.

---

## One entry point, three states — the words the person used do not choose the room

*"Patch me up," "tune me up," "onboard me," "set me up"* — however a person asks to be brought right,
it is **one entry point**. They never pick between onboarding, a setup check and a company audit. The
system works out which of three states they are in, and routes:

- **Installed** — they have already been set up. Check their skills, tools and connections, review the
  assets they already hand out (Patch Me Up), then offer to measure the company against its ideal
  (Tune-Up).
- **New, with files** — they have started, or they have handed over real material (a transcribed
  meeting, an executive summary). Continue where it left off, starting from what they gave.
- **New, with nothing** — there are no documents to start from. Start from scratch.

**These are separate rooms behind one door, and they call each other:** this skill stands a new client
up, Patch Me Up keeps a set-up person current, and Tune-Up measures the company against its ideal. How
many skills that is does not matter to the person and is never a question to put to them.

**The steps for each state are a lookup, not a list in this file** — the instance's first-run route
returns them in order for the state given. **Read the state from the person's own record; never infer
it from the words they used.** If the record cannot say which state they are in, say so in one plain
line and ask one plain question — *"have you been set up before, and is there anything written about
the company you want to bring?"* — rather than guessing.

---

## Step 0 — Know which side of the line you are on

Before anything else, establish **where this client is**: have they done the email's two things — the
plugin added and the Workspace connector connected — or not?

- **Not yet** → your job is Step 1: get them the email, or back to it. There is no session to work in
  until the Workspace connector is connected.
- **Both done, and they are in a task with you** → your job is Step 2 onward. Do **not** start the
  interview until Step 2 is finished: a client answering questions before their equipment is live
  produces answers with nowhere to land.

If you cannot tell, **say so and ask them one plain question** — *"have you added the plugin and
connected the Workspace connector yet?"* — rather than guessing, then read the live state to confirm it.
Guessing here is how a client gets asked to redo work they already did.

---

## Step 1 — The email does two jobs, then hands them to a session

Somebody has to reach the person before any of this can start, and nobody is on the line with them yet.
So the first message is an **email**, and its whole job is the two things that cannot wait for a
session:

1. **Get the plugin added.**
2. **Get the Workspace connector connected and authorized.**

Around those two, it carries only what they need to do them: a short, plain description of what is
about to happen and roughly how long it takes; what to have ready before they start; how to add the
plugin and how to connect the Workspace connector, each with *how you will know it worked*; and the
handoff — **open the desktop app, start a new task (not a chat), and say they are ready to onboard.**
The words for the app and the kind of task come from the person's own setup, never typed as a vendor
name into the copy.

**It does NOT carry anything a session can do instead** — no other connector, no permissions step, no
link to a setup page, and nothing about what happens after they are connected. An email can instruct
and can never check; a session can do both. Every step moved out of the email is a step that can be
tracked.

The reasoning, and it is the whole design principle: *as few things as possible happen in the email;
anything that can be handed to a session is handed to a session,* because that is where somebody can
see whether it actually happened.

*(Lens: Krug — one obvious next action. Carnegie — say why they should care before you say what to do.)*

---

## Step 2 — In the session, they click and you guide, one connector at a time

The person is now in a task with you. **They do the clicking; you tell them the next click, one at a
time, and you check each one landed before moving on.** Nothing here is a screen or a form.

1. **Confirm their setup — never ask it cold.** Call `my_seat_env`, show them its `confirm_question`
   word for word, and ask only "is this right?". If they correct a field, call `correct_my_seat_env`
   with just that field. Everything you tell them to click branches on it, and getting it wrong
   describes a screen they do not have.
2. **Confirm the plugin and the Workspace connector from the email actually landed.** Read the live
   state; a person who followed the email is not proof that it worked. The framework's own skills
   **arrive with the plugin** — there is no separate step for them, and telling a client to install
   them individually sends them hunting for something that is already there.
3. **Set the Workspace connector's permissions with them.** This moved out of the email on purpose: here
   you can look at the settings with them instead of leaving them to find the page alone.
4. **Capture their sender addresses, then let them confirm each one.** Once Workspace is authorized,
   call the Workspace connector's `email_sendas_list` on their own account and pass its `aliases`
   unchanged to `capture_my_sender_addresses` with source "connector". If that read fails, ask them to
   list the addresses they send email from, and pass their words with source "person_said". Then call
   `list_my_unconfirmed_sender_addresses` and ask each `question` word for word, one address at a time:
   business, personal, or no longer used, and may I send email from it. Record each answer with
   `confirm_my_sender_address` before asking the next. Never answer for them; `suggested` is a hint,
   not their answer. No new Google permission is asked for (ruling
   dr_a_clients_sender_addresses_are_captured_in_their_first_onboarding_session_20260915).
5. **Then every other connector, in the instance's order, the same loop each time:** install it,
   authorize it, set what it is allowed to do, verify it — then the next. Installing and authorizing are
   **two acts, in that order**; a connector that is installed but not authorized is not connected. Never
   report a later act as done because an earlier one succeeded.
6. **Enable the required account-level skills.** These are **not** the framework's own skills and do
   **not** arrive with the plugin — each is enabled per account, one at a time. Which ones are required
   is a property of the JOBS the framework performs for this client, read from the capability floor;
   never inferred from what happens to be installed.

**This step ends when the last of these is done and verified.** Nothing that asks the client a question
about their business belongs here — that is Step 4.

⚠ **Verifying a step is part of the step.** Say *here is how you will know it worked* before they click,
then read the result yourself. **Some settings cannot be read from inside a session.** When a step's
result is one of those, say so out loud and ask them to tell you what they see — never let a step you
could not see read as a completed one.

*(Lens: Norman — one next action, and its result visible. Nygard — never let an unverified step read as
a completed one.)*

---

## Step 3 — First thing in the session: check the equipment before you ask anything

By now the client has done the email's two things and Step 2 with you. **Do not open with a question
about their business.** Open by confirming that what they just set up is actually live — hand this to
**`aii-patch-me-up`**, which owns it: it reads their connector inventory and the required-capability
floor, sorts everything into plain buckets, and offers the one fix for anything that is not live.

This is a hand-off, not a re-implementation. **One fact, one file.**

Two things this skill insists on, because a checklist the client ticks cannot check either:

- **A step the client ticked is a claim, not a proof.** Re-read the live state. A client who clicked
  "authorize" and landed on an error page will tick the box anyway, because the page told them to.
- **A missing skill announces nothing.** A missing connector fails loudly the first time something
  reaches for it; a missing skill just quietly does not fire. So the floor gets checked explicitly,
  every time, and a floor read that comes back empty is a **defect, never a clean result.**

---

## Step 3b — Give their workspace its shape BEFORE anything is filed into it

Numbered 3b on purpose rather than renumbering the steps below it: this is a small step that has to
happen at a specific moment, not a re-cut of the sequence.

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
- **Create it through the one door, so the shape is recorded all at once.** Read the shape from
  `client_workspace_template()`. First look for a folder already named exactly "AIOS — <Company>" at
  the top of their Drive (and for each ruled folder under it): if there is one, reuse it and create
  only what is missing; if there are two, stop and show them both — never pick one. After their yes,
  create the root in the person's own Drive at the
  account root, named "AIOS — <Company>", then each folder under it with `drive_create`, keeping every
  id Drive returns. Then record the whole shape in ONE call to `client_workspace_shape_apply()`. It
  refuses a partial shape or a folder that is not in the template, and records nothing when it refuses
  — so if it refuses, say what Drive already made and stop. `lib/onb/workspace-shape.js` is this same
  flow in code.
- **Why this is a step and not a cleanup task later:** measured 2026-08-10 on a workspace with no
  declared shape, the folders that had none held 86, 35, 16 and 13 things and the one with a written
  taxonomy held 5 — and untangling one of them afterwards nearly broke the product, because by then a
  personal folder had become a load-bearing address for something else. People adopt what is already
  there. Born with the shape costs one step; retrofitting it costs a session and risks a regression.
- **Do not report this step done if you cannot see the folders.** Same rule as every other step here.
  Seeing them means reading them back: list "AIOS — <Company>" and its folders in their Drive, and
  read the saved workspace root and one folder record per folder from their store. If any is missing,
  say which and do not move on.

*(Lens: Rogers — an innovation is adopted on its observability and its complexity, and a folder that
already exists scores on both where a written rule scores on neither. Evans — one bounded context,
one owner: the client's vocabulary lives in the client's store.)*

---

## Step 3c — Read what they already gave you, BEFORE you ask them anything

Numbered 3c for the same reason 3b is 3b: a small step at a specific moment, not a re-cut of the
sequence. It is the **session reads** half of the operator's ruling on the intake step (option label
verbatim and complete: *"Both — walk collects, session reads, client confirms on screen
(Recommended)"*). **The walk that label names no longer exists**, so the collect half happens here, at
the start of this step: ask them to put the documents they already have into the declared folder, then
read. Step 4's opening bullet is the third half.

**Why it is a step and not a courtesy, measured.** Against one real client's artifact set: of the
five seeded onboarding cards, **3 were already fully answered** in documents we authored and
delivered to them eleven weeks earlier, **2 were partly answered**, and **0 were genuinely new
questions**. The worst asked them to run a multi-hour engine whose finished output — 46,000 words,
marked Final — had been in their folder for thirteen days. Skipping this does not waste their
minutes. It teaches them in the first five that this room does not remember what they paid us to
write down.

- **Check the store can hold it before you open a single file.** If the intake tables are absent from
  the client's own store, that is a **schema apply that is owed, not a table to build** — the house
  declaration already carries them and nothing re-applies it after a client is provisioned. Say that
  in those words and stop. Never regenerate the install schema; it is already correct.
- **Read the declared set, never a walk of their tree.** Every file read becomes a document the
  interview **states out loud it has read**, so a tree walk swallows another client's notes the first
  time somebody drops a folder in. Reading too little costs one question they were going to be asked
  anyway; reading too much silences a question forever and nothing goes red.
- **You do the reading, and you own what you write down.** The loader calls no model. It hands you
  each document and the closed menu of elements; you return quoted claims. Quote only from the
  extract you were handed, never from a fuller copy of the file — the store keeps and re-checks the
  extract, and a quote from outside it lands marked verified against text nobody can check again.
- **Report what you could NOT read, by name, out loud.** A skipped file, two folders holding the same
  filename, a renamed folder, a document longer than the extract — each is a question the client
  still gets asked, and that is the correct failure. Never let *"we could not read your PDF"* reach
  them as *"your document answered nothing"*: the first is true about us, the second is false about
  them.
- **A quote proves it came from their document. It does not prove it answers the question.** A real
  sentence filed under the wrong element passes every wall here, silences its question permanently,
  and nothing goes red. That gap is open and named on the board; your judgement is the only thing
  standing in it.
- **Do not report this step done if you did not open a file.** Same rule as every other step here. A
  client who handed over nothing gives an honest empty result — and that is indistinguishable from a
  step that never ran unless you say which one happened. Then read back the saved record for each
  document you named, with what it answers. Your own summary of a file is not proof it was recorded.

*(Lens: Christensen — the job they hired us for includes taking setup work off them, and asking for
what they already sent is the opposite. Nygard — the preflight names the real cause instead of
throwing a raw missing-table error at whoever reads it next.)*

---

## Step 4 — The interview is a conversation, and every answer is written back

Now the questions. They already exist as data — this skill does not author them and must not restate
them; it **runs** them, in order, in the client's own words.

- **OPEN BY SAYING WHAT YOU ALREADY KNOW, AND ASK THEM TO CONFIRM IT.** This is the *"client confirms
  on screen"* half of the operator's intake ruling and it is the first thing out of your mouth in
  this step, before a single question. Name the documents you read, in their own filenames. Say what
  those documents already answer. Where two of their documents answer the same thing differently, do
  not tick it off and do not adjudicate it — **ask them the ordinary question**, because two
  different answers means the element is unsettled, not that somebody is wrong (option label
  verbatim: *"Don't tick it off — just ask them (Recommended)"*). Then ask only what is genuinely
  still open.
- **IF THE COMPANY WAS SET UP FROM A CONFIGURED ONBOARDING, ASK ITS BELIEFS AS CONFIRMATIONS, ONE AT A
  TIME.** A configured onboarding is set up in advance by a trade or a partner. Read the confirm
  prompts the store hands you for this company (`interviewPlanFor`). For each one, say the belief in
  its own words and ask *"Is that true for your business?"*, with three replies: **yes** (save the
  belief as their answer), **mostly, in my words** (save their words), **not us** (save nothing and ask
  that question in full, the ordinary way). Save only through `recordConfirmReply`, which records where
  the belief came from and what they said. Nothing is saved before they answer. Never offer a belief for
  a goal question, and if the store refuses, stop and say so. With no prompts, run the interview exactly
  as below. *(Approved 2026-09-16/17, `dr_third_onboarding_path_is_configured_onboarding_20260916`.)*
- **Ask them here, one at a time, in plain language.** A form does this badly: it cannot follow up, cannot notice an answer that contradicts an earlier one, and cannot
  tell the difference between *"I do not know"* and *"that does not apply to us."* A conversation can.
- **Write every answer back to the client's own record, as it is given** — not at the end, not in a
  summary. An answer held in the conversation and never written is lost the moment the chat closes.
- **A question that belongs to somebody else gets handed to them**, with enough context to answer it,
  and the answer lands beside the client's rather than replacing it. When they say *"I do not know"*,
  never offer a likely answer. Ask who does know, hand the question to that person with
  `hand_off_question`, and read back the delegation row it wrote before moving on.
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

The hand-off is done only when the board shows the ranked gap cards the Tune-Up wrote for this
company, dated after it ran and naming the goal. Hand-off started is not hand-off done.

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
- **"They said it is done" is not evidence, and neither is "the email told them how."** The live read is
  the evidence.

---

## When NOT to use

Not for a client who is already stood up and running — that is `aii-patch-me-up` for the setup and
`aii-tune-up` for the company. Not for adding one connector to an existing seat. This is the first
run, once, for a new client.

---

*v1.8 — 2026-09-17. Bryce pop-up-approved (`dr_03_onboard_client_asks_configured_beliefs_as_confirmations_20260917`, option label "Yes, add the step (Recommended)"). Adds a Step 4 bullet after "open by saying what you already know": when the company was set up from a configured onboarding (a trade or a partner), ask each belief as a confirmation, one at a time (yes / mostly, in my words / not us), through `interviewPlanFor` and `recordConfirmReply`; nothing saved before they answer; never a goal question. The code ships in aii-site PR #411 (merged 2026-09-17); shipped in plugin 0.9.34. Nothing else changed.*

*v1.7 — 2026-09-15 (Boise). Bryce pop-up-approved (dr_onboard_client_captures_and_confirms_sender_addresses_20260915, option label "Approve the edit (Recommended)"), carrying his prose ruling dr_a_clients_sender_addresses_are_captured_in_their_first_onboarding_session_20260915 ("b"). Adds Step 2 item 4: after Workspace is authorized, capture the client's sender addresses from `email_sendas_list` (or their own words) with `capture_my_sender_addresses`, then have them confirm each one with `list_my_unconfirmed_sender_addresses` and `confirm_my_sender_address`; no new Google permission. The tools ship in aii-site PR #364 (merged 2026-09-15). Former items 4 and 5 renumbered to 5 and 6. Nothing else changed.*

*v1.6 — 2026-09-15 (Boise). Bryce pop-up-approved two edits (dr_onboard_client_confirm_setup_never_cold_20260914_224841, option label "Approve edit 1 (Recommended)"; dr_onboard_client_i_dont_know_hands_off_20260914_224841, option label "Approve edit 2 (Recommended)"). Step 2 item 1 no longer asks which machine and which app cold: it reads the seat with `my_seat_env` and asks only "is this right?", correcting a field with `correct_my_seat_env`. The interview's hand-off bullet adds: on *"I do not know"*, never offer a likely answer; hand the question to the person who knows with `hand_off_question` and read back the row it wrote. The GENERIC MASTER banner now allows naming a Blueprint tool only where a step must call it (dr_onboard_client_banner_never_names_a_tool_20260915_004858, "Approve fix 2 (Recommended)"). Nothing else changed.*

*v1.5 — 2026-09-14 (Boise). Bryce pop-up-approved (dr_locked_03_edit_aii_onboard_client_proof_20260914_080933, option label "Add all three (Recommended)"). Adds ONE read-back sentence each to Step 3b (read the Drive folders and the saved workspace records back), Step 3c (read back the saved record for each document named) and Step 5 (the Tune-Up hand-off is done only when its ranked gap cards are on the board). Matches first_run_step 9, 10 and 17, whose evidence was rewritten the same day. Nothing else changed.*

*v1.4 — 2026-09-13 (Boise). Bryce pop-up-approved (dr_locked_03_edit_aii_onboard_client_step_20260913_203304, option label "Write it as drafted (Recommended)"). Adds ONE sentence to Step 3b in front of "After their yes, create the root": look first for a folder already named exactly "AIOS — <Company>" (and each ruled folder under it), reuse it and create only what is missing, and stop and show both if there are two. Matches PR #242 (workspace-shape.js re-run reuses the root). Nothing else changed.*

*v1.3 — 2026-09-13 (Boise). Bryce pop-up-approved (dr_locked_03_edit_aii_onboard_client_step_20260913_195432, option label "Write it as drafted (Recommended)"). Adds ONE bullet to Step 3b naming the door that records the client workspace shape: client_workspace_template() for the shape, drive_create in the person's own Drive after their yes, then one all-or-nothing client_workspace_shape_apply() call (the flow shipped as lib/onb/workspace-shape.js in PRs #234 and #237). Placement follows dr_where_a_clients_aios_root_lands_and_who_creates_it_20260905. Nothing else in the skill changed.*

*v1.2 — 2026-09-13. Bryce pop-up-approved 2026-09-13 (dr_locked_03_edit_aii_onboard_client_v1_2_20260913_063207, option label "Write it as drafted (Recommended)"). **Corrects the skill to the onboarding that actually runs.** The spine sentence "a session cannot click Settings" and Steps 0–2 described the retired setup walk; they now describe the email (plugin + Workspace connector, then a task) and the session that carries every other step while the person clicks. Every other step is unchanged except that "the walk" is no longer named as a thing that exists. Registers dr_the_web_walk_is_gone_the_email_hands_off_to_a_session_20260817 (clauses 1, 3, 4), dr_the_email_is_minimal_and_session_is_where_tracking_starts_20260825_130000 (the email's two requirements and the minimise-the-email principle, superseding the permissions clause of the 08-17 row), dr_the_old_onboarding_generation_is_retired_and_recoverable_20260907, and dr_command_center_install_wizard_and_the_20260913_053931. Step 3c's placement of the intake collect half is the session's reading, marked as such in the step. Lens: Evans (one boundary, named for its real reason), Nygard (an email cannot verify; a step you could not see is never done), Norman (one next action, its result visible), Ohno (fix the skill that taught sessions the walk, not only the page).*

*v1.1 — 2026-09-11. New section **One entry point, three states** above Step 0 — the single home for Bryce's ruling that however a person asks to be brought right, it is one door, the system reads which of three states they are in (installed · new with files · new with nothing), and the skills are rooms behind it that call each other. `aii-patch-me-up` and `aii-tune-up` each carry a one-line pointer here and never restate it. Registers `dr_one_entry_point_onboard_or_realign_20260821_165142` (item (b) of its landing, amended to three states 2026-09-09) and `dr_locked_03_edit_asset_review_and_entry_20260911_083405` (his approval of the exact wording, 2026-09-11, Campaign Assets & Cohort Profile S4). Additive: Step 0 and every numbered step unchanged. Lens: Evans (three bounded contexts behind one door), Nygard (never infer the state from the words used; say so and ask when the record cannot tell), Krug (the person never picks a mode).*

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
