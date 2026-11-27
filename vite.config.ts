import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

/** Commit being built: provided by GitHub Actions, otherwise read from git. */
function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from a subfolder:
  // https://yanis-kouidri.github.io/singing-made-easy/
  // The build and `vite preview` use it too; the dev server stays at
  // the root (http://localhost:5173/).
  base: command === 'build' || isPreview ? '/singing-made-easy/' : '/',
  // Build-time constants, declared in src/globals.d.ts.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __COMMIT_SHA__: JSON.stringify(commitSha()),
  },
  test: {
    // Unit tests live next to the code; Playwright owns e2e/.
    include: ['src/**/*.test.ts'],
  },
}));
