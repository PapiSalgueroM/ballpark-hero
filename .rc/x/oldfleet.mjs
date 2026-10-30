/* Reviewer probe (round 1601, runner lens): saves MADE BY THE BASE COMMIT's engine, loaded and played on the head.
 * For each old save: the head's load holds neither new key and equals the base's load byte for byte; then both arms
 * play forward on one seeded stream with the clock pinned (a parked review first rolls its summer), and the head's
 * whole save minus pastLines and pastFrom equals the base's after every entry, season end and summer, with the same
 * draw count. On the head: pastFrom is the first season ended on the head, rows are of that season only, every man
 * with a game holds one, and the card's kept from line follows the rule.
 * Run: OLD_BASE=/tmp/obase node .rc/x/oldfleet.mjs   Exit 0 green, 1 red, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OLD = process.env.OLD_BASE;
const SEEDS = Number(process.env.OLD_SEEDS ?? 3);
if (!OLD || !fs.existsSync(path.join(OLD, 'src/lib/clubManager.ts'))) { console.log('oldfleet: COULD NOT RUN, no OLD_BASE'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oldfleet-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const cardsFile = 'src/lib/clubManagerCards.ts';
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\n` + (fs.existsSync(path.join(root, cardsFile)) ? `export * as cards from ${P(cardsFile)};\n` : 'export const cards = null;\n'));
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return mod;
}
function seeded(seed) {
  let a = seed >>> 0; let calls = 0;
  const d = () => { calls += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  d.calls = () => calls; return d;
}
const NOW = 1791302400000;
function onStream(seed, fn) {
  const d = seeded(seed); const r = Math.random; const n = Date.now;
  Math.random = d; Date.now = () => NOW;
  try { return fn(d); } finally { Math.random = r; Date.now = n; }
}
const sha = t => createHash('sha256').update(t).digest('hex').slice(0, 20);
const strip = s => { const { pastLines, pastFrom, ...rest } = s; void pastLines; void pastFrom; return JSON.stringify(rest); };
const nudge = s => (s.boardConfidence < 35 ? { ...s, boardConfidence: 55 } : s);
const wake = (mod, s) => { mod.cm.registerCustomClub?.(s.customClub ?? null, s.eraId); mod.cm.registerLeagueOverrides?.(s.leagueOverrides ?? null); return s; };
const fails = []; let checks = 0;
const fail = m => { fails.push(m); if (fails.length <= 25) console.log(`  FAIL ${m}`); };
function entries(mod, s, n, faces, d, tag) {
  for (let k = 0; k < n && s.week < s.calendar.length && !s.sacked; k++) {
    const r = mod.cm.playNextEntry(nudge(s), { skipHalftime: true });
    s = r.state; faces.push(`${tag}:${k} ${sha(strip(s))}|${d.calls()}`);
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const head = await engine('head', ROOT);
const base = await engine('base', OLD);
const CLUBS = [['Everton', 'now'], ['Real Madrid', 'now'], ['Lincoln City', 'now'], ['Hertha BSC', 'now'], ['Arsenal', 'era2010'], ['Liverpool', 'now']];
let saves = 0, rowsSeen = 0, parkedSeen = 0;
for (let k = 0; k < SEEDS; k++) for (const [club, era] of CLUBS) {
  const seed = (0x0ff1601 + k * 104729 + club.length * 977) >>> 0;
  /* The old saves, made on the base engine: mid season 1, parked on review 1, season 2 eight entries in, parked on review 2. */
  let olds;
  try {
    olds = onStream(seed, d => {
      const out = [];
      let s = base.cm.startCareer(club, era);
      s = entries(base, s, 12, [], d, 'mk'); out.push(['mid1', JSON.stringify(s)]);
      s = entries(base, s, 400, [], d, 'mk'); if (s.sacked) return out;
      let fin = base.cm.finishSeason(s).state; out.push(['parked1', JSON.stringify(fin)]);
      s = entries(base, base.cm.startNextSeason(fin), 8, [], d, 'mk'); if (s.sacked) return out; out.push(['mid2', JSON.stringify(s)]);
      s = entries(base, s, 400, [], d, 'mk'); if (s.sacked) return out;
      fin = base.cm.finishSeason(s).state; out.push(['parked2', JSON.stringify(fin)]);
      return out;
    });
  } catch (e) { console.log(`  skip ${club}: ${String(e?.message ?? e).slice(0, 100)}`); continue; }
  for (const [tag, raw] of olds) {
    const who = `${club} ${era} seed ${k} ${tag}`;
    saves += 1;
    const load = mod => { store.clear(); store.set(mod.cm.SAVE_KEY, raw); return mod.cm.loadCareer(); };
    const lh = onStream(seed + 1, () => load(head)); const lb = onStream(seed + 1, () => load(base));
    checks += 1;
    if (!lh || !lb) { fail(`${who}: did not load (head ${!!lh}, base ${!!lb})`); continue; }
    if ('pastLines' in lh || 'pastFrom' in lh) fail(`${who}: the head's load wrote a new key`);
    if (JSON.stringify(lh) !== JSON.stringify(lb)) fail(`${who}: the head's load is not the base's load`);
    if (lh.pendingSummary) {
      parkedSeen += 1;
      const c = head.cards.playerCardOf(wake(head, lh), { k: 'mine', id: lh.squad[0].id });
      const kept = c?.notes.find(n => n.k === 'keptfrom');
      checks += 1;
      if (c?.past.length) fail(`${who}: a parked old save shows kept seasons`);
      if (!kept || kept.from !== lh.season + 1) fail(`${who}: parked on season ${lh.season} review, the kept from line reads ${JSON.stringify(kept)}`);
    }
    const play = (mod, s0) => onStream(seed + 2, d => {
      const faces = []; let s = s0; let firstEnd = null; let fin = null;
      if (s.pendingSummary) { s = mod.cm.startNextSeason(s); faces.push(`summer0 ${sha(strip(s))}|${d.calls()}`); }
      s = entries(mod, s, 400, faces, d, 'a');
      if (!s.sacked) {
        fin = mod.cm.finishSeason(s).state; firstEnd = s.season; faces.push(`end ${sha(strip(fin))}|${d.calls()}`);
        s = mod.cm.startNextSeason(fin); faces.push(`summer ${sha(strip(s))}|${d.calls()}`);
        s = entries(mod, s, 6, faces, d, 'b');
      }
      return { faces, fin, firstEnd, last: s, before: null };
    });
    const ph = play(head, JSON.parse(JSON.stringify(lh))); const pb = play(base, JSON.parse(JSON.stringify(lb)));
    checks += 1;
    const at = ph.faces.findIndex((f, i) => f !== pb.faces[i]);
    if (at >= 0 || ph.faces.length !== pb.faces.length) fail(`${who}: the head left the base's stream at face ${at} of ${ph.faces.length}/${pb.faces.length} (${ph.faces[at]} vs ${pb.faces[at]})`);
    if (!ph.fin) continue;
    checks += 1;
    if (ph.fin.pastFrom !== ph.firstEnd) fail(`${who}: pastFrom ${ph.fin.pastFrom}, the first season ended on the head was ${ph.firstEnd}`);
    for (const e of ph.fin.pastLines ?? []) { rowsSeen += 1; if (e[1].length !== 1 || e[1][0][0] !== ph.firstEnd) fail(`${who}: ${e[0]} holds ${JSON.stringify(e[1])}`); }
    const card = head.cards.playerCardOf(wake(head, ph.last), { k: 'mine', id: ph.last.squad[0].id });
    const first = Math.min(ph.last.season, ...ph.last.history.map(h => h.season));
    const kept = card?.notes.find(n => n.k === 'keptfrom');
    checks += 1;
    if (first < ph.firstEnd ? kept?.from !== ph.firstEnd : kept) fail(`${who}: after the head's first season end the kept from line reads ${JSON.stringify(kept)} (career from ${first}, kept from ${ph.firstEnd})`);
  }
}
console.log(`oldfleet: ${saves} old saves made on the base engine (${parkedSeen} parked on review), ${rowsSeen} entries written on the head, ${checks} checks, ${fails.length} failed`);
console.log(fails.length ? `oldfleet: RED, ${fails.length} failures` : 'oldfleet: green');
process.exit(fails.length ? 1 : 0);
