---
name: aii-job-poke
version: v1.2 (2026-08-05)
description: >
  The ONE recurring task installed on each AI platform a tenant uses. It carries NO job logic and
  NO schedule — it only asks the tenant's queue what is due, claims exactly one job, does it, and
  beats. Identical text on every platform. Install once per platform; never edit again.
---

# Job Poke — install this once per AI platform, then forget it

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

  > I can't reach a job queue on this seat, so there is nothing for me to pick up. That is an answer, not an error.

  Then stop. Do not improvise a workaround, do not fall back to a different store, and do not do
  "the part that works." This skill is the EXECUTOR half of the pair. With no queue it would claim nothing and beat nothing, and a silent no-op reads exactly like a healthy idle run.


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

You are an EXECUTOR for a tenant's scheduled work. You are not the schedule and you do not own any
job. The schedule lives in the tenant's own durable store; you are one of several hands that may
happen to be awake.

**A tenant may be signed into several AI platforms at once, and any of them may run this.** That is
fine and expected. The claim below guarantees a job runs **exactly once** no matter how many of you
poke at the same moment — the database decides, not you. If you get nothing, that is a normal,
successful outcome: someone else already has it. Say so in one line and stop.

---

## Step 0 — Resolve the reader BY CATEGORY, never by name

Category `initiatives-board`, action `query_board` (Core §11 rule 4). Ask the tenant's registry
which live tool serves that category, read the **candidate set** off the answer, keyword-search for
whichever member is attached here, and make one cheap real call to confirm it answers.

> Search by KEYWORD, never by exact name. An exact-name miss reads identically to "not installed."

**If you cannot resolve a reader: STOP and say so loudly. Never guess a connector name, never
substitute a similar tool, and never quietly do nothing.**

---

## Step 1 — Free any work abandoned by a dead executor

```sql
SELECT * FROM job_reap();
```

An executor that claimed a job and then died — hit its weekly usage limit, closed its laptop, got
killed mid-session — holds a lease it will never release. Reaping turns that into a recorded warning
and puts the job back in the queue. **This is the step that makes an executor's death survivable.**
Any rows returned are jobs that woke and never finished; mention them.

---

## Step 2 — Claim exactly one job

```sql
SELECT * FROM job_claim_next(
  '<tenant_id>',           -- the tenant, never a person
  '<your signed-in seat>', -- e.g. oakspokerleague@gmail.com
  '<your platform>',       -- e.g. claude | gemini | platform
  true,                    -- true if you can do reasoning work; false for a bare platform cron
  false                    -- CAN YOU REACH THE OPERATOR'S OWN FILES? See below. Pass it; never omit it.
);
```

**Pass the fifth argument explicitly, even when the answer is `false`.** The function defaults it to
`false` so an un-updated poke is fail-safe, but a default is not a declaration — it is a silence that
happens to be right. Say it out loud:

- **`false`** — you are a CLOUD-run task. A cloud session has **no file bridge at all**, so this is
  the honest answer and it stays `false` no matter whether the operator's machine is awake. Measured
  2026-08-05: a poke probing for a bridge in a cloud run gets `false` every time, which is a fact
  about where the TASK runs, not about the machine.
- **`true`** — only if this very session can actually read the operator's files right now, proven by
  a real call, not by the platform's reputation.

Answering `true` when you cannot reach the files is worse than not running: a folder you cannot see
reads as EMPTY, so a dedup pass concludes nothing exists and rebuilds everything.

- **One row back** → it is yours. Note `r_run_id` and `r_lease_expires`. Continue.
- **Zero rows back** → nothing is due, or another executor already holds everything due.
  **This is success, not failure.** Reply with one line — "nothing due" or "all due work already
  claimed elsewhere" — and stop. Do not retry. Do not claim again.

You are ALIVE the moment you claim: the claim itself writes the alive beat. You do not write one,
and you cannot forget to. A job that dies in its very next breath still proves it woke up.

---

## Step 3 — Do the job

**Read the body FROM `r_body_ref`. Never from the job's name.** The claim already told you where the
instructions live: `job_claim_next` returns `r_body_ref` as a column for exactly this reason, and its
own source says why — *"a guard that refuses a bodyless job but still makes the executor guess the
path has only moved the guess one step later."* Resolving the body from `r_job_name` **is** that guess.

> ⚠ This line used to read: *"Read the job's own instructions by its `r_job_name` and run them."*
> It is quoted here so nobody restores it. Corrected 2026-08-05 after a measured seam failure — the
> claim function was hardened to hand over the address and this file was never told to read it, so
> `body_ref` gated claimability and decided nothing. Card
> `neon_the_poke_never_reads_body_ref_it_still_guesses_by_job_name_20260805`.

Two forms, and they are not interchangeable:

| `r_body_ref` looks like | where the body actually is | who can run it |
|---|---|---|
| `sql:<object>` | in the tenant's own store — query that object and run what it returns | any executor, including a cloud one |
| a path, e.g. `Scheduled/<job>/SKILL.md` | a file on the operator's own machine | only an executor with a live file bridge |

**Any other form is REFUSED, never guessed.** Beat `died-in-gate` and quote the value you were given.
A body you had to infer is not the body the tenant registered.

**Keep `r_body_ref` verbatim — Step 4 makes you state it.** Whichever form it took, hold the exact
string. The beat has to name the door you actually opened, and you cannot restate a value you never
read.

⚠ **A path you cannot open is not "no work."** If `r_body_ref` is a path and you have no file
bridge, do not proceed and do not beat `ok` — beat `died-in-gate` and name the path you could not
open. Step 2's fifth argument already stops the queue handing you an `operator-files` job; this is
the second fence, for a job whose `reach` is typed wrong.

Everything in `aii-schedule-job` still applies inside the job: resolve every tool by category, keep
state in the tenant's store and never on local disk, and never fake a success signal for work that
did not happen.

**Watch the lease.** If the work will run past `r_lease_expires`, finish or fail before then —
past that moment another executor may legitimately pick the job up.

---

## Step 4 — Beat, whatever happened

```sql
SELECT * FROM job_beat_complete('<r_run_id>', '<outcome>',
                                'door=<r_body_ref verbatim> · <one plain sentence>');
```

**THE SENTENCE STARTS WITH THE DOOR, and that is not decoration — same reason Step 5 carries
`[v2]`.** Begin it with `door=` followed by the `r_body_ref` value the claim handed you, copied
exactly: `door=sql:job_body_published('<tenant>','<job>') · …` or
`door=Scheduled/<job>/SKILL.md · …`. Never a value you inferred from the job's name, never one you
typed from memory, and never one you tidied up.

> **Why, and it is the only thing in the beat an old executor cannot fake.** Without this field a
> correct run and a wrong-door run are the SAME BEAT. Measured 2026-08-05 (T1·S87) on
> `sent-reply-crm-capture`: the store body and the `.md` projection beside it are byte-identical —
> same `sha256`, `07c577147ee6…93ce` — so an executor that read `r_body_ref` and an executor that
> guessed `Scheduled/<job>/SKILL.md` run the SAME WORDS and land the SAME outcome. Every outcome in
> the table below is reachable from BOTH doors, so no outcome can tell them apart, and
> `died-in-gate` — the discriminator that was being counted on — has never once occurred in the
> queue's whole run history (17 runs: 14 `ok`, 2 `lease-expired`, 1 `no-work`). An executor still on
> the pre-2026-08-05 text never reads `r_body_ref` at all, so it **physically cannot print this
> field**: its absence is the evidence. This is a fact about the QUEUE, not about one job — it holds
> for every registered job, and it costs one string that is already in your hand.

`outcome` is one of — and pick the true one, never the flattering one:

| outcome | means |
|---|---|
| `ok` | the work actually landed in the real destination, and you read it back |
| `failed` | it ran and did not land |
| `died-in-gate` | could not resolve a tool; no work attempted |
| `no-work` | nothing to do this run (an empty queue is not a failure) |
| `refused-account-limit` | this platform refused; another executor should take it |

**Never report `ok` for work you did not verify landed.** A false beat converts a loud failure into
an invisible one, which is the single most expensive thing this whole system can do.

If you cannot beat at all, say so in plain text. Do not retry silently. The lease will expire and
another executor will pick the job up — that is the design working, not a fault.

---

## Step 5 — Say one line

Report in the tenant's own timezone:

```
[v2] <job> · <outcome> · door=<r_body_ref> · claimed <seat>/<platform> · alive HH:MM · complete HH:MM
```

The `[v2]` stamp is not decoration. It proves the beat came from the shared queue rather than from
a per-account local file, and the seat proves **which** executor did it — so "nobody was logged in
anywhere" stays distinguishable from "it ran and broke." That distinction is the whole point.

`door=` is there for the same reason one level down: it proves **which body actually ran**, so
"the store is the master" stays distinguishable from "a file that happens to say the same thing."
If you cannot print it, say so in plain words rather than dropping it — a missing field that nobody
remarks on reads exactly like a field that was never required.

---

## What you must never do

- Never install a job's schedule into this platform. The schedule is a row; this poke is a hand.
- Never claim twice in one run. One poke, one job. If more is due, the next poke gets it.
- Never write a job's state to a local file — a hosted executor cannot reach it, and a synced
  folder serves stale copies.
- Never hardcode a tool address, a prefix, or a table name into this file.
- Never beat without the `door=` field. A beat that does not name the body it ran is a beat nobody
  can check, and it is indistinguishable from an executor that never read `r_body_ref` at all.
