# Mission Learning Path

This suite is a training campaign for `eli apply mate`, a local Chrome extension that fills job application forms only after explicit user action (`manifest.json:3-23`, `src/popup/Popup.tsx:47-56`). You are not reading passively. Each mission asks you to trace code, annotate behavior, answer review questions, and connect the system pieces.

Recommended pacing:

1. Do one junior mission per sitting until you can explain the popup -> content-script path without notes.
2. Do one mid-level mission per sitting and write your own call stack before checking the self-grade section.
3. Do senior missions like code-review drills: name the risk, cite the line, propose a safer change.

How to self-grade: a strong answer names exact files and line ranges, explains what each block owns, and states what would break if that block changed carelessly. The project has no HTTP backend, database, ORM, auth layer, or custom React hook files; where missions mention those concepts, they translate them into the extension equivalents: Chrome messages, Chrome local storage, and direct React state (`src/shared/messages.ts:3-20`, `src/shared/storage.ts:5-22`, `src/popup/Popup.tsx:9-11`, `src/options/Options.tsx:7-14`).

This suite differs from normal docs because every mission is designed to make you do a real engineering action: trace, compare, annotate, debug, review, or explain.

