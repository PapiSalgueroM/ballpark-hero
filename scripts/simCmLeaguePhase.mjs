/* Round 1228. The Champions League league phase, as libraries nothing in the game imports yet.
 *
 *   scripts/data/cmUclFormat.json   the real format of the three European cups, each row with its pages
 *   src/lib/leagueSlate.ts          a legal league phase slate (pots, home and away, the association rules)
 *   src/lib/uclLeaguePhase.ts       the Champions League's own numbers, the table order, the knockout draw
 *
 * SECTIONS (CM_LEAGUE_PHASE_ONLY=0,2 runs some of them; the default is all):
 *   0  the ledger. A verified row stands on two publishers on two hosts, none a wiki; a figure is printed by
 *      two of them; a row that is not verified carries no constant; the receipt holds the ledger's hash; the
 *      two seasons as played add up (points are three a win and one a draw, goals for equal goals against,
 *      two publishers agree on the top 24); and the BRACKET RULE IS DERIVED from those two seasons, never
 *      typed: which play-off pairing feeds which seeded pair, which ties meet in the quarter-finals and the
 *      semi-finals. Every source of both seasons must give the same rule. Then the library: every constant of
 *      uclLeaguePhase.ts equals its row, the bracket constants equal the derived rule, and Soccer Career's own
 *      four numbers (the other lane's file, read and never edited) agree with the ledger.
 *   1  the slate. 3,000 fields on keyed streams over three seed sets (the big five and the rest; the same with
 *      a sixth club in one association; a fullest pot forced to three, four or five of one association). On
 *      every slate, from its matches alone: eight matches against eight different clubs, four at home, one
 *      home and one away opponent from each pot, one match a club a matchday, 18 a matchday; the two counts
 *      the slate reports are the counts its matches hold; no slate is under the counting floor (written a
 *      second time here) and none is over its budget. Rates, each seed set on its own: fields that fell back
 *      to the recorded pattern, and fields drawn exactly at the counting floor.
 *      MEASURED 2026-10-10, sets 11, 23, 37, 1,000 fields each: at the floor 1000, 1000, 1000; fell back 0, 0,
 *      0; fields with at most four of one association in a pot and five in an association, drawn inside both
 *      rules: 445 of 445, 449 of 449, 453 of 453. The bands (no more than 5 in 1,000 falling back, at least
 *      990 in 1,000 at the floor) sit that far from a measurement that never moved; if one goes red the
 *      answer is more fields and a look at the search, never a wider band.
 *   2  the table. A crafted pair for each of the eight steps, level on every earlier step, handed in three
 *      orders and named so the name alone would get it wrong; 400 whole league phases with random scores,
 *      at every matchday, against the order written a second time from the results; the two real tables.
 *   3  the knockout draw. 2,000 final orders: the top eight are the seeds, every play-off tie sits inside
 *      the pairing that feeds its seed (by the DERIVED rule, not the library's constants), 25th down are
 *      nowhere, 1st and 2nd are in opposite halves; played through on a keyed coin, each quarter-final pairs
 *      the lines the real ones paired, and the side carrying the higher seed hosts every second leg; every
 *      round of 16 tie the two real seasons played is one the draw can make.
 *   4  the real season one field, MEASURED and printed for the lead (step A5 of the round). The engine is
 *      bundled as it is and never edited; the field of 36 is its own rule read at the league phase's size.
 *      240 seeded saves: the pots of three by name, the fullest pot, what each draw had to give up.
 *      THE BINDING ROUND MUST CHANGE section 4 when it makes the field size an argument: see FIELD_LINE.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is CM_LEAGUE_PHASE_CONTROL=<name>; it runs its own section only and must turn its own check
 * red and nothing that is not its own (the last line says FIRED, DID NOT FIRE CLEANLY or ABORTED).
 *   section 0, the data twisted in memory: onesource wiki thinused figure receipt steps feed points;
 *              the library edited in the bundle: const (a direct place too many)
 *   section 1, src/lib/leagueSlate.ts edited in the bundle: ninth sameassoc cap twoaday pot lie nosearch
 *   section 2: gdonly (the stand in order: steps 3 to 8 go red, 1 and 2 stay green)
 *   section 3: ninthdirect (9th straight to the round of 16), flipseed (the second leg handed to the lower
 *              seed), freebracket (the slots in table order, so the wrong lines meet)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.CM_LEAGUE_PHASE_CONTROL || '';
const ONLY = (process.env.CM_LEAGUE_PHASE_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simCmLeaguePhase: cannot run: ${why}`); process.exit(2); };

/* Each control: the section it lives in, the failure it MUST cause, and (third) every failure it MAY cause.
   A failure outside the third pattern means the control broke something that is not its own, and it is
   reported as not having fired cleanly. Without a third pattern the second is both. */
const CONTROLS = {
  onesource: [0, /^F3 is verified and stands on fewer than two publishers/, /^F3 is verified and stands on fewer than two publishers|^F3: capPerAssociation 2 is not printed by two/],
  wiki: [0, /^F7: .* is a wiki/], thinused: [0, /^F4 is not verified and carries/],
  figure: [0, /^F3: capPerAssociation 2 is not printed by two publishers/], receipt: [0, /does not carry the hash/],
  steps: [0, /^table step [34] is /, /^table step [34] is |^LEAGUE_PHASE_STEPS are not/],
  feed: [0, /fed by two play-off pairings/, /fed by two play-off pairings|disagree on|is not one round of 16 tie|do not give one bracket rule|too few readings|^BRACKET_LINES are not|^HALF_SLOTS pairs lines/],
  const: [0, /^ucl\.direct is 9 in uclLeaguePhase\.ts and 8 in the ledger/],
  points: [0, /points are not three a win/, /points are not three a win|disagree on the points of place 1$/],
  /* Section 1. These edit the bundled source of src/lib/leagueSlate.ts: see EDITS. */
  ninth: [1, /^\[EIGHT\]/, /^\[(EIGHT|COUNT|HOMEAWAY|POT|DAY|BUDGET|RATE)\]/], sameassoc: [1, /^\[BUDGET\].*breaks/, /^\[(BUDGET|RATE)\]/],
  cap: [1, /^\[BUDGET\].*over the cap/, /^\[(BUDGET|RATE)\]/], twoaday: [1, /^\[DAY\]/, /^\[(DAY|COUNT)\]/],
  pot: [1, /^\[POT\]/, /^\[(POT|HOMEAWAY)\]/], lie: [1, /^\[COST\]/, /^\[(COST|FLOOR|BUDGET|RATE)\]/],
  nosearch: [1, /^\[RATE\].*recorded pattern/, /^\[RATE\]/],
  /* Sections 2 and 3: edits of src/lib/uclLeaguePhase.ts. gdonly is the stand in order the game sorts by
     today (goal difference, goals, the name): steps 3 to 8 must go red and steps 1 and 2 must not. */
  gdonly: [2, /^\[STEP [3-8]\]/, /^\[(STEP [3-8]|FLEET)\]/],
  ninthdirect: [3, /^\[SEEDS\]/, /^\[(SEEDS|PLAYOFF|OUT|HOST|APART|MEETS|REAL|TOSS)\]/],
  flipseed: [3, /^\[HOST\]/], freebracket: [3, /^\[MEETS\]/, /^\[(MEETS|HOST)\]/],
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
/* A control runs its own section and nothing else. */
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

/* The source edits. Each target line must be in its file exactly once, or the harness refuses to run. */
const SLATE = 'src/lib/leagueSlate.ts';
const UCL_FILE = 'src/lib/uclLeaguePhase.ts';
const EDITS = {
  ninth: [SLATE, '        const matches = pairs.map(([h, a], e): [number, number, number] => [h, a, day[e]]);', '        const matches = pairs.map(([h, a], e): [number, number, number] => [h, a, day[e]]).concat([[pairs[0][1], pairs[0][0], (day[0] + 1) % days]]);'],
  sameassoc: [SLATE, '    if (assoc[h] === assoc[v]) return breaks < maxBreaks ? [1, 0] : null;', '    if (assoc[h] === assoc[v]) return [0, 0];'],
  cap: [SLATE, '    return over + o <= maxOver ? [0, o] : null;', '    return [0, 0];'],
  twoaday: [SLATE, '    const both = fu.filter(d => fv.includes(d));', '    const both = fu;'],
  pot: [SLATE, '    for (let i = 0; i < s; i += 1) out.push([hosts[i], guests[guestOf[i]]]);', '    for (let i = 0; i < s; i += 1) out.push(a === 0 && b === 1 ? [guests[guestOf[i]], hosts[i]] : [hosts[i], guests[guestOf[i]]]);'],
  lie: [SLATE, '    if (spec.assoc[h] === spec.assoc[a]) { breaks += 1; continue; }', '    if (spec.assoc[h] === spec.assoc[a]) { continue; }'],
  nosearch: [SLATE, '  const tries = spec.tries ?? 20;', '  const tries = 0;'],
  const: [UCL_FILE, '  ucl: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2 },', '  ucl: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 9, playoffTo: 24, capPerAssociation: 2 },'],
  gdonly: [UCL_FILE, '    for (const step of LEAGUE_PHASE_STEPS) {', '    for (const step of LEAGUE_PHASE_STEPS.slice(0, 2)) {'],
  ninthdirect: [UCL_FILE, '  const at = (position: number) => order[position - 1];', '  const at = (position: number) => order[position === 8 ? 8 : position === 9 ? 7 : position - 1];'],
  flipseed: [UCL_FILE, '  return { home: winners[2 * i + 1], away: winners[2 * i] };', '  return { home: winners[2 * i], away: winners[2 * i + 1] };'],
  freebracket: [UCL_FILE, 'export const HALF_SLOTS = [0, 3, 1, 2] as const;', 'export const HALF_SLOTS = [0, 1, 2, 3] as const;'],
};
const editPlugin = {
  name: 'cm-league-phase-control',
  setup(b) {
    const edit = EDITS[CONTROL];
    if (!edit) return;
    const [file, from, to] = edit;
    b.onLoad({ filter: new RegExp(`${file.split('/').pop().replace('.', '[.]')}$`) }, async args => {
      const source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      const count = source.split(from).length - 1;
      if (count !== 1) cannot(`control ${CONTROL}: its line is in ${file} ${count} times, it must be exactly once`);
      changed = true;
      return { contents: source.replace(from, to), loader: 'ts' };
    });
  },
};
/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries, extra = []) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `cm-league-phase-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [editPlugin, ...extra] });
  return import(pathToFileURL(out).href);
}

const fails = [];
let checks = 0;
let changed = false;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);

const LEDGER_FILE = 'scripts/data/cmUclFormat.json';
const RECEIPT_FILE = 'scripts/data/cmUclFormat.receipt.json';
const ledger = JSON.parse(text(LEDGER_FILE));

/* ── Section 0: the ledger ─────────────────────────────────────────────────────────────────────────── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\./i.test(new URL(url).host);
const domainOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.uk$/.test(h) ? -3 : -2).join('.'); };
const WORDS = { one: 1, two: 2, three: 3, four: 4, six: 6, eight: 8, nine: 9 };
const printed = (s, n) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(s)
  || Object.entries(WORDS).some(([w, v]) => v === n && new RegExp(`\\b${w}\\b`, 'i').test(s));
const STEP_WORDS = {
  goalDifference: [/goal difference/i, null], goalsFor: [/goals scored/i, /away/i], awayGoalsFor: [/goals scored.*away|away goals/i, null],
  wins: [/wins/i, /away/i], awayWins: [/wins.*away|away wins/i, null], opponentsPoints: [/points/i, null],
  opponentsGoalDifference: [/goal difference/i, null], opponentsGoalsFor: [/goals scored/i, null],
  disciplinaryPoints: [/disciplinary|fair play/i, null], clubCoefficient: [/coefficient/i, null],
};
const OPPONENTS = /opponents|rivals/i;

function bracketRule(season, name) {
  const canon = n => ledger.aliases[n] ?? n;
  const pos = new Map(season.table.espn.rows.map((r, i) => [r[0], i + 1]));
  const P = n => { const p = pos.get(canon(n)); if (!p) fails.push(`${name}: ${n} is not in the table`); return p ?? 99; };
  const pairOf = q => ledger.playoffPairs.findIndex(([a, b]) => [...a, ...b].includes(q));
  const rules = [];
  const seedOf = new Map(); // a club's position -> the seeded position of its round of 16 tie
  season.r16.forEach((src, si) => {
    const feed = {};
    const seen = new Set();
    for (const tie of src.ties) {
      const [p, q] = tie.map(P).sort((a, b) => a - b);
      ok(p <= 8 && q >= 9 && q <= 24, `${name}, ${src.publisher}: ${tie.join(' and ')} is not a top eight club against a play-off club`);
      seen.add(p);
      if (si === 0) { seedOf.set(p, p); seedOf.set(q, p); } else ok(seedOf.get(q) === p, `${name}: ${src.publisher} and the first source disagree on ${tie.join(' and ')}`);
      const line = Math.ceil(p / 2);
      ok(feed[line] === undefined || feed[line] === pairOf(q), `${name}, ${src.publisher}: the two ties of seeds ${line * 2 - 1} and ${line * 2} are fed by two play-off pairings`);
      feed[line] = pairOf(q);
    }
    ok(seen.size === (src.partial ?? 8), `${name}, ${src.publisher}: ${seen.size} round of 16 ties read, ${src.partial ?? 8} expected`);
    if (seen.size === 8) rules.push({ from: `${name} round of 16, ${src.publisher}`, feed: [1, 2, 3, 4].map(l => feed[l]) });
  });
  const linesOf = side => [...new Set(side.map(P).map(p => seedOf.get(p)).filter(Boolean).map(p => Math.ceil(p / 2)))].sort();
  const halfOf = side => side.map(P).map(p => seedOf.get(p)).filter(Boolean);
  for (const src of season.quarterFinals) {
    const meets = src.ties.map(t => { for (const side of t.sides) for (const club of side) ok(t.line.includes(club), `${name}: ${club} is not in the line ${t.line}`); return t.sides.map(linesOf); });
    ok(meets.every(m => m.every(s => s.length === 1)), `${name}, ${src.publisher}: a quarter-final side is not one round of 16 tie`);
    rules.push({ from: `${name} quarter-finals, ${src.publisher}`, meets: [...new Set(meets.map(m => m.flat().sort().join('v')))].sort() });
  }
  for (const src of season.semiFinals) {
    const sides = src.ties.map(t => { for (const side of t.sides) for (const club of side) ok(t.line.includes(club), `${name}: ${club} is not in the line ${t.line}`); return t.sides.map(linesOf); });
    const halves = src.ties.map(t => t.sides.flatMap(halfOf));
    rules.push({ from: `${name} semi-finals, ${src.publisher}`, semi: [...new Set(sides.flat().map(s => s.join('v')))].sort(), topTwoApart: halves.some(h => h.includes(1) && !h.includes(2)) });
  }
  return rules;
}

let DERIVED = null; // { feed: play-off pairing index by seeded line, meets: the lines that share a quarter-final }
function section0() {
  const row = id => ledger.rows.find(r => r.id === id);
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const r = row('F3'); changed = r.sources.length > 1; r.sources.length = 1; }
  if (CONTROL === 'wiki') { const s = row('F7').sources[1]; changed = !isWiki(s.url); s.url = 'https://en.wikipedia.org/wiki/UEFA_Champions_League'; }
  if (CONTROL === 'thinused') { const r = row('F4'); changed = r.status !== 'verified' && r.usedBy.length === 0; r.usedBy = ['UCL_LEAGUE.capPerAssociation']; }
  if (CONTROL === 'figure') { for (const s of row('F3').sources.slice(1)) { const was = s.literal.join('|'); s.literal = s.literal.map(l => l.replace(/\btwo\b/g, 'a few')); changed ||= was !== s.literal.join('|'); } }
  if (CONTROL === 'steps') { const t = ledger.tableSteps; changed = t[2] !== t[3]; [t[2], t[3]] = [t[3], t[2]]; }
  if (CONTROL === 'points') { const r = ledger.asPlayed['2024-25'].table.espn.rows[0]; r[6] += 1; changed = true; }
  if (CONTROL === 'feed') { const t = ledger.asPlayed['2025-26'].r16[0].ties; changed = t[0][0] !== t[1][0]; [t[0][0], t[1][0]] = [t[1][0], t[0][0]]; }

  /* 0.1 Every row is a reading somebody can open, and a verified row stands on two publishers. */
  const ids = new Set();
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(['verified', 'onePublisher', 'toVerify'].includes(r.status), `${r.id}: status ${r.status} is not one of the three`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    for (const s of r.sources) {
      for (const url of [s.url, s.url2].filter(Boolean)) { ok(/^https:\/\//.test(url), `${r.id}: ${url} is not https`); ok(!isWiki(url), `${r.id}: ${url} is a wiki`); }
      ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${r.id}: a source names no publisher`);
      ok(typeof s.published === 'string' && s.published.length > 3, `${r.id}, ${s.publisher}: no date`);
      ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5), `${r.id}, ${s.publisher}: no literal`);
    }
    const domains = new Set(r.sources.map(s => domainOf(s.url)));
    if (r.status === 'verified') ok(domains.size >= 2, `${r.id} is verified and stands on fewer than two publishers`);
    else ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
    for (const [key, n] of Object.entries(r.figures ?? {})) {
      const by = new Set(r.sources.filter(s => printed(s.literal.join(' | '), n)).map(s => domainOf(s.url)));
      ok(by.size >= 2, `${r.id}: ${key} ${n} is not printed by two publishers`);
      for (const c of r.competition.split('+')) if (Object.hasOwn(ledger.competitions[c] ?? {}, key)) ok(ledger.competitions[c][key] === n, `${r.id}: ${key} is ${n} and competitions.${c}.${key} is ${ledger.competitions[c][key]}`);
    }
  }
  /* 0.2 The table steps, in the order both sources print them, and the play-off pairings as the regulations print them. */
  const f6 = row('F6');
  ok(ledger.tableSteps.length === 10 && ledger.tableStepsKept === 8, 'the ledger does not hold ten table steps with eight kept');
  for (const s of f6.sources) {
    ok(s.steps.length === ledger.tableSteps.length, `F6, ${s.publisher}: ${s.steps.length} steps`);
    ledger.tableSteps.forEach((key, i) => {
      const [must, mustNot] = STEP_WORDS[key] ?? [/$^/, null];
      const line = s.steps[i] ?? '';
      const wantsOpp = key.startsWith('opponents');
      ok(must.test(line) && !(mustNot && mustNot.test(line)) && OPPONENTS.test(line) === wantsOpp, `table step ${i + 1} is ${key} in the ledger and "${line}" at ${s.publisher}`);
    });
  }
  const printedPairs = [...row('F7').sources[0].literal.join(' ').matchAll(/clubs (\d+) or (\d+) against clubs (\d+) or (\d+)/g)].map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);
  ok(same(printedPairs, ledger.playoffPairs), 'playoffPairs are not the pairings Article 19.02 prints');
  /* 0.3 The two seasons as played add up, and two publishers agree on the top 24. */
  const canon = n => ledger.aliases[n] ?? n;
  for (const [name, season] of Object.entries(ledger.asPlayed)) {
    const rows = season.table.espn.rows;
    ok(rows.length === ledger.competitions.ucl.clubs, `${name}: ${rows.length} rows in the table`);
    ok(rows.every(r => r[1] + r[2] + r[3] === ledger.competitions.ucl.games), `${name}: a club did not play ${ledger.competitions.ucl.games}`);
    ok(rows.every(r => r[6] === 3 * r[1] + r[2]), `${name}: points are not three a win and one a draw in every row`);
    const sum = k => rows.reduce((a, r) => a + r[k], 0);
    ok(sum(4) === sum(5) && sum(1) === sum(3) && sum(2) % 2 === 0, `${name}: the table does not add up (goals ${sum(4)} for and ${sum(5)} against, ${sum(1)} wins and ${sum(3)} defeats)`);
    const level = [];
    for (let i = 1; i < rows.length; i += 1) {
      const [a, b] = [rows[i - 1], rows[i]];
      const d = a[6] - b[6] || (a[4] - a[5]) - (b[4] - b[5]) || a[4] - b[4];
      ok(d >= 0, `${name}: ${a[0]} is above ${b[0]} against points, goal difference and goals`);
      if (d === 0) level.push([a[0], b[0]]);
    }
    ok(same(level, season.table.levelOnTwoSteps), `${name}: the pairs the first two steps leave level are ${JSON.stringify(level)}`);
    season.table.tnt.top24.forEach(([club, pts], i) => {
      ok(canon(club) === rows[i][0], `${name}: the two publishers disagree on place ${i + 1} (${club} and ${rows[i][0]})`);
      ok(pts === rows[i][6], `${name}: the two publishers disagree on the points of place ${i + 1}`);
    });
    const pos = new Map(rows.map((r, i) => [r[0], i + 1]));
    for (const src of season.playoffs) for (const tie of src.ties) {
      const [p, q] = tie.map(c => pos.get(canon(c)));
      ok(ledger.playoffPairs.some(([a, b]) => (a.includes(p) && b.includes(q)) || (a.includes(q) && b.includes(p))), `${name}: the play-off ${tie.join(src.join)} is not inside one real pairing`);
    }
  }
  const f16 = row('F16').figures;
  const at = (season, place) => ledger.asPlayed[season].table.espn.rows[place - 1][6];
  ok(f16.eighth2024 === at('2024-25', 8) && f16.twentyFourth2024 === at('2024-25', 24) && f16.eighth2025 === at('2025-26', 8) && f16.twentyFourth2025 === at('2025-26', 24), 'F16 is not what the tables hold');
  /* 0.4 The bracket rule, derived. Every source of both seasons must give the same one. */
  const rules = Object.entries(ledger.asPlayed).flatMap(([name, season]) => bracketRule(season, name));
  const pick = key => [...new Set(rules.filter(r => r[key] !== undefined).map(r => JSON.stringify(r[key])))];
  const [feeds, meets, semis, apart] = [pick('feed'), pick('meets'), pick('semi'), pick('topTwoApart')];
  const one = feeds.length === 1 && meets.length === 1 && semis.length === 1 && same(meets, semis) && same(apart, ['true']);
  ok(one, `the sources do not give one bracket rule: feeds ${feeds.join(' ')}, quarter-finals ${meets.join(' ')}, semi-finals ${semis.join(' ')}, top two apart ${apart.join(' ')}`);
  ok(rules.filter(r => r.feed).length >= 3 && rules.filter(r => r.meets).length >= 4 && rules.filter(r => r.semi).length >= 3, 'too few readings behind the bracket rule');
  if (one) DERIVED = { feed: JSON.parse(feeds[0]), meets: JSON.parse(meets[0]) };
  /* 0.5 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') changed = true;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simCmLeaguePhase.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | one publisher ${count('onePublisher')} | to verify ${count('toVerify')}`);
  if (DERIVED) console.log(`  0 bracket rule from ${rules.length} readings of two seasons: seeded lines 1/2, 3/4, 5/6, 7/8 are fed by play-off pairings ${DERIVED.feed.map(i => ledger.playoffPairs[i].flat().join(',')).join(' | ')}; quarter-finals ${DERIVED.meets.join(' ')} (lines), the two meet in one semi-final, 1st and 2nd in opposite halves`);
}

/* ── Section 1: the slate ──────────────────────────────────────────────────────────────────────────── */
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const POTS = [0, 1, 2, 3].map(p => Array.from({ length: 9 }, (_, i) => p * 9 + i));
const potOf = c => Math.floor(c / 9);
/** The counting floor, written a second time here so the library's own is not what checks the library. */
function floorOf(assoc) {
  const total = {};
  for (const a of assoc) total[a] = (total[a] ?? 0) + 1;
  const k = POTS.map(pot => { const m = {}; for (const c of pot) m[assoc[c]] = (m[assoc[c]] ?? 0) + 1; return m; });
  let breaks = 0;
  let overCap = 0;
  let most = [0, 0]; // [most of one association in a pot, the size of that association]
  for (let a = 0; a < 4; a += 1) for (const [x, n] of Object.entries(k[a])) {
    const inside = Math.max(0, 2 * n - 9);
    breaks += inside;
    for (let b = 0; b < 4; b += 1) if (b !== a) breaks += Math.max(0, n + (k[b][x] ?? 0) - 9);
    overCap += Math.max(0, 2 * total[x] - 2 * inside - 2 * (9 - n));
    if (n > most[0] || (n === most[0] && total[x] > most[1])) most = [n, total[x]];
  }
  return { breaks, overCap, most, largest: Math.max(...Object.values(total)) };
}
/** Every rule of a slate, checked from the matches alone. Returns tagged failures. */
function slateFaults(assoc, slate) {
  const out = [];
  if (!slate) return ['[NULL] no slate'];
  const home = Array.from({ length: 36 }, () => [0, 0, 0, 0]);
  const away = Array.from({ length: 36 }, () => [0, 0, 0, 0]);
  const opp = Array.from({ length: 36 }, () => new Set());
  const played = new Array(36).fill(0);
  const days = Array.from({ length: 36 }, () => new Set());
  const perDay = new Array(8).fill(0);
  let breaks = 0;
  const faced = {};
  if (slate.matches.length !== 144) out.push(`[COUNT] ${slate.matches.length} matches`);
  for (const [h, a, d] of slate.matches) {
    home[h][potOf(a)] += 1; away[a][potOf(h)] += 1; opp[h].add(a); opp[a].add(h); played[h] += 1; played[a] += 1;
    if (!(d >= 0 && d < 8)) out.push(`[DAY] matchday ${d}`); else perDay[d] += 1;
    if (days[h].has(d) || days[a].has(d)) out.push(`[DAY] a club plays twice on matchday ${d}`);
    days[h].add(d); days[a].add(d);
    if (assoc[h] === assoc[a]) breaks += 1; else for (const [c, o] of [[h, a], [a, h]]) faced[`${c}|${assoc[o]}`] = (faced[`${c}|${assoc[o]}`] ?? 0) + 1;
  }
  if (perDay.some(n => n !== 18)) out.push(`[COUNT] matches a matchday ${perDay.join(' ')}`);
  for (let c = 0; c < 36; c += 1) {
    if (played[c] !== 8 || opp[c].size !== 8 || opp[c].has(c)) out.push(`[EIGHT] club ${c} plays ${played[c]} matches against ${opp[c].size} clubs`);
    const [h, a] = [home[c].reduce((x, y) => x + y, 0), away[c].reduce((x, y) => x + y, 0)];
    if (h !== 4 || a !== 4) out.push(`[HOMEAWAY] club ${c} has ${h} at home and ${a} away`);
    if (home[c].some(x => x !== 1) || away[c].some(x => x !== 1)) out.push(`[POT] club ${c} is not one home and one away against each pot`);
  }
  const overCap = Object.values(faced).reduce((x, n) => x + Math.max(0, n - 2), 0);
  if (breaks !== slate.breaks || overCap !== slate.overCap) out.push(`[COST] the slate says ${slate.breaks} breaks and ${slate.overCap} over the cap, its matches hold ${breaks} and ${overCap}`);
  const floor = floorOf(assoc);
  if (floor.breaks !== slate.floor.breaks || floor.overCap !== slate.floor.overCap) out.push(`[FLOOR] the library's floor ${slate.floor.breaks}/${slate.floor.overCap} is not the counted ${floor.breaks}/${floor.overCap}`);
  if (slate.breaks < floor.breaks || (slate.breaks === floor.breaks && slate.overCap < floor.overCap)) out.push(`[FLOOR] a slate under the counting floor: ${slate.breaks}/${slate.overCap} against ${floor.breaks}/${floor.overCap}`);
  if (!slate.fallback && breaks > floor.breaks + 2) out.push(`[BUDGET] ${breaks} breaks, more than its budget of ${floor.breaks + 2}`);
  if (!slate.fallback && overCap > floor.overCap + 2) out.push(`[BUDGET] ${overCap} over the cap, more than its budget of ${floor.overCap + 2}`);
  return out;
}
/** Three kinds of field, each on a keyed stream: the big five and the rest; the same with a sixth club in one
 *  association; and a field whose fullest pot is forced to three, four or five of one association. */
function makeField(kind, rnd) {
  if (kind < 2) {
    const sizes = kind === 0 ? [5, 5, 5, 5, 4, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1] : [6, 5, 5, 5, 4, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const clubs = sizes.flatMap((n, a) => Array.from({ length: n }, () => ({ a, s: (a < 5 ? 78 : 70) + (rnd() - 0.5) * 16 })));
    return clubs.sort((x, y) => y.s - x.s).map(c => c.a);
  }
  const size = 5 + Math.floor(rnd() * 2);
  const inPot = 3 + Math.floor(rnd() * 3);
  const pot = Math.floor(rnd() * 4);
  const assoc = new Array(36).fill(-1);
  const mix = list => { for (let i = list.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
  const seatsOf = p => mix(POTS[p].filter(c => assoc[c] === -1));
  seatsOf(pot).slice(0, inPot).forEach(c => { assoc[c] = 0; });
  for (let left = size - inPot; left > 0; left -= 1) { const p = (pot + 1 + Math.floor(rnd() * 3)) % 4; const free = seatsOf(p); if (free.length) assoc[free[0]] = 0; }
  const rest = [4, 4, 3, 3, 2, 2].flatMap((n, i) => new Array(n).fill(i + 1));
  const open = mix(assoc.map((a, c) => (a === -1 ? c : -1)).filter(c => c >= 0));
  open.forEach((c, i) => { assoc[c] = i < rest.length ? rest[i] : 100 + i; });
  return assoc;
}
const SETS = [11, 23, 37];
const PER_SET = 1000;
/* Measured on 2026-10-10 over these three seed sets (3,000 fields): see BANDS below and the notes. */
const BANDS = { fallbackMost: 0.005, atFloorLeast: 0.99 };
async function section1() {
  const { slate: lib } = await bundle('slate', { slate: SLATE });
  const table = {};
  let total = 0;
  for (const set of SETS) {
    let fallbacks = 0;
    let atFloor = 0;
    let plain = 0;
    let plainAtFloor = 0;
    for (let i = 0; i < PER_SET; i += 1) {
      const assoc = makeField(i % 3, mulberry(set * 7919 + i));
      const spec = { pots: POTS, assoc };
      const slate = lib.swissSlate(spec, mulberry(set * 104729 + i));
      total += 1;
      const faults = slateFaults(assoc, slate);
      checks += 1;
      for (const f of faults) fails.push(`${f} (set ${set}, field ${i})`);
      if (!slate) continue;
      if (i % 50 === 0) ok(same(lib.swissSlate(spec, mulberry(set * 104729 + i)), slate), `[SAME] the same field and stream gave two slates (set ${set}, field ${i})`);
      const floor = floorOf(assoc);
      const exact = !slate.fallback && slate.breaks === floor.breaks && slate.overCap === floor.overCap;
      if (slate.fallback) fallbacks += 1;
      if (exact) atFloor += 1;
      if (floor.most[0] <= 4 && floor.largest <= 5) { plain += 1; if (exact) plainAtFloor += 1; }
      const key = `${floor.most[1]} clubs, ${floor.most[0]} in a pot`;
      const row = (table[key] ??= { n: 0, exact: 0, fallback: 0, tries: 0, floorB: new Set(), floorC: new Set() });
      row.n += 1; row.exact += exact ? 1 : 0; row.fallback += slate.fallback ? 1 : 0; row.tries += slate.tries; row.floorB.add(floor.breaks); row.floorC.add(floor.overCap);
    }
    ok(fallbacks / PER_SET <= BANDS.fallbackMost, `[RATE] set ${set}: ${fallbacks} of ${PER_SET} fields fell back to the recorded pattern, the band is ${BANDS.fallbackMost}`);
    ok(atFloor / PER_SET >= BANDS.atFloorLeast, `[RATE] set ${set}: ${atFloor} of ${PER_SET} fields were drawn exactly at the counting floor, the band is ${BANDS.atFloorLeast}`);
    ok(plain > 200 && plainAtFloor / plain >= BANDS.atFloorLeast, `[RATE] set ${set}: ${plainAtFloor} of ${plain} fields with at most four in a pot and five in an association drew inside both rules`);
    console.log(`  1 set ${set}: ${PER_SET} fields, at the floor ${atFloor}, fell back ${fallbacks}, plain fields strict ${plainAtFloor} of ${plain}`);
  }
  console.log('  1 by (clubs of the association with most in one pot, most in one pot): fields | at the floor | fell back | mean tries | floors seen (breaks ; over the cap)');
  for (const key of Object.keys(table).sort()) { const r = table[key]; console.log(`    ${key.padEnd(24)} ${String(r.n).padStart(5)} | ${String(r.exact).padStart(5)} | ${String(r.fallback).padStart(3)} | ${(r.tries / r.n).toFixed(2)} | ${[...r.floorB].sort().join(',')} ; ${[...r.floorC].sort().join(',')}`); }
  ok(total >= 2000, `[COUNT] only ${total} draws were played`);
  /* The recorded pattern is itself a legal slate, and a search given no tries seats it and says so. */
  const pattern = lib.PATTERN_4X9.map(code => [Math.floor(code / 36) % 36, code % 36, Math.floor(code / 1296)]);
  const distinct = Array.from({ length: 36 }, (_, i) => i);
  for (const f of slateFaults(distinct, { matches: pattern, breaks: 0, overCap: 0, floor: { breaks: 0, overCap: 0 }, fallback: true })) fails.push(`${f} (the recorded pattern)`);
  checks += 1;
  if (CONTROL !== 'nosearch') {
    const assoc = makeField(1, mulberry(5));
    const seated = lib.swissSlate({ pots: POTS, assoc, tries: 0 }, mulberry(6));
    ok(seated && seated.fallback === true && seated.tries === 0, '[RATE] a search given no tries did not seat the recorded pattern');
    for (const f of slateFaults(assoc, seated)) fails.push(`${f} (the pattern seated)`);
  }
}

/* ── Section 0, second half: the library states what the ledger states ─────────────────────────────── */
const UCL = UCL_FILE;
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
async function section0b() {
  const { ucl: lib } = await bundle('ucl0', { ucl: UCL });
  for (const [c, shape] of Object.entries(ledger.competitions)) for (const [key, n] of Object.entries(shape)) {
    if (key === 'name') continue;
    const have = c === 'ucl' ? lib.UCL_LEAGUE[key] : lib.LEAGUE_PHASE_SHAPES[c][key];
    ok(have === n, `${c}.${key} is ${have} in uclLeaguePhase.ts and ${n} in the ledger`);
  }
  ok(same(Object.keys(lib.LEAGUE_PHASE_SHAPES).sort(), Object.keys(ledger.competitions).sort()), 'the library and the ledger do not hold the same competitions');
  ok(same([...lib.LEAGUE_PHASE_STEPS], ledger.tableSteps.slice(0, ledger.tableStepsKept)), 'LEAGUE_PHASE_STEPS are not the first table steps of the ledger, in order');
  ok(same(lib.PLAYOFF_PAIRS, ledger.playoffPairs), 'PLAYOFF_PAIRS are not the ledger\'s pairings');
  ok(DERIVED !== null && same(lib.BRACKET_LINES.map(l => l.playoff), DERIVED.feed) && same(lib.BRACKET_LINES.map(l => l.seeds), [[1, 2], [3, 4], [5, 6], [7, 8]]), 'BRACKET_LINES are not the lines the two seasons as played give');
  const slots = lib.HALF_SLOTS;
  const meets = [[0, 1], [2, 3]].map(([x, y]) => [slots[x] + 1, slots[y] + 1].sort().join('v')).sort();
  ok(DERIVED !== null && same(meets, DERIVED.meets), `HALF_SLOTS pairs lines ${meets.join(' ')}, the two seasons as played pair ${DERIVED ? DERIVED.meets.join(' ') : 'nothing'}`);
  ok(slots[0] < slots[1] && slots[2] < slots[3] && slots[0] < slots[2], 'the even slot does not carry the higher seeded line, so nextRoundTie would hand the second leg to the wrong side');
  const used = new Set(ledger.rows.filter(r => r.status === 'verified').flatMap(r => r.usedBy));
  for (const name of used) ok(Object.hasOwn(lib, name.split('.')[0]), `a row names ${name}, which uclLeaguePhase.ts does not export`);
  for (const key of Object.keys(lib.UCL_LEAGUE)) ok(used.has(`UCL_LEAGUE.${key}`), `UCL_LEAGUE.${key} stands on no verified row`);
  for (const name of ['LEAGUE_PHASE_STEPS', 'PLAYOFF_PAIRS', 'BRACKET_LINES', 'HALF_SLOTS', 'drawUclKnockout', 'nextRoundTie', 'LEAGUE_PHASE_SHAPES.uel', 'LEAGUE_PHASE_SHAPES.uecl']) ok(used.has(name), `${name} stands on no verified row`);
  /* Soccer Career keeps four of the same numbers in its own file (the other lane's). Read, never edited. */
  const theirs = /export const LEAGUE_PHASE = \{([^}]*)\}/.exec(stripComments(text('src/lib/soccerCareerContinental.ts')));
  ok(theirs !== null, 'Soccer Career\'s LEAGUE_PHASE constant was not found');
  for (const [, key, n] of (theirs ? theirs[1] : '').matchAll(/(\w+):\s*(\d+)/g)) ok(ledger.competitions.ucl[key] === Number(n), `Soccer Career's LEAGUE_PHASE.${key} is ${n} and the ledger says ${ledger.competitions.ucl[key]}`);
  noDash(UCL, text(UCL)); noDash(SLATE, text(SLATE));
}

/* ── Section 2: the table ──────────────────────────────────────────────────────────────────────────── */
/** The order written a second time, from the results alone, so the library is not checked by itself. */
function referenceOrder(rows, results) {
  const info = new Map(rows.map(r => [r.club, { ag: 0, aw: 0, opp: [] }]));
  for (const [key, [hg, ag]] of Object.entries(results)) {
    const [h, a] = key.split('|');
    if (!info.has(h) || !info.has(a)) continue;
    info.get(a).ag += ag; if (ag > hg) info.get(a).aw += 1;
    info.get(h).opp.push(a); info.get(a).opp.push(h);
  }
  const by = new Map(rows.map(r => [r.club, r]));
  const keyOf = r => { const i = info.get(r.club); const o = i.opp.map(c => by.get(c)); const t = f => o.reduce((x, y) => x + f(y), 0); return [r.pts, r.gf - r.ga, r.gf, i.ag, r.w, i.aw, t(y => y.pts), t(y => y.gf - y.ga), t(y => y.gf)]; };
  const decided = new Array(10).fill(0);
  const sorted = [...rows].sort((a, b) => { const [ka, kb] = [keyOf(a), keyOf(b)]; for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return kb[i] - ka[i]; return a.club < b.club ? -1 : 1; });
  for (let i = 1; i < sorted.length; i += 1) { const [ka, kb] = [keyOf(sorted[i - 1]), keyOf(sorted[i])]; const at = ka.findIndex((v, j) => v !== kb[j]); decided[at < 0 ? 9 : at] += 1; }
  return { order: sorted.map(r => r.club), decided };
}
async function section2() {
  const { ucl: lib, slate: slateLib } = await bundle('ucl2', { ucl: UCL, slate: SLATE });
  const row = (club, over = {}) => ({ club, w: 3, d: 1, l: 1, gf: 10, ga: 5, pts: 10, ...over });
  const strong = row('Strong', { pts: 9, gf: 9, ga: 4 });
  /* Zeta must finish above Alpha whichever is handed in first; by name alone Alpha would lead. */
  const crafted = [
    [0, 'points', { pts: 11 }, { gf: 30 }, {}, []],
    [1, 'goal difference', { ga: 4 }, {}, {}, []],
    [2, 'goals scored', { gf: 11, ga: 6 }, {}, {}, []],
    [3, 'away goals scored', {}, {}, { 'Strong|Zeta': [0, 3], 'Strong|Alpha': [0, 1] }, [strong]],
    [4, 'wins', { w: 3, d: 1 }, { w: 2, d: 4 }, {}, []],
    [5, 'away wins', {}, {}, { 'Strong|Zeta': [0, 1], 'Strong|Alpha': [1, 1] }, [strong]],
    [6, 'the points of the clubs played', {}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, row('Weak', { pts: 3, gf: 9, ga: 4 })]],
    [7, 'their goal difference', {}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, row('Weak', { pts: 9, gf: 9, ga: 8 })]],
    [8, 'their goals', {}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, row('Weak', { pts: 9, gf: 6, ga: 1 })]],
  ];
  for (const [step, name, zeta, alpha, results, others] of crafted) {
    const [z, a] = [row('Zeta', zeta), row('Alpha', alpha)];
    const good = [[z, a, ...others], [a, z, ...others], [...others, a, z]].every(rows => { const s = lib.sortedLeaguePhaseTable(rows, results).map(r => r.club); return s.indexOf('Zeta') < s.indexOf('Alpha'); });
    ok(good, `[STEP ${step}] a pair level on every earlier step is not split by ${name}`);
  }
  ok(same(lib.sortedLeaguePhaseTable([row('Zeta'), row('Alpha')]).map(r => r.club), ['Alpha', 'Zeta']), '[NAME] a pair level on all eight steps is not listed by name');
  /* Whole league phases with random scores, against the order written a second time above. */
  const decided = new Array(10).fill(0);
  let tables = 0;
  for (let i = 0; i < 400; i += 1) {
    const rnd = mulberry(900 + i);
    const slate = slateLib.swissSlate({ pots: POTS, assoc: makeField(i % 3, mulberry(7000 + i)) }, mulberry(8000 + i));
    const clubs = Array.from({ length: 36 }, (_, c) => `C${String(c).padStart(2, '0')}`);
    const rows = clubs.map(club => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
    const results = {};
    const upTo = 1 + (i % 8); // tables in the middle of the phase too
    for (const [h, a, d] of slate.matches) {
      if (d >= upTo) continue;
      const [hg, ag] = [Math.floor(rnd() * rnd() * 5), Math.floor(rnd() * rnd() * 4)];
      results[`${clubs[h]}|${clubs[a]}`] = [hg, ag];
      const [H, A] = [rows[h], rows[a]];
      H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
      if (hg > ag) { H.w += 1; H.pts += 3; A.l += 1; } else if (hg < ag) { A.w += 1; A.pts += 3; H.l += 1; } else { H.d += 1; A.d += 1; H.pts += 1; A.pts += 1; }
    }
    const ref = referenceOrder(rows, results);
    ref.decided.forEach((n, k) => { decided[k] += n; });
    tables += 1;
    const mixed = [...rows].reverse();
    ok(same(lib.sortedLeaguePhaseTable(rows, results).map(r => r.club), ref.order) && same(lib.sortedLeaguePhaseTable(mixed, results).map(r => r.club), ref.order), `[FLEET] table ${i} (after matchday ${upTo}) is not in the order the results give`);
  }
  console.log(`  2 ${tables} random tables agree with the second writing of the order. Neighbours split by: points ${decided[0]}, goal difference ${decided[1]}, goals ${decided[2]}, away goals ${decided[3]}, wins ${decided[4]}, away wins ${decided[5]}, opponents' points ${decided[6]}, their goal difference ${decided[7]}, their goals ${decided[8]}, the name ${decided[9]}`);
  ok(decided.slice(1, 9).every(n => n > 0), `[FLEET] the random tables never reached one of the eight steps (${decided.join(' ')}), so they prove less than they say`);
  /* The two real tables: the rows alone, in the order the two publishers print, wherever two steps decide. */
  for (const [name, season] of Object.entries(ledger.asPlayed)) {
    const real = season.table.espn.rows.map(([club, w, d, l, gf, ga, pts]) => ({ club, w, d, l, gf, ga, pts }));
    const got = lib.sortedLeaguePhaseTable([...real].reverse()).map(r => r.club);
    const level = new Set(season.table.levelOnTwoSteps.flat());
    const wrong = real.map((r, i) => (r.club === got[i] || level.has(r.club) ? null : r.club)).filter(Boolean);
    ok(wrong.length === 0, `[REAL] ${name}: the library does not give the published order for ${wrong.join(', ')}`);
  }
}

/* ── Section 3: the knockout draw ──────────────────────────────────────────────────────────────────── */
async function section3() {
  const { ucl: lib } = await bundle('ucl3', { ucl: UCL });
  if (!DERIVED) section0();
  if (!DERIVED) { fails.push('[RULE] no bracket rule could be derived from the ledger'); return; }
  const pairs = ledger.playoffPairs;
  const lineOfSeed = p => Math.ceil(p / 2); // 1 to 4
  const DRAWS = 2000;
  const tossed = { seedsHalfOne: 0, tieHalfOne: 0, straight: 0 };
  for (let i = 0; i < DRAWS; i += 1) {
    const rnd = mulberry(31000 + i);
    const order = Array.from({ length: 36 }, (_, c) => `K${String(c).padStart(2, '0')}`);
    for (let c = 35; c > 0; c -= 1) { const j = Math.floor(rnd() * (c + 1)); [order[c], order[j]] = [order[j], order[c]]; }
    const pos = new Map(order.map((c, k) => [c, k + 1]));
    const seed = Math.floor(rnd() * 4294967296);
    const d = lib.drawUclKnockout(order, seed);
    const tag = `(draw ${i})`;
    if (!d) { fails.push(`[SEEDS] no draw ${tag}`); continue; }
    checks += 1;
    const seeds = d.seeds.map(c => pos.get(c));
    if (!same([...seeds].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8])) fails.push(`[SEEDS] the seeded clubs are positions ${seeds.join(' ')} ${tag}`);
    const inTies = d.playoffs.flatMap(t => [pos.get(t.home), pos.get(t.away)]).sort((a, b) => a - b);
    if (!same(inTies, Array.from({ length: 16 }, (_, k) => k + 9))) fails.push(`[OUT] the play-off clubs are positions ${inTies.join(' ')} ${tag}`);
    d.playoffs.forEach((t, slot) => {
      const [high, low] = pairs[DERIVED.feed[lineOfSeed(seeds[slot]) - 1]] ?? [[], []];
      if (!high.includes(pos.get(t.away)) || !low.includes(pos.get(t.home))) fails.push(`[PLAYOFF] slot ${slot}: seed ${seeds[slot]} is fed by ${pos.get(t.home)} against ${pos.get(t.away)} ${tag}`);
    });
    if (Math.floor(seeds.indexOf(1) / 4) === Math.floor(seeds.indexOf(2) / 4)) fails.push(`[APART] 1st and 2nd are in one half ${tag}`);
    /* Play it through on a keyed coin. Each side carries the seed of its slot: a seed passes to whoever knocks its holder out. */
    let sides = d.playoffs.map((t, slot) => ({ club: rnd() < 0.5 ? (rnd() < 0.5 ? t.home : t.away) : d.seeds[slot], seed: seeds[slot] }));
    for (const round of ['QF', 'SF']) {
      const next = [];
      for (let k = 0; k < sides.length / 2; k += 1) {
        const tie = lib.nextRoundTie(sides, k);
        const lines = [lineOfSeed(tie.home.seed), lineOfSeed(tie.away.seed)].sort().join('v');
        if (round === 'QF' && !DERIVED.meets.includes(lines)) fails.push(`[MEETS] a quarter-final pairs lines ${lines} ${tag}`);
        if ([tie.home.seed, tie.away.seed].sort().join() === '1,2') fails.push(`[APART] the seeds of 1st and 2nd meet in the ${round} ${tag}`);
        const top = round === 'QF' ? 4 : 2;
        if (!(tie.away.seed <= top && tie.away.seed < tie.home.seed)) fails.push(`[HOST] the ${round} second leg is hosted by the side carrying seed ${tie.away.seed} against ${tie.home.seed} ${tag}`);
        next.push({ club: rnd() < 0.5 ? tie.home.club : tie.away.club, seed: Math.min(tie.home.seed, tie.away.seed) });
      }
      sides = next;
    }
    if (i % 40 === 0) {
      ok(same(lib.drawUclKnockout(order, seed), d), `[SAME] the same order and seed gave two draws ${tag}`);
      const swapped = [...order]; [swapped[27], swapped[33]] = [swapped[33], swapped[27]];
      ok(same(lib.drawUclKnockout(swapped, seed), d), `[SAME] a swap between 28th and 34th moved the draw ${tag}`);
    }
    tossed.seedsHalfOne += seeds.indexOf(1) < 4 ? 1 : 0;
    tossed.tieHalfOne += d.playoffs.findIndex(t => pos.get(t.away) === 9) < 4 ? 1 : 0;
    tossed.straight += d.playoffs.some(t => pos.get(t.away) === 9 && pos.get(t.home) === 23) ? 1 : 0;
  }
  /* Three tosses a line. Each must land both ways: a toss that never turns is a bracket fixed by hand. */
  for (const [name, n] of Object.entries(tossed)) ok(n > DRAWS * 0.4 && n < DRAWS * 0.6, `[TOSS] ${name} landed one way ${n} times in ${DRAWS}`);
  console.log(`  3 ${DRAWS} draws: 1st in half one ${tossed.seedsHalfOne}, 9th's tie in half one ${tossed.tieHalfOne}, 9th drawn against 23rd ${tossed.straight}`);
  /* The two real seasons: every round of 16 tie that was played is one this draw can make from that table. */
  for (const [name, season] of Object.entries(ledger.asPlayed)) {
    const canon = n => ledger.aliases[n] ?? n;
    const order = season.table.espn.rows.map(r => r[0]);
    const made = new Set();
    for (let seed = 0; seed < 400; seed += 1) { const d = lib.drawUclKnockout(order, seed); d.playoffs.forEach((t, slot) => { made.add(`${t.home}|${d.seeds[slot]}`); made.add(`${t.away}|${d.seeds[slot]}`); }); }
    for (const tie of season.r16[0].ties) { const [x, y] = tie.map(canon); ok(made.has(`${x}|${y}`) || made.has(`${y}|${x}`), `[REAL] ${name}: ${tie.join(' against ')} was played and this draw can never make it`); }
  }
}

/* ── Section 4: the real season one field, measured (step A5) ──────────────────────────────────────── */
const ENGINE = 'src/lib/clubManager.ts';
const FIELD_LINE = 'const UCL_FIELD_SIZE = 32;';
/** The engine as it is, and a second copy of the BUNDLE (never of the source) whose field holds 36: the
 *  rule that fills the field is the engine's own, only its size is read as the league phase's. When the
 *  binding round makes the size an argument this line goes and seasonOneUclField is called with 36. */
const widePlugin = {
  name: 'cm-league-phase-field-of-36',
  setup(b) {
    b.onLoad({ filter: /clubManager[.]ts$/ }, async args => {
      const source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      const count = source.split(FIELD_LINE).length - 1;
      if (count !== 1) cannot(`section 4: "${FIELD_LINE}" is in ${ENGINE} ${count} times, it must be exactly once`);
      return { contents: source.replace(FIELD_LINE, 'const UCL_FIELD_SIZE = 36;'), loader: 'ts' };
    });
  },
};
const SAVES = 240;
async function section4() {
  const { engine } = await bundle('engine', { engine: ENGINE });
  const { engine: wide } = await bundle('engine36', { engine: ENGINE }, [widePlugin]);
  const { ucl: lib } = await bundle('ucl4', { ucl: UCL });
  const field32 = engine.seasonOneUclField('now') ?? [];
  const field = wide.seasonOneUclField('now') ?? [];
  const holder = engine.CM_FINAL_TABLES_2025_26.holders;
  ok(field32.length === 32 && field.length === 36 && new Set(field).size === 36, `[FIELD] the season one field is ${field32.length} clubs today and ${field.length} at the league phase's size`);
  ok(field32.every(c => field.includes(c)), '[FIELD] the 36 do not contain the 32');
  ok(field.includes(holder), `[FIELD] the holders (${holder}) are not in the field`);
  const added = field.filter(c => !field32.includes(c));
  const realRandom = Math.random;
  const realNow = Date.now;
  const escape = {};
  const fullest = {};
  const fullestWho = {};
  const samples = [];
  let atFloor = 0;
  let drawn = 0;
  let nations = null;
  try {
    Date.now = () => 1789430400000;
    for (let i = 0; i < SAVES; i += 1) {
      Math.random = mulberry(52000 + i);
      const state = engine.startCareer(field32[i % field32.length]);
      const seed = Math.floor(Math.random() * 4294967296);
      const strengthOf = c => engine.strengthOf(state, c);
      const assocOf = c => engine.uclClubCountry(state, c);
      if (i === 0) { nations = {}; for (const c of field) nations[assocOf(c)] = (nations[assocOf(c)] ?? 0) + 1; ok(field.every(c => assocOf(c)), `[FIELD] a club of the field has no association: ${field.filter(c => !assocOf(c)).join(', ')}`); }
      const slate = lib.drawUclLeaguePhase({ field, holder, seed, strengthOf, assocOf });
      checks += 1;
      if (!slate) { fails.push(`[FIELD] no slate for save ${i}`); continue; }
      drawn += 1;
      const names = [...new Set(slate.clubs.map(assocOf))];
      const assoc = slate.clubs.map(c => names.indexOf(assocOf(c)));
      const floor = floorOf(assoc);
      const matches = slate.fx.map(code => [Math.floor(code / 36) % 36, code % 36, Math.floor(code / 1296)]);
      for (const f of slateFaults(assoc, { matches, breaks: slate.breaks, overCap: slate.overCap, floor, fallback: slate.fallback === true })) fails.push(`${f} (save ${i})`);
      const key = `${slate.breaks} same association, ${slate.overCap} over the cap${slate.fallback ? ', the recorded pattern' : ''}`;
      escape[key] = (escape[key] ?? 0) + 1;
      if (!slate.fallback && slate.breaks === floor.breaks && slate.overCap === floor.overCap) atFloor += 1;
      fullest[floor.most[0]] = (fullest[floor.most[0]] ?? 0) + 1;
      const pots = [0, 1, 2, 3].map(p => slate.clubs.slice(p * 9, p * 9 + 9));
      const who = new Set();
      for (const pot of pots) { const n = {}; for (const c of pot) n[assocOf(c)] = (n[assocOf(c)] ?? 0) + 1; for (const [a, k] of Object.entries(n)) if (k === floor.most[0]) who.add(a); }
      for (const a of who) fullestWho[`${floor.most[0]} of ${a}`] = (fullestWho[`${floor.most[0]} of ${a}`] ?? 0) + 1;
      if (samples.length < 3) samples.push({ club: state.clubName, pots: pots.map(pot => pot.map(c => `${c} (${strengthOf(c)}, ${assocOf(c)})`)), slate });
    }
  } finally { Math.random = realRandom; Date.now = realNow; }
  ok(drawn >= 200, `[FIELD] only ${drawn} season one fields were drawn`);
  ok(drawn > 0 && atFloor / drawn >= BANDS.atFloorLeast, `[RATE] ${atFloor} of ${drawn} season one fields were drawn exactly at the counting floor`);
  const share = n => `${n} of ${drawn} (${(100 * n / Math.max(1, drawn)).toFixed(1)}%)`;
  console.log(`  4 the season one field at 36: ${Object.entries(nations ?? {}).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', ')}`);
  console.log(`  4 the 36 add to today's 32: ${added.join(', ')}. Holders: ${holder}.`);
  samples.forEach((s, i) => { console.log(`  4 sample save ${i + 1} (started at ${s.club}): ${s.slate.breaks} same association matches, ${s.slate.overCap} over the cap`); s.pots.forEach((pot, p) => console.log(`      pot ${p + 1}: ${pot.join('; ')}`)); });
  console.log(`  4 most clubs of one association in one pot, over ${drawn} seeded saves: ${Object.entries(fullest).sort().map(([k, n]) => `${k} in ${share(n)}`).join(' | ')}`);
  console.log(`  4 which association fills it: ${Object.entries(fullestWho).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`  4 THE MEASUREMENT FOR THE LEAD, slates by what the draw had to give up: ${Object.entries(escape).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${share(n)}`).join(' | ')}`);
  console.log(`  4 drawn exactly at the counting floor: ${share(atFloor)}. The critic's line for pots by squad strength is about 19 in 20 with nothing given up.`);
}

if (runs(0)) { section0(); await section0b(); }
if (runs(1)) await section1();
if (runs(2)) await section2();
if (runs(3)) await section3();
if (runs(4)) await section4();

/* ── The verdict ───────────────────────────────────────────────────────────────────────────────────── */
if (CONTROL) {
  if (!changed) { console.log(`simCmLeaguePhase control ${CONTROL}: ABORTED, the control changed nothing.`); process.exit(3); }
  const [, want, may = want] = CONTROLS[CONTROL];
  const hit = fails.filter(f => want.test(f));
  const other = fails.filter(f => !may.test(f));
  for (const f of other.slice(0, 5)) console.log(`  other: ${f}`);
  if (hit.length > 0 && other.length === 0) { console.log(`simCmLeaguePhase control ${CONTROL}: FIRED (${hit.length} of its own failures, e.g. ${hit[0]})`); process.exit(1); }
  console.log(`simCmLeaguePhase control ${CONTROL}: DID NOT FIRE CLEANLY (${hit.length} of its own failures, ${other.length} others).`); process.exit(3);
}
for (const f of fails.slice(0, 40)) console.log(`  FAIL ${f}`);
console.log(`simCmLeaguePhase: ${fails.length === 0 ? 'GREEN' : 'RED'}, ${checks} checks, ${fails.length} failed, sections ${ONLY.length ? ONLY.join(',') : 'all'}.`);
process.exit(fails.length === 0 ? 0 : 1);
