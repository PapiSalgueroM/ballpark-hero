/* Gauntlet Draft, all five sports: the ladder the guide prints is the ladder the board plays. Round 1130.

   WHY THIS EXISTS. Round 1130 moved the NFL pool onto one opening estimate, and the opponent ladder had to move
   with it (78, 85, 90, 95, 99 became 79, 83, 88, 92, 97). The board's setup card reads the ladder off the config.
   The guide under the board, and the ? panel that shows the same guide, are sentences somebody typed. So the
   moment the config moved, one screen said "THEY RATE 79" over a guide that said "rated 78 up to 99" and promised
   a "97 rated" quarterback card where the best one is a 93. A review walked the built page and found it; nothing
   in the suite could have, because no check tied the typed numbers to the config.

   The rule this repo already has for it: anything a text says that the game's own rule can compute is derived,
   never trusted. The guides cannot import the config (they are plain copy), so this fence reads both and fails
   when they disagree. One engine, five sports, so it reads all five the same way and knows nothing about which
   one moved.

   WHAT IT READS. Source text only, comments stripped, line endings folded, never the network.
     the ladder   the `rating:` of every row of the game's <SPORT_>GAUNTLET_ROUNDS array, in order
     the guide    the game's own entry in its src/data/gameContent file, from its route key to the next one

   SECTIONS
     0  the inputs are there: five games, five rounds each, ascending, and a guide entry for every one. A count at
        zero stops the run red: it cannot pass empty.
     1  THE CLIMB. The guide holds exactly one "Opposition ratings climb a, b, c, d, e" and it is the ladder.
     2  THE RANGE. Every "rated X up to Y" in the guide is the ladder's first and last rating, and there is one.
     3  THE NFL EXAMPLE NAMES CARDS THAT EXIST. Gauntlet Draft: NFL deals from the committed starters file, so
        every "N rated" card its guide names, and every rating in its "slot deals ..." sentence, is a number some
        card at that position really carries. (The other four pools are not single committed files this fence
        can read the same way; their example numbers are not checked here and that is said, not hidden.)

   MEASURED 2026-10-08 on the round's own branch (r1130-fo-one-rating): soccer 70 76 81 85 89, MLB 74 81 87 92 97,
   NBA 85 89 93 97 101 and NHL 77 84 89 94 98 agree with their guides. The NFL ladder is 79 83 88 92 97. When
   this fence was written the NFL guide still printed 78, 85, 90, 95, 99, "78 up to 99" and a 97 rated
   quarterback card beside an 88, an 82, a 76 and a 68 (the pool's quarterbacks run 65 to 93 and none is a 68),
   so it went red, 3 of 17 checks, on exactly the three NFL sections. That was the fence doing its job: the
   guide sentences were written apart from the round at first, and a release could not go out with the two
   screens disagreeing. The round's closing pass folded the sentences into the same branch, and on that head
   it is green, 17 of 17, with each control firing once and nothing red without it.

   WHEN IT GOES RED. A ladder moved or somebody retyped a number. Decide which side is right (the config's
   ladder is measured by scripts/simGauntletEngine.mjs, so it is usually the guide that is stale), fix the
   sentence, then rerun node scripts/genSearchKeywords.mjs and, for a guide whose sentences are frozen,
   node scripts/simGuideHeadings.mjs --refresh /route. Never ship one without the other.

   CONTROLS, SIM_GAUNTLET_GUIDE_CONTROL=<name>. Each patches a loaded text, first asserts its anchor is there
   exactly once, and the run exits 0 only when the game it names went red in exactly the section it names
   beyond whatever was red without it.
     staleclimb   the soccer guide's climb line reads 70, 76, 81, 85, 90        -> soccer, section 1
     stalerange   the hockey guide's range reads "rated 77 up to 99"             -> NHL, section 2
     ghostcard    the NFL guide's example names a 99 rated card                  -> NFL, section 3
   Run time: well under a second. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_GAUNTLET_GUIDE_CONTROL || '';
const CONTROLS = { staleclimb: ['/gauntlet-draft', 1], stalerange: ['/nhl-gauntlet-draft', 2], ghostcard: ['/nfl-gauntlet-draft', 3] };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`unknown control ${CONTROL}`); process.exit(1); }
const fold = text => text.split('\r\n').join('\n');
const read = rel => fold(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
/** A guard reads the code, not the comments. */
const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const patchOnce = (text, anchor, replacement, name) => {
  const n = text.split(anchor).length - 1;
  if (n !== 1) throw new Error(`control ${name}: its anchor occurs ${n} times in what the section reads, expected exactly once, so the control would prove nothing`);
  return text.replace(anchor, () => replacement);
};

const GAMES = [
  { route: '/gauntlet-draft', name: 'Gauntlet Draft: Soccer', lib: 'src/lib/gauntletDraft.ts', guide: 'src/data/gameContent/soccer2.ts' },
  { route: '/nfl-gauntlet-draft', name: 'Gauntlet Draft: NFL', lib: 'src/lib/gauntletDraftNfl.ts', guide: 'src/data/gameContent/football.ts' },
  { route: '/nba-gauntlet-draft', name: 'Gauntlet Draft: NBA', lib: 'src/lib/gauntletDraftNba.ts', guide: 'src/data/gameContent/basketball.ts' },
  { route: '/mlb-gauntlet-draft', name: 'Gauntlet Draft: MLB', lib: 'src/lib/gauntletDraftMlb.ts', guide: 'src/data/gameContent/baseball.ts' },
  { route: '/nhl-gauntlet-draft', name: 'Gauntlet Draft: NHL', lib: 'src/lib/gauntletDraftNhl.ts', guide: 'src/data/gameContent/hockey.ts' },
];
const NFL = '/nfl-gauntlet-draft';
const SLOT_WORD = { quarterback: 'QB', 'running back': 'RB', receiver: 'WR', 'tight end': 'TE' };

/** The ratings of a game's ladder, in order, read off its config source. */
function ladderOf(libText) {
  const at = libText.search(/export const \w*GAUNTLET_ROUNDS\s*=\s*\[/);
  if (at < 0) return [];
  return [...libText.slice(at, libText.indexOf('];', at)).matchAll(/rating:\s*(\d+)/g)].map(m => Number(m[1]));
}
/** A game's own guide entry: from its route key to the next route key of the file. */
function entryOf(guideText, route) {
  const key = `\n  '${route}': {`;
  if (guideText.split(key).length - 1 !== 1) return '';
  const start = guideText.indexOf(key), rest = guideText.slice(start + key.length), next = rest.search(/\n  '\/[^'\n]+': \{/);
  return next < 0 ? rest : rest.slice(0, next);
}
/** Every rating a skill position's cards carry in the committed starters file, the pool Gauntlet Draft: NFL deals. */
function nflPool(startersText) {
  const pool = { QB: new Set(), RB: new Set(), WR: new Set(), TE: new Set() };
  for (const m of startersText.matchAll(/\{ name: '(?:[^'\\]|\\.)*', pos: '(QB|RB|WR|TE)', age: \d+, ovr: (\d+),/g)) pool[m[1]].add(Number(m[2]));
  return pool;
}

/** One whole reading of the five games over a set of loaded texts. Returns the lines to print and the failures. */
function measure(textOf) {
  const lines = [], fails = [];
  const ok = (route, section, label, pass, detail = '') => { if (!pass) { fails.push({ route, section, text: `${label}${detail ? ': ' + detail : ''}` }); lines.push(`   FAIL [${section}] ${label}${detail ? ': ' + detail : ''}`); } };
  let checks = 0;
  const pool = nflPool(stripComments(textOf('src/data/frontOfficePlayers.ts')));
  const everyCard = new Set(Object.values(pool).flatMap(set => [...set]));
  for (const game of GAMES) {
    const ladder = ladderOf(stripComments(textOf(game.lib))), entry = entryOf(stripComments(textOf(game.guide)), game.route);
    lines.push(`${game.name} (${game.route}): the ladder is ${ladder.join(', ') || 'NOT FOUND'}; its guide entry is ${entry.length} characters`);
    /* 0 */
    checks += 1;
    ok(game.route, 0, `${game.name}: the config holds five ascending rounds and the guide holds this game's entry`, ladder.length === 5 && ladder.every((r, i) => i === 0 || r > ladder[i - 1]) && entry.length > 500, `${ladder.length} rounds, entry of ${entry.length} characters`);
    if (ladder.length !== 5 || entry.length <= 500) continue;
    /* 1 */
    const climbs = [...entry.matchAll(/Opposition ratings climb ((?:\d+, )+\d+)/g)].map(m => m[1]);
    checks += 1;
    ok(game.route, 1, `${game.name}: the guide prints the climb once, and it is the ladder`, climbs.length === 1 && climbs[0] === ladder.join(', '), `the guide says ${climbs.join(' and ') || 'nothing'}, the board plays ${ladder.join(', ')}`);
    /* 2 */
    const ranges = [...entry.matchAll(/rated (\d+) up to (\d+)/g)].map(m => `${m[1]} up to ${m[2]}`), want = `${ladder[0]} up to ${ladder[4]}`;
    checks += 1;
    ok(game.route, 2, `${game.name}: every range the guide prints is the ladder's first and last rating`, ranges.length > 0 && ranges.every(r => r === want), `the guide says ${ranges.join(' and ') || 'nothing'}, the board plays ${want}`);
    /* 3, the one pool this fence can read as a committed file */
    if (game.route !== NFL) continue;
    const named = [...entry.matchAll(/\b(\d{2,3}) rated\b/g)].map(m => Number(m[1]));
    const ghosts = named.filter(n => !everyCard.has(n));
    const slots = [...entry.matchAll(/The (quarterback|running back|receiver|tight end) slot deals ([^.]*)\./g)].map(m => ({ pos: SLOT_WORD[m[1]], word: m[1], numbers: [...m[2].matchAll(/\b(\d{2,3})\b/g)].map(n => Number(n[1])) }));
    const strays = slots.flatMap(s => s.numbers.filter(n => !pool[s.pos].has(n)).map(n => `${s.word} ${n}`));
    lines.push(`   the pool: quarterbacks ${Math.min(...pool.QB)} to ${Math.max(...pool.QB)}, backs ${Math.min(...pool.RB)} to ${Math.max(...pool.RB)}, receivers ${Math.min(...pool.WR)} to ${Math.max(...pool.WR)}, tight ends ${Math.min(...pool.TE)} to ${Math.max(...pool.TE)}; the guide names ${named.length} rated card${named.length === 1 ? '' : 's'} (${named.join(', ') || 'none'}) and ${slots.length} slot deal${slots.length === 1 ? '' : 's'} (${slots.map(s => `${s.word}: ${s.numbers.join(', ')}`).join('; ') || 'none'})`);
    checks += 2;
    ok(game.route, 3, `${game.name}: the pool holds cards at all four positions`, Object.values(pool).every(set => set.size >= 10), Object.entries(pool).map(([pos, set]) => `${pos} ${set.size}`).join(', '));
    ok(game.route, 3, `${game.name}: every rated card and every dealt rating the guide names is a number a card at that position carries`, ghosts.length === 0 && strays.length === 0, `no card is rated ${[...ghosts.map(String), ...strays].join(', ')}`);
  }
  return { lines, fails, checks };
}

/* ---- the plain reading, and under a control the patched one beside it ------- */
const loaded = new Map();
const plainText = rel => { if (!loaded.has(rel)) loaded.set(rel, read(rel)); return loaded.get(rel); };
const plain = measure(plainText);
if (plain.checks < GAMES.length * 3) { console.error(`FAIL: only ${plain.checks} checks ran over ${GAMES.length} games, so nothing was measured`); process.exit(1); }

const REPAIR = 'Fix the guide sentence (or the ladder, if the guide is the one that is right), then rerun node scripts/genSearchKeywords.mjs and, for a frozen guide, node scripts/simGuideHeadings.mjs --refresh /route.';
if (!CONTROL) {
  for (const line of plain.lines) console.log(line);
  if (plain.fails.length) {
    console.error(`simGauntletGuideLadder: RED, ${plain.fails.length} of ${plain.checks} checks failed. A guide prints numbers its own board contradicts. ${REPAIR}`);
    process.exit(1);
  }
  console.log(`simGauntletGuideLadder: green, ${plain.checks} checks. Five ladders, five guides, and the NFL example names cards the pool holds.`);
  process.exit(0);
}

const PATCH = {
  staleclimb: ['src/data/gameContent/soccer2.ts', 'Opposition ratings climb 70, 76, 81, 85, 89', 'Opposition ratings climb 70, 76, 81, 85, 90'],
  stalerange: ['src/data/gameContent/hockey.ts', 'rated 77 up to 98', 'rated 77 up to 99'],
  ghostcard: ['src/data/gameContent/football.ts', 'The quarterback slot deals a', 'The quarterback slot deals a 99 rated card, a'],
};
const [file, anchor, replacement] = PATCH[CONTROL];
const patched = patchOnce(stripComments(plainText(file)), anchor, replacement, CONTROL);
const under = measure(rel => (rel === file ? patched : plainText(rel)));
for (const line of under.lines) console.log(line);
const [route, section] = CONTROLS[CONTROL];
const before = new Set(plain.fails.map(f => `${f.route}|${f.section}|${f.text}`));
const fresh = under.fails.filter(f => !before.has(`${f.route}|${f.section}|${f.text}`));
const fired = fresh.length > 0 && fresh.every(f => f.route === route && f.section === section);
console.log(`control ${CONTROL} ${fired ? 'fired' : 'DID NOT fire as designed'}: ${fresh.length} new failure${fresh.length === 1 ? '' : 's'} (${fresh.map(f => `${f.route} section ${f.section}`).join(', ') || 'none'}), expected only ${route} section ${section}; ${plain.fails.length} were red without it`);
process.exit(fired ? 0 : 1);

