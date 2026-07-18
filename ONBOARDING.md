# Developer Onboarding

This document is for two developers joining `eli apply mate`:

- Junior developer: newer to browser extensions, TypeScript, and production form automation.
- Mid-level developer: comfortable owning cross-file changes, architecture decisions, and risk management.

The project is a local Chrome extension that cautiously autofills job application forms after an explicit user click. It should remain review-first, local-first, and conservative. The extension must never submit applications, bypass site protections, or silently answer job-specific questions.

> **Status update (v0.2.0):** Story 1 (deep validation), Story 2 (native setters), and the grouping half of Story 3 are implemented, along with multi-version profiles (import/export/switch), label-priority matching, on-demand injection instead of `<all_urls>`, and a 61-test suite including a jsdom integration run against `test-pages/fake-application.html`. Stories 4 and 5 remain open; Story 3 still needs the extra fake-page fixtures.

## Product Context

`eli apply mate` helps a candidate fill repeated job application fields from a local profile. It currently supports:

- A Manifest V3 Chrome extension.
- Popup actions for autofill, detection, and rollback.
- An options page for local JSON profile editing.
- Deterministic field scanning and matching.
- A review sidebar showing filled, skipped, unsure, and required fields.
- Simple adapter detection for Greenhouse, Lever, Workday, Ashby, and generic sites.
- A local fake application page for testing.

The current implementation is intentionally cautious. High-confidence fields are filled. Medium and low-confidence fields are shown for review. Resume uploads, cover letters, long-form answers, and final submit buttons are skipped.

## Safety Rules

These rules are product requirements, not preferences.

- Never click submit, apply, finish, send, continue, next, or equivalent final-flow buttons automatically.
- Never bypass CAPTCHA, bot checks, login restrictions, paywalls, or site protections.
- Never fabricate or infer sensitive candidate information.
- Never upload files unless the user explicitly approves that feature and reviews the file path.
- Never fill long-form job-specific answers unless the product has an explicit review and approval flow.
- Prefer not filling a field over filling a field incorrectly.
- Mask sensitive values in debug views and logs where practical.
- Keep all profile data local in `chrome.storage.local`.

## Technical Map

Read these files first:

- `README.md`: setup, usage, and safety framing.
- `manifest.json`: extension permissions, content script injection, popup, and options page.
- `src/content/contentScript.ts`: message handling, scan/fill flow, rollback, sidebar rendering.
- `src/content/scanner.ts`: DOM field detection and stable field ids.
- `src/content/filler.ts`: applying values and rollback snapshots.
- `src/content/domLabels.ts`: label, nearby text, and section text extraction.
- `src/shared/fieldMatchers.ts`: deterministic classification and value mapping.
- `src/shared/types.ts`: profile, detected field, mapping, and result types.
- `src/shared/profileSchema.ts`: runtime profile validation.
- `src/sidebar/renderSidebar.ts`: injected review UI.
- `src/sites/*.ts`: site adapter stubs.
- `src/shared/fieldMatchers.test.ts`: current test style and baseline coverage.
- `test-pages/fake-application.html`: local manual test target.

## Local Setup

From the project root:

```sh
npm install
npm run typecheck
npm test
npm run build
```

To test manually:

```sh
npm run serve:test
```

Then open:

```text
http://127.0.0.1:5174/fake-application.html
```

Load `dist` in Chrome through `chrome://extensions`, enable Developer Mode, and use the extension popup on the fake page.

## Developer Roles

### Junior Developer Expectations

The junior developer should focus on well-scoped implementation, fixtures, tests, and UI clarity. Good starter tasks include validation, matcher tests, fake application fixture updates, sidebar copy, and adapter fixture coverage.

Before changing behavior:

1. Read the relevant files.
2. Add or update tests that describe the target behavior.
3. Make the smallest implementation change.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. Manually test against the fake application page when the change touches scanning or filling.

### Mid-Level Developer Expectations

The mid-level developer should own higher-risk browser automation behavior and review the safety implications of each story. Good ownership areas include scanner architecture, adapter strategy, field filling reliability, rollback behavior, and cross-site limitations.

Before approving a change:

1. Confirm it preserves the safety rules.
2. Check that uncertain fields remain review-only.
3. Confirm rollback works or the limitation is documented.
4. Check that new adapter logic does not make generic matching less safe.
5. Confirm tests cover both positive and negative cases.

## Implementation Stories

The following five user stories are assigned as the first onboarding project set. They are ordered roughly from lower risk to higher risk.

## Story 1: Strengthen Candidate Profile Validation

Owner: Junior developer  
Reviewer: Mid-level developer  
Risk: Low to medium  
Primary files:

- `src/shared/profileSchema.ts`
- `src/shared/types.ts`
- `src/shared/sampleProfile.ts`
- `src/options/Options.tsx`
- `src/shared/fieldMatchers.test.ts` or a new validation test file

### User Story

As a user editing my local profile JSON, I want invalid or incomplete profile data to be rejected with useful feedback so the autofiller does not fail or fill incorrect values during an application.

### Current Problem

`validateCandidateProfile` only checks a few top-level properties. It does not validate nested education entries, experience entries, EEO shape, date parts, optional URL fields, or `experienceYears` values.

### Implementation Plan

1. Add helper validators in `profileSchema.ts`:
   - `isRecord`
   - `isString`
   - `isOptionalString`
   - `isBoolean`
   - `isDateParts`
   - `isEducationEntry`
   - `isExperienceEntry`
   - `isStringArray`
   - `isExperienceYears`
2. Validate `personal` fields:
   - required: first name, last name, email, phone, location, LinkedIn
   - optional: GitHub and portfolio
3. Validate `authorization` booleans.
4. Validate `eeo` exists and optional values are strings when present.
5. Validate every education item:
   - required school and degree
   - optional field of study
   - valid start date
   - valid end date or `null`
6. Validate every experience item:
   - required company and title
   - optional location
   - valid start date
   - valid end date or `null`
   - required `current` boolean
   - optional description string array
7. Validate `experienceYears`:
   - keys are non-empty strings
   - values are finite non-negative numbers
8. Validate `futureAnswerBank` if present:
   - id, category, title, answer strings
   - tags string array
9. Add tests for:
   - sample profile is valid
   - missing nested education field is invalid
   - malformed date is invalid
   - negative years of experience is invalid
   - optional GitHub and portfolio can be absent
10. Update the options page error message only if needed. Keep it concise.

### Acceptance Criteria

- Invalid nested profile data is rejected.
- `sampleProfile` still passes validation.
- Options page still saves valid JSON.
- Unit tests cover valid and invalid profile shapes.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Manual QA

1. Open the options page.
2. Save the default sample profile.
3. Remove `education[0].school` and confirm save fails.
4. Restore the field and confirm save succeeds.

## Story 2: Make Field Filling More Reliable For React-Controlled Inputs

Owner: Mid-level developer  
Reviewer: Junior developer for tests and fake page coverage  
Risk: Medium  
Primary files:

- `src/content/filler.ts`
- `src/content/contentScript.ts`
- `test-pages/fake-application.html`
- New or existing content/filler tests if practical

### User Story

As a user applying through modern ATS pages, I want text inputs and textareas to update the page framework state correctly so the visible value and the application app state stay in sync.

### Current Problem

`setNativeValue` directly assigns `element.value`. This can fail on React-controlled inputs because React listens through patched property descriptors and synthetic events.

### Implementation Plan

1. Replace direct value assignment in `setNativeValue` with the native prototype setter when available:
   - Use `HTMLInputElement.prototype.value` setter for inputs.
   - Use `HTMLTextAreaElement.prototype.value` setter for textareas.
   - Use `HTMLSelectElement.prototype.value` setter for selects if needed.
2. Keep a safe fallback to direct assignment if no setter exists.
3. Dispatch events after setting:
   - `input`
   - `change`
   - consider `blur` only if manual QA shows it is needed
4. Avoid triggering submit-like actions.
5. Add a fake React-like controlled input fixture or a small script in `fake-application.html` that mirrors input state into a visible state node.
6. Verify the state node updates after autofill.
7. Confirm rollback also uses the same native setter path.
8. Avoid changing select option matching semantics in this story unless needed.

### Acceptance Criteria

- Text inputs and textareas are set through native setters.
- Existing fill and rollback behavior still works.
- Fake page demonstrates framework-like state updates.
- No submit or navigation behavior is introduced.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Manual QA

1. Serve the fake application page.
2. Run autofill.
3. Confirm visible input values are filled.
4. Confirm controlled-state display updates for the fixture field.
5. Click clear values and confirm values and state display revert.

## Story 3: Improve Radio And Checkbox Group Detection

Owner: Junior developer  
Reviewer: Mid-level developer  
Risk: Medium  
Primary files:

- `src/content/scanner.ts`
- `src/content/domLabels.ts`
- `src/content/filler.ts`
- `test-pages/fake-application.html`

### User Story

As a user filling applications with yes/no questions, EEO questions, and consent checkboxes, I want radio and checkbox groups to be detected separately so unrelated choices are not merged or filled incorrectly.

### Current Problem

`getGroupKey` groups by input type, name, fieldset text, and form id. If inputs have missing or reused names, unrelated groups can collapse into one detected field.

### Implementation Plan

1. Expand fake page coverage:
   - Add two radio groups without `name` attributes but with different fieldsets.
   - Add two checkbox groups in separate sections.
   - Add a single required consent checkbox.
2. Improve `getGroupKey` in `scanner.ts`:
   - Prefer `name` when present and meaningful.
   - Include nearest fieldset legend.
   - Include nearest section heading.
   - Include nearest form id.
   - Include DOM path or nearby label fingerprint as a fallback when no name exists.
3. Treat a single checkbox differently from a checkbox group:
   - A standalone checkbox should have its own detected field.
   - A named checkbox set should remain grouped.
4. Ensure radio groups with no name but separate fieldsets are not merged.
5. Update `valueBefore` for groups to reflect checked labels.
6. Confirm `findMissingRequired` still works for required radio groups and standalone checkboxes.
7. Add tests if a DOM-based scanner test harness is practical. If not, document manual QA steps in the story PR.

### Acceptance Criteria

- Separate visible radio groups are detected as separate fields.
- Standalone required checkbox is detected independently.
- Required missing radio and checkbox fields appear in the sidebar.
- Existing authorization and EEO selects still work.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Manual QA

1. Open the fake application page.
2. Click "Show detected fields".
3. Copy debug JSON.
4. Confirm the new radio and checkbox fixtures produce separate field ids.
5. Run autofill and confirm no unrelated checkbox/radio group is changed.

## Story 4: Add Real Adapter Normalization For Greenhouse And Lever

Owner: Mid-level developer  
Reviewer: Junior developer for fixtures and matcher tests  
Risk: Medium to high  
Primary files:

- `src/sites/greenhouse.ts`
- `src/sites/lever.ts`
- `src/sites/index.ts`
- `src/shared/fieldMatchers.ts`
- `test-pages/fake-application.html`
- New adapter fixture files if useful

### User Story

As a user applying through Greenhouse and Lever, I want the extension to recognize common ATS-specific labels and sections so more safe fields are filled and uncertain fields are clearly reviewed.

### Current Problem

The Greenhouse and Lever adapters only match hostnames. They do not normalize common ATS field names, section labels, hidden label patterns, or option text.

### Implementation Plan

1. Research current internal code patterns first. Do not add external dependencies.
2. Extend the `SiteAdapter` interface only if needed. Prefer using existing `normalizeField` first.
3. Add Greenhouse normalization:
   - Normalize common names like `job_application[first_name]`, `job_application[last_name]`, `job_application[email]`, `job_application[phone]`.
   - Preserve existing label text but add useful normalized label or nearby text when labels are weak.
   - Normalize resume and cover letter fields to ensure they remain skipped.
   - Add cautious handling for demographic sections.
4. Add Lever normalization:
   - Normalize contact fields common to Lever forms.
   - Detect links fields such as LinkedIn, GitHub, portfolio, and website.
   - Detect additional information textarea as skip or review-only.
   - Preserve resume upload skip behavior.
5. Add fixture HTML snippets for Greenhouse-like and Lever-like forms.
6. Add matcher tests using detected-field objects that represent common Greenhouse and Lever labels/names.
7. Keep Workday and Ashby unchanged except for shared interface updates if needed.

### Acceptance Criteria

- Greenhouse-like contact fields map with high confidence.
- Lever-like contact/link fields map with high confidence.
- Resume and cover letter upload fields remain skipped.
- Additional information and job-specific textarea fields remain skipped or review-only.
- No broad rule causes generic unknown fields to become high confidence.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Manual QA

1. Add or open a Greenhouse-like fixture.
2. Run detection and autofill.
3. Confirm contact fields fill and upload/long answer fields do not.
4. Repeat with a Lever-like fixture.

## Story 5: Persist Last Fill Result And Add Exportable Review Report

Owner: Junior developer for UI and storage helpers  
Reviewer: Mid-level developer for data shape and privacy  
Risk: Medium  
Primary files:

- `src/content/contentScript.ts`
- `src/sidebar/renderSidebar.ts`
- `src/shared/types.ts`
- `src/shared/storage.ts`
- `src/shared/messages.ts`
- `src/popup/Popup.tsx`

### User Story

As a user reviewing an application, I want to export a clear review report for the current page so I can understand what was filled, what was skipped, and what I still need to complete manually.

### Current Problem

The sidebar can copy detected-field debug JSON, but it does not export the full review result. The last result only lives in the content script runtime and is lost when the page reloads.

### Implementation Plan

1. Define a storage key for last review result in `storage.ts`.
2. Add helper functions:
   - `saveLastFillResult(result: FillResult)`
   - `getLastFillResult()`
   - `clearLastFillResult()`
3. Be careful with privacy:
   - Store masked values or avoid storing full values where feasible.
   - Do not store full resume contents.
   - Keep data in `chrome.storage.local`.
4. Update `contentScript.ts`:
   - Save `lastResult` after detect and autofill.
   - Keep existing in-memory rollback behavior separate from stored reporting.
5. Update `renderSidebar.ts`:
   - Change "Copy debug JSON" to offer both:
     - Copy detected debug JSON
     - Copy review report JSON
   - Or replace it with "Copy review JSON" if keeping UI simple.
6. Include in the report:
   - site adapter name
   - counts
   - filled mappings
   - skipped mappings
   - unsure mappings
   - missing required fields
   - timestamp
   - current page URL if available
7. Add a popup action if useful:
   - "Show last result" already exists in message types but is not exposed in the popup.
   - Wire it into the popup if it improves UX.
8. Add tests for pure report shaping functions if added.

### Acceptance Criteria

- User can copy a review report JSON from the sidebar.
- Report includes filled, skipped, unsure, missing required, site, and timestamp.
- Sensitive values are masked or intentionally omitted.
- Debug JSON remains available or the README explains the replacement.
- Existing rollback still works.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Manual QA

1. Run autofill on the fake application page.
2. Click the report copy button.
3. Paste into a text editor.
4. Confirm the report is valid JSON and includes counts and categorized fields.
5. Confirm email and phone values are masked.
6. Reload the page and verify behavior is acceptable based on the implemented persistence scope.

## Cross-Story Definition Of Done

Every story is done only when:

- Safety rules are preserved.
- TypeScript passes with `npm run typecheck`.
- Tests pass with `npm test`.
- Production build passes with `npm run build`.
- The fake application page has been manually checked if scanning or filling changed.
- New behavior is documented in `README.md` or this file when it changes developer workflow.
- Any known limitation is written down instead of hidden.

## Review Checklist

Use this checklist during code review:

- Does this make any medium or low-confidence field fill automatically?
- Could this click or trigger submit-like behavior?
- Could unrelated radio or checkbox controls be grouped?
- Could this store more personal data than needed?
- Does rollback still work after autofill?
- Are unknown required fields surfaced clearly?
- Do tests include negative cases?
- Does the fake application page still exercise the behavior?

## Suggested First Week Plan

Day 1:

- Both developers read this document and the files listed in Technical Map.
- Junior runs setup and tests.
- Mid-level manually loads the extension and tests the fake application page.

Day 2:

- Junior starts Story 1.
- Mid-level starts Story 2 design and spike.

Day 3:

- Junior finishes Story 1 and reviews Story 2 tests.
- Mid-level implements Story 2.

Day 4:

- Junior starts Story 3 fixture and grouping work.
- Mid-level starts Story 4 adapter normalization.

Day 5:

- Pair review Story 3 and Story 4.
- Junior starts Story 5 UI/report shape.
- Mid-level reviews storage/privacy implications.

## Known Project Gaps After These Stories

These stories improve the current extension but do not make it a full auto-apply system. Remaining gaps include:

- Workday and Ashby real-world adapter support.
- Iframe support.
- Custom ARIA combobox/listbox filling.
- Split month/year date widgets.
- Multiple education and experience section management.
- Resume upload approval flow.
- Reusable answer-bank workflow.
- Application tracking across jobs.
- Full browser automation outside the extension.
