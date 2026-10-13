/**
 * Round 1320: the athletic director on the college dynasty board.
 *
 * Every word comes from src/lib/collegeSeat.ts; nothing here computes a rule.
 * Every element this file draws on the board carries data-college-seat on its
 * outermost node, and nothing else on the board changes, so the held fixture
 * (collegeDynastyFixture.test.tsx) sets these nodes aside and still holds
 * every other byte of both boards.
 *
 * The slot on the season screen keeps one fixed height in every state (the
 * tile, the offer to an older dynasty, the season he passed on it), so no
 * press moves the Play button below it. The card opens in place of the tab
 * content with a Back button, and its "?" opens the rules over it, also with
 * a Back button: small tiles, never a stacked page.
 *
 * The athletic director and the boosters are roles. Every line is narrated.
 */
import { useState } from 'react';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  collegeSeatRules, collegeStintRows, collegeTileView, holdsSeat,
  type CollegeLeagueView, type CollegeSeatBlock,
} from '@/lib/collegeSeat';

/** The slot's one height, every state, every width. */
const SLOT = 'h-32';
const TAP = 'min-h-11 min-w-11';

function TrustBar({ trust }: { trust: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
      <span className={cn('block h-full rounded-full', trust <= 25 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${trust}%` }} />
    </span>
  );
}

/** The season screen's slot: the tile, the offer, or the season he passed on it. */
export function SeatSlot({ block, view, offer, onOpen, onTake, onPass }: {
  block: CollegeSeatBlock | null | undefined;
  view: CollegeLeagueView;
  /** An older dynasty at a season's first press, not yet passed on. */
  offer: boolean;
  onOpen: () => void;
  onTake: () => void;
  onPass: () => void;
}) {
  const tile = block && holdsSeat(block) ? collegeTileView(block, view) : null;
  if (tile) {
    return (
      <button
        type="button" data-college-seat="tile" onClick={onOpen} aria-label="Open the athletic director's card"
        className={cn(SLOT, 'flex w-full flex-col justify-center gap-1 overflow-hidden rounded-2xl border border-gold/40 bg-card px-4 py-2 text-left hover:border-gold/70')}
      >
        <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Athletic director</span>
          <span className={tile.trust <= 25 ? 'text-destructive' : 'text-foreground'}>Trust {tile.trust}</span>
        </span>
        <TrustBar trust={tile.trust} />
        <span className="line-clamp-2 text-xs text-foreground">{tile.ask}</span>
        <span className={cn('truncate text-xs', tile.onTrack ? 'text-primary' : 'text-amber-300')}>{tile.line}</span>
      </button>
    );
  }
  if (!block && offer) {
    return (
      <div data-college-seat="optin" className={cn(SLOT, 'flex flex-col justify-center gap-1.5 overflow-hidden rounded-2xl border border-gold/40 bg-card px-4 py-2')}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">An athletic director wants the job</p>
        <p className="line-clamp-2 text-xs text-foreground">He grades every season. Trust at zero gets you let go, then the dynasty goes on through a job market or a year out.</p>
        <span className="flex gap-2">
          <button type="button" onClick={onTake} className={cn(TAP, 'flex-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90')}>Take the ask</button>
          <button type="button" onClick={onPass} className={cn(TAP, 'flex-1 rounded-full border border-border bg-background px-3 text-xs font-semibold text-muted-foreground hover:text-foreground')}>Not now</button>
        </span>
      </div>
    );
  }
  return (
    <div data-college-seat="passed" className={cn(SLOT, 'flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card px-4 py-2 text-center')}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No athletic director this season</p>
      <p className="mt-1 text-xs text-muted-foreground">One can take the job at the start of next season.</p>
    </div>
  );
}

/** The card, in place of the tab content: the ask, trust, the live line and the record, with its "?". */
export function SeatCard({ block, view, onBack }: { block: CollegeSeatBlock; view: CollegeLeagueView; onBack: () => void }) {
  const [rules, setRules] = useState(false);
  const tile = collegeTileView(block, view);
  const rows = collegeStintRows(block, view);
  if (rules) {
    const r = collegeSeatRules(view);
    return (
      <div data-college-seat="rules" className="cm-rise rounded-2xl border border-gold/40 bg-card p-4">
        <button type="button" onClick={() => setRules(false)} className={cn(TAP, 'inline-flex items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:text-foreground')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="mt-1 font-display text-base font-bold text-foreground">How the athletic director works</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
          {r.rules.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">A worked example</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          {r.example.map((line, i) => <li key={i}>{line}</li>)}
        </ol>
      </div>
    );
  }
  return (
    <div data-college-seat="card" className="cm-rise rounded-2xl border border-gold/40 bg-card p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className={cn(TAP, 'inline-flex items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:text-foreground')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={() => setRules(true)} aria-label="How the athletic director works" className={cn(TAP, 'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground')}>
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{`The athletic director's ask, ${view.season}`}</p>
      {tile && (
        <>
          <p className="mt-1 text-sm text-foreground">{tile.ask}</p>
          <p className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Trust upstairs</span><b className="text-foreground">{tile.trust} of 100</b></p>
          <span className="mt-1 block"><TrustBar trust={tile.trust} /></span>
          <p className={cn('mt-2 text-xs', tile.onTrack ? 'text-primary' : 'text-amber-300')}>{tile.line}</p>
        </>
      )}
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your record</p>
      <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
        {rows.map((s, i) => (
          <p key={`${s.team}:${s.since}:${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
            <span className="min-w-0 truncate font-semibold text-foreground">{s.name}, since {s.since}</span>
            <span className="shrink-0 text-muted-foreground">
              {s.seasons} {s.seasons === 1 ? 'season' : 'seasons'}, {s.titles} {s.titles === 1 ? 'title' : 'titles'}{s.ended ? `, ${s.ended}` : ''}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** The recap's line inside the curtain: the verdict and trust. */
export function SeatRecapLine({ verdict, trust, hot }: { verdict: string; trust: number; hot: boolean }) {
  return (
    <div data-college-seat="recap" className="cm-rise mt-3 rounded-xl border border-border bg-background px-3 py-2 text-sm" style={{ animationDelay: '0.7s' }}>
      <p className="text-foreground">{verdict}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Trust upstairs: <b className={hot ? 'text-destructive' : 'text-foreground'}>{trust} of 100</b>{hot ? '. The seat is hot.' : ''}</p>
    </div>
  );
}

/** The pick screen's one line: a new dynasty comes with an athletic director. */
export function SeatPickLine() {
  return (
    <p data-college-seat="pick" className="mt-2 text-xs text-muted-foreground">
      Every new dynasty comes with an athletic director: he sets an ask each season and grades it.
    </p>
  );
}
