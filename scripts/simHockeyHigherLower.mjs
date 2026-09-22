/**
 * simHockeyHigherLower: Round 662. NHL Higher or Lower is pinned to a record of
 * what public.nhl_player_stats actually says, and nothing ships that the record
 * does not hold.
 *
 * WHY THIS EXISTS. src/data/hockeyHLPlayers.ts was typed by hand, carried no
 * source and no date, and had never been checked against the site's own NHL
 * table. On 2026-09-21 it was: 26 of 43 skaters had the wrong career points,
 * the worst off by 312 (David Pastrnak at 620 against a real 932), and the
 * damage was not cosmetic. This game asks which of two players has more career
 * points, so a wrong number is only harmful when it reorders a pair, and it
 * reordered 52 of the 903 possible matchups. Roughly one question in
 * seventeen marked the correct answer wrong. Nathan MacKinnon sat below Leon
 * Draisaitl, Cale Makar below Kirill Kaprizov, Claude Giroux below Patrice
 * Bergeron.
 *
 * The values now come from public.nhl_player_stats (goals plus assists) read on
 * 2026-09-21, written to scripts/data/nhlHigherLowerVerified2026-09.json with
 * the season each total runs through. Every player also carries lastSeason now,
 * the field src/data/nbaHLPlayers.ts has always had, because a career total
 * with no season attached is a fact with an expiry date.
 *
 * TWO THINGS THE RECORD DELIBERATELY DOES NOT TAKE FROM THE TABLE, and section
 * 5 and 6 exist so nobody "tidies" them away:
 *   - nhl_player_stats truncates careers that began before 1967-68. It reports
 *     Gordie Howe with 349 points against a real 1,850. For him the FILE was
 *     right and the table is wrong, so his row is held from the file.
 *   - The table holds no goalie at all. Henrik Lundqvist and Igor Shesterkin
 *     keep exactly the values they shipped with and are recorded as unverified
 *     rather than guessed. Their numbers are probably wrong, but they sit far
 *     below every skater so they invert no pair, and inventing a figure is
 *     worse than admitting one is unchecked.
 *
 * SECTIONS, on the shipped module bundled with esbuild so it reads the values
 * the game reads, not a regex over the text:
 *   1. the record is well formed and covers exactly the shipped players
 *   2. every shipped skater's points equal the record
 *   3. no pair of shipped skaters is ordered against the record (the check that
 *      matters, because ordering is the whole game)
 *   4. every shipped player carries a lastSeason
 *   5. the goalies are flagged unverified and untouched
 *   6. Gordie Howe is held from the file, not from the table
 *
 * NEGATIVE CONTROLS (NHL_HL_CONTROL). Each edits only an in memory copy,
 * refuses to run when its anchor is missing or matches more than once, and must
 * redden EXACTLY the sections named below, no more and no fewer.
 *
 * Some of them redden two, and that is the honest answer rather than a loosened
 * check: section 3 judges ordering against the same record section 2 compares
 * to, so a wrong total genuinely breaks both. The controls were written the
 * other way round first, expecting one section each, and three of them reported
 * "the control proves nothing" until the expectation was corrected to match how
 * the checks actually couple. That is the right direction to fix it in.
 *
 *   stale       Gretzky nudged to 2,850, and he is 936 clear of      section 2
 *               Jagr so nothing reorders: the record match alone
 *   inversion   MacKinnon and Draisaitl swapped                      sections 2, 3
 *   nolast      one player loses lastSeason                          section 4
 *   goalieok    a goalie is given a real season, so an unchecked      section 5
 *               figure reads as a checked one
 *   howetable   Howe set to the table's truncated 349. Section 2      sections 3, 6
 *               skips him because he is held from the file, so this
 *               lands on the ordering and on his own guard
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NHL_HL_CONTROL || '';
const KNOWN = ['stale', 'inversion', 'nolast', 'goalieok', 'howetable'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${KNOWN.join(', ')})`);
  process.exit(1);
}
/* A control may legitimately redden more than one section, and saying so beats
   weakening a check to make the arithmetic tidy. A wrong total breaks both the
   record match and the ordering, because section 3 judges ordering against the
   same record section 2 compares to. What must never happen is a control
   reddening a section it has nothing to do with, so the red set must EQUAL this. */
const EXPECT = { stale: [2], inversion: [2, 3], nolast: [4], goalieok: [5], howetable: [3, 6] };

let checks = 0;
let failures = 0;
let section = 0;
const red = new Set();
const fail = (m) => { checks += 1; failures += 1; red.add(section); console.log(`   FAIL ${m}`); };
const ok = (m) => { checks += 1; console.log(`   ok   ${m}`); };

const SRC = path.join(ROOT, 'src/data/hockeyHLPlayers.ts');
const RECORD = path.join(ROOT, 'scripts/data/nhlHigherLowerVerified2026-09.json');

/* Every rewrite asserts its anchor exactly once or the run stops. A control
   that matches nothing leaves the harness green for the wrong reason, which
   is the failure this repo keeps relearning. */
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.log(`   FAIL ${why}: anchor appears ${n} times, so the rewrite would not change exactly one thing`);
    console.log(`simHockeyHigherLower: stopped, the control proved nothing`);
    process.exit(2);
  }
  return src.replace(anchor, replacement);
}

let source = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
let unverified = [...record.unverified];

if (CONTROL === 'stale') {
  source = rewrite(source, 'careerPoints: 2857', 'careerPoints: 2850', 'stale nudges Gretzky, who is clear of the field so nothing reorders');
} else if (CONTROL === 'inversion') {
  source = rewrite(source, 'careerPoints: 1141', 'careerPoints: 1053', 'inversion drops MacKinnon to Draisaitl');
  source = rewrite(source, "name: 'Leon Draisaitl', position: 'Forward', country: 'Germany', countryFlag: '\u{1F1E9}\u{1F1EA}', careerPoints: 1053", "name: 'Leon Draisaitl', position: 'Forward', country: 'Germany', countryFlag: '\u{1F1E9}\u{1F1EA}', careerPoints: 1141", 'inversion lifts Draisaitl above MacKinnon');
} else if (CONTROL === 'nolast') {
  source = rewrite(source, ", lastSeason: '1979-80'", '', 'nolast strips one lastSeason');
} else if (CONTROL === 'goalieok') {
  /* Anchored on the 46 as well as the club: both goalies in this file are
     Rangers, so the club and the flag alone matched twice and the rewrite
     refused to run, which is the anchor assertion working. */
  source = rewrite(source, "careerPoints: 46, teams: 'New York Rangers', lastSeason: 'unverified'", "careerPoints: 46, teams: 'New York Rangers', lastSeason: '2019-20'", 'goalieok dresses a goalie up as a checked fact');
} else if (CONTROL === 'howetable') {
  source = rewrite(source, 'careerPoints: 1850', 'careerPoints: 349', 'howetable uses the truncated table value');
}

/* ---------- the shipped module, as the game reads it ---------- */
const tmp = path.join(process.env.TEMP || process.env.TMP || ROOT, `nhlhl-${process.pid}`);
fs.mkdirSync(tmp, { recursive: true });
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, source.replace(/from '@\/[^']*'/g, "from './missing'"), 'utf8');
const outfile = path.join(tmp, 'bundle.cjs');
await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error' });
const { hockeyHLPlayers: PLAYERS } = await import(`file://${outfile}`).then(m => m.default ?? m);
fs.rmSync(tmp, { recursive: true, force: true });

if (!Array.isArray(PLAYERS) || PLAYERS.length < 40) {
  console.log(`   FAIL the bundled module gave ${PLAYERS ? PLAYERS.length : 'no'} players, so nothing below measures anything`);
  process.exit(1);
}

const GOALIES = new Set(unverified);
const verified = record.players;
const held = record.heldFromFile;

section = 1;
console.log('1) the record is well formed and covers exactly the shipped players');
{
  let bad = 0;
  for (const [name, v] of Object.entries(verified)) {
    if (typeof v.points !== 'number' || !v.lastSeason) { fail(`record entry ${name} is not a points plus lastSeason`); bad++; }
  }
  const names = new Set(PLAYERS.map(p => p.name));
  const covered = new Set([...Object.keys(verified), ...Object.keys(held), ...unverified]);
  const missing = [...names].filter(n => !covered.has(n));
  const extra = [...covered].filter(n => !names.has(n));
  if (missing.length) fail(`${missing.length} shipped player(s) the record does not hold: ${missing.join(', ')}`);
  if (extra.length) fail(`${extra.length} record entr(ies) the file no longer ships: ${extra.join(', ')}`);
  const overlap = Object.keys(verified).filter(n => unverified.includes(n) || n in held);
  if (overlap.length) fail(`${overlap.join(', ')} is both verified and not`);
  if (!record.read || !record.source) fail('the record does not say when it was read or what from');
  if (!bad && !missing.length && !extra.length && !overlap.length) {
    ok(`${Object.keys(verified).length} verified, ${Object.keys(held).length} held from the file, ${unverified.length} unverified, together exactly the ${names.size} shipped players, read ${record.read} from ${record.source}`);
  }
}

section = 2;
console.log('2) every shipped skater matches the verified record');
{
  let bad = 0;
  for (const p of PLAYERS) {
    if (GOALIES.has(p.name) || p.name in held) continue;
    const want = verified[p.name];
    if (!want) { fail(`${p.name} has no verified entry`); bad++; continue; }
    if (p.points !== undefined) { /* shape guard only */ }
    if (p.careerPoints !== want.points) { fail(`${p.name} ships ${p.careerPoints} against a verified ${want.points}`); bad++; }
    if (p.lastSeason !== want.lastSeason) { fail(`${p.name} ships lastSeason ${p.lastSeason} against a verified ${want.lastSeason}`); bad++; }
  }
  if (!bad) ok(`${PLAYERS.filter(p => !GOALIES.has(p.name) && !(p.name in held)).length} skaters agree with the record on points and season`);
}

section = 3;
console.log('3) no pair of skaters is ordered against the record, which is the whole game');
{
  const s = PLAYERS.filter(p => !GOALIES.has(p.name));
  const truth = n => (verified[n] ? verified[n].points : (held[n] ? held[n].points : null));
  const unheld = s.filter(p => truth(p.name) === null);
  if (unheld.length) fail(`${unheld.length} skater(s) the record does not hold, so their ordering cannot be judged: ${unheld.map(p => p.name).join(', ')}`);
  let bad = 0, pairs = 0;
  const examples = [];
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const a = s[i], b = s[j];
    const ta = truth(a.name), tb = truth(b.name);
    if (ta === null || tb === null || ta === tb) continue;
    pairs++;
    if (Math.sign(a.careerPoints - b.careerPoints) !== Math.sign(ta - tb)) {
      bad++;
      if (examples.length < 5) examples.push(`${a.name} vs ${b.name}: the game says ${a.careerPoints > b.careerPoints ? a.name : b.name}, the record says ${ta > tb ? a.name : b.name}`);
    }
  }
  if (bad) fail(`${bad} of ${pairs} matchups mark the correct answer wrong. ${examples.join('; ')}`);
  else ok(`all ${pairs} matchups between the ${s.length} skaters agree with the record`);
}

section = 4;
console.log('4) every player carries the season its total runs through');
{
  const nolast = PLAYERS.filter(p => !p.lastSeason);
  if (nolast.length) fail(`${nolast.length} player(s) ship a career total with no season: ${nolast.map(p => p.name).join(', ')}`);
  else ok(`${PLAYERS.length} players each name the season their total runs through, the field nbaHLPlayers has always carried`);
}

section = 5;
console.log('5) the goalies are flagged unverified, not quietly treated as checked');
{
  let bad = 0;
  if (!unverified.length) { fail('the record claims every player is verified, but nhl_player_stats holds no goalie'); bad++; }
  for (const name of unverified) {
    const p = PLAYERS.find(x => x.name === name);
    if (!p) { fail(`${name} is recorded unverified but no longer ships`); bad++; continue; }
    if (p.lastSeason !== 'unverified') { fail(`${name} is recorded unverified but ships lastSeason ${p.lastSeason}, which reads as a checked fact`); bad++; }
    if (name in verified) { fail(`${name} is in the verified record as well`); bad++; }
  }
  const goalieShipped = PLAYERS.filter(p => p.position === 'Goalie').map(p => p.name);
  const unflagged = goalieShipped.filter(n => !unverified.includes(n));
  if (unflagged.length) { fail(`goalie(s) not flagged unverified: ${unflagged.join(', ')}. nhl_player_stats holds no goalie, so a goalie total here cannot have been checked against it`); bad++; }
  if (!bad) ok(`${unverified.length} goalie(s) flagged unverified and left exactly as they shipped, none of them presented as checked`);
}

section = 6;
console.log('6) Gordie Howe is held from the file, because the table truncates him');
{
  let bad = 0;
  const howe = PLAYERS.find(p => p.name === 'Gordie Howe');
  if (!howe) { fail('Gordie Howe no longer ships, so the guard against the table defect measures nothing'); bad++; }
  else {
    const want = held['Gordie Howe'];
    if (!want) { fail('Gordie Howe is not recorded as held from the file'); bad++; }
    else if (howe.careerPoints !== want.points) { fail(`Gordie Howe ships ${howe.careerPoints}, expected the file's ${want.points}. nhl_player_stats reports 349 because it starts at 1967-68, so the table must not be used for him`); bad++; }
    if (howe && howe.careerPoints === 349) { fail('Gordie Howe carries the table\'s truncated 349 rather than his real 1,850'); bad++; }
  }
  if (!bad) ok(`Gordie Howe ships 1,850 from the file, not the 349 the table reports for him`);
}

if (CONTROL) {
  const want = EXPECT[CONTROL];
  const got = [...red].sort((a, b) => a - b);
  const same = got.length === want.length && want.every(w => red.has(w));
  console.log('');
  if (same) {
    console.log(`simHockeyHigherLower: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`);
    process.exit(1);
  }
  console.log(`simHockeyHigherLower: control ${CONTROL} should have reddened exactly section(s) ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(2);
}

console.log('');
if (failures) {
  console.error(`simHockeyHigherLower: ${failures} failure(s) in section(s) ${[...red].sort((a, b) => a - b).join(', ')}`);
  process.exit(1);
}
console.log(`simHockeyHigherLower: green. ${checks} checks. Every NHL Higher or Lower total matches the table it came from, every matchup is ordered correctly, and the two figures nobody could check say so.`);
