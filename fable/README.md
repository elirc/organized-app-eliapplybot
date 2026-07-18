# Fable Code Review — eli apply mate

Review date: 2026-07-03 · Reviewed by: Claude (Fable 5) · Scope: full codebase at `v0.1.0`

This folder documents a full read-through of the extension source: architecture notes,
concrete findings (bugs and risks, each with file/line references), and suggested
improvements ordered by value.

## Contents

| File | What's in it |
| --- | --- |
| [01-codebase-overview.md](./01-codebase-overview.md) | How the extension is put together — data flow, module map, design strengths |
| [02-findings.md](./02-findings.md) | Bugs, correctness risks, and privacy notes found during review |
| [03-improvements.md](./03-improvements.md) | Suggested improvements, prioritized |

## TL;DR

The codebase is small (~1,200 lines of TypeScript), deterministic, and genuinely cautious —
the "never submit, review first, local only" promises in the README are honored by the code.
Types are clean, module boundaries are sensible, and the escape-hatch behaviors (rollback,
review sidebar, confidence gating) are real, not decorative.

The most important findings:

1. **Shallow profile validation can crash the matcher** — `validateCandidateProfile` never
   checks inside the `education`/`experience` arrays, so a hand-edited profile with a
   malformed entry throws inside `formatDate` during autofill (findings #1).
2. **Rollback entries are recorded for selects that were never changed**, inflating the
   "Cleared N" count and re-dispatching events on untouched fields (findings #2).
3. **Years-of-experience skill matching uses substring `includes`**, so a saved skill
   `java` would match a "years of JavaScript" question with high confidence (findings #3).
4. **`<all_urls>` content-script injection contradicts the extension's own privacy story** —
   `activeTab` + on-click injection would fit the "explicit click" model better
   (improvements #1).
