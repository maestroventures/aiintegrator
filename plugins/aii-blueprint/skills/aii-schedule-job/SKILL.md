---
name: aii-schedule-job
description: >
  AI Integrator Blueprint: Schedule Job. The ONE sanctioned way any scheduled or recurring job
  gets created — never hand-rolled from memory, never naming a tool by its address. Fires
  whenever work should repeat on a cadence or run unattended: a nightly sync, a morning sweep,
  a watcher, a backstop, or a one-off future run. It names the job by the JOB and never by a
  vendor, picks the runtime deliberately (cloud vs local) and states the trade out loud, writes
  the job's opening gate to resolve every tool by CATEGORY out of the client's own registry,
  forbids local-file state, and refuses to call the job live until one real run has proven it.
  Trigger on "schedule this," "every morning," "nightly," "weekly," "run this unattended," "set
  up a cron / job / routine / scheduled task," or any request whose answer repeats. Does NOT
  apply to work done once, now, inside the open session.
---

# Schedule Job

## Step 0 — REACHABILITY. Run this before anything else, every time.

This skill needs something that is **not on every seat**. Before you read another line, find out
whether it is on THIS one, and if it is not, **say so plainly and stop.** A half-run is worse than
a refusal: it looks like the skill worked.

**The check.** Resolve capability **`automation-scheduling` / `create_trigger`** BY CATEGORY per Core §11 rule 4 —
never by a connector name, never by a table name — and count the connectors that answer `CAN`:

```sql
SELECT count(*) AS live_connectors
  FROM capability c JOIN connector_capability cc ON cc.capability_id = c.id
 WHERE c.category = 'automation-scheduling' AND c.action = 'create_trigger' AND cc.verdict = 'CAN'
```

**Then, and only then:**

- **One or more → carry on.** Say nothing about this check; a passing gate that announces itself is noise.
- **Zero, or the query errors → STOP and say exactly this, in your own plain words:**

  > I can't schedule unattended work on this seat — nothing here is registered as able to run a job when nobody is watching. Anything I set up would look scheduled and never fire.

  Then stop. Do not improvise a workaround, do not fall back to a different store, and do not do
  "the part that works." Measured and carded: `neon_cloud_routines_gated_behind_github_20260803`. A job that is created and never runs is worse than no job, because the board says it is handled.


> ⚠ **THE CATEGORY IN THIS BLOCK WAS WRONG ONCE, ON THE DAY IT WAS WRITTEN, AND IT WAS CAUGHT BY
> MEASURING RATHER THAN BY READING.** The first draft resolved `scheduled-jobs` /
> `create_scheduled_job`. That category exists in the registry and has **ZERO** connectors
> answering `CAN`, so the guard would have refused on Bryce's OWN seat — while **four scheduled
> tasks were live and firing on it** (J-05 warm aim dig, the Warm Relationship Engine daily run,
> the hide-sweep watchdog, the CC grant-bug watch). That is a REGISTRY gap wearing the costume of
> a missing capability, and it is the false-red shape that trains a person to skim a check. The
> live path is `automation-scheduling` / `create_trigger` (connector `scheduled-tasks`), and this
> block now names it. **Three categories currently describe one job** — `automation` /
> `run_scheduled_task` (0 CAN), `scheduled-jobs` / `create_scheduled_job` (0 CAN), and
> `automation-scheduling` / `create_trigger` (1 CAN). Only the last one resolves. Carded
> separately; do not "fix" this block by pointing it back at an empty category.

**Why this block exists, stated so it does not get tidied away.** Until 2026-08-06 this skill was
kept OUT of the AI Integrator Blueprint plugin, on the grounds that a client would not have what it
needs. Bryce retired that test: *"Even if the user is never gonna use the AII adjudicate, doesn't
mean the user shouldn't have it."* **Non-use is not a reason to withhold.** A skill is withheld only
if it would MISLEAD or FAIL LOUDLY — **and that guard belongs INSIDE the skill, which is this block,
not in a packing list where the skill itself can never see it.** Card:
`neon_seven_builder_only_skills_reach_nobody_including_bryce_20260805`, step F.

---

You are about to create work that runs when nobody is watching. There is exactly **one**
sanctioned way to do that, and this skill is it.

The failure it prevents is specific and it has already happened: a fleet of jobs, each built
from memory at a different moment, each opening with a tool address that was correct the day
it was written and silently wrong six weeks later. Because each job is instructed to stop
without a heartbeat when it cannot resolve its tools, **a dead job and a job that never fired
look identical.** Nobody finds out until a client asks where their work went.

This skill removes the chance. Same questions, same gate, same proof, every job.

It pairs with `aii-run-command` (the same discipline for a step a *human* runs), `aii-prove-it`
(proves the job actually landed), and `aii-patch-me-up` (proves the tools it needs are live).
It **enforces** the resolve-by-category rule — it does not restate it, it carries it out.

---

## When this fires (and when it does NOT)

**Fires** whenever the answer to a request is "and then it should keep happening": a recurring
sync, a scheduled sweep, a watcher, a nightly backstop, a periodic report, a one-off run at a
future time, or any job that must run with no human in the session.

**Does NOT fire** for work done once, now, in the open conversation — even if the request
mentions a time ("summarize yesterday's email" is a one-off, not a cadence). Do the work, then
*offer* the schedule.

---

## The rule

**No job is created from memory, and no job names a tool by its address.**

A tool address is not a fact about the world — it is a fact about one installation on one day.
Prefixes are frequently opaque identifiers, they change when a connector re-provisions, and a
registry can go on serving an address that no longer answers. Any job with a literal tool name
written into it is wrong the day it is written; it just does not know yet.

---

## Step 1 — Name the job by the JOB, never by the vendor

The name is the first thing a client inherits and the last thing anyone rewrites, because on
most platforms the name **is** the on-disk identifier and renaming it breaks the registration.
Get it right once.

- **Name the outcome, not the tools.** `mutual-intro-response`, not `partner-name-intro-handler`.
  `crm-reply-capture`, not `vendor-a-to-vendor-b-sync`.
- **A vendor name in a job name is a defect.** The next client runs different software; the job
  does the same work. If the name stops being true when the tool changes, it was never the name.
- **Already named badly? Alias, do not rename.** Add the client-facing display name to the job's
  frontmatter and leave the internal id untouched. A rename breaks the live registration; an
  alias costs nothing and degrades to *slow*, never to *wrong*.

---

## Step 2 — Choose the runtime deliberately, and say the trade out loud

Two runtimes exist and they are not interchangeable. Pick on the work, and **tell the operator
what they are giving up** — this is the choice people make by accident and regret later.

| | **Hosted / cloud** | **Local / on-device** |
|---|---|---|
| Runs when the machine is off | Yes | No |
| Reads local files | No | Yes |
| Stalls on a permission prompt | No — runs autonomously | Yes — can hang silently, forever |
| Stops when its ONLY account hits its usage limit | Yes | Yes |
| Stops when ONE OF SEVERAL accounts hits its limit | No — another executor claims it | No — another executor claims it |

**Default to hosted.** A job that needs the operator's laptop awake is a job that stops on a
Friday afternoon and tells no one.

**Two things to check before promising hosted**, because both have blocked real work: the
platform may gate hosted jobs behind a setup step the client has not done, and it may require
attachments (a code repository, an environment) the client's work has nothing to do with. Verify
against the platform's own current documentation — not memory, not this file — and if hosted is
unavailable, say so plainly and record it rather than quietly building local instead.

### What the job must be able to TOUCH — write it down as `reach`

The table above answers *where the job runs*. It does not answer the question that actually decides
whether a run can succeed: **what does this job have to be able to touch?** Those are two different
facts, and a job that records only the first one gets handed to an executor that cannot do it.

**Two answers, and only two.**

| `reach` | In plain words | Who may claim it |
|---|---|---|
| `tenant-store-only` | everything this job needs is in the database | ANY awake executor, on any platform |
| `operator-files` | this job touches files on the operator's own computer | ONLY an executor holding the file bridge |

**The test is one sentence.** *If this job ran on a machine that could not see the operator's
folders, would it still be correct?* Yes → `tenant-store-only`. No → `operator-files`.

**Why a wrong answer is worse than no answer.** Hand an `operator-files` job to an executor with no
bridge and it does not fail — **it succeeds against an empty folder.** A folder you cannot see looks
exactly like a folder with nothing in it. That is a false green, and it is the most expensive
outcome on this page: the job reports done, the sweep finds nothing to do, and nobody learns for
days. That is why the CLAIM refuses this pairing at the store, instead of trusting the job body to
check itself.

**Four words that are NOT `reach`, and the field each one actually belongs to.**

- **`hosted`** — that is where it runs, not what it touches. A hosted job may still need the
  operator's files. Write `tenant-store-only` only if the database really is all it needs.
- **`local`** — retired spelling. It described where the job ran, not what it touched. Write
  `operator-files`.
- **`macos`** — that names the computer a person sits at. Wrong field; that one is `os`.
- **`claude`** — that names which AI account runs the work. Wrong field; that one is `platform`.

`reach` never says where the job runs and never says who runs it. It says only what the job must be
able to touch.

**Where the machine copy lives.** These two values, these four refusals and this test are registered
as the canonical term `job-execution/reach` — resolved BY CATEGORY per Core §11 rule 4, never by
table name. **This section is the owner; the registry row points here.** Changing one without the
other is exactly the drift both exist to prevent.

### The job belongs to the TENANT. An account is only a pair of hands.

This is the part that used to be wrong, and it cost a real fleet four silent days.

The old rule said *"whatever the runtime, the job belongs to an account"* and told you to warn the
operator that the job dies when that account runs out. That warning was honest and completely
useless: it named a single point of failure and then accepted it. **On 2026-07-31 an account's
weekly usage filled, its operator stopped signing in, and nine CRITICAL jobs stopped at once.
Nobody found out for four days** — because the thing that would have raised the alarm was the tenth
job on the same dead account.

A tenant is not an account. A tenant may be signed into **several AI platforms at once** — one
vendor today, a different one next week, two in parallel — and you do not get to control which. The
job does not care who runs it. It cares that it runs, **once**.

So the schedule is **a row in the tenant's own store, never a routine installed inside one
account.** Any executor that is awake may claim it:

1. **Claim atomically.** One statement moves the job from due to claimed and stamps it ALIVE in the
   same breath. Whoever the database picks, wins; everyone else gets zero rows back and stops. Zero
   rows is a **success**, not an error — it means the work is already in hand somewhere.
2. **Stamp alive by claiming, not afterwards.** Waking up and being recorded must be the same act.
   A job asked to write its own alive beat *after* waking will skip it precisely when it matters —
   when it dies in its opening gate — which is how "broken" became indistinguishable from "never
   scheduled."
3. **Hold a lease, not a lock.** A claim expires. An executor that dies mid-run — usage limit,
   closed laptop, killed session — must not strand the job forever. When the lease lapses the job
   returns to the queue, the abandoned run is recorded as a warning, and the next executor to wake
   picks it up. **This is the difference between a bad afternoon and four dark days.**
4. **Record WHO ran it.** Every run stores the seat and the platform that claimed it. Without that,
   "no executor was awake anywhere" and "it ran and broke" produce the same silence, and no operator
   can tell whether their fix worked.
5. **Install one dumb poke per platform, never the job itself.** Each platform gets a single
   recurring task carrying no schedule and no job logic: *ask the queue what is due, claim one, do
   it, beat.* Identical text everywhere. **Adding a new job then never touches any AI account — you
   insert a row.** Three platforms signed in means three hands, not three duplicate runs.
6. **Put a platform cron in the pool as the floor.** It claims only jobs that need no reasoning, and
   it raises the alarm when work goes unclaimed. It is not the engine — it is the guarantee that
   *something* is awake when the tenant is signed into nothing at all.

**Say this out loud when the job is created:** which executors can claim it, and what happens when
each of them is gone. "This job stops if one account fills" is now a *design choice you made*, not
a fact of life — and it is the wrong one for anything CRITICAL.

> The one-account job is not forbidden; it is the degenerate case where the pool has one member.
> Everything built to the old reading still works. It just now has a name, and a known failure mode.

---

## Step 3 — Write the opening gate to resolve by CATEGORY (never by name)

Every job opens with the same gate, and this is the heart of the skill. A scheduled run starts
in a **fresh session** where tools are deferred and nothing is pre-attached, so the job must go
and find what it needs — in this order, every time:

1. **State the CATEGORY and the JOB TO BE DONE.** Not "the Close connector" — `crm` /
   `lead_search`. The category is the durable fact; the connector is this month's answer to it.
2. **Reach the client's own registry** — the client's own database, not a shared one and not
   this file. Find the reader by *searching for it*, not by naming it (see the warning below).
3. **Ask the registry which live tool serves that category and action** for this client.
4. **Read the CANDIDATE SET off the answer — never one address.** An address is scoped to the
   runtime calling it, not to the account, so the same connector answers on a different prefix
   here than it does in an interactive session. The registry hands back every address it knows
   for that connector plus the keywords to find it. Never assume one. Never reuse one you
   remember. The set is the answer; your memory is not. (Core §11 rule 4.)
5. **Keyword-search the set for whichever member is attached HERE, then confirm it answers.**
   A registry can serve a dead address — this has been observed. Resolving is not attaching, and
   attaching is not working: make one cheap real call before you trust it. Found a live address
   that is not in the set? Use it, then **write it back as an alias** — aliases are additive
   candidates, so a stale one costs one failed match and this degrades to slow, never to wrong.
6. **Only now do the job.**

> ⚠ **Search by KEYWORD, not by exact name.** An exact-name lookup silently returns nothing when
> the name has drifted — and "nothing found" reads exactly like "the tool is not installed." A
> job that only tries the exact-name form will wrongly conclude its own database is unreachable.
> Measured, not theorised: this is precisely how an entire fleet's opening line went dead.

**Never hardcode.** Not a prefix, not a full tool name, not a record id, not a table name. If a
concrete value is genuinely required for this one client, it belongs in that client's overlay or
registry — never in the job body, and never in a shared master.

---

## Step 4 — Keep the job's state off the local disk

A job's memory — its cursor, its heartbeat, its "what did I already do" — goes in the **client's
own durable store**, reachable by category like everything else.

Local files are the wrong home: a hosted job cannot reach them at all, a synced folder can serve
a stale copy or spawn conflict duplicates, and a state file on one machine cannot be inherited by
a client. If a job genuinely needs a local artifact, that is a signal it should not be scheduled —
route the local step through `aii-run-command` instead.

---

## Step 5 — Fail loud, and never fake aliveness

Three rules, and the third is the one that gets skipped.

1. **Cannot resolve a needed tool → do not do the work.** Stage the gap through the standing
   escalation path and stop. Never guess a tool. Never substitute a similar one.
2. **Never write a success signal for work that did not happen.** A heartbeat over a dead
   connector is worse than silence: it converts a loud failure into an invisible one.
3. **Stopping must be distinguishable from never starting.** This is the rule that was missing.
   If the job dies inside its opening gate, it must still emit *something* that says "I woke up
   and could not proceed" — otherwise a broken job is indistinguishable from an unscheduled one,
   and that ambiguity has cost real days. Stamp **alive** the moment the job starts, before the
   work; stamp **complete** at the end. Two clocks, so a run that starts and dies partway surfaces
   as one calm warning rather than a false whole-fleet alarm — or worse, as nothing at all.
   **Where a claim queue is used (Step 2), the CLAIM writes the alive beat** — waking up and being
   recorded are one atomic act, so the beat cannot be skipped by the very failure it exists to
   catch. Both clocks live in the tenant's store (Step 4), never on a disk the executor may not
   reach — otherwise a job that cannot report is indistinguishable from a job that did not run.

---

## Step 6 — Register the job where the system can see it

A job nobody can enumerate cannot be audited, inherited, or repaired. In the same step that
creates it, record it in the client's registry: its name, its display name, its category
dependencies, its runtime, its cadence, and the account it belongs to.

If it is not registered, it is not done. An unregistered job is how a fleet becomes uncountable.

### Where the job's BODY lives — record it, never let the executor guess

Registering the job's *schedule* and never recording *where its instructions are* is a half-write,
and it has already cost a fleet: a claim function was hardened to hand the executor the address of
the body, and the executor's own spec still told it to work the address out from the job's NAME.
The address existed and decided nothing.

**Record `body_ref` in the same write that creates the job. There are exactly two forms and any
third is REFUSED, never guessed** (the run-side half of this rule is `aii-job-poke` Step 3):

| `body_ref` looks like | where the body is | who can run it |
|---|---|---|
| `sql:<object>` | in the tenant's own store — query that object and run what it returns | any awake executor, including a cloud one |
| a path, e.g. `Scheduled/<job>/SKILL.md` | a file on the operator's own machine | only an executor holding a live file bridge |

**A store-resident body is the default for anything `reach = tenant-store-only`,** because a cloud
executor has no file bridge at all — a path it cannot open is not "no work," it is a job that can
never run. Give it a real home rather than a folder nobody reads:

- **One row per job body, versioned, with exactly one published version at a time.** Make "exactly
  one" a constraint the store enforces, not a habit — a partial unique index on the published
  state. A job body is its own KIND of thing; do not file it inside a seat- or person-scoped
  document store, which will make its shared columns mean two things.
- **The reader RAISES when there is no published body. It never returns an empty one.** An empty
  body and a missing body read identically to an executor, and the executor's only safe move is to
  guess — which is the defect this whole section exists to end.
- **The store is the MASTER. Any `.md` on disk is a read-only PROJECTION**, kept so a human can
  grep it and so the file-reading standing checks can still see the job's Gate 0 declaration. Store
  the body's hash beside it and prove the projection by comparing hashes — equal is the proof, and
  anything else is a finding, not a rounding error. **If the two disagree, the store wins.**
- **Moving a body from a file to the store silently re-aims every check that read the file.** On the
  day you move one, go and re-read the checks that named the old location and say out loud which of
  them can still see it. A check that quietly stops covering a job is worse than one that never did.

---

## Step 7 — Prove it with one real run before calling it live

Never trust a schedule you have not seen fire.

Run the job once, immediately, and confirm three things by **reading the result, not by assuming
it**: the gate resolved its tools, the work actually landed in the real destination, and the
state/heartbeat was written. Watch that first run for permission prompts and clear them — on
platforms where a prompt can stall an unattended run forever, an un-approved tool is a silent
hang, not an error.

Report the proof, not the claim. Until a run has happened, the correct status is **scheduled but
unproven** — never "done."

---

## When NOT to use

- One-off work in the current session. Do it now; *offer* the schedule after.
- A step a human must run on their own machine → `aii-run-command`.
- Polling inside a single open session → the platform's in-session loop, not a job.
