import { noteName } from './music';

interface Point {
  t: number;
  cents: number | null;
}

/** Length of the visible history, in seconds. */
const WINDOW_SECONDS = 6;
/** Vertical span: ±3 semitones around the target. */
const RANGE_CENTS = 300;

/**
 * Scrolling chart: the target is the middle line and the voice is a
 * curve moving right to left. The singer can see at a glance whether
 * they are above or below, and which way to correct.
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

    // Tolerance band.
    ctx.fillStyle = colors.band;
    ctx.fillRect(labelWidth, y(toleranceCents), plotW, y(-toleranceCents) - y(toleranceCents));

    // One line per semitone, labelled with the note name.
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
      ctx.fillText(noteName(targetMidi + st).solfege, 6, yy);
    }

    // Voice curve, broken during silences.
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let prev: Point | null = null;
    for (const p of this.points) {
      if (p.cents === null || prev === null || prev.cents === null) {
        prev = p;
        continue;
      }
      ctx.strokeStyle = Math.abs(p.cents) <= toleranceCents ? colors.good : colors.off;
      ctx.beginPath();
      ctx.moveTo(x(prev.t), y(clamp(prev.cents)));
      ctx.lineTo(x(p.t), y(clamp(p.cents)));
      ctx.stroke();
      prev = p;
    }

    // "Where I am now" dot.
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
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    grid: v('--grid'),
    muted: v('--text-muted'),
    target: v('--text'),
    band: v('--good-soft'),
    good: v('--good'),
    off: v('--off'),
  };
}
