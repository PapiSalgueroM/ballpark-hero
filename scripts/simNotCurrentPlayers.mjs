/* Round 667: a name on the not current list is never offered as a current player.

   Who Am I dealt Diogo Jota as a secret with an age and a price after his
   death, because the pool carries a 2025 row forward for anyone with no 2026
   row, and his absence from 2026 is exactly why he must not be there. Round
   542 had removed him from every Club Manager squad as a bake time assertion
   nobody else could read. src/data/notCurrentPlayers.ts is now the one list,
   and this holds the pools to it.

   Reads the CODE of the pool builders, never their comments, and holds:
   1. the list is well formed: every entry has a name and a dated, plain reason,
      no duplicates after folding, and the fold is stable;
   2. src/lib/whoAmI.ts imports isNotCurrentPlayer and applies it on BOTH legs
      of the pool build, the current year rows and the carried rows;
   3. the check is by folded name, so an accent or a stray space cannot let a
      listed name through (isNotCurrentPlayer run on real variants);
   4. Clue Auction draws from the same fetch (no second pool builder), so one
      list covers both games.

   Controls (SIM_NOT_CURRENT_CONTROL): carriedleg removes the guard from the
   carried leg only (section 2 red), unfold makes the check compare raw names
   (section 3 red). Each asserts its anchor appears exactly once first. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_NOT_CURRENT_CONTROL || '';
const EXPECT = { carriedleg: [2], unfold: [3] };
/* Exit 2, never 1: 1 is a control that fired, and a mistyped name must not read as one. */
if (CONTROL && !(CONTROL in EXPECT)) { console.error('unknown control ' + CONTROL); process.exit(2); }
const TMP = process.env.TEMP || process.env.TMP || ROOT;
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: anchor appears ${n} times, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}

let who = fs.readFileSync(path.join(ROOT, 'src/lib/whoAmI.ts'), 'utf8').replaceAll('\r\n', '\n');
let listSrc = fs.readFileSync(path.join(ROOT, 'src/data/notCurrentPlayers.ts'), 'utf8').replaceAll('\r\n', '\n');
if (CONTROL === 'carriedleg') who = rewrite(who, "|| byKey.has(p.personKey) || isNotCurrentPlayer(p.name)) continue;", "|| byKey.has(p.personKey)) continue;", 'carriedleg');
if (CONTROL === 'unfold') listSrc = rewrite(listSrc, "return FOLDED.has(foldPlayerName(name));", "return FOLDED.has(name);", 'unfold');

/* Bundle the list module (with the control applied) to run its real functions. */
const listPath = CONTROL === 'unfold' ? path.join(TMP, `notCurrent-${process.pid}.ts`) : path.join(ROOT, 'src/data/notCurrentPlayers.ts');
if (CONTROL === 'unfold') fs.writeFileSync(listPath, listSrc);
const entry = path.join(TMP, `notCurrent-entry-${process.pid}.mjs`);
const out = path.join(TMP, `notCurrent-bundle-${process.pid}.mjs`);
fs.writeFileSync(entry, `export * from '${listPath.replaceAll('\\', '/')}';`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { NOT_CURRENT_PLAYERS, isNotCurrentPlayer, foldPlayerName } = await import(pathToFileURL(out).href);
try { fs.rmSync(entry); fs.rmSync(out); if (CONTROL === 'unfold') fs.rmSync(listPath); } catch { /* temp only */ }

let failures = 0; const red = new Set(); let section = 0;
const fail = m => { failures++; red.add(section); console.log('   FAIL ' + m); };
const ok = m => console.log('   ok   ' + m);

section = 1;
console.log('1) the list is well formed');
{
  if (!Array.isArray(NOT_CURRENT_PLAYERS) || NOT_CURRENT_PLAYERS.length === 0) fail('the list is empty or not an array');
  const seen = new Set(); let bad = 0;
  for (const p of NOT_CURRENT_PLAYERS) {
    if (!p.name || !p.reason) { fail(`entry ${JSON.stringify(p)} lacks a name or a reason`); bad++; continue; }
    if (!/\b(19|20)\d\d\b/.test(p.reason)) { fail(`${p.name}: the reason carries no date`); bad++; }
    if (/[–—]/.test(p.reason + p.name)) { fail(`${p.name}: an em or en dash in the entry`); bad++; }
    const k = foldPlayerName(p.name); if (seen.has(k)) { fail(`${p.name} appears twice after folding`); bad++; } seen.add(k);
  }
  if (!bad) ok(`${NOT_CURRENT_PLAYERS.length} entr(ies), each named, dated and unique`);
}

section = 2;
console.log('2) whoAmI.ts applies the check on both pool legs');
{
  const c = code(who);
  const imported = /import \{[^}]*isNotCurrentPlayer[^}]*\} from ['"]@\/data\/notCurrentPlayers['"]/.test(c);
  const currentLeg = /for \(const r of latest\.data\)[^\n]*isNotCurrentPlayer\(p\.name\)/.test(c);
  const carriedLeg = /for \(const r of carried\.data\)[\s\S]{0,400}?isNotCurrentPlayer\(p\.name\)\) continue;/.test(c);
  if (!imported) fail('whoAmI.ts does not import isNotCurrentPlayer from the shared list');
  if (!currentLeg) fail('the current year leg does not skip listed names');
  if (!carriedLeg) fail('the carried leg, the one that let Diogo Jota through, does not skip listed names');
  if (imported && currentLeg && carriedLeg) ok('imported once, applied on the current leg and the carried leg');
}

section = 3;
console.log('3) the check is by folded name');
{
  const first = NOT_CURRENT_PLAYERS[0].name;
  const variants = [first, first.toUpperCase(), ` ${first}  `, first.normalize('NFD')];
  const misses = variants.filter(v => !isNotCurrentPlayer(v));
  if (misses.length) fail(`${misses.length} variant(s) of "${first}" slip through: ${misses.map(v => JSON.stringify(v)).join(', ')}`);
  else ok(`"${first}" is caught in upper case, with stray spaces and decomposed accents`);
  if (isNotCurrentPlayer('Nobody Atall Round667')) fail('an unlisted name is reported as listed');
}

section = 4;
console.log('4) Clue Auction draws from the same pool');
{
  const ca = code(fs.readFileSync(path.join(ROOT, 'src/pages/ClueAuction.tsx'), 'utf8'));
  if (!/fetchWhoAmIPool\(\)/.test(ca)) fail('ClueAuction.tsx no longer calls fetchWhoAmIPool, so it may build a pool this list does not cover');
  else if (/from\('player_market_values'\)/.test(ca)) fail('ClueAuction.tsx reads player_market_values itself');
  else ok('ClueAuction uses fetchWhoAmIPool and no pool of its own');
}

console.log('');
if (CONTROL) {
  const want = EXPECT[CONTROL]; const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simNotCurrentPlayers: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`); process.exit(1); }
  console.log(`simNotCurrentPlayers: control ${CONTROL} should have reddened exactly ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`); process.exit(2);
}
if (failures) { console.error(`simNotCurrentPlayers: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simNotCurrentPlayers: green. Nobody on the not current list can be dealt as a current player in Who Am I or Clue Auction.');
