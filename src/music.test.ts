import { describe, expect, it } from 'vitest';
import { centsFromTarget, clampMidi, freqToMidi, midiToFreq, noteName, octaveOf } from './music';

describe('midiToFreq / freqToMidi', () => {
  it('maps A4 to 440 Hz', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(freqToMidi(440)).toBe(69);
  });

  it('doubles the frequency every octave', () => {
    expect(midiToFreq(57)).toBeCloseTo(220);
    expect(midiToFreq(81)).toBeCloseTo(880);
  });

  it('round-trips', () => {
    for (let midi = 36; midi <= 84; midi++) {
      expect(freqToMidi(midiToFreq(midi))).toBeCloseTo(midi, 10);
    }
  });
});

describe('noteName', () => {
  it.each([
    [60, 'Do', 'C4'],
    [61, 'Do♯', 'C♯4'],
    [43, 'Sol', 'G2'],
    [69, 'La', 'A4'],
    [71, 'Si', 'B4'],
  ])('names MIDI %i as %s / %s', (midi, solfege, scientific) => {
    expect(noteName(midi)).toEqual({ solfege, scientific });
  });

  it('rounds to the nearest note', () => {
    expect(noteName(59.6).scientific).toBe('C4');
  });
});

describe('octaveOf', () => {
  it('follows scientific pitch notation (middle C = C4)', () => {
    expect(octaveOf(60)).toBe(4);
    expect(octaveOf(59)).toBe(3);
    expect(octaveOf(36)).toBe(2);
  });
});

describe('centsFromTarget', () => {
  const target = 60; // C4

  it('is 0 on the target and ±100 one semitone away', () => {
    expect(centsFromTarget(midiToFreq(60), target, false)).toBeCloseTo(0);
    expect(centsFromTarget(midiToFreq(61), target, false)).toBeCloseTo(100);
    expect(centsFromTarget(midiToFreq(59), target, false)).toBeCloseTo(-100);
  });

  it('keeps the octave difference when not folding', () => {
    expect(centsFromTarget(midiToFreq(48), target, false)).toBeCloseTo(-1200);
  });

  it('treats another octave as in tune when folding', () => {
    expect(centsFromTarget(midiToFreq(48), target, true)).toBeCloseTo(0);
    expect(centsFromTarget(midiToFreq(72), target, true)).toBeCloseTo(0);
    expect(centsFromTarget(midiToFreq(49), target, true)).toBeCloseTo(100);
  });

  it('folds into [-600, 600)', () => {
    expect(centsFromTarget(midiToFreq(66), target, true)).toBeCloseTo(-600);
    expect(centsFromTarget(midiToFreq(65), target, true)).toBeCloseTo(500);
    expect(centsFromTarget(midiToFreq(55), target, true)).toBeCloseTo(-500);
  });
});

describe('clampMidi', () => {
  it('keeps notes within C2–C6 and rounds them', () => {
    expect(clampMidi(20)).toBe(36);
    expect(clampMidi(100)).toBe(84);
    expect(clampMidi(60.4)).toBe(60);
  });
});
