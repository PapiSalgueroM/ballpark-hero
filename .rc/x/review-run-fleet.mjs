// Review (run lens) of Round 1212: old saves and the one press season, over a fleet, tree against tree.
//   node .rc/x/review-run-fleet.mjs play <root> <out.json>            fresh careers to retirement, a hash a season
//   node .rc/x/review-run-fleet.mjs make <root> <out.json>            saves part way through a career (what a player holds today)
//   node .rc/x/review-run-fleet.mjs cont <root> <saves.json> <out.json>  each save played four more seasons with a generator of its own
//   node .rc/x/review-run-fleet.mjs view <root> <saves.json> <out.json>  every saved line opened in the Season Center of <root>
//   node .rc/x/review-run-fleet.mjs same <a.json> <b.json> <label>     byte compare of two outputs (exit 1 when they differ)
// The engine and the binding are bundled from <root> (a git worktree INSIDE the checkout, so node_modules resolves by walk-up).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const [mode, a1, a2, a3] = process.argv.slice(2);
const sha = v => createHash('sha1').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

if (mode === 'same') {
  const A = fs.readFileSync(a1, 'utf8'); const B = fs.readFileSync(a2, 'utf8');
  if (A === B) { console.log(`SAME ${a3}: ${A.length} bytes, sha ${sha(A)}`); process.exit(0); }
  const ja = JSON.parse(A); const jb = JSON.parse(B);
  const keys = [...new Set([...Object.keys(ja), ...Object.keys(jb)])];
  const diff = keys.filter(k => JSON.stringify(ja[k]) !== JSON.stringify(jb[k]));
  console.log(`first differing careers: ${diff.slice(0, 8).join(', ')}`);
  for (const k of diff.slice(0, 2)) {
    const x = ja[k]?.hashes ?? []; const y = jb[k]?.hashes ?? [];
    const at = x.findIndex((h, i) => h !== y[i]);
    console.log(`  ${k}: seasons ${x.length} against ${y.length}, first differing season index ${at}`);
    if (ja[k]?.final && jb[k]?.final) {
      const ca = JSON.parse(ja[k].final); const cb = JSON.parse(jb[k].final);
      const fields = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].filter(f => JSON.stringify(ca[f]) !== JSON.stringify(cb[f]));
      console.log(`  ${k}: differing fields of the final save: ${fields.slice(0, 12).join(', ')}`);
    }
  }
  console.log(`DIFFERENT ${a3}: ${diff.length} of ${keys.length} careers differ`);
  process.exit(1);
}

const ROOT = path.resolve(a1);
const has = f => fs.existsSync(path.join(ROOT, f));
const centre = has('src/lib/season/mlb.ts');
const BUNDLE = path.join(os.tmpdir(), `review-run-fleet-${process.pid}.mjs`);
await build({
  stdin: {
    contents: [
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
      ...(centre ? [
        "export { MLB_SEASON } from './src/lib/season/mlb.ts';",
        "export { buildUsSeason, usPlayoffPath } from './src/lib/season/us.ts';",
        "export { deriveSeasonOrWhy } from './src/lib/season/core.ts';",
      ] : []),
    ].join('\n'), resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __rq } from 'node:module'; const require = __rq(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(BUNDLE).href);
try { fs.unlinkSync(BUNDLE); } catch { /* a copy */ }
const SB = M.MLB_CAREER_SPORT;
const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
const ERAS = ['now', 'y2004'];
const SEEDS = Number(process.env.FLEET_SEEDS || 20);

/** The fleet's loop (scripts/lib/usSeasonFleet.mjs), with a choice of event option so more cards are taken. */
function seasons(c, tq, rng, most, pick, onSeason) {
  const real = Math.random;
  Math.random = rng;
  try {
    for (let n = 0; n < most && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); onSeason?.(c); continue; }
      if (c.contractYears <= 0) {
        const fa = SB.buildFaWindow(c, tq, rng);
        const offer = fa.offers.find(o => !o.gone) ?? fa.offers[0];
        if (offer) { M.applyFaSigning(c, offer); SB.campBattle(c, offer.quality, rng); tq = offer.quality; }
      }
      SB.campBattle(c, tq, rng);
      SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      onSeason?.(c);
      if (SB.shouldRetire(c)) { c.retired = true; break; }
      const ev = SB.drawEvent(c, rng);
      if (ev && ev.options.length) ev.options[pick(n, ev.options.length)].apply(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
  return tq;
}
function start(i, pos, eraId) {
  const rng = mulberry32(i * 7919 + 1212);
  const real = Math.random;
  Math.random = rng;
  try {
    const archs = SB.create.archetypes[pos];
    const c = SB.startCareer(`Fleet ${pos} ${eraId} ${i}`, pos, archs[i % archs.length], rng, null, eraId);
    const tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    return { c, tq, rng };
  } finally { Math.random = real; }
}
const each = fn => { for (const eraId of ERAS) for (const pos of POSITIONS) for (let i = 0; i < SEEDS; i += 1) fn(`${eraId}|${pos}|${i}`, i, pos, eraId); };
const write = (file, out) => { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out)); };

if (mode === 'play') {
  const out = {};
  let n = 0;
  each((id, i, pos, eraId) => {
    const { c, tq, rng } = start(i, pos, eraId);
    const hashes = [];
    seasons(c, tq, rng, 34, () => 0, cc => hashes.push(sha(cc)));
    out[id] = { hashes, final: JSON.stringify(c) };
    n += hashes.length;
  });
  write(a2, out);
  console.log(`play ${ROOT}: ${Object.keys(out).length} careers, ${n} seasons, sha ${sha(JSON.stringify(out))}`);
}

if (mode === 'make') {
  const out = {};
  let n = 0;
  each((id, i, pos, eraId) => {
    const { c, tq, rng } = start(i, pos, eraId);
    const depth = 1 + ((i * 5 + pos.length) % 14);
    const tqNow = seasons(c, tq, rng, depth, (k, len) => (i + k) % len);
    if (c.retired) return;
    out[id] = { save: JSON.stringify(c), tq: tqNow };
    n += c.seasons.length;
  });
  write(a2, out);
  console.log(`make ${ROOT}: ${Object.keys(out).length} saves still playing, ${n} saved lines, sha ${sha(JSON.stringify(out))}`);
}

if (mode === 'cont') {
  const saves = JSON.parse(fs.readFileSync(a2, 'utf8'));
  const out = {};
  let n = 0;
  Object.keys(saves).forEach((id, at) => {
    const c = JSON.parse(saves[id].save);
    const before = c.seasons.length;
    const hashes = [];
    seasons(c, saves[id].tq, mulberry32(at * 104729 + 77), 4, (k, len) => (at + k) % len, cc => hashes.push(sha(cc)));
    out[id] = { hashes, final: JSON.stringify(c) };
    n += c.seasons.length - before;
  });
  write(a3, out);
  console.log(`cont ${ROOT}: ${Object.keys(out).length} saves, ${n} more seasons, sha ${sha(JSON.stringify(out))}`);
}

if (mode === 'view') {
  if (!centre) { console.log('view: this tree has no MLB Season Center'); process.exit(2); }
  const saves = JSON.parse(fs.readFileSync(a2, 'utf8'));
  const count = {}; const bump = k => { count[k] = (count[k] ?? 0) + 1; };
  const problems = [];
  const bad = msg => { if (problems.length < 40) problems.push(msg); bump('PROBLEMS'); };
  const heldWords = {};
  for (const id of Object.keys(saves)) {
    const c = JSON.parse(saves[id].save);
    for (const row of c.seasons) {
      bump('lines');
      const where = `${id} ${row.year} ${row.team}`;
      let b;
      try { b = M.buildUsSeason(M.MLB_SEASON, c, row, SB.teamLabelOf); } catch (e) { bad(`${where}: the build threw ${e.message}`); continue; }
      const hub = SB.seasonCentreHeld?.(row.year, c.eraId, { pos: c.pos, team: row.team }) ?? null;
      if (!b.ok) {
        bump(b.why);
        if (b.why === 'held') {
          const kind = b.line.replace(/\d{4}/g, 'YYYY').replace(/your club .*?, and the/, 'your club ..., and the').slice(0, 90);
          heldWords[kind] = (heldWords[kind] ?? 0) + 1;
          if (hub !== b.line) bad(`${where}: the hub says ${JSON.stringify(hub)}, the viewer says ${JSON.stringify(b.line)}`);
        } else if (hub !== null && row.teamResult !== 'SUSPENDED' && row.games > 0) bad(`${where}: the hub holds a season the build calls ${b.why}`);
        continue;
      }
      if (hub !== null) bad(`${where}: the hub holds a season the viewer lays out: ${hub}`);
      let s;
      try { s = M.deriveSeasonOrWhy(b.sport, row, b.ctx); } catch (e) { bad(`${where}: the derive threw ${e.message}`); continue; }
      if (typeof s === 'string') { bump('refused'); bump(`refused: ${s.slice(0, 60)}`); continue; }
      bump('derived');
      if (b.ctx.shape) bump('named'); else bump('unnamed');
      const on = s.games.filter(g => g.played);
      const sum = k => on.reduce((t, g) => t + (g.line[k] ?? 0), 0);
      if (s.games.length !== 162) bad(`${where}: ${s.games.length} games laid out`);
      if (on.length !== row.games) bad(`${where}: ${on.length} games played, the line says ${row.games}`);
      for (const k of ['hr', 'rbi', 'sb', 'doubles']) if (typeof row[k] === 'number' && sum(k) !== row[k]) bad(`${where}: ${k} ${sum(k)} against ${row[k]}`);
      if (Math.round((sum('h') / Math.max(1, sum('ab'))) * 1000) !== Math.round(row.avg * 1000)) bad(`${where}: ${sum('h')} for ${sum('ab')} is not ${row.avg}`);
      for (const g of s.games) {
        if (g.us === g.them) bad(`${where}: game ${g.md} level`);
        const runs = side => g.events.filter(e => e.kind === 'inning' && e.side === side).reduce((t, e) => t + (e.pts ?? 0), 0);
        if (runs('us') !== g.us || runs('them') !== g.them) bad(`${where}: game ${g.md} innings ${runs('us')}-${runs('them')} against ${g.us}-${g.them}`);
        if (g.played && ((g.line.rbi ?? 0) > g.us || (g.line.hr ?? 0) > (g.line.rbi ?? 0) || (g.line.h ?? 0) > (g.line.ab ?? 0) || (g.line.h ?? 0) < (g.line.hr ?? 0) + (g.line.doubles ?? 0))) bad(`${where}: game ${g.md} line ${JSON.stringify(g.line)} in a ${g.us}-${g.them} game`);
        if (!g.played && Object.keys(g.line).length) bad(`${where}: game ${g.md} missed with a line`);
      }
      const again = M.deriveSeasonOrWhy(M.buildUsSeason(M.MLB_SEASON, JSON.parse(JSON.stringify(c)), JSON.parse(JSON.stringify(row)), SB.teamLabelOf).sport, row, b.ctx);
      if (JSON.stringify(again) !== JSON.stringify(s)) bad(`${where}: a second open of the same saved line differs`);
      let p = null;
      try { p = M.usPlayoffPath(M.MLB_SEASON, row, b.ctx, b.key); } catch (e) { bad(`${where}: the path threw ${e.message}`); }
      if (p) { bump('path'); if (row.year < 2022) bad(`${where}: a path before 2022`); }
      if (row.year === 2020) bad(`${where}: a 2020 season laid out`);
    }
  }
  write(a3, { count, heldWords, problems });
  console.log(JSON.stringify(count));
  console.log(JSON.stringify(heldWords));
  for (const p of problems.slice(0, 12)) console.log(`PROBLEM ${p}`);
  console.log(`view ${ROOT} of ${a2}: ${count.lines ?? 0} saved lines, ${count.derived ?? 0} derived, ${count.held ?? 0} held, ${count.refused ?? 0} refused, ${count.empty ?? 0} empty, ${count.PROBLEMS ?? 0} problems`);
  process.exit(count.PROBLEMS ? 1 : 0);
}
