---
name: aii-chat-history-search
description: >
  AI Integrator Blueprint: Chat-History Search. Turns the user's own AI chat export (Claude,
  ChatGPT, or a generic JSONL) into a searchable local knowledge base — SQLite + FTS5 — and
  distills a reusable operator "thinking profile" from their strongest threads. Use whenever the
  user wants to find something they discussed before ("did we ever talk about…", "find where I
  decided…", "what did I say about pricing objections"), stand up a searchable archive of their
  history, or capture how they think from past work. Everything stays on the user's machine and
  off the AI — the export is never uploaded. Fires the run-command skill for the one local build
  step; never asks the user to paste a command.
---

# Chat-History Search

Every operator carries years of AI chat history — decisions made, wording that landed, problems
already solved. It sits in an export file no one can search. This skill makes it a **local,
searchable knowledge base**, and pulls a **thinking profile** from the best of it — without a byte
ever leaving the user's machine.

Two jobs, one skill:

1. **Search** — full-text search across the whole history, plus dump any thread verbatim.
2. **Profile** — distill *how the user thinks* from their strongest threads, as a reusable asset.

---

## Privacy is the design, not a footnote (Schneier)

The export can hold anything the user ever typed. So the rule is absolute: **the export and the
database stay on the user's own machine and are never routed through the AI session.** The AI
drives the *tooling* (writes the build command, composes the search queries, reads back the
results the user shares); the *data* stays local. This is the same "credential capture stays local
and off the AI" discipline (Core, Self-Install Standard rule #6) applied to chat history. If a step
would require uploading the raw export, that step is wrong — rewrite it to run locally.

---

## Step 1 — Get the export

Point the user to their platform's export:
- **Claude** → Settings → Account → *Export data* → `conversations.json`
- **ChatGPT** → Settings → Data controls → *Export* → `conversations.json`
- **Anything else** → a JSONL file, one object per line: `{conversation_id, title, role, text, created_at}`

The skill ships two scripts (its package): `scripts/build_index.py` and `scripts/query.py`.

---

## Step 2 — Build the index (a local step → route through `aii-run-command`)

Building the database runs **on the user's machine**, because that's where the export lives and
must stay. This is exactly a run-command case, so hand it off the sanctioned way: **`aii-run-command`
builds one double-click file** that runs

```
python3 scripts/build_index.py --export <their conversations.json> --db chat_history.db
```

— never a pasted command. The file prints a big `✅ DONE` with the indexed count, or an exact
`❌ ERROR`. The builder **fails loud**: an export it can't recognize, or one that yields zero
messages, stops with a named error — it never reports success on an empty index (Nygard).

Auto-detects Claude and ChatGPT exports; use `--format jsonl` for the generic shape. Re-running
rebuilds cleanly (idempotent).

---

## Step 3 — Search and dump

Once `chat_history.db` exists, all reads are local and instant:

```
python3 scripts/query.py --db chat_history.db search "pricing AND objection"
python3 scripts/query.py --db chat_history.db search "\"blended cost\""     # exact phrase
python3 scripts/query.py --db chat_history.db thread <conversation_id>       # dump a whole thread
python3 scripts/query.py --db chat_history.db list                           # biggest threads
python3 scripts/query.py --db chat_history.db stats                          # shape check
```

Query syntax is SQLite FTS5: bare words, `"quoted phrases"`, `AND`/`OR`/`NOT`, and `prefix*`.
`search` returns ranked snippets with the conversation title, role, and id; `thread` prints the
matching conversation verbatim so the user can lift the exact wording that worked — the **gold-thread
pull**.

When the user asks *"where did I…"* or *"find where we decided…"*, translate their question into an
FTS query, run search, then dump the winning thread. The user shares back only the snippet or thread
they want to act on — the full archive never has to move.

---

## Step 4 — The thinking profile (the distilled operator asset)

Search finds a *fact*; the profile captures a *pattern* — how this operator reasons, decides, and
writes, drawn from their own strongest threads. Build it once, reuse it anywhere the system writes
*for* the user (it complements `aii-voice-capture`: voice is *how they sound*, the thinking profile
is *how they decide*).

Method:

1. **Find the gold threads.** Use `list` and targeted `search` to surface the conversations where
   the user did real thinking — decisions, reversals, hard trade-offs, wording they reused. Quantity
   is not the signal; density of judgment is.
2. **Pull verbatim extracts.** `thread` each one and lift the *exact* lines where the reasoning
   shows — not a paraphrase. Verbatim is the point: the profile is evidence, not a summary.
3. **Distill the profile.** From those extracts, write a short `thinking-profile.md`: recurring
   decision heuristics, what they consistently push back on, how they frame a problem, their
   defaults and their vetoes. Cite the source thread for each claim (one fact, one source — Redman)
   so the profile is auditable back to the user's own words, never invented.
4. **Keep it local, keep it living.** The profile lives with the user's files; re-run against a
   fresh export as their history grows.

---

## When NOT to use

Skip it for history the user can recall unaided, or when no export exists yet (offer Step 1 first).
Never upload the raw export to work around a local step — that violates the privacy spine above; if
a local run isn't possible, say so plainly rather than routing the data through the session.
