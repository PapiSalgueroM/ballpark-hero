/* Round 1035: the A-League Men in Club Manager, held to its ledgers and
   played for real.

   The squads are generated offline (scripts/genClubManagerALeague.mjs) from
   the Round 1034 ledgers plus two research files this round added
   (_values.json, _people.json), and the league's rules row leaves Auckland
   FC and Wellington Phoenix out of the Australia Cup. This harness holds
   what a reader cannot check by eye, on the real engine bundled with
   esbuild, offline (the database client is a stub that throws):

   A. LEDGER (hard). Every ledger row with a position group is in the
      generated file exactly once, under its own club; nobody in the
      generated file is missing from the ledgers (the invented player check);
      the two group-less rows are not shipped.
   B. VALUES (hard). Every club's Transfermarkt page in _values.json is that
      club's 26/27 squad page (its id from _membership.json, season 2026),
      every shipped player's value row cites it, every rating is the shared
      curve's rating of his EUR value (scripts/lib/cmValueCurve.mjs), every
      value is the curve's pounds at two decimals and above zero, and every
      man with no value is at the floor and listed in CM_ALEAGUE_NO_VALUE
      (and nobody else is). The count of no value men is printed.
   C. NATIONALITY (hard). Every shipped nationality has at least two hosts in
      _people.json whose own reading is that nationality, every one has a
      flag, nationalityOf answers it for the modern world, and a man with no
      two-host nationality gets null. Every shipped age has two hosts.
   D. SEASONS (hard). SEEDS seeded careers at A-League clubs that enter the
      cup, and one at each club that does not:
      a 12 club table, every club playing 2 x 11 = 22 league matches, wins
      equal losses, the summer keeps all 12 (no relegation), every board
      reads the rules row (the top two asked to win the league, the
      playoff rung asked to "Make the finals" at sixth, the rest a mid-table
      target of 9th, nobody asked to stay up), the Australia Cup draws
      neither excluded club (bracket and byes), reaches a final with a
      winner, and a career at Auckland FC or Wellington Phoenix schedules no
      cup week, draws no bracket and names no cup. And every other modern
      league with a cup still crowns a cup winner (the byes fix is shared).
   E. COUNTS (hard). The club, league and country counts written in the
      copy (the Club Manager guide, the help, the registry, the search
      description and its generated part, the page) agree with REAL_LEAGUES,
      and every "over N real players" sits under the real total.

   MEASURED 2026-10-06 (Round 1035 tree), SIM_SEED unset and 1 to 4, ten
   seasons a run plus the two excluded clubs:
     (filled in below the controls once measured)

   NEGATIVE CONTROLS (each must turn the run red, and each refuses to run if
   the text it mutates is missing):
     SIM_ALEAGUE_CONTROL=invented   a made up man is added to Sydney FC in
                                    the generated file: part A goes red
     SIM_ALEAGUE_CONTROL=offcurve   one rating in the generated file moves
                                    up a point: part B goes red
     SIM_ALEAGUE_CONTROL=onehost    a man whose nationality is on one host
                                    is given it in the generated map: part
                                    C goes red
     SIM_ALEAGUE_CONTROL=excluded   the rules row loses cupExcluded: part D
                                    goes red (an excluded club is drawn and
                                    plays a cup)
     SIM_ALEAGUE_CONTROL=nobyes     the bracket's byes are switched off: the
                                    short cups lose their final, part D red
     SIM_ALEAGUE_CONTROL=stalecount the guide says 368 clubs again: part E
                                    goes red

   Run: node scripts/simClubManagerALeague.mjs   (SIM_SEEDS=n, default 10)
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { POS_MAP, ratingOf, gbpM, usdOfEur, FLOOR_USD, RATING_FLOOR } from './lib/cmValueCurve.mjs';
import { ENGINE_NAME, GROUP_OF, GROUP_DEFAULT, NATIONALITY_ALIAS } from './lib/aleagueClubs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const DIR = path.join(ROOT, 'scripts/data/gatheredSquads/aleague2026');
const SEEDS = Number(process.env.SIM_SEEDS || 10);
const SEED_SET = process.env.SIM_SEED || '';
const CONTROL = process.env.SIM_ALEAGUE_CONTROL || '';
const CONTROLS = ['invented', 'offcurve', 'onehost', 'excluded', 'nobyes', 'stalecount'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`SIM_ALEAGUE_CONTROL=${CONTROL} is not one of ${CONTROLS.join(', ')}`); process.exit(1); }

const LEAGUE = 'aleague';
const EXCLUDED = ['Auckland FC', 'Wellington Phoenix'];
const MANAGED = ['Sydney FC', 'Melbourne Victory', 'Perth Glory', 'Newcastle Jets', 'Macarthur FC'];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmaleague-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const readJson = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

/* Replace exactly one occurrence, refusing to run when it is absent: a
   control that changes nothing would leave the run green for nothing. */
function mutateOnce(src, from, to, label) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`control ${label}: expected the text once, found it ${n} times; refusing to run`); process.exit(1); }
  return src.replace(from, to);
}

function transformEngine(src) {
  if (CONTROL === 'excluded') src = mutateOnce(src, "cup: 'Australia Cup', cupExcluded: ['Auckland FC', 'Wellington Phoenix'],", "cup: 'Australia Cup',", 'excluded');
  if (CONTROL === 'nobyes') src = mutateOnce(src, 'const short = ordered.length > 8 && ordered.length < 16;', 'const short = false;', 'nobyes');
  return `${src}\nexport { relegationSpots as __relegationSpots };\n`;
}

function transformALeague(src) {
  if (CONTROL === 'invented') src = mutateOnce(src, "  'Sydney FC': [\n", "  'Sydney FC': [\n    { n: 'Invented Fella', p: 'ST', a: 24, v: 0.5, r: 61 },\n", 'invented');
  if (CONTROL === 'offcurve') {
    const line = src.match(/  'Sydney FC': \[\n(    \{ n: [^\n]*r: (\d+) \},\n)/);
    if (!line) { console.error('control offcurve: no Sydney FC row found; refusing to run'); process.exit(1); }
    src = mutateOnce(src, line[1], line[1].replace(`r: ${line[2]} }`, `r: ${Number(line[2]) + 1} }`), 'offcurve');
  }
  if (CONTROL === 'onehost') src = mutateOnce(src, 'export const CM_ALEAGUE_NATIONALITIES: Record<string, string> = {\n', "export const CM_ALEAGUE_NATIONALITIES: Record<string, string> = {\n  'Denver Minster': 'Australia',\n", 'onehost');
  return src;
}

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, [
    `export * from '${ROOT_FWD}/src/lib/clubManager.ts';`,
    `export * as al from '${ROOT_FWD}/src/data/clubManagerALeague2026.ts';`,
    `export { nationalityOf } from '${ROOT_FWD}/src/data/playerNationalities.ts';`,
    `export { FLAG_CODES } from '${ROOT_FWD}/src/components/FlagImg.tsx';`,
    '',
  ].join('\n'));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error', jsx: 'automatic',
    plugins: [{
      name: 'cm-aleague',
      setup(b) {
        b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
        b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline harness"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "x";', loader: 'js' }));
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => ({ contents: transformEngine(fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n')), loader: 'ts', resolveDir: path.dirname(a.path) }));
        b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerALeague2026\.ts$/ }, a => ({ contents: transformALeague(fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n')), loader: 'ts', resolveDir: path.dirname(a.path) }));
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

/* A. The generated squads are the ledgers, nothing more and nothing less. */
function partLedger(cm, membership) {
  console.log('A) every ledger row with a group ships once, under its own club, and nobody else does');
  const rosters = cm.al.CM_ALEAGUE_ROSTERS;
  const lg = cm.REAL_LEAGUES.find(l => l.id === LEAGUE);
  let rows = 0, skipped = 0;
  const shipped = new Map();
  for (const [club, list] of Object.entries(rosters)) for (const p of list) shipped.set(`${club}|${p.n}`, (shipped.get(`${club}|${p.n}`) ?? 0) + 1);
  const expected = new Set();
  for (const c of membership.clubs) {
    const engine = lg?.clubs.includes(ENGINE_NAME[c.slug]) && rosters[ENGINE_NAME[c.slug]] ? ENGINE_NAME[c.slug] : null;
    if (!engine) { fail(`${c.slug} has no club in REAL_LEAGUES with a generated roster`); continue; }
    for (const r of readJson(`${c.slug}.json`).rows) {
      if (!r.group) { skipped += 1; if (shipped.has(`${engine}|${r.name}`)) fail(`${r.name} has no settled group and still ships`); continue; }
      rows += 1;
      expected.add(`${engine}|${r.name}`);
      const n = shipped.get(`${engine}|${r.name}`) ?? 0;
      if (n !== 1) fail(`${r.name} (${engine}) ships ${n} times, not once`);
    }
  }
  for (const k of shipped.keys()) if (!expected.has(k)) { const [club, name] = k.split('|'); fail(`${name} at ${club} is in the generated file and in no ledger row: an invented player`); }
  const clubs = Object.keys(rosters).sort();
  if (JSON.stringify(clubs) !== JSON.stringify([...(lg?.clubs ?? [])].sort())) fail(`the generated clubs (${clubs.length}) are not the league's clubs`);
  console.log(`   ${rows} ledger rows with a group, ${shipped.size} shipped, ${skipped} without a group held back`);
}

/* B. Values: one page a club, one curve for everybody. */
function partValues(cm, membership, values) {
  console.log('B) every value cites its club page and every rating sits on the shared curve');
  const rosters = cm.al.CM_ALEAGUE_ROSTERS;
  const noValueListed = new Set(cm.al.CM_ALEAGUE_NO_VALUE);
  const noValueFound = new Set();
  let checked = 0;
  for (const c of membership.clubs) {
    const engine = ENGINE_NAME[c.slug];
    const vc = values.clubs.find(x => x.slug === c.slug);
    if (!vc) { fail(`${c.slug} has no _values.json entry`); continue; }
    const want = new RegExp(`^https://www\\.transfermarkt\\.com/[a-z-]+/kader/verein/${c.tmId}/saison_id/2026/plus/1$`);
    if (!want.test(vc.url ?? '')) fail(`${c.slug}'s value page ${vc.url} is not Transfermarkt's 26/27 squad page for club ${c.tmId}`);
    if (vc.read !== values.read) fail(`${c.slug}'s page was read ${vc.read}, not on the build day ${values.read}`);
    const byName = new Map(vc.players.map(p => [p.name, p]));
    for (const p of rosters[engine] ?? []) {
      const row = byName.get(p.n);
      if (!row) { fail(`${p.n} (${engine}) has no value row on his club's page`); continue; }
      checked += 1;
      const has = Number.isFinite(row.valueEur) && row.valueEur > 0;
      if (has && !row.tmId) fail(`${p.n} has a value but no Transfermarkt id to tie it to the page`);
      const usd = has ? usdOfEur(row.valueEur) : FLOOR_USD;
      if (!has) noValueFound.add(`${p.n}|${engine}`);
      if (p.r !== ratingOf(usd)) fail(`${p.n} (${engine}) is rated ${p.r}; the curve gives ${ratingOf(usd)} for ${has ? `EUR ${row.valueEur}` : 'no value (the floor)'}`);
      if (p.v !== gbpM(usd, 2)) fail(`${p.n} (${engine}) is valued ${p.v}, the curve's pounds are ${gbpM(usd, 2)}`);
      if (!(p.v > 0)) fail(`${p.n} (${engine}) has a value at or below zero`);
      if (!has && p.r !== RATING_FLOOR) fail(`${p.n} has no value and is not at the floor`);
      const group = readJson(`${c.slug}.json`).rows.find(r => r.name === p.n)?.group;
      if (group && GROUP_OF[p.p] !== group) fail(`${p.n} plays ${p.p}, outside his ledger group ${group}`);
      const mapped = POS_MAP[row.tmPosition];
      const wantPos = group ? (mapped && GROUP_OF[mapped] === group ? mapped : GROUP_DEFAULT[group]) : null;
      if (wantPos && p.p !== wantPos) fail(`${p.n} plays ${p.p}; his page says ${row.tmPosition}, so the rule gives ${wantPos}`);
    }
  }
  for (const k of noValueFound) if (!noValueListed.has(k)) fail(`${k} has no value and is missing from CM_ALEAGUE_NO_VALUE`);
  for (const k of noValueListed) if (!noValueFound.has(k)) fail(`${k} is listed with no value but has one`);
  console.log(`   ${checked} players checked against ${values.clubs.length} club pages, ${noValueFound.size} with no value at the floor (rating ${RATING_FLOOR})`);
  /* The partial rule: a club where more than half the shipped rows have no value. */
  for (const [club, list] of Object.entries(rosters)) {
    const none = list.filter(p => noValueFound.has(`${p.n}|${club}`)).length;
    const partial = cm.al.CM_ALEAGUE_PARTIAL.includes(club);
    if (partial !== (none * 2 > list.length)) fail(`${club}: ${none} of ${list.length} with no value, and CM_ALEAGUE_PARTIAL says ${partial}`);
    if (partial !== cm.isPartialClub(club)) fail(`${club}: isPartialClub disagrees with CM_ALEAGUE_PARTIAL`);
  }
}

/* C. Nationality on two hosts or not at all, and an age on two hosts. */
function partPeople(cm, people) {
  console.log('C) every shipped nationality and age stands on two hosts');
  const canon = s => (s ? NATIONALITY_ALIAS[s] ?? s : null);
  const map = cm.al.CM_ALEAGUE_NATIONALITIES;
  const rosters = cm.al.CM_ALEAGUE_ROSTERS;
  const byName = new Map(people.players.map(p => [p.name, p]));
  let shipped = 0, unknown = 0;
  for (const [club, list] of Object.entries(rosters)) {
    for (const p of list) {
      const rec = byName.get(p.n);
      if (!rec) { fail(`${p.n} has no _people.json row`); continue; }
      const nat = map[p.n];
      if (nat) {
        shipped += 1;
        const seen = { 'transfermarkt.com': canon(rec.seen.tm?.[0] ?? null), 'site.api.espn.com': canon(rec.seen.espn), 'fotmob.com': canon(rec.seen.fotmob) };
        const agree = Object.entries(seen).filter(([, v]) => v === nat).map(([h]) => h);
        if (agree.length < 2) fail(`${p.n} ships ${nat} on ${agree.length} host(s) (${agree.join(', ') || 'none'})`);
        if (rec.nationality !== nat) fail(`${p.n}: the generated map says ${nat}, _people.json says ${rec.nationality}`);
        if (!cm.FLAG_CODES[nat]) fail(`${p.n}'s nationality ${nat} has no flag`);
        if (cm.nationalityOf('now', p.n) !== nat) fail(`nationalityOf answers ${cm.nationalityOf('now', p.n)} for ${p.n}, not ${nat}`);
      } else {
        unknown += 1;
        if (rec.nationality) fail(`${p.n} has a two host nationality (${rec.nationality}) that did not ship`);
        if (cm.nationalityOf('now', p.n) !== null) fail(`${p.n} has no two host nationality and nationalityOf still answers ${cm.nationalityOf('now', p.n)}`);
      }
      if (rec.age !== p.a) fail(`${p.n} is ${p.a} in the game and ${rec.age} in the receipts`);
      if ((rec.ageHosts ?? []).length < 2) fail(`${p.n}'s age stands on ${(rec.ageHosts ?? []).length} host(s)`);
    }
  }
  console.log(`   ${shipped} nationalities shipped on two hosts, ${unknown} left unknown, every age on two hosts`);
}

/* Every headline the season printed is kept, since the state holds only the
   newest eight. */
function playSeason(cm, state) {
  let s = state;
  for (let i = 0; i < 160; i++) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') return { state: s };
    if (s.sacked) return { state: s, sacked: true };
  }
  return { state: s, stuck: true };
}

const LADDER = { 'Win the A-League Men': 1, 'Make the finals': 6, 'Finish mid-table or better': 9 };

/* D. The league plays the way its rules row says, and its cup leaves the two
   New Zealand clubs out. */
function partSeasons(cm) {
  console.log(`D) ${SEEDS} seeded seasons at A-League clubs, plus one at each club outside the cup`);
  const lg = cm.REAL_LEAGUES.find(l => l.id === LEAGUE);
  const rules = cm.leagueRulesOf(LEAGUE);
  if (lg.clubs.length !== 12) fail(`the A-League Men has ${lg.clubs.length} clubs, not 12`);
  if (rules.drop !== 0 || cm.__relegationSpots(LEAGUE) !== 0) fail(`the A-League Men relegates ${rules.drop} (engine ${cm.__relegationSpots(LEAGUE)})`);
  if (rules.cup !== 'Australia Cup') fail(`the rules row's cup is ${rules.cup}`);
  /* The board: two asked to win it, the playoff rung asked for the finals at
     sixth, everybody else a mid-table ninth, nobody asked to stay up. */
  const asks = {};
  for (const c of lg.clubs) {
    const o = cm.buildBoardObjectives(c, false, lg.clubs.length).find(x => x.id === 'league');
    if (!o) { fail(`${c}'s board sets no league objective`); continue; }
    asks[o.label] = (asks[o.label] ?? 0) + 1;
    if (!(o.label in LADDER)) fail(`${c}'s board asks "${o.label}", not a rung of the playoffs ladder`);
    else if (o.target !== LADDER[o.label]) fail(`${c}'s board asks "${o.label}" with target ${o.target}, not ${LADDER[o.label]}`);
  }
  if (asks['Win the A-League Men'] !== 2 || asks['Make the finals'] !== 5 || asks['Finish mid-table or better'] !== 5) fail(`the boards split ${JSON.stringify(asks)}, not 2 title, 5 finals (ranks 3 to 7), 5 mid-table`);
  console.log(`   boards: ${JSON.stringify(asks)}`);

  let ended = 0, sacked = 0, finals = 0, k = 0;
  const winners = {};
  for (; ended < SEEDS && k < 3 * SEEDS; k++) {
    const club = MANAGED[k % MANAGED.length];
    Math.random = seeded(hashKey(`aleague${SEED_SET}|${k}`));
    const start = cm.startCareer(club, 'now');
    if (start.calendar.filter(e => e.type === 'cup').length !== 4) fail(`seed ${k} at ${club}: ${start.calendar.filter(e => e.type === 'cup').length} cup weeks, not 4`);
    if (cm.careerLeagueOf(start).cupName !== 'Australia Cup') fail(`seed ${k} at ${club}: the career names cup ${cm.careerLeagueOf(start).cupName}`);
    const drawn = [...(start.cupBracket ?? []).flatMap(t => [t.home, t.away]), ...(start.cupByes ?? [])];
    if (drawn.length !== 10) fail(`seed ${k}: the Australia Cup field is ${drawn.length} clubs, not the ten Australian ones`);
    if ((start.cupBracket ?? []).length !== 2 || (start.cupByes ?? []).length !== 6) fail(`seed ${k}: ${(start.cupBracket ?? []).length} round of 16 ties and ${(start.cupByes ?? []).length} byes, not 2 and 6`);
    const played = playSeason(cm, start);
    const s = played.state;
    if (played.stuck) { fail(`seed ${k} at ${club}: the season never ended`); Math.random = REAL_RANDOM; continue; }
    if (played.sacked) { sacked += 1; Math.random = REAL_RANDOM; continue; }
    ended += 1;
    const table = s.table ?? [];
    if (table.length !== 12) fail(`seed ${k}: the table has ${table.length} rows`);
    let w = 0, l = 0;
    for (const r of table) {
      if (!lg.clubs.includes(r.club)) fail(`seed ${k}: ${r.club} is in the table and not in the league`);
      if (r.w + r.d + r.l !== 22) fail(`seed ${k}: ${r.club} played ${r.w + r.d + r.l} league matches, not 22`);
      w += r.w; l += r.l;
    }
    if (w !== l) fail(`seed ${k}: ${w} wins against ${l} losses`);
    const everyone = [...(s.cupBracket ?? []).flatMap(t => [t.home, t.away]), ...(s.cupByes ?? [])];
    for (const x of EXCLUDED) if (everyone.includes(x)) fail(`seed ${k}: ${x} was drawn into the Australia Cup`);
    const fin = (s.cupBracket ?? []).find(t => t.round === 'F');
    if (fin?.winner) { finals += 1; winners[fin.winner] = (winners[fin.winner] ?? 0) + 1; } else fail(`seed ${k}: the Australia Cup has no final winner`);
    const next = cm.startNextSeason(cm.finishSeason(s).state);
    const nextLg = cm.careerLeagueOf(next);
    if (nextLg.id !== LEAGUE || nextLg.clubs.length !== 12 || lg.clubs.some(c => !nextLg.clubs.includes(c))) fail(`seed ${k}: the summer changed the league (${nextLg.id}, ${nextLg.clubs.length} clubs)`);
    Math.random = REAL_RANDOM;
  }
  if (ended < SEEDS) fail(`only ${ended} of ${SEEDS} seasons reached the end in ${k} tries`);
  console.log(`   ${ended} seasons ended, ${sacked} sacked, ${finals} Australia Cup finals with a winner (${Object.entries(winners).map(([c, n]) => `${c} ${n}`).join(', ')})`);

  for (const club of EXCLUDED) {
    Math.random = seeded(hashKey(`aleague${SEED_SET}|out|${club}`));
    const start = cm.startCareer(club, 'now');
    const cupWeeks = start.calendar.filter(e => e.type === 'cup').length;
    if (cupWeeks) fail(`${club} schedules ${cupWeeks} cup weeks`);
    if (cm.careerLeagueOf(start).cupName !== null) fail(`${club}'s career names a cup: ${cm.careerLeagueOf(start).cupName}`);
    if (start.cupRound !== 'out') fail(`${club} starts in the cup (${start.cupRound})`);
    if ((start.boardObjectives ?? []).some(o => /cup/i.test(o.label))) fail(`${club}'s board sets a cup objective`);
    const played = playSeason(cm, start);
    const s = played.state;
    if ((s.cupBracket ?? []).length) fail(`${club}: a bracket was drawn`);
    if ((s.resultLog ?? []).some(r => r.competition === 'cup')) fail(`${club} played a cup match`);
    if ((s.trophies ?? []).some(t => t.name === 'Australia Cup')) fail(`${club} won a cup it does not enter`);
    if (!played.stuck && !played.sacked) {
      const next = cm.startNextSeason(cm.finishSeason(s).state);
      if (next.calendar.filter(e => e.type === 'cup').length || cm.careerLeagueOf(next).cupName !== null) fail(`${club}: the second season has a cup`);
    }
    console.log(`   ${club}: ${cupWeeks} cup weeks, cup ${cm.careerLeagueOf(start).cupName}, season ${played.stuck ? 'STUCK' : played.sacked ? 'sacked' : 'ended'}`);
    Math.random = REAL_RANDOM;
  }

  /* The byes are shared: every modern league with a cup still crowns one. */
  const fields = [];
  for (const l of cm.REAL_LEAGUES) {
    if (cm.leagueRulesOf(l.id).cup === null) continue;
    const club = l.clubs[Math.floor(l.clubs.length / 2)];
    /* A sacking ends the season before the cup does: try the next seed. */
    let start = null, played = null, size = 0;
    for (let t = 0; t < 4; t++) {
      Math.random = seeded(hashKey(`aleague${SEED_SET}|cup|${l.id}|${t}`));
      start = cm.startCareer(club, 'now');
      size = (start.cupBracket ?? []).filter(x => x.round === 'R16').length * 2 + (start.cupByes ?? []).length;
      played = playSeason(cm, start);
      if (!played.sacked && !played.stuck) break;
    }
    if (played.sacked || played.stuck) { fail(`${l.id} (${club}): four seeds in a row never finished a season`); Math.random = REAL_RANDOM; continue; }
    const s = played.state;
    const fin = (s.cupBracket ?? []).find(t => t.round === 'F');
    if (!fin?.winner) fail(`${l.id} (${club}): the ${l.cupName} has no final winner (field ${size})`);
    if (size < 16) fields.push(`${l.id} ${size}`);
    Math.random = REAL_RANDOM;
  }
  console.log(`   every cup league crowned a winner; short fields: ${fields.join(', ') || 'none'}`);
}

/* E. The numbers written in the copy are the numbers the engine plays. */
function partCounts(cm) {
  console.log('E) the club, league, country and player counts in the copy agree with the engine');
  const leagues = cm.REAL_LEAGUES.length;
  const clubs = cm.REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0);
  const countries = new Set(cm.REAL_LEAGUES.map(l => cm.leagueRulesOf(l.id).nationId)).size;
  const players = Object.values(cm.CM_ROSTERS).reduce((s, l) => s + l.length, 0);
  console.log(`   engine: ${leagues} leagues, ${clubs} clubs, ${countries} countries, ${players} real players in the joined world`);
  const read = f => {
    let t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (CONTROL === 'stalecount' && f === 'src/data/gameContent/clubManagement.ts') t = mutateOnce(t, '380 real clubs across 23 leagues', '368 real clubs across 23 leagues', 'stalecount');
    return t;
  };
  const seoPart = fs.readdirSync(path.join(ROOT, 'src/data/seoMetaParts')).map(f => `src/data/seoMetaParts/${f}`).find(f => fs.readFileSync(path.join(ROOT, f), 'utf8').includes("'/club-manager'") || fs.readFileSync(path.join(ROOT, f), 'utf8').includes('"/club-manager"'));
  /* Each line: the file, a pattern, and what each capture must equal. */
  const LINES = [
    ['src/data/gameContent/clubManagement.ts', /(\d+) real clubs across (\d+) leagues in (\d+) countries/g, [clubs, leagues, countries]],
    ['src/data/gameContent/clubManagement.ts', /over ([\d,]+) real players/g, ['over']],
    ['src/components/club-manager/ClubManagerHelp.tsx', /Pick any club in (\d+) real leagues/g, [leagues]],
    ['src/components/club-manager/ClubManagerHelp.tsx', /: (\d+) clubs and over ([\d,]+) real players/g, [clubs, 'over']],
    ['src/components/club-manager/ClubManagerHelp.tsx', /Over ([\d,]+) real players are on the market/g, ['over']],
    ['src/data/gameRegistry.ts', /Manage any of (\d+) real clubs across (\d+) leagues/g, [clubs, leagues]],
    ['src/data/seoMeta.ts', /Manage any of (\d+) real clubs across (\d+) leagues/g, [clubs, leagues]],
    [seoPart, /Manage any of (\d+) real clubs across (\d+) leagues/g, [clubs, leagues]],
    ['src/pages/ClubManager.tsx', /(\d+) clubs across (\d+) real leagues/g, [clubs, leagues]],
  ];
  let seen = 0;
  for (const [file, re, want] of LINES) {
    if (!file) { fail('no search description part holds /club-manager'); continue; }
    const hits = [...read(file).matchAll(re)];
    if (!hits.length) fail(`${file}: the count line ${re} is gone, so this check reads nothing there`);
    for (const h of hits) {
      seen += 1;
      want.forEach((w, i) => {
        const got = Number(h[i + 1].replace(/,/g, ''));
        if (w === 'over') { if (!(got <= players && players - got < 500)) fail(`${file}: "over ${h[i + 1]}" real players, the game has ${players}`); }
        else if (got !== w) fail(`${file}: "${h[0]}" says ${got}, the engine has ${w}`);
      });
    }
  }
  console.log(`   ${seen} count lines read across ${new Set(LINES.map(x => x[0])).size} files`);
}

const membership = readJson('_membership.json');
const values = readJson('_values.json');
const people = readJson('_people.json');
const cm = await bundleEngine();
partLedger(cm, membership);
partValues(cm, membership, values);
partPeople(cm, people);
partSeasons(cm);
partCounts(cm);
console.log(failures ? `simClubManagerALeague: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simClubManagerALeague: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : CONTROL ? 2 : 0);
