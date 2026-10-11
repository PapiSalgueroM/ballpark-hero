/* Round 1218. The two ledgers the Club Manager review rule is derived from, held as DATA.
 *
 *   scripts/data/cmVarRates.json          what a review changes in real football, per match
 *   scripts/data/cmVarCompetitions.json   which competitions use a video assistant referee in 2026-27
 *
 * It plays no match. What it holds:
 *   1. every rates row is a real reading: a known publisher, an https url that is not a wiki, the lines it was
 *      read from, and every figure printed in one of those lines;
 *   2. a rate the engine models meets THE STANDARD FOR A SIMULATION RATE (Round 1303, the lead's decision 1): two
 *      independent publishers on two hosts each hold a reading of it (one full season of a top division under
 *      review, in any league), EVERY reading on file agrees within a factor of two, and the generated rate is the
 *      LOWEST reading over the engine figure (recomputed here from the rows alone, so a generator that read a
 *      higher count, or left a reading out to make the rest agree, fails). One publisher is THIN and refused,
 *      however many seasons it counted. The rates receipt says in plain words that the publishers count different
 *      leagues or seasons. The season total of penalties is a band, not a rate, and keeps Round 1218's rule (one
 *      competition in one season that two publishers each counted). Every figure belongs to a declared quantity,
 *      and what the pages or the engine do not give yet is written under owed: while an owed entry is open the
 *      switch CM_VAR_LIVE must be false, or, when the entry names the kinds of review it holds, those kinds must
 *      be off;
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
 * owedlive (the switch on while the ledger still owes) | stage (Round 1302: a cup with reviews in its final only
 * named as if every round had them) | unread (Round 1302: a competition put back on the not read list) |
 * disagree (Round 1303: one more reading of goals ruled out, more than twice the lowest on file) | receiptsilent
 * (Round 1303: the receipt no longer says its publishers count different leagues and seasons). thin, since Round
 * 1303, leaves goals ruled out with three seasons of ONE outlet: seasons do not make a second publisher.
 * Round 1303, the kinds (section 2d and 6): kindon (a kind an open owed entry holds, switched on in the ledger) |
 * kindline (the generated file hands kickOff a kind the ledger does not play) | gametrue (the hook asks the engine
 * with varReviews: true, which stages every kind, and not with the ledger's list). owedlive, since Round 1303, is
 * the switch on while no kind of review is played.
 * Round 1303 fix (sections 6b and 7): helprate (the How to Play block states a count of a real league in a real
 * season; the help may hold no number but the game's own). kindon needs an open entry that holds a kind which is
 * off: since the goal kind is on, that is penalties-total and the penalty kind.
 * Round 1302 also holds that every competition is a row: nothing in notRead, and an unknown row says what was
 * looked for.
 * A control that fires ends "FIRED" and exits 1. One that changes nothing or is not caught exits 3.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { settle, settleRate, AGREE, derive, stampedReceipts, generatedSource, LEDGERS } from './genCmVarRates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.CM_VAR_LEDGER_CONTROL || '';
const EXPECT = {
  thin: /goalsRuledOut is modelled but THIN/, disagree: /goalsRuledOut is modelled and its readings do not agree within a factor of two/,
  receiptsilent: /does not say that the publishers of goalsRuledOut count different leagues or seasons/, wiki: /is a wiki/, figure: /is not printed in its literals/,
  missing: /is not in the ledger/, extra: /the engine cannot play/, onesource: /stands on fewer than two publishers/,
  receipt: /does not carry the hash/, handedit: /is not what the generator writes \(a hand edit/,
  highest: /goalReview is not the stricter count/, names: /the help would name/, owedlive: /CM_VAR_LIVE is true while the rates ledger still owes/,
  kindon: /kind is on in the ledger while an open owed entry holds it/, kindline: /CM_VAR_KINDS on disk plays/, gametrue: /hands the engine varReviews: true/,
  helprate: /the help states a number that is not the game's own in its VAR block \(23, 306, 2023\/24\)/,
  /* stage asks for the Australia Cup named bare (a comma or the end of the list straight after it) INSIDE the list
     of names: no name holds a colon and every key after "kickOff covers" does, so the match cannot run on into
     the keys, where cup:Australia Cup always stands bare. It used to ask for the cup as the LAST name, which
     stopped being true the day a later row said yes (the DFB-Pokal), and the control then ended "DID NOT FIRE"
     on the very failure it exists to cause. */
  stage: /the help would name [^:]*Australia Cup(?:,| and kickOff)/, unread: /notRead still lists FA Cup/,
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
/* thin: goals ruled out left with one publisher's readings (three seasons of one outlet): still THIN, however many seasons. */
if (CONTROL === 'thin') { const n = rates.rows.length; rates.rows = rates.rows.filter(r => typeof r.figures.goalsRuledOut !== 'number' || r.publisher === 'espn'); changed = rates.rows.length < n && rates.rows.some(r => typeof r.figures.goalsRuledOut === 'number'); }
/* disagree (Round 1303): one more reading of goals ruled out, more than twice the lowest on file. The standard refuses
   the quantity: it does not drop the reading that does not fit. */
if (CONTROL === 'disagree') { const row = rates.rows.find(r => r.id === 'espn-pl-2022-23'); if (row) { rates.rows.push({ ...row, id: 'control-high', figures: { goalsRuledOut: 58 }, literal: ['Leading to disallowed goals: 58'] }); changed = true; } }
/* receiptsilent (Round 1303): the rates receipt no longer says its publishers count different leagues and seasons. */
let standardTwist = s => s;
if (CONTROL === 'receiptsilent') { standardTwist = s => s.replaceAll(', who count DIFFERENT leagues and seasons', ''); changed = standardTwist(text('scripts/data/cmVarRates.receipt.json')) !== text('scripts/data/cmVarRates.receipt.json'); }
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
/* stage: the help names a cup that has reviews in its final only as if every round had them. */
if (CONTROL === 'stage') { deriveTwist = d => ({ ...d, names: d.names.map(n => n.replace(' (the final only)', '')) }); const d = derive(); changed = JSON.stringify(deriveTwist(d).names) !== JSON.stringify(d.names); }
/* unread: a competition taken out of the rows and put back on the not read list. */
if (CONTROL === 'unread') { const n = comps.rows.length; comps.rows = comps.rows.filter(r => r.key !== 'cup:FA Cup'); comps.notRead.cups = [...comps.notRead.cups, 'FA Cup']; changed = comps.rows.length < n; }
/* kindon (Round 1303): a kind an open owed entry holds, switched on in the ledger. */
if (CONTROL === 'kindon') { const held = (rates.owed ?? []).find(o => o.state === 'open' && Array.isArray(o.holds) && rates.kinds?.[o.holds[0]]?.on === false); if (held) { rates.kinds[held.holds[0]].on = true; changed = true; } }
/* kindline (Round 1303): the generated file hands kickOff a kind the ledger does not play. */
if (CONTROL === 'kindline') { const before = generatedTwist; generatedTwist = s => before(s).replace(/^(export const CM_VAR_KINDS: readonly \('goal' \| 'penalty'\)\[\] = )\[[^\]]*\];$/m, "$1['goal', 'penalty'];"); changed = generatedTwist(text('src/data/clubManagerVarRates.ts')) !== text('src/data/clubManagerVarRates.ts'); }
/* gametrue (Round 1303): the hook's first kickoff asks the engine the way a harness stages every kind. */
let hookTwist = s => s;
if (CONTROL === 'gametrue') { hookTwist = s => s.replace('...cmVarGameAsk(CM_VAR_LIVE)', '...(CM_VAR_LIVE ? { varReviews: true } : {})'); changed = hookTwist(text('src/hooks/useClubManager.ts')) !== text('src/hooks/useClubManager.ts'); }
/* helprate (Round 1303 fix): the How to Play block states a count of a real league in a real season. */
let helpTwist = s => s;
if (CONTROL === 'helprate') {
  helpTwist = s => s.replace('You only see a review that changed the call, and it is rare.', 'You only see a review that changed the call, and it is rare: 23 in 306 matches of the French top division in 2023/24.');
  changed = helpTwist(text('src/components/club-manager/ClubManagerHelp.tsx')) !== text('src/components/club-manager/ClubManagerHelp.tsx');
}
/* owedlive: the switch read as on, with something still owed. */
let switchTwist = s => s;
if (CONTROL === 'owedlive') {
  switchTwist = s => s.replace(/^export const CM_VAR_LIVE: boolean = (true|false);$/m, 'export const CM_VAR_LIVE: boolean = true;');
  /* Round 1303: an open entry that names no kind holds every kind, so no kind is played whatever else the ledger says. */
  rates.owed = [...(rates.owed ?? []), { id: 'control', state: 'open', rule: 'An entry this control put here so that something is owed.' }];
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

/* 2. Behind every rate the engine models: THE STANDARD FOR A SIMULATION RATE (Round 1303, the lead's decision 1),
   recomputed HERE from the rows alone and not through the generator's settleRate(). A reading is one publisher's
   count of one full season (section 1 holds each row to a 20 or an 18 club season). The quantity is used when two
   publishers on two hosts each hold a reading and the highest reading is at most twice the lowest, over EVERY
   reading on file. The target is the lowest reading. */
const ownRate = quantity => {
  const rows = rates.rows.filter(r => typeof r.figures[quantity] === 'number');
  const per = rows.map(r => r.figures[quantity] / r.matches);
  const low = Math.min(...per), high = Math.max(...per);
  return { rows, publishers: new Set(rows.map(r => r.publisher)).size, hosts: new Set(rows.map(r => hostOf(r.url))).size, low, high,
    agrees: per.length > 0 && low > 0 && high <= AGREE * low, different: new Set(rows.map(r => `${r.competition}|${r.season}`)).size > 1 };
};
ok(AGREE === 2, `the standard lets the readings of a rate lie a factor of two apart, and the generator allows ${AGREE}`);
for (const [name, q] of Object.entries(rates.quantities)) {
  if (q.modelled) {
    const own = ownRate(name), s = settleRate(rates, name);
    const two = own.publishers >= 2 && own.hosts >= 2;
    ok(two, `${name} is modelled but THIN (${own.publishers} publisher(s) on ${own.hosts} host(s) counted it, a rate needs two)`);
    ok(!two || own.agrees, `${name} is modelled and its readings do not agree within a factor of two (${n6(own.low)} to ${n6(own.high)} a match)`);
    ok(s.used === (two && own.agrees), `${name}: the generator reads the standard another way than this harness (${s.used ? 'used' : `refused: ${s.why}`})`);
    if (s.used) ok(s.low === own.low && s.high === own.high && s.target.perMatch === own.low && s.readings.length === own.rows.length, `${name}: the target is not the lowest of every reading on file`);
  } else ok(typeof q.why === 'string' && q.why.length > 20, `${name} is not modelled and does not say why`);
}
/* 2b. The generated rate is the LOWEST reading over the engine figure. A generator that read a higher one fails. */
const ownLow = quantity => ownRate(quantity).low;
const derived = deriveTwist(derive());
const engineNow = JSON.parse(text('scripts/data/cmVarEngine.json'));
/* Round 1303 fix: the goals a review rules out are drawn ON TOP (cmVarGoalLift), so the rate is the chance for each
   goal the engine DRAWS. Worked out here from the lowest reading and the measured engine figure, not through the
   generator: perCounted (ruled out for each goal that counts and could have been looked at) over 1 + perCounted.
   And the rate must do what it is for: with goals drawn 1 / (1 - rate) times as often (which leaves the goals that
   count where they were), the goals ruled out a match are the lowest reading's to a ten thousandth. */
const ownPerCounted = ownLow('goalsRuledOut') / engineNow.reviewableGoalsPerMatch;
const ownGoalReview = n6(ownPerCounted / (1 + ownPerCounted));
ok(derived.rates.goalReview === ownGoalReview,
  `goalReview is not the stricter count, the lowest reading on file over the engine figure (${derived.rates.goalReview} against ${ownGoalReview})`);
const ownLift = 1 / (1 - derived.rates.goalReview * derived.rates.overturn);
ok(Math.abs(ownLift * engineNow.reviewableGoalsPerMatch * derived.rates.goalReview * derived.rates.overturn - ownLow('goalsRuledOut')) < 1e-4,
  `the goal rate does not give the lowest reading's goals ruled out a match on top of a level goal count (${n6(ownLift * engineNow.reviewableGoalsPerMatch * derived.rates.goalReview * derived.rates.overturn)} against ${n6(ownLow('goalsRuledOut'))})`);
ok(derived.rates.missedFoulReview === n6(ownLow('penaltiesAwarded') / engineNow.awardsPerMatchPerUnitRate),
  `missedFoulReview is not the stricter count, the lowest reading on file over the engine figure (${derived.rates.missedFoulReview} against ${n6(ownLow('penaltiesAwarded') / engineNow.awardsPerMatchPerUnitRate)})`);
/* 2b2. Round 1302, decision 4: the season total of penalties, the band a match with reviews on is held against
   (scripts/simCmVar.mjs plays it), stands on a figure two publishers counted like everything else that is read. */
ok(settle(rates, 'penaltiesTotal').used, 'penaltiesTotal, the band of all penalties a match, is not counted by two publishers for one season');
ok(JSON.stringify(derived.holds) === JSON.stringify((rates.owed ?? []).filter(o => o.state === 'open').map(o => o.id)), 'the generated list of what the ledger still owes is not its open owed entries');
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
/* 2d. Round 1303, the lead's decision 2: the KIND of review is data. Recomputed here from the ledger alone and not
   through the generator's kindsOf(). A kind is PLAYED when its line under kinds says on, its rate meets the standard
   and no open owed entry holds it (an entry holds the kinds it names under holds, every kind when it names none).
   On and held at once is refused, so turning a kind on is closing what holds it first. The switch is on only with
   a kind to play. */
const KINDS = ['goal', 'penalty'], KIND_QUANTITY = { goal: 'goalsRuledOut', penalty: 'penaltiesAwarded' };
ok(!!rates.kinds && JSON.stringify(Object.keys(rates.kinds).filter(k => k !== 'what').sort()) === JSON.stringify([...KINDS].sort()), 'the kinds block of the rates ledger does not name exactly the kinds the engine plays (goal, penalty)');
for (const o of owed) ok(o.holds === undefined || (Array.isArray(o.holds) && o.holds.length > 0 && o.holds.every(k => KINDS.includes(k))), `owed ${o.id}: holds names a kind the engine does not play`);
const heldBy = kind => openOwed.filter(o => !Array.isArray(o.holds) || o.holds.includes(kind)).map(o => o.id);
const ownPlayed = [];
for (const kind of KINDS) {
  const line = rates.kinds?.[kind] ?? {};
  ok(typeof line.on === 'boolean' && line.quantity === KIND_QUANTITY[kind] && typeof line.why === 'string' && line.why.length > 20, `kinds.${kind}: no on, another quantity than the engine reviews, or no why`);
  const own = ownRate(KIND_QUANTITY[kind]), meets = own.publishers >= 2 && own.hosts >= 2 && own.agrees;
  ok(!(line.on === true && heldBy(kind).length > 0), `the ${kind} kind is on in the ledger while an open owed entry holds it (${heldBy(kind).join(', ')})`);
  ok(!(line.on === true && !meets), `the ${kind} kind is on in the ledger and its rate does not meet the standard`);
  if (line.on === true && meets && heldBy(kind).length === 0) ownPlayed.push(kind);
}
ok(JSON.stringify(derived.played) === JSON.stringify(ownPlayed), `the kinds the generator plays (${(derived.played ?? []).join(', ') || 'none'}) are not the kinds the ledger has on and nothing holds (${ownPlayed.join(', ') || 'none'})`);
/* The line on disk, read as text: what kickOff is handed by the game. */
const kindsLine = /^export const CM_VAR_KINDS: readonly \('goal' \| 'penalty'\)\[\] = \[([^\]]*)\];$/m.exec(generatedTwist(text('src/data/clubManagerVarRates.ts')));
ok(!!kindsLine, 'the generated rates file has no CM_VAR_KINDS line');
const kindsOnDisk = kindsLine ? [...kindsLine[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]) : [];
ok(JSON.stringify(kindsOnDisk) === JSON.stringify(ownPlayed), `CM_VAR_KINDS on disk plays ${kindsOnDisk.join(', ') || 'no kind'} and the ledger plays ${ownPlayed.join(', ') || 'no kind'}`);
ok(!(switchLine?.[1] === 'true' && ownPlayed.length === 0), `CM_VAR_LIVE is true while the rates ledger still owes: no kind of review is played (${KINDS.map(k => `${k}: ${heldBy(k).length ? `held by ${heldBy(k).join(', ')}` : rates.kinds?.[k]?.on === true ? 'on' : 'off in the ledger'}`).join('; ')})`);

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
/* Round 1302: a cup whose reviews start after the round of 16 is printed with its stage (worked out here, not
   through the generator's helpName, so a generator that drops the stage fails). */
const STAGE_WORDS = { QF: 'from the quarter finals', SF: 'from the semi finals', F: 'the final only' };
const yesNames = comps.rows.filter(r => r.verdict === 'yes').map(r => (r.key.startsWith('cup:') && STAGE_WORDS[r.from] ? `${r.name} (${STAGE_WORDS[r.from]})` : r.name));
/* Round 1302: every competition is READ. Nothing may sit in notRead, and an unknown row says what was looked for. */
ok(comps.notRead.leagues.length === 0 && comps.notRead.cups.length === 0, `notRead still lists ${[...comps.notRead.leagues, ...comps.notRead.cups].join(', ')}: every competition has to be read and filed as a row`);
for (const row of comps.rows) if (row.verdict === 'unknown') ok(typeof row.note === 'string' && row.note.length > 60, `${row.key} is unknown and does not say what was looked for`);
ok(JSON.stringify(derived.names) === JSON.stringify(yesNames) && JSON.stringify(Object.keys(derived.coverage)) === JSON.stringify(yes),
  `the help would name ${derived.names.join(', ')} and kickOff covers ${Object.keys(derived.coverage).join(', ')}: not both the rows that say yes (${yes.join(', ')})`);

/* 4. The receipts vouch for these ledgers, and what the generator writes is on disk. */
for (const { ledger, receipt } of LEDGERS) {
  const want = createHash('sha256').update(receiptTwist(text(ledger))).digest('hex');
  ok(JSON.parse(text(receipt)).sha256 === want, `${receipt} does not carry the hash of ${ledger}`);
}
for (const { file, body } of stampedReceipts()) ok(text(file) === body, `${file} is not what the generator writes`);
/* Round 1303, the lead's decision 1: the receipt states plainly that the publishers count different leagues or
   seasons. Whether they do is worked out here from the rows; the sentence is read off the receipt on disk. */
const ratesReceipt = JSON.parse(standardTwist(text('scripts/data/cmVarRates.receipt.json')));
ok(typeof ratesReceipt.standard?.rule === 'string' && /two independent publishers/.test(ratesReceipt.standard.rule) && /factor of 2/.test(ratesReceipt.standard.rule) && /lowest/.test(ratesReceipt.standard.rule), 'the rates receipt does not state the standard a rate stands on');
for (const [name, q] of Object.entries(rates.quantities)) if (q.modelled && ownRate(name).different) ok(/who count DIFFERENT leagues and seasons/.test(ratesReceipt.standard?.[name] ?? ''), `the rates receipt does not say that the publishers of ${name} count different leagues or seasons`);
ok(generatedTwist(text('src/data/clubManagerVarRates.ts')) === generatedSource(), 'src/data/clubManagerVarRates.ts is not what the generator writes (a hand edit, or a ledger changed without the generator)');
const engineFigures = JSON.parse(text('scripts/data/cmVarEngine.json'));
ok(engineFigures.provisional === false && /^[0-9a-f]{7,40}$/.test(engineFigures.head ?? '') && (engineFigures.runner ?? '').length > 3 && engineFigures.leagueMatches >= 3000,
  'scripts/data/cmVarEngine.json is provisional, or does not say where it was measured, or stands on fewer than 3,000 league matches');
ok(engineFigures.reviewableGoalsPerMatch > 0 && (engineFigures.goalsPerMatch === undefined || engineFigures.reviewableGoalsPerMatch <= engineFigures.goalsPerMatch),
  'scripts/data/cmVarEngine.json: the goals a review can look at are missing, or more than every goal the engine draws a match');

/* 6. Round 1303: the GAME never stages every kind. varReviews: true is how a harness asks the engine for every
   kind it can play; the game asks with the ledger's list, through cmVarGameAsk, at both places the hook kicks a
   match off. Read off the CODE: comments are taken out first, and src/test is not the game. */
const codeOf = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const sourcesUnder = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? sourcesUnder(dir + '/' + e.name) : /\.(ts|tsx)$/.test(e.name) ? [dir + '/' + e.name] : []);
const gameFiles = ['src/hooks', 'src/lib', 'src/components', 'src/pages'].flatMap(sourcesUnder);
ok(gameFiles.length > 200 && gameFiles.includes('src/hooks/useClubManager.ts') && gameFiles.includes('src/lib/clubManager.ts'), 'the walk over the game source found too few files to say anything');
const STAGES_ALL = /varReviews\s*:\s*true(?!\s+as\s+const)/;
for (const file of gameFiles) {
  let source; try { source = text(file); } catch { continue; }
  if (file === 'src/hooks/useClubManager.ts') source = hookTwist(source);
  if (!source.includes('varReviews')) continue;
  ok(!STAGES_ALL.test(codeOf(source)), file + ' hands the engine varReviews: true, which stages every kind of review: the game asks with cmVarGameAsk');
}
const hookCode = codeOf(hookTwist(text('src/hooks/useClubManager.ts')));
ok(hookCode.split('cmVarGameAsk(CM_VAR_LIVE)').length - 1 === 2 && hookCode.split('varReviews').length - 1 === 0, 'the hook does not ask for reviews through cmVarGameAsk(CM_VAR_LIVE) at exactly its two kickoffs');
ok(/varReviews: true as const, \.\.\.\(varReviews === true \? \{\} : \{ varKinds \}\)/.test(codeOf(text('src/lib/clubManager.ts'))), 'kickOff does not save the list of kinds it was asked for with the match');

/* 6b. Round 1303 fix: ONE list of kinds. It is written in four files (the generator, the engine's own module, the
   staging tool and this harness); each is read off its file here and must be this harness's list, in its order. */
const listIn = (file, pattern) => { const m = pattern.exec(codeOf(text(file))); return m ? [...m[1].matchAll(/'([a-z]+)'/g)].map(x => x[1]) : null; };
for (const [file, pattern] of [
  ['scripts/genCmVarRates.mjs', /export const KIND_NAMES = \[([^\]]*)\];/],
  ['src/lib/clubManagerVar.ts', /export const CM_VAR_ALL_KINDS: readonly CmVarKind\[\] = \[([^\]]*)\];/],
  ['scripts/qa/cmVarLit.mjs', /const ALL_KINDS = \[([^\]]*)\];/],
]) ok(JSON.stringify(listIn(file, pattern)) === JSON.stringify(KINDS), `${file} does not list the kinds of review as this harness does (${KINDS.join(', ')}): ${JSON.stringify(listIn(file, pattern))}`);

/* 7. Round 1303 fix (the lead's decision 1): THE HELP NEVER STATES A REAL LEAGUE'S RATE. A rate of a real league
   needs a number, so every number in the WORDS of the two helps that talk about reviews must be one the game's own
   text needs: the season reviews start in (2026/27, July 2026), the four era starts, the round of 16 and a 0-0
   scoreline in the How to Play block; a 0-0 scoreline in the match's own help. Anything else with a digit fails by
   default: a season such as 2017-18 or 2023/24, a count such as 23 in 306, a per match figure such as 0.075. A
   list of known offenders finds only the last offender. Read off the CODE (comments out), with the two shapes
   that are code and not words taken out first: a class list, and the game's own figure worked out from data. */
const helpWords = source => codeOf(source).replace(/className=(?:"[^"]*"|\{[^}]*\})/g, '').replace(/Math\.round\(1 \/ CM_VAR_REAL\.[A-Za-z.]+\)/g, '');
const numbersIn = words => words.match(/[0-9]+(?:[.,/+-][0-9]+)*/g) ?? [];
const helpSource = helpTwist(text('src/components/club-manager/ClubManagerHelp.tsx'));
const varBlock = /data-cm-help="var"[\s\S]*?<\/div>\}/.exec(helpSource);
ok(!!varBlock && varBlock[0].includes('How often.') && varBlock[0].includes('CM_VAR_COVERED_NAMES'), 'the VAR block of src/components/club-manager/ClubManagerHelp.tsx was not found whole');
const HELP_NUMBERS = ['2026/27', '2026', '2005', '2010', '2015', '2020', '16', '0-0'];
const strayHelp = numbersIn(helpWords(varBlock?.[0] ?? '')).filter(n => !HELP_NUMBERS.includes(n));
ok(strayHelp.length === 0, `the help states a number that is not the game's own in its VAR block (${strayHelp.join(', ')}): the Help never states a real league's rate, a count or a season of one`);
const matchHelp = /function LiveMatchHelp\([\s\S]*?\n\}\n/.exec(text('src/components/club-manager/LiveSimScreen.tsx'));
const matchVarLines = (matchHelp?.[0] ?? '').split('\n').filter(line => line.includes('VAR') || line.includes('review'));
ok(!!matchHelp && matchVarLines.length >= 3, 'the lines about reviews of the match help (LiveMatchHelp in LiveSimScreen.tsx) were not found');
const strayMatch = numbersIn(helpWords(matchVarLines.join('\n'))).filter(n => n !== '0-0');
ok(strayMatch.length === 0, `the help states a number that is not the game's own in the match help (${strayMatch.join(', ')})`);

/* 5. No dash of the two banned kinds, in the ledgers, the receipts or this harness's own messages. */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
for (const file of LEDGERS.flatMap(l => [l.ledger, l.receipt])) ok(!DASHES.some(d => text(file).includes(d)), `${file} holds a banned dash`);

for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
const used = Object.entries(rates.quantities).filter(([name, q]) => (q.modelled ? settleRate(rates, name) : settle(rates, name)).used).map(([name]) => name);
console.log(`simCmVarLedger: ${rates.rows.length} rate rows from ${Object.keys(rates.publishers).length} publishers. Rates that meet the standard (two publishers within a factor of ${AGREE}): ${used.filter(n => rates.quantities[n].modelled).join(', ') || 'none'}. Figures two publishers counted: ${used.filter(n => !rates.quantities[n].modelled).join(', ') || 'none'}.`);
if (openOwed.length) console.log(`simCmVarLedger: OWED and open: ${openOwed.map(o => `${o.id} holds ${Array.isArray(o.holds) ? o.holds.join(' and ') : 'every kind'}`).join(', ')}. Kinds of review the game plays: ${ownPlayed.join(', ') || 'none, so the switch must stay off'}.`);
console.log(`simCmVarLedger: ${engineKeys.length} competitions of the engine (${leagueKeys.length} leagues, ${cupKeys.length} cups, the Champions League), yes: ${yes.join(', ') || 'none'}.`);
if (CONTROL) {
  const hit = fails.find(f => EXPECT[CONTROL].test(f));
  if (hit) { console.log(`simCmVarLedger control ${CONTROL}: FIRED (${hit})`); process.exit(1); }
  console.log(`simCmVarLedger control ${CONTROL}: DID NOT FIRE, ${fails.length} other failure(s).`); process.exit(3);
}
if (fails.length) { console.log(`simCmVarLedger: ${fails.length} of ${checks} checks FAILED.`); process.exit(1); }
console.log(`simCmVarLedger: all ${checks} checks passed.`);
