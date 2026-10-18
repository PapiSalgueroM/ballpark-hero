import { beforeAll, describe, expect, it } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import {
  ERA_LEAGUES, ERA_UCL_FIELDS, evalWorldUcl, playNextEntry, startCareer, worldUclEraField, worldUclNightsDone,
} from '@/lib/clubManager';
import { dateKey } from '@/lib/clubManagerCalendar';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { REAL_FIFTH_TILE, clubRun, firstStageNights, realFifthNation, worldCompView, worldUclStatus, worldUclView, type WorldCompView } from '@/lib/clubManagerWorldView';

/* Round 1503: the one view of the Champions League the screen reads, for the club watching it and for the club
   in it. Every check here is an identity of the save itself (the engine's own evaluation, the participant's own
   tables and bracket), never a number typed in. */

function playUntil(s: CareerState, stop: (s: CareerState) => boolean, limit = 400): CareerState {
  let cur = s;
  for (let i = 0; i < limit && !stop(cur) && cur.week < cur.calendar.length; i += 1) {
    cur = playNextEntry(cur, { skipHalftime: true, noCoach: true }).state;
  }
  return cur;
}
const seasonOver = (s: CareerState): boolean => s.week >= s.calendar.length;

/* Round 1509: the keyed adapter. worldCompView(career, 'ucl') is the view worldUclView always gave, on every
   fixture below, and nothing of this round's Europa League shows on a save that carries none. */
function sameKeyedView(...states: (CareerState | null)[]): void {
  for (const st of states) {
    if (!st) continue;
    expect(JSON.stringify(worldCompView(st, 'ucl'))).toBe(JSON.stringify(worldUclView(st)));
    if (!st.worldComps?.uel) expect(worldCompView(st, 'uel')).toBeNull();
  }
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

/** Dated nights rise strictly, night after night. */
function datesRise(view: WorldCompView): boolean {
  const keys = view.nights.filter(n => n.date).map(n => dateKey(n.date!));
  return keys.every((k, i) => i === 0 || k > keys[i - 1]);
}

describe('the club watching it: today\'s world, the 36 club league phase', () => {
  let start: CareerState;
  let mid: CareerState;
  let end: CareerState;
  beforeAll(() => {
    start = startCareer('Chelsea');
    mid = playUntil(start, s => worldUclNightsDone(s) >= 4);
    end = playUntil(mid, seasonOver);
  }, 300_000);

  it('opens with the draw made and nothing played', () => {
    expect(start.uclGroup).toBeNull();
    const v = worldUclView(start)!;
    expect(v.mode).toBe('watching');
    expect(v.format).toBe('l36');
    expect(v.clubs).toHaveLength(36);
    expect(v.clubs).not.toContain('Chelsea');
    expect(v.nights).toHaveLength(17);
    expect(v.nightsDone).toBe(0);
    expect(firstStageNights(v)).toBe(8);
    expect(datesRise(v)).toBe(true);
    expect(v.nights[0].fixtures).toHaveLength(18);
    expect(v.nights.flatMap(n => n.fixtures).every(f => f.homeGoals === null)).toBe(true);
    expect(worldUclStatus(start, v)).toEqual({ mode: 'watching', value: 'Matchday 1 of 8 next', sub: 'You are watching from outside' });
    expect(realFifthNation(start)).toBeNull();
  });

  /* fix-1509 (advice 21): fifth in the real 2025-26 Premier League (row A1) went to the real 2026-27 Champions
     League; the game's rule makes it a Europa League place, so the tile says why the club is in neither. */
  it('says on the tile why a season one Liverpool career is in neither competition', () => {
    const liv = startCareer('Liverpool');
    expect(liv.uclGroup).toBeNull();
    expect(liv.worldComps?.uel?.earned).toBe('L');
    expect(realFifthNation(liv)).toBe('England');
    expect(worldUclStatus(liv, worldUclView(liv)).sub).toBe(REAL_FIFTH_TILE);
    expect(realFifthNation({ ...liv, season: 2 })).toBeNull();
  });

  it('shows the nights the week has passed, and only those, with the engine\'s own scores', () => {
    const v = worldUclView(mid)!;
    const n = worldUclNightsDone(mid);
    expect(v.nightsDone).toBe(n);
    const raw = evalWorldUcl(mid)!;
    v.nights.forEach((night, i) => {
      expect(night.played).toBe(i < n);
      expect(night.fixtures.map(f => [f.home, f.away, f.homeGoals, f.awayGoals]))
        .toEqual(raw.nights[i].fixtures.map(f => [f.home, f.away, f.hg ?? null, f.ag ?? null]));
    });
    expect(v.table).toHaveLength(36);
    const pts = v.table!.reduce((a, r) => a + r.pts, 0);
    const games = v.nights.slice(0, n).flatMap(x => x.fixtures);
    const want = games.reduce((a, f) => a + (f.homeGoals === f.awayGoals ? 2 : 3), 0);
    expect(pts).toBe(want);
  });

  it('never writes into the shared evaluation it reads, and reads the same twice', () => {
    deepFreeze(evalWorldUcl(mid));
    const a = worldUclView(mid);
    expect(a).not.toBeNull();
    expect(JSON.stringify(worldUclView(mid))).toBe(JSON.stringify(a));
  });

  it('gives a club its eight league phase games, played then to play', () => {
    const v = worldUclView(mid)!;
    for (const club of v.clubs.slice(0, 6)) {
      const run = clubRun(v, club)!;
      const first = run.rows.filter(r => r.round.startsWith('MD'));
      expect(first).toHaveLength(8);
      expect(first.filter(r => r.status === 'recorded')).toHaveLength(v.nightsDone);
      expect(run.place).toMatch(/in the league phase so far$/);
    }
    expect(clubRun(v, 'Chelsea')).toBeNull();
  });

  it('crowns one winner at the season\'s end, the other finalist runner-up', () => {
    const v = worldUclView(end)!;
    expect(v.nights.every(n => n.played)).toBe(true);
    expect(v.winner).toBeTruthy();
    const final = v.ties.find(t => t.round === 'F')!;
    expect([final.home, final.away]).toContain(v.winner);
    expect(v.runnerUp).toBe(final.home === v.winner ? final.away : final.home);
    expect(clubRun(v, v.winner!)!.finish).toBe('Won it');
    expect(clubRun(v, v.runnerUp!)!.finish).toBe('Runners-up');
    expect(worldUclStatus(end, v).value).toBe(`Won by ${v.winner}`);
    expect(v.ties.filter(t => t.round === 'PO')).toHaveLength(8);
    expect(v.ties.filter(t => t.round === 'R16')).toHaveLength(8);
    for (const t of v.ties) expect(t.winner === t.home || t.winner === t.away).toBe(true);
  });

  /* Review fix (run lens, major 1): the knockout content, leg by leg and the right way round, against the engine's
     own evaluation. Mutation M6 (a two legged tie read as one match) turns this red. */
  it('shows every tie as the engine played it: two legs to the semi-finals, each leg the right way round', () => {
    const v = worldUclView(end)!;
    const raw = evalWorldUcl(end)!;
    expect(v.ties).toHaveLength(raw.ties.length);
    let twoLegged = 0;
    for (const r of raw.ties) {
      const t = v.ties.find(x => x.round === r.round && x.slot === r.slot)!;
      expect([t.home, t.away, t.winner, t.agg ?? null]).toEqual([r.home, r.away, r.winner, r.agg ?? null]);
      expect(t.legs).toBe(r.round === 'F' ? 1 : 2);
      if (r.round === 'F') continue;
      twoLegged += 1;
      expect([t.leg1, t.leg2]).toEqual([r.leg1, r.leg2]);
      expect([t.agg![0], t.agg![1]]).toEqual([t.leg1![0] + t.leg2![0], t.leg1![1] + t.leg2![1]]);
      /* The second leg is played at the away side's ground: its night lists it home first, with the score turned. */
      const night2 = v.nights.find(n => n.stage === r.round && n.leg === 2)!;
      expect(night2.fixtures).toContainEqual({ home: t.away, away: t.home, homeGoals: t.leg2![1], awayGoals: t.leg2![0] });
      const night1 = v.nights.find(n => n.stage === r.round && n.leg === 1)!;
      expect(night1.fixtures).toContainEqual({ home: t.home, away: t.away, homeGoals: t.leg1![0], awayGoals: t.leg1![1] });
    }
    expect(twoLegged).toBe(8 + 8 + 4 + 2);
  });

  it('is the same view keyed (Round 1509)', () => sameKeyedView(start, mid, end));
});

describe('the club in it: the participant engine read, not simulated again', () => {
  let groups: CareerState;
  let after: CareerState;
  beforeAll(() => {
    const s = startCareer('Real Madrid');
    groups = playUntil(s, x => (x.uclGroup?.matchday ?? 0) >= 3);
    after = playUntil(groups, x => !!x.uclBracket?.some(t => t.round === 'QF' && t.winner));
  }, 300_000);

  it('is its own groups, every group\'s table in the engine\'s order', () => {
    expect(groups.uclGroup).not.toBeNull();
    const v = worldUclView(groups)!;
    expect(v.mode).toBe('in');
    expect(v.format).toBe('g8');
    expect(v.groups).toHaveLength(1 + (groups.uclWorld ?? []).length);
    expect(v.groups![0].rows.map(r => r.club)).toContain('Real Madrid');
    expect(v.nights.filter(n => n.stage === 'md')).toHaveLength(6);
    expect(datesRise(v)).toBe(true);
  });

  it('shows each played group night with the ledger\'s scores, and the scores add up to the tables', () => {
    const v = worldUclView(groups)!;
    const md = groups.uclGroup!.matchday;
    const played = v.nights.filter(n => n.stage === 'md' && (n.md ?? 0) < md);
    expect(played).toHaveLength(md);
    for (const n of played) {
      expect(n.fixtures).toHaveLength(2 * v.groups!.length);
      expect(n.fixtures.every(f => f.homeGoals !== null && f.awayGoals !== null)).toBe(true);
    }
    for (const g of v.groups!) {
      const clubs = new Set(g.rows.map(r => r.club));
      const games = played.flatMap(n => n.fixtures).filter(f => clubs.has(f.home));
      const gf = games.reduce((a, f) => a + (f.homeGoals ?? 0) + (f.awayGoals ?? 0), 0);
      expect(g.rows.reduce((a, r) => a + r.gf, 0)).toBe(gf);
    }
    const run = clubRun(v, 'Real Madrid')!;
    expect(run.rows.filter(r => r.round.startsWith('MD'))).toHaveLength(6);
    expect(run.rows.filter(r => r.status === 'recorded')).toHaveLength(md);
    expect(worldUclStatus(groups, v).mode).toBe('in');
  });

  it('reads its knockout ties off the bracket, leg by leg', () => {
    const v = worldUclView(after)!;
    expect(v.ties).toHaveLength((after.uclBracket ?? []).length);
    for (const t of after.uclBracket ?? []) {
      const mine = v.ties.find(x => x.round === t.round && x.slot === t.slot)!;
      expect([mine.home, mine.away, mine.winner ?? null]).toEqual([t.home, t.away, t.winner]);
    }
    const qf = v.nights.filter(n => n.stage === 'QF' && n.played);
    expect(qf.length).toBeGreaterThan(0);
    for (const n of qf) expect(n.fixtures.every(f => f.homeGoals !== null)).toBe(true);
  });

  /* Review fix (run lens, major 1): each leg's night the right way round. The bracket stores both legs home first
     (the tie's home side); the second leg is at the other ground, so its night lists the away side at home with
     the score turned. Mutation M7 (the second leg night not turned) turns this red. */
  it('lists each knockout leg on its night at the right ground, with the score the bracket holds', () => {
    const v = worldUclView(after)!;
    const qfTies = (after.uclBracket ?? []).filter(t => t.round === 'QF' && t.leg1 && t.leg2);
    expect(qfTies).toHaveLength(4);
    const leg1 = v.nights.find(n => n.stage === 'QF' && n.leg === 1)!;
    const leg2 = v.nights.find(n => n.stage === 'QF' && n.leg === 2)!;
    for (const t of qfTies) {
      expect(leg1.fixtures).toContainEqual({ home: t.home, away: t.away, homeGoals: t.leg1!.homeGoals, awayGoals: t.leg1!.awayGoals });
      expect(leg2.fixtures).toContainEqual({ home: t.away, away: t.home, homeGoals: t.leg2!.awayGoals, awayGoals: t.leg2!.homeGoals });
      const tv = v.ties.find(x => x.round === 'QF' && x.slot === t.slot)!;
      expect([tv.legs, tv.leg1, tv.leg2]).toEqual([2, [t.leg1!.homeGoals, t.leg1!.awayGoals], [t.leg2!.homeGoals, t.leg2!.awayGoals]]);
    }
  });

  /* Review fix (read lens, M2): in today's world the club in it plays the stand in, group winners into the
     quarter-finals, so once the draw is made every club with no tie is out, second placed or not. */
  it('calls every club the draw left out "Out in the group stage", and no club in the bracket', () => {
    const v = worldUclView(after)!;
    expect(v.firstKo).toBe('QF');
    const inBracket = new Set(v.ties.flatMap(t => [t.home, t.away]));
    const left = v.clubs.filter(c => !inBracket.has(c));
    const seconds = v.groups!.map(g => g.rows[1].club).filter(c => !inBracket.has(c));
    expect(left).toHaveLength(v.clubs.length - 8);
    expect(seconds.length).toBeGreaterThanOrEqual(6);
    for (const c of left) expect(clubRun(v, c)!.finish).toBe('Out in the group stage');
    for (const c of inBracket) expect(clubRun(v, c)!.finish).not.toBe('Out in the group stage');
  });

  it('is the same view keyed (Round 1509)', () => sameKeyedView(groups, after));
});

/* Review fix (run lens, major 3): an era save whose club is in it but is not one of the real 32 takes the place of
   one of them, and the view names both. */
describe('an era save in it from outside the real 32', () => {
  let s: CareerState | null = null;
  beforeAll(async () => {
    await ensureEraRosters('era2015');
    const real = new Set((ERA_UCL_FIELDS.era2015 ?? []).map(e => e.name));
    for (const c of (ERA_LEAGUES.era2015 ?? []).flatMap(l => l.clubs).filter(x => !real.has(x))) {
      const st = startCareer(c, 'era2015');
      if (st.uclGroup) { s = st; break; }
    }
  }, 300_000);

  it('names the club and the real club whose place it takes', () => {
    expect(s).not.toBeNull();
    const v = worldUclView(s!)!;
    const real = (ERA_UCL_FIELDS.era2015 ?? []).map(e => e.name);
    expect(v.mode).toBe('in');
    expect(v.eraField).toBe(true);
    expect(v.clubs).toHaveLength(32);
    expect(v.standIn?.club).toBe(s!.clubName);
    expect(real).toContain(v.standIn!.for);
    expect(v.clubs).not.toContain(v.standIn!.for);
    expect(v.clubs.filter(c => !real.includes(c))).toEqual([s!.clubName]);
  });

  it('is the same view keyed (Round 1509)', () => sameKeyedView(s));
});

describe('an era save watching: eight groups of four, and its stand in', () => {
  let era: CareerState;
  let club = '';
  beforeAll(async () => {
    await ensureEraRosters('era2005');
    const leagueClubs = new Set((ERA_LEAGUES.era2005 ?? []).flatMap(l => l.clubs));
    club = (ERA_UCL_FIELDS.era2005 ?? []).map(e => e.name).find(c => leagueClubs.has(c) && startCareer(c, 'era2005').uclGroup === null) ?? '';
    era = playUntil(startCareer(club, 'era2005'), s => worldUclNightsDone(s) >= 2);
  }, 300_000);

  it('plays the era\'s groups with the stand in named', () => {
    expect(club).not.toBe('');
    const v = worldUclView(era)!;
    expect(v.format).toBe('g8');
    expect(v.clubs).toHaveLength(32);
    expect(v.groups).toHaveLength(8);
    expect(v.nights).toHaveLength(13);
    expect(v.eraField).toBe(true);
    expect(v.standIn).toEqual({ club: worldUclEraField(era)!.standIn, for: club });
    expect(datesRise(v)).toBe(true);
  });

  it('shows a night counted through seen as played before the move, with no date', () => {
    const n = worldUclNightsDone(era);
    const moved = JSON.parse(JSON.stringify(era)) as CareerState;
    moved.worldComps!.ucl!.seen = n + 2;
    const v = worldUclView(moved)!;
    expect(v.nightsDone).toBe(n + 2);
    expect(v.nights.slice(n, n + 2).every(x => x.played && x.beforeMove && x.date === null)).toBe(true);
    expect(v.nights.slice(0, n).every(x => !x.beforeMove && x.date !== null)).toBe(true);
  });

  it('has nothing to show for a save with no slice and no place', () => {
    const none = JSON.parse(JSON.stringify(era)) as CareerState;
    delete none.worldComps;
    expect(worldUclView(none)).toBeNull();
    expect(worldUclStatus(none, null).mode).toBe('none');
    sameKeyedView(none);
  });

  it('is the same view keyed (Round 1509)', () => {
    const moved = JSON.parse(JSON.stringify(era)) as CareerState;
    moved.worldComps!.ucl!.seen = worldUclNightsDone(era) + 2;
    sameKeyedView(era, moved);
  });
});
