/**
 * ROUND 526: the search keyword index, generated, never typed.
 *
 * WHY THIS FILE EXISTS AT ALL. /search ranks games on what the registry
 * already knows (label, path, sport, one line description). That covers a
 * player who half remembers a name and misses a player who remembers the
 * MECHANIC: "wheel", "auction", "envelope", "relegation". Every one of those
 * words is already written down, in src/data/gameContent/, which is roughly
 * 344KB of source and 101KB gzipped.
 *
 * THE TRAP THIS AVOIDS. Round 210 deliberately split that prose into lazy per
 * sport bundles so a soccer page stops paying for the hockey copy (read the
 * header of src/data/gameContent/loader.ts). A search page that imported the
 * merged map to read its words would undo that outright and hand every visitor
 * the whole 344KB on the home route. So the prose is read HERE, at build time,
 * reduced to a handful of words per game, and written to a small JSON file that
 * the app can afford to load. The full guides stay lazy.
 *
 * WHAT A KEYWORD HAS TO EARN. Three filters, and all three exist because the
 * first draft without them was full of noise:
 *
 *   1. It must appear at least twice in that game's own guide. A player name
 *      dropped once into a worked example ("Gehrig") is not what the game is
 *      about; a mechanic the guide keeps coming back to is.
 *   2. It must be rare across the site. A word in a third of the guides
 *      separates nothing, it just adds bytes to every query.
 *   3. It must not already be in the game's label or description, because the
 *      registry carries those to the browser anyway and the engine already
 *      scores them higher than any keyword.
 *
 * Only intro, howToPlay and rules are read. The example, tips and FAQ sections
 * are where the real names and the one off anecdotes live, and those are the
 * tokens that looked worst in the first draft.
 *
 * Run: node scripts/genSearchKeywords.mjs
 * Guarded by: scripts/simSiteSearch.mjs (section 7 fails if a registry game
 * has no entry here, which is what happens when a new game ships and nobody
 * reruns this).
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileAtomic } from './lib/atomicWrite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/data/searchKeywords.json');
const CONTENT_DIR = path.join(ROOT, 'src/data/gameContent');

/* Tuning, every number measured rather than felt. See the console summary at
   the bottom of a run: it prints the coverage and the mean keyword count, so a
   change to any of these is checkable in one command. */
const MIN_TF = 2;          /* a word has to come up twice in its own guide */
const MAX_DF_SHARE = 0.25; /* a word in a quarter of the guides separates nothing */
const MAX_PER_GAME = 12;   /* measured: the tail past 12 is single hit noise */
const MIN_LEN = 3;

/* Ordinary English that carries no signal about which game this is. Kept short
   on purpose: the df filter above removes most of it anyway, and a long hand
   written stoplist is a thing that rots. */
const STOP = new Set(`the and for you your with that this from what when have has had not but all any are was were will can could would should its it's into out off over under more most less least each per one two three four five six seven eight nine ten they them their there here then than only just also both few many much some such same other another which while during before after again once every very too own same able because about above below between through until upon still ever never always often sometimes way ways thing things get gets got give gives given take takes taken make makes made keep keeps kept put puts run runs ran going goes gone come comes came know knows knew see sees seen look looks looked want wants wanted need needs needed use uses used say says said tell tells told ask asks asked show shows shown turn turns turned start starts started end ends ended play plays played player players game games score scores scored point points pick picks picked best better good great real right wrong new old next last first second third time times day days year years season seasons team teams club clubs top back down up out in on at by to of a an is be as if or so no yes do does did done how why who whom whose where`.split(/\s+/));

/* ONE WORD, and the short list is the point rather than an oversight.

   A blocklist of other companies' games would be a list of words that cannot
   reach this line: scripts/simNoRivalNames.mjs already scans the guides, so a
   rival product name in them turns the build red long before anything here
   reads them. The single exception is the football governing body. That name
   is allowed in the guides in the shapes that read as the organisation (the
   World Cup, the world rankings) and banned on its own, because on its own it
   reads as the video game, and one token in a JSON file is exactly "on its
   own". So it is dropped here rather than shipped and argued about. */
const BLOCKED = new Set(['fifa']); // rival-names-allow: this line is the guard, not a mention

const SPECIALS = { 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ł': 'l', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'þ': 'th', 'ħ': 'h', 'ı': 'i', 'ŋ': 'n' };
const norm = s => s
  .normalize('NFD')
  .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
  .toLowerCase()
  .replace(/[øđðłæœßþħıŋ]/g, ch => SPECIALS[ch] ?? ch);

const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

/* ---- the two source modules, bundled the way genSitemap.mjs does it ---- */
const ENTRY = path.join(os.tmpdir(), 'dukbSearchKeywordsEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'dukbSearchKeywords.bundle.mjs');
const posix = ROOT.replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
export { GAME_CONTENT } from '${posix}/src/data/gameContent/index.ts';
export { CATEGORIES } from '${posix}/src/data/gameRegistry.ts';
`);
execSync(
  `"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const { GAME_CONTENT, CATEGORIES } = await import(pathToFileURL(BUNDLE).href);

const games = CATEGORIES.flatMap(c => c.games.map(g => ({ ...g, category: c.title })));

/* ---- one bag of words per game, from the three descriptive sections ---- */
const docs = new Map();
for (const g of games) {
  const c = GAME_CONTENT[g.path];
  if (!c) continue;
  const text = [...(c.intro || []), ...(c.howToPlay || []), ...(c.rules || [])].join(' ');
  const tf = new Map();
  for (const t of tokens(text)) {
    if (t.length < MIN_LEN || STOP.has(t) || BLOCKED.has(t) || /^\d+$/.test(t)) continue;
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  docs.set(g.path, tf);
}

const df = new Map();
for (const tf of docs.values()) for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
const N = docs.size;
const dfCap = Math.max(2, Math.floor(N * MAX_DF_SHARE));

const index = {};
let totalKw = 0;
for (const g of games) {
  const tf = docs.get(g.path);
  if (!tf) continue;
  /* already carried to the browser by the registry, so a copy here is bytes
     for nothing: the engine scores label and description above any keyword */
  const known = new Set([...tokens(g.label), ...tokens(g.description), ...tokens(g.path), ...tokens(g.category)]);
  const scored = [];
  for (const [t, n] of tf) {
    if (n < MIN_TF) continue;
    const d = df.get(t);
    if (d > dfCap) continue;
    if (known.has(t)) continue;
    scored.push([t, n * Math.log(N / d)]);
  }
  scored.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  /* "seat" and "seats" are one keyword's worth of information and two
     keywords' worth of bytes, and the engine matches on prefix anyway, so the
     weaker of the pair goes. Only the trivial plural, because anything
     cleverer is a stemmer, and a stemmer that is wrong is worse than a plural
     that is duplicated. */
  const picked = [];
  for (const [t, s] of scored) {
    if (picked.some(([p]) => p === `${t}s` || `${p}s` === t)) continue;
    picked.push([t, s]);
    if (picked.length >= MAX_PER_GAME) break;
  }
  const kw = picked.map(([t]) => t).sort();
  if (kw.length === 0) continue;
  index[g.path] = kw.join(' ');
  totalKw += kw.length;
}

/* The source hash is a note, not a gate: it lets a later round see at a glance
   that the guides moved since this ran. Coverage is the thing that is actually
   asserted, in simSiteSearch. */
const srcHash = createHash('sha256')
  .update(fs.readdirSync(CONTENT_DIR).sort().map(f => fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')).join('\n'))
  .digest('hex')
  .slice(0, 16);

const out = {
  /* Generated by scripts/genSearchKeywords.mjs. Do not hand edit: rerun it. */
  v: 1,
  source: srcHash,
  k: Object.fromEntries(Object.keys(index).sort().map(k => [k, index[k]])),
};
writeFileAtomic(OUT, JSON.stringify(out) + '\n');

const bytes = fs.statSync(OUT).size;
console.log(`searchKeywords.json: ${Object.keys(index).length} of ${games.length} games covered, ${totalKw} keywords, ${bytes} bytes`);
console.log(`  filters: tf >= ${MIN_TF}, df <= ${dfCap} of ${N} guides, max ${MAX_PER_GAME} per game`);
console.log(`  guide source hash ${srcHash}`);
