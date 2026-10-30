/**
 * Round 1600: the flip probe the harnesses share. Takes the text of Club Manager's main squads file
 * (src/data/clubManagerRosters.ts) and gives it back stamped curve 2 (its META says `curve: 2`, so the engine reads
 * every man's age at load), and, with `aged`, with every man at his age on 1 August 2026 as
 * scripts/data/cmAgesBasis2026.json resolves it through the rule in scripts/lib/cmAges.mjs. Pure text in, text out:
 * a harness serves the result to its bundle in place of the shipped file.
 */
import { ageOn, tableAugustAge, AGES_AS_OF } from './cmAges.mjs';

const META_OPEN = 'export const CM_ROSTER_META = {\n';
const CLUB_LINE = /^  '(.*)': \[$/;
const ROW_LINE = /^(    \{ n: '.*', p: '\w+', a: )(\d+)(, v: [\d.]+, r: \d+ \},)$/;

/** The squads file stamped curve 2. Throws when the file has no single META to stamp. */
export function stampedSquads(text) {
  const lf = text.replaceAll('\r\n', '\n');
  if (lf.split(META_OPEN).length !== 2) throw new Error('cmFlipProbe: the squads file has no single META');
  if (lf.includes(`${META_OPEN}  curve: `)) return lf;
  return lf.replace(META_OPEN, `${META_OPEN}  curve: 2,\n`);
}

/** One basis line's age on 1 August 2026: [table age, row year, row id, how, born?, value rating]. */
export function augustOf(line) {
  const [age, year, id, how, born] = line;
  if (how === 'born') return ageOn(born, AGES_AS_OF);
  if (how === 'written') return age;
  return tableAugustAge({ name: '', age, year, id }).age;
}

/** Every man of the (LF) squads text at his August age from the basis file. Returns the text and the counts. */
export function agedSquads(text, basis) {
  let club = null, i = 0, moved = 0, rows = 0;
  const out = text.replaceAll('\r\n', '\n').split('\n').map(l => {
    const c = CLUB_LINE.exec(l);
    if (c) { club = c[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'); i = 0; return l; }
    const m = ROW_LINE.exec(l);
    if (!m) return l;
    const line = basis.clubs[club]?.[i++];
    if (!line) throw new Error(`cmFlipProbe: no basis line for man ${i} of ${club}`);
    const a = augustOf(line);
    rows += 1;
    if (a !== Number(m[2])) moved += 1;
    return `${m[1]}${a}${m[3]}`;
  });
  return { text: out.join('\n'), moved, rows };
}
