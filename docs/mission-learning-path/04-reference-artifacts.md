# Mission 25: Write the Docs That Don't Exist

## Doc 1: Junior Onboarding Checklist

- Run `npm install`, `npm run typecheck`, `npm test`, and `npm run build` using scripts from `package.json:7-14`.
- Load `dist` as an unpacked Chrome extension after build because the build script creates extension assets and copies the manifest (`scripts/build-extension.mjs:10-32`).
- Serve the fake application page with `npm run serve:test` because the script targets `test-pages` on port 5174 (`package.json:13`, `test-pages/fake-application.html:1-6`).
- First PR checklist: no submit clicking (`src/content/filler.ts:21-24`), no medium-confidence autofill (`src/shared/confidence.ts:3-5`), tests updated (`src/shared/fieldMatchers.test.ts:15-48`), fake page checked (`test-pages/fake-application.html:119-240`).

## Doc 2: Architecture Guide For New Engineers

Navigate by runtime context: popup command UI (`src/popup/Popup.tsx:40-68`), options profile editor (`src/options/Options.tsx:38-67`), content script coordinator (`src/content/contentScript.ts:14-93`), shared contracts/rules (`src/shared/types.ts:1-125`, `src/shared/fieldMatchers.ts:47-85`), injected sidebar (`src/sidebar/renderSidebar.ts:6-68`), and site adapters (`src/sites/index.ts:8-12`).

## Doc 3: Code Review Checklist

- Contract changed? Inspect `src/shared/messages.ts:3-20` and consumers in `src/popup/Popup.tsx:20-29`.
- Matcher changed? Inspect confidence and skip behavior in `src/shared/fieldMatchers.ts:47-85`.
- DOM scan changed? Inspect visibility and grouping in `src/content/scanner.ts:10-99`.
- Fill changed? Inspect blocked controls, snapshots, event dispatch, rollback (`src/content/filler.ts:21-57`, `src/content/filler.ts:96-103`).
- Data changed? Inspect validation and storage (`src/shared/profileSchema.ts:3-20`, `src/shared/storage.ts:5-22`).

## Doc 4: Debugging Playbook

Popup error: start at active-tab query and `chrome.tabs.sendMessage` (`src/popup/Popup.tsx:72-77`). Detection wrong: inspect label extraction and scanner output (`src/content/domLabels.ts:1-58`, `src/content/scanner.ts:6-67`). Fill skipped: inspect matcher confidence and high-only gate (`src/shared/fieldMatchers.ts:47-85`, `src/shared/confidence.ts:3-5`). Clear broken: inspect rollback entries (`src/content/filler.ts:39-57`). Sidebar missing: inspect `renderSidebar` host creation and append (`src/sidebar/renderSidebar.ts:6-16`).

## Doc 5: Change Playbook

Branch, write a failing test when behavior is risky, change the narrowest file, run typecheck/test/build, then manually verify fake-page behavior. For a field-matching change, start in `src/shared/types.ts:3-30`, update `src/shared/fieldMatchers.ts:47-85`, add tests in `src/shared/fieldMatchers.test.ts:15-48`, and verify fixtures in `test-pages/fake-application.html:119-240`.

## Doc 6: Senior Ownership Notes

Monitor confidence discipline (`src/shared/confidence.ts:3-5`), profile validation (`src/shared/profileSchema.ts:3-20`), all-URL permission risk (`manifest.json:16-22`), clipboard data exposure (`src/sidebar/renderSidebar.ts:53-57`), grouping correctness (`src/content/scanner.ts:83-87`), and adapter maturity (`src/sites/greenhouse.ts:3-6`, `src/sites/lever.ts:3-6`).

## Doc 7: Interview Walkthrough

Practice answer: "I worked on a local Chrome extension that helps fill repeated job application fields. Chrome loads popup, options, service worker, and content script contexts through the manifest (`manifest.json:6-23`). The popup sends typed commands to the active tab (`src/popup/Popup.tsx:72-77`). The content script loads local profile data, scans fields, maps them deterministically, fills only high-confidence matches, and renders a review sidebar (`src/content/contentScript.ts:34-93`, `src/sidebar/renderSidebar.ts:6-68`). The safety boundary is high-confidence only, with uploads, submits, and long-form job answers skipped (`src/shared/confidence.ts:3-5`, `src/shared/fieldMatchers.ts:55-65`, `src/content/filler.ts:21-24`)."

