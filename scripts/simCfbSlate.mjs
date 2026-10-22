/* Round 1554: CFB Dynasty plays a real season. The slate, Notre Dame, the
   Group of Five spot and rivalry week, held through the real engine.

   Before this round every week's opponent was drawn at random from whoever was
   still unpaired (src/lib/cfbDynasty.ts simCfbRound), so schools met the same
   opponent two or three times a season: the ACC and Big 12 had eight schools
   for eight conference weeks, and the four school Group of Five bucket played
   itself about eight times. Notre Dame sat in the ACC and could win its title
   game, a "G5 Championship" was played that does not exist, and rivalry week
   paired by state, so Ohio State never met Michigan.

   Sections (SEEDS seeds by SEASONS seasons of a new dynasty, the board's own
   calls, unless said otherwise):
     1) the slate: every school plays one game a round, twelve in all, and no
        regular season pair meets twice (hard, a count of repeats against the
        old draw's baseline, which the random control measures);
     2) the slate is known at kickoff: before week 1 the Schedule tab's
        fixtures list all twelve of my games, and every round the engine plays
        exactly the games the slate set (hard);
     3) Notre Dame: never in a conference title game, five ACC opponents a
        season (ND_ACC_GAMES), and in the Playoff field every season it ranks
        in the top 12 at selection (hard); plus a built case where the top 12
        rule is the only way in (hard);
     4) the Playoff: four title games, none named for the Group of Five, the
        best ranked Group of Five school always in the field (hard);
     5) rivalry week: every row of src/data/collegeRivalries.ts with both
        schools on the board is a 'series' pair, and every week 12 game of a
        school in such a row is that pair, every season (hard); league
        schools play six or seven conference games, seven only with an
        in-league rival (hard);
     6) the data file: every row's two schools exist, no school is in two rows
        of one sport, and every row carries two source links on two different
        hosts, neither a wiki (hard);
     7) old saves: a save in the middle of a pre-1554 season finishes it the
        old way (no slate, Notre Dame still in the ACC, five title games) and
        the next season starts under the real format (hard);
     8) the builder under load: STRESS slates from fresh seeds, none of them
        on the fallback circle (hard), and the time a slate takes (printed);
     9) CBB: its series rows are rivalry pairs, and under its new format the
        conference table goes by league winning percentage (hard).

   MEASURED (2026-10-22, see the round's closing report for the runner runs):
   numbers are printed by every run; the hard checks are counts that must be
   zero, so there is no band to set.

   Negative controls (each refuses to run unless its target is in the source
   exactly once, then must turn its section red):
     CFB_SLATE_CONTROL=random   the slate is ignored, the old draw plays -> 1, 2 red
     CFB_SLATE_CONTROL=ndacc    Notre Dame back in the ACC               -> 3 red
     CFB_SLATE_CONTROL=top12    the top 12 rule removed                  -> 3 red
     CFB_SLATE_CONTROL=g5title  the old five title games come back       -> 4 red
     CFB_SLATE_CONTROL=nofifth  the Group of Five spot is not handed out -> 4 red
     CFB_SLATE_CONTROL=rivals   the series table is not read             -> 5 red
     CFB_SLATE_CONTROL=source   one row loses a source line              -> 6 red
     CFB_SLATE_CONTROL=midseason a slate is built mid season             -> 7 red
     CFB_SLATE_CONTROL=cbbraw   the CBB table goes back to overall wins  -> 9 red

   Run: node scripts/simCfbSlate.mjs   (SIM_SEEDS, SIM_SEASONS, SIM_STRESS to scale)
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CFB_SLATE_CONTROL || '';
const SEEDS = Number(process.env.SIM_SEEDS || 20);
const SEASONS = Number(process.env.SIM_SEASONS || 8);
const STRESS = Number(process.env.SIM_STRESS || 300);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Each control: [file under src/lib, exact text, replacement]. The data
   control edits the text this harness reads, not the bundle. */
const CONTROLS = {
  random: ['cfbDynasty.ts', 'const slate = st.slate && st.slate.season === st.season ? st.slate : null;', 'const slate = null as CfbSlate | null;'],
  ndacc: ['cfbDynasty.ts', "{ id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'IND' },", "{ id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'ACC' },"],
  top12: ['cfbDynasty.ts', 'for (const id of ranked.slice(0, CFB_INDEPENDENT_CUT)) {', 'for (const id of ranked.slice(0, 0)) {'],
  g5title: ['cfbDynasty.ts', 'for (const conf of st.format ? CFB_LEAGUES : LEGACY_CONFS) {', 'for (const conf of LEGACY_CONFS) {'],
  nofifth: ['cfbDynasty.ts', 'if (fifth && !champs.includes(fifth)) champs.push(fifth);', 'if (fifth && !champs.includes(fifth)) void 0;'],
  rivals: ['cfbDynasty.ts', 'buildRivalries(CFB_SCHOOLS, CFB_SCHOOL_STATES, CFB_RIVALRY_SERIES)', 'buildRivalries(CFB_SCHOOLS, CFB_SCHOOL_STATES, [])'],
  source: ['DATA', '//          https://local10.com/', '//          '],
  midseason: ['cfbDynasty.ts', '  if (!st.depth || st.round !== 1) return;\n  if (st.slate && st.slate.season === st.season) return;', '  if (!st.depth) return;\n  if (st.slate && st.slate.season === st.season) return;'],
  cbbraw: ['cbbDynasty.ts', '  if (st.format) {\n    /* Round 1554: the table goes by the league record', '  if (false) {\n    /* Round 1554: the table goes by the league record'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`CFB_SLATE_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const ctl = CONTROL ? CONTROLS[CONTROL] : null;
const readLf = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
if (ctl) {
  const target = ctl[0] === 'DATA' ? path.join(ROOT, 'src', 'data', 'collegeRivalries.ts') : path.join(ROOT, 'src', 'lib', ctl[0]);
  const n = readLf(target).split(ctl[1]).length - 1;
  if (n !== 1) { console.error(`control cannot run: its target is in ${path.basename(target)} ${n} times, expected once`); process.exit(1); }
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}

/* ---- bundle the two engines through esbuild, the control applied on load ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simCfbSlate-'));
const BUNDLE = path.join(TMP, 'engines.bundle.mjs');
const controlPlugin = {
  name: 'slate-control',
  setup(b) {
    if (!ctl || ctl[0] === 'DATA') return;
    const re = new RegExp(`[\\\\/]src[\\\\/]lib[\\\\/]${ctl[0].replace('.', '\\.')}$`);
    b.onLoad({ filter: re }, args => {
      const src = readLf(args.path);
      return { contents: src.replace(ctl[1], () => ctl[2]), loader: 'ts' };
    });
  },
};
await build({
  stdin: {
    contents: `export * as cfb from '${ROOT_URL}/src/lib/cfbDynasty.ts';\nexport * as cbb from '${ROOT_URL}/src/lib/cbbDynasty.ts';\nexport * as prog from '${ROOT_URL}/src/lib/collegeProgram.ts';\nexport * as riv from '${ROOT_URL}/src/data/collegeRivalries.ts';\n`,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': `${ROOT_URL}/src` }, plugins: [controlPlugin],
});
const { cfb, cbb, prog, riv } = await import(pathToFileURL(BUNDLE).href);

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const confOf = id => cfb.CFB_SCHOOL_MAP.get(id).conf;
const LEAGUES = new Set(cfb.CFB_LEAGUES);
const ids = cfb.CFB_SCHOOLS.map(s => s.id);
const seriesRows = riv.CFB_RIVALRY_SERIES.filter(r => cfb.CFB_SCHOOL_MAP.has(r.a) && cfb.CFB_SCHOOL_MAP.has(r.b));

/* ---- one pass over SEEDS dynasties of SEASONS seasons feeds sections 1 to 5 ---- */
const m = {
  seasons: 0, repeats: 0, seasonsWithRepeats: 0, badCounts: 0, fixtureMisses: 0, fixtureShort: 0,
  ndCcg: 0, ndAccOff: 0, ndTop12: 0, ndTop12Out: 0, ndInField: 0, ccgBad: 0, g5Named: 0, fifthOut: 0,
  rivalMiss: 0, seriesUnplayed: 0, confBad: 0, slates: 0, fallbacks: 0, homeMin: 99, homeMax: 0,
  firstRepeat: null, firstMiss: null, firstConf: null,
};
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const rng = lehmer(seed * 7919);
  const st = cfb.initCfb(ids[(seed * 7) % ids.length], rng, { depth: true });
  for (let season = 1; season <= SEASONS; season += 1) {
    m.seasons += 1;
    if (st.slate && st.slate.season === st.season) { m.slates += 1; if (st.slate.fallback) m.fallbacks += 1; }
    /* 2) known at kickoff: before week 1, all twelve of my games are listed */
    const before = cfb.cfbFixtures(st);
    if (before.length !== cfb.CFB_ROUNDS) m.fixtureShort += 1;
    const pairs = new Set();
    let repeatsThisSeason = 0;
    const homes = new Map();
    for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) {
      const planned = st.slate && st.slate.season === st.season ? (st.slate.rounds[r - 1] ?? []).map(([h, a]) => `${h}>${a}`).sort().join(',') : null;
      const { games } = cfb.simCfbRound(st, rng);
      const played = games.map(g => `${g.home}>${g.away}`).sort().join(',');
      if (planned !== played) { m.fixtureMisses += 1; if (!m.firstMiss) m.firstMiss = `seed ${seed} season ${st.season} week ${r}`; }
      const seen = new Set();
      for (const g of games) {
        for (const t of [g.home, g.away]) { if (seen.has(t)) m.badCounts += 1; seen.add(t); }
        homes.set(g.home, (homes.get(g.home) ?? 0) + 1);
        const k = key(g.home, g.away);
        if (pairs.has(k)) { repeatsThisSeason += 1; if (!m.firstRepeat) m.firstRepeat = `seed ${seed} season ${st.season} week ${r}: ${k}`; }
        pairs.add(k);
        /* 5) rivalry week is the table's pair where one exists */
        if (r === cfb.CFB_RIVALRY_ROUND) {
          for (const [x, y] of [[g.home, g.away], [g.away, g.home]]) {
            const row = seriesRows.find(s => s.a === x || s.b === x);
            if (row && (row.a === x ? row.b : row.a) !== y) m.rivalMiss += 1;
          }
        }
      }
      if (seen.size !== ids.length) m.badCounts += 1;
      st.round += 1;
    }
    st.round = cfb.CFB_ROUNDS;
    m.repeats += repeatsThisSeason;
    if (repeatsThisSeason > 0) m.seasonsWithRepeats += 1;
    for (const id of ids) { const h = homes.get(id) ?? 0; m.homeMin = Math.min(m.homeMin, h); m.homeMax = Math.max(m.homeMax, h); }
    for (const row of seriesRows) if (!pairs.has(key(row.a, row.b))) m.seriesUnplayed += 1;
    for (const t of Object.values(st.teams)) {
      if (t.wins + t.losses !== cfb.CFB_ROUNDS) m.badCounts += 1;
      const conf = confOf(t.id);
      const n = t.confWins + t.confLosses;
      const rival = cfb.cfbRivalOf(t.id)?.rival;
      /* Six in the window for everyone. An even league holds its in-league
         rival pairs out of the window whole, so they add a seventh in week
         12; an odd league drops them from a round that already has a bye,
         so they play five plus the rivalry, six like everybody else. */
      const size = ids.filter(id => confOf(id) === conf).length;
      const want = LEAGUES.has(conf) ? (size % 2 === 0 && rival && confOf(rival) === conf ? 7 : 6) : 0;
      if (n !== want) { m.confBad += 1; if (!m.firstConf) m.firstConf = `seed ${seed} season ${st.season}: ${t.id} played ${n} conference games, expected ${want}`; }
    }
    /* 3) Notre Dame's ACC count, before the title games add anyone */
    const ndAcc = st.teams.ND.opps.filter(o => confOf(o) === 'ACC').length;
    if (ndAcc !== cfb.ND_ACC_GAMES) m.ndAccOff += 1;
    const post = cfb.runCfbPostseason(st, rng);
    const ranked = cfb.cfbRankings(st).map(t => t.id);
    if (post.ccgs.length !== cfb.CFB_LEAGUES.length) m.ccgBad += 1;
    for (const g of post.ccgs) {
      if (g.home === 'ND' || g.away === 'ND') m.ndCcg += 1;
      if (/G5|Group of Five/.test(g.name) || g.home && confOf(g.home) === 'G5') m.g5Named += 1;
    }
    if (ranked.indexOf('ND') < cfb.CFB_INDEPENDENT_CUT) { m.ndTop12 += 1; if (!post.field.includes('ND')) m.ndTop12Out += 1; }
    if (post.field.includes('ND')) m.ndInField += 1;
    const bestG5 = ranked.find(id => confOf(id) === 'G5');
    if (!post.field.includes(bestG5) || post.fifth !== bestG5) m.fifthOut += 1;
    st.natties.push({ season: st.season, team: post.champion });
    cfb.cfbOpenOffseason(st, rng);
    cfb.cfbOffseason(st, rng);
  }
}

console.log(`1) the slate, ${SEEDS} seeds by ${SEASONS} seasons (${m.seasons} seasons, ${m.slates} slates, ${m.fallbacks} on the fallback circle)`);
console.log(`   repeated regular season pairs ${m.repeats}, seasons with a repeat ${m.seasonsWithRepeats} of ${m.seasons}; home games a school a season ${m.homeMin} to ${m.homeMax}`);
if (m.slates !== m.seasons) fail(`${m.seasons - m.slates} season(s) started without a slate`);
if (m.fallbacks > 0) fail(`${m.fallbacks} slate(s) fell back on the plain circle`);
if (m.repeats > 0) fail(`${m.repeats} repeated pair(s) in ${m.seasonsWithRepeats} season(s), first: ${m.firstRepeat}`);
if (m.badCounts > 0) fail(`${m.badCounts} round(s) or season(s) where a school did not play exactly once a week, twelve in all`);

console.log('2) the slate is known at kickoff and is what gets played');
console.log(`   seasons whose fixtures did not list twelve games before week 1 ${m.fixtureShort}; rounds that played other games than the slate set ${m.fixtureMisses}`);
if (m.fixtureShort > 0) fail(`${m.fixtureShort} season(s) without all twelve fixtures at kickoff`);
if (m.fixtureMisses > 0) fail(`${m.fixtureMisses} round(s) played something other than the slate, first: ${m.firstMiss}`);

console.log('3) Notre Dame is an independent');
console.log(`   in a title game ${m.ndCcg}; seasons off ${cfb.ND_ACC_GAMES} ACC games ${m.ndAccOff}; ranked top ${cfb.CFB_INDEPENDENT_CUT} at selection ${m.ndTop12} times, left out of the field ${m.ndTop12Out}; in the field ${m.ndInField} of ${m.seasons}`);
if (m.ndCcg > 0) fail(`Notre Dame played ${m.ndCcg} conference title game(s)`);
if (m.ndAccOff > 0) fail(`${m.ndAccOff} season(s) where Notre Dame did not play exactly ${cfb.ND_ACC_GAMES} ACC teams`);
if (m.ndTop12Out > 0) fail(`Notre Dame ranked top ${cfb.CFB_INDEPENDENT_CUT} and missed the field ${m.ndTop12Out} time(s)`);
{
  /* A built case where the rule is Notre Dame's only way in: eleven SEC and
     Big Ten teams at 11-1, Notre Dame 10-2 (twelfth), every ACC, Big 12 and
     Group of Five school at 5-7, so three of the five automatic spots go to
     teams ranked below it and seven at-larges cannot reach it. */
  const rng = lehmer(4242);
  const st = cfb.initCfb('UGA', rng, { depth: true });
  const top = cfb.CFB_SCHOOLS.filter(s => s.conf === 'SEC' || s.conf === 'B1G').map(s => s.id).slice(0, 11);
  for (const t of Object.values(st.teams)) {
    const [w, l] = top.includes(t.id) ? [11, 1] : t.id === 'ND' ? [10, 2] : LEAGUES.has(confOf(t.id)) || confOf(t.id) === 'G5' ? [5, 7] : [3, 9];
    t.wins = w; t.losses = l; t.confWins = LEAGUES.has(confOf(t.id)) ? Math.min(w, 6) : 0; t.confLosses = LEAGUES.has(confOf(t.id)) ? 6 - Math.min(w, 6) : 0;
  }
  st.round = cfb.CFB_ROUNDS;
  const post = cfb.runCfbPostseason(st, rng);
  const rank = cfb.cfbRankings(st).map(t => t.id).indexOf('ND');
  console.log(`   built case: Notre Dame ranked ${rank + 1}, in the field ${post.field.includes('ND')}`);
  if (rank >= cfb.CFB_INDEPENDENT_CUT) fail(`the built case did not rank Notre Dame top ${cfb.CFB_INDEPENDENT_CUT} (it ranked ${rank + 1}), so it proves nothing`);
  else if (!post.field.includes('ND')) fail('the built case left a top 12 Notre Dame out of the field');
}

console.log('4) the Playoff: four title games, no Group of Five one, the fifth spot handed out');
console.log(`   seasons without exactly ${cfb.CFB_LEAGUES.length} title games ${m.ccgBad}; Group of Five title games ${m.g5Named}; seasons whose best ranked Group of Five school missed its spot ${m.fifthOut}`);
if (m.ccgBad > 0) fail(`${m.ccgBad} season(s) without exactly ${cfb.CFB_LEAGUES.length} title games`);
if (m.g5Named > 0) fail(`${m.g5Named} Group of Five title game(s), a game that does not exist`);
if (m.fifthOut > 0) fail(`${m.fifthOut} season(s) where the best ranked Group of Five school did not take the fifth spot`);

console.log('5) rivalry week and the conference count');
console.log(`   week 12 games off the table's pair ${m.rivalMiss}; table pairs not played ${m.seriesUnplayed}; league schools off six conference games (seven with an in-league rival in an even league) ${m.confBad}`);
for (const row of seriesRows) {
  const r = cfb.cfbRivalOf(row.a);
  if (!r || r.rival !== row.b || r.kind !== 'series') fail(`${row.a} and ${row.b} are a series in the table but not a series pair in the engine`);
}
if (m.rivalMiss > 0) fail(`${m.rivalMiss} week 12 game(s) left a real series unplayed`);
if (m.seriesUnplayed > 0) fail(`${m.seriesUnplayed} season pair(s) of the series table never met`);
if (m.confBad > 0) fail(`${m.confBad} school season(s) off the conference count, first: ${m.firstConf}`);

console.log('6) the rivalry table: real schools, one row a school, two sources a row on two hosts, no wiki');
{
  /* Reads the data rows and the comment lines directly above each, which is
     where the sources live (comments, so the links never ship in a chunk). */
  let text = readLf(path.join(ROOT, 'src', 'data', 'collegeRivalries.ts'));
  if (ctl && ctl[0] === 'DATA') text = text.replace(ctl[1], () => ctl[2]);
  const lines = text.split('\n');
  const rowRe = /^\s*\{ a: '([^']+)', b: '([^']+)'/;
  const urlRe = /https?:\/\/([^/\s]+)\/\S*/;
  let sport = null; let rows = 0; const seen = { CFB: new Set(), CBB: new Set() };
  lines.forEach((line, i) => {
    if (/export const CFB_RIVALRY_SERIES/.test(line)) sport = 'CFB';
    if (/export const CBB_RIVALRY_SERIES/.test(line)) sport = 'CBB';
    const row = line.match(rowRe);
    if (!row || !sport) return;
    rows += 1;
    const map = sport === 'CFB' ? cfb.CFB_SCHOOL_MAP : cbb.CBB_SCHOOL_MAP;
    for (const id of [row[1], row[2]]) {
      if (!map.has(id)) fail(`${sport} row ${row[1]}-${row[2]}: ${id} is not a school in the game`);
      if (seen[sport].has(id)) fail(`${sport}: ${id} is in two rows`);
      seen[sport].add(id);
    }
    const hosts = [lines[i - 2], lines[i - 1]].map(l => (l && /^\s*\/\//.test(l) ? (l.match(urlRe) || [])[1] : undefined));
    if (hosts.some(h => !h)) fail(`${sport} row ${row[1]}-${row[2]} does not carry two source links above it`);
    else if (hosts[0] === hosts[1]) fail(`${sport} row ${row[1]}-${row[2]}: both sources are on ${hosts[0]}`);
    if (hosts.some(h => h && /wiki/i.test(h))) fail(`${sport} row ${row[1]}-${row[2]} cites a wiki`);
  });
  const want = riv.CFB_RIVALRY_SERIES.length + riv.CBB_RIVALRY_SERIES.length;
  console.log(`   rows read ${rows}, rows the module exports ${want}`);
  if (rows !== want) fail(`read ${rows} rows from the file but the module exports ${want}: the reader no longer matches the file`);
}

console.log('7) old saves: a season already under way finishes the old way, the next one is real');
{
  const rng = lehmer(777);
  const st = cfb.initCfb('CLEM', rng, { depth: true });
  /* A save from before this round, written in week 5: no format, no slate. */
  delete st.format; delete st.slate; st.round = 5;
  for (let r = 5; r <= cfb.CFB_ROUNDS; r += 1) { cfb.simCfbRound(st, rng); st.round += 1; }
  st.round = cfb.CFB_ROUNDS;
  const built = !!(st.slate || st.format);
  const acc = cfb.confStandings(st, 'ACC').map(t => t.id);
  const post = cfb.runCfbPostseason(st, rng);
  console.log(`   the old season: slate or format built ${built}, Notre Dame in the ACC table ${acc.includes('ND')}, title games ${post.ccgs.length}`);
  if (built) fail('a save in the middle of an old season was given a slate or the new format');
  if (!acc.includes('ND')) fail('an old season lost Notre Dame from the ACC table it started with');
  if (post.ccgs.length !== 5) fail(`an old season played ${post.ccgs.length} title games, not the five it started with`);
  st.natties.push({ season: st.season, team: post.champion });
  cfb.cfbOpenOffseason(st, rng);
  cfb.cfbOffseason(st, rng);
  console.log(`   the next season: format ${st.format}, slate for it ${!!(st.slate && st.slate.season === st.season)}`);
  if (st.format !== 1 || !st.slate || st.slate.season !== st.season) fail('the season after an old one did not start under the real format');
}

console.log(`8) the builder under load: ${STRESS} slates from fresh seeds`);
{
  const base = lehmer(99);
  const st = cfb.initCfb('OSU', base, { depth: true });
  let fallbacks = 0; let bad = 0; const t0 = Date.now();
  for (let i = 0; i < STRESS; i += 1) {
    st.season = 2026 + (i % 2);
    const out = prog.collegeSlate(cfb.cfbSlateSpec(st), lehmer(1000 + i * 31));
    if (out.fallback) fallbacks += 1;
    const pairs = new Set();
    for (const round of out.rounds) for (const [h, a] of round) { const k = key(h, a); if (pairs.has(k)) bad += 1; pairs.add(k); }
  }
  const ms = (Date.now() - t0) / STRESS;
  console.log(`   on the fallback circle ${fallbacks}, repeated pairs ${bad}, ${ms.toFixed(1)} ms a slate`);
  if (fallbacks > 0) fail(`${fallbacks} of ${STRESS} slates ran out of tries and fell back on the circle`);
  if (bad > 0) fail(`${bad} repeated pair(s) across ${STRESS} slates`);
}

console.log('9) CBB: its series rows are rivalry pairs, and the table goes by league record');
{
  for (const row of riv.CBB_RIVALRY_SERIES) {
    const r = cbb.cbbRivalOf(row.a);
    if (!r || r.rival !== row.b || r.kind !== 'series') fail(`CBB: ${row.a} and ${row.b} are a series in the table but not in the engine`);
  }
  let unsorted = 0; let checked = 0; let differs = 0;
  for (let seed = 1; seed <= 5; seed += 1) {
    const rng = lehmer(seed * 104729);
    const st = cbb.initCbb('DUKE', rng, { depth: true });
    for (let season = 0; season < 3; season += 1) {
      for (let r = 1; r <= cbb.CBB_ROUNDS; r += 1) { cbb.simCbbRound(st, rng); if (r < cbb.CBB_ROUNDS) st.round += 1; }
      for (const conf of cbb.CBB_CONFS) {
        const table = cbb.cbbConfStandings(st, conf);
        const pct = t => { const n = (t.confWins ?? 0) + (t.confLosses ?? 0); return n ? t.confWins / n : 0; };
        checked += 1;
        for (let i = 1; i < table.length; i += 1) if (pct(table[i]) > pct(table[i - 1])) { unsorted += 1; break; }
        const byWins = [...table].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
        if (byWins.slice(0, 4).map(t => t.id).join() !== table.slice(0, 4).map(t => t.id).join()) differs += 1;
      }
      cbb.runMarch(st, rng);
      cbb.cbbOpenOffseason(st, rng);
      cbb.cbbOffseason(st, rng);
    }
  }
  console.log(`   tables checked ${checked}, out of league order ${unsorted}; tournament fields the league record changed ${differs}`);
  if (checked === 0) fail('no CBB table was checked');
  if (unsorted > 0) fail(`${unsorted} CBB table(s) not in league record order`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\nsimCfbSlate: ${failures} failure(s)` : '\nsimCfbSlate: all green');
process.exit(failures ? 1 : 0);
