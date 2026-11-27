import { noteName } from './music';

/** Une zone de notes, en numéros MIDI inclusifs. */
export interface Range {
  low: number;
  high: number;
}

export interface VoiceType extends Range {
  id: string;
  label: string;
}

/**
 * Zones confortables pour débuter : volontairement plus étroites que les
 * tessitures classiques, pour ne jamais avoir à forcer.
 */
export const VOICE_TYPES: VoiceType[] = [
  { id: 'basse', label: 'Basse', low: 43, high: 60 }, // Sol2 → Do4
  { id: 'baryton', label: 'Baryton', low: 47, high: 64 }, // Si2 → Mi4
  { id: 'tenor', label: 'Ténor', low: 50, high: 67 }, // Ré3 → Sol4
  { id: 'alto', label: 'Alto', low: 55, high: 72 }, // Sol3 → Do5
  { id: 'mezzo', label: 'Mezzo-soprano', low: 59, high: 76 }, // Si3 → Mi5
  { id: 'soprano', label: 'Soprano', low: 62, high: 79 }, // Ré4 → Sol5
];

export function formatRange(r: Range): string {
  return `${noteName(r.low).fr}${octaveOf(r.low)} → ${noteName(r.high).fr}${octaveOf(r.high)}`;
}

function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** Catégorie dont le centre est le plus proche de la zone mesurée. */
export function closestVoiceType(r: Range): VoiceType {
  const center = (r.low + r.high) / 2;
  return VOICE_TYPES.reduce((best, v) =>
    Math.abs((v.low + v.high) / 2 - center) < Math.abs((best.low + best.high) / 2 - center) ? v : best,
  );
}

/** Ramène une note dans la zone. */
export function clampToRange(r: Range, midi: number): number {
  return Math.min(r.high, Math.max(r.low, midi));
}

/** Une note au hasard dans la zone, différente de la note actuelle. */
export function randomNote(r: Range, current: number): number {
  const span = r.high - r.low;
  if (span === 0) return r.low;
  // On tire parmi les `span` autres notes, puis on saute la note actuelle.
  const pick = r.low + Math.floor(Math.random() * span);
  return pick >= current ? pick + 1 : pick;
}
