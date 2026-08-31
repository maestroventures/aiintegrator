---
name: aii-session-handoff
description: >
  AI Integrator Blueprint: Session Handoff. Closes out a chat session cleanly and hands off to a
  new one. Use whenever the user says "wrap up", "close out this chat", "new chat", "continue in a
  new chat", "session handoff", or anything signaling the conversation is ending and work needs to
  continue elsewhere. The skill reviews what was learned and accomplished, applies memory and
  workspace updates automatically (no approval gate), recommends advisors likely useful next
  session, and generates a ready-to-paste continuation prompt. Always trigger at session end — even
  short sessions, even if unsure anything changed; better to run it and find nothing than to miss
  something. It also fires ITSELF — a live session runs the handoff at a clear stopping point (a
  milestone landed, the open list at a clean edge, or a long chat), printing one "say stop" line
  rather than waiting to be asked; only a live chat can self-fire.
---

# Session Handoff

You are closing out this chat session and preparing the user to continue in a new one. Do these four things in order.

---

## When this fires — you can start it yourself (auto-fire)

This skill runs two ways. The user can trigger it (the phrases above). **And the live session runs it on its own** the moment it reaches a clear stopping point — a milestone just landed, the open list is at a clean edge, or the chat has gotten long. When that happens, don't wait to be asked: start the handoff and print exactly one line — *"Running the handoff now — say 'stop' if you want to keep going."* — then surface the continuation prompt (Step 4) inline. The operator keeps a one-word veto without a blocking pop-up, and can still trigger the handoff at any other time.

**Never self-fire while a live task is waiting on the user's input.** A pending decision, screenshot, image, or paste/deploy confirmation is a PAUSE, not a stopping point — hold in this chat and wait; do not wrap, do not surface a continuation prompt. "The chat has gotten long" only counts as a stopping point when the work is *also* at a clean edge — never mid-task with an answer pending. This enforces **Core §8's pause-in-place rule** (a wait-for-input is a pause, not a stopping point) and defers to the `aii-run-command` "one step, then wait" loop (Step 3) as its concrete instance; it never overrides a live pause and does not restate the rule, it points to it. (Reloading a cold chat is the wasted context this guard exists to prevent — the Context-Economy cost applied to session turns.)

**When the USER invokes the handoff, judge the moment before you obey it — and this is the MIRROR of the guard above, not a second copy of it.** The self-fire guard stops the *system* wrapping too eagerly; this one stops a *hand* wrapping a context that still has work in it. Note which way round the risk runs: the automatic path already reads the state before firing, and the invoked path — the one a person reaches for on a whim, mid-task — had no check at all. If the invoked handoff lands at a genuinely finished edge, **run it silently** — no confirmation, no "are you sure", because a blanket confirm is exactly the pausing this discipline exists to kill. **Only when the moment is bad** — mid-task, an answer of theirs pending, real runway left, and a scoped next unit already identified — print exactly one line before wrapping: *"This looks like a bad moment to hand off — [the one thing still live]. I'd keep going. Say 'hand off' again and I'll wrap."* One line, a recommendation, a one-word override. Never a menu, never a second ask. **And treat an invoked handoff as a SYMPTOM before a request** — an operator reaches for it because the session has been pausing at them, so the real fix is upstream (execute; pause only to get something only they can give) and this gate is the backstop, never the remedy. Ruled by the operator 2026-08-15, `dr_the_handoff_has_no_gate_on_the_path_bryce_actually_uses_20260815`; the upstream rule is Core §8 pause-in-place, pointed at and not restated.

**Only a LIVE session can self-fire.** Auto-fire needs *this* chat's context to close *this* chat. A scheduled or background job spins up fresh with no memory of any conversation, so it can never auto-close an arbitrary chat — true background auto-close is not possible, by honest fact. (This is the Core §8 Capability Ladder "act-then-veto for a confident + reversible action" rule applied to the handoff — the reversible action is running the handoff, the cheap undo is "stop." The skill points to §8 and does not restate the rule.)

---

## Step 1 — Review the conversation for anything worth persisting

Scan the full conversation. Look for:

- **New facts about the user** — preferences, context, how they like to work
- **Feedback they gave you** — corrections ("no, not like that"), confirmations ("yes, exactly that"), style preferences they reinforced
- **Project updates** — decisions made, milestones hit, status changes, deadlines, new goals
- **References** — external systems, URLs, tools, or channels they mentioned that are useful to remember
- **Things to forget** — if they corrected something you had wrong, note that the old fact should be removed
- **Framework signals** — anything that could improve the product the user sells to their clients: a bug they found on their own artifact, a pattern that worked, a missing advisor lens, an arc/messaging refinement, a process discipline they reinforced. These feed the Framework Capture Lane in Step 2 — they are candidates, not canon.

**Also check the chain.** If this session is one leg of a multi-session job, find its block in the session-chain log (the overlay names the exact file). Note which session number this is and the current total estimate — you'll need both for the counter in Step 4. If no chain exists yet but the work clearly spans multiple sessions, start one.

Write down your findings mentally before touching any file. If the conversation was purely conversational with nothing new learned, that's fine — say so and skip to Step 4.

---

## Step 2 — Apply the updates automatically

Don't ask "what should I update?" and don't require a "go" approval for memory writes. **Just apply them.** The user trusts the judgment. Write the memory and workspace files, then move on to the handoff prompt.

If you're uncertain whether something is worth capturing, capture it — a stale memory is easy to prune; a missing one is a silent failure.

Apply them now:

### Memory files
Capture what this session learned about the user, their work and their world. Don't create a
duplicate entry for something that already exists — update it instead. Correct or remove an entry the
conversation showed to be wrong.

**An index entry is a POINTER, not the memory.** Whatever store holds the index, one entry says
`<Title> — one-line hook` and nothing else: no frontmatter, no bodies, no status, no dates, no
multi-clause summaries. All detail — the rule, the why, how to apply it, the context — lives in the
thing the hook points at. **This is where index bloat comes from:** the handoff appends to memory
every session, so an uncapped entry refills the index faster than any periodic cleanup can drain it.
**The constraint is the INFLOW, so the cap is enforced at write time, here — never left to a later
sweep.** A cap that is not checked at write time is not a cap; it is a wish.

**MEASURE the delivered index. Never estimate it, and never trust a size stated inside a file** — not
the index's own header, not a past cleanup note, not this skill. Every reader downstream trusts that
number, and an unmeasured one is wrong. If a write would put the index over its measured budget, **do
not write it**: the index is a router, and the entry belongs wherever that store puts overflow.

⚠ **THE MECHANICS OF A MEMORY WRITE ARE INSTANCE-SPECIFIC — SEE THE OVERLAY.** Where bodies live,
which door writes them, whether the index is a file or a table, what the cap is and how it is
enforced: all of that belongs to the seat. A seat whose store enforces the cap structurally does not
need a session to remember it, and a seat whose store does not must be told so explicitly.

⚠ **RETIRED 2026-08-18, quoted rather than deleted.** This section used to carry ~4,000 characters of
file mechanics: four memory types named individually, a router-versus-section-file split, a hard
200-character line cap, a three-step measure-the-delivered-index procedure, a sibling `*-FULL.md`
overflow file, and a "do NOT add a line-count limit" clause. **On the seat it was written for, every
one of those had been superseded** — bodies moved into a database behind a write door that refuses an
over-cap entry before the body is written at all, and the router was ruled to hold **zero** index
lines, so a cap on the length of an index line was governing a file with no lines in it. It is quoted
because a session that remembers it will go hand-write an index its store now owns. **The generic
lesson survives and is stated above; the mechanics were never generic.**

### Workspace files
Sometimes a conversation surfaces something that belongs in a structured reference file in the user's workspace (their preferences file or a project file), not just in memory. Use your judgment — if the update is specific enough to belong in a living document, include it in the proposed list.

### Session-chain log
If this session is part of a multi-session job, update its block in the session-chain log (path in the overlay):
- Increment **sessions done** by 1 and append a one-line log entry for this session.
- Recompute the **total estimate** from the open items. If it changed, append the move to **estimate history** with a short reason (e.g. "~4 → ~7 (+3 surfaced)"). If it didn't move, say "no change."
- Update **Open next**. Mark the chain `DONE` if the job is finished.

This is what makes the counter in Step 4 honest — it shows the job growing instead of pretending the first estimate was right.

### Session naming — the user is the wire, and that is the design

**YOU CANNOT RENAME A CHAT. Nothing in the runtime lets you, and nothing needs to.** The loop that
works, measured on a live seat: you print the suggested title → the user pastes it into the chat name
→ the same title is written into the prompt they paste forward → the next session reads its own name
out of that prompt and suggests the next one. The human is the wire. Design for that instead of
around it.

⚠ **This paragraph used to read: *"Rename the session if you can; otherwise put that exact string as
the 'Suggested chat title' so the user sets it."* The first clause was never executable on any
surface and is RETIRED 2026-08-18 — quoted rather than deleted, because a session that remembers it
goes hunting for a rename tool that has never existed. The fallback clause WAS the product all
along.**

⚠ **AND A SESSION CANNOT SEE ITS OWN CHAT TITLE.** Nothing in a session's context carries it — it
knows only what the pasted prompt said. **So when the user renames a chat mid-session, you do not
find out.** Before suggesting the next title, ask in ONE line whether the name still reads the way it
does in the prompt. Measured cost of not asking, 2026-08-18: a live record titled
`T14 Onboarding · S190 (chat titled S187)` — the session knew the two had drifted by three and had no
way to reconcile them, so it wrote the disagreement into its own title.

So:
- **The title is LINE 1 INSIDE the Step-4 block, then a blank line** — form `[Session Name] S[n+1]`.
  The copy control copies the block, so a title beside the block is a second hand-selection and the
  measured failure is that no name gets set at all. Print it a second time in the launch card, where
  the reader is the USER setting the name before pasting — two readers, two places, same string.
  ⚠ **This bullet used to read: _"Print the suggested title plainly, on its own line. It is the thing
  the user copies; it is not decoration inside the prompt block."_ — QUOTED, not deleted. The operator
  overturned the placement 2026-08-31. It is still printed once per reader, never twice to one.**
- **Carry the number only when it arrived in the prompt you were pasted.** Never invent one and never
  reconstruct one from the board — an invented number is indistinguishable from a real one. Measured
  2026-08-18 on one seat: the session number was ABSENT on 194 of 527 records and COLLIDED 7 times in
  30 days. **Missing is the common failure, not wrong** — and it goes missing exactly on a cold start.
- **Bump the track counter** if this seat keeps one (where it lives and the exact call are
  instance-specific — see the overlay).
- **The title is a sentence a person reads, never a store coordinate.** Track ids, job ids and session
  row ids belong in the record. The naming FORM itself is instance-specific — see the overlay — because
  what makes a title addressable is a property of the person's sidebar, not of the framework.

### Session-log record — write the distilled record at close (the recall skill reads this)
Every session leaves one small, searchable record so two questions get answered later without digging back through chat titles: *which leg of a job is done*, and *where was the session where we did X*. The record is a byproduct of work this handoff already does (it is already scanning the whole conversation) — not new work. **Raw transcripts are never stored** — only the distilled summary, the keywords, the board cards touched (by id), and a pointer back into the real chat.

Two write touch-points fulfill the contract:
- **Session START (entry gate, turn one)** — upsert this session's record as `status='active'`, with its title, track/session numbers, and the universal locator (the exact session title + date, always knowable). Carry this instruction forward in the Step-4 handoff prompt so the *next* session opens its record on turn one.
- **Session END (this handoff)** — flip the record to `status='done'` and fill the **distilled summary** (this handoff's own "what this covered / decisions / open items" content), the **keywords**, the **touched-card ids** (by id, never a copy), and the **best route back** the running AI supports. The summary MUST stand on its own — complete enough to be the whole answer — because the guaranteed floor is "find it by title + date"; a richer route back (a reopen link, or a quoted line) is a per-AI bonus, never a guarantee.

**Fail-loud (Nygard):** the write counts only on a confirmed single-row result; a record that did not land is called out in the ledger, never silent.

#### The PICKUP — the one thing n+1 actually reads (REQUIRED, and it is not the summary)
**The distilled summary above is the ARCHIVE: it is read later, by a person, through `aii-session-search`. It is NOT what the next session reads.** Those are two different readers and they were served by one field until 2026-08-31 — measured that day on one seat, `distilled_summary` averaged 6,900 characters and ran to 33,372, so the next session either read an essay or read the board instead.

So write BOTH, and know which is which:
- **`distilled_summary`** — the full close-out. Long is fine. Nobody reads it on turn one.
- **`pickup`** — capped, and it is the handover. Four parts, no more: **where THIS session left off** (≤900 chars, your own words), **the ONE next move** (≤500), **what this leg forbids**, and **the ids** — cards and decisions this leg named, full form, never truncated.

**The door refuses what breaks the next session, so let it:** an empty next move, a left-off over the cap, and — the one that matters — **any id that resolves to nothing**, because an unresolvable id costs n+1 its first turn hunting something that was never there.

**Write it LAST**, after the board reconciliation below, so the ids you name are ids you have already verified. The exact call, the tenant and the store are **instance-specific — see the overlay**.

⚠ **HONEST LIMIT: nothing refuses a session that never writes a pickup.** This instructs; it does not enforce. The close gate has seven armed receipt clauses and this is deliberately not the eighth yet — the instrument is built and unarmed on purpose, the same discipline `board_creation_refusal` states in its own body: build it, measure it, THEN arm it. **The residue to measure is a `done` session with no pickup — count it, never quote a count.**

**One fact, one file:** a session's status lives in the record's `status` column and nowhere else — this retires the manual `DONE:` chat-title prefix. The record is the **write half**; `aii-session-search` is the **read half** that searches it. The table shape, the connector/tenant, the exact SQL, and which route-back tier this AI can reach are **instance-specific — see the overlay**; the full design is `04 — Daily Operating System/specs/Session-Log-SPEC-DRAFT.md`.

### Done-without-start check — close the loop on the board (REQUIRED, output-verified)
Work often gets finished without anyone moving the matching card on the user's initiative/work board, so the board silently goes stale. This check is a **required step, not a courtesy** — the handoff prompt in Step 4 may not be generated until it has run. After applying the updates above, compare what this session **completed** against the board's still-open items (the not-yet-done columns).

- **Confident it's the same item → close it automatically** (advance it to the board's done/delivered column), then **verify the move landed** (below) before reporting it in the "updates made" section. No pop-up.
- **It resembles an open item but you're not certain → ONE pop-up:**
  > **Looks like you finished "[board item]" this session — same thing?**
  > 1. Yes — close it on the board  2. Not the same — leave it  3. Not sure — put it on my daily dashboard
  On **Yes**, close/advance the item **and verify the move landed**. On **Not sure**, surface it on the user's daily dashboard so it doesn't get lost. On **Not the same**, leave it untouched.
- **No believable match → stay silent.** Never invent a match; this protects against pop-up fatigue.

**Output-verify every card move — a claim is not proof.** Moving a card can silently fail (connector hiccup, wrong id, write limit). So for every card you advance, after the write **re-read the card and confirm it actually moved** — re-fetch the item and check its status equals the target column. Each attempted move is then either **CONFIRMED** (re-fetched, status matches the target) or **N/A — `<reason>`** (no believable match → nothing was moved). **"Attempted but unconfirmed" is a FAILURE, not a pass.** On a FAILURE, retry that one move once; if it still doesn't land, do NOT report it closed — say plainly which card did not move so it gets handled by hand. Only write a card up as Delivered/Done in the "updates made" section once it is CONFIRMED.

Where the board lives, which columns count as "open," the exact close/surface mechanics, and the exact re-fetch call are instance-specific — see the overlay.

### Board Truth exit gate — reconcile EVERY card this session touched (REQUIRED, hard stop)
The Done-without-start check above looks for finished work that has no card moved. This gate is wider and is the **Board Truth Standard's** exit boundary: it covers **every card this session touched in any way** — opened, advanced, blocked, commented, or claimed done — not just the ones you completed. The rule is simple and non-negotiable: **the handoff cannot finish until every touched card has been re-verified against its real artifact and its status set to the truth.** This is the forcing function the board-drift fix depends on — board status left to end-of-session memory is exactly how finished work kept showing as Active.

For each card the session touched, set the structured status to match reality:

- **`Status`** — one of the Board-Truth status values defined once in Core §8 (six, `Retired` included); the canonical list with definitions lives there, not restated here.
- **`Proof`** — the named, re-runnable pointer that proves the status (deploy id, passing test, committed file path, sent-email id, signed PDF, CRM record id). **No proof → it cannot be `Done-verified`.** A claim is not proof; the check is the proof. (This is `aii-prove-it` bound to the board — see that skill.)
- **`Last Verified`** — the date you just re-checked it against the real artifact.
- **`Next Action`** — one line: the single next move, or "none."

**Output the reconciliation ledger.** Before the handoff prompt is generated, print one line per touched card:

```
[card id] — old: <status> → new: <status> · proof: <pointer> · verified: <date>
```

**A touched card with no ledger line is a visible failure, not a silent skip** — if you cannot re-verify a card, say so in the ledger (`old → UNVERIFIED · could not confirm: <reason>`) rather than leaving it out. The handoff is not complete until the ledger accounts for every card the session touched. Status lives in the board field only — never restate it in the handoff prose, memory, or the chain log; those point to the card by id (one fact, one file). The exact field ids, board location, and re-fetch call are instance-specific — see the overlay.

**Entry-gate reminder for the next session:** the first move of any board-touching session is to spot-check the top Active cards against reality before acting — the handoff prompt should carry that forward when the next session will touch the board.

### Spec-map exit gate — reconcile any spec touched this session (🗂 SPEC GATE, REQUIRED)
If the session created, edited, or retired any governing spec/standard, the handoff cannot finish until each one's **spec-registry** row has been re-verified against the file — `governs`, `status`, and `source_path` all current (edit → `source_path`/timestamp; retire → row superseded **and** file archived; new → row inserted). A file changed without its row updated is a **drifted map** — the failure the 🗂 SPEC GATE exists to prevent — so a drifted or missing row is a straggler, fixed in THIS handoff (via `aii-safe-edit`), never left for the next session. Add one line per touched spec to the reconciliation ledger: `spec_registry <slug> — row: <ok | FIXED — what | FAILED — reason>`. Where the registry lives and the exact query/write call are instance-specific — see the overlay.

**Entry-gate reminder for the next session:** carry the Spec gate forward in the handoff prompt — before designing, building, ruling, or asking the operator to rule in any spec-covered domain, the next session queries the spec map first and reads the governing spec, failing loud if none governs (🗂 SPEC GATE).

### Ask-gate exit gate — no question may be left half-asked (REQUIRED)

Every question this session put to the operator went through the **ask gate** (the Front Door's sixth
always-on guardrail), and the gate opened a decision record the moment it handed back the question.
**A record that was opened and never closed is not a loose end — it is the defect regenerating
itself**, because the NEXT session's gate reads that slice, sees no ruling, and asks the operator the
same thing again. The gate cannot close its own records; only the session that heard the answer can.

Before you write the handoff prompt, resolve **every** record this session opened:

- **He answered it** → write the ruling in **his own words, verbatim**, not your paraphrase, and mark
  it ruled. If he said the answer covers the whole family and not just this instance, say so on the
  record — that is what lets a later gate stop a question rather than merely inform one.
- **He answered something better than what you asked** → record what he actually said and note that
  the fork as offered was rejected. An operator who reframes the question has given you a MORE
  general answer, and flattening it back into your option list throws away the part worth keeping.
- **He never answered** (you moved on, he redirected, the session ran out) → say so on the record and
  carry it in the handoff's open list **by name**. Never leave it silently pending: a pending record
  is invisible to him and reads to the next gate as unruled.

**Then report it in the reconciliation ledger, one line, beside the board and memory lines:**
`ask-gate — <n> asked · <n> ruled · <n> carried open · <n> prevented (gate said already-answered)`

**The last number is the one to watch, and it is the only positive figure in this whole family.**
Every other measure here counts damage. *Prevented* counts questions the operator never had to see.
⚠ **A gate working and a gate forgotten look identical from the outside — both are silence.** Zero
prevented is not automatically good news; it is only good news if the count of asks is also low.
Report both, always, and never report a rate over a handful of observations.

**Resolve the store BY CATEGORY** (`ask-gate` / `gate_question`, Core §11 rule 4) — never by a
function or table name, and never by a connector name.

### File Lifecycle exit gate — no NEW hidden-live file may leave this session (REQUIRED)
The two gates above keep the *board* and the *spec map* honest at the close. This one keeps the **workspace** honest, and it is the exit boundary of Core §8's **File Lifecycle Standard** — *the workspace may never hide which file is live.* It is here rather than only on a periodic sweep for one reason: a sweep on a cadence catches a hidden-live file *eventually*, and the pain is caused during the session that created it, by the next session that greps and lands on the stale copy. The session that made the mess is the cheapest place to name it.

Run the workspace's no-duplicate check against its recorded accepted-debt set and add ONE line to the reconciliation ledger:

```
shadow-duplicates — new: <n> · known: <n> · review: <n orphan/ambiguous>
```

- **`new: 0` is the only clean result.** A non-zero `new` names each path in the ledger — a count with no names is a silent skip, not a report. Fix it in THIS handoff (park the copy, or record it as accepted debt with a stated reason); never carry an unnamed new one forward.
- **`known` is a SET of paths, not a number.** A path is *recorded*, not forgiven. This is what lets the gate be strict about the next one while a backlog is still open — a count baseline would read unchanged when one old duplicate is swept and one new one is created, and go green over a brand-new defect.
- **`review` items are reported, never acted on.** An orphan (a duplicate-form name with no live sibling) may be the only copy of that content; an ambiguous one may be a name a human typed on purpose. Both go to the user as a question, not to a sweep.
- **Detecting is not sweeping.** The gate READS everywhere, including the locked folder. Nothing moves inside the locked folder without the pop-up in the locked-folder rule below.
- **If the check cannot run, say so in the ledger** (`shadow-duplicates — COULD NOT RUN: <reason>`). An absent gate reported as a clean one is the exact failure this gate exists to prevent, one layer up.

Where the check lives, its accepted-debt file, and how to invoke it are instance-specific — see the overlay.

**Entry-gate reminder for the next session:** if the ledger showed anything under `new` or `review`, carry it into the handoff prompt by name — a hidden-live file is the one defect that makes every *other* gate's evidence unreliable, because a grep that lands on the stale copy reads as a finding.

### Memory-pull gate — report the receipt, and carry the pull forward (REQUIRED)

The three gates above keep the board, the spec map, and the workspace honest at the CLOSE. This one is about the next session's OPEN, and it is here because it is the only turn-one gate that cannot report its own absence. Every other entry gate leaves evidence a later reader can find: an integrity check STOPS the chat, a session record demands a confirmed single-row write, an overlay pull is stamped by the store it read from. A memory pull that never happens leaves nothing at all — so "pulled and found nothing" and "never ran" are the same observation, and the session most convinced its answers are sourced is exactly the one that skipped it.

**Report the receipt in the reconciliation ledger — one line, every session:**

```
memory-pulls — <trigger>:<w3 opened>/<w3 offered> [· <trigger>:…]
memory-pulls — NONE — the pull never ran
memory-pulls — NONE — no memory store published for this seat
```

- **`NONE` is a required legal answer, never an omitted line.** A handoff that cannot say what the session pulled writes `NONE` and which kind. That is the whole mechanism: the miss becomes a written fact at the close instead of an invisible one. A seat with no memory store configured writes the third form — that is finished and correct, not degraded.
- **The receipt is DATA, not prose.** Write it to the session record so it answers a QUERY. A standing sweep then finds every session that skipped the pull, instead of waiting for a person to re-read a ledger. Where that record lives and the exact write are instance-specific — see the overlay.
- **`w3 opened` < `w3 offered` is not a failure, but it is not silent either.** Weight-3 rows are the rules that already prevented an expensive, recurring defect. Record what was actually opened, including when it was fewer than were offered, and why.
- **Re-pull when the JOB changes, and receipt each one.** A rule filed under the job during which the mistake happens is the only rule that can fire in time, so one pull at turn one is a floor, not a finish.

**Entry-gate reminder for the next session — this one is UNCONDITIONAL.** The other three entry-gate reminders above are carried forward *when relevant*. This one is carried forward every time, as **step 0 of the First move** (Step 4), written as the actual runnable command with the trigger named — never as a pointer to the file that holds the command. A pointer sitting in a file is a maybe; an instruction in the first message is not.

### Framework Capture Lane — stage the framework signals (the three doors)
Framework candidates are staged on a dedicated lane — a staging shelf, never auto-applied to locked `03` canon. Staging is **not** a `03` edit, so it never needs the adjudication pop-up just to be captured.

**Before ANY door creates anything — walk the attach ladder.**

Capture attaches before it creates. Making a new item is the last resort, not the first move. In order:

1. **Is this already taught somewhere?** Search the knowledge set for a lesson covering the same underlying point. If one exists, record this occurrence **on that lesson** and do not create anything. One lesson with three real examples is stronger than three cards.
2. **Is there an open candidate in the same bucket making the same point?** If yes, **SHARPEN** it — add the new example and any new detail to that candidate. Do not open a rival.
3. **Only then create.** A new item requires one line saying **why it is a RIVAL** — what it claims that no existing lesson or candidate claims. "It came up again in a new session" is not a reason.

Every created item carries a **bucket** — one of the section keys the knowledge index defines. No bucket, no create.

**Match on the POINT, not the words.** This lane also receives ideas from clients and teammates who will not use the operator's vocabulary. Two items are the same when they would produce the same rule, even with no words in common.

**Two safety rules — both lean toward the mistake you can undo:**

- **Not sure it's a match → CREATE it and flag it.** Never attach on a guess. A duplicate is visible and easy to merge later; an idea wrongly buried inside someone else's card is gone.
- **Can't run the ladder** (lane unreachable, search fails) → **CREATE it and mark it `attach-unchecked`.** Never drop a signal because the check was down.

Three doors put something on the lane:

1. **Confident → auto-stage.** When this session clearly produced a reusable framework signal (from the Step 1 scan), walk the ladder above, then attach or stage accordingly, and tell the user in plain text (FYI). No question asked.
2. **Declared → `[FRAMEWORK]`.** The `[FRAMEWORK]` drop is a mid-chat trigger (see the user's standing preferences). At wrap-up, record any `[FRAMEWORK]` drops from this session that aren't already on the lane.
3. **Unsure → ask.** Anything you *suspect* might be framework but aren't sure about becomes ONE pop-up:
   > **Framework candidates — I'm unsure about [N] from this session. Add to the lane?**
   > 1. Yes, add all (Recommended)  2. Let me pick which  3. None this time

   If nothing is confident **and** nothing is unsure, stay silent — no pop-up (protects against pop-up fatigue).

Added items land at **Stage: Raw**, **Category: "Added end of Session"** unless the user sorts them on the spot. Capture each item as a **goal/outcome, not a task** ("every visual asset should teach the model at a glance," not "fix the SVG"). Memory still writes automatically and separately — the lane holds the *promote-to-`03`?* question, never a copy of the fact. **Where the lane lives and exactly how to write/move a candidate is instance-specific — see the overlay.**

### 🔒 Locked-folder rule — ALWAYS enforce this
Some folders are designated as locked (live delivery assets the user does not want changed silently). Before touching ANYTHING inside a locked folder — any edit, move, rename, or creation — stop and ask the user via a pop-up. State: (1) exactly what you're changing, (2) why, (3) what it could break. Do not proceed without their go-ahead. This is separate from and stricter than the one-click OK above — locked-folder changes always get their own pop-up. All non-locked folders can be updated once the user approves the proposed list.

---

## Step 3 — Advisor-aware handoff

Think about what the next session will likely involve, and recommend the advisor lenses that would help. An "advisor" is a named expert perspective the framework leans on (e.g. a sales advisor, a legal advisor, a customer-experience advisor).

- **Recommend** the 1–3 advisors most likely to be useful in the next session, and say in one line why each.
- **Flag a gap:** if a useful advisor for the upcoming work doesn't exist yet, name it and note that it should go to the adjudication gate (the user's approval process for adding a new framework default) — don't create it here.

Keep this to a few lines. It's a heads-up for the next session, not a deep analysis.

---

## Step 4 — Generate the handoff prompt

**The handoff prompt is a launch instruction, not a recap.** It must cause the *next* session to act
on its very first turn — not summarize the context, not ask "where do we start," not wait for the
user. They paste it and the new chat runs the first move.

### The one rule that decides what goes in it — CARRY THE ADDRESS, NOT THE CLAIM

Sort every candidate line into exactly one of three buckets:

| | What it is | Where it goes |
|---|---|---|
| **CARRY** | cheap to carry, impossible to query — the job sentence, the suggested title, the session number, the ONE first move, the IDs | in the prompt |
| **PULL** | any claim about STATE — built, unbuilt, done, ruled, blocked, satisfied | **name the id; the next session resolves it on turn one** |
| **DROP** | narrative recap — "what this is about" prose, "here is what we did" | nowhere |

**A state claim and its address are not the same thing, and only one of them survives the gap between
writing and pasting.** `- Built the write door — <card id>` carries a claim AND an address; the claim
is the liability and the address is the asset. Write `- <card id>` and let the receiving session read
the status off the card. **This is shorter and more reliable at the same time**, which is rare enough
to say out loud.

⚠ **The evidence this is not a style preference.** Measured 2026-08-10 across three consecutive legs:
leg 13 → 14 told the next session *"item 4 was never built"* when its card was `Done-verified`;
leg 15 → 15 said a decision *"is the actual work of this leg"* when its record was already `ruled`;
and the control — leg 15 → 16 carried a re-runnable falsifier instead of a claim, and that item was
settled in one command instead of half a session. **Two of three narrative claims were false within
hours. The one that carried an address was not.**

⚠ **Honest limit: nothing goes RED on this.** A handoff prompt is not stored anywhere a check can
read, so this is a discipline that improves the odds on a human read — never a fence. Say so rather
than letting the next reader assume enforcement.

**You already have the ids.** Step 2's board reconciliation produced them and the ask gate produced
the record rows, in this same run. Step 4's job is not to go find them; it is to not throw them away.

### What the prompt CARRIES and what it must never RESTATE — the resume call changed this

**Added 2026-08-21. The operator's goal, verbatim: "context economy, and n+1 knows where n left
off. Memory and advisors resolved dynamically, as few static elements as possible."**

A handoff prompt used to be the only way state crossed the gap between two chats, so it carried
measurements. It is not any more. Each live track now has a **resume function** — one call, whole
state, every number measured at call time, nothing stored — built on the pattern of
`spine_resume(p_tenant, p_cdb_id)`. That moves the CARRY/PULL/DROP table above from a discipline to
a mechanism:

| Line | Rule |
|---|---|
| **Track** | CARRY it, character-for-character as `session_log.track_name` holds it. The resume call resolves the track by that string; a paraphrase silently returns another track's state or none. |
| **Resume call** | CARRY it. One line, executable, tenant stated explicitly. |
| **Pause clause** | CARRY it verbatim. See below — this is its primary delivery surface. |
| **FORBIDDEN** | CARRY it, and make it specific to this leg. |
| **Model + effort** | CARRY it. Both halves, always. |
| **Any measurement** | **DROP it.** Counts, "X of Y done", "N rows remain", "the store now holds". The resume call returns all of it, live. A number written into a prompt is stale the moment it is typed. |

⚠ **THE EVIDENCE THAT RESTATED MEASUREMENTS ARE THE LIABILITY, not a style preference.** On
2026-08-21 the global instruction box carried two exact-looking row counts beside a claim about two
stores. All three facts were false, and the counts were what made the claim credible enough to be
quoted back as the EVIDENCE for a store-design decision that same morning. The design call survived;
its evidence did not. **Exactness is what makes a stale number dangerous.** Carry the call, never
the count.

**Where the resume call comes from.** Read it off the track's own function — `<track>_resume`. If
the track has no resume function yet, say so in one line inside the prompt and hand the next session
the two queries it should read instead. Do not invent a function name; a call that does not exist
costs the next session its first turn.

### The pause clause — this template is its PRIMARY delivery, not a copy of it

**Canonical home: `dr_the_handoff_has_no_gate_on_the_path_bryce_actually_uses_20260815`.** The
operator ruled the same thing twice — that row, and
`dr_f01b_f09_roles_and_the_is_multi_detector_correction_20260811` four days earlier, which was filed
at a model-card-tagging coordinate no session-behaviour lookup can reach. **He ruled it a second
time because the first was unfindable, and both prior remedies were file-it-and-hope.**

**This template is the fix, and the reason is structural: a handoff prompt is read at the START of
session n+1, before it can do anything. That surface cannot be skipped.** The one gap it cannot
reach is session 1 of a chain, which has no handoff prompt in front of it; for that case only, the
same clause lives at `north-star-how-every-session-runs.md` clause 8, pointing at the same row. Not
a second rule — the same rule, for the one gap this surface cannot reach.

⚠ **HONEST LIMIT, and it is the same on both surfaces: stopping is the one act with no gate in
front of it.** This clause instructs and cannot refuse. Do not describe it as enforced. The
measurable residue is a `session_log` row left `active` with no handoff behind it — measure that
count, never quote one, and treat it as the sweep rather than as proof the rule is working.

### How it is delivered

Output the template below **verbatim inside a fenced code block**. **The chat is the delivery
surface** — writing it to a file, a side panel or a database row is NOT delivering it. The fence is
an invariant, not a formatting preference: un-fenced, the surface *renders* it, the one-click copy
control never appears, and that control **is** the affordance the handoff is delivered by. It
degrades **silently** — nothing errors and the output still reads like a handoff.

**Self-check, in this order:** (0) the fenced block was emitted INTO THE CHAT — check this first,
because the other three only inspect a block that already exists; (1) it opens with a fence; (2) the
first line inside is the SESSION NAME (`[Session Name] S[n+1]`), followed by a BLANK LINE, and the
third line is `## ▶ New session — start immediately`; (3) nothing inside is rendering.

**THE SESSION NAME IS THE FIRST LINE INSIDE THE BLOCK, FOLLOWED BY A BLANK LINE.** Form:
`[Session Name] S[n+1]`, then an empty line, then `## ▶ New session — start immediately`.
**Why it is inside and not beside: the copy control copies the BLOCK.** A title printed next to the
block is a second thing to select by hand, and the measured failure is not that the user sets the
wrong name — it is that he sets none. Inside, one copy carries the name and the launch instruction
together, and the name is the first thing the receiving surface sees. It also gives `aii-run-job`
the `JOBNAME: Session N` shape it fires on.

⚠ **OVERTURNED BY THE OPERATOR 2026-08-31 — the old wording is QUOTED, not deleted, because it was
a deliberate ruling and a session that remembers it will move the title back out.** It read:
*"The suggested chat title is NOT printed here — it is printed BELOW the block, in the launch card.
It is still printed OUTSIDE the block in plain text, because a title reachable only by
hand-selecting it out of a code block is a title the user will not set."* **His words:** *"I want the
first line to be <Session Name> S(n+1) with a line return before printing the handoff information
(it all prints in the box that has the copy text function)."* The 2026-08-18 change that row records
— print the title ONCE, never twice — STANDS and is not touched: it is still printed once. What moved
is WHERE, from beside the block to inside it. Also print it in the launch card as the name to SET
before pasting; that reader is the user, not the next session. See Step 2 → *Session naming*.

⚠ **RETIRED 2026-08-18, quoted rather than deleted.** This paragraph used to read: *"Print the
suggested chat title on its own line OUTSIDE the block too."* — and in practice that put it ABOVE the
block, at the top of the wrap. A session that remembers the old placement will print the title twice,
once at the top and once in the launch card. Print it ONCE, in the launch card, last.

⚠ **THE WIDE BOARD VIEW IS A SEPARATE, DELIBERATE CALL AND DOES NOT GO IN THE `Resume` SLOT.**
`SELECT <track>_resume('<tenant>');` returns the whole track — every open card, everything held, every
blocker, every startable stray. It is the right call when the next move actually needs it and the WRONG
call for getting oriented. **Measured 2026-08-31 on one seat: that seat's widest track resume returned 13,191
characters, most of it board pile; the pickup for the same track returned 775 — 17× smaller.** Putting the
wide call in the `Resume` slot is exactly how a session that needed one sentence opens on the whole board,
which is the thing the operator does not trust. **Carrying the address instead of the claim was right and
it shrank nothing, because the address resolved to the board.** Name the wide call in *First move* if and
only if that move needs it.

```
[Session Name] S[n+1]

## ▶ New session — start immediately
You are the continuation of a prior chat. Do NOT summarize this, ask what to do, or wait for me. Run **Resume** FIRST — it carries the state, this prompt does not — then run the **First move**. No preamble, no recap.

## A SESSION DOES NOT STOP. IT PAUSES.
It runs until it needs one specific thing only the operator can give — then it asks, holds in place, and waits. It does not wrap, does not offer a new chat, does not push him elsewhere. The only endings are: he says so, or the handoff fires at a genuinely finished edge.
(His clause, verbatim. Home: `dr_the_handoff_has_no_gate_on_the_path_bryce_actually_uses_20260815`. Honest limit: nothing can refuse a session that decides to stop — this instructs, it does not enforce. The measurable residue is a session_log row left `active` with no handoff behind it.)

## Continuing: [Suggested Chat Title]
🛤 Track: [the track name, character-for-character as the session_log row carries it — the resume call and the next handoff both resolve on this string]
📍 Session [N] — [what this leg is for, in one line]
(omit 📍 if this work is genuinely a one-off; carry the number ONLY if it arrived in the prompt that started this session)

### Resume — run this before anything else
SQL: SELECT session_pickup('<tenant>', '<track name, character-for-character>');
[Nothing else. This returns the PREVIOUS session's own close-out — where it left off, the one next move, what this leg forbids, and the LIVE status of only the ids that session named. It is one session's handover, not the board. Do not preview what it returns.]

### Resolve these first
- `<board-card id>` — [two words: what it is]
- `<decision-record id>` — [two words]
(ONLY ids the resume call does not already return — it returns the track's own cards and pending rows, and repeating them here is the duplication this section exists to avoid. If a thing has no id, it is not on the board and belongs there before it is handed forward.)

### First move (run this now)
[The single first action, phrased as a command the new chat executes immediately. Name the SOURCE TO READ — the table + connector, the spec path, the card id — never the tool to poke. **Never a bare diagnosis:** "check whether X exists" hands the next session a question with no source, and the cheapest way to answer a sourceless question is whatever tool sits nearest. If anything was left `Blocked`, carry that block's re-runnable falsifier so it can be killed in one call instead of inherited as fact. **Step 0 is the memory pull, spelled out as a runnable command** — never "run the turn-one gates" and never a file path that holds the command; the measured failure is a session that follows a First move exactly while a gate named only by reference never runs. The exact command is instance-specific — see the overlay; omit step 0 only for a seat with no memory store.]

### FORBIDDEN this session
- [one line per thing this leg must not do — the traps THIS work has already fallen into]
(Carry only what this leg actually forbids. A generic list is ignored; a specific one is obeyed. If nothing is forbidden, write "nothing specific" rather than deleting the heading — a missing section reads as a section that did not apply, and the next session cannot tell that apart from a section nobody filled in.)

### Model + advisors
[Which model AND effort, in the form `Opus / High` — the SAME value as the launch card's `Suggested Model Next Session` line. One line why. 1–3 advisor lenses, one line each, or omit.]

### Files / paths
[Only paths the new chat will actually need — omit if none]
```

⚠ **CHANGED 2026-08-21 — the OLD opening line and the OLD shape are quoted, not deleted.** The
template used to open *"Resolve the ids below FIRST — they carry the state, this prompt does not"*
and had no **Track**, no **Resume**, no **FORBIDDEN** and no pause clause. It now opens on the
resume call, because a per-track resume function exists and one call returns more, and fresher, than
any id list a prompt can carry. **A session that remembers the old shape will emit a prompt with no
Resume line** — which reads as a track that has no resume function rather than as an omission, and
costs the next session the turn it was built to save. Everything the old template carried is still
here: `Resolve these first`, `First move`, `Model + advisors` and `Files / paths` are unchanged
word-for-word.

**Write full, stable IDs — never truncated.** A shortened or display-form ID returns "Not Found" and
forces the next session to re-hunt it before it can act, which breaks turn-one launch. Where it is
cheap, add a re-resolve hint beside the ID (the parent record + a search term) so even a stale ID is
recoverable fast.

**The launch primitive is three things, always together: the copyable prompt + the First move + the
model to run it in.** Handing the prompt without naming the model makes the user pick it by hand
every time.

**The model appears in TWO places on purpose, and this is not a one-fact-two-homes violation — they
have two different readers.** Inside the block it is an instruction to the NEXT session. In the launch
card below the block it is an instruction to the USER, who must set the model picker BEFORE the paste
lands. Neither can do the other's job. Same value both times — if they ever disagree, the launch card
is the one that is wrong, because the user acts on it first.

⚠ **RETIRED 2026-08-18, quoted rather than deleted.** The template used to carry three narrative
sections — `### What this is about` (1–2 sentences of prose), `### Done this session` (a bullet per
completed item) and `### Open / pick up here` — each with an id appended to the claim. They are gone
because the CLAIM was the part that went stale and the ID was doing all the work. A session that
remembers them will re-add prose the next session has no way to verify. **`Open / pick up here`
specifically is now the `Resolve these first` list: same job, no assertion about status.**


## Finishing up — PRINT THE EXCEPTIONS, NOT THE RECEIPTS

Every gate in Step 2 writes its result to a store. **A gate that wrote is proven by its row, not by a
line on the user's screen** — so the ledger is data, and only the parts a person can act on are
printed. Printing was the forcing function back when there was nowhere to write; where a store now
holds the receipt, the print is a leftover.

**Print, always — IN THIS ORDER. The order is the instruction, not a suggestion:**

1. **What changed in their world, in plain language** — "updated your naming rules and closed two
   items", not a bullet per file path.
2. **The session number**, only if it arrived in the prompt this session was started from.
3. **Every exception, by name** — anything that failed, could not be verified, or could not run. A
   count with no name is a silent skip.
4. **The one thing you need from them**, or say plainly that nothing is needed.
5. **The fenced handoff prompt block** (Step 4).
6. **The launch card — LAST, always, BELOW the block.** Two labelled lines, in plain text, nothing
   else between them:

   > **Suggested chat title:** `<title>`
   > **Suggested Model Next Session:** `<model> / <effort>`

   Written out, that second line reads `Suggested Model Next Session: Opus / High` — or
   `Sonnet / Medium`, or whatever the next leg actually needs. **Model AND effort, always.** A model
   name on its own still leaves the user guessing at half the setting, and the effort is the half
   that decides whether a cheap leg burns an expensive one.

**Why the launch card goes last — ruled by the operator 2026-08-18.** These two lines are the only
things in the entire wrap the user ACTS on: set the model picker, rename the chat, paste. Printed at
the top they sit above the exceptions AND above a long fenced block, so by the time the user has
scrolled to the block — the thing they came for — both have gone off screen behind them. Last means
at the point of use.

**Do NOT print** a gate whose result is clean. The board reconciliation, the spec row, the ask-gate
tally, the duplicate sweep, the memory-pull receipt and the session record all write where a query
can find them; a clean one is a row, not a sentence.

⚠ **The exception to the exception, and it is the whole reason the ledger existed:** a gate that
**could not run** is not clean and is not an absence — it is a finding, and it must print. *Cannot
tell* rendering as *fine* is the failure every one of those gates was built against.

⚠ **RETIRED 2026-08-18, quoted rather than deleted.** The instruction used to be *"tell the user:
what memory/file updates were made (one bullet per file changed) … the chain counter … the
recommended model,"* on top of six ledger lines printed every session regardless of content.
Measured on one live seat over 13 days, 529 sessions: **291 asked the operator nothing at all**, so
the ask-gate line printed four zeros in 55% of sessions, and only **6 sessions** left a question
pending — the line was actionable **1.1% of the time**. A session touched **5.2 cards on average**,
each producing a ledger line of ids and proof pointers. The quoted wording is kept because a session
that remembers it will read the silence of a clean gate as the gate having been skipped. **It was
not skipped; it wrote a row.**

⚠ **PARTIALLY RETRACTED 2026-08-18 — same day, by the operator, and the reasoning error is worth
more than the line.** One item in that cut was wrong: **the recommended model**. It was retired
alongside the per-file bullets, the chain counter and the ask-gate tally on a VOLUME argument — 529
sessions, printed every time, mostly noise. But it does not share their defect. Those lines are
REPORTS of work already done and already stored, so a query can replace them. The model line is an
INSTRUCTION the user must act on BEFORE the next session starts, and it is stored nowhere — there is
no row to read it off. **Volume was measured; ACTIONABILITY was never checked, and that is the flaw
in the original argument.** It returns as `Suggested Model Next Session: <model> / <effort>` in the
launch card above, now carrying the effort the retired version never had. The rest of that cut
stands unchanged.

That's it. No padding, no "great session!", no summary of the summary.


---

*History & changelog: on the Initiatives Board — framework cards + adjudication records (search `aii-session-handoff`). Not carried in this always-loaded body, per Context-Economy Law 3 (minimal payload).*
