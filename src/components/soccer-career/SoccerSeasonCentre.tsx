/* Round 1045: Soccer Career's Season Centre, the lazy entry the page loads
   only when a person presses "📺 Week by week" or "📺 Watch it week by week".

   It reads the save and writes nothing: the season shown is derived from
   the saved row by src/lib/season (core plus the soccer binding), memoised
   per row key, and a row it cannot lay out match by match gets one honest
   tile instead of a guess. Its own error boundary keeps a render error
   inside the overlay (Retry, Close); the page wraps the lazy mount in a
   second one, because a boundary inside this chunk cannot catch the chunk
   failing to load. */
import { Component, useMemo, useState, type ReactNode } from 'react';
import type { CareerState, ClubData, SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, tableAt } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, type SoccerSeasonCtx } from '@/lib/season/soccer';
import { readSeasonDerbies } from '@/lib/soccerCareerDerby';
import { leagueWithArticle } from '@/lib/soccerCareerLeague';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { SeasonCentre, ordinalOf, type CentreModel } from '@/components/season-centre/SeasonCentre';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import type { DerivedSeason } from '@/lib/season/core';

export interface SoccerSeasonCentreProps {
  career: CareerState;
  clubs: ClubData[];
  row: SeasonRecord;
  mode: 'live' | 'watch';
  onClose: () => void;
}

const HELP: HelpWords = {
  title: 'How the Season Centre works',
  intro: [
    'Your season was played the moment you pressed Next Season. This is that same season, match by match, so nothing here can change it.',
    "Who was in the league, how many clubs it had and how many points a win was worth are real. Every score, every other club's result and every minute are your career's own.",
  ],
  controls: '▶ plays the next matchday. ⏩ jumps to the next big game (a derby, halfway, the title or the final day). ⏭ goes straight to the end. 1x and 3x set the clock, Results shows each match at full time.',
  examples: [
    { head: 'A matchday', body: 'Matchday 12: you win 2-1 at home and score in the 67th minute, rated 7.6. The table moves you from 6th to 4th (▲2).' },
    { head: 'An injury', body: 'Out for three weeks with a hamstring: the club plays matchdays 14 to 16 without you. Your games played do not move. The table does.' },
    { head: 'Results only', body: 'A season the game has no verified table for (before 1995-96, a league outside the big five, or a season cut short) shows your league games with no table and no position.' },
  ],
  footnote: 'Cup ties and European nights count in your totals as "Cups and other games" but are not shown match by match yet. Clubs level on points are split by goal difference, then goals scored: this game\'s rule.',
};

const RESULTS_WORDS = 'Results only: the game does not have a verified table for this league that season.';

function buildModel(row: SeasonRecord, ctx: SoccerSeasonCtx, s: DerivedSeason): CentreModel {
  const occasion: Record<string, string> = {};
  for (const d of readSeasonDerbies(row)) occasion[d.rival] = d.name;
  const finish = ctx.finish;
  const leagueName = ctx.league?.name ?? null;
  const pts = s.mode === 'table' ? tableAt(s, s.games.length).find(r => r.slot === 0)?.pts ?? null : null;
  const finishLine = finish
    ? finish.finish === 1
      ? `Champions${leagueName ? ` of ${leagueWithArticle(leagueName)}` : ''}${finish.size ? `, top of ${finish.size}` : ''}${pts !== null ? ` · ${pts} pts` : ''}`
      : `Finished ${ordinalOf(finish.finish)}${finish.size ? ` of ${finish.size}` : ''}${leagueName ? ` in ${leagueWithArticle(leagueName)}` : ''}${pts !== null ? ` · ${pts} pts` : ''}`
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
    lastSeason: last ? (last.finish === 1 ? `Last season: champions with ${last.club}` : `Last season: ${ordinalOf(last.finish)} with ${last.club}`) : null,
    resultsWhy: s.mode === 'table' ? null : ctx.why === 'severe' ? 'Results only: your season was cut short, so there is no final table.' : RESULTS_WORDS,
    derbyBefore: { w: ctx.derbyBefore.w, d: ctx.derbyBefore.d, l: ctx.derbyBefore.l },
    review: {
      apps: row.apps, goals: row.goals, assists: row.assists, rating: row.rating,
      cleanSheets: ctx.position === 'GK' ? row.cleanSheets : null,
      finishLine, championLine: ctx.champion ? `${ctx.champion} won it` : null,
      trophies, title: !!row.leagueTitle && !row.injurySevere, notes,
    },
    keepsSheets: ctx.keepsSheets,
    help: HELP,
    momentKey: `centre|${s.key}`,
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

function CentreBody({ career, clubs, row, mode, onClose }: SoccerSeasonCentreProps) {
  const exitLabel = mode === 'live' ? 'Back to the papers' : 'Back to your career';
  const ctx = useMemo(() => buildSoccerSeasonCtx(career, clubs, row), [career, clubs, row]);
  const key = SOCCER.seasonKey(row, ctx);
  const season = useMemo(() => (key ? deriveSeason(SOCCER, row, ctx) : null), [key, row, ctx]);
  const model = useMemo(() => (season ? buildModel(row, ctx, season) : null), [season, row, ctx]);
  if (!model) return <Tile text="This season cannot be shown match by match." exitLabel={exitLabel} onClose={onClose} />;
  return <SeasonCentre model={model} exitLabel={exitLabel} onClose={onClose} />;
}

export default function SoccerSeasonCentre(props: SoccerSeasonCentreProps) {
  const [exitLabel] = useState(() => (props.mode === 'live' ? 'Back to the papers' : 'Back to your career'));
  return (
    <CentreBoundary onClose={props.onClose} exitLabel={exitLabel}>
      <CentreBody {...props} />
    </CentreBoundary>
  );
}
