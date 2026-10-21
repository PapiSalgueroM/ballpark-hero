import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  coachQuickMatch, engineRegistrations, finishSeason, leagueBoardsOf, playNextEntry,
  restoreEngineRegistrations, resumeMatch, startCareer, startNextSeason,
  type CareerState, type CMPlayer, type CompBucket, type Competition,
  type MatchWeekReport, type MyGoalLine,
} from './clubManager';
import { leaders, type BoardMan } from './clubManagerLeagueBoards';

/* Current-source bookkeeping diagnostics, not a replay of the reported save.
   Every goal and substitute below comes from the actual engine. Only the late
   migration test removes a field, the book, from an actually played checkpoint. */
interface Counts {
  id: string;
  name: string;
  position: CMPlayer['position'];
  all: number;
  league: number;
  cup: number;
  ucl: number;
}
interface Match {
  before: Counts[];
  after: Counts[];
  report: MatchWeekReport;
  goals: MyGoalLine[];
  subs: string[];
  board: BoardMan[];
}
interface Campaign { club: string; state: CareerState; checkpoint: CareerState; matches: Match[] }

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const counts = (squad: CMPlayer[]): Counts[] => squad.map(p => ({
  id: p.id, name: p.name, position: p.position, all: p.seasonGoals,
  league: p.comp?.league?.goals ?? 0, cup: p.comp?.cup?.goals ?? 0, ucl: p.comp?.ucl?.goals ?? 0,
}));
function bucket(competition: Competition): CompBucket {
  if (competition === 'league') return 'league';
  if (competition === 'cup') return 'cup';
  if (competition === 'uclGroup' || competition === 'uclKo') return 'ucl';
  throw new Error(`Unobserved competition ${competition}`);
}
function seeded<T>(seed: number, run: () => T): T {
  const original = Math.random;
  let value = seed | 0;
  Math.random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  try { return run(); } finally { Math.random = original; }
}
function playedMatch(state: CareerState): { state: CareerState; match?: Match; over: boolean } {
  const opened = playNextEntry(state);
  if (opened.kind !== 'halftime') return { state: opened.state, over: opened.kind === 'seasonOver' };
  // This is the actual Quick Sim coach, with its real substitutions and goal draws.
  const committed = coachQuickMatch(opened.state);
  if (!committed.live) throw new Error('Actual halftime lost its live match');
  const before = counts(committed.squad);
  const goals = copy([...(committed.live.h1My ?? []), ...(committed.live.h2My ?? [])]);
  const subs = (committed.live.subs ?? []).flatMap(sub => sub.onId ? [sub.onId] : []);
  const settled = resumeMatch(committed);
  if (settled.kind !== 'match' || !settled.report) throw new Error('Actual committed match did not settle');
  const boards = leagueBoardsOf(settled.state);
  if (!boards || boards.from !== null) throw new Error('Fresh actual campaign lost its whole league book');
  return { state: settled.state, over: false, match: {
    before, after: counts(settled.state.squad), report: settled.report, goals, subs,
    board: leaders(boards.input, 'goals', Number.MAX_SAFE_INTEGER).filter(row => row.mine),
  } };
}
function campaign(club: string, seed: number): Campaign {
  return seeded(seed, () => {
    let state = startCareer(club), checkpoint: CareerState | null = null;
    const matches: Match[] = [];
    for (let step = 0; step < 180 && state.week < state.calendar.length; step += 1) {
      const next = playedMatch(state);
      state = next.state;
      if (next.match) matches.push(next.match);
      if (!checkpoint && matches.filter(match => match.report.competition === 'league').length === 8) checkpoint = copy(state);
      if (next.over) break;
    }
    if (state.week < state.calendar.length || !checkpoint) throw new Error(`${club}: bounded actual campaign did not finish`);
    return { club, state, checkpoint, matches };
  });
}
const scored = (match: Match, id: string): number => match.goals.filter(goal => goal.id === id && !goal.og).length;
const beforeOf = (match: Match, p: Counts): Counts => {
  const before = match.before.find(row => row.id === p.id);
  if (!before) throw new Error(`Settled player ${p.id} was not in the committed squad`);
  return before;
};
let campaigns: Campaign[] = [];
let held: ReturnType<typeof engineRegistrations>;

beforeAll(() => {
  held = engineRegistrations();
  vi.spyOn(Date, 'now').mockReturnValue(1791979200000);
  campaigns = [
    ['Real Madrid', 13691], ['Arsenal', 13692], ['PSG', 13693], ['Bayern Munich', 13694],
  ].map(([club, seed]) => campaign(String(club), Number(seed)));
  const matches = campaigns.flatMap(c => c.matches);
  console.info('Manager scorer diagnostic ' + JSON.stringify({
    campaigns: campaigns.length, matches: matches.length,
    league: matches.filter(m => m.report.competition === 'league').length,
    cup: matches.filter(m => m.report.competition === 'cup').length,
    europe: matches.filter(m => bucket(m.report.competition) === 'ucl').length,
    ownGoals: matches.reduce((sum, m) => sum + m.goals.filter(goal => goal.og).length, 0),
    shootouts: matches.filter(m => m.report.decidedBy === 'pens').length,
    leagueSubGoals: matches.reduce((sum, m) => sum + (m.report.competition === 'league'
      ? m.goals.filter(goal => !goal.og && m.subs.includes(goal.id)).length : 0), 0),
  }));
}, 120000);
afterAll(() => { if (held) restoreEngineRegistrations(held); vi.restoreAllMocks(); });

describe('reported Manager scorer omission, actual current-source diagnostics', () => {
  it('settles each committed scorer exactly once into his season and the correct competition', () => {
    const matches = campaigns.flatMap(c => c.matches);
    expect(matches.length).toBeGreaterThan(100);
    for (const match of matches) {
      expect(match.report.myScorers).toHaveLength(match.goals.length);
      for (const p of match.after) {
        const before = beforeOf(match, p), goals = scored(match, p.id), competition = bucket(match.report.competition);
        expect(p.all - before.all, `${p.name}: season goals`).toBe(goals);
        for (const key of ['league', 'cup', 'ucl'] as const) {
          expect(p[key] - before[key], `${p.name}: ${key} goals`).toBe(key === competition ? goals : 0);
        }
      }
    }
  });

  it('keeps naturally scored league goals by used substitutes in their league lines and board rows', () => {
    const witnesses = campaigns.flatMap(c => c.matches).filter(m => m.report.competition === 'league')
      .flatMap(match => match.goals.filter(goal => !goal.og && match.subs.includes(goal.id)).map(goal => ({ match, goal })));
    expect(witnesses.length, 'actual engine must supply a substitute scorer').toBeGreaterThan(0);
    for (const { match, goal } of witnesses) {
      const p = match.after.find(row => row.id === goal.id)!;
      expect(p.league - beforeOf(match, p).league).toBe(scored(match, p.id));
      expect(match.board.find(row => row.name === p.name && row.pos === p.position)?.n).toBe(p.league);
    }
  });

  it('excludes observed own goals and shootout kicks from player goal credit', () => {
    const matches = campaigns.flatMap(c => c.matches);
    const ownGoals = matches.filter(match => match.goals.some(goal => goal.og));
    const shootouts = matches.filter(match => match.report.decidedBy === 'pens');
    expect(ownGoals.length, 'actual engine must supply an own goal').toBeGreaterThan(0);
    expect(shootouts.length, 'actual engine must supply a shootout').toBeGreaterThan(0);
    for (const match of [...ownGoals, ...shootouts]) {
      const credited = match.after.reduce((sum, p) => sum + p.all - beforeOf(match, p).all, 0);
      expect(credited).toBe(match.report.myScorers.filter(goal => !goal.og).length);
      expect(credited).toBe(match.goals.filter(goal => !goal.og).length);
      for (const goal of match.goals.filter(line => line.og)) {
        const p = match.after.find(row => row.id === goal.id)!;
        expect(p.all - beforeOf(match, p).all).toBe(scored(match, p.id));
      }
    }
  });

  it('includes every current squad league scorer in the full order with his own league count', () => {
    for (const c of campaigns) for (const match of c.matches) {
      for (const p of match.after) {
        const row = match.board.find(entry => entry.name === p.name && entry.pos === p.position);
        if (p.league > 0) {
          expect(row, `${c.club}: ${p.name}`).toBeDefined();
          expect(row?.n).toBe(p.league);
          expect(row?.club).toBe(c.club);
        } else expect(row).toBeUndefined();
      }
    }
  });

  it('does not turn actually scored cup and Europe goals into league goals', () => {
    for (const competition of ['cup', 'ucl'] as const) {
      const matches = campaigns.flatMap(c => c.matches).filter(m => bucket(m.report.competition) === competition && m.goals.some(goal => !goal.og));
      expect(matches.length, `actual ${competition} scoring fixtures`).toBeGreaterThan(0);
      for (const match of matches) {
        const scoredGoals = match.goals.filter(goal => !goal.og).length;
        expect(match.after.reduce((sum, p) => sum + p.all - beforeOf(match, p).all, 0)).toBe(scoredGoals);
        expect(match.after.reduce((sum, p) => sum + p.league - beforeOf(match, p).league, 0)).toBe(0);
      }
    }
  });

  it('keeps a played late-book baseline across JSON restore and counts only subsequent league goals', () => {
    const state = copy(campaigns[0].checkpoint), baseline = counts(state.squad);
    expect(baseline.reduce((sum, p) => sum + p.league, 0)).toBeGreaterThan(0);
    delete state.leagueBook;
    const restored = seeded(13701, () => {
      let next = state;
      for (let step = 0; step < 20; step += 1) {
        const opened = playNextEntry(next, { skipHalftime: true });
        next = opened.state;
        if (opened.report?.competition === 'league') return copy(next);
      }
      throw new Error('Played legacy checkpoint never reached its next league match');
    });
    const boards = leagueBoardsOf(restored);
    expect(boards).not.toBeNull();
    expect(boards!.from).not.toBeNull();
    expect(restored.leagueBook?.b?.some(row => row[1] > 0)).toBe(true);
    const rows = leaders(boards!.input, 'goals', Number.MAX_SAFE_INTEGER).filter(row => row.mine);
    for (const p of counts(restored.squad)) {
      const before = baseline.find(row => row.id === p.id)!;
      const n = p.league - before.league;
      const row = rows.find(entry => entry.name === p.name && entry.pos === p.position);
      if (n > 0) expect(row?.n).toBe(n);
      else expect(row).toBeUndefined();
    }
  });

  it('rolls completed real campaigns to empty new-season goal lines and league boards', () => {
    for (const c of campaigns) seeded(13710, () => {
      const finished = finishSeason(copy(c.state)), next = startNextSeason(finished.state);
      expect(next.season).toBe(c.state.season + 1);
      expect(next.history.some(row => row.season === c.state.season && row.club === c.club)).toBe(true);
      for (const p of counts(next.squad)) expect([p.all, p.league, p.cup, p.ucl]).toEqual([0, 0, 0, 0]);
      const boards = leagueBoardsOf(next);
      expect(boards).not.toBeNull();
      expect(boards!.from).toBeNull();
      expect(leaders(boards!.input, 'goals')).toEqual([]);
    });
  }, 30000);
});
