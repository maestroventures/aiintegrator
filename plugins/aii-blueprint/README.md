# AI Integrator Onboarding plugin

The installable unit a brand-new AI Integrator client puts on their own machine to stand up their
AIOS seat — install the plugin and sign in to its one Blueprint connector (the
company brain their Claude reads), and get the AI Integrator Blueprint skill set — with almost no
hand-holding.

**Say "patch me up" (or "set me up") in a fresh session to start.**

## What's inside

**The onboarding engine**
- `aii-patch-me-up` — the one front door that checks the user's own setup and gets them current. It
  reads the Blueprint connector and, through `what_can_i_do`, which tools are signed in and how each
  act is set, sorts every item into a plain bucket (live · off in this chat · needs a sign-in ·
  installed-but-unused · missing), and OFFERS the single fix for anything that isn't live — one item at a time, the user says yes or skip. It detects and offers; it never
  signs in or changes a setting on its own. Once every needed tool reads connected it hands off to `aii-tune-up`.

**The AI Integrator Blueprint skill set (bundled, client-ready/generic copies)**
- `aii-front-door` · `aii-clarify` · `aii-advisors` · `aii-prove-it` · `aii-safe-edit`
- `aii-knowledge-hygiene` · `aii-voice-capture` · `aii-betterment-slot` · `aii-session-handoff`

**The pipe**
- `.mcp.json` bundles **one connector — Blueprint** — the live company brain the client's Claude
  reads (the Initiatives Board, company + department profiles). It authenticates each seat by
  approved-email allow-list: the client signs in once on first board read, and it binds to their board.

## The setup order (what the walk follows)

A new seat comes up in this order — the walk and the Patch-Me-Up sweep both follow it:

1. **Add the plugin** — its one connector, Blueprint, arrives with it.
2. **Sign in to the Blueprint connector** — the live company brain. On first board
   read the user signs in once with their approved email; from then on their Claude reads the real
   board (their deals, initiatives, profiles), never sample data.
3. **Sign in the company's tools once in the Command Center** — Settings → Admin → Company tools
   (#settings/tools), and Google under Me → Connections (#settings/connections). Nothing else is
   installed; every action goes through `what_can_i_do` / `do_action` / `check_action`.

The proof the brain is real: at the first board read ("show me our deal board"), the seat returns the
user's actual deal names — not samples.

## Before you install (one prerequisite)

The plugin carries one connector: Blueprint. Every tool behind it is signed in once in the Command Center.

## Install

1. In Claude, open **Settings → Capabilities**.
2. **Add plugin** → install **AI Integrator Onboarding** (or open the private-marketplace link, which
   opens this screen for you).
3. Start a session, say **"patch me up"**, and follow the offers one at a time.

## Hosting status

- **The board brain is LIVE** at `https://www.aiintegratorhq.com/api/blueprint/mcp` (server
  "AI Integrator - Blueprint"). `.mcp.json` points at it. It reads the live company board and
  authenticates each seat by approved-email allow-list — the client signs in once on first board read.
- **The old June demo brain (`aios-mcp.vercel.app/api/mcp`) is no longer used by this plugin.** It was
  a hardcoded-sample test server; the plugin was repointed to the real board connector on 2026-07-20
  (T17·S5). Do not point `.mcp.json` back at it — that would connect a new seat to fake sample data.

## The tool punch-list

One connector: **Blueprint (bundled).** The tools behind it — CRM, email, calendar, files, transcripts —
are signed in once in the Command Center and read through `what_can_i_do`. Back-end pipes run server-side
and are **not** things the client connects through Claude.

## Known limit to name before go-live

Scheduled jobs (morning brief, board sweeps) only run when **that client's machine is awake with
Claude open** — missed fire-times are not caught up. Live/interactive work has no such limit.

---

*POC spec: `04 — Daily Operating System/specs/MCP-Onboarding-POC-SPEC-v0.1.md` (v0.2). Chris internal
pilot: `Chris-Employee-Onboarding-Walkthrough-SPEC-DRAFT.md`. Bundled skill bodies are the generic
deployable copies from `03 — AI Integrator BluePrint Framework/deployable-skills/`. The onboarding
engine is `aii-patch-me-up` (canonical, adopted 2026-07-14) — the retired `aii-kickoff` /
`aii-standup` skills were removed from this bundle on 2026-07-20 (T17·S6).*
