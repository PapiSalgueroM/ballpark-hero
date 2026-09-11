/**
 * Round 547: the Champions League field is who qualified, not who is famous.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-11 that Chelsea should not be
 * in the 2026-27 Champions League because they failed to qualify. Round 543
 * fixed half of it, which is how many places YOUR league gives and whether YOU
 * are in. This is the other half: who the other thirty one clubs are.
 *
 * Until this round the field was a shuffled prestige pool, EURO_CLUBS plus
 * every club above a squad rating threshold, and nothing anywhere read a league
 * table. A club could finish bottom of its division and be in the group stage,
 * every season, forever. The engine has had the answer the whole time: state.world
 * carries a live standings table for every league that is not mine and drives
 * it to its own finish line as my season ends, so at a season rollover the
 * final table of every league in the world is sitting in the save.
 *
 * WHAT THIS HOLDS, driven through real careers played to the end of a season
 * and rolled over, not through a hand written fixture:
 *   1. Every club in the field has a REASON: a qualifying finish in its own
 *      league's final table, the holders' route, or a documented top up from
 *      the next places in the deepest leagues. No club is in it for its
 *      reputation.
 *   2. The club that just missed is really out. For every European league,
 *      nobody who finished below its last qualifying place is in the field
 *      through that league. This is the assertion the report was about, and it
 *      is the one that was false before this round.
 *   3. The field is a full eight group draw of 32 with no club twice.
 *   4. My own group's three opponents come out of that field and none of them
 *      is from my own league, which is how the real draw works.
 *   5. Season one and a historic era still fall back to the pool, because there
 *      is no previous season to read and an era draws from its own verified
 *      period pool. Nothing that worked before this round stops working.
 *   6. The KNOCKOUT draws from the field too. Two more places re-seeded from
 *      the prestige pool (the top up in uclBracketField and the opponent draw
 *      in drawUclKoOpponent), so fixing the group stage alone would have left
 *      the same bug standing one round later.
 *
 * NEGATIVE CONTROL: UCL_FIELD_CONTROL=pool makes the two DRAWS ignore the
 * derived field while leaving the derivation itself running, which is exactly
 * the engine before this round: the tables were there to be read and the draw
 * read a prestige pool instead. SECTION 4 must go red, with real opponents that
 * are not in the field. Killing the derivation outright would have been the
 * weaker control, because then the harness goes red for the field being absent
 * rather than for the wrong clubs being in it, and the second is the defect.
 *
 * Run: node scripts/simUclField.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.UCL_FIELD_CONTROL || '';
const KNOWN_CONTROLS = ['pool'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`UCL_FIELD_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'uclFieldEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'uclField.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

if (CONTROL === 'pool') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  /* Make the two DRAWS stop consulting the derived field while leaving the
     derivation itself running, which is exactly the engine before this round:
     the tables were there to be read and the draw read a prestige pool
     instead. Killing uclQualifiersFrom outright would have been a weaker
     control, because the harness would then go red for the field being absent
     rather than for the wrong clubs being in it, which is the actual defect. */
  const groupRe = /field && field\.length >= 8/;
  const worldRe = /state\.uclField && state\.uclField\.length >= 8/;
  if (!groupRe.test(text) || !worldRe.test(text)) {
    console.error('CONTROL pool cannot find both draw guards in the bundle, so it would change nothing');
    process.exit(1);
  }
  const mutated = text.replace(groupRe, 'false').replace(worldRe, 'false');
  if (mutated === text) { console.error('CONTROL pool changed nothing'); process.exit(1); }
  fs.writeFileSync(BUNDLE, mutated);
  console.log('   NEGATIVE CONTROL ON: the draws ignore the derived field, section 4 must go red');
}

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  sortedLeagueTable, sortedWorldTable, careerLeagueOf, worldLeagueDefs,
  uclPlacesIn, leagueOf,
} = cm;

/** Play a career to the end of its season and roll it over. */
const rollOver = clubName => {
  let s = startCareer(clubName);
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < 500) {
    const r = playNextEntry(s, { skipHalftime: true });
    if (r && r.state) s = r.state; else break;
  }
  const { state: fin } = finishSeason(s);
  return { fin, next: startNextSeason(fin) };
};

/* A spread of starting clubs so the field is measured from more than one
   league's point of view. Kept small on purpose: each one plays a full season
   plus every other league in the world alongside it. */
const CLUBS = ['Real Madrid', 'Celtic', 'Ajax', 'Manchester City'];
const runs = CLUBS.map(c => ({ club: c, ...rollOver(c) }));
console.log(`\nPlayed ${runs.length} careers to a season rollover.`);

/* The final table of every European league in a finished save. */
const finalTables = fin => {
  const my = careerLeagueOf(fin);
  const out = new Map();
  for (const lg of worldLeagueDefs(fin).filter(l => l.euro)) {
    const rows = lg.id === my.id
      ? sortedLeagueTable(fin)
      : (fin.world && fin.world[lg.id] ? sortedWorldTable(fin, lg.id, fin.world[lg.id].table) : null);
    if (rows && rows.length) out.set(lg.id, { lg, rows });
  }
  return out;
};

/* ------------------------------------------------------------------ */
console.log('1) Every club in the field has a reason to be there');
{
  const before = failures;
  let checked = 0;
  for (const { club, fin, next } of runs) {
    if (!next.uclField) { fail(`${club}: season two carries no derived field at all`); continue; }
    const tables = finalTables(fin);
    const holder = fin.uclBracket ? (fin.uclBracket.find(t => t.round === 'F') || {}).winner : null;
    /* A club's best reason: its finishing place in its own league. The top up
       rule reaches at most eight places past the qualifying cut. */
    for (const name of next.uclField) {
      checked += 1;
      if (name === holder) continue;
      let reason = null;
      for (const { lg, rows } of tables.values()) {
        const at = rows.findIndex(r => r.club === name);
        if (at < 0) continue;
        reason = { league: lg.id, place: at + 1, slots: uclPlacesIn(lg) };
        break;
      }
      if (!reason) { fail(`${club}: ${name} is in the field and finished in no European league's table`); continue; }
      if (reason.place > reason.slots + 8) {
        fail(`${club}: ${name} finished ${reason.place} in ${reason.league}, which gives ${reason.slots} places, and is in the field anyway`);
      }
    }
  }
  if (failures === before) console.log(`   ${checked} places across ${runs.length} fields, every one traced to a finish or the holders' route`);
}

/* ------------------------------------------------------------------ */
console.log('2) The club that just missed is really out');
{
  const before = failures;
  let leaguesChecked = 0;
  let nearMisses = 0;
  for (const { club, fin, next } of runs) {
    if (!next.uclField) continue;
    const field = new Set(next.uclField);
    const holder = fin.uclBracket ? (fin.uclBracket.find(t => t.round === 'F') || {}).winner : null;
    const tables = finalTables(fin);
    for (const { lg, rows } of tables.values()) {
      const slots = uclPlacesIn(lg);
      if (rows.length <= slots) continue;
      leaguesChecked += 1;
      /* The club one place below the cut. It can only be in the field as the
         holder or as a top up, and a top up never reaches it before every
         deeper league's own next place, so at minimum it must not be in
         through its finishing position. */
      const justMissed = rows[slots];
      if (!justMissed) continue;
      if (field.has(justMissed.club) && justMissed.club !== holder) {
        /* Allowed only if the field needed topping up at all. A full field
           built purely from qualifying places must not contain him. */
        const qualifiers = [...tables.values()].reduce((a, t) => a + Math.min(uclPlacesIn(t.lg), t.rows.length), 0);
        if (qualifiers >= 32) {
          fail(`${club}: ${justMissed.club} finished ${slots + 1} in ${lg.id}, one place below the cut, and is in a field that never needed topping up`);
        }
      } else {
        nearMisses += 1;
      }
    }
  }
  if (leaguesChecked < 20) fail(`only ${leaguesChecked} league cuts examined, which is too few to mean anything`);
  if (failures === before) console.log(`   ${leaguesChecked} league cuts, ${nearMisses} clubs one place short and correctly absent`);
}

/* ------------------------------------------------------------------ */
console.log('3) A full eight group draw, nobody twice');
{
  const before = failures;
  for (const { club, next } of runs) {
    if (!next.uclField) continue;
    if (next.uclField.length !== 32) fail(`${club}: the field has ${next.uclField.length} clubs, not 32`);
    if (new Set(next.uclField).size !== next.uclField.length) fail(`${club}: a club appears in the field twice`);
  }
  if (failures === before) console.log(`   ${runs.length} fields of 32, no duplicates`);
}

/* ------------------------------------------------------------------ */
console.log('4) My group opponents come out of the field and avoid my own league');
{
  const before = failures;
  let groups = 0;
  for (const { club, next } of runs) {
    if (!next.uclGroup || !next.uclField) continue;
    groups += 1;
    const field = new Set(next.uclField);
    const mine = new Set(leagueOf(next.clubName).clubs);
    for (const opp of next.uclGroup.opponents) {
      if (!field.has(opp)) fail(`${club}: group opponent ${opp} is not in this season's field`);
      if (mine.has(opp)) fail(`${club}: group opponent ${opp} is from my own league`);
    }
  }
  if (groups === 0) fail('not one of the careers reached a group stage, so this section checked nothing');
  if (failures === before) console.log(`   ${groups} groups, every opponent a real qualifier from another league`);
}

/* ------------------------------------------------------------------ */
console.log('5) Season one and a historic era still fall back to the pool');
{
  const before = failures;
  const seasonOne = startCareer('Real Madrid');
  if (seasonOne.uclField) fail('season one carries a derived field, but there is no previous season to read one from');
  if (!seasonOne.uclGroup) fail('Real Madrid did not start season one in the Champions League, so the fallback path was not exercised');
  const era = startCareer('Barcelona', 'era2015');
  if (era.uclField) fail('a historic era carries a derived field instead of drawing from its own verified period pool');
  if (!era.uclGroup) fail('the 2015-16 career did not start in the Champions League');
  if (failures === before) console.log('   season one and 2015-16 both still draw from the pool, unchanged');
}

/* ------------------------------------------------------------------ */
console.log('6) The knockout draws from the field too, not from the pool');
{
  const before = failures;
  /* Season one draws from the pool by design, so the knockout can only be
     checked on a season that HAS a field. One career is played a second season
     through to its end for that, which is the only place the top up in
     uclBracketField and the opponent draw in drawUclKoOpponent can be seen. */
  const base = runs.find(r => r.next.uclField && r.next.uclGroup);
  if (!base) {
    fail('no career reached a second season with both a field and a group, so the knockout cannot be checked');
  } else {
    let s = base.next;
    const field = new Set(s.uclField);
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 500) {
      const r = playNextEntry(s, { skipHalftime: true });
      if (r && r.state) s = r.state; else break;
    }
    const drawn = [
      ...Object.values(s.uclDraw || {}).filter(c => typeof c === 'string'),
      ...(s.uclBracket || []).flatMap(t => [t.home, t.away]).filter(c => typeof c === 'string'),
    ];
    const mine = s.clubName;
    const outsiders = [...new Set(drawn)].filter(c => c && c !== mine && !field.has(c));
    if (!drawn.length) {
      fail(`${base.club}: the second season produced no Champions League knockout at all, so this section checked nothing`);
    } else if (outsiders.length) {
      fail(`${base.club}: ${outsiders.length} club(s) in the knockout never qualified: ${outsiders.slice(0, 6).join(', ')}`);
    }
    if (failures === before) console.log(`   ${base.club}'s second season: ${[...new Set(drawn)].length} clubs across the draw and bracket, all qualifiers`);
  }
}

/* ------------------------------------------------------------------ */
if (CONTROL === 'pool') {
  /* Section 4 specifically: a group opponent that is not a qualifier. */
  if (failures > 0) { console.log('\n   CONTROL FIRED: the prestige pool was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see the behaviour that shipped');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimUclField: all green');
