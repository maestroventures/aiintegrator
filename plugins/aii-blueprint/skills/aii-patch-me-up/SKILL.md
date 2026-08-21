---
name: aii-patch-me-up
description: >
  AI Integrator Blueprint: Patch Me Up. The one front door that checks a user's own setup and gets
  them current. On request (and at onboarding), it reads their connectors, their skills, their ways
  into their own files, and each connector's PER-VERB PERMISSIONS, and sorts every one into a plain
  bucket — live, off in this chat, needs a reconnect, installed-but-unused, missing, or not the way
  you set it — then OFFERS the single fix, one item at a time, user says yes or skip. It DETECTS and
  REPORTS: it never connects, disconnects, installs, or changes a permission on its own; every change
  is an act the human performs. Use on "patch me up," "bring me current," "check my setup," "am I
  connected," "reconnect my connectors," "are my permissions right," or the onboarding/refresh sweep.
  Once every connector is healthy it hands off to the Tune-Up (`aii-tune-up`) to audit the company
  against the framework — gated behind healthy connectors, because it reads their real stuff through
  them.
---

# Patch Me Up

Every user drifts out of date: a connector silently drops its authorization, a new connector ships and
they never install it, one is installed but switched off in the current chat, another was added once
and never used. None of it is visible until something quietly fails. **Patch Me Up is the one front
door that makes a user's own setup visible and gets them current** — the user-facing cousin of the
Tune-Up (`aii-tune-up`), which does the same reconciling job for the *company* instead of the *setup*.

**One front door, not a menu of modes.** The user clicks one thing — "patch me up" — and the skill
figures out what's needed. The "modes" below (reconnect one, install the missing one, full reconcile)
are *behaviors it chooses from what it finds*, never a menu the user has to pick from. Making the user
choose the mode is the exact thing this skill exists to avoid. *(Lens: Krug + Norman — one obvious
path, no thinking required.)*

**It detects and offers — it never acts on its own.** Connecting, reconnecting, removing, and
installing a connector are all changes to the user's account. This skill only ever *reads* state and
*hands over the one plain step*; the user makes every actual change. Same draft-first discipline as
Knowledge Hygiene (`aii-knowledge-hygiene`): the system does the noticing so no human has to remember,
the human stays in control of the change. *(Lens: the framework's passive/draft-first capture,
operating-method §2.8.)*

---

## Step 1 — Look: read the user's setup

Read the user's **connector inventory** and, for each connector, its **live state** — is it
authorized/connected, and is it enabled in this chat. Use the platform's connector-list capability for
this (the master names the slot; the platform provides the read). A connector whose status can't be
read is **unknown**, not broken — say so, don't guess it's down.

**The read only sees connectors the user has installed.** A connector that exists in the platform's
directory but was never installed does **not** come back from the connector-list read — it is invisible
to this skill (it shows only in the user's own settings, under a "not connected" / "available" list).
So this skill never claims coverage the read can't back up: it reports on installed connectors and
**names this edge out loud**, pointing the user to their settings' *not-connected* list to eyeball
anything they've never set up. *(Lens: Nygard — fail honest; a silent blind spot is worse than a
visible one.)*

This is a *read*. Nothing changes in Step 1.

---

## Step 2 — Sort: put every connector in one plain bucket

Sort each connector into exactly one bucket:

- **Live** — authorized and on in this chat. Nothing to do.
- **Off in this chat** — authorized, but its tools aren't switched on here. Fix = turn it on in this
  chat's connector settings.
- **Needs a reconnect** — installed but not authorized (or its status reads as not-connected). Fix =
  reconnect / re-authorize it.
- **Installed but unused** — installed and never turned on, and the user doesn't appear to need it.
  Fix = *offer* to remove it. This is a suggestion, never an action (see the remove rule below).
- **Missing** — a connector the framework expects the user to have (e.g. the AI Integrator connector)
  that isn't installed at all. Fix = install it.

The four fixes map to the three internal modes: **reconnect-one** (one or a few off/needs-reconnect),
**fresh-install** (a required connector is missing), **full-reconcile** (a mix — walk the whole list).
The skill picks the mode from the buckets; the user never names it.

*(Lens: Evans — the whole job is four clean steps inside one skill, not four skills the user has to
run in the right order.)*

---

## Step 2b — Do the same for SKILLS, against the required-capability floor

A connector that is missing announces itself; a missing SKILL does not. The framework simply reaches
for it, finds nothing, and carries on quietly. So skills get the **same five buckets**, checked the
same way — this step is not a different job, it is Step 2 pointed at the other kind of equipment.

**Start from the floor, not from what is installed.** Read the `required_capabilities` document from
the company brain (the same tier walk as `skill_overlay`). It names the JOBS the framework will
leverage — produce a Word document, produce a spreadsheet, produce a PDF, produce a deck, design a
visual, run work on a schedule, and the infrastructure reads. **A read of that floor that returns
nothing is a defect, never an empty result** — say so and stop; do not report a clean setup.

**A job is satisfied by whoever does it.** Two sibling provider records answer "who fills this here":
a SKILL provider, or a CONNECTOR provider. Ours or somebody else's — it does not matter, but it must
be **installed AND registered**. An installed thing nobody registered is invisible to every gate; a
registered thing nobody installed is a lie.

**You need both halves, and neither alone is honest.** The registry knows what is REGISTERED. Only
this running session knows what is VISIBLE — the runtime hands it a list of skills it can actually
invoke, and no query can see that list. Compare the two:

- registered as installed + this session cannot see it → **off in this chat**
- this session can see it + the registry says otherwise → **needs a reconnect** (re-register it)
- registered, visible, satisfies a required job → **live**
- registered and visible but no required job needs it → **installed but unused** (offer to retire
  the record, or add the job to the floor — one of the two is wrong)
- a required job with no satisfying provider at all → **missing**

Then Step 3 as written: one fix at a time, worst blocker first, yes or skip. **Never install
anything.** Offer it and route the install through Run Command.

**Required-ness is a property of the JOB, never of a provider.** Do not infer "required" from a
provider record. The infrastructure jobs are satisfied by connectors and have no skill provider at
all, so a check keyed to skill records cannot see them — and it would report every required job live
while structurally unable to examine several of them. A green answer over jobs it never looked at is
worse than no answer.

*(This exists because four skills were NAMED AS REQUIRED in four governing places while installed
nowhere, for three weeks. The auto-firing design gate invoked a skill that was not there and nothing
failed loudly. Presence was never checked against requirement — nothing was watching.)*

*(Instance note: how this seat reads the floor and the provider records — the exact query, and any
local helper that sorts the buckets — is instance-specific and lives in this skill's overlay. This
body names the job, never a tool or a file path.)*

---

## Step 2c — And do it for the user's own STORAGE DOORS

A missing connector announces itself. A missing **way into the user's own files** does not: the
session simply reaches for the folder, gets nothing back, and says the folder is unreachable. So the
user's storage gets the same treatment as the other two kinds of equipment — **this is Step 2 pointed
at a third inventory, not a different job.**

**Read the registered roots, not the habit.** Resolve them BY CATEGORY (`workspace-paths` /
`resolve_workspace_path`, per Core §11 rule 4) and sort **each door** into the same buckets: live ·
off in this chat · needs a reconnect · missing. **A person's workspace is ONE place with more than
one door**, so the buckets belong to the doors and never to the folder — the folder is not "missing"
while any door still answers.

**The one thing this step adds that nothing else says: AND HERE IS THE OTHER WAY IN.** When a door is
dark, the user does not need to be told a door is dark. They need the other one, tried, with the
answer. Report which door you used. A door that will not answer is **unknown, not broken** — the same
rule Step 1 already applies to a connector whose status cannot be read.

**The address form belongs to the door, not to the folder.** Two doors onto the same folder can
refuse each other's addresses, so a path that works through one is not evidence about the other.
Core §11 rule 4 owns that rule; the Front Door's **door gate** (`aii-front-door`, guardrail 7) owns
firing it at the moment a session is about to say *unreachable*. This step is the **inventory** half:
it makes the doors visible before anything fails, so the gate has something to try.

*(Instance note: which doors this seat has, what each one is called, the address form each accepts,
and how long the copies take to agree are instance-specific and live in the overlay + the registered
roots. This body names the job, never a door, a tool or a path.)*

---

## Step 2d — And do it for the PER-VERB PERMISSIONS on each connector

A missing connector announces itself. A connector that is present but **set differently than the
person meant** announces nothing at all — every read still works, and the one verb they never
intended to block simply never appears. So permissions get the same treatment as the other three
inventories — **this is Step 2 pointed at a fourth inventory, not a different job.**

**Both halves again, and neither alone is honest.** The connector publishes what it CAN do — every
verb it exposes, and the permission the framework recommends for each. Only this running session
knows what is VISIBLE: a verb the person has set to Blocked **does not appear in the session's tool
list at all**, and no query can see that list. Compare the two. Same shape as Step 2b one level down
— there it was skills, here it is the verbs inside one connector.

⚠ **NEVER discover a verb's state by CALLING it.** An unapproved verb hangs an unattended run
forever and spams an attended one with prompts. The compare above calls nothing, and must stay that
way.

**The sixth bucket, and it is NOT a presence bucket.** The five above all answer *is it there.* This
one answers *is it as you meant it*:

- **not the way you set it** — present, but its permission differs from what the person chose, or
  from what the framework recommends. Fix = the one row to change, named, with what it costs to
  leave it.

**Hand the FIX, not the finding.** Step 3 already owns the shape of an offer — one item at a time,
plain words, worst blocker first, and a rendered control is not an ask. Naming the drift is **half**
the job; the person needs which row, on which screen, set to what. This step adds no new offer rule;
it points at Step 3.

### ⛔ STANDING RULE — a session reports a permission; it never changes one

**This is a Must gate, not a preference, and it is written as a standing rule on purpose.** A
session DETECTS and REPORTS. It never sets, clears, or overrides a user's permission — not with
permission, not on request, not when the fix is obvious. **The change is an act the human performs
with their own hands.**

**Written as a rule rather than left to incapacity, because a limit is never the safety** (Core —
*A limit is never the safety*; see also the Capability Registry's rule 1). The day a session gains
the ability to write a permission setting, the protection must already be standing instead of newly
missing. Do not rely on "it can't" — that is the trap the canon names.

**Why it is placed at all, in the operator's own words (ruled 2026-08-15):** *"The session reports
the user changes. The session should not update the settings because that takes control away from
the user. It's no different than a manual block we are putting on an email send even though the
connector allows email to be sent on behalf of a user. We block that so that a user can't
accidentally screw something up. In this case, we're blocking the AI from making changes to the
system that the user doesn't want them to make. It's a human blocker, intentional."*

**And it is separation of duty, which the permissions standard already requires:** the proposer of
a change may never be its own approver. This step *proposes*; the human *approves by doing it.* Two
different hands. A surface that both holds the list of what settings should be AND can write them is
the failure that rule exists to prevent.

⚠ **A difference is not automatically a mistake.** The person may have chosen it deliberately, and
may be holding it on purpose — including as a deliberate test fixture. Report it; never assume it
is wrong, and never touch it. A setting the person says to leave alone stays exactly as it is.

**Honest limits, stated here rather than discovered later.**

- **It reads ONE BIT, not three states.** Blocked is distinguishable from not-blocked. *Always
  allow* and *Needs approval* both appear in the tool list and look identical. Never report a full
  permission read-back from this.
- **It is scoped to THIS chat and THIS seat**, like every other read in this skill. One person with
  two logins gets two answers, and that difference is data, not an error.
- **The tool list is frozen when the session starts.** A change made mid-session is invisible until
  a fresh one — say so, rather than reporting the old state as current.

*(Points at, never restates: this step's authority tier is already settled by the User Permissions
Framework's wrapper rule — a wrapper takes the tier of its most-privileged action, and this one
reads and reports, so it is self-serve. What the person SAID they set is the install interview's
job, not this step's; when that record exists, compare against it FIRST and against the
recommendation second.)*

*(Instance note: which connectors this seat has, where the recommended per-verb list is read from,
and where a stated intent is recorded are instance-specific and live in the overlay. This body names
the job, never a connector, a tool or a table.)*

---

## Step 3 — Offer: one plain fix at a time, user says yes or skip

For everything that isn't **Live**, hand over the fix **one item at a time**, in plain language, worst
blocker first *(Goldratt — the connector that blocks the most, like the AI Integrator connector, goes
first, not alphabetical)*. Each offer is: what's off, the one step to fix it, and a yes/skip. Never
dump the whole list as a wall; never fix anything the user didn't say yes to.

**A RENDERED AFFORDANCE IS NOT AN ASK.** An offer is something you **say, in words**, one item at a
time, recommendation first. A button, a card, a checklist or a widget drawn on the screen is **not**
an offer — it is a thing the user has to interpret, and interpreting it is the work this skill exists
to remove. If a surface renders an install or enable control, still say out loud what it is, why this
particular item is on the list, and what it costs them to skip it — then wait for the yes or the skip.
**A user who clicks without being told what they are clicking has guessed correctly; they have not
been onboarded.** The next one guesses wrong, clicks nothing, and the framework goes on reaching for
equipment that is not there while nothing fails loudly. *(Lens: Krug — never make them work out what
is being asked. Nygard — a silent non-answer must never read as a decline.)*

- **Turn-on and reconnect steps** are UI actions in the user's connector settings — hand the plain
  step ("open connector settings, switch on / reconnect [name]"), then re-read state to confirm it
  took *(pairs with `aii-prove-it` — the confirming read is the proof, not the claim)*.
- **Installing a connector** is a machine step — route it through **Run Command** (`aii-run-command`):
  one double-click file, never a pasted command, never "open your terminal and type this."
- **The remove rule.** No tool can disconnect a connector for the user — that's a click in their
  settings. So for an *installed-but-unused* connector, this skill **flags it and hands the removal
  step; it never removes anything itself**, and it always asks first. A connector the user says to
  keep stays exactly as it was.

A user whose setup is already clean gets the honest, useful result: **"You're current — nothing to
fix."** That's a valid, complete run. Pair it with the coverage note from Step 1: this checked the
connectors you've *installed*; anything you've never set up shows only in your settings'
*not-connected* list — glance there if you're expecting one that didn't appear.

---

## Step 4 — Then offer the deeper audit (Tune-Up): build half anytime, reconcile half once connectors are Live

Hand off to the **Tune-Up** (`aii-tune-up`) — the deep audit of the company against the framework (for
this user, their VisitorResolve and AI Integrator instances). Patch Me Up does **not** re-implement the
audit; it hands off to the Tune-Up, which owns it (one fact, one file). The Tune-Up has **two halves,
and only the second one needs connectors** — so the old "connectors healthy first, then the audit" rule
gates the *reconcile* half, not the whole thing:

- **Build half — no connectors needed; can run before anything is connected (even before the
  onboarding call).** Setting the goal, pulling the right Blueprint Models, designing the ideal, and
  **pre-seeding the board from the CEO audit** all read the intake / CEO interview — not the company's
  live tools. So this half is offered even on a fresh, unconnected setup and is **not** gated behind
  Live connectors. It produces an ideal + a pre-seeded board **clearly marked *not yet reconciled*.**
- **Reconcile half — gated behind healthy connectors on purpose.** Laying the company's real stuff
  against the ideal (and lighting the KPI scoreboard) reads that real stuff *through* the connectors,
  so running it while one is down produces a false, half-blind picture. This half waits until every
  connector the audit needs is **Live**.

So: the build half can go the moment there's a goal + a CEO audit; the reconcile half is the part that
"connectors healthy first, then the audit" was always really protecting. *(Lens: Evans — two clean
bounded contexts, one owner each; the gate lives on the seam between them, not around the whole skill.)*

---

## Running at onboarding and on a refresh

This is the deep first run at onboarding (get the new user fully connected) and the routine "bring me
current" sweep after that (a new connector shipped, an authorization lapsed). On a scheduled or
onboarding run it produces the same offer list and still waits for the user to act on each item.

---

## When NOT to use

Don't run a full setup sweep in the middle of an unrelated task — it's a get-current ritual, not an
interruption. Don't nag: a clean setup ends in one line, not a checklist. And never let it connect,
reconnect, remove, or install anything on its own, even when the right fix looks obvious — every change
is the user's yes.

---

*v1.6 — 2026-08-15. New **Step 2d — the per-verb permissions on each connector**, the fourth inventory beside connectors (Step 2), skills (Step 2b) and storage doors (Step 2c), plus a **sixth bucket** — *not the way you set it* — which is the first bucket that is not a presence bucket. Bryce ruled the locked-03 edit 2026-08-15 (T14 S154); registers `dr_ai_may_not_change_user_settings_20260815_131500` (**his own prose, verbatim, unprompted**) and `dr_OPEN_user_actual_verb_blocks_scope_20260815_122043`. Additive: no step renumbered, no existing bucket changed, no behavior removed, Step 3's offer shape unchanged, client overrides unaffected. **Adjudicated PARTIALLY PRESENT → Adopt-sharpen, explicitly NOT Adopt-fresh** — the headline was already homed at Step 2b (*"The registry knows what is REGISTERED. Only this running session knows what is VISIBLE… Compare the two."*); the net-new facets are the fourth inventory and the drift bucket. Third instance of a pattern this skill has grown by twice.
**THE STANDING RULE IS THE POINT OF THE SECTION, AND IT IS WRITTEN AS A RULE RATHER THAN LEFT TO INCAPACITY ON PURPOSE.** A session reports a permission; it never changes one. Bryce classed it himself with the email-send block: the Workspace connector *can* send email on a user's behalf, and `email_send` is recommended Blocked anyway — the block is not an incapacity, it is a deliberate human blocker on a capability that exists. That is Core's *a limit is never the safety* (and the Capability Registry's rule 1) applied one domain over: the day a session gains the ability to write a setting, the gate must already be standing instead of newly missing. It is also **separation of duty** — the proposer of a change may never be its own approver, which the User Permissions Framework already requires; this step proposes, the human approves by doing it.
**Lived proof, measured the day this was written:** on the author's own seat, 49 verbs were declared by the connector and 42 were visible in the session. Five of the seven absent were the recommended-Blocked set. **The other two — `drive_trash` and `email_trash` — were blocked beyond the recommendation and the operator had not meant to do it** (two accounts, settings configured at different times from memory). He caught it by reading; no check caught it, because none existed. He then **ruled that they stay broken** as the detector's only real, non-synthetic RED fixture — which is exactly why the *never touch it* clause above is not decoration. Lens: **Schneier** (separation of duty; least privilege), **Nygard** (prove the check red before you trust it green; a synthetic fixture only proves the code agrees with itself), **Redman** (one authoritative row per setting), **Christensen** (this is the only job on the list a *person* hires — every other one is a session hiring something). Cards: `neon_adjudication_b3b4_is_patch_me_up_step_2d_and_the_permissions_spec_already_owned_two_findings_20260815` · `neon_bryce_is_holding_two_blocked_verbs_broken_on_purpose_as_the_gap_detectors_red_fixture_20260815` · `neon_the_tool_store_job_list_and_the_thinnest_slice_needs_no_store_20260815`.*

*v1.5 — 2026-08-10. New **Step 2c — the user's own storage doors**, the third inventory beside
connectors (Step 2) and skills (Step 2b). Bryce pop-up-approved 2026-08-10; register
`dr_OPEN_front_door_door_gate_20260810_080649` (option click, label verbatim "Ship both halves now
(Recommended)" — the label is his, the prose is not). Additive: no step renumbered, no bucket added,
no behavior removed, detect-and-offer unchanged, client overrides unaffected. **Adjudicated
PARTIALLY PRESENT → Adopt-sharpen, explicitly NOT Adopt-fresh.** Step 1 already carried the exact
tenet one domain over — *"a connector whose status can't be read is unknown, not broken — say so,
don't guess it's down"* — and nothing applied it to the user's own files, which is the one inventory
where a wrong read sends the person hunting through folders for something that is already there.
**The sibling half ships in the same batch as `aii-front-door` guardrail 7 (the door gate):** that
one fires at the moment a session is about to say *unreachable*; this one makes the doors visible
BEFORE anything fails, so the gate has something to try. Neither restates Core §11 rule 4 — both
point at it. **Lived proof, measured the day this was written:** a session followed its own handoff
exactly, asked the registered map where a folder was, used the answer, and got *"No such file or
directory"* from the shell door on the very bridge that was working — because the two doors on that
bridge take mutually exclusive address forms and the map stored one of them. Third instance in four
days; an earlier one wrote a finished governing standard into a look-alike folder that never reached
his disk. Lens: **Nygard** (a dark door is one door failing, not the folder disappearing — fail
honest about which), **Krug** (the sentence a person gets when a door is down has to be one they can
act on: "here is the other way in", never "it is unreachable"). Cards:
`neon_nothing_reads_user_workspace_root_before_declaring_a_folder_unreachable_20260809` (piece 2) ·
`neon_a_session_globbed_the_mount_and_reported_the_bridge_broken_20260807` ·
`neon_the_device_bridge_is_a_boot_race_and_no_session_retries_20260810`.*

*v1.4 — 2026-08-06. Step 3 gains one clause: **a rendered affordance is not an ask.** Adopt-sharpen
(Bryce pop-up-approved 2026-08-06, T14 S74). Step 3 already ruled the SHAPE of an offer — one item at
a time, plain language, worst blocker first — and never said that drawing a control on a screen does
not count as making one. Lived proof, 2026-08-02: a session rendered the skills widget and moved on to
other work; the operator clicked Add and said so afterwards — *"i assumed you wanted me to click add
-- so I did -- since that is what a user needs to do during onboarding."* It worked because he is the
builder and inferred the intent. A client will not infer it: they see an unexplained list, click
nothing, and the auto-firing design gate goes on invoking a skill that is not installed while nothing
fails loudly. This is a conformance gap the body could not name, not a missing feature. Additive; no
step renumbered, no behavior removed, no Core change, client overrides unaffected. The sibling half of
the source candidate — skills as a second inventory beside connectors — was adjudicated **Covered**:
it already ships as Step 2b and is recorded at v1.3. Lens: Krug (never make them work it out), Nygard
(a silent non-answer must not read as a decline). Source card:
neon_fwc_skill_install_offer_is_the_onboarding_step_20260802. Register:
dr_onboarding_is_a_skill_20260806.*

*v1.3 — 2026-08-05. Record catch-up, no behavior change (Bryce pop-up-approved). The provider check in the body — the REGISTERED-vs-VISIBLE two-halves compare, the five buckets applied to **skill** providers and not only connectors, and the tenet **required-ness is a property of the JOB, never of a provider** — shipped with no version bump and no changelog line. Consequence: no session could tell the section had been added, and the `blueprint-skills.md` §4 catalog row still described connectors only, so the row and its own body disagreed. Fixed here; the row corrected in the same batch (blueprint-skills v1.23→1.24). The skill already behaved this way — nothing renumbered, no rule created, no Core change, detect-and-offer unchanged. Grounds: the incident already recorded in the body — four skills named as REQUIRED in four governing places while installed nowhere, for three weeks, with nothing failing loudly. Lens: Nygard (a silent change is an unwatched change), Redman (the record must match the thing).*

*v1.2 — 2026-07-20. Build/reconcile carve-out (T17·S8, Bryce pop-up-approved; mechanism ruled T17·S7,
card neon_fwc_company_activation_audit_seed_20260720). Step 4 split: the Tune-Up's **build half**
(goal + model pull + ideal design + **pre-seed the board from the CEO audit**) needs no connectors and
is offered before anything is connected — including before the onboarding call — producing a board
marked *not yet reconciled*; only the **reconcile half** (real stuff vs. ideal + the KPI scoreboard)
stays gated behind Live connectors, because that half reads the company's real stuff *through* them.
Was: the whole audit gated behind healthy connectors, which blocked the pre-call pre-seed. Sibling edit
in `aii-tune-up` (build vs reconcile halves named) + engine spec §6 (lifecycle split). Lens: Evans
(two bounded contexts, gate on the seam). Detect-and-offer behavior unchanged.*

*v1.1 — 2026-07-14. Coverage-honesty patch (live dogfood, Bryce): the connector-list read only
returns *installed* connectors — a directory connector the user never installed (proven live: an
available GitHub connector the read couldn't see) is invisible to the read. Added the Step 1 edge
disclosure + the Step 3 clean-setup coverage note so the skill names its own blind spot and points to
the settings' not-connected list instead of claiming full coverage. Lens: Nygard (fail honest).
Detect-and-offer behavior unchanged.*

*v1.0 — 2026-07-14. New deployable body, the user-side install/reconcile vehicle for the connector
rollout (pairs with the multi-account connector initiative). Adopted via `aii-adjudicate` (catalog
grep → ABSENT → Adopt-fresh; four-test + one-fact-one-file passed). Shape: one skill, one front door;
detect-and-offer only, never auto-acts; hands off to `aii-tune-up` for the company audit once
connectors are healthy. Master is instance-ID-free per blueprint-skills §7 — it names the
connector-list slot and the expected-connector set; the overlay fills the specifics. Lens: Krug +
Norman (one obvious path), Evans (clean seams inside one skill), Goldratt (worst blocker first),
draft-first per Knowledge Hygiene. Built to be challenged.*
