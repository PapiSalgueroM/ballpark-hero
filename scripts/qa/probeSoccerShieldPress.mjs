import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ENGINE = 'src/lib/soccerCareerEngine.ts', TEST = 'src/test/soccerPressRoomReadAsAbsent.test.tsx';
const TARGET = 'the journey of ruling C3 for the Press room: can natural play make the part unreadable every unreadable part on the fleet is the one known road, and the room is open again on the next playing screen';
const IDENTITIES = [
  "the journey of ruling C3 for the Press room: can natural play make the part unreadable every unreadable part on the fleet is the one known road, and the room is open again on the next playing screen",
  "pressRoom: a part that cannot be verified is read as absent the fixtures are honest: each undamaged part is readable and its season is answered",
  "pressRoom: a part that cannot be verified is read as absent THE ROAD natural play has, on the real engine: the Golden Boot Arithmetic deal rewrites a season that settled a promise",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent another version: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent null: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): it reads as no press room, the room is offered again and the next answer writes a fresh part",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent another version: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent null: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): the tile is on the page again",
  "pressRoom: a part that cannot be verified is read as absent a wrong shape: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent another version: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent null: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a row whose season no longer matches: a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a settled promise whose settled row no longer matches (four goals added to it, as the one natural road does): a played year never throws on it, pays nothing and leaves it as it lies",
  "pressRoom: a part that cannot be verified is read as absent a pending promise in an unreadable part ends with no verdict, on the real engine too"
];
const ENGINE_EDITS = [
  {
    "before": "import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, clubKeyOf, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';",
    "after": "import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, leagueWorldOrder, settledLeagueOrder, readLeagueWorldSeason, clubKeyOf, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';\nimport { captureCommunityShield, playCommunityShield, communityShieldSeasonStats, countCommunityShields, type ExtraCupQualification, type CommunityShieldResult } from './soccerCareerExtraCups';"
  },
  {
    "before": "export interface SeasonRecord {\n",
    "after": "export interface SeasonRecord {\n  extraCups?: CommunityShieldResult[];\n"
  },
  {
    "before": "export interface CareerState {\n",
    "after": "export interface CareerState {\n  extraCupQualification?: ExtraCupQualification;\n"
  },
  {
    "before": "  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const season = generateSeasonStats(s, worldClubs);",
    "after": "  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const shieldYear = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1;\n  const shieldEntry = s.extraCupQualification;\n  const shieldEntrants = shieldEntry?.status === 'ready' && Array.isArray(shieldEntry.entrants) ? shieldEntry.entrants : [];\n  const shieldClubs = adjustClubsForYear(worldClubs, shieldYear);\n  const shieldValues = shieldEntrants.length === 2 && shieldEntrants.every(e => e && typeof e.club === 'string')\n    ? shieldEntrants.map(e => {\n      const c = shieldClubs.find(club => clubKeyOf(club.name) === clubKeyOf(e.club))\n        ?? (clubKeyOf(e.club) === clubKeyOf(s.currentClub) ? { name: s.currentClub, tier: s.currentClubTier } : undefined);\n      return c && Number.isFinite(c.tier) && c.tier > 0\n        ? 5 - c.tier + (eliteInYear(ELITE_CLUBS, c.name, shieldYear) ? 0.5 : 0) : null;\n    }) : [];\n  const shieldStrengths: [number, number] | null = shieldValues.length === 2 && typeof shieldValues[0] === 'number' && typeof shieldValues[1] === 'number'\n    ? [shieldValues[0], shieldValues[1]] : null;\n  const shieldBand = projectLeagueApps(s.overall, s.currentClubTier, s.currentClub, s.seasons.filter(row => row.club === s.currentClub && row.type === 'playing').length);\n  const shieldMatch = playCommunityShield({\n    qualification: shieldEntry, eventYear: shieldYear, playerName: s.playerName, club: s.currentClub,\n    position: s.position, overall: s.overall, selectionChance: Math.max(0, Math.min(1, (shieldBand.min + shieldBand.max) / 2 / 38)),\n    unavailableReason: s.pendingRehab ? 'unresolved-rehab' : (s.pendingSuspensionMatches ?? 0) > 0 ? 'pending-generic-suspension' : null,\n    teamStrengths: shieldStrengths,\n  });\n  const season = generateSeasonStats(s, worldClubs);\n  if (shieldMatch) season.extraCups = [shieldMatch];"
  },
  {
    "before": "      prepareLeagueWorld(s, clubs, injuryRow.year + 1);\n      return s;",
    "after": "      prepareLeagueWorld(s, clubs, injuryRow.year + 1);\n      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));\n      return s;"
  },
  {
    "before": "    if (run) season.cupRun = run;\n  }\n\n  // Ballon d'Or calculation. Round 834:",
    "after": "    if (run) season.cupRun = run;\n  }\n  {\n    const closingWorld = s.leagueWorld;\n    const ownLeague = readLeagueWorldSeason(season);\n    let englishOrder: string[] | null = null;\n    if (closingWorld && closingWorld.year === thisYear) {\n      englishOrder = ownLeague?.league === 'Premier League'\n        ? settledLeagueOrder(closingWorld, 'Premier League', s.playerName, clubs, season)\n        : leagueWorldOrder(closingWorld, 'Premier League', s.playerName, clubs);\n    }\n    const ownFA = cupAssoc === 'England' && season.domesticCup && readCupRun(season)?.cup === 'FA Cup';\n    const recordedCupWinner = world.cups?.['Premier League'];\n    const cupWinner = ownFA && (!recordedCupWinner || clubKeyOf(recordedCupWinner) !== clubKeyOf(season.club)) ? undefined : recordedCupWinner;\n    const nextShield = captureCommunityShield({\n      qualifyingYear: thisYear, worldYear: world.year, seed: s.phone?.seed, englishOrder,\n      leagueWinner: world.leagues['Premier League'], cupWinner,\n      cupSource: ownFA ? 'validated-player-fa-cup' : 'phone-world',\n    });\n    if (nextShield) s.extraCupQualification = nextShield;\n    else delete s.extraCupQualification;\n  }\n\n  // Ballon d'Or calculation. Round 834:"
  },
  {
    "before": "  prepareLeagueWorld(s, clubs, season.year + 1);\n  return s;\n}\n\n/* ─── Round 131: breaking your own ceiling",
    "after": "  prepareLeagueWorld(s, clubs, season.year + 1);\n  Object.assign(season, communityShieldSeasonStats(season, shieldMatch));\n  return s;\n}\n\n/* ─── Round 131: breaking your own ceiling"
  },
  {
    "before": "export function getCareerTotals(seasons: SeasonRecord[]) {\n  return seasons.reduce",
    "after": "export function getCareerTotals(seasons: SeasonRecord[]) {\n  const totals = seasons.reduce"
  },
  {
    "before": "  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, continentalCups: 0, clubCups: 0 });\n}\n\n/* ─── Legacy Calculation ─── */",
    "after": "  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, continentalCups: 0, clubCups: 0 });\n  return { ...totals, communityShields: countCommunityShields(seasons) };\n}\n\n/* ─── Legacy Calculation ─── */"
  }
];
const sha = body => createHash('sha256').update(body).digest('hex');
const git = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const omitLines = ['      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));\n',
  '  Object.assign(season, communityShieldSeasonStats(season, shieldMatch));\n'];
async function main() {
  assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  const root = process.cwd(), out = path.resolve(process.env.SC_PRESS_DIAGNOSTIC_OUT || '');
  assert.ok(process.env.SC_PRESS_DIAGNOSTIC_OUT && out.startsWith(path.join(root, 'tmp') + path.sep));
  assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Fresh evidence directory');
  fs.mkdirSync(out, { recursive: true });
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const held = new Map();
  for (const file of [ENGINE, TEST, 'src/lib/soccerCareerPress.ts', 'src/lib/soccerCareerExtraCups.ts', 'src/lib/careerEras.ts',
    'scripts/data/careerLeagueWorldSaves1100.json', 'src/test/setup.ts', 'vitest.config.ts', 'package.json',
    'package-lock.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs', relative(fileURLToPath(import.meta.url))]) {
    const rawBytes = await fs.promises.readFile(path.join(root, file)); held.set(file, Buffer.from(rawBytes));
  }
  const holds = () => [...held].map(([file, bytes]) => {
    const actual = fs.readFileSync(path.join(root, file)); assert.deepEqual(actual, bytes, 'Held source: ' + file);
    return { file, bytes: actual.length, sha256: sha(actual), gitBlob: git(actual) };
  });
  write(path.join(out, 'source-before.json'), holds());
  const engineBytes = held.get(ENGINE), testBytes = held.get(TEST);
  assert.equal(sha(engineBytes), '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c');
  assert.equal(sha(testBytes), 'bde9d553ff4e634ba782a7242d997f33d5136873e3339bdaf1754e7ce585abeb');
  assert.equal(git(engineBytes), '53c57e31c4796e8ea4934d133cc1d82baa6ec34b');
  assert.equal(git(testBytes), '9b00b67863c3c730146382307abe1b354482dd11');
  const original = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n/g, '\n');
  const originalTest = fs.readFileSync(path.join(root, TEST), 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(Buffer.from(original), engineBytes, 'Exact admitted LF engine');
  assert.deepEqual(Buffer.from(originalTest), testBytes, 'Exact admitted LF test');
  const replaceOne = (body, before, after) => {
    const offset = body.indexOf(before); assert.ok(offset >= 0 && body.indexOf(before, offset + 1) < 0, 'Unique edit');
    return { body: body.slice(0, offset) + after + body.slice(offset + before.length), offset, before, after };
  };
  const inverse = (body, edits) => {
    for (const edit of [...edits].reverse()) {
      assert.equal(body.slice(edit.offset, edit.offset + edit.after.length), edit.after);
      body = body.slice(0, edit.offset) + edit.before + body.slice(edit.offset + edit.after.length);
    }
    return body;
  };
  let old = original, noLate = original, diagnostic = originalTest;
  const oldEdits = [], omissionEdits = [], testEdits = [];
  for (const edit of [...ENGINE_EDITS].reverse()) {
    const step = replaceOne(old, edit.after, edit.before); oldEdits.push({ offset: step.offset, before: edit.after, after: edit.before }); old = step.body;
  }
  assert.equal(inverse(old, oldEdits), original);
  const oldBytes = Buffer.from(old);
  assert.equal(sha(oldBytes), 'a62262813f12c1c2a002e1abf0cd825ac2395a2ef16b74869040f2cde83d2211');
  assert.equal(git(oldBytes), '722b2285628775dff77f8de0138cf44d7b104b49');
  for (const line of omitLines) {
    const step = replaceOne(noLate, line, ''); omissionEdits.push({ offset: step.offset, before: line, after: '' }); noLate = step.body;
  }
  assert.equal(inverse(noLate, omissionEdits), original); assert.notEqual(sha(Buffer.from(noLate)), sha(engineBytes));
  for (const edit of [
    { before: "import { readFileSync } from 'node:fs';", after: "import { readFileSync, appendFileSync } from 'node:fs';" },
    { before: "    if (broken) return;\n    broken = true;",
      after: "    if (broken) return;\n    if (process.env.SC_PRESS_DIAGNOSTIC_FILE) appendFileSync(process.env.SC_PRESS_DIAGNOSTIC_FILE, JSON.stringify({ journey: { name: j.name, seed: j.seed, nationality: j.nationality, position: j.position, potential: j.potential }, where, observedAt: Date.now(), giftedRoad: giftedRoad(s), view: pressRoomView(s), career: clone(s) }) + '\\n');\n    broken = true;" },
  ]) { const step = replaceOne(diagnostic, edit.before, edit.after); testEdits.push({ ...edit, offset: step.offset }); diagnostic = step.body; }
  assert.equal(inverse(diagnostic, testEdits), originalTest); assert.ok(diagnostic.includes('expect(unexplained).toEqual([]);'));
  const bodies = { current: engineBytes, 'old-722': oldBytes, 'without-late-merges': Buffer.from(noLate), 'restored-current': engineBytes };
  const sources = [];
  for (const [name, body] of Object.entries(bodies)) {
    fs.writeFileSync(path.join(out, name + '.engine.ts'), body, { flag: 'wx' }); sources.push({ name, bytes: body.length, sha256: sha(body), gitBlob: git(body) });
  }
  fs.writeFileSync(path.join(out, 'original.test.tsx'), testBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'diagnostic.test.tsx'), diagnostic, { flag: 'wx' });
  write(path.join(out, 'source-edits.json'), { oldEdits, omissionEdits, testEdits, wholeOldInverse: true, wholeOmissionInverse: true, wholeTestInverse: true });
  write(path.join(out, 'source-manifest.json'), sources);
  const engineCopy = path.join(root, 'src/lib/__control_shield_press_' + process.pid + '.ts');
  const testCopy = path.join(root, 'src/test/__control_shield_press_' + process.pid + '.test.tsx');
  assert.equal(fs.existsSync(engineCopy), false); assert.equal(fs.existsSync(testCopy), false);
  let writtenEngine = null, writtenTest = null, primary = null;
  const results = [], secondary = [];
  try {
    fs.writeFileSync(testCopy, diagnostic, { flag: 'wx' }); writtenTest = Buffer.from(diagnostic);
    for (const source of sources) {
      const body = bodies[source.name]; fs.writeFileSync(engineCopy, body, { flag: results.length ? 'w' : 'wx' }); writtenEngine = Buffer.from(body);
      const env = { ...process.env, NODE_OPTIONS: '', CI: '1', SIM_NETWORK: 'offline' };
      for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'SC_EXTRA_CUPS_ENGINE', 'SC_SHIELD_SEVERE_EVIDENCE']) delete env[key];
      env.US_BOARD_CONTROL_ALIAS = '@/lib/soccerCareerEngine'; env.US_BOARD_CONTROL_FILE = engineCopy;
      env.SC_PRESS_DIAGNOSTIC_FILE = path.join(out, source.name + '.breaks.jsonl'); env.SIM_OFFLINE_RECEIPT = path.join(out, source.name + '.transport');
      fs.writeFileSync(env.SC_PRESS_DIAGNOSTIC_FILE, '', { flag: 'wx' }); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
      const reportFile = path.join(out, source.name + '.vitest.json');
      const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'),
        'run', relative(testCopy), '--testNamePattern=^' + TARGET + '$', '--maxWorkers=1', '--minWorkers=1',
        '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
      write(path.join(out, source.name + '.argv.json'), [process.execPath, ...args]);
      const startedAt = Date.now(), child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
      fs.writeFileSync(path.join(out, source.name + '.stdout'), child.stdout || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, source.name + '.stderr'), child.stderr || '', { flag: 'wx' });
      fs.writeFileSync(path.join(out, source.name + '.exit'), String(child.status) + '\n', { flag: 'wx' });
      write(path.join(out, source.name + '.process.json'), { startedAt, endedAt: Date.now(), status: child.status, signal: child.signal,
        error: child.error ? { name: child.error.name, message: child.error.message } : null });
      assert.ifError(child.error); assert.equal(child.signal, null); assert.ok([0, 1].includes(child.status)); assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0);
      assert.deepEqual(fs.readFileSync(engineCopy), writtenEngine); assert.deepEqual(fs.readFileSync(testCopy), writtenTest); holds();
      const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes), raw = (child.stdout || '') + '\n' + (child.stderr || '');
      const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
      const errors = Object.fromEntries(['errors', 'unhandledErrors'].map(key => [key, report[key] ?? null]));
      for (const value of Object.values(counters)) if (value !== null) assert.equal(value, 0);
      for (const value of Object.values(errors)) if (value !== null) assert.deepEqual(value, []);
      assert.equal(/(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:)/i.test(raw), false);
      assert.equal(report.testResults.length, 1); const suite = report.testResults[0];
      assert.equal(relative(suite.name), relative(testCopy)); assert.equal(suite.message, ''); assert.equal(suite.assertionResults.length, 19);
      assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), [...IDENTITIES].sort());
      const selected = suite.assertionResults.filter(row => row.fullName === TARGET); assert.equal(selected.length, 1);
      for (const row of suite.assertionResults) if (row.fullName !== TARGET) { assert.ok(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); }
      const row = selected[0], failed = row.status === 'failed'; assert.ok(['passed', 'failed'].includes(row.status));
      assert.equal(report.success, !failed); assert.equal(child.status, failed ? 1 : 0);
      for (const [key, value] of Object.entries({ numTotalTests: 19, numPassedTests: failed ? 0 : 1, numFailedTests: failed ? 1 : 0, numPendingTests: 18, numTodoTests: 0 })) assert.equal(report[key], value);
      let primaryHeadline = null;
      if (failed) {
        assert.equal(row.failureMessages.length, 1);
        primaryHeadline = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim() ?? '';
        assert.ok(primaryHeadline.startsWith('AssertionError: expected [') && primaryHeadline.includes('to deeply equal []'), 'Only the original unexplained-array assertion owns a reproduced failure');
      } else assert.deepEqual(row.failureMessages, []);
      const breakBytes = fs.readFileSync(env.SC_PRESS_DIAGNOSTIC_FILE), breaks = breakBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
      const result = { name: source.name, failed, passed: !failed, primaryHeadline, source, rawExit: child.status,
        rawReportSha256: sha(reportBytes), breaksSha256: sha(breakBytes), breaks: breaks.map(value => ({ journey: value.journey, where: value.where,
          giftedRoad: value.giftedRoad, phase: value.career.phase, seasons: value.career.seasons.length, pressHistory: value.career.pressRoom?.history?.length ?? null })),
        counters, errors, runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED' };
      write(path.join(out, source.name + '.summary.json'), result); results.push(result);
    }
    write(path.join(out, 'observations.json'), { scope: 'Original seeded 17-career journey, no clock mock or input-policy change. Four selected executions only.', results });
    const reproduced = JSON.stringify(results.map(row => row.failed)) === JSON.stringify([true, false, false, true]);
    write(path.join(out, 'summary.json'), { schemaVersion: 1, causalPatternObserved: reproduced, children: 4, selectedExecutions: 4,
      totalRows: 76, declaredUnselected: 72, results, readiness: 'DIAGNOSTIC ONLY' });
    assert.equal(reproduced, true, 'SC_PRESS_DIAGNOSTIC_PATTERN: inspect retained observations before attributing the full-unit failure');
  } catch (error) { primary = error; }
  finally {
    for (const [file, expected] of [[testCopy, writtenTest], [engineCopy, writtenEngine]]) {
      try { if (fs.existsSync(file)) { assert.deepEqual(fs.readFileSync(file), expected); fs.unlinkSync(file); } }
      catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message }); }
    }
    try { write(path.join(out, 'source-after.json'), holds()); } catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { completed: !primary && secondary.length === 0, children: results.length,
      copiesRemoved: !fs.existsSync(testCopy) && !fs.existsSync(engineCopy),
      primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); }
    catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary; assert.deepEqual(secondary, []);
  console.log('SC_PRESS_DIAGNOSTIC: four selected executions retained; current/restored original-assertion failures, exact722 and only-late-merge-omission passed. No reader repair or full-unit credit.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
