import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import * as E from '@/lib/nhlFrontOffice';
import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';
import { NHL_OPENING_RATINGS, NHL_OPENING_RATING_VERSION, NHL_OPENING_RATING_WINDOW } from '@/data/nhlOpeningRatings';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import { leagueNames } from '@/lib/foNames';

const root = process.cwd(), norm = (s: string) => s.replace(/\r\n/g, '\n');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const players = (lg: E.NhlLeague) => [...Object.values(lg.teams).flatMap(t => t.players), ...lg.freeAgents];
const rngFor = (seed: number) => {
  let state = seed >>> 0, calls = 0;
  const draw = () => { calls++; state += 0x6D2B79F5; let n = Math.imul(state ^ state >>> 15, 1 | state); n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  return { draw, calls: () => calls, state: () => state };
};
function canonical(value: unknown) {
  const ids = new Map<string, string>();
  const collect = (v: any) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { for (const key of ['id', 'playerId']) if (typeof v[key] === 'string' && !ids.has(v[key])) ids.set(v[key], '#' + ids.size); Object.values(v).forEach(collect); } };
  collect(value);
  const replace = (v: any): any => typeof v === 'string' ? ids.get(v) ?? v : Array.isArray(v) ? v.map(replace) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, item]) => [k.split('|').map(part => ids.get(part) ?? part).join('|'), replace(item)])) : v;
  return replace(value);
}
function build(options: object) {
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), '-e', "process.stdout.write(JSON.stringify(require('esbuild').buildSync(JSON.parse(process.argv[1]))))", JSON.stringify(options)], { cwd: root, encoding: 'utf8', timeout: 15000 });
  if (run.status !== 0 || run.error || run.signal) throw new Error('Offline NHL baseline compilation failed: ' + run.stderr);
  return JSON.parse(run.stdout);
}
let folder: string, old: typeof E;
const originals: [string, Buffer][] = [];
beforeAll(() => {
  folder = mkdtempSync(path.join(os.tmpdir(), 'dukb-nhl898-baseline-'));
  for (const file of ['src/lib/nhlFrontOffice.ts', 'src/data/nhlFoPlayers.ts']) {
    const shown = spawnSync('git', ['show', '6b7596d2:' + file], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    if (shown.status !== 0) throw new Error('Cannot read physical pre-898 NHL baseline: ' + shown.stderr.toString());
    const target = path.join(folder, path.basename(file));
    writeFileSync(target, norm(shown.stdout.toString()).replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3')); originals.push([target, readFileSync(target)]);
  }
  const output = path.join(folder, 'baseline.cjs');
  const result = build({ entryPoints: [path.join(folder, 'nhlFrontOffice.ts')], outfile: output, bundle: true, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent', alias: { '@/data/nhlFoPlayers': path.join(folder, 'nhlFoPlayers.ts'), '@': path.join(root, 'src') } });
  expect(Object.keys(result.metafile.inputs).some(f => /supabase|fetchPlayers|useAuth/.test(f))).toBe(false);
  old = createRequire(import.meta.url)(output);
});
afterAll(() => {
  for (const [file, bytes] of originals) { const currentBytes = readFileSync(file); expect(currentBytes).toEqual(bytes); }
  if (folder) { const resolved = path.resolve(folder); expect(path.dirname(resolved)).toBe(path.resolve(os.tmpdir())); expect(path.basename(resolved).startsWith('dukb-nhl898-baseline-')).toBe(true); rmSync(resolved, { recursive: true, force: true }); }
});
const opening = (seed = 898) => E.initNhlLeague(rngFor(seed).draw, NHL_OPENING_RATINGS);
const flat = (ovr: number) => Math.round((0.7 + 1.3199808744620938 * Math.max(0, Math.round(Math.max(0.7, (ovr - 70) * 0.4) * 10) / 10 - 0.7)) * 10) / 10;
const saved = (lg: E.NhlLeague, phase = 'hub', extra = {}) => ({ league: lg, myTeam: 'TOR', phase, titles: 0, seasonsPlayed: lg.season - 2026, draftClass: null, picksLeft: 0, ...extra });
function resume(lg: E.NhlLeague, phase = 'hub', extra = {}) {
  const raw = JSON.stringify(saved(lg, phase, extra)), state = JSON.parse(raw);
  expect(isFrontOfficeSave(state, 'NHL', 20)).toBe(true); expect(JSON.stringify(state)).toBe(raw);
  expect(E.ensureNhlLeagueIds(state.league, ...(state.draftClass ? [state.draftClass] : []))).toBe(0); expect(JSON.stringify(state)).toBe(raw);
  return state;
}
const prospect = (id: string, grade: number, trueOvr: number): E.NhlProspect => ({ id, name: 'Simulated prospect ' + id, pos: 'W', age: 19, grade, trueOvr });
function world(payroll: number, known = true): E.NhlLeague {
  return { season: 2026, cap: 104, round: 1, champions: [], freeAgents: [], ...(known ? { ratingModelVersion: NHL_OPENING_RATING_VERSION, draftAffordabilityVersion: 'nhl-flat-nextcap-ai-v1' } : {}), teams: { SIM: { abbr: 'SIM', wins: 0, losses: 0, otLosses: 0, picks: [1, 2], players: [{ id: 'sim-retained', name: 'Simulated retained veteran', pos: 'W', age: 27, ovr: 85, pot: 85, salary: payroll, years: 2, out: 0 }] } } };
}
function oldDraft(api: typeof E, lg: E.NhlLeague, remaining: E.NhlProspect[], order: string[], rng: () => number) {
  const takes = remaining.slice(0, 5);
  for (const [i, pr] of takes.entries()) lg.teams[order[i % order.length]].players.push(api.nhlProspectToPlayer(pr, rng));
  return remaining.filter(p => !takes.includes(p));
}
function play(api: typeof E, lg: E.NhlLeague, rng: () => number) {
  for (let round = 1; round <= 20; round++) { lg.round = round; api.simNhlRound(lg, 'TOR', rng); api.nhlAiMoves(lg, 'TOR', rng); }
  const post = api.runNhlFoPlayoffs(lg, rng); lg.champions.push({ season: lg.season, team: post.champion }); return post;
}

describe('NHL opening rating integration', () => {
  it('preserves physical pre898 default two-season outcomes and every RNG draw', () => {
    const a = rngFor(898), b = rngFor(898), previous = old.initNhlLeague(a.draw), current = E.initNhlLeague(b.draw);
    expect(canonical(current)).toEqual(canonical(previous));
    for (let year = 0; year < 2; year++) {
      expect(canonical(play(E, current, b.draw))).toEqual(canonical(play(old, previous, a.draw)));
      E.nhlOffseason(current, b.draw); old.nhlOffseason(previous, a.draw);
      expect(canonical(current)).toEqual(canonical(previous)); expect([b.calls(), b.state()]).toEqual([a.calls(), a.state()]);
    }
  });
  it('preserves actual old saves and unknown-version prices without rerating', () => {
    const a = rngFor(1898), b = rngFor(1898), previous = old.initNhlLeague(a.draw), current = clone(previous); E.initNhlLeague(b.draw);
    for (const lg of [previous, current]) { delete lg.schedule; lg.teams.TOR.players[0].ovr = 61; lg.teams.TOR.players[0].pot = 66; lg.teams.TOR.players[0].salary = 16.5; }
    const raw = JSON.stringify(current); expect(E.ensureNhlLeagueIds(current)).toBe(0); expect(JSON.stringify(current)).toBe(raw);
    expect(E.simNhlRound(current, 'TOR', b.draw)).toEqual(old.simNhlRound(previous, 'TOR', a.draw));
    E.nhlOffseason(current, b.draw); old.nhlOffseason(previous, a.draw); expect(canonical(current)).toEqual(canonical(previous));
    expect(players(current).every(p => !p.openingRatingEvidence)).toBe(true); expect(resume(current).league.ratingModelVersion).toBeUndefined();
    for (let ovr = 60; ovr <= 99; ovr++) expect(E.nhlSalaryFor(ovr, 'future-unreviewed')).toBe(old.nhlSalaryFor(ovr));
  });
  it('applies all416 opening tuples and retains32 exact original club budgets', () => {
    const lg = opening(), previous = old.initNhlLeague(rngFor(898).draw); let count = 0, changed = 0;
    for (const [abbr, seeds] of Object.entries(NHL_FO_ROSTERS)) seeds.forEach((s, i) => {
      const row = NHL_OPENING_RATINGS[abbr][`${s.name}|${s.pos}`], p = lg.teams[abbr].players[i];
      expect([p.name, p.pos, p.ovr, p.salary]).toEqual([s.name, s.pos, row.ovr, row.salary]); count++; if (p.ovr !== s.ovr) changed++;
    });
    for (const [abbr, t] of Object.entries(lg.teams)) expect(E.nhlCapUsed(t)).toBe(old.nhlCapUsed(previous.teams[abbr]));
    expect(count).toBe(416); expect(changed).toBeGreaterThan(300); expect(Object.keys(lg.teams)).toHaveLength(32);
    expect(E.nhlCapUsed(lg.teams.COL)).toBe(105.2); expect(lg.cap).toBe(104);
  });
  it('holds ages terms order schedule RNG and developmental headroom during cutover', () => {
    const a = rngFor(2898), b = rngFor(2898), previous = old.initNhlLeague(a.draw), lg = E.initNhlLeague(b.draw, NHL_OPENING_RATINGS); let young = 0;
    expect([b.calls(), b.state()]).toEqual([a.calls(), a.state()]); expect(lg.schedule).toEqual(previous.schedule);
    for (const [abbr, t] of Object.entries(lg.teams)) t.players.forEach((p, i) => {
      const was = previous.teams[abbr].players[i], rating = NHL_OPENING_RATINGS[abbr][`${p.name}|${p.pos}`];
      expect([p.name, p.pos, p.age, p.years, p.out]).toEqual([was.name, was.pos, was.age, was.years, was.out]);
      expect(p.pot).toBe(Math.min(99, rating.ovr + Math.max(0, was.pot - was.ovr))); if (was.pot > was.ovr) young++;
    });
    expect(young).toBeGreaterThan(50);
    expect(canonical(lg.freeAgents.map(p => ({ ...p, salary: 0 })))).toEqual(canonical(previous.freeAgents.map(p => ({ ...p, salary: 0 }))));
    for (const p of lg.freeAgents) expect(p.salary).toBe(flat(p.ovr));
  });
  it('refuses incomplete foreign malformed or budget-changing opening maps before cutover', () => {
    const first = Object.keys(NHL_OPENING_RATINGS.ANA)[0], last = Object.keys(NHL_OPENING_RATINGS.WPG).slice(-1)[0];
    const attempts: ((m: typeof NHL_OPENING_RATINGS) => unknown)[] = [
      () => null, () => [], m => { delete m.ANA; return m; }, m => { delete m.ANA[first]; return m; }, m => { delete m.WPG[last]; return m; },
      m => { m.FOREIGN = m.ANA; return m; }, m => { m.ANA.extra = m.ANA[first]; return m; },
      m => { m.ANA[first].ovr = 100; return m; }, m => { m.ANA[first].salary = NaN; return m; }, m => { m.ANA[first].salary += 0.01; return m; },
      m => { m.ANA[first].salary += 0.1; return m; }, m => { m.ANA[first].evidence.modelVersion = 'unreviewed'; return m; },
      m => { m.WPG[last].evidence.originKey = 'ANA|' + last; return m; }, m => { m.ANA[first].evidence.openingOvr--; return m; },
      m => { m.ANA[first].evidence.basis = 'save-rate-proxy'; return m; },
      m => { const d = Object.values(m.ANA).find(p => p.evidence.basis === 'offense-usage-proxy')!; d.evidence.partial = false; return m; },
    ];
    const raw = JSON.stringify(NHL_OPENING_RATINGS);
    for (const change of attempts) expect(() => E.initNhlLeague(rngFor(898).draw, change(clone(NHL_OPENING_RATINGS)) as typeof NHL_OPENING_RATINGS)).toThrow('Opening NHL ratings do not match this roster.');
    expect(JSON.stringify(NHL_OPENING_RATINGS)).toBe(raw);
  });
  it('copies exact compact original lineage with partial defensive goalie and unresolved bases', () => {
    const map = clone(NHL_OPENING_RATINGS), lg = E.initNhlLeague(rngFor(3898).draw, map); let partial = 0, rated = 0;
    for (const [abbr, t] of Object.entries(lg.teams)) for (const p of t.players) {
      const e = map[abbr][`${p.name}|${p.pos}`].evidence;
      expect(p.openingRatingEvidence).toEqual(e); expect(p.openingRatingEvidence).not.toBe(e);
      expect(Object.keys(p.openingRatingEvidence!).sort()).toEqual(['basis', 'modelVersion', 'openingOvr', 'originKey', 'partial']);
      if (p.pos === 'D' || p.pos === 'G' || e.basis === 'unmeasured-prior') expect(e.partial).toBe(true);
      partial += Number(e.partial); rated++;
    }
    const row = map.ANA[Object.keys(map.ANA)[0]]; row.evidence.openingOvr = 0;
    expect(lg.teams.ANA.players[0].openingRatingEvidence!.openingOvr).toBe(NHL_OPENING_RATINGS.ANA[Object.keys(map.ANA)[0]].ovr);
    expect(partial).toBe(196); expect(rated).toBe(416); expect(lg.ratingModelVersion).toBe(NHL_OPENING_RATING_VERSION); expect(lg.draftAffordabilityVersion).toBe('nhl-flat-nextcap-ai-v1');
    expect(lg.freeAgents.every(p => !p.openingRatingEvidence)).toBe(true);
  });
  it('resumes earned and damaged-metadata saves byte-exact without inventing replacement grades', () => {
    const lg = opening(), p = lg.teams.TOR.players[0]; expect(p.openingRatingEvidence).toBeDefined();
    const evidence = clone(p.openingRatingEvidence); p.ovr = 65; p.pot = 68; p.salary = 12.3; lg.round = 5;
    expect(resume(lg).league.teams.TOR.players[0]).toEqual(p); expect(p.openingRatingEvidence).toEqual(evidence);
    const damaged = clone(saved(lg)); (damaged.league.teams.TOR.players[0] as any).openingRatingEvidence = { modelVersion: null, openingOvr: 'damaged' };
    const raw = JSON.stringify(damaged); expect(isFrontOfficeSave(damaged, 'NHL', 20)).toBe(true); expect(JSON.stringify(JSON.parse(raw))).toBe(raw);
    expect(damaged.league.teams.TOR.players[0].ovr).toBe(65);
    const broken = clone(saved(lg)); (broken.league.teams.TOR.players[0] as any).salary = null; expect(isFrontOfficeSave(broken, 'NHL', 20)).toBe(false);
    expect(Buffer.byteLength(raw)).toBeLessThan(400 * 1024); console.log('NHL_RATING_SAVE_SIZE ' + JSON.stringify({ bytes: Buffer.byteLength(raw), gzip: gzipSync(raw).length }));
  });
  it('uses fixed flat quotes only for the exact known version at every60to99 grade', () => {
    for (let grade = 60; grade <= 99; grade++) {
      expect(E.nhlSalaryFor(grade, NHL_OPENING_RATING_VERSION)).toBe(flat(grade));
      expect(E.nhlSalaryFor(grade)).toBe(old.nhlSalaryFor(grade)); expect(E.nhlSalaryFor(grade, 'nhl-multiyear-candidate-v2')).toBe(old.nhlSalaryFor(grade));
    }
    expect(E.nhlSalaryFor(94, NHL_OPENING_RATING_VERSION)).toBe(12.4);
  });
  it('retains waiver evidence and actual dead cap while quoting the released offer and refusing return', () => {
    const lg = opening(), t = lg.teams.TOR, p = t.players[0]; expect(p.openingRatingEvidence).toBeDefined(); const evidence = clone(p.openingRatingEvidence);
    p.ovr = 94; p.salary = 9.6; const before = E.nhlCapUsed(t);
    expect(E.nhlRelease(t, lg.freeAgents, p.id, lg.ratingModelVersion)).toBe(true);
    expect(E.nhlCapUsed(t)).toBe(Math.round((before - 4.8) * 10) / 10); expect(lg.freeAgents.find(f => f.id === p.id)!.salary).toBe(flat(94));
    expect(lg.freeAgents.find(f => f.id === p.id)!.openingRatingEvidence).toEqual(evidence);
    const raw = JSON.stringify(lg); expect(E.nhlSign(t, lg.freeAgents, p.id, 1000, lg.ratingModelVersion)).toBe(false); expect(JSON.stringify(lg)).toBe(raw);
    expect(resume(lg).league.freeAgents.find((f: E.NhlGmPlayer) => f.id === p.id).openingRatingEvidence).toEqual(evidence);
  });
  it('refuses stale cheap market asks before mutation and commits the actual versioned signing price', () => {
    const lg = opening(), t = lg.teams.TOR, fa = lg.freeAgents[0]; fa.ovr = 94; fa.salary = 0.7;
    const lowCap = E.nhlCapUsed(t) + 1, raw = JSON.stringify(lg);
    expect(E.nhlSign(t, lg.freeAgents, fa.id, lowCap, lg.ratingModelVersion)).toBe(false); expect(JSON.stringify(lg)).toBe(raw);
    expect(E.nhlSign(t, lg.freeAgents, fa.id, 1000, lg.ratingModelVersion)).toBe(true); expect(t.players.find(p => p.id === fa.id)!.salary).toBe(flat(94));
    const legacy = old.initNhlLeague(rngFor(898).draw), oldFa = legacy.freeAgents[0]; oldFa.salary = 0.7; oldFa.ovr = 94;
    expect(E.nhlSign(legacy.teams.TOR, legacy.freeAgents, oldFa.id, 1000)).toBe(true); expect(legacy.teams.TOR.players.find(p => p.id === oldFa.id)!.salary).toBe(0.7);
    const ai = opening(); for (const club of Object.values(ai.teams)) while (club.players.length < 15) club.players.push({ ...club.players[0], id: club.abbr + '-sim-' + club.players.length });
    ai.teams.MTL.players = ai.teams.MTL.players.slice(0, 10); ai.cap = E.nhlCapUsed(ai.teams.MTL) + 1; ai.freeAgents = [{ ...ai.freeAgents[0], ovr: 94, salary: 0.7 }];
    const aiRaw = JSON.stringify(ai); E.nhlAiMoves(ai, 'TOR', () => 0); expect(JSON.stringify(ai)).toBe(aiRaw);
    ai.cap += 20; const offerId = ai.freeAgents[0].id; E.nhlAiMoves(ai, 'TOR', () => 0); expect(ai.teams.MTL.players.find(p => p.id === offerId)!.salary).toBe(flat(94));
  });
  it('holds real trade identities and original evidence through an accepted price-matched move', () => {
    const lg = opening(), a = lg.teams.TOR, b = lg.teams.MTL, mine = a.players[0], theirs = b.players[0];
    expect(mine.openingRatingEvidence).toBeDefined(); expect(theirs.openingRatingEvidence).toBeDefined();
    const ea = clone(mine.openingRatingEvidence), eb = clone(theirs.openingRatingEvidence);
    expect(E.nhlExecuteTalksTrade(a, b, mine.id, theirs.id, false, 1000)).toBe('done');
    expect(a.players.find(p => p.id === theirs.id)).toBe(theirs); expect(b.players.find(p => p.id === mine.id)).toBe(mine);
    expect(theirs.openingRatingEvidence).toEqual(eb); expect(mine.openingRatingEvidence).toEqual(ea); resume(lg);
  });
  it('prices genuine draft arrivals by version while preserving age term potential and conversion RNG', () => {
    const pr = prospect('elite', 90, 94), a = rngFor(898), b = rngFor(898), was = old.nhlProspectToPlayer(pr, a.draw), next = E.nhlProspectToPlayer(pr, b.draw, NHL_OPENING_RATING_VERSION);
    expect(next.salary).toBe(flat(94)); expect({ ...next, id: '', salary: 0 }).toEqual({ ...was, id: '', salary: 0 }); expect([b.calls(), b.state()]).toEqual([a.calls(), a.state()]); expect(next.openingRatingEvidence).toBeUndefined();
    expect(E.nhlProspectToPlayer(pr, rngFor(898).draw, 'unknown').salary).toBe(was.salary);
  });
  it('renews only expired contracts and shares new quotes across market decline and replenishment', () => {
    const lg = opening(), t = lg.teams.TOR, renew = t.players[0], held = t.players[1];
    renew.age = 27; renew.ovr = renew.pot = 94; renew.years = 1; held.age = 27; held.years = 3; const heldSalary = held.salary, heldEvidence = held.openingRatingEvidence && clone(held.openingRatingEvidence);
    E.nhlOffseason(lg, rngFor(893199).draw);
    expect(t.players.find(p => p.id === renew.id)!.salary).toBe(flat(94)); expect(t.players.find(p => p.id === held.id)!.salary).toBe(heldSalary); expect(held.openingRatingEvidence).toEqual(heldEvidence);
    for (const fa of lg.freeAgents) expect(fa.salary).toBe(flat(fa.ovr));
    const empty = world(0).teams.SIM; empty.players = []; const a = rngFor(844), b = rngFor(844), previous = clone(empty);
    E.replenishNhlRoster(empty, b.draw, new Set(), NHL_OPENING_RATING_VERSION); old.replenishNhlRoster(previous, a.draw, new Set());
    expect(empty.players).toHaveLength(10); expect(empty.players.some(p => p.ovr >= 73)).toBe(true);
    expect(canonical(empty.players.map(p => ({ ...p, salary: 0 })))).toEqual(canonical(previous.players.map(p => ({ ...p, salary: 0 })))); expect([b.calls(), b.state()]).toEqual([a.calls(), a.state()]);
    for (const p of empty.players) { expect(p.salary).toBe(flat(p.ovr)); expect(p.openingRatingEvidence).toBeUndefined(); }
  });
  it('chooses first affordable scout-ordered prospects using next cap and recomputed dead-money room', () => {
    expect(typeof E.nhlAiDraftPicks).toBe('function');
    const lg = world(108), retained = clone(lg.teams.SIM.players), pool = [prospect('expensive', 93, 94), prospect('best-affordable', 90, 79), prospect('cheaper', 89, 78)];
    const result = E.nhlAiDraftPicks(lg, pool, ['SIM'], rngFor(713).draw);
    expect(result.guarded).toBe(true); expect(result.picks.map(p => p.prospect.id)).toEqual(['best-affordable']); expect(result.substituted).toBe(1); expect(result.skipped).toBe(2); expect(result.remaining.map(p => p.id)).toEqual(['expensive', 'cheaper']);
    expect(lg.teams.SIM.players.slice(0, retained.length)).toEqual(retained); expect(E.nhlCapUsed(lg.teams.SIM)).toBeLessThanOrEqual(113);
    const nextOnly = world(110); expect(E.nhlAiDraftPicks(nextOnly, [prospect('next-only', 80, 75)], ['SIM'], rngFor(714).draw).picks).toHaveLength(1);
    const dead = world(107); dead.teams.SIM.deadCap = [{ playerId: 'old-cut', name: 'Simulated cut', amount: 6, seasonsLeft: 1 }];
    expect(E.nhlAiDraftPicks(dead, [prospect('dead-money', 80, 75)], ['SIM'], rngFor(715).draw).picks).toHaveLength(0);
  });
  it('skips unaffordable AI draft slots without conversion RNG pool removal or retained-contract changes', () => {
    expect(typeof E.nhlAiDraftPicks).toBe('function'); const lg = world(113), raw = JSON.stringify(lg), rng = rngFor(715), pool = [prospect('cannot-fit', 93, 94)];
    const result = E.nhlAiDraftPicks(lg, pool, ['SIM'], rng.draw);
    expect(result.picks).toEqual([]); expect(result.skipped).toBe(1); expect(rng.calls()).toBe(0); expect(result.remaining).toEqual(pool); expect(JSON.stringify(lg)).toBe(raw);
  });
  it('requires both exact guard versions and preserves physical original five-pick routing and RNG otherwise', () => {
    expect(typeof E.nhlAiDraftPicks).toBe('function');
    for (const markers of [{}, { ratingModelVersion: 'unknown', draftAffordabilityVersion: 'nhl-flat-nextcap-ai-v1' }, { ratingModelVersion: NHL_OPENING_RATING_VERSION }]) {
      const lg = world(113, false); Object.assign(lg, markers); const pool = Array.from({ length: 8 }, (_, i) => prospect('legacy-' + i, 93 - i, 94 - i)), rng = rngFor(716), originalRng = rngFor(716), previous = clone(lg);
      const result = E.nhlAiDraftPicks(lg, pool, ['SIM'], rng.draw);
      const originalRemaining = oldDraft(old, previous, pool, ['SIM'], originalRng.draw);
      if (lg.ratingModelVersion === NHL_OPENING_RATING_VERSION) for (const p of previous.teams.SIM.players.slice(1)) p.salary = flat(p.ovr);
      expect(result.guarded).toBe(false); expect(result.picks).toHaveLength(5); expect(result.remaining).toEqual(originalRemaining); expect(canonical(lg)).toEqual(canonical(previous)); expect([rng.calls(), rng.state()]).toEqual([originalRng.calls(), originalRng.state()]);
    }
  });
  it('plays four full actual seasons drafts summers and saved resumes with next-cap draft commitments', () => {
    expect(typeof E.nhlAiDraftPicks).toBe('function'); const rng = rngFor(89906); let lg = E.initNhlLeague(rng.draw, NHL_OPENING_RATINGS), games = 0, series = 0, restores = 0, picks = 0, substitutions = 0, maxBytes = 0;
    expect(players(lg).filter(p => p.openingRatingEvidence)).toHaveLength(416);
    for (let year = 0; year < 4; year++) {
      for (let round = 1; round <= 20; round++) { lg.round = round; E.simNhlRound(lg, 'TOR', rng.draw); E.nhlAiMoves(lg, 'TOR', rng.draw); if ([4, 12].includes(round)) { lg = resume(lg).league; restores++; } }
      for (const t of Object.values(lg.teams)) expect(t.wins + t.losses + t.otLosses).toBe(80);
      expect(Object.values(lg.teams).reduce((n, t) => n + t.wins, 0)).toBe(Object.values(lg.teams).reduce((n, t) => n + t.losses + t.otLosses, 0)); games += 1280;
      const post = E.runNhlFoPlayoffs(lg, rng.draw); expect(post.series).toHaveLength(15); for (const s of post.series) expect((s.homeWins === 4) !== (s.awayWins === 4)).toBe(true); series += post.series.length;
      lg.champions.push({ season: lg.season, team: post.champion }); lg = resume(lg, 'recap', { postseason: post }).league; restores++;
      let pool = E.nhlDraftClass(rng.draw, 24, leagueNames(lg));
      for (let round = 0; round < 2; round++) {
        const pr = pool[0], gm = E.nhlProspectToPlayer(pr, rng.draw, lg.ratingModelVersion); lg.teams.TOR.players.push(gm); expect(gm.salary).toBe(flat(gm.ovr));
        const retained = new Map(players(lg).map(p => [p.id, JSON.stringify(p)])), order = E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(t => t !== 'TOR');
        const result = E.nhlAiDraftPicks(lg, pool.slice(1), order, rng.draw); expect(result.guarded).toBe(true);
        for (const pick of result.picks) { expect(E.nhlCapUsed(lg.teams[pick.team])).toBeLessThanOrEqual(Math.round(lg.cap * 1.09)); expect(pick.player.salary).toBe(flat(pick.player.ovr)); }
        for (const p of players(lg)) if (retained.has(p.id)) expect(JSON.stringify(p)).toBe(retained.get(p.id));
        picks += result.picks.length + 1; substitutions += result.substituted; pool = result.remaining;
        const state = resume(lg, 'draft', { draftClass: pool, picksLeft: 1 - round }); lg = state.league; pool = state.draftClass; restores++;
      }
      E.nhlOffseason(lg, rng.draw); lg = resume(lg).league; restores++; maxBytes = Math.max(maxBytes, Buffer.byteLength(JSON.stringify(saved(lg))));
      for (const t of Object.values(lg.teams)) { expect(t.players.length).toBeGreaterThanOrEqual(10); expect(t.players.some(p => p.pos === 'G')).toBe(true); }
      for (const p of players(lg)) if (p.openingRatingEvidence) expect(p.openingRatingEvidence.originKey.split('|')[1]).toBe(p.name);
      expect(players(lg).some(p => p.openingRatingEvidence)).toBe(true);
      expect(new Set(players(lg).map(p => p.id)).size).toBe(players(lg).length);
    }
    expect([lg.season, games, series, restores, picks]).toEqual([2030, 5120, 60, 24, 48]); expect(substitutions).toBeGreaterThan(0); expect(maxBytes).toBeLessThan(400 * 1024);
    console.log('NHL_RATING_CAMPAIGN ' + JSON.stringify({ seasons: 4, games, series, restores, picks, substitutions, maxBytes }));
  });
  it('pins the source window and excludes script-only raw observations from the browser engine', () => {
    expect(NHL_OPENING_RATING_VERSION).toBe('nhl-multiyear-candidate-v2-economy-flat-v1'); expect(NHL_OPENING_RATING_WINDOW).toBe('2024-25 and 2025-26 regular seasons');
    const input = JSON.parse(readFileSync(path.join(root, 'scripts/data/nhlFoRatingInputs2026.json'), 'utf8')); expect(input.runtimeVersion).toBe(NHL_OPENING_RATING_VERSION); expect(input.window).toBe(NHL_OPENING_RATING_WINDOW); expect(input.provenance.length).toBeGreaterThan(0);
    const result = build({ entryPoints: [path.join(root, 'src/lib/nhlFrontOffice.ts')], write: false, bundle: true, platform: 'browser', format: 'esm', metafile: true, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
    expect(Object.keys(result.metafile.inputs).some(f => /scripts\/data|nhlFoRatingInputs|nhlFoRatingModel|supabase/.test(f))).toBe(false);
  });
});
