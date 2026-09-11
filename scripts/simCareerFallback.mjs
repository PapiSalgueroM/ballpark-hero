/**
 * Round 531 harness: the Career Ladder and Transfer Path fallback is a copy of
 * the live career tables, and nobody has typed into it since the bake.
 *
 * WHAT WAS WRONG. src/data/careerPlayers.ts was hand typed: 151 players and
 * 1,648 seasons with no header and no source, while career_players and
 * career_seasons had grown to 253 players and 3,608 seasons. Transfer Path
 * validates guesses off the graph built from whichever pool is loaded, so while
 * the table was down the fallback refused chains the live game accepts, carried
 * two Roma seasons Alisson never played, and disagreed with the table on 18
 * stat rows. Nothing measured the gap. scripts/bakeCareerPlayers.mjs now
 * generates the file from the tables, and this fence holds it there.
 *
 * WHAT IT HOLDS:
 *   1. THE HEADER. The file names the bake and its date, and the counts it
 *      claims (players, seasons, null assists) are the counts it carries. The
 *      player and season counts sit above the floors measured on 2026-09-11,
 *      because a short read that baked fewer rows would otherwise pass as a
 *      smaller table.
 *   2. CANONICAL FORM. Rendering the parsed pool with the file's own stamp
 *      gives back the file byte for byte, so a row in a different shape or a
 *      hand added field cannot sit in a generated file.
 *   3. A FRESH BAKE. The tables are read exactly as the bake reads them and
 *      rendered with the file's stamp; the two must be identical. This is the
 *      check that catches a hand edited number and a table that moved.
 *   4. A 30 PLAYER SAMPLE, season for season, each player fetched on its own
 *      by name through separate queries, so a paging or grouping mistake in
 *      the bake's bulk read cannot agree with itself.
 *   5. THE SHAPE. No player carries the same season and club twice. A season
 *      under two clubs never repeats a stat line: a real mid season move is
 *      two different lines (116 of them in the table), a duplicated row is one
 *      line under two clubs. Seasons run in order (start years never go
 *      backwards), no stat is negative, and every club string is one the
 *      table itself uses.
 *
 * NEGATIVE CONTROLS, applied to the file TEXT in memory the way a hand edit
 * would land, each refusing to run if its rewrite changed nothing:
 *   CAREER_CONTROL=split duplicates one season row under a second club
 *   (sections 3 and 5 must go red).
 *   CAREER_CONTROL=stale changes one goals figure on a sampled player
 *   (sections 3 and 4 must go red; needs the database).
 *
 * CAREER_FALLBACK_LOCAL_ONLY=1 skips the live sections LOUDLY. They stay
 * mandatory in the normal suite.
 *
 * Run: node scripts/simCareerFallback.mjs   (needs the database)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  BAKE_SCRIPT, OUT_FILE, countNullAssists, fetchLiveCareerPlayers, poolProblems,
  renderCareerPlayersModule, supabaseFromClientTs,
} from './bakeCareerPlayers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAREER_CONTROL || '';
const LOCAL_ONLY = process.env.CAREER_FALLBACK_LOCAL_ONLY === '1';
if (CONTROL && !['split', 'stale'].includes(CONTROL)) { console.error(`CAREER_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
if (CONTROL === 'stale' && LOCAL_ONLY) { console.error('the stale control is caught by the live sections; run it without CAREER_FALLBACK_LOCAL_ONLY'); process.exit(1); }

/* the counts on 2026-09-11; a shrink is lost coverage, or a short read */
const PLAYER_FLOOR = 253;
const SEASON_FLOOR = 3608;
const SAMPLE = 30;

let failures = 0;
const findings = [];
const fail = m => { failures += 1; findings.push(m); if (failures <= 25) console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const norm = s => s.replaceAll('\r\n', '\n');
const rowKey = s => `${s.season}|${s.club}|${s.goals}|${s.assists}|${s.appearances}|${s.marketValue}`;

/* ------------------------------------------------------------------ */
/* The file, with the control planted as a text edit                  */
/* ------------------------------------------------------------------ */
let text = norm(fs.readFileSync(path.join(ROOT, OUT_FILE), 'utf8'));
const rowLine = /^      \{ season: "([^"]+)", club: "([^"]+)", goals: (\d+), assists: (null|\d+), appearances: (\d+), marketValue: (\d+) \},$/gm;
if (CONTROL === 'split') {
  /* the first season row of the first player, duplicated under the club of a later row */
  const rows = [...text.matchAll(rowLine)];
  const first = rows[0];
  const other = rows.find(r => r[2] !== first[2]);
  if (!first || !other) abort('split control cannot run: fewer than two clubs in the file');
  const planted = first[0].replace(`club: "${first[2]}"`, `club: "${other[2]}"`);
  const edited = text.replace(first[0], first[0] + '\n' + planted);
  if (edited === text || [...edited.matchAll(rowLine)].length !== rows.length + 1) abort('split control changed nothing');
  text = edited;
  console.log(`   NEGATIVE CONTROL ON: ${first[1]} duplicated under ${other[2]} beside ${first[2]}`);
}
if (CONTROL === 'stale') {
  /* one goals figure on the first player, who is always in the stride sample */
  const first = [...text.matchAll(rowLine)][0];
  if (!first) abort('stale control cannot run: no season row parsed');
  const planted = first[0].replace(`goals: ${first[3]}`, `goals: ${Number(first[3]) + 1}`);
  const edited = text.replace(first[0], planted);
  if (edited === text) abort('stale control changed nothing');
  text = edited;
  console.log(`   NEGATIVE CONTROL ON: ${first[1]} at ${first[2]} goals ${first[3]} rewritten to ${Number(first[3]) + 1}`);
}

/* bundle the (possibly edited) module through esbuild so the real TS is what is parsed */
const tmp = os.tmpdir();
const moduleCopy = path.join(tmp, 'career-fallback-copy.ts');
fs.writeFileSync(moduleCopy, text);
const entry = path.join(tmp, 'career-fallback-entry.mjs');
const bundle = path.join(tmp, 'career-fallback-bundle.mjs');
fs.writeFileSync(entry, `export { careerPlayers, CAREER_FALLBACK_META } from '${moduleCopy.replaceAll('\\', '/')}';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const site = await import(pathToFileURL(bundle).href + `?v=${Date.now()}`);
const players = site.careerPlayers;
const meta = site.CAREER_FALLBACK_META;
const seasonCount = players.reduce((n, p) => n + p.career.length, 0);

console.log('1) the header names the bake, and its counts are the file\'s counts');
{
  const head = text.split('\n').slice(0, 3).join('\n');
  const stamped = head.match(new RegExp(`GENERATED by ${BAKE_SCRIPT.replace(/[.\/]/g, '\\$&')} on (\\d{4}-\\d{2}-\\d{2})\\. DO NOT EDIT BY HAND`));
  if (!stamped) fail('the file does not open with the generated marker naming the bake and its date');
  else if (stamped[1] !== meta.generated) fail(`header date ${stamped[1]} and CAREER_FALLBACK_META.generated ${meta.generated} disagree`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.generated ?? '')) fail('CAREER_FALLBACK_META.generated is not a date');
  else if (meta.generated > new Date().toISOString().slice(0, 10)) fail(`CAREER_FALLBACK_META.generated ${meta.generated} is in the future`);
  if (meta.players !== players.length) fail(`meta says ${meta.players} players, the file carries ${players.length}`);
  if (meta.seasons !== seasonCount) fail(`meta says ${meta.seasons} seasons, the file carries ${seasonCount}`);
  const nulls = countNullAssists(players);
  if (meta.nullAssists !== nulls) fail(`meta says ${meta.nullAssists} null assists, the file carries ${nulls}`);
  if (players.length < PLAYER_FLOOR) fail(`${players.length} players, below the ${PLAYER_FLOOR} floor`);
  if (seasonCount < SEASON_FLOOR) fail(`${seasonCount} seasons, below the ${SEASON_FLOOR} floor`);
  console.log(`   generated ${meta.generated}: ${players.length} players, ${seasonCount} seasons, ${nulls} null assists`);
}

console.log('2) the file is its own render');
{
  const rendered = renderCareerPlayersModule(players, meta.generated);
  if (rendered !== text) {
    const a = rendered.split('\n'), b = text.split('\n');
    const at = a.findIndex((line, i) => line !== b[i]);
    fail(`the file does not equal its own render; first difference at line ${at + 1}: file ${JSON.stringify(b[at])}, render ${JSON.stringify(a[at])}`);
  } else console.log(`   ${text.length} bytes, byte for byte`);
}

/* the live read is shared by sections 3, 4 and 5 */
let live = null;
let supabase = null;
if (LOCAL_ONLY) {
  console.log('   LIVE SECTIONS SKIPPED BY CAREER_FALLBACK_LOCAL_ONLY=1. The tables are not claimed checked.');
} else {
  supabase = supabaseFromClientTs(ROOT);
  try {
    live = await fetchLiveCareerPlayers(supabase);
  } catch (error) {
    abort('Supabase unreachable, the live sections were not checked: ' + error.message);
  }
  if (live.players.length === 0 || live.seasonRows.length === 0) abort('the live read came back empty; nothing was checked');
}

console.log('3) the file equals a fresh bake of the live tables');
if (live) {
  const problems = poolProblems(live.players);
  for (const p of problems.slice(0, 10)) fail(`the live pool would not bake: ${p}`);
  const fresh = renderCareerPlayersModule(live.players, meta.generated);
  if (fresh !== text) {
    const byName = new Map(live.players.map(p => [p.name, p]));
    const fileNames = players.map(p => p.name), liveNames = live.players.map(p => p.name);
    for (const n of fileNames) if (!byName.has(n)) fail(`${n} is in the file and not in career_players`);
    for (const n of liveNames) if (!players.some(p => p.name === n)) fail(`${n} is in career_players and not in the file`);
    if (fileNames.join('|') !== liveNames.join('|')) fail('player order differs from the table\'s name order');
    for (const p of players) {
      const l = byName.get(p.name);
      if (!l) continue;
      if (p.nationality !== l.nationality || p.position !== l.position) fail(`${p.name}: file says ${p.nationality} ${p.position}, table says ${l.nationality} ${l.position}`);
      const a = p.career.map(rowKey), b = l.career.map(rowKey);
      if (a.join(';') !== b.join(';')) {
        const i = a.findIndex((k, idx) => k !== b[idx]);
        fail(`${p.name}: row ${i + 1} differs, file ${a[i] ?? '(none)'} table ${b[i] ?? '(none)'} (${a.length} rows in the file, ${b.length} in the table)`);
      }
    }
    fail('the file differs from a fresh bake; run node ' + BAKE_SCRIPT);
  } else console.log(`   ${live.players.length} players and ${live.seasonRows.length} seasons read fresh, identical`);
}

console.log(`4) a ${SAMPLE} player sample, each fetched on its own by name, season for season`);
if (live) {
  const picks = [];
  for (let i = 0; i < SAMPLE; i += 1) picks.push(players[Math.floor((i * players.length) / SAMPLE)]);
  let rows = 0;
  for (const p of picks) {
    const who = await supabase.from('career_players').select('id, nationality, position').eq('player_name', p.name);
    if (who.error) abort(`sample read failed for ${p.name}: ${who.error.message}`);
    if (!who.data || who.data.length !== 1) { fail(`sample: ${who.data?.length ?? 0} career_players rows named ${p.name}`); continue; }
    if (who.data[0].nationality !== p.nationality || who.data[0].position !== p.position) fail(`sample: ${p.name} is ${who.data[0].nationality} ${who.data[0].position} in the table, ${p.nationality} ${p.position} in the file`);
    const own = await supabase.from('career_seasons').select('season, club, goals, assists, appearances, market_value').eq('player_id', who.data[0].id).order('sort_order', { ascending: true });
    if (own.error) abort(`sample read failed for ${p.name}: ${own.error.message}`);
    const table = own.data.map(r => ({ season: r.season, club: r.club, goals: r.goals, assists: r.assists, appearances: r.appearances, marketValue: r.market_value }));
    if (table.length !== p.career.length) fail(`sample: ${p.name} has ${table.length} seasons in the table and ${p.career.length} in the file`);
    const n = Math.min(table.length, p.career.length);
    for (let i = 0; i < n; i += 1) {
      if (rowKey(table[i]) !== rowKey(p.career[i])) fail(`sample: ${p.name} season ${i + 1}: table ${rowKey(table[i])}, file ${rowKey(p.career[i])}`);
      rows += 1;
    }
  }
  console.log(`   ${picks.length} players, ${rows} season rows compared`);
}

console.log('5) the shape: no repeated season and club, no stat line under two clubs, seasons in order, nothing negative, clubs the table knows');
{
  for (const p of poolProblems(players)) fail(p);
  let twoClub = 0;
  for (const p of players) {
    const seen = new Set();
    const bySeason = new Map();
    let lastStart = -1;
    for (const s of p.career) {
      const sc = `${s.season}|${s.club}`;
      if (seen.has(sc)) fail(`${p.name} carries ${s.season} at ${s.club} twice`);
      seen.add(sc);
      (bySeason.get(s.season) ?? bySeason.set(s.season, []).get(s.season)).push(s);
      const start = Number(String(s.season).slice(0, 4));
      if (!Number.isInteger(start)) fail(`${p.name}: season ${JSON.stringify(s.season)} does not start with a year`);
      else if (start < lastStart) fail(`${p.name}: ${s.season} comes after a ${lastStart} season, seasons are out of order`);
      lastStart = Math.max(lastStart, start);
    }
    for (const [season, rows] of bySeason) {
      if (rows.length < 2) continue;
      twoClub += 1;
      const lines = new Map();
      for (const r of rows) {
        const line = `${r.goals}|${r.assists}|${r.appearances}|${r.marketValue}`;
        if (lines.has(line)) fail(`${p.name} ${season}: the same stat line under two clubs, ${lines.get(line)} and ${r.club} (a duplicated row, not a mid season move)`);
        lines.set(line, r.club);
      }
    }
  }
  if (live) {
    const known = new Set(live.seasonRows.map(r => r.club));
    const unknown = new Set();
    for (const p of players) for (const s of p.career) if (!known.has(s.club)) unknown.add(s.club);
    for (const c of unknown) fail(`club string ${JSON.stringify(c)} appears in the file and nowhere in career_seasons`);
    console.log(`   ${twoClub} real two club seasons, ${known.size} distinct clubs in the table, every file club among them`);
  } else console.log(`   ${twoClub} real two club seasons; the club list check needs the database`);
}

console.log('');
if (CONTROL) {
  const has = re => findings.some(f => re.test(f));
  const expected = CONTROL === 'split'
    ? [has(/the same stat line under two clubs/), LOCAL_ONLY || has(/differs from a fresh bake/)]
    : [has(/differs from a fresh bake/), has(/^sample: .* season 1: table/)];
  if (failures > 0 && expected.every(Boolean)) { console.log(`simCareerFallback control (${CONTROL}): green. The planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simCareerFallback control (${CONTROL}): RED. ${failures ? 'Findings came, but not the ones the control plants.' : 'The planted defect went unreported.'}`);
  process.exit(1);
}
if (failures > 0) { console.error(`simCareerFallback: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simCareerFallback: green. The fallback is a byte for byte bake of the live career tables and every row has the shape a real season has.');
