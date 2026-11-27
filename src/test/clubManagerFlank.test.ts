import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '@/lib/clubManagerTactics';
import {
  changeLive, engineRegistrations, liveStatsAt, playNextEntry, restoreEngineRegistrations, resumeMatch, startCareer, startSecondHalf,
  type CareerState, type PlayEvent,
} from '@/lib/clubManager';
import { drawFlankPlay, type FlankPlan, type FlankSegment } from '@/lib/clubManagerFlank';

function seeded<T>(seed: number, run: () => T) {
  const original = Math.random;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return run(); } finally { Math.random = original; }
}
const overlap: FlankPlan = { side: 'left', support: 'overlap' };
const protectedLeft: FlankPlan = { side: 'left', support: 'hold' };
const right: FlankPlan = { side: 'right', support: 'overlap' };
let halftime: CareerState, live: CareerState, registrations: ReturnType<typeof engineRegistrations>;
beforeAll(() => {
  registrations = engineRegistrations();
  const career = seeded(12207, () => startCareer('Brentford'));
  halftime = seeded(18031, () => playNextEntry(career)).state;
  live = seeded(85107, () => startSecondHalf(halftime))!;
  live.live!.minute = 46;
});
afterAll(() => restoreEngineRegistrations(registrations));
const copy = (career: CareerState, draw: number) => ({ ...career, live: { ...career.live!, flankDraw: draw } });
const change = (career: CareerState, minute: number, plan: FlankPlan | null) =>
  seeded(19, () => changeLive(career, minute, { kind: 'flank', plan }));
const plays = (s: CareerState) => [...(s.live!.h1Play ?? []), ...(s.live!.h2Play ?? [])];
const movements = (s: CareerState) => plays(s).filter(e => e.flankMove);
const scored = (play: PlayEvent[], side: 'me'|'opp') => play.filter(e => e.goal && e.side === side).length;
const empty = () => ({ entries: 0, losses: 0, shots: 0, counters: 0, goals: 0, conceded: 0 });

describe('open-play flank buildup in Club Manager', () => {
  it('keeps ordinary saves bare and refuses repeated instructions, malformed plans and absent matches', () => {
    expect(halftime.live).not.toHaveProperty('flankPlan');
    expect(live.live).not.toHaveProperty('flankDraw');
    expect(change(live, 46, null)).toBeNull();
    expect(changeLive({ ...live, live: null }, 46, { kind: 'flank', plan: overlap })).toBeNull();
    expect(changeLive(live, 46, { kind: 'flank', plan: { side: 'centre', support: 'hold' } as never })).toBeNull();
    const normalReport = seeded(17, () => resumeMatch(halftime)).report!;
    expect(normalReport.detail!.play!.filter(e => e.flankMove || e.flankChance)).toHaveLength(0);
    const a = change(live, 46, overlap)!;
    expect(Number.isInteger(a.live!.flankDraw)).toBe(true);
    expect(change(a, 46, overlap)).toBeNull();
    expect(live.live).not.toHaveProperty('flankPlan');
    const pending = { ...a, live: { ...a.live!, penaltyCalls: { fixture: 'pending', draw: 1, picks: [] } } };
    expect(change(pending, 85, right)).toBeNull();
  });

  it('the opponent shifts only after three observed entries and a switch preserves the exact old incident lists', () => {
    const active = change(copy(live, 1), 46, overlap)!;
    const seen = movements(active), response = seen.find(e => e.flankMove!.response)!;
    expect(response).toBeTruthy();
    expect(seen.filter(e => e.minute <= response.minute && e.flankMove!.outcome === 'entry')).toHaveLength(3);
    expect(seen.filter(e => e.minute <= response.minute).every(e => !e.flankMove!.covered)).toBe(true);
    expect(seen.filter(e => e.minute > response.minute).every(e => e.flankMove!.covered)).toBe(true);
    const at = response.minute;
    const changed = change(JSON.parse(JSON.stringify(active)), at, right)!;
    for (const k of ['h1Play','h2Play','h1My','h2My','h1Opp','h2Opp','h1Cards','h2Cards','h1Injuries','h2Injuries','oppSubs'] as const) {
      const past = (s: CareerState) => (s.live![k] ?? []).filter(e => e.minute <= at);
      expect(past(changed), k).toEqual(past(active));
    }
    const later = movements(changed).filter(e => e.minute > at);
    expect(later.length).toBeGreaterThan(0);
    expect(later[0].flankMove).toMatchObject({ side:'right', covered:false });
    expect(later.every(e => e.flankMove!.side === 'right')).toBe(true);
    expect(changed.live!.flankDraw).toBe(active.live!.flankDraw);
    const off = change(changed, later[0].minute, null)!;
    expect(movements(off).filter(e => e.minute > later[0].minute)).toHaveLength(0);
    expect(movements(off)).toEqual(movements(changed).filter(e => e.minute <= later[0].minute));
  });

  it('observes a sustained pattern across seeds, with real scorers, shot counts, table points and result log', () => {
    const totals = { hold: empty(), overlap: empty() };
    let changedResults = 0;
    for (let draw = 1; draw <= 100; draw++) {
      const outcomes: string[] = [];
      for (const plan of [overlap, protectedLeft]) {
        const active = change(copy(live, draw), 46, plan)!;
        const played = seeded(747, () => resumeMatch(active)), report = played.report!, all = report.detail!.play!;
        const row = totals[plan.support];
        for (const e of all) {
          if (e.flankMove?.outcome === 'entry') row.entries++;
          if (e.flankMove?.outcome === 'turnover') row.losses++;
          if (e.flankChance === 'entry') { row.shots++; if (e.goal) row.goals++; }
          if (e.flankChance === 'counter') { row.counters++; if (e.goal) row.conceded++; }
          if (e.flankChance) {
            const pass = all.find(m => m.minute === e.minute && !!m.flankMove);
            expect(pass?.flankMove?.outcome).toBe(e.flankChance === 'entry' ? 'entry' : 'turnover');
            expect(e.who.length).toBeGreaterThan(0);
          }
        }
        const home = report.home === active.clubName, gf = scored(all, 'me'), ga = scored(all, 'opp');
        expect([gf, ga]).toEqual(home ? [report.homeGoals,report.awayGoals] : [report.awayGoals,report.homeGoals]);
        expect(report.myScorers).toHaveLength(gf); expect(report.oppScorers).toHaveLength(ga);
        expect(report.detail!.stats).toEqual(liveStatsAt(active.live!,90));
        const table = played.state.table.find(team => team.club === active.clubName)!;
        expect([table.gf,table.ga,table.pts]).toEqual([gf,ga,gf > ga ? 3 : gf === ga ? 1 : 0]);
        const match = played.state.resultLog!.at(-1)!;
        expect(match.score).toBe(gf + '-' + ga);
        outcomes.push(match.res);
      }
      if (outcomes[0] !== outcomes[1]) changedResults++;
    }
    expect(totals.overlap.entries).toBeGreaterThan(totals.hold.entries * 1.25);
    expect(totals.overlap.shots).toBeGreaterThan(totals.hold.shots * 1.4);
    expect(totals.overlap.counters).toBeGreaterThan(totals.hold.counters * 1.8);
    expect(totals.overlap.goals).toBeGreaterThan(0); expect(totals.overlap.conceded).toBeGreaterThan(0);
    expect(changedResults).toBeGreaterThan(5);
  }, 30000);

  it('watched and skipped second halves settle one ledger, including after a reload', async () => {
    const prepared = change(copy(halftime, 29), 46, overlap)!;
    // Fresh sessions start the existing inbox and press counters at the same serial.
    const replay = async (watch: boolean) => {
      vi.resetModules();
      await import('@/lib/clubManagerTactics');
      const engine = await import('@/lib/clubManager');
      const saved = JSON.parse(JSON.stringify(prepared));
      return seeded(333, () => watch
        ? engine.resumeMatch(JSON.parse(JSON.stringify(engine.startSecondHalf(saved))))
        : engine.resumeMatch(saved));
    };
    const skipped = await replay(false);
    const watched = await replay(true);
    expect(watched.report).toEqual(skipped.report);
    expect(watched.state).toEqual(skipped.state);
    expect(skipped.report!.detail!.play!.some(e => e.flankMove)).toBe(true);
    expect(skipped.state.week).toBe(halftime.week + 1);
  });

  it('an unsuitable flank pair completes fewer entries and a weak opponent converts fewer interceptions into shots', () => {
    const players = live.squad.filter(p => !p.onLoan && p.position !== 'GK').slice(0, 3);
    const setup = (draw: number, matched: boolean, outletRating: number): FlankSegment => ({
      live: { ...live.live!, flankPlan: overlap, flankDraw: draw }, from: 0, to: 90, play: [], oppStrength: outletRating,
      reviewGoals: false, reviewKey: 'controlled-flank', mineAt: () => players,
      theirsAt: () => [{ n: 'Test outlet', p: 'ST', r: outletRating, g: true }],
      pairs: players.map((p,i) => ({ p, duty: null,
        slot: { label: 'Test slot', x: matched ? [14,14,50][i] : 66, y: [73,30,19][i], allowed: [matched ? p.position : 'GK'] } })),
    });
    let clean=0, narrow=0, strong=0, weak=0;
    for (let draw=0; draw<100; draw++) {
      const a=drawFlankPlay(setup(draw,true,91)).play;
      const b=drawFlankPlay(setup(draw,false,91)).play;
      const c=drawFlankPlay(setup(draw,true,55)).play;
      clean+=a.filter(e=>e.flankMove?.outcome==='entry').length; narrow+=b.filter(e=>e.flankMove?.outcome==='entry').length;
      strong+=a.filter(e=>e.flankChance==='counter').length; weak+=c.filter(e=>e.flankChance==='counter').length;
      expect(a.filter(e=>e.flankMove)).toEqual(c.filter(e=>e.flankMove));
    }
    expect(clean).toBeGreaterThan(narrow*1.15);
    expect(strong).toBeGreaterThan(weak*1.25);
  });
});
