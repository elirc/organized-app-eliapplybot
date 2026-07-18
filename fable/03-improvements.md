# Suggested Improvements

Prioritized. "Findings" references point to [02-findings.md](./02-findings.md).

## Priority 1 — do these first

### 1. Replace `<all_urls>` injection with `activeTab` + on-click injection

`manifest.json` currently injects the content script into **every page the user visits**
(`content_scripts` with `<all_urls>` plus `<all_urls>` host permissions). That contradicts
the extension's own privacy posture and means the scanner code is resident on banking
sites, email, everything. Since every action is already popup-initiated:

- Drop the `content_scripts` block and `host_permissions` entirely.
- Add the `scripting` permission and inject on demand from the popup:
  `chrome.scripting.executeScript({ target: { tabId }, files: ["contentScript.js"] })`,
  then send the message.
- Guard the content script against double-injection (a module-level flag).

Side benefit: this also fixes the "extension updated but old pages have no content
script" failure mode — injection always ships the current code.

### 2. Deep-validate the profile at save time (findings #1)

Extend `validateCandidateProfile` to check education/experience entry shapes and
`experienceYears` value types, and surface precise error messages in the options page
("education[0].start.month must be a number"). This converts a runtime crash on a live
application page into an edit-time validation message. Consider `zod` if you're willing
to add a dependency; hand-rolled checks are fine at this size.

### 3. Fix the three correctness bugs

- Snapshot rollback only on successful fill (findings #2) — small reorder in
  `fillField`.
- Word-boundary + longest-match skill matching in `matchExperienceYears` (findings #3).
- Structural fallback key for unnamed radio groups (findings #4).

Each is a ~10-line change with an obvious unit test.

## Priority 2 — high value, moderate effort

### 4. Test the DOM layer against the existing fixture

`test-pages/fake-application.html` + jsdom (already installed) can power integration
tests: load the fixture, run `scanPage` → `mapFields` → `fillField` → `rollbackFilled`,
assert the filled values and that rollback restores the exact original state. This is
the single highest-leverage test file this project can have — it exercises scanner,
matchers, and filler together and would pin the behavior every future adapter change
must preserve.

Also worth adding: matcher precedence tests (email vs. address, findings #7) and a
"skip" test for each SKIP_PATTERN.

### 5. Make site adapters real or delete them

All five adapters are name-only stubs; `normalizeField` is never implemented and the
adapter's only observable effect is the name shown in the sidebar. Either:

- Implement one for real (Greenhouse is the easiest: stable `first_name`/`last_name`
  IDs, `job_application[...]` name patterns) to prove the interface carries its weight, or
- Collapse to `getSiteName(url)` until there's a concrete normalization need.

An unused extension point is a cost: every reader has to figure out that it does nothing.

### 6. Use the native value setter for React-controlled inputs

`setNativeValue` (filler.ts:96-98) assigns `element.value` directly. React ≥16 overrides
the `value` property on controlled inputs, so direct assignment followed by a dispatched
`input` event is sometimes ignored (React's internal value tracker sees no change).
Greenhouse and Ashby are React apps. The standard workaround:

```ts
const proto = element instanceof HTMLTextAreaElement
  ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
```

then dispatch `input`. This is likely why a function named `setNativeValue` exists at
all — finish the thought.

## Priority 3 — worthwhile when the above is done

### 7. Support multiple education/experience entries

Both matchers hardcode `profile.education[0]` / `profile.experience[0]`. ATS forms with
repeatable sections (Workday especially) present entry 2+ fields that will be filled
with entry 1's data — arguably worse than not filling. Minimum viable fix: detect
repeated section indices (`education_1_school`, `work-experience-2`) in name/id
attributes and index into the profile arrays; fall back to review-only (`medium`) when
the index can't be determined.

### 8. Replace the raw-JSON options editor with a form

The JSON textarea is fine for a developer-owner but it's the main source of findings #1.
A simple form (even generated from the schema) with an "advanced: edit JSON" escape
hatch would remove the malformed-profile class of errors entirely.

### 9. Unify the build

Vite builds popup/options while a separate esbuild script builds the service worker and
content script, with `emptyOutDir: false` gluing them together (and `npm run clean`
compensating). [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) handles MV3
manifests, content scripts, and HMR in one Vite pipeline — one config, and dev reloads
stop requiring a full rebuild + manual extension reload.

### 10. Small polish items

- **manifest.json**: add `icons` (required before any store listing; also improves the
  chrome://extensions row), and a `minimum_chrome_version`.
- **Sidebar**: masked values are good; also mask `valueBefore` in the debug copy
  (findings #5) and give the panel a keyboard-reachable close (Escape handler).
- **`ShowLastResult` with no result** should say so instead of rendering zeros
  (findings #6).
- **Dependencies**: `@vitejs/plugin-react` belongs in `devDependencies`, not
  `dependencies` (it's build-time only).
- **serviceWorker.ts** does nothing user-visible; either remove it (and the manifest
  `background` block) or give it a job (e.g., context-menu "Autofill this page" entry).
- **Popup UX**: after autofill, the popup closes when focus moves to the page and the
  status is lost; the sidebar carries the detail, so consider making the popup status
  persist via `chrome.storage.session` or simply rely on the sidebar.

## Ideas for later (v2 direction)

- **Answer bank activation**: `futureAnswerBank` is already in the profile type —
  matching saved answers to recurring screener questions (review-only confidence) is the
  natural next capability and stays within the deterministic/no-AI constraint.
- **Per-site fill history** (local only): remember which fields were filled on which
  URL so re-opening a half-finished application can skip already-confirmed fields.
- **Export/import profile** as a JSON file from the options page — right now clearing
  extension storage silently destroys a carefully built profile.
