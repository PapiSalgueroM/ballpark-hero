// Round 1318, fleets F3 and F4 of the brief (sent to a runner as .rc/x/fleetF3.mjs; never committed).
// F3: careers under the other lane's own policy (decision() of scripts/simSoccerAwardGenerations.mjs, its generator
//     and its clock), 2010 and 2025 starts, ST, CM, GK, seeds 1..N, each played on THIS head and on the FIRST PARENT
//     of the PR234 merge in lockstep. After every call the whole save is compared, byte for byte once the generated
//     identities are masked, until the first difference; draws are counted per ballot. Every first difference must
//     fall on a ballot where the head's pool seated a replacement. Plus the constructed name clashes of correction 12.
// F4: the realSaves Soccer Career fixtures built on the first parent load on this head, pass isSoccerCareerSave and
//     play to their next night equal to the first parent but for the new part.
// Usage: node .rc/x/fleetF3.mjs <first parent root> [N=16]   (writes $RC_OUT/fleet-f3.json)
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd(), BASE_ROOT = path.resolve(process.argv[2]), N = Number(process.argv[3] || 16);
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'f3-'));
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const SIG = 'function calculateBallonDor(state: CareerState, season: SeasonRecord, year: number, world?: WorldSeason): BallonDorResult {';
const once = (s, a, b) => { if (s.split(a).length !== 2) throw new Error('anchor not found once: ' + a.slice(0, 70)); return s.replace(a, () => b); };
function instrument(src) {
  src = once(src, SIG, SIG + ' globalThis.__bdorEnter?.(year); const __r = __ballotInner(state, season, year, world); globalThis.__bdorExit?.(year, __r); return __r; }\nfunction __ballotInner(state: CareerState, season: SeasonRecord, year: number, world?: WorldSeason): BallonDorResult {');
  src = once(src, 'function generateContender(', 'function generateContender(...a: any[]) { const r = (__genInner as any)(...a); globalThis.__genNames?.add(r.name); return r; }\nfunction __genInner(');
  return src;
}
async function bundle(root, label, rows = []) {
  const outfile = path.join(TMP, label + '.mjs');
  const contents = "export * as E from './src/lib/soccerCareerEngine'; export * as R from './src/lib/soccerAwardReveal'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave';";
  await build({
    stdin: { contents, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: 'globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };' },
    plugins: [{ name: 'instrument', setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, a => {
        let src = fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n');
        for (const r of rows) src = once(src, r.from, r.to);
        return { contents: instrument(src), loader: 'ts' };
      });
    } }],
  });
  return import(pathToFileURL(outfile).href);
}
const { awardGenerationsInverse } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerAwardsNight1172.mjs')).href);
const C12_ROWS = awardGenerationsInverse.slice(0, 3);
if (!C12_ROWS.every(r => r.from.includes('Round 1318') || r.from.includes('entry.retiredYear <= entry.firstYear') || r.from.includes('when his name was taken'))) throw new Error('the first three inverse rows are not the correction 12 rows');
const H = await bundle(ROOT, 'head'), B = await bundle(BASE_ROOT, 'base'), NOFIX = await bundle(ROOT, 'nofix', C12_ROWS);

// The other lane's generator and clock (simSoccerAwardGenerations.mjs machine()).
function generator(seed) {
  let cursor = seed >>> 0, count = 0;
  const f = () => { count++; let t = cursor += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.count = () => count; return f;
}
const RealDate = Date;
class FixedDate extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-11T12:00:00Z'])); } static now() { return 1791720000000; } }
globalThis.Date = FixedDate;
const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
const ENDS = ['retirement_ceremony', 'retired', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'];
function decision(M, s) {
  const E = M.E, clubs = E.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return ['advanceYouthYear', [s, clubs]];
    case 'contract_offer': { const o = [...s.pendingOffers].sort((a, b) => a.club.tier - b.club.tier || b.wage - a.wage)[0]; return ['acceptOffer', [s, o]]; }
    case 'playing': return ['advanceProSeason', [s, clubs]];
    case 'newspaper': return ['dismissNewspaper', [s]];
    case 'season_summary': return ['dismissSummary', [s, clubs]];
    case 'ballon_dor': return s.pendingBallonDor && !s.pendingBallonDor.revealed && !s.pendingBallonDor.speech ? ['revealBallonDorResult', [s]] : E.bdorSpeechOpen(s) ? ['giveBdorSpeech', [s, 'tears']] : ['dismissBallonDor', [s, clubs]];
    case 'international_debut': return ['dismissDebut', [s, clubs]];
    case 'world_cup': return E.worldCupSpeechOpen(s) ? ['giveWorldCupSpeech', [s, 'quiet_lap']] : ['dismissWorldCup', [s, clubs]];
    case 'rivalry_event': return ['dismissRivalryEvent', [s, clubs]];
    case 'social_media_action': return s.pendingCoverAthleteEvent ? ['handleCoverAthleteDecision', [s, false]] : ['dismissSocialMediaPhase', [s, clubs]];
    case 'moral_dilemma': return s.pendingMoralDilemma ? ['applyMoralDilemmaChoice', [s, 0]] : ['dismissMoralDilemma', [s, clubs]];
    case 'random_events': return ['applyEventChoice', [s, 0, clubs]];
    case 'red_card_appeal_result': return ['dismissAppealResult', [s, clubs]];
    case 'rehab_choice': return ['applyRehabChoice', [s, 0]];
    case 'transfer_window': return ['stayAtClub', [s]];
    case 'retirement_suggestion': return ['declineRetirementSuggestion', [s, clubs]];
    default: throw new Error(`unhandled phase ${s.phase}`);
  }
}

// ---- the arms
function arm(M, seed) { return { M, rng: generator(seed), names: new Set(), ballots: [], s: null, error: null, done: false, last: null }; }
function call(a, method, args) {
  Math.random = a.rng; globalThis.__genNames = a.names;
  globalThis.__bdorEnter = () => { a.enter = a.rng.count(); };
  globalThis.__bdorExit = (year, r) => { a.ballots.push({ year, draws: a.rng.count() - a.enter, rank: r.playerRank }); };
  return (a.M.E[method] ?? a.M.R[method])(...args);
}
function advance(a) {
  if (a.done) return;
  try {
    if (a.s.retired || ENDS.includes(a.s.phase)) { a.done = true; return; }
    const [method, args] = decision(a.M, a.s); a.last = method; a.s = call(a, method, args);
  } catch (e) { a.error = e.message; a.done = true; }
}
function start(a, d) {
  Math.random = a.rng; globalThis.__genNames = a.names;
  a.s = a.M.E.initCareer(`Generation ${d.id}`, 'England', d.position, d.startYear === 2010 ? '2010-14' : '2025', stats, 70, d.startYear, a.M.E.FALLBACK_CLUBS, null, 88);
}

// ---- the mask: the pool, generatedId and generatedAge go; every generated name (both arms, every pool entry) reads
// <GEN> wherever it appears, and a generated nominee's nationality, position and club read <GEN> too.
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function masker(names) {
  const list = [...names].filter(Boolean).sort((x, y) => y.length - x.length);
  const re = list.length ? new RegExp(list.map(esc).join('|'), 'g') : null;
  return str => {
    let t = str.replace(/,"generated(?:Id|Age)":\d+/g, '');
    if (re) t = t.replace(re, '<GEN>');
    return t.replace(/"name":"<GEN>","nationality":"[^"]*","position":"[^"]*","club":"[^"]*"/g, '"name":"<GEN>","nationality":"<GEN>","position":"<GEN>","club":"<GEN>"');
  };
}
const serialize = s => JSON.stringify({ ...s, generatedBallonPool: undefined });
function replacementYears(pool) {
  const ys = new Map();
  for (const e of pool?.entries ?? []) if (pool.entries.some(o => o.role === e.role && o.slot === e.slot && o.id < e.id)) {
    const v = ys.get(e.firstYear) ?? new Set(); v.add(e.role); ys.set(e.firstYear, v);
  }
  return ys;
}
function runPair(d) {
  const h = arm(H, d.seed), b = arm(B, d.seed);
  start(h, d); start(b, d);
  let firstDiff = null, steps = 0, unreadable = 0, pooled = 0, firstGen = null, snap = null;
  for (; steps < 800 && !(h.done && b.done); steps++) {
    advance(h); advance(b);
    const pool = h.s?.generatedBallonPool;
    if (pool) { pooled++; firstGen ??= pool.entries[0]?.firstYear ?? null; if (!H.E.isGeneratedBallonPool(pool, h.s.seasons.at(-1).year)) unreadable++; }
    if (!snap && pool && h.s.phase === "ballon_dor" && h.s.pendingBallonDor && h.s.rival && pool.entries.some(e => e.role === "primary" && e.retiredYear === null && e.firstYear < pool.year)) snap = JSON.stringify(h.s);
    if (firstDiff) continue;
    const A = serialize(h.s), Bs = JSON.stringify(b.s);
    if (A === Bs) continue;
    const m = masker(new Set([...h.names, ...b.names, ...(pool?.entries ?? []).map(e => e.name)]));
    if (m(A) === m(Bs)) continue;
    const keys = [...new Set([...Object.keys(h.s), ...Object.keys(b.s)])].filter(k => k !== 'generatedBallonPool' && m(JSON.stringify(h.s[k]) ?? '') !== m(JSON.stringify(b.s[k]) ?? ''));
    firstDiff = { step: steps, method: h.last, methodBase: b.last, phase: h.s.phase, year: h.s.seasons?.at(-1)?.year ?? null, keys: keys.slice(0, 8) };
  }
  const rep = replacementYears(h.s?.generatedBallonPool), repYears = [...rep.keys()].sort((x, y) => x - y);
  const primaryYears = repYears.filter(y => rep.get(y).has('primary'));
  const diffYear = firstDiff?.year ?? Infinity, byYear = new Map(b.ballots.map(x => [x.year, x]));
  let drawsBefore = 0, drawsAfter = 0, ballotsBefore = 0, ballotsAfter = 0, rankChanged = 0, rankDelta = 0;
  for (const x of h.ballots) {
    const y = byYear.get(x.year); if (!y) continue;
    if (x.year < diffYear) { ballotsBefore++; if (x.draws !== y.draws) drawsBefore++; continue; }
    ballotsAfter++; if (x.draws !== y.draws) drawsAfter++;
    const r1 = x.rank ?? 31, r2 = y.rank ?? 31; if (r1 !== r2) { rankChanged++; rankDelta += Math.abs(r1 - r2); }
  }
  const firstRep = repYears[0] ?? null;
  const stop = drawsBefore > 0 || (firstDiff !== null && (firstRep === null || firstDiff.year < firstRep));
  const attributed = firstDiff === null || rep.has(firstDiff.year);
  const pool = h.s?.generatedBallonPool;
  return { id: d.id, steps, errors: [h.error, b.error].filter(Boolean), firstGen, firstRep, firstPrimaryRep: primaryYears[0] ?? null, repYears,
    firstDiff, stop, attributed, ballotsBefore, drawsBefore, ballotsAfter, drawsAfter, rankChanged, rankDelta, pooled, unreadable,
    poolSize: pool?.entries.length ?? 0, retiredInPool: pool?.entries.filter(e => e.retiredYear !== null).length ?? 0,
    earlyRetired: pool?.entries.filter(e => e.retiredYear !== null && e.retiredYear !== e.firstYear + 37 - e.entryAge).length ?? 0,
    bytesHead: JSON.stringify(h.s ?? null).length, bytesBase: JSON.stringify(b.s ?? null).length, snap };
}

// ---- correction 12's constructed cases: from a head night with a pool and a rival, one saved primary a year old
// renamed to the rival's name (renamed) or the rival renamed to his (rival), then the next ballot on the head, on the
// head without the fix (its three inverse rows) and on the first parent: draws per ballot and what the pool did.
function nextBallot(M, raw, edit) {
  const a = arm(M, 7); a.s = JSON.parse(raw); const pool = a.s.generatedBallonPool;
  const entry = pool.entries.find(e => e.role === 'primary' && e.retiredYear === null && e.firstYear < pool.year);
  edit(a.s, a.s.generatedBallonPool.entries[entry.id]);
  for (let i = 0; i < 300 && !a.done && a.ballots.length === 0; i++) advance(a);
  const p = a.s?.generatedBallonPool, old = p?.entries[entry.id];
  const face = p?.entries.find(e => e.role === 'primary' && e.slot === entry.slot && e.retiredYear === null);
  return { year: a.ballots[0]?.year ?? null, draws: a.ballots[0]?.draws ?? null, rank: a.ballots[0]?.rank ?? null, error: a.error,
    clashRetired: old ? old.retiredYear : 'no pool', newFace: face && face.id !== entry.id ? face.id : null };
}
const CLASHES = { renamed: (s, e) => { e.name = s.rival.name; }, rival: (s, e) => { s.rival.name = e.name; } };

// ---- F4: the first parent's realSaves Soccer Career fixtures on this head.
async function fleetF4() {
  const { buildRealSaves } = await import(pathToFileURL(path.join(BASE_ROOT, 'scripts/lib/realSaves.mjs')).href);
  const real = await buildRealSaves({ root: BASE_ROOT, tmpDir: path.join(TMP, 'realsaves') });
  globalThis.Date = FixedDate;
  const rows = [];
  for (const [i, raw] of (real.fleet['/soccer-career'] ?? []).entries()) {
    const v = JSON.parse(raw), opens = H.isSoccerCareerSave(v) === true && B.isSoccerCareerSave(JSON.parse(raw)) === true;
    const h = arm(H, 1318), b = arm(B, 1318); h.s = JSON.parse(raw); b.s = JSON.parse(raw);
    for (let k = 0; k < 400 && !(h.ballots.length && b.ballots.length) && !(h.done && b.done); k++) { if (!h.ballots.length) advance(h); if (!b.ballots.length) advance(b); }
    const A = serialize(h.s), Bs = JSON.stringify(b.s), stripped = A.replace(/,"generated(?:Id|Age)":\d+/g, '');
    rows.push({ seed: i, opens, year: h.ballots[0]?.year ?? null, drawsHead: h.ballots[0]?.draws ?? null, drawsBase: b.ballots[0]?.draws ?? null,
      equalButNewPart: stripped === Bs, newPool: !!h.s?.generatedBallonPool, hadPool: !!v.generatedBallonPool, errors: [h.error, b.error].filter(Boolean) });
  }
  return rows;
}

// ---- main
const t0 = RealDate.now();
const descriptors = [2010, 2025].flatMap(startYear => ['ST', 'CM', 'GK'].flatMap(position => Array.from({ length: N }, (_, i) => ({ id: `${startYear}-${position}-${i + 1}`, startYear, position, seed: i + 1 }))));
const rows = [], snaps = [];
for (const d of descriptors) {
  const r = runPair(d);
  if (r.snap && snaps.length < 8) snaps.push({ id: d.id, raw: r.snap });
  delete r.snap; rows.push(r);
  const f = r.firstDiff;
  console.log(`F3 ${r.id}: ${r.steps} calls, first pool ${r.firstGen}, replacements ${r.repYears.join('/') || 'none'} (first primary ${r.firstPrimaryRep}), first difference ${f ? `${f.year} call ${f.step} ${f.method} [${f.keys.join(',')}]` : 'none'}, ${r.attributed ? 'attributed' : 'NOT ATTRIBUTED'}${r.stop ? ' STOP' : ''}, ballot draws equal ${r.ballotsBefore - r.drawsBefore}/${r.ballotsBefore} before it, after it ${r.ballotsAfter} ballots (${r.drawsAfter} draw counts and ${r.rankChanged} places differ, sum ${r.rankDelta}), pool ${r.poolSize} (${r.retiredInPool} retired, ${r.earlyRetired} early), unreadable pools ${r.unreadable}/${r.pooled}, bytes ${r.bytesHead}/${r.bytesBase}${r.errors.length ? ' ERRORS ' + r.errors.join(' | ') : ''}`);
}
const clashes = [];
for (const s of snaps) for (const [kind, edit] of Object.entries(CLASHES)) {
  const row = { id: s.id, kind, head: nextBallot(H, s.raw, edit), nofix: nextBallot(NOFIX, s.raw, edit), base: nextBallot(B, s.raw, edit) };
  clashes.push(row);
  console.log(`C12 ${s.id} ${kind}: ballot ${row.head.year}; draws head ${row.head.draws}, without the fix ${row.nofix.draws}, first parent ${row.base.draws}; head retired the clash in ${row.head.clashRetired} and seated #${row.head.newFace}; without the fix he stays (${row.nofix.clashRetired})`);
}
const f4 = await fleetF4();
for (const r of f4) console.log(`F4 seed ${r.seed}: opens ${r.opens}, had pool ${r.hadPool}, next ballot ${r.year}, draws ${r.drawsHead}/${r.drawsBase}, equal but the new part ${r.equalButNewPart}, new pool ${r.newPool}${r.errors.length ? ' ERRORS ' + r.errors.join(' | ') : ''}`);
const stops = rows.filter(r => r.stop), unattributed = rows.filter(r => !r.attributed), errs = rows.filter(r => r.errors.length), unread = rows.reduce((n, r) => n + r.unreadable, 0);
const f4bad = f4.filter(r => !r.opens || !r.equalButNewPart || r.errors.length);
const named = ['2025-ST-1', '2025-ST-8', '2025-CM-6'].map(id => rows.find(r => r.id === id)).filter(Boolean);
for (const r of named) console.log(`NAMED ${r.id}: first difference ${r.firstDiff ? `${r.firstDiff.year} (${r.firstDiff.method}, keys ${r.firstDiff.keys.join(',')})` : 'none'}; replacements in ${r.repYears.join('/') || 'none'}; ${r.attributed ? 'it falls on a replacement ballot' : 'NOT on a replacement ballot'}`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'fleet-f3.json'), JSON.stringify({ n: N, careers: rows, clashes, f4 }, null, 1));
const summary = `${rows.length} careers in ${Math.round((RealDate.now() - t0) / 1000)} s: ${stops.length} STOP, ${unattributed.length} not attributed, ${errs.length} with errors, ${unread} unreadable pools; ${rows.filter(r => r.firstDiff).length} differ at all; ${clashes.length} constructed clashes; F4 ${f4.length - f4bad.length}/${f4.length} equal but the new part`;
if (stops.length || unattributed.length || errs.length || unread || f4bad.length || !f4.length) { console.log('FLEET F3 RED: ' + summary); process.exit(1); }
console.log('FLEET F3 GREEN: ' + summary);
