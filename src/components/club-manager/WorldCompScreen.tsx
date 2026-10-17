import { Suspense, cloneElement, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CareerState, TableRow } from '@/lib/clubManager';
import { careerLeagueOf, uclGroupRule, worldUclFormatOf } from '@/lib/clubManager';
import { shortDate, type CalDate } from '@/lib/clubManagerCalendar';
import { uclGroupFootnote } from '@/lib/clubManagerUclGroups';
import { leaguePhaseFootnote } from '@/lib/uclLeaguePhase';
import type { WorldKoRound } from '@/lib/worldCompetition';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import {
  clubRun, firstStageNights, nextNight, nightLabel, ordinal, roundPlural, worldUclStatus, worldUclView,
  type WorldCompView, type WorldViewNight, type WorldViewTie,
} from '@/lib/clubManagerWorldView';

/**
 * Round 1503: the Cups panel as two tiles (the domestic cup and the Champions League), and the Champions League
 * screen behind the second one: Table (Groups in the eras), Matchdays, Knockouts and Final, and any club's run in
 * it. The same screen for the club in it and the club watching it from outside (clubManagerWorldView.ts reads
 * both). Small tiles and a back button, one view at a time; going back puts the page where it was.
 *
 * ClubManager.tsx hands in the cards it has always mounted on this panel (the cup line, CupBracketCard,
 * UclGroupsCard, UclBracketCard) as elements, in the panel's old order, so its source keeps the order
 * scripts/simClubManagerEraMidSeason.mjs section 6 reads (the critic's correction 13, option A). The cards are
 * mounted unedited; this file only swaps the handler a tapped club calls, so a club tapped here opens its run
 * here, and a club page opened from here comes back to the view it was opened from.
 */

type Tab = 'table' | 'matchdays' | 'knockouts' | 'final';
interface Nav { at: 'tiles' | 'cup' | 'ucl'; tab: Tab | null; run: string | null; night: number | null; ko: WorldKoRound | null; group: string | null }
const HOME: Nav = { at: 'tiles', tab: null, run: null, night: null, ko: null, group: null };
const depthOf = (n: Nav): number => (n.at === 'tiles' ? 0 : n.run ? 3 : n.tab ? 2 : 1);

/* The club page replaces the whole hub (ClubManager.tsx draws ClubDetailScreen alone), which unmounts this panel.
   A club page opened from here leaves where the player stood, and the panel takes it back on its next mount, once,
   for the same save at the same week. Nothing else ever sets it, so a visit to Club home starts at the tiles. */
let resume: { key: string; nav: Nav } | null = null;
const saveKey = (c: CareerState): string => `${c.clubName}|${c.season}|${c.week}`;

const tileClass = 'min-h-[44px] rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const backClass = 'inline-flex min-h-[44px] min-w-[44px] items-center gap-1 pr-2 text-xs text-muted-foreground hover:text-foreground';
const pillClass = (on: boolean): string => cn(
  'shrink-0 min-h-[44px] px-3 rounded-full border text-xs font-bold transition-colors',
  on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary',
);

function Tile({ icon, title, value, sub, onClick, testId }: { icon: string; title: string; value: string; sub?: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" onClick={onClick} className={tileClass} data-cm-world-tile={testId}>
      <div className="text-base leading-none mb-1">{icon}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-sm font-bold font-display text-foreground break-words">{value}</div>
      {sub && <div className="text-xs leading-snug text-muted-foreground break-words mt-0.5">{sub}</div>}
    </button>
  );
}

function Back({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={backClass} data-cm-world-back>
      <ChevronLeft className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function ClubName({ club, mine, onClick }: { club: string; mine: boolean; onClick: (club: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(club)} data-cm-world-club={club}
      className={cn('min-h-[44px] min-w-0 break-words text-left text-xs hover:underline', mine ? 'text-primary font-bold' : 'text-foreground')}>
      {club}
    </button>
  );
}

const dateText = (d: CalDate | null, beforeMove?: boolean): string => (beforeMove ? 'Played before you moved' : d ? shortDate(d) : 'Date to come');

const Loading = () => <div role="status" className="min-h-48 py-12 text-center text-sm text-muted-foreground">Loading...</div>;

/** The league phase's three zones (rows F7 and F8 of Round 1228's ledger), or the eras' top two. */
function zoneOf(format: 'g8' | 'l36', pos: number): 'through' | 'playoff' | 'out' {
  if (format === 'g8') return pos <= 2 ? 'through' : 'out';
  return pos <= 8 ? 'through' : pos <= 24 ? 'playoff' : 'out';
}
const ZONE_BAR: Record<'through' | 'playoff' | 'out', string> = {
  through: 'border-l-emerald-500', playoff: 'border-l-amber-500', out: 'border-l-transparent',
};

function TableRows({ rows, format, myClub, onClub, played }: { rows: TableRow[]; format: 'g8' | 'l36'; myClub: string; onClub: (c: string) => void; played: boolean }) {
  const cols = 'grid grid-cols-[1.5rem_1fr_1.4rem_1.4rem_1.4rem_2rem_2rem] gap-x-1 items-center';
  return (
    <div className="bg-card border border-border rounded-2xl p-3" data-cm-world-table={rows.length}>
      <div className={cn(cols, 'text-xs text-muted-foreground pb-1 border-b border-border/60')}>
        <span>#</span><span>Club</span><span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span><span className="text-center">GD</span><span className="text-right">Pts</span>
      </div>
      {rows.map((r, i) => {
        const zone = played ? zoneOf(format, i + 1) : 'out';
        const gd = r.gf - r.ga;
        return (
          <button type="button" key={r.club} onClick={() => onClub(r.club)} data-club={r.club} data-zone={zoneOf(format, i + 1)}
            className={cn(cols, 'w-full min-h-[44px] text-left text-xs border-b border-border/30 last:border-b-0 border-l-4 pl-1 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', ZONE_BAR[zone], r.club === myClub && 'bg-primary/10')}>
            <span className="font-bold text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 break-words leading-tight text-foreground">{r.club}</span>
            <span className="text-center text-muted-foreground">{r.w}</span>
            <span className="text-center text-muted-foreground">{r.d}</span>
            <span className="text-center text-muted-foreground">{r.l}</span>
            <span className="text-center text-muted-foreground tabular-nums">{gd > 0 ? `+${gd}` : gd}</span>
            <span className="text-right font-bold text-foreground tabular-nums">{r.pts}</span>
          </button>
        );
      })}
    </div>
  );
}

function FixtureList({ night, myClub, onClub, participant }: { night: WorldViewNight; myClub: string; onClub: (c: string) => void; participant: boolean }) {
  if (!night.fixtures.length) {
    return <p className="text-xs text-muted-foreground">{night.stage === 'md' ? 'No fixtures for this night.' : 'Drawn once the round before it is done.'}</p>;
  }
  return (
    <div className="bg-card border border-border rounded-2xl px-3 py-1" data-cm-world-fixtures={night.fixtures.length}>
      {night.fixtures.map(f => {
        const scored = f.homeGoals !== null && f.awayGoals !== null;
        const middle = scored ? `${f.homeGoals}-${f.awayGoals}`
          : !night.played ? 'v'
            : night.stage === 'md' ? 'not kept' : participant ? 'with leg 2' : 'v';
        return (
          <div key={`${f.home}|${f.away}`} className="grid grid-cols-[1fr_4.5rem_1fr] gap-x-2 items-center border-b border-border/30 last:border-b-0" data-cm-world-fixture={scored ? 'played' : 'open'}>
            <ClubName club={f.home} mine={f.home === myClub} onClick={onClub} />
            <span className={cn('text-center text-xs tabular-nums', scored ? 'font-bold text-foreground' : 'text-muted-foreground')}>{middle}</span>
            <div className="flex justify-end"><ClubName club={f.away} mine={f.away === myClub} onClick={onClub} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** How a settled tie went, in words. */
function tieWords(t: WorldViewTie): string {
  if (!t.winner || !t.agg) return 'To be played';
  /* A tie settled before Round 670 went to penalties at 90 minutes and carries no aet. */
  const how = t.pens ? `${t.aet ? 'level after extra time, ' : ''}${t.winner} win on penalties`
    : t.byAwayGoals ? `${t.winner} through on away goals`
      : t.aet ? `${t.winner} win after extra time` : `${t.winner} ${t.round === 'F' ? 'win' : 'through'}`;
  const score = t.legs === 2 ? `${t.agg[0]}-${t.agg[1]} on aggregate` : `${t.agg[0]}-${t.agg[1]}`;
  return `${score}, ${how}`;
}

function TieCard({ t, myClub, onClub }: { t: WorldViewTie; myClub: string; onClub: (c: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-1" data-cm-world-tie={`${t.round}-${t.slot}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-center">
        <ClubName club={t.home} mine={t.home === myClub} onClick={onClub} />
        <span className="text-xs text-muted-foreground">v</span>
        <div className="flex justify-end"><ClubName club={t.away} mine={t.away === myClub} onClick={onClub} /></div>
      </div>
      {t.legs === 2 && t.leg1 && <p className="text-xs text-muted-foreground">First leg: {t.home} {t.leg1[0]}-{t.leg1[1]} {t.away}</p>}
      {t.legs === 2 && t.leg2 && <p className="text-xs text-muted-foreground">Second leg: {t.away} {t.leg2[1]}-{t.leg2[0]} {t.home}</p>}
      <p className={cn('text-xs', t.winner ? 'text-foreground font-bold' : 'text-muted-foreground')}>{tieWords(t)}</p>
    </div>
  );
}

/** A participant's card, mounted unedited with the handler a tapped club calls swapped for this screen's. */
function withClubHandler(el: ReactElement | undefined, onClub: (club: string) => void): ReactNode {
  if (!el || !isValidElement(el)) return null;
  return <Suspense fallback={<Loading />}>{cloneElement(el as ReactElement<{ onClubClick?: (c: string) => void }>, { onClubClick: onClub })}</Suspense>;
}

/** The results of the nights played, as the group ledger keys them, for the eras' group footnote. */
function resultsOf(view: WorldCompView): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const n of view.nights) {
    if (n.stage !== 'md') continue;
    for (const f of n.fixtures) if (f.homeGoals !== null && f.awayGoals !== null) out[`${f.home}|${f.away}`] = [f.homeGoals, f.awayGoals];
  }
  return out;
}

const KO_ROUNDS: Record<'g8' | 'l36', WorldKoRound[]> = { g8: ['R16', 'QF', 'SF', 'F'], l36: ['PO', 'R16', 'QF', 'SF', 'F'] };
const ROUND_PILL: Record<WorldKoRound, string> = { PO: 'Play-offs', R16: 'Last 16', QF: 'Quarters', SF: 'Semis', F: 'Final' };

interface ViewProps {
  career: CareerState;
  view: WorldCompView;
  nav: Nav;
  go: (next: Nav) => void;
  onClub: (club: string) => void;
  groupsCard?: ReactElement;
  bracketCard?: ReactElement;
}

function TableView({ career, view, nav, go, onClub, groupsCard }: ViewProps) {
  if (view.mode === 'in') return <div className="space-y-2">{withClubHandler(groupsCard, onClub)}</div>;
  const played = view.nightsDone > 0;
  if (view.groups) {
    const letter = nav.group ?? view.groups[0]?.letter ?? 'A';
    const g = view.groups.find(x => x.letter === letter) ?? view.groups[0];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {view.groups.map(x => <button type="button" key={x.letter} className={pillClass(x.letter === g.letter)} onClick={() => go({ ...nav, group: x.letter })}>Group {x.letter}</button>)}
        </div>
        <TableRows rows={g.rows} format="g8" myClub={view.myClub} onClub={onClub} played={played} />
        <p className="text-xs text-muted-foreground px-1">The top two go through to the round of 16. {uclGroupFootnote(g.rows, uclGroupRule(career), resultsOf(view))}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground px-1" data-cm-world-legend>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />1st to 8th: round of 16</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />9th to 24th: play-offs</span>
        <span>25th to 36th: out</span>
      </div>
      <TableRows rows={view.table ?? []} format="l36" myClub={view.myClub} onClub={onClub} played={played} />
      <p className="text-xs text-muted-foreground px-1">{leaguePhaseFootnote()}</p>
    </div>
  );
}

function MatchdaysView({ view, nav, go, onClub }: ViewProps) {
  const last = view.nights.length - 1;
  const i = Math.max(0, Math.min(last, nav.night ?? Math.max(0, view.nightsDone - 1)));
  const n = view.nights[i];
  const step = 'inline-flex min-h-[44px] min-w-[44px] items-center gap-1 px-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40';
  return (
    <div className="space-y-2" data-cm-world-night={n.id}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={step} disabled={i === 0} onClick={() => go({ ...nav, night: i - 1 })} aria-label="Night before"><ChevronLeft className="w-3.5 h-3.5" /> Before</button>
        <div className="text-center min-w-0">
          <div className="text-sm font-bold text-foreground">{nightLabel(n)}</div>
          <div className="text-xs text-muted-foreground">{dateText(n.date, n.beforeMove)} · {n.played ? 'played' : 'to play'}</div>
        </div>
        <button type="button" className={step} disabled={i === last} onClick={() => go({ ...nav, night: i + 1 })} aria-label="Night after">After <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <FixtureList night={n} myClub={view.myClub} onClub={onClub} participant={view.mode === 'in'} />
    </div>
  );
}

function KnockoutsView({ career, view, nav, go, onClub, bracketCard }: ViewProps) {
  if (view.mode === 'in') {
    const ko = career.uclKoRound;
    return (
      <div className="space-y-2">
        {ko && ko !== 'out' && ko !== 'won' && (
          <p className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">You are still in it. Next up: the {roundPlural(ko)}, against {career.uclDraw?.[ko] ?? 'a club to be drawn'}.</p>
        )}
        {ko === 'won' && <p className="bg-card border border-gold/40 rounded-xl p-3 text-xs text-gold font-bold">Champions of Europe.</p>}
        {!career.uclBracket?.length && <p className="text-xs text-muted-foreground px-1">The knockouts are drawn after matchday 6.</p>}
        {withClubHandler(bracketCard, onClub)}
      </div>
    );
  }
  const rounds = KO_ROUNDS[view.format];
  const drawn = rounds.filter(r => view.ties.some(t => t.round === r));
  const round = nav.ko ?? drawn[drawn.length - 1] ?? rounds[0];
  const ties = view.ties.filter(t => t.round === round);
  const i = rounds.indexOf(round);
  const first = firstStageNights(view);
  const seeds = view.format === 'l36' && round === 'R16' && !ties.length && view.nightsDone >= first ? (view.table ?? []).slice(0, 8).map(r => r.club) : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {rounds.map(r => <button type="button" key={r} className={pillClass(r === round)} onClick={() => go({ ...nav, ko: r })}>{ROUND_PILL[r]}</button>)}
      </div>
      {ties.length ? ties.map(t => <TieCard key={`${t.round}-${t.slot}`} t={t} myClub={view.myClub} onClub={onClub} />) : (
        <p className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground" data-cm-world-undrawn>
          {i === 0 ? `Drawn after matchday ${first}.` : `Drawn once the ${roundPlural(rounds[i - 1])} are done.`}
          {seeds.length > 0 && ` The top eight wait here for the play-off winners: ${seeds.join(', ')}.`}
        </p>
      )}
    </div>
  );
}

function FinalView({ view, onClub }: ViewProps) {
  const night = view.nights.find(n => n.stage === 'F');
  const tie = view.ties.find(t => t.round === 'F');
  if (view.winner && tie) {
    return (
      <div className="bg-card border border-gold/40 rounded-2xl p-4 space-y-2 text-center" data-cm-world-final="done">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Winners {view.season}</div>
        <button type="button" onClick={() => onClub(view.winner!)} className="min-h-[44px] text-lg font-bold font-display text-gold hover:underline">🏆 {view.winner}</button>
        <p className="text-xs text-foreground">{tieWords(tie)}.</p>
        <p className="text-xs text-muted-foreground">Runners-up: <button type="button" onClick={() => onClub(view.runnerUp!)} className="min-h-[44px] hover:underline text-foreground">{view.runnerUp}</button></p>
        {night && <p className="text-xs text-muted-foreground">{dateText(night.date, night.beforeMove)}</p>}
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-center" data-cm-world-final="open">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">The final</div>
      {tie ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-center">
          <ClubName club={tie.home} mine={tie.home === view.myClub} onClick={onClub} />
          <span className="text-xs text-muted-foreground">v</span>
          <div className="flex justify-end"><ClubName club={tie.away} mine={tie.away === view.myClub} onClick={onClub} /></div>
        </div>
      ) : <p className="text-xs text-muted-foreground">The two finalists are not known yet.</p>}
      <p className="text-xs text-muted-foreground">{night?.date ? `To be played on ${shortDate(night.date)}.` : 'To be played after the semi-finals.'}</p>
      {view.mode === 'watching' && view.format === 'l36' && (
        <p className="text-xs text-muted-foreground">It comes after your last league game, so the winner shows on your season review.</p>
      )}
    </div>
  );
}

function RunView({ view, nav, onClubPage }: ViewProps & { onClubPage: (club: string) => void }) {
  const club = nav.run as string;
  const run = clubRun(view, club);
  return (
    <div className="space-y-2" data-cm-world-run={club}>
      <div className="bg-card border border-border rounded-2xl p-3 space-y-1">
        <div className="text-sm font-bold text-foreground break-words">{club}</div>
        {run?.place && <p className="text-xs text-muted-foreground">{run.place}</p>}
        <p className="text-xs text-foreground font-bold">{run ? run.finish : 'Not in this competition.'}</p>
        <button type="button" onClick={() => onClubPage(club)} className="inline-flex min-h-[44px] items-center text-xs font-bold text-primary hover:underline" data-cm-world-club-page>Open {club}'s club page</button>
      </div>
      {run && run.rows.length > 0 && (
        <div className="bg-card border border-border rounded-2xl px-3 py-1">
          {run.rows.map(r => {
            /* The fixture reads home first, like every list on this screen; the final names no ground. */
            const venue = r.round === 'F' ? '' : r.home === club ? ' · home' : ' · away';
            const score = r.homeGoals !== null && r.awayGoals !== null ? `${r.homeGoals}-${r.awayGoals}` : r.status === 'unrecorded' ? 'not kept' : 'v';
            return (
              <div key={`${r.round}|${r.home}|${r.away}`} className="py-2 border-b border-border/30 last:border-b-0 text-xs" data-cm-world-run-row={r.status}>
                <div className="flex justify-between gap-2 text-muted-foreground"><span>{r.label}{venue}</span><span>{dateText(r.date, r.beforeMove)}</span></div>
                <div className="text-foreground break-words">{r.home} <span className="tabular-nums font-bold">{score}</span> {r.away}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "2005-06" for a year. */
const seasonOfYear = (y: number): string => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;

/** The lines under the heading: what this is and what stands in, each only where it is true. */
function headerLines(career: CareerState, view: WorldCompView): string[] {
  const lines: string[] = [];
  const modern = worldUclFormatOf(career) === 'l36';
  lines.push(view.mode === 'in'
    ? 'You are in it: your group is Group A.'
    : `${career.clubName} are not in it this season, so you are following it from outside.`);
  if (modern && view.mode === 'watching') lines.push('This is the real format. In a season your club qualifies, it plays the game\'s stand in instead: eight groups of four into the quarter-finals.');
  if (modern && view.mode === 'in') lines.push('Your club plays the game\'s stand in: eight groups of four into the quarter-finals. In a season you are not in it, the one you follow from outside plays the real 36 club format.');
  if (view.holder) lines.push(`Holders: ${view.holder}, top of pot one in the draw.`);
  if (view.standIn) lines.push(`${view.standIn.club} stand in for ${view.standIn.for}, one of the real 32 of ${seasonOfYear(career.startYear ?? 0)}: that place belongs to a club of yours in this save, so the strongest club outside the 32 plays it.`);
  if (view.eraField) lines.push(`Every season of this save draws from the same 32 clubs, the real ${seasonOfYear(career.startYear ?? 0)} field, whatever the leagues do.`);
  if (career.handover && view.mode === 'watching') lines.push('You took this job mid season. If your last club was in the Champions League, its games there are not shown here.');
  return lines;
}

function HowItWorks({ view }: { view: WorldCompView }) {
  const l36 = view.format === 'l36';
  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2 text-xs text-muted-foreground" data-cm-world-help>
      {l36 ? (
        <p>36 clubs play eight games each, four at home and four away, in one table. 1st to 8th go straight to the round of 16, 9th to 24th play a two legged play-off for the other eight places, and 25th and below are out. Two legs from the play-offs to the semi-finals, then a one match final. A tie level on aggregate goes to extra time, then penalties.</p>
      ) : (
        <p>Eight groups of four, everyone playing the other three home and away. The top two of each group go through to a round of 16 drawn winner against runner-up, never from the same group or the same country. Two legs to the semi-finals, then a one match final.{view.mode === 'watching' ? ' A tie level on aggregate goes to the side with more away goals, then extra time and penalties.' : ''}</p>
      )}
      {view.mode === 'in' ? (
        <p>The draw is the game's own, and every night sits on your own calendar, so the dates are the game's.</p>
      ) : <p>What the game plays in place of the real thing: the draw is its own, with the pots set by how strong the clubs are in this save and the holders first. The quarter-finals and semi-finals follow a fixed bracket rather than an open draw, and every night sits on your own calendar, so the dates are the game's.{l36 ? ' The last places in the field go to the next best placed clubs of the strongest leagues, not through qualifying, and the winner is in next season\'s field as the holders.' : ''}</p>}
      {!l36 && view.mode === 'watching' && <p>In the 2015-16 and 2020-21 saves the group draw keeps Russian and Ukrainian clubs apart, as the real draws did. The round of 16 draw here does not. A save keeps its era's format for its whole life.</p>}
    </div>
  );
}

interface ScreenProps {
  career: CareerState;
  nav: Nav;
  go: (next: Nav) => void;
  /** Opens the club page (ClubDetailScreen), remembering where the player stood. */
  onClubPage: (club: string) => void;
  heading: ReactNode;
  groupsCard?: ReactElement;
  bracketCard?: ReactElement;
}

/** The Champions League screen: the heading, the lines, four tiles, and the one view a tile opens. */
export function WorldCompScreen({ career, nav, go, onClubPage, heading, groupsCard, bracketCard }: ScreenProps) {
  const [help, setHelp] = useState(false);
  const view = useMemo(() => worldUclView(career), [career]);
  const back = (to: Nav): void => go(to);
  const openRun = (club: string): void => go({ ...nav, run: club });
  const props: ViewProps | null = view ? { career, view, nav, go, onClub: openRun, groupsCard, bracketCard } : null;

  if (nav.run && props) {
    return (
      <div className="space-y-2">
        <Back label={nav.tab ? TAB_NAMES[nav.tab](view!) : 'Champions League'} onClick={() => back({ ...nav, run: null })} />
        <RunView {...props} onClubPage={onClubPage} />
      </div>
    );
  }
  if (nav.tab && props) {
    const View = { table: TableView, matchdays: MatchdaysView, knockouts: KnockoutsView, final: FinalView }[nav.tab];
    return (
      <div className="space-y-2" data-cm-world-view={nav.tab}>
        <Back label="Champions League" onClick={() => back({ ...nav, tab: null, run: null })} />
        <div className="text-sm font-bold text-foreground">{TAB_NAMES[nav.tab](view!)}</div>
        <View {...props} />
      </div>
    );
  }

  const link = (
    <Link to="/champions-league-format-history" className="inline-flex items-center min-h-[44px] text-xs text-primary hover:underline">
      The real competition's format, season by season
    </Link>
  );
  if (!view) {
    const modernLater = worldUclFormatOf(career) === 'l36' && career.season > 1;
    return (
      <div className="space-y-2" data-cm-world-none>
        {heading}
        <p className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">
          {career.handover && modernLater
            ? 'You joined after the draw, so there is nothing to follow here this season. The Champions League shows here again from next season.'
            : 'There is nothing to follow here this season. The Champions League shows here again from next season.'}
        </p>
        {link}
      </div>
    );
  }
  const status = worldUclStatus(career, view);
  const first = firstStageNights(view);
  const drawn = KO_ROUNDS[view.format].filter(r => view.ties.some(t => t.round === r));
  const finalNight = view.nights.find(n => n.stage === 'F');
  const top = view.table?.[0]?.club;
  return (
    <div className="space-y-2" data-cm-world-mode={view.mode} data-cm-world-format={view.format}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">{heading}</div>
        <button type="button" aria-label="How the Champions League works here" aria-expanded={help} onClick={() => setHelp(!help)} data-cm-world-help-toggle
          className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 space-y-1">
        <div className="text-sm font-bold text-foreground">{view.season} · {view.format === 'l36' ? '36 clubs in one table, then knockouts' : 'eight groups of four, then knockouts'}</div>
        <div className="text-xs text-foreground font-bold" data-cm-world-status>{status.value}</div>
        {headerLines(career, view).map(l => <p key={l} className="text-xs text-muted-foreground">{l}</p>)}
      </div>
      {help && <HowItWorks view={view} />}
      <div className="grid grid-cols-2 gap-2">
        <Tile icon="📋" title={view.format === 'l36' ? 'Table' : 'Groups'} testId="table" onClick={() => go({ ...nav, tab: 'table' })}
          value={view.format === 'l36' ? (top && view.nightsDone > 0 ? `${top} top` : '36 clubs') : `${view.groups?.length ?? 8} groups`} />
        <Tile icon="🗓️" title="Matchdays" testId="matchdays" onClick={() => go({ ...nav, tab: 'matchdays' })}
          value={`${view.nightsDone} of ${view.nights.length} nights played`} />
        <Tile icon="🧩" title="Knockouts" testId="knockouts" onClick={() => go({ ...nav, tab: 'knockouts' })}
          value={drawn.length ? `${ROUND_PILL[drawn[drawn.length - 1]]} drawn` : `Drawn after matchday ${first}`} />
        <Tile icon="🏆" title="Final" testId="final" onClick={() => go({ ...nav, tab: 'final' })}
          value={view.winner ? `Won by ${view.winner}` : finalNight?.date ? `On ${shortDate(finalNight.date)}` : 'To come'} />
      </div>
      {link}
    </div>
  );
}

const TAB_NAMES: Record<Tab, (v: WorldCompView) => string> = {
  table: v => (v.format === 'l36' ? 'The table' : 'The groups'),
  matchdays: () => 'Matchdays',
  knockouts: () => 'Knockouts',
  final: () => 'The final',
};

interface CupsPanelProps {
  career: CareerState;
  /** Opens a club page (ClubManager.tsx's setClubView). */
  onClubClick: (club: string) => void;
  cupTitle: string;
  cupValue: string;
  cupSub?: string;
  /** The domestic cup's line, as the panel has always printed it. */
  cupLine: ReactNode;
  /** The domestic bracket (CupBracketCard), absent in a league with no domestic cup. */
  cupBracket?: ReactElement;
  /** The Champions League heading. */
  uclHeading: ReactNode;
  /** The participant's cards: the groups (UclGroupsCard) and the bracket (UclBracketCard). */
  groupsCard?: ReactElement;
  bracketCard?: ReactElement;
}

/** The Cups panel: two tiles, then one competition at a time. */
export function CupsPanel({ career, onClubClick, cupTitle, cupValue, cupSub, cupLine, cupBracket, uclHeading, groupsCard, bracketCard }: CupsPanelProps) {
  const key = saveKey(career);
  const [nav, setNav] = useState<Nav>(() => (resume && resume.key === key ? resume.nav : HOME));
  useEffect(() => { resume = null; }, []);
  const [reveal, setReveal] = useState(0);
  const stack = useRef<number[]>([]);
  const restore = useRef<number | null>(null);
  const viewRef = useRevealScroll<HTMLDivElement>(`cups:${reveal}`, { skipFirst: true });
  const go = (next: Nav): void => {
    const from = depthOf(nav);
    const to = depthOf(next);
    if (typeof window !== 'undefined') {
      if (to > from) stack.current.push(window.scrollY);
      else if (to < from) {
        let y: number | undefined;
        for (let i = to; i < from; i += 1) y = stack.current.pop() ?? y;
        restore.current = y ?? null;
      }
    }
    if (to > from) setReveal(r => r + 1);
    setNav(next);
  };
  /* Going back puts the page where it stood when the deeper view opened, so the tiles are where they were. */
  useLayoutEffect(() => {
    if (restore.current === null || typeof window === 'undefined') return;
    window.scrollTo(0, restore.current);
    restore.current = null;
  }, [nav]);
  const clubPage = (club: string): void => {
    resume = { key, nav };
    onClubClick(club);
  };
  const view = useMemo(() => worldUclView(career), [career]);
  const status = worldUclStatus(career, view);
  /* The panel's old condition, word for word in effect: no group, and no knockout run still alive or won. */
  const noEurope = career.uclGroup === null && (career.uclKoRound === null || career.uclKoRound === 'out');
  const euro = careerLeagueOf(career).euro;

  let body: ReactNode;
  if (nav.at === 'cup') {
    body = (
      <div className="space-y-2" data-cm-cups-view="cup">
        <Back label="Cups" onClick={() => go(HOME)} />
        {cupLine}
        {cupBracket && isValidElement(cupBracket) && (
          <Suspense fallback={<Loading />}>{cloneElement(cupBracket as ReactElement<{ onClubClick?: (c: string) => void }>, { onClubClick: clubPage })}</Suspense>
        )}
      </div>
    );
  } else if (nav.at === 'ucl') {
    body = (
      <div className="space-y-2" data-cm-cups-view="ucl">
        {!nav.tab && !nav.run && <Back label="Cups" onClick={() => go(HOME)} />}
        <WorldCompScreen career={career} nav={nav} go={go} onClubPage={clubPage} heading={uclHeading} groupsCard={groupsCard} bracketCard={bracketCard} />
      </div>
    );
  } else {
    body = (
      <div className="space-y-2" data-cm-cups-view="tiles">
        {noEurope && (
          <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">No European football this season{euro ? '. Reach the Champions League places to change that' : ' in this league'}.</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Tile icon="🏅" title={cupTitle} value={cupValue} sub={cupSub} testId="cup" onClick={() => go({ ...HOME, at: 'cup' })} />
          <Tile icon="⭐" title="Champions League" value={status.value} sub={status.sub} testId="ucl" onClick={() => go({ ...HOME, at: 'ucl' })} />
        </div>
      </div>
    );
  }
  return <div ref={viewRef}>{body}</div>;
}

export default CupsPanel;
