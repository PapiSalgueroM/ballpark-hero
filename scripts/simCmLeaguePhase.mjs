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
 *      semi-finals. Every source of both seasons must give the same rule.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is CM_LEAGUE_PHASE_CONTROL=<name>; it must turn its own check red (the last line says FIRED).
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
  steps: [0, /^table step [34] is /],
  feed: [0, /fed by two play-off pairings/, /fed by two play-off pairings|disagree on|is not one round of 16 tie|do not give one bracket rule|too few readings/],
  points: [0, /points are not three a win/, /points are not three a win|disagree on the points of place 1$/],
  /* Section 1. These edit the bundled source of src/lib/leagueSlate.ts: see EDITS. */
  ninth: [1, /^\[EIGHT\]/, /^\[(EIGHT|COUNT|HOMEAWAY|POT|DAY|BUDGET|RATE)\]/], sameassoc: [1, /^\[BUDGET\].*breaks/, /^\[(BUDGET|RATE)\]/],
  cap: [1, /^\[BUDGET\].*over the cap/, /^\[(BUDGET|RATE)\]/], twoaday: [1, /^\[DAY\]/, /^\[(DAY|COUNT)\]/],
  pot: [1, /^\[POT\]/, /^\[(POT|HOMEAWAY)\]/], lie: [1, /^\[COST\]/, /^\[(COST|FLOOR|BUDGET|RATE)\]/],
  nosearch: [1, /^\[RATE\].*recorded pattern/, /^\[RATE\]/],
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
/* A control runs its own section and nothing else. */
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

/* The source edits. Each target line must be in its file exactly once, or the harness refuses to run. */
const SLATE = 'src/lib/leagueSlate.ts';
const EDITS = {
  ninth: [SLATE, '        const matches = pairs.map(([h, a], e): [number, number, number] => [h, a, day[e]]);', '        const matches = pairs.map(([h, a], e): [number, number, number] => [h, a, day[e]]).concat([[pairs[0][1], pairs[0][0], (day[0] + 1) % days]]);'],
  sameassoc: [SLATE, '    if (assoc[h] === assoc[v]) return breaks < maxBreaks ? [1, 0] : null;', '    if (assoc[h] === assoc[v]) return [0, 0];'],
  cap: [SLATE, '    return over + o <= maxOver ? [0, o] : null;', '    return [0, 0];'],
  twoaday: [SLATE, '    const both = fu.filter(d => fv.includes(d));', '    const both = fu;'],
  pot: [SLATE, '    for (let i = 0; i < s; i += 1) out.push([hosts[i], guests[guestOf[i]]]);', '    for (let i = 0; i < s; i += 1) out.push(a === 0 && b === 1 ? [guests[guestOf[i]], hosts[i]] : [hosts[i], guests[guestOf[i]]]);'],
  lie: [SLATE, '    if (spec.assoc[h] === spec.assoc[a]) { breaks += 1; continue; }', '    if (spec.assoc[h] === spec.assoc[a]) { continue; }'],
  nosearch: [SLATE, '  const tries = spec.tries ?? 20;', '  const tries = 0;'],
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
async function bundle(name, entries) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `cm-league-phase-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [editPlugin] });
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

if (runs(0)) section0();
if (runs(1)) await section1();

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
