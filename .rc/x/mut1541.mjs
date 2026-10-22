/* Round 1541 fixer: one source mutation on the runner's checkout, its anchor asserted once.
   Usage: node .rc/x/mut1541.mjs <name>; the request line restores with git checkout afterwards. */
import fs from 'node:fs';

const INTL = 'src/lib/careerIntl.ts';
const NBA = 'src/lib/nbaCareerIntl.ts';
const MUTS = {
  thirds: [INTL, '.filter(Boolean).sort(order).slice(0, shape.thirdsThrough)', '.filter(Boolean).slice(0, shape.thirdsThrough)'],
  linepts: [NBA, 'pts: one(line?.ppg ?? 0, INTL_LINE_SPREAD_PTS),', 'pts: one(line?.rpg ?? 0, INTL_LINE_SPREAD_PTS),'],
  minutes: [NBA, 'const k = (FIBA_GAME_MINUTES / NBA_GAME_MINUTES) * INTL_STAR_SHARE;', 'const k = INTL_STAR_SHARE;'],
  callend: [NBA, 'if (!line || c.retired || nbaShouldRetire(c) || endsAfterSeason(c, line.year)) return null;', 'if (!line || c.retired) return null;'],
  lastshallow: [INTL, '  const games = t.games as unknown[];\n', '  if (t) return rows.some(r => r.went && r.edition === t.edition);\n  const games = t.games as unknown[];\n'],
  namelast: [INTL, 'name: nameAt(comp, year) ?? last.name,', 'name: last.name,'],
  knock: [INTL, 'const hurt = rng() < bind.knockChance(c);', 'const hurt = rng() > bind.knockChance(c);'],
  avgsum: [INTL, 'avg[k] = round1(v / Math.max(1, t.his.length));', 'avg[k] = round1(v);'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`mutation ${name}: ${file} holds the anchor ${hits} times, not once: ABORT`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mutation ${name} applied to ${file}`);
