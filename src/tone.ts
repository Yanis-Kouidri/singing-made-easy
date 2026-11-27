/**
 * Joue une note de référence, avec un son doux (onde triangle filtrée)
 * plus agréable et plus facile à imiter qu'une sinusoïde pure.
 * La promesse se résout quand la note est terminée.
 */
export function playNote(ctx: AudioContext, freq: number, duration = 1.6): Promise<void> {
  const now = ctx.currentTime;
  const attack = 0.03;
  const release = 0.35;
  const end = now + duration;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(4000, freq * 6);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + attack);
  gain.gain.setValueAtTime(0.35, end - release);
  gain.gain.linearRampToValueAtTime(0, end);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(end + 0.05);

  return new Promise((resolve) => {
    osc.onended = () => resolve();
  });
}
