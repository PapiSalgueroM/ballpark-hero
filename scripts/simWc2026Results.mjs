/* 2026 World Cup results harness: the bracket game scores against what was played.

   Round 395. /world-cup-bracket asked players to predict a tournament that
   ended on July 19, 2026, never learned the result, and carried a Group J
   with Chile and Nigeria in it, two teams that did not qualify (Austria and
   Jordan played). src/data/wc2026Results.ts is the tournament as played,
   two-source verified (ESPN's feed and Wikipedia's articles, compared
   programmatically), and src/lib/wc2026Score.ts scores a bracket against it.

   WHAT THIS HOLDS:
     1. THE RESULTS FILE IS INTERNALLY TRUE. Twelve groups of four, 48 distinct
        teams, exactly eight qualified thirds; 32 knockout matches whose
        winners are one of their two teams; every team in a round won a match
        in the round before (the round of 32 draws only from top twos and
        qualified thirds); the champion is the final's winner and the
        third-place winner is a semi-final loser.
     2. THE PAGE'S GROUPS ARE THE REAL GROUPS. The predictor's GROUPS constant,
        read as code, holds exactly the 48 teams the results file holds, in
        the same groups. This is the Chile and Nigeria class.
     3. THE SCORING IS SANE, through the real module: a perfect bracket scores
        the maximum, an empty one zero, and a perfect bracket with the wrong
        champion loses exactly the champion's points.
     4. THE AWARD PICK LISTS CAN NAME THE WINNERS. A pick list without the
        real Golden Ball winner makes that award unwinnable.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_WC2026_CONTROL=chain   breaks one knockout winner in memory; 1 red.
     SIM_WC2026_CONTROL=swap    swaps two teams between the page's groups in
                                memory; 2 red.
     SIM_WC2026_CONTROL=score   scores the perfect bracket with the wrong
                                champion and pretends that is the maximum; 3 red.
   Each control refuses to run if what it rewrites is not there, and is judged
   on its own section only.

   Run: node scripts/simWc2026Results.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_WC2026_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ENTRY = path.join(os.tmpdir(), 'wc2026Entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wc2026.bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as data from '${ROOT_URL}/src/data/wc2026Results.ts';
export * as score from '${ROOT_URL}/src/lib/wc2026Score.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { data, score } = await import(pathToFileURL(BUNDLE).href);

const groups = data.WC2026_GROUPS.map(g => ({ ...g, teams: [...g.teams] }));
const knockout = data.WC2026_KNOCKOUT.map(m => ({ ...m }));
if (CONTROL === 'chain') {
  const m = knockout.find(x => x.round === 'qf');
  if (!m) abort('control cannot run: no quarter-final to break');
  m.winner = m.winner === m.team1 ? m.team2 : m.team1;
  console.log(`   NEGATIVE CONTROL ON: ${m.team1} v ${m.team2} now says ${m.winner} won`);
}

section = 1;
console.log('1) The results file is internally true');
{
  const all = groups.flatMap(g => g.teams);
  if (groups.length !== 12) fail(`${groups.length} groups, expected 12`);
  if (all.length !== 48 || new Set(all).size !== 48) fail(`${all.length} team slots, ${new Set(all).size} distinct, expected 48 and 48`);
  const thirds = groups.filter(g => g.thirdQualified).length;
  if (thirds !== 8) fail(`${thirds} qualified thirds, expected 8`);
  const eligible = new Set(groups.flatMap(g => [g.teams[0], g.teams[1], ...(g.thirdQualified ? [g.teams[2]] : [])]));
  const byRound = r => knockout.filter(m => m.round === r);
  const counts = { r32: 16, r16: 8, qf: 4, sf: 2, tp: 1, f: 1 };
  for (const [r, n] of Object.entries(counts)) if (byRound(r).length !== n) fail(`${byRound(r).length} matches in ${r}, expected ${n}`);
  for (const m of knockout) {
    if (m.winner !== m.team1 && m.winner !== m.team2) fail(`${m.round}: winner ${m.winner} is neither ${m.team1} nor ${m.team2}`);
    if (m.score1 === m.score2 && !m.penalties) fail(`${m.round}: ${m.team1} v ${m.team2} level with no shootout`);
    if (m.score1 !== m.score2 && ((m.score1 > m.score2) !== (m.winner === m.team1))) fail(`${m.round}: ${m.team1} ${m.score1}-${m.score2} ${m.team2} but the winner is ${m.winner}`);
  }
  for (const m of byRound('r32')) for (const t of [m.team1, m.team2]) if (!eligible.has(t)) fail(`round of 32: ${t} did not finish top two or as a qualified third`);
  const chain = [['r32', 'r16'], ['r16', 'qf'], ['qf', 'sf'], ['sf', 'f']];
  for (const [prev, next] of chain) {
    const winners = new Set(byRound(prev).map(m => m.winner));
    for (const m of byRound(next)) for (const t of [m.team1, m.team2]) if (!winners.has(t)) fail(`${next}: ${t} did not win a match in ${prev}`);
  }
  const sfLosers = new Set(byRound('sf').map(m => (m.winner === m.team1 ? m.team2 : m.team1)));
  for (const m of byRound('tp')) for (const t of [m.team1, m.team2]) if (!sfLosers.has(t)) fail(`third place: ${t} did not lose a semi-final`);
  const final = byRound('f')[0];
  if (final && final.winner !== data.WC2026_CHAMPION) fail(`the champion constant says ${data.WC2026_CHAMPION}, the final was won by ${final.winner}`);
  console.log(`   ${groups.length} groups, ${all.length} teams, ${knockout.length} knockout matches, champion ${data.WC2026_CHAMPION}`);
}

section = 2;
console.log("2) The page's groups are the real groups");
{
  const code = stripComments(fs.readFileSync(path.join(ROOT, 'src/pages/WorldCupPredictor.tsx'), 'utf8'));
  const pageGroups = [...code.matchAll(/letter: "([A-L])", teams: \[([\s\S]*?)\]\s*\}/g)].map(m => ({ letter: m[1], teams: [...m[2].matchAll(/name: "([^"]+)"/g)].map(x => x[1]) }));
  if (CONTROL === 'swap') {
    const a = pageGroups.find(g => g.letter === 'A'), b = pageGroups.find(g => g.letter === 'B');
    if (!a || !b || !a.teams[3] || !b.teams[3]) abort('control cannot run: groups A and B not readable');
    [a.teams[3], b.teams[3]] = [b.teams[3], a.teams[3]];
    console.log(`   NEGATIVE CONTROL ON: ${a.teams[3]} and ${b.teams[3]} swapped between groups A and B in memory`);
  }
  if (pageGroups.length !== 12) fail(`the page declares ${pageGroups.length} groups, expected 12`);
  for (const g of groups) {
    const p = pageGroups.find(x => x.letter === g.letter);
    if (!p) { fail(`group ${g.letter} is not on the page`); continue; }
    const want = new Set(g.teams.map(t => t.toLowerCase()));
    const have = new Set(p.teams.map(t => t.toLowerCase()));
    for (const t of g.teams) if (!have.has(t.toLowerCase())) fail(`group ${g.letter}: ${t} played it but the page does not list them`);
    for (const t of p.teams) if (!want.has(t.toLowerCase())) fail(`group ${g.letter}: the page lists ${t}, who did not play in it`);
  }
  console.log(`   ${pageGroups.reduce((n, g) => n + g.teams.length, 0)} team slots on the page checked against the results`);
}

section = 3;
console.log('3) The scoring is sane through the real module');
{
  const seeds = {}; const thirds = [];
  for (const g of data.WC2026_GROUPS) { seeds[g.letter] = { first: g.teams[0], second: g.teams[1], third: g.teams[2] }; if (g.thirdQualified) thirds.push(g.teams[2]); }
  const rounds = score.realRounds();
  const awards = { goldenBoot: 'Mbappé', goldenGlove: 'Unai Simón', goldenBall: 'Rodri' };
  const perfect = score.scoreWc2026Bracket(seeds, thirds, rounds, awards);
  if (perfect.points !== perfect.maxPoints) fail(`a perfect bracket scores ${perfect.points}, the maximum is ${perfect.maxPoints}`);
  const empty = score.scoreWc2026Bracket({}, [], [], { goldenBoot: '', goldenGlove: '', goldenBall: '' });
  if (empty.points !== 0 || !empty.empty) fail(`an empty bracket scores ${empty.points} and empty=${empty.empty}`);
  const wrong = rounds.map(r => r.map(m => ({ ...m })));
  const fin = wrong[5][0]; fin.winner = fin.winner === fin.teamA ? fin.teamB : fin.teamA;
  const nearly = score.scoreWc2026Bracket(seeds, thirds, wrong, awards);
  const expected = CONTROL === 'score' ? perfect.maxPoints : perfect.maxPoints - 15;
  if (CONTROL === 'score') console.log('   NEGATIVE CONTROL ON: the wrong champion is expected to score the maximum');
  if (nearly.points !== expected) fail(`a perfect bracket with the wrong champion scores ${nearly.points}, expected ${expected}`);
  console.log(`   perfect ${perfect.points}/${perfect.maxPoints}, empty ${empty.points}, wrong champion ${nearly.points}`);
}

section = 4;
console.log('4) The award pick lists can name the winners');
{
  const code = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/world-cup-predictor/AwardsPredictor.tsx'), 'utf8'));
  const names = new Set([...code.matchAll(/name: "([^"]+)"/g)].map(m => m[1].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const [award, info] of Object.entries(data.WC2026_AWARDS)) {
    if (award === 'youngPlayer') continue;
    const full = strip(info.player);
    const listed = [...names].some(n => full === n || full.endsWith(' ' + n) || full.split(' ').includes(n));
    if (!listed) fail(`${award}: ${info.player} is not in any pick list, so nobody could have picked the winner`);
  }
  console.log(`   ${names.size} pick names checked against the three awards`);
}

const own = { chain: 1, swap: 2, score: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (chain, swap, score)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimWc2026Results: ${total} failure(s)`); process.exit(1); }
console.log('\nsimWc2026Results: all green');
