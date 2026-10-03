import assert from 'node:assert/strict';
import * as C from '@/lib/nhlFrontOffice';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import { leagueNames } from '@/lib/foNames';
import { deadMoneyFor, signRefusal, tradeRefusal } from '@/lib/frontOfficeCuts';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
let B: typeof C;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function random(seed: number) { let calls = 0; const draw = () => { calls++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; return { draw, calls: () => calls, state: () => seed }; }
function canonical(value: unknown) {
  const ids = new Map<string, string>();
  const collect = (v: any) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { for (const k of ['id', 'playerId']) if (typeof v[k] === 'string' && !ids.has(v[k])) ids.set(v[k], '#' + ids.size); Object.values(v).forEach(collect); } };
  collect(value);
  const replace = (v: any): any => typeof v === 'string' ? ids.get(v) ?? v : Array.isArray(v) ? v.map(replace) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.split('|').map(p => ids.get(p) ?? p).join('|'), replace(x)])) : v;
  return replace(value);
}
function pair(input: C.NhlLeague, seed: number, owner?: string) {
  const before = clone(input), candidate = clone(input), a = random(seed), b = random(seed);
  const beforeNotes = B.nhlOffseason(before, a.draw), candidateNotes = C.nhlOffseason(candidate, b.draw, owner);
  assert.deepEqual([b.calls(), b.state()], [a.calls(), a.state()], 'One paired offseason RNG calls/state');
  assert.deepEqual(candidateNotes, beforeNotes, 'Existing offseason notes unchanged');
  return { before, candidate, calls: a.calls() };
}
function synthetic() {
  const league = B.initNhlLeague(random(9691).draw, NHL_OPENING_RATINGS), owner = 'TOR';
  const fixturePlayer = (club: string, suffix: string, pos: C.NhlPos, ovr: number, age = 26): C.NhlGmPlayer => ({ id: 'fixture969-' + club + '-' + suffix, name: 'Simulation fixture ' + club + ' ' + suffix, pos, age, ovr, pot: ovr, salary: 9.6, years: 4, out: 0 });
  const expected: Record<string, string[]> = {};
  for (const [club, count] of [['NYR', 18], ['BOS', 17]] as const) {
    const t = league.teams[club];
    const forwards = Array.from({ length: 6 }, (_, i) => fixturePlayer(club, 'chosen-forward-' + i, i < 2 ? 'C' : 'W', 65));
    const defense = Array.from({ length: 4 }, (_, i) => fixturePlayer(club, 'chosen-defense-' + i, 'D', 65));
    const goalie = fixturePlayer(club, 'chosen-goalie', 'G', 65);
    const spare = [fixturePlayer(club, 'Alpha-old', 'W', 96, 28), fixturePlayer(club, 'Zeta-old', 'D', 96, 28), fixturePlayer(club, 'Alpha-young', 'W', 96, 27), fixturePlayer(club, 'higher-goalie', 'G', 97), fixturePlayer(club, 'higher-defense', 'D', 97), fixturePlayer(club, 'higher-forward', 'W', 97), fixturePlayer(club, 'higher-center', 'C', 97)].slice(0, count - 11);
    t.players = [...forwards, ...defense, goalie, ...spare];
    assert.equal(B.nhlSetContributors(t, { forwards: forwards.map(p => p.id), defense: defense.map(p => p.id), goalie: goalie.id }), true, 'Actual preference setter');
    t.deadCap = [{ playerId: 'fixture969-old-' + club, name: 'Simulation old fee ' + club, amount: 4, seasonsLeft: 2 }];
    t.releasedThisSeason = ['fixture969-old-' + club];
    expected[club] = spare.slice(0, count - 15).map(p => p.id);
  }
  league.freeAgents = Array.from({ length: 30 }, (_, i) => ({ id: 'fixture969-market-' + i, name: 'Simulation market fixture ' + i, pos: 'W' as const, age: 27, ovr: 64, pot: 64, salary: 1.4, years: 1, out: 0 }));
  return { league, owner, expected };
}
function oracle(post: C.NhlLeague, expected: Record<string, string[]>) {
  const reference = clone(post);
  for (const t of Object.values(reference.teams)) for (const id of expected[t.abbr] ?? []) assert.equal(B.nhlRelease(t, reference.freeAgents, id, reference.ratingModelVersion), true, 'Existing real release oracle');
  reference.freeAgents = reference.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  return reference;
}
function actualHumanPreSummer() {
  const opening = B.initNhlLeague(random(1).draw, NHL_OPENING_RATINGS), [sender, receiver] = Object.keys(opening.teams); let league: C.NhlLeague | undefined;
  outer: for (const a of opening.teams[sender].players) for (const b of opening.teams[receiver].players) {
    const c = clone(opening);
    if (B.nhlTrade(c.teams[sender], c.teams[receiver], a.id, b.id, true, c.cap) === 'accepted' && B.nhlExecuteTalksTrade(c.teams[sender], c.teams[receiver], b.id, a.id, true, c.cap) === 'done') { league = c; break outer; }
  }
  assert.ok(league, 'Actual accepted trade pair'); assert.equal(league.teams[receiver].picks.length, 4);
  const rng = random(101); let pool = B.nhlDraftClass(rng.draw, 24, leagueNames(league));
  for (let i = 0; i < 4; i++) { const p = pool.shift()!; assert.ok(p); assert.equal(B.nhlConsumeDraftPick(league.teams[receiver]), true); league.teams[receiver].players.push(B.nhlProspectToPlayer(p, rng.draw, league.ratingModelVersion)); if (i < 2) pool = B.nhlAiDraftPicks(league, pool, B.nhlFoStandings(league).map(t => t.abbr).reverse().filter(a => a !== receiver), rng.draw).remaining; }
  return { league, owner: receiver, seed: rng.state() };
}
function actualScoutPreSummer() {
  const rng = random(17), league = B.initNhlLeague(rng.draw, NHL_OPENING_RATINGS), owner = 'TOR';
  while (true) { B.simNhlRound(league, owner, rng.draw); B.nhlAiMoves(league, owner, rng.draw); if (league.round === B.NHL_FO_ROUNDS) break; league.round++; }
  const post = B.runNhlFoPlayoffs(league, rng.draw); league.champions.push({ season: league.season, team: post.champion });
  assert.equal(league.teams.NYR.players.length, 14);
  let pool = B.nhlDraftClass(rng.draw, 24, leagueNames(league));
  for (let i = 0; i < 2; i++) { const p = pool[0]; assert.equal(B.nhlConsumeDraftPick(league.teams[owner]), true); league.teams[owner].players.push(B.nhlProspectToPlayer(p, rng.draw, league.ratingModelVersion)); pool = B.nhlAiDraftPicks(league, pool.slice(1), B.nhlFoStandings(league).map(t => t.abbr).reverse().filter(a => a !== owner), rng.draw).remaining; }
  assert.equal(league.teams.NYR.players.length, 16); return { league, owner, seed: rng.state() };
}
const cases: [string, () => unknown][] = [
 ['keeps omitted invalid and inherited owners on the exact two-argument outcome and tape', () => {
   const fixture = synthetic();
   for (const owner of [undefined, '', 'missing', 'toString', 'constructor', '__proto__', 123 as unknown as string]) { const r = pair(fixture.league, 9692, owner); assert.deepEqual(canonical(r.candidate), canonical(r.before)); }
 }],
 ['holds the ordinary owner-enabled offseason when nobody needs a cut', () => {
   const r = pair(B.initNhlLeague(random(71).draw, NHL_OPENING_RATINGS), 9693, 'TOR'); assert.ok(Object.values(r.before.teams).every(t => t.players.length <= B.NHL_ROSTER_MAX)); assert.deepEqual(canonical(r.candidate), canonical(r.before));
 }],
 ['repairs the retained real seed17 NYR16 opening through one actual surplus waiver', () => {
   const f = actualScoutPreSummer(), r = pair(f.league, f.seed, f.owner), before = r.before.teams.NYR, after = r.candidate.teams.NYR;
   assert.equal(before.players.length, 16); assert.equal(after.players.length, 15); assert.ok(Object.values(r.candidate.teams).filter(t => t.abbr !== f.owner).every(t => t.players.length <= C.NHL_ROSTER_MAX));
   assert.deepEqual(C.nhlContributors(after), B.nhlContributors(before)); assert.equal(C.nhlStrength(after), B.nhlStrength(before));
   const waived = before.players.filter(p => !after.players.some(q => q.id === p.id)); assert.equal(waived.length, 1); assert.equal(waived[0].name, 'Matthew Robertson'); assert.equal(waived[0].pos, 'D'); assert.ok(after.releasedThisSeason!.includes(waived[0].id));
 }],
 ['cuts two fictional CPU overages to15 and protects lower-rated valid preferences', () => {
   const f = synthetic(), r = pair(f.league, 9694, f.owner), expected = oracle(r.before, f.expected);
   assert.deepEqual(canonical(r.candidate), canonical(expected));
   for (const club of Object.keys(f.expected)) { const before = r.before.teams[club], after = r.candidate.teams[club]; assert.equal(after.players.length, 15); assert.deepEqual(C.nhlContributors(after), B.nhlContributors(before)); assert.equal(C.nhlStrength(after), B.nhlStrength(before)); assert.deepEqual(after.releasedThisSeason, f.expected[club]); }
 }],
 ['holds actual fees quotes IDs no-return and30-place pool without double-aging new waivers', () => {
   const f = synthetic(), r = pair(f.league, 9694, f.owner); assert.equal(r.candidate.freeAgents.length, 30);
   assert.deepEqual(canonical(r.candidate), canonical(oracle(r.before, f.expected)));
   for (const [club, ids] of Object.entries(f.expected)) {
     const t = r.candidate.teams[club]; assert.deepEqual(t.deadCap!.find(d => d.playerId === 'fixture969-old-' + club), { playerId: 'fixture969-old-' + club, name: 'Simulation old fee ' + club, amount: 2, seasonsLeft: 1 });
     for (const id of ids) { const original = r.before.teams[club].players.find(p => p.id === id)!, fa = r.candidate.freeAgents.find(p => p.id === id)!; assert.ok(fa); assert.equal(fa.age, original.age); assert.equal(fa.years, 1); assert.equal(fa.salary, B.nhlSalaryFor(original.ovr, r.before.ratingModelVersion));
       assert.deepEqual(t.deadCap!.find(d => d.playerId === id), { playerId: id, name: original.name, amount: deadMoneyFor(original).now, seasonsLeft: original.years > 1 ? 2 : 1 });
       assert.ok(signRefusal(t, id)); assert.ok(tradeRefusal(t, id)); const held = JSON.stringify(r.candidate); assert.equal(C.nhlSign(t, r.candidate.freeAgents, id, r.candidate.cap, r.candidate.ratingModelVersion), false); assert.equal(JSON.stringify(r.candidate), held);
       assert.equal(Object.values(r.candidate.teams).flatMap(x => x.players).filter(p => p.id === id).length, 0); assert.equal(r.candidate.freeAgents.filter(p => p.id === id).length, 1);
     }
   }
 }],
 ['keeps the actual trade-and-four-selection human17 exact', () => {
   const f = actualHumanPreSummer(), r = pair(f.league, f.seed, f.owner); assert.equal(r.before.teams[f.owner].players.length, 17); assert.deepEqual(r.candidate.teams[f.owner], r.before.teams[f.owner]); assert.equal(r.candidate.teams[f.owner].players.length, 17); assert.ok(Object.values(r.candidate.teams).filter(t => t.abbr !== f.owner).every(t => t.players.length <= 15));
 }],
 ['rolls CPU charges through the next actual offseason and preserves saved ownership', () => {
   const f = synthetic(), first = pair(f.league, 9694, f.owner).candidate, r = pair(first, 9695, f.owner);
   for (const [club, ids] of Object.entries(f.expected)) { const before = first.teams[club], after = r.candidate.teams[club]; assert.ok(!after.deadCap!.some(d => d.playerId === 'fixture969-old-' + club)); for (const id of ids) { const old = before.deadCap!.find(d => d.playerId === id); assert.ok(old, 'First offseason adds actual fresh waiver charge'); const charge = after.deadCap!.find(d => d.playerId === id); assert.ok(charge, 'Following offseason keeps the actual remaining charge'); assert.equal(charge.amount, Math.round(old.amount / 2 * 10) / 10); assert.ok(!after.releasedThisSeason!.includes(id)); } }
   const saved = { league: r.candidate, myTeam: f.owner, phase: 'hub', titles: 0, seasonsPlayed: 2, draftClass: null, picksLeft: 0 }; const raw = JSON.stringify(saved), restored = JSON.parse(raw); assert.equal(isFrontOfficeSave(restored, 'NHL', 20), true); assert.equal(C.ensureNhlLeagueIds(restored.league), 0); assert.equal(JSON.stringify(restored), raw);
   const ids = [...Object.values(restored.league.teams).flatMap((t: any) => t.players.map((p: any) => p.id)), ...restored.league.freeAgents.map((p: any) => p.id)]; assert.equal(new Set(ids).size, ids.length);
 }],
 ['preserves the existing expiring-copy age path in both arms', () => {
   const league = B.initNhlLeague(random(9698).draw, NHL_OPENING_RATINGS);
   for (const t of Object.values(league.teams)) {
     t.players = t.players.map((p, i) => ({ id: 'fixture969-age-' + t.abbr + '-' + i, name: 'Simulation age fixture ' + t.abbr + ' ' + i, pos: p.pos, age: 26, ovr: 64, pot: 64, salary: 1.4, years: 4, out: 0 }));
     delete t.contributors; t.deadCap = []; t.releasedThisSeason = [];
   }
   const expiring = league.teams.NYR.players[0]; expiring.ovr = 79; expiring.pot = 79; expiring.years = 1;
   league.freeAgents = Array.from({ length: 30 }, (_, i) => ({ id: 'fixture969-age-market-' + i, name: 'Simulation old market ' + i, pos: 'W' as const, age: 26, ovr: 64, pot: 64, salary: 1.4, years: 1, out: 0 }));
   const r = pair(league, 7, 'TOR'); assert.deepEqual(canonical(r.candidate), canonical(r.before));
   const old = r.before.freeAgents.find(p => p.id === expiring.id)!, after = r.candidate.freeAgents.find(p => p.id === expiring.id)!;
   assert.ok(old); assert.ok(after); assert.equal(old.age, 28, 'Existing roster age step plus copied FA age step'); assert.equal(after.age, 28, 'Existing behavior remains separate and unchanged'); assert.equal(after.years, 1);
 }],
];
export function run(reference: typeof C) {
  B = reference;
  const rows: any[] = []; for (const [title, body] of cases) { try { body(); rows.push({ title, status: 'PASS' }); } catch (error) { rows.push({ title, status: 'FAIL', error: { name: (error as Error).name, message: (error as Error).message, stack: (error as Error).stack } }); } }
  return { scaffold: true, total: cases.length, passed: rows.filter(r => r.status === 'PASS').length, failed: rows.filter(r => r.status === 'FAIL').length, rows, limits: 'Eight engine outcomes only. The separate actual Board owner-forwarding outcome and copied negative controls are required for whole969 acceptance. Directed policy fixtures are labelled fictional; scout and human17 use actual unchanged constructor/trades/draft APIs.' };
}
