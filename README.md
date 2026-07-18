# eli apply mate

A local personal Chrome extension for cautious job application autofill.

It fills only high-confidence standardized fields after you click a button. It never submits applications, never uploads files, never makes network calls, and stores profile data only in `chrome.storage.local`.

## What v0.2 includes

- Chrome Extension Manifest V3
- TypeScript and React
- **Multiple profile versions** — keep separate content (e.g. a frontend resume vs. a backend resume) and switch between them from the popup or options page
- **Import / export** — upload a profile JSON file to create a new version, download any version as a file backup
- Popup controls for autofill, detection, rollback, and profile switching
- Profile manager in the options page: create, duplicate, rename, delete, reset, edit JSON
- Deep save-time validation with precise error messages (`education[0].start.month must be...`)
- Deterministic field scanning and mapping with label-priority matching (a field only fills with high confidence when its **own** label matches, so neighboring questions on the same form can't cross-contaminate)
- Cautious contact, authorization, EEO, education, work history, and exact years-of-experience filling
- Injected review panel with filled, skipped, unsure, and missing required fields (Escape closes it)
- On-demand content script injection — the extension no longer runs on every page, only on the tab where you click it
- Site adapter stubs for Greenhouse, Lever, Workday, Ashby, plus a generic adapter
- Local fake application page plus a 61-test suite (unit + jsdom integration against the fake page)

## Setup

```sh
npm install
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `dist` folder created by `npm run build`.
5. Pin `eli apply mate` if you want quick access.

After code changes, run `npm run build`, then click the extension reload button in `chrome://extensions`.

## Profile versions

Open the extension options page from `chrome://extensions`, or right-click the extension icon and choose `Options`.

- The left column lists your profile versions; the marked one is what autofill uses.
- **New version** starts from the placeholder sample; **Duplicate** copies the selected version so you can tweak one section.
- **Import JSON file** uploads a `.json` profile (it is validated before anything is saved) and makes it the active version.
- **Export** downloads the selected version as `<name>.profile.json` — treat that file like your resume; it contains everything in the version.
- The popup has a `Profile version` dropdown for quick switching before you autofill a page.

Profiles from the previous single-profile format are migrated automatically into a version named `Default` the first time the new build runs.

The starter profile lives in [src/shared/sampleProfile.ts](./src/shared/sampleProfile.ts). Use placeholder data until you are ready to add real local-only data.

## Test with the fake application page

Run:

```sh
npm run serve:test
```

Then open:

```text
http://127.0.0.1:5174/fake-application.html
```

Click the extension icon and choose `Autofill current page`. Review the injected panel before changing anything else.

## Run the automated tests

```sh
npm test          # 61 vitest tests: matchers, schema, storage, filler, scanner, and an end-to-end jsdom run against the fake page
npm run typecheck
```

## Safety notes

- The extension never clicks submit, apply, continue, next, finish, send, or similar buttons.
- Resume upload, cover letter, and job-specific text fields are skipped in v1.
- Medium and low confidence fields are shown for review instead of being filled.
- Work authorization and EEO fields require clear labels and clearly matching options; yes/no answers are never typed into free-text fields.
- The content script is injected only when you click the extension on a tab (`activeTab` + `scripting`) — there are no `<all_urls>` host permissions.
- The review panel's "Copy debug JSON" redacts anything you had already typed on the page.
- No backend, API key, AI service, or remote storage is used.
