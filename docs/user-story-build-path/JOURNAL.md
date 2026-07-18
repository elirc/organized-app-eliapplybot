# User Story Build Path Journal

## Story Design Rationale

The stories follow the project's real growth path: start with safe popup copy and sample data, then move into fake-page fixtures, message-contract changes, safe report shaping, storage, profile validation, adapter normalization, and finally domain policy plus scan caching. This order mirrors the actual system path from popup commands to content-script behavior and review output (`src/popup/Popup.tsx:47-77`, `src/shared/messages.ts:3-20`, `src/content/contentScript.ts:34-93`, `src/sidebar/renderSidebar.ts:6-68`).

## Why These Code Paths Were Chosen

The build tickets are anchored on the extension's highest-value product flow: "Autofill current page." That flow crosses UI, message contracts, profile storage, adapter selection, DOM scanning, matching, filling, rollback, and sidebar review (`src/popup/Popup.tsx:47-77`, `src/shared/storage.ts:7-22`, `src/sites/index.ts:8-12`, `src/content/scanner.ts:6-67`, `src/shared/fieldMatchers.ts:47-85`, `src/content/filler.ts:12-57`, `src/sidebar/renderSidebar.ts:32-65`).

## Skill Progression

Stories 1-3 build confidence with low-risk edits: popup JSX, sample profile data, and fake-page HTML (`src/popup/Popup.tsx:47-56`, `src/shared/sampleProfile.ts:47-54`, `test-pages/fake-application.html:156-165`). Stories 4-7 teach message-contract and state ownership through `ShowLastResult`, Detect response shaping, safe report creation, and report persistence (`src/shared/messages.ts:3-20`, `src/content/contentScript.ts:29-50`, `src/content/contentScript.ts:84-93`). Stories 8-10 require senior judgment around runtime validation, ATS adapters, all-URL permission risk, storage design, and cache invalidation (`src/shared/profileSchema.ts:3-20`, `src/sites/greenhouse.ts:3-6`, `src/sites/lever.ts:3-6`, `manifest.json:16-22`, `src/shared/storage.ts:5-22`).

## What A Senior Engineer Would Watch

A senior reviewer would watch the high-confidence safety gate before approving any story that changes matching or filling (`src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`). They would also watch for raw application data leaking through debug/report output because the scanner records `valueBefore` and the current copy button serializes detected fields (`src/content/scanner.ts:35`, `src/content/scanner.ts:62`, `src/sidebar/renderSidebar.ts:53-57`). They would insist on tests before changing profile validation or adapter normalization because current tests cover only basic matchers (`src/shared/fieldMatchers.test.ts:15-48`).

## Gaps That Shape The Ticket Backlog

There is no backend, database, ORM, auth layer, router, or custom hook system in the project; stories therefore use Chrome local storage, Chrome message contracts, manifest contexts, and direct React state as the relevant implementation surfaces (`package.json:15-31`, `src/shared/storage.ts:5-22`, `src/shared/messages.ts:3-20`, `manifest.json:6-23`, `src/popup/Popup.tsx:9-11`, `src/options/Options.tsx:7-14`). The most important gaps for future ownership are shallow profile validation, direct value assignment for controlled inputs, hostname-only site adapters, and limited test coverage (`src/shared/profileSchema.ts:3-20`, `src/content/filler.ts:96-103`, `src/sites/index.ts:8-12`, `src/shared/fieldMatchers.test.ts:15-48`).

