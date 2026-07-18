# Codebase Overview

`eli apply mate` is a Manifest V3 Chrome extension that autofills high-confidence,
standardized job-application fields after an explicit click. No network calls, no
submission, profile data lives only in `chrome.storage.local`.

## Data flow

```
Popup (React)                Content script (per page)
─────────────                ─────────────────────────
click "Autofill"
  └─ chrome.tabs.sendMessage ─▶ contentScript.ts handleRequest()
                                  ├─ storage.ts        getProfile() ◀── chrome.storage.local
                                  ├─ sites/index.ts    getSiteAdapter(url)
                                  ├─ scanner.ts        scanPage() — tags controls with
                                  │                    data-eli-apply-mate-field-id
                                  ├─ fieldMatchers.ts  mapFields() — deterministic regex
                                  │                    matching → FieldMapping + confidence
                                  ├─ confidence.ts     shouldFill() — only "high" fills
                                  ├─ filler.ts         fillField() + rollback snapshots
                                  └─ renderSidebar.ts  shadow-DOM review panel
```

The service worker (`src/background/serviceWorker.ts`) only stamps an install timestamp;
all real work happens in the content script.

## Module map

| Module | Role | Notes |
| --- | --- | --- |
| `src/shared/types.ts` | All domain types | Single source of truth; well designed |
| `src/shared/fieldMatchers.ts` | Label text → field kind + confidence | Pure functions, the heart of the extension; the only unit-tested module |
| `src/shared/confidence.ts` | Fill policy | Tiny and explicit: only `high` fills |
| `src/shared/storage.ts` | Profile load/save/reset | Falls back to sample profile on invalid data |
| `src/shared/profileSchema.ts` | Runtime profile validation | Shallow — see findings #1 |
| `src/content/scanner.ts` | DOM → `DetectedField[]` | Handles radio/checkbox grouping, visibility filtering |
| `src/content/domLabels.ts` | Label extraction heuristics | Explicit label, parent label, aria, fieldset legend, nearby text, section headings |
| `src/content/filler.ts` | Writes values, records rollback | Dispatches `input` + `change` for framework compatibility |
| `src/content/contentScript.ts` | Message router / orchestrator | Holds `rollbackEntries` and `lastResult` per page |
| `src/sidebar/renderSidebar.ts` | Review panel in shadow DOM | Escapes HTML properly; masks email/phone in display |
| `src/sites/*` | Site adapters | Currently name-only stubs (`normalizeField` unused) |
| `src/popup`, `src/options` | React UIs | Popup = 3 actions + status; Options = raw JSON editor |
| `scripts/build-extension.mjs` | esbuild for SW + content script | Vite builds popup/options; two bundlers total |

## What's done well

- **The safety claims are enforced in code, not just documented.** Buttons/submit/file
  inputs are hard-skipped in `mapField` (fieldMatchers.ts:55–61) and again defensively in
  `fillField` (filler.ts:22). Long-form/essay textareas are skipped by pattern.
- **Confidence gating is centralized** (`confidence.ts`) rather than scattered — changing
  the fill policy is a one-line edit.
- **Rollback is a first-class feature**: every write snapshots prior state, restore runs
  in reverse order so repeated fills still unwind to original values.
- **The sidebar uses shadow DOM** so page CSS can't break it, and all interpolated
  strings go through `escapeHtml`.
- **`setNativeValue` + dispatched `input`/`change` events** make fills visible to
  React/Vue-driven forms (though see improvements #6 for the React-16+ caveat).
- **Deterministic and offline** — no AI, no network, which makes behavior auditable and
  the test surface tractable.
- **Clean typing throughout** — no `any`, discriminated unions for messages, `strict`
  TypeScript.

## Current limitations (by design, per README)

- Only the *first* education and experience entries are used (fieldMatchers.ts:199, 224).
- Resume/cover-letter uploads and job-specific essays are intentionally skipped.
- Site adapters are stubs; `normalizeField` exists in the type but nothing implements it.
