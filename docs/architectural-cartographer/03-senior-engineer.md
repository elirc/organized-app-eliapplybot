# Senior Engineer Guide

## Architectural Critique

Scalability: 3/5. The pipeline is clean for v1 because scan, map, fill, and render are separated (`src/content/contentScript.ts:34-93`), but adapters only match hostnames and do not normalize site-specific structures (`src/sites/greenhouse.ts:3-6`, `src/sites/lever.ts:3-6`).

TypeScript discipline: 4/5. Strict TypeScript is enabled (`tsconfig.json:3-24`), key contracts are explicit (`src/shared/types.ts:39-125`), and message unions are typed (`src/shared/messages.ts:3-20`), but runtime profile validation is much weaker than the static `CandidateProfile` type (`src/shared/profileSchema.ts:3-20`, `src/shared/types.ts:72-117`).

Separation of concerns: 4/5. Content coordination, scanning, filling, matching, storage, and sidebar rendering are separated (`src/content/contentScript.ts:1-9`, `src/content/scanner.ts:6-67`, `src/content/filler.ts:12-37`, `src/shared/fieldMatchers.ts:47-85`, `src/shared/storage.ts:7-22`, `src/sidebar/renderSidebar.ts:6-16`).

Testability: 2/5. Matcher tests exist (`src/shared/fieldMatchers.test.ts:15-48`), but scanner, filler, storage, content-message handling, profile validation depth, and sidebar rendering lack tests.

Maintainability: 3/5. The small file structure is readable (`src/content/contentScript.ts:1-9`), but `fieldMatchers.ts` centralizes many domain rules in one long file (`src/shared/fieldMatchers.ts:11-273`).

Security posture: 3/5. The product avoids submit/button/file filling (`src/shared/fieldMatchers.ts:55-60`, `src/content/filler.ts:21-24`) and escapes sidebar HTML (`src/sidebar/renderSidebar.ts:128-135`), but it requests `<all_urls>` host permissions (`manifest.json:16-22`) and copies raw detected debug JSON to the clipboard (`src/sidebar/renderSidebar.ts:53-57`).

Performance: 3/5. Scanning is simple and bounded by visible form controls (`src/content/scanner.ts:10-67`), but each radio/checkbox group computes members by filtering all group inputs, which can become O(n^2) on large forms (`src/content/scanner.ts:13-20`).

## Performance Audit

Finding: radio/checkbox grouping repeatedly filters `groupInputs` for each new group (`src/content/scanner.ts:13-20`). On a large Workday-like page, pre-grouping would be clearer and cheaper.

Corrected sketch:

```ts
const groups = new Map<string, HTMLInputElement[]>();
for (const input of groupInputs) {
  if (!isVisible(input)) continue;
  const key = getGroupKey(input);
  groups.set(key, [...(groups.get(key) ?? []), input]);
}
// Then iterate groups once; this keeps grouping linear in number of controls.
```

Finding: `getNearbyText` reads parent and grandparent `innerText`, which can be expensive and broad on complex pages (`src/content/domLabels.ts:13-22`). Keep the 700-character cap, and consider using narrower label/description nodes before broad ancestor text.

## Security Audit

Finding: the extension is injected into all URLs (`manifest.json:17-22`). That matches the product goal of working on job forms but increases blast radius. A future version should add domain allow/deny controls in options, backed by Chrome storage (`src/options/Options.tsx:38-67`, `src/shared/storage.ts:7-22`).

Finding: sidebar copy writes full detected field JSON to the clipboard (`src/sidebar/renderSidebar.ts:53-57`). `DetectedField.valueBefore` may include user-entered page values because the scanner records the current control value (`src/content/scanner.ts:35`, `src/content/scanner.ts:62`). Prefer a report shaper that omits `valueBefore`.

Corrected sketch:

```ts
function safeDetected(field: DetectedField): Omit<DetectedField, "valueBefore"> {
  const { valueBefore: _removed, ...rest } = field;
  return rest; // Clipboard/debug output should not expose pre-existing application answers.
}
```

## TypeScript Discipline Review

The static types are useful because `FillResult` connects content-script output to popup status and sidebar rendering (`src/shared/types.ts:63-70`, `src/popup/Popup.tsx:20-24`, `src/sidebar/renderSidebar.ts:18-68`). The runtime gap is that unknown JSON only gets shallow validation before becoming `CandidateProfile` (`src/shared/profileSchema.ts:3-20`), while matchers assume nested fields like `profile.personal.linkedin`, `profile.authorization.legallyAuthorizedUS`, and `profile.education[0]` exist (`src/shared/fieldMatchers.ts:102-147`, `src/shared/fieldMatchers.ts:198-218`).

## Custom Abstractions Inventory

Custom abstractions are `SiteAdapter` for ATS-specific behavior (`src/shared/types.ts:121-125`), `DetectedField` for DOM observations (`src/shared/types.ts:39-52`), `FieldMapping` for mapping decisions (`src/shared/types.ts:54-61`), `FillResult` for review output (`src/shared/types.ts:63-70`), `RollbackEntry` for undo state (`src/content/filler.ts:5-10`), and `MessageTypes` for cross-context commands (`src/shared/messages.ts:3-8`). There are no custom React hooks; React state is used directly in `Popup` and `Options` (`src/popup/Popup.tsx:9-11`, `src/options/Options.tsx:7-14`).

## Testing Assessment

Existing tests cover only field matching basics: contact fields, resume skipping, sponsorship, and unmatched years-of-experience (`src/shared/fieldMatchers.test.ts:15-48`). A risky untested behavior is shallow profile validation.

Complete runnable test to add as `src/shared/profileSchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateCandidateProfile } from "./profileSchema";
import { sampleProfile } from "./sampleProfile";

describe("validateCandidateProfile", () => {
  it("rejects malformed nested profile data", () => {
    const broken = {
      ...sampleProfile,
      education: [{ ...sampleProfile.education[0], start: { month: "September", year: 2020 } }]
    };

    expect(validateCandidateProfile(broken)).toBe(false);
  });
});
```

This test currently exposes a likely failure because the validator only checks that `education` is an array, not that nested dates are numeric (`src/shared/profileSchema.ts:15-18`).

## Bug Injection Exercise

1. Symptom: clicking Clear says values cleared, but a React-based job form still shows internal validation errors. Test scenario: fake page with a controlled input mirror should update after fill and rollback; inspect `setNativeValue` direct assignment (`src/content/filler.ts:96-103`).
2. Symptom: two unrelated checkbox sections get filled together. Test scenario: two checkbox groups without names but with weak legends; inspect `getGroupKey` (`src/content/scanner.ts:83-87`).
3. Symptom: a saved invalid profile causes runtime matcher errors. Test scenario: save JSON with `personal` present but missing `authorization`; inspect `validateCandidateProfile` and `matchAuthorization` (`src/shared/profileSchema.ts:3-20`, `src/shared/fieldMatchers.ts:137-160`).
4. Symptom: clipboard debug export includes a user's previously typed answer. Test scenario: type into a required textarea, detect fields, copy debug JSON; inspect `valueBefore` and copy behavior (`src/content/scanner.ts:62`, `src/sidebar/renderSidebar.ts:53-57`).
5. Symptom: Workday fields remain mostly unknown. Test scenario: host matches Workday but adapter does no normalization; inspect `workdayAdapter` (`src/sites/workday.ts:3-6`).

## Git History Learning Exercise

This directory is not currently a git repository, so real commit history cannot be inspected (`git status` returned "not a git repository"). Practice with these realistic commit messages:

1. `Add high-confidence contact field matcher`: expect changes in `src/shared/fieldMatchers.ts:102-134` and tests like `src/shared/fieldMatchers.test.ts:16-21`.
2. `Introduce rollback for filled controls`: expect snapshots in `src/content/filler.ts:26-27` and rollback logic in `src/content/filler.ts:39-57`.
3. `Move profile data to chrome.storage.local`: expect storage helpers in `src/shared/storage.ts:5-22` and options page save/load in `src/options/Options.tsx:12-36`.
4. `Add review sidebar with shadow DOM`: expect `src/sidebar/renderSidebar.ts:6-16` and CSS text bundling in `scripts/build-extension.mjs:20-30`.
5. `Add fake application test page`: expect fixtures covering contact through skipped fields in `test-pages/fake-application.html:119-240`.

## If I Owned This Codebase

1. Deepen `validateCandidateProfile`; effort M, impact high (`src/shared/profileSchema.ts:3-20`).
2. Add scanner/filler jsdom tests; effort M, impact high (`src/content/scanner.ts:6-99`, `src/content/filler.ts:12-112`).
3. Replace direct value assignment with native setters; effort S, impact high for modern ATS pages (`src/content/filler.ts:96-103`).
4. Add safe review report shaping; effort S, impact medium for privacy (`src/sidebar/renderSidebar.ts:53-57`, `src/content/scanner.ts:62`).
5. Upgrade site adapters from hostname-only to normalization; effort L, impact high (`src/sites/index.ts:8-12`, `src/shared/types.ts:121-125`).
6. Add options for domain controls; effort M, impact medium for safety (`manifest.json:16-22`, `src/options/Options.tsx:38-67`).
7. Split field matchers by domain area; effort M, impact medium (`src/shared/fieldMatchers.ts:102-246`).

