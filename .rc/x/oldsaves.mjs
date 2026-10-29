/* Review 1557 (run lens): old saves. Careers are played by an OLD tree's own engine and drive (main 5d1198389,
   the live code; and 1544's closing head 2413427460, whose saves can carry summers), then read by the old tree and
   by the head (cwd). Promise checked: a save with no medal reads exactly as it did (honours rows, earned badge ids
   in order, the case's trophy lines, rings); a save with medals reads as before plus one honours row and only the
   three new badges; the head's load repair leaves an old summer block untouched; NFL, MLB and NHL never move.
   Usage (repo root): node oldsaves.mjs <old tree dir>...   Exit 0 all held, 1 a break, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

/* OLD_HEAD names a mutated copy of the head for this probe's own negative control. */
const HEAD = process.env.OLD_HEAD || process.cwd();
const olds = process.argv.slice(2);
const N = Number(process.env.OLD_FLEET || 40);
const NEW_IDS = ['intl_medal', 'olympic_gold', 'world_cup_gold'];

async function load(dir, tag) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `oldsaves-${tag}-`));
  const has = f => fs.existsSync(path.join(dir, f));
  const lines = [
    `export { NBA_CAREER_SPORT } from '${dir}/src/lib/nbaCareerSport.ts';`,
    `export { NFL_CAREER_SPORT } from '${dir}/src/lib/nflCareerSport.ts';`,
    `export { MLB_CAREER_SPORT } from '${dir}/src/lib/mlbCareerSport.ts';`,
    `export { NHL_CAREER_SPORT } from '${dir}/src/lib/nhlCareerSport.ts';`,
    `export * as drive from '${dir}/src/test/helpers/usCareerDrive.ts';`,
    `export * as hub from '${dir}/src/lib/careerHub.ts';`,
  ];
  if (has('src/lib/nbaCareerIntl.ts')) lines.push(`export { NBA_CAREER_INTL } from '${dir}/src/lib/nbaCareerIntl.ts';`);
  fs.writeFileSync(path.join(tmp, 'entry.mjs'), lines.join('\n'));
  await build({
    entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'b.mjs'),
    logLevel: 'error', absWorkingDir: dir, alias: { '@': path.join(dir, 'src') }, jsx: 'automatic',
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
  });
  return import(`file://${path.join(tmp, 'b.mjs').replaceAll('\\', '/')}`);
}

const head = await load(HEAD, 'head');
let breaks = 0; let checks = 0;
const bad = msg => { breaks += 1; if (breaks <= 25) console.log(`  BREAK ${msg}`); };
const ok = (c, msg) => { checks += 1; if (!c) bad(msg); };
const read = (m, key, c) => {
  const s = m[key];
  return { honours: s.honours(c), earned: s.earnedBadges(c).map(b => b.id), lines: JSON.stringify(m.hub.trophyLines(c.seasons)), rings: s.ringsOf(c) };
};
const KEYS = ['NBA_CAREER_SPORT', 'NFL_CAREER_SPORT', 'MLB_CAREER_SPORT', 'NHL_CAREER_SPORT'];

/* the badge tables: NFL, MLB, NHL unchanged; NBA the old ids in the old order plus the three, before the closing five */
for (const dir of olds) {
  const old = await load(dir, path.basename(dir));
  const tag = path.basename(dir);
  for (const k of KEYS) {
    const a = old[k].badges.map(b => b.id); const b = head[k].badges.map(x => x.id);
    if (k !== 'NBA_CAREER_SPORT') ok(JSON.stringify(a) === JSON.stringify(b), `${tag} ${k}: the badge table moved`);
    else ok(JSON.stringify(b.filter(id => !NEW_IDS.includes(id))) === JSON.stringify(a) && b.length === a.length + 3, `${tag} NBA: the badge table is not the old one plus three (${a.length} to ${b.length})`);
  }
  const counts = { plain: 0, summersNoMedal: 0, medal: 0, repaired: 0 };
  for (const k of KEYS) {
    const sp = old[k];
    const positions = Object.keys(sp.create.archetypes);
    const modes = k === 'NBA_CAREER_SPORT' && old.NBA_CAREER_INTL ? ['none', 'go', 'rest'] : ['none'];
    const eras = k === 'NBA_CAREER_SPORT' ? [undefined, 'y2004'] : [undefined];
    for (const eraId of eras) for (const mode of modes) for (let i = 0; i < N; i += 1) {
      const o = { key: `old1557:${tag}:${k}:${eraId}:${mode}:${i}`, pos: positions[i % positions.length], arch: i, eraId, seasons: 18 };
      if (mode !== 'none') Object.assign(o, { intl: mode, intlFace: old.NBA_CAREER_INTL });
      let json;
      try { json = old.drive.driveCareer(sp, o).json; } catch (e) { bad(`${tag} ${k} ${mode} ${i}: the old drive threw ${String(e).slice(0, 120)}`); continue; }
      const c1 = JSON.parse(json); const c2 = JSON.parse(json);
      const a = read(old, k, c1); const b = read(head, k, c2);
      const summers = c2.intl?.summers ?? [];
      const medals = summers.filter(r => r.went && ['gold', 'silver', 'bronze'].includes(r.place)).length;
      const id = `${tag} ${k.slice(0, 3)} era=${eraId ?? 'now'} ${mode} #${i}`;
      ok(a.lines === b.lines, `${id}: the case's trophy lines moved`);
      ok(a.rings === b.rings, `${id}: rings moved`);
      if (medals === 0) {
        if (summers.length) counts.summersNoMedal += 1; else counts.plain += 1;
        ok(JSON.stringify(a.honours) === JSON.stringify(b.honours), `${id}: honours moved with no medal: ${JSON.stringify(a.honours)} to ${JSON.stringify(b.honours)}`);
        ok(JSON.stringify(a.earned) === JSON.stringify(b.earned), `${id}: earned badges moved with no medal: ${a.earned.length} to ${b.earned.length}`);
      } else {
        counts.medal += 1;
        const want = [...a.honours, { label: medals === 1 ? 'international medal' : 'international medals', n: medals }];
        ok(JSON.stringify(want) === JSON.stringify(b.honours), `${id}: honours are not the old ones plus the medal row: ${JSON.stringify(b.honours)}`);
        const extra = b.earned.filter(x => !a.earned.includes(x));
        ok(a.earned.every(x => b.earned.includes(x)) && extra.every(x => NEW_IDS.includes(x)) && extra.includes('intl_medal'), `${id}: earned badges are not the old ones plus the medal badges: +${extra.join(',')}`);
      }
      if (c2.intl !== undefined && head.NBA_CAREER_INTL) {
        const before = JSON.stringify(c2);
        const changed = head.NBA_CAREER_INTL.repairOnLoad(c2);
        if (changed) counts.repaired += 1;
        ok(!changed && JSON.stringify(c2) === before, `${id}: the head's load repair changed an old summer block`);
        const rows = head.NBA_CAREER_INTL.trophyRows(c2);
        ok(rows.reduce((n, r) => n + r.n, 0) === medals, `${id}: the head's case rows hold ${rows.reduce((n, r) => n + r.n, 0)} medals, the summers ${medals}`);
      }
    }
  }
  console.log(`  ${tag}: ${counts.plain} saves with no summer, ${counts.summersNoMedal} with summers and no medal, ${counts.medal} with a medal, ${counts.repaired} repaired by the head`);
  if (old.NBA_CAREER_INTL) ok(counts.medal >= 10, `${tag}: only ${counts.medal} medal saves, too few to prove anything`);
}
console.log(breaks ? `oldsaves: RED, ${breaks} breaks in ${checks} checks` : `oldsaves: green, ${checks} checks over ${olds.length} old trees`);
process.exit(breaks ? 1 : 0);
