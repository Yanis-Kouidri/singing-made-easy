/**
 * Exercice « tenir une note » : on accumule le temps passé dans la
 * tolérance jusqu'à atteindre l'objectif. Sortir de la cible met la
 * progression en pause sans la remettre à zéro (plus encourageant
 * pour débuter).
 */
export class HoldExercise {
  /** Secondes passées dans la tolérance. */
  inTuneTime = 0;
  /** Secondes pendant lesquelles une note était chantée. */
  voicedTime = 0;
  /** Plus longue durée tenue d'affilée dans la tolérance. */
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
   * @param dt secondes écoulées depuis la dernière mesure
   * @param cents écart à la cible, ou null si rien n'est chanté
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

  /** Part du temps chanté passée dans la cible (0–1). */
  get accuracy(): number {
    return this.voicedTime > 0 ? this.inTuneTime / this.voicedTime : 0;
  }

  /** Écart moyen absolu en cents. */
  get meanDeviation(): number {
    return this.samples > 0 ? this.absCentsSum / this.samples : 0;
  }
}
