/* Round 1510. Club Manager's domestic super cups: every season opens with its country's super cup in its era's
 * format wherever the ledger proves it (England's FA Community Shield first), followed from the Cups panel by a
 * club that is not in it and played from a manager's second summer by one that earned a place.
 *
 *   scripts/data/cmOneOffFormats.json   the rows and the season one editions, each fact on two families
 *   src/data/cmOneOffRows.ts             the values the game plays, held to the ledger by section 0
 *
 * SECTIONS (ONE_OFF_ONLY=0,1 runs some of them; the default is all that are built):
 *   0  the ledger. Every fact of a verified row stands on an official page and a press page on two hosts, none a
 *      wiki, each with a line about that fact; a row that is not verified carries no constant and is named in
 *      CM_ONE_OFF_PARTIAL; the receipt holds the ledger's hash; no dash of the two banned kinds; every tuple of
 *      cmOneOffRows.ts equals its ledger row; the ship blocker (England 2026 and its season one edition) stands;
 *      every season one club is a club of that country in the game's world, and the edition's clubs are the ones
 *      the game's own verified 2025-26 data names (the champions of CM_FINAL_TABLES_2025_26, the cup winners of
 *      Round 1509's SEASON_ONE_CUP_WINNERS).
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run or a control that changed nothing, 3 a control
 * that ran and did not fire. A control is ONE_OFF_CONTROL=<name>; it runs its own section only and must turn its
 * own check red and nothing that is not its own (the last line says FIRED, DID NOT FIRE or ABORTED).
 *   section 0, the data twisted in memory: onesource (eng-2026's decider keeps one family) wiki (a press page is a
 *              wiki) thinused (eng-2015, not verified, carries a constant) receipt (the hash of another text)
 *              notinworld (a season one club that is not a club of the game's world)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.ONE_OFF_CONTROL || '';
const ONLY = (process.env.ONE_OFF_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simOneOffCups: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^eng-2026 decider stands on /, /^eng-2026 decider/],
  wiki: [0, /^SM-0814: .* is a wiki/, /^SM-0814/],
  thinused: [0, /^eng-2015 is not verified and carries/, /^eng-2015/],
  receipt: [0, /does not carry the hash/],
  notinworld: [0, /^eng-2026-s1: .* is not a club of england/, /^eng-2026-s1/],
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
let fired = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const LEDGER_FILE = 'scripts/data/cmOneOffFormats.json';
const RECEIPT_FILE = 'scripts/data/cmOneOffFormats.receipt.json';
const ROWS_FILE = 'src/data/cmOneOffRows.ts';
const CM = 'src/lib/clubManager.ts';
const ledger = JSON.parse(text(LEDGER_FILE));
const row = id => ledger.rows.find(r => r.id === id);

/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries, plugins = []) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `one-off-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins });
  return import(pathToFileURL(out).href);
}

/* ── Section 0: the ledger ── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const publisherOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.(uk|za)$/.test(h) ? -3 : -2).join('.'); };
const FACTS = { format: ['name', 'shape', 'decider', 'entry', 'double', 'place', 'venue'], edition: ['clubs', 'ground'] };

function section0() {
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const f = row('eng-2026').facts.decider; fired += f.by.length > 1 ? 1 : 0; f.by = f.by.slice(0, 1); }
  if (CONTROL === 'wiki') { const s = ledger.sources['SM-0814']; fired += isWiki(s.url) ? 0 : 1; s.url = 'https://en.wikipedia.org/wiki/2026_FA_Community_Shield'; }
  if (CONTROL === 'thinused') { const r = row('eng-2015'); fired += r.status !== 'verified' && r.usedBy.length === 0 ? 1 : 0; r.usedBy = ['CM_ONE_OFF_ROWS.eng-2015']; }

  /* 0.1 Every source is a page somebody can open, of one family, with a date and a line. */
  for (const [id, s] of Object.entries(ledger.sources)) {
    ok(/^https:\/\//.test(s.url), `${id}: ${s.url} is not https`);
    ok(!isWiki(s.url), `${id}: ${s.url} is a wiki`);
    ok(s.family === 'official' || s.family === 'press', `${id}: family ${s.family} is neither official nor press`);
    ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${id}: names no publisher`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(s.published) || s.published === 'undated', `${id}: no date and not marked undated`);
    ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5 && l.split(' ').length <= 20), `${id}: no literal, or one over twenty words`);
  }
  /* 0.2 A verified fact stands on both families on two hosts, each with a line about it; a row that is not
     verified carries nothing. */
  const ids = new Set();
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(r.status === 'verified' || r.status === 'toVerify', `${r.id}: status ${r.status} is neither verified nor toVerify`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    if (r.status !== 'verified') {
      ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
      ok(typeof r.standIn === 'string' && r.standIn.length > 20, `${r.id} is not verified and says nothing of what stands in`);
      continue;
    }
    for (const name of FACTS[r.kind] ?? []) {
      const f = r.facts?.[name];
      if (!f) { ok(false, `${r.id} ${name} is not in the row`); continue; }
      const srcs = (f.by ?? []).map(k => ({ k, s: ledger.sources[k] }));
      ok(srcs.every(x => !!x.s), `${r.id} ${name} names a source the ledger does not hold`);
      const good = srcs.filter(x => x.s);
      const fams = new Set(good.map(x => x.s.family));
      const pubs = new Set(good.map(x => publisherOf(x.s.url)));
      ok(fams.has('official') && fams.has('press') && pubs.size >= 2, `${r.id} ${name} stands on ${[...fams].join(' and ') || 'nothing'} (${pubs.size} hosts), not an official and a press page on two hosts`);
      const token = new RegExp(f.token ?? '^$', 'i');
      for (const x of good) ok(x.s.literal.some(l => token.test(l)), `${r.id} ${name}: ${x.k} has no line about it (${f.token})`);
    }
  }
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') fired += 1;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simOneOffCups.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE)); noDash(ROWS_FILE, text(ROWS_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | to verify ${count('toVerify')} | ${Object.keys(ledger.sources).length} pages`);
}

/* ── Section 0, second half: the constants state what the ledger states ── */
async function section0Engine() {
  const M = await bundle('rows', { r: ROWS_FILE, cm: CM, ft: 'src/data/clubManagerFinalTables2025_26.ts', e: 'src/lib/euroAccess.ts' });
  const { r: R, cm, ft, e } = M;
  const seasonOne = R.CM_ONE_OFF_SEASON_ONE.map(t => [...t]);
  if (CONTROL === 'notinworld') { fired += 1; seasonOne[0][2] = ['Arsenal', 'Torreense']; }
  /* 0.4 Every tuple is its verified ledger row, every verified row has its tuple, and the partial list is exactly
     the rows that are not verified. */
  const formats = ledger.rows.filter(x => x.kind === 'format');
  for (const t of R.CM_ONE_OFF_ROWS) {
    const [id, nation, year, name, shape, decider, entry, dbl, place, venue, away, pairing] = t;
    const r = row(id);
    if (!r || r.status !== 'verified') { ok(false, `${id}: a tuple with no verified ledger row`); continue; }
    const f = r.facts;
    ok(r.nation === nation && r.year === year, `${id}: the tuple is ${nation} ${year}, the ledger ${r.nation} ${r.year}`);
    ok(same([name, shape, decider, entry, dbl, place, venue], ['name', 'shape', 'decider', 'entry', 'double', 'place', 'venue'].map(k => f[k].value)), `${id}: the tuple ${JSON.stringify(t)} is not its ledger row`);
    ok(id === `${({ spain: 'esp' })[nation] ?? nation.slice(0, 3)}-${year}`, `${id}: the id is not the nation and year`);
    ok((away === 1) === (f.awayGoals?.value === true) && same(pairing ?? null, f.pairing?.value ?? null), `${id}: away goals or the pairing are not the ledger's`);
    ok(r.usedBy.includes(`CM_ONE_OFF_ROWS.${id}`), `${id}: the ledger does not say the tuple uses it`);
    ok(shape !== 'four' || (Array.isArray(pairing) && same([...pairing].sort(), [0, 1, 2, 3])), `${id}: a four with no pairing of the four entrants`);
  }
  for (const r of formats.filter(x => x.status === 'verified')) ok(R.CM_ONE_OFF_ROWS.some(t => t[0] === r.id), `${r.id}: verified, and no tuple plays it`);
  ok(same([...R.CM_ONE_OFF_PARTIAL].sort(), formats.filter(x => x.status !== 'verified').map(x => x.id).sort()), `CM_ONE_OFF_PARTIAL is ${R.CM_ONE_OFF_PARTIAL.join(' ')}, the rows not verified are ${formats.filter(x => x.status !== 'verified').map(x => x.id).join(' ')}`);
  ok(new Set(R.CM_ONE_OFF_ROWS.map(t => `${t[1]}|${t[2]}`)).size === R.CM_ONE_OFF_ROWS.length, 'two tuples for one country and year');
  /* The ship blocker: England 2026 and its season one edition. */
  ok(R.CM_ONE_OFF_ROWS.some(t => t[0] === 'eng-2026') && row('eng-2026-s1')?.status === 'verified', 'the ship blocker: England 2026 or its season one edition is not verified');
  /* 0.5 The season one editions: each its verified ledger row, its clubs clubs of that country in the game's world,
     and exactly the clubs the game's own verified 2025-26 data names by the row's rule. */
  const nationOf = id => cm.LEAGUE_RULES[id]?.nationId;
  for (const [rid, season, clubs, ground] of seasonOne) {
    const ed = ledger.rows.find(x => x.kind === 'edition' && x.row === rid);
    const t = R.CM_ONE_OFF_ROWS.find(x => x[0] === rid);
    if (!ed || ed.status !== 'verified' || !t) { ok(false, `${rid}: a season one edition with no verified ledger row or no tuple`); continue; }
    ok(ed.season === season && same([...clubs], ed.facts.clubs.value) && (ground ?? null) === (ed.facts.ground?.value ?? null), `${ed.id}: the constant ${JSON.stringify([rid, season, clubs, ground])} is not its ledger row`);
    ok(ed.usedBy.includes(`CM_ONE_OFF_SEASON_ONE.${rid}`), `${ed.id}: the ledger does not say the constant uses it`);
    const year = t[2];
    const world = year === 2026 ? cm.REAL_LEAGUES : null;
    if (!world) { ok(false, `${ed.id}: no world of ${year} to check its clubs against`); continue; }
    const leagues = world.filter(l => nationOf(l.id) === t[1]);
    const inWorld = new Set(leagues.flatMap(l => l.clubs));
    for (const c of clubs) ok(inWorld.has(c), `${ed.id}: ${c} is not a club of ${t[1]} in the game's world`);
    ok(new Set(clubs).size === clubs.length && clubs.length === (t[4] === 'four' ? 4 : 2), `${ed.id}: not ${t[4] === 'four' ? 4 : 2} different clubs`);
    /* The game's own 2025-26 data: the top flight's champions and runners up, and Round 1509's cup winners. */
    const top = leagues.find(l => cm.LEAGUE_RULES[l.id].ladder === 'top');
    const table = ft.CM_FINAL_TABLES_2025_26.leagues[top?.id]?.table ?? [];
    const cupWinner = e.SEASON_ONE_CUP_WINNERS[top?.id] ?? null;
    if (t[6] === 'champCup') {
      const second = cupWinner && cupWinner !== table[0] ? cupWinner : table[1];
      ok(same([...clubs], [table[0], second]), `${ed.id}: the game's 2025-26 data names ${table[0]} and ${second}, the edition ${clubs.join(' and ')}`);
    } else ok(false, `${ed.id}: entry ${t[6]} has no season one cross check yet`);
  }
  console.log(`  0 constants: ${R.CM_ONE_OFF_ROWS.length} rows (${R.CM_ONE_OFF_ROWS.map(t => t[0]).join(' ')}), ${seasonOne.length} season one editions, partial ${R.CM_ONE_OFF_PARTIAL.join(' ')}`);
}

/* ── Run ── */
const t0 = Date.now();
if (runs(0)) { section0(); await section0Engine(); }
const secs = Math.round((Date.now() - t0) / 1000);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (!fired) { console.log(`simOneOffCups: control ${CONTROL} ABORTED: it changed nothing (fired 0)`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simOneOffCups: control ${CONTROL} FIRED (fired ${fired}, ${fails.length} failures, all its own)`); process.exit(1); }
  if (!own) { console.log(`simOneOffCups: control ${CONTROL} DID NOT FIRE (fired ${fired}, ${fails.length} failures: ${fails.slice(0, 3).join(' / ')})`); process.exit(3); }
  console.log(`simOneOffCups: control ${CONTROL} DID NOT FIRE CLEANLY (stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
for (const f of fails.slice(0, 40)) console.log(`  FAIL ${f}`);
console.log(fails.length ? `simOneOffCups: ${fails.length} FAILURES of ${checks} checks (${secs} s)` : `simOneOffCups: green, ${checks} checks (${secs} s)`);
process.exit(fails.length ? 1 : 0);
