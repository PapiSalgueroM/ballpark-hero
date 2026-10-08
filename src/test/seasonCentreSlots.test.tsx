/* Round 1046: the Season Centre's markup, recorded BEFORE the round moved
   anything, so the round can prove what it did not change.

   Four strings, made with renderToStaticMarkup and held in the snapshot file
   beside this test:
     (a) the league table card for a 20 row table, whole and compact, with
         the props the Season Centre passes it;
     (b) the match clock with no stage slot, on one hand built game at full
         time;
     (c) the Season Centre opened with no resume, on its kick off card (a
         phone's screen, so the compact table is on it too).
   The table card's two strings are never recorded again in this round: the
   wrapper that slides the rows adds one element around the card and nothing
   inside it. (b) and (c) are recorded again exactly once, by the commit that
   fixes the phone's tap targets and text sizes, and that commit says which
   classes moved. */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import { RankShiftTable } from '@/components/motion/RankShiftTable';
import { MatchClock, type SeasonClock } from '@/components/season-centre/MatchClock';
import { SeasonCentre, type CentreModel, type CentreSport } from '@/components/season-centre/SeasonCentre';
import {
  deriveSeason, ownRowRounds, roundRobinRounds, tableAt,
  type DerivedGame, type FixedGame, type Frame, type SeasonSport, type StatTotal, type TeamTarget,
} from '@/lib/season/core';
import { LAW, goalLambda, poissonDraw } from '@/lib/season/law';
import { ordinal } from '@/lib/soccerCareerLeague';
import { soccerEventDisagreements, soccerEvents } from '@/lib/season/soccerEvents';

interface ToyRow { mode: 'table' | 'results'; teams: number; finish?: number; apps: number; played: number; goals: number; assists: number; rating: number; yellow?: number; red?: number; fixed?: FixedGame[]; seed?: string }

/* the toy table sport of seasonCore.test.ts, small: a double round robin with soccer's goal clock */
const TOY: SeasonSport<ToyRow, null> = {
  id: 'toy',
  seasonKey: r => `toy|${r.seed ?? ''}|${r.teams}|${r.finish}|${r.goals}|${r.apps}`,
  frame: r => ({ mode: r.mode, teams: r.teams, games: 2 * (r.teams - 1), rule: r.mode === 'table' ? { win: 3, draw: 1, loss: 0 } : null }),
  fixtures: f => (f.mode === 'table' ? roundRobinRounds(f.teams) : ownRowRounds(f.teams)),
  target: (r): TeamTarget => (r.mode === 'table' ? { kind: 'finish', finish: r.finish!, title: false, champion: 'other' } : { kind: 'none' }),
  fixed: r => r.fixed ?? [],
  availability: r => ({ played: r.played, block: 0, severe: false }),
  totals: (r): StatTotal[] => [
    { key: 'goals', kind: 'sum', total: r.goals, perGameCap: 4, teamFor: true },
    { key: 'assists', kind: 'sum', total: r.assists, perGameCap: 3, teamFor: true },
    { key: 'rating', kind: 'mean', mean: r.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },
    { key: 'yellow', kind: 'sum', total: r.yellow ?? 0, perGameCap: 1, distinct: 'card' },
    { key: 'red', kind: 'sum', total: r.red ?? 0, perGameCap: 1, distinct: 'card', suspends: true },
  ],
  apps: r => r.apps,
  score: (edge, home, rng) => [
    poissonDraw(goalLambda(edge, home ? LAW.home : LAW.away), rng),
    poissonDraw(goalLambda(-edge, home ? LAW.away : LAW.home), rng),
  ],
  strengths: (frame: Frame, target: TeamTarget, _slotOf, _ctx, rng) => {
    const n = frame.teams;
    const ladder = Array.from({ length: n }, (_, i) => 85 - (20 * i) / Math.max(1, n - 1));
    const finish = target.kind === 'finish' ? target.finish : Math.ceil(n / 2);
    const out = new Array(n).fill(0);
    out[0] = ladder[finish - 1];
    const rest = ladder.filter((_, i) => i !== finish - 1);
    const slots = Array.from({ length: n - 1 }, (_, i) => i + 1);
    for (let i = slots.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    slots.forEach((s, i) => { out[s] = rest[i]; });
    return out;
  },
  meanBase: (_k, g) => 6.4 + (g.line.goals ?? 0) * 0.7 + (g.line.assists ?? 0) * 0.4 + (g.us > g.them ? 0.3 : g.us < g.them ? -0.3 : 0),
  subChance: () => 0.1,
  labels: slots => slots.map(s => ({ name: s.slot === 0 ? 'Mine' : `Club ${s.slot}`, named: s.slot === 0 || s.slot % 3 !== 0, key: `s${s.slot}` })),
  events: soccerEvents,
  check: (r, _c, s) => soccerEventDisagreements(s, r.fixed ?? []),
  words: { round: 'Matchday', title: 'Season Centre', unnamed: 'another club' },
};

const SLOTS_ROW: ToyRow = { mode: 'table', teams: 10, finish: 4, apps: 20, played: 16, goals: 7, assists: 3, rating: 7.1, yellow: 2, red: 1 };

const CLOCK: SeasonClock = {
  length: 90,
  label: m => `${m}'`,
  words: (e, us, them) => (e.kind === 'goal' ? (e.side === 'us' ? (e.mine ? 'You score!' : `Goal, ${us}`) : `Goal, ${them}`) : e.kind),
};

const SPORT: CentreSport = {
  clock: CLOCK,
  fixed: { badge: 'DERBY', poster: 'Derby day', recordSoFar: 'Your derby record so far', recordPlayed: 'Derbies you played' },
  missed: why => (why === 'injured' ? 'Injured' : why === 'suspended' ? 'Suspended' : 'Not in the squad'),
  lineOf: (g: DerivedGame) => ({ bits: (g.line.goals ?? 0) > 0 ? [`Goals ${g.line.goals}`] : [], alarm: null }),
  markOf: g => g.line.rating ?? 0,
  soFar: so => [['Played', String(so.apps)], ['Goals', String(so.goals ?? 0)], ['Assists', String(so.assists ?? 0)], ['Rating', so.apps ? ((so.rating ?? 0) / so.apps).toFixed(1) : '-']],
  half: so => `First half: ${so.apps} games`,
  bucket: b => `Other games: ${b.apps} apps`,
};

/** The hand written model the kick off card is drawn from. */
function slotsModel(): CentreModel {
  const season = deriveSeason(TOY, SLOTS_ROW, null)!;
  return {
    season,
    words: TOY.words,
    names: season.labels.map(l => (l.named ? l.name : TOY.words.unnamed)),
    occasion: {},
    header: { club: 'Mine', seasonLabel: '2031/32', league: 'Toy League', loanFrom: null },
    frameLine: `${season.teams} clubs · ${season.games.length} matchdays · 3 points for a win`,
    lastSeason: 'Last season: 3rd with Mine',
    resultsWhy: null,
    derbyBefore: { w: 0, d: 0, l: 0 },
    review: { tiles: [['Apps', '20'], ['Goals', '7'], ['Assists', '3'], ['Avg rating', '7.1']], finishLine: 'Finished 4th of 10', championLine: null, trophies: [], title: false, notes: [] },
    sport: SPORT,
    help: { title: 'How it works', intro: ['One.'], controls: 'Two.', examples: [{ head: 'A', body: 'B' }], footnote: 'C' },
    momentKey: `centre|${season.key}`,
    moments: null,
  };
}

/** A 20 row table with every column different, his club ninth. */
const TABLE_20 = Array.from({ length: 20 }, (_, i) => ({ club: `k${i}`, w: 20 - i, d: i % 5, l: i, gf: 60 - 2 * i, ga: 20 + i, pts: 3 * (20 - i) + (i % 5) }));

const HAND_GAME: DerivedGame = {
  md: 7, opp: 3, home: true, us: 2, them: 1, fixed: false, played: true, started: true,
  line: { goals: 1, assists: 0, rating: 7.6 },
  events: [
    { min: 12, kind: 'goal', side: 'them', pts: 1 },
    { min: 40, kind: 'goal', side: 'us', pts: 1 },
    { min: 67, kind: 'goal', side: 'us', mine: true, pts: 1 },
  ],
};

const tableCard = (compact: boolean) => (
  <LeagueTableCard rows={TABLE_20} myClub="k8" compact={compact} zoneTop={1} isUnnamed={k => k === 'k3' || k === 'k11'}
    footnote="Clubs level on points are split by goal difference, then goals scored: this game's rule." />
);

/** The markup with the one wrapper element taken away again (its children stay where they were). */
function unwrapped(html: string, open: string): string {
  const at = html.indexOf(open);
  if (at < 0 || html.indexOf(open, at + 1) >= 0) throw new Error('the wrapper is not in the markup exactly once');
  const tags = /<div\b|<\/div>/g;
  tags.lastIndex = at + open.length;
  let depth = 1;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(0, at) + html.slice(at + open.length, m.index) + html.slice(m.index + m[0].length);
  }
  throw new Error('the wrapper never closes');
}

describe('Season Centre: the markup this round found', () => {
  it('(a) the table card, whole and compact', () => {
    expect(renderToStaticMarkup(tableCard(false))).toMatchSnapshot('table card, whole');
    expect(renderToStaticMarkup(tableCard(true))).toMatchSnapshot('table card, compact');
  });
  it('(a) the sliding wrapper adds one element around the card and nothing inside it', () => {
    for (const compact of [false, true]) {
      const card = renderToStaticMarkup(tableCard(compact));
      const wrapped = renderToStaticMarkup(<RankShiftTable order={TABLE_20.map(r => r.club)} slide>{tableCard(compact)}</RankShiftTable>);
      expect(wrapped).toBe(`<div data-rank-shift="">${card}</div>`);
    }
  });
  it('(b) the match clock with no stage slot, at full time', () => {
    const html = renderToStaticMarkup(<MatchClock game={HAND_GAME} clock={CLOCK} usName="Mine" themName="Club 3" speed={1} paused={false} reduced onFullTime={() => {}} />);
    expect(html).toMatchSnapshot('match clock');
  });
  it('(c) the Season Centre on its kick off card, no resume', () => {
    const html = renderToStaticMarkup(<SeasonCentre model={slotsModel()} exitLabel="Back to your career" onClose={() => {}} />);
    expect(html).toContain('data-kickoff');
    /* on a phone the kick off screen also holds the compact table, so the round's one new element is on it: taken away, the screen is the recorded one */
    expect(unwrapped(html, '<div data-rank-shift="">')).toMatchSnapshot('kick off');
  });
});

describe('Season Centre: opened where he stopped (Round 1046)', () => {
  const model = slotsModel();
  const M = model.season.games.length;
  const open = (resume?: { md: number; speed: 1 | 3 | 'results' } | null) =>
    renderToStaticMarkup(<SeasonCentre model={model} exitLabel="Back to your career" onClose={() => {}} resume={resume} />);
  it('starts the kick off card at his matchday, with his place and the next five', () => {
    const html = open({ md: 7, speed: 3 });
    const place = tableAt(model.season, 7).findIndex(r => r.slot === 0) + 1;
    expect(html).toContain(`7 of ${M} played · you are ${ordinal(place)}`);
    expect(html).toContain('Next five');
    expect(html).not.toContain('First five');
    expect(html).toContain('▶ Matchday 8');
    expect(html).not.toContain('▶ Kick off');
    expect(html).toContain('data-kickoff-restart');
    expect(html).toContain('After matchday 7');
  });
  it('lists the five games after his matchday, not the first five', () => {
    const html = open({ md: 7, speed: 1 });
    const card = html.slice(html.indexOf('data-kickoff='), html.indexOf('data-kickoff-restart'));
    const listed = [...card.matchAll(/<span class="w-6 tabular-nums text-muted-foreground">(\d+)<\/span>/g)].map(m => Number(m[1]));
    expect(listed).toEqual([8, 9, 10, 11, 12]);
  });
  it('is the fresh card when the place does not fit this season', () => {
    const fresh = open();
    for (const md of [0, -1, M, M + 5, 2.5, Number.NaN]) expect(open({ md, speed: 1 }), `md ${md}`).toBe(fresh);
    expect(open(null)).toBe(fresh);
  });
  it('takes the last matchday but one, and no further', () => {
    expect(open({ md: M - 1, speed: 1 })).toContain(`▶ Matchday ${M}`);
  });
});
