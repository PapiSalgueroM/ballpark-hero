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
      the two group-less rows are not shipped. And the join the engine plays
      (CM_ROSTERS): every man in CM_ALEAGUE_SUPERSEDES is gone from the
      baked club he was superseded at (and still in that baked file, or the
      line is stale), and no A-League name sits in two joined squads.
   B. VALUES (hard). Every club's Transfermarkt page in _values.json is that
      club's 26/27 squad page (its id from _membership.json, season 2026),
      every shipped player's value row cites it, every rating is the shared
      curve's rating of his EUR value at his age (scripts/lib/cmValueCurve.mjs,
      since Round 1102 the value curve plus points for age), every value is
      the curve's pounds at two decimals and above zero, and every man with
      no value is at the floor at every age (the age points give back what
      the market took off a price, and the market never priced him) and
      listed in CM_ALEAGUE_NO_VALUE (and nobody else is). The count of no
      value men is printed.
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
      cup week, draws no bracket and names no cup, is told it sits out the
      Australia Cup (cupSatOutBy, which the cups panel and hub tile read;
      an entrant and a cupless league get null), and its board's home
      players ask is for New Zealand players (an Australian club's is for
      Australian ones). And every other modern league with a cup still
      crowns a cup winner (the byes fix is shared), and every played short
      bracket has its shape read: the round of 16 plays field minus eight
      ties, nobody is drawn twice or against himself, each round has its
      size and is exactly the last round's winners, plus every bye once in
      the quarter-finals.
   E. COUNTS (hard). The club, league and country counts written in the
      copy (the Club Manager guide, the help, the registry, the search
      description and its generated part, the page) agree with REAL_LEAGUES,
      and every "over N real players" sits under the real total.

   MEASURED 2026-10-06 (Round 1035 tree), SIM_SEED unset and 1 to 4, ten
   seasons a run plus the two excluded clubs:
     A  310 grouped ledger rows, 310 shipped, 2 group-less rows held back
     B  310 players on 12 club pages, 61 with no value at the floor (48)
        (Round 1102: the same 61, still at the floor at every age. The
        round's first bake read two veterans among them with their age, 49
        and 54; its review took that back, an unpriced man has no market
        discount to give back)
     C  299 nationalities on two hosts, 11 unknown, every age on two hosts
     D  every run 10 seasons ended (0 to 3 sacked careers replaced by the
        next seed), 10 Australia Cup finals with a winner, won by 5 to 9
        different clubs a run and never by Auckland FC or Wellington
        Phoenix; the field is the ten Australian clubs, 2 ties and 6 byes;
        the boards split 2 title, 5 finals, 5 mid-table; the short cups
        measured scottish 12, austria 12, greece 14, denmark 12,
        switzerland 12, croatia 10, aleague 10, the other 15 cups full
     E  23 leagues, 380 clubs, 20 countries, 4562 real players, 10 count
        lines in 6 files
   Every check is a hard invariant (no band to tune); the statistical side
   of the league (strength ordering the table) is held by
   scripts/simClubManagerNewLeagues.mjs. Controls measured: invented 3
   failures, offcurve 1, onehost 2, excluded 22, nobyes 11, stalecount 1.
   The review fix's checks, same day, SIM_SEED unset: the join dropped 1
   stale baked row (Ryan Fraser at Southampton) and holds 0 A-League names
   twice; 17 played brackets read for shape, 0 faults; 10 home players asks
   at Australian clubs, all for Australia, and both New Zealand clubs asked
   for New Zealand. Controls: nodedupe 2 failures, samebye 79, satout 2,
   nzcountry 2.
   Release AH (review F10): the partial rule counts ledger rows, so Central
   Coast Mariners (13 of 25 ledger rows with no value, 11 of the 23 that
   ship) is partial and no other club is. Control: nopartial 1 failure.

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
     SIM_ALEAGUE_CONTROL=nodedupe   the join keeps superseded baked rows:
                                    part A red (Ryan Fraser in two squads)
     SIM_ALEAGUE_CONTROL=samebye    every R16 winner meets the first bye in
                                    the quarter-finals: part D red (bracket)
     SIM_ALEAGUE_CONTROL=satout     cupSatOutBy always answers null: part D
                                    red (the excluded clubs)
     SIM_ALEAGUE_CONTROL=nzcountry  the rules row loses clubCountry: part D
                                    red (Auckland asked for Australians)
     SIM_ALEAGUE_CONTROL=nopartial  the generated partial list is emptied,
                                    which is what counting shipped rows
                                    gave before Release AH: part B red
                                    (Central Coast Mariners, 13 of 25
                                    ledger rows with no value)

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
const CONTROLS = ['invented', 'offcurve', 'onehost', 'excluded', 'nobyes', 'stalecount', 'nodedupe', 'samebye', 'satout', 'nzcountry', 'nopartial'];
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
  if (CONTROL === 'samebye') src = mutateOnce(src, 'if (i < byes.length) merged.push(byes[i]);', 'if (i < byes.length) merged.push(byes[0]);', 'samebye');
  if (CONTROL === 'nzcountry') src = mutateOnce(src, "    clubCountry: { 'Auckland FC': 'New Zealand', 'Wellington Phoenix': 'New Zealand' },\n", '', 'nzcountry');
  if (CONTROL === 'satout') src = mutateOnce(src, 'return cup !== null && !clubEntersCup(lg.id, career.clubName) ? cup : null;', 'return null;', 'satout');
  return `${src}\nexport { relegationSpots as __relegationSpots };\n`;
}

function transformWorld(src) {
  if (CONTROL === 'nodedupe') src = mutateOnce(src, 'if (list) out[club] = list.filter(p => p.n !== name);', 'if (list) out[club] = list;', 'nodedupe');
  return src;
}

function transformALeague(src) {
  if (CONTROL === 'invented') src = mutateOnce(src, "  'Sydney FC': [\n", "  'Sydney FC': [\n    { n: 'Invented Fella', p: 'ST', a: 24, v: 0.5, r: 61 },\n", 'invented');
  if (CONTROL === 'offcurve') {
    const line = src.match(/  'Sydney FC': \[\n(    \{ n: [^\n]*r: (\d+) \},\n)/);
    if (!line) { console.error('control offcurve: no Sydney FC row found; refusing to run'); process.exit(1); }
    src = mutateOnce(src, line[1], line[1].replace(`r: ${line[2]} }`, `r: ${Number(line[2]) + 1} }`), 'offcurve');
  }
  if (CONTROL === 'nopartial') src = mutateOnce(src, 'export const CM_ALEAGUE_PARTIAL: string[] = ["Central Coast Mariners"];', 'export const CM_ALEAGUE_PARTIAL: string[] = [];', 'nopartial');
  if (CONTROL === 'onehost') src = mutateOnce(src, 'export const CM_ALEAGUE_NATIONALITIES: Record<string, string> = {\n', "export const CM_ALEAGUE_NATIONALITIES: Record<string, string> = {\n  'Denver Minster': 'Australia',\n", 'onehost');
  return src;
}

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, [
    `export * from '${ROOT_FWD}/src/lib/clubManager.ts';`,
    `export * as al from '${ROOT_FWD}/src/data/clubManagerALeague2026.ts';`,
    `export * as baked from '${ROOT_FWD}/src/data/clubManagerRosters.ts';`,
    `export * as asks from '${ROOT_FWD}/src/lib/clubManagerBoardAsks.ts';`,
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
        b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerWorldRosters\.ts$/ }, a => ({ contents: transformWorld(fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n')), loader: 'ts', resolveDir: path.dirname(a.path) }));
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

  /* The join the engine plays (CM_ROSTERS, the baked world plus these
     squads): every man the generator proved is a stale baked row is gone
     from that baked club, and no A-League name sits in two joined squads.
     The generator's collision check guards the files; this guards the join. */
  const world = cm.CM_ROSTERS;
  const sup = Object.entries(cm.al.CM_ALEAGUE_SUPERSEDES);
  if (!sup.length) fail('CM_ALEAGUE_SUPERSEDES is empty, so the stale row check reads nothing');
  for (const [name, club] of sup) {
    if (!(cm.baked.CM_ROSTERS[club] ?? []).some(p => p.n === name)) fail(`${name} is no longer in the baked ${club} squad: the SUPERSEDES line is stale`);
    if ((world[club] ?? []).some(p => p.n === name)) fail(`${name} is still in the joined ${club} squad: the stale baked row was not dropped`);
  }
  const clubsOf = new Map();
  for (const [club, list] of Object.entries(world)) for (const p of list) { if (!clubsOf.has(p.n)) clubsOf.set(p.n, new Set()); clubsOf.get(p.n).add(club); }
  let twice = 0;
  for (const list of Object.values(rosters)) for (const p of list) {
    const at = clubsOf.get(p.n) ?? new Set();
    if (at.size !== 1) { twice += 1; fail(`${p.n} is in ${at.size} joined squads (${[...at].join(', ')}), not one`); }
  }
  console.log(`   joined world: ${sup.length} stale baked row(s) dropped, ${twice} A-League names in two squads`);
}

/* B. Values: one page a club, one curve for everybody. */
function partValues(cm, membership, values) {
  console.log('B) every value cites its club page and every rating sits on the shared curve');
  const rosters = cm.al.CM_ALEAGUE_ROSTERS;
  const noValueListed = new Set(cm.al.CM_ALEAGUE_NO_VALUE);
  const noValueFound = new Set();
  let checked = 0;
  let noValueOnFloor = 0;
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
      if (has && p.r !== ratingOf(usd, p.a, p.p)) fail(`${p.n} (${engine}) is rated ${p.r}; the curve gives ${ratingOf(usd, p.a, p.p)} for EUR ${row.valueEur} at ${p.a}`);
      if (p.v !== gbpM(usd, 2)) fail(`${p.n} (${engine}) is valued ${p.v}, the curve's pounds are ${gbpM(usd, 2)}`);
      if (!(p.v > 0)) fail(`${p.n} (${engine}) has a value at or below zero`);
      /* Round 1102: a man with no value is valued at the floor and stays ON the floor at every age.
         The age points give back what the market took off a price for a birthday; he was never
         priced, so a veteran among them is 48 like the rest. */
      if (!has && p.r !== RATING_FLOOR) fail(`${p.n} (${engine}, ${p.a}) has no value and is rated ${p.r}, not the floor ${RATING_FLOOR}`);
      if (!has && p.r === RATING_FLOOR) noValueOnFloor += 1;
      const group = readJson(`${c.slug}.json`).rows.find(r => r.name === p.n)?.group;
      if (group && GROUP_OF[p.p] !== group) fail(`${p.n} plays ${p.p}, outside his ledger group ${group}`);
      const mapped = POS_MAP[row.tmPosition];
      const wantPos = group ? (mapped && GROUP_OF[mapped] === group ? mapped : GROUP_DEFAULT[group]) : null;
      if (wantPos && p.p !== wantPos) fail(`${p.n} plays ${p.p}; his page says ${row.tmPosition}, so the rule gives ${wantPos}`);
    }
  }
  for (const k of noValueFound) if (!noValueListed.has(k)) fail(`${k} has no value and is missing from CM_ALEAGUE_NO_VALUE`);
  for (const k of noValueListed) if (!noValueFound.has(k)) fail(`${k} is listed with no value but has one`);
  console.log(`   ${checked} players checked against ${values.clubs.length} club pages, ${noValueFound.size} with no value, ${noValueOnFloor} of them on the floor (${RATING_FLOOR})`);
  /* The partial rule (Release AH, Round 1035 review F10): a club where more
     than half its LEDGER rows, the group-less ones held back included, have
     no value on its page. Read from the ledgers and the page, never from the
     generated file. */
  const partialWant = [];
  for (const c of membership.clubs) {
    const club = ENGINE_NAME[c.slug];
    const rows = readJson(`${c.slug}.json`).rows;
    const page = new Map((values.clubs.find(x => x.slug === c.slug)?.players ?? []).map(p => [p.name, p]));
    const none = rows.filter(r => !(Number.isFinite(page.get(r.name)?.valueEur) && page.get(r.name).valueEur > 0)).length;
    const partial = cm.al.CM_ALEAGUE_PARTIAL.includes(club);
    if (none * 2 > rows.length) partialWant.push(`${club} (${none} of ${rows.length})`);
    if (partial !== (none * 2 > rows.length)) fail(`${club}: ${none} of ${rows.length} ledger rows with no value, and CM_ALEAGUE_PARTIAL says ${partial}`);
    if (partial !== cm.isPartialClub(club)) fail(`${club}: isPartialClub disagrees with CM_ALEAGUE_PARTIAL`);
  }
  console.log(`   partial by the ledger rule: ${partialWant.length ? partialWant.join(', ') : 'none'}`);
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

/* The bracket's shape, whatever the field: the round of 16 and the byes are
   one field with nobody twice, no club meets itself, nobody is in two ties
   of a round, and each round is exactly the winners of the round before
   (the quarter-finals also take every bye, once). Returns the number of
   faults so a caller can count the brackets read. */
const NEXT_OF = { R16: 'QF', QF: 'SF', SF: 'F' };
const TIES_OF = { QF: 4, SF: 2, F: 1 };
function checkBracket(bracket, byes, label) {
  let faults = 0;
  const bad = m => { faults += 1; fail(`${label}: ${m}`); };
  const byRound = r => bracket.filter(t => t.round === r);
  const r16 = byRound('R16');
  const field = [...r16.flatMap(t => [t.home, t.away]), ...byes];
  if (new Set(field).size !== field.length) bad(`the round of 16 and the byes name a club twice (${field.length} entries, ${new Set(field).size} clubs)`);
  if (field.length > 8 && field.length < 16 && r16.length !== field.length - 8) bad(`a field of ${field.length} plays ${r16.length} round of 16 ties, not ${field.length - 8}`);
  for (const r of ['R16', 'QF', 'SF', 'F']) {
    const ties = byRound(r);
    const names = ties.flatMap(t => [t.home, t.away]);
    if (ties.some(t => t.home === t.away)) bad(`a ${r} tie has a club playing itself`);
    if (new Set(names).size !== names.length) bad(`a club is in two ${r} ties`);
    if (TIES_OF[r] && ties.length !== TIES_OF[r]) bad(`${ties.length} ${r} ties, not ${TIES_OF[r]}`);
    for (const t of ties) if (t.winner !== t.home && t.winner !== t.away) bad(`a ${r} tie (${t.home} v ${t.away}) has no winner from the tie`);
    const next = NEXT_OF[r];
    if (!next) continue;
    const fed = [...ties.map(t => t.winner), ...(r === 'R16' ? byes : [])].sort();
    const into = byRound(next).flatMap(t => [t.home, t.away]).sort();
    if (JSON.stringify(fed) !== JSON.stringify(into)) bad(`the ${next} is not the ${r} winners${r === 'R16' && byes.length ? ' plus the byes' : ''}`);
  }
  return faults;
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

  let ended = 0, sacked = 0, finals = 0, k = 0, brackets = 0, bracketFaults = 0, natAsks = 0;
  const winners = {};
  for (; ended < SEEDS && k < 3 * SEEDS; k++) {
    const club = MANAGED[k % MANAGED.length];
    Math.random = seeded(hashKey(`aleague${SEED_SET}|${k}`));
    const start = cm.startCareer(club, 'now');
    if (start.calendar.filter(e => e.type === 'cup').length !== 4) fail(`seed ${k} at ${club}: ${start.calendar.filter(e => e.type === 'cup').length} cup weeks, not 4`);
    if (cm.careerLeagueOf(start).cupName !== 'Australia Cup') fail(`seed ${k} at ${club}: the career names cup ${cm.careerLeagueOf(start).cupName}`);
    const natAsk = cm.asks.askCandidates(start).find(x => x.objective.id === 'natQuota');
    if (natAsk) { natAsks += 1; if (natAsk.objective.country !== 'Australia') fail(`seed ${k} at ${club}: the board asks for players from ${natAsk.objective.country}, not Australia`); }
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
    bracketFaults += checkBracket(s.cupBracket ?? [], s.cupByes ?? [], `seed ${k} Australia Cup`);
    brackets += 1;
    if (cm.cupSatOutBy(s) !== null) fail(`seed ${k} at ${club}: the career is told it sits out the ${cm.cupSatOutBy(s)}`);
    const next = cm.startNextSeason(cm.finishSeason(s).state);
    const nextLg = cm.careerLeagueOf(next);
    if (nextLg.id !== LEAGUE || nextLg.clubs.length !== 12 || lg.clubs.some(c => !nextLg.clubs.includes(c))) fail(`seed ${k}: the summer changed the league (${nextLg.id}, ${nextLg.clubs.length} clubs)`);
    Math.random = REAL_RANDOM;
  }
  if (ended < SEEDS) fail(`only ${ended} of ${SEEDS} seasons reached the end in ${k} tries`);
  if (!natAsks) fail('no Australian club was offered a home players ask, so the country check read nothing');
  console.log(`   ${natAsks} home players asks read at Australian clubs, every one for Australia`);
  console.log(`   ${ended} seasons ended, ${sacked} sacked, ${finals} Australia Cup finals with a winner (${Object.entries(winners).map(([c, n]) => `${c} ${n}`).join(', ')})`);

  for (const club of EXCLUDED) {
    Math.random = seeded(hashKey(`aleague${SEED_SET}|out|${club}`));
    const start = cm.startCareer(club, 'now');
    const cupWeeks = start.calendar.filter(e => e.type === 'cup').length;
    if (cupWeeks) fail(`${club} schedules ${cupWeeks} cup weeks`);
    if (cm.careerLeagueOf(start).cupName !== null) fail(`${club}'s career names a cup: ${cm.careerLeagueOf(start).cupName}`);
    /* The cups panel and hub tile read this: the club sits out a cup its
       league plays, which is not the same as a league with no cup. */
    if (cm.cupSatOutBy(start) !== 'Australia Cup') fail(`${club} is not told it sits out the Australia Cup (cupSatOutBy ${cm.cupSatOutBy(start)}), so the page says the league has no cup`);
    /* A New Zealand club's board asks for New Zealand players, not Australian. */
    const nat = cm.asks.askCandidates(start).find(x => x.objective.id === 'natQuota');
    if (!nat) fail(`${club}: the board has no home players ask to read (measured: one is always on offer)`);
    else if (nat.objective.country !== 'New Zealand') fail(`${club}'s board asks for players from ${nat.objective.country}, not New Zealand`);
    if (start.cupRound !== 'out') fail(`${club} starts in the cup (${start.cupRound})`);
    if (start.cupByes) fail(`${club} starts with cup byes`);
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
    console.log(`   ${club}: ${cupWeeks} cup weeks, cup ${cm.careerLeagueOf(start).cupName}, sits out the ${cm.cupSatOutBy(start)}, home players ask for ${nat?.objective.country ?? 'nobody'}, season ${played.stuck ? 'STUCK' : played.sacked ? 'sacked' : 'ended'}`);
    Math.random = REAL_RANDOM;
  }

  /* The byes are shared: every modern league whose cup draws a short field
     (fewer than sixteen) still crowns a winner. A full field never reaches
     the byes and is played by the other harnesses. The career runs at the
     league's median rated club, the least likely to be sacked before the
     final, and a sacked season is replayed on the next seed. */
  const fields = [];
  const full = [];
  for (const l of cm.REAL_LEAGUES) {
    if (cm.leagueRulesOf(l.id).cup === null) continue;
    /* Round 1102: the median is taken over the clubs the cup admits (the rules row's own
       cupExcluded). The re rate made Auckland FC the A-League's median club, a club that sits the
       Australia Cup out, so the career had no cup to read and this part went red on a field of
       nought: the sample had moved, not the game. */
    const sitsOut = new Set(cm.leagueRulesOf(l.id).cupExcluded ?? []);
    const entrants = l.clubs.filter(c => !sitsOut.has(c));
    const club = [...entrants].sort((a, b) => cm.clubPreviewRating(a) - cm.clubPreviewRating(b) || a.localeCompare(b))[Math.floor(entrants.length / 2)];
    let start = null, played = null, size = 0;
    for (let t = 0; t < 6; t++) {
      Math.random = seeded(hashKey(`aleague${SEED_SET}|cup|${l.id}|${t}`));
      start = cm.startCareer(club, 'now');
      size = (start.cupBracket ?? []).filter(x => x.round === 'R16').length * 2 + (start.cupByes ?? []).length;
      if (size >= 16) break;
      played = playSeason(cm, start);
      if (!played.sacked && !played.stuck) break;
    }
    if (size >= 16) { full.push(l.id); Math.random = REAL_RANDOM; continue; }
    if (played.sacked || played.stuck) { fail(`${l.id} (${club}): six seeds in a row never finished a season`); Math.random = REAL_RANDOM; continue; }
    const fin = (played.state.cupBracket ?? []).find(x => x.round === 'F');
    if (!fin?.winner) fail(`${l.id} (${club}): the ${l.cupName} has no final winner (field ${size})`);
    bracketFaults += checkBracket(played.state.cupBracket ?? [], played.state.cupByes ?? [], `${l.id} ${l.cupName}`);
    brackets += 1;
    fields.push(`${l.id} ${size}`);
    Math.random = REAL_RANDOM;
  }
  if (!fields.some(x => x.startsWith('aleague '))) fail('the A-League cup was not among the short fields checked');
  console.log(`   every short cup crowned a winner: ${fields.join(', ')}; full fields of sixteen: ${full.length}`);
  /* A cupless league is not a cup the club sits out. */
  Math.random = seeded(hashKey(`aleague${SEED_SET}|cupless`));
  const mx = cm.REAL_LEAGUES.find(l => l.id === 'ligamx');
  if (!mx || cm.leagueRulesOf('ligamx').cup !== null) fail('Liga MX is no longer the cupless league this check reads');
  else if (cm.cupSatOutBy(cm.startCareer(mx.clubs[0], 'now')) !== null) fail(`${mx.clubs[0]} (Liga MX, no cup) is told it sits out a cup`);
  Math.random = REAL_RANDOM;
  if (brackets < SEEDS) fail(`only ${brackets} brackets had their shape read`);
  console.log(`   ${brackets} played brackets read for shape (round sizes, nobody twice, no self ties, each round fed by the last plus the byes): ${bracketFaults} faults`);
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
    /* Round 1040: the anchor is the engine's own count, so the control
       outlives the next league a round adds. */
    if (CONTROL === 'stalecount' && f === 'src/data/gameContent/clubManagement.ts') t = mutateOnce(t, `${clubs} real clubs across ${leagues} leagues`, `368 real clubs across ${leagues} leagues`, 'stalecount');
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
