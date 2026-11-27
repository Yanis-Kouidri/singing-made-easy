import { noteName } from './music';

interface Point {
  t: number;
  cents: number | null;
}

/** Durée d'historique affichée, en secondes. */
const WINDOW_SECONDS = 6;
/** Amplitude verticale : ±3 demi-tons autour de la cible. */
const RANGE_CENTS = 300;

/**
 * Graphique défilant : la cible est la ligne du milieu, la voix est
 * une courbe qui avance de droite à gauche. On voit tout de suite si
 * l'on est au-dessus ou en dessous, et dans quel sens corriger.
 */
export class PitchGraph {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private points: Point[] = [];
  private colors = readColors();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.colors = readColors();
    });
    this.resize();
  }

  push(t: number, cents: number | null): void {
    this.points.push({ t, cents });
    const cutoff = t - WINDOW_SECONDS - 0.5;
    while (this.points.length && this.points[0].t < cutoff) this.points.shift();
  }

  clear(): void {
    this.points = [];
  }

  draw(now: number, targetMidi: number, toleranceCents: number): void {
    const { ctx, colors } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const labelWidth = 52;
    const plotW = w - labelWidth;
    const y = (cents: number) => h / 2 - (cents / RANGE_CENTS) * (h / 2 - 8);
    const x = (t: number) => labelWidth + plotW - ((now - t) / WINDOW_SECONDS) * plotW;

    ctx.clearRect(0, 0, w, h);

    // Zone de tolérance.
    ctx.fillStyle = colors.band;
    ctx.fillRect(labelWidth, y(toleranceCents), plotW, y(-toleranceCents) - y(toleranceCents));

    // Une ligne par demi-ton, avec le nom de la note.
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (let st = -3; st <= 3; st++) {
      const yy = Math.round(y(st * 100)) + 0.5;
      const isTarget = st === 0;
      ctx.strokeStyle = isTarget ? colors.target : colors.grid;
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(labelWidth, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();

      ctx.fillStyle = isTarget ? colors.target : colors.muted;
      ctx.font = `${isTarget ? 600 : 400} 12px system-ui, sans-serif`;
      ctx.fillText(noteName(targetMidi + st).fr, 6, yy);
    }

    // Courbe de la voix, coupée pendant les silences.
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let prev: Point | null = null;
    for (const p of this.points) {
      if (p.cents === null || prev === null || prev.cents === null) {
        prev = p;
        continue;
      }
      const c = clamp(p.cents);
      ctx.strokeStyle = Math.abs(p.cents) <= toleranceCents ? colors.good : colors.off;
      ctx.beginPath();
      ctx.moveTo(x(prev.t), y(clamp(prev.cents)));
      ctx.lineTo(x(p.t), y(c));
      ctx.stroke();
      prev = p;
    }

    // Point « où je suis maintenant ».
    const last = this.points.at(-1);
    if (last && last.cents !== null && now - last.t < 0.2) {
      ctx.fillStyle = Math.abs(last.cents) <= toleranceCents ? colors.good : colors.off;
      ctx.beginPath();
      ctx.arc(x(last.t), y(clamp(last.cents)), 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function clamp(cents: number): number {
  return Math.max(-RANGE_CENTS, Math.min(RANGE_CENTS, cents));
}

function readColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    grid: v('--grid'),
    muted: v('--text-muted'),
    target: v('--text'),
    band: v('--good-soft'),
    good: v('--good'),
    off: v('--off'),
  };
}
