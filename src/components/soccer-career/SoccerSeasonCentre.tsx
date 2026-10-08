/* Round 1045: Soccer Career's Season Centre, the lazy entry the page loads
   only when a person presses "📺 Week by week" or "📺 Watch it week by week".

   It reads the save and writes nothing: the season shown is derived from
   the saved row by src/lib/season (core plus the soccer binding), memoised
   per row key, and a row it cannot lay out match by match gets one honest
   tile instead of a guess. Its own error boundary keeps a render error
   inside the overlay (Retry, Close); the page wraps the lazy mount in a
   second one, because a boundary inside this chunk cannot catch the chunk
   failing to load.

   Round 1047: the latest season also offers his moments (planMoments). The
   season on screen is the plan with the ledger's decisions applied
   (applyDecisions), and the only writes are the ledger entries and the
   bank, through `onCareer`, after he presses "Take it yourself". Without
   `onCareer`, or on a season that is not the latest, nothing is offered.

   Round 1046: it remembers where he stopped. After every matchday watched
   one small record goes to this browser's localStorage (src/lib/season/
   resume.ts, never the save), and opening the same season again starts on
   the kick off card at that matchday. The record carries the season's own
   key, so a save that no longer holds that season simply ignores it. */
import { Component, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { CareerState, ClubData, SeasonRecord } from '@/lib/soccerCareerEngine';
import { applyDecisions, deriveSeason, planMoments, tableAt } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey, type SoccerSeasonCtx } from '@/lib/season/soccer';
import { ledgerOf, readSeasonMoments } from '@/lib/season/momentsSave';
import { clearResume, readResume, writeResume } from '@/lib/season/resume';
import type { CentreMoments } from '@/components/season-centre/MomentHost';
import { useSoccerMoments } from './useSoccerMoments';
import { readSeasonDerbies } from '@/lib/soccerCareerDerby';
import { leagueWithArticle, ordinal } from '@/lib/soccerCareerLeague';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { SeasonCentre, type CentreModel, type CentrePlace, type CentreSport } from '@/components/season-centre/SeasonCentre';
import { minuteLabel } from '@/lib/clubManagerClock';
import { SOCCER_FULL_TIME } from '@/lib/season/soccerEvents';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import type { DerivedGame, DerivedSeason, SeasonEvent } from '@/lib/season/core';

export interface SoccerSeasonCentreProps {
  career: CareerState;
  clubs: ClubData[];
  row: SeasonRecord;
  mode: 'live' | 'watch';
  onClose: () => void;
  /** Round 1047: how a moment writes to the save (the ledger, then the bank). Absent: no moments. */
  onCareer?: (fn: (prev: CareerState) => CareerState) => void;
}

const HELP: HelpWords = {
  title: 'How the Season Centre works',
  intro: [
    'Your season was played the moment you pressed Next Season. This is that same season, match by match: the final table and your season totals are settled, and nothing here can change them.',
    "When a season shows a table, who was in the league, how many clubs it had and how many points a win was worth are real (from 2026-27 on, the league is your career's own world). Every score, every other club's result and every minute are your career's own.",
  ],
  controls: '▶ plays the next matchday. ⏩ jumps to the next big game (a derby, halfway, the title or the final day). ⏭ goes straight to the end. 1x and 3x set the clock, Results shows each match at full time.',
  moments: [
    'Up to three moments a season are yours to play, marked 🎯 on the fixtures of the season you just played. The clock stops a beat before one. 🎯 Take it yourself plays it on your training ground board, one go. ▶ Let it play leaves the match as it was. Once the board opens the go is used, so closing the tab counts as a miss.',
    'YOUR CALL: what you do is what happened in that match. Score a chance that was missed and the goal is yours; miss one that went in and it is gone. The return game against the same club takes the other side of it, so the final table and your season totals end exactly where your season summary has them.',
    'RECREATE: the record stands whatever you do. You play a goal, an assist or a clean sheet again, for stars only.',
    'A make earns one to three stars for how well you struck it. The stars bank once a season, at the season review: 60% of the stars on offer is +1 to the stat your position trains, 85% is +2, never past your ceiling (your training drill and your moments share that room), and it arrives with next season\'s growth. Step out before the review and your moments stay open while your season summary is up. Press Continue on the summary and the stars you have bank as they stand, with any moment you left counting as no stars. After the bank the season\'s moments are closed.',
  ],
  examples: [
    { head: 'A YOUR CALL', body: 'Matchday 9, 1-1 in the 82nd minute, and on your season this chance was missed. You take it and score: the match ends 2-1 and you climb the table that week. In the return game on matchday 28, a 2-1 win on your season, your goal there is not scored and it ends 1-1. You gain two points on matchday 9 and give two back on matchday 28, they lose one and get it back: the final table and your goals for the season end exactly where they were.' },
    { head: 'A RECREATE', body: 'Derby day, and on the record you scored in the 74th minute. You play it again on the Wall Shot: through the gap and into the top corner is three stars, a miss is none. Either way the derby ends as it did. Three moments worth 3, 2 and 1 stars are 6 of 9, which is 67%: +1 next season.' },
    { head: 'A matchday', body: 'Matchday 12: you win 2-1 at home and score in the 67th minute, rated 7.6. The table moves you from 6th to 4th (▲2).' },
    { head: 'An injury', body: 'Out for five weeks with a hamstring in a 38 game season: five weeks out of a 46 week year is four matchdays, so the club plays matchdays 14 to 17 without you. Your games played do not move. The table does.' },
    { head: 'Results only', body: 'A season the game has no verified table for (before 1995-96, a league outside the big five, or a season cut short) shows your league games with no table. If your season summary has a finish, the review still prints it.' },
  ],
  footnote: 'Cup ties and European nights count in your totals as "Cups and other games" but are not shown match by match yet. Clubs level on points are split by goal difference, then goals scored: this game\'s rule.',
};

/* live mode opens over the newspaper, except on a season with no news (the
   summary card) or a severe injury (the rehab choice), where there is no paper */
const exitLabelOf = (mode: 'live' | 'watch', phase: string) => (mode === 'live' && phase === 'newspaper' ? 'Back to the papers' : 'Back to your career');

/** Soccer's side of the shared viewer: the clock, the derby, his line. */
function eventWords(e: SeasonEvent, us: string, them: string): string {
  if (e.kind === 'goal') return e.side === 'us' ? (e.mine ? '⚽ You score!' : `⚽ Goal, ${us}`) : `⚽ Goal, ${them}`;
  if (e.kind === 'assist') return '🅰️ You set it up';
  if (e.kind === 'yellow') return '🟨 You go in the book';
  if (e.kind === 'red') return '🟥 Sent off';
  if (e.kind === 'injury') return '🚑 You go off injured';
  if (e.kind === 'on') return '🔁 You come on';
  return '🔁 You come off';
}

function soccerSport(keepsSheets: boolean): CentreSport {
  return {
    clock: { length: SOCCER_FULL_TIME, label: minute => minuteLabel({ minute }), words: eventWords },
    fixed: { badge: 'DERBY', poster: 'Derby day', recordSoFar: 'Your derby record so far', recordPlayed: 'Derbies you played' },
    missed: why => (why === 'injured' ? 'Not in the squad: injured' : why === 'suspended' ? 'Suspended' : 'Not in the matchday squad'),
    lineOf: (g: DerivedGame) => {
      const bits: string[] = [];
      if ((g.line.goals ?? 0) > 0) bits.push(`⚽ ${g.line.goals}`);
      if ((g.line.assists ?? 0) > 0) bits.push(`🅰️ ${g.line.assists}`);
      if (keepsSheets && g.them === 0) bits.push('🧤 Clean sheet');
      if ((g.line.yellow ?? 0) > 0) bits.push('🟨');
      if ((g.line.red ?? 0) > 0) bits.push('🟥 Sent off');
      if (g.onAt) bits.push(`Came on ${g.onAt}'`);
      return { bits, alarm: g.events.some(e => e.kind === 'injury') ? '🚑 Injured' : null };
    },
    markOf: g => g.line.rating ?? 0,
    soFar: so => [
      ['Played', String(so.apps)],
      ['Goals', String(so.goals ?? 0)],
      ['Assists', String(so.assists ?? 0)],
      ['Rating', so.apps ? ((so.rating ?? 0) / so.apps).toFixed(1) : '-'],
    ],
    half: so => `First half: ${so.apps} games, ${so.goals ?? 0} goals, ${so.assists ?? 0} assists`,
    bucket: b => `Cups and other games: ${b.apps} apps, ${b.line.goals ?? 0} goals, ${b.line.assists ?? 0} assists`,
  };
}

/** The game's name in the resume record's storage key (seasonCentre:v1:soccer). */
const RESUME_GAME = 'soccer';

const RESULTS_WORDS = 'Results only: the game does not have a verified table for this league that season.';

function buildModel(row: SeasonRecord, ctx: SoccerSeasonCtx, s: DerivedSeason, moments: CentreMoments | null): CentreModel {
  const occasion: Record<string, string> = {};
  for (const d of readSeasonDerbies(row)) occasion[d.rival] = d.name;
  const finish = ctx.finish;
  const leagueName = ctx.league?.name ?? null;
  const pts = s.mode === 'table' ? tableAt(s, s.games.length).find(r => r.slot === 0)?.pts ?? null : null;
  const finishLine = finish
    ? finish.finish === 1
      ? `Champions${leagueName ? ` of ${leagueWithArticle(leagueName)}` : ''}${finish.size ? `, top of ${finish.size}` : ''}${pts !== null ? ` · ${pts} pts` : ''}`
      : `Finished ${ordinal(finish.finish)}${finish.size ? ` of ${finish.size}` : ''}${leagueName ? ` in ${leagueWithArticle(leagueName)}` : ''}${pts !== null ? ` · ${pts} pts` : ''}`
    : row.injurySevere ? 'Your season ended early with an injury.' : null;
  const trophies = [row.leagueTitle && '🏆 League', row.domesticCup && '🏆 Cup', row.championsLeague && '⭐ UCL', row.clubCupTitle && `⭐ ${row.clubCupTitle}`, row.worldCup && '🌍 World Cup', row.continentalCup && '🌐 Continental', row.ballonDor && "🏅 Ballon d'Or"].filter((t): t is string => !!t);
  const notes: string[] = [];
  if (ctx.goldenBoot) notes.push(`👟 League Golden Boot: ${row.goals} goals in all competitions.`);
  if (ctx.keepsSheets && ctx.position !== 'GK') notes.push(`🧤 ${row.cleanSheets} clean sheets in all competitions.`);
  const last = ctx.lastSeason;
  return {
    season: s,
    words: SOCCER.words,
    names: s.labels.map(l => (l.named ? l.name : SOCCER.words.unnamed)),
    occasion,
    header: { club: row.club, seasonLabel: `${row.year}/${String(row.year + 1).slice(-2)}`, league: leagueName, loanFrom: row.onLoanFrom ?? null },
    frameLine: s.mode === 'table' ? `${s.teams} clubs · ${s.games.length} matchdays · 3 points for a win` : null,
    lastSeason: last ? (last.finish === 1 ? `Last season: champions with ${last.club}` : `Last season: ${ordinal(last.finish)} with ${last.club}`) : null,
    resultsWhy: s.mode === 'table' ? null : ctx.why === 'severe' ? 'Results only: your season was cut short, so there is no final table.' : RESULTS_WORDS,
    derbyBefore: { w: ctx.derbyBefore.w, d: ctx.derbyBefore.d, l: ctx.derbyBefore.l },
    review: {
      tiles: [
        ['Apps', String(row.apps)],
        ctx.position === 'GK' ? ['Clean sheets', String(row.cleanSheets)] : ['Goals', String(row.goals)],
        ['Assists', String(row.assists)],
        ['Avg rating', row.rating.toFixed(1)],
      ],
      finishLine, championLine: ctx.champion ? `${ctx.champion} won it` : null,
      trophies, title: !!row.leagueTitle && !row.injurySevere, notes,
    },
    sport: soccerSport(ctx.keepsSheets),
    help: HELP,
    momentKey: `centre|${s.key}`,
    moments,
  };
}

class CentreBoundary extends Component<{ onClose: () => void; exitLabel: string; children: ReactNode }, { failed: boolean; tries: number }> {
  state = { failed: false, tries: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return <div key={this.state.tries} className="contents">{this.props.children}</div>;
    return (
      <Tile
        text="Something went wrong drawing this season. Your career is safe."
        exitLabel={this.props.exitLabel}
        onClose={this.props.onClose}
        onRetry={() => this.setState(s => ({ failed: false, tries: s.tries + 1 }))}
      />
    );
  }
}

/** One plain tile over the page, with the way out (and Retry after an error). */
export function Tile({ text, exitLabel, onClose, onRetry }: { text: string; exitLabel: string; onClose: () => void; onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" data-season-centre data-centre-tile>
      <div role="dialog" aria-modal="true" aria-label="Season Centre" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 text-center outline-none">
        <div className="text-sm font-bold">📺 Season Centre</div>
        <p className="text-sm text-muted-foreground">{text}</p>
        <div className="flex gap-2">
          {onRetry && <button type="button" onClick={onRetry} className="h-10 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Retry</button>}
          <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground">{exitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function CentreBody({ career, clubs, row, mode, onClose, onCareer }: SoccerSeasonCentreProps) {
  const exitLabel = exitLabelOf(mode, career.phase);
  /* the season's facts come from fields a moment never writes, so the plan is
     derived once for the row and not again on every ledger entry */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => buildSoccerSeasonCtx(career, clubs, row), [career.playerName, career.position, career.phone, career.awards, career.seasons, clubs, row]);
  const key = SOCCER.seasonKey(row, ctx);
  const plan = useMemo(() => (key ? deriveSeason(SOCCER, row, ctx) : null), [key, row, ctx]);
  /* moments are the latest season's only: its key is the one the ledger and the bank answer to */
  const latest = career.seasons[career.seasons.length - 1];
  const canPlay = !!onCareer && !!plan && !!key && !!latest && soccerSeasonKey(career.playerName, latest) === key;
  const offered = useMemo(() => (canPlay && plan ? planMoments(SOCCER, row, ctx, plan) : []), [canPlay, plan, row, ctx]);
  const ledger = readSeasonMoments(career.seasonMoments);
  const entriesKey = JSON.stringify(ledgerOf(ledger, key ?? ''));
  const season = useMemo(() => (plan && offered.length ? applyDecisions(SOCCER, row, ctx, plan, offered, JSON.parse(entriesKey) as number[][]) : plan), [plan, offered, entriesKey, row, ctx]);
  const moments = useSoccerMoments({ career, row, ctx, plan, key, offered, entriesKey, banked: !!ledger?.banked && ledger.key === key, onCareer });
  const model = useMemo(() => (season ? buildModel(row, ctx, season, moments) : null), [season, row, ctx, moments]);
  /* Round 1046: his place in this season. Read once when the season opens; a
     table season he did not win replays the same only while the save still
     holds that year's league (the record says so with `stable`). */
  const [stored] = useState(() => readResume(RESUME_GAME));
  const stable = ctx.mode !== 'table' || ctx.finish?.finish === 1;
  const onProgress = useCallback((at: CentrePlace | null) => {
    if (!key) return;
    if (at) writeResume(RESUME_GAME, { key, year: row.year, md: at.md, speed: at.speed, stable });
    else if (readResume(RESUME_GAME)?.key === key) clearResume(RESUME_GAME);
  }, [key, row.year, stable]);
  if (!model) return <Tile text="This season cannot be shown match by match." exitLabel={exitLabel} onClose={onClose} />;
  const resume = stored && stored.key === key && stored.year === row.year ? stored : null;
  return <SeasonCentre model={model} exitLabel={exitLabel} onClose={onClose} resume={resume} onProgress={onProgress} />;
}

export default function SoccerSeasonCentre(props: SoccerSeasonCentreProps) {
  return (
    <CentreBoundary onClose={props.onClose} exitLabel={exitLabelOf(props.mode, props.career.phase)}>
      <CentreBody {...props} />
    </CentreBoundary>
  );
}
