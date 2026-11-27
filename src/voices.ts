import { noteName, octaveOf } from './music';

/** A span of notes, as inclusive MIDI note numbers. */
export interface Range {
  low: number;
  high: number;
}

export interface VoiceType extends Range {
  id: string;
  /** Label shown in the UI. */
  label: string;
}

/**
 * Comfortable ranges for beginners: deliberately narrower than classical
 * voice ranges, so the singer never has to strain.
 */
export const VOICE_TYPES: VoiceType[] = [
  { id: 'bass', label: 'Basse', low: 43, high: 60 }, // G2 → C4
  { id: 'baritone', label: 'Baryton', low: 47, high: 64 }, // B2 → E4
  { id: 'tenor', label: 'Ténor', low: 50, high: 67 }, // D3 → G4
  { id: 'alto', label: 'Alto', low: 55, high: 72 }, // G3 → C5
  { id: 'mezzo', label: 'Mezzo-soprano', low: 59, high: 76 }, // B3 → E5
  { id: 'soprano', label: 'Soprano', low: 62, high: 79 }, // D4 → G5
];

/** Formats a range for display, e.g. "Sol2 → Do4". */
export function formatRange(r: Range): string {
  return `${noteName(r.low).solfege}${octaveOf(r.low)} → ${noteName(r.high).solfege}${octaveOf(r.high)}`;
}

/** Voice type whose centre is closest to the measured range. */
export function closestVoiceType(r: Range): VoiceType {
  const center = (r.low + r.high) / 2;
  return VOICE_TYPES.reduce((best, v) =>
    Math.abs((v.low + v.high) / 2 - center) < Math.abs((best.low + best.high) / 2 - center) ? v : best,
  );
}

/** Keeps a note within the range. */
export function clampToRange(r: Range, midi: number): number {
  return Math.min(r.high, Math.max(r.low, midi));
}

/** A random note within the range, different from the current one. */
export function randomNote(r: Range, current: number): number {
  const span = r.high - r.low;
  if (span === 0) return r.low;
  // Draw among the `span` other notes, then skip over the current one.
  const pick = r.low + Math.floor(Math.random() * span);
  return pick >= current ? pick + 1 : pick;
}
