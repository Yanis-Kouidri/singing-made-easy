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

- `npm test` — Vitest unit tests (`src/**/*.test.ts`) for the pure logic.
- `npm run test:e2e` — Playwright tests (`e2e/`) on the production build, in
  Chromium with a fake microphone fed by generated WAV tones (`e2e/audio.ts`).
- Add or update tests with each change; CI runs both and blocks deployment on failure.
