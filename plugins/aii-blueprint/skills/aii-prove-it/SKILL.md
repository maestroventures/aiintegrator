---
name: aii-prove-it
description: >
  AI Integrator Blueprint: Prove It. Verifies the system's own work before ever claiming it is
  "done." Use this skill whenever you are about to report a task complete — a file edit, a batch
  of changes, a calculation, a data pull, a generated document, or any deliverable. It runs an
  actual check (re-read, re-grep, re-run, re-count) that proves the work matches what was asked,
  then reports the proof, not just the claim. Trigger it before words like "done," "finished,"
  "complete," "all set," or "that's everything." A claim is not proof — the check is the proof.
---

# Prove It

You are about to tell the user something is done. Before you do, prove it. This is the system
pointing the "no silent stalls" discipline (Core §3, Mandate 2) at its own work: a job is not
finished until its end-state is verified out loud.

The rule: **a line that says "I changed X" is a claim, not proof. The check is the proof.** This
skill exists because a past batch reported changes it had not actually made. Never trust your own
summary of what you did — go look.

---

## Step 1 — Name the success condition

Before checking, state in one plain line what "done correctly" actually means for this task. Examples:

- "Every instance of the old phone number is replaced with the new one."
- "The total in the summary equals the sum of the line items."
- "All five files mention the new version number; none mention the old one."

If you can't state the success condition, you don't yet understand the task — clarify before claiming anything.

---

## Step 2 — Run the actual check

Pick the check that matches the work and **run it for real** — do not eyeball it from memory:

**Read the authoritative source, not a copy of it.** Run every check against the source of truth — never a cached or mirrored copy (a synced file-mount, a CDN, a read replica, a memoized view) that can serve stale bytes. A stale read lies in *either* direction: a false-fail (the check says the work didn't land when it did) or a false-pass (it reads an old copy and calls a broken thing fine). When a cache sits in the read path, hit the authoritative store directly or force/await a refresh before trusting the result. (Lived proof: after a committed edit to a locked file, re-reading it through the sync-mount returned the OLD bytes — the mount's dir-cache hadn't refreshed — so the grep "failed" though the write was correct; reading the true on-disk copy proved it landed.)

- **Find-and-replace / edits across files** → grep the whole set for the OLD value(s) and confirm **zero** stragglers, then grep for the NEW value and confirm **one canonical form survives** — not just that the old value is gone. A delete-only grep can miss a *wrong* replacement (a past batch swapped in "Executive Director" where the canonical term was "Experience Designer"; the old-value grep never caught it). Grep for every near-variant of the new term and confirm exactly one is left standing.
- **A line/entry removal from a managed set or index** → after deleting, grep for **adjacency-glue** — a removal that consumes a leading newline can weld the neighbors together (a close-paren welded to the next bullet, e.g. `)- [`). Grep the specific glue pattern and confirm **zero**; the grep is the proof, not the edit's success message.
- **Math / totals / counts** → recompute independently (a script, a fresh sum) and compare.
- **Data pulls / lists** → re-count rows, check for blanks, confirm the filter actually held.
- **Generated file (doc, sheet, deck)** → re-open it and read the part you claim you produced.
- **A brand-facing VISUAL (one-pager, deck, PDF, landing page, graphic, email asset)** → **a read is not a look.** Re-opening the file and reading its text or markup proves the *words*; it proves nothing about what the thing *looks like*. Render it at a real URL and **look at the rendered result** through the registered `rendered-view` / `view_rendered_page` provider, then critique what you see against the brand tokens the spec registry says govern it — typeface actually **resolving** rather than silently falling back, palette, spacing rhythm, logo integrity. Prove numerically where you can (computed styles beat squinting; a font-family read is stronger evidence than an eyeball). **If no provider resolves in this chat, the asset cannot be `Done-verified`** — mark it `Done-unverified`, tell the operator in ONE plain line, and let `report_gap_and_escalate(...)` carry the gap to its owner. **Do not pop up at whoever happens to be in the session.** The person in the chat is usually not the person responsible for the asset; an interruption to a bystander is noise, while a routed board item reaches someone who can act. (Lived proof: a live marketing site ran on its own brand guide's *fallback* font for months, with a tokenised design system sitting unused in the same repository — every word on the page was correct, and no check that only reads text could ever have caught it.)
- **A landed action (a card staged for review, a draft, a written CRM field the operator must approve)** → confirm it actually reached **the surface the operator will approve it on** — open the real card, open the real draft, read the real field — not parked in a document that *describes* the action. Core §8 ranks those surfaces (the operator's own review surface first, the vendor tool only as a fallback); this check accepts **either**, and what it refuses is a document. A finished action sitting in a debrief or a copy-paste block is a silent failure (Core §8, Land It or Flag It). This is the automated check behind that standard.
- **An outside integration (webhook, signed callback, API handshake, anything with signature/auth verification)** → "done" requires a **real provider event** reaching the endpoint, with the logs as the proof. A synthetic test you sign the way your own code expects will **always pass** and proves nothing — it can't show the provider actually signs and sends the way you assumed. (Lived proof: a self-signed HMAC test passed, then the first real SignWell ping returned 401 because the provider's real signature scheme didn't match our adapter.) **Proof economics — a real error can be the proof.** That 401 is itself the proof the wire reached the real provider: a real error that exercises the full round-trip (request-shape → transport → parse → loud-fail) proves the transport is *live* even without a paid success. Don't demand a success you don't strictly need — weigh proof value vs. cost before standing up paid infrastructure for the last sliver (Core §5.18 proof economics).
- **A board/initiative card you're calling done** → a card may not reach **`Done-verified`** on a bare claim. The proof is the **same named, re-runnable pointer** the underlying deliverable produced (deploy id, passing test, committed file path, sent-email id, signed PDF, CRM record id) — re-checked against the **real artifact**, then written into the card's `Proof` field with today's date in `Last Verified`. No proof artifact → the card can only be `Done-unverified` (claimed, not proven), never `Done-verified`. The allowed status values are the Board-Truth vocabulary defined once in Core §8 (six values, `Retired` included) — not restated here; status lives in the card field, never in prose. This is the Board Truth Standard (Core) — the board is only a source of truth if its status is *true*. (Instance field ids + board location live in the overlay.) **And once a card sits `Done-verified`, whatever the `Proof` field points at — a fixture, a test row, a snapshot — may never be deleted while that status holds: mark it permanent or archive it by rename, never delete, because a re-run against a deleted proof returns nothing and a verified card silently becomes a false green with no signal that anything changed.** (Lived proof: a synthetic test fixture backing a Done-verified card's own proof was about to be marked "safe to delete" the same session it was created — caught before anything was lost. Card `neon_a_synthetic_fixture_backing_a_loop_closed_proof_may_never_be_marked_safe_to_delete_20260816`.)
- **Code** → run it (or the test) and read the output — **in the real run condition**: the same launch path, working directory, and environment the artifact actually runs in. A green check from a convenient proxy (e.g. run from inside the module's own folder) is not proof. (Lived proof: a node script launched from `/tmp` resolves `require()` from `/tmp`, not the dev cwd, so a local module needs `NODE_PATH`; the cwd-proxy check passed, the real `/tmp` run failed with `Cannot find module 'pg'`.)
- **A screen that contradicts logic you have already read and confirmed correct** → before forming any theory that spends the **operator's** attention ("the deploy must be stale," "your browser cached it"), go one layer **down** to whatever actually paints the element — the stylesheet, the template, the serializer. The deciding layer and the rendering layer are different layers and **either can be the liar.** Diagnostic order: **deciding code → rendering code → environment (build / cache / deploy)**; asking the operator to go verify something is the **last** move, not the first. Run the check you can run yourself before the one that costs them a round trip. (Lived proof: `isb.hidden = (FILTER !== 'Inbound')` was correct and the build stamp matched exactly — the real cause was one CSS line, `.inbsectbar{display:flex}`, outranking the user-agent `[hidden]{display:none}`; the proof was in the same stylesheet the whole time, and the operator was sent to read a footer for nothing.)
- **A spec, or a capability built from a spec (🗂 SPEC GATE)** → two checks. (1) **Registry consistency:** if a spec was created / edited / retired, confirm its **spec-registry** row matches the file — `governs`, `status`, and `source_path` all current (a file changed without its row updated is a drifted map, and the map is what the next session queries). (2) **Built-to-spec vs verified-live** (`Spec-Build-Proof-Standard`) — never collapse them: a capability is `built-to-spec` only when a re-runnable harness passes its acceptance list, and that `<PASS>/<TOTAL>` counts as proof only once the harness is shown to go **red** on a mutated / broken impl (a check that cannot fail is a lying gate); it is `verified-live` only after a real run on the live surface. Write the canonical Proof-string with the real count — never an invented one.

- **A claim about behaviour — what a check, guard, trigger or function DOES** → **make it fire.** A read of its source proves the text is there; it cannot prove the behaviour, and it cannot tell code from a comment about code. Run it against a value it must refuse and a value it must accept, inside a block that rolls itself back, and read what actually happened. **The tell: your claim is about what something does, and your evidence is what its source says.** (Lived proof, 2026-08-25, three lanes in one morning: a guard census counted comments and error prose and fell 18 → 17 → 16 under successive strips, with no strip able to say when it was done; a session-close fix was withdrawn because it tested for three artifacts when the missing thing was the act; and a `position(...)` test on a function's definition returned TRUE on two lines of comment. This does NOT retire the grep checks above — those prove a TEXT claim, which is what they are for.)

If the task touched a *set* of related files, check the **whole set**, not the one file you remember editing.

> **The six false-greens these catch.** A check can pass and still be lying. Watch for: (1) a replacement that's *present but wrong* — guard with the canonical-form grep; (2) an action that *finished into a document* instead of the live tool — guard with the landed-in-tool check; (3) an integration proved only by a *test we signed ourselves* — guard by demanding a real provider event; (4) a check that's green only because it ran in a *convenient proxy context* (an easy cwd, folder, or env) instead of where the code really launches — guard by running the check the way the artifact actually runs. (5) a **visual** proved by *reading its source instead of seeing it rendered* — every word correct and the typography wrong; guard with the look-at-it check. (6) a claim about what something **does**, proved by reading what its source **says** — a grep, a pattern match or a read of stored prose proves TEXT EXISTS and never proves BEHAVIOUR, and it silently counts comments, error strings and quoted examples as if they were the thing; guard by making the thing **fire** and reading what it did. Each looks green and isn't.

---

## Step 3 — Report the proof, then the claim

Tell the user what you checked and what it showed, in that order, briefly:

```
Checked: grepped all 5 files for "v1.1" → 0 found; "v1.2" present in all 5. ✓
Done: version bumped across the set.
```

If the check **fails** or surfaces a straggler, do **not** report done. Go to Step 4.

---

## Step 4 — Self-heal, then escalate (the loop)

A failed check is not the end of the job — it's the start of the loop. This is the **verification self-heal facet** of the Feedback Loop (Core §8): do → verify → if it failed, fix and re-verify, capped.

1. **Auto-fix** the specific thing the check caught — not a guess, the named straggler or miscount.
2. **Re-run the same check** from Step 2. If it now passes, report the proof (Step 3) and note that one fix was applied.
3. **Cap it at ~2 attempts.** If the check still fails after two tries, **stop** and hand it to the human with *what you tried* — "I attempted X and Y; here's what's still wrong" — never a silent loop and never a false "done."

Surface a caught miss plainly — an error caught and healed (or escalated with context) is the system working, not the system failing. Event-driven: this loop fires on the failed check, never on a timer.

---

## When NOT to use

Skip the formal check for pure conversation, opinions, or a single trivial answer where there is nothing to verify. The moment there is a concrete deliverable or a factual claim about what you did, prove it.

---

*History (v1.1–v1.7 provenance + adjudication sources) lives on the board — not in this always-loaded body (Context-Economy Law 3). Behavior above is current.*
