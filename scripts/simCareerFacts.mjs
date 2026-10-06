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
   3 WIRING     the season really calls awardAllTimeTopScorer, the award is
                pushed nowhere else, and no fallback number survives.
   4 LABELS     every HAND_CLUBS row (by id and name) is in the file, either
                verified (its label equals the file's, and the file's evidence
                group has two sources on two hosts that list the club for the
                season named) or in clubLeaguesUnverified, a ratchet: its count
                may only fall (UNVERIFIED_MAX below) and its labels must still
                equal the engine's, so nothing changes unseen.

   Negative controls, SIM_CAREER_FACTS_CONTROL=<name>. Each asserts the
   source string it rewrites exists (in memory, never on disk) and the run
   exits 0 only if its target section went red:
     record     Spain's record back to the stale 29                  -> 1
     default    the old `?? 40` default for unlisted nations         -> 2
     equal      the award at the record instead of past it (>=)      -> 2
     unwired    the season stops calling awardAllTimeTopScorer       -> 3
     label      Hertha Berlin back to "Bundesliga"                   -> 4

   Run: node scripts/simCareerFacts.mjs
   No network and no database: the engine is bundled from this tree. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CAREER_FACTS_CONTROL || '';
const UNVERIFIED_MAX = Number.NaN; // set below once the file is final
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
  label: ['4', swap('name: "Hertha Berlin", country: "Germany", tier: 4, color: "#004C9E", league: "2. Bundesliga"', 'name: "Hertha Berlin", country: "Germany", tier: 4, color: "#004C9E", league: "Bundesliga"')],
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
          return { contents: engineCode, loader: 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/soccerCareerFacts.json'), 'utf8'));
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
const grants = code.split('name: "All Time Top Scorer"').length - 1;
ok(grants === 1, `"All Time Top Scorer" is granted at ${grants} places in the engine, only awardAllTimeTopScorer may grant it`);
const a = code.indexOf('export function awardAllTimeTopScorer(');
const body = a < 0 ? '' : code.slice(a, code.indexOf('\n}\n', a));
ok(body.includes('name: "All Time Top Scorer"'), 'the grant is not inside awardAllTimeTopScorer');
ok(!/\?\?\s*\d|\|\|\s*\d/.test(body), 'awardAllTimeTopScorer falls back to a number for a nation with no record');
ok(!/\bINT_RECORDS\b/.test(code), 'the old INT_RECORDS table is back');
console.log(`  1 call from the season, 1 grant, inside awardAllTimeTopScorer, no fallback`);

/* ─── 4. LABELS ─── */
head('4', 'LABELS: every HAND_CLUBS league label verified, or listed as unverified');
const hand = E.HAND_CLUBS;
ok(Array.isArray(hand) && hand.length === 190, `HAND_CLUBS has ${hand && hand.length} rows, 190 expected`);
const evidence = facts.leagueEvidence || {};
const verified = facts.clubLeagues || {};
const unverified = facts.clubLeaguesUnverified || {};
for (const [key, ev] of Object.entries(evidence)) {
  ok(typeof ev.league === 'string' && ev.league && /^20\d\d(-\d\d)?$/.test(ev.season || ''), `evidence ${key}: no league or season`);
  twoSources(ev.sources, `evidence ${key}`);
  ok(Array.isArray(ev.clubs) && ev.clubs.length > 0, `evidence ${key}: names no club`);
}
let nVer = 0; let nUnv = 0;
const seen = new Set();
for (const row of hand) {
  const v = verified[row.id];
  const u = unverified[row.id];
  if (!ok(!!v !== !!u, `${row.id} ${row.name}: must be in exactly one of clubLeagues and clubLeaguesUnverified`)) continue;
  const f = v || u;
  seen.add(row.id);
  ok(f.name === row.name, `${row.id}: the file names ${f.name}, the engine ${row.name}`);
  ok(f.league === row.league, `${row.name}: the engine labels it "${row.league}", the file says "${f.league}"`);
  if (v) {
    nVer += 1;
    const ev = evidence[v.evidence];
    if (!ok(!!ev, `${row.name}: evidence group "${v.evidence}" does not exist`)) continue;
    ok(ev.league === v.league, `${row.name}: labelled "${v.league}" on evidence for "${ev.league}"`);
    ok(ev.clubs.includes(row.name), `${row.name}: evidence group "${v.evidence}" does not list it`);
  } else {
    nUnv += 1;
    ok(typeof u.reason === 'string' && u.reason.length > 10, `${row.name}: unverified with no reason given`);
  }
}
for (const id of [...Object.keys(verified), ...Object.keys(unverified)]) ok(seen.has(id), `${id}: in the file but not a HAND_CLUBS row`);
for (const [key, ev] of Object.entries(evidence)) {
  for (const name of ev.clubs) ok(Object.values(verified).some(v => v.name === name && v.evidence === key), `evidence ${key} lists ${name}, which no verified row uses`);
}
ok(Number.isInteger(UNVERIFIED_MAX) && nUnv <= UNVERIFIED_MAX, `${nUnv} labels unverified, the ratchet allows ${UNVERIFIED_MAX}: verify them, never add`);
console.log(`  ${nVer} labels verified across ${Object.keys(evidence).length} evidence groups, ${nUnv} unverified (ratchet ${UNVERIFIED_MAX})`);
finish();
