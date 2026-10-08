/* Round 1045: the Season Centre, the shared viewer every career's "week by
   week" uses (soccer first; the NBA and NFL binds bring their own words).

   It shows a season the career already played: src/lib/season/core.ts
   derived it from the save, and nothing here draws a number or writes the
   save. Screens: the kick off card, the matchday (fixtures, the stage with
   the match clock, the table), posters before the big games (derby day,
   halfway, title decided, final day) and the review. Desktop is a three
   column modal that never scrolls the page; the phone is one column with a
   fixed bottom bar and the fixtures behind a tile with a back button.
   Only arrival animates, with the shared kit's classes; no number counts. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soFar, tableAt, type DerivedGame, type DerivedSeason, type SeasonWords } from '@/lib/season/core';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { CelebrationStyles } from '@/components/club-manager/CelebrationStyles';
import { revealDelay } from '@/components/club-manager/Celebration';
import { Confetti } from '@/components/soccer-career/CareerFx';
import VictoryMoment from '@/components/game/VictoryMoment';
import { useCareerMoment } from '@/components/soccer-career/careerMoments';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { ordinal } from '@/lib/soccerCareerLeague';
import { MatchClock, type ClockSpeed, type SeasonClock } from './MatchClock';
import { SeasonCentreHelp, useHelpOnce, type HelpWords } from './SeasonCentreHelp';
import { RecordPanel } from './RecordPanel';

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
  lastBadge: 'FINAL DAY',
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
  /** His league totals so far as labelled tiles. */
  soFar: (so: Record<string, number>) => [string, string][];
  /** The halfway poster's line from his first half totals. */
  half: (so: Record<string, number>) => string;
  /** The games not shown one by one, in one line. */
  bucket: (b: { apps: number; line: Record<string, number> }) => string;
}

type Stage = { kind: 'kickoff' } | { kind: 'poster'; md: number } | { kind: 'match'; md: number } | { kind: 'review' };

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

function FixtureList({ model, played, current, short }: { model: CentreModel; played: number; current: number | null; short?: (name: string) => string }) {
  const { season: s, names, words } = model;
  const copy = copyOf(model);
  return (
    <ol className="space-y-1" data-fixtures>
      {s.games.map(g => {
        const done = g.md <= played;
        const r = resultOf(g);
        const on = current === g.md;
        return (
          <li key={g.md} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${on ? 'bg-primary/15 ring-1 ring-primary/40' : ''}`} aria-current={on ? 'true' : undefined}>
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{g.md}</span>
            <span className="w-4 shrink-0 text-[10px] text-muted-foreground">{g.home ? 'H' : 'A'}</span>
            <span className={`min-w-0 flex-1 truncate ${done ? '' : 'text-muted-foreground'} ${names[g.opp] === words.unnamed ? 'italic' : ''}`}>{short ? short(names[g.opp]) : names[g.opp]}</span>
            {g.fixedKey && <span className="shrink-0 rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-400">{model.sport.fixed.badge}</span>}
            {g.md === s.games.length && <span className="shrink-0 rounded bg-sky-500/20 px-1 text-[9px] font-bold text-sky-400">{copy.lastBadge}</span>}
            {done && <span className={`shrink-0 rounded px-1.5 text-[10px] font-bold tabular-nums ${PILL[r]}`}>{r === 'D' ? copy.tie : r} {g.us}-{g.them}</span>}
          </li>
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
      <span className="rounded-md bg-primary/15 px-2 py-0.5 font-black tabular-nums text-primary">{sport.markChip ? sport.markChip(g) : sport.markOf(g).toFixed(1)}</span>
      {bits.map(b => <span key={b}>{b}</span>)}
      {alarm && <span className="text-red-400">{alarm}</span>}
    </div>
  );
}

function TablePanel({ model, played, compact }: { model: CentreModel; played: number; compact: boolean }) {
  const { season: s } = model;
  const rows = useMemo(() => tableAt(s, played), [s, played]);
  const before = useMemo(() => tableAt(s, Math.max(0, played - 1)), [s, played]);
  if (s.mode !== 'table') return null;
  const keyOf = (slot: number) => s.labels[slot]?.key ?? `u${slot}`;
  const unnamed = new Set(s.labels.filter(l => !l.named).map(l => l.key));
  const at = rows.findIndex(r => r.slot === 0) + 1;
  const was = before.findIndex(r => r.slot === 0) + 1;
  const move = played > 1 ? was - at : 0;
  return (
    <div data-centre-table>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold">{played === 0 ? 'Before a ball is kicked' : `After ${model.words.round.toLowerCase()} ${played}`}</span>
        {played > 0 && (
          <span key={`${played}-${at}`} className="cm-tick-in font-bold tabular-nums" data-his-position>
            {ordinal(at)}{move > 0 ? ` ▲${move}` : move < 0 ? ` ▼${-move}` : ''}
          </span>
        )}
      </div>
      <LeagueTableCard
        rows={rows.map(r => ({ club: keyOf(r.slot), w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts }))}
        myClub={keyOf(0)}
        compact={compact}
        preseason={played === 0}
        zoneTop={1}
        isUnnamed={k => unnamed.has(k)}
        footnote="Clubs level on points are split by goal difference, then goals scored: this game's rule."
      />
    </div>
  );
}

function KickOff({ model, onKick, onStraight }: { model: CentreModel; onKick: () => void; onStraight: () => void }) {
  const { season: s, header, names, occasion } = model;
  const copy = copyOf(model);
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
      </div>
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First five</div>
        <ul className="space-y-1">
          {s.games.slice(0, 5).map(g => (
            <li key={g.md} className="flex items-center gap-2 text-xs">
              <span className="w-6 tabular-nums text-muted-foreground">{g.md}</span>
              <span className="w-10 text-muted-foreground">{g.home ? 'Home' : 'Away'}</span>
              <span className={`min-w-0 flex-1 truncate ${names[g.opp] === model.words.unnamed ? 'italic text-muted-foreground' : ''}`}>{names[g.opp]}</span>
              {g.fixedKey && <span className="rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-400">{model.sport.fixed.badge} · {occasion[g.fixedKey] ?? ''}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onKick} className="h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500">{copy.start}</button>
        <button type="button" onClick={onStraight} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted/40">
          {s.mode === 'table' ? '⏭ Straight to the final table' : '⏭ Straight to the season review'}
        </button>
      </div>
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
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground">{copy.scope}</div>
      {best && (
        <div className={`${reduced ? '' : 'cm-rise'} text-xs`} style={rise(5)}>
          ⭐ {copy.best}: {words.round} {best.md}, {letter(best)} {best.us}-{best.them} vs {names[best.opp]}, {markText(best)}
        </div>
      )}
      <div className={`${reduced ? '' : 'cm-rise'} flex items-center gap-1 text-xs`} style={rise(6)}>
        <span className="mr-1 text-muted-foreground">Last five:</span>
        {form.map(g => <span key={g.md} className={`rounded px-1.5 font-bold ${PILL[resultOf(g)]}`}>{letter(g)}</span>)}
      </div>
      {derbies.length > 0 && <div className="text-xs" style={rise(7)}>{model.sport.fixed.recordPlayed}: {dr.w}W {dr.d}D {dr.l}L</div>}
      {bucket && (
        <div className="text-xs text-muted-foreground" data-review-bucket>
          {model.sport.bucket(bucket)}
        </div>
      )}
      {review.notes.map(n => <div key={n} className="text-xs text-muted-foreground">{n}</div>)}
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

export function SeasonCentre({ model, exitLabel, onClose }: { model: CentreModel; exitLabel: string; onClose: () => void }) {
  const s = model.season;
  const M = s.games.length;
  const reduced = useReducedMotion();
  const wide = useWide();
  const [stage, setStage] = useState<Stage>({ kind: 'kickoff' });
  const [played, setPlayed] = useState(0);
  const [speed, setSpeed] = useState<ClockSpeed>(1);
  const [paused, setPaused] = useState(false);
  const [ft, setFt] = useState(false);
  const [fixturesOpen, setFixturesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useHelpOnce(model.helpKey);
  const copy = copyOf(model);
  const [postersSeen] = useState(() => new Set<number>());

  useEffect(() => {
    /* the scroll lock pads the body by the scrollbar it hides, so the page
       behind does not shift sideways when the overlay opens or closes */
    const body = document.body;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const bar = window.innerWidth - document.documentElement.clientWidth;
    if (bar > 0) body.style.paddingRight = `${(parseFloat(window.getComputedStyle(body).paddingRight) || 0) + bar}px`;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = prev.overflow; body.style.paddingRight = prev.paddingRight; };
  }, []);
  /* focus goes back to the Season Centre when the help sheet closes, so Escape still leaves it */
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const setDialog = useCallback((el: HTMLDivElement | null) => { dialogRef.current = el; focusDialogOnMount(el); }, []);
  const closeHelp = useCallback(() => { setHelpOpen(false); dialogRef.current?.focus(); }, [setHelpOpen]);

  const go = useCallback((md: number) => {
    setFt(false);
    setPaused(false);
    setFixturesOpen(false);
    if (postersFor(s, md).length > 0 && !postersSeen.has(md)) { postersSeen.add(md); setStage({ kind: 'poster', md }); }
    else setStage({ kind: 'match', md });
  }, [s, postersSeen]);
  const toEnd = useCallback(() => { setPlayed(M); setFt(true); setStage({ kind: 'review' }); }, [M]);
  const current = stage.kind === 'match' || stage.kind === 'poster' ? stage.md : null;
  const onFullTime = useCallback(() => { if (current !== null) { setPlayed(p => Math.max(p, current)); setFt(true); } }, [current]);
  /* the next big game from the very next matchday on; when that next one is
     the big game the ▶ button already plays it (poster first), so ⏩ only
     shows for a big game further on and never jumps over one */
  let nextBig: number | null = null;
  for (let md = played + 1; md <= M && nextBig === null; md += 1) if (postersFor(s, md).length) nextBig = md;
  if (nextBig !== null && nextBig <= played + 1) nextBig = null;
  const roundWord = s.mode === 'results' ? 'League game' : model.words.round;
  const so = soFar(s, played);
  const soTiles = model.sport.soFar(so);
  const btn = 'h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-bold';

  const stageBody = (() => {
    if (stage.kind === 'kickoff') return <KickOff model={model} onKick={() => go(1)} onStraight={toEnd} />;
    if (stage.kind === 'review') return <Review model={model} reduced={reduced} />;
    if (stage.kind === 'poster') return <Poster key={`p${stage.md}`} model={model} md={stage.md} reduced={reduced} />;
    const g = s.games[stage.md - 1];
    return (
      <div key={`m${stage.md}`} className={`${reduced ? '' : 'cm-rise'} space-y-3`} data-matchday={stage.md}>
        <div className="text-xs text-muted-foreground">
          {roundWord} {stage.md}{s.mode === 'table' ? ` of ${M}` : ''} · {g.home ? 'Home' : 'Away'}{g.fixedKey ? ` · ${model.occasion[g.fixedKey] ?? model.sport.fixed.poster}` : ''}
        </div>
        <MatchClock key={`clock-${stage.md}`} game={g} clock={model.sport.clock} usName={model.header.club} themName={model.names[g.opp]} speed={speed} paused={paused} reduced={reduced} onFullTime={onFullTime} />
        {(ft || !g.played) && <HisLine g={g} sport={model.sport} />}
      </div>
    );
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/80 backdrop-blur-sm md:items-center md:p-4" data-season-centre>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={model.words.title}
        tabIndex={-1}
        ref={setDialog}
        onKeyDown={escapeCloses(onClose)}
        className="relative flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-background outline-none md:h-[min(860px,calc(100vh-2rem))] md:rounded-2xl md:border md:border-border"
      >
        <CelebrationStyles />
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-black">📺 {model.words.title}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{model.header.club} · {model.header.seasonLabel}</span>
          <button type="button" onClick={() => setHelpOpen(true)} className="h-9 w-9 shrink-0 rounded-lg border border-border text-sm font-bold" aria-label={model.help.title}>?</button>
          <button type="button" onClick={onClose} className="h-9 shrink-0 rounded-lg border border-border px-3 text-xs font-semibold" data-centre-exit>{exitLabel}</button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_1fr_380px]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-border p-2 md:block" aria-label={copy.list}>
            <FixtureList model={model} played={played} current={current} short={model.sport.clock.short} />
          </aside>
          <main className="min-h-0 overflow-y-auto p-3 md:p-4" data-centre-stage>
            {fixturesOpen ? (
              <div className="space-y-2">
                <button type="button" onClick={() => setFixturesOpen(false)} className="h-9 rounded-lg border border-border px-3 text-xs font-semibold">← Back</button>
                <FixtureList model={model} played={played} current={current} />
              </div>
            ) : stageBody}
            {!fixturesOpen && (
              <div className="mt-4 space-y-3 md:hidden">
                <button type="button" onClick={() => setFixturesOpen(true)} className="h-10 w-full rounded-lg border border-border text-xs font-semibold">🗓 {copy.list}</button>
                {!wide && <TablePanel model={model} played={played} compact />}
                {!wide && s.mode === 'record' && <RecordPanel model={model} played={played} compact reduced={reduced} tie={copy.tie} groups={model.groups} short={model.sport.clock.short} />}
              </div>
            )}
            <div className="mt-3 grid grid-cols-4 gap-2 text-center md:hidden" data-so-far>
              {soTiles.map(([label, value]) => (
                <div key={label}><div className="text-sm font-black tabular-nums">{value}</div><div className="text-[9px] text-muted-foreground">{label}</div></div>
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
        {stage.kind !== 'kickoff' && (<div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-2 py-2" data-centre-bar>
          {stage.kind === 'poster' && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => setStage({ kind: 'match', md: stage.md })}>▶ {roundWord} {stage.md}</button>}
          {stage.kind === 'match' && !ft && (
            <button type="button" className={`${btn} flex-1 basis-full border border-border sm:basis-0`} onClick={() => setPaused(p => !p)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
          )}
          {stage.kind === 'match' && ft && stage.md < M && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => go(stage.md + 1)}>▶ {roundWord} {stage.md + 1}</button>}
          {stage.kind === 'match' && ft && stage.md === M && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={() => setStage({ kind: 'review' })}>📋 Season review</button>}
          {(stage.kind === 'match' || stage.kind === 'poster') && nextBig !== null && ft && (
            <button type="button" className={`${btn} border border-border`} onClick={() => { setPlayed(nextBig! - 1); go(nextBig!); }}>⏩ To the next big game</button>
          )}
          {(stage.kind === 'match' || stage.kind === 'poster') && <button type="button" className={`${btn} border border-border`} onClick={toEnd}>⏭ Sim the rest</button>}
          {stage.kind !== 'review' && (
            <div className="ml-auto flex shrink-0 gap-1" role="group" aria-label="Clock speed">
              {([1, 3, 'results'] as ClockSpeed[]).map(v => (
                <button key={String(v)} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)} className={`${btn} px-2 ${speed === v ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                  {v === 'results' ? 'Results' : `${v}x`}
                </button>
              ))}
            </div>
          )}
          {stage.kind === 'review' && <button type="button" className={`${btn} flex-1 basis-full bg-emerald-600 text-black sm:basis-0`} onClick={onClose}>{exitLabel}</button>}
        </div>)}
        {helpOpen && <SeasonCentreHelp words={model.help} onClose={closeHelp} />}
      </div>
    </div>
  );
}
