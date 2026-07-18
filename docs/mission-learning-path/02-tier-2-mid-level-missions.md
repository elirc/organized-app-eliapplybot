# Tier 2 Mid-Level Missions

### Mission 9: State Has a Home and a Reason
**Tier:** Mid-Level
**Time Estimate:** 35 minutes
**Goal:** Separate UI state, persistent state, and content-script runtime state.
**The Concept:** Job autofill state has three homes: popup status is momentary, profile data is local storage, and rollback data lives beside the page it changed (`src/popup/Popup.tsx:9-11`, `src/shared/storage.ts:5-22`, `src/content/contentScript.ts:11-12`).
**Design Intent Before You Read the Code:** Put state where its lifetime belongs. If rollback moved to popup state, it would not have direct access to DOM element snapshots. If profile data stayed in React state only, content scripts could not reuse it.
**Find It In The Code:** Open `src/popup/Popup.tsx:9-38`, `src/options/Options.tsx:7-36`, `src/content/contentScript.ts:11-12`, `src/content/filler.ts:39-57`.

```ts
let rollbackEntries: RollbackEntry[] = []; // Lives in content script because entries point at page elements.
let lastResult: FillResult | null = null; // Lives in content script because the sidebar can be re-rendered for this page.

for (const entry of entries.reverse()) {
  if (!document.contains(element)) continue; // Runtime state is valid only while elements still exist.
}
```

**The Aha Moment:** State location is a lifetime decision, not just a convenience decision.
**Socratic Checkpoint:** 1. Which state belongs to popup UI? 2. Which state persists across extension opens? 3. Which state points to live DOM nodes? 4. What happens after page reload? 5. What would you persist for a future review report?

How to self-grade: strong answers cite `src/popup/Popup.tsx:9-11`, `src/shared/storage.ts:7-17`, `src/content/contentScript.ts:11-12`, and `src/content/filler.ts:39-57`.
**Connects To:** Mission 14 because the full trace crosses all three state homes; Mission 22 because persistence choices affect privacy.

### Mission 10: The Custom Hook Ecosystem
**Tier:** Mid-Level
**Time Estimate:** 25 minutes
**Goal:** Identify that this repo currently has no custom React hooks and explain the impact.
**The Concept:** A custom hook is a reusable procedure for component state/effects; this app is still small enough that `Popup` and `Options` use React hooks directly (`src/popup/Popup.tsx:1-11`, `src/options/Options.tsx:1-14`).
**Design Intent Before You Read the Code:** Do not invent abstractions before repetition exists. If profile loading appears in more components, a `useProfile` hook could centralize loading/error state.
**Find It In The Code:** Open `src/popup/Popup.tsx:1-38`, `src/options/Options.tsx:1-36`.

```tsx
const [json, setJson] = useState(""); // Options owns editor text locally.
useEffect(() => {
  getProfile().then((profile) => setJson(JSON.stringify(profile, null, 2)));
}, []); // This could become useProfile only if reused elsewhere.
```

**The Aha Moment:** The absence of custom hooks is a design fact: this app currently has little shared React state logic.
**Socratic Checkpoint:** 1. Which built-in hooks are used? 2. Is any function named `useSomething` exported? 3. What repetition would justify a hook? 4. What should a future `useProfile` return? 5. What risk comes from abstracting too soon?

How to self-grade: strong answers cite `src/popup/Popup.tsx:1-11`, `src/options/Options.tsx:1-14`, and storage helpers in `src/shared/storage.ts:7-22`.
**Connects To:** Mission 16 because composition should follow actual duplication; Mission 23 because a hook would need tests around loading/errors.

### Mission 11: Side Effects Are Promises to the System
**Tier:** Mid-Level
**Time Estimate:** 40 minutes
**Goal:** Audit async and DOM side effects.
**The Concept:** Every side effect is a promise to leave the form and user in a coherent state: messages return, storage saves, DOM values dispatch events, sidebar copy writes to clipboard (`src/popup/Popup.tsx:13-38`, `src/shared/storage.ts:15-22`, `src/content/filler.ts:96-103`, `src/sidebar/renderSidebar.ts:53-57`).
**Design Intent Before You Read the Code:** Effects should be visible, reversible where possible, and error-handled. If a fill changes a field without an event, the host page may not notice.
**Find It In The Code:** Open `src/popup/Popup.tsx:13-38`, `src/content/filler.ts:26-37`, `src/content/filler.ts:96-103`.

```ts
rollback.push(snapshot(mapping.fieldId, element)); // Reversibility begins before mutation.
setNativeValue(element, mapping.value); // Page value changes here.
dispatchChanged(element); // Host page receives input/change signals.

function dispatchChanged(element: HTMLElement): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
```

**The Aha Moment:** A fill is not complete until the page receives the same signals a user edit would send.
**Socratic Checkpoint:** 1. Which side effect is reversible? 2. Which side effect is persistent? 3. Which side effect touches clipboard? 4. Which async effect reports errors to UI? 5. Why might direct `.value` assignment be insufficient?

How to self-grade: strong answers cite `src/content/filler.ts:26-37`, `src/content/filler.ts:96-103`, `src/shared/storage.ts:15-22`, `src/sidebar/renderSidebar.ts:53-57`, and `src/popup/Popup.tsx:30-37`.
**Connects To:** Mission 21 because side effects shape performance; Mission 20 because bugs often live in effects.

### Mission 12: The Full API Contract
**Tier:** Mid-Level
**Time Estimate:** 30 minutes
**Goal:** Treat Chrome messages as the system API.
**The Concept:** Instead of REST endpoints, this app has command messages with typed responses (`src/shared/messages.ts:3-20`).
**Design Intent Before You Read the Code:** Request and response types should stay centralized. If popup and content script invent their own shapes, a button can silently break.
**Find It In The Code:** Open `src/shared/messages.ts:3-20`, `src/popup/Popup.tsx:20-29`, `src/content/contentScript.ts:23-93`.

```ts
export type ContentRequest =
  | { type: typeof MessageTypes.Autofill }
  | { type: typeof MessageTypes.Detect }
  | { type: typeof MessageTypes.Clear }
  | { type: typeof MessageTypes.ShowLastResult }; // Four legal commands.

export type ContentResponse =
  | { ok: true; result: FillResult }
  | { ok: true; detected: DetectedField[] }
  | { ok: true; cleared: number }
  | { ok: false; error: string }; // Popup must handle each branch.
```

**The Aha Moment:** Message unions are the route schema and response schema at once.
**Socratic Checkpoint:** 1. Which command has no popup button? 2. Which response branch supports Detect? 3. Which branch supports Clear? 4. Where are failures created? 5. How does Popup distinguish response shapes?

How to self-grade: strong answers cite `src/shared/messages.ts:3-20`, `src/content/contentScript.ts:17-19`, `src/content/contentScript.ts:29-32`, and `src/popup/Popup.tsx:20-29`.
**Connects To:** Mission 13 because the contract runs through the handler chain; Mission 15 because diff review starts at contracts.

### Mission 13: The Middleware Chain
**Tier:** Mid-Level
**Time Estimate:** 45 minutes
**Goal:** Read content handling as a pipeline.
**The Concept:** The content script is like an application reviewer: collect profile, identify ATS, inspect fields, classify answers, fill safe ones, then produce a review sheet (`src/content/contentScript.ts:34-93`).
**Design Intent Before You Read the Code:** Each stage should transform the output of the previous stage. If a stage reaches around another stage, confidence and rollback become harder to trust.
**Find It In The Code:** Open `src/content/contentScript.ts:34-93`.

```ts
const profile = await getProfile(); // Data source.
const adapter = getSiteAdapter(window.location.href); // Site context.
const detected = scanPage(adapter); // DOM -> DetectedField[].
const mappings = mapFields(detected, profile); // DetectedField[] -> FieldMapping[].

if (!shouldFill(mapping.confidence)) {
  unsure.push(mapping); // Medium/low stop here.
  continue;
}
const didFill = fillField(mapping, field, rollbackEntries); // Only high reaches mutation.
```

**The Aha Moment:** The handler is a middleware chain even without a framework.
**Socratic Checkpoint:** 1. Which stage reads storage? 2. Which stage reads URL? 3. Which stage reads DOM? 4. Which stage decides confidence? 5. Which stage mutates DOM?

How to self-grade: strong answers cite `src/shared/storage.ts:7-13`, `src/sites/index.ts:10-12`, `src/content/scanner.ts:6-67`, `src/shared/fieldMatchers.ts:43-85`, and `src/content/filler.ts:12-37`.
**Connects To:** Mission 14 because the feature trace expands the chain; Mission 19 because bug prediction follows chain boundaries.

### Mission 14: End-to-End Feature Trace
**Tier:** Mid-Level
**Time Estimate:** 60 minutes
**Goal:** Trace "Autofill current page" from UI to review panel.
**The Concept:** This is the extension's assembly line for a job application: command, scan, match, fill, report (`src/popup/Popup.tsx:47-77`, `src/content/contentScript.ts:34-93`).
**Design Intent Before You Read the Code:** Every stage must preserve safety. The user should see what was filled, what was skipped, and what still needs manual review.
**Find It In The Code:** Open `src/popup/Popup.tsx:47-77`, `src/content/contentScript.ts:34-93`, `src/content/scanner.ts:6-67`, `src/shared/fieldMatchers.ts:47-85`, `src/content/filler.ts:12-37`, `src/sidebar/renderSidebar.ts:32-65`.

```ts
if (mapping.confidence === "skip") skipped.push(mapping); // Known no-fill.
else if (!shouldFill(mapping.confidence)) unsure.push(mapping); // Review-only.
else if (fillField(mapping, field, rollbackEntries)) filled.push(mapping); // Mutated page.
else unsure.push({ ...mapping, confidence: "medium", reason: `${mapping.reason} Could not find a matching visible control option to fill.` }); // Failed fill becomes review.
```

**The Aha Moment:** The app is designed to produce accountability, not just filled inputs.
**Socratic Checkpoint:** 1. Where does the trace begin? 2. Where is profile loaded? 3. Where are fields detected? 4. Where does a high-confidence fill happen? 5. Where is the user shown the outcome?

How to self-grade: strong answers cite `src/popup/Popup.tsx:47-77`, `src/content/contentScript.ts:34-93`, `src/content/scanner.ts:6-67`, `src/content/filler.ts:12-37`, and `src/sidebar/renderSidebar.ts:32-65`.
**Connects To:** Mission 18 because architecture decisions are visible in the trace; Mission 23 because end-to-end behavior needs tests.

### Mission 15: Read the Diff Like an Engineer
**Tier:** Mid-Level
**Time Estimate:** 40 minutes
**Goal:** Practice reviewing a risky hypothetical change.
**The Concept:** A diff is a product behavior proposal. In this app, changing confidence logic changes what appears on a real job application form (`src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`).
**Design Intent Before You Read the Code:** Review from contract to consequence. If a diff changes `confidence`, inspect the fill gate and DOM mutation path.
**Find It In The Code:** Open `src/shared/confidence.ts:3-9`, `src/content/contentScript.ts:66-72`, `src/shared/fieldMatchers.ts:137-195`.

```ts
export function shouldFill(confidence: Confidence): boolean {
  return confidence === "high"; // This is the safety boundary.
}

if (!shouldFill(mapping.confidence)) {
  unsure.push(mapping); // Medium and low stay review-only.
  continue;
}
```

**The Aha Moment:** Review the smallest helper as if it controls the biggest user outcome, because it often does.
**Socratic Checkpoint:** 1. What if `shouldFill` allowed medium? 2. Which fields return medium today? 3. What tests would fail? 4. What tests are missing? 5. What user harm is possible?

How to self-grade: strong answers cite `src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`, `src/shared/fieldMatchers.ts:140-153`, `src/shared/fieldMatchers.ts:185-195`, and current tests in `src/shared/fieldMatchers.test.ts:15-48`.
**Connects To:** Mission 19 because bug prediction is diff reading before code is merged; Mission 22 because safety is security-adjacent here.

### Mission 16: Composition Over Inheritance
**Tier:** Mid-Level
**Time Estimate:** 30 minutes
**Goal:** See how small functions compose the feature.
**The Concept:** The app builds an autofill decision like a recruiter assembling a packet: labels, section text, profile data, and confidence rules are combined by functions instead of subclass hierarchies (`src/content/domLabels.ts:1-58`, `src/shared/fieldMatchers.ts:47-85`).
**Design Intent Before You Read the Code:** Prefer small functions with clear inputs over inheritance for DOM and matcher logic. If behavior hides in classes, confidence rules become harder to audit.
**Find It In The Code:** Open `src/content/domLabels.ts:1-58`, `src/shared/fieldMatchers.ts:88-100`, `src/sites/index.ts:8-12`.

```ts
function buildFieldText(field: DetectedField): string {
  return normalizeText([
    field.labelText,
    field.nearbyText,
    field.sectionText,
    field.name,
    field.idAttribute,
    field.placeholder,
    ...(field.options ?? [])
  ].join(" ")); // Composition: many evidence sources become one searchable text.
}
```

**The Aha Moment:** The architecture composes evidence and rules instead of building a class hierarchy.
**Socratic Checkpoint:** 1. Which functions extract labels? 2. Which function combines field text? 3. How are adapters composed? 4. Where would inheritance add little value? 5. Which function should stay pure for testing?

How to self-grade: strong answers cite `src/content/domLabels.ts:1-58`, `src/shared/fieldMatchers.ts:34-100`, `src/sites/index.ts:8-12`, and `src/shared/fieldMatchers.test.ts:15-48`.
**Connects To:** Mission 18 because composition is an architecture decision; Mission 21 because composed DOM reads have performance costs.

### Mission 17: TypeScript's Hidden Work
**Tier:** Mid-Level
**Time Estimate:** 35 minutes
**Goal:** Notice where TypeScript protects you without runtime code.
**The Concept:** TypeScript is the quiet reviewer checking that popup, content script, and sidebar speak the same language (`src/shared/messages.ts:10-20`, `src/shared/types.ts:39-70`).
**Design Intent Before You Read the Code:** Types should catch impossible states while runtime guards handle untrusted JSON and page DOM. If you trust TypeScript for external data, you miss runtime failures.
**Find It In The Code:** Open `src/shared/messages.ts:10-20`, `src/popup/Popup.tsx:20-29`, `src/shared/profileSchema.ts:3-20`.

```tsx
if ("result" in response) {
  setStatus({ text: `Filled ${response.result.filled.length}, unsure ${response.result.unsure.length}, skipped ${response.result.skipped.length}.`, tone: "success" });
} else if ("detected" in response) {
  setStatus({ tone: "success", text: `Detected ${response.detected.length} fields. Review panel opened.` });
} else {
  setStatus({ tone: "success", text: `Cleared ${response.cleared} changed controls.` });
} // Property checks narrow the ContentResponse union.
```

**The Aha Moment:** TypeScript narrows trusted internal messages, but runtime validators must still defend untrusted JSON.
**Socratic Checkpoint:** 1. What does `"result" in response` narrow? 2. What does `validateCandidateProfile` narrow? 3. Why is page DOM still unsafe? 4. Which compiler setting enforces strictness? 5. What nested data escapes current validation?

How to self-grade: strong answers cite `src/shared/messages.ts:16-20`, `src/popup/Popup.tsx:20-29`, `src/shared/profileSchema.ts:3-20`, `tsconfig.json:3-24`, and `src/shared/types.ts:72-117`.
**Connects To:** Mission 23 because runtime validation should be tested; Mission 19 because type gaps are bug sources.

