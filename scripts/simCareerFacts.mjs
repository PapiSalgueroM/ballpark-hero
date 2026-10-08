/* Round 1022: Soccer Career's real world fact tables, held to a committed
   verification file.

   Two tables in src/lib/soccerCareerEngine.ts tell a player something about
   the real world. INT_SCORING_RECORDS is each nation's men's all time
   international scoring record: pass it and the career gets the All Time Top
   Scorer award and the line "Became X's All Time Top International Scorer".
   The league label on each of the 190 HAND_CLUBS rows is what the offers and
   the career header print. Before this round the records were years stale
   (Spain 29 for a record of 59, Belgium 68 for 94, Uruguay 36 for 69) and
   every nation not listed fell to an invented 40; Hertha Berlin was a
   Bundesliga club two seasons after it went down.

   scripts/data/soccerCareerFacts.json holds every value with two independent
   sources (none of them Wikipedia), what each said and the date it was read.

   Sections
   1 RECORDS    INT_SCORING_RECORDS equals the file's intRecords, row for row
                and number for number, in both directions; every row has two
                sources on two different hosts, a holder and an asOf date, and
                no held nation (intRecordsHeld) is in the engine.
   2 PICKER     every nation the creation screen offers (NATIONALITIES in
                src/pages/SoccerCareer.tsx, read with comments stripped) is
                driven through awardAllTimeTopScorer: the award fires only for
                a nation with a verified row, and for each of those the whole
                ladder is walked, record minus one, record (no award: it has
                to be passed) and record plus one (award, once, with the line
                naming the nation and the goals). A nation without a row gets
                nothing at 999 goals. No international career, no award.
   3 WIRING     the season really calls awardAllTimeTopScorer, after the
                summer tournament, the award is pushed nowhere else, and no
                fallback number survives.
   4 LABELS     every HAND_CLUBS row (by id and name) is in the file, in
                exactly one of three lists. Verified: its label equals the
                file's, and the file's evidence group has two sources on two
                hosts that list the club for the current season (2026-27, or
                2026 for a calendar year league; an older season is stale).
                Pinned (clubLeaguesPinned): the engine keeps the old label the
                file names, because a label serves every era and the club
                changed league inside that span (the lead's option (a) of
                2026-10-05, until the league by year round); the verified
                2026-27 league sits beside it with its evidence, and the list
                may only shrink (PINNED_MAX; 0 since Round 1037 released the
                seven, the past being the league ledgers' now). Unverified: a ratchet, its count
                may only fall (UNVERIFIED_MAX) and its labels must still equal
                the engine's, so nothing changes unseen.
   5 PLAYED     seeded careers played step by step through the real screens'
                calls, for nations with low and high records and players who
                move abroad. At the end of every season that runs the award
                (marked from the outside, see below), a man past HIS nation's
                record holds the award, granted that season, with the line's
                total equal to the goals on his screen; the award never lands
                in any other step or below the record. This is what catches a
                call moved above the season's goals or the tournament, or a
                record looked up by the wrong key, which sections 2 and 3
                cannot see.

   Negative controls, SIM_CAREER_FACTS_CONTROL=<name>. Each asserts the
   source string it rewrites exists (in memory, never on disk) and the run
   exits 0 only if its target section went red:
     record     Spain's record back to the stale 29                  -> 1
     default    the old `?? 40` default for unlisted nations         -> 2
     equal      the award at the record instead of past it (>=)      -> 2
     unwired    the season stops calling awardAllTimeTopScorer       -> 3
     label      Norwich City (verified Championship) relabelled
                "Premier League"                                     -> 4
     relabel    Hertha Berlin (released by Round 1037 to its verified
                "2. Bundesliga") put back to its old "Bundesliga"    -> 4
     early      the award call back above the summer tournament      -> 5
     early2     the award call above the season's own int goals      -> 5
     wrongkey   the record looked up by the club's country first     -> 5
     onesource  the file keeps one source for Spain's record         -> 1
     unverify   the file moves Norwich City to the unverified list   -> 4
     stale      the file dates the Premier League evidence 2024-25   -> 4
     onemembership the Eredivisie keeps one membership source        -> 6
     twodecisions  a held club is also listed as shipped             -> 6
     greycolour    Macarthur FC's colour becomes the fallback grey   -> 6
   (the last six rewrite the loaded file in memory, never on disk)

   6. LEAGUE WORLD (Round 1100): every league the career club pool is
                generated from has a leagueWorld row (members in the
                career's spelling, size, shape, games, points, a membership
                read from two hosts, dated format pages), every colour the
                generator supplies is a colour in words from two sources,
                and every generated club has exactly one clubSince decision.
                scripts/simCareerClubPool.mjs and simCareerLeagueWorld.mjs
                hold the generator and the ledgers to these rows.

   Run: node scripts/simCareerFacts.mjs
   No network and no database: the engine is bundled from this tree. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CAREER_FACTS_CONTROL || '';
/* The unverified labels ratchet: 2 of 190 on 2026-10-06 (181 verified, 7
   pinned). The builder read 127 from two sources; the review fix read the
   other 54 (soccerway's season feed, the Global Sports Archive and BeSoccer).
   Haiti's and Trinidad's leagues have no current season table online to read
   yet. It may only fall; a row that gets verified moves to clubLeagues and
   this number comes down with it. */
const UNVERIFIED_MAX = 2;
/* The pinned labels: 7 on 2026-10-06 (West Ham, Wolves, Girona, Hertha
   Berlin, Nantes, River Plate Asuncion, Persija Jakarta). It may only fall.
   Round 1037 (the league by year round) released all seven to their
   verified 2026-27 league, so it stands at 0: a past season is answered by
   the league ledgers, never by a label. */
const PINNED_MAX = 0;
/* The season a label is true for. A calendar year league's 2026 season and a
   split season league's 2026-27 are both the current one; anything older is
   evidence about a league the club may have left. */
const CURRENT_SEASONS = ['2026-27', '2026'];
/* Section 5 floors. Measured on 2026-10-06 over SIM_CAREER_FACTS_SEED 1 to 8
   (48 careers each): 1104 to 1128 full seasons, 40 to 47 careers winning the
   award, 22 to 24 of those awards won while playing abroad, 24 to 36 in a
   tournament season. Each floor sits well under the lowest seed, so it only
   catches a run that saw too little to mean anything, never a healthy one. */
const PLAY_FLOOR = { seasons: 900, granted: 25, abroad: 12 };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'simfacts-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const red = new Set();
let section = '0';
let failures = 0;
const fail = m => { failures += 1; red.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const ok = (cond, m) => { if (!cond) fail(m); return cond; };
const head = (id, title) => { section = id; console.log(`\n${id}. ${title}`); };

const swap = (from, to) => s => {
  if (!s.includes(from)) { console.error(`control ${CONTROL}: anchor not found: ${from}`); process.exit(2); }
  return s.replace(from, to);
};
const CONTROLS = {
  record: ['1', swap('"South Korea": 59, Spain: 59,', '"South Korea": 59, Spain: 29,')],
  default: ['2', swap('const record = INT_SCORING_RECORDS[s.nationality];', 'const record = INT_SCORING_RECORDS[s.nationality] ?? 40;')],
  equal: ['2', swap('if (intGoals <= record ||', 'if (intGoals < record ||')],
  unwired: ['3', swap('  awardAllTimeTopScorer(s, thisYear);\n', '\n')],
  label: ['4', swap('name: "Norwich City", country: "England", tier: 4, color: "#FFF200", league: "Championship"', 'name: "Norwich City", country: "England", tier: 4, color: "#FFF200", league: "Premier League"')],
  relabel: ['4', swap('name: "Hertha Berlin", country: "Germany", tier: 4, color: "#004C9E", league: "2. Bundesliga"', 'name: "Hertha Berlin", country: "Germany", tier: 4, color: "#004C9E", league: "Bundesliga"')],
  early: ['5', s => swap('  // Fair Play Award', '  awardAllTimeTopScorer(s, thisYear);\n  // Fair Play Award')(swap('  awardAllTimeTopScorer(s, thisYear);\n', '')(s))],
  early2: ['5', s => swap('  const intSeason = generateIntSeasonStats(s, thisYear);\n', '  awardAllTimeTopScorer(s, thisYear);\n  const intSeason = generateIntSeasonStats(s, thisYear);\n')(swap('  awardAllTimeTopScorer(s, thisYear);\n', '')(s))],
  wrongkey: ['5', swap('const record = INT_SCORING_RECORDS[s.nationality];', 'const record = INT_SCORING_RECORDS[s.currentClubCountry] ?? INT_SCORING_RECORDS[s.nationality];')],
  onesource: ['1', s => s, f => {
    if (!(f.intRecords.Spain && f.intRecords.Spain.sources.length === 2)) { console.error('control onesource: Spain has no two sources to cut'); process.exit(2); }
    f.intRecords.Spain.sources = f.intRecords.Spain.sources.slice(0, 1);
  }],
  unverify: ['4', s => s, f => {
    const row = f.clubLeagues['fb-65'];
    if (!(row && row.name === 'Norwich City')) { console.error('control unverify: fb-65 Norwich City is not a verified row'); process.exit(2); }
    delete f.clubLeagues['fb-65'];
    f.clubLeaguesUnverified['fb-65'] = { name: row.name, league: row.league, reason: 'control: moved back to unverified' };
    f.leagueEvidence[row.evidence].clubs = f.leagueEvidence[row.evidence].clubs.filter(c => c !== row.name);
    if (!f.leagueEvidence[row.evidence].clubs.length) delete f.leagueEvidence[row.evidence];
  }],
  stale: ['4', s => s, f => {
    const ev = f.leagueEvidence['Premier League 2026-27'];
    if (!(ev && ev.season === '2026-27')) { console.error('control stale: no Premier League 2026-27 evidence to date back'); process.exit(2); }
    ev.season = '2024-25';
  }],
  onemembership: ['6', s => s, f => {
    const w = f.leagueWorld && f.leagueWorld.Eredivisie;
    if (!(w && w.membership.length === 2)) { console.error('control onemembership: the Eredivisie has no two membership sources to cut'); process.exit(2); }
    w.membership = w.membership.slice(0, 1);
  }],
  twodecisions: ['6', s => s, f => {
    const held = f.clubSince && f.clubSince.held && f.clubSince.held.Eredivisie;
    if (!(held && held.length && f.clubSince.shipped)) { console.error('control twodecisions: no held Eredivisie club to list twice'); process.exit(2); }
    f.clubSince.shipped = [...f.clubSince.shipped, held[0]];
  }],
  greycolour: ['6', s => s, f => {
    const c = f.clubColours && f.clubColours.clubs && f.clubColours.clubs['Macarthur FC'];
    if (!(c && c.hex)) { console.error('control greycolour: Macarthur FC has no colour to grey out'); process.exit(2); }
    c.hex = '#8899aa';
  }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

function finish() {
  console.log('');
  if (CONTROL) {
    const target = CONTROLS[CONTROL][0];
    if (red.has(target)) { console.log(`control ${CONTROL}: section ${target} went red as it must (red: ${[...red].sort().join(', ')})`); process.exit(0); }
    console.log(`control ${CONTROL}: section ${target} stayed green, the control changed nothing it should have (red: ${[...red].sort().join(', ') || 'none'})`);
    process.exit(1);
  }
  console.log(failures ? `simCareerFacts: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}` : 'simCareerFacts: all sections green');
  process.exit(failures ? 1 : 0);
}

/* Comments and strings that only explain code must never satisfy a check
   that reads code: strip block and line comments before matching. */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

const engineRel = 'src/lib/soccerCareerEngine.ts';
const engineSrc = fs.readFileSync(path.join(ROOT, engineRel), 'utf8').replaceAll('\r\n', '\n');
const engineCode = CONTROL ? CONTROLS[CONTROL][1](engineSrc) : engineSrc;
/* Section 5 marks, from the outside, a step that ran the whole season: one
   line after `s.pendingSummary = season;` (the full season's own line, which
   the severe injury and year out paths never reach) writes the season's year
   to a global. In memory only and in the bundle only; sections 1 to 4 read
   engineCode, never this. */
const MARK_AT = '  s.pendingSummary = season;\n';
const markCount = engineCode.split(MARK_AT).length - 1;
const bundledCode = engineCode.replace(MARK_AT, `${MARK_AT}  globalThis.__careerFactsSeason = season.year;\n`);

async function bundleEngine() {
  const fwd = ROOT.replaceAll('\\', '/');
  const entry = path.join(tmpDir, 'facts-entry.mjs');
  const out = path.join(tmpDir, 'facts-bundle.mjs');
  fs.writeFileSync(entry, `export * as engine from '${fwd}/${engineRel}';\n`);
  const enginePath = path.resolve(ROOT, engineRel);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${fwd}/src` }, logLevel: 'error',
    plugins: [{
      name: 'career-facts',
      setup(b) {
        b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
          if (path.resolve(args.path) !== enginePath) return undefined;
          return { contents: bundledCode, loader: 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/soccerCareerFacts.json'), 'utf8'));
if (CONTROL && CONTROLS[CONTROL][2]) CONTROLS[CONTROL][2](facts);
let mod;
try { mod = await bundleEngine(); } catch (e) { section = 'bundle'; fail(`bundling the engine failed: ${String(e.message).split('\n')[0]}`); finish(); }
const E = mod.engine;

const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/* Two independent sources: two parseable URLs on two different hosts, no
   Wikipedia, each with the date it was read and what it said. */
function twoSources(sources, what) {
  if (!ok(Array.isArray(sources) && sources.length >= 2, `${what}: fewer than two sources`)) return false;
  const hosts = sources.map(x => hostOf(x.url));
  ok(hosts.every(Boolean), `${what}: a source URL does not parse`);
  ok(new Set(hosts).size >= 2, `${what}: both sources are on ${hosts[0]}`);
  ok(!hosts.some(h => /wikipedia\.org$|wikimedia\.org$|wikidata\.org$/.test(h)), `${what}: Wikipedia is never a source`);
  ok(sources.every(x => DATE.test(x.read || '') && typeof x.says === 'string' && x.says.length > 0), `${what}: a source has no read date or no note of what it said`);
  return true;
}

/* ─── 1. RECORDS ─── */
head('1', 'RECORDS: INT_SCORING_RECORDS equals the verified file, both ways');
const table = E.INT_SCORING_RECORDS;
ok(table && typeof table === 'object', 'the engine exports no INT_SCORING_RECORDS');
const fileRows = facts.intRecords || {};
const held = facts.intRecordsHeld || {};
for (const [nation, row] of Object.entries(fileRows)) {
  ok(Number.isInteger(row.goals) && row.goals > 0, `${nation}: the file's goals ${row.goals} is not a positive whole number`);
  ok(typeof row.holder === 'string' && row.holder.length > 2, `${nation}: no holder named`);
  ok(DATE.test(row.asOf || ''), `${nation}: no asOf date`);
  twoSources(row.sources, nation);
  ok(table[nation] === row.goals, `${nation}: the engine says ${table[nation]}, the verified file says ${row.goals}`);
}
for (const [nation, goals] of Object.entries(table)) {
  ok(Object.prototype.hasOwnProperty.call(fileRows, nation), `${nation}: the engine carries ${goals} with no verified row behind it`);
}
for (const nation of Object.keys(held)) {
  ok(!Object.prototype.hasOwnProperty.call(table, nation), `${nation}: held in the file (${held[nation].reason}) but the engine still carries a record`);
  ok(!Object.prototype.hasOwnProperty.call(fileRows, nation), `${nation}: both verified and held`);
}
console.log(`  ${Object.keys(table).length} engine rows, ${Object.keys(fileRows).length} verified rows, ${Object.keys(held).length} held (${Object.keys(held).join(', ') || 'none'})`);

/* ─── 2. PICKER ─── */
head('2', 'PICKER: every nation on the creation screen, the award only on a verified row');
const pageSrc = stripComments(fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8').replaceAll('\r\n', '\n'));
const listMatch = pageSrc.match(/const NATIONALITIES = \[([\s\S]*?)\];/);
const picker = listMatch ? [...listMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
ok(picker.length >= 100, `read only ${picker.length} nations off NATIONALITIES in src/pages/SoccerCareer.tsx`);
const award = E.awardAllTimeTopScorer;
ok(typeof award === 'function', 'the engine exports no awardAllTimeTopScorer');
const probe = (nation, goals, intl = true) => {
  const s = { nationality: nation, internationalCareer: intl, intStats: { goals }, awards: [], events: [] };
  award(s, 2031);
  return s;
};
const tops = s => s.awards.filter(a => a.name === 'All Time Top Scorer');
let withAward = 0; let without = 0;
for (const nation of picker) {
  const verified = Object.prototype.hasOwnProperty.call(fileRows, nation);
  if (!verified) {
    const s = probe(nation, 999);
    ok(tops(s).length === 0 && s.events.length === 0, `${nation}: no verified record, but 999 goals won the award (${s.events.join(' | ')})`);
    without += 1;
    continue;
  }
  withAward += 1;
  const rec = fileRows[nation].goals;
  for (const goals of [rec - 1, rec]) {
    const s = probe(nation, goals);
    ok(tops(s).length === 0, `${nation}: ${goals} goals (record ${rec}) won the award; it has to be passed`);
  }
  const s = probe(nation, rec + 1);
  ok(tops(s).length === 1 && s.awards[0].year === 2031, `${nation}: ${rec + 1} goals (record ${rec}) did not win the award once`);
  ok(s.events.length === 1 && s.events[0].includes(`Became ${nation}'s All Time Top International Scorer with ${rec + 1} goals`), `${nation}: the line reads "${s.events[0]}"`);
  award(s, 2032);
  ok(tops(s).length === 1 && s.events.length === 1, `${nation}: the award came twice`);
  ok(tops(probe(nation, rec + 50, false)).length === 0, `${nation}: the award without an international career`);
}
for (const nation of Object.keys(fileRows)) ok(picker.includes(nation), `${nation}: a verified row for a nation the picker does not offer (spelling?)`);
console.log(`  ${picker.length} nations on the picker: ${withAward} can win it on a verified record, ${without} cannot win it at all`);

/* ─── 3. WIRING ─── */
head('3', 'WIRING: the season calls the award, nothing else grants it, no fallback number');
const code = stripComments(engineCode);
const calls = code.split('awardAllTimeTopScorer(s, thisYear);').length - 1;
ok(calls === 1, `the season calls awardAllTimeTopScorer(s, thisYear) ${calls} times, 1 expected`);
const summerAt = code.indexOf('runTournamentSummer(s, season, thisYear);');
ok(summerAt > 0 && code.indexOf('awardAllTimeTopScorer(s, thisYear);') > summerAt, 'the award is checked before the summer tournament, so tournament goals count a season late');
const grants = code.split('name: "All Time Top Scorer"').length - 1;
ok(grants === 1, `"All Time Top Scorer" is granted at ${grants} places in the engine, only awardAllTimeTopScorer may grant it`);
const a = code.indexOf('export function awardAllTimeTopScorer(');
const body = a < 0 ? '' : code.slice(a, code.indexOf('\n}\n', a));
ok(body.includes('name: "All Time Top Scorer"'), 'the grant is not inside awardAllTimeTopScorer');
ok(!/\?\?\s*\d|\|\|\s*\d/.test(body), 'awardAllTimeTopScorer falls back to a number for a nation with no record');
ok(!/\bINT_RECORDS\b/.test(code), 'the old INT_RECORDS table is back');
console.log(`  1 call from the season, after the summer tournament, 1 grant, inside awardAllTimeTopScorer, no fallback`);

/* ─── 4. LABELS ─── */
head('4', 'LABELS: every HAND_CLUBS league label verified, pinned or listed as unverified');
const hand = E.HAND_CLUBS;
ok(Array.isArray(hand) && hand.length === 190, `HAND_CLUBS has ${hand && hand.length} rows, 190 expected`);
const evidence = facts.leagueEvidence || {};
const verified = facts.clubLeagues || {};
const pinned = facts.clubLeaguesPinned || {};
const unverified = facts.clubLeaguesUnverified || {};
for (const [key, ev] of Object.entries(evidence)) {
  ok(typeof ev.league === 'string' && ev.league.length > 0, `evidence ${key}: no league`);
  ok(CURRENT_SEASONS.includes(ev.season), `evidence ${key}: season "${ev.season}" is not the current one (${CURRENT_SEASONS.join(' or ')}), so it says nothing about where the club plays now`);
  twoSources(ev.sources, `evidence ${key}`);
  ok(Array.isArray(ev.clubs) && ev.clubs.length > 0, `evidence ${key}: names no club`);
}
/* A verified or pinned row's 2026-27 league must come from an evidence group
   for that league that lists the club. */
const backed = (name, league, key) => {
  const ev = evidence[key];
  if (!ok(!!ev, `${name}: evidence group "${key}" does not exist`)) return;
  ok(ev.league === league, `${name}: "${league}" rests on evidence for "${ev.league}"`);
  ok(ev.clubs.includes(name), `${name}: evidence group "${key}" does not list it`);
};
let nVer = 0; let nPin = 0; let nUnv = 0;
const seen = new Set();
for (const row of hand) {
  const v = verified[row.id];
  const p = pinned[row.id];
  const u = unverified[row.id];
  if (!ok([v, p, u].filter(Boolean).length === 1, `${row.id} ${row.name}: must be in exactly one of clubLeagues, clubLeaguesPinned and clubLeaguesUnverified`)) continue;
  const f = v || p || u;
  seen.add(row.id);
  ok(f.name === row.name, `${row.id}: the file names ${f.name}, the engine ${row.name}`);
  ok(f.league === row.league, `${row.name}: the engine labels it "${row.league}", the file says "${f.league}"${p ? ' (pinned: a label serves every era, so its 2026-27 league waits for the league by year round)' : ''}`);
  if (v) {
    nVer += 1;
    backed(row.name, v.league, v.evidence);
  } else if (p) {
    nPin += 1;
    ok(typeof p.league2026 === 'string' && p.league2026.length > 0 && p.league2026 !== p.league, `${row.name}: pinned with no 2026-27 league that differs from its label`);
    backed(row.name, p.league2026, p.evidence);
    ok(typeof p.reason === 'string' && p.reason.length > 10, `${row.name}: pinned with no reason given`);
  } else {
    nUnv += 1;
    ok(typeof u.reason === 'string' && u.reason.length > 10, `${row.name}: unverified with no reason given`);
  }
}
for (const id of [...Object.keys(verified), ...Object.keys(pinned), ...Object.keys(unverified)]) ok(seen.has(id), `${id}: in the file but not a HAND_CLUBS row`);
const users = [...Object.values(verified), ...Object.values(pinned)];
for (const [key, ev] of Object.entries(evidence)) {
  for (const name of ev.clubs) ok(users.some(v => v.name === name && v.evidence === key), `evidence ${key} lists ${name}, which no verified or pinned row uses`);
}
ok(Number.isInteger(PINNED_MAX) && nPin <= PINNED_MAX, `${nPin} labels pinned, the ratchet allows ${PINNED_MAX}: a new pin is a lead's decision, never a quiet add`);
ok(Number.isInteger(UNVERIFIED_MAX) && nUnv <= UNVERIFIED_MAX, `${nUnv} labels unverified, the ratchet allows ${UNVERIFIED_MAX}: verify them, never add`);
console.log(`  ${nVer} labels verified across ${Object.keys(evidence).length} evidence groups (all ${CURRENT_SEASONS.join(' or ')}), ${nPin} pinned to their old label (ratchet ${PINNED_MAX}), ${nUnv} unverified (ratchet ${UNVERIFIED_MAX})`);

/* ─── 5. PLAYED ─── */
head('5', "PLAYED: seeded careers, the award the season his goals pass HIS nation's record");
const SEED = Number(process.env.SIM_CAREER_FACTS_SEED || 1);
/* Low, middle and high records, nations whose players often move abroad. */
const PLAY_NATIONS = ['Italy', 'Colombia', 'Nigeria', 'Croatia', 'Spain', 'South Korea', 'Norway', 'Brazil'];
const PER_NATION = 6;
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* One answer per screen, the way the page calls the engine. */
const stepCareer = (s, clubs) => {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return s.pendingCoverAthleteEvent ? E.handleCoverAthleteDecision(s, false) : E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: return null;
  }
};
const LINE = "All Time Top International Scorer";
let played = 0; let fullSeasons = 0; let granted = 0; let summerGrants = 0; let abroadGrants = 0; let stuck = 0;
if (!ok(markCount === 1, `the season marker anchor ${JSON.stringify(MARK_AT)} is in the engine ${markCount} times, 1 expected; move the marker, never drop the section`)) finish();
const realRandom = Math.random;
try {
  const clubs = E.FALLBACK_CLUBS;
  for (const nation of PLAY_NATIONS) {
    if (!ok(Number.isInteger(E.INT_SCORING_RECORDS[nation]), `${nation}: no record in the engine to play against`)) continue;
    for (let k = 0; k < PER_NATION; k++) {
      const seed = SEED * 100003 + PLAY_NATIONS.indexOf(nation) * 1009 + k * 7919;
      Math.random = mulberry32(seed);
      const o = 64 + (k % 6);
      const st = { pace: o, shooting: o + 4, passing: o, dribbling: o, defending: o - 20, physical: o, reflexes: o - 30 };
      let s = E.initCareer(`Facts ${seed}`, nation, 'ST', '2020s', st, o, 2020, clubs, null, 90);
      played += 1;
      let steps = 0;
      for (; steps < 900 && !s.retired; steps++) {
        const had = s.awards.some(a => a.name === 'All Time Top Scorer');
        globalThis.__careerFactsSeason = null;
        const phase = s.phase;
        const n = stepCareer(s, clubs);
        if (!n) { ok(false, `${nation} seed ${seed}: no answer for the phase "${phase}"`); break; }
        const full = globalThis.__careerFactsSeason;
        /* His nation now: a two flags switch (random event 452) can move it, and
           the record that counts is the one of the flag he plays for. */
        const nat = n.nationality;
        const rec = E.INT_SCORING_RECORDS[nat];
        const won = n.awards.filter(a => a.name === 'All Time Top Scorer');
        ok(won.length <= 1, `${nation} seed ${seed}: the award ${won.length} times`);
        if (full !== null) fullSeasons += 1;
        if (!had && won.length) {
          granted += 1;
          const at = n.intStats.goals;
          ok(full !== null, `${nation} seed ${seed}: the award landed in a "${phase}" step that played no season`);
          ok(won[0].year === full, `${nation} seed ${seed}: the award is dated ${won[0].year}, the season that granted it is ${full}`);
          ok(rec !== undefined && at > rec, `${nation} seed ${seed}: the award at ${at} goals for ${nat}, whose record is ${rec}`);
          const line = n.events.find(e => e.includes(LINE));
          ok(!!line && line.includes(`Became ${nat}'s ${LINE} with ${at} goals`), `${nation} seed ${seed}: the screen says ${at} goals, the line reads "${line}"`);
          if (n.seasons.at(-1)?.tournamentResult) summerGrants += 1;
          if (n.currentClubCountry && n.currentClubCountry !== nat) abroadGrants += 1;
        } else if (!had && full !== null && rec !== undefined && n.internationalCareer && n.intStats.goals > rec) {
          ok(false, `${nation} seed ${seed}: the season ${full} ended on ${n.intStats.goals} goals, past ${nat}'s record of ${rec}, with no award`);
        }
        s = n;
      }
      if (!s.retired) stuck += 1;
    }
  }
} finally {
  Math.random = realRandom;
}
ok(stuck === 0, `${stuck} careers did not reach retirement in 900 steps`);
/* Floors from measured headroom, written in the header: an empty run must
   never pass for a green one. */
ok(fullSeasons >= PLAY_FLOOR.seasons, `only ${fullSeasons} full seasons played, ${PLAY_FLOOR.seasons} expected at least`);
ok(granted >= PLAY_FLOOR.granted, `only ${granted} careers won the award, ${PLAY_FLOOR.granted} expected at least, so the checks above saw too little`);
ok(abroadGrants >= PLAY_FLOOR.abroad, `only ${abroadGrants} awards went to a man playing abroad, ${PLAY_FLOOR.abroad} expected at least (the wrong key check needs them)`);
/* ─── 6. LEAGUE WORLD (Round 1100) ───
   The leagues the career club pool is generated from. Every league label of
   the generator's table has one row in leagueWorld with its whole lineup,
   size, shape and games, a membership read from two hosts and its format
   pages; a league the generator holds out gives its reason there; a colour
   the generator supplies is backed by a colour in words from two sources;
   and every generated club has one decision in clubSince. */
function leagueWorldSection() {
  head('6', 'LEAGUE WORLD: the pool generator and the facts file say the same thing');
  const world = facts.leagueWorld || {};
  const labels = Object.keys(world).filter(k => k !== 'about');
  const SHAPES = new Set(['plain', 'split', 'groups', 'four-meetings', 'finals', 'conferences', 'two-tournaments']);
  let named = 0; let twoFormats = 0;
  for (const label of labels) {
    const w = world[label];
    ok(CURRENT_SEASONS.includes(w.season), `${label}: season "${w.season}" is not the current one`);
    if (w.evidence !== null) ok(evidence[w.evidence] && evidence[w.evidence].league === label, `${label}: its evidence group "${w.evidence}" is not a ${label} group`);
    const members = Array.isArray(w.members) ? w.members : [];
    ok(members.length > 0 && new Set(members).size === members.length && members.every(n => typeof n === 'string' && /^[ -~]+$/.test(n)), `${label}: members must be distinct ASCII names`);
    named += members.length;
    const unnamed = Array.isArray(w.unnamed) ? w.unnamed : [];
    ok(Number.isInteger(w.size) && w.size === members.length + unnamed.length, `${label}: size ${w.size}, ${members.length} members and ${unnamed.length} unnamed`);
    if (unnamed.length) ok(typeof w.unnamedWhy === 'string' && w.unnamedWhy.length > 10, `${label}: unnamed clubs with no reason`);
    if (w.evidence !== null && evidence[w.evidence]) for (const n of evidence[w.evidence].clubs) ok(members.includes(n), `${label}: hand club ${n} is not among its members`);
    ok(SHAPES.has(w.shape), `${label}: shape "${w.shape}"`);
    ok(Array.isArray(w.points) && w.points.join() === '3,1,0', `${label}: points ${JSON.stringify(w.points)}`);
    if (w.shape === 'plain') ok(w.games === 2 * (w.size - 1), `${label}: plain with ${w.games} games for ${w.size} clubs`);
    else ok(w.games === null || (Number.isInteger(w.games) && w.games > 0), `${label}: games ${w.games}`);
    twoSources(w.membership, `${label} membership`);
    const format = Array.isArray(w.format) ? w.format : [];
    ok(format.every(x => hostOf(x.url) && !/wiki/.test(hostOf(x.url)) && DATE.test(x.read || '') && typeof x.says === 'string' && x.says.length > 0), `${label}: a format source has no host, date or note, or is a wiki`);
    if (new Set(format.map(x => hostOf(x.url))).size >= 2) twoFormats += 1;
  }
  ok(labels.length >= 25, `only ${labels.length} leagues in leagueWorld, 25 expected at least`);
  /* colours */
  const colours = (facts.clubColours && facts.clubColours.clubs) || {};
  for (const [club, c] of Object.entries(colours)) {
    ok(typeof c.colour === 'string' && c.colour.length > 2 && /^#[0-9a-fA-F]{6}$/.test(c.hex || '') && c.hex.toLowerCase() !== '#8899aa', `colour of ${club}: needs the colour in words and a hex that is not the fallback grey`);
    twoSources(c.sources, `colour of ${club}`);
  }
  /* since: one decision a club, held clubs only under a league that has them */
  const since = facts.clubSince || {};
  const heldLists = since.held || {};
  const heldNames = Object.values(heldLists).flat();
  const decided = [...(since.shipped || []), ...heldNames, ...Object.keys(since.since || {})];
  ok(new Set(decided).size === decided.length, 'clubSince: a club has two decisions');
  ok(since.heldBefore === 2026, `clubSince: heldBefore is ${since.heldBefore}, 2026 (the season the list describes) expected`);
  for (const [label, names] of Object.entries(heldLists)) for (const n of names) ok(!!world[label] && world[label].members.includes(n), `clubSince holds ${n} under ${label}, which does not list it`);
  for (const [club, s] of Object.entries(since.since || {})) {
    ok(Number.isInteger(s.year) && s.year >= 1850 && s.year <= 2026, `since of ${club}: year ${s.year}`);
    if (s.year > 1990) twoSources(s.sources, `since of ${club}`);
    else ok(Array.isArray(s.sources) && s.sources.length >= 1 && s.sources.every(x => hostOf(x.url) && DATE.test(x.read || '') && x.says), `since of ${club}: needs a source line`);
  }
  console.log(`  ${labels.length} leagues, ${named} member names, each lineup read from two hosts; ${twoFormats} with a format read from two hosts; ${Object.keys(colours).length} colour(s) in words; ${(since.shipped || []).length} shipped, ${heldNames.length} held before ${since.heldBefore}, ${Object.keys(since.since || {}).length} with a first season`);
  return { world, labels, colours, since, heldNames };
}
console.log(`  ${played} careers (seed ${SEED}), ${fullSeasons} full seasons, ${granted} awards, every one the season his goals passed his own record (${abroadGrants} while abroad, ${summerGrants} ina tournament season)`);

const LW = leagueWorldSection();
void LW;
finish();
