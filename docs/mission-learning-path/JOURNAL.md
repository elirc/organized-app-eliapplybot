# Mission Learning Path Journal

## Mission Design Rationale

The mission order follows the real app heartbeat: extension registration, folder map, TypeScript contracts, React command UI, message handling, data loading, navigation/context boundaries, state, side effects, API-like messages, middleware-like request flow, and finally senior risk analysis. The heartbeat is visible in the manifest, popup, message types, content script, scanner, matcher, filler, and sidebar (`manifest.json:6-23`, `src/popup/Popup.tsx:47-77`, `src/shared/messages.ts:3-20`, `src/content/contentScript.ts:14-93`, `src/content/scanner.ts:6-67`, `src/shared/fieldMatchers.ts:47-85`, `src/content/filler.ts:12-37`, `src/sidebar/renderSidebar.ts:6-68`).

## Why Missions Are Ordered This Way

Junior missions begin with concrete entry points and small components because the repo has no router or server to hide behind; the visible surfaces are popup, options, and content script registration (`popup.html:8-10`, `options.html:8-10`, `manifest.json:17-22`). Mid-level missions add state, custom-hook gap analysis, side effects, and API contracts because the architecture uses Chrome messaging instead of HTTP (`src/shared/messages.ts:3-20`, `src/content/contentScript.ts:14-21`). Senior missions focus on safety, performance, security, and missing tests because autofilling job applications has a high cost for wrong behavior (`src/shared/confidence.ts:3-5`, `src/shared/fieldMatchers.ts:55-65`, `src/content/filler.ts:21-24`).

## Code Paths Chosen

The central path is "Autofill current page": popup button -> active tab message -> content handler -> profile storage -> adapter -> scanner -> matcher -> filler -> sidebar (`src/popup/Popup.tsx:47-77`, `src/content/contentScript.ts:34-93`). This path was chosen because it crosses almost every important ownership boundary in the project.

## Skill By Tier

Junior tier builds code-reading fluency: entry points, folders, components, routes-as-messages, props/contracts, data loading, and navigation/context structure (`src/popup/main.tsx:1-10`, `src/options/main.tsx:1-10`, `src/shared/types.ts:39-70`). Mid-level tier builds change ownership: state placement, side effects, message contracts, full feature traces, diffs, composition, and TypeScript inference (`src/content/contentScript.ts:11-12`, `src/shared/messages.ts:3-20`, `src/shared/fieldMatchers.ts:47-85`). Senior tier builds judgment: architecture decisions, bug prediction, performance/security audit, missing tests, and history reconstruction (`src/shared/profileSchema.ts:3-20`, `src/content/scanner.ts:13-20`, `src/sidebar/renderSidebar.ts:53-57`).

## Senior Engineer Checkpoint Behavior

A senior engineer would not answer "this works" without checking safety gates, runtime validation, data exposure, rollback, and tests. The lines to keep revisiting are `src/shared/confidence.ts:3-5`, `src/shared/fieldMatchers.ts:55-65`, `src/content/filler.ts:21-37`, `src/shared/profileSchema.ts:3-20`, and `src/shared/fieldMatchers.test.ts:15-48`.

