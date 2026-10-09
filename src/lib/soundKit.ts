/* ─── Round 1132: the sound kit ───
   Every sound on the site is arithmetic in this file: six cues rendered into
   sample buffers, a table of named moments mixed from them, and the one audio
   graph the page will ever build. No sample, no recording and no file from
   anywhere ships, so there is nothing to license and nothing to download.

   The rules, each one held by a scene in scripts/simSound.mjs:

   - Importing this file does nothing. Module scope holds constants, functions
     and empty collections only: no context, no listener, no storage read.
   - It is the only file in src that names the browser's audio graph or the
     buzz, and nothing imports it statically. The one way in is the dynamic
     import inside src/lib/sound.ts, so a visitor who never switches sound on
     never downloads a line of it. Its home is src/lib/soundKit.ts on purpose:
     the build names the chunk after the file and freshBuild's optional chunk
     guard matches that name.
   - It never draws from the page's random source. Noise comes from a seeded
     generator, so a cue is the same buffer on every render.
   - One context, made only once the page has been tapped or typed in.
   - A moment is stamped when it is ASKED for. If the chunk or the context took
     longer to arrive than its delay plus STALE_MS, it is dropped, never played
     late; if they took part of the delay, it starts that much sooner, so a
     countdown lands on its rows however cold the kit was.
   - Every live source and every pending buzz is kept with the scope that asked
     for it. hush(scope) stops that scope alone; stopAll() with no scope stops
     everything, and that is what switching off and a hidden tab use.
   - A hidden tab stops everything and suspends the context. There is no idle
     timer: an unlocked context stays as it is until the tab hides.
   - The buzz needs a tapped page, a phone that has it, and a visitor who did
     not ask for reduced motion. The sound he switched on still plays then.

   Known limit, written here so nobody fixes it into a bug: WebKit keeps a
   context suspended until a tap. primeSound() arms the gesture listeners for a
   visitor whose switch is on, so his first tap anywhere makes and resumes the
   context inside the tap. With no switch mounted on the page, or when that
   first tap lands before this chunk does, the first burst of a visit can still
   be lost on an iPhone. No harness on this machine can see it (no WebKit). */
import { soundOn, type SoundMoment, type SoundOpts } from './sound';

export const SAMPLE_RATE = 44100;
export const MASTER_GAIN = 0.6;
/** The built chunk is found by this string (scripts/playSoundGate.mjs). */
export const KIT_MARK = 'dukb-synth-kit-1';
/** A moment this far past its time is dropped, never played late. */
export const STALE_MS = 250;
const SR = SAMPLE_RATE;
const TAU = Math.PI * 2;

/** mulberry32, so a cue is a fixed function of its seed. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
/** one pole low pass coefficient for a cut off in Hz */
const pole = (hz: number): number => 1 - Math.exp(-TAU * hz / SR);
/** linear fade in over `a` seconds and out over `r`, so no cue starts or ends on a click */
function edges(buf: Float32Array, a: number, r: number): Float32Array {
  const n = buf.length, na = Math.max(1, Math.round(a * SR)), nr = Math.max(1, Math.round(r * SR));
  for (let i = 0; i < n; i += 1) buf[i] *= Math.min(1, i / na, (n - 1 - i) / nr);
  return buf;
}
function norm(buf: Float32Array, peak: number): Float32Array {
  let m = 0;
  for (let i = 0; i < buf.length; i += 1) m = Math.max(m, Math.abs(buf[i]));
  if (m > 0) for (let i = 0; i < buf.length; i += 1) buf[i] *= peak / m;
  return buf;
}
const make = (seconds: number): Float32Array => new Float32Array(Math.round(seconds * SR));

/** A referee's pea whistle: a 3,000 Hz tone with a 42 Hz trill and a little breath. */
function whistle(seed = 11): Float32Array {
  const buf = make(0.42), r = rng(seed);
  let ph = 0, lo = 0, hi = 0;
  const aLo = pole(2400), aHi = pole(3800);
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR, trill = Math.sin(TAU * 42 * t);
    ph += TAU * (3000 + 90 * trill) / SR;
    const w = r() * 2 - 1;
    hi += aHi * (w - hi); lo += aLo * (w - lo);
    buf[i] = (Math.sin(ph) + 0.12 * Math.sin(2 * ph) + 0.5 * (hi - lo)) * (1 - 0.3 * (0.5 + 0.5 * trill));
  }
  return norm(edges(buf, 0.012, 0.07), 0.5);
}
/** The ball in the net: noise through a band that falls from 6,000 to 900 Hz, over a low thump. */
function net(seed = 23): Float32Array {
  const buf = make(0.30), r = rng(seed);
  let lo = 0, hi = 0, ph = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR, fc = 6000 * Math.pow(900 / 6000, t / 0.30);
    const w = r() * 2 - 1;
    hi += pole(1.6 * fc) * (w - hi); lo += pole(0.6 * fc) * (w - lo);
    ph += TAU * (70 + 40 * Math.exp(-t / 0.04)) / SR;
    buf[i] = 2.2 * (hi - lo) * Math.exp(-t / 0.07) + 0.5 * Math.sin(ph) * Math.exp(-t / 0.05);
  }
  return norm(edges(buf, 0.004, 0.02), 0.7);
}
/** A crowd swelling and falling away: band limited noise under a slow three part wobble. */
function crowd(seed = 37): Float32Array {
  const buf = make(1.40), r = rng(seed);
  let lo = 0, hi = 0, hi2 = 0;
  const aLo = pole(300), aHi = pole(1500);
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR, w = r() * 2 - 1;
    hi += aHi * (w - hi); hi2 += aHi * (hi - hi2); lo += aLo * (hi2 - lo);
    const wobble = 1 + 0.15 * Math.sin(TAU * 3.1 * t + 1) + 0.10 * Math.sin(TAU * 5.3 * t + 2) + 0.08 * Math.sin(TAU * 7.9 * t);
    const swell = t < 0.35 ? (t / 0.35) ** 2 : t < 0.7 ? 1 : Math.cos((Math.PI / 2) * (t - 0.7) / 0.7) ** 2;
    buf[i] = (hi2 - lo) * wobble * swell;
  }
  return norm(edges(buf, 0.01, 0.02), 0.45);
}
/** A tick under the thumb: an 1,800 Hz ping gone in 9 ms and a click of noise. */
function tick(seed = 41): Float32Array {
  const buf = make(0.05), r = rng(seed);
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR;
    buf[i] = Math.sin(TAU * 1800 * t) * Math.exp(-t / 0.009) + 0.3 * (r() * 2 - 1) * Math.exp(-t / 0.0015);
  }
  return norm(edges(buf, 0.001, 0.005), 0.35);
}
/** The four pitches of the sting, a plain major arpeggio going up. */
export const STING_NOTES = [523.25, 659.25, 783.99, 1046.5];
/** The result landing: four notes going up, the last one ringing with the middle two under it. */
function sting(): Float32Array {
  const buf = make(0.90);
  const voice = (f: number, t: number): number =>
    Math.sin(TAU * f * t) + 0.30 * Math.sin(TAU * 2 * f * t) + 0.12 * Math.sin(TAU * 3 * f * t);
  const hits = [
    [STING_NOTES[0], 0.00, 0.16, 1], [STING_NOTES[1], 0.12, 0.16, 1], [STING_NOTES[2], 0.24, 0.16, 1],
    [STING_NOTES[3], 0.36, 0.24, 1], [STING_NOTES[1], 0.36, 0.24, 0.35], [STING_NOTES[2], 0.36, 0.24, 0.35],
  ];
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR;
    let x = 0;
    for (const [f, at, tau, g] of hits) {
      if (t < at) continue;
      const u = t - at;
      x += g * voice(f, u) * Math.min(1, u / 0.006) * Math.exp(-u / tau);
    }
    buf[i] = x;
  }
  return norm(edges(buf, 0.002, 0.04), 0.6);
}
/** How loud the knock sits against the low tone of the thud. */
const KNOCK = 0.7;
/** A dull hit: a tone falling from 150 to 55 Hz, with a short knock from 580 down to 400 Hz
    over it so a phone's small speaker, which carries almost nothing below 300 Hz, still says it. */
function thud(seed = 53): Float32Array {
  const buf = make(0.22), r = rng(seed);
  let ph = 0, kn = 0, lp = 0;
  const a = pole(400);
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SR;
    ph += TAU * (55 + 95 * Math.exp(-t / 0.06)) / SR;
    kn += TAU * (400 + 180 * Math.exp(-t / 0.02)) / SR;
    lp += a * ((r() * 2 - 1) - lp);
    buf[i] = Math.sin(ph) * Math.exp(-t / 0.055) + KNOCK * Math.sin(kn) * Math.exp(-t / 0.03)
      + 0.25 * lp * Math.exp(-t / 0.012);
  }
  return norm(edges(buf, 0.002, 0.015), 0.8);
}

export type CueName = 'whistle' | 'net' | 'crowd' | 'tick' | 'sting' | 'thud';
/** Every cue: how long it is, the peak it is normalised to, and the function that renders it. */
export const CUES: Record<CueName, { seconds: number; peak: number; render: (seed?: number) => Float32Array }> = {
  whistle: { seconds: 0.42, peak: 0.50, render: whistle },
  net: { seconds: 0.30, peak: 0.70, render: net },
  crowd: { seconds: 1.40, peak: 0.45, render: crowd },
  tick: { seconds: 0.05, peak: 0.35, render: tick },
  sting: { seconds: 0.90, peak: 0.60, render: sting },
  thud: { seconds: 0.22, peak: 0.80, render: thud },
};
export interface MomentRecipe { steps: { cue: CueName; at?: number; gain?: number }[]; buzz?: number[] }
/** What a binder may ask for. A moment added to the union in sound.ts without a row here does not compile. */
export const MOMENTS: Record<SoundMoment, MomentRecipe> = {
  tap: { steps: [{ cue: 'tick' }] },
  kickoff: { steps: [{ cue: 'whistle' }] },
  halftime: { steps: [{ cue: 'whistle' }, { cue: 'whistle', at: 0.5 }] },
  fulltime: { steps: [{ cue: 'whistle' }, { cue: 'whistle', at: 0.5 }, { cue: 'whistle', at: 1.0 }] },
  goal: { steps: [{ cue: 'net' }, { cue: 'crowd', at: 0.05 }], buzz: [40] },
  goalAgainst: { steps: [{ cue: 'net', gain: 0.6 }, { cue: 'thud', at: 0.02, gain: 0.7 }] },
  made: { steps: [{ cue: 'sting', gain: 0.7 }], buzz: [20] },
  missed: { steps: [{ cue: 'thud' }] },
  award: { steps: [{ cue: 'sting' }] },
  awardWin: { steps: [{ cue: 'sting' }, { cue: 'crowd', at: 0.3, gain: 0.9 }], buzz: [30, 40, 30] },
};

/* ─── the player half ─── */
type Scope = object | undefined;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let armed = false;
let tapped = false;
const buffers = new Map<CueName, AudioBuffer>();
/** every source that has been started and has not ended, with the scope that asked for it */
const live = new Map<AudioBufferSourceNode, Scope>();
/** every buzz still waiting on its delay, with its scope */
const timers = new Map<ReturnType<typeof setTimeout>, Scope>();
const quiet = (): void => undefined;

/** Has he tapped or pressed a key on this page yet? Nothing audible exists before that. */
function active(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : tapped;
}
const still = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (!active()) return null;
  const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}
function onGesture(): void {
  tapped = true;
  if (!soundOn()) return;
  const c = ensure();
  if (c && c.state !== 'running') void c.resume().catch(quiet);
}
function onVisibility(): void {
  if (document.visibilityState === 'hidden') { stopAll(); if (ctx) void ctx.suspend().catch(quiet); }
  else if (ctx && soundOn()) void ctx.resume().catch(quiet);
}
/** Listen for his first tap, so the context is made and resumed inside it (the one place WebKit allows). */
export function arm(): void {
  if (armed) return;
  armed = true;
  for (const type of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(type, onGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVisibility);
}
function bufferOf(c: AudioContext, name: CueName): AudioBuffer {
  let b = buffers.get(name);
  if (!b) {
    const data = CUES[name].render();
    b = c.createBuffer(1, data.length, SAMPLE_RATE);
    b.getChannelData(0).set(data);
    buffers.set(name, b);
  }
  return b;
}
function buzz(pattern: number[], delay: number, scope: Scope): void {
  if (still() || !active() || typeof navigator.vibrate !== 'function') return;
  const go = (): void => { try { navigator.vibrate(pattern); } catch { /* a phone that refuses */ } };
  if (delay <= 0.05) { go(); return; }
  const id = setTimeout(() => { timers.delete(id); go(); }, delay * 1000);
  timers.set(id, scope);
}
function schedule(c: AudioContext, moment: SoundMoment, delay: number, scope: Scope): void {
  const recipe = MOMENTS[moment];
  const t0 = c.currentTime + delay;
  for (const step of recipe.steps) {
    const src = c.createBufferSource();
    src.buffer = bufferOf(c, step.cue);
    const g = c.createGain();
    g.gain.value = step.gain ?? 1;
    src.connect(g);
    g.connect(master!);
    live.set(src, scope);
    src.onended = () => { live.delete(src); };
    src.start(t0 + (step.at ?? 0));
  }
  if (recipe.buzz) buzz(recipe.buzz, delay, scope);
}

/** `at` is performance.now() when the moment was asked for, before the chunk and the context were waited on. */
export function play(moment: SoundMoment, opts: SoundOpts | undefined, alive: () => boolean, at: number): void {
  arm();
  const c = ensure();
  if (!c) return;
  void c.resume().then(() => {
    if (c.state !== 'running' || !alive()) return;
    const due = (opts?.delay ?? 0) - (performance.now() - at) / 1000;
    if (due < -STALE_MS / 1000) return;
    schedule(c, moment, Math.max(0, due), opts?.scope);
  }).catch(quiet);
}
/** He just tapped the switch on: that tap counts, so the context may be made now. */
export function wake(): void {
  tapped = true;
  arm();
  const c = ensure();
  if (c) void c.resume().catch(quiet);
}
/** Stop what sounds and drop what is scheduled: one scope's, or with no scope everything. */
export function stopAll(scope?: object): void {
  for (const [src, owner] of live) {
    if (scope && owner !== scope) continue;
    try { src.stop(); } catch { /* never started */ }
    live.delete(src);
  }
  for (const [id, owner] of timers) {
    if (scope && owner !== scope) continue;
    clearTimeout(id);
    timers.delete(id);
  }
}
/** The switch went off: everything stops and the context rests. It is kept, so on again resumes the same one. */
export function sleep(): void {
  stopAll();
  if (ctx) void ctx.suspend().catch(quiet);
}
