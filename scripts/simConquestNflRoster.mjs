/** Round 532: ten outcome cases use real NFL cards and seeded battle simulations.
 * Golden digests were recorded before the engine change, with 32 seeds each.
 * Controls change exactly one source anchor in unique OS-temp copies.
 * Only a named AssertionError earns credit; runtime/caught-backend must exit 1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/lib/conquestBattle.roster.test.ts';
const FILES = { engine: 'src/lib/conquestBattle.ts', helper: 'src/lib/conquestRosterNfl.ts' };
const CONTROL = process.env.SIM_CONQUEST_NFL_ROSTER_CONTROL || '';
const CASES = [
  "preserves every original-roster fixed-seed battle output",
  "keeps an acquired defender in the real defense and play selections",
  "uses the real position of an acquired original-team quarterback",
  "uses the real position of an acquired original-team receiver",
  "uses power-pool running backs and tight ends in real offensive roles",
  "uses a curated signing in the real passing role",
  "keeps a transferred franchise legend in the real defensive role",
  "prefers an original team card over a conflicting free-agent card",
  "retains recipient-specific franchise legend and free-agent priorities",
  "keeps unknown names unresolved and preserves the engine fallback"
];
const CONTROLS = {
  "original": {
    "file": "helper",
    "test": 0,
    "message": "ORIGINAL: all 32 pre-fix original-roster outcomes are unchanged",
    "from": "  if (ownPlayer) return ownPlayer;",
    "to": "  if (ownPlayer) return { ...ownPlayer, overall: 75 };"
  },
  "callthrough": {
    "file": "engine",
    "test": 1,
    "message": "DEFENDER: the acquired 89 OVR defender retains all 32 defensive role selections",
    "from": "getNflRosterPlayer(name, teamId, legendPlayers) ||",
    "to": "TEAM_MAP.get(teamId)?.players.find(player => player.name === name) ||"
  },
  "global": {
    "file": "helper",
    "test": 2,
    "message": "QUARTERBACK: an acquired quarterback fills the passing role in all 32 battles",
    "from": "  for (const team of NFL_TEAMS) {",
    "to": "  for (const team of NFL_TEAMS.slice(0, 0)) {"
  },
  "receiver": {
    "file": "helper",
    "test": 3,
    "message": "RECEIVER: an acquired receiver fills the receiving role in all 32 battles",
    "from": "    if (player) return player;",
    "to": "    if (player && name !== 'Stefon Diggs') return player;\n    if (name === 'Stefon Diggs') return undefined;"
  },
  "runningback": {
    "file": "helper",
    "test": 4,
    "message": "RUNNING BACK: a power-pool signing fills the rushing role in all 32 battles",
    "from": "  const agent = FREE_AGENTS.find(player => player.name === name)",
    "to": "  if (name === 'Adrian Peterson') return undefined;\n  const agent = FREE_AGENTS.find(player => player.name === name)"
  },
  "tightend": {
    "file": "helper",
    "test": 4,
    "message": "TIGHT END: a power-pool signing fills the receiving role in all 32 battles",
    "from": "  const agent = FREE_AGENTS.find(player => player.name === name)",
    "to": "  if (name === 'Vernon Davis') return undefined;\n  const agent = FREE_AGENTS.find(player => player.name === name)"
  },
  "curated": {
    "file": "helper",
    "test": 5,
    "message": "CURATED: a curated signing fills the passing role in all 32 battles",
    "from": "    || CONQUEST_FREE_AGENCY_POOL.find(player => player.name === name);",
    "to": "    || CONQUEST_FREE_AGENCY_POOL.find(() => false);"
  },
  "legend": {
    "file": "helper",
    "test": 6,
    "message": "LEGEND: a transferred franchise legend fills the defensive role in all 32 battles",
    "from": "  if (!legendPlayers && legend) return { ...legend, overall: 99, keyStat: 'Legend' };",
    "to": "  if (!legendPlayers && legend) return undefined;"
  },
  "legendcard": {
    "file": "helper",
    "test": 6,
    "message": "LEGEND CARD: transferred franchise legends keep their 99 OVR card",
    "from": "  if (!legendPlayers && legend) return { ...legend, overall: 99, keyStat: 'Legend' };",
    "to": "  if (!legendPlayers && legend) return { ...legend, overall: 99, keyStat: '' };"
  },
  "ownpriority": {
    "file": "helper",
    "test": 7,
    "message": "ORIGINAL PRIORITY: original Diggs 86 wins over the conflicting free-agent 88",
    "from": "  if (ownPlayer) return ownPlayer;",
    "to": "  if (ownPlayer) return { ...ownPlayer, overall: 88 };"
  },
  "globalpriority": {
    "file": "helper",
    "test": 7,
    "message": "ORIGINAL PRIORITY: original Diggs 86 wins over the conflicting free-agent 88",
    "from": "    if (player) return player;",
    "to": "    if (player) return { ...player, overall: 88 };"
  },
  "ownlegend": {
    "file": "helper",
    "test": 8,
    "message": "OWN LEGEND: Peterson and Lynch use 99 OVR for their own franchises",
    "from": "  if (!legendPlayers && ownLegend?.name === name) return { ...ownLegend, overall: 99, keyStat: 'Legend' };",
    "to": ""
  },
  "poolpriority": {
    "file": "helper",
    "test": 8,
    "message": "POOL PRIORITY: other recipients keep Peterson 80 and Lynch 79 ahead of remaining legends",
    "from": "  if (agent) return { name: agent.name, position: agent.position, overall: agent.overall, keyStat: '' };",
    "to": "  if (agent && !Object.values(TEAM_LEGENDS).some(player => player.name === name)) return { ...agent, keyStat: '' };"
  },
  "unknown": {
    "file": "helper",
    "test": 9,
    "message": "UNKNOWN CARD: an unknown name remains unresolved",
    "from": "  return undefined;",
    "to": "  return { name, position: '?', overall: 75, keyStat: '' };"
  },
  "fallback": {
    "file": "engine",
    "test": 9,
    "message": "UNKNOWN FALLBACK: all 32 pre-fix 75 OVR fallback outcomes are unchanged",
    "from": "|| { name, position: '?', overall: 75, keyStat: '' });",
    "to": "|| { name, position: '?', overall: 74, keyStat: '' });"
  },
  "boxparticipant": {
    "file": "engine",
    "test": 1,
    "message": "PARTICIPANTS: box scores name only current battle rosters",
    "from": "    boxScore: { attStats, defStats },",
    "to": "    boxScore: { attStats: { ...attStats, passingQb: 'Caleb Williams' }, defStats },"
  },
  "playparticipant": {
    "file": "engine",
    "test": 1,
    "message": "PARTICIPANTS: visible plays name only current battle rosters",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: [...plays, { ...plays[0], description: 'Caleb Williams joins the play' }],\n    finalAttScore,"
  },
  "runtime": {
    "file": "helper",
    "test": 0,
    "message": null,
    "from": "  const ownPlayer =",
    "to": "  throw new Error('Unexpected NFL roster runtime control');\n  const ownPlayer ="
  },
  "backend": {
    "file": "helper",
    "test": 0,
    "message": null,
    "from": "export function getNflRosterPlayer",
    "to": "import { supabase as rosterBackendProbe } from '@/integrations/supabase/client';\ntry { void rosterBackendProbe.auth; } catch {}\nexport function getNflRosterPlayer"
  },
  "fetch": {
    "file": "helper",
    "test": 0,
    "message": "BOUNDARY: no transport storage or backend access",
    "from": "  const ownPlayer =",
    "to": "  try { void fetch('https://synthetic.invalid/roster'); } catch {}\n  const ownPlayer ="
  },
  "storage": {
    "file": "helper",
    "test": 0,
    "message": "BOUNDARY: no transport storage or backend access",
    "from": "  const ownPlayer =",
    "to": "  try { localStorage.setItem('synthetic-roster-probe', '1'); } catch {}\n  const ownPlayer ="
  },
  "defenderplays": {
    "file": "engine",
    "test": 1,
    "message": "DEFENDER PLAYS: the acquired defender appears in actual visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Montez Sweat').join('a player') })),\n    finalAttScore,"
  },
  "qbplays": {
    "file": "engine",
    "test": 2,
    "message": "PLAYS: Lamar Jackson participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Lamar Jackson').join('a player') })),\n    finalAttScore,"
  },
  "wrplays": {
    "file": "engine",
    "test": 3,
    "message": "PLAYS: Stefon Diggs participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Stefon Diggs').join('a player') })),\n    finalAttScore,"
  },
  "rbplays": {
    "file": "engine",
    "test": 4,
    "message": "PLAYS: Adrian Peterson participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Adrian Peterson').join('a player') })),\n    finalAttScore,"
  },
  "teplays": {
    "file": "engine",
    "test": 4,
    "message": "PLAYS: Vernon Davis participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Vernon Davis').join('a player') })),\n    finalAttScore,"
  },
  "curatedplays": {
    "file": "engine",
    "test": 5,
    "message": "PLAYS: Jimmy Garoppolo participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Jimmy Garoppolo').join('a player') })),\n    finalAttScore,"
  },
  "legendplays": {
    "file": "engine",
    "test": 6,
    "message": "PLAYS: Bruce Smith participates in real visible plays",
    "from": "    plays,\n    finalAttScore,",
    "to": "    plays: plays.map(play => ({ ...play, description: play.description.split('Bruce Smith').join('a player') })),\n    finalAttScore,"
  }
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-nfl-roster-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;
try {
  const control = CONTROLS[CONTROL], originalPath = control && path.join(ROOT, FILES[control.file]);
  const copy = path.join(temp, 'source.control.ts');
  if (control) {
    const original = fs.readFileSync(originalPath, 'utf8').replaceAll('\r\n', '\n');
    const matches = original.split(control.from).length - 1;
    if (matches !== 1 || control.from === control.to) throw new Error(`${CONTROL}: expected one changed source anchor, found ${matches}`);
    const changed = original.replace(control.from, control.to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in a unique OS-temp copy`);
  }
  const reporter = path.join(temp, 'reporter.mjs'), reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onUserConsoleLog(log) { this.measurements ||= []; this.measurements.push(log.content); }
  onFinished(files, errors) {
    const tests = [], suiteErrors = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, mode: task.mode, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
      else suiteErrors.push(...(task.result?.errors || []).map(shape));
      for (const child of task.tasks || []) visit(child);
    };
    for (const file of files || []) visit(file);
    fs.writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ files: (files || []).length, tests, suiteErrors, unhandled: (errors || []).map(shape), measurements: this.measurements || [] }));
  }
}
`);
  const config = path.join(temp, 'vitest.config.mjs');
  fs.writeFileSync(config, `import fs from 'node:fs';
export default {
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))}, esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-nfl-roster-control', enforce: 'pre', transform(code, id) {
    if (${!!control} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(originalPath ? slash(originalPath) : '')}) return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`];
  if (control) args.push('-t', CASES[control.test]);
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || run.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.files !== 1 || report.tests.length !== CASES.length || new Set(report.tests.map(test => test.name)).size !== CASES.length
    || report.tests.some(test => !CASES.includes(test.name))) throw new Error('The exact ten named outcome tests were not reported');
  if (report.unhandled.length || report.suiteErrors.length) throw new Error(`Unexpected runtime/suite errors: ${JSON.stringify({ unhandled: report.unhandled, suite: report.suiteErrors })}`);
  let exact = true;
  for (const [index, name] of CASES.entries()) {
    const test = report.tests.find(item => item.name === name);
    if (control && index !== control.test) {
      const skipped = (test.mode === 'skip' || test.state === 'skip') && test.errors.length === 0;
      exact &&= skipped; if (!skipped) console.error(JSON.stringify(test)); continue;
    }
    const message = control?.message;
    const matches = message ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (control ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${(run.stdout + run.stderr).slice(-2500)}`);
  console.log(`PASS: ${control ? '1 exact controlled failure' : '10/10 real NFL roster cases green'}; zero unhandled or suite errors`);
  if (!control) for (const measurement of report.measurements) console.log(measurement.trim());
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-nfl-roster-')) throw new Error('Refusing cleanup outside the unique NFL-roster temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary NFL roster control files cleaned');
}
if (!success) process.exitCode = 1;
