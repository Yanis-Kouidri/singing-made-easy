import { expect, test } from '@playwright/test';
import { TONE_RANGE, fakeMicArgs } from './audio';

// The fake microphone sings G2, pauses, then sings C4.
test.use({ launchOptions: { args: fakeMicArgs(TONE_RANGE) } });

test('measures the vocal range and suggests a voice type', async ({ page }) => {
  await page.goto('./');
  await page.locator('#range-test').click();

  const hint = page.locator('#hint');
  await expect(hint).toContainText('Test 2/2', { timeout: 15_000 });
  await expect(hint).toContainText("proche d'une voix de basse", { timeout: 20_000 });

  // G2–C4 measured, with a semitone of margin on each side.
  await expect(page.locator('#voice')).toHaveValue('custom');
  await expect(page.locator('#range-text')).toHaveText('Sol♯2 → Si3');
  await expect(page.locator('#note-detail')).toContainText('G♯2');
});
