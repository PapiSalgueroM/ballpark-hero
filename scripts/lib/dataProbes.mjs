/**
 * Round 1042: probes, to find a piece of data in the BUILT files.
 *
 * A probe is a short string a data file prints into whatever chunk carries it, in the form the
 * minifier writes it. Every probe is derived from the source file when the harness runs and none
 * is typed, so a rebake or a new season cannot leave a harness looking for a man who moved. Used
 * by scripts/sweepWeight.mjs section 4 ("the data these pages never read is in none of the files
 * they fetch") and by scripts/playCmDataOnDemand.mjs.
 *
 *   pools      keys of NATIONAL_POOLS spread through src/data/nationalPools.ts, as they stand:
 *              "Albania|2016":
 *   eras       for each past world's nationality file, entries whose name has a space, is plain
 *              ASCII with no apostrophe, and is in no other world's map: "Name":"Country"
 *   eraSquads  for each past world's squad file, the start of a roster row no other world shares
 *              (same name, position and age): {n:"Name",p:"ST",a:28,
 *              (scripts/simCmLeagueRules.mjs part chunks derives the same shape from the bundled
 *              engine; this reads the files, so a browser harness need not bundle anything.)
 *   footle     keys of footleEnrichment with a space in the name: "Name":{kitNumber:
 *
 * Fewer than MIN probes for any set refuses (throws): a rule about probes must never pass empty.
 *
 *   dataProbes(root) -> { pools: string[], footle: string[], eras: { era2010: string[], ... },
 *                         eraSquads: { era2010: string[], ... } }
 *   findProbes(text, probes) -> how many of the probes the text holds
 */
import fs from 'node:fs';
import path from 'node:path';

export const PROBES_PER_SET = 40;
export const MIN_PROBES = 20;

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const unesc = s => s.replace(/\\(.)/g, '$1');
const PLAIN = /^[A-Za-z .-]+$/;
/** n items spread evenly through a list, first to last, in order. */
function spread(list, n) {
  if (list.length <= n) return [...list];
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.floor((i * list.length) / n)]);
  return out;
}
function need(name, list) {
  if (list.length < MIN_PROBES) throw new Error(`dataProbes: only ${list.length} probes for ${name}, fewer than ${MIN_PROBES}; the source file is not in the shape this reads`);
  return list;
}

export function dataProbes(root) {
  /* the national team pools */
  const poolsText = read(root, 'src/data/nationalPools.ts');
  const poolKeys = [...poolsText.matchAll(/^\s*"([^"\n]+\|\d{4})":/gm)].map(m => m[1]).filter(k => /^[A-Za-z .|0-9-]+$/.test(k));
  const pools = need('pools', spread(poolKeys, PROBES_PER_SET).map(k => `"${k}":`));

  /* the nationality worlds: today's, and one file per past world (the folder is read) */
  const ENTRY = /^ {2}'((?:[^'\\]|\\.)*)': '((?:[^'\\]|\\.)*)',$/gm;
  const mapOf = text => new Map([...text.matchAll(ENTRY)].map(m => [unesc(m[1]), unesc(m[2])]));
  const dir = 'src/data/nationalities';
  const eraIds = fs.readdirSync(path.join(root, dir)).filter(f => /^era\d{4}\.ts$/.test(f)).sort().map(f => f.slice(0, -3));
  if (eraIds.length < 4) throw new Error(`dataProbes: only ${eraIds.length} era files under ${dir}, expected at least four`);
  const worlds = { now: mapOf(read(root, 'src/data/playerNationalities.ts')) };
  for (const id of eraIds) worlds[id] = mapOf(read(root, `${dir}/${id}.ts`));
  const eras = {};
  for (const id of eraIds) {
    const own = [];
    for (const [name, country] of worlds[id]) {
      if (!name.includes(' ') || !PLAIN.test(name) || !PLAIN.test(country)) continue;
      if (Object.keys(worlds).some(w => w !== id && worlds[w].has(name))) continue;
      own.push(`${JSON.stringify(name)}:${JSON.stringify(country)}`);
    }
    eras[id] = need(id, spread(own, PROBES_PER_SET));
  }

  /* the squads of each past world: a row is a probe when no other world has the same row start */
  const ROW = /\{ n: '((?:[^'\\]|\\.)*)', p: '([A-Z]+)', a: (\d+),/g;
  const squadFiles = { now: 'src/data/clubManagerRosters.ts' };
  for (const id of eraIds) squadFiles[id] = `src/data/clubManagerEra${id.slice(3)}.ts`;
  const owners = new Map();
  for (const [w, rel] of Object.entries(squadFiles)) {
    for (const m of read(root, rel).matchAll(ROW)) {
      const name = unesc(m[1]);
      if (!PLAIN.test(name)) continue;
      const k = `{n:${JSON.stringify(name)},p:${JSON.stringify(m[2])},a:${m[3]},`;
      owners.set(k, owners.has(k) && owners.get(k) !== w ? null : w);
    }
  }
  const eraSquads = {};
  for (const id of eraIds) eraSquads[id] = [];
  for (const [k, w] of owners) if (w && w !== 'now') eraSquads[w].push(k);
  for (const id of eraIds) eraSquads[id] = need(`${id} squads`, spread(eraSquads[id], PROBES_PER_SET));

  /* Footle's data */
  const footleText = read(root, 'src/data/footleEnrichment.ts');
  const footleKeys = [...footleText.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*\{ kitNumber:/gm)].map(m => unesc(m[1])).filter(n => n.includes(' ') && PLAIN.test(n));
  const footle = need('footle', spread(footleKeys, PROBES_PER_SET).map(n => `${JSON.stringify(n)}:{kitNumber:`));

  return { pools, footle, eras, eraSquads };
}

/** How many of the probes a text holds. */
export function findProbes(text, probes) {
  let n = 0;
  for (const p of probes) if (text.includes(p)) n += 1;
  return n;
}
