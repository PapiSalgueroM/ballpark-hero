/**
 * Round 453 harness: a flag beside every nationality the site prints, never a
 * country code standing in for a country name, and confederation groups
 * wherever a nationality list gets long.
 *
 * The owner's 2026-08-28 review (docs/TWEAKS-2026-08-28.md line 87): flags,
 * never country abbreviations, everywhere on the site, and region groupings
 * by confederation where lists get long.
 *
 * Measured before Round 453: seventeen render sites printed a player's
 * nationality as bare text (CareerLadder, GauntletDraft, GolfHigherLower,
 * GuessTheGolfer twice, GuessTransferValue, HigherLower, PlayerStockMarket,
 * SearchAndDiscard, SoccerCareer three times, SportsBingo, the fantasy draft
 * PlayerPool, SoccerGridSearch, UfcFighterSearch), plus two "Did you know"
 * lines in HockeyCareer and NbaCareer that print `country`. After: zero.
 *
 * SECTION 1  Every JSX expression that prints a `.nationality` or `.country`
 *            field has <FlagImg> or <FlagFromEmoji> on the same line or the
 *            line before. Every bare site is reported by file and line.
 * SECTION 2  No three letter country code is ever a nationality's whole
 *            value: no `nationality: 'ARG'` shaped literal in src/data or
 *            src/lib, no JSX print of a code field, and Dart Draft's WEDGES
 *            table (the one place that carries ENG, BRA, ARG, FRA and ESP, as
 *            internal short keys nothing paints) is never referenced from a
 *            page or component.
 * SECTION 3  Confederation groups: every nation in Soccer Career's picker and
 *            every nationality string in the four market maps belongs to
 *            exactly one confederation, the picker covers all six, and both
 *            grouped lists exist in source.
 *
 * It reads code, not comments: block and line comments are blanked before any
 * matching, and CRLF is normalised first because a fresh checkout is CRLF.
 * It refuses to run if the Round 453 rewrite is not in the tree (the pinned
 * sites below) or if the scanner finds fewer print sites than it did the day
 * it was written, because either way green would prove nothing.
 *
 * What it cannot see: a nationality built into a plain string (a clue array,
 * share text) and rendered later. GuessTheGolfer's clue list was exactly
 * that shape before Round 453 and is JSX now. A future game that prints a
 * nationality through a string array will not be caught here.
 *
 * Run: node scripts/simNationalityFlags.mjs
 * NEGATIVE CONTROL: NATIONALITY_FLAGS_CONTROL=bare puts one site back to bare
 *   text in memory; section 1 must go red and name the file and line.
 * NEGATIVE CONTROL: NATIONALITY_FLAGS_CONTROL=code writes a three letter code
 *   into a nationality literal in memory; section 2 must go red.
 * NEGATIVE CONTROL: NATIONALITY_FLAGS_CONTROL=confed drops one nation from the
 *   confederation table in memory; section 3 must go red.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NATIONALITY_FLAGS_CONTROL || '';
const CONTROLS = ['bare', 'code', 'confed'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`NATIONALITY_FLAGS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error('simNationalityFlags: REFUSING TO RUN. ' + m); process.exit(2); };

const norm = s => s.replace(/\r\n?/g, '\n');
const read = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
/* Blank comments in place so line numbers survive: a block comment keeps its
   newlines, a line comment (a // that is not part of a URL) loses its text. */
const stripComments = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[\s(,{=])\/\/.*$/gm, '$1');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) out.push(rel);
  }
  return out;
};

console.log('simNationalityFlags');

/* ─── Refuse to run on a tree without the rewrite ─────────────────────────── */

const PINS = [
  ['src/pages/CareerLadder.tsx', /<FlagImg name=\{activePlayer\.nationality\}[^>]*showLabel/],
  ['src/pages/GauntletDraft.tsx', /<FlagImg name=\{p\.nationality\}[^>]*showLabel/],
  ['src/pages/GolfHigherLower.tsx', /<FlagImg name=\{player\.nationality\}[^>]*showLabel/],
  ['src/pages/GuessTheGolfer.tsx', /<FlagImg name=\{g\.nationality\}[^>]*showLabel/],
  ['src/pages/GuessTheGolfer.tsx', /<FlagImg name=\{golfer\.nationality\}[^>]*showLabel/],
  ['src/pages/GuessTransferValue.tsx', /<FlagImg name=\{target\.nationality\}[^>]*showLabel/],
  ['src/pages/HigherLower.tsx', /<FlagImg name=\{player\.nationality\}[^>]*showLabel/],
  /* PlayerStockMarket.tsx carried a pin here until Round 458 rebuilt the game
     in the owner's format, where a card shows numbers only and never a name,
     club, country or flag, so the page no longer prints a nationality at all
     and there is nothing on it for this harness to hold. The pin refused the
     whole run for a day before anyone read the reason. */
  ['src/pages/SearchAndDiscard.tsx', /<FlagImg name=\{p\.nationality\}[^>]*showLabel/],
  ['src/pages/SoccerCareer.tsx', /<strong><FlagImg name=\{career\.nationality\}[^>]*showLabel/],
  ['src/pages/SoccerCareer.tsx', /Age \{career\.age\} · <FlagImg name=\{career\.nationality\}[^>]*showLabel/],
  ['src/pages/SportsBingo.tsx', /<FlagImg name=\{p\.nationality\}[^>]*showLabel/],
  ['src/components/fantasy-draft/PlayerPool.tsx', /<FlagImg name=\{player\.nationality\}[^>]*showLabel/],
  ['src/components/soccer-grid/SoccerGridSearch.tsx', /<FlagImg name=\{p\.nationality\}[^>]*showLabel/],
  ['src/components/ufc/UfcFighterSearch.tsx', /<FlagImg name=\{fighter\.nationality\}[^>]*showLabel/],
  ['src/pages/HockeyCareer.tsx', /<FlagImg name=\{player!\.country\}[^>]*showLabel/],
  ['src/pages/NbaCareer.tsx', /<FlagImg name=\{player!\.country\}[^>]*showLabel/],
];
for (const [file, rx] of PINS) {
  if (!rx.test(stripComments(read(file)))) refuse(`${file} does not carry its Round 453 flag (${rx}), so the rewrite is not in this tree and there is nothing to measure`);
}

/* Measured on 2026-09-05 with the rewrite in: 67 print sites across 35 files
   (the flag component's own name= counts, since with showLabel it IS the
   print). Well under that means the scanner is broken, not that the site
   stopped printing nations. */
const SITE_FLOOR = 45;

/* ─── Section 1: every printed nationality wears a flag ───────────────────── */

const UI_FILES = [...walk('src/pages'), ...walk('src/components')].filter(f => f.endsWith('.tsx'));
const sources = new Map(UI_FILES.map(f => [f, read(f)]));

let controlTarget = null;
if (CONTROL === 'bare') {
  const file = 'src/pages/HigherLower.tsx';
  const old = '<FlagImg name={player.nationality} size={12} showLabel />';
  const src = sources.get(file);
  if (!src || !src.includes(old)) refuse(`the bare control has nothing to undo: ${file} does not contain "${old}"`);
  const idx = src.indexOf(old);
  sources.set(file, src.replace(old, 'player.nationality'));
  controlTarget = `${file}:${lineOf(src, idx)}`;
  console.log(`   NEGATIVE CONTROL ON: ${controlTarget} prints its nationality bare in memory, section 1 must name it`);
}

const MEMBER = String.raw`[\w!?.]*\.(?:nationality|country)`;
const RX = {
  member: /\.(?:nationality|country)\b/g,
  plain: new RegExp(`^\\s*${MEMBER}\\s*$`),
  fallback: new RegExp(`^\\s*${MEMBER}\\s*(?:\\?\\?|\\|\\|)`),
  ternary: new RegExp(`[?:]\\s*${MEMBER}\\s*(?::|$)`),
  template: new RegExp(`\\$\\{\\s*${MEMBER}\\s*\\}`),
  objectLike: /^\s*(?:[{[]|\w+\s*:)/,
  attr: /(\w+)\s*=\s*$/,
  flag: /<(?:FlagImg|FlagFromEmoji)\b/,
  flagTag: /<(?:FlagImg|FlagFromEmoji)\b[^<>]*$/,
};
const LIST = process.env.NATIONALITY_FLAGS_LIST === '1';
/* Props that a component prints as text. Any other attribute carrying a
   nationality (name=, nation=, key=, value on an option) is a pass-through
   and is judged where it is printed, not here. */
const DISPLAY_ATTRS = new Set(['value', 'label', 'funFact', 'statLine', 'headline', 'title', 'subtitle', 'text', 'description', 'children', 'hint', 'caption']);

function enclosing(line, idx) {
  let depth = 0;
  for (let k = idx - 1; k >= 0; k--) {
    const ch = line[k];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) return k; depth--; }
  }
  return -1;
}
function closing(line, open) {
  let depth = 0;
  for (let k = open; k < line.length; k++) {
    if (line[k] === '{') depth++;
    else if (line[k] === '}') { depth--; if (depth === 0) return k; }
  }
  return line.length;
}
const isPrint = c => !RX.objectLike.test(c) && (RX.plain.test(c) || RX.fallback.test(c) || RX.ternary.test(c) || RX.template.test(c));

/** Every JSX expression on this line that prints a nationality field. */
function printSites(line) {
  const sites = [];
  const seen = new Set();
  for (const m of line.matchAll(RX.member)) {
    let open = enclosing(line, m.index);
    if (open < 0) continue;
    if (line[open - 1] === '$') { open = enclosing(line, open - 1); if (open < 0) continue; }
    if (seen.has(open)) continue;
    seen.add(open);
    const content = line.slice(open + 1, closing(line, open));
    const before = line.slice(0, open);
    const attr = RX.attr.exec(before)?.[1];
    if (attr) {
      /* name= on the flag component IS the print: with showLabel it draws the
         flag and the name, without it the name sits beside it. Either way it
         is a site, and one that carries its flag by construction. */
      if (RX.flagTag.test(before)) { sites.push(content.trim()); continue; }
      if (!DISPLAY_ATTRS.has(attr)) continue;
    }
    if (!isPrint(content)) continue;
    sites.push(content.trim());
  }
  return sites;
}

let totalSites = 0;
const filesWithSites = new Set();
const bare = [];
for (const [file, raw] of sources) {
  const lines = stripComments(raw).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const sites = printSites(lines[i]);
    if (!sites.length) continue;
    totalSites += sites.length;
    filesWithSites.add(file);
    let prev = i - 1;
    while (prev >= 0 && !lines[prev].trim()) prev--;
    const flagged = RX.flag.test(lines[i]) || (prev >= 0 && RX.flag.test(lines[prev]));
    if (LIST) for (const s of sites) console.log(`   ${flagged ? 'flag' : 'BARE'} ${file}:${i + 1} {${s}}`);
    if (!flagged) for (const s of sites) bare.push(`${file}:${i + 1} prints {${s}} with no flag beside it`);
  }
}
if (totalSites < SITE_FLOOR) refuse(`the scanner found ${totalSites} nationality print sites, under the ${SITE_FLOOR} floor measured when it was written, so it is not reading the tree it thinks it is`);
for (const b of bare) fail(b);
if (!bare.length) console.log(`1. Flags: ${totalSites} print sites across ${filesWithSites.size} files, every one with a flag on its line or the line before (${PINS.length} Round 453 sites pinned)`);

/* ─── Section 2: never a three letter code where a country name belongs ──── */

const DATA_FILES = [...walk('src/data'), ...walk('src/lib')];
const dataSources = new Map(DATA_FILES.map(f => [f, read(f)]));
if (CONTROL === 'code') {
  const file = 'src/data/golfLegends.ts';
  const old = "nationality: 'Argentina'";
  const src = dataSources.get(file);
  if (!src || !src.includes(old)) refuse(`the code control has nothing to rewrite: ${file} does not contain "${old}"`);
  dataSources.set(file, src.replace(old, "nationality: 'ARG'"));
  console.log(`   NEGATIVE CONTROL ON: ${file} carries nationality: 'ARG' in memory, section 2 must go red`);
}
/* "USA" is the site's own name for the country (it is in Soccer Career's
   picker) and "UAE" is how the club table names Al Ain's country. A short
   name is tolerated only while it wears a flag: each of these must be a
   FLAG_CODES key, or it is a code standing in for a name after all. */
const NAME_NOT_CODE = new Set(['USA', 'UAE']);
const flagSrc = stripComments(read('src/components/FlagImg.tsx'));
const flagBlock = flagSrc.slice(flagSrc.indexOf('export const FLAG_CODES'), flagSrc.indexOf('};', flagSrc.indexOf('export const FLAG_CODES')));
const flagKeys = new Set([...flagBlock.matchAll(/"((?:[^"\\]|\\.)*)":\s*"/g)].map(m => m[1]));
if (flagKeys.size < 150) refuse(`only ${flagKeys.size} FLAG_CODES keys read from FlagImg.tsx, the parse is off`);
for (const n of NAME_NOT_CODE) if (!flagKeys.has(n)) fail(`${n} is tolerated as a short country name but has no flag in FLAG_CODES, so it is a bare code on screen`);
const codeLiteral = /\b(?:nationality|country|nation)\s*:\s*(['"])([A-Z]{3})\1/g;
let literals = 0;
for (const [file, raw] of dataSources) {
  const code = stripComments(raw);
  for (const m of code.matchAll(/\b(?:nationality|country|nation)\s*:\s*(['"])(?:[^'"\\]|\\.)*\1/g)) literals += 1;
  for (const m of code.matchAll(codeLiteral)) {
    if (NAME_NOT_CODE.has(m[2])) continue;
    fail(`${file}:${lineOf(code, m.index)} sets ${m[0]}, a three letter code where a country name belongs`);
  }
}
const codeField = /\{[^{}]*\.(?:iso3|alpha3|countryCode|nationCode|natCode|nationalityCode|code3)\b[^{}]*\}/;
for (const [file, raw] of sources) {
  const lines = stripComments(raw).split('\n');
  lines.forEach((l, i) => { if (codeField.test(l)) fail(`${file}:${i + 1} prints a country code field as text`); });
  if (/\bWEDGES\b/.test(stripComments(raw))) fail(`${file} references WEDGES, whose short keys are three letter country codes; if they are painted now they must become flags and names`);
}
const wedgeShorts = (stripComments(dataSources.get('src/lib/dartDraft.ts') ?? '').match(/short:\s*'[A-Z]{3}'/g) ?? []).length;
if (failures === 0 || CONTROL === 'code') console.log(`2. Codes: ${literals} nationality literals in src/data and src/lib, none a three letter code; WEDGES (${wedgeShorts} three letter shorts) stays inside dartDraft.ts, unreferenced by any page or component`);

/* ─── Section 3: confederation groups ─────────────────────────────────────── */

const ENTRY = path.join(os.tmpdir(), 'confedEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'confed.bundle.mjs');
const rootUrl = ROOT.replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { confederationFor, groupByConfederation, DISPLAY_CONFED, CONFEDERATION_ORDER } from '${rootUrl}/src/lib/confederationGroups.ts';
export { NATION_CONFED } from '${rootUrl}/src/lib/soccerInternational.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --loader:.tsx=tsx --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const M = await import(pathToFileURL(BUNDLE).href);

if (CONTROL === 'confed') {
  if (!('Argentina' in M.NATION_CONFED)) refuse('the confed control has nothing to drop: Argentina is not in NATION_CONFED');
  delete M.NATION_CONFED.Argentina;
  console.log('   NEGATIVE CONTROL ON: Argentina dropped from the confederation table in memory, section 3 must go red');
}

for (const [name, conf] of Object.entries(M.DISPLAY_CONFED)) {
  if (name in M.NATION_CONFED && M.NATION_CONFED[name] !== conf) fail(`${name} sits in ${M.NATION_CONFED[name]} for qualifying and ${conf} for display, two confederations for one nation`);
}

const sc = stripComments(read('src/pages/SoccerCareer.tsx'));
const pStart = sc.indexOf('const NATIONALITIES = [');
if (pStart < 0) refuse('SoccerCareer.tsx no longer declares NATIONALITIES where this harness reads it');
const picker = [...sc.slice(pStart, sc.indexOf('];', pStart)).matchAll(/"([^"]+)"/g)].map(m => m[1]);
if (picker.length < 100) refuse(`only ${picker.length} names read from the Soccer Career picker, the parse is off`);

const marketText = stripComments(read('src/data/playerNationalities.ts'));
const market = [...new Set([...marketText.matchAll(/:\s*'((?:[^'\\]|\\.)*)',?\s*$/gm)].map(m => m[1].replace(/\\'/g, "'")))];
if (market.length < 100) refuse(`only ${market.length} distinct nationalities read from the market maps, the parse is off`);

function checkGrouping(label, names) {
  const groups = M.groupByConfederation(names, n => n);
  const placed = groups.reduce((s, g) => s + g.items.length, 0);
  if (placed !== names.length) fail(`${label}: ${names.length} names in, ${placed} placed`);
  const seen = new Set();
  for (const g of groups) for (const n of g.items) { if (seen.has(n)) fail(`${label}: ${n} lands in more than one group`); seen.add(n); }
  const other = groups.find(g => g.conf === 'other');
  if (other) fail(`${label}: ${other.items.length} with no confederation, which would shove them into an "Elsewhere" group: ${other.items.join(', ')}`);
  for (const n of names) if (!M.confederationFor(n)) fail(`${label}: ${n} has no confederation`);
  return groups;
}
const pickerGroups = checkGrouping('Soccer Career picker', picker);
const missingConf = M.CONFEDERATION_ORDER.filter(c => !pickerGroups.some(g => g.conf === c));
if (missingConf.length) fail(`the picker has no nation under ${missingConf.join(', ')}`);
checkGrouping('market nationalities', market);

if (!/groupByConfederation\(NATIONALITIES/.test(sc) || !/<SelectGroup\b/.test(sc)) fail('SoccerCareer.tsx no longer renders the picker in confederation groups');
const ts = stripComments(read('src/components/club-manager/TransferScreen.tsx'));
if (!/groupByConfederation\(marketNations/.test(ts) || !/<optgroup\b/.test(ts)) fail('TransferScreen.tsx no longer renders the nationality filter in confederation groups');

if (failures === 0) console.log(`3. Confederations: ${picker.length} picker nations and ${market.length} market nationalities each in exactly one of six groups (picker: ${pickerGroups.map(g => `${g.conf} ${g.items.length}`).join(', ')}); grouped in SoccerCareer's picker and TransferScreen's filter`);

/* ─── Verdict ─────────────────────────────────────────────────────────────── */

console.log('');
if (CONTROL === 'bare') {
  const named = bare.some(b => b.startsWith(controlTarget + ' '));
  if (named) { console.log(`simNationalityFlags control: green. The bare site was reported and named as ${controlTarget} (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simNationalityFlags control: RED. ${controlTarget} printed its nationality bare and section 1 did not name it, so green proves nothing.`);
  process.exit(1);
}
if (CONTROL === 'code') {
  if (failures > 0) { console.log(`simNationalityFlags control: green. The three letter code was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simNationalityFlags control: RED. A nationality set to a three letter code went unreported.');
  process.exit(1);
}
if (CONTROL === 'confed') {
  if (failures > 0) { console.log(`simNationalityFlags control: green. The nation with no confederation was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simNationalityFlags control: RED. A nation dropped from the confederation table went unreported.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`simNationalityFlags: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNationalityFlags: green. Every nationality the site prints wears its flag, no code stands in for a name, and the long lists sit under their confederation.');
