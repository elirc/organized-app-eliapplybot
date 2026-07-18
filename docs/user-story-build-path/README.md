# User Story Build Path

This suite gives you ten real feature tickets for `eli apply mate`, a local Chrome extension for cautious job-application autofill (`README.md:1-15`, `manifest.json:1-24`). Use these stories as build practice, not as reading assignments.

Difficulty progression:

- Stories 1-3 are easy UI/profile-data edits touching one or two files.
- Stories 4-5 add UI that reads existing results and detected data.
- Stories 6-7 add a new message, state, or endpoint-equivalent in the Chrome message API (`src/shared/messages.ts:3-20`).
- Stories 8-9 touch frontend, content runtime, storage, and mapping behavior.
- Story 10 asks you to design an architectural improvement with caching and domain policy implications.

A story is done when every acceptance criterion is independently verifiable, TypeScript still passes through `npm run typecheck`, tests pass through `npm test`, production build passes through `npm run build`, and the fake application page has been manually checked when scanning or filling changes (`package.json:10-13`, `test-pages/fake-application.html:119-240`).

Use AI help without handing away the thinking. Model prompt:

```text
I'm working on Story X. I'm stuck on Y. Here is what I've tried: Z.
Don't give me the solution. Ask me questions that help me figure it out.
Please point me to the relevant files and line ranges, and make me explain my hypothesis before suggesting a next step.
```

The repo currently has no backend server, ORM/database, auth layer, React Router, or custom React hooks; the story plans use Chrome messages as the API layer, `chrome.storage.local` as persistence, and extension contexts as navigation (`src/shared/messages.ts:3-20`, `src/shared/storage.ts:5-22`, `manifest.json:6-23`).

