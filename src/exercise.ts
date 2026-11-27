/**
 * "Hold a note" exercise: time spent within tolerance accumulates until
 * the goal is reached. Drifting out of tune pauses progress without
 * resetting it, which is more encouraging for beginners.
 */
export class HoldExercise {
  /** Seconds spent within tolerance. */
  inTuneTime = 0;
  /** Seconds during which a note was being sung. */
  voicedTime = 0;
  /** Longest uninterrupted time within tolerance. */
  bestStreak = 0;

  private streak = 0;
  private absCentsSum = 0;
  private samples = 0;

  readonly toleranceCents: number;
  readonly goalSeconds: number;

  constructor(toleranceCents: number, goalSeconds: number) {
    this.toleranceCents = toleranceCents;
    this.goalSeconds = goalSeconds;
  }

  /**
   * @param dt seconds elapsed since the previous reading
   * @param cents distance to the target, or null when nothing is sung
   */
  update(dt: number, cents: number | null): void {
    if (this.done) return;
    if (cents === null) {
      this.streak = 0;
      return;
    }

    this.voicedTime += dt;
    this.absCentsSum += Math.abs(cents);
    this.samples++;

    if (Math.abs(cents) <= this.toleranceCents) {
      this.inTuneTime = Math.min(this.goalSeconds, this.inTuneTime + dt);
      this.streak += dt;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      this.streak = 0;
    }
  }

  get progress(): number {
    return this.inTuneTime / this.goalSeconds;
  }

  get done(): boolean {
    return this.inTuneTime >= this.goalSeconds;
  }

  /** Share of sung time spent in tune (0–1). */
  get accuracy(): number {
    return this.voicedTime > 0 ? this.inTuneTime / this.voicedTime : 0;
  }

  /** Mean absolute deviation in cents. */
  get meanDeviation(): number {
    return this.samples > 0 ? this.absCentsSum / this.samples : 0;
  }
}
