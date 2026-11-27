import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from a subfolder:
  // https://yanis-kouidri.github.io/singing-made-easy/
  // The build and `vite preview` use it too; the dev server stays at
  // the root (http://localhost:5173/).
  base: command === 'build' || isPreview ? '/singing-made-easy/' : '/',
  test: {
    // Unit tests live next to the code; Playwright owns e2e/.
    include: ['src/**/*.test.ts'],
  },
}));
