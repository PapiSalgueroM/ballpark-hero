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
     3. THE PAGE PATH CAN REACH THE MAXIMUM. The real group seeds enter the
        page's round-of-32 builder, real winners are picked one round at a
        time through its bracket builder, and that result scores 166. Changing
        only the final winner scores 151.
     4. THE AWARD PICK LISTS CAN NAME THE WINNERS. A pick list without the
        real Golden Ball winner makes that award unwinnable.
     5. THE PAGE'S SEEDING REBUILDS THE REAL ROUND OF 32. Round 396. The real
        group positions and the real eight thirds go through the same
        src/lib/wc2026Bracket.ts the page uses, and the sixteen pairings must
        equal the sixteen played, taken independently from the results file's
        round-of-32 matches. This is what makes the advertised maximum
        reachable by a player and not only by the scoring module.
     6. ALL 495 ANNEX C ALLOCATIONS ARE OFFICIAL. The compact matrix is checked
        against the full set of A to L choose eight combinations, a source
     digest, three independently copied anchor rows, the allowed opponent
        groups and ranking-order permutations. A missing row fails closed.
     7. THE EIGHT REVIEWED FIXTURE DATES ARE EXACT. These literals are the
        independently reviewed dates, not values derived from the data file.
     8. RESET INVALIDATION REMOVES CHILD STATE. Knockout picks and their seed
        signature are cleared on invalidation, Reset All also clears awards,
        a changed seed changes the signature, and a cancelled auto-fill timer
        cannot write after reset.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_WC2026_CONTROL=chain   breaks one knockout winner in memory; 1 red.
     SIM_WC2026_CONTROL=swap    swaps two teams between the page's groups in
                                memory; 2 red.
     SIM_WC2026_CONTROL=score   changes the page-built final pick in memory;
                                3 red.
     SIM_WC2026_CONTROL=pair    swaps two thirds in the allocation in memory;
                                5 red.
     SIM_WC2026_CONTROL=annex-coverage removes one official set; 6 red.
     SIM_WC2026_CONTROL=annex-integrity changes one source row; 6 red.
     SIM_WC2026_CONTROL=annex-anchor swaps two cells in option 67; 6 red.
     SIM_WC2026_CONTROL=annex-permutation restores ranking-order allocation;
                                6 red.
     SIM_WC2026_CONTROL=annex-missing accepts a deliberately missing row; 6 red.
     SIM_WC2026_CONTROL=date    changes one reviewed date in memory; 7 red.
     SIM_WC2026_CONTROL=reset-knockout restores knockout state; 8 red.
     SIM_WC2026_CONTROL=reset-signature restores its seed signature; 8 red.
     SIM_WC2026_CONTROL=reset-awards restores awards after Reset All; 8 red.
     SIM_WC2026_CONTROL=reset-seed undoes the changed seed; 8 red.
     SIM_WC2026_CONTROL=reset-timer schedules a write after cancel; 8 red.
   Each control refuses to run if what it rewrites is not there, and is judged
   on its own section only.

   Run: node scripts/simWc2026Results.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_WC2026_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ENTRY = path.join(os.tmpdir(), 'wc2026Entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wc2026.bundle.cjs');
fs.writeFileSync(ENTRY, `
export * as data from '${ROOT_URL}/src/data/wc2026Results.ts';
export * as score from '${ROOT_URL}/src/lib/wc2026Score.ts';
export * as bracket from '${ROOT_URL}/src/lib/wc2026Bracket.ts';
export * as lifecycle from '${ROOT_URL}/src/lib/wc2026Lifecycle.ts';
import React from '${ROOT_URL}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT_URL}/node_modules/react-dom/server.node.js';
import KnockoutBracket from '${ROOT_URL}/src/components/world-cup-predictor/KnockoutBracket.tsx';
export const renderKnockoutBracket = props => renderToStaticMarkup(React.createElement(KnockoutBracket, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const ssrDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://douknowball.com/world-cup-bracket' });
globalThis.localStorage = ssrDom.window.localStorage;
const { data, score, bracket, lifecycle, renderKnockoutBracket } = createRequire(import.meta.url)(BUNDLE);
globalThis.window = ssrDom.window;
globalThis.document = ssrDom.window.document;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: ssrDom.window.navigator });

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
console.log('3) The page path can reach the maximum');
{
  const seeds = {};
  const thirdEntries = [];
  for (const g of data.WC2026_GROUPS) {
    seeds[g.letter] = { first: g.teams[0], second: g.teams[1], third: g.teams[2] };
    if (g.thirdQualified) thirdEntries.push({ team: g.teams[2], group: g.letter });
  }
  const built = bracket.buildRound32(seeds, thirdEntries);
  if (built.allocation !== 'official') fail('the real group outcome did not use the official third allocation');
  const picks = {};
  const pairKey = (a, b) => [a, b].sort().join(' v ');
  const fillRound = (roundIndex, roundCode) => {
    const pageRounds = bracket.buildKnockoutRounds(built.slots, picks);
    const played = knockout.filter(m => m.round === roundCode);
    for (const match of pageRounds[roundIndex]) {
      const real = played.find(m => pairKey(m.team1, m.team2) === pairKey(match.teamA, match.teamB));
      if (!real) {
        fail(`${roundCode}: page built ${match.teamA} v ${match.teamB}, which was not played`);
        continue;
      }
      picks[match.id] = real.winner;
    }
  };
  fillRound(0, 'r32');
  fillRound(1, 'r16');
  fillRound(2, 'qf');
  fillRound(3, 'sf');
  fillRound(4, 'tp');
  fillRound(5, 'f');
  if (CONTROL === 'score') {
    const before = picks['f-0'];
    const final = bracket.buildKnockoutRounds(built.slots, picks)[5][0];
    if (!before || !final || (before !== final.teamA && before !== final.teamB)) abort('control cannot run: no valid page-built final pick');
    picks['f-0'] = before === final.teamA ? final.teamB : final.teamA;
    if (picks['f-0'] === before) abort('control cannot run: the final pick did not change');
    console.log(`   NEGATIVE CONTROL ON: final pick changed from ${before} to ${picks['f-0']} in memory`);
  }
  const rounds = bracket.buildKnockoutRounds(built.slots, picks);
  const awards = { goldenBoot: 'Mbappé', goldenGlove: 'Unai Simón', goldenBall: 'Rodri' };
  const perfect = score.scoreWc2026Bracket(seeds, thirdEntries.map(t => t.team), rounds, awards);
  if (perfect.points !== 166 || perfect.maxPoints !== 166) fail(`the page-built perfect bracket scores ${perfect.points}/${perfect.maxPoints}, expected 166/166`);
  const empty = score.scoreWc2026Bracket({}, [], [], { goldenBoot: '', goldenGlove: '', goldenBall: '' });
  if (empty.points !== 0 || !empty.empty) fail(`an empty bracket scores ${empty.points} and empty=${empty.empty}`);
  const wrong = rounds.map(r => r.map(m => ({ ...m })));
  const fin = wrong[5][0]; fin.winner = fin.winner === fin.teamA ? fin.teamB : fin.teamA;
  const nearly = score.scoreWc2026Bracket(seeds, thirdEntries.map(t => t.team), wrong, awards);
  if (nearly.points !== 151) fail(`the page-built bracket with only the final winner changed scores ${nearly.points}, expected 151`);
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

section = 5;
console.log("5) The page's seeding rebuilds the real round of 32");
{
  const seeds = {};
  const thirds = [];
  for (const g of data.WC2026_GROUPS) { seeds[g.letter] = { first: g.teams[0], second: g.teams[1] }; if (g.thirdQualified) thirds.push({ team: g.teams[2], group: g.letter }); }
  /* ranking order matters only for the fallback; the real set has an exact allocation */
  const built = bracket.buildRound32(seeds, thirds);
  const slots = built.slots.map(x => ({ ...x }));
  if (CONTROL === 'pair') {
    const i = slots.findIndex(x => x.a === 'Mexico'), j = slots.findIndex(x => x.a === 'Switzerland');
    if (i < 0 || j < 0) abort('control cannot run: the Mexico and Switzerland slots were not built');
    [slots[i].b, slots[j].b] = [slots[j].b, slots[i].b];
    console.log('   NEGATIVE CONTROL ON: the thirds Mexico and Switzerland meet are swapped in memory');
  }
  const real = data.WC2026_KNOCKOUT.filter(m => m.round === 'r32').map(m => [m.team1, m.team2].sort().join(' v '));
  const builtPairs = slots.map(x => [x.a, x.b].sort().join(' v '));
  if (built.allocation !== 'official') fail('the real qualifying set (' + thirds.map(t => t.group).sort().join('') + ') has no exact allocation, the page would fall back to ranking order');
  for (const p of real) if (!builtPairs.includes(p)) fail('the real pairing ' + p + ' is not produced by the page seeding');
  for (const p of builtPairs) if (!real.includes(p)) fail('the page seeding produces ' + p + ', which was not played');
  /* and in bracket order: consecutive slots meet in the round of 16 */
  const r16 = data.WC2026_KNOCKOUT.filter(m => m.round === 'r16').map(m => [m.team1, m.team2].sort().join(' v '));
  const winnerOf = pair => { const m = data.WC2026_KNOCKOUT.find(x => x.round === 'r32' && [x.team1, x.team2].sort().join(' v ') === pair); return m ? m.winner : '?'; };
  for (let i = 0; i < slots.length; i += 2) {
    const meet = [winnerOf(builtPairs[i]), winnerOf(builtPairs[i + 1])].sort().join(' v ');
    if (!r16.includes(meet)) fail('bracket order: slots ' + i + ' and ' + (i + 1) + ' would send ' + meet + ' into the round of 16, which was not played');
  }
  console.log('   ' + builtPairs.length + ' pairings built (' + built.allocation + ' allocation), ' + real.length + ' played');
}

section = 6;
console.log('6) All 495 Annex C allocations are official');
{
  const hosts = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'];
  const allowed = {
    A: 'CEFHI', B: 'EFGIJ', D: 'BEFIJ', E: 'ABCDF',
    G: 'AEHIJ', I: 'CDFGH', K: 'DEIJL', L: 'EHIJK',
  };
  const combinations = [];
  const choose = (start, picked) => {
    if (picked.length === 8) { combinations.push(picked.join('')); return; }
    for (let i = start; i <= 12 - (8 - picked.length); i++) choose(i + 1, [...picked, String.fromCharCode(65 + i)]);
  };
  choose(0, []);

  const rows = Array.isArray(bracket.ANNEX_C_ROWS) ? [...bracket.ANNEX_C_ROWS] : [];
  if (CONTROL === 'annex-integrity') {
    if (rows[0] !== 'EJIFHGLK') abort('control cannot run: official option 1 source row is not present');
    rows[0] = 'EJEFHGLK';
    if (rows[0] === 'EJIFHGLK') abort('control cannot run: option 1 source row did not change');
    console.log('   NEGATIVE CONTROL ON: option 1 source row changed from EJIFHGLK to EJEFHGLK in memory');
  }
  if (rows.length !== 495) fail(`the Annex C source has ${rows.length} rows, expected 495`);
  const digest = createHash('sha256').update(rows.join('\n')).digest('hex');
  const expectedDigest = 'e06e89037edbe92bd311866364bde7c6dcbb8e2fca6e9568c5f5418c0a5e383b';
  if (digest !== expectedDigest) fail(`the Annex C source digest is ${digest}, expected ${expectedDigest}`);

  const table = Object.fromEntries(Object.entries(bracket.THIRD_ALLOCATIONS || {}).map(([key, value]) => [key, { ...value }]));
  if (CONTROL === 'annex-coverage') {
    if (!table.ABCDEFGH) abort('control cannot run: allocation ABCDEFGH is not present');
    delete table.ABCDEFGH;
    if (table.ABCDEFGH) abort('control cannot run: allocation ABCDEFGH was not removed');
    console.log('   NEGATIVE CONTROL ON: allocation ABCDEFGH removed in memory');
  }
  const actualKeys = Object.keys(table).sort();
  if (actualKeys.length !== 495) fail(`the allocation table has ${actualKeys.length} keys, expected 495`);
  for (const key of combinations) if (!table[key]) fail(`official allocation ${key} is missing`);
  for (const key of actualKeys) if (!combinations.includes(key)) fail(`allocation ${key} is not one of the 495 possible group sets`);
  for (const [key, allocation] of Object.entries(table)) {
    const hostKeys = Object.keys(allocation).sort().join('');
    if (hostKeys !== 'ABDEGIKL') fail(`${key}: host keys are ${hostKeys}, expected ABDEGIKL`);
    const values = hosts.map(host => allocation[host] || '');
    if (new Set(values).size !== 8) fail(`${key}: the eight third groups are not distinct (${values.join('')})`);
    if ([...values].sort().join('') !== key) fail(`${key}: mapped groups ${values.join('')} do not equal the qualifying set`);
    for (let i = 0; i < hosts.length; i++) {
      if (!allowed[hosts[i]].includes(values[i])) fail(`${key}: winner ${hosts[i]} cannot officially face third ${values[i]}`);
    }
  }

  const anchorTable = Object.fromEntries(Object.entries(bracket.THIRD_ALLOCATIONS || {}).map(([key, value]) => [key, { ...value }]));
  if (CONTROL === 'annex-anchor') {
    const row = anchorTable.BDEFIJKL;
    if (!row || row.A !== 'E' || row.B !== 'J') abort('control cannot run: option 67 anchor is not intact');
    [row.A, row.B] = [row.B, row.A];
    if (row.A === 'E' || row.B === 'J') abort('control cannot run: option 67 anchor cells did not swap');
    console.log('   NEGATIVE CONTROL ON: option 67 hosts A and B swapped in memory');
  }
  const anchors = [
    ['EFGHIJKL', 'EJIFHGLK', 1],
    ['BDEFIJKL', 'EJBDIFLK', 67],
    ['ABCDEFGH', 'HGBCAFDE', 495],
  ];
  for (const [key, expected, option] of anchors) {
    const actual = hosts.map(host => anchorTable[key]?.[host] || '').join('');
    if (actual !== expected) fail(`source option ${option} maps to ${actual || 'nothing'}, expected ${expected}`);
  }

  const seeds = Object.fromEntries('ABCDEFGHIJKL'.split('').map(letter => [letter, { first: `1${letter}`, second: `2${letter}` }]));
  const entries = 'EFGHIJKL'.split('').map(group => ({ group, team: `3${group}` }));
  const expectedMap = 'EJIFHGLK';
  const original = bracket.buildRound32(seeds, entries);
  const reversed = bracket.buildRound32(seeds, [...entries].reverse());
  const rotated = bracket.buildRound32(seeds, [...entries.slice(3), ...entries.slice(0, 3)]);
  if (CONTROL === 'annex-permutation') {
    const before = hosts.map(host => reversed.thirds[host] || '').join('');
    hosts.forEach((host, index) => { reversed.thirds[host] = [...entries].reverse()[index].group; });
    const after = hosts.map(host => reversed.thirds[host] || '').join('');
    if (after === before) abort('control cannot run: ranking-order allocation did not change the reversed result');
    console.log(`   NEGATIVE CONTROL ON: reversed input allocation changed from ${before} to ${after} in memory`);
  }
  for (const [label, built] of [['original', original], ['reversed', reversed], ['rotated', rotated]]) {
    const actual = hosts.map(host => built.thirds[host] || '').join('');
    if (built.allocation !== 'official') fail(`${label} option 1 input was ${built.allocation}, expected official`);
    if (actual !== expectedMap) fail(`${label} option 1 input maps to ${actual}, expected ${expectedMap}`);
    if (built.slots.some(slot => slot.a === 'TBD' || slot.b === 'TBD')) fail(`${label} option 1 input left a round-of-32 slot unresolved`);
  }

  const missingKey = 'BDEFIJKL';
  const saved = bracket.THIRD_ALLOCATIONS?.[missingKey];
  if (!saved) abort('missing-row test cannot run: option 67 is absent before deletion');
  delete bracket.THIRD_ALLOCATIONS[missingKey];
  if (bracket.THIRD_ALLOCATIONS[missingKey]) abort('missing-row test cannot run: option 67 was not deleted');
  const realSeeds = {};
  const realThirds = [];
  for (const group of data.WC2026_GROUPS) {
    realSeeds[group.letter] = { first: group.teams[0], second: group.teams[1] };
    if (group.thirdQualified) realThirds.push({ team: group.teams[2], group: group.letter });
  }
  try {
    const missing = bracket.buildRound32(realSeeds, realThirds);
    if (CONTROL === 'annex-missing') {
      const before = missing.allocation;
      missing.allocation = 'official';
      if (before === missing.allocation) abort('control cannot run: missing allocation state did not change');
      console.log(`   NEGATIVE CONTROL ON: missing option 67 changed from ${before} to official in memory`);
    }
    if (missing.allocation !== 'unverified') fail(`a missing official row returns ${missing.allocation}, expected unverified`);
    if (Object.keys(missing.thirds).length !== 0) fail('a missing official row returned guessed third allocations');
    const unresolved = missing.slots.filter(slot => slot.a === 'TBD' || slot.b === 'TBD').length;
    if (unresolved !== 8) fail(`a missing official row left ${unresolved} unresolved third matches, expected 8`);
  } finally {
    bracket.THIRD_ALLOCATIONS[missingKey] = saved;
  }

  const invalidThirds = [
    { team: '3A one', group: 'A' }, { team: '3A two', group: 'A' },
    ...'BCDEFG'.split('').map(group => ({ team: `3${group}`, group })),
  ];
  const html = renderKnockoutBracket({ seeds, bestThirds: invalidThirds });
  const renderedDom = new JSDOM(html);
  const document = renderedDom.window.document;
  const alert = document.querySelector('[role="alert"]');
  if (!alert || !/official round of 32/i.test(alert.textContent || '')) fail('an unavailable official allocation has no visible honest notice');
  const tbdButtons = [...document.querySelectorAll('button')].filter(button => button.querySelector('[title="TBD"]'));
  if (tbdButtons.length !== 8) fail(`the unavailable allocation renders ${tbdButtons.length} TBD buttons, expected 8`);
  for (const button of tbdButtons) {
    const matchButtons = button.parentElement?.querySelectorAll('button') || [];
    if (matchButtons.length !== 2 || [...matchButtons].some(candidate => !candidate.disabled)) fail('an unresolved third-place match still has a clickable team');
  }
  renderedDom.window.close();
  console.log(`   ${rows.length} source rows, ${actualKeys.length} group sets, digest and permutations checked`);
}

section = 7;
console.log('7) The reviewed fixture dates are exact');
{
  const expectedDates = new Map([
    ['Netherlands v Morocco', '2026-06-29'],
    ['USA v Bosnia & Herzegovina', '2026-07-01'],
    ['Mexico v Ecuador', '2026-06-30'],
    ['Switzerland v Algeria', '2026-07-02'],
    ['Colombia v Ghana', '2026-07-03'],
    ['USA v Belgium', '2026-07-06'],
    ['Mexico v England', '2026-07-05'],
    ['Argentina v Switzerland', '2026-07-11'],
  ]);
  if (CONTROL === 'date') {
    const target = knockout.find(m => `${m.team1} v ${m.team2}` === 'Netherlands v Morocco');
    if (!target) abort('control cannot run: Netherlands v Morocco is missing');
    const before = target.date;
    target.date = '2099-01-01';
    if (target.date === before) abort('control cannot run: the fixture date did not change');
    console.log(`   NEGATIVE CONTROL ON: Netherlands v Morocco changed from ${before} to ${target.date} in memory`);
  }
  for (const [pair, expected] of expectedDates) {
    const match = knockout.find(m => `${m.team1} v ${m.team2}` === pair);
    if (!match) { fail(`${pair} is missing`); continue; }
    if (match.date !== expected) fail(`${pair} is dated ${match.date}, expected ${expected}`);
  }
  console.log(`   ${expectedDates.size} fixture dates checked`);
}

section = 8;
console.log('8) Reset invalidation removes child state');
{
  const values = new Map([
    [lifecycle.WC2026_STORAGE_KEYS.knockout, '{"r32-0":"Germany"}'],
    [lifecycle.WC2026_STORAGE_KEYS.knockoutSignature, 'old-signature'],
    [lifecycle.WC2026_STORAGE_KEYS.awards, '{"goldenBall":"Rodri"}'],
    ['unrelated', 'keep'],
  ]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  lifecycle.clearWc2026ChildStorage(storage, false);
  if (CONTROL === 'reset' || CONTROL === 'reset-knockout') {
    if (values.has(lifecycle.WC2026_STORAGE_KEYS.knockout)) abort('control cannot run: knockout state survived before restoration');
    values.set(lifecycle.WC2026_STORAGE_KEYS.knockout, '{"f-0":"Spain"}');
    if (!values.has(lifecycle.WC2026_STORAGE_KEYS.knockout)) abort('control cannot run: knockout state was not restored');
    console.log('   NEGATIVE CONTROL ON: knockout state restored after invalidation in memory');
  }
  if (CONTROL === 'reset-signature') {
    if (values.has(lifecycle.WC2026_STORAGE_KEYS.knockoutSignature)) abort('control cannot run: seed signature survived before restoration');
    values.set(lifecycle.WC2026_STORAGE_KEYS.knockoutSignature, 'restored-signature');
    if (!values.has(lifecycle.WC2026_STORAGE_KEYS.knockoutSignature)) abort('control cannot run: seed signature was not restored');
    console.log('   NEGATIVE CONTROL ON: seed signature restored after invalidation in memory');
  }
  if (values.has(lifecycle.WC2026_STORAGE_KEYS.knockout)) fail('seed invalidation left knockout picks in storage');
  if (values.has(lifecycle.WC2026_STORAGE_KEYS.knockoutSignature)) fail('seed invalidation left the knockout signature in storage');
  if (!values.has(lifecycle.WC2026_STORAGE_KEYS.awards)) fail('seed invalidation cleared awards even though Reset All was not requested');
  values.set(lifecycle.WC2026_STORAGE_KEYS.knockout, '{"f-0":"Spain"}');
  values.set(lifecycle.WC2026_STORAGE_KEYS.knockoutSignature, 'new-signature');
  lifecycle.clearWc2026ChildStorage(storage, true);
  if (CONTROL === 'reset-awards') {
    if (values.has(lifecycle.WC2026_STORAGE_KEYS.awards)) abort('control cannot run: awards survived before restoration');
    values.set(lifecycle.WC2026_STORAGE_KEYS.awards, '{"goldenBall":"Rodri"}');
    if (!values.has(lifecycle.WC2026_STORAGE_KEYS.awards)) abort('control cannot run: awards were not restored');
    console.log('   NEGATIVE CONTROL ON: awards restored after Reset All in memory');
  }
  if (values.has(lifecycle.WC2026_STORAGE_KEYS.awards)) fail('Reset All left awards in storage');
  if (values.get('unrelated') !== 'keep') fail('reset removed unrelated storage');

  const seeds = {};
  const thirds = [];
  for (const g of data.WC2026_GROUPS) {
    seeds[g.letter] = { first: g.teams[0], second: g.teams[1] };
    if (g.thirdQualified) thirds.push({ team: g.teams[2], group: g.letter });
  }
  const originalSignature = lifecycle.wc2026SeedSignature(seeds, thirds);
  const sameSignature = lifecycle.wc2026SeedSignature(JSON.parse(JSON.stringify(seeds)), thirds.map(t => ({ ...t })));
  if (sameSignature !== originalSignature) fail('identical seeds produce different signatures');
  const changedSeeds = JSON.parse(JSON.stringify(seeds));
  changedSeeds.A.first = changedSeeds.A.second;
  if (CONTROL === 'reset-seed') {
    const before = changedSeeds.A.first;
    changedSeeds.A.first = seeds.A.first;
    if (changedSeeds.A.first === before || changedSeeds.A.first !== seeds.A.first) abort('control cannot run: changed seed was not restored to its original value');
    console.log('   NEGATIVE CONTROL ON: the changed group A winner was restored in memory');
  }
  if (lifecycle.wc2026SeedSignature(changedSeeds, thirds) === originalSignature) fail('a changed group winner kept the old knockout signature');

  const controller = lifecycle.createAutoFillController();
  let delayedWrites = 0;
  const generation = controller.start();
  controller.schedule(generation, () => { delayedWrites += 1; }, 5);
  controller.cancel();
  if (CONTROL === 'reset-timer') {
    const newGeneration = controller.start();
    controller.schedule(newGeneration, () => { delayedWrites += 1; }, 0);
    console.log('   NEGATIVE CONTROL ON: a new delayed write was scheduled after cancel in memory');
  }
  await new Promise(resolve => setTimeout(resolve, 20));
  if (values.has(lifecycle.WC2026_STORAGE_KEYS.knockout)) fail('stale knockout state survived reset');
  if (delayedWrites !== 0) fail(`${delayedWrites} delayed auto-fill write(s) ran after reset`);
  controller.cancel();
  console.log('   knockout, signature, awards, seed changes and delayed writes checked');
}

ssrDom.window.close();

const own = {
  chain: 1, swap: 2, score: 3, pair: 5,
  'annex-coverage': 6, 'annex-integrity': 6, 'annex-anchor': 6,
  'annex-permutation': 6, 'annex-missing': 6,
  date: 7, reset: 8, 'reset-knockout': 8, 'reset-signature': 8,
  'reset-awards': 8, 'reset-seed': 8, 'reset-timer': 8,
}[CONTROL];
const total = Object.values(failures).reduce((sum, count) => sum + count, 0);
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}"`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimWc2026Results: ${total} failure(s)`); process.exit(1); }
console.log('\nsimWc2026Results: all green');
