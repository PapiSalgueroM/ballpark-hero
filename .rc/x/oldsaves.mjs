/* Review of Round 1344 (the runner): old saves. Saves written by the round's BASE engine (d4f2c6f6), loaded by the head.
   Seeded saves (2026-27 careers at four clubs of four leagues, seeds 11 and 12, at four points: after the opening
   window, after the first January, after the second summer window, after the second January): the head's load is
   never null, differs from BASE's load in the ledger alone, a second save and load is byte equal, every mended man is
   at his buyer, and the save the head writes still loads in BASE's engine with the man at his buyer.
   Unseeded saves (the same saves with the seed, the ledger and the squad's ledger keys stripped, as
   simClubManagerSaveSize strips them): the head's load is byte equal to BASE's, 80 entries played on each engine from
   it on the same stream write the same save after every entry, and a job move (joinClubNow) is byte equal too.
   Exit 0 green, 1 red. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);
const BASE = process.env.OLD_BASE || 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const KEY = 'dukb-club-manager-save';
Date.now = () => 1791900000000;   // a fixed clock, so no save carries a moment that differs between the two engines
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear(), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'review-old-'));
async function engine(label, base) {
  const entry = path.join(work, `${label}.ts`);
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as cal from '@/lib/clubManagerCalendar';\nexport * as wr from '@/lib/clubManagerWorldRoster';\n");
  const plugin = { name: label, setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/') || !base) return null;
      const text = execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  } };
  const outfile = path.join(work, `${label}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin] });
  const m = createRequire(import.meta.url)(outfile);
  await m.cm.ensureAllEraRosters();
  return m;
}
const H = await engine('head', false);
const B = await engine('base', true);
let fails = 0;
const fail = msg => { fails += 1; if (fails <= 40) console.log(`FAIL ${msg}`); };
const OPT = { skipHalftime: true, noCoach: true };
const saveOf = (E, s) => { memory.clear(); if (!E.cm.saveCareer(s)) throw new Error('save refused'); return memory.get(KEY); };
const loadOf = (E, str) => { memory.clear(); memory.set(KEY, str); return E.cm.loadCareer(); };
const noLedger = s => { const c = JSON.parse(JSON.stringify(s)); delete c.worldRoster; return JSON.stringify(c); };
const strip = str => { const c = JSON.parse(str); const st = c.state ?? c; for (const k of ['worldSeed', 'worldRoster']) delete st[k];
  for (const p of st.squad ?? []) { delete p.worldRosterKey; delete p.worldRosterSince; } return JSON.stringify(c); };
const aiLines = s => (s.transferLog ?? []).filter(t => !t.loan && t.season === s.season && t.from !== s.clubName && t.to !== s.clubName && t.from !== 'a free transfer' && t.to !== 'a free transfer');
function firstDiff(a, b) { const A = JSON.parse(a), Bb = JSON.parse(b); const keys = new Set([...Object.keys(A), ...Object.keys(Bb)]); for (const k of keys) if (JSON.stringify(A[k]) !== JSON.stringify(Bb[k])) return k; return '(none)'; }

/* four clubs of four leagues, chosen from the engine's own lists (the sixth club of each) */
const leagues = B.cm.REAL_LEAGUES.slice(0, 8).map(l => l.id);
const clubs = [];
for (const id of leagues) { const list = B.cm.playableClubs(id); if (list.length > 6) clubs.push(list[5].name); if (clubs.length >= 4) break; }
console.log(`clubs: ${clubs.join(', ')}`);
const tally = { seeded: 0, mended: 0, unmended: 0, roundtrip: 0, unseeded: 0, played: 0, joins: 0 };
function playTo(E, s, seed, stop) {
  for (let i = 0; i < 500; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = withSeed(seed * 7919 + i, () => E.cm.playNextEntry(s, OPT));
    s = r.state;
    if (stop(r, s) || r.kind === 'seasonOver' || s.sacked) return { s, r };
  }
  return { s, r: null };
}
function checkSeeded(tag, str) {
  tally.seeded += 1;
  const lh = loadOf(H, str), lb = loadOf(B, str);
  if (!lh) { fail(`${tag}: the head's load of a BASE save is null`); return; }
  if (!lb) { fail(`${tag}: BASE cannot load its own save`); return; }
  if (noLedger(lh) !== noLedger(lb)) fail(`${tag}: the head's load differs from BASE's beyond the ledger (first key ${firstDiff(noLedger(lh), noLedger(lb))})`);
  const s2 = saveOf(H, lh), again = loadOf(H, s2);
  if (!again || JSON.stringify(again) !== JSON.stringify(lh)) fail(`${tag}: a second save and load is not byte equal`);
  const before = new Set((H.wr.readWorldRoster(lb)?.records ?? []).map(r => r.player.name));
  const gone = new Set(lb.goneNames ?? []);
  const back = loadOf(B, s2);
  if (!back) fail(`${tag}: BASE's engine cannot load the save the head wrote`);
  for (const line of aiLines(lb)) {
    if (!gone.has(line.name) || before.has(line.name)) continue;
    const atBuyer = H.cm.worldRosterFor(lh, line.to).some(p => p.n === line.name);
    const atSeller = H.cm.worldRosterFor(lh, line.from).some(p => p.n === line.name);
    if (atBuyer && !atSeller) tally.mended += 1; else { tally.unmended += 1; if (tally.unmended <= 12) console.log(`  unmended ${tag}: ${line.name} ${line.from} -> ${line.to} (atBuyer ${atBuyer}, atSeller ${atSeller})`); }
    if (atBuyer && back) { if (B.cm.worldRosterFor(back, line.to).some(p => p.n === line.name)) tally.roundtrip += 1; else fail(`${tag}: BASE reading the head's save loses ${line.name} at ${line.to}`); }
  }
}
function checkUnseeded(tag, seededStr, seed) {
  tally.unseeded += 1;
  const lb0 = loadOf(B, seededStr);
  const st = JSON.parse(JSON.stringify(lb0)); delete st.worldSeed; delete st.worldRoster; for (const p of st.squad) { delete p.worldRosterKey; delete p.worldRosterSince; }
  const str = saveOf(B, st);
  const lh = loadOf(H, str), lb = loadOf(B, str);
  if (!lh || !lb) { fail(`${tag}: unseeded load null (head ${!!lh}, base ${!!lb})`); return; }
  if (JSON.stringify(lh) !== JSON.stringify(lb)) { fail(`${tag}: unseeded load differs (first key ${firstDiff(JSON.stringify(lh), JSON.stringify(lb))})`); return; }
  let sh = lh, sb = lb;
  for (let i = 0; i < 80; i += 1) {
    for (const x of [sh, sb]) if (x.boardConfidence < 35) x.boardConfidence = 55;
    const rh = withSeed(seed * 31 + i, () => H.cm.playNextEntry(sh, OPT)), rb = withSeed(seed * 31 + i, () => B.cm.playNextEntry(sb, OPT));
    sh = rh.state; sb = rb.state;
    const a = saveOf(H, sh), b = saveOf(B, sb);
    if (a !== b) { fail(`${tag}: unseeded play differs at entry ${i} (${rh.kind}/${rb.kind}, first key ${firstDiff(a, b)})`); return; }
    tally.played += 1;
    if (rh.kind === 'seasonOver' || sh.sacked) break;
  }
  const league = B.cm.REAL_LEAGUES.find(l => B.cm.playableClubs(l.id).some(c => c.name === 'Napoli'))?.id;
  const open = { club: 'Napoli', league, tier: 1, season: lb.season, week: lb.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  if (lb.clubName === 'Napoli') return;
  const jh = withSeed(seed + 5, () => H.cal.joinClubNow({ ...lh, jobHunt: { open, cooldowns: [], sentSeason: lh.season, sent: 1, summerMove: null } }));
  const jb = withSeed(seed + 5, () => B.cal.joinClubNow({ ...lb, jobHunt: { open, cooldowns: [], sentSeason: lb.season, sent: 1, summerMove: null } }));
  if (!jh || !jb) return;
  tally.joins += 1;
  if (JSON.stringify(jh) !== JSON.stringify(jb)) fail(`${tag}: an unseeded job move differs (first key ${firstDiff(JSON.stringify(jh), JSON.stringify(jb))})`);
}
for (const club of clubs) for (const seed of [11, 12]) {
  const tag0 = `${club} seed ${seed}`;
  try {
    let s = withSeed(seed, () => B.cm.startCareer(club, 'now'));
    if (B.cm.worldSeedOf(s) === undefined) { fail(`${tag0}: BASE's new career has no seed`); continue; }
    const points = [['opening', saveOf(B, s)]];
    let jan = false, n = 0;
    ({ s } = playTo(B, s, seed, r => { if (r.kind === 'window') jan = true; return jan && (n += 1) > 2; }));
    points.push(['january1', saveOf(B, s)]);
    ({ s } = playTo(B, s, seed + 1, () => false));
    if (s.sacked) { console.log(`${tag0}: sacked in season 1`); }
    else {
      s = withSeed(seed + 2, () => B.cm.startNextSeason(B.cm.finishSeason(s).state));
      points.push(['summer2', saveOf(B, s)]);
      jan = false; n = 0;
      ({ s } = playTo(B, s, seed + 3, r => { if (r.kind === 'window') jan = true; return jan && (n += 1) > 2; }));
      points.push(['january2', saveOf(B, s)]);
    }
    for (const [at, str] of points) { checkSeeded(`${tag0} ${at}`, str); checkUnseeded(`${tag0} ${at} unseeded`, str, seed * 100 + points.length); }
  } catch (e) { fail(`${tag0}: threw ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
}
console.log(`tally ${JSON.stringify(tally)}`);
if (!tally.seeded || !tally.unseeded || !tally.played) { console.log('oldsaves: measured nothing'); process.exit(2); }
console.log(fails ? `oldsaves: RED, ${fails} failure(s)` : `oldsaves: green (${tally.seeded} seeded BASE saves loaded by the head, ${tally.mended} men mended, ${tally.unmended} left; ${tally.unseeded} unseeded saves byte equal over ${tally.played} entries, ${tally.joins} job moves)`);
process.exit(fails ? 1 : 0);
