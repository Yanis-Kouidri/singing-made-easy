// Notes and frequencies. We work with MIDI note numbers (69 = A 440 Hz)
// because one semitone = 1, which keeps interval maths trivial.

const A4_FREQ = 440;
const A4_MIDI = 69;

const SOLFEGE_NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const LETTER_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Supported note range: C2 (65 Hz) to C6 (1046 Hz). */
export const MIN_MIDI = 36;
export const MAX_MIDI = 84;

export function midiToFreq(midi: number): number {
  return A4_FREQ * 2 ** ((midi - A4_MIDI) / 12);
}

export function freqToMidi(freq: number): number {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

export interface NoteName {
  /** Solfège name without octave, as shown in the UI: "Sol♯". */
  solfege: string;
  /** Scientific pitch notation with octave: "G♯3". */
  scientific: string;
}

export function noteName(midi: number): NoteName {
  const m = Math.round(midi);
  const pitchClass = ((m % 12) + 12) % 12;
  return { solfege: SOLFEGE_NAMES[pitchClass], scientific: `${LETTER_NAMES[pitchClass]}${octaveOf(m)}` };
}

/** Octave number in scientific pitch notation (middle C = C4). */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

/**
 * Distance in cents between a sung frequency and the target note.
 * 100 cents = 1 semitone. Positive = sharp, negative = flat.
 *
 * With `foldOctaves`, a correct note in another octave counts as in tune:
 * the result is folded into [-600, 600).
 */
export function centsFromTarget(freq: number, targetMidi: number, foldOctaves: boolean): number {
  const cents = (freqToMidi(freq) - targetMidi) * 100;
  if (!foldOctaves) return cents;
  return ((((cents + 600) % 1200) + 1200) % 1200) - 600;
}

export function clampMidi(midi: number): number {
  return Math.min(MAX_MIDI, Math.max(MIN_MIDI, Math.round(midi)));
}
