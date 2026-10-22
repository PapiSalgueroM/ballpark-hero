/* Review probe (Round 1520, run lens): countNations breaks count ties with String.localeCompare, whose order follows
   the viewer's locale. For every place of every world, re-sort the abroad list under other locales and count the
   places whose order changes, then the share of 5000 made up names per such place that draw a different country. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-loc-'));
fs.writeFileSync(path.join(work, 'e.ts'), [`export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts'))};`,
  `export * as nat from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManagerMadeUpNations.ts'))};`].join('\n'));
await build({ entryPoints: [path.join(work, 'e.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'b.cjs'),
  logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
const { cm, nat } = createRequire(import.meta.url)(path.join(work, 'b.cjs'));
await cm.ensureAllEraRosters();
console.log(`runner default locale: ${new Intl.Collator().resolvedOptions().locale}`);
const seen = new Map();
for (const era of cm.CM_ERAS.map(e => e.id)) {
  for (const lg of era === 'now' ? cm.REAL_LEAGUES : cm.eraLeaguesFor(era)) {
    for (const club of lg.clubs) {
      const place = cm.careerPlace({ clubName: club, eraId: era === 'now' ? undefined : era });
      if (!place) continue;
      const key = `${era}|${place.league}|${place.home}`;
      if (seen.has(key)) continue;
      const count = cm.nationCountsAt(place, era === 'now' ? undefined : era);
      if (count) seen.set(key, { place, count });
    }
  }
}
const names = Array.from({ length: 5000 }, (_, i) => `Probe Man ${i}`);
for (const loc of ['et', 'lt', 'sv', 'da', 'tr', 'cs', 'is']) {
  const coll = new Intl.Collator(loc);
  let moved = 0, drawsMoved = 0, worst = '';
  for (const [key, { place, count }] of seen) {
    const other = { ...count, abroad: [...count.abroad].sort((a, b) => b[1] - a[1] || coll.compare(a[0], b[0])) };
    if (other.abroad.every((x, i) => x[0] === count.abroad[i][0])) continue;
    moved += 1;
    let d = 0;
    for (const n of names) if (nat.drawNation(n, place.home, count) !== nat.drawNation(n, place.home, other)) d += 1;
    drawsMoved += d;
    if (!worst) { const i = other.abroad.findIndex((x, j) => x[0] !== count.abroad[j][0]); worst = `${key}: ${count.abroad[i][0]} / ${other.abroad[i][0]} at count ${count.abroad[i][1]}, ${d} of 5000 names draw differently`; }
  }
  console.log(`locale ${loc}: ${moved} of ${seen.size} places order their foreign countries differently; ${drawsMoved} draws of ${moved * 5000} differ${worst ? `; e.g. ${worst}` : ''}`);
}
console.log('review-locale: done');
