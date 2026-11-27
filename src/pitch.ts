import { PitchDetector } from 'pitchy';

/** Ce que le micro entend à un instant donné. */
export interface PitchReading {
  /** Fréquence lissée en Hz, ou null si aucune note claire n'est chantée. */
  freq: number | null;
  /** Niveau sonore en dB (0 = maximum), pour l'indicateur de micro. */
  levelDb: number;
}

// Fenêtre d'analyse : 2048 échantillons ≈ 43 ms à 48 kHz, assez pour
// capter des voix graves (~65 Hz) tout en restant réactif.
const WINDOW_SIZE = 2048;
// En dessous de cette « clarté » (0–1), le son est jugé trop bruité.
const MIN_CLARITY = 0.9;
// Silence en dessous de ce niveau.
const MIN_LEVEL_DB = -50;
// Fréquences plausibles pour une voix humaine.
const MIN_FREQ = 60;
const MAX_FREQ = 1400;
// Lissage : médiane des dernières mesures valides.
const MEDIAN_SIZE = 5;
// Nombre de mesures invalides d'affilée avant de considérer la note finie.
const MAX_MISSES = 4;

/**
 * Écoute le micro et estime la hauteur de la voix avec l'algorithme
 * McLeod (bibliothèque pitchy). À appeler une fois par image (`read`).
 */
export class PitchTracker {
  private readonly buffer = new Float32Array(WINDOW_SIZE);
  private readonly detector = PitchDetector.forFloat32Array(WINDOW_SIZE);
  private readonly recent: number[] = [];
  private misses = 0;

  private readonly ctx: AudioContext;
  private readonly stream: MediaStream;
  private readonly analyser: AnalyserNode;

  private constructor(ctx: AudioContext, stream: MediaStream, analyser: AnalyserNode) {
    this.ctx = ctx;
    this.stream = stream;
    this.analyser = analyser;
    this.detector.clarityThreshold = MIN_CLARITY;
    this.detector.minVolumeDecibels = MIN_LEVEL_DB;
  }

  static async create(ctx: AudioContext): Promise<PitchTracker> {
    // On désactive les traitements du navigateur : ils sont pensés pour
    // la parole en visio et déforment le signal d'une voix chantée.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = WINDOW_SIZE;
    source.connect(analyser);
    return new PitchTracker(ctx, stream, analyser);
  }

  read(): PitchReading {
    this.analyser.getFloatTimeDomainData(this.buffer);
    const levelDb = rmsDb(this.buffer);
    const [freq, clarity] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);

    const valid = clarity >= MIN_CLARITY && freq >= MIN_FREQ && freq <= MAX_FREQ;
    if (!valid) {
      if (++this.misses >= MAX_MISSES) this.recent.length = 0;
      return { freq: this.recent.length ? median(this.recent) : null, levelDb };
    }

    this.misses = 0;
    this.recent.push(freq);
    if (this.recent.length > MEDIAN_SIZE) this.recent.shift();
    return { freq: median(this.recent), levelDb };
  }

  stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
  }
}

function rmsDb(buf: Float32Array): number {
  let sum = 0;
  for (const v of buf) sum += v * v;
  const rms = Math.sqrt(sum / buf.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
