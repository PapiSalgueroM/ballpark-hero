import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import * as engine from '@/lib/nhlFrontOffice';
import { rngFrom } from '@/lib/careerEngine';
import type { NhlContributors, NhlGmPlayer, NhlGmTeam, NhlLeague } from '@/lib/nhlFrontOffice';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const ids = (selection: NhlContributors) => [...selection.forwards, ...selection.defense, ...(selection.goalie === null ? [] : [selection.goalie])];
const raw = (team: NhlGmTeam, value: unknown) => Object.assign(team, { contributors: value });
const lowest = (team: NhlGmTeam): NhlContributors => {
  const healthy = team.players.filter(player => player.out === 0).sort((a, b) => a.ovr - b.ovr);
  return {
    forwards: healthy.filter(player => player.pos === 'C' || player.pos === 'W').slice(0, 6).map(player => player.id),
    defense: healthy.filter(player => player.pos === 'D').slice(0, 4).map(player => player.id),
    goalie: healthy.find(player => player.pos === 'G')?.id ?? null,
  };
};
const weighted = (team: NhlGmTeam, selection: NhlContributors): number => {
  const avg = (selected: string[]) => selected.length ? selected.reduce((sum, id) => sum + team.players.find(player => player.id === id)!.ovr, 0) / selected.length : 62;
  return avg(selection.forwards) * 0.5 + avg(selection.defense) * 0.3 + avg(selection.goalie === null ? [] : [selection.goalie]) * 0.2;
};
const fixtureTeam = (abbr = 'FIX'): NhlGmTeam => ({
  abbr, wins: 0, losses: 0, otLosses: 0, picks: [1, 2],
  players: Array.from({ length: 14 }, (_, index): NhlGmPlayer => ({
    id: `${abbr}-${index}`, name: `Fictional ${abbr} player ${index}`,
    pos: index < 8 ? index % 2 ? 'W' : 'C' : index < 12 ? 'D' : 'G',
    ovr: index < 8 ? index < 6 ? 95 : 50 : index < 12 ? 85 : index === 12 ? 95 : 50,
    age: 25, salary: 1, years: 5, out: 0, pot: 95,
  })),
});
const fixtureLeague = (): NhlLeague => {
  const teams = Object.fromEntries(['FIX', 'FIB', 'FIC', 'FID', 'FIE', 'FIF'].map(abbr => {
    const team = fixtureTeam(abbr);
    if (abbr !== 'FIX') team.players.forEach(player => { player.ovr = 80; });
    return [abbr, team];
  }));
  return { teams, season: 2026, round: 1, cap: 1000, freeAgents: [], champions: [] };
};

/* Captured from the physical pre-794 engine. Only opaque minted IDs are normalized;
   every new ID must still be unique, and all player/transaction/game fields remain. */
/* Round 851 moved these pins on purpose: the season is now booked from the
   league's own generator (src/lib/foSchedule.ts) instead of drawing a random
   opponent and a coin skip for every slot, so the fixtures and the draw count
   changed (17065, 16984, 16938 calls before). */
const ORIGINAL_REFERENCES = [
  { seed: 117, digest: 'b5e307f401421b128b122b890e98b14d14390123165a5964b0bca35b2f0869af', rngCalls: 12088 },
  { seed: 431, digest: 'fc273a8285ad7eab1cff2bdeba9084c3401d989e16551ad072fc03589af8044b', rngCalls: 12080 },
  { seed: 907, digest: '1da7787fbd0f1e5f2f5c410beae4a26cc6e4244e3561b9963228c9a528583ec9', rngCalls: 12055 },
];
function automaticCampaign(api: typeof engine, seed: number) {
  let calls = 0;
  const seeded = rngFrom(seed), rng = () => { calls += 1; return seeded(); };
  const league = api.initNhlLeague(rng), labels = new Map<string, string>();
  const rememberIds = () => {
    const players = [...Object.values(league.teams).flatMap(team => team.players), ...league.freeAgents];
    expect(new Set(players.map(player => player.id)).size).toBe(players.length);
    for (const team of Object.values(league.teams)) team.players.forEach((player, index) => {
      if (!labels.has(player.id)) labels.set(player.id, `${labels.size < 426 ? 'initial' : 'created'}:${team.abbr}:${index}:${player.name}`);
    });
    league.freeAgents.forEach((player, index) => { if (!labels.has(player.id)) labels.set(player.id, `free:${index}:${player.name}`); });
  };
  rememberIds();
  const my = league.teams.ANA, other = league.teams.BUF, released = my.players[0].id;
  const transactions: (boolean | string)[] = [api.nhlRelease(my, league.freeAgents, released), api.nhlSign(my, league.freeAgents, released, league.cap)];
  const available = league.freeAgents.find(player => player.id !== released && player.salary <= api.nhlCapRoom(my, league.cap))!;
  transactions.push(api.nhlSign(my, league.freeAgents, available.id, league.cap));
  let mine = [...my.players].sort((a, b) => api.nhlTradeValue(b) - api.nhlTradeValue(a))[0];
  let theirs = [...other.players].sort((a, b) => api.nhlTradeValue(a) - api.nhlTradeValue(b))[0];
  transactions.push(api.nhlTrade(my, other, 'missing', theirs.id, false, league.cap));
  transactions.push(api.nhlTrade(my, other, mine.id, theirs.id, true, league.cap));
  mine = [...my.players].sort((a, b) => api.nhlTradeValue(b) - api.nhlTradeValue(a))[0];
  theirs = [...other.players].sort((a, b) => api.nhlTradeValue(a) - api.nhlTradeValue(b))[0];
  transactions.push(api.nhlExecuteTalksTrade(my, other, mine.id, theirs.id, false, league.cap));
  const reports = [];
  for (let round = 1; round <= 20; round += 1) {
    league.round = round;
    reports.push(api.simNhlRound(league, 'ANA', rng));
    api.nhlAiMoves(league, 'ANA', rng);
  }
  const postseason = api.runNhlFoPlayoffs(league, rng);
  league.champions.push({ season: league.season, team: postseason.champion });
  const offseason = api.nhlOffseason(league, rng);
  rememberIds();
  expect(Object.values(league.teams).every(team => !Object.prototype.hasOwnProperty.call(team, 'contributors'))).toBe(true);
  const normalized = JSON.parse(JSON.stringify({ league, reports, postseason, offseason, transactions }), (_key, value) => typeof value === 'string' && labels.has(value) ? labels.get(value) : value);
  return { digest: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'), rngCalls: calls, normalized };
}

describe('NHL simulation contributor outcomes', () => {
  it('holds the frozen automatic season outcomes and RNG counts with no override fields', () => {
    for (const reference of ORIGINAL_REFERENCES) {
      const outcome = automaticCampaign(engine, reference.seed);
      console.log(`AUTOMATIC ${reference.seed}: digest=${outcome.digest}, rngCalls=${outcome.rngCalls}`);
      expect(outcome.digest).toBe(reference.digest); expect(outcome.rngCalls).toBe(reference.rngCalls);
    }
  });

  it.skipIf(!process.env.NHL_CONTRIBUTORS_BASELINE)('matches physical original rounds, AI, roster moves, playoffs and offseason', async () => {
    const original = await import(/* @vite-ignore */ process.env.NHL_CONTRIBUTORS_BASELINE!) as typeof engine;
    for (const reference of ORIGINAL_REFERENCES) {
      const old = automaticCampaign(original, reference.seed), current = automaticCampaign(engine, reference.seed);
      console.log(`PHYSICAL ORIGINAL ${reference.seed}: digest=${old.digest}, rngCalls=${old.rngCalls}`);
      expect(current.normalized).toEqual(old.normalized); expect(current.rngCalls).toBe(old.rngCalls);
    }
  });

  it('offers real first-season choices on all32 existing clubs and applies exact selected weights', () => {
    const league = engine.initNhlLeague(rngFrom(17));
    expect(Object.keys(league.teams)).toHaveLength(32);
    let forwardChoice = 0, defenseChoice = 0, goalieChoice = 0;
    for (const team of Object.values(league.teams)) {
      const automatic = engine.nhlContributors(team), before = clone(team);
      expect(engine.nhlStrength(team)).toBe(weighted(team, automatic)); expect(team.players).toHaveLength(13);
      forwardChoice += Number(team.players.filter(player => player.pos === 'C' || player.pos === 'W').length > 6);
      defenseChoice += Number(team.players.filter(player => player.pos === 'D').length > 4);
      goalieChoice += Number(team.players.filter(player => player.pos === 'G').length > 1);
      const selected = lowest(team);
      expect(engine.nhlSetContributors(team, selected)).toBe(true);
      expect(engine.nhlStrength(team)).toBe(weighted(team, selected)); expect(engine.nhlStrength(team)).toBeLessThan(weighted(before, automatic));
      const { contributors: _choice, ...unchanged } = team;
      expect(unchanged).toEqual(before);
      expect(engine.nhlResetContributors(team)).toBe(true); expect(team).toEqual(before);
    }
    expect([forwardChoice, defenseChoice, goalieChoice]).toEqual([32, 0, 31]);
  });

  it('refuses malformed, foreign, duplicate, wrong-role, injured, incomplete and identical choices without mutation', () => {
    const team = fixtureTeam(), valid = lowest(team), foreign = fixtureTeam('OTHER').players[6].id;
    const invalid: unknown[] = [null, [], {}, { ...valid, extra: true }, { ...valid, forwards: 'bad' },
      { ...valid, forwards: [foreign, ...valid.forwards.slice(1)] },
      { ...valid, forwards: [valid.forwards[1], ...valid.forwards.slice(1)] },
      { ...valid, forwards: [valid.defense[0], ...valid.forwards.slice(1)] },
      { ...valid, forwards: valid.forwards.slice(1) }, { ...valid, defense: valid.defense.slice(1) },
      { ...valid, goalie: null }, { ...valid, goalie: valid.forwards[0] }];
    for (const value of invalid) { const before = JSON.stringify(team); expect(engine.nhlSetContributors(team, value)).toBe(false); expect(JSON.stringify(team)).toBe(before); }
    const injured = clone(team); injured.players.find(player => player.id === valid.forwards[0])!.out = 2;
    const injuredBytes = JSON.stringify(injured); expect(engine.nhlSetContributors(injured, valid)).toBe(false); expect(JSON.stringify(injured)).toBe(injuredBytes);
    expect(engine.nhlSetContributors(team, engine.nhlContributors(team))).toBe(false);
    expect(engine.nhlSetContributors(team, valid)).toBe(true);
    valid.forwards.reverse(); valid.defense.reverse();
    const selectedBytes = JSON.stringify(team); expect(engine.nhlSetContributors(team, valid)).toBe(false); expect(JSON.stringify(team)).toBe(selectedBytes);
    valid.forwards[0] = 'mutated-input'; expect(ids(team.contributors!)).not.toContain('mutated-input');
    expect(engine.nhlResetContributors(team)).toBe(true); const resetBytes = JSON.stringify(team);
    expect(engine.nhlResetContributors(team)).toBe(false); expect(engine.repairNhlContributors(team)).toBe(false); expect(JSON.stringify(team)).toBe(resetBytes);
  });

  it('resolves unavailable IDs without mutation or RNG and repairs only an existing override', () => {
    const team = fixtureTeam(), random = vi.spyOn(Math, 'random'); engine.nhlSetContributors(team, lowest(team));
    const unavailable = team.contributors!.forwards[0]; team.players.find(player => player.id === unavailable)!.out = 2;
    team.contributors!.forwards[1] = 'foreign'; team.contributors!.forwards[2] = team.contributors!.forwards[3];
    const before = JSON.stringify(team);
    const effective = engine.nhlContributors(team);
    expect(ids(effective)).not.toContain(unavailable); expect(ids(effective)).not.toContain('foreign'); expect(new Set(ids(effective)).size).toBe(11);
    expect(ids(effective).every(id => team.players.some(player => player.id === id && player.out === 0))).toBe(true);
    expect(JSON.stringify(team)).toBe(before); expect(random).not.toHaveBeenCalled();
    expect(engine.repairNhlContributors(team)).toBe(true); expect(team.contributors).toEqual(effective);
    expect(engine.repairNhlContributors(team)).toBe(false); expect(random).not.toHaveBeenCalled();
    raw(team, { ...effective, extra: true }); expect(engine.repairNhlContributors(team)).toBe(true); expect(team).not.toHaveProperty('contributors');
    expect(random).not.toHaveBeenCalled(); random.mockRestore();
  });

  it('uses all available healthy thin-roster groups and the original62 empty-group fallback', () => {
    const team = fixtureTeam(); team.players = team.players.filter(player => player.pos !== 'G').slice(0, 2);
    const effective = engine.nhlContributors(team);
    expect(effective).toEqual({ forwards: team.players.map(player => player.id), defense: [], goalie: null });
    expect(engine.nhlStrength(team)).toBe(95 * 0.5 + 62 * 0.3 + 62 * 0.2);
    expect(engine.nhlSetContributors(team, effective)).toBe(false);
    raw(team, { forwards: ['departed'], defense: ['departed-D'], goalie: 'departed-G' });
    expect(engine.repairNhlContributors(team)).toBe(true); expect(team.contributors).toEqual(effective);
    team.players.forEach(player => { player.out = 2; });
    expect(engine.nhlContributors(team)).toEqual({ forwards: [], defense: [], goalie: null }); expect(engine.nhlStrength(team)).toBe(62 * 0.5 + 62 * 0.3 + 62 * 0.2);
  });

  it('repairs successful releases and signings while preserving dead money and failed-move bytes', () => {
    const team = fixtureTeam(), freeAgents: NhlGmPlayer[] = []; engine.nhlSetContributors(team, lowest(team));
    const selected = team.contributors!.goalie!, oldPlayer = clone(team.players.find(player => player.id === selected)!);
    const before = JSON.stringify(team); expect(engine.nhlRelease(team, freeAgents, 'missing')).toBe(false); expect(JSON.stringify(team)).toBe(before);
    expect(engine.nhlRelease(team, freeAgents, selected)).toBe(true);
    expect(team.contributors!.goalie).toBe('FIX-12'); expect(ids(team.contributors!)).not.toContain(selected);
    expect(team.deadCap).toEqual([{ playerId: selected, name: oldPlayer.name, amount: 0.5, seasonsLeft: 2 }]);
    expect(team.releasedThisSeason).toEqual([selected]);
    const cutBytes = JSON.stringify(team); expect(engine.nhlSign(team, freeAgents, selected, 1000)).toBe(false); expect(JSON.stringify(team)).toBe(cutBytes);
    const noGoalie = fixtureTeam('THIN'); noGoalie.players = noGoalie.players.filter(player => player.pos !== 'G'); engine.nhlSetContributors(noGoalie, lowest(noGoalie));
    const incoming = { ...oldPlayer, id: 'new-goalie', name: 'Fictional incoming goalie' }, market = [incoming];
    const failedBytes = JSON.stringify(noGoalie); expect(engine.nhlSign(noGoalie, market, incoming.id, 0)).toBe(false); expect(JSON.stringify(noGoalie)).toBe(failedBytes);
    expect(engine.nhlSign(noGoalie, market, incoming.id, 1000)).toBe(true); expect(noGoalie.contributors!.goalie).toBe(incoming.id); expect(noGoalie.players).toContain(incoming); expect(market).toHaveLength(0);
  });

  it('repairs both successful trade routes and preserves cap, picks and rejected transactions', () => {
    for (const route of ['direct', 'talks'] as const) {
      const my = fixtureTeam(), other = fixtureTeam('OTHER'); engine.nhlSetContributors(my, lowest(my));
      const outgoing = my.players.find(player => player.id === my.contributors!.forwards.find(id => my.players.find(player => player.id === id)!.ovr === 95))!;
      const incoming = other.players.find(player => player.pos === outgoing.pos && player.ovr === 50)!;
      const before = JSON.stringify([my, other]);
      expect(engine.nhlTrade(my, other, 'missing', incoming.id, true, 1000)).toBe('invalid'); expect(JSON.stringify([my, other])).toBe(before);
      expect(engine.nhlTrade(my, other, incoming.id.replace('OTHER', 'FIX'), other.players[0].id, false, 1000)).toBe('rejected'); expect(JSON.stringify([my, other])).toBe(before);
      const result = route === 'direct' ? engine.nhlTrade(my, other, outgoing.id, incoming.id, true, 1000) : engine.nhlExecuteTalksTrade(my, other, outgoing.id, incoming.id, true, 1000);
      expect(result).toBe(route === 'direct' ? 'accepted' : 'done');
      expect(ids(my.contributors!)).not.toContain(outgoing.id); expect(my.contributors).toEqual(engine.nhlContributors(my));
      expect(my.players).toContain(incoming); expect(other.players).toContain(outgoing);
      expect(my.picks).toEqual([1]); expect(other.picks).toEqual([1, 2, 2]); expect(engine.nhlCapUsed(my)).toBe(14); expect(engine.nhlCapUsed(other)).toBe(14); expect(other).not.toHaveProperty('contributors');
    }
  });

  it('repairs an actual injury tick and requires explicit reselection after recovery', () => {
    const league = fixtureLeague(), team = league.teams.FIX; engine.nhlSetContributors(team, lowest(team));
    const selected = team.contributors!.goalie!; team.players.find(player => player.id === selected)!.out = 2;
    engine.simNhlRound(league, 'FIX', () => 0.99);
    expect(team.players.find(player => player.id === selected)!.out).toBe(1); expect(team.contributors!.goalie).toBe('FIX-12');
    engine.simNhlRound(league, 'FIX', () => 0.99);
    expect(team.players.find(player => player.id === selected)!.out).toBe(0); expect(team.contributors!.goalie).toBe('FIX-12');
    expect(engine.nhlSetContributors(team, { ...team.contributors!, goalie: selected })).toBe(true); expect(team.contributors!.goalie).toBe(selected);
  });

  it('repairs retired and departed offseason contributors after actual roster replenishment', () => {
    const league = fixtureLeague(), team = league.teams.FIX; engine.nhlSetContributors(team, lowest(team));
    const retiring = team.contributors!.goalie!, departing = team.contributors!.forwards[0];
    team.players.find(player => player.id === retiring)!.age = 38;
    const expired = team.players.find(player => player.id === departing)!; expired.years = 1; expired.ovr = 70;
    engine.nhlOffseason(league, rngFrom(337));
    expect(league.season).toBe(2027); expect(team.players.some(player => player.id === retiring)).toBe(false);
    expect(team.players.some(player => player.id === departing)).toBe(false); expect(league.freeAgents.some(player => player.id === departing)).toBe(true);
    expect(team.contributors).toEqual(engine.nhlContributors(team)); expect(ids(team.contributors!)).not.toContain(retiring);
    expect(ids(team.contributors!).every(id => team.players.some(player => player.id === id && player.out === 0))).toBe(true);
    expect(Object.values(league.teams).filter(other => other.abbr !== 'FIX').every(other => !Object.prototype.hasOwnProperty.call(other, 'contributors'))).toBe(true);
  });

  it('repairs selected IDs after real legacy ID migration and survives JSON reload without foreign selection', () => {
    const league = engine.initNhlLeague(rngFrom(74)), team = league.teams.WSH; engine.nhlSetContributors(team, lowest(team));
    const selected = team.players.find(player => player.id === team.contributors!.forwards[0])!, foreign = league.teams.ANA.players[0].id;
    team.contributors!.forwards[0] = foreign; selected.id = foreign;
    const restored = clone(league); expect(engine.ensureNhlLeagueIds(restored)).toBe(1);
    expect(engine.repairNhlContributors(restored.teams.WSH)).toBe(true);
    expect(ids(restored.teams.WSH.contributors!)).not.toContain(foreign);
    expect(ids(restored.teams.WSH.contributors!).every(id => restored.teams.WSH.players.some(player => player.id === id && player.out === 0))).toBe(true);
    const twice = clone(restored); expect(engine.repairNhlContributors(twice.teams.WSH)).toBe(false); expect(twice).toEqual(restored);
  });

  it('measures a paired complete-season win effect for deliberate synthetic contributor choices', () => {
    const gaps: number[] = [];
    for (let seed = 1; seed <= 96; seed += 1) {
      const automatic = fixtureLeague(), chosen = clone(automatic), highRng = rngFrom(seed * 97), lowRng = rngFrom(seed * 97);
      for (let round = 1; round <= 20; round += 1) {
        engine.nhlSetContributors(chosen.teams.FIX, lowest(chosen.teams.FIX));
        engine.simNhlRound(automatic, 'FIX', highRng); engine.simNhlRound(chosen, 'FIX', lowRng);
      }
      gaps.push(automatic.teams.FIX.wins - chosen.teams.FIX.wins);
    }
    const mean = (values: number[]) => values.reduce((sum, gap) => sum + gap, 0) / values.length;
    const blocks = [0, 32, 64].map(start => mean(gaps.slice(start, start + 32)));
    console.log(`PAIRED SYNTHETIC contributors:96 complete20-round seasons per arm, mean win gap=${mean(gaps)},32-seed blocks=${blocks.join(',')}`);
    expect(mean(gaps)).toBeGreaterThan(25); for (const block of blocks) expect(block).toBeGreaterThan(25);
  });
});
