/**
 * Round 716 harness: today's standing on a daily result is one shared panel,
 * on each game's own scale, counted in the database, and hidden when the day
 * is too thin to mean anything.
 *
 * Before this round the panel ("better than X% of players today") sat on two
 * games, Footle and the retired Guess The Value, and it read every signed in
 * score row for the UTC date and counted them on the phone. Guess The Value
 * got the default 0 to 1000 rows while its best day records 900, and both
 * showed the daily's board under an unlimited round.
 *
 * Checks, all offline:
 *   1. the rows fit the scale each game really records: every score the
 *      game can record lands in exactly one row, the top row ends at the
 *      best score it can record and the bottom row starts at the worst. For
 *      Higher or Lower all 1,024 ways a ten round day can go are scored with
 *      the real formula.
 *   2. the client rules: under 20 players the panel gets nothing, a reply
 *      whose counts do not add up is refused, rows come back in the order the
 *      page drew them, and "you beat X%" counts only the other players.
 *   3. the database function: a fixed body, SECURITY INVOKER, read only, no
 *      name or row in what it returns, the same 20 player floor as the
 *      client, and the file says it is not applied.
 *   4. the mounts: every wired page passes the slug its hook records under,
 *      shows the panel on the daily only, and passes its game's own rows; at
 *      least eight live daily games carry it; the panel reads counts through
 *      the function and never selects a table.
 *
 * Controls (each must turn exactly its own check red):
 *   DAILY_STANDING_CONTROL=stale       Higher or Lower rows back on 0 to 1000   (1, hl scale)
 *   DAILY_STANDING_CONTROL=clientfloor the client floor drops to 1              (2, client floor)
 *   DAILY_STANDING_CONTROL=floor       the SQL floor drops to 5                 (3, sql floor)
 *   DAILY_STANDING_CONTROL=definer     the function runs as its owner           (3, invoker)
 *   DAILY_STANDING_CONTROL=unlimited   NBA Higher or Lower shows it always      (4, daily only)
 *   DAILY_STANDING_CONTROL=slug        MLB Higher or Lower asks for NBA's day   (4, slug)
 *   DAILY_STANDING_CONTROL=rows        the panel selects the table itself       (4, counts only)
 *
 * Run: node scripts/simDailyStanding.mjs
 */
import { readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.DAILY_STANDING_CONTROL || '';
const CONTROLS = {
  stale: 'hl scale',
  clientfloor: 'client floor',
  floor: 'sql floor',
  definer: 'invoker',
  unlimited: 'daily only',
  slug: 'slug',
  rows: 'counts only',
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`simDailyStanding: unknown control ${CONTROL}; one of ${Object.keys(CONTROLS).join(', ')}`);
  process.exit(2);
}

const read = rel => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const stripTs = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const stripSql = t => t.replace(/--.*$/gm, '');

/* A control edits the text a check reads, and must prove it edited something. */
function mutate(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`control ${CONTROL}: "${from}" is not in ${label}, so the control would change nothing`);
  return text.replace(from, to);
}

const red = new Map();
function check(name, ok, message) {
  if (ok) return;
  red.set(name, (red.get(name) ?? 0) + 1);
  console.error(`  FAIL [${name}]: ${message}`);
}

/* ---------- bundle the pure pieces ---------- */

const STANDING_TS = path.join(ROOT, 'src/lib/dailyStanding.ts');
const SCORE_HOOKS = [path.join(ROOT, 'src/hooks/useGame.ts'), path.join(ROOT, 'src/hooks/useGuessTransferValue.ts')];
const norm = p => path.resolve(p).toLowerCase();

let standingSrc = readFileSync(STANDING_TS, 'utf8');
if (CONTROL === 'clientfloor') {
  standingSrc = mutate(standingSrc, 'if (players < DAILY_STANDING_MIN_PLAYERS) return null;', 'if (players < 1) return null;', 'dailyStanding.ts');
}

/* The two score hooks are loaded for their score function and rows only:
   every import they make is a blank stub, so nothing React or network runs. */
const plugin = {
  name: 'r716',
  setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (args.importer && SCORE_HOOKS.some(h => norm(h) === norm(args.importer))) {
        return { path: args.path, namespace: 'r716-stub' };
      }
      return undefined;
    });
    b.onLoad({ filter: /.*/, namespace: 'r716-stub' }, () => ({ contents: 'module.exports = {};', loader: 'js' }));
    b.onLoad({ filter: /dailyStanding\.ts$/ }, args => (
      norm(args.path) === norm(STANDING_TS) ? { contents: standingSrc, loader: 'ts' } : undefined
    ));
  },
};

const OUT = path.join(os.tmpdir(), `simDailyStanding-${process.pid}-${Date.now()}.mjs`);
const rootFwd = ROOT.replaceAll('\\', '/');
await build({
  stdin: {
    contents: `
      export * as standing from '${rootFwd}/src/lib/dailyStanding.ts';
      export * as hl from '${rootFwd}/src/lib/higherLowerScore.ts';
      export { footleScore, FOOTLE_SCORE_BUCKETS } from '${rootFwd}/src/hooks/useGame.ts';
      export { transferValueScore, TRANSFER_VALUE_SCORE_BUCKETS, MAX_GUESSES as TV_MAX_GUESSES } from '${rootFwd}/src/hooks/useGuessTransferValue.ts';
    `,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
});
const B = await import(pathToFileURL(OUT).href);
rmSync(OUT, { force: true });
const S = B.standing;

/* ---------- 1. the rows fit each game's recorded scale ---------- */

console.log('1) the rows fit the scale each game records');
function scaleCheck(name, label, scores, buckets) {
  const best = Math.max(...scores);
  const worst = Math.min(...scores);
  const top = Math.max(...buckets.map(b => b.max));
  const bottom = Math.min(...buckets.map(b => b.min));
  check(name, top === best, `${label}: the top row ends at ${top}, the best day it can record is ${best}`);
  check(name, bottom === worst, `${label}: the bottom row starts at ${bottom}, the worst day it records is ${worst}`);
  check(name, S.bucketEdges(buckets) !== null, `${label}: the rows are not one gapless run, so the database would refuse them`);
  let homeless = 0;
  let doubled = 0;
  for (const s of scores) {
    const n = buckets.filter(b => s >= b.min && s <= b.max).length;
    if (n === 0) homeless += 1;
    if (n > 1) doubled += 1;
  }
  check(name, homeless === 0 && doubled === 0, `${label}: ${homeless} recordable scores have no row and ${doubled} have two`);
  console.log(`   ${label}: ${new Set(scores).size} recordable scores from ${worst} to ${best}, rows ${buckets.map(b => b.label).join(' ')}`);
}
{
  const rounds = B.hl.HIGHER_LOWER_DAILY_ROUNDS;
  const hlScores = [];
  for (let mask = 0; mask < 2 ** rounds; mask += 1) {
    const day = Array.from({ length: rounds }, (_, i) => ({ correct: ((mask >> i) & 1) === 1 }));
    hlScores.push(B.hl.higherLowerScore(day));
  }
  const hlRows = CONTROL === 'stale' ? S.evenScoreBuckets(1000) : B.hl.HIGHER_LOWER_SCORE_BUCKETS;
  scaleCheck('hl scale', `Higher or Lower, all ${hlScores.length} ten round days`, hlScores, hlRows);
  check('hl scale', B.hl.HIGHER_LOWER_DAILY_MAX === Math.max(...hlScores), `HIGHER_LOWER_DAILY_MAX is ${B.hl.HIGHER_LOWER_DAILY_MAX}, a perfect day scores ${Math.max(...hlScores)}`);

  const footle = [0];
  for (let g = 1; g <= 8; g += 1) { footle.push(B.footleScore(true, g)); footle.push(B.footleScore(false, g)); }
  scaleCheck('footle scale', 'Footle, a win in 1 to 8 or a miss', footle, B.FOOTLE_SCORE_BUCKETS);

  const tv = [0];
  for (let g = 1; g <= B.TV_MAX_GUESSES; g += 1) { tv.push(B.transferValueScore(true, g)); tv.push(B.transferValueScore(false, g)); }
  scaleCheck('value scale', `Guess The Value, a win in 1 to ${B.TV_MAX_GUESSES} or a miss`, tv, B.TRANSFER_VALUE_SCORE_BUCKETS);
}

/* ---------- 2. the client rules ---------- */

console.log('2) the client rules');
{
  const rows = B.hl.HIGHER_LOWER_SCORE_BUCKETS;
  /* What the database sends: counts in ascending edge order. */
  const asRpc = st => {
    const asc = [...rows].map((b, i) => ({ b, i })).sort((x, y) => x.b.min - y.b.min);
    return [{ players: st.players, below: st.below, median: st.median, top: st.top, bucket_counts: asc.map(x => st.counts[x.i]) }];
  };
  const others19 = [0, 10, 20, 35, 50, 60, 75, 90, 100, 120, 140, 150, 170, 200, 225, 250, 290, 300, 325];
  const st20 = S.standingFromScores(others19, 150, rows);
  check('client floor', st20 !== null && st20.players === 20, 'twenty players including you produced no standing');
  const parsed = st20 && S.parseStanding(asRpc(st20), rows);
  check('client rows', !!parsed && JSON.stringify(parsed.counts) === JSON.stringify(st20.counts), 'the rows came back out of the order the page drew them');
  check('client rows', !!parsed && parsed.counts.reduce((a, c) => a + c, 0) === 20, 'the counts do not add up to the players');
  const youRow = S.bucketIndexFor(150, rows);
  check('client rows', !!parsed && rows[youRow].min <= 150 && rows[youRow].max >= 150, 'your row is not the row holding your score');
  /* 11 of the 19 others are under 150 and one ties it: you beat 11 of 19. */
  check('client percent', !!parsed && parsed.below === 11 && S.beatPercent(parsed) === Math.round((11 / 19) * 100), `you beat ${parsed?.below} of 19, ${parsed && S.beatPercent(parsed)}%, where 11 of 19 is 58%`);
  check('client percent', S.beatPercent({ players: 20, below: 19 }) === 100 && S.beatPercent({ players: 20, below: 0 }) === 0, 'the top and bottom of a 20 player day do not read 100 and 0');
  /* Twenty sorted scores: the 10th and 11th are 120 and 140, so the median
     is 130, the same percentile_cont(0.5) the database takes. */
  check('client percent', !!st20 && st20.median === 130 && st20.top === 325, `median ${st20?.median} and top ${st20?.top}, expected 130 and 325`);

  const nineteen = { players: 19, below: 3, median: 100, top: 300, counts: [1, 3, 5, 5, 5] };
  const thin = S.parseStanding(asRpc(nineteen), rows);
  check('client floor', thin === null, 'a day of 19 players, you included, still drew a standing');
  const short = S.parseStanding([{ ...asRpc(st20 ?? nineteen)[0], bucket_counts: [1, 1, 1, 1, 1] }], rows);
  check('client refuses', short === null, 'counts that add up to 5 on a 20 player day were accepted');
  check('client refuses', S.parseStanding(null, rows) === null && S.parseStanding([], rows) === null, 'an empty reply drew something');
  check('client refuses', S.bucketEdges([{ label: 'a', min: 0, max: 9 }, { label: 'b', min: 11, max: 20 }]) === null, 'rows with a gap at 10 were accepted');
  check('client refuses', S.bucketEdges(S.evenScoreBuckets(325)) !== null, 'even rows up to 325 were refused');
  console.log(`   20 players: you ${150}, beat ${parsed?.below} of 19 (${parsed && S.beatPercent(parsed)}%), median ${st20?.median}, top ${st20?.top}; 19 players: ${thin === null ? 'hidden' : 'SHOWN'}`);
}

/* ---------- 3. the database function ---------- */

console.log('3) the database function');
{
  const file = 'supabase/migrations/20260930_round_716_daily_score_standing.sql';
  const raw = read(file);
  let sql = stripSql(raw);
  if (CONTROL === 'floor') sql = mutate(sql, 'having count(*) >= 20;', 'having count(*) >= 5;', file);
  if (CONTROL === 'definer') sql = mutate(sql, 'security invoker', 'security definer', file);
  const low = sql.toLowerCase();
  const fn = low.match(/create or replace function public\.daily_score_standing\(([\s\S]*?)\)\s*returns table \(([\s\S]*?)\)\s*([\s\S]*?)as \$\$([\s\S]*?)\$\$;/);
  check('sql shape', !!fn, 'no create or replace function public.daily_score_standing(...) returns table (...) as $$ ... $$ in the file');
  if (fn) {
    const [, , returns, attrs, body] = fn;
    check('invoker', /\bsecurity invoker\b/.test(attrs) && !/\bsecurity definer\b/.test(low), 'the function is not SECURITY INVOKER');
    check('sql shape', /\bstable\b/.test(attrs) && /\blanguage sql\b/.test(attrs), 'the function is not a stable SQL function');
    check('sql read only', !/\b(insert|update|delete|truncate|drop|alter|create|execute|perform|copy)\b/.test(body), 'the body writes, runs dynamic SQL, or changes schema');
    const tables = [...body.matchAll(/\bpublic\.(\w+)/g)].map(m => m[1]);
    check('sql read only', tables.length > 0 && tables.every(t => t === 'game_completions' || t === 'game_score_caps'), `the body reads ${[...new Set(tables)].join(', ')}, not only game_completions and the allowlist`);
    check('sql counts only', !/player_name|\bid\b|created_at/.test(returns), `the function returns ${returns.trim()}, which carries a row's identity`);
    check('sql counts only', /bucket_counts integer\[\]/.test(returns), 'the function does not return bucket counts');
    const floor = body.match(/having count\(\*\) >= (\d+);/);
    check('sql floor', !!floor && Number(floor[1]) === S.DAILY_STANDING_MIN_PLAYERS, `the SQL hides under ${floor?.[1]} players, the client under ${S.DAILY_STANDING_MIN_PLAYERS}`);
    check('sql day', /america\/new_york/.test(body), 'the day is not the Eastern day the daily puzzles turn over on');
    console.log(`   ${file}: invoker, stable, reads ${[...new Set(tables)].join(' and ')}, returns (${returns.replace(/\s+/g, ' ').trim()}), floor ${floor?.[1]}`);
  }
  check('sql unapplied', /NOT APPLIED/.test(raw), 'the header does not say the migration is unapplied');
}

/* ---------- 4. the mounts ---------- */

console.log('4) the mounts');
{
  const HL = ['Nfl', 'Nba', 'Mlb', 'Hockey', 'F1', 'Golf', 'Tennis', 'Afl', 'Cfb'];
  const HL_SLUG = { Nfl: 'nfl', Nba: 'nba', Mlb: 'mlb', Hockey: 'hockey', F1: 'f1', Golf: 'golf', Tennis: 'tennis', Afl: 'afl', Cfb: 'cfb' };
  const WIRED = [
    ...HL.map(k => ({ page: `${k}HigherLower`, hook: `use${k}HL`, slug: `${HL_SLUG[k]}-higher-lower`, rows: 'HIGHER_LOWER_SCORE_BUCKETS', hl: true })),
    { page: 'Footle', hook: 'useGame', slug: 'footle', rows: 'FOOTLE_SCORE_BUCKETS' },
    { page: 'GuessTransferValue', hook: 'useGuessTransferValue', slug: 'guess-transfer-value', rows: 'TRANSFER_VALUE_SCORE_BUCKETS' },
  ];
  const registry = stripTs(read('src/data/gameRegistry.ts'));
  let liveDaily = 0;
  for (const w of WIRED) {
    let page = stripTs(read(`src/pages/${w.page}.tsx`));
    if (CONTROL === 'unlimited' && w.page === 'NbaHigherLower') page = mutate(page, "isVisible={mode === 'daily'}", 'isVisible={true}', `${w.page}.tsx`);
    if (CONTROL === 'slug' && w.page === 'MlbHigherLower') page = mutate(page, 'gameSlug="mlb-higher-lower"', 'gameSlug="nba-higher-lower"', `${w.page}.tsx`);
    const hook = stripTs(read(`src/hooks/${w.hook}.ts`));
    const mounts = [...page.matchAll(/<PostGameStats\b([\s\S]*?)\/>/g)].map(m => m[1]);
    check('mounted', mounts.length === 1, `${w.page} mounts the panel ${mounts.length} times`);
    const props = mounts[0] ?? '';
    const slug = props.match(/gameSlug="([^"]+)"/)?.[1];
    check('slug', slug === w.slug && hook.includes(`useGameCompletion('${w.slug}'`), `${w.page} asks for "${slug}", its hook records under "${w.slug}"`);
    check('daily only', /isVisible=\{mode === 'daily'\}/.test(props), `${w.page} shows today's board outside the daily`);
    check('game rows', new RegExp(`buckets=\\{${w.rows}\\}`).test(props), `${w.page} does not pass ${w.rows}`);
    check('mounted', page.includes(`from '@/hooks/${w.hook}'`), `${w.page} does not use ${w.hook}`);
    if (w.hl) {
      const rounds = hook.match(/const ROUNDS = (\d+);/)?.[1];
      check('hl scale', Number(rounds) === B.hl.HIGHER_LOWER_DAILY_ROUNDS, `${w.hook} plays ${rounds} rounds, the rows assume ${B.hl.HIGHER_LOWER_DAILY_ROUNDS}`);
      check('hl scale', /const dailyScore = higherLowerScore\(dailyResults\);/.test(hook) && hook.includes(`useGameCompletion('${w.slug}', rawDailyStatus !== 'playing', dailyScore)`), `${w.hook} does not record higherLowerScore of the daily`);
      check('hl scale', /userScore=\{totalScore\}/.test(props), `${w.page} does not pass the score it shows`);
    }
    const line = registry.split('\n').find(l => l.includes(`path: '/${w.slug}'`));
    if (line && /daily: true/.test(line)) liveDaily += 1;
  }
  check('mounted', liveDaily >= 8, `only ${liveDaily} live daily games carry the panel, the round promised at least eight`);

  let panel = stripTs(read('src/components/game/PostGameStats.tsx'));
  if (CONTROL === 'rows') panel = mutate(panel, 'const { data, error } = await (supabase.rpc as any)(DAILY_STANDING_RPC, {', "await supabase.from('game_completions').select('score');\n        const { data, error } = await (supabase.rpc as any)(DAILY_STANDING_RPC, {", 'PostGameStats.tsx');
  check('counts only', !/\.from\(/.test(panel), 'the panel selects a table itself instead of asking for counts');
  check('counts only', /supabase\.rpc as any\)\(DAILY_STANDING_RPC/.test(panel) && /parseStanding\(data, rows\)/.test(panel), 'the panel does not read the standing through the function and parseStanding');
  check('counts only', /if \(!isVisible \|\| !standing\) return null;/.test(panel), 'the panel draws something with no standing');
  check('counts only', /motion-reduce:transition-none/.test(panel) && /data-no-prerender/.test(panel), 'the bars move under reduced motion, or the panel can be saved into a page');
  console.log(`   ${WIRED.length} pages wired, ${liveDaily} of them live daily games on the registry`);
}

/* ---------- verdict ---------- */

console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const names = [...red.keys()];
  console.log(`control ${CONTROL}: red on ${names.join(', ') || 'nothing'}`);
  if (names.length === 1 && names[0] === want) {
    console.log(`simDailyStanding: control ${CONTROL} turned exactly its own check (${want}) red, as it should.`);
  } else {
    console.error(`simDailyStanding: control ${CONTROL} should turn only "${want}" red.`);
  }
  process.exit(1);
}
if (red.size > 0) {
  const n = [...red.values()].reduce((a, c) => a + c, 0);
  console.error(`simDailyStanding: ${n} failure${n === 1 ? '' : 's'} (${[...red.keys()].join(', ')})`);
  process.exit(1);
}
console.log("simDailyStanding: green. Ten daily results carry today's standing, each on its own scale, counted in the database, hidden under 20 players.");
