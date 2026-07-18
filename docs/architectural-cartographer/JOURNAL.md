# Architectural Cartographer Journal

## First-Pass Mental Model

The app is a cautious job-application autofill extension: the user clicks a popup button, the popup sends a typed message to the active tab, the content script scans form controls, maps fields to a local candidate profile, fills only high-confidence matches, and renders an injected review sidebar (`src/popup/Popup.tsx:13-29`, `src/content/contentScript.ts:34-93`, `src/sidebar/renderSidebar.ts:6-16`). The profile lives locally in Chrome storage and falls back to a sample profile if stored data is missing or invalid (`src/shared/storage.ts:7-13`, `src/shared/sampleProfile.ts:3-55`).

## Inspection Discoveries

This is a browser extension, not a client/server app: the extension manifest registers popup UI, options UI, a background service worker, and a content script (`manifest.json:6-23`). Build tooling is split: Vite builds popup/options HTML entries, and `scripts/build-extension.mjs` bundles the background and content scripts plus copies the manifest (`vite.config.ts:5-15`, `scripts/build-extension.mjs:10-32`).

The most important runtime file is `src/content/contentScript.ts` because it coordinates storage, adapter selection, scanning, matching, filling, rollback, and review rendering (`src/content/contentScript.ts:1-9`, `src/content/contentScript.ts:23-93`). The most important domain logic file is `src/shared/fieldMatchers.ts` because it decides whether a field should be filled, reviewed, skipped, or left unknown (`src/shared/fieldMatchers.ts:47-85`).

## Teaching Anchors Chosen

The top teaching anchors are `manifest.json`, `package.json`, `src/popup/Popup.tsx`, `src/content/contentScript.ts`, `src/content/scanner.ts`, `src/shared/fieldMatchers.ts`, `src/content/filler.ts`, `src/shared/types.ts`, `src/shared/storage.ts`, and `src/sidebar/renderSidebar.ts`. Together they cover app registration, scripts, UI intent, message routing, DOM scanning, deterministic mapping, DOM mutation, contracts, persistence, and feedback (`manifest.json:1-24`, `package.json:7-14`, `src/popup/Popup.tsx:40-68`, `src/content/contentScript.ts:23-93`, `src/content/scanner.ts:6-67`, `src/shared/fieldMatchers.ts:47-85`, `src/content/filler.ts:12-37`, `src/shared/types.ts:39-70`, `src/shared/storage.ts:7-22`, `src/sidebar/renderSidebar.ts:18-68`).

## Where A Junior Might Get Confused

A junior may expect routing or a backend controller, but Chrome extension contexts replace those concepts here: popup HTML mounts React through `src/popup/main.tsx`, options HTML mounts React through `src/options/main.tsx`, and content-script behavior is reached through messages rather than URLs (`popup.html:8-10`, `options.html:8-10`, `src/shared/messages.ts:3-20`, `src/content/contentScript.ts:14-21`).

A junior may also miss that `DetectedField.id` is not an existing page id; the scanner creates ids like `eam-field-0` and writes them onto DOM controls as `data-eli-apply-mate-field-id` (`src/content/scanner.ts:4-21`, `src/content/scanner.ts:46-47`).

## Where A Mid-Level Engineer Should Slow Down

Slow down around confidence boundaries. `shouldFill` only permits `"high"` (`src/shared/confidence.ts:3-5`), while `mapField` returns `"skip"` for buttons, file uploads, resumes, cover letters, and short-answer patterns (`src/shared/fieldMatchers.ts:55-65`). A small matcher change can turn review-only data into automatic DOM mutation through `fillField` (`src/content/contentScript.ts:66-72`, `src/content/filler.ts:12-37`).

Slow down around grouping. Radio and checkbox fields are grouped by input type, name, fieldset legend text, and form id (`src/content/scanner.ts:83-87`). That is simple and understandable, but it can merge unrelated groups when pages omit names and legends.

## Where A Senior Engineer Should Be Skeptical

The profile validator is shallow: it checks a few top-level values, arrays, and `experienceYears` object shape, but not nested education, experience, EEO, dates, or numeric values (`src/shared/profileSchema.ts:3-20`). The filler uses direct `.value` assignment, which may not update React-controlled page state in some applications (`src/content/filler.ts:96-98`). The site adapters currently only match hostnames and do not normalize ATS-specific field conventions (`src/sites/greenhouse.ts:3-6`, `src/sites/lever.ts:3-6`, `src/sites/workday.ts:3-6`, `src/sites/ashby.ts:3-6`).

## How To Use Checkpoints

Use each checkpoint as a tiny review simulation. A strong answer should name the relevant file and line range, explain the behavior, and state the risk or design intent. If your answer cannot point to code, reread the cited file until you can explain the control flow without notes.

