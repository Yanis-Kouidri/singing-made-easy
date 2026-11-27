import './style.css';
import { HoldExercise } from './exercise';
import { PitchGraph } from './graph';
import { centsFromTarget, freqToMidi, midiToFreq, noteName } from './music';
import { PitchTracker } from './pitch';
import { playNote } from './tone';
import { versionInfo } from './version';
import {
  VOICE_TYPES,
  clampToRange,
  closestVoiceType,
  formatRange,
  randomNote,
  type Range,
} from './voices';

type Mode = 'idle' | 'test-low' | 'test-high' | 'reference' | 'singing' | 'done';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  voice: $<HTMLSelectElement>('voice'),
  rangeText: $('range-text'),
  rangeTest: $<HTMLButtonElement>('range-test'),
  noteDown: $<HTMLButtonElement>('note-down'),
  noteUp: $<HTMLButtonElement>('note-up'),
  noteName: $('note-name'),
  noteDetail: $('note-detail'),
  tolerance: $<HTMLSelectElement>('tolerance'),
  goal: $<HTMLSelectElement>('goal'),
  start: $<HTMLButtonElement>('start'),
  listen: $<HTMLButtonElement>('listen'),
  otherNote: $<HTMLButtonElement>('other-note'),
  hint: $('hint'),
  sungNote: $('sung-note'),
  cents: $('cents'),
  graph: $<HTMLCanvasElement>('graph'),
  progressBar: $('progress-bar'),
  progressText: $('progress-text'),
  micBar: $('mic-bar'),
  result: $('result'),
  resultTitle: $('result-title'),
  statAccuracy: $('stat-accuracy'),
  statDeviation: $('stat-deviation'),
  statStreak: $('stat-streak'),
  retry: $<HTMLButtonElement>('retry'),
  next: $<HTMLButtonElement>('next'),
  version: $<HTMLAnchorElement>('version'),
};

// ---------- Settings (persisted in the browser) ----------

interface Settings {
  /** Id of one of VOICE_TYPES, or 'custom' for the measured range. */
  voice: string;
  customRange: Range | null;
  targetMidi: number;
  tolerance: number;
  goal: number;
}

const CUSTOM = 'custom';
const STORAGE_KEY = 'sme-settings';
/** Voice ids used by earlier versions, mapped to the current ones. */
const LEGACY_VOICE_IDS: Record<string, string> = { basse: 'bass', baryton: 'baritone' };

function loadSettings(): Settings {
  const defaults: Settings = { voice: 'bass', customRange: null, targetMidi: 0, tolerance: 50, goal: 3 };
  let s = defaults;
  try {
    s = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    // Unreadable data: fall back to the defaults.
  }
  s.voice = LEGACY_VOICE_IDS[s.voice] ?? s.voice;
  if (s.voice !== CUSTOM && !VOICE_TYPES.some((v) => v.id === s.voice)) s.voice = defaults.voice;
  const r = rangeFor(s);
  if (s.targetMidi < r.low || s.targetMidi > r.high) s.targetMidi = r.low;
  return s;
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private browsing…): not a problem.
  }
}

function rangeFor(s: Settings): Range {
  if (s.voice === CUSTOM && s.customRange) return s.customRange;
  return VOICE_TYPES.find((v) => v.id === s.voice) ?? VOICE_TYPES[0];
}

// ---------- State ----------

const settings = loadSettings();
let mode: Mode = 'idle';
let audioCtx: AudioContext | null = null;
let tracker: PitchTracker | null = null;
let exercise: HoldExercise | null = null;
let referencePlaying = false;
let lastFrame = 0;

/** Range test: readings in progress and the low note found. */
const TEST_SAMPLES = 90; // ≈ 1.5 s of voice at 60 frames/s
let testSamples: number[] = [];
let testLow = 0;
let testIgnoreUntil = 0;

const graph = new PitchGraph(ui.graph);
/** Formats a number for the French UI, e.g. "1,5". */
const formatNumber = (n: number, digits = 1) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const isTesting = () => mode === 'test-low' || mode === 'test-high';
const isBusy = () => mode === 'reference' || mode === 'singing' || isTesting();

// ---------- Audio ----------

async function ensureAudio(withMic: boolean): Promise<boolean> {
  audioCtx ??= new AudioContext();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!withMic || tracker) return true;
  try {
    tracker = await PitchTracker.create(audioCtx);
    lastFrame = performance.now();
    requestAnimationFrame(loop);
    return true;
  } catch (err) {
    console.error(err);
    setHint("Impossible d'accéder au micro. Autorise-le dans ton navigateur puis réessaie.", 'warn');
    return false;
  }
}

async function playReference(): Promise<void> {
  if (!(await ensureAudio(false)) || !audioCtx) return;
  referencePlaying = true;
  render();
  await playNote(audioCtx, midiToFreq(settings.targetMidi));
  referencePlaying = false;
  render();
}

// ---------- Exercise flow ----------

async function startExercise(): Promise<void> {
  if (!(await ensureAudio(true))) return;
  exercise = new HoldExercise(settings.tolerance, settings.goal);
  graph.clear();
  setMode('reference');
  await playReference();
  if (mode === 'reference') setMode('singing');
}

function stopAll(): void {
  exercise = null;
  setMode('idle');
  setHint('Arrêté. Clique sur « Commencer » quand tu es prêt.');
}

/** Changes the note to sing, always within the selected voice range. */
function setTarget(midi: number): void {
  settings.targetMidi = clampToRange(rangeFor(settings), midi);
  saveSettings();
  render();
}

/**
 * Low-to-high progression, one semitone at a time. After the top of the
 * range, start again from the lowest note.
 */
function nextNoteUp(): number {
  const r = rangeFor(settings);
  return settings.targetMidi >= r.high ? r.low : settings.targetMidi + 1;
}

// ---------- Range test ----------

async function startRangeTest(): Promise<void> {
  if (!(await ensureAudio(true))) return;
  exercise = null;
  testSamples = [];
  graph.clear();
  setMode('test-low');
}

function collectTestSample(t: number, freq: number | null): void {
  if (!freq || t < testIgnoreUntil) return;
  const midi = freqToMidi(freq);
  // For the high note, ignore anything that still sounds like the low one.
  if (mode === 'test-high' && midi < testLow + 3) return;

  testSamples.push(midi);
  if (testSamples.length < TEST_SAMPLES) return;

  if (mode === 'test-low') {
    testLow = median(testSamples);
    testSamples = [];
    testIgnoreUntil = t + 1; // give the singer time to take a breath
    setMode('test-high');
  } else {
    finishRangeTest(testLow, median(testSamples));
  }
}

function finishRangeTest(lowMidi: number, highMidi: number): void {
  const low = Math.round(lowMidi);
  const high = Math.round(highMidi);
  if (high - low < 5) {
    setMode('idle');
    setHint('Les deux notes étaient trop proches. Relance le test en allant un peu plus loin.', 'warn');
    return;
  }
  // On a wide enough range, keep a semitone of margin on each side.
  const margin = high - low >= 9 ? 1 : 0;
  settings.customRange = { low: low + margin, high: high - margin };
  settings.voice = CUSTOM;
  settings.targetMidi = settings.customRange.low;
  saveSettings();
  setMode('idle');
  const closest = closestVoiceType({ low, high });
  setHint(
    `Ta zone : ${formatRange({ low, high })}. Ta voix est proche d'une voix de ${closest.label.toLowerCase()}.`,
    'good',
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

function setMode(next: Mode): void {
  mode = next;
  render();
}

// ---------- Real-time loop ----------

function loop(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!tracker) return;

  const { freq, levelDb } = tracker.read();
  const t = now / 1000;
  const cents = freq ? centsFromTarget(freq, settings.targetMidi, true) : null;

  // The microphone may pick up the reference note: ignore it while it plays.
  const listening = !referencePlaying;

  if (isTesting() && listening) collectTestSample(t, freq);

  if (mode === 'singing' && listening && exercise) {
    exercise.update(dt, cents);
    if (exercise.done) setMode('done');
  }

  graph.push(t, listening ? cents : null);
  graph.draw(t, settings.targetMidi, settings.tolerance);
  renderLive(listening ? freq : null, cents, levelDb);

  requestAnimationFrame(loop);
}

// ---------- Rendering ----------

function renderVoiceOptions(): void {
  const options = VOICE_TYPES.map((v) => new Option(`${v.label} (${formatRange(v)})`, v.id));
  if (settings.customRange) {
    options.push(new Option(`Ma zone mesurée (${formatRange(settings.customRange)})`, CUSTOM));
  }
  ui.voice.replaceChildren(...options);
}

function render(): void {
  renderVoiceOptions();
  ui.voice.value = settings.voice;
  ui.rangeText.textContent = formatRange(rangeFor(settings));

  const target = noteName(settings.targetMidi);
  ui.noteName.textContent = target.solfege;
  ui.noteDetail.textContent = `${target.scientific} · ${formatNumber(midiToFreq(settings.targetMidi))} Hz`;
  ui.tolerance.value = String(settings.tolerance);
  ui.goal.value = String(settings.goal);

  const busy = isBusy();
  const range = rangeFor(settings);
  for (const el of [ui.voice, ui.rangeTest, ui.tolerance, ui.goal, ui.otherNote]) el.disabled = busy;
  ui.noteDown.disabled = busy || settings.targetMidi <= range.low;
  ui.noteUp.disabled = busy || settings.targetMidi >= range.high;
  ui.next.textContent =
    settings.targetMidi >= range.high
      ? `Recommencer depuis le ${noteName(range.low).solfege}`
      : `Note suivante (${noteName(settings.targetMidi + 1).solfege})`;
  ui.listen.disabled = referencePlaying || isTesting();
  ui.start.textContent = busy ? 'Arrêter' : 'Commencer';
  ui.start.classList.toggle('danger', busy);

  if (mode === 'reference') setHint('🔊 Écoute bien la note…');
  if (mode === 'test-low') {
    setHint('Test 1/2 : chante ta note la plus grave, confortable et sans forcer, et tiens-la…');
  }
  if (mode === 'test-high') {
    setHint('Test 2/2 : maintenant ta note la plus aiguë, toujours sans forcer, et tiens-la…');
  }

  const goal = exercise?.goalSeconds ?? settings.goal;
  const inTuneTime = exercise?.inTuneTime ?? 0;
  ui.progressBar.style.width = `${Math.min(100, (inTuneTime / goal) * 100)}%`;
  ui.progressText.textContent = `${formatNumber(inTuneTime)} / ${goal} s`;

  ui.result.hidden = mode !== 'done';
  if (mode === 'done' && exercise) {
    setHint(`🎉 Bravo ! Tu as tenu le ${target.solfege} pendant ${goal} secondes.`, 'good');
    ui.resultTitle.textContent = resultMessage(exercise.accuracy);
    ui.statAccuracy.textContent = `${Math.round(exercise.accuracy * 100)} %`;
    ui.statDeviation.textContent = `${Math.round(exercise.meanDeviation)} cents`;
    ui.statStreak.textContent = `${formatNumber(exercise.bestStreak)} s`;
  }
}

function renderLive(freq: number | null, cents: number | null, levelDb: number): void {
  // Microphone level: -60 dB → empty, -10 dB → full.
  const level = Math.max(0, Math.min(1, (levelDb + 60) / 50));
  ui.micBar.style.width = `${level * 100}%`;

  if (freq === null || cents === null) {
    ui.sungNote.textContent = '–';
    ui.cents.textContent = '';
    ui.cents.className = 'cents';
    if (mode === 'singing' && !referencePlaying) setHint('Chante la note sur « aaa »…');
  } else {
    const sung = noteName(freqToMidi(freq));
    const testing = isTesting();
    const rawCents = centsFromTarget(freq, settings.targetMidi, false);
    const otherOctave = !testing && Math.abs(rawCents - cents) >= 600;
    ui.sungNote.textContent = `${sung.solfege} ${sung.scientific}${otherOctave ? ' (autre octave)' : ''}`;

    // During the range test, the distance to the target is meaningless.
    const inTune = Math.abs(cents) <= settings.tolerance;
    ui.cents.textContent = testing ? '' : `${cents > 0 ? '+' : ''}${Math.round(cents)} cents`;
    ui.cents.className = `cents ${inTune ? 'good' : 'off'}`;
    if (mode === 'singing' && !referencePlaying) setHint(...directionHint(cents, settings.tolerance));
  }

  if (mode === 'singing' && exercise) {
    ui.progressBar.style.width = `${exercise.progress * 100}%`;
    ui.progressText.textContent = `${formatNumber(exercise.inTuneTime)} / ${exercise.goalSeconds} s`;
  }
  if (isTesting()) {
    ui.progressBar.style.width = `${(testSamples.length / TEST_SAMPLES) * 100}%`;
    ui.progressText.textContent = mode === 'test-low' ? 'Étape 1/2' : 'Étape 2/2';
  }
}

function directionHint(cents: number, tolerance: number): [string, 'good' | 'off'] {
  if (Math.abs(cents) <= tolerance) return ['✓ C’est juste, tiens-la !', 'good'];
  const far = Math.abs(cents) > 150;
  return cents > 0
    ? [far ? '↓↓ Bien trop haut, descends' : '↓ Un peu trop haut, descends légèrement', 'off']
    : [far ? '↑↑ Bien trop bas, monte' : '↑ Un peu trop bas, monte légèrement', 'off'];
}

function resultMessage(accuracy: number): string {
  if (accuracy >= 0.8) return 'Très stable, excellent travail !';
  if (accuracy >= 0.5) return 'Bien joué ! Tu trouves la note de plus en plus vite.';
  return 'Réussi ! Avec un peu de pratique, tu resteras dans la cible plus longtemps.';
}

function setHint(text: string, tone: 'good' | 'off' | 'warn' | '' = ''): void {
  if (ui.hint.textContent !== text) ui.hint.textContent = text;
  ui.hint.className = `hint ${tone}`;
}

// ---------- Events ----------

ui.voice.addEventListener('change', () => {
  settings.voice = ui.voice.value;
  setTarget(rangeFor(settings).low);
});
ui.noteDown.addEventListener('click', () => setTarget(settings.targetMidi - 1));
ui.noteUp.addEventListener('click', () => setTarget(settings.targetMidi + 1));
ui.rangeTest.addEventListener('click', () => void startRangeTest());
ui.tolerance.addEventListener('change', () => {
  settings.tolerance = Number(ui.tolerance.value);
  saveSettings();
});
ui.goal.addEventListener('change', () => {
  settings.goal = Number(ui.goal.value);
  saveSettings();
  render();
});
ui.start.addEventListener('click', () => {
  if (isBusy()) stopAll();
  else void startExercise();
});
ui.listen.addEventListener('click', () => void playReference());
ui.otherNote.addEventListener('click', () => {
  setTarget(randomNote(rangeFor(settings), settings.targetMidi));
  void playReference();
});
ui.retry.addEventListener('click', () => void startExercise());
ui.next.addEventListener('click', () => {
  setTarget(nextNoteUp());
  void startExercise();
});

const version = versionInfo(__APP_VERSION__, __COMMIT_SHA__);
ui.version.textContent = version.label;
ui.version.href = version.url;

render();
