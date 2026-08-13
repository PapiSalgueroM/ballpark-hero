/**
 * Round 102 harness: is the domestic cup a real tournament?
 *
 * It used to be four one-off draws against clubs from my own league. Nobody
 * else was in it, there was no bracket, and the FA Cup never contained a
 * single Championship side. This checks the new one is a genuine sixteen
 * club knockout:
 *  - sixteen clubs, all real, nobody in two ties at once, nobody drawn
 *    against themselves
 *  - clubs come from the whole COUNTRY, so England's cup has second tier
 *    sides in it and giant killings actually happen
 *  - every round is seeded from the real winners of the round before, and
 *    my own tie is settled by MY match
 *  - it crowns a winner even in the seasons I go out in the first round
 *  - and the trophy still goes to the club that wins the final
 * Run: node scripts/simCup.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cupEntry.mjs';
const BUNDLE = '/tmp/cup.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const { startCareer, playNextEntry, finishSeason, startNextSeason, REAL_LEAGUES, leagueOf } = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const ALL_CLUBS = new Set(REAL_LEAGUES.flatMap(l => l.clubs));

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s);
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. The bracket is a real sixteen club knockout ---------- */
console.log('1) A real sixteen club knockout');
{
  let champs = 0, seasons = 0, withMe = 0, upsets = 0, pens = 0;
  for (let i = 0; i < 25; i++) {
    const s = runSeason(startCareer('Manchester City'));
    const br = s.cupBracket;
    if (!br) { fail('no cup bracket was built'); break; }
    seasons++;

    const r16 = br.filter(t => t.round === 'R16');
    if (r16.length !== 8) fail(`expected 8 first round ties, got ${r16.length}`);
    const field = r16.flatMap(t => [t.home, t.away]);
    if (new Set(field).size !== 16) fail(`the field is not sixteen distinct clubs (${new Set(field).size})`);
    for (const name of field) if (!ALL_CLUBS.has(name)) fail(`invented club in the cup: ${name}`);
    if (!field.includes(s.clubName)) fail('my own club is not in its own domestic cup');

    for (const round of ['R16', 'QF', 'SF', 'F']) {
      const ties = br.filter(t => t.round === round);
      const names = ties.flatMap(t => [t.home, t.away]);
      if (new Set(names).size !== names.length) fail(`${round}: a club is in two ties at once`);
      for (const t of ties) if (t.home === t.away) fail(`${round}: a club drawn against itself`);
    }

    // every later round comes from the real winners of the one before
    const winnersOf = r => br.filter(t => t.round === r).map(t => t.winner);
    for (const [from, to] of [['R16', 'QF'], ['QF', 'SF'], ['SF', 'F']]) {
      const later = br.filter(t => t.round === to);
      if (!later.length) continue;
      const won = new Set(winnersOf(from));
      if (won.has(null)) fail(`${to} was seeded before every ${from} tie was settled`);
      for (const t of later) {
        if (!won.has(t.home) || !won.has(t.away)) fail(`${to}: ${t.home} v ${t.away} did not both win a ${from} tie`);
      }
    }

    for (const t of br) {
      if (t.winner === null) continue;
      if (t.homeGoals === null || t.awayGoals === null) { fail(`${t.round}: settled tie with no score`); continue; }
      if (t.homeGoals === t.awayGoals) {
        if (!t.pens) fail(`${t.round}: level tie with no shootout`);
        pens++;
      } else if (t.pens) {
        fail(`${t.round}: decisive score marked as a shootout`);
      } else if ((t.homeGoals > t.awayGoals ? t.home : t.away) !== t.winner) {
        fail(`${t.round}: ${t.winner} advanced on a losing score`);
      }
      if (t.upset) upsets++;
    }

    if (br.some(t => t.mine)) withMe++;
    const fin = br.find(t => t.round === 'F');
    if (fin && fin.winner) champs++;

    // the trophy has to agree with the bracket
    const wonIt = s.trophies.some(t => t.season === s.season && t.name === leagueOf(s.clubName).cupName);
    const bracketSaysIWon = fin && fin.winner === s.clubName;
    if (wonIt && !bracketSaysIWon) fail('I have the cup in the cabinet but the bracket says otherwise');
    if (bracketSaysIWon && !wonIt) fail('the bracket says I won the cup but there is no trophy');
  }
  console.log(`   ${seasons} seasons, ${withMe} with my club in the draw, ${champs} crowned a winner`);
  console.log(`   ${upsets} giant killings and ${pens} shootouts across those seasons`);
  if (champs < seasons) fail('the cup does not always produce a winner');
  if (withMe < seasons) fail('my club is not always in its own cup');
  if (upsets === 0) fail('no lower division side ever wins a tie, so there is nothing to fear');
}

/* ---------- 2. The country, not just my league ---------- */
console.log('2) The whole country is in it');
{
  let withLower = 0, tested = 0;
  for (let i = 0; i < 20; i++) {
    const s = startCareer('Arsenal');
    const top = new Set(leagueOf('Arsenal').clubs);
    const field = (s.cupBracket ?? []).filter(t => t.round === 'R16').flatMap(t => [t.home, t.away]);
    tested++;
    if (field.some(n => !top.has(n))) withLower++;
  }
  console.log(`   ${withLower}/${tested} English cups contained a club from outside the Premier League`);
  if (withLower < tested) fail('the English cup does not always include second tier clubs');

  // A country with only one league still gets a full bracket.
  const solo = startCareer('Al-Hilal');
  const soloField = (solo.cupBracket ?? []).filter(t => t.round === 'R16').flatMap(t => [t.home, t.away]);
  console.log(`   single league country field size: ${new Set(soloField).size}`);
  if (new Set(soloField).size !== 16) fail('a one league country does not get a full sixteen club cup');
}

/* ---------- 3. It finishes without me ---------- */
console.log('3) The cup finishes when I go out early');
{
  let early = 0, finished = 0;
  for (let i = 0; i < 40; i++) {
    const s = runSeason(startCareer('Burnley'));
    if (s.cupExit !== 'R16') continue;
    early++;
    const fin = (s.cupBracket ?? []).find(t => t.round === 'F');
    if (fin && fin.winner) finished++;
  }
  console.log(`   ${early} first round exits, ${finished} still crowned a winner`);
  if (early > 0 && finished < early) fail('the cup stalls once I am knocked out');
}

/* ---------- 4. Rollover ---------- */
console.log('4) A fresh cup every season');
{
  let s = runSeason(startCareer('Ajax'));
  const before = (s.cupBracket ?? []).length;
  s = finishSeason(s).state;
  s = startNextSeason(s);
  const after = (s.cupBracket ?? []).filter(t => t.round === 'R16').length;
  console.log(`   last season ended with ${before} ties, the new one opens with ${after} first round ties`);
  if (after !== 8) fail(`the new season did not get a fresh cup draw (${after} ties)`);
  if ((s.cupBracket ?? []).some(t => t.winner)) fail('last season\'s results carried into the new cup');
  const bytes = JSON.stringify(s).length;
  console.log(`   save is ${(bytes / 1024).toFixed(0)} KB`);
  if (bytes > 900_000) fail('the save has grown too large for localStorage');
}

/* ---------- 5. Copy check ---------- */
console.log('5) Copy check');
{
  for (const f of ['src/components/club-manager/CupBracketCard.tsx', 'src/lib/clubManager.ts']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) fail(`${f}:${i + 1} contains an em or en dash`);
    });
  }
  console.log('   2 files checked');
}

console.log(failures === 0 ? '\nALL CUP CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
