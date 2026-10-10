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
   key, so a save that no longer holds that season simply ignores it.
   With no season handed in it lists the seasons he can watch again; goals
   play on a little pitch (MiniPitch, its own chunk) and the table slides. */
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CareerState, ClubData, SeasonRecord } from '@/lib/soccerCareerEngine';
import { applyDecisions, deriveSeason, planMoments, tableAt } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey, type SoccerSeasonCtx } from '@/lib/season/soccer';
import { ledgerOf, readSeasonMoments } from '@/lib/season/momentsSave';
import { readResume } from '@/lib/season/resume';
import { clearResume, writeResume } from '@/components/season-centre/resumeStore';
import type { CentreMoments } from '@/components/season-centre/MomentHost';
import { useSoccerMoments } from './useSoccerMoments';
import SeasonCompetitionPanel, { CompetitionNavigation, type CentreScreen } from './SeasonCompetitionPanel';
import { savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import { cupCalendar, CUP_CALENDAR_NOTE } from '@/lib/soccerSeasonCalendar';
import { ballonDorSeasonForDisplay } from '@/lib/soccerAwardReveal';
import { soccerCardLine } from '@/lib/soccerDiscipline';
import { readLeagueWorldSeason } from '@/lib/soccerCareerLeagueWorld';
import { readSeasonDerbies } from '@/lib/soccerCareerDerby';
import { leagueWithArticle, ordinal, readLeagueFinish } from '@/lib/soccerCareerLeague';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { SeasonCentre, type CentreModel, type CentrePlace, type CentreSport } from '@/components/season-centre/SeasonCentre';
import { minuteLabel } from '@/lib/clubManagerClock';
import { SOCCER_FULL_TIME, soccerOwnGoals } from '@/lib/season/soccerEvents';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import { SeasonPicker, type PickerRow } from '@/components/season-centre/SeasonPicker';
import type { PitchRole } from '@/components/season-centre/MiniPitch';

/* Round 1046: the little pitch is its own chunk, asked for when the first match kicks off */
const MiniPitch = lazy(() => import('@/components/season-centre/MiniPitch'));
/** The pitch's box: a fixed shape (the scoring third of a pitch), worn by the loading fallback too, so nothing under it ever moves.
 *  `isolate` keeps the ball and the figures inside the box's own layer, under the score that stays at the top of a phone's stage. */
const PITCH_BOX = 'relative isolate w-full overflow-hidden rounded-xl aspect-[25/12]';
/** The pitch's place with nothing drawn in it: the box and the line under it, the same size as the pitch itself. */
const PITCH_EMPTY = <div aria-hidden="true" data-pitch-empty><div className={PITCH_BOX} /><div className="h-5" /></div>;
/* The little pitch is a picture beside the match, never the match. If its file does not arrive (a weak signal, or a
   new build published while he watches) or it fails to draw, its place stays empty and the season carries on: the
   score, the events and the table need none of it. Without this the whole Season Centre fell to its error tile, whose
   Retry cannot help, because a browser keeps a file that failed as failed until the page is loaded again. */
class PitchBoundary extends Component<{ children: ReactNode }, { gone: boolean }> {
  state = { gone: false };
  static getDerivedStateFromError() { return { gone: true }; }
  render() { return this.state.gone ? PITCH_EMPTY : this.props.children; }
}
const roleOf = (position: string): Exclude<PitchRole, null> => (position === 'GK' ? 'GK' : position === 'CB' || position === 'LB' || position === 'RB' ? 'DEF' : 'ATT');
import type { DerivedGame, DerivedSeason, SeasonEvent } from '@/lib/season/core';

export interface SoccerSeasonCentreProps {
  career: CareerState;
  clubs: ClubData[];
  /** The season to show. Round 1046: null opens the list of seasons he can watch again. */
  row: SeasonRecord | null;
  mode: 'live' | 'watch';
  onClose: () => void;
  /** Round 1047: how a moment writes to the save (the ledger, then the bank). Absent: no moments. */
  onCareer?: (fn: (prev: CareerState) => CareerState) => void;
  /** Round 1046: false when the season's own screens are gone (opened later from the career page): the season is
   *  shown with whatever he did in its moments, and none is offered. Absent: as before. */
  offer?: boolean;
}

const HELP: HelpWords = {
  title: 'How the Season Centre works',
  intro: [
    'Your season was played the moment you pressed Next Season. This is that same season, match by match: the final table and your season totals are settled, and nothing here can change them.',
    "Earlier-season tables use verified league membership and competition rules. From 2026-27, saved league worlds use your career's simulated clubs and direct promotion and relegation between two divisions. The review marks the available Spanish lower-division club pool. Every score, every other club's result and every minute are your career's own.",
    'When the table changes, each club slides from where it was to where it is now. The little pitch shows who scored and when. The ring is you, whenever you are in the move: scoring it, setting it up, or up there with the attack if you play in midfield or up front, and at the back when one goes in past you as a keeper or a defender. ⚽ Yours or 🅰️ Your assist under the pitch tells you when the goal or the assist was yours. How the move looked is the game\'s own drawing.',
    'Now and then a goal in your season is an own goal, marked (O.G). It is always one of the goals your season already had, never an extra one, and it never touches your goals or assists. Who put it in (you, a teammate or one of theirs) is made up by the game. The pitch still plays it as a goal for the side that got it and says Own goal underneath, and when it was yours the ring is on you at the back.',
    'Saved cup games appear between league games. Their placement is the simulation\'s own order, not a real calendar. New modern named cups keep a simplified opening tie, not every early round. Reveal one saved result to add its next recorded round. A deciding loss ends that cup run. Missing early-round opponents and scores stay marked. Closing at a cup night can show that same saved result again; it never rerolls.',
  ],
  controls: '▶ plays the next matchday. ⏩ jumps to the next big game (a derby, halfway, the title or the final day). ⏭ goes straight to the end. 1x and 3x set the clock, Results shows each match at full time. After a jump the table slides from the last matchday you saw; the ▲ and ▼ beside your place always compare with the matchday before. Close it whenever you like: the 📺 Resume chip on your career page takes you back to the same matchday. 📺 Season replays, next to Ratings, opens seasons with a saved league world, seasons you won and results only seasons. An older season without a saved league world still opens when your save kept cup games from it, for those cups and the current squad, and stays locked when it kept none; its league replay stays unavailable when the game did not keep who won it.',
  moments: [
    'Up to three moments a season are yours to play, marked 🎯 on the fixtures of the season you just played. The clock stops a beat before one. 🎯 Take it yourself plays it on your training ground board, one go. ▶ Let it play leaves the match as it was. Once the board opens the go is used, so closing the tab counts as a miss.',
    'YOUR CALL: what you do is what happened in that match. Score a chance that was missed and the goal is yours; miss one that went in and it is gone. The return game against the same club takes the other side of it, so the final table and your season totals end exactly where your season summary has them.',
    'RECREATE: the record stands whatever you do. You play a goal, an assist or a clean sheet again, for stars only.',
    'A make earns one to three stars for how well you struck it. The stars bank once a season, at the season review: 60% of the stars on offer is +1 to the stat your position trains, 85% is +2, never past your ceiling (your training drill and your moments share that room), and it arrives with next season\'s growth. Step out before the review and your moments stay open while your season summary is up. Press Continue on the summary and the stars you have bank as they stand, with any moment you left counting as no stars. After the bank the season\'s moments are closed.',
    'Once you have pressed Continue on the summary, coming back to a season from your career page is for watching: no moment is offered then. A moment you played is shown as you played it while that season is still the last one you played a moment in; after that the season replays as your record has it.',
  ],
  examples: [
    { head: 'An own goal', body: 'You turn the ball into your own net at 55 minutes. The opposition get the goal, marked (O.G), and your goals and assists stay the same. The final score and your season totals still match the season summary.' },
    { head: 'A YOUR CALL', body: 'Matchday 9, 1-1 in the 82nd minute, and on your season this chance was missed. You take it and score: the match ends 2-1 and you climb the table that week. In the return game on matchday 28, a 2-1 win on your season, your goal there is not scored and it ends 1-1. You gain two points on matchday 9 and give two back on matchday 28, they lose one and get it back: the final table and your goals for the season end exactly where they were.' },
    { head: 'A RECREATE', body: 'Derby day, and on the record you scored in the 74th minute. You play it again on the Wall Shot: through the gap and into the top corner is three stars, a miss is none. Either way the derby ends as it did. Three moments worth 3, 2 and 1 stars are 6 of 9, which is 67%: +1 next season.' },
    { head: 'A matchday', body: 'Matchday 12: you win 2-1 at home and score in the 67th minute, rated 7.6. The table moves you from 6th to 4th (▲2), and it slides to show it: the two clubs you passed drop below you.' },
    { head: 'Coming back', body: 'You watch to matchday 13 and close the tab. Next visit the chip reads 📺 Resume 2031/32, matchday 14. The Season Centre opens with 13 of 38 played, you 4th, and the next five games. Your place is kept in this browser only, never in your career save: clear your browser data and the season simply starts from kick off.' },
    { head: 'An injury', body: 'Out for five weeks with a hamstring in a 38 game season: five weeks out of a 46 week year is four matchdays, so the club plays matchdays 14 to 17 without you. Your games played do not move. The table does.' },
    { head: 'A whole league', body: 'Sign for Twente in 2027 and Week by week is the whole Eredivisie: 18 clubs, 34 matchdays, every club named. Sign for Hearts and you get your games with no table, because the Scottish Premiership splits in two late in the season and the game will not draw a table it cannot stand behind.' },
    { head: 'Results only', body: 'A season the game has no verified table for (before 1995-96, a league that is not one plain home and away table, a league the game does not know whole, or a season cut short) shows your league games with no table. If your season summary has a finish, the review still prints it.' },
    { head: 'A cup night', body: 'After five league games, the saved domestic cup entry appears. Show its result: a win reveals the next recorded opponent, while a deciding loss ends the cup route. The competition button opens your recorded bracket. Early rounds that were kept only as Through or Out have no invented opponent or score.' },
  ],
  footnote: 'The competition buttons open the cup games your save kept, with their real competition names where recorded. Missing match details stay marked. Current squad opens your current eleven and bench on our ratings, not a past matchday lineup. Clubs level on points are split by goal difference, then goals scored: this game\'s rule.',
};

/* live mode opens over the newspaper, except on a season with no news (the
   summary card) or a severe injury (the rehab choice), where there is no paper */
const exitLabelOf = (mode: 'live' | 'watch', phase: string) => (mode === 'live' && phase === 'newspaper' ? 'Back to the papers' : 'Back to your career');

/** Soccer's side of the shared viewer: the clock, the derby, his line. */
function eventWords(e: SeasonEvent, us: string, them: string): string {
  if (e.kind === 'goal' && e.ownGoalBy) {
    const who = e.ownGoalBy === 'you' ? 'You' : e.ownGoalBy === 'teammate' ? 'A teammate' : 'An opponent';
    return `⚽ ${who} (O.G), goal for ${e.side === 'us' ? us : them}`;
  }
  if (e.kind === 'goal') return e.side === 'us' ? (e.mine ? '⚽ You score!' : `⚽ Goal, ${us}`) : `⚽ Goal, ${them}`;
  if (e.kind === 'assist') return '🅰️ You set it up';
  if (e.kind === 'yellow') return '🟨 You go in the book';
  if (e.kind === 'red') return '🟥 Sent off';
  if (e.kind === 'injury') return '🚑 You go off injured';
  if (e.kind === 'on') return '🔁 You come on';
  return '🔁 You come off';
}

function soccerSport(keepsSheets: boolean, color: string, role: Exclude<PitchRole, null>, ratingRange: [number, number] | null): CentreSport {
  return {
    form: ratingRange ? { head: 'Your season, game by game', label: 'Your match rating in each league game', range: ratingRange } : undefined,
    /* the minutes he was on the pitch are the events file's own window (pitchWindow in soccerEvents.ts) */
    pitch: (g, at) => (
      <PitchBoundary>
        <Suspense fallback={PITCH_EMPTY}>
          <MiniPitch md={g.md} events={g.events} shown={at.shown} paused={at.paused} instant={at.instant} usColor={color}
            role={g.played ? role : null} onFrom={g.onAt ?? 1} onTo={g.offAt ? g.offAt - 1 : SOCCER_FULL_TIME} boxClass={PITCH_BOX} />
        </Suspense>
      </PitchBoundary>
    ),
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
    markWord: 'Rating',
    soFar: so => [
      ['Played', String(so.apps)],
      ['Goals', String(so.goals ?? 0)],
      ['Assists', String(so.assists ?? 0)],
      ['Rating', so.apps ? ((so.rating ?? 0) / so.apps).toFixed(1) : '-'],
    ],
    half: so => `First half: ${so.apps} games, ${so.goals ?? 0} goals, ${so.assists ?? 0} assists`,
    bucket: b => {
      const cards = soccerCardLine(b.line.yellow ?? 0, b.line.red ?? 0);
      return `Cups and other games: ${b.apps} apps, ${b.line.goals ?? 0} goals, ${b.line.assists ?? 0} assists${cards ? `, ${cards}` : ''}`;
    },
  };
}

/** The game's name in the resume record's storage key (seasonCentre:v1:soccer). */
const RESUME_GAME = 'soccer';

const RESULTS_WORDS = 'Results only: the game does not have a verified table for this league that season.';

function buildModel(row: SeasonRecord, ctx: SoccerSeasonCtx, s: DerivedSeason, moments: CentreMoments | null, color: string): CentreModel {
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
  const world = readLeagueWorldSeason(row);
  if (world) {
    notes.push('Simulated league world: direct promotion and relegation between two divisions.');
    if (world.simulation === 'simulated-partial') notes.push('The Spanish lower division uses the available first-team club pool. Reserve sides are not included.');
    if (world.movement) notes.push(`${world.movement.club} ${world.movement.kind} to ${world.movement.to}.`);
  }
  if (ctx.goldenBoot) notes.push(`👟 League Golden Boot: ${row.goals} goals in all competitions.`);
  if (ctx.keepsSheets && ctx.position !== 'GK') notes.push(`🧤 ${row.cleanSheets} clean sheets in all competitions.`);
  const cards = soccerCardLine(row.yellowCards, row.redCards);
  if (cards) notes.push(`Discipline: ${cards} in all competitions.`);
  if ((row.suspensionMatches ?? 0) > 0) notes.push(`${row.suspensionMatches} club ${row.suspensionMatches === 1 ? 'match' : 'matches'} missed through suspension.`);
  const last = ctx.lastSeason;
  /* the match rating's own lowest and highest value: the two numbers the season was derived with, not a copy of them */
  const rating = SOCCER.totals(row, ctx).find(t => t.key === 'rating');
  const ratingRange: [number, number] | null = rating && rating.kind === 'mean' ? [rating.min, rating.max] : null;
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
    sport: soccerSport(ctx.keepsSheets, color, roleOf(ctx.position), ratingRange),
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
          {onRetry && <button type="button" onClick={onRetry} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Retry</button>}
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground">{exitLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* Round 1046 (critic C1): which seasons can be watched again as they were.
   The save keeps one year of the league's world (who won it), so a table
   season he did not win can only be laid out the same while that world is
   still its year: later the champion's name is gone, the club names and one
   time in five his own scores would come out different. A results only
   season and a title season never read the world, so they always replay. */
/** The season is the same whatever the save does next. */
export function seasonStable(mode: 'table' | 'results', finish: number | null | undefined): boolean {
  return mode !== 'table' || finish === 1;
}
/** The season can be shown week by week right now. */
export function seasonReplays(mode: 'table' | 'results', finish: number | null | undefined, worldYear: number | null | undefined, year: number): boolean {
  return seasonStable(mode, finish) || worldYear === year;
}

const LOCKED_WORDS = 'The game did not keep who won the league that season, so it cannot be replayed week by week yet.';

/** The list of seasons he has played, newest first; the ones that replay are buttons. */
function Replays({ career, clubs, onPick, onClose }: { career: CareerState; clubs: ClubData[]; onPick: (row: SeasonRecord) => void; onClose: () => void }) {
  const rows = useMemo<PickerRow[]>(() => career.seasons
    .map((row, at) => ({ row, at }))
    .filter(x => x.row.type === 'playing' && x.row.apps > 0)
    .reverse()
    .map(({ row, at }) => {
      const ctx = buildSoccerSeasonCtx(career, clubs, row);
      const finish = readLeagueFinish(row);
      const place = finish ? `${ordinal(finish.finish)}${finish.size ? ` of ${finish.size}` : ''}` : null;
      const tally = career.position === 'GK' ? `${row.cleanSheets} clean sheets` : `${row.goals} goals`;
      return {
        id: String(at),
        label: `${row.year}/${String(row.year + 1).slice(-2)} · ${row.club}`,
        sub: [place, `${row.apps} apps`, tally].filter(Boolean).join(' · '),
        chip: row.leagueTitle ? '🏆' : undefined,
        locked: seasonReplays(ctx.mode, ctx.finish?.finish, career.phone?.world?.year, row.year) || !!readLeagueWorldSeason(row) || savedSeasonCompetitions(career, row).length > 0 ? undefined : LOCKED_WORDS,
      };
    }), [career, clubs]);
  return <SeasonPicker title="📺 Season replays" rows={rows} exitLabel="Back to your career" onPick={id => onPick(career.seasons[Number(id)])} onClose={onClose} />;
}

function CentreBody({ career, clubs, row, mode, onClose, onCareer, offer }: SoccerSeasonCentreProps & { row: SeasonRecord }) {
  const exitLabel = exitLabelOf(mode, career.phase);
  /* the season's facts come from fields a moment never writes, so the plan is
     derived once for the row and not again on every ledger entry */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => buildSoccerSeasonCtx(career, clubs, row), [career.playerName, career.position, career.phone, career.awards, career.seasons, clubs, row]);
  const key = SOCCER.seasonKey(row, ctx);
  const leagueAvailable = seasonReplays(ctx.mode, ctx.finish?.finish, career.phone?.world?.year, row.year) || !!readLeagueWorldSeason(row);
  const plan = useMemo(() => (key && leagueAvailable ? deriveSeason(SOCCER, row, ctx) : null), [key, leagueAvailable, row, ctx]);
  /* moments are the latest season's only: its key is the one the ledger and the bank answer to */
  const latest = career.seasons[career.seasons.length - 1];
  const canPlay = offer !== false && !!onCareer && !!plan && !!key && !!latest && soccerSeasonKey(career.playerName, latest) === key;
  /* Round 1167: the season's moments are planned whether or not one is offered, so the own goal pass
     leaves the same goals alone in a live season, a held one and a replay */
  const planned = useMemo(() => (plan ? planMoments(SOCCER, row, ctx, plan) : []), [plan, row, ctx]);
  const ledger = readSeasonMoments(career.seasonMoments);
  /* Round 1046: the season the ledger belongs to is always shown with what he did in it, offered or not */
  const held = !!plan && !!key && ledger?.key === key;
  const offered = useMemo(() => (canPlay || held ? planned : []), [canPlay, held, planned]);
  const entriesKey = JSON.stringify(ledgerOf(ledger, key ?? ''));
  const decided = useMemo(() => (plan && offered.length ? applyDecisions(SOCCER, row, ctx, plan, offered, JSON.parse(entriesKey) as number[][]) : plan), [plan, offered, entriesKey, row, ctx]);
  const season = useMemo(() => (decided ? soccerOwnGoals(decided, planned) : null), [decided, planned]);
  const moments = useSoccerMoments({ career, row, ctx, plan, key, offered, entriesKey, banked: !!ledger?.banked && ledger.key === key, onCareer: canPlay ? onCareer : undefined });
  /* his club's flat colour, the one the career already wears; the other side is always the same pale one */
  const color = clubs.find(c => c.name === row.club)?.color ?? '#10B981';
  const [screen, setScreen] = useState<CentreScreen>('league');
  const competitions = useMemo(() => savedSeasonCompetitions(career, row), [career, row]);
  const select = useCallback((next: CentreScreen) => setScreen(next), []);
  const calendar = useMemo(() => season ? cupCalendar(competitions, season.games.length) : [], [competitions, season]);
  const model = useMemo(() => {
    if (!season) return null;
    const base = buildModel(ballonDorSeasonForDisplay(career, row), ctx, season, moments, color);
    return calendar.length ? { ...base, calendar: { games: calendar, note: CUP_CALENDAR_NOTE, onCompetition: select } } : base;
  }, [season, career, row, ctx, moments, color, calendar, select]);
  /* Round 1046: his place in this season. Read once when the season opens; a
     table season he did not win replays the same only while the save still
     holds that year's league (the record says so with `stable`). */
  const [stored] = useState(() => readResume(RESUME_GAME));
  useEffect(() => {
    document.querySelector<HTMLButtonElement>('[data-season-centre]:not([aria-hidden="true"]) [data-centre-competition][aria-pressed="true"]')?.focus({ preventScroll: true });
  }, [screen]);
  const stable = seasonStable(ctx.mode, ctx.finish?.finish);
  const onProgress = useCallback((at: CentrePlace | null) => {
    if (!key) return;
    if (at) writeResume(RESUME_GAME, { key, year: row.year, md: at.md, speed: at.speed, stable, round: at.round });
    else if (readResume(RESUME_GAME)?.key === key) clearResume(RESUME_GAME);
  }, [key, row.year, stable]);
  const navigation = <CompetitionNavigation league={ctx.league?.name ?? 'League'} competitions={competitions} screen={screen} onSelect={select} />;
  const leave = () => { moments?.bank(false); onClose(); };
  if (!model && screen === 'league') return <SeasonCompetitionPanel key="unavailable" career={career} row={row} competition={null} navigation={navigation} exitLabel={exitLabel} onClose={leave}
    leagueUnavailable={leagueAvailable ? 'This season cannot be shown match by match.' : LOCKED_WORDS} />;
  const resume = stored && stored.key === key && stored.year === row.year ? stored : null;
  return <>
    {model && <SeasonCentre model={model} exitLabel={exitLabel} onClose={onClose} resume={resume} onProgress={onProgress} navigation={navigation} active={screen === 'league'} />}
    {screen !== 'league' && <SeasonCompetitionPanel key={screen} career={career} row={row} competition={competitions.find(c => c.id === screen) ?? null} navigation={navigation} exitLabel={exitLabel} onClose={leave} />}
  </>;
}

export default function SoccerSeasonCentre(props: SoccerSeasonCentreProps) {
  /* Round 1046: with no season handed in, he picks one from the list first */
  const [picked, setPicked] = useState<SeasonRecord | null>(null);
  const row = props.row ?? picked;
  return (
    <CentreBoundary onClose={props.onClose} exitLabel={exitLabelOf(props.mode, props.career.phase)}>
      {row
        ? <CentreBody key={`${row.year}|${row.club}`} {...props} row={row} />
        : <Replays career={props.career} clubs={props.clubs} onPick={setPicked} onClose={props.onClose} />}
    </CentreBoundary>
  );
}
