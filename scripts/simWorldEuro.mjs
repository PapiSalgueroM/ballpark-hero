/* Round 1509. The world's Europa League, followed from the Cups panel every season of today's world beside the
 * Champions League, and the one access rule that fills it and grades the board's European rungs.
 *
 *   scripts/data/cmEuroAccess.json   who is in it: the access rows, the cup route and its pass down, the holder
 *                                     routes, the real 2025-26 cup winners, the shape and the nights, with pages
 *   src/lib/euroAccess.ts             the constants those rows give, and (from step 3) the rule itself
 *
 * SECTIONS (WORLD_EURO_ONLY=0,1 runs some of them; the default is all that are built):
 *   0  the ledger. A verified row stands on two publishers on two hosts, none a wiki; a figure is printed by two
 *      of them, each in a line about that figure; a row that is not verified carries no constant; one access row
 *      for every modern European league, its game numbers equal to the league's LEAGUE_RULES row; one cup row for
 *      every one of them, its club a club of the game's world of that nation (or null, said); the receipt holds
 *      the ledger's hash; no dash of the two banned kinds. Then the constants: every constant of euroAccess.ts
 *      equals its row, EURO_ACCESS_PARTIAL names exactly the rows that are not verified or whose real access is
 *      not the game's, the legs and the months are what both publishers print.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is WORLD_EURO_CONTROL=<name>; it runs its own section only and must turn its own check red and
 * nothing that is not its own (the last line says FIRED, DID NOT FIRE CLEANLY or ABORTED).
 *   section 0, the data twisted in memory: onesource (A2 keeps one publisher) wiki (K1's second page is a wiki)
 *              thinused (A6, one publisher, carries a constant) receipt (the hash of another file)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.WORLD_EURO_CONTROL || '';
const ONLY = (process.env.WORLD_EURO_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simWorldEuro: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^A2 is verified and stands on fewer than two publishers/, /^A2/],
  wiki: [0, /^K1: .* is a wiki/, /^K1/],
  thinused: [0, /^A6 is not verified and carries/, /^A6/],
  receipt: [0, /does not carry the hash/],
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
let changed = false;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const LEDGER_FILE = 'scripts/data/cmEuroAccess.json';
const RECEIPT_FILE = 'scripts/data/cmEuroAccess.receipt.json';
const MODULE_FILE = 'src/lib/euroAccess.ts';
const CM = 'src/lib/clubManager.ts';
const ledger = JSON.parse(text(LEDGER_FILE));
const row = id => ledger.rows.find(r => r.id === id);

/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries, plugins = []) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `world-euro-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins });
  return import(pathToFileURL(out).href);
}

/* ── Section 0: the ledger ─────────────────────────────────────────────────────────────────────────── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const domainOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.uk$/.test(h) ? -3 : -2).join('.'); };
/* UEFA's regulations and uefa.com are one publisher on two hosts: counted once. */
const publisherOf = url => (/(^|\.)uefa\.com$/.test(new URL(url).host) ? 'uefa' : domainOf(url));
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
/** A place `n` printed in a line: the access list's code (N5) or the word (Fifth in Italy). */
const printsPlace = (line, n) => new RegExp(`(^|[^A-Za-z0-9])N${n}([^0-9]|$)`).test(line) || new RegExp(`\\b${ORDINALS[n]}\\b`, 'i').test(line);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** The nights a date line holds, as months in order: "18 & 25 February" is two Februaries, "29 April & 6 May"
 *  an April and a May, "September 16/17, 2026" one September (one matchday on two evenings). */
function monthsOf(line) {
  const after = line.replace(/^[^:]*:/, '');
  const parts = after.split('&');
  const named = parts.map(p => { const m = MONTHS.findIndex(name => new RegExp(`\\b${name}\\b`, 'i').test(p)); return m >= 0 ? m + 1 : null; });
  return named.map((m, i) => m ?? named.slice(i + 1).find(x => x !== null) ?? null);
}

function section0() {
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const r = row('A2'); changed = r.sources.length > 1; r.sources.length = 1; }
  if (CONTROL === 'wiki') { const s = row('K1').sources[1]; changed = !isWiki(s.url); s.url = 'https://en.wikipedia.org/wiki/2026_FA_Cup_final'; }
  if (CONTROL === 'thinused') { const r = row('A6'); changed = r.status !== 'verified' && r.usedBy.length === 0; r.usedBy = ['EURO_SLOTS.eredivisie.uel']; }

  /* 0.1 Every row is a reading somebody can open, and a verified row stands on two publishers. */
  const ids = new Set();
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(['verified', 'onePublisher', 'toVerify'].includes(r.status), `${r.id}: status ${r.status} is not one of the three`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    for (const s of r.sources) {
      ok(/^https:\/\//.test(s.url), `${r.id}: ${s.url} is not https`);
      ok(!isWiki(s.url), `${r.id}: ${s.url} is a wiki`);
      ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${r.id}: a source names no publisher`);
      ok(typeof s.published === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(s.published) || s.published === 'undated'), `${r.id}, ${s.publisher}: no date and not marked undated`);
      ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5), `${r.id}, ${s.publisher}: no literal`);
    }
    const publishers = new Set(r.sources.map(s => publisherOf(s.url)));
    if (r.status === 'verified') ok(publishers.size >= 2, `${r.id} is verified and stands on fewer than two publishers`);
    else ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
    if (r.status === 'toVerify') ok(typeof r.standIn === 'string' && r.standIn.length > 20, `${r.id} is not read and names no stand in`);
    /* A place a row states is printed by two publishers, each in a line about it. */
    if (r.figures?.uelPlace !== undefined) {
      const by = new Set(r.sources.filter(s => s.literal.some(l => printsPlace(l, r.figures.uelPlace))).map(s => publisherOf(s.url)));
      ok(by.size >= 2, `${r.id}: the Europa League place ${r.figures.uelPlace} is not printed by two publishers`);
    }
  }
  /* 0.2 The cup rows: each source names the winner. */
  for (const r of ledger.rows.filter(x => x.kind === 'cup')) {
    const tokens = String(r.winner).split(/[\s.]+/).filter(t => t.length >= 2 && !/^(FC|St)$/.test(t));
    for (const s of r.sources) ok(s.literal.some(l => tokens.some(t => l.includes(t))), `${r.id}, ${s.publisher}: no line names ${r.winner}`);
  }
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') changed = true;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simWorldEuro.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE)); noDash(MODULE_FILE, text(MODULE_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | one publisher ${count('onePublisher')} | to verify ${count('toVerify')}`);
}

/* ── Section 0, second half: the constants state what the ledger states ────────────────────────────── */
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
/** An access row agrees when the real 2026/27 access is the game's row: its Champions League places (qualifying
 *  routes counted as in), exactly its Europa League league places, and the cup winner. */
const agrees = r => r.real.cupWinner === true && r.real.uclAsIn === r.game.ucl && same(r.real.uelLeague, range(r.game.ucl + 1, r.game.uel));

async function section0Engine() {
  const M = await bundle('engine', { e: MODULE_FILE, cm: CM, w: 'src/lib/worldCompetition.ts' });
  const { e, cm, w } = M;
  const european = cm.REAL_LEAGUES.filter(l => l.euro).map(l => l.id);
  const nationOf = id => cm.LEAGUE_RULES[id]?.nationId;
  /* 0.4 One access row per modern European league, its game numbers the league's own LEAGUE_RULES row. */
  const access = ledger.rows.filter(r => r.kind === 'access');
  ok(same([...access.map(r => r.league)].sort(), [...european].sort()), `the access rows cover ${access.map(r => r.league).join(' ')}, the European leagues are ${european.join(' ')}`);
  for (const r of access) {
    const slots = cm.EURO_SLOTS[r.league];
    ok(!!slots && slots.ucl === r.game.ucl && slots.uel === r.game.uel, `${r.id}: the game's places ${JSON.stringify(r.game)} are not ${r.league}'s LEAGUE_RULES row ${JSON.stringify(slots)}`);
    if (!agrees(r) || r.status !== 'verified') ok(r.usedBy.length === 0, `${r.id}: its real access is not the game's and it carries ${r.usedBy.join(', ')}`);
  }
  /* 0.5 EURO_ACCESS_PARTIAL names exactly the rows not verified and the access rows that do not agree. */
  const owed = ledger.rows.filter(r => r.status !== 'verified' || (r.kind === 'access' && !agrees(r))).map(r => r.id);
  const partial = [...e.EURO_ACCESS_PARTIAL];
  for (const id of owed) ok(partial.includes(id), `EURO_ACCESS_PARTIAL does not name ${id}`);
  for (const id of partial) ok(owed.includes(id), `EURO_ACCESS_PARTIAL names ${id}, which is verified and agrees or is not in the ledger`);
  /* 0.6 Every usedBy is a real constant. */
  for (const r of ledger.rows) for (const u of r.usedBy) {
    const [name, key, sub] = u.split('.');
    const where = name === 'EURO_SLOTS' ? cm : e;
    const v = where[name];
    ok(v !== undefined && (key === undefined || (v && Object.hasOwn(v, key))) && (sub === undefined || Object.hasOwn(v[key], sub)), `${r.id}: usedBy ${u} is not a constant`);
  }
  /* 0.7 The cup rows: one per European league, each club the game's own string of a club of that nation's world. */
  const clubsOfNation = id => new Set(cm.REAL_LEAGUES.filter(l => nationOf(l.id) === nationOf(id)).flatMap(l => l.clubs));
  const cups = ledger.rows.filter(r => r.kind === 'cup' && r.id !== 'K16');
  ok(same([...cups.map(r => r.league)].sort(), [...european].sort()), `the cup rows cover ${cups.map(r => r.league).join(' ')}`);
  ok(same(Object.keys(e.SEASON_ONE_CUP_WINNERS).sort(), [...european].sort()), 'SEASON_ONE_CUP_WINNERS is not keyed by the European leagues');
  for (const r of cups) {
    ok(e.SEASON_ONE_CUP_WINNERS[r.league] === r.club, `SEASON_ONE_CUP_WINNERS.${r.league} is ${e.SEASON_ONE_CUP_WINNERS[r.league]} and ${r.id} says ${r.club}`);
    if (r.club === null) ok(typeof r.note === 'string' && r.note.length > 20, `${r.id}: a winner outside the game's world without a note`);
    else ok(clubsOfNation(r.league).has(r.club), `${r.id}: ${r.club} is not a club of ${nationOf(r.league)} in the game's world`);
    if (r.club !== null) ok(r.status === 'verified', `${r.id} is ${r.status} and season one plays it`);
  }
  const k16 = row('K16');
  ok(e.SEASON_ONE_UECL_HOLDER === k16.club && cm.REAL_LEAGUES.some(l => l.clubs.includes(k16.club)), `SEASON_ONE_UECL_HOLDER is ${e.SEASON_ONE_UECL_HOLDER}, K16 says ${k16.club}`);
  /* 0.8 The routes, the legs and the months. */
  const routes = { cupWinnerEnters: 'Q2', cupPassDown: 'Q3', uelHolderToUcl: 'Q4', ueclHolderToUel: 'C0' };
  for (const [k, id] of Object.entries(routes)) ok(e.EURO_ACCESS_RULES[k] === true && row(id).status === 'verified', `EURO_ACCESS_RULES.${k} is ${e.EURO_ACCESS_RULES[k]} and ${id} is ${row(id).status}`);
  ok(same({ ...e.UEL_LEGS }, { PO: 2, R16: 2, QF: 2, SF: 2, F: 1 }), `UEL_LEGS is ${JSON.stringify(e.UEL_LEGS)}`);
  const ROUND_LINE = { PO: /play-off/i, R16: /round of 16/i, QF: /quarter/i, SF: /semi/i, F: /^final/i };
  for (const s of row('U-legs').sources) {
    for (const [round, re] of Object.entries(ROUND_LINE)) {
      const nights = s.literal.filter(l => re.test(l)).flatMap(monthsOf).length;
      ok(nights === e.UEL_LEGS[round], `U-legs, ${s.publisher}: ${round} prints ${nights} nights and UEL_LEGS says ${e.UEL_LEGS[round]}`);
    }
  }
  const u7 = row('U7');
  ok(same([...e.UEL_NIGHT_MONTHS], u7.figures.months), `UEL_NIGHT_MONTHS is not U7's months`);
  for (const s of u7.sources) ok(same(s.literal.flatMap(monthsOf), u7.figures.months), `U7, ${s.publisher}: its lines give the months ${JSON.stringify(s.literal.flatMap(monthsOf))}`);
  const seasonOrder = m => (m + 4) % 12;
  ok(u7.figures.months.every((m, i, a) => i === 0 || seasonOrder(m) >= seasonOrder(a[i - 1])), 'U7 months are not in season order');
  ok(u7.figures.months.length === w.LEAGUE_PHASE_NIGHT_ORDER.length, 'U7 does not give a month for each of the seventeen nights');
  const marks = w.LEAGUE_PHASE_NIGHT_MARKS;
  ok(e.UEL_FINAL_MARK > marks[marks.length - 2] && e.UEL_FINAL_MARK < 1, `UEL_FINAL_MARK ${e.UEL_FINAL_MARK} is not after the semi-finals' second leg mark and before the season's end`);
  /* 0.9 No European league of today's world is Russian or Ukrainian (the critic's 9(g) for the league phase): the
     Russian league the world carries has no European row (UEFA's suspension), so none of its clubs is ever in. */
  const nations = new Set(cm.REAL_LEAGUES.filter(l => l.euro).map(l => nationOf(l.id)));
  ok(!nations.has('russia') && !nations.has('ukraine'), 'a European league of today\'s world is Russian or Ukrainian');
  ok(cm.REAL_LEAGUES.filter(l => nationOf(l.id) === 'russia' || nationOf(l.id) === 'ukraine').every(l => !l.euro && cm.LEAGUE_RULES[l.id].europe === null), 'a Russian or Ukrainian league of today\'s world has a European row');
  console.log(`  0 constants: partial ${partial.join(' ')}; cup winners ${Object.values(e.SEASON_ONE_CUP_WINNERS).map(c => c ?? 'none').join(', ')}; nations ${[...nations].join(' ')}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────── */
try {
  if (runs(0)) { section0(); await section0Engine(); }
} catch (err) {
  console.log(`simWorldEuro: cannot run: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`);
  process.exit(2);
}
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (!changed) { console.log(`simWorldEuro: control ${CONTROL} ABORTED: it changed nothing`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simWorldEuro: control ${CONTROL} FIRED (${fails.length} failures, all its own)`); process.exit(1); }
  console.log(`simWorldEuro: control ${CONTROL} DID NOT FIRE CLEANLY (own ${own}, stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
console.log(`simWorldEuro: ${fails.length === 0 ? 'green' : 'RED'}, ${checks} checks, ${fails.length} failures`);
process.exit(fails.length === 0 ? 0 : 1);
