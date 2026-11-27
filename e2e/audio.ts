import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Fake microphone input for Chromium. The browser loops a WAV file in
 * place of the real microphone, so tests can "sing" a known pitch.
 */

const AUDIO_DIR = join(tmpdir(), 'singing-made-easy-e2e');

/** A steady G2 (98 Hz), the lowest note of the bass range. */
export const TONE_G2 = join(AUDIO_DIR, 'g2.wav');
/** Range test: low G2, a pause, then high C4 (261.6 Hz). */
export const TONE_RANGE = join(AUDIO_DIR, 'range.wav');

/** Chromium flags that grant microphone access and feed it `wavFile`. */
export function fakeMicArgs(wavFile: string): string[] {
  return [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wavFile}`,
    '--autoplay-policy=no-user-gesture-required',
  ];
}

interface Segment {
  /** Fundamental frequency in Hz, or null for silence. */
  freq: number | null;
  seconds: number;
}

const SAMPLE_RATE = 48_000;

/** Writes a 16-bit mono WAV of voice-like tones (fundamental + harmonics). */
export function writeToneWav(file: string, segments: Segment[]): void {
  const samples: number[] = [];
  for (const { freq, seconds } of segments) {
    const count = Math.round(seconds * SAMPLE_RATE);
    for (let i = 0; i < count; i++) {
      const t = i / SAMPLE_RATE;
      samples.push(
        freq === null
          ? 0
          : 0.3 * Math.sin(2 * Math.PI * freq * t) +
              0.15 * Math.sin(4 * Math.PI * freq * t) +
              0.05 * Math.sin(6 * Math.PI * freq * t),
      );
    }
  }

  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767), i * 2));

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([header, data]));
}
