// Reviewer cm-world (Release AZ), never committed. Long seeded careers with deals every window, summer job moves,
// one mid season job move and one wilderness, a save and a reload after every step. Asks: (1) does readWorldRoster
// ever refuse a ledger the game wrote (diagnosed to the record and the check); (2) does a ledger man stand at his
// owner and nowhere else in my league or at his origin club; (3) what buildMarket and one matchday cost, seeded
// against the same save with the seed and the ledger taken off. Run from the repo root: node .rc/x/rvcmw-long.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
const { decompressFromUTF16 } = require('lz-string');
const SEASONS = Number(process.env.RV_SEASONS || 10);
const lf = s => s.split('\r\n').join('\n');
const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
  const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
  if (!rel.startsWith('src/')) return null;
  return { contents: lf(fs.readFileSync(args.path, 'utf8')), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
}); } };
const entry = "export * as cm from './src/lib/clubManager';\nexport * as cal from './src/lib/clubManagerCalendar';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'rv.ts', loader: 'ts' }, bundle: true, write: false,
  format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
const script = new vm.Script(out.outputFiles[0].text, { filename: 'rv.cjs' });
async function fresh() {
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require, console, process, Buffer, Math, Date: D, URL, URLSearchParams,
    TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('offline')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}
function tape(seed, action, forced) {
  let st = seed >>> 0; const original = Math.random;
  Math.random = () => { if (forced !== undefined) return forced; st = (st + 0x6d2b79f5) >>> 0; let v = st;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}
/* Why a held ledger is refused: the same checks as readWorldRoster, reported per record. */
function diagnose(s) {
  const raw = s.worldRoster; const start = s.startYear ?? 2026; const year = start + s.season - 1;
  if (!raw || raw.version !== 1) return 'shape or version';
  if (raw.eraId !== (s.eraId ?? 'now')) return `eraId ${raw.eraId} against ${s.eraId}`;
  let recs = raw.records;
  if (raw.packedRecords) {
    const saved = JSON.parse(decompressFromUTF16(raw.packedRecords) || 'null');
    if (!saved) return 'packed string does not decode';
    const schemas = saved[0];
    const dec = v => !Array.isArray(v) ? v : v[0] === -1 ? v.slice(1).map(dec) : Object.fromEntries(schemas[v[0]].map((k, i) => [k, dec(v[i + 1])]));
    recs = dec(saved[1]);
  }
  const bad = [];
  for (const r of recs) {
    const p = r.player || {}; const o = r.origin || {}; const why = [];
    for (const f of ['age', 'injuryWeeks', 'suspendedMatches', 'seasonGoals', 'seasonAssists']) if (!Number.isSafeInteger(p[f]) || p[f] < 0) why.push(`${f}=${p[f]}`);
    if (typeof p.isYouth !== 'boolean') why.push(`isYouth=${p.isYouth}`);
    if (p.potential !== undefined && (!Number.isSafeInteger(p.potential) || p.potential > 99)) why.push(`potential=${p.potential}`);
    if (p.worldRosterSince !== undefined && !Number.isSafeInteger(p.worldRosterSince)) why.push(`since=${p.worldRosterSince}`);
    if (p.value !== undefined && !(p.value >= 0)) why.push(`value=${p.value}`);
    if (p.onLoan === true) why.push('onLoan');
    if (r.year > year) why.push(`record year ${r.year} > ${year}`);
    if (r.year - p.age !== o.birthYear) why.push(`birth ${r.year}-${p.age} != ${o.birthYear}`);
    if (p.name !== o.name) why.push(`name ${p.name} != ${o.name}`);
    if (o.since !== null && o.since > year - start) why.push(`since ${o.since} > ${year - start}`);
    if (p.worldRosterKey !== r.key) why.push('key on player differs');
    if (why.length) bad.push(`${o.name} (${r.status}, owner ${r.owner}): ${why.join(', ')}`);
  }
  return bad.length ? bad.slice(0, 4).join(' | ') : `no single record fails (${recs.length} records): duplicate key or all owned when packed?`;
}
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const time = (fn, n = 3) => { const t = []; for (let i = 0; i < n; i += 1) { const a = performance.now(); fn(); t.push(performance.now() - a); } return Math.round(median(t)); };
const results = { refusals: [], dupes: [], misplaced: [], timings: [], moves: {}, ledgers: 0, maxRecords: 0, errors: [] };
const count = k => { results.moves[k] = (results.moves[k] ?? 0) + 1; };
const STOP = new Error('stop');
function invariants(M, s, where) {
  const held = M.ledger.readWorldRoster(s); if (!held) return;
  const year = M.cm.worldYear(s); const rosters = new Map();
  const rosterOf = c => { if (!rosters.has(c)) rosters.set(c, M.cm.worldRosterFor(s, c)); return rosters.get(c); };
  for (const r of held.records) {
    if (r.year !== year) continue;
    if (r.status === 'owned' && r.owner === s.clubName && !s.squad.some(p => p.worldRosterKey === r.key) && !(s.loanedOut ?? []).some(l => l.player.worldRosterKey === r.key))
      results.misplaced.push(`${where}: ${r.player.name} is owned by my club in the ledger and is not in my squad`);
    const clubs = new Set([...s.leagueClubs, r.origin.club, ...(r.owner ? [r.owner] : [])]); clubs.delete(s.clubName);
    for (const c of clubs) {
      const byKey = rosterOf(c).some(p => p.worldRosterKey === r.key);
      const byName = rosterOf(c).some(p => p.n === r.player.name && p.a === r.player.age);
      const should = r.status === 'owned' && r.owner === c;
      if ((byKey || byName) && !should) results.dupes.push(`${where}: ${r.player.name} (${r.status}, owner ${r.owner}) also stands at ${c} (${byKey ? 'by key' : 'by name and age'})`);
      if (should && !byKey) results.misplaced.push(`${where}: ${r.player.name} is owned by ${c} in the ledger and missing from its roster`);
    }
  }
}
async function career(era, club, seed, other) {
  const M = await fresh(); const where = `${club} ${era} seed ${seed}`;
  let s = null; let k = 0;
  const check = label => {
    if (s.worldRoster === undefined) return;
    results.ledgers += 1;
    const read = M.ledger.readWorldRoster(s);
    if (!read) { results.refusals.push(`${where} after ${label}: ${diagnose(s)}`); throw STOP; }
    results.maxRecords = Math.max(results.maxRecords, read.records.length);
  };
  const step = (label, fn, forced) => {
    k += 1; let next = null;
    try { next = tape((seed + k * 7919) >>> 0, () => fn(s), forced); } catch (e) { results.errors.push(`${where} ${label}: ${String(e).slice(0, 160)}`); throw STOP; }
    if (next) s = next;
    check(label); M.store.clear();
    if (!M.cm.saveCareer(s)) { results.errors.push(`${where} ${label}: save refused`); throw STOP; }
    s = M.cm.loadCareer(); check(`${label}, reloaded`);
    return !!next;
  };
  const mine = () => new Set(s.squad.map(p => p.name));
  const outfield = () => s.squad.filter(p => !p.onLoan && p.position !== 'GK');
  const buy = (label, pick) => step(label, cur => { const have = mine(); const mp = M.cm.buildMarket(cur).find(p => pick(p) && !have.has(p.name)); return mp ? M.cm.buyPlayer(cur, mp) : null; }) && count(label);
  const toEnd = label => { for (let i = 0; i < 240; i += 1) { let over = false;
    step(`${label} ${i}`, cur => { const r = M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return r.state; });
    if (over) { step(`${label} finished`, cur => M.cm.finishSeason(cur).state); return; } } throw new Error('no season end'); };
  const timing = label => {
    const js = JSON.stringify(s); const bare = JSON.parse(js); delete bare.worldSeed; delete bare.worldRoster;
    const held = M.ledger.readWorldRoster(s);
    results.timings.push(`${where} ${label}: ${held ? held.records.length : 0} records; buildMarket ${time(() => M.cm.buildMarket(s))} ms (stripped ${time(() => M.cm.buildMarket(bare))}); matchday ${time(() => tape(5, () => M.cm.playNextEntry(JSON.parse(js), { skipHalftime: true, noCoach: true })))} ms (stripped ${time(() => tape(5, () => M.cm.playNextEntry(JSON.parse(JSON.stringify(bare)), { skipHalftime: true, noCoach: true })))})`);
  };
  try {
    step('start', () => M.cm.startCareer(club, era));
    for (let season = 1; season <= SEASONS; season += 1) {
      if (season === 1 || season === Math.ceil(SEASONS / 2) || season === SEASONS) timing(`season ${season}`);
      invariants(M, s, `${where} season ${season} start`);
      step('money', cur => ({ ...cur, budget: 9999, wageCap: 9999 }));
      buy('buy young', p => p.position !== 'GK' && p.age < 25);
      buy('buy any', p => p.position !== 'GK' && p.rating < 80);
      const seller = [...outfield()].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[2];
      const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName && !s.leagueClubs.includes(p.club))?.club;
      if (seller && buyer && step('sale', cur => M.cm.acceptBid({ ...cur, incomingBids: [{ playerId: seller.id, playerName: seller.name, club: buyer, offer: 30, status: 'open' }] }, seller.id))) count('sale');
      const low = [...outfield()].filter(p => !p.isYouth).sort((a, b) => a.rating - b.rating)[0];
      if (low && step('release', cur => M.cm.releasePlayer(cur, low.id))) count('release');
      const fa = (() => { const c = JSON.parse(JSON.stringify(s)); M.cm.ensureFreeAgents(c); return (c.freeAgents ?? [])[0]?.name; })();
      if (fa && step('free agent', cur => M.cm.signFreeAgent(JSON.parse(JSON.stringify(cur)), fa))) count('free agent');
      let loanName = null;
      step('loan in', cur => { const have = mine(); const mp = M.cm.buildMarket(cur).find(p => p.age <= 23 && p.position !== 'GK' && !have.has(p.name)); const n = mp && M.cm.loanIn(cur, mp); if (n) loanName = mp.name; return n; });
      if (loanName && step('loan option', cur => M.cm.exerciseLoanOption(cur, cur.squad.find(p => p.name === loanName).id))) count('loan option');
      for (let i = 0; i < 8; i += 1) step(`entry ${i}`, cur => M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state);
      if (season === 2) {
        const target = M.cm.applyTargets(s).find(t => t.club !== s.clubName)?.club;
        if (target && step('apply', cur => M.cm.applyForJob(cur, target), 0)) {
          for (let n = 0; n < 20 && s.jobHunt?.open?.status === 'pending'; n += 1) step(`application ${n}`, cur => M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state, 0.6);
          if (s.jobHunt?.open?.status === 'accepted' && step('join now', cur => M.cal.joinClubNow(cur), 0.6)) { count('job move in season'); invariants(M, s, `${where} after join now`); }
        }
      }
      if (season === 4) {
        step('sacked', cur => M.cm.enterWilderness({ ...cur, sacked: true }));
        for (let w = 0; w < 10 && !(s.wilderness?.offers?.length); w += 1) step(`wilderness ${w}`, cur => M.cm.wildernessWeek(cur));
        const offer = s.wilderness?.offers?.[0]?.club;
        if (offer && step('take wilderness job', cur => M.cm.acceptWildernessJob(cur, offer))) { count('wilderness job'); invariants(M, s, `${where} after the wilderness`); continue; }
      }
      toEnd(`season ${season}`);
      const move = season % 3 === 0 ? (season === 3 ? other : club) : undefined;
      if (step('rollover', cur => M.cm.startNextSeason(cur, move)) && move) count('summer move');
    }
  } catch (e) { if (e !== STOP) results.errors.push(`${where}: ${String(e).slice(0, 200)}`); }
}
const PLAN = [['now', 'Everton', 'Brentford'], ['now', 'Real Madrid', 'Sevilla'], ['era2010', 'Blackburn Rovers', 'Everton'], ['era2020', 'Real Betis', 'Celta Vigo'], ['era2005', 'Celta Vigo', 'Espanyol'], ['era2015', 'Eibar', 'Getafe']];
const ONLY = process.env.RV_ONLY ? Number(process.env.RV_ONLY) : null;
for (const [i, [era, club, other]] of PLAN.entries()) { if (ONLY !== null && ONLY !== i) continue; for (const seed of [101, 202]) await career(era, club, seed, other); }
console.log(`moves ${JSON.stringify(results.moves)}; ledgers read ${results.ledgers}; largest ${results.maxRecords} records`);
for (const t of results.timings) console.log(`TIME ${t}`);
for (const [name, list] of [['REFUSED', results.refusals], ['DUPLICATE', results.dupes], ['MISPLACED', results.misplaced], ['ERROR', results.errors]]) {
  console.log(`${name}: ${list.length}`); for (const x of list.slice(0, 12)) console.log(`  ${x}`);
}
fs.mkdirSync(process.env.RC_OUT || '.tmp-fx/rv-out', { recursive: true });
fs.writeFileSync(path.join(process.env.RC_OUT || '.tmp-fx/rv-out', 'rvcmw-long.json'), JSON.stringify(results, null, 1));
const red = results.refusals.length + results.dupes.length + results.misplaced.length + results.errors.length;
console.log(red ? `rvcmw-long: ${red} findings` : 'rvcmw-long: green, no refusal, no duplicate, nobody misplaced');
process.exit(red ? 1 : 0);
