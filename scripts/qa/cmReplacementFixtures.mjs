import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CM_SOURCE_PINS = {
  'src/lib/clubManager.ts': 'e3c9bcf0aec0f1e1caeb27d38d506d591d694237',
  'src/components/club-manager/TrainingScreen.tsx': '1247042a9e57c9bd89958959dff8c1490f633313',
  'src/hooks/useClubManager.ts': 'fe8d97dbfabaea602968e9cca25d4930895093e1',
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const player = (state, id) => { const p = state.squad.find(row => row.id === id); assert(p); return p; };

// These are declared generated-player QA saves, not a played nine-week career.
export function createCmReplacementFixtures({ engine: cm, fence }) {
  const make = completion => {
    const name = completion ? 'Replacement Completion Borough' : 'Replacement Choice Borough';
    let c = cm.startCareer(name, cm.DEFAULT_ERA_ID, {
      name, stadium: 'Learning Park', quality: 70, budgetTier: 'mid',
      leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
      crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RC' },
    });
    cm.ensureAcademy(c);
    assert(c.squad.length >= 11 && c.squad.every(p => p.generated === true));
    assert(c.squad.every(p => !p.retraining && p.trainingExposure === undefined));
    const formation = cm.FORMATIONS[0];
    assert.equal(formation.slots.length, 11); assert(formation.slots[8].allowed.includes('RW'));
    c.squad = c.squad.map((p, i) => ({ ...p,
      position: i < 11 ? formation.slots[i].allowed[0] : p.position,
      secondaryPositions: [], rating: 70, potential: 70, age: 26,
      fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0, contractYears: 5,
    }));
    const target = c.squad[8];
    Object.assign(target, { position: 'LW', secondaryPositions: ['RW', 'CM'], potential: 90, age: 21 });
    c.xiIds = c.squad.slice(0, 11).map(p => p.id);
    c.budget = 1000; c.wageCap = 100000; c.form = [];
    c.training = { intensity: 'normal', focus: 'balanced' };
    c.formationIndex = 0; c.mentality = 'balanced';
    c.setPieces = Object.fromEntries(cm.SET_PIECE_KEYS.map(key => [key, null])); c.shootoutOrder = [];
    const week = c.calendar.findIndex(entry => entry.type === 'window');
    assert(week >= 0, 'Real constructor must provide its paid January window');
    c.week = week; c.press.lastWeek = week; c.transferWindow = null; c.windowWeeksLeft = 0;
    if (completion) {
      c = cm.startRetraining(c, target.id, 'ST', undefined, 'CM');
      assert(c); const r = player(c, target.id).retraining;
      assert.equal(r.replace, 'CM'); assert.equal(r.to, 'ST'); assert(r.weeksTotal > 1);
      r.weeksLeft = 1;
    }
    localStorage.clear(); fence.adopt(cm.SAVE_KEY);
    assert.equal(cm.saveCareer(c), true); c = cm.loadCareer(); assert(c);
    assert.equal(cm.saveCareer(c), true);
    const raw = localStorage.getItem(cm.SAVE_KEY), loaded = cm.loadCareer(); assert(loaded);
    assert.equal(cm.saveCareer(loaded), true); assert.equal(localStorage.getItem(cm.SAVE_KEY), raw);
    const saved = JSON.parse(raw), p = player(saved, target.id);
    assert.equal(saved.calendar[saved.week].type, 'window'); assert.equal(saved.live ?? null, null);
    assert.deepEqual(p.secondaryPositions, ['RW', 'CM']); assert.equal(p.position, 'LW');
    assert.equal(saved.xiIds[8], p.id); assert.equal(cm.fitPenalty(p, formation.slots[8]), 0);
    assert.equal(cm.developingPlayers(saved)[0].id, p.id);
    assert(saved.squad.every(p => p.fitness === 100 && p.injuryWeeks === 0 && p.trainingExposure === undefined));
    const course = completion ? p.retraining : {
      to: 'ST', weeksLeft: cm.retrainWeeks(saved, p, 'ST'), weeksTotal: cm.retrainWeeks(saved, p, 'ST'), replace: 'CM',
    };
    if (completion) assert(cm.validRetrainingCourse(p, 'ST'));
    else assert.equal(p.retraining, undefined);
    return { raw, expected: { key: cm.SAVE_KEY, kind: completion ? 'completion' : 'choice',
      clubName: saved.clubName, season: saved.season, week: saved.week,
      target: { id: p.id, name: p.name, position: p.position }, positions: ['RW', 'CM'],
      course: clone(course), slot: 8, basePlan: clone(saved.training), xiIds: clone(saved.xiIds),
      players: clone(saved.squad),
      scope: completion
        ? 'Independent declared near-complete saved course made through real startRetraining, then staged at one paid week. No natural nine-week progression claim.'
        : 'Independent generated-player initial save with no course. Native choice of which learned position to replace, pause/resume/Stop and exact reloads.' } };
  };
  return { choice: make(false), completion: make(true) };
}

export async function inventory(directory) {
  const rows = [];
  async function walk(relative = '') {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile()); const bytes = await fs.readFile(path.join(directory, file));
        rows.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0, name); return process.argv[i + 1]; };
  const root = process.cwd(), out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist')), core = arg('--core');
  assert(/^[a-f0-9]{40}$/.test(core));
  assert(!out.toLowerCase().startsWith(root.toLowerCase() + path.sep.toLowerCase()), 'Fixture output stays outside tracked workspace');
  await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  const source = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  for (const [file, pin] of Object.entries(CM_SOURCE_PINS)) {
    assert.equal(execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim(), pin, file);
  }
  const sourceBefore = await source(), distBefore = await inventory(dist);
  const { build } = await import('esbuild');
  const bundle = 'cm-replacement-engine.mjs';
  const entry = `const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};export const cm=await import(${JSON.stringify(path.join(root, 'src/lib/clubManager.ts'))});export const fence=await import(${JSON.stringify(path.join(root, 'src/lib/saveFence.ts'))});`;
  await build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'cm-replacement-producer.mjs', loader: 'js' },
    bundle: true, platform: 'node', format: 'esm', target: 'node24', alias: { '@': path.join(root, 'src') }, outfile: path.join(out, bundle) });
  const engine = await import(pathToFileURL(path.join(out, bundle)).href);
  const fixtures = createCmReplacementFixtures({ engine: engine.cm, fence: engine.fence.saveFence });
  const declared = {};
  for (const [name, fixture] of Object.entries(fixtures)) {
    const file = name + '.json'; await fs.writeFile(path.join(out, file), fixture.raw);
    declared[name] = { file, sha256: sha(fixture.raw), key: fixture.expected.key, expected: fixture.expected };
  }
  const sourceAfter = await source(); assert.deepEqual(sourceAfter, sourceBefore);
  assert.deepEqual(await inventory(dist), distBefore);
  const manifest = { schema: 1, core, sourcePins: CM_SOURCE_PINS, sourceBefore, sourceAfter,
    distBefore, distDigest: sha(JSON.stringify(distBefore)), bundle, bundleSHA: sha(await fs.readFile(path.join(out, bundle))),
    fixtures: declared, overrides: { browserClock: false, browserRng: false, appHooks: false },
    scope: 'Six CM native contexts only: two independent declared generated-player saves at three widths.' };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('cmReplacementFixtures: two real-codec fixtures, full source and completed-output holds passed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
