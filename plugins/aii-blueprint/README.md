# AI Integrator Onboarding plugin

The installable unit a brand-new AI Integrator client puts on their own machine to stand up their
AIOS seat — connect their tools, install and authenticate the live Blueprint board connector (the
company brain their Claude reads), and get the AI Integrator Blueprint skill set — with almost no
hand-holding.

**Say "patch me up" (or "set me up") in a fresh session to start.**

## What's inside

**The onboarding engine**
- `aii-patch-me-up` — the one front door that checks the user's own setup and gets them current. It
  reads the connector inventory, sorts every connector into a plain bucket (live · off in this chat ·
  needs a reconnect · installed-but-unused · missing), and OFFERS the single fix for anything that
  isn't live — one item at a time, the user says yes or skip. It detects and offers; it never
  connects or installs on its own. Once every connector is healthy it hands off to `aii-tune-up`.

**The AI Integrator Blueprint skill set (bundled, client-ready/generic copies)**
- `aii-front-door` · `aii-clarify` · `aii-advisors` · `aii-prove-it` · `aii-safe-edit`
- `aii-knowledge-hygiene` · `aii-voice-capture` · `aii-betterment-slot` · `aii-session-handoff`

**The pipe**
- `.mcp.json` bundles the **Blueprint board connector** — the live company brain the client's Claude
  reads (the Initiatives Board, company + department profiles). It authenticates each seat by
  approved-email allow-list: the client signs in once on first board read, and it binds to their board.

## The setup order (what the walk follows)

A new seat comes up in this order — the walk and the Patch-Me-Up sweep both follow it:

1. **Connect the Workspace connector and sign in** — the seat's identity (email/allow-list) rides on this.
2. **Install + authenticate the Blueprint board connector** — the live company brain. On first board
   read the user signs in once with their approved email; from then on their Claude reads the real
   board (their deals, initiatives, profiles), never sample data.
3. **Connect the remaining tools and confirm the skills** — Close (CRM), Gmail, Google Calendar,
   Google Drive/Sheets, Fireflies; optional/volume-only Instantly + MillionVerifier. Order among
   these does not matter; Patch-Me-Up walks whatever isn't live, one at a time.

The proof the brain is real: at the first board read ("show me our deal board"), the seat returns the
user's actual deal names — not samples.

## Before you install (one prerequisite)

The client's Claude account must be on **Pro**. The free tier allows exactly **one** custom
connector, and the AI Integrator stack needs several. Patch-Me-Up names this up front so it's never a
surprise.

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

## The connector punch-list (mirrors the VR stack)

Required for the loop: **Blueprint board connector (bundled), Close (CRM), Gmail, Google Calendar,
Google Drive/Sheets, Fireflies.** Optional / volume-only: **Instantly, MillionVerifier.** Back-end pipes (Lambda, S3,
Supabase, Vercel, Stripe) run server-side and are **not** things the client connects through Claude.

## Known limit to name before go-live

Scheduled jobs (morning brief, board sweeps) only run when **that client's machine is awake with
Claude open** — missed fire-times are not caught up. Live/interactive work has no such limit.

---

*POC spec: `04 — Daily Operating System/specs/MCP-Onboarding-POC-SPEC-v0.1.md` (v0.2). Chris internal
pilot: `Chris-Employee-Onboarding-Walkthrough-SPEC-DRAFT.md`. Bundled skill bodies are the generic
deployable copies from `03 — AI Integrator BluePrint Framework/deployable-skills/`. The onboarding
engine is `aii-patch-me-up` (canonical, adopted 2026-07-14) — the retired `aii-kickoff` /
`aii-standup` skills were removed from this bundle on 2026-07-20 (T17·S6).*
