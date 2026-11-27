import { describe, expect, it } from 'vitest';
import { VOICE_TYPES, clampToRange, closestVoiceType, formatRange, randomNote } from './voices';

const bass = VOICE_TYPES.find((v) => v.id === 'bass')!;

describe('VOICE_TYPES', () => {
  it('has unique ids and valid, ordered ranges', () => {
    expect(new Set(VOICE_TYPES.map((v) => v.id)).size).toBe(VOICE_TYPES.length);
    for (const v of VOICE_TYPES) expect(v.low).toBeLessThan(v.high);
    const centers = VOICE_TYPES.map((v) => v.low + v.high);
    expect(centers).toEqual([...centers].sort((a, b) => a - b));
  });
});

describe('formatRange', () => {
  it('shows solfège names with octaves', () => {
    expect(formatRange(bass)).toBe('Sol2 → Do4');
  });
});

describe('closestVoiceType', () => {
  it('matches each voice type to itself', () => {
    for (const v of VOICE_TYPES) expect(closestVoiceType(v).id).toBe(v.id);
  });

  it('classifies a measured range by its centre', () => {
    expect(closestVoiceType({ low: 40, high: 62 }).id).toBe('bass');
    expect(closestVoiceType({ low: 60, high: 84 }).id).toBe('soprano');
  });
});

describe('clampToRange', () => {
  it('keeps notes inside the range', () => {
    expect(clampToRange(bass, 30)).toBe(bass.low);
    expect(clampToRange(bass, 70)).toBe(bass.high);
    expect(clampToRange(bass, 50)).toBe(50);
  });
});

describe('randomNote', () => {
  it('stays in range, never repeats the current note and reaches every other note', () => {
    for (let current = bass.low; current <= bass.high; current++) {
      const seen = new Set<number>();
      for (let i = 0; i < 500; i++) {
        const note = randomNote(bass, current);
        expect(note).not.toBe(current);
        expect(note).toBeGreaterThanOrEqual(bass.low);
        expect(note).toBeLessThanOrEqual(bass.high);
        seen.add(note);
      }
      expect(seen.size).toBe(bass.high - bass.low);
    }
  });

  it('returns the only note of a one-note range', () => {
    expect(randomNote({ low: 50, high: 50 }, 50)).toBe(50);
  });
});
