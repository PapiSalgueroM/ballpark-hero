// Round 1052 recorder (never committed). Run from the repo root of the tree to photograph:
//   node recordBase1052.mjs <outDir> [save]
// Writes into <outDir>:
//   cmOldSave1052Fixture.json   (only with "save") one real save: Sevilla, seed 1052, four league weeks left in season one
//   nationBars.json             nationBars('now'): each country's call up bar
//   worldCounts.json            clubs, leagues, nations, men, nations among the men, and the save's own numbers
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const OUT = path.resolve(process.argv[2]);
const SAVE = process.argv[3] === 'save';
fs.mkdirSync(OUT, { recursive: true });
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'rec1052-'));
const entry = path.join(TMP, 'entry.mjs');
const out = path.join(TMP, 'engine.mjs');
fs.writeFileSync(entry, `export * from '${ROOT_FWD}/src/lib/clubManager.ts';\nexport * as __intl from '${ROOT_FWD}/src/lib/clubManagerInternationals.ts';\nexport * as __world from '${ROOT_FWD}/src/data/clubManagerWorldRosters.ts';\nexport * as __nat from '${ROOT_FWD}/src/data/playerNationalities.ts';\n`);
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
  alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
  plugins: [{
    name: 'rec', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
      b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline recorder"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "offline";', loader: 'js' }));
    },
  }],
});
const cm = await import(pathToFileURL(out).href);

/* the call up bars, as the engine computes them for today's world */
const bars = Object.fromEntries([...cm.__intl.nationBars(undefined)].sort((a, b) => a[0].localeCompare(b[0])));
fs.writeFileSync(path.join(OUT, 'nationBars.json'), JSON.stringify(bars, null, 1) + '\n');

const men = Object.values(cm.__world.CM_WORLD_ROSTERS).reduce((s, l) => s + l.length, 0);
const nats = new Set();
for (const l of Object.values(cm.__world.CM_WORLD_ROSTERS)) for (const p of l) { const n = cm.__nat.nationalityOf(undefined, p.n); if (n) nats.add(n); }
const counts = { clubs: cm.REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0), leagues: cm.REAL_LEAGUES.length, nations: cm.NATIONS.length, men, nationsAmongMen: nats.size };

if (SAVE) {
  Math.random = seeded(hashKey('oldsave|1052'));
  let s = cm.startCareer('Sevilla', 'now');
  const leagueLeft = st => st.calendar.slice(st.week).filter(e => e.type === 'league').length;
  let guard = 0;
  while (leagueLeft(s) > 4) {
    s.boardConfidence = 100;
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked || ++guard > 200) throw new Error(`the season ended or stuck before four league weeks were left (${r.kind}, sacked ${s.sacked}, guard ${guard})`);
  }
  Math.random = REAL_RANDOM;
  store.clear();
  if (!cm.saveCareer(s)) throw new Error('saveCareer refused');
  const raw = store.get(cm.SAVE_KEY);
  if (!raw) throw new Error('nothing under the save key');
  fs.writeFileSync(path.join(OUT, 'cmOldSave1052Fixture.json'), raw);
  const parsed = JSON.parse(raw);
  counts.save = { club: parsed.clubName, season: parsed.season, week: parsed.week, leagueWeeksLeft: leagueLeft(parsed), bytes: Buffer.byteLength(raw), worldLeagues: Object.keys(parsed.world ?? {}).length, squad: parsed.squad?.length ?? null };
  /* it loads back as itself */
  const back = cm.loadCareer();
  counts.save.loadsBackAs = back?.clubName ?? null;
}
fs.writeFileSync(path.join(OUT, 'worldCounts.json'), JSON.stringify(counts, null, 1) + '\n');
console.log(JSON.stringify(counts));
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
