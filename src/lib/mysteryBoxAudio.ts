/**
 * Short generated tones for the Mystery Box wheel. Oscillators only, no
 * shipped samples, so nothing copyrighted rides along. Cues are a few
 * milliseconds each; nothing here loops on the main thread.
 */

type Cue = 'start' | 'tick' | 'stop';

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function tone(
  ac: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(Math.max(0.0001, gain), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playPackCue(kind: Cue, muted: boolean): void {
  if (muted || reducedMotion()) return;
  const ac = audioContext();
  if (!ac) return;
  if (kind === 'start') {
    tone(ac, 180, 0.16, 'sine', 0.07);
    tone(ac, 360, 0.12, 'triangle', 0.04, 0.02);
    return;
  }
  if (kind === 'tick') {
    tone(ac, 880, 0.028, 'square', 0.035);
    return;
  }
  tone(ac, 523.25, 0.12, 'sine', 0.06);
  tone(ac, 783.99, 0.18, 'triangle', 0.05, 0.08);
}

export const MYSTERY_BOX_MUTE_KEY = 'mystery-box-fx-mute';

export function readMutePref(): boolean {
  if (typeof window === 'undefined') return false;
  if (reducedMotion()) return true;
  try {
    return window.localStorage.getItem(MYSTERY_BOX_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMutePref(muted: boolean): void {
  try {
    window.localStorage.setItem(MYSTERY_BOX_MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}
