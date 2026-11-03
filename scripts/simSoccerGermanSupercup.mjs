import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';


const EXPECTED = [
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_ANNUAL: forward-verifies the one cup contribution and fails missing proof closed"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_CAPTURE: binds18 actual-order inputs, the double runner-up and a lower-division cup winner"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_COEXIST: accepts English world-only evidence and rejects represented or malformed English"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_GLOBAL: consumes no mainstream random draws during actual match generation"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_IDENTITY: binds Germany and canonical entrant identity without granting nonentrants"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_PARTIAL: refuses incomplete, mismatched, duplicate and pre-world qualification"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_PLAY: keeps team outcome independent of player selection and preserves all inputs"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_READER: refuses malformed proof, score, contribution, grade and invented venue"
  },
  {
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "fullName": "Soccer Career German Supercup domain SC_GERMAN_DOMAIN_TITLES: counts only unambiguous played wins in input order without mutation"
  },
  {
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "fullName": "Soccer Career German Supercup first slice SC_GERMAN_AUTOMATIC_OPENER: plays one saved German match for the current represented club"
  },
  {
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "fullName": "Soccer Career German Supercup first slice SC_GERMAN_ENGLISH_PRESERVED: keeps the existing full English result counter and neutral opening readable"
  },
  {
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "fullName": "Soccer Career German Supercup first slice SC_GERMAN_PROSPECTIVE_CAPTURE: captures Germany globally from the same actual closed world"
  },
  {
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "fullName": "Soccer Career German Supercup first slice SC_GERMAN_SAVED_CABINET: counts a saved played German win once in its own cabinet category"
  },
  {
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "fullName": "Soccer Career German Supercup first slice SC_GERMAN_SAVED_CALENDAR: reveals its distinct saved opener before league one without inventing a venue"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_ANNUAL_LEAGUE: keeps the exact annual key and complete league plan"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_ANNUAL_PROOF: uses captured grade and refuses corrupt evidence before any league key"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_CODEC history: preserves complete German fields and pending mirror"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_CODEC literal: preserves complete German fields and pending mirror"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_CODEC whole: preserves complete German fields and pending mirror"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_CODEC_UNKNOWN: stores malformed optional evidence without validating or backfilling it"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_PRESS_ANNUAL: preserves the annual promise and strict final answer source"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_PRESS_LEGACY: keeps the English actualRating fallback and blocks German fallthrough"
  },
  {
    "file": "src/test/soccerGermanSupercupConsumers.test.ts",
    "fullName": "Soccer Career German opening annual consumers and storage SC_GERMAN_PRESS_ZERO: keeps a proven zero-annual-app promise excused"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_CABINET_DETAIL: shows saved penalties and contribution separately and restores the winning tile after Back"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_CALENDAR: reveals one distinct unknown-venue opener before league one then continues"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_PANEL: shows the saved match with unknown venue and keeps Help and Back functional"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_REFUSAL: omits invalid and nonentrant records and shares duplicate-edition trophy decisions"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_RESULTS: preserves saved sides participation and the separate English world result"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_TOTALS: adds the German title to existing career and legacy displays while retaining English counts"
  },
  {
    "file": "src/test/soccerGermanSupercupScreens.test.tsx",
    "fullName": "German Supercup saved screen adapters SC_GERMAN_UI_ZERO_APPS: reaches a represented bench match through the real replay picker without league games"
  }
];
const FAULTS = [
  {
    "id": "omit-global-capture",
    "target": "engine",
    "range": null,
    "before": "    if (nextGerman) s.germanSupercupQualification = nextGerman;\n    else delete s.germanSupercupQualification;",
    "after": "    delete s.germanSupercupQualification;",
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "case": "SC_GERMAN_PROSPECTIVE_CAPTURE",
    "line": 152,
    "marker": "SC_GERMAN_PROSPECTIVE_CAPTURE_MISSING"
  },
  {
    "id": "omit-opener-row",
    "target": "engine",
    "range": null,
    "before": "  if (germanMatch) season.germanSupercup = germanMatch;",
    "after": "  if (germanMatch) void germanMatch;",
    "file": "src/test/soccerGermanSupercupAcceptance.test.ts",
    "case": "SC_GERMAN_AUTOMATIC_OPENER",
    "line": 178,
    "marker": "SC_GERMAN_AUTOMATIC_OPENER_MISSING"
  },
  {
    "id": "team-player-coupling",
    "target": "helper",
    "range": "playGermanSupercup",
    "before": "  const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];",
    "after": "  const score: [number, number] = [poissonGoals(clamp(1.32 + d, 0.25, 3.4), rng), poissonGoals(clamp(1.32 - d, 0.25, 3.4), rng)];\n  if (input.position === 'GK') score[0] += 1;",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_PLAY",
    "line": 81,
    "marker": null
  },
  {
    "id": "global-team-draw",
    "target": "helper",
    "range": "playGermanSupercup",
    "before": "  const rng = keyedRng(key), d = (strengths[0] - strengths[1]) / 2;",
    "after": "  const rng = Math.random, d = (strengths[0] - strengths[1]) / 2;",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_GLOBAL",
    "line": 163,
    "marker": "SC_GERMAN_DOMAIN_GLOBAL_DRAW_MISSING"
  },
  {
    "id": "accept-version-two",
    "target": "helper",
    "range": "readGermanSupercup",
    "before": "  if (!object(r) || r.version !== 1 || r.competition !== 'german-supercup' || r.minutes !== 90 || r.eventYear !== row.year",
    "after": "  if (!object(r) || (r.version !== 1 && r.version !== 2) || r.competition !== 'german-supercup' || r.minutes !== 90 || r.eventYear !== row.year",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_READER",
    "line": 110,
    "marker": null
  },
  {
    "id": "project-full-total",
    "target": "helper",
    "range": "careerOpeningAnnualStats",
    "before": "  return result.player.apps === 0",
    "after": "  return true",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_ANNUAL",
    "line": 133,
    "marker": "SC_GERMAN_DOMAIN_ANNUAL_MISSING"
  },
  {
    "id": "count-ambiguous-edition",
    "target": "helper",
    "range": "germanSupercupWinningSeasons",
    "before": "  return held.filter(({ match }) => match && match.player.title && editions.get(match.eventYear) === 1).map(({ row }) => row);",
    "after": "  return held.filter(({ match }) => match && match.player.title).map(({ row }) => row);",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_TITLES",
    "line": 148,
    "marker": null
  },
  {
    "id": "foreign-country-grant",
    "target": "helper",
    "range": "playGermanSupercup",
    "before": "  if (!q || input.clubCountry !== 'Germany' || !club(input.club) || !Number.isFinite(input.overall) || !Number.isFinite(input.selectionChance)",
    "after": "  if (!q || !club(input.club) || !Number.isFinite(input.overall) || !Number.isFinite(input.selectionChance)",
    "file": "src/lib/soccerCareerGermanSupercup.test.ts",
    "case": "SC_GERMAN_DOMAIN_IDENTITY",
    "line": 90,
    "marker": "SC_GERMAN_DOMAIN_COUNTRY_MISSING"
  }
];

const ENGINE = 'src/lib/soccerCareerEngine.ts', HELPER = 'src/lib/soccerCareerExtraCups.ts';
const FILES = [...new Set(EXPECTED.map(row => row.file))].sort();
const sha = body => createHash('sha256').update(body).digest('hex');
const pin = body => ({ bytes: body.length, sha256: sha(body) });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const clean = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const noComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const CLEAN = ['NO_DOUBLE_SWAP', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'SC_EXTRA_CUPS_ENGINE',
  'SC_GERMAN_SUPERCUP_EVIDENCE', 'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'TYCOON_AWAY_CONTROL',
  'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD', 'POLL_FIXTURES', 'DAILY_RECORD_CONTROL', 'TYCOON_ROOMS_PAGE',
  'TYCOON_LOADS_STADIUM_HOOK', 'TYCOON_LOADS_ACADEMY_HOOK', 'TYCOON_LOADS_STADIUM_LIB',
  'TYCOON_LOADS_ACADEMY_LIB', 'TYCOON_PITCH_COMPONENT', 'TYCOON_PACKS_REWARDS', 'TYCOON_PACKS_PANEL',
  'GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'GP_BOSS_ENGINE_FILE', 'FORCE_COLOR'];
const ENDPOINTS = {
  playGermanSupercup: 'readGermanSupercup',
  readGermanSupercup: 'germanSupercupSeasonStats',
  careerOpeningAnnualStats: 'germanSupercupWinningSeasons',
  germanSupercupWinningSeasons: 'countGermanSupercups',
};
function unique(text, needle, name) {
  const offset = text.indexOf(needle);
  assert(offset >= 0 && text.indexOf(needle, offset + needle.length) < 0, 'Unique actual source: ' + name);
  assert(noComments(text).includes(needle), 'Executable source anchor: ' + name);
  return offset;
}
function normalize(file, original, actual) {
  const raw = original.toString('utf8');
  assert.deepEqual(Buffer.from(raw), original, 'Actual UTF8 round trip: ' + file);
  const ending = raw.includes('\r\n') ? '\r\n' : '\n', withoutPairs = raw.replace(/\r\n/g, '');
  assert.equal(withoutPairs.includes('\r'), false, 'Lone CR refused: ' + file);
  if (ending === '\r\n') assert.equal(withoutPairs.includes('\n'), false, 'Mixed source endings refused: ' + file);
  assert.equal(actual, raw.replace(/\r\n/g, '\n'), 'Actual normalized matching is byte-bound: ' + file);
  return { text: actual, ending, encode: value => Buffer.from(ending === '\r\n' ? value.replace(/\n/g, '\r\n') : value) };
}
function mutate(source, fault) {
  let start = 0, end = source.text.length;
  if (fault.range) {
    const following = ENDPOINTS[fault.range];
    assert.equal(typeof following, 'string', 'Explicit function endpoint is required');
    start = unique(source.text, 'export function ' + fault.range + '(', fault.range);
    end = unique(source.text, 'export function ' + following + '(', following);
    assert(end > start && start >= source.englishChars, 'German-only function range');
  }
  const region = source.text.slice(start, end), localOffset = unique(region, fault.before, fault.id);
  const offset = start + localOffset;
  const changed = source.text.slice(0, offset) + fault.after + source.text.slice(offset + fault.before.length);
  assert.equal(changed.slice(0, offset), source.text.slice(0, offset));
  assert.equal(changed.slice(offset + fault.after.length), source.text.slice(offset + fault.before.length));
  const inverse = changed.slice(0, offset) + fault.before + changed.slice(offset + fault.after.length);
  assert.equal(inverse, source.text, 'Whole normalized source inverse: ' + fault.id);
  const changedBytes = source.encode(changed), inverseBytes = source.encode(inverse);
  assert.notEqual(sha(changedBytes), sha(source.original), 'Control changes actual bytes: ' + fault.id);
  assert.deepEqual(inverseBytes, source.original, 'Whole raw source inverse: ' + fault.id);
  if (fault.target === 'helper') assert.deepEqual(changedBytes.subarray(0, source.englishBytes), source.englishPrefix, 'Complete English prefix stays held');
  return { changedBytes, inverseBytes, receipt: { id: fault.id, target: fault.target, function: fault.range ?? null,
    range: { start, end }, offset, offsetUnits: 'UTF16 normalized source', before: fault.before, after: fault.after,
    lineEnding: source.ending === '\r\n' ? 'CRLF' : 'LF', original: pin(source.original),
    changed: pin(changedBytes), inverse: pin(inverseBytes) } };
}
function filesUnder(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const full = path.join(dir, entry.name);
    if (dir === base && entry.name === '.vite') continue;
    if (entry.isDirectory()) result.push(...filesUnder(full, base));
    else if (entry.isFile()) result.push(full);
    else assert(entry.isSymbolicLink(), 'Only regular dependency files and package links are expected');
  }
  return result;
}
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, maxBuffer: 64 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, 'Read-only Git metadata: ' + args.join(' '));
  return result.stdout;
}
async function retain(root, files) {
  const held = new Map();
  for (const file of files) {
    const rawBytes = await fs.promises.readFile(path.join(root, file));
    held.set(file, Buffer.from(rawBytes));
  }
  return held;
}
function holds(root, held) {
  const rows = [];
  for (const [file, expected] of held) {
    let actual;
    { const rawBytes = fs.readFileSync(path.join(root, file)); actual = Buffer.from(rawBytes); }
    assert.deepEqual(actual, expected, 'Held actual input: ' + file);
    rows.push({ file, ...pin(expected) });
  }
  return rows;
}
function readOwned(file, expected, label) {
  let actual;
  { const rawBytes = fs.readFileSync(file); actual = Buffer.from(rawBytes); }
  assert.deepEqual(actual, expected, label);
}
function runtime(report, raw) {
  const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
  const errors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
  for (const value of Object.values(counters)) if (value !== null) { assert.equal(typeof value, 'number'); assert.equal(value, 0); }
  for (const value of Object.values(errors)) if (value !== null) { assert(Array.isArray(value)); assert.deepEqual(value, []); }
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw);
  assert.equal(detectedRuntimeError, false, 'Setup/runtime errors are never owned controls');
  return { counters, errors, detectedRuntimeError, counterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED' };
}
function primary(row, fault) {
  assert.equal(row.failureMessages.length, 1);
  const message = clean(row.failureMessages[0]), lines = message.split(/\r?\n/), first = lines.find(line => line.trim())?.trim();
  assert(first?.startsWith('AssertionError: '), 'A native primary AssertionError is required');
  if (fault.marker) assert(first.startsWith('AssertionError: ' + fault.marker + ':'), 'Exact primary marker: ' + fault.id);
  else {
    const frame = lines.find(line => /^\s*(?:❯\s+|at\s+).*(?:src\/(?:test|lib)\/[^\s]+\.test\.[tj]sx?):\d+:\d+/.test(line));
    assert(frame, 'An actual test stack frame is required, not a code-frame marker');
    const escaped = fault.file.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
    assert(new RegExp(escaped + ':' + fault.line + ':\\d+').test(frame), 'Exact frozen native assertion site: ' + fault.id);
  }
  return { first, assertionSite: fault.marker ? null : { file: fault.file, line: fault.line } };
}

async function main() {
  const root = process.cwd(), tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const out = process.env.SC_GERMAN_SUPERCUP_OUT ? path.resolve(process.env.SC_GERMAN_SUPERCUP_OUT) : fs.mkdtempSync(path.join(tmp, 'sc-german-supercup-'));
  assert(out.startsWith(tmp + path.sep), 'Evidence must stay inside the ignored workspace tmp directory');
  assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Evidence output must be fresh');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const copies = { engine: path.join(root, 'src/lib/__control_german_supercup_engine_' + process.pid + '.ts'),
    helper: path.join(root, 'src/lib/__control_german_supercup_extra_' + process.pid + '.ts') };
  const written = new Map(), results = [], controls = [], secondary = [];
  let primaryError = null, sourceHeld = null, dependencyHeld = null, sourceMembers = null, dependencyMembers = null, inputs = null;
  const memberNames = () => git(root, ['ls-files', '-z']).split('\0').filter(Boolean).sort();
  const dependencyNames = () => filesUnder(path.join(root, 'node_modules')).map(relative).sort();
  function copyHolds() {
    for (const [target, expected] of written) readOwned(copies[target], expected, 'Owned copy stays held: ' + target);
  }
  function put(target, bytes) {
    fs.writeFileSync(copies[target], bytes, { flag: written.has(target) ? 'w' : 'wx' });
    written.set(target, Buffer.from(bytes));
    readOwned(copies[target], written.get(target), 'Physical copy write: ' + target);
  }
  try {
    assert.equal(git(root, ['ls-files', '--others', '--exclude-standard']), '', 'No pre-existing untracked source');
    git(root, ['check-ignore', '--quiet', relative(out)]);
    for (const file of Object.values(copies)) assert.equal(fs.existsSync(file), false, 'Owned physical source must be absent');
    assert.equal(EXPECTED.length, 30); assert.equal(FILES.length, 4); assert.equal(FAULTS.length, 8);
    assert.equal(new Set(EXPECTED.map(row => row.file + '\0' + row.fullName)).size, 30);
    sourceMembers = memberNames(); sourceHeld = await retain(root, sourceMembers);
    json(path.join(out, 'source-before.json'), holds(root, sourceHeld));
    dependencyMembers = dependencyNames(); dependencyHeld = await retain(root, dependencyMembers);
    assert(sourceHeld.has(ENGINE) && sourceHeld.has(HELPER), 'Actual product sources must be tracked');
    const currentFile = relative(fileURLToPath(import.meta.url));
    inputs = new Map([ENGINE, HELPER, ...FILES, 'vitest.config.ts', 'src/test/setup.ts', 'tsconfig.app.json',
      'package.json', 'package-lock.json', 'scripts/lib/offlineTransport.cjs', currentFile].map(file => {
      assert(sourceHeld.has(file), 'Actual tracked harness input: ' + file);
      return [file, sourceHeld.get(file)];
    }));
    json(path.join(out, 'dependency-before.json'), holds(root, dependencyHeld));
    json(path.join(out, 'members-before.json'), { source: sourceMembers, dependencies: dependencyMembers });
    assert.equal(sha(Buffer.from(inputs.get('src/lib/soccerCareerGermanSupercup.test.ts').toString('utf8').replace(/\r\n/g, '\n'))),
      'f117f200d064588a3e05e8aed02a9565f0db507997bd6e1ce79c92d46747de7f', 'Exact canonical test body binds native assertion sites');
    for (const fault of FAULTS) assert.equal(EXPECTED.filter(row => row.file === fault.file && row.fullName.includes(' ' + fault.case + ':')).length, 1);
    const engineText = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n/g, '\n');
    const helperText = fs.readFileSync(path.join(root, HELPER), 'utf8').replace(/\r\n/g, '\n');
    const source = {
      engine: { ...normalize(ENGINE, sourceHeld.get(ENGINE), engineText), original: sourceHeld.get(ENGINE) },
      helper: { ...normalize(HELPER, sourceHeld.get(HELPER), helperText), original: sourceHeld.get(HELPER) },
    };
    const englishText = source.helper.text.slice(0, 16110), englishCanonical = Buffer.from(englishText);
    assert.equal(englishCanonical.length, 16110);
    assert.equal(sha(englishCanonical), 'bc3c8b79f2e910a2ff730f216e1aaa7fb532139d663b45e956d43c9a92539934', 'Exact held English helper prefix');
    source.helper.englishChars = englishText.length;
    source.helper.englishPrefix = source.helper.encode(englishText);
    source.helper.englishBytes = source.helper.englishPrefix.length;
    for (const [target, value] of Object.entries(source)) fs.writeFileSync(path.join(out, target + '.original.ts'), value.original, { flag: 'wx' });
    const aliases = Object.fromEntries([
      ...['@/lib/soccerCareerExtraCups', './soccerCareerExtraCups', '../soccerCareerExtraCups'].map(id => [id, copies.helper]),
      ...['@/lib/soccerCareerEngine', './soccerCareerEngine'].map(id => [id, copies.engine]),
    ]);
    json(path.join(out, 'alias-map.json'), aliases);
    function run(name, fault = null, useCopies = false) {
      holds(root, inputs); if (useCopies) copyHolds();
      const env = { ...process.env, NODE_OPTIONS: '', SIM_NETWORK: 'offline' };
      for (const key of CLEAN) delete env[key];
      if (useCopies) env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
      env.SC_GERMAN_SUPERCUP_EVIDENCE = path.join(out, name + '.evidence');
      env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport');
      fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
      const reportFile = path.join(out, name + '.vitest.json');
      assert.equal(fs.existsSync(reportFile), false);
      const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
        'run', ...FILES, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json',
        '--outputFile=' + reportFile];
      if (fault) args.push('--testNamePattern=' + fault.case + ':');
      json(path.join(out, name + '.argv.json'), [process.execPath, ...args]);
      const beforeCopies = useCopies ? Object.fromEntries([...written].map(([target, body]) => [target, pin(body)])) : null;
      const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
      fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, name + '.exit'), String(child.status) + '\n', { flag: 'wx' });
      json(path.join(out, name + '.process.json'), { status: child.status, signal: child.signal,
        error: child.error ? { name: child.error.name, message: child.error.message } : null });
      assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, fault ? 1 : 0);
      assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0);
      holds(root, inputs); if (useCopies) copyHolds();
      let reportBytes;
      { const rawEvidenceBytes = fs.readFileSync(reportFile); reportBytes = Buffer.from(rawEvidenceBytes); }
      const report = JSON.parse(reportBytes);
      const runtimeFields = runtime(report, (child.stdout || '') + '\n' + (child.stderr || ''));
      assert.equal(report.success, !fault);
      for (const [key, value] of Object.entries({ numTotalTests: 30, numPassedTests: fault ? 0 : 30,
        numFailedTests: fault ? 1 : 0, numPendingTests: fault ? 29 : 0, numTodoTests: 0 })) assert.equal(report[key], value, key);
      assert.equal(report.testResults.length, 4, 'Four actual file records, not descriptive reporter suite counts');
      const rows = report.testResults.flatMap(suite => {
        const file = relative(suite.name); assert.equal(suite.message, '');
        assert(FILES.includes(file)); assert.equal(suite.status, fault && file === fault.file ? 'failed' : 'passed');
        return suite.assertionResults.map(row => ({ file, ...row }));
      });
      const identities = rows.map(row => row.file + '\0' + row.fullName).sort();
      assert.deepEqual(identities, EXPECTED.map(row => row.file + '\0' + row.fullName).sort());
      let ownedPrimary = null;
      for (const row of rows) {
        const selected = fault && row.file === fault.file && row.fullName.includes(' ' + fault.case + ':');
        if (selected) { assert.equal(row.status, 'failed'); ownedPrimary = primary(row, fault); }
        else if (fault) { assert(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); }
        else { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); }
      }
      if (fault) assert(ownedPrimary, 'Exactly the selected actual assertion must fail');
      readOwned(reportFile, reportBytes, 'Raw report must stay held during classification');
      const result = { name, selected: fault?.case ?? null, passed: fault ? 0 : 30, ownedFailures: fault ? 1 : 0,
        declaredUnselectedSkips: fault ? 29 : 0, executed: fault ? 1 : 30, rawExit: child.status,
        rawReport: pin(reportBytes), sourceCopies: beforeCopies, primary: ownedPrimary, ...runtimeFields,
        identities: rows.map(row => ({ file: row.file, fullName: row.fullName, status: row.status })) };
      json(path.join(out, name + '.summary.json'), result); results.push(result);
    }
    run('current');
    put('engine', source.engine.original); put('helper', source.helper.original);
    run('healthy-copy', null, true);
    for (const fault of FAULTS) {
      const mutation = mutate(source[fault.target], fault);
      fs.writeFileSync(path.join(out, fault.id + '.source.ts'), mutation.changedBytes, { flag: 'wx' });
      json(path.join(out, fault.id + '.construction.json'), mutation.receipt);
      put(fault.target, mutation.changedBytes);
      run(fault.id, fault, true);
      put(fault.target, source[fault.target].original);
      const receipt = { ...mutation.receipt, primary: results.at(-1).primary,
        physicalRestore: pin(written.get(fault.target)), fullInverse: true };
      assert.deepEqual(written.get(fault.target), mutation.inverseBytes);
      json(path.join(out, fault.id + '.edit.json'), receipt); controls.push(receipt);
    }
    run('restored-copy', null, true);
    assert.equal(results.length, 11); assert.equal(controls.length, 8);
    const totals = results.reduce((a, row) => ({ passed: a.passed + row.passed, ownedFailures: a.ownedFailures + row.ownedFailures,
      declaredUnselectedSkips: a.declaredUnselectedSkips + row.declaredUnselectedSkips, executed: a.executed + row.executed }),
      { passed: 0, ownedFailures: 0, declaredUnselectedSkips: 0, executed: 0 });
    assert.deepEqual(totals, { passed: 90, ownedFailures: 8, declaredUnselectedSkips: 232, executed: 98 });
    json(path.join(out, 'summary.json'), { scope: 'Thirty existing German cases with eight physical source controls only. No build/App, rate, new public severe/transfer or full-suite credit.',
      children: 11, actualFiles: 4, physicalControls: 8, totals, results });
  } catch (error) { primaryError = error; }
  finally {
    for (const [target, expected] of written) {
      try { readOwned(copies[target], expected, 'Remove only exact owned last-written bytes'); fs.unlinkSync(copies[target]); }
      catch (error) { secondary.push({ stage: 'copy-cleanup-' + target, name: error.name, message: error.message }); }
    }
    try { if (sourceHeld) json(path.join(out, 'source-after.json'), holds(root, sourceHeld)); }
    catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { if (dependencyHeld) json(path.join(out, 'dependency-after.json'), holds(root, dependencyHeld)); }
    catch (error) { secondary.push({ stage: 'dependency-holds', name: error.name, message: error.message }); }
    try {
      const afterSource = memberNames(), afterDependencies = dependencyNames();
      json(path.join(out, 'members-after.json'), { source: afterSource, dependencies: afterDependencies });
      if (sourceMembers) assert.deepEqual(afterSource, sourceMembers, 'Source membership held');
      if (dependencyMembers) assert.deepEqual(afterDependencies, dependencyMembers, 'Dependency membership held');
      assert.equal(git(root, ['ls-files', '--others', '--exclude-standard']), '', 'No untracked source after cleanup');
      assert.equal(git(root, ['diff', '--exit-code', 'HEAD']), '', 'No tracked source diff');
    } catch (error) { secondary.push({ stage: 'membership-diff', name: error.name, message: error.message }); }
    try { json(path.join(out, 'receipt.json'), { complete: !primaryError && secondary.length === 0, completedChildren: results.length,
      completedControls: controls.length, removedCopies: Object.fromEntries(Object.entries(copies).map(([target, file]) => [target, !fs.existsSync(file)])),
      primary: primaryError ? { name: primaryError.name, message: primaryError.message, stack: primaryError.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primaryError) throw primaryError;
  assert.deepEqual(secondary, [], 'German harness cleanup or immutable-input holds failed');
  console.log('SC_GERMAN_SUPERCUP: 11 children, 90 healthy, 8 owned, 232 unselected, 98 executed. Evidence: ' + out);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
