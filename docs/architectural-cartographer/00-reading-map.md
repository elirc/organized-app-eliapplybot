# Reading Map

## Mental Model

Think of `eli apply mate` as a careful job-application assistant standing beside a form, not as an auto-submit bot: the popup collects an explicit user command, the content script inspects the current page, deterministic matchers compare field labels against a local candidate profile, only high-confidence mappings mutate controls, and the injected sidebar shows what happened (`src/popup/Popup.tsx:47-56`, `src/content/contentScript.ts:34-93`, `src/shared/fieldMatchers.ts:47-85`, `src/sidebar/renderSidebar.ts:59-65`).

## Top 10 Files To Read In Order

1. `manifest.json:1-24`
   Why now: it declares every Chrome extension context. Understand: popup, options page, background worker, content script, permissions. Explain after: why `<all_urls>` and `document_idle` make the content script widely available.

2. `package.json:7-14`
   Why now: it tells you how the project is run. Understand: `dev`, `typecheck`, `build`, `test`, and `serve:test`. Explain after: why `build` runs TypeScript before Vite and extension bundling.

3. `src/popup/Popup.tsx:9-77`
   Why now: this is the user command surface. Understand: local React state, the three action buttons, and active-tab messaging. Explain after: how a click becomes a `ContentRequest`.

4. `src/shared/messages.ts:3-20`
   Why now: messages are this app's route table. Understand: request and response unions. Explain after: how TypeScript restricts popup/content-script communication.

5. `src/content/contentScript.ts:14-93`
   Why now: this is the main coordinator. Understand: request handling, profile load, adapter selection, scan, map, fill, sidebar render. Explain after: why this file is backend-like in a serverless extension.

6. `src/content/scanner.ts:6-67`
   Why now: detection shapes the rest of the pipeline. Understand: grouped radio/checkbox handling and individual input/select/textarea handling. Explain after: why generated field ids matter.

7. `src/shared/fieldMatchers.ts:47-85`
   Why now: this is the safety gate. Understand: skip rules, matcher order, unknown fallback. Explain after: why matcher order changes behavior.

8. `src/content/filler.ts:12-37`
   Why now: this mutates the user's page. Understand: no file/submit/button filling, rollback snapshot, select matching, value setting, events. Explain after: what must be true before a field is changed.

9. `src/sidebar/renderSidebar.ts:6-68`
   Why now: this is the review experience. Understand: shadow DOM host, counts, clear/copy buttons, categorized sections. Explain after: what feedback the user gets after detection or autofill.

10. `src/shared/types.ts:39-70`
    Why now: these types connect scanning, mapping, filling, and UI. Understand: `DetectedField`, `FieldMapping`, and `FillResult`. Explain after: which fields are observations and which are decisions.

## Three Most Important Data Flows

1. Autofill command flow: popup button -> `run({ type: MessageTypes.Autofill })` -> active tab message -> content handler -> scan/map/fill/sidebar (`src/popup/Popup.tsx:47-56`, `src/popup/Popup.tsx:72-77`, `src/content/contentScript.ts:14-21`, `src/content/contentScript.ts:56-93`).

2. Profile persistence flow: options page loads profile -> validates edited JSON -> saves to Chrome local storage -> content script reads that profile before mapping (`src/options/Options.tsx:12-24`, `src/shared/storage.ts:7-17`, `src/content/contentScript.ts:34-37`).

3. Review flow: fill result is categorized into filled, skipped, unsure, and missing required -> sidebar renders counts and sections -> clear button calls rollback (`src/content/contentScript.ts:52-93`, `src/content/contentScript.ts:96-108`, `src/sidebar/renderSidebar.ts:32-65`, `src/content/filler.ts:39-57`).

## Pre-Reading Checklist

1. Can you explain what a Chrome extension content script is from `manifest.json:17-22`?
2. Can you list the npm scripts and what each script does from `package.json:7-14`?
3. Can you identify the two React entry points from `popup.html:8-10` and `options.html:8-10`?
4. Can you describe what data is stored locally from `src/shared/storage.ts:5-22`?
5. Can you name the four content requests from `src/shared/messages.ts:3-14`?
6. Can you explain why `shouldFill` is intentionally tiny from `src/shared/confidence.ts:3-5`?
7. Can you find where generated field ids are attached to DOM nodes from `src/content/scanner.ts:20-21` and `src/content/scanner.ts:46-47`?
8. Can you find where file and submit controls are blocked from filling from `src/content/filler.ts:21-24`?
9. Can you find where sensitive sidebar values are masked from `src/sidebar/renderSidebar.ts:137-140`?
10. Can you find the current unit-test coverage from `src/shared/fieldMatchers.test.ts:15-48`?

## Review Red Flags

1. A matcher change that returns `"high"` without a deterministic label or option check (`src/shared/fieldMatchers.ts:102-195`).
2. Any code path that clicks a button or submit control; current filler refuses those input types (`src/content/filler.ts:21-24`).
3. A change that bypasses `shouldFill`, which currently limits autofill to high-confidence mappings (`src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`).
4. Radio/checkbox grouping changes that ignore missing names or weak legends (`src/content/scanner.ts:10-37`, `src/content/scanner.ts:83-87`).
5. Storage changes that persist more personal data than the profile or report needs (`src/shared/storage.ts:5-22`).
6. Sidebar changes that render unescaped page or profile data; current rendering uses `escapeHtml` in mapping and missing sections (`src/sidebar/renderSidebar.ts:85-89`, `src/sidebar/renderSidebar.ts:111-114`, `src/sidebar/renderSidebar.ts:128-135`).
7. Adapter changes that make hostname matching overly broad before the generic fallback (`src/sites/index.ts:8-12`).
8. Profile schema changes without nested validation tests; current validator is shallow (`src/shared/profileSchema.ts:3-20`, `src/shared/fieldMatchers.test.ts:15-48`).
9. Filler changes that do not maintain rollback snapshots (`src/content/filler.ts:26-27`, `src/content/filler.ts:87-93`).
10. Feature changes that skip manual fake-page QA; the fake page covers contact, authorization, experience, education, EEO, skipped uploads, short answers, and submit button (`test-pages/fake-application.html:119-240`).

