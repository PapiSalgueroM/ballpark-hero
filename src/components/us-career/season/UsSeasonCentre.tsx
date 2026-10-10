/* Round 1048: the US careers' Season Center, the lazy entry a board loads
   only when a person presses "📺 Week by week" (or opens a season he already
   played). It is the mirror of soccer's binding of the shared viewer
   (src/components/soccer-career/SoccerSeasonCentre.tsx): the same Season
   Centre, the same core, a US sport's own words and numbers.

   It reads the career it is handed and writes nothing: the season shown is
   derived from the saved line by src/lib/season (the core, the US binding
   and the sport's number file, which this file loads through the board's
   own descriptor, so no sport is imported here). A season it cannot lay out
   game by game, or a year whose real length is not the one the view is
   built for, gets one honest tile instead of a guess. Its own error boundary
   keeps a render error inside the overlay; the host wraps the lazy mount in
   a second one, because a boundary inside this chunk cannot catch the chunk
   failing to load. */
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import { deriveSeason, type DerivedSeason } from '@/lib/season/core';
import { buildUsSeason, usPlayoffPath, type UsPlayoffPath, type UsRow, type UsSeasonBind, type UsSeasonCtx } from '@/lib/season/us';
import { SeasonCentre, type CentreModel } from '@/components/season-centre/SeasonCentre';
import { CentreTile } from '@/components/season-centre/CentreTile';

export interface UsSeasonCentreProps {
  sport: UsCareerSport;
  career: UsCareerCore;
  row: UsCareerSeason;
  onClose: () => void;
}

const EXIT = 'Back to your season';
const TITLE = 'Season Center';
const CANNOT = 'This season cannot be shown game by game.';

/** "beat the Denver Nuggets 4-2", "lost to another team". */
export function pathStepText(step: UsPlayoffPath['steps'][number], unnamed: string): string {
  const who = step.opp === unnamed ? unnamed : `the ${step.opp}`;
  return `${step.won ? 'beat' : 'lost to'} ${who}${step.score ? ` ${step.score}` : ''}`;
}

/** The viewer's model for one derived US season. */
export function buildUsModel(sport: UsCareerSport, bind: UsSeasonBind, career: UsCareerCore, row: UsRow, ctx: UsSeasonCtx, s: DerivedSeason, key: string): CentreModel {
  const view = bind.view;
  const pos = ctx.pos;
  const named = !!ctx.shape;
  const homes = s.games.filter(g => g.home).length;
  const w = s.games.filter(g => g.us > g.them).length;
  const l = s.games.filter(g => g.us < g.them).length;
  const t = s.games.length - w - l;
  const record = t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
  const at = career.seasons.findIndex(x => x.year === row.year && x.team === row.team && x.games === row.games);
  const prev = at > 0 ? career.seasons[at - 1] : null;
  const review = sport.reviewStats(row, pos);
  const title = bind.results.length > 0 && row.teamResult === bind.results[bind.results.length - 1];
  const path = usPlayoffPath(bind, row, ctx, key);
  const noPath = !path && view.noPathNote ? view.noPathNote(row) : null;
  /* Round 1147: the NFL saves its playoff line as a sentence ("512 yds, 4 TD, 1 INT"), printed as it is, and one game is "1 game" */
  const post = review.postseason.filter(x => x.value !== 'Not recorded')
    .map(x => (x.label === 'Performance' ? x.value : x.label === 'Games' && x.value === '1' ? '1 game' : `${x.value} ${x.label.toLowerCase()}`));
  /* the scoreboard and the phone's game log read the game's own ids in a named season */
  const idOf = new Map<string, string>();
  if (named) ctx.order.forEach((id, slot) => idOf.set(s.labels[slot]?.name ?? id, id));
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  return {
    season: s,
    words: view.words,
    names: s.labels.map(lb => lb.name),
    occasion: {},
    header: { club: ctx.teamLabel, seasonLabel: bind.seasonLabel(row.year), league: bind.league, loanFrom: null },
    frameLine: `${s.games.length} games · ${homes} home, ${s.games.length - homes} away · ${named ? "the league's schedule formula, this career's own draw" : "this career's own draw"}`,
    lastSeason: prev ? `Last season: ${prev.teamResult === 'SUSPENDED' ? 'suspended' : prev.teamResult}` : null,
    resultsWhy: named ? null : "Opponents are not named this season: the game does not hold that season's divisions and schedule.",
    derbyBefore: { w: 0, d: 0, l: 0 },
    review: {
      tiles: [['Games', String(row.games)], ...review.regular.slice(0, 3).map((x): [string, string] => [view.tileLabels[x.label] ?? x.label, x.value])],
      finishLine: `${record} · ${row.teamResult}`,
      championLine: null,
      /* no trophy emoji here: the title card draws its own */
      trophies: [...(title ? [`${bind.league} champions`] : []), ...(Array.isArray(row.awards) ? row.awards : [])],
      title,
      /* Round 1212: a season with no path may say why, in the sport's own words (baseball: a year before today's rounds) */
      notes: noPath ? [noPath] : [],
      path: path ? {
        head: 'Playoffs',
        steps: path.steps.map(st => ({ label: st.round, text: pathStepText(st, view.words.unnamed), won: st.won })),
        line: post.length ? `Your playoffs: ${post.join(', ')}` : null,
      } : undefined,
    },
    sport: {
      clock: {
        length: view.clock.length, label: view.clock.label, words: (e, us, them) => view.eventWords(e, us, them, pos),
        start: view.clock.start, end: view.clock.end, endShort: view.clock.endShort, labelClass: view.clock.labelClass,
        short: named ? name => idOf.get(name) ?? name : undefined,
      },
      fixed: { badge: '', poster: '', recordSoFar: '', recordPlayed: '' },
      missed: view.missed,
      lineOf: g => ({ bits: view.lineOf(g, pos), alarm: null }),
      markOf: g => view.markOf(g, pos),
      markChip: g => view.markChip(g, pos),
      markText: g => view.markText(g, pos),
      soFar: so => view.soFar(so, pos),
      half: so => view.half(so, pos, row),
      bucket: () => '',
    },
    copy: view.copy,
    helpKey: `seasonCentre:help:${bind.slug}`,
    groups: named ? [{ label: view.groupWords?.[0] ?? 'Division', slots: range(ctx.divSlots) }, { label: view.groupWords?.[1] ?? 'Conference', slots: range(ctx.confSlots) }] : undefined,
    /* the worked example names a team of THIS season that is not his (his first division rival), or nobody */
    help: view.help(named, named ? ctx.names[1] : undefined),
    momentKey: `centre|${key}`,
  };
}

class CentreBoundary extends Component<{ onClose: () => void; children: ReactNode }, { failed: boolean; tries: number }> {
  state = { failed: false, tries: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return <div key={this.state.tries} className="contents">{this.props.children}</div>;
    return (
      <CentreTile
        title={TITLE}
        text="Something went wrong drawing this season. Your career is safe."
        exitLabel={EXIT}
        onClose={this.props.onClose}
        onRetry={() => this.setState(st => ({ failed: false, tries: st.tries + 1 }))}
      />
    );
  }
}

function CentreBody({ sport, career, row, onClose }: UsSeasonCentreProps) {
  const [bind, setBind] = useState<UsSeasonBind | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    const load = sport.loadSeasonCentre;
    if (!load) { setFailed(true); return undefined; }
    load().then(b => { if (live) setBind(b); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [sport, tries]);
  const built = useMemo(() => (bind ? buildUsSeason(bind, career, row as UsRow, sport.teamLabelOf) : null), [bind, career, row, sport]);
  const season = useMemo(() => (built && built.ok === true ? deriveSeason(built.sport, row as UsRow, built.ctx) : null), [built, row]);
  const model = useMemo(
    () => (bind && built && built.ok === true && season ? buildUsModel(sport, bind, career, row as UsRow, built.ctx, season, built.key) : null),
    [bind, built, season, sport, career, row],
  );
  if (failed) return <CentreTile title={TITLE} text="The season could not be loaded. Your career is safe." exitLabel={EXIT} onClose={onClose} onRetry={() => setTries(n => n + 1)} />;
  if (!bind || !built) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4" data-season-centre-loading>
        <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-3 text-center">
          <div role="status" className="text-sm font-semibold">📺 Getting your season ready...</div>
          <button type="button" onClick={onClose} className="h-11 w-full rounded-lg border border-border px-3 text-xs font-semibold">{EXIT}</button>
        </div>
      </div>
    );
  }
  if (built.ok === false) return <CentreTile title={TITLE} text={built.why === 'held' ? built.line : CANNOT} exitLabel={EXIT} onClose={onClose} />;
  if (!model) return <CentreTile title={TITLE} text={CANNOT} exitLabel={EXIT} onClose={onClose} />;
  return <SeasonCentre model={model} exitLabel={EXIT} onClose={onClose} />;
}

export default function UsSeasonCentre(props: UsSeasonCentreProps) {
  return (
    <div className="contents" data-us-season-centre>
      <CentreBoundary onClose={props.onClose}>
        <CentreBody {...props} />
      </CentreBoundary>
    </div>
  );
}
