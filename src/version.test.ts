import { describe, expect, it } from 'vitest';
import { versionInfo } from './version';

const SHA = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';

describe('versionInfo', () => {
  it('shows the version and short commit, linking to the commit', () => {
    expect(versionInfo('0.1.0', SHA)).toEqual({
      label: 'v0.1.0 · 1a2b3c4',
      url: `https://github.com/Yanis-Kouidri/singing-made-easy/commit/${SHA}`,
    });
  });

  it('falls back to the version and repository when the commit is unknown', () => {
    expect(versionInfo('0.1.0', '')).toEqual({
      label: 'v0.1.0',
      url: 'https://github.com/Yanis-Kouidri/singing-made-easy',
    });
  });
});
