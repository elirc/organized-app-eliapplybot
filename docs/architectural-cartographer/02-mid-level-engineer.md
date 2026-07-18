# Mid-Level Engineer Guide

## Architecture Diagram

```text
Chrome extension shell
  manifest.json: popup, options, service worker, content script, permissions (manifest.json:6-23)

User click
  src/popup/Popup.tsx:47-56
    -> chrome.tabs.sendMessage to active tab (src/popup/Popup.tsx:72-77)
      -> src/content/contentScript.ts message listener (src/content/contentScript.ts:14-21)
        -> get local profile (src/shared/storage.ts:7-13)
        -> choose site adapter (src/sites/index.ts:10-12)
        -> scan DOM fields (src/content/scanner.ts:6-67)
        -> map fields to profile values (src/shared/fieldMatchers.ts:43-85)
        -> fill high-confidence fields (src/content/contentScript.ts:66-72)
        -> render review sidebar (src/sidebar/renderSidebar.ts:6-16)
```

## TypeScript Type System Deep Dive

`ContentRequest` is a discriminated union whose `type` can only be one of four message constants (`src/shared/messages.ts:3-14`). `ContentResponse` is a union where success may return a `FillResult`, detected fields, or a clear count, while failure returns an error string (`src/shared/messages.ts:16-20`). The popup narrows response behavior using property checks like `"result" in response` and `"detected" in response` (`src/popup/Popup.tsx:20-29`).

`FieldKind` is the domain vocabulary for what a form control can mean, including personal, authorization, EEO, education, experience, years-of-experience, and unknown kinds (`src/shared/types.ts:3-30`). `CandidateProfile` is the local source of truth used by matchers, and its shape mirrors the kinds that can be filled (`src/shared/types.ts:72-117`).

## State Management Deep Dive

There is no Redux, Zustand, React Query, custom hook, or global frontend state store in the repo; state is local React state in popup/options and local module state in the content script (`src/popup/Popup.tsx:9-11`, `src/options/Options.tsx:7-10`, `src/content/contentScript.ts:11-12`). The important piece of runtime state is `rollbackEntries`, because it captures DOM before-values that must survive between Autofill and Clear messages inside the same content-script instance (`src/content/contentScript.ts:11`, `src/content/filler.ts:26-27`, `src/content/filler.ts:39-57`).

## API Contract Map

There is no HTTP API layer because no server route files, fetch calls, database client, or ORM dependency appear in scripts/dependencies; communication uses Chrome extension messages (`package.json:15-31`, `src/shared/messages.ts:3-20`, `src/popup/Popup.tsx:72-77`). Treat this as the API:

- `EAM_AUTOFILL`: returns `{ ok: true; result: FillResult }` after scanning, mapping, filling, and sidebar render (`src/shared/messages.ts:4`, `src/content/contentScript.ts:56-93`).
- `EAM_DETECT`: returns `{ ok: true; detected: DetectedField[] }` and opens the review panel without filling (`src/shared/messages.ts:5`, `src/content/contentScript.ts:39-50`).
- `EAM_CLEAR`: returns `{ ok: true; cleared: number }` after rollback (`src/shared/messages.ts:6`, `src/content/contentScript.ts:23-27`).
- `EAM_SHOW_LAST_RESULT`: can render the latest in-memory result if it exists, but the popup does not currently expose a button for it (`src/shared/messages.ts:7`, `src/content/contentScript.ts:29-32`, `src/popup/Popup.tsx:47-56`).

## Component Interaction Map

`Popup` owns command buttons and status text (`src/popup/Popup.tsx:40-68`). `Options` owns JSON profile loading, editing, validation, saving, and reset (`src/options/Options.tsx:12-36`). `renderSidebar` owns injected page feedback, including counts, categorized mapping sections, missing-required fields, clear rollback, and debug JSON copy (`src/sidebar/renderSidebar.ts:18-68`, `src/sidebar/renderSidebar.ts:70-119`).

## Full-Stack Feature Trace: Autofill Current Page

1. User clicks the first popup button, which calls `run({ type: MessageTypes.Autofill })` (`src/popup/Popup.tsx:47-50`).
2. `run` marks the popup busy, sends a typed request, then renders response counts (`src/popup/Popup.tsx:13-29`).
3. `sendToActiveTab` queries the current tab and sends the request to its content script (`src/popup/Popup.tsx:72-77`).
4. The content script listener delegates to `handleRequest` and returns `true` for async response handling (`src/content/contentScript.ts:14-21`).
5. The handler loads the profile, selects an adapter, scans the page, and maps detected fields (`src/content/contentScript.ts:34-37`).
6. For each mapping, skip mappings go to `skipped`, non-high mappings go to `unsure`, and high-confidence mappings reach `fillField` (`src/content/contentScript.ts:56-72`).
7. `fillField` finds the DOM element by generated field id, blocks unsupported controls, snapshots before-value, sets/selects value, and dispatches input/change events (`src/content/filler.ts:12-37`, `src/content/filler.ts:87-103`).
8. The handler stores `lastResult`, renders the sidebar, and returns the result to the popup (`src/content/contentScript.ts:84-93`).
9. The sidebar displays counts and categorized sections (`src/sidebar/renderSidebar.ts:32-65`).

## Diff Reading Exercise

Hypothetical change: someone modifies `shouldFill` to return true for `"medium"`.

Read order:

1. Start at `src/shared/confidence.ts:3-5` and identify the changed safety boundary.
2. Jump to `src/content/contentScript.ts:66-72` and confirm medium mappings would now call `fillField`.
3. Inspect `src/shared/fieldMatchers.ts:137-195` because authorization and years-of-experience produce medium when options or exact skills are unclear.
4. Inspect `src/content/filler.ts:12-37` because this is where the page changes.
5. Require tests that prove medium mappings remain review-only, extending the existing style in `src/shared/fieldMatchers.test.ts:15-48`.

Strong review conclusion: reject or request changes unless the product intentionally changes from cautious fill to assisted review.

## Non-Obvious Architectural Patterns

The scanner attaches generated ids to page controls so later code can connect abstract mappings back to live DOM nodes (`src/content/scanner.ts:20-21`, `src/content/scanner.ts:46-47`, `src/content/scanner.ts:70-75`). The content script keeps rollback state in module scope, which is simple and fits same-page fill/clear behavior but does not persist across reloads (`src/content/contentScript.ts:11`, `src/content/filler.ts:39-57`). The sidebar uses shadow DOM to reduce CSS collision risk with arbitrary job application pages (`src/sidebar/renderSidebar.ts:11-15`).

## Mid-Level Socratic Checkpoint

1. Why is `src/shared/messages.ts` equivalent to an API contract?
2. What risk appears if `mapField` matcher order changes?
3. Why does `DetectedField` include label, nearby text, section text, name, id, placeholder, and options?
4. Why is `rollbackEntries` module state instead of React state?
5. What are the consequences of direct `.value` assignment in `setNativeValue`?
6. How could a site adapter improve matching without changing generic rules?
7. Why does the fake page include both skipped file uploads and a submit button?
8. What test would you add before changing authorization matching?

## How To Self-Grade

A strong answer cites message unions (`src/shared/messages.ts:3-20`), matcher order (`src/shared/fieldMatchers.ts:55-85`), field text construction (`src/shared/fieldMatchers.ts:88-100`), content-script state (`src/content/contentScript.ts:11-12`), direct value assignment (`src/content/filler.ts:96-98`), adapter hooks (`src/shared/types.ts:121-125`), fake-page skipped controls (`test-pages/fake-application.html:224-239`), and existing matcher tests (`src/shared/fieldMatchers.test.ts:15-48`).

