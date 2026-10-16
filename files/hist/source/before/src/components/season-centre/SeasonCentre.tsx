/* Round 1045: the Season Centre, the shared viewer every career's "week by
   week" uses (soccer first; the NBA and NFL binds bring their own words).

   It shows a season the career already played: src/lib/season/core.ts
   derived it from the save, and nothing here draws a number or writes the
   save. Screens: the kick off card, the matchday (fixtures, the stage with
   the match clock, the table), posters before the big games (derby day,
   halfway, title decided, final day) and the review. Desktop is a three
   column modal that never scrolls the page; the phone is one column with a
   fixed bottom bar and the fixtures behind a tile with a back button.
   Only arrival animates, with the shared kit's classes; no number counts.

   Round 1047: a matchday that holds one of his moments stops its clock a
   beat before the minute and hands the stage to MomentHost. Letting it play
   writes nothing; taking it goes through the model's CentreMoments (the
   sport's board, the ledger, the bank). The season on screen is always the
   model's, so a decision shows the moment the model is rebuilt. */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { soFar, tableAt, type DerivedGame, type DerivedSeason, type SeasonWords } from '@/lib/season/core';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { RankShiftTable } from '@/components/motion/RankShiftTable';
import { CelebrationStyles } from '@/components/club-manager/CelebrationStyles';
import { revealDelay } from '@/components/club-manager/Celebration';
import { Confetti } from '@/components/soccer-career/CareerFx';
import VictoryMoment from '@/components/game/VictoryMoment';
import { useCareerMoment } from '@/components/soccer-career/careerMoments';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { ordinal } from '@/lib/soccerCareerLeague';
import { MatchClock, scoreAt, type ClockSpeed, type ClockStageAt, type SeasonClock } from './MatchClock';
import { MomentHost, type CentreMoment, type CentreMoments } from './MomentHost';
import { SeasonCentreHelp, useHelpOnce, type HelpWords } from './SeasonCentreHelp';
import { RecordPanel } from './RecordPanel';
import { useBodyLock } from './useBodyLock';
import { nextCupGame, visibleCupGames, type CalendarCupGame } from '@/lib/soccerSeasonCalendar';

export interface CentreReview {
  /** The review's tiles, all competitions, labelled in the sport's words
   *  (soccer: Apps, Goals or Clean sheets, Assists, Avg rating). */
  tiles: [string, string][];
  /** The summary card's finish line ("Finished 4th of 20 in the Premier League"), or null. */
  finishLine: string | null;
  /** "Arsenal won it", exactly when the summary card says so. */
  championLine: string | null;
  trophies: string[];
  /** The save holds the league title: the clinch poster and the review celebrate. */
  title: boolean;
  /** Extra lines (the Golden Boot in all competitions, the derby record). */
  notes: string[];
  /** Round 1048: a playoff run round by round (a US season), then one line of his own playoff numbers. */
  path?: { head: string; steps: { label: string; text: string; won: boolean }[]; line: string | null };
}

/** Round 1048: the few words the viewer says itself. A sport may replace any
 *  of them; soccer's are the defaults, so a model with no `copy` reads exactly
 *  as it did before these became lookups. */
export interface CentreCopy {
  start: string;
  lastBadge: string;
  lastHead: string;
  lastBody: (round: string) => string;
  best: string;
  bestSoFar: string;
  scope: string;
  soFarHead: string;
  /** The letter a level game prints. */
  tie: string;
  /** The left column and the phone's tile ("Fixtures"). */
  list: string;
  /** The right column ("Table"). */
  side: string;
}
export const SOCCER_COPY: CentreCopy = {
  start: '▶ Kick off',
  /* Round 1046 shortened the fixture row's badge from FINAL DAY so a row stays on one line at 12 px */
  lastBadge: 'FINAL',
  lastHead: 'Final day',
  lastBody: round => `The last ${round.toLowerCase()} of the season.`,
  best: 'Best match',
  bestSoFar: 'Best so far',
  scope: 'All competitions, the same as your season summary.',
  soFarHead: 'League so far',
  tie: 'D',
  list: 'Fixtures',
  side: 'Table',
};
const copyOf = (model: CentreModel): CentreCopy => (model.copy ? { ...SOCCER_COPY, ...model.copy } : SOCCER_COPY);

export interface CentreModel {
  season: DerivedSeason;
  words: SeasonWords;
  /** The slot's printed name ("another club" for the unnamed). */
  names: string[];
  /** A fixed opponent's occasion ("North London derby"), by its key. */
  occasion: Record<string, string>;
  header: { club: string; seasonLabel: string; league: string | null; loanFrom: string | null };
  /** "20 clubs · 38 matchdays · 3 points for a win", table mode only. */
  frameLine: string | null;
  /** "Last season: 3rd with Lyon". */
  lastSeason: string | null;
  /** Why there is no table, in the game's words; null in table mode. */
  resultsWhy: string | null;
  /** His derby record before this season, for the derby day poster. */
  derbyBefore: { w: number; d: number; l: number };
  review: CentreReview;
  /** Everything the viewer shows that belongs to one sport. */
  sport: CentreSport;
  /** Round 1048: the viewer's own words, where a sport's differ from soccer's. */
  copy?: Partial<CentreCopy>;
  /** Round 1048: the help sheet's "seen it" key, when a sport keeps its own. */
  helpKey?: string;
  /** Round 1048: slots grouped for the record panel (a division, a conference). */
  groups?: { label: string; slots: number[] }[];
  help: HelpWords;
  /** Play once keys for the clinch and the review (useCareerMoment). */
  momentKey: string;
  /** Round 1047: the moments he may play this season; null or absent: none. */
  moments?: CentreMoments | null;
  /** Optional saved cup nights; positions are the game's order, not real dates. */
  calendar?: { games: CalendarCupGame[]; note: string; onCompetition: (id: 'domestic' | 'club') => void };
}

/** The sport's side of the viewer: its clock, its words for a fixed game,
 *  and how his line and totals read. Soccer's is built in
 *  src/components/soccer-career/SoccerSeasonCentre.tsx; nothing below knows
 *  which sport it is showing. */
export interface CentreSport {
  clock: SeasonClock;
  /** A fixed game's words: its badge, its poster's head, his record so far, the review's line. */
  fixed: { badge: string; poster: string; recordSoFar: string; recordPlayed: string };
  /** Why he missed a game. */
  missed: (why: DerivedGame['why']) => string;
  /** His line in a game he played as short bits, plus an alarm shown in red (an injury). */
  lineOf: (g: DerivedGame) => { bits: string[]; alarm: string | null };
  /** His mark for one game (soccer's match rating), for "best match". */
  markOf: (g: DerivedGame) => number;
  /** Round 1048: the chip beside his line, when it is not the mark to one decimal ("31 PTS"). */
  markChip?: (g: DerivedGame) => string;
  /** Round 1048: how "best match" says his game, when it is not "rated 7.6". */
  markText?: (g: DerivedGame) => string;
  /** Round 1046: what that mark is called, printed in front of it on his line (soccer: "Rating"). Absent: the bare number. */
  markWord?: string;
  /** Round 1046: the review's strip of his mark in every game: its heading, what a screen reader is told, and the
   *  mark's own lowest and highest value (the sport's numbers, never the viewer's). Absent: no strip. */
  form?: { head: string; label: string; range: [number, number] };
  /** His league totals so far as labelled tiles. */
  soFar: (so: Record<string, number>) => [string, string][];
  /** The halfway poster's line from his first half totals. */
  half: (so: Record<string, number>) => string;
  /** The games not shown one by one, in one line. */
  bucket: (b: { apps: number; line: Record<string, number> }) => string;
  /** Round 1046: the sport's picture of a game as its clock runs (soccer: a little pitch for the goals). Absent: none. */
  pitch?: (g: DerivedGame, at: ClockStageAt) => ReactNode;
}

type Stage = { kind: 'kickoff' } | { kind: 'poster'; md: number } | { kind: 'match'; md: number } | { kind: 'cup'; id: string; revealed: boolean } | { kind: 'review' };

/** What makes matchday `md` a big game (posters before it). */
export function postersFor(s: DerivedSeason, md: number): string[] {
  const M = s.games.length;
  const out: string[] = [];
  if (s.clinch && md === s.clinch.md + 1) out.push('title');
  if (s.games[md - 1]?.fixedKey) out.push('derby');
  if (M >= 10 && md === Math.floor(M / 2) + 1) out.push('halfway');
  if (md === M && M > 1) out.push('final');
  return out;
}

function resultOf(g: DerivedGame): 'W' | 'D' | 'L' {
  return g.us > g.them ? 'W' : g.us < g.them ? 'L' : 'D';
}

const PILL = { W: 'bg-emerald-500/20 text-emerald-400', D: 'bg-muted text-muted-foreground', L: 'bg-red-500/20 text-red-400' } as const;

/** Desktop (the three column modal) or the phone column, so only one table is drawn. */
function useWide(): boolean {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function useReducedMotion(): boolean {
  const [reduced] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return reduced;
}

function FixtureList({ model, played, current, short, cupSeen = new Set<string>(), cupCurrent = null }: { model: CentreModel; played: number; current: number | null; short?: (name: string) => string; cupSeen?: ReadonlySet<string>; cupCurrent?: string | null }) {
  const { season: s, names, words } = model;
  const copy = copyOf(model);
  const yours = new Set((model.moments?.list ?? []).map(m => m.md));
  return (
    <ol className="space-y-1" data-fixtures>
      {s.games.map(g => {
        const done = g.md <= played;
        const r = resultOf(g);
        const on = current === g.md;
        return (
          <Fragment key={g.md}><li className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg px-2 py-1 text-xs ${on ? 'bg-primary/15 ring-1 ring-primary/40' : ''}`} aria-current={on ? 'true' : undefined} data-fixture-row={g.md}>
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{g.md}</span>
            <span className="w-4 shrink-0 text-xs text-muted-foreground">{g.home ? 'H' : 'A'}</span>
            <span className={`min-w-[4.5rem] flex-1 truncate ${done ? '' : 'text-muted-foreground'} ${names[g.opp] === words.unnamed ? 'italic' : ''}`} data-fixture-name>{short ? short(names[g.opp]) : names[g.opp]}</span>
            {g.fixedKey && <span className="shrink-0 rounded bg-amber-500/20 px-1 text-xs font-bold text-amber-400">{model.sport.fixed.badge}</span>}
            {yours.has(g.md) && <span className="shrink-0 text-xs" title="One of your moments" data-fixture-moment>🎯</span>}
            {g.md === s.games.length && <span className="shrink-0 rounded bg-sky-500/20 px-1 text-xs font-bold text-sky-400">{copy.lastBadge}</span>}
            {done && <span className={`ml-auto shrink-0 rounded px-1.5 text-xs font-bold tabular-nums ${PILL[r]}`}>{r === 'D' ? copy.tie : r} {g.us}-{g.them}</span>}
          </li>{visibleCupGames(model.calendar?.games ?? [], cupSeen).filter(cup => cup.afterLeague === g.md).map(cup => <li key={cup.id} data-fixture-cup={cup.id} data-cup-after-league={cup.afterLeague} aria-current={cupCurrent === cup.id ? 'true' : undefined} className={`rounded-lg border border-sky-500/30 px-2 py-1 text-xs ${cupCurrent === cup.id ? 'bg-primary/15 ring-1 ring-primary/40' : ''}`}>
            <button type="button" className="min-h-11 w-full min-w-0 text-left" onClick={() => model.calendar?.onCompetition(cup.competition)}>
              <span className="block font-bold text-sky-400">{cup.name} · {cup.match.round}</span>
              <span className="block break-words" data-fixture-cup-opponent>{cup.match.opponent ?? 'Opponents not recorded'}</span>
              {cupSeen.has(cup.id) && <span className="block font-bold tabular-nums" data-fixture-cup-result>{cup.match.goalsFor === null || cup.match.goalsAgainst === null ? cup.match.result ?? 'Score not recorded' : `${cup.match.goalsFor}-${cup.match.goalsAgainst}`}</span>}
            </button>
          </li>)}</Fragment>
        );
      })}
    </ol>
  );
}

/** His line in one game, after full time. */
function HisLine({ g, sport }: { g: DerivedGame; sport: CentreSport }) {
  if (!g.played) return <p className="text-xs text-muted-foreground" data-his-line>{sport.missed(g.why)}</p>;
  const { bits, alarm } = sport.lineOf(g);
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${alarm ? 'cm-loss-shake' : ''}`} data-his-line>
      {sport.markWord && <span className="text-muted-foreground">{sport.markWord}</span>}
      <span className="rounded-md bg-primary/15 px-2 py-0.5 font-black tabular-nums text-primary" data-his-mark>{sport.markChip ? sport.markChip(g) : sport.markOf(g).toFixed(1)}</span>
      {bits.map(b => <span key={b}>{b}</span>)}
      {alarm && <span className="text-red-400">{alarm}</span>}
    </div>
  );
}

function TablePanel({ model, played, compact }: { model: CentreModel; played: number; compact: boolean }) {
  const { season: s } = model;
  const rows = useMemo(() => tableAt(s, played), [s, played]);
  const before = useMemo(() => tableAt(s, Math.max(0, played - 1)), [s, played]);
  /* Round 1046, a phone: the table sits under the match, and on a small screen under the fold of the stage. When a
     new table arrives it must be seen sliding without the player scrolling, so the stage (its own scroll box, never
     the page) moves just far enough to show his row and the rows either side of it. Nothing moves when they are
     already in view. Places are read from the layout (offsetTop), which a row in mid slide does not change. */
  const mine = s.labels[0]?.key ?? 'u0';
  const panelRef = useRef<HTMLDivElement | null>(null);
  const shownAt = useRef(played);
  useEffect(() => {
    /* only a table that ARRIVED: an open (or a resume) draws its table still and moves nothing */
    const arrived = played !== shownAt.current;
    shownAt.current = played;
    const panel = panelRef.current;
    const box = arrived && compact && played >= 1 && panel ? panel.closest('[data-centre-stage]') : null;
    if (!panel || !(box instanceof HTMLElement)) return;
    const frame = box.getBoundingClientRect();
    const card = panel.getBoundingClientRect();
    const rows = Array.from(panel.querySelectorAll<HTMLElement>('[data-club]'));
    const under = rows[Math.min(rows.length - 1, rows.findIndex(r => r.dataset.club === mine) + 1)];
    const bottom = under ? card.top + (under.offsetTop - panel.offsetTop) + under.offsetHeight : card.bottom;
    if (bottom > frame.bottom - 4) box.scrollTop += Math.min(bottom - frame.bottom + 4, card.top - frame.top - 4);
  }, [compact, played, mine]);
  if (s.mode !== 'table') return null;
  const keyOf = (slot: number) => s.labels[slot]?.key ?? `u${slot}`;
  const unnamed = new Set(s.labels.filter(l => !l.named).map(l => l.key));
  const at = rows.findIndex(r => r.slot === 0) + 1;
  const was = before.findIndex(r => r.slot === 0) + 1;
  const move = played > 1 ? was - at : 0;
  return (
    <div data-centre-table ref={panelRef}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold">{played === 0 ? 'Before a ball is kicked' : `After ${model.words.round.toLowerCase()} ${played}`}</span>
        {played > 0 && (
          <span key={`${played}-${at}`} className="cm-tick-in font-bold tabular-nums" data-his-position>
            {ordinal(at)}{move > 0 ? ` ▲${move}` : move < 0 ? ` ▼${-move}` : ''}
          </span>
        )}
      </div>
      {/* Round 1046: the rows slide between two true tables; an order before a ball is kicked is not one */}
      <RankShiftTable order={rows.map(r => keyOf(r.slot))} slide={played >= 1}>
      <LeagueTableCard
        rows={rows.map(r => ({ club: keyOf(r.slot), w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts }))}
        myClub={keyOf(0)}
        compact={compact}
        preseason={played === 0}
        zoneTop={1}
        isUnnamed={k => unnamed.has(k)}
        footnote="Clubs level on points are split by goal difference, then goals scored: this game's rule."
      />
      </RankShiftTable>
    </div>
  );
}

/** The kick off card. `from` is how many rounds he has already watched (a resume); 0 is the card a fresh open draws. */
function KickOff({ model, from, roundWord, onKick, onStraight, onRestart }: { model: CentreModel; from: number; roundWord: string; onKick: () => void; onStraight: () => void; onRestart: () => void }) {
  const { season: s, header, names, occasion } = model;
  const copy = copyOf(model);
  const M = s.games.length;
  const place = from > 0 && s.mode === 'table' ? tableAt(s, from).findIndex(r => r.slot === 0) + 1 : 0;
  /* his moments already behind the place he resumes at: only a start from the top plays them */
  const behind = from > 0 ? (model.moments?.list ?? []).filter(m => !m.taken && m.md <= from).length : 0;
  return (
    <div className="cm-rise space-y-3" data-kickoff>
      <div>
        <div className="text-lg font-black">{header.club}</div>
        <div className="text-xs text-muted-foreground">
          {header.seasonLabel}{header.league ? ` · ${header.league}` : ''}{header.loanFrom ? ` · on loan from ${header.loanFrom}` : ''}
        </div>
        {model.frameLine && <div className="mt-1 text-xs font-semibold" data-frame-line>{model.frameLine}</div>}
        {model.resultsWhy && <div className="mt-1 text-xs text-muted-foreground" data-results-why>{model.resultsWhy}</div>}
        {model.lastSeason && <div className="mt-1 text-xs text-muted-foreground">{model.lastSeason}</div>}
        {model.moments?.kickoff && <div className="mt-1 text-xs font-semibold text-primary" data-kickoff-moments>🎯 {model.moments.kickoff}</div>}
        {from > 0 && <div className="mt-1 text-xs font-semibold" data-kickoff-resumed>{from} of {M} played{place > 0 ? ` · you are ${ordinal(place)}` : ''}</div>}
        {behind > 0 && <div className="mt-1 text-xs text-muted-foreground" data-kickoff-behind>🎯 {behind} of your moments {behind === 1 ? 'is' : 'are'} before {roundWord.toLowerCase()} {from + 1}. ↺ From the start plays {behind === 1 ? 'it' : 'them'}.</div>}
      </div>
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{from > 0 ? 'Next five' : 'First five'}</div>
        <ul className="space-y-1">
          {s.games.slice(from, from + 5).map(g => (
            <li key={g.md} className="flex items-center gap-2 text-xs">
              <span className="w-6 tabular-nums text-muted-foreground">{g.md}</span>
              <span className="w-10 text-muted-foreground">{g.home ? 'Home' : 'Away'}</span>
              <span className={`min-w-0 flex-1 truncate ${names[g.opp] === model.words.unnamed ? 'italic text-muted-foreground' : ''}`}>{names[g.opp]}</span>
              {g.fixedKey && <span className="rounded bg-amber-500/20 px-1 text-xs font-bold text-amber-400">{model.sport.fixed.badge} · {occasion[g.fixedKey] ?? ''}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onKick} className="h-11 shrink-0 sm:flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500">{from > 0 ? `▶ ${roundWord} ${from + 1}` : copy.start}</button>
        <button type="button" onClick={onStraight} className="h-11 shrink-0 sm:flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted/40">
          {s.mode === 'table' ? '⏭ Straight to the final table' : '⏭ Straight to the season review'}
        </button>
      </div>
      {from > 0 && <button type="button" onClick={onRestart} className="h-11 w-full rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/40" data-kickoff-restart>↺ From the start</button>}
    </div>
  );
}

function Poster({ model, md, reduced }: { model: CentreModel; md: number; reduced: boolean }) {
  const { season: s, occasion } = model;
  const kinds = postersFor(s, md);
  const M = s.games.length;
  const g = s.games[md - 1];
  const moment = useCareerMoment(kinds.includes('title') && model.review.title ? `${model.momentKey}|clinch` : null);
  const slam = reduced ? '' : 'cm-slam';
  const meetings = g?.fixedKey ? s.games.filter(x => x.fixedKey === g.fixedKey) : [];
  const which = meetings.findIndex(x => x.md === md);
  const rec = { ...model.derbyBefore };
  for (const x of s.games) if (x.fixedKey && x.md < md && x.played) rec[resultOf(x) === 'W' ? 'w' : resultOf(x) === 'D' ? 'd' : 'l'] += 1;
  const half = soFar(s, Math.floor(M / 2));
  const mark = model.sport.markOf;
  const copy = copyOf(model);
  const markText = model.sport.markText ?? ((x: DerivedGame) => `rated ${mark(x).toFixed(1)}`);
  const letter = (x: DerivedGame) => (resultOf(x) === 'D' ? copy.tie : resultOf(x));
  const best = s.games.filter(x => x.played && x.md < md).sort((a, b) => mark(b) - mark(a))[0];
  return (
    <div ref={moment.ref} className="space-y-3" data-poster={kinds.join(' ')}>
      {kinds.includes('title') && s.clinch && (
        /* two elements on purpose: cm-slam and cm-gold-glow each set the
           animation, so on one element the glow would replace the slam and
           leave the slam's starting opacity of 0 for good */
        <div className={slam}>
          <div className={`${reduced ? '' : 'cm-gold-glow'} relative overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-400`}>
            {moment.fresh && moment.live && !reduced && <Confetti pieces={40} gold />}
            <VictoryMoment compact>
              <span className="text-sm font-black text-foreground" data-clinch>Champions with {M - s.clinch.md} to play</span>
            </VictoryMoment>
          </div>
        </div>
      )}
      {kinds.includes('derby') && g?.fixedKey && (
        <div className={`${slam} rounded-xl border border-amber-500/30 bg-card p-3`}>
          <div className="text-xs font-black uppercase tracking-wider text-amber-400">{model.sport.fixed.poster}</div>
          <div className="text-sm font-bold">{occasion[g.fixedKey] ?? g.fixedKey} · {which === 0 ? 'first of two' : which === 1 ? 'second of two' : `meeting ${which + 1}`}</div>
          <div className="text-xs text-muted-foreground">{model.sport.fixed.recordSoFar}: {rec.w}W {rec.d}D {rec.l}L</div>
        </div>
      )}
      {kinds.includes('halfway') && (
        <div className={`${slam} rounded-xl border border-border bg-card p-3`}>
          <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Halfway</div>
          <div className="text-sm">{model.sport.half(half)}</div>
          {best && <div className="text-xs text-muted-foreground">{copy.bestSoFar}: {model.words.round} {best.md}, {letter(best)} {best.us}-{best.them}, {markText(best)}</div>}
        </div>
      )}
      {kinds.includes('final') && (
        <div className={`${slam} rounded-xl border border-sky-500/30 bg-card p-3`}>
          <div className="text-xs font-black uppercase tracking-wider text-sky-400">{copy.lastHead}</div>
          <div className="text-sm">{copy.lastBody(model.words.round)}</div>
        </div>
      )}
    </div>
  );
}

const BAR = { W: 'bg-emerald-500/70', D: 'bg-muted-foreground/50', L: 'bg-red-500/70' } as const;

/** His season at a glance: one bar a game, as tall as his mark in it and coloured by the result; a game he missed is
 *  a dot on the baseline and a fixed game (a derby) wears an amber top. The strip arrives whole: no bar grows,
 *  because a bar half way up would be a mark he never had. */
export function FormStrip({ model, reduced, style }: { model: CentreModel; reduced: boolean; style?: CSSProperties }) {
  const form = model.sport.form;
  if (!form) return null;
  const [lo, hi] = form.range;
  return (
    <div className={reduced ? '' : 'cm-rise'} style={style}>
      <div className="mb-1 text-xs text-muted-foreground">{form.head}</div>
      <div className="flex h-14 items-end gap-px" role="img" aria-label={form.label} data-review-form>
        {model.season.games.map(g => {
          if (!g.played) return <span key={g.md} className="flex flex-1 justify-center" data-form-bar={g.md} data-form-missed><span className="h-1 w-1 rounded-full bg-muted-foreground/60" /></span>;
          const mark = model.sport.markOf(g);
          const share = hi > lo ? Math.max(0, Math.min(1, (mark - lo) / (hi - lo))) : 0;
          return <span key={g.md} className={`flex-1 rounded-t-sm ${BAR[resultOf(g)]} ${g.fixedKey ? 'border-t-2 border-amber-400' : ''}`} style={{ height: `${(share * 100).toFixed(1)}%`, minHeight: 2 }} data-form-bar={g.md} data-form-mark={mark.toFixed(1)} />;
        })}
      </div>
    </div>
  );
}

function Review({ model, reduced }: { model: CentreModel; reduced: boolean }) {
  const { season: s, review, names, words } = model;
  const moment = useCareerMoment(review.title ? `${model.momentKey}|review` : null);
  const played = s.games.filter(g => g.played);
  const mark = model.sport.markOf;
  const copy = copyOf(model);
  const markText = model.sport.markText ?? ((x: DerivedGame) => `rated ${mark(x).toFixed(1)}`);
  const letter = (x: DerivedGame) => (resultOf(x) === 'D' ? copy.tie : resultOf(x));
  const best = [...played].sort((a, b) => mark(b) - mark(a))[0];
  const form = s.games.slice(-5);
  const derbies = played.filter(g => g.fixedKey);
  const dr = { w: 0, d: 0, l: 0 };
  for (const g of derbies) dr[resultOf(g) === 'W' ? 'w' : resultOf(g) === 'D' ? 'd' : 'l'] += 1;
  const tiles = review.tiles;
  const rise = (i: number) => (reduced ? undefined : { animationDelay: revealDelay(i, 0.1, 0.16) });
  const bucket = s.bucket && s.bucket.apps > 0 ? s.bucket : null;
  return (
    <div ref={moment.ref} className="relative space-y-3" data-review>
      {review.title && moment.fresh && moment.live && !reduced && <Confetti pieces={55} gold />}
      <div className={reduced ? '' : 'cm-rise'} style={rise(0)}>
        <div className="text-lg font-black">Season review</div>
        {review.finishLine && <div className="text-sm font-semibold" data-review-finish>{review.finishLine}</div>}
        {review.championLine && <div className="text-xs text-muted-foreground" data-review-champion>{review.championLine}</div>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map(([label, value], i) => (
          <div key={label} className={`${reduced ? '' : 'cm-rise'} rounded-lg bg-muted/30 p-2 text-center`} style={rise(i + 1)} data-review-tile={label}>
            <div className="text-lg font-black tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{copy.scope}</div>
      {best && (
        <div className={`${reduced ? '' : 'cm-rise'} text-xs`} style={rise(5)}>
          ⭐ {copy.best}: {words.round} {best.md}, {letter(best)} {best.us}-{best.them} vs {names[best.opp]}, {markText(best)}
        </div>
      )}
      <div className={`${reduced ? '' : 'cm-rise'} flex items-center gap-1 text-xs`} style={rise(6)}>
        <span className="mr-1 text-muted-foreground">Last five:</span>
        {form.map(g => <span key={g.md} className={`rounded px-1.5 font-bold ${PILL[resultOf(g)]}`}>{letter(g)}</span>)}
      </div>
      <FormStrip model={model} reduced={reduced} style={rise(7)} />
      {derbies.length > 0 && <div className="text-xs" style={rise(7)}>{model.sport.fixed.recordPlayed}: {dr.w}W {dr.d}D {dr.l}L</div>}
      {bucket && (
        <div className="text-xs text-muted-foreground" data-review-bucket>
          {model.sport.bucket(bucket)}
        </div>
      )}
      {review.notes.map(n => <div key={n} className="text-xs text-muted-foreground">{n}</div>)}
      {(model.moments?.review ?? []).map(n => <div key={n} className="text-xs" data-review-moments>🎯 {n}</div>)}
      {review.trophies.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center text-amber-400">
          {review.title
            ? <VictoryMoment compact><span className="text-sm font-bold text-foreground">{review.trophies.join(' · ')}</span></VictoryMoment>
            : <span className="text-sm font-bold text-foreground">{review.trophies.join(' · ')}</span>}
        </div>
      )}
      {review.path && (
        <div className="rounded-lg border border-border bg-card p-2" data-playoff-path>
          <div className="mb-1 text-xs font-black uppercase tracking-wider text-muted-foreground">{review.path.head}</div>
          <ol className="space-y-1">
            {review.path.steps.map((st, i) => (
              <li key={st.label} className={`${reduced ? '' : 'cm-rise'} flex items-center gap-2 text-xs`} style={rise(8 + i)} data-playoff-round={st.won ? 'W' : 'L'}>
                <span className={`shrink-0 rounded px-1.5 font-bold ${PILL[st.won ? 'W' : 'L']}`}>{st.won ? 'W' : 'L'}</span>
                <span className="shrink-0 font-semibold">{st.label}</span>
                <span className="min-w-0 text-muted-foreground">{st.text}</span>
              </li>
            ))}
          </ol>
          {review.path.line && <div className="mt-1 text-[11px] text-muted-foreground" data-playoff-line>{review.path.line}</div>}
        </div>
      )}
    </div>
  );
}

/** A place in a season: rounds fully watched, and the clock speed he had. When the viewer tells a place it also tells
 *  its own word for a round of this season ("Matchday", "League game"), so whatever leads back here can say the same. */
export interface CentrePlace { md: number; speed: ClockSpeed; round?: string }

interface SeasonCentreProps {
  model: CentreModel;
  exitLabel: string;
  onClose: () => void;
  /** Round 1046: open with `md` rounds already watched (1 to the last but one; anything else is ignored). */
  resume?: CentrePlace | null;
  /** Round 1046: told where he is after every round, and null when nothing is left to resume. */
  onProgress?: (at: CentrePlace | null) => void;
  navigation?: ReactNode;
  /** Keep the league's state while another competition has the stage. */
  active?: boolean;
}

export function SeasonCentre({ model, exitLabel, onClose, resume, onProgress, navigation, active = true }: SeasonCentreProps) {
  const s = model.season;
  const M = s.games.length;
  const start = resume && Number.isInteger(resume.md) && resume.md >= 1 && resume.md <= M - 1 ? resume : null;
  const reduced = useReducedMotion();
  const wide = useWide();
  const [stage, setStage] = useState<Stage>({ kind: 'kickoff' });
  const [played, setPlayed] = useState(() => start?.md ?? 0);
  const [cupSeen, setCupSeen] = useState<Set<string>>(() => new Set((model.calendar?.games ?? []).filter(game => game.afterLeague < (start?.md ?? 0)).map(game => game.id)));
  const [speed, setSpeed] = useState<ClockSpeed>(() => start?.speed ?? 1);
  const [paused, setPaused] = useState(false);
  const [ft, setFt] = useState(false);
  const [fixturesOpen, setFixturesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useHelpOnce(model.helpKey);
  const copy = copyOf(model);
  const [postersSeen] = useState(() => new Set<number>());
  /* Round 1047: the moment on the stage ("md|id"), and the ones he let play in this visit */
  const [hosting, setHosting] = useState<string | null>(null);
  const [passed, setPassed] = useState<readonly string[]>([]);
  const moments = model.moments ?? null;
  const momentKeyOf = (m: CentreMoment) => `${m.md}|${m.id}`;
  const openMoment = (md: number): CentreMoment | null => (moments?.list ?? []).find(m => m.md === md && !m.taken && !passed.includes(momentKeyOf(m))) ?? null;

  /* the page behind does not scroll or shift (Round 1046 lifted the lock so the season picker takes the same one) */
  useBodyLock(active);
  /* focus goes back to the Season Centre when the help sheet closes, so Escape still leaves it */
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const setDialog = useCallback((el: HTMLDivElement | null) => { dialogRef.current = el; focusDialogOnMount(el); }, []);
  const closeHelp = useCallback(() => { setHelpOpen(false); dialogRef.current?.focus(); }, [setHelpOpen]);

  const go = useCallback((md: number) => {
    setFt(false);
    setHosting(null);
    setPaused(false);
    setFixturesOpen(false);
    if (postersFor(s, md).length > 0 && !postersSeen.has(md)) { postersSeen.add(md); setStage({ kind: 'poster', md }); }
    else setStage({ kind: 'match', md });
  }, [s, postersSeen]);
  const toEnd = useCallback(() => { setHosting(null); setCupSeen(new Set((model.calendar?.games ?? []).map(game => game.id))); setPlayed(M); setFt(true); setStage({ kind: 'review' }); }, [M, model.calendar]);
  const nextCup = nextCupGame(model.calendar?.games ?? [], played, cupSeen);
  const continueAfter = (md: number) => {
    const cup = nextCupGame(model.calendar?.games ?? [], md, cupSeen);
    if (cup) { setHosting(null); setFixturesOpen(false); setStage({ kind: 'cup', id: cup.id, revealed: false }); }
    else if (md >= M) setStage({ kind: 'review' });
    else go(md + 1);
  };
  /* the season's stars bank at the review, once, or on the way out when no moment is left to play (a season with no moment taken banks nothing) */
  const bankRef = useRef(moments?.bank);
  bankRef.current = moments?.bank;
  useEffect(() => { if (active && stage.kind === 'review') bankRef.current?.(true); }, [active, stage.kind]);
  const leave = useCallback(() => { bankRef.current?.(false); onClose(); }, [onClose]);
  /* Round 1046: his place. A resume that does not fit this season is dropped once; after that every round watched is told, and the review (or a start from the top) says there is nothing left to come back to */
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const misfit = !!resume && !start;
  useEffect(() => { if (active && misfit) progressRef.current?.(null); }, [active, misfit]);
  const current = stage.kind === 'match' || stage.kind === 'poster' ? stage.md : null;
  /* Round 1046: every new screen of the stage starts at its top (the table may have pulled the stage down at full time) */
  const stageRef = useRef<HTMLElement | null>(null);
  const stageIdentity = stage.kind === 'cup' ? stage.id : current;
  useEffect(() => { if (stageRef.current) stageRef.current.scrollTop = 0; }, [stage.kind, stageIdentity]);
  const onFullTime = useCallback(() => { if (current !== null) { setPlayed(p => Math.max(p, current)); setFt(true); } }, [current]);
  /* the next big game from the very next matchday on; when that next one is
     the big game the ▶ button already plays it (poster first), so ⏩ only
     shows for a big game further on and never jumps over one */
  let nextBig: number | null = null;
  for (let md = played + 1; md <= M && nextBig === null; md += 1) if (postersFor(s, md).length || openMoment(md)) nextBig = md;
  if (nextBig !== null && nextBig <= played + 1) nextBig = null;
  const roundWord = s.mode === 'results' ? 'League game' : model.words.round;
  const so = soFar(s, played);
  const soTiles = model.sport.soFar(so);
  /* his place, told after every round with the viewer's own word for a round (so the Resume chip says what the button
     here says); the review says there is nothing left to come back to. It sits below roundWord because it tells it. */
  useEffect(() => {
    if (!active) return;
    if (stage.kind === 'review') progressRef.current?.(null);
    else if (played >= 1 && played <= M - 1) progressRef.current?.({ md: played, speed, round: roundWord });
  }, [active, played, speed, stage.kind, M, roundWord]);
  const btn = 'h-11 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-bold';

  /* Round 1047: on a phone the fixtures take the stage's place, which unmounts
     the match and whatever it is hosting. A moment is one go, so while one is
     on the stage (offer, board or verdict) the fixtures stay shut and the
     button is not drawn: there is no way to leave a board and meet its offer again. */
  const fixturesShown = fixturesOpen && hosting === null;

  const stageBody = (() => {
    if (stage.kind === 'kickoff') return <KickOff model={model} from={played} roundWord={roundWord} onKick={() => continueAfter(played)} onStraight={toEnd} onRestart={() => { setPlayed(0); setCupSeen(new Set()); progressRef.current?.(null); }} />;
    if (stage.kind === 'review') return <Review model={model} reduced={reduced} />;
    if (stage.kind === 'poster') return <Poster key={`p${stage.md}`} model={model} md={stage.md} reduced={reduced} />;
    if (stage.kind === 'cup') {
      const cup = model.calendar?.games.find(game => game.id === stage.id);
      if (!cup) return <p>Saved cup game unavailable.</p>;
      const match = cup.match;
      return <div className="space-y-3" data-centre-calendar-cup={cup.id} data-cup-revealed={stage.revealed ? 'true' : 'false'}>
        <h3 className="text-sm font-black">{cup.name} · {match.round}</h3>
        <p className="text-xs text-muted-foreground">After league game {cup.afterLeague}. {model.calendar?.note}</p>
        <div className="rounded-xl bg-muted/30 p-4 text-center">
          <p className="font-bold" data-calendar-cup-opponent>{model.header.club} vs {match.opponent ?? 'Opponents not recorded'}</p>
          <p className="mt-1 text-xs">{match.home === undefined ? 'Venue not recorded' : match.home ? 'Home' : 'Away'}</p>
          {stage.revealed ? <>
            <p className="my-2 text-3xl font-black tabular-nums" data-calendar-cup-score>{match.goalsFor === null || match.goalsAgainst === null ? 'Score not recorded' : `${match.goalsFor}-${match.goalsAgainst}`}</p>
            {match.result && <p className="text-sm font-bold" data-calendar-cup-verdict>{match.result}</p>}
            {match.note && <p className="mt-1 text-xs">{match.note}</p>}
            {match.playerGoals !== undefined && <p className="mt-1 text-xs">You scored {match.playerGoals}. Already included in your season totals.</p>}
          </> : <p className="mt-3 text-xs text-muted-foreground">This is the result already kept in your career. Watching it does not replay the simulation.</p>}
        </div>
        <button type="button" className="min-h-11 w-full rounded-lg border border-border px-3 text-xs font-bold" onClick={() => model.calendar?.onCompetition(cup.competition)} data-calendar-cup-competition>Open {cup.name} bracket</button>
      </div>;
    }
    const g = s.games[stage.md - 1];
    const pending = openMoment(stage.md);
    const host = hosting !== null ? (moments?.list ?? []).find(m => momentKeyOf(m) === hosting && m.md === stage.md) ?? null : null;
    const [hu, ht] = host ? scoreAt(g.events, host.minute - 1) : [0, 0];
    return (
      <div key={`m${stage.md}`} className={`${reduced ? '' : 'cm-rise'} space-y-3`} data-matchday={stage.md}>
        <div className="text-xs text-muted-foreground">
          {roundWord} {stage.md}{s.mode === 'table' ? ` of ${M}` : ''} · {g.home ? 'Home' : 'Away'}{g.fixedKey ? ` · ${model.occasion[g.fixedKey] ?? model.sport.fixed.poster}` : ''}
        </div>
        <div className={host ? 'hidden' : undefined}>
          <MatchClock key={`clock-${stage.md}`} game={g} clock={model.sport.clock} usName={model.header.club} themName={model.names[g.opp]} speed={speed} paused={paused || !active} reduced={reduced} onFullTime={onFullTime} active={active}
            holdAt={host ? host.minute : pending ? pending.minute : null} onHold={() => { if (pending) setHosting(momentKeyOf(pending)); }}
            stage={model.sport.pitch ? at => model.sport.pitch!(g, at) : undefined} />
        </div>
        {host && moments && (
          <MomentHost key={hosting} moment={host} moments={moments} reduced={reduced}
            scoreLine={`${model.sport.clock.label(host.minute)} · ${g.home ? `${hu}-${ht}` : `${ht}-${hu}`}`}
            onDone={took => { if (!took) setPassed(p => [...p, momentKeyOf(host)]); setHosting(null); }} />
        )}
        {(ft || !g.played) && <HisLine g={g} sport={model.sport} />}
      </div>
    );
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/80 backdrop-blur-sm md:items-center md:p-4" data-season-centre aria-hidden={!active || undefined} style={active ? undefined : { display: 'none' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={model.words.title}
        tabIndex={-1}
        ref={setDialog}
        onKeyDown={escapeCloses(leave)}
        className="relative flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-background outline-none md:h-[min(860px,calc(100vh-2rem))] md:rounded-2xl md:border md:border-border"
      >
        <CelebrationStyles />
        {/* Round 1046: on a phone the club and season get a row of their own, in full; from md up it is one row as before */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-2">
          <span className="min-w-0 flex-1 text-sm font-black md:flex-none">📺 {model.words.title}</span>
          <span className="order-last w-full text-xs text-muted-foreground md:order-none md:w-auto md:min-w-0 md:flex-1 md:truncate" data-centre-header>{model.header.club} · {model.header.seasonLabel}</span>
          <button type="button" onClick={() => setHelpOpen(true)} className="h-11 w-11 shrink-0 rounded-lg border border-border text-sm font-bold" aria-label={model.help.title}>?</button>
          <button type="button" onClick={leave} className="h-11 shrink-0 rounded-lg border border-border px-3 text-xs font-semibold" data-centre-exit>{exitLabel}</button>
        </div>
        {active && hosting === null && navigation}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr_380px]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-border p-2 md:block" aria-label={copy.list}>
            <FixtureList model={model} played={played} current={current} short={model.sport.clock.short} cupSeen={cupSeen} cupCurrent={stage.kind === 'cup' ? stage.id : null} />
          </aside>
          <main ref={stageRef} className="min-h-0 overflow-y-auto p-3 md:p-4" data-centre-stage>
            {fixturesShown ? (
              <div className="space-y-2">
                <button type="button" onClick={() => setFixturesOpen(false)} className="h-11 rounded-lg border border-border px-3 text-xs font-semibold">← Back</button>
                <FixtureList model={model} played={played} current={current} cupSeen={cupSeen} cupCurrent={stage.kind === 'cup' ? stage.id : null} />
              </div>
            ) : stageBody}
            {!fixturesShown && (
              <div className="mt-3 space-y-3 md:hidden">
                {!wide && <TablePanel model={model} played={played} compact />}
                {!wide && s.mode === 'record' && <RecordPanel model={model} played={played} compact reduced={reduced} tie={copy.tie} groups={model.groups} short={model.sport.clock.short} />}
                {hosting === null && <button type="button" onClick={() => setFixturesOpen(true)} className="h-11 w-full rounded-lg border border-border text-xs font-semibold" data-centre-fixtures>🗓 {copy.list}</button>}
              </div>
            )}
            <div className="mt-3 grid grid-cols-4 gap-2 text-center md:hidden" data-so-far>
              {soTiles.map(([label, value]) => (
                <div key={label}><div className="text-sm font-black tabular-nums">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
              ))}
            </div>
          </main>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-border p-2 md:block" aria-label={copy.side}>
            {s.mode === 'table'
              ? (wide && <TablePanel model={model} played={played} compact={false} />)
              : s.mode === 'record'
                ? (wide && <RecordPanel model={model} played={played} compact={false} reduced={reduced} tie={copy.tie} groups={model.groups} />)
                : <p className="text-xs text-muted-foreground">{model.resultsWhy}</p>}
            <div className="mt-3 rounded-lg bg-muted/30 p-2 text-xs" data-so-far-desktop>
              <div className="mb-1 font-bold">{copy.soFarHead}</div>
              {soTiles.filter(([, value]) => value !== '-').map(([label, value]) => `${value} ${label.toLowerCase()}`).join(' · ')}
            </div>
          </aside>
        </div>
        {stage.kind !== 'kickoff' && hosting === null && (<div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-2 py-2" data-centre-bar>
          {stage.kind === 'poster' && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => setStage({ kind: 'match', md: stage.md })}>▶ {roundWord} {stage.md}</button>}
          {stage.kind === 'match' && !ft && (
            <button type="button" className={`${btn} flex-1 basis-full border border-border sm:basis-0`} onClick={() => setPaused(p => !p)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
          )}
          {stage.kind === 'match' && ft && (stage.md < M || nextCup) && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => continueAfter(stage.md)} data-centre-next-cup={nextCup?.id}>▶ {nextCup ? `${nextCup.name}: ${nextCup.match.round}` : `${roundWord} ${stage.md + 1}`}</button>}
          {stage.kind === 'match' && ft && stage.md === M && !nextCup && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => continueAfter(M)}>📋 Season review</button>}
          {stage.kind === 'cup' && !stage.revealed && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => { setCupSeen(seen => new Set([...seen, stage.id])); setStage({ ...stage, revealed: true }); }} data-calendar-cup-reveal>▶ Show saved cup result</button>}
          {stage.kind === 'cup' && stage.revealed && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => continueAfter(played)} data-calendar-cup-continue>▶ {nextCup ? `${nextCup.name}: ${nextCup.match.round}` : played < M ? `${roundWord} ${played + 1}` : 'Season review'}</button>}
          {(stage.kind === 'match' || stage.kind === 'poster') && nextBig !== null && ft && (
            <button type="button" className={`${btn} border border-border`} onClick={() => { setCupSeen(new Set((model.calendar?.games ?? []).filter(game => game.afterLeague < nextBig!).map(game => game.id))); setPlayed(nextBig! - 1); go(nextBig!); }}>⏩ To the next big game</button>
          )}
          {(stage.kind === 'match' || stage.kind === 'poster' || stage.kind === 'cup') && <button type="button" className={`${btn} border border-border`} onClick={toEnd}>⏭ Sim the rest</button>}
          {stage.kind !== 'review' && (
            <div className="ml-auto flex shrink-0 gap-1" role="group" aria-label="Clock speed">
              {([1, 3, 'results'] as ClockSpeed[]).map(v => (
                <button key={String(v)} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)} className={`${btn} min-w-11 px-2 ${speed === v ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                  {v === 'results' ? 'Results' : `${v}x`}
                </button>
              ))}
            </div>
          )}
          {stage.kind === 'review' && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={leave}>{exitLabel}</button>}
        </div>)}
        {helpOpen && <SeasonCentreHelp words={model.help} onClose={closeHelp} />}
      </div>
    </div>
  );
}
