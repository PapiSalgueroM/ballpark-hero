/* Round 1218. The two ledgers the Club Manager review rule is derived from, held as DATA.
 *
 *   scripts/data/cmVarRates.json          what a review changes in real football, per match
 *   scripts/data/cmVarCompetitions.json   which competitions use a video assistant referee in 2026-27
 *
 * It plays no match. What it holds:
 *   1. every rates row is a real reading: a known publisher, an https url that is not a wiki, the lines it was
 *      read from, and every figure printed in one of those lines;
 *   2. a quantity the engine models is counted by two publishers and by two seasons from 2022-23 on, and every
 *      figure belongs to a declared quantity;
 *   3. the competitions file names every competition the engine can play exactly once and none it cannot
 *      (the keys are read off REAL_LEAGUES and the rules table of the bundled engine), and a yes or a no
 *      stands on two publishers on two hosts;
 *   4. each receipt carries the hash of the ledger it vouches for, and what the generator writes is on disk;
 *   5. no dash of the two banned kinds in any of the files.
 *
 * Controls, each of which changes the data in memory, proves it changed something, and must go red for its own
 * reason: CM_VAR_LEDGER_CONTROL=thin | wiki | figure | missing | extra | onesource | receipt.
 * A control that fires ends "FIRED" and exits 1. One that changes nothing or is not caught exits 3.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { settle, stampedReceipts, LEDGERS } from './genCmVarRates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.CM_VAR_LEDGER_CONTROL || '';
const EXPECT = {
  thin: /goalsRuledOut is modelled but THIN/, wiki: /is a wiki/, figure: /is not printed in its literals/,
  missing: /is not in the ledger/, extra: /the engine cannot play/, onesource: /stands on fewer than two publishers/,
  receipt: /does not carry the hash/,
};
if (CONTROL && !Object.hasOwn(EXPECT, CONTROL)) { console.log(`simCmVarLedger: unknown control ${CONTROL}`); process.exit(2); }

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const WORDS = { zehn: 10 };
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\./i.test(new URL(url).host);
const RECENT = '2022-23';

const rates = JSON.parse(text('scripts/data/cmVarRates.json'));
const comps = JSON.parse(text('scripts/data/cmVarCompetitions.json'));
let receiptTwist = s => s;
let changed = false;
if (CONTROL === 'thin') { const n = rates.rows.length; rates.rows = rates.rows.filter(r => r.publisher !== 'pieri'); changed = rates.rows.length < n; }
if (CONTROL === 'wiki') { const was = rates.rows[0].url; rates.rows[0].url = 'https://en.wikipedia.org/wiki/Video_assistant_referee'; changed = was !== rates.rows[0].url; }
if (CONTROL === 'figure') { const row = rates.rows.find(r => r.figures.goalsRuledOut === 47); if (row) { row.figures.goalsRuledOut = 48; changed = true; } }
if (CONTROL === 'missing') { const n = comps.rows.length; comps.rows = comps.rows.filter(r => r.key !== 'league:premier'); changed = comps.rows.length < n; }
if (CONTROL === 'extra') { comps.rows.push({ key: 'league:atlantis', name: 'Atlantis League', verdict: 'unknown', sources: [] }); changed = true; }
if (CONTROL === 'onesource') { const row = comps.rows.find(r => r.key === 'league:seriea'); if (row && row.sources.length === 2) { row.sources.pop(); changed = true; } }
if (CONTROL === 'receipt') { receiptTwist = s => `${s} `; changed = true; }
if (CONTROL && !changed) { console.log(`simCmVarLedger control ${CONTROL}: ABORTED, the control changed nothing.`); process.exit(3); }

/* 1. Every rates row is a reading somebody can open. */
const quantities = Object.keys(rates.quantities);
for (const row of rates.rows) {
  ok(Object.hasOwn(rates.publishers, row.publisher), `${row.id}: publisher ${row.publisher} is not declared`);
  ok(/^https:\/\//.test(row.url), `${row.id}: url is not https`);
  ok(!isWiki(row.url), `${row.id}: ${row.url} is a wiki`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(row.published), `${row.id}: published is not a date`);
  ok(/^\d{4}-\d{2}$/.test(row.season), `${row.id}: season is not written 2024-25`);
  ok(row.matches === 380 || row.matches === 306, `${row.id}: ${row.matches} matches is not a 20 or an 18 club season`);
  ok(Array.isArray(row.literal) && row.literal.length > 0, `${row.id}: no literal`);
  const printed = (row.literal ?? []).join(' | ');
  for (const [name, value] of Object.entries(row.figures)) {
    ok(quantities.includes(name), `${row.id}: figure ${name} is not a declared quantity`);
    const inDigits = new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(printed);
    const inWords = Object.entries(WORDS).some(([word, n]) => n === value && printed.includes(word));
    ok(inDigits || inWords, `${row.id}: ${name} ${value} is not printed in its literals`);
  }
}

/* 2. Two publishers and two recent seasons behind everything the engine models. */
for (const [name, q] of Object.entries(rates.quantities)) {
  const s = settle(rates, name);
  if (q.modelled) {
    ok(s.used, `${name} is modelled but THIN (${s.why ?? ''})`);
    const recent = new Set(s.readings.filter(r => r.season >= RECENT).map(r => r.season));
    ok(recent.size >= 2, `${name} is modelled on ${recent.size} season(s) from ${RECENT} on`);
    if (s.used) ok(s.low > 0 && s.low <= s.high && s.target.perMatch === s.low, `${name}: the target is not the lowest reading`);
  } else ok(typeof q.why === 'string' && q.why.length > 20, `${name} is not modelled and does not say why`);
}

/* 3. Every competition the engine can play, exactly once, and none it cannot. */
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => { store.clear(); } };
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmvarledger-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const entry = path.join(TMP, 'entry.mjs'), out = path.join(TMP, 'engine.mjs');
fs.writeFileSync(entry, `export * as cm from '${ROOT_FWD}/src/lib/clubManager.ts';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error' });
const { cm } = await import(pathToFileURL(out).href);
const leagueKeys = cm.REAL_LEAGUES.map(l => `league:${l.id}`);
const cupKeys = [...new Set(cm.REAL_LEAGUES.map(l => cm.leagueRulesOf(l.id).cup).filter(Boolean))].map(c => `cup:${c}`);
const engineKeys = [...leagueKeys, ...cupKeys, 'ucl'];
ok(leagueKeys.length >= 27 && cupKeys.length >= 20, `the engine gave ${leagueKeys.length} leagues and ${cupKeys.length} cups, fewer than it plays`);
const named = [...comps.rows.map(r => r.key), ...comps.notRead.leagues.map(id => `league:${id}`), ...comps.notRead.cups.map(c => `cup:${c}`)];
for (const key of engineKeys) {
  const n = named.filter(k => k === key).length;
  ok(n >= 1, `${key} is not in the ledger`);
  ok(n <= 1, `${key} is in the ledger ${n} times`);
}
for (const key of named) ok(engineKeys.includes(key), `${key} is in the ledger and the engine cannot play it`);
const CUP_STAGES = ['R16', 'QF', 'SF', 'F'], UCL_STAGES = ['group', 'R16', 'QF', 'SF', 'F'];
const hostOf = url => new URL(url).host.replace(/^www\./, '');
for (const row of comps.rows) {
  ok(['yes', 'no', 'unknown'].includes(row.verdict), `${row.key}: verdict ${row.verdict}`);
  for (const s of row.sources) {
    ok(/^https:\/\//.test(s.url) && !isWiki(s.url), `${row.key}: ${s.url} is a wiki or not https`);
    ok(typeof s.literal === 'string' && s.literal.length > 15 && typeof s.published === 'string' && /^2026/.test(s.published), `${row.key}: a source has no literal or is not dated 2026`);
    ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${row.key}: a source names no publisher`);
  }
  const publishers = new Set(row.sources.map(s => s.publisher)), hosts = new Set(row.sources.map(s => hostOf(s.url)));
  if (row.verdict === 'unknown') ok(Math.min(publishers.size, hosts.size) < 2, `${row.key} has two sources and is still unknown`);
  else ok(publishers.size >= 2 && hosts.size >= 2, `${row.key} says ${row.verdict} and stands on fewer than two publishers`);
  if (row.verdict === 'yes' && row.key.startsWith('cup:')) ok(CUP_STAGES.includes(row.from), `${row.key}: a cup that says yes names no first stage`);
  if (row.verdict === 'yes' && row.key === 'ucl') ok(UCL_STAGES.includes(row.from), 'ucl says yes and names no first stage');
  if (row.key.startsWith('league:')) ok(row.from === undefined, `${row.key}: a league has no stages`);
}
const yes = comps.rows.filter(r => r.verdict === 'yes').map(r => r.key);

/* 4. The receipts vouch for these ledgers, and what the generator writes is on disk. */
for (const { ledger, receipt } of LEDGERS) {
  const want = createHash('sha256').update(receiptTwist(text(ledger))).digest('hex');
  ok(JSON.parse(text(receipt)).sha256 === want, `${receipt} does not carry the hash of ${ledger}`);
}
for (const { file, body } of stampedReceipts()) ok(text(file) === body, `${file} is not what the generator writes`);

/* 5. No dash of the two banned kinds, in the ledgers, the receipts or this harness's own messages. */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
for (const file of LEDGERS.flatMap(l => [l.ledger, l.receipt])) ok(!DASHES.some(d => text(file).includes(d)), `${file} holds a banned dash`);

for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
const used = Object.keys(rates.quantities).filter(q => settle(rates, q).used);
console.log(`simCmVarLedger: ${rates.rows.length} rate rows from ${Object.keys(rates.publishers).length} publishers, used: ${used.join(', ')}.`);
console.log(`simCmVarLedger: ${engineKeys.length} competitions of the engine (${leagueKeys.length} leagues, ${cupKeys.length} cups, the Champions League), yes: ${yes.join(', ') || 'none'}.`);
if (CONTROL) {
  const hit = fails.find(f => EXPECT[CONTROL].test(f));
  if (hit) { console.log(`simCmVarLedger control ${CONTROL}: FIRED (${hit})`); process.exit(1); }
  console.log(`simCmVarLedger control ${CONTROL}: DID NOT FIRE, ${fails.length} other failure(s).`); process.exit(3);
}
if (fails.length) { console.log(`simCmVarLedger: ${fails.length} of ${checks} checks FAILED.`); process.exit(1); }
console.log(`simCmVarLedger: all ${checks} checks passed.`);
