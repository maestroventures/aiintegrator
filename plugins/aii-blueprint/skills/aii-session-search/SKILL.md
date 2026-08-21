---
name: aii-session-search
description: >
  AI Integrator Blueprint: Session Search. Finds a past work session and hands the user a way back
  into it. Answers two things: where is the session where we did, decided, built, or told me
  something; and which legs of a track are done versus still going. Runs a full-text search over the
  distilled records the handoff writes — one small record per session — and returns each match with
  its title, date, a summary snippet, and the best route back the record supports. Status is read
  straight off the record, so what is done on a track comes from data, not memory. Fires on
  recall-shaped language: which session did we, where did you tell me to, find the chat where, did I
  update X a few sessions ago, which legs are done. Does NOT fire on a fresh forward-looking task
  with no look-back. Returns data; the surface renders it. Never stores raw transcripts; no semantic
  search.
---

# Session Search

## Step 0 — REACHABILITY. Run this before anything else, every time.

This skill needs something that is **not on every seat**. Before you read another line, find out
whether it is on THIS one, and if it is not, **say so plainly and stop.** A half-run is worse than
a refusal: it looks like the skill worked.

**The check.** Resolve capability **`initiatives-board` / `query_board`** BY CATEGORY per Core §11 rule 4 —
never by a connector name, never by a table name — and count the connectors that answer `CAN`:

```sql
SELECT count(*) AS live_connectors
  FROM capability c JOIN connector_capability cc ON cc.capability_id = c.id
 WHERE c.category = 'initiatives-board' AND c.action = 'query_board' AND cc.verdict = 'CAN'
```

**Then, and only then:**

- **One or more → carry on.** Say nothing about this check; a passing gate that announces itself is noise.
- **Zero, or the query errors → STOP and say exactly this, in your own plain words:**

  > I can't reach your session records on this seat, so I can't search them. Nothing is broken — there is just nothing here to look through yet.

  Then stop. Do not improvise a workaround, do not fall back to a different store, and do not do
  "the part that works." An empty search result and an unreachable store look identical to a reader, and only one of them means \"it isn't there.\"

**Why this block exists, stated so it does not get tidied away.** Until 2026-08-06 this skill was
kept OUT of the AI Integrator Blueprint plugin, on the grounds that a client would not have what it
needs. Bryce retired that test: *"Even if the user is never gonna use the AII adjudicate, doesn't
mean the user shouldn't have it."* **Non-use is not a reason to withhold.** A skill is withheld only
if it would MISLEAD or FAIL LOUDLY — **and that guard belongs INSIDE the skill, which is this block,
not in a packing list where the skill itself can never see it.** Card:
`neon_seven_builder_only_skills_reach_nobody_including_bryce_20260805`, step F.

---

The user runs many sessions on the same jobs, spread over weeks. Two things get lost:

1. **Which leg is done?** In a string of sessions on one job, it's not clear at a glance which legs
   finished and which one is still going.
2. **Where was the session where we did X?** Weeks later, there's no way back to "the chat where we
   decided / built / you told me X."

This skill answers both from **one source**: the distilled session record the handoff
(`aii-session-handoff`) writes at the end of every session — one small record per session (a title,
a status, an honest summary, keywords, the board cards it touched, and the best route back into the
real chat). Raw transcripts are never stored — only the handoff's own summary and a pointer back.

This skill is the **recall half**; the handoff is the **write half** — it creates the records this
skill reads. You find things in your AI *from within your AI*: you ask a question, this answers it.

---

## Core vs. adapter — the one line that keeps this portable

This skill's **core is engine-neutral**: take the user's recall-shaped ask, run a full-text query
over the session records, and **return structured DATA** — the matches, each with its summary and
the best locator that record has. The core never assumes a particular AI or a particular screen.

The **adapter** (one per AI engine — the operator's overlay names which one) owns two things only:
**how the skill gets triggered** and **how the results get shown**. Keep that line clean — the core
returns data; the surface renders it (Evans). Everything under "The core" is portable; everything
under "The adapter" is this-AI-only.

---

## When this fires — and when it does NOT

**Fires** on recall-shaped language — a look-back at past work:

- "which session did we / where did we…", "find the chat where…", "where did you tell me to…"
- "did I / did we update X a few sessions ago?", "which session said it was done but…"
- **status reads:** "which legs of the <track> track are done?", "what's done on <track>?",
  "where are we on <track>?"

**Does NOT fire** on a fresh, forward-looking task with no look-back ("build me X", "draft this").
A clean forward request is not a recall — don't turn one into a search.

---

## The core (engine-neutral) — classify, then query

Run the queries over the board Postgres store (the connector + tenant slot are named in the
overlay). The table is `session_log` — its shape, the write contract, and the full design live in
the Session-Log spec (`04 — Daily Operating System/specs/Session-Log-SPEC-DRAFT.md`); this body
does not restate the table (one fact, one file).

### Step 1 — Which of the two jobs is this?

- **Content search** — hunting for *a session by what happened in it* ("where we decided…", "the
  chat where we built…"). → Step 2A.
- **Track-status read** — the user names a *track/job* and wants its legs' status ("which legs of
  <track> are done?"). → Step 2B.

If it's genuinely both ("what did we do on <track> about connection resets?"), run 2A filtered to
the track's keyword, and also show the 2B status line for that track.

### Step 2A — Content search (full-text, ranked, with a highlighted snippet)

`$1` = the user's search words verbatim; `$2` = tenant; `$3` = row limit (default 6). Convert every
timestamp to the operator's local timezone (the overlay names it) — never surface a raw UTC time:

```sql
SELECT id, track_name, session_no, session_title, status,
       to_char(COALESCE(closed_at, started_at) AT TIME ZONE $4, 'Mon DD, YYYY') AS when_local,
       distilled_summary,
       ts_headline('english', distilled_summary,
                   websearch_to_tsquery('english', $1),
                   'MaxFragments=2, MinWords=6, MaxWords=20, StartSel=«, StopSel=»') AS snippet,
       getback_method, source_adapter, session_ref, session_id, session_url,
       keywords, initiative_ids,
       round(ts_rank(search_tsv, websearch_to_tsquery('english', $1))::numeric, 4) AS rank
FROM session_log
WHERE tenant_id = $2
  AND search_tsv @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC, COALESCE(closed_at, started_at) DESC
LIMIT $3;
```

`websearch_to_tsquery` accepts natural phrasing (quotes, `or`, `-word`) and is matched against the
GIN-indexed `search_tsv` generated column (summary + keywords + title) — fast, native, free.

**Degrade gracefully, never dead-end (Nygard).** If Step 2A returns **zero** rows, do NOT report
"nothing found" yet. Loosen once: re-run OR-joined, then if still empty fall back to a loose
`ILIKE` scan over `distilled_summary` / `session_title` / `keywords` before giving up. Only after
both come back empty do you say nothing matched — and say what you searched for, so the user can
rephrase.

### Step 2B — Track-status read (which legs are done)

`$1` = a track-name pattern (`'%'||word||'%'`); `$2` = tenant. Status is read straight off the
`status` column — never inferred:

```sql
SELECT session_no, session_title, status,
       to_char(COALESCE(closed_at, started_at) AT TIME ZONE $3, 'Mon DD, YYYY') AS when_local,
       getback_method, session_ref, session_url
FROM session_log
WHERE tenant_id = $2 AND track_name ILIKE $1
ORDER BY session_no ASC;
```

`status` is one of two values by design — `active` (running) or `done` (wrapped). That's a
session's whole story; the richer board states describe work items, not sessions.

**The core stops here.** It hands back the rows as data. It does not draw a card, a message, or a
screen — that's the adapter's job.

---

## The adapter (this-AI-only) — trigger + render

### Trigger

Whatever fires skills on this engine detects the recall-shaped language under "When this fires" and
runs the skill — the user never has to name it. (On one AI this is an always-on prompt-triage front
door; on another a slash-command or a function-call route. That routing is the only part that
changes between engines — the overlay names it.)

### Render — tier-aware (lead with what actually gets the user back)

Each record carries a `getback_method` telling you the best route back it supports. **Build every
record to the tier-3 floor; tiers 2 and 1 are upgrades an adapter adds only when its AI supports
them** (Nygard — design to the guaranteed floor, never a borrowed capability):

- **Tier 3 — `ref` (universal floor, every engine):** the summary **is** the answer, plus
  `session_ref` (exact title + date) so the user can find the chat by hand.
- **Tier 2 — `link`:** lead with the summary snippet, then a **one-click reopen link** built from
  `session_url` (or paste the id). Use only if the adapter has verified its engine can capture and
  reopen a session id/url.
- **Tier 1 — `recall`:** the adapter can re-pull the real transcript and **quote the exact line
  back** with no reopening. Use only where the engine exposes a transcript-read tool.

Whichever tier a row supports, **lead with what gets the user back**: on a tier-3 row the stored
summary carries the whole weight, so it must be self-sufficient. Show 🟢 for `done`, 🟡 for
`active`; keep the snippet to the highlighted fragment, don't dump the whole summary; if several
match, list them top-ranked first — never silently show only one when more matched. For a
track-status read (Step 2B), render the legs in order as a short status list so "which is done" is
answerable at a glance.

---

## Guardrails

- **One fact, one file.** A session's status is read from the `status` column and nowhere else.
  Never restate a session's status from memory, a chat title, or a README — read the record.
- **Raw transcripts are never stored or searched.** This searches the distilled summary + keywords
  + title only — the privacy floor by design. Don't try to reconstruct or fetch a raw chat.
- **Do NOT build semantic/embedding search (pgvector).** Full-text answers the real need here;
  embeddings are real infrastructure for little gain. That's a later, separate decision — not this
  skill's job.

---

## When NOT to use

Skip this for any forward-looking task with no look-back — building, drafting, or answering a fresh
question. It's a recall tool. If there's no "where / which / did we already" in the ask, it stays
out of the way.

---

*v1.0 — 2026-07-14: authored as the 15th `aii-` deployable body (the read half of the session log).
Promoted from the personal copy `00/personal-skills/aii-session-search.personal.md`; the
Claude/Cowork trigger + render specifics and the connector/tenant/timezone IDs stay in that overlay
(instance-ID-free master, per blueprint-skills §7). **Enforces** the Session-Log write/read contract
designed in `04/specs/Session-Log-SPEC-DRAFT.md` (Evans portable-core / anti-corruption layer,
Nygard tier-3 floor, Redman distill-at-source, Goldratt one-record-two-pains) — it does not restate
the spec, it carries out the read half. Pairs with `aii-session-handoff` (the write half). Adopted
via `aii-adjudicate` (grepped 03 ABSENT — distinct from `aii-chat-history-search`, which searches a
local chat export, not the handoff-written records; four-test + one-fact-one-file passed). Bryce
pop-up-approved 2026-07-14. Personal copy already live; the generic master now inherits to every
client.*
