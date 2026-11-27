import { TONE_G2, TONE_RANGE, writeToneWav } from './audio';

/** Generates the fake microphone recordings once, before any test runs. */
export default function globalSetup(): void {
  writeToneWav(TONE_G2, [{ freq: 98, seconds: 10 }]);
  writeToneWav(TONE_RANGE, [
    { freq: 98, seconds: 3 }, // G2
    { freq: null, seconds: 1.5 },
    { freq: 261.63, seconds: 4 }, // C4
    { freq: null, seconds: 1.5 },
  ]);
}
