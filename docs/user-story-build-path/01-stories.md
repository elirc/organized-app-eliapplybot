# User Stories

## Story 1: Rename The Primary Popup Action
**Difficulty:** Easy
**Estimated Time:** 0.5 hours
**Skills You'll Practice:** React JSX editing, product copy, smoke testing
**The Story:** As a job applicant, I want the main popup action to emphasize review-first autofill so that I trust the extension will not submit my application.
**Acceptance Criteria:**
- [ ] The first popup button still sends `MessageTypes.Autofill`.
- [ ] The button text communicates cautious autofill.
- [ ] The status text still reports filled, unsure, and skipped counts after a result.
- [ ] No message contract changes are made.
**Files You'll Likely Touch:**
- `src/popup/Popup.tsx` - primary action button and status rendering live here (`src/popup/Popup.tsx:20-29`, `src/popup/Popup.tsx:47-56`).
**High-Level Implementation Plan:**
1. Modify the text inside the first button in `src/popup/Popup.tsx:47-50`.
2. Keep the `onClick={() => run({ type: MessageTypes.Autofill })}` behavior unchanged.
3. Build and manually open the popup to confirm layout still fits.
**Tips:**
- The message constant is imported at `src/popup/Popup.tsx:2`.
- The button stack is only three buttons today (`src/popup/Popup.tsx:47-57`).
- The status count depends on `response.result` and should not be changed for copy-only work (`src/popup/Popup.tsx:20-24`).
**What Could Go Wrong:**
- Accidentally changing the message type would break the command.
- Long copy could overflow the compact popup UI.
**Stretch Goal:** Update README wording around the popup action to match the new copy (`README.md:5-15`).
**Connects To:** Story 2 because both are low-risk UI/data adjustments before behavior changes.

## Story 2: Add A New Skill To The Sample Profile
**Difficulty:** Easy
**Estimated Time:** 0.75 hours
**Skills You'll Practice:** TypeScript data editing, matcher awareness, fake-page QA
**The Story:** As a candidate, I want the starter profile to include another realistic experience-years skill so that skill-year matching is easier to test.
**Acceptance Criteria:**
- [ ] `sampleProfile.experienceYears` includes one additional realistic skill.
- [ ] Existing skills remain unchanged.
- [ ] The profile still satisfies the `CandidateProfile` type.
- [ ] The options page reset still shows the updated sample profile.
**Files You'll Likely Touch:**
- `src/shared/sampleProfile.ts` - starter candidate data lives here (`src/shared/sampleProfile.ts:47-54`).
**High-Level Implementation Plan:**
1. Add one key/value pair under `experienceYears` in `src/shared/sampleProfile.ts:47-53`.
2. If you want fake-page visibility, add a matching years field later in Story 3.
3. Run typecheck because `sampleProfile` is typed as `CandidateProfile` (`src/shared/sampleProfile.ts:1-3`).
**Tips:**
- Experience-years values are numbers (`src/shared/types.ts:109`).
- Exact skill names matter because matching normalizes and compares saved skill names (`src/shared/fieldMatchers.ts:185-195`).
- The options reset path saves `sampleProfile` through `resetProfile` (`src/shared/storage.ts:19-22`).
**What Could Go Wrong:**
- Adding a string value instead of a number will violate the TypeScript type.
- Adding a skill with punctuation may not match labels the way you expect; inspect `normalizeText` (`src/shared/fieldMatchers.ts:34-41`).
**Stretch Goal:** Add a matcher test for the new skill using the existing test helper (`src/shared/fieldMatchers.test.ts:6-21`).
**Connects To:** Story 3 because you will expose profile data through a fake-page field.

## Story 3: Add A Fake Page Field For A Saved Skill
**Difficulty:** Easy
**Estimated Time:** 1 hour
**Skills You'll Practice:** HTML fixture editing, manual QA, matcher tracing
**The Story:** As a developer testing the extension, I want the fake application page to include a field for a saved skill so that I can verify exact years-of-experience matching.
**Acceptance Criteria:**
- [ ] The fake page includes one new years-of-experience input whose label matches a saved skill.
- [ ] Running detection shows the field.
- [ ] Autofill fills the new field with the sample profile's saved number.
- [ ] No production matcher logic is changed.
**Files You'll Likely Touch:**
- `test-pages/fake-application.html` - local manual QA page with current experience-years fixture (`test-pages/fake-application.html:156-165`).
**High-Level Implementation Plan:**
1. Add a new `<label>` in the Experience grid near `test-pages/fake-application.html:159-165`.
2. Use a label that includes both "Years" and "experience" because the matcher requires both concepts (`src/shared/fieldMatchers.ts:185-186`).
3. Use a skill key that exists in `sampleProfile.experienceYears` (`src/shared/sampleProfile.ts:47-53`).
4. Serve the fake page using `npm run serve:test` (`package.json:13`).
**Tips:**
- The existing React years field is the pattern to copy (`test-pages/fake-application.html:164`).
- Matching is exact after normalization, so label wording matters (`src/shared/fieldMatchers.ts:188-191`).
- Filled values are shown in the sidebar under Filled (`src/sidebar/renderSidebar.ts:59-65`).
**What Could Go Wrong:**
- If the label lacks the skill name, the matcher returns medium with no value.
- If the label lacks "years" or "experience," the experience-years matcher does not run.
**Stretch Goal:** Add a unit test proving the new skill maps high-confidence (`src/shared/fieldMatchers.test.ts:15-48`).
**Connects To:** Story 4 because fake-page improvements prepare you to add review UI around detected data.

## Story 4: Add A Show Last Result Popup Button
**Difficulty:** Medium
**Estimated Time:** 1.5 hours
**Skills You'll Practice:** Message contracts, React UI, content-script state
**The Story:** As a user, I want to reopen the most recent review panel from the popup so that I can inspect results after closing the sidebar.
**Acceptance Criteria:**
- [ ] Popup includes a "Show last result" action.
- [ ] The action sends `MessageTypes.ShowLastResult`.
- [ ] If a last result exists, the sidebar reopens.
- [ ] If no last result exists, the popup shows a helpful error or idle message.
**Files You'll Likely Touch:**
- `src/popup/Popup.tsx` - add the button to the action stack (`src/popup/Popup.tsx:47-57`).
- `src/content/contentScript.ts` - existing last-result handling lives here (`src/content/contentScript.ts:29-32`, `src/content/contentScript.ts:84-93`).
- `src/shared/messages.ts` - `ShowLastResult` already exists in the contract (`src/shared/messages.ts:3-14`).
**High-Level Implementation Plan:**
1. Add a fourth button in `src/popup/Popup.tsx:47-57` that calls `run({ type: MessageTypes.ShowLastResult })`.
2. Inspect how `handleRequest` behaves when no `lastResult` exists (`src/content/contentScript.ts:29-34`).
3. Decide whether to add an explicit error branch for missing last result in `contentScript.ts`.
4. Keep the existing response union valid in `src/shared/messages.ts:16-20`.
**Tips:**
- `lastResult` is in-memory content-script state, so it resets on page reload (`src/content/contentScript.ts:11-12`).
- The popup already understands responses with `result` (`src/popup/Popup.tsx:20-24`).
- Reusing `renderSidebar(lastResult, ...)` preserves clear behavior (`src/content/contentScript.ts:29-31`).
**What Could Go Wrong:**
- If no explicit missing-result branch exists, the handler will continue into scan/map behavior, which may surprise the user.
- A fourth button may need CSS spacing checks (`src/popup/popup.css`).
**Stretch Goal:** Add status copy that distinguishes "reopened last result" from "new autofill result."
**Connects To:** Story 5 because both improve review visibility without changing fill safety.

## Story 5: Show Required Field Count In Popup After Detect
**Difficulty:** Medium
**Estimated Time:** 2 hours
**Skills You'll Practice:** API response design, content result shaping, UI feedback
**The Story:** As a user checking an application, I want the popup to tell me how many required fields remain missing after detection so that I know whether the page needs attention.
**Acceptance Criteria:**
- [ ] Detect response includes enough data to report missing required count.
- [ ] Popup status after Detect includes detected count and missing required count.
- [ ] Sidebar behavior remains unchanged.
- [ ] Autofill response behavior remains unchanged.
**Files You'll Likely Touch:**
- `src/shared/messages.ts` - Detect response currently returns only detected fields (`src/shared/messages.ts:16-20`).
- `src/content/contentScript.ts` - Detect builds `lastResult` with `missingRequired` (`src/content/contentScript.ts:39-50`).
- `src/popup/Popup.tsx` - Detect status text currently reports detected count only (`src/popup/Popup.tsx:25-27`).
**High-Level Implementation Plan:**
1. Extend the Detect success response type to include `missingRequired` count or return a result-like summary.
2. In `contentScript.ts:39-50`, include the count derived from `lastResult.missingRequired.length`.
3. In `Popup.tsx:25-27`, update the Detect branch to display the new count.
4. Verify TypeScript forces all response branches to stay consistent.
**Tips:**
- `findMissingRequired` already computes the list (`src/content/contentScript.ts:96-108`).
- `FillResult` already has `missingRequired` (`src/shared/types.ts:63-70`).
- Keep the response small if the popup only needs a count.
**What Could Go Wrong:**
- Changing the union can break `"detected" in response` narrowing if you alter property names carelessly.
- Counting required fields before fill is different from counting after fill; make the copy precise.
**Stretch Goal:** Display the count with a warning tone when required fields remain.
**Connects To:** Story 6 because you will be comfortable changing the message contract.

## Story 6: Add A Safe Review Report Message
**Difficulty:** Medium
**Estimated Time:** 3 hours
**Skills You'll Practice:** message API design, privacy shaping, TypeScript types, clipboard/report UX
**The Story:** As a user, I want a safe review report that omits raw previous field values so that I can copy results without exposing private application text.
**Acceptance Criteria:**
- [ ] A new report type omits `DetectedField.valueBefore`.
- [ ] The content script can return the report for the current `lastResult`.
- [ ] The report includes site, counts, filled, skipped, unsure, missing required, and timestamp.
- [ ] The report does not include raw `valueBefore`.
**Files You'll Likely Touch:**
- `src/shared/types.ts` - define a report type near `FillResult` (`src/shared/types.ts:63-70`).
- `src/shared/messages.ts` - add a new message and response branch (`src/shared/messages.ts:3-20`).
- `src/content/contentScript.ts` - add a handler branch near `ShowLastResult` (`src/content/contentScript.ts:29-32`).
- `src/sidebar/renderSidebar.ts` - current copy button writes detected JSON (`src/sidebar/renderSidebar.ts:53-57`).
**High-Level Implementation Plan:**
1. Add a `ReviewReport` type in `src/shared/types.ts` that uses safe detected-field data.
2. Add `MessageTypes.GetReviewReport` or similar in `src/shared/messages.ts`.
3. Add a pure helper in content or shared code that converts `FillResult` to `ReviewReport`.
4. Update sidebar copy behavior to copy the safe report instead of raw `result.detected`, or add a second button.
5. Verify no `valueBefore` appears in copied JSON.
**Tips:**
- The scanner records `valueBefore` for controls (`src/content/scanner.ts:35`, `src/content/scanner.ts:62`).
- Sidebar already masks email and phone for display (`src/sidebar/renderSidebar.ts:137-140`).
- `FillResult` already includes all categories needed for counts (`src/shared/types.ts:63-70`).
**What Could Go Wrong:**
- Copying `result.detected` directly will keep exposing `valueBefore`.
- Storing or copying full mapping values may reveal profile data; decide what to mask.
**Stretch Goal:** Add a unit test for the report shaping helper.
**Connects To:** Story 7 because the next feature persists or clears review state.

## Story 7: Persist The Last Safe Review Report
**Difficulty:** Medium
**Estimated Time:** 4 hours
**Skills You'll Practice:** Chrome storage, lifecycle design, privacy review
**The Story:** As a user, I want the latest safe review report to survive popup closes so that I can inspect it later during the same application workflow.
**Acceptance Criteria:**
- [ ] The app stores only the safe report, not raw detected values.
- [ ] The report is saved after Detect and Autofill.
- [ ] The popup or sidebar can retrieve the persisted report.
- [ ] A clear action exists for the persisted report.
**Files You'll Likely Touch:**
- `src/shared/storage.ts` - profile storage helpers are the pattern for Chrome local storage (`src/shared/storage.ts:5-22`).
- `src/content/contentScript.ts` - Detect and Autofill assign `lastResult` (`src/content/contentScript.ts:39-50`, `src/content/contentScript.ts:84-93`).
- `src/shared/messages.ts` - add retrieve/clear report messages if needed (`src/shared/messages.ts:3-20`).
- `src/popup/Popup.tsx` - expose retrieval or clear action (`src/popup/Popup.tsx:47-67`).
**High-Level Implementation Plan:**
1. Add a storage key and helpers such as `saveLastReviewReport`, `getLastReviewReport`, and `clearLastReviewReport`.
2. Call save after Detect result creation and after Autofill result creation in `contentScript.ts`.
3. Add a popup action that retrieves and displays persisted report summary, or reopens a sidebar from it if enough data exists.
4. Add a clear action that removes the saved report.
5. Manually verify reload behavior on the fake page.
**Tips:**
- `chrome.storage.local.set` is already wrapped by `saveProfile` (`src/shared/storage.ts:15-17`).
- `lastResult` remains in memory only today (`src/content/contentScript.ts:11-12`).
- Be explicit about report timestamps because storage can outlive the current tab.
**What Could Go Wrong:**
- Persisting DOM-linked objects or raw detected values may expose private data.
- Reopening a sidebar from a report may not support Clear because rollback entries are not persisted.
**Stretch Goal:** Add an expiration policy for saved reports.
**Connects To:** Story 8 because persistent domain data prepares for stronger profile validation.

## Story 8: Strengthen Profile Validation End To End
**Difficulty:** Hard
**Estimated Time:** 6 hours
**Skills You'll Practice:** runtime validation, TypeScript guards, tests, options UX
**The Story:** As a user editing local JSON, I want invalid nested profile data to be rejected so that autofill does not run with malformed candidate information.
**Acceptance Criteria:**
- [ ] Nested personal, authorization, EEO, education, experience, experienceYears, and answer-bank fields are validated.
- [ ] Invalid date parts are rejected.
- [ ] Negative or non-number experience years are rejected.
- [ ] Options page shows a useful validation error.
- [ ] Unit tests cover valid sample data and invalid nested data.
**Files You'll Likely Touch:**
- `src/shared/profileSchema.ts` - current validator is shallow (`src/shared/profileSchema.ts:3-20`).
- `src/shared/types.ts` - source contract for `CandidateProfile` (`src/shared/types.ts:72-117`).
- `src/shared/sampleProfile.ts` - valid sample fixture (`src/shared/sampleProfile.ts:3-55`).
- `src/options/Options.tsx` - save error UI (`src/options/Options.tsx:16-29`, `src/options/Options.tsx:64-66`).
- `src/shared/profileSchema.test.ts` - new test file following Vitest style from `src/shared/fieldMatchers.test.ts:1-15`.
**High-Level Implementation Plan:**
1. Add helper validators in `profileSchema.ts` for records, strings, booleans, optional strings, date parts, arrays, and finite non-negative numbers.
2. Validate every `CandidateProfile` section according to `src/shared/types.ts:72-117`.
3. Return false for malformed nested dates and experience-years values.
4. Improve Options error copy only enough to help the user.
5. Add tests for sample profile, missing education school, malformed date, negative years, and optional URL fields.
**Tips:**
- Matchers assume nested data exists, for example `profile.authorization.legallyAuthorizedUS` (`src/shared/fieldMatchers.ts:137-160`).
- Education and experience matchers use the first item in each array (`src/shared/fieldMatchers.ts:198-245`).
- `futureAnswerBank` is optional but has a defined shape (`src/shared/types.ts:110-116`).
**What Could Go Wrong:**
- Overly strict optional-field handling can reject valid profiles.
- Returning generic errors can frustrate users editing JSON.
- Forgetting tests means future schema changes can regress silently.
**Stretch Goal:** Return structured validation errors instead of a boolean.
**Connects To:** Story 9 because stronger validation makes adapter and matcher expansion safer.

## Story 9: Add Greenhouse And Lever Field Normalization
**Difficulty:** Hard
**Estimated Time:** 8 hours
**Skills You'll Practice:** adapter design, matcher tests, fixture-driven development, safety review
**The Story:** As a user applying through Greenhouse or Lever, I want common ATS field names to normalize into safer labels so that contact and profile fields are recognized more reliably.
**Acceptance Criteria:**
- [ ] Greenhouse contact field names normalize to useful labels.
- [ ] Lever contact/link fields normalize to useful labels.
- [ ] Resume, cover letter, and long-answer fields remain skipped or review-only.
- [ ] Generic matching does not become broader.
- [ ] Tests cover positive and negative adapter-shaped fields.
**Files You'll Likely Touch:**
- `src/sites/greenhouse.ts` - hostname-only adapter today (`src/sites/greenhouse.ts:3-6`).
- `src/sites/lever.ts` - hostname-only adapter today (`src/sites/lever.ts:3-6`).
- `src/shared/types.ts` - `SiteAdapter.normalizeField` already exists (`src/shared/types.ts:121-125`).
- `src/content/scanner.ts` - scanner calls adapter normalization (`src/content/scanner.ts:24-36`, `src/content/scanner.ts:50-63`, `src/content/scanner.ts:97-99`).
- `src/shared/fieldMatchers.test.ts` - current matcher test style (`src/shared/fieldMatchers.test.ts:15-48`).
- `test-pages/fake-application.html` - optional fixture additions (`test-pages/fake-application.html:119-240`).
**High-Level Implementation Plan:**
1. Implement `normalizeField` in `greenhouseAdapter` for common Greenhouse names like first name, last name, email, phone, LinkedIn, and resume.
2. Implement `normalizeField` in `leverAdapter` for common Lever contact and link fields.
3. Preserve original evidence while adding normalized label/name text.
4. Add tests using `DetectedField` objects shaped like ATS fields.
5. Manually test that file uploads and long answers still skip.
**Tips:**
- Adapter selection order puts specific adapters before generic (`src/sites/index.ts:8-12`).
- Matchers build searchable text from label, nearby text, section text, name, id, placeholder, and options (`src/shared/fieldMatchers.ts:88-100`).
- Skip patterns protect resumes and cover letters (`src/shared/fieldMatchers.ts:11-19`, `src/shared/fieldMatchers.ts:59-65`).
**What Could Go Wrong:**
- Broad normalization may make unknown fields high-confidence.
- Replacing labels instead of augmenting them can hide useful page evidence.
- Adapter behavior without tests can regress generic matching.
**Stretch Goal:** Add Greenhouse-like and Lever-like fixture pages under `test-pages`.
**Connects To:** Story 10 because adapter maturity raises the need for domain policy and caching.

## Story 10: Add Per-Domain Safety Policy And Scan Cache
**Difficulty:** Expert
**Estimated Time:** 12+ hours
**Skills You'll Practice:** architecture design, storage schema, caching, invalidation, security review
**The Story:** As a cautious user, I want per-domain controls and efficient rescans so that I can decide where the extension works and avoid repeated expensive scans on complex application pages.
**Acceptance Criteria:**
- [ ] Users can allow, pause, or block autofill behavior for the current domain.
- [ ] Domain policy is stored locally.
- [ ] Content script checks policy before scanning or filling.
- [ ] Detect can still explain when a domain is blocked or paused.
- [ ] Scan results are cached only when the DOM has not changed.
- [ ] Cache invalidation is documented and tested.
**Files You'll Likely Touch:**
- `src/shared/types.ts` - add policy and cache-related types near existing shared contracts (`src/shared/types.ts:39-125`).
- `src/shared/storage.ts` - add local storage helpers following profile pattern (`src/shared/storage.ts:5-22`).
- `src/shared/messages.ts` - add policy read/update messages (`src/shared/messages.ts:3-20`).
- `src/popup/Popup.tsx` - expose domain status and controls (`src/popup/Popup.tsx:40-68`).
- `src/options/Options.tsx` - optional advanced policy editor (`src/options/Options.tsx:38-67`).
- `src/content/contentScript.ts` - enforce policy and use scan cache (`src/content/contentScript.ts:23-93`).
- `src/content/scanner.ts` - cache boundary around scanning (`src/content/scanner.ts:6-67`).
- `src/sites/index.ts` - adapter names may help policy display (`src/sites/index.ts:8-12`).
- `test-pages/fake-application.html` - manual policy/cache QA target (`test-pages/fake-application.html:119-240`).
**High-Level Implementation Plan:**
1. Design `DomainPolicy` with `allow`, `pause`, and `block` states and a hostname key.
2. Add storage helpers for reading/updating policy.
3. Add popup controls that display current domain policy and allow changes.
4. In `contentScript.ts`, check policy before scan/fill; return a typed response when blocked.
5. Add a scan cache keyed by URL plus a DOM version signal such as field count or mutation observer revision.
6. Invalidate cache on DOM mutation, navigation change, or policy change.
7. Add tests for policy helpers and pure cache invalidation logic.
8. Manually verify fake-page detect/autofill behavior before and after policy changes.
**Tips:**
- Current manifest injects into all URLs, so policy enforcement must happen in code (`manifest.json:16-22`).
- `getSiteAdapter(window.location.href)` is already a natural place to derive site/domain context (`src/content/contentScript.ts:35`).
- Scan work starts at `scanPage(adapter)`, so cache should wrap that call rather than matcher/filler decisions (`src/content/contentScript.ts:36-37`).
- Do not cache live DOM elements; cache serializable `DetectedField` data (`src/shared/types.ts:39-52`).
**What Could Go Wrong:**
- A stale cache could fill the wrong field after the page changes.
- A blocked-domain policy that still scans defeats the privacy point.
- Persisting full detected fields with `valueBefore` can store private page data.
**Stretch Goal:** Add an options-page policy table with reset controls.
**Connects To:** This is the capstone story because it forces you to reason about manifest reach, storage design, content-script lifecycle, scan performance, and user trust.

