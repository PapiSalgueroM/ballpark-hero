/* Round 1600 fix: a Club Manager career saved before Round 1600 keeps its world ledger whole on this tree.
 *
 * WHY. The world ledger (Release AZ, "the world remembers your deals") names a real man by the birth year his age
 * gave (src/lib/clubManagerWorldRoster.ts keyOf and samePlayer), and Round 1600 moved most ages of today's main
 * squads file a year on (1 January to 1 August). Both reviews of the round (MAJOR 1) loaded a save written before it
 * and found the men its ledger had moved back at the club they left as well (Gyokeres at Arsenal and PSG, Kane at
 * Bayern Munich and Roma, Haaland at Manchester City and Real Madrid). The fix is one rule, nearAges and bornNear in
 * that file: a ledger of today's world without the stamp a career started on the age world gets reads the projected
 * world a year either side of the birth year it recorded. Nothing in the save is rewritten.
 *
 * SECTIONS:
 *   1. namesakes: no club of today's world lists two men of one name and position born within a year of each other,
 *      so the near read can never take a different man off a club (the rule's one cost, measured here, not assumed).
 *   2. load: careers started, given one market buy and saved by the ENGINE OF THE ROUND'S BASE (14a9af704, the
 *      world before Round 1600, built from git), at Everton, AC Milan and Bayern Munich, are loaded on this tree.
 *      Every owned record's man is at his owner once and not at the club he left, every released or retired man is
 *      off the club he left, the market lists each real name once and none of my men, and the loaded career saves
 *      back to the very string it was loaded from (byte safe).
 *   3. season two: each loaded save goes through startNextSeason on this tree; the same audit.
 *   4. sale: on each loaded save a man of my own club's day one squad whose age the round moved (he carries the key
 *      the base gave him, which today's projection gives nobody) is sold to a rival through acceptBid. The ledger
 *      must record him owned by the buyer and the buyer must list him once (before the fix he left the world).
 *   5. new: a career started on this tree carries the stamp (curve 2), reads exact, and the same audit is clean.
 *
 * CONTROL (exit 1, the last line says FIRED):
 *   CM_OLD_LEDGER_CONTROL=exact   bornNear reads the year exactly, the fix out: sections 2 and 4 must go red.
 *
 * Measured on the fix commit (runner r1600-fix1): see the numbers in docs/audits/ROUND-1600-NOTES.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '14a9af7042793e487d12af0bffcaf030a0d0da9a';
const LEDGER = 'src/lib/clubManagerWorldRoster.ts';
const NEAR = 'return near ? Math.abs(birthYear - recorded) <= 1 : birthYear === recorded;';
const CONTROL = process.env.CM_OLD_LEDGER_CONTROL || '';
const cannot = why => { console.log(`simCmOldLedger: cannot run: ${why}`); process.exit(2); };
if (CONTROL && CONTROL !== 'exact') cannot(`unknown control ${CONTROL}`);
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base ${BASE.slice(0, 9)} is not in this clone (fetch its history)`); }
const lf = s => s.split('\r\n').join('\n');
const CLUBS = [['Everton', 'Aston Villa'], ['AC Milan', 'Juventus'], ['Bayern Munich', 'Borussia Dortmund']];
const failures = [];
const fail = (section, msg) => { failures.push(`${section}: ${msg}`); console.log(`  FAIL ${section}: ${msg}`); };

async function engine(label, base) {
  let edited = false;
  const plugin = { name: `old-ledger-${label}`, setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json|mjs|js)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/') && !rel.startsWith('scripts/')) return null;
      let text = base ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 27 }))
        : lf(fs.readFileSync(args.path, 'utf8'));
      if (!base && CONTROL === 'exact' && rel === LEDGER) {
        if (text.split(NEAR).length !== 2) cannot(`control exact: its anchor is not in ${LEDGER} exactly once`);
        text = text.replace(NEAR, 'return birthYear === recorded;'); edited = true;
      }
      const ext = path.extname(args.path).slice(1);
      return { contents: text, loader: ext === 'mjs' ? 'js' : ext, resolveDir: path.dirname(args.path) };
    });
  } };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n"
    + "export * as ledger from './src/lib/clubManagerWorldRoster';\nexport * as world from './src/data/clubManagerWorldRosters';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `old-ledger-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (CONTROL && !base && !edited) cannot('the control was to edit the ledger module and it was never loaded');
  const module = { exports: {} }, store = new Map(), NOW = 1791633600000;
  class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
    console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
    setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
      clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } } });
  new vm.Script(out.outputFiles[0].text, { filename: `old-ledger-${label}.cjs` }).runInContext(ctx);
  await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}

/* One seeded generator for every draw, restarted per career, so both trees see the same stream. */
function seeded(seed, action) {
  let s = seed >>> 0; const original = Math.random;
  Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}

/* Every ledger record against the world this tree projects for that save. Returns the problems found. */
function audit(M, s, label) {
  const records = M.ledger.readWorldRoster(s)?.records ?? [];
  const at = (club, name) => club === s.clubName ? s.squad.filter(p => p.name === name).length
    : M.cm.worldRosterFor(s, club).filter(p => p.n === name).length;
  const problems = [];
  let moves = 0;
  for (const r of records) {
    if (r.origin.club === r.owner) continue;
    moves += 1;
    const name = r.origin.name;
    if (at(r.origin.club, name) > 0) problems.push(`${name} still at ${r.origin.club} (${r.status}${r.owner ? ` to ${r.owner}` : ''}, born ${r.origin.birthYear})`);
    if (r.status === 'owned' && at(r.owner, name) !== 1) problems.push(`${name} listed ${at(r.owner, name)} times at his owner ${r.owner}`);
  }
  const market = M.cm.buildMarket(s).filter(p => !p.generated);
  const seen = new Map();
  for (const p of market) seen.set(p.name, (seen.get(p.name) ?? 0) + 1);
  for (const [name, n] of seen) if (n > 1) problems.push(`${name} on the market ${n} times`);
  for (const p of s.squad) if (p.worldRosterKey && seen.has(p.name)) problems.push(`my man ${p.name} on the market`);
  console.log(`  ${label}: ${s.clubName}, ${records.length} records, ${moves} moves, ${problems.length} problems`);
  for (const line of problems.slice(0, 6)) console.log(`     ${line}`);
  return { problems: problems.length, moves };
}

const SAVE_KEY_OF = store => [...store.keys()].find(k => store.get(k)?.startsWith('{') && store.get(k).includes('"saveVersion"'));
console.log(`simCmOldLedger: base ${BASE.slice(0, 9)}${CONTROL ? `, control ${CONTROL}` : ''}`);
const B = await engine('base', true);
const H = await engine('head', false);

/* Section 1: namesakes in today's world. */
{
  let pairs = 0, clubs = 0;
  for (const [club, list] of Object.entries(H.world.CM_WORLD_ROSTERS)) {
    clubs += 1;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.n === b.n && a.p === b.p && Math.abs(a.a - b.a) <= 1) { pairs += 1; console.log(`     namesake ${club}: ${a.n} ${a.p} ${a.a} and ${b.a}`); }
    }
  }
  console.log(`section 1: ${clubs} clubs, ${pairs} namesake pairs of one position born within a year`);
  if (clubs < 400) fail('1', `only ${clubs} clubs read`);
  if (pairs) fail('1', `${pairs} pairs the near read could confuse`);
}

/* Sections 2 to 4, one base save a club. */
let loadedMoves = 0, sold = 0;
for (const [club, rival] of CLUBS) {
  B.store.clear();
  const made = seeded(1600, () => {
    let s = B.cm.startCareer(club);
    const market = B.cm.buildMarket(s).filter(p => !p.generated && p.club !== club && p.age >= 24).sort((a, b) => a.price - b.price);
    for (const mp of market) { const next = B.cm.buyPlayer(s, mp); if (next) { s = next; console.log(`made on base: ${club} bought ${mp.name} from ${mp.club}`); break; } }
    B.cm.saveCareer(s);
    return s;
  });
  if (made.worldRoster?.curve !== undefined) fail('2', `${club}: the base save carries a stamp`);
  const key = SAVE_KEY_OF(B.store);
  if (!key) cannot(`${club}: the base engine saved no career`);
  H.store.clear();
  for (const [k, v] of B.store) H.store.set(k, v);
  const loaded = seeded(1601, () => H.cm.loadCareer());
  if (!loaded) { fail('2', `${club}: the base save did not load`); continue; }
  const near = H.ledger.nearAges(H.ledger.readWorldRoster(loaded) ?? { eraId: 'x' });
  if (!near) fail('2', `${club}: the base ledger does not read near`);
  const on = audit(H, loaded, 'section 2 loaded');
  loadedMoves += on.moves;
  if (on.problems) fail('2', `${club}: ${on.problems} problems on load`);
  const raw = B.store.get(key);
  H.cm.saveCareer(loaded);
  if (H.store.get(key) !== raw) fail('2', `${club}: the loaded career saves back to a different string (${raw.length} to ${H.store.get(key)?.length})`);
  /* Section 4: a man of my club's day one squad whose key today's projection no longer gives anyone, sold. */
  const today = new Set(H.eras.projectedRoster(club, 0, 'now', loaded.worldSeed).map(p => p.worldRosterKey));
  const moved = loaded.squad.filter(p => p.worldRosterKey && !today.has(p.worldRosterKey) && JSON.parse(p.worldRosterKey)[1] === club);
  let after = null, man = null;
  for (const p of moved.slice(0, 6)) {
    after = seeded(1603, () => H.cm.acceptBid({ ...loaded, incomingBids: [{ playerId: p.id, playerName: p.name, club: rival, offer: 30, status: 'open' }] }, p.id));
    if (after) { man = p; break; }
  }
  if (!man) fail('4', `${club}: no man of the day one squad whose age moved could be sold (${moved.length} candidates)`);
  else {
    const record = (H.ledger.readWorldRoster(after)?.records ?? []).find(r => r.origin.name === man.name && r.status === 'owned');
    const atRival = H.cm.worldRosterFor(after, rival).filter(p => p.n === man.name).length;
    console.log(`  section 4: ${club} sold ${man.name} (${man.age}y) to ${rival}: record ${record ? `owned by ${record.owner}` : 'none'}, listed at ${rival} ${atRival}`);
    if (!record || record.owner !== rival) fail('4', `${club}: the sale of ${man.name} wrote no record owned by ${rival}`);
    if (atRival !== 1) fail('4', `${club}: ${man.name} listed ${atRival} times at ${rival}`);
    if (after.squad.some(p => p.name === man.name)) fail('4', `${club}: ${man.name} still in my squad`);
    sold += 1;
  }
  const next = seeded(1602, () => H.cm.startNextSeason(loaded));
  const two = audit(H, next, 'section 3 season two');
  if (two.problems) fail('3', `${club}: ${two.problems} problems in season two`);
}
if (loadedMoves < 6) fail('2', `only ${loadedMoves} ledger moves were loaded across the three saves`);

/* Section 5: a career started on this tree carries the stamp and reads exact. */
{
  H.store.clear();
  const s = seeded(1600, () => {
    let c = H.cm.startCareer('Everton');
    const market = H.cm.buildMarket(c).filter(p => !p.generated && p.club !== 'Everton' && p.age >= 24).sort((a, b) => a.price - b.price);
    for (const mp of market) { const next = H.cm.buyPlayer(c, mp); if (next) { c = next; break; } }
    return c;
  });
  const held = H.ledger.readWorldRoster(s);
  console.log(`section 5: a new Everton career, ledger curve ${held?.curve}, near ${held ? H.ledger.nearAges(held) : 'no ledger'}`);
  if (!held || held.curve !== 2 || H.ledger.nearAges(held)) fail('5', 'a career started here does not carry the stamp or reads near');
  H.cm.saveCareer(s);
  const back = H.cm.loadCareer();
  if (back?.worldRoster?.curve !== 2) fail('5', 'the stamp did not survive a save and a load');
  const on = audit(H, back ?? s, 'section 5 new');
  if (on.problems) fail('5', `${on.problems} problems in a new career`);
}

console.log(`simCmOldLedger: ${loadedMoves} ledger moves loaded, ${sold} sales, ${failures.length} failures`);
if (CONTROL) {
  const fired = failures.some(f => f.startsWith('2:')) && failures.some(f => f.startsWith('4:'));
  console.log(fired ? `simCmOldLedger: control ${CONTROL} FIRED (sections 2 and 4 red)` : `simCmOldLedger: control ${CONTROL} did NOT fire`);
  process.exit(1);
}
console.log(failures.length ? 'simCmOldLedger: FAIL' : 'simCmOldLedger: all sections green');
process.exit(failures.length ? 1 : 0);
