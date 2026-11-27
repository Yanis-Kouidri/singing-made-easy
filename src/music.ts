// Notes et fréquences. On travaille en numéros MIDI (69 = La 440 Hz)
// car un demi-ton = 1, ce qui rend les calculs d'écart très simples.

const A4_FREQ = 440;
const A4_MIDI = 69;

const NAMES_FR = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const NAMES_EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Plage de notes proposée : C2 (65 Hz) à C6 (1046 Hz). */
export const MIN_MIDI = 36;
export const MAX_MIDI = 84;

export function midiToFreq(midi: number): number {
  return A4_FREQ * 2 ** ((midi - A4_MIDI) / 12);
}

export function freqToMidi(freq: number): number {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

export interface NoteName {
  /** Nom en solfège, sans octave : « Sol♯ ». */
  fr: string;
  /** Notation scientifique avec octave : « G♯3 ». */
  sci: string;
}

export function noteName(midi: number): NoteName {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { fr: NAMES_FR[pc], sci: `${NAMES_EN[pc]}${octave}` };
}

/**
 * Écart en cents entre une fréquence chantée et la note cible.
 * 100 cents = 1 demi-ton. Positif = trop haut, négatif = trop bas.
 *
 * Avec `foldOctaves`, une note juste mais à une autre octave compte
 * comme juste : l'écart est ramené dans [-600, 600[.
 */
export function centsFromTarget(freq: number, targetMidi: number, foldOctaves: boolean): number {
  const cents = (freqToMidi(freq) - targetMidi) * 100;
  if (!foldOctaves) return cents;
  return ((((cents + 600) % 1200) + 1200) % 1200) - 600;
}

export function clampMidi(midi: number): number {
  return Math.min(MAX_MIDI, Math.max(MIN_MIDI, Math.round(midi)));
}
