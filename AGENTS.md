# AGENTS.md

## Commands

- Node 24 (`.node-version`). `npm run dev` (root path), `npm run build` (includes `tsc`),
  `npm run preview` (serves under `/singing-made-easy/`, like GitHub Pages).

## Conventions

- Code, comments, docs and commits in English; **UI text stays in French**.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`, `test:`).
- Vanilla TypeScript, no UI framework. Prefer a well-maintained library over
  reimplementing something non-trivial.

## Gotchas

- GitHub Pages serves the app under `/singing-made-easy/`: `vite.config.ts` sets
  this base for `build` and `preview` only.
- The microphone only works in a secure context (HTTPS or `localhost`).
- Settings persist in users' `localStorage`: renaming a stored value needs a
  migration in `loadSettings()`.
- If the dev server behaves unlike the source after many edits, restart it.

## Verifying changes

No automated tests yet. `npm run build` must pass; check changes in the browser.
For audio, Chromium can fake a microphone with `--use-fake-device-for-media-stream`
and `--use-file-for-fake-audio-capture=<tone.wav>`.
