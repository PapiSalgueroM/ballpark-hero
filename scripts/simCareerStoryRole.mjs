/** Rounds 1188 to 1191: copied-source outcomes against the actual AR engine.
 * Run remotely: CAREER_STORY_ROLE_CONTROL=all node scripts/simCareerStoryRole.mjs.
 * No source file is written. Every fault requires its exact AssertionError group.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
export const STORY_ROLE_BASE = 'fa24b3848d99e29367486489b081a483dc544206';
const BASE_TREE = 'd9175fa74fc5784ba6acfd1a62f4592cb106f22f';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const sha = value => createHash('sha256').update(value).digest('hex');
const textAt = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const originalAt = file => execFileSync('git', ['show', `${STORY_ROLE_BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8e6 }).replaceAll('\r\n', '\n');
const copy = value => structuredClone(value);
const serial = value => JSON.stringify(value);

export function withCareerStorySeed(seed, fn) {
  let n = seed >>> 0;
  const draws = [];
  const realRandom = Math.random, realNow = Date.now;
  Math.random = () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(value);
    return value;
  };
  Date.now = () => 1791586800000;
  try { return { value: fn(), draws }; } finally { Math.random = realRandom; Date.now = realNow; }
}

/** Uses Git's frozen source for every transitive src import in the original arm.
 * Faults are confined to current copied input. Their unique anchors must load.
 */
export async function bundleCareerStoryRole({ original = false, patches = [], expose = false } = {}) {
  const require = createRequire(path.join(ROOT, 'package.json'));
  const esbuild = require('esbuild');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-story-role-'));
  const outfile = path.join(dir, 'engine.cjs');
  const applied = new Set(), loaded = [];
  const rootSrc = path.join(ROOT, 'src') + path.sep;
  const enginePath = path.join(ROOT, ENGINE).replaceAll('\\', '/');
  const extra = original ? '' : ['role:soccerCareerRole', 'milestone:soccerCareerMilestone', 'squad:soccerClubSquad', 'sheet:soccerClubSquadSheet'].map(item => { const [name, file] = item.split(':'); return `export * as ${name} from '${path.join(ROOT, 'src/lib', file + '.ts').replaceAll('\\', '/')}';`; }).join('\n');
  const plugin = { name: 'career-story-role-source', setup(build) {
    build.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      if (!args.path.startsWith(rootSrc)) return undefined;
      const file = path.relative(ROOT, args.path).replaceAll('\\', '/');
      let contents = original ? originalAt(file) : textAt(file);
      const beforeSha256 = sha(contents);
      for (const patch of patches.filter(p => p.file === file)) {
        assert.equal(contents.split(patch.from).length - 1, 1, `unique control anchor ${patch.id}`);
        const before = contents;
        contents = contents.replace(patch.from, patch.to);
        assert.notEqual(contents, before, `effective control ${patch.id}`);
        applied.add(patch.id);
        patch.receipt = { id: patch.id, file, beforeSha256: sha(before), afterSha256: sha(contents), effective: true };
      }
      if (expose && file === ENGINE) contents += '\nexport { generateNewsArticles as __storyRoleNews };\n';
      loaded.push({ file, sha256: beforeSha256, afterSha256: sha(contents), original });
      return { contents, loader: file.endsWith('.tsx') ? 'tsx' : file.endsWith('.json') ? 'json' : 'ts' };
    });
  }};
  try {
    await esbuild.build({ stdin: { contents: `export * as soccer from '${enginePath}';\n${extra}`, resolveDir: ROOT, sourcefile: 'story-role-entry.ts' }, bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile, logLevel: 'error', plugins: [plugin], alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' } });
    for (const patch of patches) assert.ok(applied.has(patch.id), `control module loaded ${patch.id}`);
    globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const result = require(outfile);
    return { ...result, loaded, faultEdits: patches.map(p => p.receipt) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function sourceHashes() {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'src', 'scripts', '.github/workflows'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  const hashes = {};
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    hashes[file] = sha(bytes);
  }
  return hashes;
}

function observed(E, fn, input, seed) {
  const before = serial(input);
  const result = withCareerStorySeed(seed, () => fn(E, copy(input)));
  assert.equal(serial(input), before, 'input remains byte-identical');
  return result;
}

function newPlaying(E, seed, position = 'CM') {
  return withCareerStorySeed(seed, () => {
    const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map(key => [key, 75]));
    let state = E.initCareer(`Story Role ${seed}`, 'England', position, '2020s', stats, 75, 2020, E.FALLBACK_CLUBS, null, 88);
    for (let guard = 0; guard < 10 && state.phase !== 'playing'; guard++) {
      if (state.phase === 'youth') state = E.advanceYouthYear(state, E.FALLBACK_CLUBS);
      else if (state.phase === 'contract_offer' && state.pendingOffers.length) state = E.acceptOffer(state, state.pendingOffers[0]);
      else throw new Error(`natural start failed at ${state.phase}`);
    }
    assert.equal(state.phase, 'playing', 'natural first contract reaches playing');
    return state;
  });
}

async function runOutcomes(control = '') {
  const before = sourceHashes();
  assert.equal(execFileSync('git', ['rev-parse', `${STORY_ROLE_BASE}^{tree}`], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_TREE, 'original AR tree');
  const artifactRoot = path.resolve(ROOT, process.env.CAREER_STORY_ROLE_ARTIFACTS || '.tmp-fx/career-story-role/outcomes');
  const out = path.join(artifactRoot, control || 'healthy');
  fs.mkdirSync(out, { recursive: true });
  const save = (name, value) => fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(value, null, 2));
  const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(), baseHead: STORY_ROLE_BASE, baseTree: BASE_TREE, control, cases: [], counts: {}, faultEdits: [], sourceHeld: false };
  const check = async (id, fn) => { try { await fn(); report.cases.push({ id, passed: true }); console.log(`PASS [${id}]`); } catch (error) { report.cases.push({ id, passed: false, name: error.name, message: error.message, stack: error.stack }); console.error(`FAIL [${id}] ${error.name}: ${error.message}`); } };
  const original = await bundleCareerStoryRole({ original: true, expose: true });
  const uncopied = await bundleCareerStoryRole({ expose: true });
  const current = control ? await bundleCareerStoryRole({ patches: controlPatches(control), expose: true }) : uncopied;
  report.faultEdits = current.faultEdits;
  save('original-source', original.loaded);
  save('candidate-source', uncopied.loaded);
  const arPairs = (candidate, label) => {
    const mismatches = [];
    let pairs = 0;
    for (let seed = 119001; seed <= 119012; seed++) {
      const position = ['CM', 'ST', 'GK'][(seed - 119001) % 3];
      const expectedStart = newPlaying(original.soccer, seed, position), actualStart = newPlaying(candidate.soccer, seed, position);
      save(`${label}-${seed}-start`, { expected: expectedStart, actual: actualStart });
      if (serial(actualStart.value) !== serial(expectedStart.value)) mismatches.push(`${seed}:start:state`);
      if (serial(actualStart.draws) !== serial(expectedStart.draws)) mismatches.push(`${seed}:start:draws`);
      pairs++;
      const input = expectedStart.value;
      for (const [name, transition] of [
        ['repair', (E, s) => E.repairCareer(s)],
        ['appearance', (E, s) => E.calcAppearances(s.overall, s.currentClubTier, s.age, s)],
        ['season', (E, s) => E.advanceProSeason(s, E.FALLBACK_CLUBS)],
      ]) {
        const expected = observed(original.soccer, transition, input, seed + 200), actual = observed(candidate.soccer, transition, input, seed + 200);
        save(`${label}-${seed}-${name}`, { input, expected, actual });
        if (serial(actual.value) !== serial(expected.value)) mismatches.push(`${seed}:${name}:state`);
        if (serial(actual.draws) !== serial(expected.draws)) mismatches.push(`${seed}:${name}:draws`);
        pairs++;
      }
    }
    assert.equal(pairs, 48, 'all twelve starts and three real transitions are compared');
    assert.deepEqual(mismatches, [], `${label} entire saved values and global draw vectors match AR`);
    return pairs;
  };
  await check('uncopied AR parity', () => { report.counts.arPairs = arPairs(uncopied, 'uncopied'); });
  const historical = await fullCareerChecks(check, current, uncopied, original, save, report, out, control);
  await check('candidate AR parity', () => { report.counts.candidateArPairs = arPairs(historical, 'candidate-attributed'); });
  await roleChecks(check, current, original, save, report);
  await milestoneChecks(check, current, original, save, report);
  await check('source held', () => { assert.deepEqual(sourceHashes(), before, 'every tracked source/script/workflow byte stays held'); report.sourceHeld = true; });
  report.failed = report.cases.filter(c => !c.passed).map(c => c.id);
  report.status = report.failed.length ? 'failed' : 'passed';
  save('report', report);
  console.log(`simCareerStoryRole: ${report.cases.length} groups, ${report.failed.length} failed, ${report.counts.arPairs ?? 0} full AR pairs`);
  return report;
}

function inverseTruthPatches() {
  const current = textAt(ENGINE), old = originalAt(ENGINE);
  const patches = [];
  const add = (id, from, to) => { assert.ok(old.includes(to), `actual AR inverse ${id}`); assert.notEqual(from, to, `declared inverse ${id} is effective`); patches.push({ id, file: ENGINE, from, to }); };
  add('milestone-empty-return', 'if (eligible.length === 0) return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);', 'if (eligible.length === 0) return out;');
  add('milestone-final-return', '\n  return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);\n}', '\n  return out;\n}');
  const first = '    { weight: 1, check: () => totalGoals >= 100 && totalGoals - season.goals < 100,';
  const next = '    { weight: 1, check: () => s.intStats.caps >= 100';
  const slot = src => { assert.equal(src.split(first).length - 1, 1, 'one original weighted milestone slot'); const a = src.indexOf(first), b = src.indexOf(next, a); assert.ok(b > a, 'bounded weighted milestone slot'); return src.slice(a, b); };
  const heldSlot = slot(current), oldSlot = slot(old);
  assert.notEqual(heldSlot, oldSlot, 'truthful hundred-goal slot changed only its declared article');
  patches.push({ id: 'hundred-goal-slot', file: ENGINE, from: heldSlot, to: oldSlot });
  const exact = '    { weight: 1, check: () => totalGoals > 0 && (totalGoals === 100 || totalGoals === 200 || totalGoals === 300 || totalGoals === 500),';
  const afterExact = '    { weight: 1, check: () => yearsPlaying >= 5';
  const exactSlot = src => { assert.equal(src.split(exact).length - 1, 1, 'one exact-total weighted slot'); const a = src.indexOf(exact), b = src.indexOf(afterExact, a); assert.ok(b > a, 'bounded exact-total slot'); return src.slice(a, b); };
  assert.notEqual(exactSlot(current), exactSlot(old), 'truthful exact-total slot is an effective declared change');
  patches.push({ id: 'exact-goal-slot', file: ENGINE, from: exactSlot(current), to: exactSlot(old) });
  add('role-consequence', 'consequence: "Morale -10, 4 fewer planned league games next season at this club"', 'consequence: "Morale -10, fewer appearances"');
  add('role-event-line', '"👔 Accepted a reduced role: 4 fewer planned league games next season at this club"', '"👔 New manager doesn\'t rate you, reduced role"');
  return patches;
}

function fullCareer(E, seed) {
  return withCareerStorySeed(seed, () => {
    const position = ['CM', 'ST', 'GK', 'CB'][seed % 4], overall = 65 + seed % 20;
    const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map(key => [key, overall]));
    let state = E.initCareer(`AR Story ${seed}`, ['England', 'France', 'Netherlands'][seed % 3], position, '2020s', stats, overall, 2020, E.FALLBACK_CLUBS, null, 93);
    const frames = [{ phase: 'init', state: serial(state) }];
    for (let guard = 0; guard < 1800 && !state.retired; guard++) {
      const phase = state.phase, clubs = E.FALLBACK_CLUBS;
      switch (phase) {
        case 'youth': state = E.advanceYouthYear(state, clubs); break;
        case 'contract_offer': assert.ok(state.pendingOffers.length, 'natural career has a contract offer'); state = E.acceptOffer(state, state.pendingOffers[seed % state.pendingOffers.length]); break;
        case 'playing': state = E.advanceProSeason(state, clubs); break;
        case 'rehab_choice': state = E.applyRehabChoice(state, seed % 3); break;
        case 'newspaper': state = E.dismissNewspaper(state); break;
        case 'season_summary': state = E.dismissSummary(state, clubs); break;
        case 'random_events': assert.ok(state.pendingEvents?.length, 'actual event exists'); state = E.applyEventChoice(state, 0, clubs); break;
        case 'moral_dilemma': state = state.pendingMoralDilemma ? E.applyMoralDilemmaChoice(state, seed % 2) : E.dismissMoralDilemma(state, clubs); break;
        case 'social_media_action': state = E.dismissSocialMediaPhase(state, clubs); break;
        case 'red_card_appeal_result': state = E.dismissAppealResult(state, clubs); break;
        case 'international_debut': state = E.dismissDebut(state, clubs); break;
        case 'world_cup': state = E.dismissWorldCup(state, clubs); break;
        case 'rivalry_event': state = E.dismissRivalryEvent(state, clubs); break;
        case 'ballon_dor': state = E.dismissBallonDor(state, clubs); break;
        case 'transfer_window': {
          const sit = state.transferSituation;
          if (sit?.type === 'contract_expiry') state = sit.offers?.length ? E.acceptOffer(state, sit.offers[0]) : E.signExtension(state);
          else if (sit?.offers?.length && seed % 2 === 0) state = sit.offers[0].isLoan ? E.acceptLoan(state, sit.offers[0]) : E.acceptOffer(state, sit.offers[0]);
          else if (sit?.offer && seed % 2 === 0) state = E.acceptOffer(state, sit.offer);
          else if (sit?.offerA && seed % 2 === 0) state = E.acceptOffer(state, sit.offerA);
          else state = E.stayAtClub(state);
          break;
        }
        case 'retirement_suggestion': state = E.declineRetirementSuggestion(state, clubs); break;
        default: throw new Error(`unhandled actual career phase ${phase}`);
      }
      assert.ok(state, `actual ${phase} returns a save`);
      frames.push({ phase, state: serial(state) });
    }
    assert.equal(state.retired, true, 'natural career completes');
    assert.ok(state.seasons.length >= 8, 'every baseline has at least eight saved years');
    assert.equal(state.reducedRole, undefined, 'neutral career never opts into the new role');
    return { final: JSON.parse(serial(state)), frames };
  });
}

async function fullCareerChecks(check, current, uncopied, original, save, report, out, control) {
  const inverse = inverseTruthPatches();
  const neutral = await bundleCareerStoryRole({ patches: inverse, expose: true });
  const faults = control ? controlPatches(control) : [];
  const shared = inverse.filter(edit => faults.some(fault => fault.file === edit.file && fault.from === edit.from && fault.to === edit.to));
  const remaining = inverse.filter(edit => !shared.includes(edit));
  const controlled = control ? await bundleCareerStoryRole({ patches: [...faults, ...remaining], expose: true }) : neutral;
  report.attribution = { edits: neutral.faultEdits, sharedFaultInverses: shared.map(edit => ({ inverseId: edit.id, faultId: faults.find(fault => fault.file === edit.file && fault.from === edit.from && fault.to === edit.to).id, fromSha256: sha(edit.from), toSha256: sha(edit.to), effective: true })), controlledEdits: controlled.faultEdits };
  save('attribution-edits', report.attribution);
  await check('attribution boundaries', () => {
    assert.deepEqual(neutral.faultEdits.map(edit => edit.id).sort(), ['milestone-empty-return', 'milestone-final-return', 'hundred-goal-slot', 'exact-goal-slot', 'role-consequence', 'role-event-line'].sort(), 'both actual old weighted objects, both return sites, and declared role metadata are restored');
    assert.ok(neutral.faultEdits.every(edit => edit.effective && edit.beforeSha256 !== edit.afterSha256), 'every certified inverse changes exactly its loaded source');
    const expectedShared = control === 'milestoneHooks' ? ['milestone-final-return'] : control === 'milestoneLegacy' ? ['exact-goal-slot', 'hundred-goal-slot'] : [];
    assert.deepEqual(shared.map(edit => edit.id).sort(), expectedShared.sort(), 'only exact same-file/from/to certified inverse edits may be shared with a product fault');
    if (shared.length) assert.equal(controlled.loaded.find(row => row.file === ENGINE).afterSha256, neutral.loaded.find(row => row.file === ENGINE).afterSha256, 'the effective fault already produced the certified historical engine bytes');
  });
  const rows = [];
  const writeWalk = (seed, arm, result) => fs.writeFileSync(path.join(out, `full-${seed}-${arm}.json.gz`), gzipSync(JSON.stringify(result)));
  await check('uncopied full AR baseline', () => {
    for (let seed = 119101; seed <= 119112; seed++) {
      const expected = fullCareer(original.soccer, seed), actual = fullCareer(uncopied.soccer, seed), attributed = fullCareer(neutral.soccer, seed);
      writeWalk(seed, 'original', expected); writeWalk(seed, 'current', actual); writeWalk(seed, 'attributed', attributed);
      rows.push({ seed, expected, attributed });
      assert.ok(serial(attributed.draws) === serial(expected.draws), `AR full career${seed} every global draw`);
      assert.ok(serial(attributed.value) === serial(expected.value), `AR full career${seed} every full saved frame and final state`);
    }
    report.counts.arCareers = 12;
    report.counts.arYears = rows.reduce((sum, row) => sum + row.expected.value.final.seasons.length, 0);
    assert.ok(report.counts.arYears >= 96, 'full AR sample retains at least96 saved years');
  });
  await check('candidate full AR baseline', () => {
    assert.equal(rows.length, 12, 'all twelve independent original careers are held');
    const mismatches = [];
    for (const { seed, expected, attributed } of rows) {
      const candidate = control ? fullCareer(controlled.soccer, seed) : attributed;
      if (control) writeWalk(seed, 'controlled-attributed', candidate);
      if (serial(candidate.draws) !== serial(expected.draws)) mismatches.push(`${seed}:draws`);
      if (serial(candidate.value) !== serial(expected.value)) mismatches.push(`${seed}:full-frames`);
    }
    assert.deepEqual(mismatches, [], 'all twelve controlled-attributed complete AR careers retain every saved frame and draw');
  });
  return controlled;
}

function recordedInput() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const fixture = data.saves.find(row => row.id === 'ere');
  assert.ok(fixture, 'held engine-recorded ere fixture exists');
  return { ...copy(fixture.state), age: 25, phase: 'playing', retired: false, loan: null, frozenOut: 0 };
}
function plannedInput() { const state = recordedInput(); return { ...state, reducedRole: { club: state.currentClub, year: state.seasons.at(-1).year + 1 } }; }
function savedRow(c, extra = {}) { return { ...copy(c.seasons.at(-1)), year: c.seasons.at(-1).year + 1, club: c.currentClub, type: 'playing', apps: 30, leagueApps: 30, goals: 12, injurySevere: false, ...extra }; }

async function roleChecks(check, B, old, save, report) {
  const E = B.soccer, role = B.role;
  await check('role event', () => {
    const input = recordedInput(), before = serial(input);
    const event = E.getAllEvents(input).find(e => e.id === 12), oldEvent = old.soccer.getAllEvents(input).find(e => e.id === 12);
    assert.equal(event.choices.length, oldEvent.choices.length, 'same existing two choices');
    const held = serial({ ...input, phase: 'random_events', pendingEvents: [event, E.getAllEvents(input).find(e => e.id === 10)] });
    const queued = observed(E, (sc, s) => sc.applyEventChoice(s, 1, sc.FALLBACK_CLUBS), JSON.parse(held), 119201);
    const expected = observed(old.soccer, (sc, s) => sc.applyEventChoice(s, 1, sc.FALLBACK_CLUBS), JSON.parse(held), 119201);
    expected.value.reducedRole = { club: input.currentClub, year: input.seasons.at(-1).year + 1 };
    expected.value.events[expected.value.events.length - 1] = '👔 Accepted a reduced role: 4 fewer planned league games next season at this club';
    assert.deepEqual(queued, expected, 'actual accepted event equals the old full action plus only its recorded role and truthful log');
    assert.equal(role.queueReducedRole(queued.value), queued.value, 'queue is idempotent');
    assert.equal(serial(input), before, 'existing saved seasons are untouched');
    const training = observed(E, (sc, s) => sc.applyEventChoice(s, 0, sc.FALLBACK_CLUBS), JSON.parse(held), 119201);
    const oldTraining = observed(old.soccer, (sc, s) => sc.applyEventChoice(s, 0, sc.FALLBACK_CLUBS), JSON.parse(held), 119201);
    assert.deepEqual(training, oldTraining, 'training alternative keeps complete AR action and draws');
    save('event', { input: JSON.parse(held), queued, expected, training, oldTraining });
  });
  await check('role selection', () => {
    const fixtures = [];
    for (let seed = 119301; seed <= 119324; seed++) {
      const c = plannedInput(); c.frozenOut = seed % 2;
      c.currentClubTier = seed % 3 === 0 ? 1 : 4;
      c.overall = [65, 75, 90][seed % 3];
      const noRole = copy(c); delete noRole.reducedRole;
      const expected = observed(old.soccer, (sc, s) => sc.calcAppearances(s.overall, s.currentClubTier, s.age, s), noRole, seed);
      const actual = observed(E, (sc, s) => sc.calcAppearances(s.overall, s.currentClubTier, s.age, s), c, seed);
      const band = old.soccer.projectLeagueApps(c.overall, c.currentClubTier, c.currentClub, c.seasons.filter(row => row.type === 'playing' && row.club === c.currentClub).length);
      /* Release AT: Round 1185's recent form swing is in the same sum as the phone and the role. */
      const phone = B.squad.managerTrust(noRole, B.squad.squadNow(noRole)).swing, form = B.squad.managerTrust(noRole, B.squad.squadNow(noRole)).form.swing;
      let league = Math.max(0, Math.min(38, band.min + Math.floor(expected.draws[0] * (band.max - band.min + 1)) + phone + form - 4));
      if (c.frozenOut) league = Math.min(8, Math.round(league * 0.25));
      assert.equal(actual.value.leagueApps, league, 'phone and four-game role combine before the 38 cap and frozen-out availability');
      assert.deepEqual(actual.draws, expected.draws, 'role adds no draw and moves no injury draw');
      for (const key of ['injured', 'injuryWeeks', 'injuryName', 'injurySevere']) assert.equal(actual.value[key], expected.value[key], `old injury facts${key} held`);
      fixtures.push({ seed, input: c, actual, expected, plannedLeague: league });
    }
    save('selection', fixtures); report.counts.selectionPairs = fixtures.length;
  });
  await check('role scope', () => {
    for (const why of ['foreign', 'year', 'fraction', 'retired', 'loan']) {
      const c = plannedInput();
      if (why === 'foreign') c.reducedRole.club = 'Different Fictional Club';
      if (why === 'year') c.reducedRole.year += 1;
      if (why === 'fraction') c.reducedRole.year += 0.5;
      if (why === 'retired') c.retired = true;
      if (why === 'loan') c.loan = { parentClub: 'Saved Parent', parentTier: 1, parentLeague: 'Premier League', parentCountry: 'England', parentColor: '#111111' };
      const before = serial(c), result = withCareerStorySeed(119401, () => role.reducedRoleSwing(c));
      assert.equal(result.value, 0, `${why} plan is neutral`); assert.deepEqual(result.draws, [], 'reading role draws nothing'); assert.equal(serial(c), before, 'reading role leaves bytes held');
    }
    const c = plannedInput();
    assert.equal(role.reducedRoleSwing(c, 'Different Fictional Club'), 0, 'offer at another club has no old penalty');
    assert.equal(role.reducedRoleSwing(c, c.currentClub, c.reducedRole.year - 1), 0, 'past saved squad has no future penalty');
    for (const extra of [{ club: 'Different Fictional Club' }, { type: 'youth' }, { apps: 0 }, { injurySevere: true }]) {
      const row = savedRow(c, extra);
      row.reducedRole = { ...c.reducedRole, plannedReduction: 4, outcome: 'served' };
      assert.equal(role.readReducedRoleResult(row), null, 'a forged completed role on a foreign, youth or unavailable row is rejected');
    }
  });
  await check('role recorded year', () => {
    const results = [];
    for (let seed = 119501; seed <= 119516; seed++) {
      const c = plannedInput(), originalRows = serial(c.seasons);
      const result = observed(E, (sc, s) => sc.advanceProSeason(s, sc.FALLBACK_CLUBS), c, seed);
      const row = result.value.seasons.at(-1);
      assert.equal(row.year, c.reducedRole.year, 'actual engine records the planned year');
      assert.equal(result.value.reducedRole, undefined, 'actual recorded year consumes the optional plan');
      assert.deepEqual(row.reducedRole, { ...c.reducedRole, plannedReduction: 4, outcome: row.apps > 0 && !row.injurySevere && row.club === c.currentClub ? 'served' : 'interrupted' }, 'actual engine row stores the honest outcome');
      assert.equal(serial(result.value.seasons.slice(0, -1)), originalRows, 'all earlier full rows remain byte-identical');
      const loaded = observed(E, (sc, s) => sc.repairCareer(s), result.value, seed);
      assert.equal(serial(loaded.value), serial(result.value), 'reloading a credited role preserves the entire save');
      assert.equal(role.reducedRoleSwing(loaded.value), 0, 'credited plan cannot repeat after reload');
      results.push({ seed, input: c, result, loaded });
    }
    save('recorded-year', results); report.counts.recordedRoleYears = results.length;
  });
  await check('role interruptions', () => {
    const results = [];
    for (const extra of [{ apps: 0 }, { injurySevere: true }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 }, { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }]) {
      const c = plannedInput(), row = savedRow(c, extra), before = serial(c.seasons);
      const result = withCareerStorySeed(119601, () => role.settleReducedRole(c, row));
      assert.deepEqual(result.draws, [], 'interruption settlement draws nothing');
      assert.equal(c.reducedRole, undefined, 'interrupted year clears the plan'); assert.equal(row.reducedRole?.outcome, 'interrupted', 'no completed-play claim for a year unavailable');
      assert.equal(serial(c.seasons), before, 'old full rows survive interruption');
      results.push({ input: extra, career: c, row });
    }
    const actualCases = [
      { label: 'ban', patch: { matchFixBanned: 2 }, matches: row => row.club === 'BANNED' },
      { label: 'prison', patch: { prisonSeasons: 1 }, matches: row => row.club === 'PRISON' },
      { label: 'PED', patch: { pedActive: true, pedSeasonsRemaining: 2 }, matches: row => row.club === 'BANNED (PED)' },
      { label: 'trial', patch: { corruptionHeat: 100, dirtyMoney: 0 }, matches: row => row.club === 'CONVICTED' },
      { label: 'severe injury', patch: { age: 19, startingOverall: 99, rehabFragility: 0.06 }, matches: row => row.injurySevere === true },
    ];
    for (const fixture of actualCases) {
      let found = null;
      for (let seed = 119602; seed < 119730; seed++) {
        const c = Object.assign(plannedInput(), fixture.patch);
        const result = observed(E, (sc, s) => sc.advanceProSeason(s, sc.FALLBACK_CLUBS), c, seed);
        const row = result.value.seasons.at(-1);
        if (row.year === c.reducedRole.year && fixture.matches(row)) { found = { label: fixture.label, seed, input: c, result }; break; }
      }
      assert.ok(found, `bounded actual ${fixture.label} path must record its own held year`);
      const row = found.result.value.seasons.at(-1);
      if (fixture.label !== 'severe injury') assert.equal(row.apps, 0, `actual ${fixture.label} records no appearances`);
      assert.equal(row.reducedRole?.outcome, 'interrupted', `actual ${fixture.label} records the interrupted plan`);
      assert.equal(found.result.value.reducedRole, undefined, `actual ${fixture.label} consumes plan once`);
      results.push(found);
    }
    for (const label of ['legacy rehab', 'legacy conviction']) {
      const c = plannedInput(); c.age = c.seasons.at(-1).age + 1;
      if (label === 'legacy rehab') { c.phase = 'rehab_choice'; c.pendingRehab = { name: 'Recorded test injury', weeks: 16, year: c.reducedRole.year, specialistCost: null }; }
      else { c.phase = 'newspaper'; c.pendingSummary = null; c.prisonSeasons = 1; }
      const transition = label === 'legacy rehab' ? (sc, s) => sc.applyRehabChoice(s, 1) : (sc, s) => sc.dismissNewspaper(s);
      const result = observed(E, transition, c, 119730), row = result.value.seasons.at(-1);
      assert.equal(row.year, c.reducedRole.year, `actual ${label} repairs exactly the held year`);
      assert.equal(row.apps, 0, `actual ${label} records no invented appearances`);
      assert.equal(row.reducedRole?.outcome, 'interrupted', `actual ${label} settles interruption`);
      assert.equal(result.value.reducedRole, undefined, `actual ${label} consumes plan once`);
      results.push({ label, input: c, result });
    }
    save('interruptions', results); report.counts.helperInterruptions = 6; report.counts.actualInterruptedPaths = 7;
  });
  await check('role moves and retirement', () => {
    const c = plannedInput(), destination = E.FALLBACK_CLUBS.find(club => club.name !== c.currentClub);
    const offer = { club: destination, contractYears: 3, wage: c.weeklyWage, transferFee: 0 };
    const results = [];
    for (const [label, transition] of [
      ['move', (sc, s) => sc.acceptOffer(s, offer)],
      ['loan', (sc, s) => sc.acceptLoan(s, { ...offer, isLoan: true })],
      ['manual retirement', (sc, s) => sc.manualRetire(s)],
      ['suggested retirement', (sc, s) => sc.acceptRetirementSuggestion({ ...s, phase: 'retirement_suggestion' })],
      ['forced retirement', (sc, s) => sc.advanceProSeason({ ...s, age: 44 }, sc.FALLBACK_CLUBS)],
    ]) {
      const result = observed(E, transition, c, 119701);
      assert.equal(result.value.reducedRole, undefined, `${label} immediately cancels old-manager role`);
      results.push({ label, result });
    }
    const paused = { ...copy(c), phase: 'retirement_suggestion', age: c.seasons.at(-1).age + 1 };
    assert.equal(B.role.reducedRoleSwing(paused), -4, 'the suggestion itself preserves the queued role');
    const resumed = observed(E, (sc, s) => sc.declineRetirementSuggestion(s, sc.FALLBACK_CLUBS), paused, 119702);
    assert.equal(resumed.value.seasons.at(-1).year, c.reducedRole.year, 'Keep Playing records the same pending year');
    assert.equal(resumed.value.reducedRole, undefined, 'actual retirement resume consumes only its recorded year');
    assert.ok(resumed.value.seasons.at(-1).reducedRole, 'actual retirement resume records the role outcome');
    results.push({ label: 'retirement resume', input: paused, result: resumed });
    report.counts.actualSettlementPaths = 8;
    const renewal = observed(E, (sc, s) => sc.signExtension(s), c, 119701);
    assert.deepEqual(renewal.value.reducedRole, c.reducedRole, 'same-club extension keeps the held plan');
    const earlier = savedRow(c, { year: c.reducedRole.year - 1 }); role.settleReducedRole(c, earlier);
    assert.ok(c.reducedRole, 'unplayed future year remains queued');
    const late = savedRow(c, { year: c.reducedRole.year + 1 }); role.settleReducedRole(c, late);
    assert.equal(c.reducedRole, undefined, 'stale plan clears'); assert.equal(late.reducedRole, undefined, 'stale plan never invents a served row');
    save('moves', { input: plannedInput(), results, renewal, earlier, late });
  });
  await check('role squad display', () => {
    const fixtures = [];
    for (const frozenOut of [0, 1]) for (const overall of [35, 75, 99]) {
      const c = plannedInput(); c.frozenOut = frozenOut; c.overall = overall;
      const at = B.squad.squadNow(c), trust = B.squad.managerTrust(c, at);
      const a = Math.max(0, Math.min(38, trust.band.min + trust.swing + trust.form.swing - 4)), b = Math.max(0, Math.min(38, trust.band.max + trust.swing + trust.form.swing - 4));
      let expected = Math.max(0, Math.min(38, (trust.band.min + trust.band.max) / 2 + trust.swing + trust.form.swing - 4));
      if (frozenOut) expected = Math.min(8, Math.round(expected * 0.25));
      assert.equal(trust.expected, expected, 'display reads the held four-game reduction'); assert.equal(trust.roleSwing, -4, 'phone swing stays separate from role');
      assert.equal(B.sheet.planLine(trust), frozenOut ? 'The plan: frozen out, 8 league games at most.' : `The plan is about ${a} to ${b} league games.`, 'actual range respects role and existing bounds');
      const lines = B.sheet.trustLines(c, at, trust);
      assert.ok(lines.some(line => line.includes("new manager's smaller role") && line.includes('4 fewer planned league games')), 'actual explanation names the role and pre-availability limits');
      assert.equal(trust.inPlans, !frozenOut && trust.band.min + trust.roleSwing >= 20, 'starter-plan cutoff respects reduced role while old band remains');
      fixtures.push({ input: c, trust, lines });
    }
    save('squad', fixtures);
  });
}

async function milestoneChecks(check, B, old, save, report) {
  const E = B.soccer, M = B.milestone;
  await check('milestone saved tally', () => {
    const cases = [];
    for (const threshold of [100, 200, 300, 500]) {
      const c = recordedInput(), row = savedRow(c, { goals: 12 }), previous = savedRow(c, { year: row.year - 1, goals: threshold - 5 });
      const excluded = [savedRow(c, { year: row.year - 2, type: 'youth', goals: 80 }), savedRow(c, { year: row.year - 2, type: 'manager', goals: 80 }), savedRow(c, { year: row.year - 2, apps: 0, goals: 80 }), savedRow(c, { year: row.year + 1, goals: 80 })];
      const seasons = [previous, ...excluded, row], before = serial(seasons);
      const result = withCareerStorySeed(119801, () => M.personalGoalMilestone(seasons, row));
      assert.deepEqual(result.value, { threshold, previous: threshold - 5, total: threshold + 7 }, 'senior saved crossing excludes academy, jobs, absent and future years');
      assert.deepEqual(result.draws, [], 'tally consumes no global draw'); assert.equal(serial(seasons), before, 'all full saved rows remain held');
      cases.push({ seasons, row, result });
    }
    const c = recordedInput(), row = savedRow(c, { goals: 220 }), previous = savedRow(c, { year: row.year - 1, goals: 90 });
    assert.deepEqual(M.personalGoalMilestone([previous, row], row), { threshold: 300, previous: 90, total: 310 }, 'highest actually crossed threshold');
    for (const seasons of [[previous], [previous, row, { ...row }], [{ ...previous, goals: NaN }, row], [{ ...previous, goals: 300 }, { ...row, goals: 0 }]]) {
      const inputRow = seasons.at(-1); assert.equal(M.personalGoalMilestone(seasons, inputRow), null, 'missing, ambiguous, invalid and already-passed history makes no new crossing');
    }
    save('milestone-tallies', cases); report.counts.milestoneMarks = cases.length;
  });
  await check('milestone protected news', () => {
    const c = recordedInput(), row = savedRow(c, { goals: 12 }); c.seasons = [savedRow(c, { year: row.year - 1, goals: 95 }), row];
    const article = (headline, type = 'positive') => ({ newspaper: 'Saved Paper', type, headline, body: 'Original saved article body' });
    const critic = article('Saved critic column', 'negative'), performance = article(`${c.playerName} Silences Critics With Stunning Performance`);
    const expected = { newspaper: 'Saved Paper', type: 'milestone', headline: `${c.playerName} Reaches 100 Senior Club Goals`, body: `${row.year}/${String((row.year + 1) % 100).padStart(2, '0')}: ${c.playerName} scored 12 club goals, taking their saved senior club tally from 95 to 107.` };
    const input = [critic, performance], before = serial({ c, input });
    const result = withCareerStorySeed(119802, () => M.personalGoalMilestoneNews(input, c, row, 'Fallback Paper'));
    assert.deepEqual(result, { value: [critic, expected], draws: [] }, 'exact saved tally and existing paper replace only the harmless performance story');
    assert.equal(serial({ c, input }), before, 'view inputs remain byte-identical');
    const protectedCases = [];
    for (const title of ['Won an award', 'GUILTY: prison', 'DONE DEAL: moved clubs', 'Ballon result']) {
      const held = [critic, article(title)], result = M.personalGoalMilestoneNews(held, c, row, 'Fallback Paper');
      assert.equal(result, held, 'full critic and key-story pair kept by identity'); protectedCases.push(held);
    }
    const single = [article('Saved key story')], spare = M.personalGoalMilestoneNews(single, c, row, 'Fallback Paper');
    assert.deepEqual(spare, [single[0], expected], 'spare space uses existing paper and preserves full key story');
    const empty = M.personalGoalMilestoneNews([], c, row, 'Fallback Paper');
    assert.deepEqual(empty, [{ ...expected, newspaper: 'Fallback Paper' }], 'empty news uses fixed existing fallback without draws');
    assert.equal(M.personalGoalMilestoneNews(input, c, { ...row }, 'Fallback Paper'), input, 'unrecorded row cannot invent a newspaper milestone');
    save('milestone-news', { c, row, input, result, protectedCases, spare, empty });
  });
  await check('milestone engine news', () => {
    const found = [], samples = [];
    for (let seed = 119901; seed <= 119948; seed++) {
      const c = recordedInput(), row = savedRow(c, { year: 2029, goals: 12, rating: 8, ovr: 80 });
      const prior = savedRow(c, { year: row.year - 1, goals: 95 });
      c.seasons = [{ ...copy(c.seasons[0]), goals: 50, apps: 20 }, prior, row];
      c.age = 26; c.overall = 80; c.currentClub = row.club; c.morale = 60; c.rival = null; c.isFinalSeason = false; c.marketValue = 1; c.contractYearsLeft = 3;
      const totalGoals = c.seasons.reduce((sum, held) => sum + held.goals, 0), totalApps = c.seasons.reduce((sum, held) => sum + held.apps, 0);
      const expected = observed(old.soccer, (sc, state) => sc.__storyRoleNews(state, state.seasons.at(-1), totalGoals, totalApps), c, seed);
      const actual = observed(E, (sc, state) => sc.__storyRoleNews(state, state.seasons.at(-1), totalGoals, totalApps), c, seed);
      assert.deepEqual(actual.draws, expected.draws, 'actual weighted newspaper uses every original global draw');
      const milestone = actual.value.find(article => article.type === 'milestone' && article.headline === `${c.playerName} Reaches 100 Senior Club Goals`);
      if (milestone) { assert.ok(milestone.body.includes('from 95 to 107'), 'actual engine article reads senior tally only'); found.push({ seed, input: c, actual, expected }); }
      samples.push({ seed, actual, expected });
    }
    save('engine-news-samples', samples); save('engine-milestone-cases', found);
    assert.ok(found.length >= 1, 'bounded actual weighted engine news must surface the saved senior crossing');
    report.counts.actualNewsSamples = samples.length; report.counts.actualMilestoneArticles = found.length;
    const legacy = recordedInput(), row = savedRow(legacy, { goals: 1, rating: 7 });
    legacy.seasons = [{ ...copy(legacy.seasons[0]), goals: 90, apps: 20 }, savedRow(legacy, { year: row.year - 1, goals: 9 }), row];
    const legacySamples = [], seen = new Set(), falseClaims = [];
    for (let seed = 119951; seed <= 120078; seed++) {
      const totalGoals = 100, totalApps = legacy.seasons.reduce((sum, held) => sum + held.apps, 0);
      const result = observed(E, (sc, state) => sc.__storyRoleNews(state, state.seasons.at(-1), totalGoals, totalApps), legacy, seed);
      for (const article of result.value) {
        if (article.headline.includes('100th Career Goal') || article.headline.includes('100 Senior Club Goals') || article.headline.includes('Breaks Club Record For Goals')) falseClaims.push({ seed, article });
        if (article.headline === `${legacy.playerName}'s Recorded Career Goal Tally Reaches 100`) seen.add('exact');
        if (article.headline === `${legacy.playerName}'s Saved Career Goal Total Reaches 100`) seen.add('hundred');
      }
      legacySamples.push({ seed, result });
    }
    save('legacy-news', { input: legacy, samples: legacySamples, seen: [...seen], falseClaims });
    report.counts.legacyNewsSamples = legacySamples.length;
    assert.deepEqual(falseClaims, [], 'all128 actual old eligibility draws make no invented club record or100th senior-goal claim');
    assert.deepEqual([...seen].sort(), ['exact', 'hundred'], 'both preserved weighted old slots actually surface truthful saved career totals');
  });
}

const ROLE = 'src/lib/soccerCareerRole.ts';
const MILESTONE = 'src/lib/soccerCareerMilestone.ts';
const CONTROLS = {
  arStream: { file: ENGINE, from: 'export function calcAppearances(overall: number, clubTier: number, age: number, state?: CareerState, fx: BuildEffects = NEUTRAL_EFFECTS): { apps: number; leagueApps: number; injured: boolean; injuryWeeks: number; injuryName: string | null; injurySevere: boolean } {\n  const clubAvg = clubAverageRating(clubTier);', to: 'export function calcAppearances(overall: number, clubTier: number, age: number, state?: CareerState, fx: BuildEffects = NEUTRAL_EFFECTS): { apps: number; leagueApps: number; injured: boolean; injuryWeeks: number; injuryName: string | null; injurySevere: boolean } {\n  Math.random();\n  const clubAvg = clubAverageRating(clubTier);', fails: ['candidate AR parity', 'candidate full AR baseline', 'role selection'] },
  roleRead: { file: ROLE, from: "if (result.outcome === 'served' &&", to: "if (false && result.outcome === 'served' &&", fails: ['role scope'] },
  milestoneRow: { file: MILESTONE, from: '!seasons.includes(row) || ', to: '', fails: ['milestone protected news'] },
  milestonePassed: { file: MILESTONE, from: 'previous < mark && total >= mark', to: 'total >= mark', fails: ['milestone saved tally'] },
  milestoneLegacy: { inverseIds: ['exact-goal-slot', 'hundred-goal-slot'], fails: ['milestone engine news'] },
  roleQueue: { file: ROLE, from: 'return { ...career, reducedRole: { club: career.currentClub, year } };', to: 'return career;', fails: ['role event'] },
  roleDraw: { file: ENGINE, from: ' + reducedRoleSwing(state)', to: '', fails: ['role selection'] },
  roleYear: { file: ROLE, from: '&& plan.club === club && plan.year === year ? plan : null;', to: '&& plan.club === club ? plan : null;', fails: ['role scope'] },
  roleClub: { file: ROLE, from: 'plan.club === career.currentClub\n    && plan.club === club', to: 'true\n    && true', fails: ['role scope'] },
  roleCancel: { file: ROLE, from: 'delete career.reducedRole;', to: 'return;', fails: ['role recorded year', 'role interruptions', 'role moves and retirement'] },
  roleSettle: { file: ROLE, from: 'if (!plan) return;', to: 'return;', fails: ['role recorded year', 'role interruptions', 'role moves and retirement'] },
  roleMinimum: { file: ROLE, from: "outcome: row.type === 'playing' && row.apps > 0", to: "outcome: row.type === 'playing' && row.apps >= 0", fails: ['role interruptions'] },
  roleTrust: { file: 'src/lib/soccerClubSquad.ts', from: '(band.min + band.max) / 2 + swing + roleSwing', to: '(band.min + band.max) / 2 + swing', fails: ['role squad display'] },
  rolePlanLine: { file: 'src/lib/soccerClubSquadSheet.ts', from: 'export function planLine(trust: Trust): string {', to: 'export function planLine(trust: Trust): string {\n  trust = { ...trust, roleSwing: 0 };', fails: ['role squad display'] },
  milestoneYouth: { file: MILESTONE, from: "const played = seasons.filter(season => season.type === 'playing'", to: 'const played = seasons.filter(season => true', fails: ['milestone saved tally', 'milestone engine news'] },
  milestoneSlot: { file: MILESTONE, from: "article.type === 'positive' && performance.has(article.headline)", to: "article.type === 'positive'", fails: ['milestone protected news'] },
  milestoneHooks: { file: ENGINE, from: '\n  return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);\n}', to: '\n  return out;\n}', fails: ['milestone engine news'] },
};
function controlPatches(control) {
  const value = CONTROLS[control]; assert.ok(value, `known control${control}`);
  if (value.inverseIds) {
    const patches = inverseTruthPatches().filter(edit => value.inverseIds.includes(edit.id));
    assert.equal(patches.length, value.inverseIds.length, 'all requested actual old article faults have unique certified source objects');
    return patches.map(edit => ({ ...edit, id: `${control}-${edit.id}` }));
  }
  return [{ id: control, file: value.file, from: value.from, to: value.to }];
}

async function main() {
  const mode = process.env.CAREER_STORY_ROLE_CONTROL || '';
  if (mode !== 'all') {
    const report = await runOutcomes(mode);
    process.exitCode = report.failed.length ? 1 : 0;
    return;
  }
  const healthy = await runOutcomes();
  assert.deepEqual(healthy.failed, [], 'healthy outcome groups all pass before copied defects');
  const controls = [];
  for (const [name, fault] of Object.entries(CONTROLS)) {
    const result = spawnSync(process.execPath, [SELF], { cwd: ROOT, encoding: 'utf8', maxBuffer: 12e6, timeout: 240000, env: { ...process.env, CAREER_STORY_ROLE_CONTROL: name } });
    process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
    assert.equal(result.status, 1, `${name} must exit1 from actual assertions, not setup or import failure`);
    const root = path.resolve(ROOT, process.env.CAREER_STORY_ROLE_ARTIFACTS || '.tmp-fx/career-story-role/outcomes');
    const report = JSON.parse(fs.readFileSync(path.join(root, name, 'report.json'), 'utf8'));
    assert.deepEqual([...report.failed].sort(), [...fault.fails].sort(), `${name} exact expected failed group identities`);
    assert.ok(report.cases.filter(test => !test.passed).every(test => test.name === 'AssertionError'), `${name} fails only intended assertions`);
    assert.equal(report.cases.length, healthy.cases.length, `${name} every outcome group ran`);
    assert.equal(report.cases.find(test => test.id === 'uncopied AR parity')?.passed, true, `${name} uncopied AR oracle remains green`);
    assert.equal(report.cases.find(test => test.id === 'uncopied full AR baseline')?.passed, true, `${name} independent full career baseline remains green`);
    assert.equal(report.sourceHeld, true, `${name} source bytes held`);
    assert.equal(report.faultEdits.length, fault.inverseIds?.length ?? 1, `${name} every declared copied product fault loaded`);
    for (const edit of report.faultEdits) {
      assert.equal(edit.effective, true, `${name} changed its loaded source anchor`);
      assert.notEqual(edit.beforeSha256, edit.afterSha256, `${name} effective source hashes`);
    }
    controls.push({ name, failed: report.failed, effective: true });
  }
  const root = path.resolve(ROOT, process.env.CAREER_STORY_ROLE_ARTIFACTS || '.tmp-fx/career-story-role/outcomes');
  fs.writeFileSync(path.join(root, 'controls.json'), JSON.stringify({ head: healthy.head, tree: healthy.tree, baseHead: STORY_ROLE_BASE, baseTree: BASE_TREE, count: controls.length, controls }, null, 2));
  console.log(`simCareerStoryRole: ${healthy.cases.length} healthy groups, ${controls.length} effective copied controls caught;12 complete AR careers and48 neutral pairs held`);
}
if (process.env.CAREER_STORY_ROLE_IMPORT_ONLY !== '1') await main();
