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
import { FO_DEPTH, FO_OPENING_RATING_BASE, FO_OPENING_RATING_VERSION, FO_OPENING_RATING_WINDOW } from '@/data/frontOfficeDepth';
import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { buildFullRatings, openingRatingEvidence, OFFENSE_LAYER } from '../../scripts/lib/nflFoRatingModel.mjs';
import { bakeFromRecord, readTeamMeta, readOffenseLayer } from '../../scripts/genFrontOfficeRoster.mjs';

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
/* Round 1130, recorded 2026-10-08: the same 2,163 tuples with the offense layer (model nfl-v2.3-2026-10-08).
   423 men carry another number than on v2.2, every one a quarterback, back, receiver or tight end. */
const tupleHashV23 = 'b51b9d300a4433703f44bd8623b2976c2e3a0a8f13564058d5676cc790b15d9b';
/** The layer with what it reads from the two committed files (the production lines and the fullback ledger). */
const offenseLayer = () => readOffenseLayer(inputs);
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
   deals (depth passed, the GM on Kansas City) for three seeds. Unifying the files did not move one byte of it
   (step 3 of the round passed these unedited on the committed files), and the frozen arm of the generator,
   { ratingModel: 'v2.2' }, must go on dealing exactly this league: it is what "main" means in every comparison
   scripts/simFoRatingOrder.mjs makes. */
const boardLeagueDigestsV22 = [
  'a68d25af1fdd8cd4a2904cc13bab51ec89225f0955c7a54e631f73b71d7b4c17',
  'd45c32c5a14b6353330426e3df369ef42a4033b77b59a1c09b475b5e0d7367ff',
  '4823ec09ec20e5b1ade41182e3e3f8e989b9b4994b9a60ce921dc8a6c6f33cf0',
];
/* Re-recorded once, 2026-10-08, when the offense layer became the default (model nfl-v2.3-2026-10-08): the same
   three seeds on the committed files. 423 of the 2,163 men carry another number than in the league above, every
   one a quarterback, back, receiver or tight end; every lineman and defender is the same man with the same number. */
const boardLeagueDigests = [
  'a43660e29ceec1925fd3771184c2878f4a7e918aae7458654e2b33f3c23c7a8d',
  '7578b53a5edea40e60e1321df949bff0c3906e392a1c199b4369b6fee94acd46',
  '9ec6dba554f8c1a25658282309589c2f4d7a500f69ee45e41d569de3ebe1f829',
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
/* Round 1130: TODAY's engine dealt the physical 56356be9 starters file. The committed starters file now carries
   the opening estimate, so "the engine did not move" is proved with the same old data on both sides. Under an
   engine control of scripts/simNflOpeningRatings.mjs this bundles the engine under test, not the file on disk. */
let todayOnOld: any;
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
  const swapped = JSON.parse(process.env.NO_DOUBLE_SWAP || '{}')['@/lib/frontOffice'];
  const todayOutput = path.join(folder, 'today-on-old.cjs');
  const today = build({ stdin: { contents: 'export * as engine from ' + JSON.stringify((swapped ?? path.join(root, 'src/lib/frontOffice.ts')).replace(/\\/g, '/')) + ';', resolveDir: root }, outfile: todayOutput, bundle: true, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent', alias: { '@/data/frontOfficePlayers': path.join(folder, 'frontOfficePlayers.ts'), '@': path.join(root, 'src') } });
  expect(Object.keys(today.metafile!.inputs).some(file => /supabase|fetchPlayers|useAuth/.test(file))).toBe(false);
  expect(Object.keys(today.metafile!.inputs).some(file => file.replace(/\\/g, '/').endsWith('src/data/frontOfficePlayers.ts'))).toBe(false);
  todayOnOld = createRequire(import.meta.url)(todayOutput);
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
    /* Round 1130: today's engine against the old engine on the SAME physical 56356be9 starters file (todayOnOld).
       The committed starters file carries the opening estimate now, so it is no longer the old league's data. */
    const now = todayOnOld.engine;
    const a = seeded(889), b = seeded(889), old = baseline.engine.initLeague(a.draw), next = now.initLeague(b.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect(b.count()).toBe(a.count());
    for (let week = 0; week < 17; week++) for (let g = 0; g < 16; g++) {
      expect(now.simGame(next.schedule[week][g], next.teams, b.draw)).toEqual(baseline.engine.simGame(old.schedule[week][g], old.teams, a.draw));
    }
    now.runOffseason(next, b.draw); baseline.engine.runOffseason(old, a.draw);
    expect(canonical(next)).toEqual(canonical(old)); expect(b.count()).toBe(a.count());
  });

  it('keeps explicit legacy depth and saved old grades unchanged as an independent baseline', () => {
    const legacy = bakeFromRecord(record, meta, spot.heldOut ?? [], { legacyDepth: true });
    /* Round 1130: the legacy bake is the SEED starters text, and it still equals the physical 56356be9 file byte
       for byte (CRLF folded); the committed starters file now carries the opening estimate instead. The league
       is dealt by today's engine on that old starters file, and the save it wrote loads on the engine vitest
       imports (which reads no data file on load). */
    expect(legacy.ratingProblem).toBeNull(); expect(legacy.text).toBe(norm(readFileSync(path.join(folder, 'frontOfficePlayers.ts')).toString()));
    expect(legacy.text).not.toBe(coreText);
    for (const t of legacy.depth) { const { abbr, ...depth } = t; expect(depth).toEqual(baseline.FO_DEPTH[abbr]); }
    const now = todayOnOld.engine;
    const a = seeded(894), b = seeded(894), old = baseline.engine.initLeague(a.draw, { depth: baseline.FO_DEPTH }), next = now.initLeague(b.draw, { depth: baseline.FO_DEPTH });
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
    /* Round 1130: the same three promises for the layer arm, and the layer moves no lineman and no defender. */
    const layer = offenseLayer(), layered = buildFullRatings(inputs, layer);
    expect(layered).toHaveLength(2163); expect(new Set(layered.map(p => p.key)).size).toBe(2163);
    expect(hash(JSON.stringify(layered.map(p => [p.key, p.ovr, p.salary, p.years]).sort()))).toBe(tupleHashV23);
    expect(buildFullRatings({ ...inputs, records: [...inputs.records].reverse() }, layer).map(p => [p.key, p.ovr, p.salary, p.years]).sort()).toEqual(layered.map(p => [p.key, p.ovr, p.salary, p.years]).sort());
    const frozen = new Map(rated.map(p => [p.key, p]));
    let held = 0, moved = 0;
    for (const p of layered) {
      const was: any = frozen.get(p.key);
      if (['OL', 'DL', 'LB', 'DB'].includes(p.pos)) { expect([p.ovr, p.years], p.key).toEqual([was.ovr, was.years]); held++; }
      else if (p.ovr !== was.ovr) moved++;
    }
    expect(held).toBe(1456); expect(moved).toBe(423);
    console.log('NFL_LAYER_MOVES', JSON.stringify({ linemenAndDefendersHeld: held, offenseMenMoved: moved }));
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
    /* Round 1130, the layer arm: the mark only ever goes ON, and only for a fullback two publishers confirm.
       1,323 marked on v2.2, 1,334 with the layer: eleven of the fifteen confirmed fullbacks were not marked
       before (the other four held no opportunities and were). */
    const layer = offenseLayer(), layered = buildFullRatings(inputs, layer);
    const before = new Set(rated.filter(p => p.evidence.partial).map(p => p.key)), after = new Set(layered.filter(p => p.evidence.partial).map(p => p.key));
    expect(after.size).toBe(1334); expect(layer.fullbacks.size).toBe(15);
    expect([...before].filter(key => !after.has(key))).toEqual([]);
    const gained = [...after].filter(key => !before.has(key));
    expect(gained).toHaveLength(11); expect(gained.every(key => layer.fullbacks.has(key))).toBe(true);
    for (let i = 0; i < layered.length; i++) {
      const r = layered[i], e = openingRatingEvidence(inputs.records[i], r, layer.version, inputs.openingWindow);
      expect(e.partial).toBe(r.evidence.partial); expect(e.modelVersion).toBe(OFFENSE_LAYER.version);
      if (layer.fullbacks.has(r.key)) { expect(r.ovr).toBe(OFFENSE_LAYER.fullbackOvr); expect(e.partial).toBe(true); expect(e.partialReasons).toEqual(['fullback-role-unmeasured']); expect(['unmeasured-prior', 'draft-prior']).toContain(e.basis); }
      else expect(e.partialReasons).not.toContain('fullback-role-unmeasured');
    }
  });

  it('initializes every candidate tuple while retaining32 exact untrimmed budgets membership and terms', () => {
    const a = seeded(889), b = seeded(889), old = baseline.engine.initLeague(a.draw, { depth: baseline.FO_DEPTH }), lg = engine.initLeague(b.draw, { depth: FO_DEPTH });
    /* Round 1130: the league a board deals is the layer arm, model nfl-v2.3 */
    const wanted = new Map(buildFullRatings(inputs, offenseLayer()).map(p => [p.key, p]));
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
    expect(p.openingRatingEvidence).toEqual(opening); expect(FO_OPENING_RATING_VERSION).toBe(OFFENSE_LAYER.version); expect(OFFENSE_LAYER.base).toBe(inputs.version); expect(FO_OPENING_RATING_BASE).toBe(inputs.version);
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
    expect(inputs.sourceManifest.checkpoint.version).toBe(FO_OPENING_RATING_BASE);
    expect(inputs.sourceManifest.checkpoint.extraction).toContain('not a raw-CSV refit pipeline');
    /* The pin is taken over LF text, which is what the repository stores and a runner checks out,
       so the owner's CRLF checkout hashes the same (the rule simManagerAppealIsolation's textHash follows). */
    expect(hash(norm(read('scripts/data/nflRosters2026.json').toString()))).toBe(inputs.sourceManifest.retainedOpeningSnapshot.sha256);
    expect(hash(JSON.stringify(record))).toBe(inputs.sourceManifest.retainedOpeningSnapshot.canonicalJsonSha256);
    /* Round 1130: this line pinned the committed starters file to the 56356be9 bytes, the pin the round exists
       to break (the file carries the opening estimate now). What it really proved lives on: the legacy case
       above compares the SEED bake with those bytes, and here the committed file must differ from them while
       no source observation, production line or role ledger reaches either browser file. */
    expect(hash(norm(read('src/data/frontOfficePlayers.ts').toString()))).not.toBe(hash(norm(readFileSync(path.join(folder, 'frontOfficePlayers.ts')).toString())));
    const browserDepth = read('src/data/frontOfficeDepth.ts');
    expect(JSON.stringify(FO_DEPTH)).not.toMatch(/gsisId|"observations"|"metrics"|"typicalExposure"|nflFoRatingInputs2026/);
    expect(JSON.stringify(FO_TEAMS)).not.toMatch(/gsisId|"observations"|"metrics"|"typicalExposure"|nflFoRatingInputs2026|rushYds|recYds|passYds/);
    const bundle = build({ entryPoints: [path.join(root, 'src/data/frontOfficeDepth.ts'), path.join(root, 'src/data/frontOfficePlayers.ts')], outdir: path.join(folder, 'browser'), bundle: true, platform: 'browser', format: 'esm', metafile: true, minify: true, logLevel: 'silent' });
    expect(Object.keys(bundle.metafile.inputs).some(file => /scripts\/data|nflFoRatingModel|nflFoRatingInputs|nfl2025Production|nflFullbackRoles/.test(file.replace(/\\/g, '/')))).toBe(false);
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
    /* and the frozen arm still deals the league main dealt: today's engine over the files { ratingModel: 'v2.2' } bakes */
    const frozen = bakeFromRecord(record, meta, spot.heldOut ?? [], { ratingModel: 'v2.2' });
    expect(frozen.ratingProblem).toBeNull(); expect(frozen.ratingVersion).toBe(inputs.version);
    const dir = path.join(folder, 'frozen-arm'); mkdirSync(dir);
    writeFileSync(path.join(dir, 'frontOfficePlayers.ts'), frozen.text); writeFileSync(path.join(dir, 'frontOfficeDepth.ts'), frozen.depthText);
    const swapped = JSON.parse(process.env.NO_DOUBLE_SWAP || '{}')['@/lib/frontOffice'], output = path.join(dir, 'frozen.cjs');
    build({ stdin: { contents: 'export * as engine from ' + JSON.stringify((swapped ?? path.join(root, 'src/lib/frontOffice.ts')).replace(/\\/g, '/')) + "; export {FO_DEPTH} from './frontOfficeDepth.ts';", resolveDir: dir }, outfile: output, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@/data/frontOfficePlayers': path.join(dir, 'frontOfficePlayers.ts'), '@/data/frontOfficeDepth': path.join(dir, 'frontOfficeDepth.ts'), '@': path.join(root, 'src') } });
    const arm = createRequire(import.meta.url)(output);
    const frozenDigests = [1130, 1131, 1132].map(seed => hash(JSON.stringify(canonical(arm.engine.initLeague(seeded(seed).draw, { depth: arm.FO_DEPTH, userTeam: 'KC' })))));
    expect(frozenDigests).toEqual(boardLeagueDigestsV22); expect(frozenDigests).not.toEqual(digests);
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

  it('prints one opening number per man in the starters and depth files with no override left', () => {
    /* Round 1130. Every man of the pool sits on exactly one row (a starters row, a bench row or a practice row),
       that row's number is the one his lineage records, and the depth file holds no second number for anyone.
       Checked twice: on the committed browser modules, and on what the generator bakes today. */
    const depthSource = norm(read('src/data/frontOfficeDepth.ts').toString());
    expect(depthSource).not.toMatch(/fullOpening/); expect(JSON.stringify(FO_DEPTH)).not.toMatch(/fullOpening/);
    const baked = bakeFromRecord(record, meta, spot.heldOut ?? []);
    expect(baked.ratingProblem).toBeNull();
    const shipped = { teams: FO_TEAMS.map(t => ({ abbr: t.abbr, players: t.players })), depth: Object.entries(FO_DEPTH).map(([abbr, d]) => ({ abbr, ...d })) };
    let moved = 0;
    for (const side of [shipped, { teams: baked.teams, depth: baked.depth }]) {
      const rows = new Map<string, number[]>();
      const put = (abbr: string, p: any) => { const key = `${abbr}|${p.name}|${p.pos}`; rows.set(key, [...(rows.get(key) ?? []), p.ovr]); };
      for (const t of side.teams) for (const p of t.players) put(t.abbr, p);
      for (const d of side.depth as any[]) for (const p of [...d.bench, ...d.practice]) put(d.abbr, p);
      expect(rows.size).toBe(2163); expect([...rows.keys()].sort()).toEqual(inputs.records.map((r: any) => r.key).sort());
      for (const d of side.depth as any[]) {
        expect(d.fullOpening).toBeUndefined();
        for (const [nameAndPos, e] of Object.entries(d.ratingEvidence as Record<string, any>)) {
          const numbers = rows.get(`${d.abbr}|${nameAndPos}`);
          expect(numbers, `${d.abbr}|${nameAndPos}`).toEqual([e.openingOvr]); expect(e.originKey).toBe(`${d.abbr}|${nameAndPos}`);
        }
        expect(Object.keys(d.ratingEvidence).length).toBe([...rows.keys()].filter(key => key.startsWith(d.abbr + '|')).length);
      }
    }
    /* Not vacuous: the selection rule's seed number is a different number for most of the fifteen. */
    const shippedOvr = new Map<string, number>(FO_TEAMS.flatMap(t => t.players.map(p => [`${t.abbr}|${p.name}|${p.pos}`, p.ovr] as [string, number])));
    for (const t of baked.seedTeams) for (const p of t.players) if (shippedOvr.get(`${t.abbr}|${p.name}|${p.pos}`) !== p.ovr) moved++;
    expect(baked.seedTeams.flatMap((t: any) => t.players)).toHaveLength(480); expect(moved).toBeGreaterThan(240);
    console.log('NFL_ONE_NUMBER', JSON.stringify({ men: 2163, fifteenWhoseSeedDiffers: moved }));
  }, 60000);
});
