import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
/* Round 1601: the player card's reader on states built through the engine. Every number is held against the save
   it was read from, and every note against the case that earns it. */
import {
  engineRegistrations, finishSeason, leagueBoardsOf, oppRosterFor, playNextEntry, restoreEngineRegistrations, startCareer,
  startNextSeason, type CareerState,
} from './clubManager';
import { leaders } from './clubManagerLeagueBoards';
import { pastOf } from './clubManagerCareerLines';
import { playerCardOf, seasonLabelOf } from './clubManagerCards';

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
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const play = (s: CareerState, n: number): CareerState => {
  for (let i = 0; i < n && s.week < s.calendar.length; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

let held: ReturnType<typeof engineRegistrations>;
let s2: CareerState;
beforeAll(() => {
  held = engineRegistrations();
  vi.spyOn(Date, 'now').mockReturnValue(1791979200000);
  s2 = seeded(16011, () => {
    const one = play(startCareer('Everton'), 220);
    return play(startNextSeason(finishSeason(one).state), 24);
  });
});
afterAll(() => { restoreEngineRegistrations(held); vi.restoreAllMocks(); });

describe('one of my men', () => {
  it('reads this season off his line, the league off comp.league, and his kept seasons with history\'s club', () => {
    const p = s2.squad.find(x => (x.apps ?? 0) > 0 && pastOf(s2.pastLines, x.id).length > 0);
    expect(p).toBeTruthy();
    if (!p) return;
    const card = playerCardOf(s2, { k: 'mine', id: p.id });
    expect(card?.mine).toBe(true);
    expect(card?.now?.apps).toBe(p.apps);
    expect(card?.now?.goals).toBe(p.seasonGoals);
    expect(card?.league?.goals).toBe(p.comp?.league?.goals ?? 0);
    const rows = pastOf(s2.pastLines, p.id);
    expect(card?.past.length).toBe(rows.length);
    expect(card?.past[0].season).toBe(rows[rows.length - 1][0]);
    expect(card?.past[0].club).toBe('Everton');
    expect(card?.past[0].label).toBe(seasonLabelOf(s2, rows[rows.length - 1][0]));
    expect(card?.past[0].metrics.find(m => m.key === 'apps')?.value).toBe(rows[rows.length - 1][1]);
    expect(card?.keptFrom).toBe(1);
    expect(card?.notes.some(n => n.k === 'keptfrom')).toBe(false);
  });
  it('shows only seasons finished at this club: after a job move a namesake wears none of the old club\'s', () => {
    const p = s2.squad.find(x => pastOf(s2.pastLines, x.id).length > 0);
    if (!p) throw new Error('no man of mine with a kept season');
    /* The seasons the rows were kept in, finished at another club: the shape a job move leaves. */
    const moved = copy(s2);
    moved.history = moved.history.map(h => ({ ...h, club: 'Somewhere Else' }));
    expect(playerCardOf(moved, { k: 'mine', id: p.id })?.past).toEqual([]);
    expect(playerCardOf(s2, { k: 'mine', id: p.id })?.past.length).toBe(pastOf(s2.pastLines, p.id).length);
  });
  it('is null for a man who is not at the club', () => {
    expect(playerCardOf(s2, { k: 'mine', id: 'nobody-here' })).toBeNull();
  });
  it('says the seasons before the first kept one were not kept, on a save from before the update', () => {
    const old = copy(s2);
    delete old.pastLines;
    delete old.pastFrom;
    const p = old.squad[0];
    const card = playerCardOf(old, { k: 'mine', id: p.id });
    expect(card?.past).toEqual([]);
    expect(card?.notes).toContainEqual({ k: 'keptfrom', from: old.season });
  });
});

describe('a man of another club', () => {
  it('reads a rival\'s league line from the book at his club, with no apps, average or cards', () => {
    const boards = leagueBoardsOf(s2);
    expect(boards).toBeTruthy();
    if (!boards) return;
    const top = leaders(boards.input, 'goals', Number.MAX_SAFE_INTEGER).find(m => !m.mine);
    expect(top).toBeTruthy();
    if (!top) return;
    const card = playerCardOf(s2, { k: 'man', name: top.name, pos: top.pos, club: top.club });
    expect(card?.mine).toBe(false);
    expect(card?.league?.goals).toBe(top.n);
    expect(card?.league?.apps).toBeNull();
    expect(card?.league?.average).toBeNull();
    expect(card?.league?.yellows).toBeNull();
    expect(card?.now).toBeNull();
    expect(card?.age).not.toBeNull();
  });
  it('says there is no book when the save holds none, and draws no league line', () => {
    const boards = leagueBoardsOf(s2);
    const top = boards ? leaders(boards.input, 'goals', Number.MAX_SAFE_INTEGER).find(m => !m.mine) : undefined;
    if (!top) throw new Error('no rival on the goals board');
    const none = copy(s2);
    delete none.leagueBook;
    const card = playerCardOf(none, { k: 'man', name: top.name, pos: top.pos, club: top.club });
    expect(card?.league).toBeNull();
    expect(card?.notes).toContainEqual({ k: 'nobook' });
  });
  it('shows a book row whose man the club no longer holds, with no roster facts', () => {
    const ghost = copy(s2);
    const book = ghost.leagueBook as { c: Record<string, { m: Record<string, number[]>; u: number }> };
    const [club, entry] = Object.entries(book.c).find(([, e]) => Object.values(e.m).some(r => r[0] > 0)) ?? [];
    if (!club || !entry) throw new Error('no rival row with a goal');
    const from = Object.values(entry.m).find(r => r[0] > 0) as number[];
    from[0] -= 1;
    entry.m['Nobody Real|ST'] = [1, 0, 0, 0];
    const card = playerCardOf(ghost, { k: 'man', name: 'Nobody Real', pos: 'ST', club });
    expect(card?.league?.goals).toBe(1);
    expect(card?.age).toBeNull();
    expect(card?.worth).toBeNull();
    expect(card?.notes).toContainEqual({ k: 'leftclub' });
  });
  it('says the game keeps goals for its own league only, for a club outside it', () => {
    const man = oppRosterFor(s2, 'Real Madrid')[0];
    const card = playerCardOf(s2, { k: 'man', name: man.n, pos: man.p, club: 'Real Madrid' });
    expect(card?.league).toBeNull();
    expect(card?.notes).toEqual([{ k: 'outside' }]);
    expect(card?.rating).toBe(man.r);
    expect(playerCardOf(s2, { k: 'man', name: 'Nobody Real', pos: 'ST', club: 'Real Madrid' })).toBeNull();
  });
});
