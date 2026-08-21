---
name: aii-voice-capture
description: >
  AI Integrator Blueprint: Voice Capture. Captures the user's writing voice at onboarding so every
  output sounds like them, not like generic AI. Use this during setup to request writing samples or
  point at a samples directory, then build a reusable voice profile (tone, rhythm, vocabulary, what
  to avoid). The profile is applied any time the system writes FOR the user — emails, posts, drafts,
  messages. The ability is universal; the resulting profile belongs to each user. Feeds the Content
  Library's "company voice" requirement.
---

# Voice Capture

Anything the system writes on the user's behalf should sound like the user — not like a polished
corporate stranger. This skill captures the user's voice once, as a reusable profile, and applies it
to every output written for them. It **feeds** the Content Library (Core Part 3), which requires a
defined voice.

---

## Step 1 — Gather samples at onboarding

Ask the user for real examples of their writing, in plain terms:

> "Send me 3–5 things you've actually written — emails, posts, a note to your team, anything that
> sounds like you. Or point me at a folder of your writing and I'll read it."

Take whatever they give: pasted samples, attached files, or a directory to read through. More is
better, but a few strong samples are enough to start. If they have nothing handy, capture the voice
by asking a couple of questions about how they like to come across and refine it from their edits over time.

---

## Step 2 — Build the voice profile

From the samples, distill a short, usable profile — not an essay. Capture:

- **Tone** — direct, warm, formal, playful, blunt?
- **Rhythm & length** — short punchy sentences vs. longer flowing ones; how much they say.
- **Vocabulary** — words and phrases they reach for; jargon they use or refuse.
- **Structure habits** — do they open cold or warm up? Bullets or prose? Sign-offs?
- **Avoid-list** — words, clichés, or a "corporate/AI" register they'd never use.

Write it as a compact reference the system can apply quickly, and store it as the user's voice profile.

---

## Step 3 — Apply it, and let it improve

Whenever you write **for** the user, apply the profile so the draft sounds like them. Then keep it
honest over time: when the user edits what you wrote, treat those edits as voice signal — update the
profile so it drifts toward them, not away. Route profile updates through **Safe Edit**
(`aii-safe-edit`) so the change is clean and versioned.

**Harvest where both halves are in hand.** An edit tells you *what* changed, not *why* it
sounded wrong. The richest refresh point is any moment the system holds **both a raw record of
the user speaking or writing unprompted AND the user's own read of that same moment** — a
reviewed transcript, a marked-up draft, a debriefed call. Harvest there: nowhere else are the
words and the intent available together.

**Three floors, so the profile cannot inflate** (Redman — provenance at the source):

- **No quote, no trait.** Every trait carries the user's **verbatim words** plus a pointer back
  to where they said them. A trait you cannot source is an impression, and impressions are
  exactly what this profile replaces.
- **One occasion, one vote.** If the user does the same thing six times in one sitting, that is
  **one** sighting. Otherwise a single talkative session manufactures a pattern that isn't one.
- **Only their own words count.** A line the user quoted, forwarded, or merely agreed with is
  someone else's voice, not theirs.

**Never store how strong a trait is** — a count, a score, a rank. Read it off the sightings
when asked. A stored one is a cached opinion that will eventually disagree with the very
evidence it came from. And when the profile is running on fewer sightings than it takes to call
something a pattern, **say so** rather than letting it read as settled.

---

## When NOT to use

Don't apply the user's personal voice to outputs that aren't theirs — a neutral report for a third
party, or a document that needs a different register. Voice Capture is for writing **as the user**,
not for everything the system ever produces.
