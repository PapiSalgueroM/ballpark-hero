/* NFL Front Office: one rating per man, and an order that agrees with the field. Round 1130.

   WHAT WAS WRONG. One man had three numbers. The starters file printed the
   selection rule's seed (Ashton Jeanty 90), the depth file carried an override
   that every new franchise read instead (65), and NFL Conquest typed a third
   (86). And the number a franchise actually opened on read how well a man
   played and never how much, so a back who carried the load all year sat
   under a fullback.

   WHAT THIS HARNESS READS. What SHIPS: the committed data files, parsed as
   text (and, from section 7 on, the real engine bundled with esbuild). It
   compares them with MAIN, where main is not a checkout but the frozen arm:
   bakeFromRecord(record, meta, held, { ratingModel: 'v2.2' }), the new file
   shape carrying the checkpoint's own numbers. The suite's board league
   digests (src/lib/frontOfficeRatings.test.ts) are what make that arm honest:
   they prove it deals main's board league byte for byte.

   SECTIONS
     0  the inputs are there and counted. Men per tier, evidence rows per
        club. Any count at zero stops the run red: it cannot pass empty.
     1  ONE NUMBER. For every man of every club, every number a shipped file
        prints for him: his starters row, his bench row, his practice row, his
        lineage's openingOvr, and any fullOpening entry found in the depth
        file's text. The count of men with two different numbers, or on two
        rows, is 0. Main's own count is printed beside it (the seed against
        the override, measured from the seed bake and the frozen arm, never
        typed). NFL Conquest is on the second branch of this round, so its
        disagreement with the roster is PRINTED here as the recorded "from"
        and not asserted; the same sport neutral comparer prints NBA Conquest
        against NBA Front Office for whichever round unifies that pair.

   CONTROLS, SIM_FO_ORDER_CONTROL=<name>. Each patches what a section READS
   (loaded text or loaded objects, never a file on disk), first asserts its
   anchor is present exactly once, and the run then exits 0 only when exactly
   the named sections went red, printing "control <name> fired: sections ...".
   A control that changed nothing exits 1.
     override   puts a fullOpening block back into the loaded depth text for
                Las Vegas with Ashton Jeanty at 65              -> section 1

   MEASURED, 2026-10-08, step 3 of the round (the starters file carries the
   checkpoint's own numbers, no layer yet): 2,163 men, 480 starters rows,
   1,158 bench rows, 525 practice rows, 2,163 lineage rows; 0 men with two
   numbers; on main 459 of the 480 fifteen had two (seed against override).

   Run time: about two seconds. Offline: it reads committed files only. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeFromRecord, readTeamMeta, RECORD, SPOT_CHECK } from './genFrontOfficeRoster.mjs';
import { compareNumbers, strangers } from './lib/oneNumber.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_FO_ORDER_CONTROL || '';
const CONTROLS = { override: [1] };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`unknown control ${CONTROL}`); process.exit(1); }
const norm = t => t.split('\r\n').join('\n');
const read = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
/** A guard reads the code, not the comments: block and line comments are stripped before any text is parsed. */
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const red = new Map();
let checks = 0;
const ok = (section, label, pass, detail = '') => {
  checks += 1;
  if (!pass) { red.set(section, [...(red.get(section) ?? []), `${label}${detail ? ': ' + detail : ''}`]); console.log(`   FAIL [${section}] ${label}${detail ? ': ' + detail : ''}`); }
};
/** Replace one anchor in a loaded text, refusing unless it is there exactly once. */
const patchOnce = (text, anchor, replacement, name) => {
  const n = text.split(anchor).length - 1;
  if (n !== 1) throw new Error(`control ${name}: its anchor occurs ${n} times in what the section reads, expected exactly once, so the control would prove nothing`);
  return text.replace(anchor, () => replacement);
};

/* ---- what ships, as text ------------------------------------------------- */
const startersText = stripComments(read('src/data/frontOfficePlayers.ts'));
let depthText = stripComments(read('src/data/frontOfficeDepth.ts'));
if (CONTROL === 'override') {
  depthText = patchOnce(depthText, "  LV: {\n    bench: [", "  LV: {\n    fullOpening: {\n      'Ashton Jeanty|RB': { ovr: 65, salary: 1.2 },\n    },\n    bench: [", 'override');
  console.log('   control override: Las Vegas carries a fullOpening block again, Ashton Jeanty at 65');
}

const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const unq = s => s.replace(/\\(.)/g, '$1');
const ROW_RE = new RegExp(`^\\s*\\{ name: ${STR}, pos: '(\\w+)', age: (\\d+), ovr: (\\d+), salary: ([\\d.]+), years: (\\d+) \\},?$`);
const TEAM_RE = new RegExp(`^  \\{ abbr: ${STR}, city: ${STR}, name: ${STR}, `);
const EVIDENCE_RE = new RegExp(`^\\s*${STR}: \\{ modelVersion: FO_OPENING_RATING_VERSION, openingWindow: FO_OPENING_RATING_WINDOW, originKey: ${STR}, openingOvr: (\\d+), basis: ${STR}, partial: (true|false), partialReasons: \\[(.*)\\] \\},$`);
const OVERRIDE_RE = new RegExp(`^\\s*${STR}: \\{ ovr: (\\d+), salary: ([\\d.]+) \\},$`);
const rowOf = m => ({ name: unq(m[1]), pos: m[2], age: Number(m[3]), ovr: Number(m[4]), salary: Number(m[5]), years: Number(m[6]) });

/** The starters file: club -> rows, in file order. */
function parseStarters(text) {
  const clubs = new Map();
  let club = null;
  for (const line of text.split('\n')) {
    const t = line.match(TEAM_RE);
    if (t) { club = unq(t[1]); clubs.set(club, []); continue; }
    const r = line.match(ROW_RE);
    if (r && club) clubs.get(club).push(rowOf(r));
  }
  return clubs;
}
/** The depth file: club -> { bench, practice, evidence, override }. */
function parseDepth(text) {
  const clubs = new Map();
  let club = null, part = null;
  for (const line of text.split('\n')) {
    const c = line.match(/^  ([A-Z]{2,3}): \{$/);
    if (c) { club = c[1]; clubs.set(club, { bench: [], practice: [], evidence: new Map(), override: new Map() }); part = null; continue; }
    if (!club) continue;
    const p = line.match(/^    (bench|practice|fullOpening|ratingEvidence): [[{]$/);
    if (p) { part = p[1]; continue; }
    if (/^    [\]}],$/.test(line)) { part = null; continue; }
    const d = clubs.get(club);
    if (part === 'bench' || part === 'practice') { const r = line.match(ROW_RE); if (r) d[part].push(rowOf(r)); }
    else if (part === 'ratingEvidence') { const e = line.match(EVIDENCE_RE); if (e) d.evidence.set(unq(e[1]), { originKey: unq(e[2]), openingOvr: Number(e[3]), basis: unq(e[4]), partial: e[5] === 'true', partialReasons: e[6] }); }
    else if (part === 'fullOpening') { const o = line.match(OVERRIDE_RE); if (o) d.override.set(unq(o[1]), Number(o[2])); }
  }
  return clubs;
}
const starters = parseStarters(startersText);
const depth = parseDepth(depthText);

/* ---- main, as the frozen arm ---------------------------------------------- */
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const heldOut = JSON.parse(fs.readFileSync(SPOT_CHECK, 'utf8')).heldOut ?? [];
const meta = readTeamMeta(read('src/data/frontOfficePlayers.ts'));
const frozen = bakeFromRecord(record, meta, heldOut, { ratingModel: 'v2.2' });
if (frozen.ratingProblem) { console.error(`FAIL: the frozen arm refused to bake: ${frozen.ratingProblem}`); process.exit(1); }

/* ---- 0. the inputs are there and counted --------------------------------- */
console.log('0) the inputs are there and counted');
const count = { clubs: starters.size, starters: 0, bench: 0, practice: 0, evidence: 0 };
for (const rows of starters.values()) count.starters += rows.length;
for (const d of depth.values()) { count.bench += d.bench.length; count.practice += d.practice.length; count.evidence += d.evidence.size; }
const frozenMen = frozen.teams.reduce((n, t) => n + t.players.length, 0) + frozen.depth.reduce((n, d) => n + d.bench.length + d.practice.length, 0);
console.log(`   ${count.clubs} clubs; starters rows ${count.starters}, bench rows ${count.bench}, practice rows ${count.practice}, lineage rows ${count.evidence}; the frozen arm holds ${frozenMen} men`);
for (const [what, n] of Object.entries({ ...count, frozenMen })) {
  if (!n) { console.error(`FAIL [0] ${what} is ${n}: the harness read nothing there, so nothing below was measured`); process.exit(1); }
}
ok(0, 'thirty two clubs in both files', starters.size === 32 && depth.size === 32, `${starters.size} and ${depth.size}`);
ok(0, 'fifteen starters rows a club', [...starters.values()].every(rows => rows.length === 15));
ok(0, 'every man of the frozen arm has a row and a lineage row', count.starters + count.bench + count.practice === frozenMen && count.evidence === frozenMen,
  `${count.starters + count.bench + count.practice} rows and ${count.evidence} lineage rows against ${frozenMen} men`);

/* ---- 1. ONE NUMBER -------------------------------------------------------- */
console.log('1) one number per man');
const printed = [];           // every number a shipped file prints, keyed club|name|pos
const rowsPerMan = new Map(); // club|name|pos -> how many ROWS carry him (must be one)
const put = (club, name, pos, where, number) => printed.push({ key: `${club}|${name}|${pos}`, where, number });
for (const [club, rows] of starters) for (const p of rows) { put(club, p.name, p.pos, 'starters row', p.ovr); rowsPerMan.set(`${club}|${p.name}|${p.pos}`, (rowsPerMan.get(`${club}|${p.name}|${p.pos}`) ?? 0) + 1); }
for (const [club, d] of depth) {
  for (const tier of ['bench', 'practice']) for (const p of d[tier]) { put(club, p.name, p.pos, `${tier} row`, p.ovr); rowsPerMan.set(`${club}|${p.name}|${p.pos}`, (rowsPerMan.get(`${club}|${p.name}|${p.pos}`) ?? 0) + 1); }
  for (const [nameAndPos, e] of d.evidence) printed.push({ key: `${club}|${nameAndPos}`, where: 'lineage', number: e.openingOvr });
  for (const [nameAndPos, ovr] of d.override) printed.push({ key: `${club}|${nameAndPos}`, where: 'fullOpening', number: ovr });
}
const numbersOf = new Map();
for (const p of printed) numbersOf.set(p.key, [...(numbersOf.get(p.key) ?? []), p]);
const twoNumbers = [...numbersOf].filter(([, list]) => new Set(list.map(p => p.number)).size > 1);
const twoRows = [...rowsPerMan].filter(([, n]) => n !== 1);
const noRow = [...numbersOf.keys()].filter(key => !rowsPerMan.has(key));
const noLineage = [...rowsPerMan.keys()].filter(key => !numbersOf.get(key).some(p => p.where === 'lineage'));
const overrides = [...depth.values()].reduce((n, d) => n + d.override.size, 0);
ok(1, 'no man has two different numbers across the shipped files', twoNumbers.length === 0,
  twoNumbers.slice(0, 5).map(([key, list]) => `${key}: ${list.map(p => `${p.where} ${p.number}`).join(', ')}`).join('; '));
ok(1, 'every man sits on exactly one row', twoRows.length === 0, twoRows.slice(0, 5).map(([key, n]) => `${key} on ${n} rows`).join('; '));
ok(1, 'every lineage row names a man who has a row, and every row has a lineage row', noRow.length === 0 && noLineage.length === 0, [...noRow, ...noLineage].slice(0, 5).join('; '));
ok(1, 'the depth file carries no fullOpening override', overrides === 0 && !/fullOpening/.test(depthText), `${overrides} override entries`);
/* main's count, measured: the fifteen whose seed number (the starters file main shipped) differs from the number
   the board read through the override (the frozen arm) */
const frozenOvr = new Map(frozen.teams.flatMap(t => t.players.map(p => [`${t.abbr}|${p.name}|${p.pos}`, p.ovr])));
const mainTwo = frozen.seedTeams.reduce((n, t) => n + t.players.filter(p => frozenOvr.get(`${t.abbr}|${p.name}|${p.pos}`) !== p.ovr).length, 0);
console.log(`   men with two numbers: ${twoNumbers.length} shipped (${numbersOf.size} men, ${printed.length} printed numbers); on main ${mainTwo} of the ${frozen.seedTeams.length * 15} fifteen had two (the seed on the row, another through the override)`);

/* NFL Conquest against the roster, PRINTED ONLY on this branch (the second branch of the round derives Conquest's
   ten from the bake and turns these counts into assertions at zero). */
{
  const QUOTED = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
  const conquestSrc = stripComments(read('src/data/conquestData.ts'));
  const block = conquestSrc.slice(conquestSrc.indexOf('export const NFL_TEAMS'), conquestSrc.indexOf('export const TEAM_MAP'));
  const conquest = [];
  let club = null;
  for (const line of block.split('\n')) {
    const t = line.match(/^  \{ id: '([A-Z]{2,3})', /);
    if (t) { club = t[1] === 'LAR' ? 'LA' : t[1]; continue; }
    const r = line.match(new RegExp(`^\\s*\\{ name: ${QUOTED}, position: '(\\w+)', overall: (\\d+), keyStat: `));
    if (r && club) conquest.push({ game: 'NFL Conquest', club, name: unq(r[1] ?? r[2]), number: Number(r[4]) });
  }
  const active = [], everyone = [];
  for (const [c, rows] of starters) for (const p of rows) { active.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr }); everyone.push(active[active.length - 1]); }
  for (const [c, d] of depth) {
    for (const p of d.bench) { active.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr }); everyone.push(active[active.length - 1]); }
    for (const p of d.practice) everyone.push({ game: 'NFL Front Office', club: c, name: p.name, number: p.ovr });
  }
  const pair = compareNumbers([conquest, everyone]);
  const { elsewhere, nowhere } = strangers(conquest, everyone);
  const freeAgents = [];
  for (const [file, from, to] of [['src/data/conquestData.ts', 'export const CONQUEST_FREE_AGENCY_POOL', '];'], ['src/data/conquestPowerups.ts', 'export const FREE_AGENTS', '];']]) {
    const text = stripComments(read(file));
    const start = text.indexOf(from), list = text.slice(start, text.indexOf(to, start));
    for (const m of list.matchAll(new RegExp(`\\{ name: ${QUOTED}, position: '(\\w+)', overall: (\\d+)`, 'g'))) freeAgents.push({ file, name: unq(m[1] ?? m[2]), number: Number(m[4]) });
  }
  const rostered = freeAgents.filter(f => everyone.some(p => p.name === f.name));
  if (!conquest.length || !freeAgents.length) { console.error('FAIL [1] the Conquest rows or the free agent lists did not parse, so the recorded "from" would be empty'); process.exit(1); }
  console.log(`   NFL Conquest, printed and not asserted on this branch: ${conquest.length} typed men; ${pair.sameNumber.length + pair.twoNumbers.length} on the same club in the roster, of whom ${pair.twoNumbers.length} print another number there; ${elsewhere.length} are on another club; ${nowhere.length} are in no club's game roster (reserve list men, name variants, unsigned men); ${rostered.length} of ${freeAgents.length} free agent rows name a rostered man (${rostered.map(f => `${f.name} ${f.number}`).join(', ') || 'none'})`);
}

/* ---- report ---------------------------------------------------------------- */
const redSections = [...red.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const fired = redSections.length === want.length && want.every(s => red.has(s));
  console.log(`control ${CONTROL} ${fired ? 'fired' : 'DID NOT fire as designed'}: sections ${redSections.join(', ') || 'none'} went red, expected exactly ${want.join(', ')}`);
  process.exit(fired ? 0 : 1);
}
if (redSections.length) {
  console.error(`simFoRatingOrder: RED in section${redSections.length === 1 ? '' : 's'} ${redSections.join(', ')} (${[...red.values()].flat().length} of ${checks} checks failed)`);
  process.exit(1);
}
console.log(`simFoRatingOrder: green, ${checks} checks. One number per man: ${numbersOf.size} men, 0 with two numbers (main: ${mainTwo}).`);
