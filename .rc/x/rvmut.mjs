/* Review run lens, Round 1567: apply ONE named mutation to the runner's checkout (never committed).
   Every anchor is asserted present first; a missing anchor exits 3 (ABORTED, proves nothing). */
import fs from 'node:fs';

const CHK = 'scripts/lib/usConnectionsCheck.mjs';
const MLB = 'src/data/baseballConnectionsPuzzles.ts';
const NHL = 'src/data/nhlConnectionsPuzzles.ts';
const NFL = 'src/data/nflConnectionsPuzzles.ts';

const edits = {
  /* the Cy Young watch back to its base form (two way men skipped) */
  cyrevert: [[CHK, "if (c.codes.includes('ALCY') && !isPitcher(m) && !((m.ss['2026'][5] ?? 0) > 0)) return null;", "if (c.codes.includes('ALCY') && !isPitcher(m)) return null;"]],
  /* baseball's dated club criterion loses its asOf (the date parsed, then dropped) */
  mlbasofdrop: [[CHK, "legend: /legends$/.test(label), ...(m[2] ? { asOf: Number(m[2]) } : {}) };", "legend: /legends$/.test(label) };"]],
  /* baseball's "a season past the date is unknown" line removed */
  mlbasofline: [[CHK, "if (c.asOf !== undefined && seasons > 0 && Object.keys(m.ss ?? {}).some(y => Number(y) > c.asOf)) return null;", ""]],
  /* NFL off by one at the date: the dated season itself no longer counts */
  nfllt: [[CHK, "const upTo = y => c.asOf === undefined || Number(y) <= c.asOf;", "const upTo = y => c.asOf === undefined || Number(y) < c.asOf;"]],
  /* NFL ignores the date entirely */
  nflignore: [[CHK, "const upTo = y => c.asOf === undefined || Number(y) <= c.asOf;", "const upTo = y => true;"]],
  /* NHL ignores the date entirely (2026-27 seasons count) */
  nhlignore: [[CHK, "c.asOf === undefined || Number(s.slice(0, 4)) <= c.asOf", "true"]],
  /* NHL off by one: the 2025-26 season itself no longer counts */
  nhllt: [[CHK, "c.asOf === undefined || Number(s.slice(0, 4)) <= c.asOf", "c.asOf === undefined || Number(s.slice(0, 4)) < c.asOf"]],
  /* the share line just under and just over the closest member (Frank Thomas 42.6) */
  share42: [[CHK, 'export const SHARE_FITS = 0.35;', 'export const SHARE_FITS = 0.42;']],
  share43: [[CHK, 'export const SHARE_FITS = 0.35;', 'export const SHARE_FITS = 0.43;']],
  /* the old line, 30 (the builder says nothing sits between 9.9 and 42.6, so this stays green) */
  share30: [[CHK, 'export const SHARE_FITS = 0.35;', 'export const SHARE_FITS = 0.3;']],
  /* the 10 line a hair lower: Honus Wagner, 9.9 at first base, becomes unknown */
  out099: [[CHK, 'export const SHARE_OUT = 0.1;', 'export const SHARE_OUT = 0.099;']],
  /* every baseball / NHL club group loses its date */
  undatemlb: [[MLB, " (as of 2026)'", "'", true]],
  undatenhl: [[NHL, " (as of 2025-26)'", "'", true]],
  undatenfl: [[NFL, " (as of 2025)'", "'", true]],
  /* a plausible data slip: Cal Ripken Jr. back among bconn-018's shortstops (a gray pair) */
  ripken: [[MLB, "{ theme: 'Hall of Fame shortstops', players: ['Luis Aparicio', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Ernie Banks']", "{ theme: 'Hall of Fame shortstops', players: ['Cal Ripken Jr.', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Ernie Banks']"]],
};

const name = process.argv[2];
const list = edits[name];
if (!list) { console.error(`rvmut: unknown mutation ${name}`); process.exit(3); }
for (const [file, from, to, all] of list) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n === 0) { console.error(`rvmut ${name}: ABORTED, anchor not in ${file}: ${from.slice(0, 80)}`); process.exit(3); }
  if (!all && n !== 1) { console.error(`rvmut ${name}: ABORTED, anchor found ${n} times in ${file}`); process.exit(3); }
  const out = all ? src.split(from).join(to) : src.replace(from, to);
  fs.writeFileSync(file, out);
  console.log(`rvmut ${name}: ${file} changed (${all ? n : 1} place${(all ? n : 1) === 1 ? '' : 's'})`);
}
