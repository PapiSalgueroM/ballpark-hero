import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const option = name => process.argv[process.argv.indexOf(name) + 1];
assert.ok(process.argv.includes('--out'), '--out is required');
const out = path.resolve(option('--out')), root = process.cwd();
await fs.mkdir(out, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sourcePaths = ['src/lib/clubManager.ts', 'src/lib/clubManagerPositions.ts', 'src/lib/clubManagerMatchPlans.ts', 'src/lib/clubManagerTacticsCore.ts', 'src/lib/saveFence.ts', 'src/hooks/useClubManager.ts', 'src/pages/ClubManager.tsx', 'src/components/club-manager/TacticsScreen.tsx', 'src/components/club-manager/MatchPlansCard.tsx', 'src/components/club-manager/LiveSimScreen.tsx'];
const sourceBefore = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await fs.readFile(file))])));
const entry = path.join(out, 'engine-entry.mjs'), bundle = path.join(out, 'engine-bundle.mjs');
await fs.writeFile(entry, `
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
};
export const cm = await import(${JSON.stringify(path.join(root, 'src/lib/clubManager.ts'))});
export const plans = await import(${JSON.stringify(path.join(root, 'src/lib/clubManagerMatchPlans.ts'))});
export const tactics = await import(${JSON.stringify(path.join(root, 'src/lib/clubManagerTactics.ts'))});
export const fence = (await import(${JSON.stringify(path.join(root, 'src/lib/saveFence.ts'))})).saveFence;
`, { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const { cm, plans, fence } = await import(pathToFileURL(bundle).href);
assert.equal(cm.SAVE_KEY, 'dukb-club-manager-save');
const registrations = cm.engineRegistrations(), random = Math.random, now = Date.now;
const manifest = {
  scope: 'Explicitly fictional custom-club saves from the actual engine and fenced writer/reader. Seeded-state App QA, not natural progression.',
  fixtureOnlySeed: 733, fixtureOnlyDate: '2026-11-03T12:00:00.000Z', browserRngOrClockOverrides: false,
  saveKey: cm.SAVE_KEY, sourceBefore, cases: [], bundle: 'engine-bundle.mjs',
};
try {
  let seed = 733;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 10, 3, 12);
  let career = cm.startCareer('Tactics Shape Lab', 'now', {
    name: 'Tactics Shape Lab', leagueId: 'premier', stadium: 'Lab Ground', budgetTier: 'small', quality: 72, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'TS' },
  });
  const traversed = [];
  while (cm.nextFixture(career).kind === 'window' && traversed.length < 12) {
    const result = cm.playNextEntry(career);
    traversed.push({ week: career.week, kind: result.kind });
    assert.equal(result.kind, 'window', 'Only real calendar-window actions are allowed in setup');
    career = result.state;
  }
  assert.equal(cm.nextFixture(career).kind, 'match', 'The fixture must be ready for native Play Live');
  assert.ok(!career.live && !career.sacked && !career.wilderness);
  const formation = cm.FORMATIONS[career.formationIndex];
  assert.equal(formation.slots.length, 11);
  assert.equal(formation.slots.filter(slot => slot.allowed.length === 1 && slot.allowed[0] === 'GK').length, 1);
  assert.equal(cm.resolveXI(career).filter(Boolean).length, 11);
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(career), true);
  career = cm.loadCareer();
  assert.ok(career && career.clubName === 'Tactics Shape Lab');
  assert.equal(cm.saveCareer(career), true);
  const normal = localStorage.getItem(cm.SAVE_KEY);
  assert.deepEqual(cm.loadCareer(), career);
  for (const key of ['normal', 'unsupported']) {
    let state = structuredClone(career);
    if (key === 'unsupported') {
      state = plans.saveMatchPlan(state, 0, 'Known preview');
      assert.ok(state);
      state.matchPlans.push({ version: 99, slot: 2, name: 'Future held plan', opaque: { keep: 'unknown tactics sentinel', axes: [1, 2, 3] } });
      assert.equal(plans.canEditMatchPlans(state), false);
      assert.equal(plans.matchPlansOf(state).length, 1);
      assert.ok(plans.previewMatchPlan(state, 0));
    }
    localStorage.clear(); fence.adopt(cm.SAVE_KEY);
    assert.equal(cm.saveCareer(state), true);
    state = cm.loadCareer();
    assert.ok(state && state.clubName === career.clubName);
    assert.equal(cm.saveCareer(state), true);
    const raw = localStorage.getItem(cm.SAVE_KEY);
    assert.deepEqual(cm.loadCareer(), state);
    if (key === 'normal') assert.equal(raw, normal);
    else assert.equal(state.matchPlans.find(plan => plan.version === 99).opaque.keep, 'unknown tactics sentinel');
    await fs.writeFile(path.join(out, key + '.json'), raw, { flag: 'wx' });
    manifest.cases.push({
      key, file: key + '.json', sha256: hash(raw), clubName: state.clubName, week: state.week, season: state.season,
      formationIndex: state.formationIndex, xiIds: state.xiIds, shape: state.customShape ?? null,
      slots: formation.slots.map(slot => ({ label: slot.label, allowed: slot.allowed, x: slot.x, y: slot.y })),
      nextFixture: cm.nextFixture(state), traversed,
    });
  }
} finally {
  Math.random = random; Date.now = now; cm.restoreEngineRegistrations(registrations);
}
manifest.sourceAfter = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await fs.readFile(file))])));
assert.deepEqual(manifest.sourceAfter, sourceBefore);
assert.deepEqual(manifest.cases.map(row => row.key), ['normal', 'unsupported']);
manifest.bundleSha256 = hash(await fs.readFile(bundle));
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log('cmCustomTacticsFixtures: green. Two fictional saves passed the real codec, next-match and kept-data checks.');
