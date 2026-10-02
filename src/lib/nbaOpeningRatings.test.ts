import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import * as engine from '@/lib/nbaFrontOffice';
import * as stats from '@/lib/nbaSeasonStats';
import { leagueNames } from '@/lib/foNames';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import { NBA_OPENING_RATINGS, NBA_OPENING_RATING_VERSION, NBA_OPENING_RATING_WINDOW } from '@/data/nbaOpeningRatings';
import { generateModel, openingFinance, combineMeasurements, measureSeason, makeCohorts } from '../../scripts/lib/nbaFoRatingModel.mjs';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file));
const norm = (text: string) => text.replace(/\r\n/g, '\n');
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const snapshot = JSON.parse(read('scripts/data/nbaFoRatingInputs2026.json').toString());
const seeds = NBA_TEAMS.flatMap(t => t.players.map(p => ({ team: t.id, ...p })));
const inputs = Object.fromEntries(Object.entries(snapshot.observations).map(([key, set]: [string, any]) => [key, set.rows.map((row: any[]) => Object.fromEntries(set.headers.map((field: string, i: number) => [field, row[i]])))]));
const people = (league: engine.NbaLeague) => [...Object.values(league.teams).flatMap(t => t.players), ...league.freeAgents];
const seeded = (seed: number) => {
  let state = seed >>> 0, count = 0;
  return { draw: () => { count++; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }, count: () => count, state: () => state };
};
function canonical(value: unknown) {
  const ids = new Map<string, string>();
  const collect = (v: any) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      for (const key of ['id', 'playerId']) if (typeof v[key] === 'string' && !ids.has(v[key])) ids.set(v[key], '#' + ids.size);
      Object.values(v).forEach(collect);
    }
  };
  collect(value);
  const replace = (v: any): any => {
    if (typeof v === 'string') return ids.get(v) ?? v;
    if (Array.isArray(v)) return v.map(replace);
    if (!v || typeof v !== 'object') return v;
    return Object.fromEntries(Object.entries(v).map(([key, item]) => [key.split('|').map(part => ids.get(part) ?? part).join('|'), replace(item)]));
  };
  return replace(value);
}
function build(options: object) {
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), '-e', "process.stdout.write(JSON.stringify(require('esbuild').buildSync(JSON.parse(process.argv[1]))))", JSON.stringify(options)], { cwd: root, encoding: 'utf8', timeout: 15000 });
  if (run.status !== 0 || run.error || run.signal) throw new Error('Offline NBA baseline compilation failed: ' + run.stderr);
  return JSON.parse(run.stdout);
}
let folder: string, baseline: any;
const heldBaseline: [string, Buffer][] = [];
beforeAll(() => {
  folder = mkdtempSync(path.join(os.tmpdir(), 'dukb-nba895-baseline-'));
  for (const file of ['src/lib/nbaFrontOffice.ts', 'src/lib/nbaSeasonStats.ts', 'src/lib/nbaRotation.ts', 'src/data/conquestDataNba.ts']) {
    const shown = spawnSync('git', ['show', 'e8b39ccc:' + file], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    if (shown.status !== 0) throw new Error('Cannot read physical e8b39ccc NBA baseline: ' + shown.stderr.toString());
    const target = path.join(folder, path.basename(file));
    const source = file.includes('/lib/') ? norm(shown.stdout.toString()).replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3') : shown.stdout.toString();
    writeFileSync(target, source); heldBaseline.push([target, readFileSync(target)]);
  }
  const output = path.join(folder, 'baseline.cjs');
  const result = build({ stdin: { contents: "export * as engine from './nbaFrontOffice.ts'; export * as stats from './nbaSeasonStats.ts';", resolveDir: folder }, outfile: output, bundle: true, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent', alias: { '@/data/conquestDataNba': path.join(folder, 'conquestDataNba.ts'), '@/lib/nbaRotation': path.join(folder, 'nbaRotation.ts'), '@': path.join(root, 'src') } });
  expect(Object.keys(result.metafile.inputs).some(file => /supabase|fetchPlayers|useAuth/.test(file))).toBe(false);
  baseline = createRequire(import.meta.url)(output);
});
afterAll(() => {
  for (const [file, bytes] of heldBaseline) { const currentBytes = readFileSync(file); expect(currentBytes).toEqual(bytes); }
  if (folder) {
    const resolved = path.resolve(folder);
    expect(path.dirname(resolved)).toBe(path.resolve(os.tmpdir())); expect(path.basename(resolved).startsWith('dukb-nba895-baseline-')).toBe(true);
    rmSync(resolved, { recursive: true, force: true });
  }
});
function opening(seed = 895) { return engine.initNbaLeague(seeded(seed).draw, NBA_OPENING_RATINGS); }
function season(api: typeof engine, box: typeof stats, lg: engine.NbaLeague, rng: () => number) {
  expect(api.nbaTipOff(lg, rng, 'DEN').refused).toEqual([]);
  for (let round = 1; round <= api.NBA_ROUNDS; round++) { lg.round = round; api.simRound(lg, 'DEN', rng); }
  const postseason = api.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: postseason.champion });
  api.nbaAssessTax(lg); box.nbaCloseSeasonStats(lg);
  return postseason;
}
const terms = (p: engine.NbaGmPlayer) => { const { id, ovr, salary, pot, openingRatingEvidence, ...held } = p; return held; };
function fictionalTeam(abbr: string, salary = 30): engine.NbaGmTeam {
  return { abbr, wins: 0, losses: 0, picks: [1, 2], players: Array.from({ length: 9 }, (_, i) => ({ id: `sim-${abbr}-${i}`, name: `Simulated ${abbr} player ${i}`, pos: 'G', age: 27, ovr: i ? 80 : 95, salary, years: 3, out: 0, pot: 95 })) };
}

describe('NBA opening rating integration', () => {
  it('preserves the physical e8b39ccc default league full season and RNG as an independent baseline', () => {
    const a = seeded(895), b = seeded(895), old = baseline.engine.initNbaLeague(a.draw), next = engine.initNbaLeague(b.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect([b.count(), b.state()]).toEqual([a.count(), a.state()]);
    expect(canonical(season(engine, stats, next, b.draw))).toEqual(canonical(season(baseline.engine, baseline.stats, old, a.draw)));
    engine.nbaOffseason(next, b.draw); baseline.engine.nbaOffseason(old, a.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect([b.count(), b.state()]).toEqual([a.count(), a.state()]);
  });

  it('keeps physical old-save grades and absent evidence unchanged through restore and play', () => {
    const a = seeded(1895), b = seeded(1895), old = baseline.engine.initNbaLeague(a.draw), next = JSON.parse(JSON.stringify(old));
    engine.initNbaLeague(b.draw);
    for (const lg of [old, next]) { delete lg.schedule; delete lg.stats; delete lg.taxScale; lg.teams.DEN.players[0].ovr = 61; lg.teams.DEN.players[0].salary = 15.6; lg.teams.DEN.players[0].pot = 66; }
    const raw = JSON.stringify(next); expect(engine.ensureNbaLeagueIds(next)).toBe(0); expect(JSON.stringify(next)).toBe(raw);
    expect(people(next).every(p => !p.openingRatingEvidence)).toBe(true);
    expect(engine.simRound(next, 'DEN', b.draw)).toEqual(baseline.engine.simRound(old, 'DEN', a.draw));
    expect(canonical(next)).toEqual(canonical(old));
    engine.nbaOffseason(next, b.draw); baseline.engine.nbaOffseason(old, a.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect(people(next).every(p => !p.openingRatingEvidence)).toBe(true);
  });

  it('replays all300 frozen model grades and fictional opening prices without named overrides', () => {
    const model = generateModel(seeds, inputs), finance = openingFinance(seeds, model, engine.nbaSalaryFor);
    const prices = new Map(finance.flatMap((t: any) => t.players.map((p: any) => [`${t.team}|${p.name}`, p.salary])));
    const tuples = model.players.map((p: any) => [p.team, p.name, p.position, p.model.overall, prices.get(`${p.team}|${p.name}`), p.model.offense, p.model.defense, p.model.role, p.model.currentAvailable ? 'box-score-proxy' : p.model.priorAvailable ? 'prior-only' : 'unmeasured-prior']);
    expect(tuples).toHaveLength(300); expect(hash(JSON.stringify(tuples))).toBe(snapshot.checkpoint.tupleSha256); expect(tuples).toEqual(snapshot.checkpoint.tuples);
    expect(model.calibration).toEqual(snapshot.checkpoint.calibration); expect(model.cohorts).toEqual(snapshot.checkpoint.cohorts);
  });

  it('applies all300 real initializer tuples and preserves30 exact original club budgets', () => {
    const lg = opening(), old = baseline.engine.initNbaLeague(seeded(895).draw);
    let changed = 0;
    for (const seed of seeds) {
      const row = NBA_OPENING_RATINGS[seed.team][`${seed.name}|${seed.position}`], p = lg.teams[seed.team].players.find(p => p.name === seed.name)!;
      expect([p.ovr, p.salary]).toEqual([row.ovr, row.salary]); expect(p.salary).toBeGreaterThanOrEqual(2);
      if (p.ovr !== seed.overall) changed++;
    }
    expect(changed).toBeGreaterThan(200);
    for (const [abbr, team] of Object.entries(lg.teams)) expect(engine.nbaCapUsed(team)).toBe(baseline.engine.nbaCapUsed(old.teams[abbr]));
    expect(Object.keys(lg.teams)).toHaveLength(30); expect(Object.values(lg.teams).flatMap(t => t.players)).toHaveLength(300);
  });

  it('holds original terms generated ages free agents schedule tax scale and constructor RNG', () => {
    const a = seeded(2895), b = seeded(2895), old = baseline.engine.initNbaLeague(a.draw), lg = engine.initNbaLeague(b.draw, NBA_OPENING_RATINGS);
    expect([b.count(), b.state()]).toEqual([a.count(), a.state()]);
    expect(lg.schedule).toEqual(old.schedule); expect(lg.taxScale).toBe(old.taxScale); expect(canonical(lg.freeAgents)).toEqual(canonical(old.freeAgents));
    for (const [abbr, team] of Object.entries(lg.teams)) expect(team.players.map(terms)).toEqual(old.teams[abbr].players.map(terms));
  });

  it('carries original developmental headroom onto new grades with a99 potential ceiling', () => {
    let young = 0;
    for (const seed of [895, 1895, 2895]) {
      const old = baseline.engine.initNbaLeague(seeded(seed).draw), lg = opening(seed);
      for (const [abbr, team] of Object.entries(lg.teams)) team.players.forEach((p, i) => {
        const previous = old.teams[abbr].players[i], source = NBA_TEAMS.find(t => t.id === abbr)!.players[i], wanted = NBA_OPENING_RATINGS[abbr][`${source.name}|${source.position}`].ovr;
        expect(p.pot).toBe(Math.min(99, wanted + Math.max(0, previous.pot - previous.ovr))); expect(p.pot).toBeGreaterThanOrEqual(p.ovr);
        if (previous.pot > previous.ovr) young++;
      });
    }
    expect(young).toBeGreaterThan(50);
  });

  it('copies exact five-field partial original evidence with distinct prior and unresolved bases', () => {
    const lg = opening(), totals = { 'box-score-proxy': 0, 'prior-only': 0, 'unmeasured-prior': 0 };
    for (const seed of seeds) {
      const row = NBA_OPENING_RATINGS[seed.team][`${seed.name}|${seed.position}`], p = lg.teams[seed.team].players.find(p => p.name === seed.name)!;
      expect(p.openingRatingEvidence).toEqual(row.evidence); expect(p.openingRatingEvidence).not.toBe(row.evidence);
      expect(Object.keys(p.openingRatingEvidence!).sort()).toEqual(['basis', 'modelVersion', 'openingOvr', 'originKey', 'partial']);
      expect(p.openingRatingEvidence!.partial).toBe(true); expect(p.openingRatingEvidence!.openingOvr).toBe(p.ovr);
      totals[p.openingRatingEvidence!.basis]++;
    }
    expect(totals).toEqual({ 'box-score-proxy': 291, 'prior-only': 5, 'unmeasured-prior': 4 });
    expect(NBA_OPENING_RATING_VERSION).toBe(snapshot.version); expect(NBA_OPENING_RATING_WINDOW).toBe(snapshot.window);
    const changed = clone(NBA_OPENING_RATINGS), group = Object.keys(changed)[0], key = Object.keys(changed[group])[0];
    changed[group][key].evidence.originKey = 'SIM|Wrong original identity|G';
    expect(() => engine.initNbaLeague(seeded(895).draw, changed)).toThrow('Opening NBA ratings do not match this roster.');
  });

  it('resumes progressed JSON saves without rerating or losing original lineage below400KiB', () => {
    const lg = opening(), p = lg.teams.DEN.players[0]; expect(p.openingRatingEvidence).toBeDefined(); const evidence = clone(p.openingRatingEvidence);
    p.ovr = 67; p.pot = 70; p.salary = 13.4; lg.round = 8;
    const raw = JSON.stringify(lg), restored = JSON.parse(raw);
    expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(400 * 1024); expect(engine.ensureNbaLeagueIds(restored)).toBe(0); expect(JSON.stringify(restored)).toBe(raw);
    expect(restored.teams.DEN.players[0].openingRatingEvidence).toEqual(evidence); expect([restored.teams.DEN.players[0].ovr, restored.teams.DEN.players[0].salary]).toEqual([67, 13.4]);
    console.log('NBA_RATING_SAVE_SIZE', JSON.stringify({ rawBytes: Buffer.byteLength(raw), gzipBytes: gzipSync(raw).length }));
  });

  it('retains original player evidence through an actual opening-price trade', () => {
    const lg = opening(); let accepted: { mine: engine.NbaGmPlayer; theirs: engine.NbaGmPlayer; a: string; b: string } | undefined;
    outer: for (const a of Object.keys(lg.teams)) for (const b of Object.keys(lg.teams).filter(v => v !== a)) {
      for (const mine of lg.teams[a].players) for (const theirs of lg.teams[b].players) {
        if (engine.nbaTradeValue(mine) < engine.nbaTradeValue(theirs) * 1.07) continue;
        const probe = clone(lg);
        if (engine.nbaTrade(probe.teams[a], probe.teams[b], mine.id, theirs.id, false, lg.cap, lg.taxScale) === 'accepted') { accepted = { mine, theirs, a, b }; break outer; }
      }
    }
    expect(accepted).toBeDefined(); const { mine, theirs, a, b } = accepted!;
    expect(mine.openingRatingEvidence).toBeDefined(); expect(theirs.openingRatingEvidence).toBeDefined(); const mineEvidence = clone(mine.openingRatingEvidence), theirEvidence = clone(theirs.openingRatingEvidence);
    expect(engine.nbaTrade(lg.teams[a], lg.teams[b], mine.id, theirs.id, false, lg.cap, lg.taxScale)).toBe('accepted');
    expect(lg.teams[a].players.find(p => p.id === theirs.id)!.openingRatingEvidence).toEqual(theirEvidence);
    expect(lg.teams[b].players.find(p => p.id === mine.id)!.openingRatingEvidence).toEqual(mineEvidence);
    expect(theirEvidence!.originKey.startsWith(b + '|')).toBe(true);
  });

  it('retains waiver lineage charges actual dead money and prevents same-season return', () => {
    const lg = opening(), team = lg.teams.DEN, p = team.players[0], before = engine.nbaCapUsed(team); expect(p.openingRatingEvidence).toBeDefined(); const evidence = clone(p.openingRatingEvidence);
    expect(engine.nbaRelease(team, lg.freeAgents, p.id)).toBe(true);
    expect(lg.freeAgents.find(q => q.id === p.id)!.openingRatingEvidence).toEqual(evidence);
    const dead = Math.round(p.salary * 0.5 * 10) / 10; expect(team.deadCap![0].amount).toBe(dead); expect(engine.nbaCapUsed(team)).toBe(Math.round((before - p.salary + dead) * 10) / 10);
    const raw = JSON.stringify(lg); expect(engine.nbaSign(team, lg.freeAgents, p.id, 1000)).toBe(false); expect(JSON.stringify(lg)).toBe(raw);
    expect(engine.nbaRelease(team, lg.freeAgents, p.id)).toBe(false); expect(JSON.stringify(lg)).toBe(raw);
  });

  it('leaves generated free agents and future draft arrivals without historical opening evidence', () => {
    const lg = opening(), rng = seeded(3895).draw;
    expect(lg.freeAgents).toHaveLength(10); expect(lg.freeAgents.every(p => !p.openingRatingEvidence)).toBe(true);
    const draft = engine.nbaDraftClass(rng, 24, leagueNames(lg)); expect(draft).toHaveLength(24);
    const rookie = engine.nbaProspectToPlayer(draft[0], rng, engine.nbaDraftSigning(lg));
    expect(rookie.openingRatingEvidence).toBeUndefined(); expect(rookie.rookieSeason).toBe(2027); expect(rookie.salary).toBeGreaterThanOrEqual(engine.nbaMinContract(engine.nbaNextCap(lg.cap)));
  });

  it('keeps actual tipoff and played box-score points consistent with opening player identities', () => {
    const rng = seeded(895), lg = engine.initNbaLeague(rng.draw, NBA_OPENING_RATINGS), origins = new Map(people(lg).filter(p => p.openingRatingEvidence).map(p => [p.id, clone(p.openingRatingEvidence)]));
    expect(engine.nbaTipOff(lg, rng.draw, 'DEN').refused).toEqual([]); expect(Object.values(lg.teams).every(t => t.players.length >= 14 && t.players.length <= 15)).toBe(true);
    engine.simRound(lg, 'DEN', rng.draw);
    for (const team of Object.values(lg.teams)) {
      const club = lg.stats!.teams[team.abbr], lines = Object.values(lg.stats!.lines).filter(line => line.team === team.abbr);
      expect(club.g).toBe(4); expect(lines.reduce((sum, line) => sum + line.tot.pts, 0)).toBe(club.pts);
      team.players.forEach(p => { if (origins.has(p.id)) expect(p.openingRatingEvidence).toEqual(origins.get(p.id)); else expect(p.openingRatingEvidence).toBeUndefined(); });
    }
  });

  it('keeps hard signing refusals and increasing-salary apron trades while allowing matched over-cap trades', () => {
    const team = fictionalTeam('SIM', 10), free = [{ ...team.players[0], id: 'sim-market', salary: 125 }], before = JSON.stringify({ team, free });
    expect(engine.nbaSign(team, free, free[0].id, 200)).toBe(false); expect(JSON.stringify({ team, free })).toBe(before);
    const a = fictionalTeam('AAA'), b = fictionalTeam('BBB'); b.players[0].ovr = 70; b.players[0].salary = 31;
    const raw = JSON.stringify({ a, b }); expect(engine.nbaTrade(a, b, a.players[0].id, b.players[0].id, false, 200, 1)).toBe('invalid'); expect(JSON.stringify({ a, b })).toBe(raw);
    b.players[0].salary = 30; expect(engine.nbaTrade(a, b, a.players[0].id, b.players[0].id, false, 200, 1)).toBe('accepted'); expect(engine.nbaCapUsed(a)).toBe(270);
  });

  it('plays three complete real seasons drafts and summers with saved lineage and accounting identities', () => {
    const rng = seeded(4895); let lg = engine.initNbaLeague(rng.draw, NBA_OPENING_RATINGS);
    let rounds = 0, games = 0, playoffRows = 0, draftGm = 0, draftAi = 0, resumes = 0, maxSave = 0;
    const original = new Map(people(lg).filter(p => p.openingRatingEvidence).map(p => [p.id, clone(p.openingRatingEvidence)]));
    expect(original.size).toBe(300);
    const save = () => {
      const raw = JSON.stringify(lg), restored = JSON.parse(raw); maxSave = Math.max(maxSave, Buffer.byteLength(raw)); expect(maxSave).toBeLessThanOrEqual(400 * 1024);
      expect(engine.ensureNbaLeagueIds(restored)).toBe(0); expect(JSON.stringify(restored)).toBe(raw); lg = restored; resumes++;
      for (const p of people(lg)) if (original.has(p.id)) expect(p.openingRatingEvidence).toEqual(original.get(p.id));
      for (const team of Object.values(lg.teams)) {
        expect(engine.nbaCapRoom(team, lg.cap)).toBe(Math.round((lg.cap - engine.nbaCapUsed(team) - (team.taxDue ?? 0)) * 10) / 10);
        expect(Number.isFinite(engine.nbaCapUsed(team))).toBe(true); expect(team.players.every(p => p.salary >= 0 && p.ovr >= 0 && p.ovr <= 99 && p.pot >= p.ovr && p.pot <= 99)).toBe(true);
      }
    };
    for (let year = 0; year < 3; year++) {
      const current = lg.season;
      while (lg.teams.DEN.players.length > engine.NBA_ROSTER_MAX) { const p = [...lg.teams.DEN.players].sort((a, b) => a.ovr - b.ovr)[0]; expect(engine.nbaRelease(lg.teams.DEN, lg.freeAgents, p.id)).toBe(true); }
      expect(engine.nbaTipOff(lg, rng.draw, 'DEN').refused).toEqual([]); save();
      for (let round = 1; round <= engine.NBA_ROUNDS; round++) {
        lg.round = round; engine.simRound(lg, 'DEN', rng.draw); rounds++;
        expect(Object.values(lg.teams).reduce((sum, t) => sum + t.wins, 0)).toBe(round * 60); if (round === 10) save();
      }
      expect(Object.values(lg.teams).map(t => t.wins + t.losses)).toEqual(Array(30).fill(80)); games += 1200;
      const post = engine.runNbaPlayoffs(lg, rng.draw); expect(post.series).toHaveLength(21); expect(post.series.filter(s => s.homeWins + s.awayWins === 1)).toHaveLength(6); playoffRows += post.series.length;
      post.series.forEach(s => { expect(s.winner).toBe(s.homeWins > s.awayWins ? s.home : s.away); expect(Math.max(s.homeWins, s.awayWins)).toBe(s.homeWins + s.awayWins === 1 ? 1 : 4); });
      lg.champions.push({ season: current, team: post.champion });
      const tax = engine.nbaAssessTax(lg), assessed = JSON.stringify(lg); expect(tax).toHaveLength(30); expect(engine.nbaAssessTax(lg)).toEqual(tax); expect(JSON.stringify(lg)).toBe(assessed);
      stats.nbaCloseSeasonStats(lg); const awards = JSON.stringify(lg); stats.nbaCloseSeasonStats(lg); expect(JSON.stringify(lg)).toBe(awards); save();
      const draft = engine.nbaDraftClass(rng.draw, 24, leagueNames(lg)), signing = engine.nbaDraftSigning(lg), order = engine.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== 'DEN');
      for (let pick = 0; pick < 2; pick++) {
        const rookie = engine.nbaProspectToPlayer(draft.shift()!, rng.draw, signing); expect(rookie.openingRatingEvidence).toBeUndefined(); lg.teams.DEN.players.push(rookie); draftGm++;
        for (let ai = 0; ai < 5; ai++) { lg.teams[order[ai]].players.push(engine.nbaProspectToPlayer(draft.shift()!, rng.draw, signing)); draftAi++; }
        save();
      }
      const nextCap = engine.nbaNextCap(lg.cap); engine.nbaOffseason(lg, rng.draw, 'DEN'); expect([lg.season, lg.cap, lg.round]).toEqual([current + 1, nextCap, 1]); save();
      expect(Object.values(lg.teams).filter(t => t.abbr !== 'DEN').every(t => t.players.length >= 14 && t.players.length <= 15)).toBe(true);
    }
    expect([rounds, games, playoffRows, draftGm, draftAi, resumes]).toEqual([60, 3600, 63, 6, 30, 18]);
    console.log('NBA_RATING_CAMPAIGN', JSON.stringify({ rounds, games, playoffRows, draftGm, draftAi, resumes, maxSave, season: lg.season }));
  });

  it('retains a dated script-only source checkpoint and excludes raw observations from the browser', () => {
    expect(snapshot.provenance).toHaveLength(5);
    for (const row of snapshot.provenance) { expect(row.sourceURL).toMatch(/^https:\/\/stats\.nba\.com\/stats\//); expect(row.retrievalUTC).toMatch(/^2026-10-02T/); expect(row.sha256).toMatch(/^[a-f0-9]{64}$/); expect(row.season).toMatch(/^202[45]-2[56]$/); }
    expect(snapshot.validation.sourceLineage).toContain('no independent two-source'); expect(snapshot.validation.defense).toContain('Partial'); expect(snapshot.validation.position).toContain('not independently verified');
    expect(hash(norm(read('src/data/conquestDataNba.ts').toString()))).toBe(snapshot.seed.sourceSha256);
    expect(hash(JSON.stringify(seeds))).toBe(snapshot.seed.canonicalSha256);
    expect(JSON.stringify(NBA_OPENING_RATINGS)).not.toMatch(/PLAYER_ID|AST_PCT|observations|DEF_RATING|ageInSeason|NBA source lineage/);
    const bundle = build({ entryPoints: [path.join(root, 'src/data/nbaOpeningRatings.ts')], outfile: path.join(folder, 'browser.mjs'), bundle: true, platform: 'browser', format: 'esm', metafile: true, minify: true, logLevel: 'silent' });
    expect(Object.keys(bundle.metafile.inputs).some((file: string) => /scripts\/data|nbaFoRatingModel|nbaFoRatingInputs/.test(file.replace(/\\/g, '/')))).toBe(false);
    expect(gzipSync(read('src/data/nbaOpeningRatings.ts')).length).toBeLessThan(20 * 1024);
  });

  it('bounds measured targets before opportunity blending and leaves unmeasured players at a disclosed prior', () => {
    const cohort = makeCohorts(inputs.current, inputs.currentAdvanced);
    const make = (games: number) => {
      const base = { PLAYER_ID: -895, PLAYER_NAME: 'Simulated sample player', GP: games, MIN: games * 36, PTS: games * 100, FGA: games * 40, FTA: games * 12, AST: games * 40, TOV: games, FG3M: games * 20, FG3A: games * 22, OREB: games * 8, DREB: games * 16, STL: games * 10, BLK: games * 10 };
      const advanced = { PLAYER_ID: -895, MIN: 36, POSS: games * 75, AST_PCT: .95, REB_PCT: .95 };
      const measured = measureSeason(base, advanced, cohort); measured.calibration = snapshot.checkpoint.calibration.current;
      return combineMeasurements('G', measured, null);
    };
    const thin = make(1), full = make(82), missing = combineMeasurements('G', null, null);
    expect(thin.overall).toBeLessThan(full.overall); expect(thin.overall).toBeLessThan(80);
    for (const part of Object.values(thin.combined) as any[]) { expect(part.target).toBeLessThanOrEqual(99); expect(part.grade).toBeLessThanOrEqual(72 + 27 * part.confidence); }
    expect([missing.overall, missing.offense, missing.defense, missing.role]).toEqual([72, 72, 72, 72]); expect([missing.currentAvailable, missing.priorAvailable]).toEqual([false, false]);
  });
});
