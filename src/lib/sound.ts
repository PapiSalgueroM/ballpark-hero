/* ─── Round 1132: the sound switch ───
   The small half of sound, the part anything may import. It knows whether he
   turned sound on, and only then does it reach the kit (src/lib/soundKit.ts)
   through the one dynamic import in the repo. A game never names a cue: it
   says what happened, sound('goal'), and the kit decides how that sounds.

   The rules, each one held by a scene in scripts/simSound.mjs:

   - No module scope work: no listener, no storage read, no window. A node
     harness can import a page that imports this and need no global at all.
   - sound() returns, in this order, before the kit is ever fetched: no window,
     the prerender flag, the switch off, a hidden tab. Off is the default for
     everybody: the only values that count are the exact strings on and off.
   - It is stamped when asked. The kit takes the time the chunk and the context
     took off the moment's delay, and drops a moment whose time has passed.
   - A kit that fails to load is silence, never an error in a game. Chromium
     keeps a failed dynamic import failed for the life of the page, so that tab
     stays silent until its next load; other browsers try again on a later call.
     The stale chunk reload in src/lib/freshBuild.ts leaves this chunk alone.
   - hush(scope) drops what that scope asked for, sounding or still waiting.
     hush() with no scope drops everything.
   - It imports nothing but the kit's type and stays free of React. */
export const SOUND_KEY = 'dukb-sound';
const CHANGE = 'dukb-sound-change';

export type SoundMoment =
  | 'tap' | 'kickoff' | 'halftime' | 'fulltime' | 'goal' | 'goalAgainst' | 'made' | 'missed' | 'award' | 'awardWin';
export interface SoundOpts {
  /** Seconds from the moment it is asked for. */
  delay?: number;
  /** Who asked: hush(scope) stops this scope's sounds and nobody else's. */
  scope?: object;
}

type Kit = typeof import('./soundKit');
let kitP: Promise<Kit> | null = null;
/** Bumped by switching off and by a hush of everything: a moment asked for before the bump never plays after it. */
let gen = 0;
/** The same, one scope at a time. */
const scopeGens = new WeakMap<object, number>();
/** The choice for this visit when the browser will not store it. */
let visit: 'on' | 'off' | null = null;
const quiet = (): void => undefined;
const genOf = (scope?: object): number => (scope ? scopeGens.get(scope) ?? 0 : 0);
/** A cancelled preload error resolves the import with nothing: that is a failed load too. */
const kit = (): Promise<Kit> => (kitP ??= import('./soundKit')
  .then(k => { if (!k) throw new Error('no kit'); return k; })
  .catch(e => { kitP = null; throw e; }));
const skip = (): boolean =>
  typeof window === 'undefined' || !!(window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__ || !soundOn();

export function soundOn(): boolean {
  try {
    const v = window.localStorage.getItem(SOUND_KEY);
    if (v === 'on' || v === 'off') return v === 'on';
  } catch { /* blocked storage, or no window: fall through to this visit's choice */ }
  return visit === 'on';
}

export function subscribeSound(cb: () => void): () => void {
  window.addEventListener(CHANGE, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(CHANGE, cb); window.removeEventListener('storage', cb); };
}

/** The switch calls this on pointerdown, so the tap that turns sound on finds the kit already there. */
export function preloadSound(): void {
  if (typeof window !== 'undefined') void kit().catch(quiet);
}

/** For a visitor whose switch is already on: fetch the kit and listen for his first tap, so the
    context is made inside that tap and the first sound of his visit is not lost on an iPhone. */
export function primeSound(): void {
  if (skip()) return;
  void kit().then(k => k.arm()).catch(quiet);
}

export function setSoundOn(on: boolean): void {
  visit = on ? 'on' : 'off';
  try { window.localStorage.setItem(SOUND_KEY, visit); } catch { /* blocked storage: the choice holds for this visit */ }
  try { window.dispatchEvent(new Event(CHANGE)); } catch { /* nothing to tell */ }
  if (on) {
    const mine = gen;
    /* he just tapped: one tick when the kit is there is how he knows it worked */
    void kit().then(k => { if (mine !== gen) return; k.wake(); k.play('tap', undefined, () => mine === gen, performance.now()); }).catch(quiet);
  } else {
    gen += 1;
    if (kitP) void kitP.then(k => k.sleep()).catch(quiet);
  }
}

export function sound(moment: SoundMoment, opts?: SoundOpts): void {
  if (skip() || document.visibilityState === 'hidden') return;
  const at = performance.now(), mine = gen, scope = opts?.scope, mineScope = genOf(scope);
  void kit().then(k => k.play(moment, opts, () => mine === gen && mineScope === genOf(scope), at)).catch(quiet);
}

/** Stop what is playing and drop what is scheduled or still loading: one scope's, or everything. */
export function hush(scope?: object): void {
  if (scope) scopeGens.set(scope, genOf(scope) + 1);
  else gen += 1;
  if (kitP) void kitP.then(k => k.stopAll(scope)).catch(quiet);
}
