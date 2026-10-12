/* Release AZ, the lead's ruling Y2, first step: does the game ever write a world ledger its own reader refuses?
 *
 * WHY. Round 1250 (PR224) keeps a ledger of the men a seeded career bought, sold, released or saw retire, and its
 * reader (readWorldRoster, src/lib/clubManagerWorldRoster.ts) answers null for the WHOLE ledger when any one
 * record fails any check: a record year above the career's year, an origin `since` above the years played, the
 * name and birth year of the player against the origin, a payload on loan, another era. A null ledger means the
 * feature is off for that save, and nothing on screen says so. Nobody had measured whether natural play reaches
 * one. This harness plays seeded careers through every kind of move and asks, after every step and after every
 * save and reload: when the save holds a ledger, does the reader read it?
 *
 * THE JOURNEY, on every era, three clubs an era, three seeds a club, each step followed by a save and a reload:
 * a buy, the bought man retrained to a second position, a sale through acceptBid, a second buy then released, a
 * loan with its option exercised, ten entries played, a job move in the middle of the season (applyForJob, the
 * application played out, joinClubNow), the season played out and finished, a summer move back to the first club
 * (startNextSeason with an offer, so the year away ends where it began, the rollover's exits and retirements
 * included), a buy at the old club, ten entries, then a second season played out and rolled over in place.
 * Printed: how many ledgers were read, the records by status (owned, released, retired), and the largest ledger.
 *
 * CONTROL, must go red (exit 1, last line says FIRED):
 *   CM_LEDGER_CONTROL=futureyear   the recorder writes each new record a year ahead, which its reader refuses
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmLedgerJourney.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_LEDGER_CONTROL || '';
const cannot = why => { console.log(`simCmLedgerJourney: cannot run: ${why}`); process.exit(2); };
if (CONTROL && CONTROL !== 'futureyear') cannot(`unknown control ${CONTROL}`);
const LEDGER = 'src/lib/clubManagerWorldRoster.ts';
const RECORD = '  const record: WorldRosterRecord = { key, origin: plainCopy(origin), owner, status, year,\n';
const lf = s => s.split('\r\n').join('\n');

let edited = false;
const plugin = {
  name: 'ledger-journey-source',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = lf(fs.readFileSync(args.path, 'utf8'));
      if (CONTROL === 'futureyear' && rel === LEDGER) {
        const n = text.split(RECORD).length - 1;
        if (n !== 1) cannot(`control futureyear: the record line is in ${LEDGER} ${n} times, it must be exactly once`);
        text = text.replace(RECORD, RECORD.replace('status, year,', 'status, year: year + 1,'));
        edited = true;
      }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  },
};
const entry = "export * as cm from './src/lib/clubManager';\nexport * as cal from './src/lib/clubManagerCalendar';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'ledger-journey.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
if (CONTROL && !edited) cannot('the control was to edit the ledger module and it was never loaded');
const script = new vm.Script(out.outputFiles[0].text, { filename: 'ledger-journey.cjs' });
async function fresh() {
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
    console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
    setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx);
  await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}
function tape(seed, action, forced) {
  let state = seed >>> 0; const original = Math.random;
  Math.random = () => {
    if (forced !== undefined) return forced;
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
  try { return action(); } finally { Math.random = original; }
}

const STOP = new Error('stop');
async function journey(era, club, seed, acc) {
  const M = await fresh();
  const where = `${club} (${era}, seed ${seed})`;
  let s = null; let k = 0;
  const check = label => {
    if (s.worldRoster === undefined) return true;
    acc.held += 1;
    const read = M.ledger.readWorldRoster(s);
    if (!read) { acc.fails.push(`${where} after ${label}: the save holds a ledger its reader refuses`); return false; }
    acc.read += 1; acc.largest = Math.max(acc.largest, read.records.length);
    return true;
  };
  const step = (label, fn, forced) => {
    k += 1;
    const next = tape((seed + k * 7919) >>> 0, () => fn(s), forced);
    if (next) s = next;
    if (!check(label)) throw STOP;
    M.store.clear();
    if (!M.cm.saveCareer(s)) { acc.fails.push(`${where} after ${label}: the save was refused`); throw STOP; }
    const loaded = M.cm.loadCareer();
    if (!loaded) { acc.fails.push(`${where} after ${label}: the reload was refused`); throw STOP; }
    s = loaded;
    if (!check(`${label}, reloaded`)) throw STOP;
    return !!next;
  };
  const mine = () => new Set(s.squad.map(p => p.name));
  const outfield = () => s.squad.filter(p => !p.onLoan && p.position !== 'GK');
  const buy = (label, pick) => {
    let name = null;
    step(label, cur => { const have = mine(); const mp = M.cm.buildMarket(cur).find(p => pick(p) && !have.has(p.name)); const next = mp && M.cm.buyPlayer(cur, mp); if (next) name = mp.name; return next; });
    if (name) acc.moves[label] = (acc.moves[label] ?? 0) + 1;
    return name;
  };
  const play = (n, label) => { for (let i = 0; i < n; i += 1) step(`${label} ${i + 1}`, cur => M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state); };
  const toEnd = label => {
    for (let i = 0; i < 220; i += 1) {
      let over = false;
      step(`${label} ${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return r.state; });
      if (over) { step(`${label}, finished`, cur => M.cm.finishSeason(cur).state); return; }
    }
    throw new Error(`${where}: a season did not end in 220 entries`);
  };
  const count = label => { acc.moves[label] = (acc.moves[label] ?? 0) + 1; };
  try {
    step('start', () => M.cm.startCareer(club, era));
    if (s.worldSeed === undefined) { acc.fails.push(`${where}: a new career has no world seed`); return; }
    const first = s.clubName;
    step('open window', cur => ({ ...cur, budget: 9999, wageCap: 9999, transferWindow: 'summer' }));
    const bought = buy('buy', p => p.position !== 'GK' && p.age < 27);
    if (bought) {
      const man = s.squad.find(p => p.name === bought);
      const to = ['CB', 'CM', 'ST', 'RW', 'LB'].find(p => p !== man.position && !M.cm.retrainRefusal(man, p));
      if (to && step('retrain', cur => M.cm.startRetraining(cur, man.id, to))) count('retrain');
    }
    const seller = [...outfield()].filter(p => p.name !== bought).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
    const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
    if (seller && buyer && step('sale', cur => M.cm.acceptBid({ ...cur, incomingBids: [{ playerId: seller.id, playerName: seller.name, club: buyer, offer: 30, status: 'open' }] }, seller.id))) count('sale');
    const second = buy('second buy', p => p.position !== 'GK' && p.rating < 76 && p.age < 30);
    if (second && step('release', cur => M.cm.releasePlayer(cur, cur.squad.find(p => p.name === second).id))) count('release');
    let loanName = null;
    step('loan', cur => { const have = mine(); const mp = M.cm.buildMarket(cur).find(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK' && !have.has(p.name)); const next = mp && M.cm.loanIn(cur, mp); if (next) loanName = mp.name; return next; });
    if (loanName && step('loan option', cur => M.cm.exerciseLoanOption(cur, cur.squad.find(p => p.name === loanName).id))) count('loan option');
    play(10, 'entry');
    const target = M.cm.applyTargets(s).find(t => t.club !== s.clubName)?.club;
    if (target && step('apply', cur => M.cm.applyForJob(cur, target), 0)) {
      for (let n = 0; n < 20 && s.jobHunt?.open?.status === 'pending'; n += 1) step(`application ${n + 1}`, cur => M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state, 0.6);
      if (s.jobHunt?.open?.status === 'accepted' && step('join now', cur => M.cal.joinClubNow(cur), 0.6)) count('job move in season');
    }
    toEnd('season one');
    if (step('summer move back', cur => M.cm.startNextSeason(cur, first)) && s.clubName === first) count('summer move back');
    buy('buy at the old club', p => p.position !== 'GK' && p.age < 29);
    play(10, 'season two');
    toEnd('season two');
    step('rollover', cur => M.cm.startNextSeason(cur));
    const read = M.ledger.readWorldRoster(s);
    for (const r of read?.records ?? []) acc.status[r.status] = (acc.status[r.status] ?? 0) + 1;
    acc.journeys += 1;
  } catch (e) { if (e !== STOP) acc.fails.push(`${where}: threw ${e.message}`); }
}

const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
const SEEDS = [0x1ed601, 0x1ed602, 0x1ed603];
const M0 = await fresh();
const acc = { journeys: 0, held: 0, read: 0, largest: 0, fails: [], moves: {}, status: {} };
const t0 = Date.now();
for (const era of ERAS) {
  const leagues = era === 'now' ? M0.cm.REAL_LEAGUES : M0.cm.ERA_LEAGUES[era];
  if (!leagues?.length) cannot(`the era ${era} has no leagues`);
  const all = [...new Set(leagues.flatMap(l => l.clubs))];
  const size = c => M0.eras.projectedRoster(c, 0, era).length;
  const two = [leagues[0].clubs[2], leagues[1]?.clubs[4] ?? leagues[0].clubs[7]];
  const thin = [...all].filter(c => !two.includes(c)).sort((x, y) => size(x) - size(y) || x.localeCompare(y))[0];
  const picks = [...two, thin];
  console.log(`  ${era}: ${picks.join(', ')} (the last has the era's thinnest roster, ${size(thin)} projected men)`);
  for (const club of picks) for (const seed of SEEDS) await journey(era, club, seed, acc);
}
console.log(`journeys: ${acc.journeys} played to the end of season two, ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(`  moves made: ${Object.entries(acc.moves).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`  ledgers held at a step: ${acc.held}, read: ${acc.read}; the largest held ${acc.largest} records; records at the end by status: ${Object.entries(acc.status).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const f of acc.fails.slice(0, 10)) console.log(`  FAIL ${f}`);
if (acc.fails.length > 10) console.log(`  ... and ${acc.fails.length - 10} more`);
/* The fleet proves something only if it made every kind of move and saw every status. */
const need = ['buy', 'retrain', 'sale', 'release', 'loan option', 'job move in season', 'summer move back'].filter(k => !acc.moves[k]);
const statuses = ['owned', 'released', 'retired'].filter(k => !acc.status[k]);
if (!CONTROL && (need.length || statuses.length)) cannot(`the fleet never made: ${[...need, ...statuses.map(x => `a ${x} record`)].join(', ')}`);
if (CONTROL) {
  const fired = acc.fails.some(f => f.includes('a ledger its reader refuses'));
  console.log(fired
    ? `simCmLedgerJourney: CONTROL ${CONTROL} FIRED: ${acc.fails.length} journeys hold a ledger their reader refuses`
    : `simCmLedgerJourney: CONTROL ${CONTROL} DID NOT FIRE: every ledger read`);
  process.exit(fired ? 1 : 3);
}
console.log(acc.fails.length === 0
  ? `simCmLedgerJourney: green. ${acc.journeys} seeded journeys, ${acc.read} ledgers read at a step or a reload, and the reader refused none the game wrote`
  : `simCmLedgerJourney: ${acc.fails.length} FAILURE(S)`);
process.exit(acc.fails.length === 0 ? 0 : 1);
