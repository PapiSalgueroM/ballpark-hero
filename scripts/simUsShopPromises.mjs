/* Round 1534: the US My Career shop keeps its promises (NBA, NFL, MLB and NHL), proved on the four real engines.
 *
 * The shop's rules live in one block of src/lib/usCareerAnnualBenefits.ts (settleUsCareerShop, usCareerSeasonCool,
 * the table US_SHOP_RETURNS), called once from each engine's season end. This harness bundles the four engines
 * twice with esbuild: the HEAD arm is this tree, the BASE arm is this tree with this round's engine hunks taken back
 * out (each asserted present exactly once), so a later round's edits sit in both arms and only this round is
 * compared (simCareerForm's method). SHOP_BASE_CHECK=1 also compares the rebuilt base files with SHOP_BASE's own,
 * the commit the round started from. Every expected number is a literal or is parsed from the card's printed
 * words, never read from US_SHOP_RETURNS (the table under test), so a typo in the table turns this red.
 *
 * Sections (SHOP_SECTIONS=0,2,3 runs some):
 *   0  the unit file src/lib/usCareerShopPromises.test.ts in a vitest child: real exit code, exact row count
 *   1  words: every card that prints a percent, a chance or a payout is a table row with the printed numbers
 *   2  steady: two index funds and the steady one time card against a twin, two seasons through sim and progress
 *   3  stakes: 2,000 careers per gamble per sport, the win share inside the printed chance plus or minus 4 sd
 *   4  the family office: 2 percent of Cash above zero, after the steady returns; nothing at zero or below; and the
 *      settle lands before the money app's tick, whose thin buffer rule reads Cash (a holder keeps 3 morale)
 *   5  heat: the lawyer cools a clean season twice as fast; with dirty money held nothing changes
 *   6  paid lines (Round 1538): the four brand answers and the ten clean corruption answers bank what they say, in
 *      both eras, from a Cash balance that holds hundredths, and the outcome card shows that Cash row
 *   7  the Skill card (Round 1538): its answer stops at the ceiling and says what landed, and a summer fleet base
 *      against head parts only where the rider acts (run after section 8, whose policy it shares)
 *   8  digest: careers that hold nothing that pays replay byte identical to the base arm, draw for draw
 *   9  old saves: a base arm save that bought everything earns one season per season on the head, no back pay
 *
 * Controls (SHOP_CONTROL=<name>; each patches the head bundle in memory, never the source, asserts its needle is
 * present first, and must turn red what it names):
 *   rate     index_nba pays 0.08                        -> section 1's index_nba row and section 2's NBA case, nothing else
 *   words    the NBA shoe says "real royalties" again   -> section 1, that card only
 *   camp     the NBA summer camp's buy case removed      -> section 1, the NBA camp only
 *   nocall   the settle call removed from all four engines -> sections 2, 3, 4 and 9 in all four sports
 *   chance   every crypto punt wins at 0.3                 -> section 3's crypto bands in all four sports
 *   twice    a settled stake stays in `purchased`          -> section 3's settles once case
 *   office   the office rate is 0                          -> section 4
 *   lawyer   the lawyer's multiplier is 1                  -> section 5
 *   leak     a career that holds nothing that pays gets 0.1M -> section 8 in all four sports
 *   coolall  everybody cools twice as fast                 -> section 8 (it reaches the clean heat path)
 *   backpay  the first settle of a save without a carry pays twice -> section 9
 *   settleafter  the settle moved below the money app's tick in all four engines -> section 4's thin buffer case only
 *   nobank   the fee helper moves earnings only (Round 1538)  -> section 6, every case in all four sports
 *   potplusone     the NBA Skill answer back to pot + 1       -> section 7's NBA (a) cases only
 *   potplusoneall  all four Skill answers back to pot + 1     -> section 7's (a) cases in every sport, and the summer
 *                  fleet parts from the base arm nowhere (which proves the fleet's attribution)
 *   earnround  the fee helper rounds the earnings total to a tenth again (critic 6 forbids it) -> section 6, every
 *              case in all four sports (review of 2026-10-22, run lens finding 3: before the earnings started at
 *              hundredths this escaped every check)
 *   clampdown  the Skill answer pulls a rating above the ceiling down to it -> section 7's (a) case "above the
 *              ceiling" in all four sports (run lens finding 2: before that case this kept section 7 green), and the
 *              fleet's every-answer check wherever a head career answers the card above its ceiling
 *
 * Section 3's band, with its measured headroom (RULES line 7; review of 2026-10-22, read lens finding 4). The share
 * is checked inside the printed chance plus or minus 4 binomial sd. The careers are named and seeded in a fixed
 * order, so a given count gives the same shares on every run: the band does not guard against noise, it is what
 * lets the check see a wrong chance (control chance, crypto 0.2 to 0.3, fires in all four sports). Measured on
 * head 1a71de29 (runner results r1534-run-a and its 4,000 career line shop-allsets):
 *   2,000 careers (the default; bands 0.164 to 0.236, 0.259 to 0.341, 0.307 to 0.393):
 *     NBA restaurant 0.344, crypto 0.208; NFL wing 0.347, crypto 0.190, esports 0.294; MLB restaurant 0.358,
 *     crypto 0.188; NHL restaurant 0.353, crypto 0.186. Closest to an edge: NHL crypto, 0.022 (2.5 sd) above 0.164.
 *   4,000 careers (bands 0.175 to 0.225, 0.271 to 0.329, 0.320 to 0.380):
 *     NBA 0.345, 0.205; NFL 0.346, 0.188, 0.295; MLB 0.355, 0.203; NHL 0.342, 0.194. Closest: NFL crypto, 0.013
 *     (2.1 sd) above 0.175.
 * A band around an expected value gets easier with less data, so SHOP_STAKE_CAREERS may raise the count and never
 * lower it below 2,000: a smaller count is refused (exit 2).
 *
 * Exit 0 green, 1 red or a control fired, 2 could not run, 3 a control did not fire. The last line says which.
 * Nothing here reaches the network.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOP_BASE = process.env.SHOP_BASE || '413685149bed816a5c384242aa8c40f412b1d523';
const CONTROL = process.env.SHOP_CONTROL || '';
const CONTROL_SECTIONS = { rate: ['1', '2'], words: ['1'], camp: ['1'], nocall: ['2', '3', '4', '9'], chance: ['3'], twice: ['3'], office: ['4'], lawyer: ['5'], leak: ['8'], coolall: ['8'], backpay: ['9'], settleafter: ['4'], nobank: ['6'], earnround: ['6'], potplusone: ['7'], potplusoneall: ['7'], clampdown: ['7'] };
if (CONTROL && !CONTROL_SECTIONS[CONTROL]) { console.log(`simUsShopPromises: could not run, unknown SHOP_CONTROL ${CONTROL}`); process.exit(2); }
const SECTIONS = (process.env.SHOP_SECTIONS || (CONTROL ? CONTROL_SECTIONS[CONTROL].join(',') : '0,1,2,3,4,5,6,7,8,9')).split(',').map(s => s.trim());
const runs = s => SECTIONS.includes(s);
const STAKE_CAREERS = Number(process.env.SHOP_STAKE_CAREERS || 2000);
if (!(STAKE_CAREERS >= 2000)) { console.log(`simUsShopPromises: could not run, SHOP_STAKE_CAREERS ${process.env.SHOP_STAKE_CAREERS} is under 2000 (section 3's band only widens with fewer careers)`); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'us-shop1534-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const lf = s => s.split('\r\n').join('\n');
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
const abort = msg => { console.log(`simUsShopPromises: could not run, ${msg}`); process.exit(2); };
const red = new Map();
const fail = (section, who, msg) => {
  const set = red.get(section) ?? new Set();
  if (set.size < 8) console.log(`   FAIL [${section}] ${who}: ${msg}`);
  set.add(who);
  red.set(section, set);
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const r1 = v => Math.round(v * 10) / 10;
const mulberry = seed => {
  let s = seed | 0, n = 0;
  const f = () => { n += 1; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.count = () => n;
  return f;
};

const US = [
  { id: 'nba', S: 'NBA', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', eras: 'NBA_ERAS', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', draw: 'drawNbaEvent', retire: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', buy: 'buyNbaItem' },
  { id: 'nfl', S: 'NFL', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', eras: 'NFL_ERAS', start: 'startCareer', season: 'simSeason', progress: 'progress', draw: 'drawEvent', retire: 'shouldRetire', roll: 'rollTeamQuality', buy: 'buyNflItem' },
  { id: 'mlb', S: 'MLB', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', eras: 'MLB_ERAS', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', draw: 'drawMlbEvent', retire: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', buy: 'buyMlbItem' },
  { id: 'nhl', S: 'NHL', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', eras: 'NHL_ERAS', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', draw: 'drawNhlEvent', retire: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', buy: 'buyNhlItem' },
];
const MODULE = 'src/lib/usCareerAnnualBenefits.ts';

/* ─── the base arm: this round's engine hunks, each taken back out exactly once ─── */
const SETTLE_LINES = S => '  /* Round 1534: the shop pays what its cards print (src/lib/usCareerAnnualBenefits.ts), straight after the pay\n'
  + '     line so Cash is in tenths, and before the money app. Stakes draw on their own keyed stream, never this rng. */\n'
  + `  for (const line of settleUsCareerShop(c, ${S}_SPEND_ITEMS)) notes.push(line);\n`;
/* Round 1538's engine hunks come out first (the base arm is the engines as Round 1534 started from them): its import
   line and the summer brand answer through the shared fee helper. */
const BRAND_1538 = {
  nba: ['const fee = bankUsCareerFee(cc, 5, nbaEraById(cc.eraId).moneyScale); return `Signature shoe talks. ${fee}M endorsement banked.`;', "cc.earnings += 5; return 'Signature shoe talks. 5M endorsement banked.';"],
  nfl: ["/* Round 1104: the fee reaches the bank, in the era's money. Round 1538: through the helper all four sports share, which never rounds the balance again. */ cc.fanbase = Math.min(100, cc.fanbase + 12); const fee = bankUsCareerFee(cc, 3, nflEraById(cc.eraId).moneyScale);",
    "/* Round 1104: the fee reaches the bank (it only ever reached career earnings) and is paid in the era's money. */ const fee = Math.round(3 * nflEraById(cc.eraId).moneyScale * 10) / 10; const bank = cc.netWorth ?? Math.round(cc.earnings * TAKE_HOME * 10) / 10; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += fee; cc.netWorth = Math.round((bank + fee) * 10) / 10;"],
  mlb: ['const fee = bankUsCareerFee(cc, 3, mlbEraById(cc.eraId).moneyScale); return `National ads all winter. ${fee}M banked.`;', "cc.earnings += 3; return 'National ads all winter. 3M banked.';"],
  nhl: ['const fee = bankUsCareerFee(cc, 2, nhlEraById(cc.eraId).moneyScale); return `Golf videos and a doc crew. ${fee}M banked.`;', "cc.earnings += 2; return 'Golf videos and a doc crew. 2M banked.';"],
};
/* and the summer Skill answer through the shared Skill helper, with its new button words (critic 8). */
const SKILL_TAIL_1538 = 'const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },';
const SKILL_AGE = { nba: 31, nfl: 30, mlb: 32, nhl: 31 };
/* The maintenance line opens with the lead and says the health that landed (review of 2026-10-22, minors 1 and 5). */
const SKILL_LEAD = { nba: 'Maintenance year.', nfl: 'At this age the gains are in maintenance.', mlb: 'Veteran maintenance.', nhl: 'Maintenance summer.' };
const SKILL_SAYS = Object.fromEntries(Object.entries(SKILL_LEAD).map(([id, lead]) => [id, `${lead} Health +4.`]));
const SKILL_WAS_EFFECT = { nba: 'Push the ceiling', nfl: 'Push your ceiling', mlb: 'Push the ceiling', nhl: 'Push the ceiling' };
const SKILL_1538 = sport => {
  const age = SKILL_AGE[sport.id], says = SKILL_SAYS[sport.id];
  return [`effect: c.age >= ${age} ? 'Health +4, up to 100' : 'Rating +1 or +2, up to your ceiling', apply: (cc, r) => usCareerSkillSummer(cc, r, ${age}, '${SKILL_LEAD[sport.id]}') },`,
    `effect: '${SKILL_WAS_EFFECT[sport.id]}', apply: (cc, r) => { if (cc.age >= ${age}) { cc.health = Math.min(100, cc.health + 4); return '${says}'; } ${SKILL_TAIL_1538}`];
};
const unshopHunks = sport => [
  ["import { bankUsCareerFee, usCareerSkillSummer } from './usCareerAnnualBenefits';\n", ''],
  BRAND_1538[sport.id],
  SKILL_1538(sport),
  ["import { settleUsCareerShop, usCareerSeasonCool } from './usCareerAnnualBenefits';\n", ''],
  ['const drift = dm > 0 ? Math.min(8, 2 + dm * 0.5) : -usCareerSeasonCool(c.purchased, 9);', 'const drift = dm > 0 ? Math.min(8, 2 + dm * 0.5) : -9;'],
  [SETTLE_LINES(sport.S), ''],
];
/* The card words this round changed (decision 6), on the card's own line: [id, the words now, the words before]. */
const OFFICE_ID = { nba: 'family_office_nba', nfl: 'family_office', mlb: 'family_office_mlb', nhl: 'family_office_nhl' };
const STAKE_ID = { nba: 'team_stake', nfl: 'minority_stake', mlb: 'team_stake', nhl: 'team_stake' };
const SHOE_ID = { nba: 'signature_shoe', nfl: 'shoe_line', mlb: 'signature_shoe', nhl: 'signature_shoe' };
const SHADY = { nba: 'nshady', nfl: 'shady', mlb: 'mshady', nhl: 'hshady' };
const WORDS_1534 = sport => [
  [OFFICE_ID[sport.id], "effect: 'Adds 2 percent to your cash every season'", "effect: 'Protects your money'"],
  [STAKE_ID[sport.id], "effect: 'Fanbase +10'", "effect: 'The retirement plan, fanbase +10'"],
  [SHOE_ID[sport.id], "effect: 'Fanbase +12'", "effect: 'Fanbase +12, real royalties'"],
  [`${SHADY[sport.id]}_club`, "effect: 'Washes 4M, heat +3'", `effect: 'Washes 4M, heat +${sport.id === 'nfl' ? 5 : 3} a year'`],
  [`${SHADY[sport.id]}_offshore`, "effect: 'Heat +6'", "effect: 'Hides money, heat +6'"],
];
const CAMP_CASE = "    case 'summer_camp': {";
function unshop(sport, text) {
  let out = text;
  for (const [now, was] of unshopHunks(sport)) {
    if (out.split(now).length !== 2) abort(`${sport.file} does not hold this round's hunk exactly once: ${now.slice(0, 70)}`);
    out = out.replace(now, () => was);
  }
  const lines = out.split('\n');
  for (const [id, now, was] of WORDS_1534(sport)) {
    const at = lines.flatMap((l, i) => (l.includes(`{ id: '${id}',`) ? [i] : []));
    if (at.length !== 1 || lines[at[0]].split(now).length !== 2) abort(`${sport.file}: the card ${id} does not hold this round's words once (${now})`);
    lines[at[0]] = lines[at[0]].replace(now, () => was);
  }
  const camp = lines.flatMap((l, i) => (l.startsWith(CAMP_CASE) ? [i] : []));
  if (camp.length !== (sport.id === 'nfl' ? 0 : 1)) abort(`${sport.file}: the summer camp's buy case is there ${camp.length} times`);
  if (camp.length) lines.splice(camp[0], 1);
  return lines.join('\n');
}

/* ─── the controls' patches to the head arm, each needle asserted present first ─── */
function patchOnce(text, from, to, label, times = 1) {
  const n = text.split(from).length - 1;
  if (n !== times) abort(`control ${CONTROL}: ${label} holds its needle ${n} times, not ${times}`);
  return text.split(from).join(to);
}
function headServe() {
  const serve = {};
  let mod = read(MODULE);
  if (CONTROL === 'rate') mod = patchOnce(mod, 'index_nba: { rate: 0.07 }', 'index_nba: { rate: 0.08 }', MODULE);
  if (CONTROL === 'chance') mod = patchOnce(mod, '{ chance: 0.2, times: 5 }', '{ chance: 0.3, times: 5 }', MODULE, 4);
  if (CONTROL === 'twice') mod = patchOnce(mod, '  if (settled.size) c.purchased = held.filter(id => !settled.has(id));\n', '', MODULE);
  if (CONTROL === 'office') mod = patchOnce(mod, 'export const US_FAMILY_OFFICE_RATE = 0.02;', 'export const US_FAMILY_OFFICE_RATE = 0;', MODULE);
  if (CONTROL === 'lawyer') mod = patchOnce(mod, '.some(id => US_LAWYERS.includes(id)) ? cool * 2 : cool;', '.some(id => US_LAWYERS.includes(id)) ? cool * 1 : cool;', MODULE);
  if (CONTROL === 'coolall') mod = patchOnce(mod, '.some(id => US_LAWYERS.includes(id)) ? cool * 2 : cool;', '.some(id => US_LAWYERS.includes(id)) ? cool * 2 : cool * 2;', MODULE);
  if (CONTROL === 'leak') mod = patchOnce(mod, '  if (!office && steady === 0 && settled.size === 0) return lines;\n', '  if (!office && steady === 0 && settled.size === 0) { c.netWorth = r1Leak((c.netWorth ?? 0) + 0.1); return lines; }\n', MODULE)
    + '\nfunction r1Leak(v: number): number { return Math.round(v * 10) / 10; }\n';
  if (CONTROL === 'backpay') mod = patchOnce(mod, '    const exact = Math.round((carry + earned) * 10000);\n', '    const exact = Math.round((carry + earned * (prior === undefined ? 2 : 1)) * 10000);\n', MODULE);
  if (CONTROL === 'nobank') mod = patchOnce(mod, '  c.netWorth = Math.round((prior + fee) * 10000) / 10000;\n', '', MODULE);
  if (CONTROL === 'earnround') mod = patchOnce(mod, '  c.earnings += fee;\n', '  c.earnings = Math.round((c.earnings + fee) * 10) / 10;\n', MODULE);
  if (CONTROL === 'clampdown') mod = patchOnce(mod, '  cc.ovr = raiseWithinPotential(cc.ovr, cc.pot, up);\n', '  cc.ovr = Math.min(Math.min(99, cc.pot), cc.ovr + up);\n', MODULE);
  if (mod !== read(MODULE)) serve[MODULE] = mod;
  if (CONTROL === 'words') serve['src/lib/nbaMyCareer.ts'] = patchOnce(read('src/lib/nbaMyCareer.ts'), "minFanbase: 70, effect: 'Fanbase +12' }", "minFanbase: 70, effect: 'Fanbase +12, real royalties' }", 'nbaMyCareer.ts');
  if (CONTROL === 'camp') {
    const nba = read('src/lib/nbaMyCareer.ts'), at = nba.split('\n').filter(l => l.startsWith(CAMP_CASE));
    if (at.length !== 1) abort(`control camp: the NBA summer camp case is there ${at.length} times`);
    serve['src/lib/nbaMyCareer.ts'] = patchOnce(nba, `${at[0]}\n`, '', 'nbaMyCareer.ts');
  }
  if (CONTROL === 'nocall') for (const sport of US) serve[sport.file] = patchOnce(read(sport.file), SETTLE_LINES(sport.S), '', sport.file);
  if (CONTROL === 'potplusone' || CONTROL === 'potplusoneall') for (const sport of US) {
    if (CONTROL === 'potplusone' && sport.id !== 'nba') continue;
    const [now, was] = SKILL_1538(sport);
    serve[sport.file] = patchOnce(read(sport.file), now, was, sport.file);
  }
  if (CONTROL === 'settleafter') for (const sport of US) {
    const tick = `  for (const line of ${sport.id}MoneySeasonTick(c).events) notes.push(line);\n`;
    serve[sport.file] = patchOnce(patchOnce(read(sport.file), SETTLE_LINES(sport.S), '', sport.file), tick, tick + SETTLE_LINES(sport.S), sport.file);
  }
  return serve;
}

/* One bundle of the four engines (plus what the sections need) with some files served from given text. */
const ENTRY = path.join(TMP, 'entry.ts');
fs.writeFileSync(ENTRY, [
  ...US.map(s => `export * as ${s.id} from '${path.join(ROOT, s.file).split(path.sep).join('/')}';`),
  `export * as shop from '${path.join(ROOT, MODULE).split(path.sep).join('/')}';`,
  `export { keyedRng } from '${path.join(ROOT, 'src/lib/keyedRng.ts').split(path.sep).join('/')}';`,
  `export { summerCareerKey } from '${path.join(ROOT, 'src/lib/usCareerSummer.ts').split(path.sep).join('/')}';`,
  /* Round 1538: the corruption decks and the outcome card (section 6), the bindings and the summer deal (section 7). */
  ...US.map(s => `export * as ${s.id}Corr from '${path.join(ROOT, `src/lib/${s.id}CareerCorruption.ts`).split(path.sep).join('/')}';`),
  ...US.map(s => `export { ${s.S}_CAREER_SPORT as ${s.id}Sport } from '${path.join(ROOT, `src/lib/${s.id}CareerSport.ts`).split(path.sep).join('/')}';`),
  `export { buildCareerDecisionOutcome } from '${path.join(ROOT, 'src/lib/usCareerDecisionOutcome.ts').split(path.sep).join('/')}';`,
  `export { startSummer, answerSummerCard } from '${path.join(ROOT, 'src/lib/usCareerSummer.ts').split(path.sep).join('/')}';`,
].join('\n'));
async function bundle(name, serve) {
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  const served = new Set();
  const out = path.join(TMP, `${name}.mjs`);
  const built = await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT, metafile: true,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      if (text === undefined) return undefined;
      served.add(norm(args.path));
      return { contents: text, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    }); } }] });
  if (Object.keys(built.metafile.inputs).some(f => /supabase/.test(f))) abort(`${name}: the bundle holds a database client`);
  for (const key of map.keys()) if (!served.has(key)) abort(`${name}: the bundle never loaded ${key}`);
  return import(pathToFileURL(out).href);
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/* ─── section 0: the unit file, in a vitest child ─── */
const UNIT = 'src/lib/usCareerShopPromises.test.ts';
const UNIT_ROWS = 32;
if (runs('0')) {
  console.log(`0) ${UNIT} in a vitest child`);
  const report = path.join(TMP, 'unit.json');
  const run = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', UNIT, '--reporter=json', `--outputFile=${report}`],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' }, maxBuffer: 64e6 });
  if (run.error || !fs.existsSync(report)) abort(`the vitest child did not report (${run.error?.message ?? (run.stderr || '').slice(-300)})`);
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const rows = json.testResults.flatMap(f => f.assertionResults);
  const bad = rows.filter(r => r.status !== 'passed');
  console.log(`   ${rows.length} rows, ${rows.length - bad.length} passed, exit ${run.status}`);
  if (rows.length !== UNIT_ROWS) fail('0', 'rows', `${rows.length} rows ran, the file holds ${UNIT_ROWS}`);
  if (json.numPendingTests || json.numTodoTests) fail('0', 'pending', 'a row is pending or todo');
  if (Number(json.numUnhandledErrors ?? 0)) fail('0', 'unhandled', `${json.numUnhandledErrors} unhandled errors`);
  for (const r of bad) fail('0', r.title, r.failureMessages.join(' ').slice(0, 200));
  if ((run.status === 0) !== (bad.length === 0)) fail('0', 'exit', `vitest exited ${run.status} with ${bad.length} rows failed`);
}

/* ─── the two arms ─── */
const headFiles = headServe();
const baseFiles = Object.fromEntries(US.map(s => [s.file, unshop(s, read(s.file))]));
if (process.env.SHOP_BASE_CHECK === '1') {
  for (const s of US) {
    const then = lf(execFileSync('git', ['show', `${SHOP_BASE}:${s.file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }));
    if (baseFiles[s.file] !== then) fail('base', s.id, `the rebuilt base of ${s.file} is not ${SHOP_BASE.slice(0, 8)}'s file`);
  }
  console.log(`   SHOP_BASE_CHECK: the four rebuilt base engines ${red.has('base') ? 'DIFFER from' : 'equal'} ${SHOP_BASE.slice(0, 8)}'s files to the byte`);
}
const H = await bundle('head', headFiles);
const B = await bundle('base', baseFiles);
const clone = x => JSON.parse(JSON.stringify(x));
const itemsOf = (X, sport) => X[sport.id][`${sport.S}_SPEND_ITEMS`];
/* A fresh career on a counted stream; Math.random is pinned to a seeded stream for the career's whole life. */
function career(X, sport, name, seed, eraIndex = 0) {
  const rng = mulberry(seed);
  const lib = X[sport.id];
  const pos = Object.keys(lib[sport.arch])[0];
  const c = lib[sport.start](name, pos, lib[sport.arch][pos][0], rng, null, lib[sport.eras][eraIndex].id);
  return { c, rng };
}
/** The card's own words, parsed: a steady rate, or a chance and a flat payout or a multiple. */
function printed(card) {
  const text = `${card.desc} ${card.effect ?? ''}`;
  let m = text.match(/Steady (\d+) percent/);
  if (m) return { rate: Number(m[1]) / 100 };
  m = text.match(/(\d+) percent chance it prints ([\d.]+)M/);
  if (m) return { chance: Number(m[1]) / 100, flat: Number(m[2]) };
  m = text.match(/(\d+) percent chance of (\d+)x/);
  if (m) return { chance: Number(m[1]) / 100, times: Number(m[2]) };
  return null;
}
const cash = c => (c.netWorth ?? 0) + (c.shopCarry ?? 0);
const OFFICE_PRINTED = 0.02; /* Soccer Career's office rule, "+2% net worth growth per season" (literal on purpose) */
const byName = (items, name) => items.find(card => card.name === name);
const steadyCards = items => items.filter(card => printed(card)?.rate);
const stakeCards = items => items.filter(card => printed(card)?.chance);
/* One season the board's way, on the career's own stream: the season, then its end. */
function playSeason(X, sport, run) {
  const lib = X[sport.id];
  lib[sport.season](run.c, 80, run.rng);
  return lib[sport.progress](run.c, run.rng);
}
const pinned = (seed, f) => { const real = Math.random; Math.random = mulberry(seed ^ 0x2545f491); try { return f(); } finally { Math.random = real; } };

/* ─── section 1: the words. Every card that prints a return is a row with the printed numbers; the office prints
   its rate; the reworded cards no longer promise what nothing does; the summer camp does what it prints on buy; the
   help rule prints the cards' own numbers. ─── */
const PROMISE = /percent|chance of|prints/;
const REMOVED = ['Protects your money', 'The retirement plan', 'real royalties', 'Hides money', 'heat +3 a year', 'heat +5 a year'];
if (runs('1')) {
  console.log('1) words: the table against the printed cards, the reworded cards, the summer camp and the help rule');
  const table = H.shop.US_SHOP_RETURNS, seenRows = new Set();
  for (const sport of US) {
    const items = itemsOf(H, sport), ids = new Set(items.map(card => card.id));
    let rows = 0;
    for (const card of items) {
      const text = `${card.desc} ${card.effect ?? ''}`;
      if (!PROMISE.test(text)) continue;
      const p = printed(card);
      if (p) {
        rows += 1; seenRows.add(card.id);
        if (JSON.stringify(table[card.id]) !== JSON.stringify(p)) fail('1', `${sport.id} ${card.id}`, `the table holds ${JSON.stringify(table[card.id])}, the card prints ${JSON.stringify(p)}`);
      } else if (card.name === 'Family Office') {
        const m = (card.effect ?? '').match(/(\d+) percent/);
        if (!m || Number(m[1]) / 100 !== H.shop.US_FAMILY_OFFICE_RATE || Number(m[1]) / 100 !== OFFICE_PRINTED) fail('1', `${sport.id} ${card.id}`, `the office prints ${m?.[1]} percent, the rule pays ${H.shop.US_FAMILY_OFFICE_RATE}`);
      } else fail('1', `${sport.id} ${card.id}`, `"${text}" promises a return no rule reads`);
    }
    for (const id of Object.keys(table)) if (ids.has(id) && !printed(items.find(card => card.id === id))) fail('1', `${sport.id} ${id}`, 'a table row whose card prints no return');
    for (const card of items) for (const gone of REMOVED) if (`${card.desc} ${card.effect ?? ''}`.includes(gone)) fail('1', `${sport.id} ${card.id}`, `still says "${gone}"`);
    const office = byName(items, 'Family Office');
    if (!office || !/^Adds 2 percent/.test(office.effect ?? '')) fail('1', `${sport.id} office`, `the office card says "${office?.effect}"`);
    const camp = items.find(card => card.id === 'summer_camp');
    if (sport.id !== 'nfl') {
      const m = (camp?.effect ?? '').match(/^Fanbase \+(\d+), morale \+(\d+)$/);
      if (!m) { fail('1', `${sport.id} camp`, `the summer camp says "${camp?.effect}"`); continue; }
      const run = career(H, sport, 'Fictional camp', 1534);
      run.c.netWorth = 10; run.c.fanbase = 40; run.c.morale = 60;
      const got = H[sport.id][sport.buy](run.c, 'summer_camp');
      if (!got || got.state.fanbase !== 40 + Number(m[1]) || got.state.morale !== 60 + Number(m[2])) fail('1', `${sport.id} camp`, `bought at fanbase 40 and morale 60 it lands ${got?.state.fanbase} and ${got?.state.morale}, the card prints +${m[1]} and +${m[2]}`);
      else if (!got.log.endsWith(`Fanbase +${m[1]}, morale +${m[2]}.`)) fail('1', `${sport.id} camp`, `its line says "${got.log}"`);
      const full = career(H, sport, 'Fictional camp full', 1534);
      full.c.netWorth = 10; full.c.fanbase = 97; full.c.morale = 100;
      const capped = H[sport.id][sport.buy](full.c, 'summer_camp');
      if (!capped || capped.state.fanbase !== 100 || capped.state.morale !== 100 || !capped.log.endsWith('Fanbase +3, morale +0.')) fail('1', `${sport.id} camp capped`, `at 97 and 100 it says "${capped?.log}"`);
    } else if (camp) fail('1', 'nfl camp', 'the NFL shop has a summer camp now; give it a buy case and a row here');
    console.log(`   ${sport.id}: ${rows} paying cards match their words${sport.id === 'nfl' ? '' : '; the summer camp lands what it prints'}`);
  }
  if (seenRows.size !== Object.keys(table).length) fail('1', 'table', `${Object.keys(table).length - seenRows.size} table rows name no card in any shop`);
  const nbaItems = itemsOf(H, US[0]), index = byName(nbaItems, 'Boring Index Fund'), crypto = byName(nbaItems, 'Crypto Punt');
  const ip = printed(index), cp = printed(crypto), earned = Math.round(index.cost * ip.rate * 10000) / 10000;
  const help = H.shop.US_SHOP_HELP_RULE;
  for (const want of [`Put ${index.cost}M in the Boring Index Fund and it pays ${Math.round(ip.rate * 100)} percent, ${earned}M, every season.`,
    `one time in ${Math.round(1 / cp.chance)} you get ${cp.times * crypto.cost}M back on your ${crypto.cost}M`, `adds ${Math.round(OFFICE_PRINTED * 100)} percent of your cash`]) {
    if (!help.includes(want)) fail('1', 'help', `the help rule does not say "${want}"`);
  }
}

/* ─── section 2: steady cards pay their printed rate, every season held, and stop when sold ─── */
if (runs('2')) {
  console.log('2) steady: two index funds and the one time steady card against a twin that bought nothing');
  for (const sport of US) {
    const lib = H[sport.id], items = itemsOf(H, sport);
    const index = byName(items, 'Boring Index Fund');
    const once = steadyCards(items).find(card => card.oneTime);
    if (!index || !once) { fail('2', sport.id, 'no index fund or no one time steady card in the shop'); continue; }
    const expected = printed(index).rate * index.cost * 2 + printed(once).rate * once.cost;
    pinned(1534, () => {
      const b = career(H, sport, 'Fictional steady', 1534), t = career(H, sport, 'Fictional steady', 1534);
      b.c.netWorth = 30; t.c.netWorth = 30;
      for (const id of [index.id, index.id, once.id]) { const got = lib[sport.buy](b.c, id); if (!got) { fail('2', sport.id, `could not buy ${id}`); return; } b.c = got.state; }
      const seen = [];
      for (let season = 1; season <= 3; season += 1) {
        if (season === 3) { H.shop.liquidateUsCareerPurchases(b.c, items); H.shop.liquidateUsCareerPurchases(t.c, items); }
        const b0 = cash(b.c), t0 = cash(t.c);
        playSeason(H, sport, b); playSeason(H, sport, t);
        const got = (cash(b.c) - b0) - (cash(t.c) - t0), want = season === 3 ? 0 : expected;
        seen.push(got.toFixed(4));
        if (!near(got, want)) fail('2', `${sport.id} season ${season}`, `Cash plus the carry moved ${got.toFixed(6)} more than the twin's, the cards print ${want.toFixed(4)}`);
        if (!near(b.c.netWorth * 10, Math.round(b.c.netWorth * 10))) fail('2', `${sport.id} season ${season}`, `Cash ${b.c.netWorth} is not a whole tenth`);
        if (b.rng.count() !== t.rng.count()) fail('2', `${sport.id} season ${season}`, `the season stream drew ${b.rng.count()} against the twin's ${t.rng.count()}`);
      }
      console.log(`   ${sport.id}: 2 x ${index.id} and ${once.id} print ${expected.toFixed(4)}M a season; measured ${seen.join(', ')} (the third after the sale)`);
    });
  }
}

/* ─── section 3: stakes settle once, at the printed chance, for the printed payout ─── */
if (runs('3')) {
  console.log(`3) stakes: ${STAKE_CAREERS} careers per gamble per sport, one season end each`);
  for (const sport of US) {
    const lib = H[sport.id], items = itemsOf(H, sport);
    for (const card of stakeCards(items)) {
      const p = printed(card), pay = p.flat ?? card.cost * p.times;
      let wins = 0, wrongPay = 0, stayed = 0, again = 0, drawn = 0;
      pinned(card.id.length, () => {
        for (let k = 0; k < STAKE_CAREERS; k += 1) {
          const b = career(H, sport, `Fictional stake ${k}`, 7000 + k), t = career(H, sport, `Fictional stake ${k}`, 7000 + k);
          b.c.netWorth = 10; t.c.netWorth = 10; b.c.purchased = [card.id]; t.c.purchased = [];
          let b0 = cash(b.c), t0 = cash(t.c);
          lib[sport.progress](b.c, b.rng); lib[sport.progress](t.c, t.rng);
          const got = r1((cash(b.c) - b0) - (cash(t.c) - t0));
          if (got > 0) wins += 1;
          if (got !== 0 && !near(got, pay)) wrongPay += 1;
          if ((b.c.purchased ?? []).includes(card.id)) stayed += 1;
          if (b.rng.count() !== t.rng.count()) drawn += 1;
          b0 = cash(b.c); t0 = cash(t.c);
          lib[sport.progress](b.c, b.rng); lib[sport.progress](t.c, t.rng);
          if (!near((cash(b.c) - b0) - (cash(t.c) - t0), 0, 1e-6)) again += 1;
        }
      });
      const share = wins / STAKE_CAREERS, sd = Math.sqrt(p.chance * (1 - p.chance) / STAKE_CAREERS);
      const lo = p.chance - 4 * sd, hi = p.chance + 4 * sd;
      console.log(`   ${sport.id} ${card.id}: printed ${Math.round(p.chance * 100)} percent for ${pay}M; won ${wins} (${share.toFixed(3)}, band ${lo.toFixed(3)} to ${hi.toFixed(3)})`);
      if (share < lo || share > hi) fail('3', `${sport.id} ${card.id} band`, `won ${share.toFixed(3)} of the time, the card prints ${p.chance}`);
      if (wrongPay) fail('3', `${sport.id} ${card.id} payout`, `${wrongPay} wins paid something other than the printed ${pay}M`);
      if (stayed || again) fail('3', `${sport.id} ${card.id} settles once`, `${stayed} stakes stayed in the save and ${again} paid on a second season end`);
      if (drawn) fail('3', `${sport.id} ${card.id} stream`, `${drawn} careers drew a different count on the season stream`);
    }
  }
}

/* ─── section 4: the family office, after the steady returns ─── */
if (runs('4')) {
  console.log('4) the family office: 2 percent of Cash above zero, after the steady returns');
  for (const sport of US) {
    const lib = H[sport.id], items = itemsOf(H, sport);
    const office = byName(items, 'Family Office'), index = byName(items, 'Boring Index Fund'), lawyer = byName(items, 'The Lawyer Who Never Loses');
    if (!office || !index || !lawyer) { fail('4', sport.id, 'no office, index fund or lawyer in the shop'); continue; }
    pinned(1534, () => {
      /* (a) the office alone, two seasons */
      const b = career(H, sport, 'Fictional office', 1534), t = career(H, sport, 'Fictional office', 1534);
      b.c.netWorth = 20; t.c.netWorth = 20; b.c.purchased = [office.id];
      const seen = [];
      for (let season = 1; season <= 2; season += 1) {
        const b0 = cash(b.c), bn = b.c.netWorth, t0 = t.c.netWorth;
        lib[sport.progress](b.c, b.rng); lib[sport.progress](t.c, t.rng);
        const pay = t.c.netWorth - t0; /* the pay less the upkeep, the same for both */
        const want = (bn + pay) * OFFICE_PRINTED, got = (cash(b.c) - b0) - pay;
        seen.push(got.toFixed(4));
        if (!near(got, want, 1e-6)) fail('4', `${sport.id} office season ${season}`, `the office added ${got.toFixed(6)}, 2 percent of ${(bn + pay).toFixed(2)} is ${want.toFixed(6)}`);
      }
      /* (b) at zero or below it adds nothing and writes nothing */
      const z = career(H, sport, 'Fictional office broke', 1535), zt = career(H, sport, 'Fictional office broke', 1535);
      const under = -Math.round(z.c.salary * 0.45 * 10) / 10 - 3;
      z.c.netWorth = under; zt.c.netWorth = under; z.c.purchased = [office.id];
      lib[sport.progress](z.c, z.rng); lib[sport.progress](zt.c, zt.rng);
      const zs = clone(z.c); zs.purchased = []; const zts = clone(zt.c); zts.purchased = [];
      if (JSON.stringify(zs) !== JSON.stringify(zts)) fail('4', `${sport.id} office at zero`, `a balance of ${z.c.netWorth} still moved (${zt.c.netWorth} without the office)`);
      /* (c) the index fund, the office and the lawyer together: investments first, then the office */
      const o = career(H, sport, 'Fictional office order', 1536), ot = career(H, sport, 'Fictional office order', 1536);
      o.c.netWorth = 15; ot.c.netWorth = 15; o.c.purchased = [index.id, office.id, lawyer.id];
      const o0 = cash(o.c), on = o.c.netWorth, ot0 = ot.c.netWorth;
      lib[sport.progress](o.c, o.rng); lib[sport.progress](ot.c, ot.rng);
      const pay = ot.c.netWorth - ot0, steady = printed(index).rate * index.cost;
      const want = steady + (on + pay + steady) * OFFICE_PRINTED, got = (cash(o.c) - o0) - pay;
      if (!near(got, want, 1e-6)) fail('4', `${sport.id} order`, `the index fund and the office earned ${got.toFixed(6)}, in the documented order ${want.toFixed(6)}`);
      /* (d) the settle lands BEFORE the money app's season (review of 2026-10-22, run lens finding 1). careerMoney.ts
         step 4 reads Cash: a balance under three quarters of the bill (the bill is at least 0.2M) with no savings or
         holdings costs 3 morale. From 0.1M after the pay, two index funds bank 0.2M first, so the holder clears that
         band and keeps the 3 morale a bare twin loses. Settled after the tick, both lose it (control settleafter). */
      const thin = funds => {
        const r = career(H, sport, 'Fictional thin buffer', 1538);
        r.c.netWorth = 0.1 - r.c.salary * 0.45; r.c.yearlyCosts = 0; r.c.morale = 70;
        r.c.purchased = funds ? [index.id, index.id] : [];
        lib[sport.progress](r.c, r.rng);
        return r.c;
      };
      const th = thin(true), tt = thin(false);
      if (!(tt.netWorth < 0.2 * 0.75)) fail('4', `${sport.id} before the tick`, `the bare twin ended on ${tt.netWorth}M, outside the band the money app stresses, so this case has no power`);
      else if (th.morale - tt.morale !== 3) fail('4', `${sport.id} before the tick`, `the holder ended on morale ${th.morale} and the bare twin on ${tt.morale}; with the returns banked before the money app the holder keeps 3`);
      console.log(`   ${sport.id}: the office alone earned ${seen.join(' then ')}; at ${under}M nothing moved; with the index fund ${got.toFixed(4)} (wanted ${want.toFixed(4)}); thin buffer: the holder ends on ${th.netWorth}M and morale ${th.morale}, the bare twin on ${tt.netWorth}M and ${tt.morale}`);
    });
  }
}

/* ─── section 5: the lawyer cools a clean season twice as fast ─── */
if (runs('5')) {
  console.log('5) heat: from 72 with no dirty money, the lawyer reaches 0 in 4 seasons and a twin in 8');
  for (const sport of US) {
    const lib = H[sport.id], items = itemsOf(H, sport);
    const lawyer = byName(items, 'The Lawyer Who Never Loses');
    if (!lawyer) { fail('5', sport.id, 'no lawyer in the shop'); continue; }
    pinned(1534, () => {
      const zeroAt = withLawyer => {
        const r = career(H, sport, 'Fictional heat', 1534);
        r.c.heat = 72; r.c.dirtyMoney = 0; r.c.purchased = withLawyer ? [lawyer.id] : [];
        for (let season = 1; season <= 12; season += 1) { lib[sport.progress](r.c, r.rng); if ((r.c.heat ?? 0) <= 0) return season; }
        return null;
      };
      const a = zeroAt(true), z = zeroAt(false);
      if (a !== 4 || z !== 8) fail('5', `${sport.id} clean`, `the lawyer reached 0 in ${a} seasons and the twin in ${z}; the card prints twice as fast (4 against 8)`);
      const rise = withLawyer => {
        const r = career(H, sport, 'Fictional heat dirty', 1537);
        r.c.heat = 30; r.c.dirtyMoney = 2; r.c.purchased = withLawyer ? [lawyer.id] : [];
        const trail = [];
        for (let season = 1; season <= 3; season += 1) { lib[sport.progress](r.c, r.rng); trail.push(r.c.heat); }
        return trail.join(',');
      };
      const ra = rise(true), rz = rise(false);
      if (ra !== rz) fail('5', `${sport.id} dirty`, `with dirty money held the lawyer's heat went ${ra} and the twin's ${rz}`);
      console.log(`   ${sport.id}: clean from 72, zero after ${a} seasons with the lawyer and ${z} without; dirty from 30, ${ra} both ways`);
    });
  }
}

/* ─── section 6: a line that says money was paid puts it in the Bank (Round 1538) ───
   The four summer brand answers pay their amount in the era's money and the ten clean corruption answers the amount
   their button prints, flat (brief 1534 R2, critic 1). Each is played from a fixed state whose Cash holds hundredths
   (critic 6), in 2026 and in the throwback era: earnings and Cash both move by exactly the landed tenth, the balance
   is never rounded again, the line prints what landed, and the outcome card shows a Cash row of that delta. Every
   amount is a literal (the card's own words), never read from the helper under test. */
const BRAND_ANSWER = { nba: ['Build the brand', 5], nfl: ['Brand work', 3], mlb: ['The commercial circuit', 3], nhl: ['The content summer', 2] };
const CLEAN_ANSWERS = {
  nba: [['ncorr_sneaks', 'Tell your brand immediately', 2], ['ncorr_memorabilia', 'Sign all 5,000 yourself', 0.9], ['ncorr_sportsbook', 'Sign the cleaned up version, 2.5M', 2.5], ['ncorr_exhibition', 'Play the tour straight, 900k', 0.9]],
  nfl: [['corr_sportsbook_ad', 'Sign the clean version, 2M', 2], ['corr_memorabilia', 'Finish all 4,000 yourself', 1]],
  mlb: [['mcorr_sportsbook', 'Sign the clean version, 1.8M', 1.8], ['mcorr_memorabilia', 'Only authenticate the real ones', 0.4]],
  nhl: [['hcorr_sportsbook', 'Sign the clean version, 1.5M', 1.5], ['hcorr_memorabilia', 'Only authenticate the real ones', 0.3]],
};
const DECK_OF = { nba: 'nbaEventDeck', nfl: 'nflEventDeck', mlb: 'mlbEventDeck', nhl: 'nhlEventDeck' };
const CORR_OF = { nba: 'getNbaCorruptionEvents', nfl: 'getNflCorruptionEvents', mlb: 'getMlbCorruptionEvents', nhl: 'getNhlCorruptionEvents' };
/* Career earnings start at hundredths too (review of 2026-10-22, run lens finding 3): critic 6 binds "earnings +=
   the fee, unrounded", and from a whole number a helper that rounded the earnings total to a tenth again looked the
   same. From 41.27 every rounded total is 0.03 off, and earnings are compared exactly with the helper's own sum. */
const CASH_BEFORE = 10.37, EARNED_BEFORE = 41.27;
/* Three seasons in, then a fixed state every gate of the ten cards opens on (rating 85, fanbase 80, no flags). */
function paidState(X, sport, eraIndex) {
  const run = career(X, sport, 'Fictional paid line', 1538, eraIndex);
  pinned(1538, () => { for (let i = 0; i < 3; i += 1) playSeason(X, sport, run); });
  Object.assign(run.c, { age: 26, ovr: 85, fanbase: 80, health: 80, netWorth: CASH_BEFORE, earnings: EARNED_BEFORE, lifeFlags: {}, heat: 0, dirtyMoney: 0 });
  delete run.c.summer;
  return run.c;
}
function checkPaid(who, c, card, label, landed) {
  const option = card?.options.find(o => o.label === label);
  if (!option) { fail('6', who, `the answer '${label}' is not on the card ${card?.id ?? '(not dealt)'}`); return; }
  const before = clone(c), after = clone(c);
  const line = option.apply(after, () => 0.5);
  if (after.earnings !== EARNED_BEFORE + landed) fail('6', who, `earnings went ${EARNED_BEFORE} to ${after.earnings}, not ${EARNED_BEFORE} plus the ${landed}M that landed, unrounded`);
  if (after.netWorth !== Math.round((CASH_BEFORE + landed) * 10000) / 10000) fail('6', who, `Cash went ${CASH_BEFORE} to ${after.netWorth}, not by the ${landed}M that landed`);
  if (!String(line).includes(`${landed}M`)) fail('6', who, `the line "${line}" does not print the ${landed}M that landed`);
  const rows = H.buildCareerDecisionOutcome({ title: card.title, choice: label, before, after, teamLabel: t => t }).changes;
  const cashRow = rows.find(row => row.key === 'netWorth');
  if (!cashRow || cashRow.delta !== `+$${landed}M`) fail('6', who, `the outcome card's Cash row is ${JSON.stringify(cashRow ?? null)}, not +$${landed}M`);
  return line;
}
let paidCases = 0;
if (runs('6')) {
  console.log('6) paid lines: the four brand answers and the ten clean corruption answers bank what they say, both eras');
  for (const sport of US) {
    const lib = H[sport.id];
    let cases = 0;
    for (const eraIndex of [0, 1]) {
      const era = lib[sport.eras][eraIndex];
      const c = paidState(H, sport, eraIndex);
      const [label, amount] = BRAND_ANSWER[sport.id];
      const fee = Math.round(amount * era.moneyScale * 10) / 10;
      const training = lib[DECK_OF[sport.id]](c, mulberry(6)).find(e => e.id === 'training');
      const line = checkPaid(`${sport.id} ${era.id} ${label}`, c, training, label, fee);
      cases += 1; paidCases += 1;
      if (sport.id === 'nfl' && line !== undefined && line !== `Fanbase +12 and a ${fee}M endorsement, banked.`) fail('6', `nfl ${era.id} Brand work`, `the line Round 1104 pins changed: "${line}"`);
      const deck = H[`${sport.id}Corr`][CORR_OF[sport.id]](c, () => 0.01);
      for (const [id, answer, flat] of CLEAN_ANSWERS[sport.id]) {
        checkPaid(`${sport.id} ${era.id} ${id}`, c, deck.find(e => e.id === id), answer, flat);
        cases += 1; paidCases += 1;
      }
    }
    console.log(`   ${sport.id}: ${cases} paid answers played (2026 and ${lib[sport.eras][1].id}), each banks what it says`);
  }
}

/* ─── section 8: careers that hold nothing that pays replay byte identical to the base arm ───
   A policy both arms share: each offseason the engine's own card is answered with its first option that is not one
   of the answers Round 1538 changes (listed below, each asserted present in its source), and one affordable item is
   bought, a keyed pick among the items this round leaves alone (never a paying card, the office, the lawyer or the
   summer camp). Every season's save and feed, every answer and buy, and the season stream's draw count are compared
   in order. */
const CHANGED_ANSWERS = {
  nba: ['Skill grind', 'Build the brand', 'Tell your brand immediately', 'Sign all 5,000 yourself', 'Sign the cleaned up version, 2.5M', 'Play the tour straight, 900k'],
  nfl: ['Skill work', 'Brand work', 'Sign the clean version, 2M', 'Finish all 4,000 yourself'],
  mlb: ['New pitch lab', 'Swing rebuild', 'The commercial circuit', 'Sign the clean version, 1.8M', 'Only authenticate the real ones'],
  nhl: ['Skills coach', 'The content summer', 'Sign the clean version, 1.5M', 'Only authenticate the real ones'],
};
const LEFT_OUT = new Set(['summer_camp']);
const DIGEST_SETS = (process.env.SHOP_DIGEST_SETS || '1534,2024').split(',').map(Number);
const DIGEST_CAREERS = Number(process.env.SHOP_DIGEST_CAREERS || 240);
const policyItems = items => items.filter(card => !printed(card) && !LEFT_OUT.has(card.id) && card.name !== 'Family Office' && card.name !== 'The Lawyer Who Never Loses');
function lifeOf(X, sport, set, k, tally) {
  const lib = X[sport.id], items = itemsOf(X, sport), allowed = policyItems(items);
  const positions = Object.keys(lib[sport.arch]);
  const pos = positions[k % positions.length], archs = lib[sport.arch][pos];
  const arch = archs[Math.floor(k / positions.length) % archs.length], era = lib[sport.eras][k % lib[sport.eras].length].id;
  const rng = mulberry(set * 100003 + k);
  const trail = [];
  pinned(set * 7 + k, () => {
    let c = lib[sport.start](`Digest ${set} ${k}`, pos, arch, rng, null, era);
    let prev = null;
    for (let season = 0; season < 22 && !c.retired; season += 1) {
      const tq = lib[sport.roll](prev, rng); prev = tq;
      trail.push(JSON.stringify(lib[sport.season](c, tq, rng)), JSON.stringify(c));
      if (tally && (c.heat ?? 0) > 0 && !(c.dirtyMoney > 0)) tally.cleanHeat += 1;
      trail.push(JSON.stringify(lib[sport.progress](c, rng)), JSON.stringify(c), String(rng.count()));
      if (tally) tally.seasons += 1;
      if (lib[sport.retire](c)) break;
      const ev = lib[sport.draw](c, rng);
      const option = ev.options.find(o => !CHANGED_ANSWERS[sport.id].includes(o.label));
      if (option) trail.push(ev.id, option.label, JSON.stringify(option.apply(c, rng) ?? null), JSON.stringify(c));
      const open = allowed.filter(card => lib[sport.buy](c, card.id));
      if (open.length) {
        const pick = open[Math.floor(X.keyedRng(`shop1534|${set}|${k}|${c.year}`)() * open.length)];
        c = lib[sport.buy](c, pick.id).state;
        if (tally) tally.bought += 1;
        trail.push(pick.id, JSON.stringify(c));
      }
      trail.push(String(rng.count()));
    }
  });
  return trail;
}
if (runs('8')) {
  console.log(`8) digest: ${DIGEST_CAREERS} careers a set on sets ${DIGEST_SETS.join(' and ')}, holding nothing that pays, base arm against head arm`);
  for (const sport of US) {
    const src = read(sport.file) + read(`src/lib/${sport.id}CareerCorruption.ts`);
    for (const label of CHANGED_ANSWERS[sport.id]) if (!src.includes(`'${label}'`)) abort(`${sport.id}: the changed answer '${label}' is no longer in its source, so the policy proves nothing about it`);
    const tally = { seasons: 0, bought: 0, cleanHeat: 0 };
    let parted = 0, careers = 0;
    for (const set of DIGEST_SETS) for (let k = 0; k < DIGEST_CAREERS; k += 1) {
      const a = lifeOf(H, sport, set, k, tally), b = lifeOf(B, sport, set, k, null);
      careers += 1;
      const first = a.findIndex((x, i) => x !== b[i]);
      if (first >= 0 || a.length !== b.length) { parted += 1; fail('8', `${sport.id} ${set}/${k}`, `parts from the base arm at record ${first < 0 ? Math.min(a.length, b.length) : first} of ${a.length}`); }
    }
    console.log(`   ${sport.id}: ${careers} careers, ${tally.seasons} seasons, ${tally.bought} items bought, ${tally.cleanHeat} seasons with heat and no dirty money; ${parted} parted`);
    if (tally.seasons < careers * 4) fail('8', `${sport.id} thin`, `only ${tally.seasons} seasons were played`);
  }
}

/* ─── section 7: the summer Skill card stops at the ceiling (Round 1538; never reintroduce Rounds 96 and 116) ───
   (a) Every sport's Skill answer from a fixed state: at the ceiling the rating stays and the line says so; above
       it the rating stays where it is, never pulled down, and the line says so; one
       under it with a draw of 2 it lands one and says that is the ceiling; with room it lands the draw; under the
       maintenance age it draws once, from that age it draws nothing and gives health +4 (critic 5), held at 100,
       with a line that says how much landed (review of 2026-10-22, minors 1 and 5), and its button
       says what lands at each age (critic 8). Ages and words are literals.
   (b) The summer fleet: careers through the board's own summer deal (startSummer and answerSummerCard on the sport
       binding, the way simCareerHall sections 9 to 14 drive it), base arm against head arm, on section 8's policy
       with the Skill answer allowed (critic 4c): nothing that pays is bought and no brand or corruption answer is
       picked. Only each career's FIRST divergence is attributed (critic 4a: once a deal differs, the ledger stamps
       differ and later summers may follow from it), and it must sit where the rider acts (critic 4b): a deal under the
       maintenance age with the rating at min(99, pot) or above (there the old answer moved the rating, so the card
       counted as a rating card; above pot + 1 it even lowered it), or the Skill answer applied under that age with
       the rating at min(99, pot) - 1 or above, or (found on the runner, r1538-rec: NHL career 1538/69) any answer
       under that age that leaves the rating at min(99, pot) or above while the training card waits in a later slot:
       the summer then probes the Skill answer to decide whether to skip it (laterAnswerMovesRating), and the old
       answer pulled a rating above pot + 1 back down, so it counted as a move and the card was skipped. Any other
       first divergence is red. A first divergence at the Skill answer only says where the trees parted, not that the
       head was right there, so every young Skill answer the head gives is also checked on its own: the rating never
       goes down, never past max(rating, min(99, pot)), never by more than 2 (run lens finding 2), and from the
       maintenance age it moves health by min(100, health + 4) and nothing else. Since the review of 2026-10-22 the
       maintenance line says the health that landed, so a first divergence at that answer with health above 96 is
       the line's own change and counted as such. */
const SKILL_LABELS = new Set(['Skill grind', 'Skill work', 'New pitch lab', 'Swing rebuild', 'Skills coach']);
const FLEET_SETS = (process.env.SHOP_FLEET_SETS || '1538,2024').split(',').map(Number);
const FLEET_CAREERS = Number(process.env.SHOP_FLEET_CAREERS || 120);
const digestOf = s => createHash('sha1').update(s).digest('base64');
let fleetParted = 0;
function skillCase(sport, who, over, draw, want) {
  const run = career(H, sport, 'Fictional skill', 1538);
  Object.assign(run.c, { age: 24, health: 70, pot: 80 }, over);
  delete run.c.summer;
  const card = H[sport.id][DECK_OF[sport.id]](run.c, mulberry(7)).find(e => e.id === 'training');
  const option = card?.options[0];
  if (!option || !SKILL_LABELS.has(option.label)) { fail('7', `${sport.id} skill ${who}`, `the training card's first answer is ${option?.label}`); return; }
  let n = 0;
  const c = clone(run.c);
  const line = option.apply(c, () => { n += 1; return draw; });
  const young = run.c.age < SKILL_AGE[sport.id];
  if (option.effect !== (young ? 'Rating +1 or +2, up to your ceiling' : 'Health +4, up to 100')) fail('7', `${sport.id} skill ${who}`, `the button says "${option.effect}" at age ${run.c.age}`);
  if (n !== (young ? 1 : 0)) fail('7', `${sport.id} skill ${who}`, `it drew ${n} times at age ${run.c.age}`);
  if (c.ovr !== want.ovr || (want.health !== undefined && c.health !== want.health)) fail('7', `${sport.id} skill ${who}`, `rating ${run.c.ovr} to ${c.ovr} (want ${want.ovr}), health ${c.health}`);
  if (!String(line).includes(want.says)) fail('7', `${sport.id} skill ${who}`, `the line "${line}" does not say "${want.says}"`);
}
function summerLife(X, sport, set, k) {
  const lib = X[sport.id], SB = X[`${sport.id}Sport`], allowed = policyItems(itemsOf(X, sport));
  const paid = CHANGED_ANSWERS[sport.id].filter(label => !SKILL_LABELS.has(label));
  const positions = Object.keys(lib[sport.arch]);
  const pos = positions[k % positions.length], archs = lib[sport.arch][pos];
  const arch = archs[Math.floor(k / positions.length) % archs.length], era = lib[sport.eras][k % lib[sport.eras].length].id;
  const rng = mulberry(set * 100019 + k);
  const trail = [];
  const at = (kind, c, extra = {}) => ({ kind, ovr: c.ovr, pot: c.pot, age: c.age, health: c.health, ...extra });
  pinned(set * 13 + k, () => {
    let c = lib[sport.start](`Summer ${set} ${k}`, pos, arch, rng, null, era);
    let tq = null;
    for (let season = 0; season < 24 && !c.retired; season += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng);
        trail.push({ rec: `banned ${digestOf(JSON.stringify(c))} ${rng.count()}`, ctx: at('banned', c) });
        continue;
      }
      tq = SB.rollTeamQuality(tq, rng);
      SB.campBattle(c, tq, rng);
      SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      trail.push({ rec: `season ${digestOf(JSON.stringify(c))} ${rng.count()}`, ctx: at('season', c) });
      if (SB.shouldRetire(c)) break;
      const dealt = at('deal', c);
      let ev = X.startSummer(c, SB, rng);
      trail.push({ rec: `deal ${JSON.stringify(c.summer?.ids ?? null)} ${ev?.id ?? 'none'}`, ctx: dealt });
      while (ev) {
        const option = ev.options.find(o => !paid.includes(o.label));
        if (!option) { trail.push({ rec: `unanswered ${ev.id}`, ctx: at('unanswered', c) }); break; }
        const later = (c.summer?.ids ?? []).slice((c.summer?.at ?? 0) + 1).includes('training');
        const before = at('answer', c, { skill: ev.id === 'training' && SKILL_LABELS.has(option.label), later });
        const out = X.answerSummerCard(c, SB, ev, ev.options.indexOf(option), rng);
        before.after = { ovr: c.ovr, pot: c.pot, health: c.health };
        trail.push({ rec: `${ev.id} ${option.label} ${JSON.stringify(out.line)} ${digestOf(JSON.stringify(c))} ${rng.count()}`, ctx: before });
        ev = out.next;
      }
      const open = allowed.filter(card => lib[sport.buy](c, card.id));
      if (open.length) {
        const pick = open[Math.floor(X.keyedRng(`shop1538|${set}|${k}|${c.year}`)() * open.length)];
        c = lib[sport.buy](c, pick.id).state;
        trail.push({ rec: `buy ${pick.id} ${digestOf(JSON.stringify(c))}`, ctx: at('buy', c) });
      }
    }
  });
  return trail;
}
if (runs('7')) {
  console.log(`7) the Skill card: (a) its answer in every sport; (b) ${FLEET_CAREERS} careers a set on sets ${FLEET_SETS.join(' and ')} through the summer deal, base arm against head arm`);
  for (const sport of US) {
    const age = SKILL_AGE[sport.id];
    skillCase(sport, 'at the ceiling', { ovr: 80 }, 0.9, { ovr: 80, says: 'already at your ceiling' });
    skillCase(sport, 'one under', { ovr: 79 }, 0.9, { ovr: 80, says: 'and that is your ceiling' });
    skillCase(sport, 'with room', { ovr: 70 }, 0.9, { ovr: 72, says: 'Rating +2.' });
    skillCase(sport, 'at 99', { ovr: 99, pot: 99 }, 0.9, { ovr: 99, says: 'already at your ceiling' });
    /* A rating already above the ceiling (another card can put it there: NHL career 1538/69's oversized pads took
       it to 93 over 90) keeps it, and the line says so (run lens finding 2; control clampdown). */
    skillCase(sport, 'above the ceiling', { ovr: 83 }, 0.9, { ovr: 83, says: 'so the rating stays at 83.' });
    skillCase(sport, 'at the maintenance age', { age, ovr: 70 }, 0.9, { ovr: 70, health: 74, says: `${SKILL_LEAD[sport.id]} Health +4.` });
    /* Health is held at 100, and the line says what landed (review of 2026-10-22, minors 1 and 5). */
    skillCase(sport, 'two short of full health', { age, ovr: 70, health: 98 }, 0.9, { ovr: 70, health: 100, says: `${SKILL_LEAD[sport.id]} Health +2, and that is full health.` });
    skillCase(sport, 'at full health', { age, ovr: 70, health: 100 }, 0.9, { ovr: 70, health: 100, says: `${SKILL_LEAD[sport.id]} You were already at full health, so it stays at 100.` });
    skillCase(sport, 'one year under it', { age: age - 1, ovr: 70 }, 0, { ovr: 71, says: 'Rating +1.' });
    const kinds = { deal: 0, answer: 0, later: 0, health: 0 };
    let careers = 0, offseasons = 0, parted = 0, skillAnswers = 0, overCap = 0;
    for (const set of FLEET_SETS) for (let k = 0; k < FLEET_CAREERS; k += 1) {
      const a = summerLife(H, sport, set, k), b = summerLife(B, sport, set, k);
      careers += 1; offseasons += a.filter(x => x.ctx.kind === 'deal').length;
      /* Every Skill answer the head arm gives under the maintenance age, not only a first divergence (run lens
         finding 2): it never lowers the rating, never lifts it past max(rating, min(99, pot)), never by more than 2. */
      for (const { ctx } of a) {
        if (ctx.kind !== 'answer' || !ctx.skill) continue;
        if (ctx.age >= age) {
          if (ctx.after.ovr !== ctx.ovr || ctx.after.health !== Math.min(100, ctx.health + 4)) fail('7', `${sport.id} skill answer ${set}/${k}`, `the maintenance answer took health ${ctx.health} to ${ctx.after.health} and the rating ${ctx.ovr} to ${ctx.after.ovr}`);
          continue;
        }
        skillAnswers += 1;
        const cap = Math.min(99, ctx.pot);
        if (ctx.ovr > cap) overCap += 1;
        if (ctx.after.ovr < ctx.ovr || ctx.after.ovr > Math.max(ctx.ovr, cap) || ctx.after.ovr > ctx.ovr + 2) fail('7', `${sport.id} skill answer ${set}/${k}`, `the Skill answer took the rating ${ctx.ovr} to ${ctx.after.ovr} with the ceiling at ${cap}`);
      }
      let i = a.findIndex((x, j) => !b[j] || x.rec !== b[j].rec);
      if (i < 0 && a.length !== b.length) i = a.length;
      if (i < 0) continue;
      parted += 1; fleetParted += 1;
      const ctx = a[i]?.ctx ?? b[i]?.ctx, cap = ctx ? Math.min(99, ctx.pot) : 0;
      const skillAt = ctx && ctx.kind === 'answer' && ctx.skill && ctx.ovr >= cap - 1;
      const laterAt = ctx && ctx.kind === 'answer' && ctx.later && ctx.after && ctx.after.ovr >= Math.min(99, ctx.after.pot);
      /* From the maintenance age the answer's line now says the health that landed, so near full health (above 96)
         the two trees print different lines for the same move (review of 2026-10-22, minors 1 and 5). */
      const healthAt = ctx && ctx.kind === 'answer' && ctx.skill && ctx.age >= age && ctx.health > 96;
      const ok = ctx && ((ctx.age < age && ((ctx.kind === 'deal' && ctx.ovr >= cap) || skillAt || laterAt)) || healthAt);
      if (ok) kinds[healthAt ? 'health' : ctx.kind === 'deal' ? 'deal' : skillAt ? 'answer' : 'later'] += 1;
      else fail('7', `${sport.id} fleet ${set}/${k}`, `first parts at record ${i} (${ctx?.kind ?? 'end'}, rating ${ctx?.ovr} of ${ctx?.pot}, age ${ctx?.age}), where the rider does not act; head [${a[i - 1]?.rec.slice(0, 90)}] then [${a[i]?.rec.slice(0, 160)}], base then [${b[i]?.rec.slice(0, 160)}]`);
    }
    console.log(`   ${sport.id}: (a) 9 cases; fleet ${careers} careers, ${offseasons} offseasons, ${parted} parted from the base arm, ${kinds.deal} first at a deal at the ceiling, ${kinds.answer} at the Skill answer and ${kinds.later} at an answer before a later training card, ${kinds.health} at a maintenance answer near full health; ${skillAnswers} young Skill answers on the head, ${overCap} of them above the ceiling`);
  }
}

/* ─── section 9: an old save earns from its next season, one season at a time ───
   The save is built by the base arm (no rule pays there): it buys two index funds, the steady one time card, two of
   the 35 percent stakes, a crypto punt, the office and the lawyer, and plays two seasons. On the head its first
   season end pays one season of steady and office money and settles each stake once; the second pays one more
   season. (The board's load is not driven here: this round touches no load code, so "loads to the same JSON" would
   be JSON.parse of JSON.stringify and is not claimed; critic correction 10.) The stakes' wins are read off the
   documented key, the year after the season end. */
if (runs('9')) {
  console.log('9) old saves: one season paid per season, each stake settled once, nothing paid back');
  for (const sport of US) {
    const libB = B[sport.id], lib = H[sport.id], items = itemsOf(H, sport);
    const index = byName(items, 'Boring Index Fund'), once = steadyCards(items).find(card => card.oneTime);
    const office = byName(items, 'Family Office'), lawyer = byName(items, 'The Lawyer Who Never Loses');
    const stake35 = stakeCards(items).find(card => printed(card).chance === 0.35), crypto = byName(items, 'Crypto Punt');
    if (!index || !once || !office || !lawyer || !stake35 || !crypto) { fail('9', sport.id, 'a card this section buys is missing'); continue; }
    const steady = printed(index).rate * index.cost * 2 + printed(once).rate * once.cost;
    const stakes = [stake35, stake35, crypto];
    pinned(1534, () => {
      const old = career(B, sport, 'Fictional old save', 1534);
      old.c.netWorth = 40;
      for (const card of [index, index, once, ...stakes, office, lawyer]) {
        const got = libB[sport.buy](old.c, card.id);
        if (!got) { fail('9', sport.id, `the base arm could not buy ${card.id}`); return; }
        old.c = got.state;
      }
      playSeason(B, sport, old); playSeason(B, sport, old);
      const save = JSON.stringify(old.c);
      if ('shopCarry' in old.c) fail('9', sport.id, 'the base arm wrote a carry');
      const b = { c: JSON.parse(save), rng: mulberry(99) }, t = { c: JSON.parse(save), rng: mulberry(99) };
      const paying = new Set([index.id, once.id, office.id, stake35.id, crypto.id]);
      t.c.purchased = t.c.purchased.filter(id => !paying.has(id));
      const seen = [];
      for (let season = 1; season <= 2; season += 1) {
        const b0 = cash(b.c), bn = b.c.netWorth, t0 = t.c.netWorth;
        playSeason(H, sport, b); playSeason(H, sport, t);
        const pay = t.c.netWorth - t0;
        let payouts = 0;
        if (season === 1) {
          const key = H.summerCareerKey(b.c), n = new Map();
          for (const card of stakes) {
            const i = n.get(card.id) ?? 0; n.set(card.id, i + 1);
            const p = printed(card);
            if (H.keyedRng(`${key}|shop|${card.id}|${b.c.year}|${i}`)() < p.chance) payouts += p.flat ?? card.cost * p.times;
          }
          if (stakes.some(card => b.c.purchased.includes(card.id))) fail('9', `${sport.id} settle`, 'a stake is still held after its first season end');
        }
        const want = payouts + steady + (bn + pay + payouts + steady) * OFFICE_PRINTED, got = (cash(b.c) - b0) - pay;
        seen.push(`${got.toFixed(4)} (stakes ${payouts})`);
        if (!near(got, want, 1e-6)) fail('9', `${sport.id} season ${season}`, `the old save earned ${got.toFixed(6)}, one season of its cards is ${want.toFixed(6)}`);
      }
      console.log(`   ${sport.id}: steady ${steady.toFixed(2)}M a season; the old save earned ${seen.join(', then ')}`);
    });
  }
}

/* ─── the end ─── */
const redSections = [...red.keys()].sort();
if (CONTROL) {
  const want = CONTROL_SECTIONS[CONTROL];
  for (const s of want) console.log(`   control ${CONTROL}: section ${s} turned ${red.get(s)?.size ?? 0} red`);
  let fired = want.every(s => red.has(s));
  if (CONTROL === 'rate') fired = fired && [...red.get('2') ?? []].every(k => k.startsWith('nba ')) && [...red.get('1') ?? []].every(k => k === 'nba index_nba');
  if (CONTROL === 'words') fired = fired && [...red.get('1')].every(k => k === 'nba signature_shoe');
  if (CONTROL === 'camp') fired = fired && [...red.get('1')].every(k => k.startsWith('nba camp'));
  if (CONTROL === 'nocall') for (const s of ['2', '4', '9']) fired = fired && US.every(sp => [...red.get(s) ?? []].some(k => k.startsWith(`${sp.id} `)));
  if (CONTROL === 'chance') fired = fired && US.every(sp => red.get('3')?.has(`${sp.id} ${byName(itemsOf(H, sp), 'Crypto Punt').id} band`));
  if (CONTROL === 'nobank' || CONTROL === 'earnround') fired = fired && paidCases > 0 && red.get('6')?.size === paidCases;
  if (CONTROL === 'clampdown') fired = fired && US.every(sp => red.get('7')?.has(`${sp.id} skill above the ceiling`));
  if (CONTROL === 'potplusone') fired = fired && [...red.get('7')].every(k => k.startsWith('nba skill '));
  if (CONTROL === 'potplusoneall') fired = fired && fleetParted === 0 && US.every(sp => [...red.get('7')].some(k => k.startsWith(`${sp.id} skill `))) && [...red.get('7')].every(k => !k.includes(' fleet '));
  if (CONTROL === 'leak') fired = fired && US.every(sp => [...red.get('8') ?? []].some(k => k.startsWith(`${sp.id} `)));
  if (CONTROL === 'settleafter') fired = fired && US.every(sp => red.get('4')?.has(`${sp.id} before the tick`)) && [...red.get('4') ?? []].every(k => k.endsWith(' before the tick'));
  console.log(fired ? `simUsShopPromises: CONTROL ${CONTROL} FIRED (red sections ${redSections.join(', ')})` : `simUsShopPromises: CONTROL ${CONTROL} DID NOT FIRE (red sections ${redSections.join(', ') || 'none'})`);
  process.exit(fired ? 1 : 3);
}
console.log(redSections.length ? `simUsShopPromises: red in sections ${redSections.join(', ')}` : `simUsShopPromises: green (sections ${SECTIONS.join(', ')})`);
process.exit(redSections.length ? 1 : 0);
