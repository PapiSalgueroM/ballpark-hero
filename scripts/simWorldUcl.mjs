/* Round 1347. The world's Champions League, part one: the format ledger and the competition engine, which nothing
 * in the game calls yet (Round 1502 binds it to Club Manager, Round 1503 shows it).
 *
 *   scripts/data/cmWorldCompFormats.json   the group stage format of the four era seasons, each row with its pages
 *   src/lib/worldCompetition.ts             the engine: the eras' groups, the league phase (Round 1228's library,
 *                                           bound), the knockout ties, the nights, the evaluation of a saved slice
 *
 * SECTIONS (WORLD_UCL_ONLY=0 runs some of them; the default is all):
 *   0  the ledger. A verified row stands on two publishers on two hosts, none a wiki; a figure is printed by two
 *      of them, each in a line about that figure; a row that is not verified carries no constant; every era
 *      season has a verified group stage shape and a group draw row; the receipt holds the ledger's hash; no dash
 *      of the two banned kinds. Then the engine (from Round 1347's second step): every constant of
 *      worldCompetition.ts equals its row, WORLD_COMP_PARTIAL names exactly the rows that are not verified, and
 *      the league phase nights run in the real months' order (row N1).
 *   Sections 1 to 7 (the watched season, nothing moves, in step, the save, the holder, the dailies, the measured
 *   rates) come with Round 1502, when something calls the engine.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is WORLD_UCL_CONTROL=<name>; it runs its own section only and must turn its own check red and nothing
 * that is not its own (the last line says FIRED, DID NOT FIRE CLEANLY or ABORTED).
 *   section 0, the data twisted in memory: onesource wiki thinused figure receipt cover order (two of N1's
 *              months swapped); the engine edited in the bundle: const (the top two become three) partial
 *              (WORLD_COMP_PARTIAL forgets G8) ban (2015-16 draws Russian and Ukrainian clubs together)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.WORLD_UCL_CONTROL || '';
const ONLY = (process.env.WORLD_UCL_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simWorldUcl: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^G3-2020 is verified and stands on fewer than two publishers/],
  wiki: [0, /^G1: .* is a wiki/],
  thinused: [0, /^G2-2005 is not verified and carries/],
  figure: [0, /^G1: groups 8 is not printed by two publishers/],
  receipt: [0, /does not carry the hash/],
  cover: [0, /^season 2010 has no verified G1 row/, /^season 2010 has no verified G1 row|^G1: /],
  /* The engine edited in the bundle (EDITS below), or the ledger twisted where the engine is compared. */
  const: [0, /^G8_SHAPE\.advance is 3 in worldCompetition\.ts and 2 in the ledger/],
  partial: [0, /^WORLD_COMP_PARTIAL does not name G8/],
  ban: [0, /^G8_BANNED_PAIRS\.2015 keeps nobody apart and G5-2015-groups/],
  order: [0, /^the league phase nights are not in the real months' order at MD3/],
};
const MODULE_FILE = 'src/lib/worldCompetition.ts';
const EDITS = {
  const: [MODULE_FILE, 'export const G8_SHAPE = { clubs: 32, groups: 8, groupSize: 4, games: 6, advance: 2 } as const;', 'export const G8_SHAPE = { clubs: 32, groups: 8, groupSize: 4, games: 6, advance: 3 } as const;'],
  partial: [MODULE_FILE, "'G5-2020-ko', 'G8'];", "'G5-2020-ko'];"],
  ban: [MODULE_FILE, "2005: [], 2010: [], 2015: [['Russia', 'Ukraine']], 2020: [['Russia', 'Ukraine']],", "2005: [], 2010: [], 2015: [], 2020: [['Russia', 'Ukraine']],"],
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

const LEDGER_FILE = 'scripts/data/cmWorldCompFormats.json';
const RECEIPT_FILE = 'scripts/data/cmWorldCompFormats.receipt.json';
const ledger = JSON.parse(text(LEDGER_FILE));

/* ── Section 0: the ledger ─────────────────────────────────────────────────────────────────────────── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const domainOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.uk$/.test(h) ? -3 : -2).join('.'); };
const WORDS = { one: 1, two: 2, three: 3, four: 4, six: 6, eight: 8 };
const printed = (s, n) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(s)
  || Object.entries(WORDS).some(([w, v]) => v === n && new RegExp(`\\b${w}\\b`, 'i').test(s));
/* A figure counts for a publisher only when ONE of its quoted lines prints the number about that figure (the
   lesson of Round 1228's review: a "two" in a line about pots is not a cap of two). */
const FIGURE_WORDS = {
  clubs: /club|team|participant/i, groups: /group/i, groupSize: /group/i, games: /game|match/i,
  advance: /top two|through|advanc|qualif/i, legs: /leg|match/i, abolishedFrom: /away goals/i,
};
const printsFigure = (source, key, n) => source.literal.some(l => (FIGURE_WORDS[key] ?? /./).test(l) && printed(l, n));

function section0() {
  const row = id => ledger.rows.find(r => r.id === id);
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const r = row('G3-2020'); changed = r.sources.length > 1; r.sources.length = 1; }
  if (CONTROL === 'wiki') { const s = row('G1').sources[1]; changed = !isWiki(s.url); s.url = 'https://en.wikipedia.org/wiki/UEFA_Champions_League'; }
  if (CONTROL === 'thinused') { const r = row('G2-2005'); changed = r.status !== 'verified' && r.usedBy.length === 0; r.usedBy = ['G8_SHAPE.clubs']; }
  if (CONTROL === 'figure') { for (const s of row('G1').sources.slice(1)) { const was = s.literal.join('|'); s.literal = s.literal.map(l => l.replace(/\beight\b/gi, 'some')); changed ||= was !== s.literal.join('|'); } }
  if (CONTROL === 'cover') { const r = row('G1'); changed = r.seasons.includes(2010); r.seasons = r.seasons.filter(y => y !== 2010); }

  /* 0.1 Every row is a reading somebody can open, and a verified row stands on two publishers. */
  const ids = new Set();
  const seasonsKnown = new Set([...ledger.eraSeasons, 2026]);
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(['verified', 'onePublisher', 'toVerify'].includes(r.status), `${r.id}: status ${r.status} is not one of the three`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    ok(Array.isArray(r.seasons) && r.seasons.length > 0 && r.seasons.every(y => seasonsKnown.has(y)), `${r.id}: its seasons ${JSON.stringify(r.seasons)} are not era seasons`);
    for (const s of r.sources) {
      ok(/^https:\/\//.test(s.url), `${r.id}: ${s.url} is not https`);
      ok(!isWiki(s.url), `${r.id}: ${s.url} is a wiki`);
      ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${r.id}: a source names no publisher`);
      ok(typeof s.published === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.published), `${r.id}, ${s.publisher}: no date`);
      ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5), `${r.id}, ${s.publisher}: no literal`);
    }
    const domains = new Set(r.sources.map(s => domainOf(s.url)));
    if (r.status === 'verified') ok(domains.size >= 2, `${r.id} is verified and stands on fewer than two publishers`);
    else ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
    for (const [key, n] of Object.entries(r.figures ?? {})) {
      const by = new Set(r.sources.filter(s => printsFigure(s, key, n)).map(s => domainOf(s.url)));
      ok(by.size >= 2, `${r.id}: ${key} ${n} is not printed by two publishers`);
      if (Object.hasOwn(ledger.g8, key)) ok(ledger.g8[key] === n, `${r.id}: ${key} is ${n} and g8.${key} is ${ledger.g8[key]}`);
    }
  }
  /* 0.2 Every era season has a verified group stage shape and a row for its group draw's two rules. */
  const covering = (prefix, y) => ledger.rows.filter(r => (r.id === prefix || r.id.startsWith(`${prefix}-`)) && r.seasons.includes(y));
  for (const y of ledger.eraSeasons) {
    ok(covering('G1', y).some(r => r.status === 'verified'), `season ${y} has no verified G1 row`);
    ok(covering('G3', y).length === 1, `season ${y} has ${covering('G3', y).length} rows for the association rule of its group draw, one expected`);
    ok(covering('G5', y).filter(r => !/-ko$/.test(r.id)).length === 1, `season ${y} has no single row for the Russia and Ukraine rule of its group draw`);
  }
  ok(ledger.g8.clubs === ledger.g8.groups * ledger.g8.groupSize && ledger.g8.groupSize === ledger.g8.pots, 'g8 is not 32 clubs in eight groups of four, one from each pot');
  ok(ledger.g8.games === 2 * (ledger.g8.groupSize - 1), 'g8 games are not a double round robin of the group');
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') changed = true;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simWorldUcl.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | one publisher ${count('onePublisher')} | to verify ${count('toVerify')}`);
}

/* ── Section 0, second half: the engine states what the ledger states ──────────────────────────────── */
const editPlugin = {
  name: 'world-ucl-control',
  setup(b) {
    const edit = EDITS[CONTROL];
    if (!edit) return;
    const [file, from, to] = edit;
    b.onLoad({ filter: new RegExp(`${file.split('/').pop().replace('.', '[.]')}$`) }, async args => {
      const source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      const count = source.split(from).length - 1;
      if (count !== 1) cannot(`control ${CONTROL}: its line is in ${file} ${count} times, it must be exactly once`);
      changed = true;
      return { contents: source.replace(from, to), loader: 'ts' };
    });
  },
};
/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `world-ucl-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [editPlugin] });
  return import(pathToFileURL(out).href);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function section0Engine() {
  const w = (await bundle('engine', { w: MODULE_FILE })).w;
  const row = id => ledger.rows.find(r => r.id === id);
  if (CONTROL === 'order') { const m = row('N1').months; changed = m.MD2 <= m.MD3; m.MD2 = 11; }
  /* 0.4 Every constant equals its row. */
  const g1 = row('G1');
  for (const [key, n] of Object.entries(g1.figures)) ok(w.G8_SHAPE[key] === n, `G8_SHAPE.${key} is ${w.G8_SHAPE[key]} in worldCompetition.ts and ${n} in the ledger`);
  ok(Object.keys(w.G8_SHAPE).every(k => Object.hasOwn(g1.figures, k)), 'G8_SHAPE holds a number no G1 figure prints');
  for (const y of ledger.eraSeasons) {
    const g3 = ledger.rows.find(r => r.id.startsWith('G3') && r.seasons.includes(y));
    ok(w.G8_ASSOC_APART[y] === (g3?.status === 'verified'), `G8_ASSOC_APART.${y} is ${w.G8_ASSOC_APART[y]} and its row ${g3?.id} is ${g3?.status}`);
    const g5 = ledger.rows.find(r => r.id.startsWith('G5') && !/-ko$/.test(r.id) && r.seasons.includes(y));
    const bans = w.G8_BANNED_PAIRS[y] ?? [];
    const said = bans.length ? bans.map(p => p.join(' and ')).join(', ') : 'nobody';
    if (g5?.id === 'G5-ruling') ok(bans.length === 0, `G8_BANNED_PAIRS.${y} keeps ${said} apart before the July 2014 ruling (G5-ruling)`);
    else ok(g5?.status === 'verified' ? bans.length === 1 && same(bans[0], ['Russia', 'Ukraine']) : bans.length === 0, `G8_BANNED_PAIRS.${y} keeps ${said} apart and ${g5?.id} is ${g5?.status}`);
  }
  /* 0.5 WORLD_COMP_PARTIAL names exactly the rows that are not verified, and every usedBy is a real constant. */
  const notVerified = ledger.rows.filter(r => r.status !== 'verified').map(r => r.id);
  const partial = [...w.WORLD_COMP_PARTIAL];
  for (const id of notVerified) ok(partial.includes(id), `WORLD_COMP_PARTIAL does not name ${id}, which is ${row(id).status}`);
  for (const id of partial) ok(notVerified.includes(id), `WORLD_COMP_PARTIAL names ${id}, which is verified or not in the ledger`);
  for (const r of ledger.rows) for (const u of r.usedBy) {
    const [name, key] = u.split('.');
    ok(Object.hasOwn(w, name) && (key === undefined || Object.hasOwn(w[name], key)), `${r.id}: usedBy ${u} is not in worldCompetition.ts`);
  }
  /* 0.6 The nights: 13 and 17, the league phase's in the real months' order, its marks eleven rising fractions. */
  /* The module takes every round's legs from its binding; these are the participant's (uclLegsFor). */
  const legs = r => (r === 'F' ? 1 : 2);
  const order = w.nightsOf('l36', legs).map(n => n.id);
  ok(w.nightsOf('g8', legs).length === 13 && order.length === 17, `the nights are ${w.nightsOf('g8', legs).length} (g8) and ${order.length} (l36), 13 and 17 expected`);
  ok(same(order, [...w.LEAGUE_PHASE_NIGHT_ORDER]), 'LEAGUE_PHASE_NIGHT_ORDER is not the order nightsOf gives');
  const months = row('N1').months;
  ok(same(Object.keys(months), order), 'N1 does not give a month for each night in order');
  for (let i = 1; i < order.length; i += 1) if (months[order[i]] < months[order[i - 1]]) { ok(false, `the league phase nights are not in the real months' order at ${order[i]}`); break; }
  const marks = w.LEAGUE_PHASE_NIGHT_MARKS;
  ok(marks.length === order.length - 6 && marks.every((m, i) => m > 0 && m <= 1 && (i === 0 || m > marks[i - 1])), 'LEAGUE_PHASE_NIGHT_MARKS are not eleven rising fractions of the season');
  console.log(`  0 engine: G8_SHAPE ${JSON.stringify(w.G8_SHAPE)}; association rule ${ledger.eraSeasons.map(y => `${y} ${w.G8_ASSOC_APART[y]}`).join(', ')}; bans ${ledger.eraSeasons.map(y => `${y} ${(w.G8_BANNED_PAIRS[y] ?? []).length}`).join(', ')}; partial ${partial.join(' ')}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────── */
try {
  if (runs(0)) { section0(); await section0Engine(); }
} catch (e) {
  console.log(`simWorldUcl: cannot run: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  process.exit(2);
}
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (!changed) { console.log(`simWorldUcl: control ${CONTROL} ABORTED: it changed nothing`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simWorldUcl: control ${CONTROL} FIRED (${fails.length} failures, all its own)`); process.exit(1); }
  console.log(`simWorldUcl: control ${CONTROL} DID NOT FIRE CLEANLY (own ${own}, stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
console.log(`simWorldUcl: ${fails.length === 0 ? 'green' : 'RED'}, ${checks} checks, ${fails.length} failures`);
process.exit(fails.length === 0 ? 0 : 1);
