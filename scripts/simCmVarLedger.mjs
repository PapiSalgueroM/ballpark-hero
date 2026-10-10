/* Round 1218. The two ledgers the Club Manager review rule is derived from, held as DATA.
 *
 *   scripts/data/cmVarRates.json          what a review changes in real football, per match
 *   scripts/data/cmVarCompetitions.json   which competitions use a video assistant referee in 2026-27
 *
 * It plays no match. What it holds:
 *   1. every rates row is a real reading: a known publisher, an https url that is not a wiki, the lines it was
 *      read from, and every figure printed in one of those lines;
 *   2. a quantity the engine models has a FIGURE (that quantity in one competition in one season) that two
 *      publishers on two hosts each counted, the generated rates are the stricter (lower) of those counts over
 *      the engine figure (recomputed here from the rows alone, so a generator that read the higher count fails),
 *      every figure belongs to a declared quantity, and what the lead asked for and the pages do not give (two
 *      seasons from 2022-23 on, each on two publishers) is written under owed: while an owed entry is open the
 *      switch CM_VAR_LIVE must be false;
 *   3. the competitions file names every competition the engine can play exactly once and none it cannot
 *      (the keys are read off REAL_LEAGUES and the rules table of the bundled engine), a yes or a no
 *      stands on two publishers on two hosts, and the competitions the help names are the ones kickOff covers;
 *   4. each receipt carries the hash of the ledger it vouches for, what the generator writes is on disk (a hand
 *      edit of the generated rates file fails here), and the engine figures the rates stand on were measured;
 *   5. no dash of the two banned kinds in any of the files.
 *
 * Controls, each of which changes the data in memory, proves it changed something, and must go red for its own
 * reason: CM_VAR_LEDGER_CONTROL=thin | wiki | figure | missing | extra | onesource | receipt | handedit |
 * highest (the rate read off the higher count) | names (the help names a league kickOff does not cover) |
 * owedlive (the switch on while the ledger still owes).
 * A control that fires ends "FIRED" and exits 1. One that changes nothing or is not caught exits 3.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { settle, derive, stampedReceipts, generatedSource, LEDGERS } from './genCmVarRates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.CM_VAR_LEDGER_CONTROL || '';
const EXPECT = {
  thin: /goalsRuledOut is modelled but THIN/, wiki: /is a wiki/, figure: /is not printed in its literals/,
  missing: /is not in the ledger/, extra: /the engine cannot play/, onesource: /stands on fewer than two publishers/,
  receipt: /does not carry the hash/, handedit: /is not what the generator writes \(a hand edit/,
  highest: /goalReview is not the stricter count/, names: /the help would name/, owedlive: /CM_VAR_LIVE is true while the rates ledger still owes/,
};
if (CONTROL && !Object.hasOwn(EXPECT, CONTROL)) { console.log(`simCmVarLedger: unknown control ${CONTROL}`); process.exit(2); }

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const WORDS = { zehn: 10, acht: 8 };
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\./i.test(new URL(url).host);
const hostOf = url => new URL(url).host.replace(/^www\./, '');
const n6 = x => Number(x.toFixed(6));
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
/* handedit: a rate typed into the generated file. In memory: the comparison below reads the file through this twist. */
let generatedTwist = s => s;
if (CONTROL === 'handedit') { generatedTwist = s => s.replace(/goalReview: [0-9.]+/, 'goalReview: 0.16'); changed = generatedTwist(text('src/data/clubManagerVarRates.ts')) !== text('src/data/clubManagerVarRates.ts'); }
/* highest and names: what the generator derived, twisted in memory the way a wrong generator would have it. */
let deriveTwist = d => d;
if (CONTROL === 'highest') { deriveTwist = d => ({ ...d, rates: { ...d.rates, goalReview: n6(d.goals.high / d.engine.reviewableGoalsPerMatch) } }); const d = derive(); changed = deriveTwist(d).rates.goalReview !== d.rates.goalReview; }
if (CONTROL === 'names') { deriveTwist = d => ({ ...d, names: [...d.names, 'EFL Championship'] }); changed = true; }
/* owedlive: the switch read as on, with something still owed. */
let switchTwist = s => s;
if (CONTROL === 'owedlive') {
  switchTwist = s => s.replace(/^export const CM_VAR_LIVE: boolean = (true|false);$/m, 'export const CM_VAR_LIVE: boolean = true;');
  if (!(rates.owed ?? []).some(o => o.state === 'open')) rates.owed = [...(rates.owed ?? []), { id: 'control', state: 'open', rule: 'An entry this control put here so that something is owed.' }];
  changed = /^export const CM_VAR_LIVE: boolean = true;$/m.test(switchTwist(text('src/lib/clubManagerVarLive.ts')));
}
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

/* 2. Behind everything the engine models: a figure two publishers each counted, and the stricter count of it. */
const rowOf = id => rates.rows.find(r => r.id === id);
for (const [name, q] of Object.entries(rates.quantities)) {
  const s = settle(rates, name);
  if (q.modelled) {
    ok(s.used, `${name} is modelled but THIN (${s.why ?? ''})`);
    for (const f of s.confirmed) {
      const rows = f.readings.map(r => rowOf(r.id));
      ok(new Set(rows.map(r => r.publisher)).size >= 2 && new Set(rows.map(r => hostOf(r.url))).size >= 2, `${name}, ${f.key}: used and not counted by two publishers on two hosts`);
      ok(new Set(rows.map(r => r.matches)).size === 1, `${name}, ${f.key}: its publishers do not agree on the matches of the season`);
    }
    if (s.used) ok(s.low > 0 && s.low <= s.high && s.target.perMatch === s.low, `${name}: the target is not the lowest reading`);
  } else ok(typeof q.why === 'string' && q.why.length > 20, `${name} is not modelled and does not say why`);
}
/* 2b. The stricter reading, recomputed HERE from the rows alone and not through the generator's settle(): the
   lowest count among the competition seasons that two publishers on two hosts counted. The generated rate is
   that, over the engine figure. A generator that read the higher count, or a figure one publisher counted, fails. */
const ownLow = quantity => {
  const groups = new Map();
  for (const row of rates.rows) if (typeof row.figures[quantity] === 'number') {
    const k = `${row.competition}|${row.season}`;
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  let low = Infinity;
  for (const rows of groups.values()) {
    if (new Set(rows.map(r => r.publisher)).size < 2 || new Set(rows.map(r => hostOf(r.url))).size < 2) continue;
    for (const r of rows) low = Math.min(low, r.figures[quantity] / r.matches);
  }
  return low;
};
const derived = deriveTwist(derive());
const engineNow = JSON.parse(text('scripts/data/cmVarEngine.json'));
ok(derived.rates.goalReview === n6(ownLow('goalsRuledOut') / engineNow.reviewableGoalsPerMatch),
  `goalReview is not the stricter count of a figure two publishers counted, over the engine figure (${derived.rates.goalReview} against ${n6(ownLow('goalsRuledOut') / engineNow.reviewableGoalsPerMatch)})`);
ok(derived.rates.missedFoulReview === n6(ownLow('penaltiesAwarded') / engineNow.awardsPerMatchPerUnitRate),
  `missedFoulReview is not the stricter count of a figure two publishers counted, over the engine figure (${derived.rates.missedFoulReview} against ${n6(ownLow('penaltiesAwarded') / engineNow.awardsPerMatchPerUnitRate)})`);
/* 2c. What the lead asked for and the pages do not give is written down, counted right, and holds the switch. */
const owed = rates.owed ?? [];
for (const o of owed) {
  ok(typeof o.id === 'string' && ['open', 'accepted'].includes(o.state) && typeof o.rule === 'string' && o.rule.length > 20, `owed ${o.id}: no id, state or rule`);
  if (o.state === 'accepted') ok(typeof o.ruling === 'string' && o.ruling.length > 20, `owed ${o.id} is accepted and carries no ruling (who, when, in what words)`);
}
const modelled = Object.entries(rates.quantities).filter(([, q]) => q.modelled).map(([name]) => name);
const recentOf = name => new Set(settle(rates, name).confirmed.filter(f => f.season >= RECENT).map(f => f.season)).size;
const haveRecent = Math.min(...modelled.map(recentOf));
const recentOwed = owed.find(o => o.id === 'recent-seasons');
ok(haveRecent >= 2 || !!recentOwed, `the modelled quantities stand on ${haveRecent} season(s) from ${RECENT} on that two publishers counted, the lead asked for 2, and the ledger does not say it is owed`);
if (recentOwed) {
  ok(recentOwed.have === haveRecent && recentOwed.need === 2 && recentOwed.from === RECENT, 'owed recent-seasons does not count what the rows hold');
  ok(haveRecent < 2, 'owed recent-seasons is stale: the rows now hold two recent seasons on two publishers each, so take the entry out');
}
const openOwed = owed.filter(o => o.state === 'open');
const switchLine = /^export const CM_VAR_LIVE: boolean = (true|false);$/m.exec(switchTwist(text('src/lib/clubManagerVarLive.ts')));
ok(!!switchLine, 'the switch line of src/lib/clubManagerVarLive.ts was not found');
ok(!(switchLine?.[1] === 'true' && openOwed.length > 0), `CM_VAR_LIVE is true while the rates ledger still owes: ${openOwed.map(o => o.id).join(', ')}`);

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
/* The help prints the names and kickOff reads the coverage: both must be exactly the rows that say yes. */
const yesNames = comps.rows.filter(r => r.verdict === 'yes').map(r => r.name);
ok(JSON.stringify(derived.names) === JSON.stringify(yesNames) && JSON.stringify(Object.keys(derived.coverage)) === JSON.stringify(yes),
  `the help would name ${derived.names.join(', ')} and kickOff covers ${Object.keys(derived.coverage).join(', ')}: not both the rows that say yes (${yes.join(', ')})`);

/* 4. The receipts vouch for these ledgers, and what the generator writes is on disk. */
for (const { ledger, receipt } of LEDGERS) {
  const want = createHash('sha256').update(receiptTwist(text(ledger))).digest('hex');
  ok(JSON.parse(text(receipt)).sha256 === want, `${receipt} does not carry the hash of ${ledger}`);
}
for (const { file, body } of stampedReceipts()) ok(text(file) === body, `${file} is not what the generator writes`);
ok(generatedTwist(text('src/data/clubManagerVarRates.ts')) === generatedSource(), 'src/data/clubManagerVarRates.ts is not what the generator writes (a hand edit, or a ledger changed without the generator)');
const engineFigures = JSON.parse(text('scripts/data/cmVarEngine.json'));
ok(engineFigures.provisional === false && /^[0-9a-f]{7,40}$/.test(engineFigures.head ?? '') && (engineFigures.runner ?? '').length > 3 && engineFigures.leagueMatches >= 3000,
  'scripts/data/cmVarEngine.json is provisional, or does not say where it was measured, or stands on fewer than 3,000 league matches');

/* 5. No dash of the two banned kinds, in the ledgers, the receipts or this harness's own messages. */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
for (const file of LEDGERS.flatMap(l => [l.ledger, l.receipt])) ok(!DASHES.some(d => text(file).includes(d)), `${file} holds a banned dash`);

for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
const used = Object.keys(rates.quantities).filter(q => settle(rates, q).used);
console.log(`simCmVarLedger: ${rates.rows.length} rate rows from ${Object.keys(rates.publishers).length} publishers, counted by two: ${used.join(', ')}.`);
if (openOwed.length) console.log(`simCmVarLedger: OWED and open, so the switch must stay off: ${openOwed.map(o => `${o.id} (have ${o.have ?? '?'} of ${o.need ?? '?'})`).join(', ')}.`);
console.log(`simCmVarLedger: ${engineKeys.length} competitions of the engine (${leagueKeys.length} leagues, ${cupKeys.length} cups, the Champions League), yes: ${yes.join(', ') || 'none'}.`);
if (CONTROL) {
  const hit = fails.find(f => EXPECT[CONTROL].test(f));
  if (hit) { console.log(`simCmVarLedger control ${CONTROL}: FIRED (${hit})`); process.exit(1); }
  console.log(`simCmVarLedger control ${CONTROL}: DID NOT FIRE, ${fails.length} other failure(s).`); process.exit(3);
}
if (fails.length) { console.log(`simCmVarLedger: ${fails.length} of ${checks} checks FAILED.`); process.exit(1); }
console.log(`simCmVarLedger: all ${checks} checks passed.`);
