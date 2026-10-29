// Reviewer mutations for Round 1566 (never committed). node .rc/x/mut1566.mjs <name> edits one src file in place on
// a runner; the request line restores it with git checkout. Refuses when the anchor is not there exactly once.
import fs from 'node:fs';

const M = {
  packrookie: ['src/lib/foStatsCodec.ts', '...c.cols.map(col => l.tot[col] ?? 0), ...(l.rookie ? [1] : [])];', '...c.cols.map(col => l.tot[col] ?? 0)];'],
  packswap: ['src/lib/foStatsCodec.ts', 'men[l.id] = [l.name, l.pos, l.g, ...(c.gs ? [l.gs] : []),', 'men[l.id] = [l.name, l.pos, ...(c.gs ? [l.gs] : []), l.g,'],
  expandgs: ['src/lib/foStatsCodec.ts', 'gs: c.gs ? (l[3] as number) : g,', 'gs: g,'],
  rookieoff: ['src/lib/foStatsCodec.ts', 'if (l[lineLength(c)] === 1) line.rookie = true;', 'if (l[lineLength(c) - 1] === 1) line.rookie = true;'],
  namedstrict: ['src/lib/foStatsCodec.ts', '&& isCount(l.g) && isCount(l.gs) && isObj(l.tot)', '&& isCount(l.g) && isCount(l.gs) && l.gs > 0 && isObj(l.tot)'],
  kickswap: ['src/lib/nflSeasonView.ts', 'return c ? { td: c[0], fg: c[1], sf: c[2] } : null;', 'return c ? { td: c[0], fg: c[2], sf: c[1] } : null;'],
  liveclean: ['src/lib/nbaSeasonStats.ts', "clubs === null || Array.isArray(clubs))) nbaCleanStats(league);", "clubs === null || Array.isArray(clubs))) void 0;"],
  clubtie: ['src/lib/foStatsCodec.ts', 'k[1] + (pts > opp ? 1 : 0)', 'k[1] + (pts >= opp ? 1 : 0)'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`no mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} ABORTED: anchor found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, () => to));
console.log(`mutation ${name} applied to ${file}`);
