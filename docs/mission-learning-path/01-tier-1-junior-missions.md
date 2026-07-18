# Tier 1 Junior Missions

### Mission 1: The App's Heartbeat
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Trace how a user click becomes a page autofill attempt.
**The Concept:** A Chrome extension is like an application assistant with separate rooms: popup room for commands, content-script room inside the job form, and storage room for candidate data (`manifest.json:6-23`).
**Design Intent Before You Read the Code:** The popup should never directly touch page DOM; it sends a request to the content script. The content script owns scanning and filling. If this is implemented poorly, the UI could pretend work happened when the page never received the command (`src/popup/Popup.tsx:72-77`, `src/content/contentScript.ts:14-21`).
**Find It In The Code:** Open `src/popup/Popup.tsx:47-77`, `src/shared/messages.ts:3-20`, and `src/content/contentScript.ts:14-21`.

```tsx
<button disabled={busy} onClick={() => run({ type: MessageTypes.Autofill })}>
  Autofill current page
</button> // The user must explicitly click before any fill attempt starts.

async function sendToActiveTab(request: ContentRequest): Promise<ContentResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); // Find current tab.
  if (!tab?.id) throw new Error("No active tab found."); // Fail clearly if there is no target.
  return chrome.tabs.sendMessage(tab.id, request); // Send typed command into content script.
}
```

```ts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleRequest(request).then(sendResponse).catch(/* error response */); // One listener handles all commands.
  return true; // Keeps the Chrome message channel open for async work.
});
```

**The Aha Moment:** The popup is not the app brain; it is the command panel for the content script.
**Socratic Checkpoint:** 1. Where is the click handler? 2. Where is the message type defined? 3. Where is the message received? 4. Why does the listener return true? 5. What would fail if the active tab had no id?

How to self-grade: strong answers cite `src/popup/Popup.tsx:47-56`, `src/shared/messages.ts:3-14`, `src/content/contentScript.ts:14-21`, and `src/popup/Popup.tsx:72-77`.
**Connects To:** Mission 5 because the content-script listener behaves like this app's route handler; Mission 14 because the full trace starts here.

### Mission 2: The Folder Mental Map
**Tier:** Junior
**Time Estimate:** 30 minutes
**Goal:** Build a reliable map of what each folder owns.
**The Concept:** This extension is like a job application desk: popup is the button panel, options is the profile binder, content is the form inspector, shared is the rulebook, sidebar is the review sheet, and sites is the ATS name tag.
**Design Intent Before You Read the Code:** Files should be grouped by runtime context and responsibility. If folders blur together, scanning rules, UI state, and storage behavior become harder to review.
**Find It In The Code:** Open `src/popup/main.tsx:1-10`, `src/options/main.tsx:1-10`, `src/content/contentScript.ts:1-9`, `src/shared/types.ts:1-125`, `src/sidebar/renderSidebar.ts:1-16`, `src/sites/index.ts:1-12`.

```ts
import { fillField, rollbackFilled } from "./filler"; // content owns page mutation.
import { findFieldElements, scanPage } from "./scanner"; // content owns DOM discovery.
import { mapFields } from "../shared/fieldMatchers"; // shared owns deterministic rules.
import { getProfile } from "../shared/storage"; // shared owns Chrome storage helpers.
import { getSiteAdapter } from "../sites"; // sites owns ATS selection.
import { renderSidebar } from "../sidebar/renderSidebar"; // sidebar owns review UI.
```

**The Aha Moment:** Folder boundaries match extension responsibilities more than traditional MVC layers.
**Socratic Checkpoint:** 1. Which folder touches page DOM? 2. Which folder owns profile persistence? 3. Which folder owns React popup UI? 4. Which folder owns review UI injected into pages? 5. Which folder chooses Greenhouse/Lever/Workday/Ashby/generic?

How to self-grade: strong answers cite `src/content/scanner.ts:6-67`, `src/shared/storage.ts:5-22`, `src/popup/Popup.tsx:40-68`, `src/sidebar/renderSidebar.ts:6-16`, and `src/sites/index.ts:8-12`.
**Connects To:** Mission 8 because extension "navigation" is context switching; Mission 16 because composition follows these folder boundaries.

### Mission 3: TypeScript Is a Contract
**Tier:** Junior
**Time Estimate:** 35 minutes
**Goal:** Learn the three contracts that carry the app.
**The Concept:** TypeScript types are the application form's checklist: each stage agrees what "detected," "mapped," and "result" mean before anyone fills a field (`src/shared/types.ts:39-70`).
**Design Intent Before You Read the Code:** Scanning should produce observations, matching should produce decisions, and filling should produce an accountable result. If one shape becomes vague, the whole review story weakens.
**Find It In The Code:** Open `src/shared/types.ts:39-70`.

```ts
export type DetectedField = {
  id: string; // Scanner-generated handle back to DOM.
  elementType: ElementType; // input, select, textarea, radio, or checkbox.
  labelText: string; // Human-facing evidence.
  options?: string[]; // Choice controls need visible choices for safe matching.
  valueBefore?: string; // Used for review/debug context and rollback decisions.
};

export type FieldMapping = {
  fieldId: string; // Connects decision to DetectedField.id.
  kind: FieldKind; // Domain meaning: email, sponsorship, educationSchool, etc.
  confidence: Confidence; // Safety level.
  reason: string; // Reviewer-readable explanation.
  value?: string; // Optional because unsure/skip may have no fill value.
};
```

**The Aha Moment:** `DetectedField` is evidence; `FieldMapping` is judgment.
**Socratic Checkpoint:** 1. Which type comes from the DOM? 2. Which type comes from matching? 3. Why is `value` optional? 4. What does `confidence` control? 5. Why does `fieldId` exist?

How to self-grade: strong answers cite `src/shared/types.ts:39-61`, `src/shared/confidence.ts:3-5`, and generated ids in `src/content/scanner.ts:20-21`.
**Connects To:** Mission 6 because props/messages are also contracts; Mission 17 because TypeScript narrows response unions.

### Mission 4: Your First React Component
**Tier:** Junior
**Time Estimate:** 30 minutes
**Goal:** Understand `Popup` as a small but complete React component.
**The Concept:** The popup is the extension's command keypad: it tracks whether the keypad is busy and displays the last command outcome (`src/popup/Popup.tsx:9-29`).
**Design Intent Before You Read the Code:** UI state should stay local because no other component needs it. If status and busy state were global, the app would be more complex without benefit.
**Find It In The Code:** Open `src/popup/Popup.tsx:9-68`.

```tsx
const [status, setStatus] = useState<Status>({ tone: "idle", text: "Ready for an explicit click." });
const [busy, setBusy] = useState(false); // Two local states are enough for this popup.

<section className="button-stack" aria-label="Actions">
  <button disabled={busy} onClick={() => run({ type: MessageTypes.Autofill })}>Autofill current page</button>
  <button disabled={busy} onClick={() => run({ type: MessageTypes.Detect })}>Show detected fields</button>
  <button disabled={busy} onClick={() => run({ type: MessageTypes.Clear })}>Clear values filled here</button>
</section> // Each button sends one typed content request.
```

**The Aha Moment:** The popup component is simple because real work is delegated to the content script.
**Socratic Checkpoint:** 1. What state does Popup own? 2. Why is `busy` used? 3. Which action opens options? 4. Which helper sends messages? 5. What response shapes change status text?

How to self-grade: strong answers cite `src/popup/Popup.tsx:9-11`, `src/popup/Popup.tsx:20-29`, `src/popup/Popup.tsx:47-66`, and `src/popup/Popup.tsx:72-77`.
**Connects To:** Mission 9 because state placement matters; Mission 11 because `run` is an async side effect.

### Mission 5: Your First Node.js Route
**Tier:** Junior
**Time Estimate:** 35 minutes
**Goal:** Translate backend route thinking into Chrome message handling.
**The Concept:** There is no Express route here; the content-script message handler is the route table for extension commands (`src/content/contentScript.ts:14-27`).
**Design Intent Before You Read the Code:** A command handler should validate the command, do one flow, and return a typed response. If route logic leaks into the popup, the extension becomes harder to debug.
**Find It In The Code:** Open `src/content/contentScript.ts:14-50`.

```ts
if (request.type === MessageTypes.Clear) {
  const cleared = rollbackFilled(rollbackEntries); // Route: clear previous fill snapshots.
  return { ok: true, cleared }; // Typed response branch.
}

if (request.type === MessageTypes.Detect) {
  lastResult = { filled: [], skipped: /* skip list */, unsure: /* review list */, missingRequired: /* required list */, detected, site: adapter.name };
  renderSidebar(lastResult, () => rollbackFilled(rollbackEntries)); // Route side effect: open review panel.
  return { ok: true, detected };
}
```

**The Aha Moment:** In an extension, a message listener can play the role of a backend controller.
**Socratic Checkpoint:** 1. Which command clears values? 2. Which command scans without filling? 3. What response does Detect return? 4. What UI side effect happens after Detect? 5. Why is this not an HTTP endpoint?

How to self-grade: strong answers cite `src/content/contentScript.ts:23-50`, `src/shared/messages.ts:10-20`, and absence of HTTP/fetch dependencies in `package.json:15-31`.
**Connects To:** Mission 12 because messages are the API; Mission 13 because the handler has a middleware-like chain.

### Mission 6: Props Are a Typed Contract
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Learn how function parameters act like props/contracts in non-React code.
**The Concept:** The sidebar receives a completed review packet the way a form reviewer receives a checklist: it should render, not recompute (`src/sidebar/renderSidebar.ts:6-18`).
**Design Intent Before You Read the Code:** The sidebar should display `FillResult` and call `onClear`; it should not scan or map fields. If display code also made decisions, review behavior would be scattered.
**Find It In The Code:** Open `src/sidebar/renderSidebar.ts:6-68`.

```ts
export function renderSidebar(result: FillResult, onClear: () => number): void {
  // result is the display contract: filled, unsure, skipped, missingRequired, detected, site.
  // onClear is the command contract: the sidebar can request rollback without owning rollback state.
  shadow.append(style, buildPanel(result, onClear));
}
```

**The Aha Moment:** Props are not only React props; any typed function boundary can be a contract.
**Socratic Checkpoint:** 1. What data does `result` contain? 2. Why is `onClear` a function? 3. Where does `onClear` come from? 4. Does sidebar perform matching? 5. Does sidebar own rollback state?

How to self-grade: strong answers cite `src/shared/types.ts:63-70`, `src/sidebar/renderSidebar.ts:6-16`, `src/content/contentScript.ts:92-93`, and `src/content/filler.ts:39-57`.
**Connects To:** Mission 15 because diffs often break contracts; Mission 16 because this is composition.

### Mission 7: Following Data Into the App
**Tier:** Junior
**Time Estimate:** 35 minutes
**Goal:** Trace candidate profile data from sample to storage to matching.
**The Concept:** The profile is the candidate's reusable application packet: storage retrieves it, options edits it, matchers read it (`src/shared/sampleProfile.ts:3-55`, `src/shared/storage.ts:7-22`, `src/shared/fieldMatchers.ts:102-246`).
**Design Intent Before You Read the Code:** Profile data must remain local and validated before use. If invalid data enters storage, matchers can make wrong decisions or throw runtime errors.
**Find It In The Code:** Open `src/shared/storage.ts:7-22`, `src/options/Options.tsx:12-29`, and `src/shared/fieldMatchers.ts:102-134`.

```ts
const stored = await chrome.storage.local.get(PROFILE_KEY); // Local Chrome storage, not remote API.
const profile = stored[PROFILE_KEY];
if (validateCandidateProfile(profile)) return profile; // Runtime guard.
await saveProfile(sampleProfile); // Self-heals missing/invalid storage with placeholder data.
return sampleProfile;
```

**The Aha Moment:** Storage is the app's database equivalent, but it is local to Chrome.
**Socratic Checkpoint:** 1. Where is the storage key? 2. What happens if stored data is invalid? 3. Where does Options save JSON? 4. Where do matchers read `personal.email`? 5. What validation is missing?

How to self-grade: strong answers cite `src/shared/storage.ts:5-22`, `src/options/Options.tsx:16-24`, `src/shared/fieldMatchers.ts:102-134`, and shallow validation in `src/shared/profileSchema.ts:3-20`.
**Connects To:** Mission 9 because persistent state and runtime state differ; Mission 23 because validation needs tests.

### Mission 8: Navigation Is the App's Skeleton
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Understand navigation without a router.
**The Concept:** The extension has context navigation instead of URL routing: popup, options page, current tab content script, and injected sidebar (`manifest.json:6-23`).
**Design Intent Before You Read the Code:** Each context should enter through a declared manifest or HTML entry. If hidden navigation paths appear, users and reviewers lose track of what code can run where.
**Find It In The Code:** Open `manifest.json:6-23`, `popup.html:8-10`, `options.html:8-10`, `src/popup/Popup.tsx:63-66`.

```json
"action": { "default_popup": "popup.html" }, // Extension icon opens popup.
"options_page": "options.html", // Chrome options UI opens options page.
"content_scripts": [{ "matches": ["<all_urls>"], "js": ["contentScript.js"], "run_at": "document_idle" }] // Page runtime.
```

**The Aha Moment:** No React Router is needed because Chrome decides which document/context loads.
**Socratic Checkpoint:** 1. What opens the popup? 2. What opens the options page? 3. What injects the content script? 4. How does the popup open options? 5. What context renders the sidebar?

How to self-grade: strong answers cite `manifest.json:6-23`, `src/popup/Popup.tsx:63-66`, and `src/sidebar/renderSidebar.ts:6-16`.
**Connects To:** Mission 12 because context boundaries define the API; Mission 18 because extension context is an architecture decision.

