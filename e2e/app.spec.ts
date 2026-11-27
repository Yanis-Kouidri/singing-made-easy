import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The fake microphone sings a steady G2 (see playwright.config.ts).

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('starts on the lowest note of the bass range', async ({ page }) => {
  await expect(page.locator('#voice')).toHaveValue('bass');
  await expect(page.locator('#range-text')).toHaveText('Sol2 → Do4');
  await expect(page.locator('#note-name')).toHaveText('Sol');
  await expect(page.locator('#note-detail')).toContainText('G2');
});

test('−/+ buttons stay within the voice range', async ({ page }) => {
  const down = page.locator('#note-down');
  const up = page.locator('#note-up');
  const detail = page.locator('#note-detail');

  await expect(down).toBeDisabled();
  await up.click();
  await expect(detail).toContainText('G♯2');
  await down.click();
  await expect(detail).toContainText('G2');

  // G2 → C4 is 17 semitones.
  for (let i = 0; i < 17; i++) await up.click();
  await expect(detail).toContainText('C4');
  await expect(up).toBeDisabled();
});

test('changing the voice moves to its lowest note', async ({ page }) => {
  await page.locator('#voice').selectOption('soprano');
  await expect(page.locator('#range-text')).toHaveText('Ré4 → Sol5');
  await expect(page.locator('#note-detail')).toContainText('D4');
});

test('"Autre note" picks another note', async ({ page }) => {
  const detail = page.locator('#note-detail');
  const before = await detail.textContent();
  await page.locator('#other-note').click();
  await expect(detail).not.toHaveText(before!);
});

test('holding the target note completes the exercise', async ({ page }) => {
  await page.locator('#start').click();
  await expect(page.locator('#result')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#hint')).toContainText('Bravo');
  await expect(page.locator('#stat-accuracy')).toHaveText(/\d+ %/);

  const next = page.locator('#next');
  await expect(next).toHaveText('Note suivante (Sol♯)');
  await next.click();
  await expect(page.locator('#note-detail')).toContainText('G♯2');
  await expect(page.locator('#start')).toHaveText('Arrêter');
});

test('shows the built version and commit in the footer', async ({ page }) => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const sha = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  const link = page.locator('#version');
  await expect(link).toHaveText(`v${version} · ${sha.slice(0, 7)}`);
  await expect(link).toHaveAttribute('href', `https://github.com/Yanis-Kouidri/singing-made-easy/commit/${sha}`);
});

test('migrates voice ids saved by earlier versions', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('sme-settings', JSON.stringify({ voice: 'baryton' })));
  await page.reload();
  await expect(page.locator('#voice')).toHaveValue('baritone');
  await expect(page.locator('#range-text')).toHaveText('Si2 → Mi4');
});
