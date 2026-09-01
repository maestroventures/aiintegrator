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
> separately; do not "fix" this block by pointing it back at[�[\H�]Y�ܞK��