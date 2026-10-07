/* Round 1045: the season core's contract, proven on two toy sports before
   soccer hardens it (critic C6): a small double round robin table sport, and
   a 17 game record sport in the NFL's shape (a made field goal scores 3, a
   miss 0) with a won and lost band, a whole number per game mean and a max. */
import { describe, expect, it } from 'vitest';
import {
  deriveSeason, disagreements, ownRowRounds, reverseOf, roundRobinRounds, standingsOf, tableAt, soFar,
  type DerivedSeason, type FixedGame, type Frame, type SeasonSport, type StatTotal, type TeamTarget,
} from '@/lib/season/core';
import { LAW, goalLambda, poissonDraw } from '@/lib/season/law';

interface ToyRow {
  mode: 'table' | 'results';
  teams: number;
  finish?: number;
  title?: boolean;
  champion?: 'other' | { key: string };
  apps: number;
  played: number;
  block?: number;
  severe?: boolean;
  goals: number;
  assists: number;
  rating: number;
  cs?: number;
  yellow?: number;
  red?: number;
  fixed?: FixedGame[];
  seed?: string;
}

const RULE = { win: 3, draw: 1, loss: 0 };

const TOY: SeasonSport<ToyRow, null> = {
  id: 'toy',
  seasonKey: r => `toy|${r.seed ?? ''}|${r.teams}|${r.finish}|${r.goals}|${r.apps}`,
  frame: r => ({ mode: r.mode, teams: r.teams, games: 2 * (r.teams - 1), rule: r.mode === 'table' ? RULE : null }),
  fixtures: f => (f.mode === 'table' ? roundRobinRounds(f.teams) : ownRowRounds(f.teams)),
  target: (r): TeamTarget => (r.mode === 'table'
    ? { kind: 'finish', finish: r.finish!, title: !!r.title, champion: r.title ? 'mine' : r.champion ?? 'other' }
    : { kind: 'none' }),
  fixed: r => r.fixed ?? [],
  availability: r => ({ played: r.played, block: r.block ?? 0, severe: !!r.severe }),
  totals: (r): StatTotal[] => [
    { key: 'goals', kind: 'sum', total: r.goals, perGameCap: 4, teamFor: true },
    { key: 'assists', kind: 'sum', total: r.assists, perGameCap: 3, teamFor: true },
    { key: 'rating', kind: 'mean', mean: r.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },
    ...(r.cs !== undefined ? [{ key: 'cs', kind: 'count-of' as const, total: r.cs, when: 'shutout' as const }] : []),
    { key: 'yellow', kind: 'sum', total: r.yellow ?? 0, perGameCap: 1, distinct: 'card' },
    { key: 'red', kind: 'sum', total: r.red ?? 0, perGameCap: 1, distinct: 'card', suspends: true },
  ],
  apps: r => r.apps,
  score: (edge, home, rng) => [
    poissonDraw(goalLambda(edge, home ? LAW.home : LAW.away), rng),
    poissonDraw(goalLambda(-edge, home ? LAW.away : LAW.home), rng),
  ],
  strengths: (frame: Frame, target: TeamTarget, slotOf, _ctx, rng) => {
    const n = frame.teams;
    const ladder = Array.from({ length: n }, (_, i) => 85 - (20 * i) / Math.max(1, n - 1));
    const finish = target.kind === 'finish' ? target.finish : Math.ceil(n / 2);
    const out = new Array(n).fill(0);
    out[0] = ladder[finish - 1];
    const rest = ladder.filter((_, i) => i !== finish - 1);
    const champ = target.kind === 'finish' && typeof target.champion === 'object' ? slotOf.get(target.champion.key) : undefined;
    const slots = Array.from({ length: n - 1 }, (_, i) => i + 1).filter(s => s !== champ);
    if (champ !== undefined) out[champ] = rest.shift()!;
    for (let i = slots.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    slots.forEach((s, i) => { out[s] = rest[i]; });
    return out;
  },
  meanBase: (_k, g) => 6.4 + (g.line.goals ?? 0) * 0.7 + (g.line.assists ?? 0) * 0.4 + (g.us > g.them ? 0.3 : g.us < g.them ? -0.3 : 0),
  subChance: () => 0.1,
  labels: slots => slots.map(s => ({ name: s.slot === 0 ? 'Mine' : `Club ${s.slot}`, named: s.slot === 0, key: `s${s.slot}` })),
  words: { round: 'Matchday', title: 'Season Centre', unnamed: 'another club' },
};

const MID: ToyRow = { mode: 'table', teams: 10, finish: 4, apps: 20, played: 16, goals: 7, assists: 3, rating: 7.1, yellow: 2, red: 1 };

/** The table rebuilt from scratch, the slow way, for comparison. */
function replay(s: DerivedSeason, md: number) {
  const pts = new Array(s.teams).fill(0);
  const p = new Array(s.teams).fill(0);
  for (let r = 0; r < md; r += 1) for (const [h, a, hg, ag] of s.rounds[r]) {
    p[h] += 1; p[a] += 1;
    if (hg > ag) pts[h] += 3; else if (ag > hg) pts[a] += 3; else { pts[h] += 1; pts[a] += 1; }
  }
  return { pts, p };
}

describe('season core: the calendar', () => {
  it('pairs every club with every other once at each ground, one game a round', () => {
    for (const n of [4, 10, 18, 20]) {
      const rounds = roundRobinRounds(n);
      expect(rounds).toHaveLength(2 * (n - 1));
      const seen = new Set<string>();
      for (const r of rounds) {
        const inRound = r.flatMap(([h, a]) => [h, a]);
        expect(new Set(inRound).size).toBe(n);
        for (const [h, a] of r) { expect(seen.has(`${h}-${a}`)).toBe(false); seen.add(`${h}-${a}`); }
      }
      expect(seen.size).toBe(n * (n - 1));
    }
  });
  it('gives results mode his own row of the same calendar', () => {
    const own = ownRowRounds(20);
    expect(own).toHaveLength(38);
    expect(own.every(r => r.length === 1 && (r[0][0] === 0 || r[0][1] === 0))).toBe(true);
  });
});

describe('season core: a derived table season', () => {
  const s = deriveSeason(TOY, MID, null)!;
  it('derives, and agrees with its own row', () => {
    expect(s).not.toBeNull();
    expect(disagreements(TOY, MID, null, s)).toEqual([]);
  });
  it('replays the table to the same standings at every matchday', () => {
    for (let md = 0; md <= s.rounds.length; md += 1) {
      const t = tableAt(s, md);
      const { pts, p } = replay(s, md);
      for (const row of t) { expect(row.pts).toBe(pts[row.slot]); expect(row.p).toBe(p[row.slot]); }
      for (let i = 1; i < t.length; i += 1) expect(t[i - 1].pts).toBeGreaterThanOrEqual(t[i].pts);
    }
  });
  it('applies the points rule and lands his club on its saved finish, strictly apart', () => {
    const t = tableAt(s, s.rounds.length);
    for (const r of t) expect(r.pts).toBe(3 * r.w + r.d);
    const at = t.findIndex(r => r.slot === 0);
    expect(at + 1).toBe(4);
    expect(t[at - 1].pts).toBeGreaterThan(t[at].pts);
    expect(t[at].pts).toBeGreaterThan(t[at + 1].pts);
    expect(t[0].pts).toBeGreaterThan(t[1].pts);
  });
  it('lands every saved total, the red card followed by a suspension', () => {
    const all = soFar(s, s.rounds.length);
    expect(all.apps + s.bucket!.apps).toBe(20);
    expect((all.goals ?? 0) + (s.bucket!.line.goals ?? 0)).toBe(7);
    expect((all.assists ?? 0) + (s.bucket!.line.assists ?? 0)).toBe(3);
    const red = s.games.findIndex(g => (g.line.red ?? 0) > 0);
    if (red >= 0 && s.games.slice(red + 1).some(g => g.played)) expect(s.games[red + 1].why).toBe('suspended');
  });
  it('finds the other meeting with the same club', () => {
    for (const g of s.games) {
      const back = reverseOf(s, g.md)!;
      expect(back).not.toBe(g.md);
      expect(s.games.find(x => x.md === back)!.opp).toBe(g.opp);
      expect(reverseOf(s, back)).toBe(g.md);
    }
  });
  it('is deterministic, also from a JSON round trip of the row', () => {
    expect(deriveSeason(TOY, JSON.parse(JSON.stringify(MID)), null)).toEqual(s);
  });
  it('is caught by its own self check when a goal goes missing', () => {
    const broken: DerivedSeason = JSON.parse(JSON.stringify(s));
    const g = broken.games.find(x => (x.line.goals ?? 0) > 0) ?? broken.games.find(x => x.played)!;
    g.line.goals = (g.line.goals ?? 0) + 1;
    expect(disagreements(TOY, MID, null, broken).length).toBeGreaterThan(0);
  });
});

describe('season core: the clinch is strict', () => {
  const row: ToyRow = { ...MID, finish: 1, title: true, seed: 'title' };
  const s = deriveSeason(TOY, row, null)!;
  it('names the first matchday after which nobody can catch him', () => {
    expect(s).not.toBeNull();
    const md = s.clinch!.md;
    const left = (t: ReturnType<typeof standingsOf>, slot: number) => 18 - t.find(r => r.slot === slot)!.p;
    const holds = (k: number) => {
      const t = tableAt(s, k);
      const me = t.find(r => r.slot === 0)!;
      return t.every(r => r.slot === 0 || me.pts > r.pts + 3 * left(t, r.slot));
    };
    expect(holds(md)).toBe(true);
    if (md > 1) expect(holds(md - 1)).toBe(false);
  });
});

describe('season core: fixed games, modes and impossible rows', () => {
  const derby: FixedGame[] = [
    { key: 'Rival', home: true, us: 2, them: 1, played: true, line: { goals: 1 }, decisive: true },
    { key: 'Rival', home: false, us: 0, them: 0, played: true, line: { goals: 0 } },
  ];
  it('places every fixed meeting once, in the saved order, with the decisive goal where it was', () => {
    const row: ToyRow = { ...MID, fixed: derby, seed: 'derby' };
    const s = deriveSeason(TOY, row, null)!;
    expect(s).not.toBeNull();
    const got = s.games.filter(g => g.fixedKey === 'Rival');
    expect(got.map(g => [g.home, g.us, g.them])).toEqual([[true, 2, 1], [false, 0, 0]]);
    expect(got[0].md).toBeLessThan(got[1].md);
    const ours = got[0].events.filter(e => e.kind === 'goal' && e.side === 'us');
    expect(ours[1].mine).toBe(true);
  });
  it('puts a named rival champion on top when the save says so', () => {
    const row: ToyRow = { ...MID, finish: 3, fixed: derby, champion: { key: 'Rival' }, seed: 'champ' };
    const s = deriveSeason(TOY, row, null)!;
    expect(s).not.toBeNull();
    const rival = s.games.find(g => g.fixedKey === 'Rival')!.opp;
    expect(tableAt(s, s.rounds.length)[0].slot).toBe(rival);
  });
  it('shows his games only in results mode, with no table', () => {
    const s = deriveSeason(TOY, { ...MID, mode: 'results', seed: 'res' }, null)!;
    expect(s.mode).toBe('results');
    expect(tableAt(s, s.rounds.length)).toEqual([]);
    expect(s.games).toHaveLength(18);
  });
  it('ends a severe injury season after his last game, the block running off the end', () => {
    const row: ToyRow = { ...MID, mode: 'results', played: 6, apps: 8, block: 30, severe: true, red: 0, seed: 'severe' };
    const s = deriveSeason(TOY, row, null)!;
    expect(s).not.toBeNull();
    const last = s.games.map(g => g.played).lastIndexOf(true);
    expect(s.games.slice(last + 1).every(g => !g.played && g.why === 'injured')).toBe(true);
  });
  it('gives null for a row that cannot be laid out', () => {
    expect(deriveSeason(TOY, { ...MID, played: 19, apps: 25 }, null)).toBeNull();
    expect(deriveSeason(TOY, { ...MID, played: 16, block: 10 }, null)).toBeNull();
    expect(deriveSeason(TOY, { ...MID, apps: 10 }, null)).toBeNull();
  });
});

/* The record sport: 17 games, a won and lost band, no table. Points are 7 a
   touchdown and 3 a MADE field goal (a miss scores 0). */
interface RecordRow { wins: [number, number]; fgm: number; tackles: number; longFg: number }
const RECORD: SeasonSport<RecordRow, null> = {
  id: 'toy',
  seasonKey: r => `record|${r.fgm}|${r.tackles}|${r.longFg}`,
  frame: () => ({ mode: 'record', teams: 18, games: 17, rule: null, cap: 99 }),
  fixtures: (_f, rng) => Array.from({ length: 17 }, (_, i): [number, number][] => [rng() < 0.5 ? [0, i + 1] : [i + 1, 0]]),
  target: r => ({ kind: 'record', winsMin: r.wins[0], winsMax: r.wins[1] }),
  fixed: () => [],
  availability: () => ({ played: 17, block: 0, severe: false }),
  totals: (r): StatTotal[] => [
    { key: 'fgm', kind: 'sum', total: r.fgm, perGameCap: 4 },
    { key: 'tackles', kind: 'mean', mean: r.tackles, dp: 1, perGame: 'int', min: 0, max: 15 },
    { key: 'longFg', kind: 'max', max: r.longFg },
  ],
  apps: () => 17,
  score: (edge, home, rng) => {
    const side = (e: number) => {
      const td = poissonDraw(Math.max(0.5, 2.3 + e * 0.04), rng);
      const tries = poissonDraw(1.9, rng);
      let made = 0;
      for (let k = 0; k < tries; k += 1) if (rng() < 0.85) made += 1;
      return 7 * td + 3 * made;
    };
    return [side(edge + (home ? 1 : -1)), side(-edge + (home ? -1 : 1))];
  },
  strengths: (f, _t, _s, _c, rng) => Array.from({ length: f.teams }, (_, i) => (i === 0 ? 8 : rng() * 10)),
  meanBase: () => 5,
  subChance: () => 0,
  labels: slots => slots.map(s => ({ name: s.slot === 0 ? 'Mine' : 'another team', named: s.slot === 0, key: `t${s.slot}` })),
  words: { round: 'Week', title: 'Season Center', unnamed: 'another team' },
};

describe('season core: a record sport on the same loop', () => {
  const row: RecordRow = { wins: [10, 11], fgm: 28, tackles: 5.4, longFg: 52 };
  const s = deriveSeason(RECORD, row, null)!;
  it('lands the record band, a whole number mean and the max', () => {
    expect(s).not.toBeNull();
    expect(s.mode).toBe('record');
    const w = s.games.filter(g => g.us > g.them).length;
    expect(w).toBeGreaterThanOrEqual(10);
    expect(w).toBeLessThanOrEqual(11);
    const t = s.games.map(g => g.line.tackles);
    expect(t.every(v => Number.isInteger(v))).toBe(true);
    expect(Math.round((t.reduce((a, b) => a + b, 0) / t.length) * 10)).toBe(54);
    expect(Math.max(...s.games.map(g => g.line.longFg))).toBe(52);
    expect(s.games.reduce((a, g) => a + g.line.fgm, 0) + (s.bucket?.line.fgm ?? 0)).toBe(28);
    expect(tableAt(s, 17)).toEqual([]);
  });
});
