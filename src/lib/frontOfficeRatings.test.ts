/* Round889: the real initializer and offline checkpoint, with physical pre-change baselines.
   These are simulation estimates and simulated seasons, not historical fact verification. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as engine from '@/lib/frontOffice';
import { deadCapUsed } from '@/lib/frontOfficeCuts';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import { leagueNames } from '@/lib/foNames';
import { FO_DEPTH, FO_OPENING_RATING_VERSION, FO_OPENING_RATING_WINDOW } from '@/data/frontOfficeDepth';
import { buildFullRatings, openingRatingEvidence } from '../../scripts/lib/nflFoRatingModel.mjs';
import { bakeFromRecord, readTeamMeta } from '../../scripts/genFrontOfficeRoster.mjs';

const root = process.cwd();
const norm = (text: string) => text.replace(/\r\n/g, '\n');
const read = (file: string) => readFileSync(path.join(root, file));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const inputs = JSON.parse(read('scripts/data/nflFoRatingInputs2026.json').toString());
const record = JSON.parse(read('scripts/data/nflRosters2026.json').toString());
const spot = JSON.parse(read('scripts/data/nflRosterSpotCheck.json').toString());
const coreText = norm(read('src/data/frontOfficePlayers.ts').toString());
const meta = readTeamMeta(coreText);
const tupleHash = '731a2a67a5eb80099f4552f7ca0d45bfb8aee0c25c0abf7943dd53d09f065fd9';
const partialHash = 'a706820eff365bab02e8339d0ef259113a4823c1cf03745e3a89402aa53a5fd6';
const compact = (e: any) => ({ modelVersion: e.modelVersion, originKey: e.originKey, openingOvr: e.openingOvr, basis: e.basis, partial: e.partial });
function build(options: object) {
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), '-e', "process.stdout.write(JSON.stringify(require('esbuild').buildSync(JSON.parse(process.argv[1]))))", JSON.stringify(options)], { cwd: root, encoding: 'utf8', timeout: 15000 });
  if (run.status !== 0 || run.error || run.signal) throw new Error('Offline baseline compilation failed: ' + run.stderr);
  return JSON.parse(run.stdout);
}
function removeOwnedTemp(dir: string, prefix: string) {
  const resolved = path.resolve(dir), parent = path.resolve(os.tmpdir());
  expect(path.dirname(resolved)).toBe(parent); expect(path.basename(resolved).startsWith(prefix)).toBe(true);
  rmSync(resolved, { recursive: true, force: true });
}
const seeded = (seed: number) => {
  let state = seed >>> 0, count = 0;
  return { draw: () => { count++; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }, count: () => count };
};
function canonical(value: any) {
  const ids = new Map<string, string>();
  const walk = (v: any) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      for (const key of ['id', 'playerId']) if (typeof v[key] === 'string' && !ids.has(v[key])) ids.set(v[key], '#' + ids.size);
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
  return JSON.parse(JSON.stringify(value, (_key, v) => typeof v === 'string' && ids.has(v) ? ids.get(v) : v));
}
const everyone = (lg: engine.LeagueState) => Object.values(lg.teams).flatMap(t => [...t.players, ...(t.practice ?? [])]);
/* Round 1130, recorded on origin/main at 6f57ce78 BEFORE the opening files were unified: the league the board
   deals (depth passed, the GM on Kansas City) for three seeds. Unifying the files must not move one byte of it. */
const boardLeagueDigests = [
  'a68d25af1fdd8cd4a2904cc13bab51ec89225f0955c7a54e631f73b71d7b4c17',
  'd45c32c5a14b6353330426e3df369ef42a4033b77b59a1c09b475b5e0d7367ff',
  '4823ec09ec20e5b1ade41182e3e3f8e989b9b4994b9a60ce921dc8a6c6f33cf0',
];
/** A physical old tree, built the way the 56356be9 baseline below is: the engine and both data files as that commit held them. */
function physical(commit: string) {
  const dir = path.join(folder, 'physical-' + commit); mkdirSync(dir);
  for (const file of ['src/lib/frontOffice.ts', 'src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts']) {
    const shown = spawnSync('git', ['show', commit + ':' + file], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    if (shown.status !== 0) throw new Error('Cannot read the physical ' + commit + ' tree: ' + shown.stderr.toString());
    writeFileSync(path.join(dir, path.basename(file)), file.includes('/lib/') ? norm(shown.stdout.toString()).replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3') : shown.stdout.toString());
  }
  const output = path.join(dir, 'physical.cjs');
  const result = build({ stdin: { contents: "export * as engine from './frontOffice.ts'; export {FO_DEPTH} from './frontOfficeDepth.ts';", resolveDir: dir }, outfile: output, bundle: true, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent', alias: { '@/data/frontOfficePlayers': path.join(dir, 'frontOfficePlayers.ts'), '@/data/frontOfficeDepth': path.join(dir, 'frontOfficeDepth.ts'), '@': path.join(root, 'src') } });
  expect(Object.keys(result.metafile!.inputs).some(file => /supabase|fetchPlayers|useAuth/.test(file))).toBe(false);
  return createRequire(import.meta.url)(output);
}
let baseline: any;
let folder: string;
const heldBaseline: [string, Buffer][] = [];
beforeAll(() => {
  folder = mkdtempSync(path.join(os.tmpdir(), 'dukb-rating889-baseline-'));
  for (const file of ['src/lib/frontOffice.ts', 'src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts']) {
    const shown = spawnSync('git', ['show', '56356be9:' + file], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    if (shown.status !== 0) throw new Error('Cannot read the physical56356be9 baseline: ' + shown.stderr.toString());
    const target = path.join(folder, path.basename(file));
    const source = file.includes('/lib/') ? norm(shown.stdout.toString()).replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3') : shown.stdout.toString();
    writeFileSync(target, source); heldBaseline.push([target, readFileSync(target)]);
  }
  const output = path.join(folder, 'baseline.cjs');
  const result = build({ stdin: { contents: "export * as engine from './frontOffice.ts'; export {FO_DEPTH} from './frontOfficeDepth.ts';", resolveDir: folder }, outfile: output, bundle: true, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent', alias: { '@/data/frontOfficePlayers': path.join(folder, 'frontOfficePlayers.ts'), '@': path.join(root, 'src') } });
  expect(Object.keys(result.metafile!.inputs).some(file => /supabase|fetchPlayers|useAuth/.test(file))).toBe(false);
  baseline = createRequire(import.meta.url)(output);
});
afterAll(() => {
  for (const [file, bytes] of heldBaseline) expect(readFileSync(file)).toEqual(bytes);
  if (folder) removeOwnedTemp(folder, 'dukb-rating889-baseline-');
});

/* Explicitly fictional opportunity-boundary records, using the actual dated reference model. */
function opportunityFixture(targets: number | null, extreme = false) {
  const model = inputs.models.defense['2025|CB'];
  const defender = {
    key: 'SIM|Simulated opportunity defender|DB', team: 'SIM', tier: 'core',
    seed: { name: 'Simulated opportunity defender', pos: 'DB', age: 28, ovr: 70, salary: 3, years: 2 },
    sourceIdentity: { gsisId: 'simulated-defender', depthChartPosition: 'CB', draftNumber: 100, yearsExperience: 8 },
    observations: [{ season: 2025, role: 'CB', baseExposure: 1000, partial: false, features: Object.fromEntries(Object.entries(model.features).map(([key, f]: [string, any]) => [key, targets == null ? null : { value: f.mean + (extreme ? f.sd * 50 : 0), exposure: targets }])) }],
  };
  const quarterback = { key: 'SIM|Simulated allocation quarterback|QB', team: 'SIM', tier: 'core', seed: { name: 'Simulated allocation quarterback', pos: 'QB', age: 22, ovr: 82, salary: 20, years: 4 }, sourceIdentity: { gsisId: 'simulated-quarterback', depthChartPosition: 'QB', draftNumber: 1, yearsExperience: 0 }, observations: [] };
  return { ...inputs, records: [defender, quarterback] };
}
const outcome = (fixture: any) => buildFullRatings(fixture)[0];

describe('NFL opening rating checkpoint', () => {
  it('preserves the physical56356be9 no-depth league and draw sequence as an independent baseline', () => {
    const a = seeded(889), b = seeded(889), old = baseline.engine.initLeague(a.draw), next = engine.initLeague(b.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect(b.count()).toBe(a.count());
    for (let week = 0; week < 17; week++) for (let g = 0; g < 16; g++) {
      expect(engine.simGame(next.schedule[week][g], next.teams, b.draw)).toEqual(baseline.engine.simGame(old.schedule[week][g], old.teams, a.draw));
    }
    engine.runOffseason(next, b.draw); baseline.engine.runOffseason(old, a.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect(b.count()).toBe(a.count());
  });

  it('keeps explicit legacy depth and saved old grades unchanged as an independent baseline', () => {
    const legacy = bakeFromRecord(record, meta, spot.heldOut ?? [], { legacyDepth: true });
    expect(legacy.ratingProblem).toBeNull(); expect(legacy.text).toBe(coreText);
    for (const t of legacy.depth) { const { abbr, ...depth } = t; expect(depth).toEqual(baseline.FO_DEPTH[abbr]); }
    const a = seeded(894), b = seeded(894), old = baseline.engine.initLeague(a.draw, { depth: baseline.FO_DEPTH }), next = engine.initLeague(b.draw, { depth: baseline.FO_DEPTH });
    expect(canonical(next)).toEqual(canonical(old)); expect(b.count()).toBe(a.count());
    const raw = JSON.stringify(next), restored = JSON.parse(raw);
    expect(engine.ensureFoLeagueIds(restored)).toBe(0); expect(JSON.stringify(restored)).toBe(raw);
    expect(everyone(restored).every(p => !p.openingRatingEvidence)).toBe(true);
    engine.injuryPass(restored.teams, b.draw); baseline.engine.injuryPass(old.teams, a.draw);
    for (let g = 0; g < 16; g++) expect(engine.simGame(restored.schedule[0][g], restored.teams, b.draw)).toEqual(baseline.engine.simGame(old.schedule[0][g], old.teams, a.draw));
    expect(canonical(restored)).toEqual(canonical(old));
  });

  it('reproduces all2163 frozen candidate grades fictional prices and years without named overrides', () => {
    const rated = buildFullRatings(inputs);
    expect(rated).toHaveLength(2163); expect(new Set(rated.map(p => p.key)).size).toBe(2163);
    expect(hash(JSON.stringify(rated.map(p => [p.key, p.ovr, p.salary, p.years]).sort()))).toBe(tupleHash);
    expect(buildFullRatings({ ...inputs, records: [...inputs.records].reverse() }).map(p => [p.key, p.ovr, p.salary, p.years]).sort()).toEqual(rated.map(p => [p.key, p.ovr, p.salary, p.years]).sort());
  });

  it('retains dated-role partial labels and their concrete limitation reasons', () => {
    const rated = buildFullRatings(inputs);
    expect(hash(JSON.stringify(rated.map(p => [p.key, p.evidence.partial, p.evidence.currentRole ?? null, p.evidence.datedRoles ?? []]).sort()))).toBe(partialHash);
    expect(rated.filter(p => p.evidence.partial)).toHaveLength(1323);
    let mismatches = 0, onlyMismatch = 0;
    for (let i = 0; i < rated.length; i++) {
      const r = rated[i], e = openingRatingEvidence(inputs.records[i], r, inputs.version, inputs.openingWindow);
      expect(e.partial).toBe(r.evidence.partial);
      if (r.evidence.partial) expect(e.partialReasons.length).toBeGreaterThan(0);
      if (r.evidence.currentRole && !r.evidence.datedRoles.includes(r.evidence.currentRole)) { mismatches++; expect(e.partialReasons).toContain('current-role-unmeasured'); if (e.partialReasons.length === 1) onlyMismatch++; }
    }
    expect(mismatches).toBe(406); expect(onlyMismatch).toBe(42);
  });

  it('initializes every candidate tuple while retaining32 exact untrimmed budgets membership and terms', () => {
    const a = seeded(889), b = seeded(889), old = baseline.engine.initLeague(a.draw, { depth: baseline.FO_DEPTH }), lg = engine.initLeague(b.draw, { depth: FO_DEPTH });
    const wanted = new Map(buildFullRatings(inputs).map(p => [p.key, p]));
    expect(everyone(lg)).toHaveLength(2163); expect(lg.schedule).toEqual(old.schedule); expect(b.count()).toBe(a.count());
    expect(canonical(lg.freeAgents)).toEqual(canonical(old.freeAgents));
    const heldTerms = (p: any) => { const { id, ovr, salary, pot, openingRatingEvidence, ...held } = p; return held; };
    for (const [abbr, t] of Object.entries(lg.teams)) {
      expect(engine.capUsed(t)).toBe(baseline.engine.capUsed(old.teams[abbr]));
      expect(t.players.map(heldTerms)).toEqual(old.teams[abbr].players.map(heldTerms));
      expect(t.practice!.map(heldTerms)).toEqual(old.teams[abbr].practice.map(heldTerms));
      for (const p of [...t.players, ...t.practice!]) {
        const r: any = wanted.get(`${abbr}|${p.name}|${p.pos}`); expect(r).toBeDefined();
        expect([p.ovr, p.salary, p.years]).toEqual([r.ovr, r.salary, r.years]);
      }
    }
  });

  it('rebakes the committed depth core and left-out files exactly without writing them', () => {
    const baked = bakeFromRecord(record, meta, spot.heldOut ?? []);
    expect(baked.ratingProblem).toBeNull(); expect(baked.text).toBe(coreText);
    expect(baked.depthText).toBe(norm(read('src/data/frontOfficeDepth.ts').toString()));
    expect(baked.leftJson).toBe(norm(read('scripts/data/nflRosters2026LeftOut.json').toString()));
  });

  it('saves only five original lineage fields below700KiB and reloads them without rerating', () => {
    const lg = engine.initLeague(seeded(889).draw, { depth: FO_DEPTH });
    for (const [abbr, t] of Object.entries(lg.teams)) for (const p of [...t.players, ...t.practice!]) {
      expect(p.openingRatingEvidence).toEqual(compact(FO_DEPTH[abbr].ratingEvidence![`${p.name}|${p.pos}`]));
      expect(p.openingRatingEvidence!.openingOvr).toBe(p.ovr);
      expect(Object.keys(p.openingRatingEvidence!).sort()).toEqual(['basis', 'modelVersion', 'openingOvr', 'originKey', 'partial']);
      expect(p.openingRatingEvidence).not.toBe(FO_DEPTH[abbr].ratingEvidence![`${p.name}|${p.pos}`]);
    }
    const raw = JSON.stringify(lg); expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(700 * 1024);
    const restored = JSON.parse(raw); expect(engine.ensureFoLeagueIds(restored)).toBe(0); expect(JSON.stringify(restored)).toBe(raw);
    const p = everyone(restored)[0], opening = clone(p.openingRatingEvidence); p.ovr += 1;
    expect(p.openingRatingEvidence).toEqual(opening); expect(FO_OPENING_RATING_VERSION).toBe(inputs.version);
    expect(FO_OPENING_RATING_WINDOW).toEqual(inputs.openingWindow);
    console.log('NFL_RATING_SAVE_SIZE', JSON.stringify({ rawBytes: Buffer.byteLength(raw), gzipBytes: gzipSync(raw).length, players: everyone(lg).length }));
  });

  it('shrinks coverage on targets rather than unrelated defensive snaps', () => {
    const low = outcome(opportunityFixture(2)), high = outcome(opportunityFixture(100));
    expect(low.evidence.confidence).toBeGreaterThan(0);
    expect(high.evidence.confidence).toBeGreaterThan(low.evidence.confidence * 4);
    expect(low.evidence.confidence).toBeLessThan(0.15); expect(high.evidence.confidence).toBeLessThan(1);
  });

  it('keeps missing defensive features absent instead of granting zero-valued evidence', () => {
    const fixture = opportunityFixture(null), r = outcome(fixture);
    expect(r.ovr).toBe(70); expect(r.evidence.confidence).toBe(0);
    const e = openingRatingEvidence(fixture.records[0], r, inputs.version, inputs.openingWindow);
    expect(e.basis).toBe('unmeasured-prior'); expect(e.partialReasons).toContain('no-measured-opportunities');
  });

  it('bounds the measured target before small-sample blending and requires dated normalizers', () => {
    const r = outcome(opportunityFixture(2, true));
    expect(r.ovr).toBeLessThanOrEqual(Math.round(70 + 28 * r.evidence.confidence));
    expect(r.ovr).toBeLessThan(80);
    const broken = clone(opportunityFixture(100)); broken.models.defense['2025|CB'].role = 'DE';
    expect(() => buildFullRatings(broken)).toThrow();
    const dated = opportunityFixture(100), moved = clone(dated);
    moved.records[0].sourceIdentity.depthChartPosition = 'DE'; moved.records[0].seed.pos = 'DL';
    expect(outcome(moved).ovr).toBe(outcome(dated).ovr);
    expect(outcome(moved).evidence.partial).toBe(true);
  });

  it('keeps source-stat observations and fitted models outside the browser data with a dated manifest', () => {
    expect(inputs.sourceManifest.acquisitions).toHaveLength(10);
    for (const source of inputs.sourceManifest.acquisitions) {
      expect(source.sourceUrl).toMatch(/^https:\/\/github\.com\/nflverse\/nflverse-data\/releases\/download\//);
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/); expect(source.retrievedUtc).toMatch(/^2026-10-02T/);
      expect(source.lastIntegrityCheckDate).toBe('2026-10-02'); expect(source.validationStatus).toContain('not independent fact verification');
    }
    expect(inputs.sourceManifest.checkpoint.version).toBe(FO_OPENING_RATING_VERSION);
    expect(inputs.sourceManifest.checkpoint.extraction).toContain('not a raw-CSV refit pipeline');
    expect(hash(read('scripts/data/nflRosters2026.json'))).toBe(inputs.sourceManifest.retainedOpeningSnapshot.sha256);
    expect(hash(JSON.stringify(record))).toBe(inputs.sourceManifest.retainedOpeningSnapshot.canonicalJsonSha256);
    expect(hash(norm(read('src/data/frontOfficePlayers.ts').toString()))).toBe(hash(norm(readFileSync(path.join(folder, 'frontOfficePlayers.ts')).toString())));
    const browserDepth = read('src/data/frontOfficeDepth.ts');
    expect(JSON.stringify(FO_DEPTH)).not.toMatch(/gsisId|"observations"|"metrics"|"typicalExposure"|nflFoRatingInputs2026/);
    const bundle = build({ entryPoints: [path.join(root, 'src/data/frontOfficeDepth.ts')], outfile: path.join(folder, 'browser.mjs'), bundle: true, platform: 'browser', format: 'esm', metafile: true, minify: true, logLevel: 'silent' });
    expect(Object.keys(bundle.metafile.inputs).some(file => /scripts\/data|nflFoRatingModel|nflFoRatingInputs/.test(file.replace(/\\/g, '/')))).toBe(false);
    expect(gzipSync(browserDepth).length).toBeLessThan(80 * 1024);
  });

  it('carries original player evidence through real trades cuts and practice promotion', () => {
    const lg = engine.initLeague(seeded(902).draw, { depth: FO_DEPTH });
    const mine = lg.teams.CLE, theirs = lg.teams.DAL;
    const offered = [...mine.players].sort((a, b) => engine.tradeValue(b) - engine.tradeValue(a))[0];
    const target = [...theirs.players].sort((a, b) => engine.tradeValue(a) - engine.tradeValue(b))[0];
    expect(offered.openingRatingEvidence).toBeDefined(); expect(target.openingRatingEvidence).toBeDefined();
    const offeredEvidence = clone(offered.openingRatingEvidence), targetEvidence = clone(target.openingRatingEvidence);
    expect(engine.proposeTrade(mine, theirs, offered.id, target.id, false, lg.cap)).toBe('accepted');
    expect(mine.players.find(p => p.id === target.id)!.openingRatingEvidence).toEqual(targetEvidence);
    expect(theirs.players.find(p => p.id === offered.id)!.openingRatingEvidence).toEqual(offeredEvidence);
    expect(engine.releasePlayer(mine, lg.freeAgents, target.id)).toBe(true);
    expect(lg.freeAgents.find(p => p.id === target.id)!.openingRatingEvidence).toEqual(targetEvidence);
    while (mine.players.length >= engine.DEEP_ROSTER_MAX) {
      const p = [...mine.players].sort((a, b) => a.ovr - b.ovr)[0]; expect(engine.releasePlayer(mine, lg.freeAgents, p.id)).toBe(true);
    }
    const promoted = [...mine.practice!].sort((a, b) => a.salary - b.salary)[0], original = clone(promoted.openingRatingEvidence);
    expect(engine.promoteFromPractice(mine, promoted.id, lg.cap)).toBe(true);
    expect(mine.players.find(p => p.id === promoted.id)).toBe(promoted); expect(promoted.openingRatingEvidence).toEqual(original);
    expect(original!.originKey.startsWith('CLE|')).toBe(true); expect(targetEvidence!.originKey.startsWith('DAL|')).toBe(true);
  });

  it('plays four actual seasons playoffs drafts and summers with bounded saves and a nonnegative normal cap', () => {
    const rng = seeded(1889); let lg = engine.initLeague(rng.draw, { depth: FO_DEPTH, userTeam: 'CLE' });
    let saves = 0, games = 0, playoffs = 0, drafted = 0, maxSave = 0;
    const checkState = () => {
      for (const t of Object.values(lg.teams)) {
        expect(engine.capRoom(t, lg.cap)).toBeGreaterThanOrEqual(0);
        expect(engine.capUsed(t)).toBe(Math.round((t.players.reduce((s, p) => s + p.salary, 0) + deadCapUsed(t)) * 10) / 10);
      }
    };
    const resume = (phase: string, extra = {}) => {
      const save = { league: lg, myTeam: 'CLE', phase, titles: lg.champions.filter(c => c.team === 'CLE').length, seasonsPlayed: lg.champions.length, draftClass: null, picksLeft: 0, ...extra };
      expect(isFrontOfficeSave(save, 'NFL', 17)).toBe(true);
      const raw = JSON.stringify(save); maxSave = Math.max(maxSave, Buffer.byteLength(raw)); expect(maxSave).toBeLessThanOrEqual(700 * 1024);
      const loaded = JSON.parse(raw); expect(engine.ensureFoLeagueIds(loaded.league, loaded.draftClass)).toBe(0); expect(JSON.stringify(loaded)).toBe(raw); lg = loaded.league; saves++;
    };
    for (let year = 0; year < 4; year++) {
      const season = lg.season;
      while (engine.deepOverLimit(lg.teams.CLE) > 0) {
        const t = lg.teams.CLE, starters = engine.starterIds(t), p = [...t.players].filter(p => !starters.has(p.id)).sort((a, b) => a.ovr - b.ovr)[0];
        expect(engine.releasePlayer(t, lg.freeAgents, p.id)).toBe(true);
      }
      checkState(); resume('hub');
      for (let week = 1; week <= 17; week++) {
        engine.injuryPass(lg.teams, rng.draw); engine.aiWeeklyMoves(lg, 'CLE', rng.draw);
        for (const g of lg.schedule[week - 1]) { const r = engine.simGame(g, lg.teams, rng.draw); expect([g.home, g.away]).toContain(r.winner); games++; }
        checkState();
        if (week < 17) { lg.week++; if (week === 9) resume('hub'); }
      }
      expect(Object.values(lg.teams).map(t => t.wins + t.losses)).toEqual(Array(32).fill(17));
      const post = engine.runPlayoffs(lg.teams, rng.draw); expect(post.rounds.flatMap(r => r.games)).toHaveLength(13); playoffs += 13;
      lg.champions.push({ season, team: post.champion }); lg.week = 18;
      resume('recap', { postseason: { champion: post.champion, rounds: post.rounds } });
      let cls = engine.generateDraftClass(rng.draw, 40, leagueNames(lg));
      for (let pick = 0; pick < 3; pick++) {
        const own = engine.prospectToPlayer(cls[0], rng.draw); expect(own).not.toBeNull(); lg.teams.CLE.players.push(own!); drafted++;
        const order = engine.draftOrder(lg.teams).filter(a => a !== 'CLE'), taken = cls.slice(1, 7);
        for (let i = 0; i < taken.length; i++) { const p = engine.prospectToPlayer(taken[i], rng.draw); expect(p).not.toBeNull(); lg.teams[order[i]].players.push(p!); drafted++; }
        cls = cls.slice(7); if (pick < 2) resume('draft', { draftClass: cls, picksLeft: 2 - pick });
      }
      engine.runOffseason(lg, rng.draw, 'CLE'); expect(lg.season).toBe(season + 1); expect(lg.week).toBe(1);
      checkState(); resume('hub');
    }
    expect([games, playoffs, drafted, saves]).toEqual([1088, 52, 84, 24]); expect(lg.champions.map(c => c.season)).toEqual([2026, 2027, 2028, 2029]); expect(lg.season).toBe(2030);
    console.log('NFL_RATING_CAMPAIGN', JSON.stringify({ games, playoffs, drafted, saves, maxSave, finalSeason: lg.season, scope: 'One seeded normal simulation; salary-matching trades are separately known to permit negative cap.' }));
  });

  it('refuses stale identity or source records before the real generator CLI writes outputs', () => {
    const altered = clone(record); altered.stats[0][4] = String(Number(altered.stats[0][4]) + 1);
    const bad = bakeFromRecord(altered, meta, spot.heldOut ?? []); expect(bad.ratingProblem).toMatch(/checkpoint/i);
    const project = mkdtempSync(path.join(os.tmpdir(), 'dukb-rating889-cli-'));
    try {
      mkdirSync(path.join(project, 'scripts/data'), { recursive: true }); mkdirSync(path.join(project, 'src/data'), { recursive: true });
      for (const file of ['src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts', 'scripts/data/nflRosters2026LeftOut.json', 'scripts/data/nflRosterSpotCheck.json', 'scripts/data/nflFoRatingInputs2026.json']) writeFileSync(path.join(project, file), read(file));
      writeFileSync(path.join(project, 'scripts/data/nflRosters2026.json'), JSON.stringify(altered));
      const generatorPath = process.env.NFL_RATING_GENERATOR_SOURCE || path.join(root, 'scripts/genFrontOfficeRoster.mjs');
      const source = readFileSync(generatorPath, 'utf8').replace(/const ROOT = [^\r\n]+/, "const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');").replace(/from ['"]\.\/lib\/([^'"]+)['"]/g, (_all, name) => 'from ' + JSON.stringify(name === 'nflFoRatingModel.mjs' && process.env.NFL_RATING_MODEL_SOURCE ? process.env.NFL_RATING_MODEL_SOURCE : path.join(root, 'scripts/lib', name).replace(/\\/g, '/')));
      const entry = path.join(project, 'scripts/entry.mjs'), out = path.join(project, 'scripts/generator.mjs'); writeFileSync(entry, source);
      build({ entryPoints: [entry], outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
      const outputs = ['src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts', 'scripts/data/nflRosters2026LeftOut.json'].map(file => [file, readFileSync(path.join(project, file))] as const);
      const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), out], { cwd: project, encoding: 'utf8', timeout: 15000 });
      expect(run.error).toBeUndefined(); expect(run.signal).toBeNull(); expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/Rating checkpoint does not match/); expect(run.stderr).not.toMatch(/SIM_OFFLINE_BLOCK/);
      for (const [file, bytes] of outputs) expect(readFileSync(path.join(project, file))).toEqual(bytes);
    } finally { removeOwnedTemp(project, 'dukb-rating889-cli-'); }
  }, 20000);

  it('deals the same board league for a seed as the tree recorded before the opening files were unified', () => {
    const digests = [1130, 1131, 1132].map(seed => hash(JSON.stringify(canonical(engine.initLeague(seeded(seed).draw, { depth: FO_DEPTH, userTeam: 'KC' })))));
    console.log('NFL_BOARD_LEAGUE_DIGESTS', JSON.stringify(digests));
    expect(digests).toEqual(boardLeagueDigests);
  }, 60000);

  it('loads a Release AK franchise unchanged and plays its next week exactly as Release AK would', () => {
    const ak = physical('0c66a559');
    const a = seeded(1130), b = seeded(1130);
    const old = ak.engine.initLeague(a.draw, { depth: ak.FO_DEPTH, userTeam: 'LV' }), twin = ak.engine.initLeague(b.draw, { depth: ak.FO_DEPTH, userTeam: 'LV' });
    const save = { league: old, myTeam: 'LV', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
    const raw = JSON.stringify(save), loaded = JSON.parse(raw);
    expect(isFrontOfficeSave(loaded, 'NFL', 17)).toBe(true);
    expect(engine.ensureFoLeagueIds(loaded.league, loaded.draftClass)).toBe(0); expect(JSON.stringify(loaded)).toBe(raw);
    const terms = (lg: any) => everyone(lg).map((p: any) => [p.name, p.pos, p.ovr, p.salary, p.pot, p.years, p.openingRatingEvidence ?? null]);
    expect(terms(loaded.league)).toEqual(terms(old)); expect(terms(loaded.league).length).toBeGreaterThan(2100);
    expect(everyone(loaded.league).every((p: any) => p.openingRatingEvidence?.modelVersion === 'nfl-v2.2-2026-10-02' && p.openingRatingEvidence.openingOvr === p.ovr)).toBe(true);
    engine.injuryPass(loaded.league.teams, a.draw); ak.engine.injuryPass(twin.teams, b.draw);
    for (let g = 0; g < 16; g++) expect(engine.simGame(loaded.league.schedule[0][g], loaded.league.teams, a.draw)).toEqual(ak.engine.simGame(twin.schedule[0][g], twin.teams, b.draw));
    expect(canonical(loaded.league)).toEqual(canonical(twin)); expect(a.count()).toBe(b.count());
  }, 60000);
});
