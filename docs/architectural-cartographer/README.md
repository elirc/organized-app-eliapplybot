# Architectural Cartographer

This suite is a top-down onboarding map for `eli apply mate`, a local Chrome Extension Manifest V3 project whose manifest declares a popup, options page, background service worker, content script, `activeTab` and `storage` permissions, and all-URL content-script matching (`manifest.json:1-24`). The repo uses npm scripts for Vite dev/build, TypeScript checking, Vitest tests, and a fake local application page (`package.json:7-14`).

Use this suite in order:

1. `00-reading-map.md` gives the first mental model and the files to read.
2. `01-junior-engineer.md` teaches setup, folders, entry points, components, and beginner TypeScript.
3. `02-mid-level-engineer.md` traces the system end to end and teaches contracts, state, and diff reading.
4. `03-senior-engineer.md` critiques the system, audits risk, and proposes ownership work.
5. `04-reference-suite.md` is the permanent architecture reference set.

For checkpoints, answer before reading the self-grade notes. Then compare your answer against the rubric immediately. This mirrors how a reviewer works: form a hypothesis, test it against code, and tighten the model.

This suite treats the content script as the backend-like runtime because there is no HTTP server, database, or ORM in the project files; persistence is Chrome local storage through `chrome.storage.local` (`src/shared/storage.ts:5-22`), and cross-context communication uses Chrome runtime messages (`src/shared/messages.ts:3-20`, `src/content/contentScript.ts:14-21`).

