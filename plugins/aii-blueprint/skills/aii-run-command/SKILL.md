---
name: aii-run-command
description: >
  AI Integrator Blueprint: Run Command. The ONE sanctioned way any session hands the user
  something to run on their own machine — never a pasted command, never "open your terminal
  and type this." Fires the moment a task produces a step the USER must
  run (install, deploy, set a key, provision, migrate, a one-time script). It proves
  the run folder can take an executable file, then builds ONE double-click file (.command on
  Mac, .bat on PC) with the builder, ON the user's own
  machine so the exec bit is set, delivers it so the "Show
  in Folder" card appears, then runs the one-step-then-wait loop: hand one file, STOP, wait
  for the screenshot, fix only the failing step, never restart. Trigger on "run this," "run
  it," "in your terminal," "paste this," "double-click," a command the user must execute, or
  any install/deploy/set-key/provision step. Does NOT apply to code the assistant writes AND
  runs itself — only to steps the human runs.
---

# Run Command

You are about to hand the user something to run. There is exactly **one** sanctioned way
to do that, and this skill is it. The failure it prevents is the one that keeps happening:
a pasted command, a "just run this in your terminal," a slightly different mechanism every
time — each one a fresh chance for the user to hit a wall alone with no clean signal of
what worked. This skill removes the chance. Same input, same file, same loop, every time.

This skill **enforces** the §8 Terminal-Handoff Standard (Core — the zero-typing single-click
arming standard, with its make-it-runnable / prove-the-save / one-file-then-wait safeguards) —
it does not restate that standard, it **carries it out** — and it pairs with `aii-prove-it`
(proves the run actually landed). One fact, one file.

**One-fact-one-file:** the sanctioned footer (the `✅ DONE` / `❌ ERROR` block and the
auto-move-to-`_done`) lives in the template, and the file-building logic lives in the
builder script. This skill does not restate either — it **runs** them. If the template or
the builder is missing, that is a fail-loud stop, not a reason to hand-roll a file.

---

## When this fires (and when it does NOT)

**Fires** whenever a step must be executed by the **user** on **their own machine**:
installing a tool, deploying, setting an API key or secret, provisioning, running a
migration or a one-time script, or anything phrased as "run this / paste this / in your
terminal / double-click."

**Does NOT fire** for internal plumbing the assistant writes *and* runs itself in its own
sandbox — refactors, test harnesses, build scripts the assistant executes. Those are not
gated and never become a double-click file. This skill is only for the handoff to a human.

---

## The rule

No pasted commands. No "run this in your terminal." No different mechanism each time.
Every runnable step is a **double-click file**: Mac `.command`, PC `.bat`. Detect the
user's machine and hand the matching one.

---

## Step 0 — Prove the run folder will take a runnable file (at TURN ONE, before any work)

**This runs at the start of the session, not at build time.** Whether the run folder can accept an
executable file is knowable before the user has approved anything — so it is checked then, when the
fix is free, rather than after they have said yes and are waiting on you.

Once per session, before any run-file work:

1. Write **one fixed-name hidden probe** into the run folder's `_to_delete/` subfolder — the same
   name every session, so it is overwritten rather than accumulated.
2. Set the exec bit on it and confirm it (`chmod +x`, then `test -x`).

**Never end the probe with a delete.** Some session shells can write and `chmod` on a mounted
workspace but cannot remove a file at all — so a probe that ends in `rm` fails its own last step in
every session, and a check that always fails is a check that gets switched off. One fixed name,
overwritten, is the whole hygiene story. The probe lives in `_to_delete/` and not in the run folder
itself because the run folder holds exactly one file: the one the person is being handed.

**If the probe passes, say nothing and carry on.** A passing precondition is not news.

**If the probe fails, STOP AT TURN ONE, say so in plain words, and name the two recoveries.** Do
not build, do not deliver, and do not invent a transport:

> "I can put a file in your run folder but I can't make it double-clickable this session. Two ways
> to fix it: reconnect the workspace folder and start the task again, or run this task on your
> computer instead. Which do you want?"

**The known cause, so nobody re-diagnoses it from scratch:** the session's shell and the file tools
do not honour a workspace grant the same way. A folder connected *before* the session starts is
writable by both. A folder granted *mid-session* stays reachable to the file tools while the shell
returns permission errors — so `chmod` and `test -x` are unavailable at exactly the moment they are
needed. That is a precondition to check, not a condition to work around at build time.

**A failure here is a PAUSE, not a stopping point** (Core §8) — hold in the same chat for the
user's answer. Do not wrap, do not hand off.

---

## Step 1 — Build the file with the builder, ON THE USER'S MACHINE (never by hand)

Call the builder script. It is the deterministic mechanism — it fills the sanctioned
template, names the file, drops it in the run folder, and sets the exec bit:

```
python3 "[ops folder]/scripts/build-run-file.py" \
  --label       "<plain-language, one line: what this step does>" \
  --cmd         "<the exact command>" \
  --os          mac        # or: win
  --session     "<a token unique to THIS chat>" \
  --tenant-zone "<the operator's IANA zone, e.g. America/Boise>"
```

- `--label` is written to the **10-year-old standard**: what it does, in plain words.
- **`--session` is the owner token, and it is what keeps two open chats from taking each other's
  file.** The builder stamps it into the run file and will only ever tidy away files carrying that
  same token — another chat's pending step, or an unstamped one, is left alone. **It is REQUIRED:
  since 2026-08-06 the builder REFUSES to build without it** (pass `--session`, or set
  `$RUNFILE_SESSION`). It used to only warn, on the reasoning that an unstamped build was "safe
  because nothing gets swept" — but safe-for-this-build still left an anonymous file in a folder
  several chats share, which nobody can then tidy. Bryce ruled it required. Added 2026-08-03,
  made mandatory 2026-08-06; the design and the six incidents behind it are in the SPEC's
  "THE SLOT IS OWNED" section, not restated here.
- **`--tenant-zone` is the operator's own clock, and it is REQUIRED.** Resolve it once per session
  from the board — `SELECT tenant_zone('<tenant>')` — and pass it in. Never type a zone from memory;
  never let the builder read the host's clock. A run file carries two stamps a PERSON reads: the
  filename in the run folder, and the `RUNFILE-BUILT` line inside the file. Before 2026-08-10 both
  came from whatever machine happened to run the builder, and that machine is UTC — so between
  18:00 and 23:59 the operator's time, every run file was stamped with TOMORROW. The builder now
  REFUSES rather than guess. The zone is a canonical fact resolved per tenant, never a string typed
  into a file, so this skill names the SLOT and the operator's own row fills it. Added 2026-08-10;
  governing spec `04/specs/Tenant-Local-Time-Standard-v1.0.md`, standing check #11
  `scripts/no_machine_clock_in_python.py`.
- Use `--cmd-file PATH` instead of `--cmd` when the command is long or multi-line.
- **RUN THE BUILDER ON THE USER'S MACHINE, through the session's shell on the mounted workspace
  (e.g. `device_bash`). Never build a run file in the assistant's own sandbox.** The builder sets the
  exec bit as part of writing the file, so building where the file will live means the bit is set by
  the same step that creates it. It is also the only place the builder can SEE the real run folder —
  which is what makes the file numbering, the owned sweep and the chat owner stamp work at all. Build
  where it lands.
- **That ban is on BUILDING, never on DELIVERING — read this before you read Step 2.** Step 2 sends
  the built file and binds it to the real run-folder path, and that bind is the ONLY thing that makes
  the card default to **Show in Folder**. **Measured 2026-08-07: a run file built on the user's own
  machine and delivered WITHOUT the bind renders a "Download" button** — the exact failure Step 2
  exists to kill. So the delivery copy is REQUIRED, and it is not a rebuild: the bytes were authored
  by the builder on the user's machine and are only passing back through to produce the card. The
  commit strips the exec bit every time, which is why Step 2 re-sets it and proves `test -x`, and why
  Step 0 runs at turn one so that re-set is never a hope. **Three sessions in a row read the sentence
  above as banning Step 2. It does not, and the cost of that reading was about a day.** Ruled by Bryce
  2026-08-07: `dr_OPEN_does_a_mac_built_run_file_still_get_sent_and_bound_20260807`.
- Step 0 has already proven the shell can write and `chmod` in that folder. If Step 0 was skipped,
  run it now before building — never after.
- If the builder or template is missing, **stop and say so.** Do not hand-build a run file.

The builder fails loud on an empty label, a missing command, or a missing folder — trust it.

---

## Step 2 — Deliver ONE file so the FIRST card is "Show in Folder"

Deliver the built file so the in-session card's default button is **Show in Folder** — on the
**first** delivery, every time, never a fix-up round. That default only appears when the
delivered file is bound to a **real path in the user's run folder** on a connected computer,
not a throwaway cloud/`/tmp` copy. So delivery is one fixed, ordered sequence, and it is not
"done" until every step runs:

1. **Send** the file (SendUserFile) and keep the file id it returns. ⚠ **DO NOT PASS `display`.**
   Omit the parameter entirely and let the client choose by file type. `display: "attach"` selects the
   download-styled card and OVERRIDES the bind in step 2 — see the correction under the delivery gate
   below.
2. **Bind that SAME file id** to the real run-folder path with the file-commit tool
   (e.g. `device_commit_files` → `▶ RUN/<file>`). Resolve that path from whatever workspace
   folder is connected THIS session — **never hardcode it**; a Mac and a PC each resolve to
   their own path automatically. Binding the delivered id to a real local path is what flips
   the card's default to **Show in Folder**.
3. **Re-set the exec bit** (`chmod +x`) on that path — **a file-commit strips it every time, even
   when the file it is overwriting was already executable.** This is not optional and it is not a
   safety net: the commit is what produces the card, and stripping the bit is what the commit does.
   Step 0 is what makes this step safe to depend on — it proved, at turn one, that `chmod` works
   here. Never reach this line without having run Step 0.
4. **Verify** the path exists and is executable before you hand it off. Fail loud if not —
   do NOT fall back to a bare cloud copy.

**Delivery gate — no bind proof, no delivery (HARD).** Before you post the message that hands the
file over, you must ALREADY hold, in this same turn, BOTH: (a) the file-commit tool's success
result for the exact `▶ RUN/<file>` path, and (b) a `test -x` pass on that path. Those two ARE the
proof the card renders **Show in Folder** — the check is the proof, not your intent to bind. If you
do not hold both, you have NOT delivered: say so plainly and stop. Never post a "here's your file"
line, and never fall back to a `/tmp`/Download-only copy. This is the `aii-prove-it` gate for a run
file — it is what turns "usually Show-in-Folder" into "Show-in-Folder every time."

If no computer with the run folder is connected (a pure cloud run, or mobile — a phone has no
folder to show), the Show-in-Folder card **cannot** be produced: say so plainly and stop; do
not hand a Download-only copy. Never deliver a run file from a cloud/`/tmp` copy alone — an
unbound copy renders as "Download and open," which is the exact failure this step kills. ⚠ **THIS PARENTHESIS USED TO READ: *"(The SendUserFile `display` param does not force the button;
the id→path binding does.)"* IT IS HALF FALSE, AND IT IS QUOTED RATHER THAN DELETED BECAUSE IT IS THE
SENTENCE THAT MADE SESSIONS PASS THE PARAMETER WITHOUT QUESTIONING IT.** The bind is NECESSARY and it
is NOT SUFFICIENT. **FALSIFIED 2026-08-24 (`slog_doc2_t1_s23_20260824`), and the operator is the one
who reported it after seeing "Download and open" on nearly every file he had ever been handed.**
Two deliveries, one session, the same run folder path, the bind proven in the same turn both times —
the ONLY variable changed was the parameter:

| the send | the card's default button |
|---|---|
| `display: "attach"` | **Download and open** |
| parameter omitted | **Show in Folder** |

**So: bind AND omit `display`.** A missing bind gives a Download-only card; a present bind plus
`attach` gives one too, and from the outside those two failures are identical. `attach` means "a file
to save, not to look at" — which is a true description of a run file and the wrong instruction here,
which is exactly why it never looked like a mistake.

**Re-delivery is a fresh card, never a mutated one.** Every time you hand a run file again — a
rebuilt step after an error, or a re-send of the same step — run the full send→bind→`chmod +x`
→verify sequence above on the NEW file so it produces its OWN fresh Show-in-Folder card. Do NOT
reach back and re-bind or re-commit a previously-sent file id to change a card the user already
has — a card that silently changes when they scroll up is exactly the confusion this kills. Under
the fresh card, put exactly ONE short instruction block: one plain line for what to double-click
and what to expect. Never stack a second or third wall of instructions below it. The newest single
self-contained thing on screen is always the current file + how to run it.

One file, one step. Never a batch of steps, never a runbook of pasted commands. Tell the user
in one plain line what to double-click and what they should **expect to see** when it works.

**Say what to have ready BEFORE handing the file.** Above every run file, list every value the script will ask for — each one named, and where to get it ("your Neon API key — Neon → Settings → API keys"; "your connection string — Neon → Dashboard → Connect"). A person who starts a file and hits an input nobody warned them about has to stop and go hunting.

---

## Step 3 — STOP and wait ("one step, then wait")

> *This loop is the concrete instance of **Core §8's pause-in-place rule** — a wait-for-the-user's-input is a pause, not a stopping point. It enforces that rule; it does not restate it.*

After handing the file, **stop.** Do not advance to the next step, start a new chat, run a
handoff, or assume it worked. Wait for the user's screenshot of the Terminal window or a
plain "worked."

The file keeps the window open and prints a big `✅ DONE` (with an invitation to screenshot)
or an exact `❌ ERROR (exit code N)`. On DONE it auto-moves itself to the run folder's `_done`.

---

## Step 4 — On error, fix ONLY that step

Read the screenshot. Fix **only** the step that failed and rebuild **only** that one file
with the builder. Deliver the rebuilt file per Step 2's re-delivery rule — a fresh card, not a
mutated one. Same loop. Never restart the sequence, never re-issue earlier steps that already
showed DONE. Nothing was lost — one step is wrong, one step gets corrected.

---

## Step 5 — Done → hand the next step

When a step shows DONE (or the user says it worked), build and hand the **next** step's
file. The loop ends when the last step shows DONE. Only then is the run complete.

---

## Build plumbing (when building from a cloud session)

A cloud sandbox cannot see the user's `~/...` paths directly; the connected workspace is mounted at
the session's own mount path. **Resolve that path by reading it (`pwd`, `ls mnt/`) — never construct
it from an id you did not read**, because a guessed path returns permission errors for the whole
mount, which reads exactly like a broken bridge and is not one.

**The builder runs on the mount, through the session's shell — the cloud sandbox is where the
session thinks, not where the run file is written.** See Step 1. Building in the sandbox and copying
the result over is the shape this section used to describe, and it is the shape that produced a run
file the user could not execute: the copy strips the exec bit, and if the shell is unavailable there
is then no way to put it back.

The bind-to-real-path → `chmod +x` → verify sequence that makes the card default to **Show in
Folder** lives in **Step 2** and is not restated here — a cloud session runs it exactly like any
other, on the file it just built on the mount. The commit still strips the exec bit, so Step 2's
re-`chmod +x` is still mandatory; Step 0 is what proves, before any of this, that it will work.

**If Step 0 failed, none of this applies** — you never got here. Say so and offer the two
recoveries. Do not fall back to a sandbox copy, an archive, or any other homemade transport. A
second transport is the exact failure this whole skill exists to prevent, and it is worse than
stopping because it teaches the user that the canonical way is optional.

---

## When NOT to use

Skip this entirely for anything the assistant runs itself. The moment the *human* has to run
something, there is no other path — build the file, hand one step, wait.

---

*Promoted into the framework 2026-07-09 from the "One Way To Run Commands" standard (born
Framework Raw-Triage; proven live before promotion — builder self-test → `✅ DONE`, exec bit
set, fail-loud verified on empty label / no cmd / missing folder). Step 2 hardened 2026-07-10
to make **Show in Folder** the default on the FIRST delivery (bind the delivered file id to the
real run-folder path → re-`chmod +x` → verify; fail loud, never a Download-only fallback), and
again 2026-07-10 (UX Fix #2) so every RE-delivery reprints its OWN fresh card — never a
retroactively mutated prior card, never stacked walls of new instructions (one short block).
Hardened again 2026-07-14 with an explicit **delivery gate** in Step 2 (proven live first: a real
test file committed to a Drive-backed `▶ RUN/` rendered **Show in Folder** as the default, so the
old "write local, not Drive" theory was disproven — the button comes from the id→path bind, not the
write location). The gate: a run file is not handed over until the bind is proven — commit success +
`test -x` pass in the same turn — turning "usually Show-in-Folder" into "every time"; no proof, no
delivery, never a Download-only fallback.
Hardened again 2026-08-07 (Bryce's ruling, pop-up-approved) with **Step 0** and a rewritten Step 1
after a session handed over a run file that would not execute and then improvised an archive around
it. Until then the skill's ONLY failure branch when it could not set the exec bit was *"say so and
stop"* — which is correct and is not enough, because it leaves the user holding a job they approved
with no way to run it, and a gate with no recovery is where improvisation gets invented. Two
changes, and they are a pair: the check moved to TURN ONE (knowable before the user approves
anything, and free at that moment), and the BUILD moved onto the user's machine (so the exec bit is
set by the same step that writes the file, instead of by a separate `chmod` after a copy that
stripped it). The probe deliberately never deletes — measured the same day, a session shell can
write and `chmod` on a mounted workspace and still refuse `rm`, so a probe ending in a delete fails
its own last step every time. Rejected and priced on the same ruling: a file form needing no exec
bit (no known answer; an archive is not it and is what went wrong), and a second sanctioned
transport (the thing this skill exists to prevent, and it does not restore the exec bit anyway).
Decision register: `dr_OPEN_what_does_run_command_do_when_the_shell_cannot_set_the_exec_bit_20260807`.
**Enforces** the §8 Terminal-Handoff Standard (Core); pairs with `aii-prove-it`. The builder, the
sanctioned `✅ DONE`/`❌ ERROR` template, and the run-folder convention are buildable detail
carried in `04 — Daily Operating System/specs/One-Way-To-Run-Commands-SPEC.md` (§5.4), not
restated here. The ops-folder path, the OS default, and the delivery card are instance-specific
and live in the operator's overlay.*
