# Junior Engineer Guide

## Local Setup

Run `npm install` because the project declares npm dependencies and a committed `package-lock.json` (`package.json:15-31`, `package-lock.json:1-5`). Use `npm run typecheck`, `npm test`, and `npm run build` because those scripts are defined in `package.json:10-12`. Use `npm run serve:test` to serve the fake application page at port 5174 because the script points Vite at `test-pages` with `--port 5174` (`package.json:13`, `test-pages/fake-application.html:1-6`).

Load the extension by building `dist` and selecting it in Chrome extensions, because `README.md` documents `npm run build` followed by "Load unpacked" selecting `dist` (`README.md:17-32`). No `.env` file, seed script, backend start command, database migration, or remote service key appears in the root file list or scripts; persistence is local Chrome storage through `chrome.storage.local` (`package.json:7-14`, `src/shared/storage.ts:7-17`).

## Folder Orientation

`src/popup` owns the small React command UI mounted by `popup.html` (`popup.html:8-10`, `src/popup/main.tsx:1-10`). `src/options` owns the React JSON profile editor mounted by `options.html` (`options.html:8-10`, `src/options/main.tsx:1-10`). `src/content` owns DOM scanning, filling, labels, and message handling on application pages (`src/content/contentScript.ts:1-9`, `src/content/scanner.ts:1-6`, `src/content/filler.ts:1-12`). `src/shared` owns types, messages, profile storage, validation, confidence helpers, sample data, and matching logic (`src/shared/types.ts:1-125`, `src/shared/messages.ts:3-20`, `src/shared/storage.ts:5-22`, `src/shared/fieldMatchers.ts:1-273`). `src/sidebar` owns the injected review panel (`src/sidebar/renderSidebar.ts:6-16`). `src/sites` owns site adapter selection and hostname-based adapters (`src/sites/index.ts:1-12`).

One level deeper, the three most important frontend folders are `src/popup`, `src/options`, and `src/sidebar`: popup sends commands (`src/popup/Popup.tsx:13-29`), options edits saved profile JSON (`src/options/Options.tsx:16-29`), and sidebar reports fill outcomes in a shadow DOM host (`src/sidebar/renderSidebar.ts:6-16`). The three most important backend-like folders are `src/content`, `src/shared`, and `src/sites`: content coordinates page work (`src/content/contentScript.ts:23-93`), shared defines contracts and mapping (`src/shared/types.ts:39-70`, `src/shared/fieldMatchers.ts:47-85`), and sites choose an adapter by URL (`src/sites/index.ts:10-12`).

## Entry Point Walkthroughs

Frontend popup entry:

```tsx
import React from "react"; // React is needed because this entry renders JSX through React.
import ReactDOM from "react-dom/client"; // React 18 root API.
import { Popup } from "./Popup"; // The actual command UI lives in Popup.tsx.
import "./popup.css"; // Styles are scoped to the popup document.

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Popup /> {/* The popup page has one mounted app. */}
  </React.StrictMode>
);
```

Source: `src/popup/main.tsx:1-10`.

Backend-like content entry:

```ts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleRequest(request) // Every popup command enters the same async handler.
    .then(sendResponse) // Success responses are sent back to the popup.
    .catch((error: unknown) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }); // Errors become typed failure responses instead of unhandled promise failures.
  return true; // Chrome requires true when the response is async.
});
```

Source: `src/content/contentScript.ts:14-21`.

Background worker entry:

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ eliApplyMateInstalledAt: new Date().toISOString() });
}); // The background worker currently records install time only.
```

Source: `src/background/serviceWorker.ts:1-3`.

## Beginner TypeScript Patterns

Union types define exact allowed values: `Confidence` can only be `"high"`, `"medium"`, `"low"`, or `"skip"` (`src/shared/types.ts:1`). Object contracts define what scanning and mapping exchange: `DetectedField` is an observed page field, `FieldMapping` is a decision about it, and `FillResult` is the review summary (`src/shared/types.ts:39-70`). Type guards protect runtime JSON: `validateCandidateProfile` returns `value is CandidateProfile`, letting callers treat valid unknown data as a profile (`src/shared/profileSchema.ts:3-20`, `src/shared/storage.ts:7-13`).

## React Component Anatomy 1: Popup

```tsx
const [status, setStatus] = useState<Status>({ tone: "idle", text: "Ready for an explicit click." });
const [busy, setBusy] = useState(false); // Local UI state blocks duplicate clicks while a message is running.

async function run(request: ContentRequest) {
  setBusy(true); // The button state changes before the async Chrome message.
  setStatus({ tone: "idle", text: "Working on the current tab..." });
  try {
    const response = await sendToActiveTab(request); // The popup talks to the current tab, not a server.
    if (!response.ok) throw new Error(response.error);
    // Response shape controls the status copy.
  } finally {
    setBusy(false); // Always release the UI.
  }
}
```

Source: `src/popup/Popup.tsx:9-38`.

## React Component Anatomy 2: Options

```tsx
useEffect(() => {
  getProfile().then((profile) => setJson(JSON.stringify(profile, null, 2)));
}, []); // On first render, load the local profile and pretty-print it.

async function save() {
  const parsed = JSON.parse(json); // User edits raw JSON, so runtime parsing is required.
  if (!validateCandidateProfile(parsed)) {
    throw new Error("Profile JSON is missing required v1 fields.");
  }
  await saveProfile(parsed); // Only validated data reaches chrome.storage.local.
}
```

Source: `src/options/Options.tsx:12-24`.

## Component Anatomy 3: Sidebar Renderer

```ts
export function renderSidebar(result: FillResult, onClear: () => number): void {
  if (host) host.remove(); // Only one panel should exist on the page.
  host = document.createElement("div");
  host.id = "eli-apply-mate-sidebar";

  const shadow = host.attachShadow({ mode: "open" }); // Shadow DOM isolates the extension UI.
  const style = document.createElement("style");
  style.textContent = css; // CSS is imported as text by the content-script build.
  shadow.append(style, buildPanel(result, onClear));
  document.documentElement.append(host);
}
```

Source: `src/sidebar/renderSidebar.ts:6-16`, CSS text loader in `scripts/build-extension.mjs:20-30`.

## Backend Route Anatomy 1: Autofill Request

```ts
const profile = await getProfile(); // Load local candidate data.
const adapter = getSiteAdapter(window.location.href); // Pick Greenhouse, Lever, Workday, Ashby, or generic.
const detected = scanPage(adapter); // Convert DOM controls into DetectedField records.
const mappings = mapFields(detected, profile); // Decide confidence and values.
```

Source: `src/content/contentScript.ts:34-37`.

## Backend Route Anatomy 2: Detect Request

```ts
if (request.type === MessageTypes.Detect) {
  lastResult = {
    filled: [], // Detection does not mutate page fields.
    skipped: mappings.filter((mapping) => mapping.confidence === "skip"),
    unsure: mappings.filter((mapping) => mapping.confidence !== "skip"),
    missingRequired: findMissingRequired(detected),
    detected,
    site: adapter.name
  };
  renderSidebar(lastResult, () => rollbackFilled(rollbackEntries));
  return { ok: true, detected };
}
```

Source: `src/content/contentScript.ts:39-50`.

## Backend Route Anatomy 3: Clear Request

```ts
if (request.type === MessageTypes.Clear) {
  const cleared = rollbackFilled(rollbackEntries); // Restore snapshots captured during filling.
  return { ok: true, cleared }; // Popup renders "Cleared N changed controls."
}
```

Source: `src/content/contentScript.ts:23-27`, popup display in `src/popup/Popup.tsx:27-29`.

## Domain Glossary

Application page: the job application form currently open in the active Chrome tab; the content script can run on all URLs after `document_idle` (`manifest.json:17-22`).

Candidate profile: local structured data with personal, authorization, EEO, education, experience, experience-years, and answer-bank sections (`src/shared/types.ts:72-117`, `src/shared/sampleProfile.ts:3-55`).

Detected field: a DOM control observed by the scanner with label, nearby text, section text, options, required flag, and original value (`src/shared/types.ts:39-52`, `src/content/scanner.ts:24-36`, `src/content/scanner.ts:50-63`).

Field mapping: the matcher's decision for a detected field, including kind, confidence, reason, and optional fill value (`src/shared/types.ts:54-61`, `src/shared/fieldMatchers.ts:47-85`).

Confidence: the safety level that determines whether a field is filled, reviewed, skipped, or unknown (`src/shared/types.ts:1`, `src/shared/confidence.ts:3-9`).

Rollback entry: the before-value snapshot used to clear extension-filled values (`src/content/filler.ts:5-10`, `src/content/filler.ts:39-57`).

Site adapter: a small object that names and matches an ATS host, with an optional field normalizer hook (`src/shared/types.ts:119-125`, `src/sites/index.ts:8-12`).

## Junior Socratic Checkpoint

1. What file turns a click on "Autofill current page" into a Chrome message?
2. What file receives that message?
3. Where is the candidate profile loaded from?
4. Why does the scanner write generated ids onto page elements?
5. Which confidence value is allowed to fill automatically?
6. Where are file uploads skipped?
7. What happens when the user clicks "Clear filled values"?

## How To Self-Grade

A strong answer names `src/popup/Popup.tsx:47-56` and `src/popup/Popup.tsx:72-77` for sending, `src/content/contentScript.ts:14-21` for receiving, `src/shared/storage.ts:7-13` for profile loading, `src/content/scanner.ts:20-21` and `src/content/scanner.ts:46-47` for generated ids, `src/shared/confidence.ts:3-5` for high-only filling, `src/shared/fieldMatchers.ts:59-60` and `src/content/filler.ts:21-24` for blocked uploads/buttons, and `src/content/filler.ts:39-57` for rollback.

