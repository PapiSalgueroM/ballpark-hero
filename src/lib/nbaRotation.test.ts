import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import * as engine from '@/lib/nbaFrontOffice';
import * as stats from '@/lib/nbaSeasonStats';
import { NBA_ROTATION_MINUTES, nbaRotation, nbaRotationSlots, nbaRotationPreferences, nbaSetRotationSlot, nbaAutoRotation, nbaReconcileRotation } from '@/lib/nbaRotation';
import { leagueNames } from '@/lib/foNames';
import { foNewSeasonStats } from '@/lib/foSeasonStats';
import type { NbaGmPlayer, NbaGmTeam, NbaLeague } from '@/lib/nbaFrontOffice';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const ids = (players: NbaGmPlayer[]) => players.map(p => p.id);
export function seeded(seed: number) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
}
export function fixtureTeam(abbr = 'BOS'): NbaGmTeam {
  const ratings = [96, 94, 92, 90, 88, 86, 84, 82, 78, 76, 74, 72, 70, 68];
  return { abbr, wins: 0, losses: 0, picks: [1, 2], players: ratings.map((ovr, i) => ({
    id: `fixture-${abbr}-${i}`, name: `Simulated ${abbr} player ${i}`, pos: (['G', 'F', 'C'] as const)[i % 3],
    age: 26, ovr, pot: ovr, salary: 1, years: 5, out: 0,
  })) };
}
export function fixtureLeague(): NbaLeague {
  const teams = Object.fromEntries([...engine.EAST, ...engine.WEST].map(abbr => {
    const t = fixtureTeam(abbr);
    if (abbr !== 'BOS') t.players.forEach(p => { p.ovr = 80; p.pot = 80; });
    return [abbr, t];
  }));
  return { season: 2026, cap: engine.NBA_CAP_BASE, teams, freeAgents: [], round: 1, champions: [], stats: foNewSeasonStats(2026) };
}
const weighted = (slots: (NbaGmPlayer | undefined)[]) => {
  const avg = (group: (NbaGmPlayer | undefined)[]) => {
    const available = group.filter((p): p is NbaGmPlayer => !!p);
    return available.length ? available.reduce((sum, p) => sum + p.ovr, 0) / available.length : 65;
  };
  return avg(slots.slice(0, 5)) * 0.72 + avg(slots.slice(5, 8)) * 0.28;
};

/** Whole original-engine campaign: regular season, play-in, playoffs, draft, summer and next season. */
export function automaticCampaign(api: typeof engine, box: typeof stats, seed: number, legacy = false) {
  let draws = 0;
  const r = seeded(seed), rng = () => { draws += 1; return r(); };
  const league = api.initNbaLeague(rng), labels = new Map<string, string>();
  const remember = () => {
    for (const p of [...Object.values(league.teams).flatMap(t => t.players), ...league.freeAgents]) labels.set(p.id, `person:${p.name}`);
  };
  remember();
  const team = 'BOS', reports = [], operations = [];
  const tip = api.nbaTipOff(league, rng, team); remember();
  const lowest = [...league.teams[team].players].sort((a, b) => a.ovr - b.ovr)[0];
  operations.push(api.nbaRelease(league.teams[team], league.freeAgents, lowest.id));
  operations.push(api.nbaSign(league.teams[team], league.freeAgents, 'missing-fixture-id', league.cap));
  for (let round = 1; round <= 20; round++) {
    league.round = round; reports.push(api.simRound(league, team, rng));
    if (legacy && round === 1) delete league.schedule;
  }
  const postseason = api.runNbaPlayoffs(league, rng);
  league.champions.push({ season: league.season, team: postseason.champion });
  const taxes = api.nbaAssessTax(league), awards = box.nbaCloseSeasonStats(league);
  const closed = clone(league);
  let draft = api.nbaDraftClass(rng, 24, leagueNames(league));
  for (const p of draft) labels.set(p.id, `prospect:${p.name}`);
  const signing = api.nbaDraftSigning(league), drafted = [];
  for (let pick = 0; pick < 2; pick++) {
    const chosen = draft[0]; drafted.push(chosen.name);
    league.teams[team].players.push(api.nbaProspectToPlayer(chosen, rng, signing));
    const others = draft.slice(1, 6), order = api.nbaStandings(league).map(t => t.abbr).reverse().filter(a => a !== team);
    others.forEach((p, i) => league.teams[order[i]].players.push(api.nbaProspectToPlayer(p, rng, signing)));
    draft = draft.slice(6); remember();
  }
  const offseason = api.nbaOffseason(league, rng, team); remember();
  while (league.teams[team].players.length > 15) {
    const weak = [...league.teams[team].players].sort((a, b) => a.ovr - b.ovr)[0];
    operations.push(api.nbaRelease(league.teams[team], league.freeAgents, weak.id));
  }
  const secondTip = api.nbaTipOff(league, rng, team); remember();
  for (let round = 1; round <= 3; round++) { league.round = round; reports.push(api.simRound(league, team, rng)); }
  const result = { closed, postseason, taxes, awards, tip, drafted, offseason, secondTip, league, reports, operations };
  const normalize = (value: unknown): unknown => {
    if (typeof value === 'string') return labels.get(value) ?? value;
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    const entries = Object.entries(value).map(([key, item]) => {
      const divider = key.indexOf('|'), id = key.slice(divider + 1);
      const normalizedKey = divider >= 0 && labels.has(id) ? `${key.slice(0, divider + 1)}${labels.get(id)}` : key;
      return [normalizedKey, normalize(item)] as const;
    });
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('Campaign identity projection collided');
    return Object.fromEntries(entries);
  };
  const normalized = normalize(JSON.parse(JSON.stringify(result)));
  return { digest: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'), draws, normalized,
    games: Object.values(closed.teams).map(t => t.wins + t.losses), booked: !!closed.schedule };
}

const ORIGINAL_REFERENCES: { seed: number; legacy?: boolean; digest: string; draws: number }[] = [
  {
    "seed": 117,
    "legacy": false,
    "digest": "32a869d8c5d69f54ebc81a9fe96c3bc62e758729357156b13c2bcc666eb4b79d",
    "draws": 12648
  },
  {
    "seed": 431,
    "legacy": false,
    "digest": "c8932bfe7bb8972ade1654767a37e1efcb42d2cb7204338ea9dc83c92b59b610",
    "draws": 12619
  },
  {
    "seed": 907,
    "legacy": false,
    "digest": "18bc0a486ee1eb2fe6483b86a1b6a377a9c0077314a4d2a61752aefeb6203488",
    "draws": 12685
  },
  {
    "seed": 117,
    "legacy": true,
    "digest": "b787f10068a3b8813f4aae761bfa49943a80c28747840edebf67cffecf92fdc6",
    "draws": 17256
  },
  {
    "seed": 431,
    "legacy": true,
    "digest": "e274495d96f0f7fa600a0a0a397d4fbc53369361f68489654bdb0aeeecb9ba6e",
    "draws": 17207
  },
  {
    "seed": 907,
    "legacy": true,
    "digest": "605d11b4071934263e341d07b4dc9dbc7ed5f7d9148142f10e74f9bf20340e6a",
    "draws": 17317
  }
];

describe('NBA manual rotation engine outcomes', () => {
  it('holds physical original automatic campaigns and RNG fingerprints as an independent baseline', () => {
    expect(ORIGINAL_REFERENCES).toHaveLength(6);
    for (const reference of ORIGINAL_REFERENCES) {
      const result = automaticCampaign(engine, stats, reference.seed, reference.legacy);
      expect(result.digest).toBe(reference.digest); expect(result.draws).toBe(reference.draws);
      expect(result.booked).toBe(!reference.legacy);
      if (!reference.legacy) expect(result.games).toEqual(Array(30).fill(80));
      console.log(`NBA_ORIGINAL ${reference.seed} ${result.digest} ${result.draws}`);
    }
  });

  it('keeps automatic tie order, empty fallback and fixed minutes as an independent baseline', () => {
    const t = fixtureTeam(), before = JSON.stringify(t);
    expect(ids(nbaRotation(t))).toEqual(t.players.slice(0, 8).map(p => p.id));
    expect(engine.nbaStrength(t)).toBeCloseTo(89.76, 10);
    expect(NBA_ROTATION_MINUTES).toEqual([36, 34, 33, 32, 30, 28, 26, 21]);
    t.players[1].ovr = t.players[0].ovr;
    expect(ids(nbaRotation(t)).slice(0, 2)).toEqual([t.players[0].id, t.players[1].id]);
    expect(nbaAutoRotation(t)).toBe(false); delete t.players[1].awards;
    t.players[1].ovr = 94; expect(JSON.stringify(t)).toBe(before);
    const empty = { ...t, players: [] }; expect(nbaRotation(empty)).toEqual([]); expect(engine.nbaStrength(empty)).toBe(65);
  });

  it('changes starter and bench strength only after a deliberate owned slot swap', () => {
    const t = fixtureTeam(), original = clone(t);
    expect(nbaSetRotationSlot(t, 0, t.players[7].id)).toBe(true);
    expect(t.rotation).toEqual([t.players[7].id, ...t.players.slice(1, 7).map(p => p.id), t.players[0].id]);
    expect(engine.nbaStrength(t)).toBeCloseTo(89.05066666666666, 10);
    expect(engine.nbaStrength(t)).toBe(weighted(nbaRotationSlots(t)));
    const { rotation: _rotation, ...rest } = t; expect(rest).toEqual(original);
    expect(nbaAutoRotation(t)).toBe(true); expect(t).toEqual(original);
  });

  it('puts a chosen bench prospect on the real box and keeps the original five starters', () => {
    const home = fixtureTeam(), away = fixtureTeam('DAL'), prospect = home.players[13];
    expect(nbaSetRotationSlot(home, 7, prospect.id)).toBe(true);
    const box = stats.nbaBoxScore(home, away, true, 0.2, 0.5, 777, 2026);
    expect(box.home.men.map(p => p.id)).toEqual([...home.players.slice(0, 7).map(p => p.id), prospect.id]);
    expect(box.home.men.filter(p => p.starter).map(p => p.id)).toEqual(home.players.slice(0, 5).map(p => p.id));
    expect(box.home.men.find(p => p.id === prospect.id)?.starter).toBe(false);
    expect(box.home.men.reduce((sum, p) => sum + p.pts, 0)).toBe(box.home.pts);
    expect(engine.nbaStrength(home)).toBe(weighted(nbaRotationSlots(home)));
  });

  it('covers only the injured preferred hole and restores it without rewriting preferences', () => {
    const t = fixtureTeam(); nbaSetRotationSlot(t, 0, t.players[7].id);
    const preferred = [...t.rotation!], injured = t.players[7]; injured.out = 2;
    const bytes = JSON.stringify(t), random = vi.spyOn(Math, 'random');
    const playing = nbaRotationSlots(t);
    expect(playing[0]?.id).toBe(t.players[8].id); expect(ids(playing.slice(1).filter((p): p is NbaGmPlayer => !!p))).toEqual(preferred.slice(1));
    expect(nbaRotationPreferences(t)[0].id).toBe(injured.id); expect(nbaReconcileRotation(t)).toBe(false);
    expect(JSON.stringify(t)).toBe(bytes); expect(random).not.toHaveBeenCalled(); random.mockRestore();
    injured.out = 0; expect(ids(nbaRotation(t))).toEqual(preferred); expect(t.rotation).toEqual(preferred);
  });

  it('keeps uncovered manual starter holes from stealing bench minutes and starter status', () => {
    const t = fixtureTeam(); t.players = t.players.slice(0, 8); nbaSetRotationSlot(t, 0, t.players[7].id); t.players[7].out = 2;
    const preferred = [...t.rotation!], slots = nbaRotationSlots(t);
    expect(slots).toHaveLength(8); expect(slots[0]).toBeUndefined();
    expect(ids(slots.slice(5).filter((p): p is NbaGmPlayer => !!p))).toEqual(preferred.slice(5));
    const box = stats.nbaBoxScore(t, fixtureTeam('DAL'), true, 0.2, 0.5, 777, 2026);
    expect(box.home.men.filter(p => p.starter).map(p => p.id)).toEqual(preferred.slice(1, 5));
    expect(box.home.men.filter(p => !p.starter).map(p => p.id)).toEqual(preferred.slice(5));
    expect(box.home.men.reduce((sum, p) => sum + p.pts, 0)).toBe(box.home.pts); expect(engine.nbaStrength(t)).toBe(weighted(slots));
  });

  it('retains the original all-injured emergency box and points identity for manual and automatic teams', () => {
    const t = fixtureTeam(); nbaSetRotationSlot(t, 0, t.players[7].id); t.players.forEach(p => { p.out = 2; });
    const automatic = clone(t); delete automatic.rotation;
    const actual = stats.nbaBoxScore(t, fixtureTeam('DAL'), true, 0.2, 0.5, 777, 2026);
    const original = stats.nbaBoxScore(automatic, fixtureTeam('DAL'), true, 0.2, 0.5, 777, 2026);
    expect(nbaRotationSlots(t)).toEqual(Array(8).fill(undefined)); expect(engine.nbaStrength(t)).toBe(65);
    expect(actual).toEqual(original); expect(actual.home.men.map(p => p.id)).toEqual(t.players.slice(0, 8).map(p => p.id));
    expect(actual.home.men.reduce((sum, p) => sum + p.pts, 0)).toBe(actual.home.pts);
  });

  it('refuses invalid, foreign, injured and identical choices without changing raw team state', () => {
    const t = fixtureTeam(); t.players[13].out = 1;
    for (const [slot, id] of [[-1, t.players[0].id], [8, t.players[0].id], [0.2, t.players[0].id], [NaN, t.players[0].id], [0, 'foreign'], [0, t.players[13].id], [0, null], [0, []], [0, t.players[0].id]] as const) {
      const before = JSON.stringify(t); expect(nbaSetRotationSlot(t, slot, id as unknown as string)).toBe(false); expect(JSON.stringify(t)).toBe(before);
    }
    expect(nbaSetRotationSlot(t, 7, t.players[12].id)).toBe(true);
    const before = JSON.stringify(t); expect(nbaSetRotationSlot(t, 7, t.players[12].id)).toBe(false); expect(JSON.stringify(t)).toBe(before);
  });

  it('reads malformed or duplicate saved preferences safely and repairs them only explicitly', () => {
    for (const invalid of [null, {}, 'wrong', [], [3], ['foreign', 'foreign'], Array(9).fill('foreign')]) {
      const t = fixtureTeam(); Object.assign(t, { rotation: invalid }); const before = JSON.stringify(t);
      expect(ids(nbaRotation(t))).toEqual(t.players.slice(0, 8).map(p => p.id)); expect(JSON.stringify(t)).toBe(before);
      expect(nbaReconcileRotation(t)).toBe(true); expect(Object.prototype.hasOwnProperty.call(t, 'rotation')).toBe(false);
    }
  });

  it('repairs successful releases and signs while failed moves stay byte-identical', () => {
    const t = fixtureTeam(), pool: NbaGmPlayer[] = []; nbaSetRotationSlot(t, 7, t.players[13].id); t.players[1].out = 2;
    const retainedInjury = t.players[1].id, released = t.players[13].id;
    expect(engine.nbaRelease(t, pool, released)).toBe(true); expect(t.rotation).not.toContain(released); expect(t.rotation).toContain(retainedInjury);
    expect(t.rotation!.every(id => t.players.some(p => p.id === id))).toBe(true);
    let before = JSON.stringify({ t, pool }); expect(engine.nbaRelease(t, pool, 'foreign')).toBe(false); expect(JSON.stringify({ t, pool })).toBe(before);
    expect(engine.nbaSign(t, pool, released, 1000)).toBe(false); expect(JSON.stringify({ t, pool })).toBe(before);
    const incoming = { ...fixtureTeam('DAL').players[0], salary: 1 }; pool.push(incoming); t.rotation![3] = 'departed-fixture-id';
    expect(engine.nbaSign(t, pool, incoming.id, 1000)).toBe(true); expect(t.rotation![3]).toBe(incoming.id); expect(t.rotation).toContain(retainedInjury);
    before = JSON.stringify({ t, pool }); expect(engine.nbaSign(t, pool, 'foreign', 1000)).toBe(false); expect(JSON.stringify({ t, pool })).toBe(before);
  });

  it.each(['trade', 'talks'] as const)('reconciles both clubs after an accepted %s while refusals mutate neither', route => {
    const my = fixtureTeam(), their = fixtureTeam('DAL'); nbaSetRotationSlot(my, 7, my.players[13].id); nbaSetRotationSlot(their, 7, their.players[13].id);
    const mine = my.players[0], theirs = their.players[13], before = JSON.stringify({ my, their });
    const invalid = route === 'trade' ? engine.nbaTrade(my, their, 'foreign', theirs.id, false, 1000) : engine.nbaExecuteTalksTrade(my, their, 'foreign', theirs.id, false, 1000);
    expect(invalid).toBe('invalid'); expect(JSON.stringify({ my, their })).toBe(before);
    const result = route === 'trade' ? engine.nbaTrade(my, their, mine.id, theirs.id, false, 1000) : engine.nbaExecuteTalksTrade(my, their, mine.id, theirs.id, false, 1000);
    expect(result).toBe(route === 'trade' ? 'accepted' : 'done'); expect(my.rotation).not.toContain(mine.id); expect(their.rotation).not.toContain(theirs.id);
    for (const t of [my, their]) { expect(t.rotation).toHaveLength(8); expect(new Set(t.rotation).size).toBe(8); expect(t.rotation!.every(id => t.players.some(p => p.id === id))).toBe(true); }
  });

  it('reconciles restored identity repair while preserving the original repaired-ID count', () => {
    const lg = fixtureLeague(), t = lg.teams.BOS; nbaSetRotationSlot(t, 7, t.players[13].id);
    t.players[1].id = t.players[0].id; t.rotation![3] = 'departed-fixture-id'; t.players[2].out = 2;
    expect(engine.ensureNbaLeagueIds(lg)).toBe(1); expect(new Set(t.players.map(p => p.id)).size).toBe(t.players.length);
    expect(t.rotation!.every(id => t.players.some(p => p.id === id))).toBe(true); expect(t.rotation).toContain(t.players[2].id);
  });

  it('reconciles real offseason retirement and expiring contracts before the next tip-off', () => {
    const lg = fixtureLeague(), t = lg.teams.BOS; nbaSetRotationSlot(t, 7, t.players[13].id);
    const retiring = t.players[13]; retiring.age = 35; retiring.ovr = 70; retiring.pot = 70;
    const renewing = t.players[0]; renewing.years = 1;
    engine.nbaOffseason(lg, seeded(117), 'BOS');
    expect(lg.season).toBe(2027); expect(t.players.some(p => p.id === retiring.id)).toBe(false); expect(t.rotation).not.toContain(retiring.id);
    expect(t.players.find(p => p.id === renewing.id)?.years).toBeGreaterThan(0); expect(t.rotation).toContain(renewing.id);
    expect(t.rotation!.every(id => t.players.some(p => p.id === id))).toBe(true);
    engine.nbaTipOff(lg, seeded(118), 'BOS'); expect(t.players.length).toBeGreaterThanOrEqual(14); expect(t.rotation).toHaveLength(8);
  });

  it('keeps a manual prospect playing through season, postseason, summer and a resumed next season', () => {
    const lg = fixtureLeague(), t = lg.teams.BOS, rng = seeded(441), prospect = t.players[13];
    prospect.rookieSeason = 2026; expect(nbaSetRotationSlot(t, 7, prospect.id)).toBe(true);
    for (let round = 1; round <= 20; round++) { lg.round = round; engine.simRound(lg, 'BOS', rng); }
    expect(Object.values(lg.teams).map(t => t.wins + t.losses)).toEqual(Array(30).fill(80));
    const lines = stats.nbaTeamLines(lg, 'BOS'); expect(lines.find(p => p.id === prospect.id)?.g ?? 0).toBeGreaterThan(0);
    expect(lines.find(p => p.id === prospect.id)?.gs).toBe(0);
    const post = engine.runNbaPlayoffs(lg, rng); expect(post.series.filter(s => s.name.includes('Play-In'))).toHaveLength(6); expect(post.series).toHaveLength(21);
    lg.champions.push({ season: lg.season, team: post.champion }); engine.nbaAssessTax(lg); stats.nbaCloseSeasonStats(lg);
    const draft = engine.nbaDraftClass(rng, 24, leagueNames(lg)), signing = engine.nbaDraftSigning(lg);
    const drafted = engine.nbaProspectToPlayer(draft[0], rng, signing); t.players.push(drafted);
    expect(t.rotation).toContain(prospect.id); expect(drafted.rookieSeason).toBe(2027);
    engine.nbaOffseason(lg, rng, 'BOS'); engine.nbaTipOff(lg, rng, 'BOS');
    const saved = JSON.stringify(lg), recovered = JSON.parse(saved) as NbaLeague; expect(JSON.stringify(recovered)).toBe(saved);
    engine.ensureNbaLeagueIds(recovered); const chosen = recovered.teams.BOS.rotation!; expect(chosen).toContain(prospect.id);
    for (let round = 1; round <= 3; round++) { recovered.round = round; engine.simRound(recovered, 'BOS', rng); }
    expect(stats.nbaTeamLines(recovered, 'BOS').find(p => p.id === prospect.id)?.g ?? 0).toBeGreaterThan(0); expect(recovered.champions).toHaveLength(1);
  });

  it('measures a paired complete-regular-season effect for weaker starters with identical draw counts', () => {
    const gains: number[] = [];
    for (let seed = 1; seed <= 18; seed++) {
      const strong = fixtureLeague(), weak = clone(strong), choices = weak.teams.BOS.players.slice(9).map(p => p.id);
      choices.forEach((id, i) => nbaSetRotationSlot(weak.teams.BOS, i, id));
      expect(engine.nbaWinProb(strong.teams.BOS, strong.teams.DAL) - engine.nbaWinProb(weak.teams.BOS, weak.teams.DAL)).toBeGreaterThan(0.5);
      const a = seeded(seed), b = seeded(seed); let aDraws = 0, bDraws = 0;
      for (let round = 1; round <= 20; round++) {
        strong.round = round; weak.round = round;
        engine.simRound(strong, 'BOS', () => { aDraws++; return a(); }); engine.simRound(weak, 'BOS', () => { bDraws++; return b(); });
      }
      expect(Object.values(strong.teams).map(t => t.wins + t.losses)).toEqual(Array(30).fill(80));
      expect(Object.values(weak.teams).map(t => t.wins + t.losses)).toEqual(Array(30).fill(80));
      expect(aDraws).toBe(bDraws); gains.push(strong.teams.BOS.wins - weak.teams.BOS.wins);
    }
    const blocks = [0, 6, 12].map(start => gains.slice(start, start + 6).reduce((sum, value) => sum + value, 0) / 6);
    console.log(`NBA_POLICY ${JSON.stringify({ gains, blocks })}`);
    expect(blocks.every(mean => mean > 30)).toBe(true);
  });
});
