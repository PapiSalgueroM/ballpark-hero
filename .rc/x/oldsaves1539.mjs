/* Round 1539 review (runner lens), one shot, never committed. Run from the repo root on a runner.
 * OLD SAVES: saves made with the BASE lib (268e3b97, the round's starting commit) are loaded on the head lib and
 * settled for a trip away the way the hook does it (pay first, then floor(awaySecondsOf / AWAY_MATCHDAY_SEC)
 * matchdays through playAwayMatchdays on a seeded stream).
 *   L  load: deserializeTycoon of every base save is byte identical (JSON) on base and head.
 *   P  pay: offlineEarnings identical on base and head for every trip.
 *   W  whole hour trips of 1 to 6 hours (and every trip under 28 minutes): head and base play the same count, and
 *      the settled state, results and events are byte identical (the default path the brief promises unchanged).
 *   K  every other trip: head plays exactly min(floor(capped / 1680), playable); its run cut to the base's count is
 *      byte identical to the base's run on the same rolls (prefix), and it plays at most two more.
 *   F  the final never plays away on head: after the trip matchday <= matchdays - 1, and a no perk 8 hour night from
 *      matchday 0 of a ten club season leaves exactly the final (left 1).
 *   R  rollback: a save settled on head loads byte identical on base and head.
 * Exit 0 all hold, 1 any fails, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE_SHA = process.env.BASE_SHA || '268e3b97';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsaves1539-'));
async function bundle(name, contents) {
  const out = path.join(temp, `${name}.mjs`);
  await build({
    stdin: { contents, resolveDir: path.join(ROOT, 'src/lib'), loader: 'ts', sourcefile: `${name}.ts` },
    bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  });
  return import(pathToFileURL(out).href);
}
let baseSrc, headSrc;
try {
  baseSrc = execSync(`git show ${BASE_SHA}:src/lib/stadiumTycoon.ts`, { maxBuffer: 1 << 26 }).toString();
  headSrc = fs.readFileSync(path.join(ROOT, 'src/lib/stadiumTycoon.ts'), 'utf8');
} catch (e) { console.log(`oldsaves1539 ABORTED: ${e.message}`); process.exit(2); }
const B = await bundle('base', baseSrc);
const H = await bundle('head', headSrc);
if (B.AWAY_MATCHDAY_SEC !== 1800 || H.AWAY_MATCHDAY_SEC !== 1680) { console.log(`oldsaves1539 ABORTED: clocks ${B.AWAY_MATCHDAY_SEC} and ${H.AWAY_MATCHDAY_SEC}`); process.exit(2); }

function mulberry(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const J = x => JSON.stringify(x);
const fails = { L: [], P: [], W: [], K: [], F: [], R: [] };
const counts = { saves: 0, trips: 0, whole: 0, same: 0, gained: {}, finalWaiting8h: 0, night8h: 0 };

/* ---- the fleet, made with the base lib only ---- */
const T0 = Date.UTC(2026, 9, 1);
const saves = [];
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/tycoonSaves.json'), 'utf8'));
for (const e of corpus.entries) if (e.key === 'stadium' || /stadium|tycoon/i.test(e.key)) saves.push({ name: `corpus ${e.name}`, raw: e.raw });
const tracks = B.TRACKS.map(t => t.id);
const N = Number(process.env.FLEET || 400);
for (let i = 0; i < N; i += 1) {
  const pick = mulberry(15390 + i);
  const division = Math.floor(pick() * B.DIVISIONS.length);
  const shape = B.leagueShape(division);
  const f = B.newTycoon(T0);
  const levels = { ...f.levels };
  for (const t of tracks) levels[t] = Math.floor(pick() * 40);
  const rep = Math.floor(pick() * 4);
  let s = {
    ...f, rep, levels, fanbase: 90 + Math.floor(pick() * 50000), money: Math.floor(pick() * 1e7),
    league: B.newLeague(rep, division, Math.floor(pick() * 5)), bestDivision: division,
    totalWins: Math.floor(pick() * 300), totalGoals: Math.floor(pick() * 900), streak: Math.floor(pick() * 12),
    legacyPerks: pick() < 0.4 ? { away: 1 + Math.floor(pick() * 2) } : {},
  };
  /* advance the season with the BASE away play, so the league state is one the base made */
  const adv = Math.floor(pick() * shape.matchdays);
  if (adv > 0) s = B.playAwayMatchdays(s, adv, mulberry(i * 7 + 3)).state;
  if (pick() < 0.15 && s.league) s = { ...s, league: { ...s.league, carryover: B.legacyOpponentName(s) } };
  s.minute = Math.floor(pick() * 90);
  B.settleFirsts(s, []);
  saves.push({ name: `fleet ${i} div ${division} md ${s.league?.matchday}`, raw: B.serializeTycoon(s, T0) });
}

/* the round's own promise: a ten club season at matchday 0, no perk, an 8 hour night (and longer) */
for (let d = 0; d < B.DIVISIONS.length; d += 1) {
  if (B.leagueShape(d).clubs !== 10) continue;
  const f = B.newTycoon(T0);
  const s = { ...f, levels: { ...f.levels, squad: 30 }, league: B.newLeague(0, d, 0), bestDivision: d };
  saves.push({ name: `night div ${d}`, raw: B.serializeTycoon(s, T0), night: true });
}

const GAPS = [0, 29, 30, 1679, 1680, 1799, 1800, 3359, 3360, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 27000, 28740, 28800, 30000, 36000, 43200, 50400];
for (const sv of saves) {
  counts.saves += 1;
  const LB = B.deserializeTycoon(sv.raw, T0);
  const LH = H.deserializeTycoon(sv.raw, T0);
  if (J(LB) !== J(LH)) { fails.L.push(sv.name); continue; }
  if (!LB) continue;
  const gaps = [...GAPS];
  const pg = mulberry(sv.raw.length);
  for (let k = 0; k < 6; k += 1) gaps.push(Math.floor(pg() * 14 * 3600));
  for (const gap of gaps) {
    counts.trips += 1;
    const now = T0 + gap * 1000;
    const tripB = { ...LB, savedAt: T0 }, tripH = { ...LH, savedAt: T0 };
    const payB = B.offlineEarnings(tripB, now), payH = H.offlineEarnings(tripH, now);
    if (payB !== payH) { fails.P.push(`${sv.name} ${gap}s pay ${payB} vs ${payH}`); continue; }
    const paidB = { ...LB, money: LB.money + Math.max(0, payB), lifetime: LB.lifetime + Math.max(0, payB), savedAt: now };
    const paidH = { ...LH, money: LH.money + Math.max(0, payH), lifetime: LH.lifetime + Math.max(0, payH), savedAt: now };
    const nB = Math.floor(B.awaySecondsOf(tripB, now) / B.AWAY_MATCHDAY_SEC);
    const nH = Math.floor(H.awaySecondsOf(tripH, now) / H.AWAY_MATCHDAY_SEC);
    const seed = gap + sv.raw.length;
    const rB = B.playAwayMatchdays(paidB, nB, mulberry(seed));
    const rH = H.playAwayMatchdays(paidH, nH, mulberry(seed));
    const playable = H.awayMatchdaysPlayable(paidH, 1e9);
    if (rH.results.length !== Math.min(nH, playable)) fails.K.push(`${sv.name} ${gap}s head played ${rH.results.length}, rule ${Math.min(nH, playable)}`);
    const whole = (gap % 3600 === 0 && gap >= 3600 && gap <= 21600) || gap < 1680;
    if (whole) {
      counts.whole += 1;
      if (J(rB) !== J(rH)) fails.W.push(`${sv.name} ${gap}s base ${rB.results.length} head ${rH.results.length}`);
    }
    const kB = rB.results.length, gain = rH.results.length - kB;
    counts.gained[gain] = (counts.gained[gain] ?? 0) + 1;
    if (gain === 0) counts.same += 1;
    if (gain < 0 || gain > 2) fails.K.push(`${sv.name} ${gap}s head minus base ${gain}`);
    const cut = H.playAwayMatchdays(paidH, kB, mulberry(seed));
    if (J(cut) !== J(rB)) fails.K.push(`${sv.name} ${gap}s head cut to ${kB} differs from base`);
    const lg = rH.state.league;
    if (lg && lg.matchday > H.leagueShape(lg.division).matchdays - 1) fails.F.push(`${sv.name} ${gap}s head played into the final (matchday ${lg.matchday})`);
    if (sv.night && gap >= 28800) {
      counts.night8h += 1;
      const left = H.leagueShape(lg.division).matchdays - lg.matchday;
      if (left === 1) counts.finalWaiting8h += 1; else fails.F.push(`${sv.name} ${gap}s no perk night left ${left}, not the final`);
    }
    const back = H.serializeTycoon(rH.state, now);
    if (J(B.deserializeTycoon(back, now)) !== J(H.deserializeTycoon(back, now))) fails.R.push(`${sv.name} ${gap}s`);
  }
}
fs.rmSync(temp, { recursive: true, force: true });
console.log(`oldsaves1539: ${counts.saves} base saves (${corpus.entries.length} corpus entries read), ${counts.trips} trips, ${counts.whole} whole hour or short trips`);
console.log(`  head minus base matchdays: ${J(counts.gained)}; no perk 8h+ nights from matchday 0 of a ten club season: ${counts.finalWaiting8h} of ${counts.night8h} leave exactly the final`);
let bad = 0;
for (const [k, v] of Object.entries(fails)) { console.log(`  ${k}: ${v.length} fail${v.length === 1 ? '' : 's'}${v.length ? `, first: ${v.slice(0, 3).join(' | ')}` : ''}`); bad += v.length; }
if (counts.saves < N || counts.whole === 0 || counts.night8h === 0) { console.log('oldsaves1539 ABORTED: the fleet is smaller than built'); process.exit(2); }
console.log(bad ? `oldsaves1539: RED, ${bad} failures` : 'oldsaves1539: green, every leg holds');
process.exit(bad ? 1 : 0);
