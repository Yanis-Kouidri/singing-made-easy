import { PitchDetector } from 'pitchy';

/** What the microphone hears at a given moment. */
export interface PitchReading {
  /** Smoothed frequency in Hz, or null when no clear note is being sung. */
  freq: number | null;
  /** Signal level in dB (0 = maximum), for the microphone meter. */
  levelDb: number;
}

// Analysis window: 2048 samples ≈ 43 ms at 48 kHz, long enough for low
// voices (~65 Hz) while staying responsive.
const WINDOW_SIZE = 2048;
// Below this clarity (0–1), the sound is considered too noisy.
const MIN_CLARITY = 0.9;
// Silence below this level.
const MIN_LEVEL_DB = -50;
// Plausible frequencies for a human voice.
const MIN_FREQ = 60;
const MAX_FREQ = 1400;
// Smoothing: median of the latest valid readings.
const MEDIAN_SIZE = 5;
// Consecutive invalid readings before the note is considered over.
const MAX_MISSES = 4;

/**
 * Listens to the microphone and estimates the pitch of the voice with
 * the McLeod Pitch Method (pitchy library). Call `read` once per frame.
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
    // Browser processing is tuned for speech in video calls and distorts
    // a singing voice, so we turn it off.
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
