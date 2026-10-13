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
  championOf, collegePack, collegeSeatRules, collegeStintRows, collegeTileView, holdsSeat,
  type CollegeLeagueView, type CollegeMarket, type CollegeSeatBlock,
} from '@/lib/collegeSeat';

/** The slot's one height, every state, every width. */
const SLOT = 'h-36';
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
        type="button" data-college-seat="tile" onClick={onOpen}
        className={cn(SLOT, 'flex w-full flex-col justify-center gap-1 overflow-hidden rounded-2xl border border-gold/40 bg-card px-4 py-2 text-left hover:border-gold/70')}
      >
        {/* No aria-label: it would replace the ask, trust and the live line for a screen reader. */}
        <span className="sr-only">Open the athletic director's card. </span>
        <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Athletic director</span>
          <span className={tile.trust <= 25 ? 'text-destructive' : 'text-foreground'}>Trust {tile.trust}</span>
        </span>
        <TrustBar trust={tile.trust} />
        <span className="line-clamp-3 text-xs text-foreground">{tile.ask}</span>
        <span className={cn('line-clamp-2 text-xs', tile.onTrack ? 'text-primary' : 'text-amber-300')}>{tile.line}</span>
      </button>
    );
  }
  if (!block && offer) {
    return (
      <div data-college-seat="optin" className={cn(SLOT, 'flex flex-col justify-center gap-1.5 overflow-hidden rounded-2xl border border-gold/40 bg-card px-4 py-2')}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Athletic director</p>
        <p className="line-clamp-3 text-xs text-foreground">He grades every season. Trust at zero gets you let go, and the dynasty goes on through a job market or a year out.</p>
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

/** The rules and the worked example behind the "?", over the card or the job market, with Back. */
function SeatRules({ view, onBack }: { view: CollegeLeagueView; onBack: () => void }) {
  const r = collegeSeatRules(view);
  return (
    <div data-college-seat="rules" className="cm-rise rounded-2xl border border-gold/40 bg-card p-4">
      <button type="button" onClick={onBack} className={cn(TAP, 'inline-flex items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:text-foreground')}>
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

/** The "?" that opens the rules. */
function RulesButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="How the athletic director works" className={cn(TAP, 'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground', className)}>
      <CircleHelp className="h-5 w-5" />
    </button>
  );
}

/** His record, one row a program: on the card and on the job market. */
function StintRows({ block, view }: { block: CollegeSeatBlock; view: CollegeLeagueView }) {
  return (
    <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
      {collegeStintRows(block, view).map((s, i) => (
        <p key={`${s.team}:${s.since}:${i}`} className="flex flex-wrap items-center justify-between gap-x-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
          <span className="font-semibold text-foreground">{s.name}, since {s.since}</span>
          <span className="shrink-0 text-muted-foreground">
            {s.seasons} {s.seasons === 1 ? 'season' : 'seasons'}, {s.titles} {s.titles === 1 ? 'title' : 'titles'}{s.ended ? `, ${s.ended}` : ''}
          </span>
        </p>
      ))}
    </div>
  );
}

/** The card, in place of the tab content: the ask, trust, the live line and the record, with its "?". */
export function SeatCard({ block, view, onBack }: { block: CollegeSeatBlock; view: CollegeLeagueView; onBack: () => void }) {
  const [rules, setRules] = useState(false);
  const tile = collegeTileView(block, view);
  if (rules) return <SeatRules view={view} onBack={() => setRules(false)} />;
  return (
    <div data-college-seat="card" className="cm-rise rounded-2xl border border-gold/40 bg-card p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className={cn(TAP, 'inline-flex items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:text-foreground')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <RulesButton onClick={() => setRules(true)} />
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
      <StintRows block={block} view={view} />
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

/** The trail's line after a move: where he coaches now, since the class screen names no program. */
export function SeatNewProgram({ name }: { name: string }) {
  return (
    <p data-college-seat="moved" className="mt-1 text-sm font-semibold text-gold">
      You are the head coach at {name} now. This class is your first one there.
    </p>
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

/** The recap the day he is let go: the title, the verdict and the market's first line. */
export function SeatFiredRecap({ verdict, line }: { verdict: string; line: string }) {
  return (
    <div data-college-seat="fired" className="mt-3 rounded-xl border border-destructive/50 bg-background px-3 py-2 text-sm">
      <p className="cm-slam font-display text-lg font-black text-destructive" style={{ animationDelay: '0.6s' }}>The athletic director let you go</p>
      <p className="cm-rise mt-1 text-foreground" style={{ animationDelay: '0.75s' }}>{verdict}</p>
      <p className="cm-rise mt-1 text-xs text-muted-foreground" style={{ animationDelay: '0.85s' }}>{line}</p>
    </div>
  );
}

/** The fired recap's one way on, in place of the trail button. It rises gated: never pressable before it shows. */
export function SeatSeeWhoCalls({ onClick }: { onClick: () => void }) {
  return (
    <span data-college-seat="calls" className="cm-rise-gated inline-flex" style={{ animationDelay: '1.1s' }}>
      <button type="button" onClick={onClick} className={cn(TAP, 'inline-flex items-center gap-2 rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground hover:opacity-90')}>
        See who calls
      </button>
    </span>
  );
}

const TIER_WORDS = ['', 'top tier', 'second tier', 'third tier', 'bottom tier'] as const;

/** The job market, a screen of its own after a firing or a year out: who called, a year out, or a new dynasty. */
export function SeatMarket({ block, view, market, canSit, onTake, onSit, onNew }: {
  block: CollegeSeatBlock; view: CollegeLeagueView; market: CollegeMarket; canSit: boolean;
  onTake: (teamId: string) => void; onSit: () => void; onNew: () => void;
}) {
  /* The rules are re-openable here too: a fired coach holds no card, and this is when they matter. */
  const [rules, setRules] = useState(false);
  const champ = championOf(view, view.season);
  const champName = champ ? view.programs.find(p => p.id === champ)?.name ?? champ : null;
  if (rules) return <SeatRules view={view} onBack={() => setRules(false)} />;
  return (
    <div data-college-seat="market" className="space-y-3">
      <div className="cm-rise relative rounded-2xl border border-border bg-card px-12 py-4 text-center">
        <RulesButton onClick={() => setRules(true)} className="absolute right-1 top-1" />
        <p className="font-display text-lg font-bold text-foreground">{market.state === 'offers' ? 'The phone is ringing' : market.state === 'closed' ? 'The phone has stopped' : 'Out of work'}</p>
        <p className="mt-1 text-sm text-muted-foreground">{market.line}</p>
        {market.seasonsOut > 0 && champName && (
          <p className="mt-1 text-xs text-muted-foreground">The country played {view.season} without you, and {champName} won {collegePack(view.sport).words.title}.</p>
        )}
      </div>
      {market.offers.map((o, i) => {
        const f = market.facts[o.teamId];
        return (
          <div key={o.teamId} className="cm-rise rounded-2xl border border-gold/40 bg-card p-4" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-display text-base font-bold text-foreground">{o.teamName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{TIER_WORDS[o.tier]} program</span>
            </p>
            {f && <p className="mt-0.5 text-xs text-muted-foreground">Prestige {f.prestige}, roster #{f.rosterRank} of {f.of}, {f.record} last season</p>}
            <p className="mt-2 text-xs text-foreground">{o.ask.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.reason}</p>
            <span className="cm-rise-gated mt-2 flex" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
              <button type="button" onClick={() => onTake(o.teamId)} aria-label={`Take the job at ${o.teamName}`} className={cn(TAP, 'w-full rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90')}>
                Take the job
              </button>
            </span>
          </div>
        );
      })}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {canSit && (
          <button type="button" onClick={onSit} className={cn(TAP, 'rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:border-primary/60')}>
            Sit the year out
          </button>
        )}
        <button type="button" onClick={onNew} className={cn(TAP, 'rounded-full border border-border bg-card px-6 text-sm font-semibold text-muted-foreground hover:text-foreground')}>
          Start a new dynasty
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your record</p>
        <StintRows block={block} view={view} />
      </div>
    </div>
  );
}

/** A buyout bid on the recap after a big year: who, how high, the ask, why, and the two answers. "Go to"
    rises gated: it moves a job, so it can never be pressed before it shows. */
export function SeatBid({ bid, onGo, onStay }: {
  bid: { teamId: string; name: string; tier: number; prestige: number; ask: string; reason: string };
  onGo: () => void; onStay: () => void;
}) {
  return (
    <div data-college-seat="bid" className="cm-rise mt-3 rounded-xl border border-gold/50 bg-background px-3 py-2 text-left text-sm" style={{ animationDelay: '0.8s' }}>
      <p className="text-xs font-bold uppercase tracking-wider text-gold">A program one tier up is calling</p>
      <p className="mt-1 font-display text-base font-bold text-foreground">{bid.name}</p>
      <p className="text-xs text-muted-foreground">{TIER_WORDS[bid.tier]} program, prestige {bid.prestige}</p>
      <p className="mt-1 text-xs text-foreground">{bid.reason}</p>
      <p className="mt-1 text-xs text-muted-foreground">Their ask for your first season: {bid.ask}</p>
      <span className="mt-2 flex flex-col gap-2 sm:flex-row">
        <span className="cm-rise-gated flex flex-1" style={{ animationDelay: '1.1s' }}>
          <button type="button" onClick={onGo} className={cn(TAP, 'w-full rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90')}>Go to {bid.name}</button>
        </span>
        <button type="button" onClick={onStay} className={cn(TAP, 'flex-1 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/60')}>Stay put</button>
      </span>
    </div>
  );
}
