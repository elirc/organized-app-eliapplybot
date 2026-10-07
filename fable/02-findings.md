# Findings

Ordered by severity. Line numbers in each finding refer to v0.1.0. The dated **Status** lines cite the v0.2.0 code in this snapshot.

---

## 1. Shallow profile validation can crash autofill — `profileSchema.ts`

**Severity: High (crash)** · `src/shared/profileSchema.ts:15-16`, `src/shared/fieldMatchers.ts:256-259`

`validateCandidateProfile` only checks that `education` and `experience` are arrays — it
never validates the entries inside them. The options page accepts any JSON that passes
this check, so a hand-edited profile like:

```json
"education": [{ "school": "State U", "degree": "BS" }]
```

(missing `start`) is saved successfully. Later, on any page with an education section,
`matchEducation` reaches `formatDate(education.start)` (fieldMatchers.ts:214) and
`formatDate` dereferences `date.month` on `undefined` — a TypeError that aborts the whole
`handleRequest`, so the user sees a raw error in the popup and nothing fills.

Same shape of bug for `experience[0].start` (fieldMatchers.ts:239) and for
`experienceYears` values that aren't numbers.

**Fix:** validate entry shapes in `validateCandidateProfile` (school/degree strings,
`start` has numeric `month`/`year`, `end` is null or DateParts), or make `formatDate`
defensive. Validating at save time is better — it gives the user the error while they're
editing, not days later on a live application page.

**Status (2026-10-06, v0.2.0): Fixed.** `validateProfileDetailed` (`src/shared/profileSchema.ts:8-130`) checks every education and experience entry, its `{ month, year }` date parts (`:135-152`), and that `experienceYears` values are finite non-negative numbers (`:98-107`). The options page imports it (`src/options/Options.tsx:2`). Date *order* (start before end) is not checked.

---

## 2. Rollback entries recorded for selects that never changed — `filler.ts`

**Severity: Medium (incorrect counts, spurious events)** · `src/content/filler.ts:26-32`

```ts
rollback.push(snapshot(mapping.fieldId, element));   // pushed unconditionally

if (element instanceof HTMLSelectElement) {
  const matched = selectOption(element, mapping.value);
  if (matched) dispatchChanged(element);
  return matched;                                     // false → entry stays in rollback
}
```

When `selectOption` finds no matching option, the fill fails (correctly reported as
"unsure"), but the rollback entry for the untouched select remains. "Clear values filled
here" then rewrites the select's unchanged value, dispatches `input`/`change` on a field
the extension never modified, and inflates the "Cleared N" count. On pages with change
listeners (Workday-style wizards) those spurious events can mark pristine fields dirty.

**Fix:** push the snapshot only after the fill is known to succeed, or pop it on failure.

**Status (2026-10-06, v0.2.0): Fixed.** A select's rollback entry is pushed only after an option matched (`src/content/filler.ts:26-34`). Radio and checkbox groups snapshot their members only after a matching choice is found (`filler.ts:69-71`). Pinned by the test "does not record rollback when a select has no matching option" in `filler.test.ts`.

---

## 3. Years-of-experience skill match uses substring `includes` — `fieldMatchers.ts`

**Severity: Medium (wrong data filled with high confidence)** · `src/shared/fieldMatchers.ts:188-193`

```ts
if (normalizedSkill && text.includes(normalizedSkill)) {
  return high("yearsOfExperience", String(years), ...);
}
```

A saved skill that is a substring of another term matches incorrectly. Concrete case:
profile has `"java": 8`; the question "Years of JavaScript experience" contains `java`
as a substring, so it fills **8** with *high* confidence — precisely the category the
extension promises to fill only when certain. Which skill wins also depends on
`Object.entries` insertion order.

**Fix:** require word-boundary matches (e.g. `new RegExp(`\\b${escapeRegex(skill)}\\b`)`)
and prefer the longest matching skill when several match.

**Status (2026-10-06, v0.2.0): Fixed.** Skills are matched with a whole-word regex, and the longest matching skill wins (`src/shared/fieldMatchers.ts:213-223`). Pinned by the tests "does not let 'java' match 'JavaScript'" and "prefers the longest matching skill" in `fieldMatchers.test.ts`.

---

## 4. Unnamed radio groups on the same page merge into one field — `scanner.ts`

**Severity: Medium (mis-grouping → wrong option checked)** · `src/content/scanner.ts:83-87`

`getGroupKey` is `type|name|fieldsetLegend|formId`. Two separate radio groups that both
lack `name` attributes and `<fieldset>` wrappers (common in div-soup ATS markup) produce
the identical key `"radio|||"` and are treated as one group: one label, merged options,
and a fill could check a radio belonging to a different question.

**Fix:** when `name` is empty, fall back to a structural key (e.g. nearest common
container or the input's own label/ID) instead of allowing page-wide merging.

**Status (2026-10-06, v0.2.0): Mostly fixed.** An unnamed input outside a fieldset now gets a structural key from its nearest `role="radiogroup"`/`role="group"` container or grandparent (`src/content/scanner.ts:83-107`). Pinned by "keeps unnamed radio groups in separate containers apart" in `scanner.test.ts`. Unnamed inputs inside the *same* fieldset still share one key, because the structural key is only used when there is no fieldset (`scanner.ts:88`).

---

## 5. "Copy debug JSON" copies unmasked pre-existing field values — `renderSidebar.ts`

**Severity: Medium (privacy)** · `src/sidebar/renderSidebar.ts:53-57`, `src/content/scanner.ts:35,62`

The sidebar masks email/phone in the *display* (`maskValue`), but the "Copy debug JSON"
button serializes `result.detected`, which includes `valueBefore` for every visible
control on the page — anything the user already typed (salary expectations, SSN on some
government forms, etc.), unmasked. For an extension whose selling point is data caution,
the debug export is the one place data leaves the page uncontrolled.

**Fix:** strip or mask `valueBefore` in the debug export, or gate it behind an explicit
"include current field values" toggle.

**Status (2026-10-06, v0.2.0): Fixed.** The debug copy replaces every non-empty `valueBefore` with `"[redacted]"` (`src/sidebar/renderSidebar.ts:61-70`). The rest of each detected field, including labels and option text, is still copied.

---

## 6. "Show last result" with no prior result renders a misleading all-zero panel — `contentScript.ts`

**Severity: Low (confusing UX)** · `src/content/contentScript.ts:29-32, 84-93`

If `ShowLastResult` arrives when `lastResult` is null, the handler falls through: it
scans and maps the page, but since the request type is neither `Detect` nor `Autofill`,
`filled`/`skipped`/`unsure` all stay empty. The sidebar then shows 0/0/0/0 even though
fields were detected — the mappings are computed and discarded.

**Fix:** when there is no `lastResult`, either return an explicit "nothing to show yet"
response or treat it as a `Detect`.

**Status (2026-10-06, v0.2.0): Fixed.** With no prior result, `ShowLastResult` returns "Nothing to show yet. Run Autofill or Detect first." (`src/content/contentScript.ts:48-51`). The popup still has no button that sends this message (`src/popup/Popup.tsx:81-91`).

---

## 7. `location` regex will collide with more labels than intended — `fieldMatchers.ts`

**Severity: Low (latent false positive)** · `src/shared/fieldMatchers.ts:130`

`/\b(location|city|address)\b/` matches any label containing "address" — including
"Email address". Today the email check at line 115 runs first and shields it, so the
order of checks is load-bearing but nothing documents that. A future reorder (or a label
like "Mailing address for offer letter" vs "Address of previous employer" — the
`!company` guard only covers one case) silently changes behavior.

**Fix:** tighten the pattern (require "street", "home", "mailing", "city", "location";
exclude "email/e-mail") and add a test that pins the email-vs-address precedence.

**Status (2026-10-06, v0.2.0): Fixed.** Location needs `location`/`city` or a qualified address such as "mailing address", and is rejected for email labels and company or employer contexts (`src/shared/fieldMatchers.ts:136-142`). Pinned by the "Email address", "bare 'Address'", "mailing address" and "employer address" tests in `fieldMatchers.test.ts`.

---

## 8. Yes/No assumed fillable into any bare text input — `fieldMatchers.ts`

**Severity: Low (judgment call worth revisiting)** · `src/shared/fieldMatchers.ts:261-264`

`hasRecognizedYesNo` returns `true` for any `input`/`textarea` with no options, so a
free-text "Describe your work authorization status" input gets literal `"Yes"` typed
into it with high confidence. The text-skip patterns don't cover this phrasing. Filling
literal Yes/No into free text is riskier than the select/radio case and arguably should
be `medium` (review-only).

**Status (2026-10-06, v0.2.0): Fixed.** `hasRecognizedYesNo` returns false when a field has no options (`src/shared/fieldMatchers.ts:301-309`). A bare text input therefore gets `medium`, as the test "downgrades bare text inputs to review-only instead of typing Yes" confirms.

---

## 9. Content script re-tags the DOM on every scan and leaves attributes behind

**Severity: Low (hygiene)** · `src/content/scanner.ts:21,47`

Every Detect/Autofill re-runs `scanPage`, re-assigning `data-eli-apply-mate-field-id`
from index 0. Stale attributes from prior scans are overwritten for still-visible fields
but persist on fields that became hidden, and the attributes remain in the page DOM
indefinitely (visible to the site's own JS and to any analytics that serialize the DOM —
a fingerprintable marker that this extension is installed).

**Fix:** store a WeakMap from element → id inside the content script instead of writing
DOM attributes, or clear old attributes at scan start.

**Status (2026-10-06, v0.2.0): Open.** The scanner still writes `data-eli-apply-mate-field-id` on every scan (`src/content/scanner.ts:4`, `:21`, `:47`), and `findFieldElements` looks controls up by that attribute (`:70-75`). The maintained repository later moved ids into a private `WeakMap`.

---

## 10. Test coverage is thin relative to the risk profile

**Severity: Low (process)** · `src/shared/fieldMatchers.test.ts`

Four tests cover `mapField` happy paths. The riskiest code — `scanner.ts` grouping,
`filler.ts` fill/rollback, `domLabels.ts` label extraction — has zero tests, despite
`jsdom` already being a dev dependency and a realistic fixture already existing at
`test-pages/fake-application.html`. Most of the findings above (2, 4, 6) would have been
caught by a jsdom test that loads the fixture and round-trips autofill → rollback.

**Status (2026-10-06, v0.2.0): Addressed.** There are 6 test files with 61 tests. They include a jsdom round-trip of fill and rollback against the fake page (`src/content/autofill.integration.test.ts`), plus `filler.test.ts` and `scanner.test.ts`, which pin findings #2 and #4.
