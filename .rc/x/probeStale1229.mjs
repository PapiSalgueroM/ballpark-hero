/* Round 1229 review (lens RUN): can the book tell that it missed a week?
 * A career with a lawful book is played ten entries on the candidate, then THREE entries by the base commit's
 * engine (a tab left open on the build before the round, or a release rolled back for a day), then handed
 * back to the candidate. The base engine knows no book and carries it along untouched. Question: does the
 * candidate's careful reader (leagueBookOf) still call that book readable, and does the first law hold?
 * Prints what it finds; exits 0 always (this is a measurement for the reviewer's report, not a gate). */
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = path.resolve(process.env.PROBE_BASE || '/tmp/base1229s');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stale1229-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const has = f => fs.existsSync(path.join(root, f));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    has('src/lib/clubManagerLeagueBook.ts') ? `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};` : 'export const book = null;',
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  const m = await import(pathToFileURL(out).href);
  await m.cm.ensureAllEraRosters();
  return { cm: m.cm, book: m.book };
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cand = await engine('cand', ROOT);
const base = await engine('base', BASE);
const wake = (mod, s) => { mod.cm.registerCustomClub(s.customClub ?? null, s.eraId); mod.cm.registerLeagueOverrides(s.leagueOverrides ?? null); return s; };
function lawOf(s) {
  const book = cand.cm.leagueBookOf(wake(cand, s));
  if (!book) return { readable: false };
  let off = 0;
  let missing = 0;
  for (const row of s.table) {
    if (row.club === s.clubName) continue;
    const g = cand.book.bookClubGoals(book, row.club);
    if (g.rows + g.og + g.u !== row.gf) { off += 1; missing += row.gf - (g.rows + g.og + g.u); }
  }
  return { readable: true, clubsOff: off, goalsMissing: missing };
}
const R = Math.random;
const N = Date.now;
Math.random = seeded(0x57a1e);
Date.now = () => 1791302400000;
try {
  for (const club of ['Arsenal', 'Bayern Munich']) {
    let s = cand.cm.startCareer(club, 'now');
    for (let k = 0; k < 10; k++) s = cand.cm.playNextEntry(s, { skipHalftime: true }).state;
    const before = lawOf(s);
    const stamp = s.leagueBook.s;
    const bytes = JSON.stringify(s.leagueBook).length;
    /* Three entries on the engine before the round. */
    let old = wake(base, JSON.parse(JSON.stringify(s)));
    for (let k = 0; k < 3; k++) old = base.cm.playNextEntry(old, { skipHalftime: true }).state;
    const carried = old.leagueBook ? JSON.stringify(old.leagueBook).length : 0;
    const back = lawOf(JSON.parse(JSON.stringify(old)));
    /* And one more entry on the candidate: does the match week write into it again? */
    let again = wake(cand, JSON.parse(JSON.stringify(old)));
    again = cand.cm.playNextEntry(again, { skipHalftime: true }).state;
    const after = lawOf(again);
    console.log(`${club}: after ten entries on the candidate the book is readable ${before.readable}, clubs off ${before.clubsOff}; three entries on the base engine carry it (${bytes} bytes before, ${carried} after, stamp ${old.leagueBook?.s === stamp ? 'unchanged' : 'changed'}); back on the candidate the reader says readable ${back.readable}, with ${back.clubsOff} rival clubs whose rows no longer add up and ${back.goalsMissing} goals on no line of the book; one entry later readable ${after.readable}, clubs off ${after.clubsOff}, goals missing ${after.goalsMissing}`);
  }
} finally {
  Math.random = R;
  Date.now = N;
}
console.log('probeStale1229: done (a measurement, never a gate)');
