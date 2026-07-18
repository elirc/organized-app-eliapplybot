# Tier 3 Senior Missions

### Mission 18: Reverse-Engineer the Architecture Decisions
**Tier:** Senior
**Time Estimate:** 45 minutes
**Goal:** Infer why the app is built as a local extension pipeline.
**The Concept:** The product is review-first autofill, so the architecture avoids a backend and puts the decision engine beside the form (`README.md:3-15`, `manifest.json:6-23`, `src/content/contentScript.ts:34-93`).
**Design Intent Before You Read the Code:** Local-only data reduces server/privacy complexity, but increases responsibility around all-URL injection and client-side validation.
**Find It In The Code:** Open `README.md:3-15`, `manifest.json:15-22`, `src/shared/storage.ts:7-17`, `src/shared/fieldMatchers.ts:55-65`.

```ts
if (field.inputType === "file" || SKIP_PATTERNS.some((pattern) => pattern.test(text))) {
  return { ...base, kind: "unknown", confidence: "skip", reason: "File uploads, resumes, and cover letters are skipped in v1." };
} // Product decision encoded as a matcher rule.
```

**The Aha Moment:** The architecture optimizes for cautious local review, not maximum automation.
**Socratic Checkpoint:** 1. Why no backend? 2. Why content script? 3. Why local storage? 4. Why high-confidence only? 5. Why sidebar review?

How to self-grade: strong answers cite `README.md:3-15`, `manifest.json:17-22`, `src/shared/storage.ts:7-17`, `src/shared/confidence.ts:3-5`, and `src/sidebar/renderSidebar.ts:32-65`.
**Connects To:** Mission 22 because local-only still has security risk; Mission 24 because commits reveal architecture evolution.

### Mission 19: Find the Bugs Before They Happen
**Tier:** Senior
**Time Estimate:** 50 minutes
**Goal:** Predict failure modes from code boundaries.
**The Concept:** Senior debugging starts before the bug report: look where untrusted pages, profile JSON, and DOM mutation meet (`src/shared/profileSchema.ts:3-20`, `src/content/scanner.ts:6-99`, `src/content/filler.ts:12-37`).
**Design Intent Before You Read the Code:** Risk concentrates where external inputs cross into trusted logic. Here those inputs are page DOM and user-edited JSON.
**Find It In The Code:** Open `src/shared/profileSchema.ts:3-20`, `src/content/scanner.ts:83-99`, `src/content/filler.ts:96-103`.

```ts
function getGroupKey(input: HTMLInputElement): string {
  const fieldset = input.closest("fieldset");
  const fieldsetText = fieldset?.querySelector("legend")?.textContent?.trim() ?? "";
  return [input.type, input.name, fieldsetText, input.form?.id].join("|"); // Weak pages can collide here.
}
```

**The Aha Moment:** Bugs are most likely where the app assumes application pages are well-structured.
**Socratic Checkpoint:** 1. What if two radio groups have no name? 2. What if a profile has malformed dates? 3. What if a React-controlled input ignores direct assignment? 4. What if `innerText` is huge? 5. What if debug JSON includes private values?

How to self-grade: strong answers cite `src/content/scanner.ts:83-87`, `src/shared/profileSchema.ts:15-18`, `src/content/filler.ts:96-103`, `src/content/domLabels.ts:13-22`, and `src/sidebar/renderSidebar.ts:53-57`.
**Connects To:** Mission 20 because these predictions become bug scenarios; Mission 21 because DOM reads can become performance issues.

### Mission 20: The Bug Injection Challenge
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Describe bugs by user symptom and test scenario without changing production code.
**The Concept:** A good bug drill starts from what the applicant sees, then traces back to the likely code boundary.
**Design Intent Before You Read the Code:** Do not inject bugs into production files. Write scenarios and tests that would catch them.
**Find It In The Code:** Open `src/content/filler.ts:39-57`, `src/content/scanner.ts:10-37`, `src/shared/fieldMatchers.ts:137-195`, `test-pages/fake-application.html:119-240`.

```ts
if (!match) return false; // User symptom: select/radio remains empty even though matcher found a value.
for (const input of inputs) rollback.push(snapshot(/* before state */)); // Test scenario: rollback restores every option in a group.
match.checked = true;
dispatchChanged(match);
```

**The Aha Moment:** User-visible symptoms become useful only when paired with a reproducible scenario.
**Socratic Checkpoint:** 1. Which symptom suggests grouping failure? 2. Which symptom suggests event dispatch failure? 3. Which symptom suggests profile validation failure? 4. Which symptom suggests adapter weakness? 5. Which symptom suggests privacy exposure?

How to self-grade: strong answers cite scanner grouping (`src/content/scanner.ts:10-37`), dispatch (`src/content/filler.ts:100-103`), profile validation (`src/shared/profileSchema.ts:3-20`), adapters (`src/sites/index.ts:8-12`), and clipboard copying (`src/sidebar/renderSidebar.ts:53-57`).
**Connects To:** Mission 23 because scenarios should become tests; Mission 15 because review should catch these before merge.

### Mission 21: Performance X-Ray
**Tier:** Senior
**Time Estimate:** 45 minutes
**Goal:** Identify concrete performance costs and safer alternatives.
**The Concept:** Autofill runs on arbitrary job forms, so DOM scans should be careful and proportional to form size (`src/content/scanner.ts:6-67`).
**Design Intent Before You Read the Code:** Avoid repeated full scans, broad text extraction, and unnecessary DOM writes. Slowness on a giant ATS form feels like brokenness.
**Find It In The Code:** Open `src/content/scanner.ts:10-20`, `src/content/domLabels.ts:13-36`, `src/sidebar/renderSidebar.ts:6-16`.

```ts
const members = groupInputs.filter((candidate) => getGroupKey(candidate) === groupKey && isVisible(candidate));
// This repeats a filter across all group inputs for each group.
// A Map keyed by groupKey would make grouping linear and easier to inspect.
```

**The Aha Moment:** The scanner is small, but page size and arbitrary DOM make small inefficiencies matter.
**Socratic Checkpoint:** 1. Where is grouping O(n^2)? 2. Which function reads ancestor text? 3. Why is shadow DOM acceptable overhead? 4. Which fields are scanned twice? 5. What benchmark would you write?

How to self-grade: strong answers cite `src/content/scanner.ts:10-20`, `src/content/scanner.ts:40-67`, `src/content/domLabels.ts:13-36`, and `src/sidebar/renderSidebar.ts:6-16`.
**Connects To:** Mission 19 because performance risks are bug risks; Mission 23 because benchmarks/tests can guard refactors.

### Mission 22: The Security Audit
**Tier:** Senior
**Time Estimate:** 50 minutes
**Goal:** Audit privacy and safety posture.
**The Concept:** A local extension can still leak or mishandle data if it copies, stores, or fills too much (`manifest.json:15-22`, `src/sidebar/renderSidebar.ts:53-57`, `src/shared/storage.ts:5-22`).
**Design Intent Before You Read the Code:** Minimize data movement, escape rendered HTML, avoid submit-like actions, and make risky behavior explicit to the user.
**Find It In The Code:** Open `manifest.json:15-22`, `src/shared/fieldMatchers.ts:55-65`, `src/content/filler.ts:21-24`, `src/sidebar/renderSidebar.ts:85-140`.

```ts
item.innerHTML = `
  <div class="eam-label">${escapeHtml(mapping.labelText || mapping.kind)}</div>
  <div class="eam-meta">${escapeHtml(mapping.kind)} ... ${escapeHtml(mapping.reason)}</div>
`; // Dynamic strings are escaped before innerHTML insertion.

if (kind === "email") return value.replace(/^(.{2}).*(@.*)$/, "$1***$2"); // Review UI masks email.
```

**The Aha Moment:** Security here means "do not surprise the applicant" as much as it means technical hardening.
**Socratic Checkpoint:** 1. Why is `<all_urls>` risky? 2. Where are submit controls blocked? 3. Where is HTML escaped? 4. What clipboard data may be sensitive? 5. What storage rule protects privacy?

How to self-grade: strong answers cite `manifest.json:16-22`, `src/content/filler.ts:21-24`, `src/sidebar/renderSidebar.ts:128-140`, `src/sidebar/renderSidebar.ts:53-57`, and `src/shared/storage.ts:5-22`.
**Connects To:** Mission 18 because architecture choices create the risk profile; Mission 25 because workflow docs must preserve safety.

### Mission 23: Write the Test That Doesn't Exist
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Design a test for a risky untested behavior.
**The Concept:** Tests should lock the safety boundary where a wrong fill would hurt the user (`src/shared/confidence.ts:3-5`, `src/content/contentScript.ts:66-72`).
**Design Intent Before You Read the Code:** Prefer pure tests for matchers/validators and jsdom tests for scanner/filler behavior. The current test suite covers only matcher basics.
**Find It In The Code:** Open `src/shared/fieldMatchers.test.ts:15-48`, `src/shared/profileSchema.ts:3-20`, `src/content/filler.ts:12-37`.

```ts
it("does not fill years of experience without an exact skill match", () => {
  const mapping = mapField(field({ labelText: "Years of Kubernetes experience" }), sampleProfile);
  expect(mapping.kind).toBe("yearsOfExperience");
  expect(mapping.confidence).toBe("medium"); // The risk is locked as review-only.
  expect(mapping.value).toBeUndefined();
});
```

**The Aha Moment:** The most valuable tests prove the app refuses to act when confidence is unclear.
**Socratic Checkpoint:** 1. What current tests protect skip behavior? 2. What validator test is missing? 3. What scanner grouping test is missing? 4. What filler rollback test is missing? 5. Which test should be added before adapter normalization?

How to self-grade: strong answers cite `src/shared/fieldMatchers.test.ts:23-47`, `src/shared/profileSchema.ts:3-20`, `src/content/scanner.ts:83-87`, `src/content/filler.ts:39-57`, and adapter files like `src/sites/greenhouse.ts:3-6`.
**Connects To:** Mission 20 because bug scenarios become tests; Mission 24 because test additions tell evolution stories.

### Mission 24: The Git History Tells a Story
**Tier:** Senior
**Time Estimate:** 30 minutes
**Goal:** Practice reconstructing evolution without a local git history.
**The Concept:** Commit history is architecture archaeology: each commit should reveal a product pressure or risk response.
**Design Intent Before You Read the Code:** The current directory is not a git repository, so use realistic commit-message analysis against current code anchors instead of `git log`.
**Find It In The Code:** Open `README.md:3-15`, `src/content/contentScript.ts:34-93`, `src/shared/fieldMatchers.test.ts:15-48`, `scripts/build-extension.mjs:10-32`.

```text
Commit: Add review sidebar after autofill
Evidence to inspect: renderSidebar receives FillResult and onClear (src/sidebar/renderSidebar.ts:6-68).
Implied product pressure: filling alone was not enough; the user needed accountability.
```

**The Aha Moment:** Good commit history explains why the system became safer, not just what changed.
**Socratic Checkpoint:** 1. What commit might have introduced high-only filling? 2. What commit might have added rollback? 3. What commit might have introduced fake-page QA? 4. What commit might have split Vite and esbuild bundling? 5. What commit might have added local profile editing?

How to self-grade: strong answers cite `src/shared/confidence.ts:3-5`, `src/content/filler.ts:39-57`, `test-pages/fake-application.html:119-240`, `scripts/build-extension.mjs:10-32`, and `src/options/Options.tsx:12-36`.
**Connects To:** Mission 18 because history explains architecture; Mission 25 because docs should preserve intent.

