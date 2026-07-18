# Reference Suite

## Doc 1: Junior Onboarding Guide

Start with `manifest.json:1-24` to understand the extension contexts, then `package.json:7-14` for commands. Mount points are `popup.html:8-10` and `options.html:8-10`; React roots live at `src/popup/main.tsx:1-10` and `src/options/main.tsx:1-10`. The fake page is the safest manual target and includes contact, authorization, experience, education, EEO, skipped uploads, short answer, and submit controls (`test-pages/fake-application.html:119-240`).

Day-one runbook: `npm install`, `npm run typecheck`, `npm test`, `npm run build`, then load `dist` in Chrome. These commands are supported by scripts in `package.json:7-14`; the extension bundle step is implemented in `scripts/build-extension.mjs:10-32`.

## Doc 2: Mid-Level Architecture Guide

The architecture is a local extension pipeline. UI commands originate in the popup (`src/popup/Popup.tsx:47-56`), messages travel through `chrome.tabs.sendMessage` (`src/popup/Popup.tsx:72-77`), and the content script handles them (`src/content/contentScript.ts:14-21`). The core pipeline is load profile, choose adapter, scan, map, fill, render (`src/content/contentScript.ts:34-93`).

The data contracts are `DetectedField`, `FieldMapping`, and `FillResult` (`src/shared/types.ts:39-70`). `DetectedField` is page evidence, `FieldMapping` is the decision, and `FillResult` is user-facing accountability.

## Doc 3: Senior Ownership Guide

Protect the safety boundary first. Automatic filling only happens when `shouldFill` returns true for `"high"` (`src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`). Matchers skip buttons, file uploads, resumes, cover letters, and job-specific long answers (`src/shared/fieldMatchers.ts:55-65`). Filler additionally refuses file, submit, button, reset, and image inputs (`src/content/filler.ts:21-24`).

Top debt: shallow profile validation (`src/shared/profileSchema.ts:3-20`), direct value assignment (`src/content/filler.ts:96-98`), hostname-only adapters (`src/sites/greenhouse.ts:3-6`, `src/sites/lever.ts:3-6`), and limited tests (`src/shared/fieldMatchers.test.ts:15-48`).

## Doc 4: Code Review Guide

Review in this order:

1. Safety: confirm no new path clicks submit-like controls or fills non-high mappings (`src/content/filler.ts:21-24`, `src/shared/confidence.ts:3-5`).
2. Contracts: confirm request/response types still match popup and content handling (`src/shared/messages.ts:3-20`, `src/popup/Popup.tsx:20-29`).
3. Mapping: inspect matcher order and confidence decisions (`src/shared/fieldMatchers.ts:47-85`).
4. DOM behavior: inspect generated ids, grouping, visibility, and mutation (`src/content/scanner.ts:6-99`, `src/content/filler.ts:12-37`).
5. Privacy: inspect storage and clipboard paths (`src/shared/storage.ts:5-22`, `src/sidebar/renderSidebar.ts:53-57`).
6. Tests: require matcher, validator, scanner, or filler tests depending on changed behavior (`src/shared/fieldMatchers.test.ts:15-48`).

## Doc 5: Debugging Guide

If the popup says it cannot reach the page, inspect active-tab messaging (`src/popup/Popup.tsx:72-77`) and remember content scripts are registered for all URLs at `document_idle` (`manifest.json:17-22`). If fields are detected but not filled, inspect mapping confidence (`src/shared/fieldMatchers.ts:47-85`) and the high-only gate (`src/content/contentScript.ts:66-72`). If select/radio values do not fill, inspect option matching (`src/content/filler.ts:59-84`). If Clear does not work, inspect rollback snapshots and whether the element remains in the document (`src/content/filler.ts:39-57`, `src/content/filler.ts:87-93`).

## Doc 6: Change Playbook

To add a new field kind: update `FieldKind` (`src/shared/types.ts:3-30`), add source data to `CandidateProfile` if needed (`src/shared/types.ts:72-117`), strengthen sample data (`src/shared/sampleProfile.ts:3-55`), add matcher logic (`src/shared/fieldMatchers.ts:102-246`), add tests (`src/shared/fieldMatchers.test.ts:15-48`), then verify on the fake page (`test-pages/fake-application.html:119-240`).

To add a site adapter behavior: update the adapter to use `normalizeField` from `SiteAdapter` (`src/shared/types.ts:121-125`), keep adapter selection order in mind (`src/sites/index.ts:8-12`), and avoid making generic matching broader unless tests prove it is safe.

## Doc 7: Interview Walkthrough

A concise explanation: "`eli apply mate` is a local Chrome extension for cautious job application autofill. The manifest registers popup, options, service worker, and content script contexts (`manifest.json:6-23`). The popup sends typed messages to the active tab (`src/popup/Popup.tsx:72-77`). The content script loads a local profile, scans the form, maps fields deterministically, fills only high-confidence values, and renders a shadow-DOM review panel (`src/content/contentScript.ts:34-93`, `src/sidebar/renderSidebar.ts:6-16`). The product avoids submitting applications by skipping buttons and file-upload style controls (`src/shared/fieldMatchers.ts:55-65`, `src/content/filler.ts:21-24`)."

