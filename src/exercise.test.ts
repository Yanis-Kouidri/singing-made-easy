import { describe, expect, it } from 'vitest';
import { HoldExercise } from './exercise';

const TOLERANCE = 50;
const GOAL = 3;

/** Feeds the same reading for `seconds`, in 0.1 s steps. */
function sing(ex: HoldExercise, cents: number | null, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 10); i++) ex.update(0.1, cents);
}

describe('HoldExercise', () => {
  it('accumulates time spent in tune until the goal', () => {
    const ex = new HoldExercise(TOLERANCE, GOAL);
    sing(ex, 10, 1.5);
    expect(ex.inTuneTime).toBeCloseTo(1.5);
    expect(ex.progress).toBeCloseTo(0.5);
    expect(ex.done).toBe(false);

    sing(ex, -20, 1.5);
    expect(ex.done).toBe(true);
    expect(ex.progress).toBeCloseTo(1);
  });

  it('counts the tolerance boundary as in tune', () => {
    const ex = new HoldExercise(TOLERANCE, GOAL);
    sing(ex, TOLERANCE, 1);
    sing(ex, -TOLERANCE, 1);
    expect(ex.inTuneTime).toBeCloseTo(2);
  });

  it('pauses progress out of tune without resetting it', () => {
    const ex = new HoldExercise(TOLERANCE, GOAL);
    sing(ex, 0, 1);
    sing(ex, 120, 2);
    expect(ex.inTuneTime).toBeCloseTo(1);
    sing(ex, 0, 1);
    expect(ex.inTuneTime).toBeCloseTo(2);
  });

  it('tracks the longest uninterrupted streak', () => {
    const ex = new HoldExercise(TOLERANCE, 10);
    sing(ex, 0, 1);
    sing(ex, null, 0.5); // silence breaks the streak
    sing(ex, 0, 2);
    sing(ex, 200, 0.5); // so does singing out of tune
    sing(ex, 0, 1.5);
    expect(ex.bestStreak).toBeCloseTo(2);
  });

  it('ignores silence for accuracy and mean deviation', () => {
    const ex = new HoldExercise(TOLERANCE, 10);
    sing(ex, 20, 1);
    sing(ex, null, 5);
    sing(ex, -100, 1);
    expect(ex.voicedTime).toBeCloseTo(2);
    expect(ex.accuracy).toBeCloseTo(0.5);
    expect(ex.meanDeviation).toBeCloseTo(60);
  });

  it('stops changing once done', () => {
    const ex = new HoldExercise(TOLERANCE, GOAL);
    sing(ex, 0, GOAL);
    const snapshot = { ...ex };
    sing(ex, 300, 2);
    expect({ ...ex }).toEqual(snapshot);
  });

  it('reports zero accuracy before any singing', () => {
    const ex = new HoldExercise(TOLERANCE, GOAL);
    expect(ex.accuracy).toBe(0);
    expect(ex.meanDeviation).toBe(0);
  });
});
