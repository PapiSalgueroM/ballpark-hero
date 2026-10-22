/* Reviewer probe (Round 1556, runs lens): an oracle for nbaSummerKeepingSheets.
 * For each trial, one league, two copies, one seeded draw: A is the engine's summer alone (nbaOffseason), B is the
 * host's summer that keeps sheet arrivals (nbaSummerKeepingSheets). Where the hand back does not act, B must be A byte
 * for byte. Where it acts, B must be A plus exactly the hand back: the arrival on his club on the sheet's terms, the
 * club at A's count, no dead money for a man on the roster, one man waived per arrival (the lowest rated non arrival),
 * his dead money rolled once, his pool line on the summer's free agent terms, nobody else moved.
 * usage: node .rc/x/hbprobe.mjs [trials]   (run from the repo root; exit 0 green, 1 red, 2 could not run) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TRIALS = Number(process.argv[2] || 300);
const { build } = await import('esbuild');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hbprobe-'));
fs.writeFileSync(path.join(work, 'entry.ts'), [
  "export { initNbaLeague, nbaOffseason, nbaSalaryFor, NBA_ROSTER_MAX } from '@/lib/nbaFrontOffice';",
  "export { nbaSummerKeepingSheets } from '@/lib/gmContractsHostNba';",
  "export { NBA_OPENING_RATINGS } from '@/data/nbaOpeningRatings';",
].join('\n'));
await build({ entryPoints: [path.join(work, 'entry.ts')], outfile: path.join(work, 'e.mjs'), bundle: true, platform: 'node',
  format: 'esm', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const text = fs.readFileSync(path.join(work, 'e.mjs'), 'utf8');
if (text.includes('supabase.co')) { console.error('refusing: bundle names supabase.co'); process.exit(2); }
const E = await import(pathToFileURL(path.join(work, 'e.mjs')).href);

const mulberry32 = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const J = v => JSON.stringify(v);
const clone = v => JSON.parse(J(v));
const round1 = n => Math.round(n * 10) / 10;
const fails = new Map();
const bad = (kind, msg) => { if (!fails.has(kind)) fails.set(kind, []); fails.get(kind).push(msg); };
const n = { trials: 0, quiet: 0, quietEqual: 0, acted: 0, actedArrivals: 0, two: 0 };

for (let seed = 1; seed <= TRIALS; seed++) {
  const lg = E.initNbaLeague(mulberry32(seed), E.NBA_OPENING_RATINGS);
  const ids = Object.keys(lg.teams).sort();
  const team = ids[seed % ids.length];
  let clubId = ids[(seed * 7 + 3) % ids.length];
  if (clubId === team) clubId = ids[(seed * 7 + 4) % ids.length];
  const club = lg.teams[clubId];
  const mode = seed % 3 === 0 ? 'quiet' : seed % 5 === 0 ? 'two' : 'bottom';
  const arrivals = [];
  const terms = new Map();
  const howMany = mode === 'two' ? 2 : 1;
  for (let k = 0; k < howMany; k++) {
    const mine = lg.teams[team].players;
    const src = [...mine].sort((a, b) => a.ovr - b.ovr)[k];
    mine.splice(mine.indexOf(src), 1);
    const years = 1 + ((seed + k) % 4);
    const salary = round1(src.salary * 1.3 + 0.7);
    const man = { ...src, age: 22, pot: Math.min(98, src.ovr + 6), years: years + 1, salary };
    club.players.push(man);
    arrivals.push({ id: man.id, club: clubId });
    terms.set(man.id, { years, salary, age: 23, name: man.name });
  }
  if (mode !== 'quiet') {
    const top = Math.max(...arrivals.map(a => club.players.find(p => p.id === a.id).pot)) + 1;
    for (let i = 0; i < 16; i++) club.players.push({ ...club.players[0], id: `top-${clubId}-${i}`, name: `Topper ${clubId} ${i}`, age: 27, ovr: top, pot: top, years: 3, out: 0 });
    /* Dead money carried into the summer: one entry that outlives the roll and one that does not. */
    club.deadCap = [...(club.deadCap ?? []), { playerId: 'old-a', name: 'Old A', amount: 4, seasonsLeft: 2 }, { playerId: 'old-b', name: 'Old B', amount: 2, seasonsLeft: 1 }];
  }
  n.trials++; if (mode === 'two') n.two++;
  const A0 = clone(lg), B0 = clone(lg);
  const nA = E.nbaOffseason(A0, mulberry32(seed + 1000), team);
  const nB = E.nbaSummerKeepingSheets(B0, mulberry32(seed + 1000), team, arrivals);
  /* The engine mints ids from a module counter, so the second summer's minimum men carry other ids: name every id
     the summer minted by its order of appearance before comparing. */
  const known = new Set([...Object.values(lg.teams).flatMap(t => t.players.map(p => p.id)), ...lg.freeAgents.map(p => p.id)]);
  const norm = L => { let s = J(L); const seen = []; for (const k of Object.keys(L.teams).sort()) for (const p of L.teams[k].players) if (!known.has(p.id)) seen.push(p.id);
    for (const p of L.freeAgents) if (!known.has(p.id) && !seen.includes(p.id)) seen.push(p.id);
    seen.forEach((id, i) => { s = s.split(`"${id}"`).join(`"minted-${i}"`); }); return JSON.parse(s); };
  const A = norm(A0), B = norm(B0);
  const taken = arrivals.filter(a => !A.teams[clubId].players.some(p => p.id === a.id) && !nA.some(x => x.endsWith(`${terms.get(a.id).name} retires.`)));
  if (!taken.length) {
    n.quiet++;
    if (J(A) === J(B) && J(nA) === J(nB)) n.quietEqual++; else bad('quiet', `seed ${seed}: the hand back did not act and B differs from A`);
    continue;
  }
  n.acted++; n.actedArrivals += taken.length;
  const cA = A.teams[clubId], cB = B.teams[clubId];
  const where = `seed ${seed} ${clubId} (${mode})`;
  for (const a of taken) {
    const t = terms.get(a.id);
    const p = cB.players.find(x => x.id === a.id);
    if (!p) { bad('arrival', `${where}: ${t.name} not on his club`); continue; }
    if (p.years !== t.years || p.salary !== t.salary || p.age !== t.age) bad('terms', `${where}: ${t.name} ${p.years}y ${p.salary} age ${p.age}, sheet ${t.years}y ${t.salary} age ${t.age}`);
    if (B.freeAgents.some(x => x.id === a.id)) bad('arrival', `${where}: ${t.name} also in the pool`);
  }
  if (cB.players.length !== cA.players.length) bad('count', `${where}: club ends at ${cB.players.length}, the engine ended it at ${cA.players.length}`);
  const onB = new Set(cB.players.map(p => p.id));
  for (const d of cB.deadCap ?? []) if (onB.has(d.playerId)) bad('deadOnRoster', `${where}: dead money ${d.amount} for ${d.name}, who is on the roster`);
  /* Waived in the arrival's place: on A's club, gone from B's club. */
  const W = cA.players.filter(p => !onB.has(p.id));
  if (W.length !== taken.length) bad('waived', `${where}: ${W.length} men waived for ${taken.length} arrivals`);
  const kept = new Set(arrivals.map(a => a.id));
  for (const w of W) {
    const lowest = Math.min(...cA.players.filter(p => !kept.has(p.id)).map(p => p.ovr));
    if (w.ovr > lowest + W.length) bad('waived', `${where}: waived ${w.name} at ${w.ovr}, lowest non arrival ${lowest}`);
    const fa = B.freeAgents.find(x => x.id === w.id);
    const age = w.age + 1, ovr = age >= 32 ? Math.max(64, w.ovr - 1) : w.ovr;
    if (!fa) bad('pool', `${where}: ${w.name} waived and not in the pool`);
    else if (fa.years !== 1 || fa.age !== age || fa.ovr !== ovr || fa.salary !== E.nbaSalaryFor(ovr, B.cap)) bad('pool', `${where}: ${w.name} in the pool at ${fa.years}y age ${fa.age} ovr ${fa.ovr} ${fa.salary}, want 1y age ${age} ovr ${ovr} ${E.nbaSalaryFor(ovr, B.cap)}`);
  }
  /* The dead money oracle: A's ledger without the arrivals' summer entries, plus each waived man's entry rolled once. */
  const carried = (lg.teams[clubId].deadCap ?? []).map(d => ({ ...d, amount: round1(d.amount / 2), seasonsLeft: d.seasonsLeft - 1 })).filter(d => d.seasonsLeft > 0).length;
  const want = (cA.deadCap ?? []).filter((d, i) => i < carried || !kept.has(d.playerId));
  for (const w of W) {
    const now = w.guaranteed ? round1(w.salary) : round1(w.salary * 0.5);
    const e = { playerId: w.id, name: w.name, amount: round1(now / 2), seasonsLeft: (w.years > 1 ? 2 : 1) - 1 };
    if (e.seasonsLeft > 0) want.push(e);
  }
  const key = l => J([...l].map(d => J(d)).sort());
  if (key(want) !== key(cB.deadCap ?? [])) bad('deadLedger', `${where}: ledger ${J(cB.deadCap)} want ${J(want)}`);
  /* Nobody else moved: every other club and the pool apart from the arrivals and the waived men are A's. */
  for (const k of ids) if (k !== clubId && J(A.teams[k]) !== J(B.teams[k])) bad('other', `${where}: ${k} differs`);
  const moved = new Set([...kept, ...W.map(w => w.id)]);
  if (J(A.freeAgents.filter(p => !moved.has(p.id))) !== J(B.freeAgents.filter(p => !moved.has(p.id)))) bad('other', `${where}: the rest of the pool differs`);
  if (J(nA) !== J(nB)) bad('other', `${where}: notes differ`);
}
console.log(`hbprobe: ${n.trials} trials (${n.two} with two arrivals at one club); quiet ${n.quiet} (${n.quietEqual} byte equal to the engine alone); hand back acted in ${n.acted} (${n.actedArrivals} arrivals)`);
for (const [k, v] of fails) { console.log(`  FAIL ${k}: ${v.length}`); for (const m of v.slice(0, 3)) console.log(`    ${m}`); }
if (n.acted < 50 || n.quiet < 50) { console.log(`hbprobe: too few cases (acted ${n.acted}, quiet ${n.quiet})`); process.exit(2); }
const total = [...fails.values()].reduce((s, v) => s + v.length, 0);
console.log(total ? `hbprobe: RED, ${total} failures in ${[...fails.keys()].join(', ')}` : 'hbprobe: green, every invariant held');
process.exit(total ? 1 : 0);
