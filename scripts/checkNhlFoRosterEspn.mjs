/**
 * Round 830: the second source for the NHL Front Office rosters, a spot check.
 *
 * The roster record (scripts/data/nhlRosters2026.json) comes from the NHL's own
 * API. This checks a fixed sample of it against ESPN's team roster, the data
 * behind https://www.espn.com/nhl/team/roster/_/name/{team}, and writes what it
 * checked and what it found into the record's espnSpotCheck block:
 *
 *   SAMPLE  the 6th, 12th, 18th, 24th and 30th clubs alphabetically by
 *           abbreviation (CGY, FLA, NYI, SJS, VGK), and on each the first ten
 *           men the generator keeps, alphabetical by surname. Fixed in advance,
 *           in scripts/lib/nhlFoRosterRules.mjs, so nobody picks the easy ones.
 *   A MATCH the man is on ESPN's roster of the same club, in the same position
 *           group (forward, defense, goalie), with the same birth date. A name
 *           spelled differently (accents, a short first name) still matches when
 *           the birth date and group find exactly one man, and the note says so.
 *   THE BAR more than 2 mismatches in 50 (4 percent) means stop and report, not
 *           ship: the generator and the fence both refuse such a record.
 *
 * Run after scripts/fetchNhlFoRoster.mjs, on the same day: node scripts/checkNhlFoRosterEspn.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRatings, chooseTwentyThree, groupOf, nameKey, spotCheckClubs, spotCheckMen, SPOT_CHECK_RULE } from './lib/nhlFoRosterRules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = path.join(ROOT, 'scripts/data/nhlRosters2026.json');
/* ESPN's own short codes where they differ from the NHL's. */
const ESPN_CODE = { SJS: 'sj', NJD: 'nj', LAK: 'la', TBL: 'tb', UTA: 'utah' };
export const MISMATCH_LIMIT = 2;

const rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
if (rec.meta.read !== today) {
  console.error(`the record was read on ${rec.meta.read}; a spot check run today (${today}) would compare two different days. Refetch first.`);
  process.exit(1);
}
const rate = buildRatings(rec.stats2025_26);
const groupWord = { Centers: 'F', 'Left Wings': 'F', 'Right Wings': 'F', Forwards: 'F', Defense: 'D', Defensemen: 'D', Goalies: 'G', Goaltenders: 'G' };

const clubs = [];
let checked = 0, mismatches = 0;
for (const abbr of spotCheckClubs(Object.keys(rec.teams))) {
  const code = ESPN_CODE[abbr] ?? abbr.toLowerCase();
  const dataUrl = `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/${code}/roster`;
  const pageUrl = `https://www.espn.com/nhl/team/roster/_/name/${code}`;
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error(`${dataUrl}: HTTP ${res.status}`);
  const json = await res.json();
  const espn = [];
  for (const block of json.athletes ?? []) {
    const g = groupWord[block.position];
    if (!g) throw new Error(`${abbr}: ESPN position block "${block.position}" is not one this check knows`);
    for (const a of block.items) espn.push({ name: a.fullName, key: nameKey(a.fullName), group: g, birthDate: (a.dateOfBirth ?? '').slice(0, 10) });
  }
  const { kept } = chooseTwentyThree(rec.teams[abbr].players, rate);
  const men = spotCheckMen(kept.map(x => x.p));
  const rows = [];
  for (const p of men) {
    const group = groupOf(p.pos);
    let hit = espn.filter(e => e.key === nameKey(p.name));
    let note = null;
    if (hit.length !== 1) {
      const byBirth = espn.filter(e => e.birthDate === p.birthDate && e.group === group);
      if (byBirth.length === 1) { hit = byBirth; note = `ESPN spells him ${byBirth[0].name}`; }
    }
    const e = hit.length === 1 ? hit[0] : null;
    const problems = [];
    if (!e) problems.push(hit.length ? 'more than one man of that name on ESPN\'s roster' : 'not on ESPN\'s roster of this club');
    else {
      if (e.group !== group) problems.push(`ESPN has him in group ${e.group}, the NHL in ${group}`);
      if (e.birthDate !== p.birthDate) problems.push(`ESPN birth date ${e.birthDate}, the NHL ${p.birthDate}`);
    }
    checked += 1;
    if (problems.length) mismatches += 1;
    rows.push({ id: p.id, name: p.name, group, birthDate: p.birthDate, espn: e ? { name: e.name, group: e.group, birthDate: e.birthDate } : null, match: problems.length === 0, note, problems });
  }
  clubs.push({ team: abbr, pageUrl, dataUrl, espnRosterSize: espn.length, rows });
  console.log(`${abbr}: ${rows.filter(r => r.match).length}/${rows.length} match (${espn.length} on ESPN's roster)`);
  for (const r of rows.filter(r => !r.match || r.note)) console.log(`   ${r.name}: ${r.match ? 'match, ' + r.note : r.problems.join('; ')}`);
}

rec.espnSpotCheck = {
  read: today,
  rule: SPOT_CHECK_RULE,
  bar: `stop and report if more than ${MISMATCH_LIMIT} of the men checked disagree`,
  checked,
  mismatches,
  clubs,
};
fs.writeFileSync(RECORD, `${JSON.stringify(rec, null, 1)}\n`);
console.log(`spot check: ${checked} men on ${clubs.length} clubs, ${mismatches} mismatch${mismatches === 1 ? '' : 'es'} (bar: more than ${MISMATCH_LIMIT} stops the bake)`);
if (mismatches > MISMATCH_LIMIT) process.exit(1);
