/**
 * Round 1600: the one place that puts Club Manager's 2026 squads on curve 2, shared by the roster bake
 * (scripts/bakeClubManagerRosters.mjs writes its file through it) and by the harnesses that need the world on
 * either side of the flip (simCmLevelReads, simCmDailyView).
 *
 * CURVE 2 means two things in a squads file, and nothing else: its META says `curve: 2`, so the engine reads each
 * man's age at load (src/data/clubManagerWorldRosters.ts), and each man's `a` is his age on 1 August 2026 as
 * scripts/data/cmAgesBasis2026.json resolves it through the rule in scripts/lib/cmAges.mjs. His `r` stays his value
 * rating, the level, on either curve.
 *
 * Pure text in, text out. Every function fails closed: a basis that does not line up with the squads, man for man
 * and on his value rating, throws and names the man.
 */
import { ageOn, tableAugustAge, AGES_AS_OF } from './cmAges.mjs';

const META_OPEN = 'export const CM_ROSTER_META = {\n';
const STAMP = '  curve: 2,\n';
const CLUB_LINE = /^  '(.*)': \[$/;
const ROW_LINE = /^(    \{ n: '(.*)', p: '\w+', a: )(\d+)(, v: [\d.]+, r: )(\d+)( \},)$/;
const clubOf = raw => raw.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

/** True when the (any line ending) squads text carries the curve 2 stamp. */
export function isStamped(text) {
  return text.replaceAll('\r\n', '\n').includes(`${META_OPEN}${STAMP}`);
}

/** The squads file stamped curve 2 (unchanged when it already is). Throws when it has no single META. */
export function stampedSquads(text) {
  const lf = text.replaceAll('\r\n', '\n');
  if (lf.split(META_OPEN).length !== 2) throw new Error('cmSquadAges: the squads file has no single META');
  return isStamped(lf) ? lf : lf.replace(META_OPEN, `${META_OPEN}${STAMP}`);
}

/** One basis line's age on 1 August 2026: [table age, row year, row id, how, born?, value rating]. */
export function augustOf(line) {
  const [age, year, id, how, born] = line;
  if (how === 'born') return ageOn(born, AGES_AS_OF);
  if (how === 'written') return age;
  return tableAugustAge({ name: '', age, year, id }).age;
}

/** Rewrites every man's age with `ageAt(club, i, name, r, a)`; returns the text and the counts. */
function reage(text, ageAt) {
  let club = null, i = 0, moved = 0, rows = 0;
  const out = text.replaceAll('\r\n', '\n').split('\n').map(l => {
    const c = CLUB_LINE.exec(l);
    if (c) { club = clubOf(c[1]); i = 0; return l; }
    const m = ROW_LINE.exec(l);
    if (!m) return l;
    const a = ageAt(club, i++, clubOf(m[2]), Number(m[5]), Number(m[3]));
    rows += 1;
    if (a !== Number(m[3])) moved += 1;
    return `${m[1]}${a}${m[4]}${m[5]}${m[6]}`;
  });
  return { text: out.join('\n'), moved, rows };
}

/** Every man at his August age from the basis file. Throws when a club's men and its basis lines do not line up. */
export function agedSquads(text, basis) {
  const used = {};
  const got = reage(text, (club, i, name, r) => {
    const line = basis.clubs[club]?.[i];
    if (!line) throw new Error(`cmSquadAges: no basis line for ${name}, man ${i + 1} of ${club}`);
    if (line[line.length - 1] !== r) throw new Error(`cmSquadAges: ${name} of ${club} is rated ${r}, his basis line says ${line[line.length - 1]}: the basis is not this file's (scripts/genCmAgesBasis2026.mjs)`);
    used[club] = i + 1;
    return augustOf(line);
  });
  const short = Object.entries(basis.clubs).filter(([club, lines]) => (used[club] ?? 0) !== lines.length).map(([club]) => club);
  if (short.length) throw new Error(`cmSquadAges: the basis holds men the squads file does not, at ${short.slice(0, 5).join(', ')}`);
  return got;
}

/** The curve 1 file again from a curve 2 one: no stamp, and every man at the age the curve 1 view holds for him
 *  (src/data/clubManagerCurve1View.ts, read as text: club -> [names digest, ages two digits a man]). */
export function unflippedSquads(text, viewText) {
  const lf = text.replaceAll('\r\n', '\n');
  const view = new Map();
  for (const m of viewText.replaceAll('\r\n', '\n').matchAll(/^  '(.*)': \['([0-9a-f]{8})', '(\d*)'\],$/gm)) view.set(clubOf(m[1]), m[3]);
  const got = reage(lf.replace(`${META_OPEN}${STAMP}`, META_OPEN), (club, i, name) => {
    const ages = view.get(club);
    if (!ages || ages.length < 2 * (i + 1)) throw new Error(`cmSquadAges: the curve 1 view has no age for ${name}, man ${i + 1} of ${club}`);
    return Number(ages.slice(2 * i, 2 * i + 2));
  });
  return got;
}

/** A generated league's file (A-League, Russia) with its curve 2 stamp taken off, for a curve 1 arm. */
export function unstampedLeague(text) {
  return text.replaceAll('\r\n', '\n').replace(/^  curve: 2,\n/m, '');
}

/** The real free agents file on curve 1 (its ratings shown as the value curve's, as before Round 1600). */
export function unstampedFreeAgents(text) {
  const lf = text.replaceAll('\r\n', '\n');
  const from = 'export const CM_REAL_FREE_AGENTS_CURVE = 2;';
  return lf.includes(from) ? lf.replace(from, 'export const CM_REAL_FREE_AGENTS_CURVE = 1;') : lf;
}
