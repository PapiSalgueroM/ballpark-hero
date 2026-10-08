/* Round 1107: the career moment kit's contract. Plain data, no React, so a
   sport can fill a scene from its own lib file without importing a
   component. Soccer Career binds it in Round 1107; the four US career
   boards bind the same four scenes in Round 1131. Nothing in this file knows
   a sport.

   The house rules a scene keeps (src/lib/usCareerReveal.ts wrote them down):
   - A NUMBER NEVER PASSES THROUGH A VALUE THAT WAS NEVER TRUE. The one number
     on a scene is two strings the game already formatted: what it was (when
     there was a before) and what it is now. The old one shows, the new one
     arrives over it, and no third value ever exists. The kit never formats,
     rounds or does arithmetic on either.
   - LOSSES STAY QUIET. Tone "quiet" is that rule as a prop: one plain rise,
     no slam, no rolling number, no confetti.
   - INVENT NOTHING. Every line is a string the caller's engine already
     wrote. A scene narrates what happened; it never quotes anybody. */

export type MomentKind = 'signing' | 'trophy' | 'award' | 'milestone';

/** gold: a win that earns confetti. good: good news. quiet: a loss or a plain fact. */
export type MomentTone = 'gold' | 'good' | 'quiet';

/** The one number. Both are strings the GAME formatted; the kit never formats, rounds or does arithmetic. */
export interface MomentCount {
  /** The value now, exactly as the game prints it elsewhere. */
  text: string;
  /** A few words under it saying what it counts, e.g. "overall". */
  label?: string;
  /** The value before, when there was one and it differs. Shown first, then replaced. Never a midpoint. */
  from?: string;
}

export interface CareerMomentSpec {
  kind: MomentKind;
  /** Plays once per key. null means never animated (drawn still). Ignored
      when the binder passes its own `moment` to the card: the binder's card
      already ran the hook with its own key, so a null here is not "still". */
  key: string | null;
  title: string;
  /** Up to three. A fourth and later are dropped (clampLines) and a dev build logs it once. */
  lines?: readonly string[];
  count?: MomentCount;
  /** One flat colour as #rrggbb. Anything else is ignored and the tone's own colour is used. */
  colour?: string;
  tone: MomentTone;
}

/** One changed attribute for the tick tiles: both values true, both already formatted. */
export interface MomentTick {
  label: string;
  to: string;
  from?: string;
}

export const MAX_MOMENT_LINES = 3;
export const MAX_MOMENT_TICKS = 8;

let warnedLines = false;

/** The first three lines, empty strings dropped. */
export function clampLines(lines: readonly string[] | undefined): string[] {
  const kept = (lines ?? []).filter(l => typeof l === 'string' && l.trim() !== '');
  if (kept.length > MAX_MOMENT_LINES && !warnedLines && import.meta.env?.DEV) {
    warnedLines = true;
    console.warn(`career moment: ${kept.length} lines given, only the first ${MAX_MOMENT_LINES} are drawn`);
  }
  return kept.slice(0, MAX_MOMENT_LINES);
}

/** A flat colour as lower case #rrggbb, or null for anything else. */
export function flatColour(input: unknown): string | null {
  return typeof input === 'string' && /^#[0-9a-f]{6}$/i.test(input) ? input.toLowerCase() : null;
}

/** The colour a scene falls back to when the binder gives none (or not a flat one). */
export const TONE_COLOUR: Record<MomentTone, string> = {
  gold: '#f59e0b',
  good: '#10b981',
  quiet: '#64748b',
};

export interface MomentBeats {
  art: number;
  title: number;
  lines: number[];
  count: number | null;
  ink: number | null;
  ticks: number[];
}

/** The ONE place beat order lives: the parts numbered in document order.
    Art 0, title 1, each line after it, then the count, then the ink line
    (signing only), then the ticks. */
export function momentBeats(spec: CareerMomentSpec, ticks = 0): MomentBeats {
  let next = 2;
  const lines = clampLines(spec.lines).map(() => next++);
  const count = spec.count ? next++ : null;
  const ink = spec.kind === 'signing' ? next++ : null;
  const tickBeats: number[] = [];
  for (let i = 0; i < Math.min(Math.max(ticks, 0), MAX_MOMENT_TICKS); i++) tickBeats.push(next++);
  return { art: 0, title: 1, lines, count, ink, ticks: tickBeats };
}

/** What the "?" says about scenes, on every career that shows them. The
    five strings name no sport and no pay period, on purpose. */
export const CAREER_MOMENT_HELP_RULES: readonly string[] = [
  'Big career scenes (a signing, a trophy, an award, a milestone) play once, the first time you reach them. Come back to the card or reload the page and it sits still.',
  "Every number on a scene is your save's own. When a number changed you see what it was and then what it is now, never anything in between.",
  'A scene never changes your career. It only shows what already happened, and Continue moves on whenever you like.',
  'If your phone or computer is set to reduce motion, scenes show finished: no movement and no confetti.',
  'Example: you were on 2k and you sign a new deal for 15k. The card shows your player in the new colour, who you signed for, how long the deal runs, and your pay turning from 2k into 15k.',
];
