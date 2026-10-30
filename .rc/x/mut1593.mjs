// Reviewer mutation runner for Round 1593 (runs on a GitHub runner only, sent as .rc/x/mut1593.mjs).
// Usage: node .rc/x/mut1593.mjs <mutation> <check>...   where a check is one of the CHECKS keys.
// Applies one source edit (asserted to stand exactly once), runs each check, restores the file byte for byte,
// and prints one closing line: KILLED (some check went red) or SURVIVED (every check green). Exit 0 killed, 1 survived,
// 2 the mutation could not be applied (an abort, not a result).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CM = 'src/lib/clubManager.ts';
const MUTATIONS = {
  // The board's Europa League target: a quarter-final counted as a semi-final reached (an off by one in the rank table).
  'm-rank': { file: CM, from: '{ PO: 1, R16: 1, QF: 1, SF: 2, F: 3 }', to: '{ PO: 1, R16: 1, QF: 2, SF: 2, F: 3 }' },
  // The play gate drops route P (the cup's place passed down): such a club watches instead of playing.
  'm-noP': { file: CM, from: "(earned === 'L' || earned === 'C' || earned === 'P')) {", to: "(earned === 'L' || earned === 'C')) {" },
  // euroPlaceOf forgets the Europa League winner (the board's Champions League rung, correction 13's second reader).
  'm-place': { file: CM, from: 'if ((league.euro && pos > 0 && pos <= places) || wonUelThisSeason(career)) place = ', to: 'if ((league.euro && pos > 0 && pos <= places)) place = ' },
  // A shootout recorded for the wrong side (a swapped comparison).
  'm-pens': { file: CM, from: "res.pens = shootoutWon === my.atHome ? 'h' : 'a';", to: "res.pens = shootoutWon !== my.atHome ? 'h' : 'a';" },
  // A tail night a fortnight after the one before instead of a week (a stale constant): still Thursdays.
  'm-tail': { file: 'src/lib/clubManagerCalendar.ts', from: 'addDays(lastUel, 7)', to: 'addDays(lastUel, 14)' },
  // Correction 7: the night written into the slice in place instead of replacing it (the memo may serve it stale).
  'm-inplace': { file: CM, from: "setWorldComp(state, 'uel', { ...slice, mine: { ...(slice.mine ?? {}), [n]: res } });", to: 'slice.mine = { ...(slice.mine ?? {}), [n]: res };' },
  // Correction 6a: a participant night dated the day after its own Thursday entry (a Friday on the screens).
  'm-friday': { file: 'src/lib/clubManagerCalendar.ts', from: "if (p.entry && state.calendar[p.at]?.type === 'uel') return dates[p.at];", to: '' },
  // The one match final no longer on a neutral ground (the bracket's home club hosts it).
  'm-neutral': { file: CM, from: "home: my.night.stage === 'F' ? null : my.atHome", to: 'home: my.atHome' },
  // Correction 4a: no Europa League board target for a participant.
  'm-noobj': { file: CM, from: 'state.boardObjectives = at >= 0 ?', to: 'if (Math.PI < 0) state.boardObjectives = at >= 0 ?' },
};
const CHECKS = {
  sim: ['node', ['scripts/simCmEuroPlay.mjs']],
  sim1234: ['node', ['scripts/simCmEuroPlay.mjs'], { CM_EURO_PLAY_ONLY: '1,2,3,4' }],
  board: ['node', ['scripts/simBoardObjectives.mjs']],
  boardsim: ['node', ['scripts/simBoard.mjs']],
  vitest: ['node_modules/.bin/vitest', ['run', 'src/lib/worldCompetition.test.ts', 'src/lib/worldNights.test.ts', '--testTimeout=300000', '--hookTimeout=120000']],
  calendar: ['node', ['scripts/simClubManagerCalendar.mjs']],
  rules: ['node', ['scripts/simCmLeagueRules.mjs']],
  vitestview: ['node_modules/.bin/vitest', ['run', 'src/lib/clubManagerWorldView.test.ts', 'src/lib/worldNights.test.ts', '--testTimeout=300000', '--hookTimeout=120000']],
  worlducl: ['node', ['scripts/simWorldUcl.mjs']],
};
const [name, ...checks] = process.argv.slice(2);
const m = MUTATIONS[name];
if (!m) { console.log(`MUT ${name}: no such mutation`); process.exit(2); }
const orig = fs.readFileSync(m.file, 'utf8');
const n = orig.split(m.from).length - 1;
if (n !== 1) { console.log(`MUT ${name}: ABORT, the text stands ${n} times in ${m.file}`); process.exit(2); }
fs.writeFileSync(m.file, orig.replace(m.from, m.to));
console.log(`MUT ${name}: applied to ${m.file}`);
const out = [];
try {
  for (const c of checks) {
    const [cmd, args, env] = CHECKS[c];
    const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', env: { ...process.env, ...(env || {}) }, maxBuffer: 1 << 28 });
    const lines = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    console.log(`--- ${c} exit ${r.status}`);
    console.log(lines.filter(l => /FAIL|RED|green|passed|failed|Tests |control|fired|FIRED/i.test(l)).slice(0, 25).join('\n'));
    console.log(lines.slice(-3).join('\n'));
    out.push(`${c}=${r.status}`);
  }
} finally {
  fs.writeFileSync(m.file, orig);
}
const killed = out.some(x => !x.endsWith('=0'));
console.log(`MUT ${name}: ${killed ? 'KILLED' : 'SURVIVED'} (${out.join(' ')})`);
process.exit(killed ? 0 : 1);
