/* Round 1047: the moment host, the Season Centre's "your turn" card.

   On a matchday that holds one of his moments the clock stops a beat before
   the minute and this card takes the stage: what is happening, whether it is
   a YOUR CALL (what he does is what happened) or a RECREATE (the record
   stands, he plays it again for stars), and two buttons. "Let it play"
   writes nothing. "Take it yourself" loads the sport's board, marks the
   attempt used BEFORE the board is on screen (a closed tab is a miss, never
   a second try), and when the board reports once it shows the verdict, the
   stars one at a time and the way back to the match.

   Nothing here knows which sport it is hosting: the words, the board and
   the settling come with the model (CentreMoments). Only arrival animates,
   with the shared kit; reduced motion shows the settled frame; confetti is
   kept for a YOUR CALL that won the match. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ArcadeShotFeedback from '@/components/arcade/ArcadeShotFeedback';
import { ConfettiBurst, confettiSeedOf } from '@/components/club-manager/Celebration';

/** One moment as the viewer shows it. */
export interface CentreMoment {
  md: number;
  id: number;
  minute: number;
  mode: 'call' | 'recreate';
  /** What is happening ("The ball breaks to you on the edge of the box"). */
  line: string;
  /** What rides on it, in the sport's words. */
  objective: string;
  /** In the ledger already (the attempt is used): its stars and whether it was made. */
  taken: { stars: number; made: boolean } | null;
}

export interface MomentVerdict {
  made: boolean;
  stars: number;
  /** The board's own words for what happened. */
  verdict: string;
  /** What it means for the match and the season. */
  after: string;
  /** A YOUR CALL that turned the match into a win. */
  wonMatch: boolean;
}

/** The sport's side of the moments, built by its binding. */
export interface CentreMoments {
  list: CentreMoment[];
  /** Load the board's code; rejects when it cannot be loaded (nothing is used then). */
  preload: (m: CentreMoment) => Promise<unknown>;
  /** Mark the attempt used. */
  use: (m: CentreMoment) => void;
  /** The board for one moment; it calls `done` once with the input played. */
  board: (m: CentreMoment, done: (input: number[]) => void) => ReactNode;
  /** Settle and save the result. */
  settle: (m: CentreMoment, input: number[]) => MomentVerdict;
  /** Bank the season's stars, once (a season with no moment taken banks
   *  nothing). `final` is true at the season review; on the way out early it
   *  is false, and the sport banks only if nothing is left to play, so a
   *  player who steps out mid season finds his moments still open. */
  bank: (final: boolean) => void;
  /** One line for the kick off card ("3 moments are yours this season: matchdays 5, 17 and 31"). */
  kickoff: string | null;
  /** Lines for the season review. */
  review: string[];
}

export const STARS_MAX = 3;

/** The stars a moment earned, arriving one at a time. */
export function MomentStars({ stars, reduced }: { stars: number; reduced: boolean }) {
  return (
    <span className="inline-flex gap-1 text-xl" role="img" aria-label={`${stars} of ${STARS_MAX} stars`} data-moment-stars={stars}>
      {Array.from({ length: STARS_MAX }, (_, i) => (
        <span key={i} className={i < stars ? (reduced ? 'text-amber-400' : 'cm-tick-in text-amber-400') : 'text-muted-foreground/40'} style={i < stars && !reduced ? { animationDelay: `${0.25 + i * 0.3}s` } : undefined}>
          {i < stars ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

type Step = 'offer' | 'loading' | 'failed' | 'board' | 'verdict';

export function MomentHost({ moment, moments, scoreLine, reduced, onDone }: {
  moment: CentreMoment;
  moments: CentreMoments;
  /** "88' · 1-1", true at the minute before the moment. */
  scoreLine: string;
  reduced: boolean;
  /** Back to the match: `took` is false when he let it play. */
  onDone: (took: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('offer');
  const [verdict, setVerdict] = useState<MomentVerdict | null>(null);
  /* the model is rebuilt when the ledger is written, so the callbacks read
     the newest one and the board element is made once */
  const live = useRef({ moment, moments });
  live.current = { moment, moments };
  const mounted = useRef(true);
  const settled = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const take = useCallback(async () => {
    setStep(s => (s === 'offer' || s === 'failed' ? 'loading' : s));
    try { await live.current.moments.preload(live.current.moment); } catch { if (mounted.current) setStep('failed'); return; }
    if (!mounted.current) return;
    /* used before the board is on screen */
    live.current.moments.use(live.current.moment);
    setStep('board');
  }, []);
  const done = useCallback((input: number[]) => {
    if (settled.current || !mounted.current) return;
    settled.current = true;
    setVerdict(live.current.moments.settle(live.current.moment, input));
    setStep('verdict');
  }, []);
  const key = `${moment.md}|${moment.id}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = useMemo(() => (step === 'board' ? live.current.moments.board(live.current.moment, done) : null), [step, key, done]);
  const badge = moment.mode === 'call' ? 'YOUR CALL' : 'RECREATE';

  if (step === 'board') return <div data-moment-board data-moment-mode={moment.mode}>{board}</div>;
  if (step === 'verdict' && verdict) {
    return (
      <div className="relative" data-moment-verdict={verdict.made ? 'made' : 'missed'} data-moment-mode={moment.mode}>
        {verdict.wonMatch && !reduced && <ConfettiBurst seed={confettiSeedOf(key)} />}
        <ArcadeShotFeedback
          sport="goal"
          success={verdict.made}
          verdict={verdict.verdict}
          points={verdict.stars}
          score={<MomentStars stars={verdict.stars} reduced={reduced} />}
          detail={<p className="mt-2 text-xs text-muted-foreground" data-moment-after>{verdict.after}</p>}
        >
          <button type="button" autoFocus onClick={() => onDone(true)} className="mt-3 h-11 w-full rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500" data-moment-back>▶ Back to the match</button>
        </ArcadeShotFeedback>
      </div>
    );
  }
  return (
    <div className={`${reduced ? '' : 'cm-slam'} space-y-3 rounded-2xl border border-primary/40 bg-card p-4`} data-moment-offer data-moment-mode={moment.mode}>
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-primary" data-moment-badge>{badge}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{scoreLine}</span>
      </div>
      <p className="text-base font-black">{moment.line}</p>
      <p className="text-xs text-muted-foreground" data-moment-objective>{moment.objective}</p>
      {step === 'failed' && <p className="text-xs text-amber-400" role="alert">The pitch did not load, so nothing was used. Try again or let it play.</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={step === 'loading'} onClick={take} className="h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500 disabled:opacity-60" data-moment-take>
          {step === 'loading' ? 'Getting the pitch ready...' : '🎯 Take it yourself'}
        </button>
        <button type="button" disabled={step === 'loading'} onClick={() => onDone(false)} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted/40 disabled:opacity-60" data-moment-pass>▶ Let it play</button>
      </div>
    </div>
  );
}
