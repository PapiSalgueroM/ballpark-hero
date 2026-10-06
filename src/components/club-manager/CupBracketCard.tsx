import { useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { careerLeagueOf } from '@/lib/clubManager';
import type { CareerState, CupRound } from '@/lib/clubManager';
import { activeSlot } from '@/lib/clubManagerSlots';
import { CelebrationStyles, revealAfter, revealDelay } from '@/components/club-manager/Celebration';

/* ---------- Round 983: who just went through ----------
   Both bracket cards used to redraw as a finished table, so a round settling
   changed nothing anybody could watch. Now the round that settled since the
   card last looked plays once: each winner's row pulses and his score lands,
   the next round's freshly drawn ties tick in, and a final the manager won
   glows on the trophy line. The cup and the Champions League cards share
   every piece below, so the motion is written once. */

/** The fields of a tie both brackets carry (CupTie and UclTie). */
export interface BracketTieLike {
  round: string;
  slot: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: string | null;
}

/** What one bracket moment shows, every tie named by tieKey. */
export interface BracketMoment {
  /** The round that just settled: the latest one, if the card missed several. */
  round: string;
  /** That round's ties settled since the card last looked, in slot order. */
  through: string[];
  /** The round after it, drawn in the same step, in slot order. */
  drawn: string[];
  /** The round was the final and the manager's own club won it. */
  wonFinal: boolean;
}

export const tieKey = (t: { round: string; slot: number }) => `${t.round}-${t.slot}`;

/** The moment's pace: the kit's stagger with a quicker start and step. */
const MOMENT_START = 0.1;
const MOMENT_STEP = 0.15;

/**
 * The moment between a settled tie count the card saw before (`prev`) and
 * the bracket now. Pure. No earlier count (first sight since the page
 * loaded) and a count that did not grow both play nothing, so a reload or a
 * reopened tab on an old result stays still. Rounds settle whole in the
 * engine, so the ties past `prev` in round then slot order are exactly the
 * ones settled since.
 */
export function bracketMoment(
  prev: number | undefined,
  ties: readonly BracketTieLike[],
  order: readonly string[],
  clubName: string,
): BracketMoment | null {
  if (prev === undefined) return null;
  const rank = (r: string) => order.indexOf(r);
  const settled = ties
    .filter(t => t.winner !== null)
    .sort((a, b) => rank(a.round) - rank(b.round) || a.slot - b.slot);
  if (settled.length <= prev) return null;
  const round = settled[settled.length - 1].round;
  const through = settled.slice(prev).filter(t => t.round === round).map(tieKey);
  const next = order[rank(round) + 1];
  const drawn = next
    ? ties.filter(t => t.round === next).sort((a, b) => a.slot - b.slot).map(tieKey)
    : [];
  const final = order[order.length - 1];
  const wonFinal = round === final && ties.some(t => t.round === final && t.winner === clubName);
  return { round, through, drawn, wonFinal };
}

/* The settled tie count each career's bracket was last seen at, per
   competition. Module level on purpose: it outlives a tab being closed and
   reopened, and it does not outlive a reload, which must play nothing. */
const lastSeenSettled = new Map<string, number>();

/** One career's one competition. There is no career id, so these stand in.
 *  Review: the manager slot is part of it, because two slots can hold the
 *  same club in the same era and season, and they switch without a reload.
 *  Without it a look at one slot's bracket reset the other's marker and the
 *  first slot's old result played again on the way back. activeSlot() is the
 *  slot the career on screen lives in, and reads 1 where there is no
 *  storage (a server render), the same answer as a single career. */
export function bracketMarkKey(career: CareerState, comp: 'cup' | 'ucl'): string {
  return [activeSlot(), career.clubName, career.eraId ?? '', career.startYear ?? '', career.season, comp].join('|');
}

/**
 * The moment this mount plays, held for as long as the settled count stays
 * where it was, so a re-render half way through cannot cut it off. The mark
 * is written after commit, never during render, so a render React throws
 * away cannot spend the moment.
 */
export function useBracketMoment(
  career: CareerState,
  comp: 'cup' | 'ucl',
  ties: readonly BracketTieLike[] | undefined,
  order: readonly string[],
): BracketMoment | null {
  const key = bracketMarkKey(career, comp);
  const settled = ties ? ties.filter(t => t.winner !== null).length : 0;
  const held = useRef<{ key: string; settled: number; moment: BracketMoment | null } | null>(null);
  if (!held.current || held.current.key !== key || held.current.settled !== settled) {
    const prev = held.current && held.current.key === key ? held.current.settled : lastSeenSettled.get(key);
    held.current = { key, settled, moment: bracketMoment(prev, ties ?? [], order, career.clubName) };
  }
  useEffect(() => { lastSeenSettled.set(key, settled); }, [key, settled]);
  return held.current.moment;
}

/** When a tie's part of the moment starts: winners first, then the draw. */
export function momentDelay(moment: BracketMoment, key: string): string | undefined {
  const i = moment.through.indexOf(key);
  if (i >= 0) return revealDelay(i, MOMENT_START, MOMENT_STEP);
  const j = moment.drawn.indexOf(key);
  /* Review: the draw keeps the winners' pace. Without the step it fell back
     to the kit's 0.22s, so one moment ran at two speeds. */
  if (j >= 0) return revealDelay(j, revealAfter(moment.through.length, MOMENT_START, MOMENT_STEP), MOMENT_STEP);
  return undefined;
}

/* The kit's gold glow loops forever. Here it is part of a moment that plays
   once, so it glows a set number of times and then rests on its last frame. */
const TROPHY_GLOWS = 2;

/** The trophy line's glow: it starts once the winners have landed. */
export function trophyGlow(moment: BracketMoment): CSSProperties {
  return {
    animationDelay: revealDelay(moment.through.length, MOMENT_START, MOMENT_STEP),
    animationIterationCount: TROPHY_GLOWS,
    animationFillMode: 'forwards',
  };
}

/** The pieces of a bracket card a moment touches, worked out once per tie. */
export function tieMoment(moment: BracketMoment | null, t: { round: string; slot: number }) {
  if (!moment) return { through: false, drawn: false, delay: undefined as string | undefined };
  const key = tieKey(t);
  return { through: moment.through.includes(key), drawn: moment.drawn.includes(key), delay: momentDelay(moment, key) };
}

/**
 * One club's line in a tie, shared by both cards. A settled tie dims the
 * loser; in a moment the winner's line pulses (on a wrapper, never on the
 * clickable line itself) and his score lands.
 */
export function BracketSide({
  name, tie, isHome, clubName, onClubClick, landing, delay,
}: {
  name: string;
  tie: BracketTieLike;
  isHome: boolean;
  clubName: string;
  onClubClick?: (club: string) => void;
  /** This tie is in the moment: the winner's line pulses and his score lands. */
  landing?: boolean;
  delay?: string;
}) {
  const goals = isHome ? tie.homeGoals : tie.awayGoals;
  const settled = tie.winner !== null;
  const through = settled && tie.winner === name;
  const mine = name === clubName;
  const lands = !!landing && through;
  const line = (
    <div
      onClick={onClubClick ? () => onClubClick(name) : undefined}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
        onClubClick && 'cursor-pointer hover:bg-secondary/50',
        settled && !through && 'opacity-45',
      )}
    >
      <span className={cn(
        'flex-1 min-w-0 truncate text-[11px]',
        mine ? 'text-primary font-bold' : through ? 'text-foreground font-semibold' : 'text-foreground',
      )}>
        {name}
      </span>
      <span
        className={cn(
          'shrink-0 text-[11px] font-bold font-display w-4 text-right',
          through ? 'text-gold' : 'text-muted-foreground',
          lands && 'cm-slam',
        )}
        style={lands ? { animationDelay: delay } : undefined}
        data-cm-bracket-landed={lands ? tieKey(tie) : undefined}
      >
        {goals === null ? '' : goals}
      </span>
    </div>
  );
  if (!lands) return line;
  return (
    <div className="cm-win-pulse rounded-md" style={{ animationDelay: delay }} data-cm-bracket-through={tieKey(tie)}>
      {line}
    </div>
  );
}

interface CupBracketCardProps {
  career: CareerState;
  onClubClick?: (club: string) => void;
}

const ROUND_LABEL: Record<CupRound, string> = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

/**
 * Round 102: the domestic cup as a real bracket.
 *
 * It used to be four one-off draws against clubs from my own league, with
 * nobody else in the competition and nothing to look at. Now it is sixteen
 * clubs from the whole country, so in England the Championship is in it,
 * every tie gets played, and a lower division side putting a giant out is
 * flagged as the upset it is.
 */
const CUP_ROUNDS: CupRound[] = ['R16', 'QF', 'SF', 'F'];

export function CupBracketCard({ career, onClubClick }: CupBracketCardProps) {
  const bracket = career.cupBracket;
  // Round 983: above the empty bracket return, hooks never follow one.
  const moment = useBracketMoment(career, 'cup', bracket, CUP_ROUNDS);
  if (!bracket || bracket.length === 0) return null;

  const rounds = CUP_ROUNDS;
  const winner = bracket.find(t => t.round === 'F')?.winner ?? null;
  const cupName = careerLeagueOf(career).cupName;
  const upsets = bracket.filter(t => t.upset && t.winner).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">🏅 {cupName} bracket</div>
        {winner && (
          <div
            className={cn('text-[10px] font-bold text-gold truncate max-w-[50%] text-right', moment?.wonFinal && 'cm-gold-glow rounded-md')}
            style={moment?.wonFinal ? trophyGlow(moment) : undefined}
          >
            🏆 {winner}
          </div>
        )}
      </div>

      {rounds.map(r => {
        const ties = bracket.filter(t => t.round === r).sort((a, b) => a.slot - b.slot);
        if (ties.length === 0) {
          return (
            <div key={r}>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ROUND_LABEL[r]}</div>
              <div className="text-[10px] text-muted-foreground px-2 py-1.5 border border-dashed border-border rounded-lg">
                Waiting on the round before.
              </div>
            </div>
          );
        }
        return (
          <div key={r}>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ROUND_LABEL[r]}</div>
            <div className={cn('grid gap-1.5', ties.length > 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
              {ties.map(t => {
                const m = tieMoment(moment, t);
                return (
                  <div
                    key={`${t.round}-${t.slot}`}
                    className={cn(
                      'rounded-lg border py-1',
                      t.mine ? 'border-primary/60 bg-primary/10'
                        : t.upset ? 'border-gold/50 bg-gold/5'
                        : 'border-border bg-background/40',
                      m.drawn && 'cm-tick-in',
                    )}
                    style={m.drawn ? { animationDelay: m.delay } : undefined}
                    data-cm-bracket-drawn={m.drawn ? tieKey(t) : undefined}
                  >
                    <BracketSide name={t.home} tie={t} isHome clubName={career.clubName} onClubClick={onClubClick} landing={m.through} delay={m.delay} />
                    <BracketSide name={t.away} tie={t} isHome={false} clubName={career.clubName} onClubClick={onClubClick} landing={m.through} delay={m.delay} />
                    {(t.pens || t.upset) && (
                      <div className="text-[8px] text-muted-foreground px-2 pb-0.5">
                        {t.upset && <span className="text-gold font-bold">Giant killing. </span>}
                        {t.pens && <>Level after 90. {t.winner} win on penalties.</>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-[9px] text-muted-foreground">
        Sixteen clubs from across the country, every tie played.
        {upsets > 0 && ` ${upsets} giant killing${upsets === 1 ? '' : 's'} so far.`}
      </p>
      {/* Round 983: the kit's keyframes, only while a moment plays, and last
          so the card's space-y gap never lands on the line under it. */}
      {moment && <CelebrationStyles />}
    </div>
  );
}

export default CupBracketCard;
