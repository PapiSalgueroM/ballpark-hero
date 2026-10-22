/* Round 1540: the earned draft night's glue, the half every front office shares.

   A board binds the night with its own sport calls (open, the three presses,
   its desk, its class, its save, its feed, its summer) and keeps everything
   else here, so the next three front offices bind this hook instead of
   copying the NBA board's (CLAUDE.md, one engine many sports; Round 426 fixed
   one bug twice in two copies).

   WHAT IS HERE. Which screen to draw (the stage), whether the lottery plays
   (only in the session whose press opened the night: a reload draws its last
   frame at once), the run card a press leaves, the closing screen's own data,
   the press guard and its reset, and the plain line a refused press leaves.
   All of it is React state, never saved: the night itself is on the desk.

   "OVER" IS THE SEASON ROLLED, never "every slot used": a summer the desk
   refuses leaves every slot used on a night that is still current, and that
   is the clock stage with its finish button, not the closing screen. */
import { useEffect, useRef, useState } from 'react';
import { draftRunReveal } from '@/lib/gmEarnedDraft';
import type { EarnedSlot, GmDraftNight, LotteryHelpBlock, RunStep } from '@/lib/gmEarnedDraft';
import type { DraftNight } from '@/lib/draftNight';

export type EarnedDraftStage = 'lottery' | 'clock' | 'over';

/** The run card a press leaves: the rows and the headline that counts every pick. */
export interface EarnedDraftRun { night: DraftNight; headline: string }

/** The closing screen's own data, kept because the rolled season has no current night to read. */
export interface EarnedDraftDone { year: number; lines: string[]; help: LotteryHelpBlock[] }

/** What a sport's press answers, as far as the glue reads it. */
export interface EarnedDraftAnswer { steps: RunStep[]; onClock: EarnedSlot | null; done: boolean }

/** The one line a refused press leaves. Nothing else changes. */
export const EARNED_DRAFT_REFUSED = 'That pick could not be made. Your save has not changed.';

/** The screen to draw: the lottery until it is continued, the clock while the night is current, the closing screen
    once a finished night's summer has rolled the season. Null: the board draws its old draft. */
export function earnedDraftStage(night: GmDraftNight | null, done: EarnedDraftDone | null, rolled: boolean): EarnedDraftStage | null {
  if (night) return night.seen ? 'clock' : 'lottery';
  return done && rolled ? 'over' : null;
}

/** The run card from a press: null when the press made no pick (he holds the first pick, say). */
export function earnedDraftRun(answer: EarnedDraftAnswer): EarnedDraftRun | null {
  if (!answer.steps.length) return null;
  const reveal = draftRunReveal(answer.steps, answer.onClock);
  return reveal.night.picks.length ? { night: reveal.night, headline: reveal.headline } : null;
}

/** The night's transient state on a board. `resetOn` is what a finished press changes (the desk, the phase, the
    league): the guard is let go once a render has taken it. Call it with the board's other hooks, above every early
    return. */
export function useGmEarnedDraft(resetOn: readonly unknown[]) {
  const [lotteryLive, setLotteryLive] = useState(false);
  const [run, setRun] = useState<EarnedDraftRun | null>(null);
  const [done, setDone] = useState<EarnedDraftDone | null>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { pending.current = false; }, resetOn);
  return {
    lotteryLive, run, done, error,
    stage: (night: GmDraftNight | null, rolled: boolean): EarnedDraftStage | null => earnedDraftStage(night, done, rolled),
    /** The card plays only in the session whose press opened the night. */
    seen: (night: GmDraftNight): boolean => night.seen || !lotteryLive,
    /** Takes the press guard; false while another press is in flight. */
    begin: (): boolean => {
      if (pending.current) return false;
      pending.current = true;
      return true;
    },
    /** The night was just opened by a press in this session: the lottery plays. */
    opened: (): void => { setLotteryLive(true); setRun(null); setDone(null); setError(''); },
    /** The press was refused: the guard is let go and the plain line shown. */
    refused: (): void => { pending.current = false; setError(EARNED_DRAFT_REFUSED); },
    /** A press answered: the lottery is over and its run is the card. */
    answered: (answer: EarnedDraftAnswer): void => { setLotteryLive(false); setRun(earnedDraftRun(answer)); setError(''); },
    /** The last slot is used: what the closing screen says. */
    finished: (closing: EarnedDraftDone): void => { setDone(closing); },
    /** Away from the draft, or a new front office: nothing of the night is left on screen. */
    clear: (): void => { pending.current = false; setLotteryLive(false); setRun(null); setDone(null); setError(''); },
  };
}
