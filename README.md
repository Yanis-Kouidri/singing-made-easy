# Singing Made Easy

A web app to learn to sing in tune. It plays a note, listens to your voice through the microphone and shows you in real time whether you are too high, too low or spot on.

**👉 Try it: https://yanis-kouidri.github.io/singing-made-easy/**

> The app's interface is in French.

## Features

- **"Hold a note" exercise**: the app plays a note, you sing it and hold it within the in-tune zone for a few seconds.
- **Live feedback**: a scrolling chart of your voice against the target note, the distance in cents (100 cents = 1 semitone) and which way to correct.
- **Voice types** (bass to soprano) and a **range test** to practise within a comfortable range.
- **Low-to-high progression**, manual note selection or a random note.
- **Adjustable tolerance** (±50, ±25 or ±10 cents) and hold duration.

Everything runs in the browser: no audio is recorded or sent over the Internet.

## Tips

- Use a recent browser (Chrome, Edge, Firefox or Safari) and allow microphone access.
- Headphones are recommended, so the microphone does not pick up the reference note.
- Reference notes use standard tuning (A = 440 Hz).

## Development

Requires Node 24 (see `.node-version`).

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build locally
npm test         # unit tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright, Chromium)
```

Before the first end-to-end run, install the browser with `npx playwright install chromium`. The end-to-end tests replace the microphone with generated audio tones, so they need no real microphone.

Stack: [Vite](https://vite.dev) + TypeScript, no framework. Pitch detection uses [pitchy](https://github.com/ianprime0509/pitchy) (McLeod Pitch Method).

## Deployment

The [`.github/workflows/ci.yml`](.github/workflows/ci.yml) workflow runs the tests on every push and pull request. On `main`, once they pass, it builds the app and publishes it to GitHub Pages.

## Contributing

Code, comments and commit messages are written in English. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`…).

## License

Released under the [MIT License](LICENSE): you may reuse, modify and redistribute this code freely, as long as you keep the copyright notice.
