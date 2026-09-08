import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { ModuleKind, transpileModule } from 'typescript';
import { describe, expect, it } from 'vitest';
import * as realEngine from './conquestAttack';
import { attackStrength, attackOrigin, advanceAttack, createAttack, parseAttackSave, rayTarget, rayTargetFromRegion, type AttackSetup, type AttackState } from './conquestAttack';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function setup(seed = 7): AttackSetup {
  return {
    dataVersion: 'fictional-v1', seed, bounds: { width: 50, height: 10 },
    teams: ['A', 'B', 'C'].map((id, i) => ({
      id, name: ['Amber Vale', 'Birch Town', 'Cedar Park'][i], color: ['#ff8800', '#228844', '#8822aa'][i],
      overall: 70, homeRegion: ['west', 'east', 'far'][i],
      players: [80, 80, 60].map((rating, j) => ({ id: `${id}${j}`, name: `Fictional ${id} ${j}`, rating, originTeam: id })),
    })),
    regions: ['west', 'middle', 'east', 'spare', 'far'].map((id, i) => ({
      id, name: id, rings: [[[i * 10, 0], [i * 10 + 10, 0], [i * 10 + 10, 10], [i * 10, 10]]],
      anchor: [i * 10 + 5, 5], initialOwner: ['A', null, 'B', null, 'C'][i],
    })),
  };
}
function initial(seed = 7): AttackState {
  const snapshot = setup(seed);
  return {
    version: 1, rulesVersion: 1, setup: snapshot, rng: seed, revision: 0,
    owners: Object.fromEntries(snapshot.regions.map(r => [r.id, r.initialOwner])),
    teams: clone(snapshot.teams), phase: 'team', selectedTeam: null, originRegion: null, bearing: null,
    targetRegion: null, lastResult: null, champion: null,
  };
}

function disconnectedSaveFixture(): { valid: AttackState; damaged: AttackState } {
  const source = setup();
  source.bounds.width = 25;
  source.teams = source.teams.slice(0, 2);
  source.teams[1].homeRegion = 'east';
  source.regions = [source.regions[0], {
    ...source.regions[2],
    rings: [[[10, 0], [20, 0], [20, 10], [10, 10]]],
    anchor: [15, 5],
  }];
  const valid = createAttack(source);
  const damaged = clone(valid);
  damaged.setup.regions[1].rings = damaged.setup.regions[1].rings.map(ring => ring.map(([x, y]) => [x + 5, y]));
  damaged.setup.regions[1].anchor[0] += 5;
  return { valid, damaged };
}

function cornerSetup(): AttackSetup {
  const source = setup();
  source.bounds = { width: 40, height: 30 };
  source.regions = [
    ['home', 0, 0, 'A'], ['z', 0, 20, 'A'], ['a', 20, 0, 'A'],
    ['blocked', 10, 10, 'A'], ['east', 30, 0, 'B'], ['far', 10, 20, 'C'],
  ].map(([id, x, y, owner]) => ({
    id: String(id), name: String(id), anchor: [Number(x) + 5, Number(y) + 5], initialOwner: String(owner),
    rings: [[[Number(x), Number(y)], [Number(x) + 10, Number(y)], [Number(x) + 10, Number(y) + 10], [Number(x), Number(y) + 10]]],
  }));
  source.teams[0].homeRegion = 'home';
  source.regions[3].anchor = [13, 13];
  source.regions[3].rings = [[[12, 12], [14, 12], [14, 14], [12, 14]]];
  return source;
}

describe('snapshot and geometric targets', () => {
  it('commits the home launch and keeps its saved origin through attacker defeat', () => {
    const direction = advanceAttack(initial());
    expect(direction.originRegion).toBe(direction.teams.find(team => team.id === direction.selectedTeam)!.homeRegion);
    const action = { ...target(1000), originRegion: 'west' };
    const recap = advanceAttack(action);
    expect(recap.lastResult!.winner).toBe('B');
    expect(recap.originRegion).toBe('west');
    expect(recap.owners.west).toBe('B');
    expect(parseAttackSave(recap)).toEqual(recap);
    expect(advanceAttack(recap).originRegion).toBeNull();
  });
  it('refuses fabricated and stale saved origins before resolution', () => {
    const direction = advanceAttack(initial());
    expect(parseAttackSave(direction)).toEqual(direction);
    const fabricated = { ...direction, originRegion: 'missing' };
    expect(fabricated).not.toEqual(direction);
    expect(parseAttackSave(fabricated)).toBeNull();
    expect(parseAttackSave(target())).toEqual(target());
    const state = { ...target(), originRegion: 'middle' };
    expect(state.owners.middle).toBe('A');
    expect(parseAttackSave(state)).toBeNull();
  });
  it('uses the nearest playable owned anchor with lexical ties, excluding blocked closer anchors', () => {
    const state = createAttack(cornerSetup());
    expect(Array.from({ length: 360 }, (_, angle) => rayTargetFromRegion(state, 'A', angle, 'home')).every(target => target === null)).toBe(true);
    expect(attackOrigin(state, 'A')).toBe('a');
    state.setup.regions.reverse();
    expect(attackOrigin(state, 'A')).toBe('a');
    const direction = advanceAttack(state);
    expect(direction.selectedTeam).toBe('A');
    expect(direction.originRegion).toBe('a');
    expect(rayTarget(direction, 'A', 90)).toBe('east');
    expect(parseAttackSave(direction)).toEqual(direction);
    const stale = { ...direction, originRegion: 'z' };
    expect(stale).not.toEqual(direction);
    expect(parseAttackSave(stale)).toBeNull();
  });
  it('rejects a recap origin still owned by a surviving unrelated club', () => {
    const recap = advanceAttack(target());
    expect(parseAttackSave(recap)).toEqual(recap);
    const damaged = { ...recap, originRegion: 'far' };
    expect(damaged).not.toEqual(recap);
    expect(parseAttackSave(damaged)).toBeNull();
  });
  it('creates an independent snapshot and initial state without modifying setup', () => {
    const source = setup();
    expect(createAttack(source)).toEqual(initial());
    const state = createAttack(source);
    state.teams[0].players[0].rating = 99;
    state.setup.regions[0].anchor[0] = 1;
    expect(source).toEqual(setup());
    expect(state.setup.teams[0].players[0].rating).toBe(80);
  });
  it('hits the first polygon east, crosses owned cells, and rejects off-map rays', () => {
    const state = initial();
    expect(rayTarget(state, 'A', 90)).toBe('middle');
    expect(rayTarget(state, 'A', 270)).toBeNull();
    state.owners.middle = 'A';
    expect(rayTarget(state, 'A', 90)).toBe('east');
    expect(rayTarget(state, 'A', 0)).toBeNull();
    expect(rayTarget(state, 'A', 90.5)).toBeNull();
  });
  it('uses polygon edges instead of label anchors and supports disconnected parts', () => {
    const state = initial();
    state.setup.regions[1].anchor = [15, 1];
    state.setup.regions[1].rings = [[[10, 0], [20, 0], [20, 8], [10, 8]], [[10, 9], [20, 9], [20, 10], [10, 10]]];
    expect(rayTarget(state, 'A', 90)).toBe('middle');
    state.setup.regions[1].rings = [[[10, 0], [20, 0], [20, 4], [10, 4]]];
    expect(rayTarget(state, 'A', 90)).toBeNull();
  });
  it('treats holes as sea and ignores a tangent vertex', () => {
    const state = initial();
    state.setup.regions[0].rings.push([[6, 4], [8, 4], [8, 6], [6, 6]]);
    expect(rayTarget(state, 'A', 90)).toBeNull();
    state.setup.regions[0].rings.pop();
    state.setup.regions[1].rings = [[[10, 5], [15, 0], [20, 0]]];
    expect(rayTarget(state, 'A', 90)).toBeNull();
    state.setup.regions[1].rings = [[[10, 0], [20, 0], [20, 10], [10, 10]]];
    expect(rayTarget(state, 'A', 90)).toBe('middle');
  });
  it('stops at sea gaps and uses an owned anchor when the home is lost', () => {
    const state = initial();
    state.setup.regions[1].rings[0][0][0] = 11;
    state.setup.regions[1].rings[0][3][0] = 11;
    expect(rayTarget(state, 'A', 90)).toBeNull();
    state.owners.west = 'B';
    state.owners.middle = 'A';
    expect(rayTarget(state, 'A', 90)).toBe('east');
    state.owners.middle = 'B';
    expect(rayTarget(state, 'A', 90)).toBeNull();
  });
  it('uses the original best eleven baseline and bounds current strength', () => {
    const state = initial();
    expect(attackStrength(state, 'A')).toBe(70);
    state.teams[0].players[0].rating = 86;
    expect(attackStrength(state, 'A')).toBe(72);
    state.teams[0].players = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: 'Fictional', originTeam: 'B', rating: i === 11 ? 1 : 99 }));
    expect(attackStrength(state, 'A')).toBeCloseTo(95.66666667);
    state.setup.teams[0].overall = 99;
    expect(attackStrength(state, 'A')).toBe(99);
    state.teams[0].players = [];
    expect(attackStrength(state, 'A')).toBe(45);
  });
});

function target(rng = 0, region = 'east'): AttackState {
  const state = initial();
  state.owners.middle = 'A';
  return { ...state, rng, phase: 'target', selectedTeam: 'A', originRegion: 'west', bearing: 90, targetRegion: region, revision: 2 };
}

describe('deterministic actions', () => {
  it('advances each phase once, commits a legal integer bearing, and leaves inputs unchanged', () => {
    let state = initial();
    for (const phase of ['direction', 'target', 'recap', 'team']) {
      const before = clone(state);
      const next = advanceAttack(state);
      expect(next.phase).toBe(phase);
      expect(next.revision).toBe(state.revision + 1);
      expect(state).toEqual(before);
      expect(next).not.toBe(state);
      if (phase === 'target') {
        expect(Number.isInteger(next.bearing)).toBe(true);
        expect(next.targetRegion).toBe(rayTarget(next, next.selectedTeam!, next.bearing!));
        expect(next.targetRegion).not.toBeNull();
      }
      state = next;
    }
    expect(state.selectedTeam).toBeNull();
    expect(state.lastResult).toBeNull();
  });
  it('selects every living owner uniformly without eliminated entries', () => {
    const counts = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 3000; i++) {
      const state = initial();
      state.rng = Math.floor(i * 4294967296 / 3000);
      counts[advanceAttack(state).selectedTeam as keyof typeof counts]++;
    }
    expect(counts.A).toBeGreaterThan(960);
    expect(counts.B).toBeGreaterThan(960);
    expect(counts.C).toBeGreaterThan(960);
    const state = initial();
    state.owners.east = 'A';
    for (let i = 0; i < 50; i++) {
      state.rng = i * 80000000;
      expect(advanceAttack(state).selectedTeam).not.toBe('B');
    }
  });
  it.each([[0, 'A', 'B'], [1000, 'B', 'A']])('seed %s resolves %s beating %s and transfers all loser land', (seed, winner, loser) => {
    const state = target(seed as number);
    const next = advanceAttack(state);
    expect(next.lastResult?.winner).toBe(winner);
    expect(next.lastResult?.loser).toBe(loser);
    expect(Object.values(next.owners)).not.toContain(loser);
    expect(Object.keys(next.owners)).toHaveLength(5);
    expect(next.lastResult?.changedRegions).toEqual(winner === 'A' ? ['east'] : ['west', 'middle']);
    expect(next.lastResult?.capturedPlayers).toHaveLength(1);
    const captured = next.lastResult!.capturedPlayers[0];
    expect(captured.originTeam).toBe(loser);
    expect(captured.rating).toBe(80);
    expect(next.teams.find(t => t.id === loser)!.players.some(p => p.id === captured.id)).toBe(false);
    expect(next.teams.find(t => t.id === winner)!.players.some(p => p.id === captured.id)).toBe(true);
    expect(attackStrength(next, winner as string)).toBeGreaterThan(70);
  });
  it('captures the original best player plus prior captures exactly once', () => {
    const state = target(1000);
    const captured = state.teams[2].players.shift()!;
    captured.rating = 95;
    state.teams[0].players.push(captured);
    const next = advanceAttack(state);
    expect(next.lastResult?.winner).toBe('B');
    const moved = next.lastResult!.capturedPlayers;
    expect(moved).toHaveLength(2);
    expect(moved.map(p => p.originTeam).sort()).toEqual(['A', 'C']);
    expect(moved.find(p => p.originTeam === 'A')!.rating).toBe(80);
    expect(moved.find(p => p.originTeam === 'C')!.rating).toBe(95);
    const all = next.teams.flatMap(t => t.players.map(p => p.id));
    expect(new Set(all).size).toBe(9);
    expect(all).toHaveLength(9);
    expect(next.teams[0].players.every(p => p.originTeam === 'A')).toBe(true);
  });
  it('uses the rating gap, defender home edge, logistic divisor and probability clamps', () => {
    expect(advanceAttack(target()).lastResult!.attackerWinProbability).toBeCloseTo(0.447858, 5);
    const state = target();
    state.setup.teams[0].overall = 99;
    state.setup.teams[1].overall = 45;
    expect(advanceAttack(state).lastResult!.attackerWinProbability).toBe(0.92);
    state.setup.teams[0].overall = 45;
    state.setup.teams[1].overall = 99;
    expect(advanceAttack(state).lastResult!.attackerWinProbability).toBe(0.08);
  });
  it('produces scorelines whose regulation or shootout winner agrees with the match', () => {
    let shootouts = 0;
    let regulation = 0;
    for (let i = 0; i < 100; i++) {
      const result = advanceAttack(target(i * 42000000)).lastResult!;
      expect(result.score).not.toBeNull();
      const score = result.score!;
      const deciding = score.shootout ?? score;
      expect(deciding.attacker > deciding.defender).toBe(result.winner === 'A');
      if (score.shootout) { shootouts++; expect(score.attacker).toBe(score.defender); }
      else { regulation++; expect(score.attacker).not.toBe(score.defender); }
      expect(Number.isInteger(score.attacker)).toBe(true);
      expect(Number.isInteger(score.defender)).toBe(true);
    }
    expect(shootouts).toBeGreaterThan(10);
    expect(regulation).toBeGreaterThan(40);
  });
  it('expands into neutral land and upgrades a seeded tied best player by two with a cap', () => {
    const state = target(0, 'middle');
    state.owners.middle = null;
    const next = advanceAttack(state);
    expect(next.owners.middle).toBe('A');
    expect(next.lastResult).toMatchObject({ kind: 'expansion', winner: 'A', defender: null, changedRegions: ['middle'], capturedPlayers: [], score: null, countryCompleted: false });
    expect(next.lastResult!.upgrade).toMatchObject({ teamId: 'A', before: 80, after: 82, amount: 2 });
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) { state.rng = i * 200000000; ids.add(advanceAttack(state).lastResult!.upgrade!.playerId); }
    expect([...ids].sort()).toEqual(['A0', 'A1']);
    state.teams[0].players[0].rating = 98;
    expect(advanceAttack(state).lastResult!.upgrade).toMatchObject({ before: 98, after: 99 });
  });
  it('crowns the last survivor, claims neutral islands and applies the country upgrade only once', () => {
    const state = target();
    state.owners.far = 'B';
    const next = advanceAttack(state);
    expect(next.phase).toBe('recap');
    expect(next.champion).toBe('A');
    expect(Object.values(next.owners)).toEqual(['A', 'A', 'A', 'A', 'A']);
    expect(next.lastResult!.changedRegions).toEqual(['east', 'spare', 'far']);
    expect(next.lastResult!.countryCompleted).toBe(true);
    expect(next.lastResult!.upgrade).toMatchObject({ teamId: 'A', before: 80, after: 84, amount: 4 });
    const finished = advanceAttack(next);
    expect(finished.phase).toBe('finished');
    expect(finished.revision).toBe(next.revision + 1);
    expect(advanceAttack(finished)).toEqual(finished);
  });
  it('every seeded run finishes within neutral expansions plus elimination matches', () => {
    for (let seed = 0; seed < 80; seed++) {
      let state = initial(seed);
      let resolved = 0;
      for (let action = 0; action < 20 && state.phase !== 'finished'; action++) {
        if (state.phase === 'target') resolved++;
        state = advanceAttack(state);
      }
      expect(state.phase).toBe('finished');
      expect(resolved).toBeLessThanOrEqual(4);
      expect(new Set(Object.values(state.owners))).toEqual(new Set([state.champion]));
    }
  });
});

describe('strict saved snapshots', () => {
  it('round-trips every phase and resumes byte-identically through a complete run', () => {
    let state = initial(31);
    for (let i = 0; i < 20; i++) {
      const restored = parseAttackSave(clone(state));
      expect(restored).toEqual(state);
      expect(restored).not.toBe(state);
      expect(JSON.stringify(advanceAttack(restored!))).toBe(JSON.stringify(advanceAttack(state)));
      if (state.phase === 'finished') break;
      state = advanceAttack(state);
    }
    expect(state.phase).toBe('finished');
  });
  it('keeps an old self-contained data version without consulting a newer dataset', () => {
    const state = initial();
    state.setup.dataVersion = 'archived-fictional-v0';
    expect(parseAttackSave(state)?.setup.dataVersion).toBe('archived-fictional-v0');
  });
  const corruptions: [string, (s: AttackState) => void][] = [
    ['version', s => { s.version = 2 as 1; }],
    ['rules version', s => { s.rulesVersion = 2 as 1; }],
    ['negative seed', s => { s.setup.seed = -1; }],
    ['large rng', s => { s.rng = 4294967296; }],
    ['fractional revision', s => { s.revision = 0.5; }],
    ['huge revision', s => { s.revision = 1e9; }],
    ['nonfinite rating', s => { s.teams[0].players[0].rating = NaN; }],
    ['too high rating', s => { s.teams[0].players[0].rating = 100; }],
    ['downgraded rating', s => { s.teams[0].players[0].rating = 79; }],
    ['zero width', s => { s.setup.bounds.width = 0; }],
    ['outside coordinate', s => { s.setup.regions[0].rings[0][0][0] = -1; }],
    ['anchor in sea', s => { s.setup.regions[0].anchor = [20, 5]; }],
    ['empty polygon', s => { s.setup.regions[0].rings = []; }],
    ['degenerate polygon', s => { s.setup.regions[0].rings = [[[0, 0], [1, 1], [2, 2]]]; }],
    ['duplicate team id', s => { s.setup.teams[1].id = 'A'; }],
    ['duplicate region id', s => { s.setup.regions[1].id = 'west'; }],
    ['duplicate setup player', s => { s.setup.teams[0].players[1].id = 'A0'; }],
    ['duplicate state player', s => { s.teams[1].players.push(clone(s.teams[0].players[0])); }],
    ['missing state player', s => { s.teams[0].players.pop(); }],
    ['invented player', s => { s.teams[0].players[0].id = 'invented'; }],
    ['renamed player', s => { s.teams[0].players[0].name = 'Invented'; }],
    ['changed origin', s => { s.teams[0].players[0].originTeam = 'B'; }],
    ['missing home', s => { s.setup.teams[0].homeRegion = 'missing'; }],
    ['wrong home owner', s => { s.setup.regions[0].initialOwner = 'B'; }],
    ['unknown owner', s => { s.owners.middle = 'D'; }],
    ['missing owner', s => { delete s.owners.middle; }],
    ['extra owner', s => { s.owners.extra = 'A'; }],
    ['changed team identity', s => { s.teams[0].overall = 90; }],
    ['missing team', s => { s.teams.pop(); }],
    ['team phase selection', s => { s.selectedTeam = 'A'; }],
    ['team phase target', s => { s.targetRegion = 'middle'; }],
    ['direction without selection', s => { s.phase = 'direction'; }],
    ['target without bearing', s => { s.phase = 'target'; s.selectedTeam = 'A'; s.targetRegion = 'middle'; }],
    ['recap without result', s => { s.phase = 'recap'; }],
    ['finished without champion', s => { s.phase = 'finished'; }],
    ['premature champion', s => { s.champion = 'A'; }],
    ['unbounded teams', s => { s.setup.teams = Array(1000).fill(s.setup.teams[0]); }],
    ['unbounded regions', s => { s.setup.regions = Array(1000).fill(s.setup.regions[0]); }],
    ['unbounded polygon', s => { s.setup.regions[0].rings[0] = Array(10000).fill([0, 0]); }],
    ['extra property', s => { Object.assign(s, { rankedScore: 99 }); }],
  ];
  it.each(corruptions)('rejects %s with a changed negative control', (_, corrupt) => {
    const state = initial();
    expect(parseAttackSave(state)).not.toBeNull();
    const before = structuredClone(state);
    corrupt(state);
    expect(state).not.toEqual(before);
    expect(parseAttackSave(state)).toBeNull();
  });
  it('rejects impossible committed targets, dead attackers and inconsistent results', () => {
    const state = advanceAttack(advanceAttack(initial()));
    expect(parseAttackSave(state)).not.toBeNull();
    const badTarget = clone(state);
    badTarget.bearing = 270;
    expect(parseAttackSave(badTarget)).toBeNull();
    const dead = clone(state);
    dead.owners.west = 'B';
    expect(parseAttackSave(dead)).toBeNull();
    const recap = advanceAttack(state);
    expect(parseAttackSave(recap)).not.toBeNull();
    const badResult = clone(recap);
    badResult.lastResult!.changedRegions = [];
    expect(parseAttackSave(badResult)).toBeNull();
    const badUpgrade = clone(recap);
    badUpgrade.lastResult!.upgrade!.after = 1;
    expect(parseAttackSave(badUpgrade)).toBeNull();
  });
  it('rejects non-object input and disconnected living homes at creation', () => {
    for (const value of [null, undefined, 'text', 1, [], {}]) expect(parseAttackSave(value)).toBeNull();
    const source = setup();
    source.regions[0].rings = [[[0, 0], [9, 0], [9, 10], [0, 10]]];
    expect(() => createAttack(source)).toThrow(/legal land direction/);
    source.teams[0].homeRegion = 'missing';
    expect(() => createAttack(source)).toThrow();
  });
  it('rejects a changed saved map that strands every living club', () => {
    const { valid, damaged } = disconnectedSaveFixture();
    expect(parseAttackSave(valid)).toEqual(valid);
    expect(damaged).not.toEqual(valid);
    expect(attackOrigin(damaged, 'A')).toBeNull();
    expect(attackOrigin(damaged, 'B')).toBeNull();
    expect(parseAttackSave(damaged)).toBeNull();
  });
  it('rejects unknown result regions and invented capture ratings', () => {
    const recap = advanceAttack(target());
    expect(parseAttackSave(recap)).not.toBeNull();
    const unknownTarget = clone(recap);
    unknownTarget.targetRegion = 'missing';
    unknownTarget.lastResult!.targetRegion = 'missing';
    expect(parseAttackSave(unknownTarget)).toBeNull();
    const fakeCapture = clone(recap);
    fakeCapture.lastResult!.capturedPlayers[0].rating = 1;
    expect(parseAttackSave(fakeCapture)).toBeNull();
  });
  it.each([0, 1000])('rejects a resolved target belonging to an unrelated survivor for seed %s', seed => {
    const recap = advanceAttack(target(seed));
    expect(parseAttackSave(recap)).not.toBeNull();
    const unrelatedTarget = clone(recap);
    unrelatedTarget.targetRegion = 'far';
    unrelatedTarget.lastResult!.targetRegion = 'far';
    expect(unrelatedTarget).not.toEqual(recap);
    expect(unrelatedTarget.owners.far).toBe('C');
    expect(parseAttackSave(unrelatedTarget)).toBeNull();
  });
  it('rejects an attacker victory target absent from the changed regions', () => {
    const recap = advanceAttack(target());
    expect(parseAttackSave(recap)).not.toBeNull();
    const unchangedTarget = clone(recap);
    unchangedTarget.targetRegion = 'west';
    unchangedTarget.lastResult!.targetRegion = 'west';
    expect(unchangedTarget).not.toEqual(recap);
    expect(unchangedTarget.owners.west).toBe('A');
    expect(unchangedTarget.lastResult!.changedRegions).toEqual(['east']);
    expect(parseAttackSave(unchangedTarget)).toBeNull();
  });
});

describe('production mutation controls', () => {
  type Engine = typeof import('./conquestAttack');
  const controls: [string, string, string, (engine: Engine) => void][] = [
    ['origin committed at team selection', 'next.originRegion = attackOrigin(next, next.selectedTeam);', 'next.originRegion = null;', engine => {
      expect(engine.advanceAttack(initial()).originRegion).toBe('west');
    }],
    ['nearest playable origin', 'return distance(a) - distance(b)', 'return distance(b) - distance(a)', engine => {
      const source = cornerSetup(); source.regions[1].anchor[1] = 24;
      expect(engine.attackOrigin(engine.createAttack(source), 'A')).toBe('z');
    }],
    ['lexical origin tie', 'a.id < b.id ? -1 : a.id > b.id ? 1 : 0', 'a.id < b.id ? 1 : a.id > b.id ? -1 : 0', engine => {
      expect(engine.attackOrigin(engine.createAttack(cornerSetup()), 'A')).toBe('a');
    }],
    ['origin retained on defeat', 'const next = copy(state);', 'const next = copy(state); next.originRegion = null;', engine => {
      expect(engine.advanceAttack(target(1000)).originRegion).toBe('west');
    }],
    ['origin cleared after recap', 'next.originRegion = null;', 'next.originRegion = state.originRegion;', engine => {
      expect(engine.advanceAttack(engine.advanceAttack(target())).originRegion).toBeNull();
    }],
    ['stale origin rejected', 'if (state.originRegion !== attackOrigin(state, state.selectedTeam)) return null;', 'if (false) return null;', engine => {
      const state = target(); state.originRegion = 'middle';
      expect(engine.parseAttackSave(state)).toBeNull();
    }],
    ['resolved origin ownership', '|| state.owners[state.originRegion] !== state.lastResult.winner', '|| false', engine => {
      const state = engine.advanceAttack(target()); state.originRegion = 'far';
      expect(engine.parseAttackSave(state)).toBeNull();
    }],
    ['snapshot isolation', 'setup: copy(setup)', 'setup', engine => {
      const source = setup();
      engine.createAttack(source).setup.regions[0].anchor[0] = 1;
      expect(source.regions[0].anchor[0]).toBe(5);
    }],
    ['owned land crossing', 'state.owners[interval.id] !== teamId', 'true', engine => {
      const state = initial(); state.owners.middle = 'A';
      expect(engine.rayTarget(state, 'A', 90)).toBe('east');
    }],
    ['sea gap', 'if (interval.start > reach + EPSILON) return null;', 'if (false) return null;', engine => {
      const state = initial(); state.setup.regions[1].rings = [[[11, 0], [20, 0], [20, 10], [11, 10]]];
      expect(engine.rayTarget(state, 'A', 90)).toBeNull();
    }],
    ['polygon holes', 'for (const ring of rings)', 'for (const ring of rings.slice(0, 1))', engine => {
      const state = initial(); state.setup.regions[0].rings.push([[6, 4], [8, 4], [8, 6], [6, 6]]);
      expect(engine.rayTarget(state, 'A', 90)).toBeNull();
    }],
    ['strength baseline', 'bestEleven(original.players)', 'bestEleven(current.players)', engine => {
      const state = initial(); state.teams[0].players[0].rating = 86;
      expect(engine.attackStrength(state, 'A')).toBe(72);
    }],
    ['revision', 'next.revision++;', 'next.revision += 2;', engine => {
      expect(engine.advanceAttack(initial()).revision).toBe(1);
    }],
    ['uniform living wheel', 'return state.teams.filter(team => owners.has(team.id));', 'return state.teams;', engine => {
      const state = initial(); state.owners.east = 'A'; state.rng = 1000;
      expect(engine.advanceAttack(state).selectedTeam).not.toBe('B');
    }],
    ['legal bearing wheel', 'if (targetRegion) options.push', 'if (true) options.push', engine => {
      const state = initial(); state.phase = 'direction'; state.selectedTeam = 'A'; state.originRegion = 'west'; state.rng = 1000; state.revision = 1;
      const next = engine.advanceAttack(state);
      expect(next.targetRegion).not.toBeNull();
    }],
    ['all loser regions', 'if (next.owners[region.id] === loser.id)', 'if (region.id === targetRegion)', engine => {
      expect(Object.values(engine.advanceAttack(target(1000)).owners)).not.toContain('A');
    }],
    ['original capture', 'player.originTeam === loser.id', 'true', engine => {
      const state = target(1000); const prior = state.teams[2].players.shift()!; prior.rating = 95; state.teams[0].players.push(prior);
      expect(engine.advanceAttack(state).lastResult!.capturedPlayers.some(player => player.originTeam === 'A')).toBe(true);
    }],
    ['prior captures carried', 'player.id === best.id || player.originTeam !== loser.id', 'player.id === best.id', engine => {
      const state = target(1000); state.teams[0].players.push(state.teams[2].players.shift()!);
      expect(engine.advanceAttack(state).lastResult!.capturedPlayers).toHaveLength(2);
    }],
    ['moved identities removed', 'loser.players.filter(player => !movedIds.has(player.id))', 'loser.players', engine => {
      const players = engine.advanceAttack(target()).teams.flatMap(team => team.players);
      expect(players).toHaveLength(9);
    }],
    ['expansion upgrade', 'upgrade(next, attacker, 2)', 'upgrade(next, attacker, 4)', engine => {
      const state = target(0, 'middle'); state.owners.middle = null;
      expect(engine.advanceAttack(state).lastResult!.upgrade!.after).toBe(82);
    }],
    ['country upgrade', 'upgrade(next, result.winner, 4)', 'upgrade(next, result.winner, 2)', engine => {
      const state = target(); state.owners.far = 'B';
      expect(engine.advanceAttack(state).lastResult!.upgrade!.after).toBe(84);
    }],
    ['home advantage', 'attackStrength(next, defender) - 2', 'attackStrength(next, defender)', engine => {
      expect(engine.advanceAttack(target()).lastResult!.attackerWinProbability).toBeCloseTo(0.447858, 5);
    }],
    ['score winner', 'attacker: attackerWon ? high : low', 'attacker: attackerWon ? low : high', engine => {
      const result = engine.advanceAttack(target()).lastResult!;
      const score = result.score!.shootout ?? result.score!;
      expect(score.attacker > score.defender).toBe(result.winner === 'A');
    }],
    ['strict parser', 'export function parseAttackSave(value: unknown): AttackState | null {', 'export function parseAttackSave(value: unknown): AttackState | null { return value as AttackState;', engine => {
      const state = initial(); state.teams[0].players[0].id = 'invented';
      expect(engine.parseAttackSave(state)).toBeNull();
    }],
    ['playable living saves', 'if (state.champion === null && alive.some(team => !attackOrigin(state, team.id))) return null;', 'if (false) return null;', engine => {
      const { valid, damaged } = disconnectedSaveFixture();
      expect(damaged).not.toEqual(valid);
      expect(engine.parseAttackSave(damaged)).toBeNull();
    }],
  ];
  it.each(controls)('%s control changes production code and fails its behavioral check', (_, from, to, check) => {
    check(realEngine);
    const path = resolve('src/lib/conquestAttack.ts');
    const source = readFileSync(path, 'utf8');
    expect(source.split(from).length - 1).toBe(1);
    const mutated = source.replace(from, to);
    expect(mutated).not.toBe(source);
    const bundle = transpileModule(mutated, { compilerOptions: { module: ModuleKind.CommonJS } });
    const module = { exports: {} };
    new Function('module', 'exports', 'require', bundle.outputText)(module, module.exports, createRequire(path));
    expect(() => check(module.exports as Engine)).toThrow();
  });
});
