---
name: aii-safe-edit
description: >
  AI Integrator Blueprint: Safe Edit. Edits a related set of knowledge/reference files as one
  clean batch — never half-updated. Use this skill whenever you change anything in a set of linked
  files (preferences, project files, a skill set, a documentation set, templates): it regenerates
  the whole affected set together, bumps the version only on what actually changed, and ships a
  changed-vs-unchanged manifest so nothing drifts. Trigger it on any edit, rename, or move inside a
  managed file set, especially when "one fact lives in one file" must be preserved. Pairs with
  Prove It, which verifies the batch before you call it done.
---

# Safe Edit

You are editing a file that belongs to a **set** of related files. The danger is a half-updated
set: you change one file, a fact it shares with three others goes stale, and the set now
contradicts itself. This skill makes every edit a clean batch.

It **enforces** Core §5.2 (stable IDs + versions on every element) — it does not restate that rule,
it carries it out. It also protects the standing convention that **one fact lives in exactly one
file**: never duplicate a fact across files; if two files need it, one owns it and the other links.

---

## Step 1 — Map the set before you touch anything

Identify every file the change touches. A "set" is any group that shares facts, version numbers,
naming, or cross-references — a preferences bundle, a project's file group, a skill family, a
template collection. Ask: *if I change this value here, where else does it live or get referenced?*

If the same fact appears in more than one file, stop — that's a duplication bug. Decide which file
**owns** the fact; the others should link to it, not copy it.

---

## Step 2 — Make the change as a batch, not a one-off

Apply the change everywhere it belongs in the set in one pass. For each file decide: **changed** or
**unchanged** — and be honest about which. Do not leave a sibling file pointing at the old value.

**Version discipline (Core §5.2):** bump the version stamp **only on the files that actually
changed.** An unchanged file keeps its version. Never blanket-bump the whole set "to be safe" — the
version is a truth signal about what moved.

---

## Step 3 — Ship a changed-vs-unchanged manifest

Produce a short manifest the user can scan. It lists every file in the set and its status:

```
_MANIFEST — [set name] — [date]
CHANGED:
  - file-a.md   v1.2 → v1.3   (updated [what])
  - file-b.md   v1.0 → v1.1   (updated [what])
UNCHANGED (verified still correct):
  - file-c.md   v2.0
  - file-d.md   v1.4
```

A manifest line is a **claim**, not proof — hand off to **Prove It** (`aii-prove-it`): grep the whole
set for the OLD value(s) and confirm zero stragglers before reporting the batch complete.

**Skill-body ship gate.** When the set being shipped is a skill body (a `deployable-skills/*` master
or a personal copy pasted into a platform), count its composed frontmatter `description` and **fail
loud if it hits the platform cap** — look the cap up per target platform from the Tool-Capability DB
(the rule + why: `blueprint-skills.md` §1); a skill targeting several platforms gates on the
**lowest**. If the target's cap isn't recorded yet, read that vendor's docs and add the TCD row
before shipping — never assume. Trim under cap first; never ship an over-cap description (it silently
blocks Save).

**Spec-set clause (the 🗂 SPEC GATE, write side).** When the
set being edited includes a governing spec/standard file (one the instance's **spec registry**
governs), one slice = one canonical spec: **UPDATE the governing spec in place — never spawn a rival
file**, and in the **same batch flip that spec's registry row** so the map never drifts from the file
(an edit updates the row's `source_path`/timestamp; a retire sets the row superseded **and** moves the
file to an archive; a brand-new spec inserts its row). The registry write is part of the batch, not an
afterthought — a file changed without its row updated is a half-updated set. Prove It then confirms the
row matches the file before "done."

---

## Locked-folder rule — always enforce

Some folders are designated **locked** (live delivery assets the user does not want changed
silently). Before ANY edit, move, rename, or creation inside a locked folder, stop and ask the user
in a pop-up first: (1) exactly what's changing, (2) why, (3) what it could break downstream. Do not
proceed without their go-ahead. This is stricter than a normal batch edit and overrides it.

---

## When NOT to use

Skip the batch machinery for a standalone file that shares nothing with others, or for scratch/work
files. The moment an edit touches a *set* of linked files, run the full batch.

---

*Change history (dated `v1.x` entries) lives on the board — framework cards + `aii-adjudicate` rulings — per Context-Economy Law 3 (`Context-Economy-Standard-SPEC-DRAFT` §Law 3; Core §5.8/§5.20). Both entries' behavior is in Step 3 above (skill-body ship gate + Spec-set clause).*
