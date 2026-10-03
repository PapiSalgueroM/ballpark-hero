/**
 * Round 133: no other company's game is named anywhere in this repo.
 *
 * The GitHub repo is PUBLIC. That means a code comment saying "this is
 * modelled on someone else's game" is exactly as readable as a button that
 * says it. Round 129 stripped the player-visible strings and deliberately left
 * the comments alone; the owner overruled that. Everything goes: UI copy, SEO
 * titles and meta descriptions, alt text, JSON-LD, comments, variable and
 * function names, file names, test fixtures, public/ files and the Supabase
 * edge functions.
 *
 * This harness is the permanent guard. It fails the build if any of those
 * names comes back, and it prints the file and line so the fix is obvious.
 *
 *   node scripts/simNoRivalNames.mjs
 *
 * TO ADD A NAME: put it in RIVAL_NAMES below. That list is the whole point of
 * this file being here, so keep it in one place and keep it alphabetical-ish.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ===========================================================================
   THE LIST. One obvious place, easy to extend.

   Each entry is a plain regex source string, matched case-insensitively unless
   it is in CASE_SENSITIVE below. Anything matched here fails the run.
   =========================================================================== */
const RIVAL_NAMES = [
  // --- life sims and open-world games ---
  'bitlife',
  'bit ?life',
  'grand theft auto',
  '\\bgta\\b',

  // --- sports video games ---
  'nba ?2k',
  '2k ?(?:build|style|ratings?|franchise|career|mode|series|way)',
  '2k[0-9]{2}',                 // 2K16, 2K25 and friends
  'madden',
  'nba live',
  'mlb the show',
  'out of the park',
  '\\bootp\\b',
  'football manager',
  'championship manager',
  'top eleven',
  'new star soccer',
  'score hero',
  'dream league soccer',
  'retro bowl',
  'tecmo bowl',
  'pro evolution soccer',
  'efootball',
  'ea ?sports',
  'ea ?fc\\b',

  /* Round 620: the independent studio whose sports sims the owner pointed at
     when he asked for a fight career game, plus its titles. The genre is fair
     game and the names are not, and the repo is public, so a comment naming
     them would be exactly as readable as a button naming them.

     ON THE SHAPE OF THE BOXING ONE, because it needs to be deliberate. The
     ordinary English word for a professional boxer is a legitimate thing to
     write in a boxing game's copy, and banning it outright would fail the build
     on honest prose. So the plural and the numbered title are banned, which is
     what the product is actually called, and the plain English singular is
     left alone. This is the same distinction the FIFA entries below draw
     between the governing body and the video game. */
  'koality',
  'prizefighters\\b',
  'prizefighter ?[0-9]',
  'hoop ?land',
  'hoop league tactics',
  'ice league hockey',
  // Round 135: two shapes the list missed for eight rounds, both of them sitting
  // in Club Manager comments the whole time. "EA's own forum" never contained
  // "ea sports" or "ea fc", and "FC 26" on its own has no "ea" in front of it to
  // catch. The leading word boundary is what keeps the first one off Chelsea's,
  // Swansea's and the five other possessives in the repo that end in "ea".
  "ea['\u2019]s",
  'fc ?2[0-9]\\b',
  'ultimate team',

  // --- daily word and grid games ---
  'wordle',
  'immaculate[- ]?grid',
  'poeltl[- ]?(?:style|like|esque)',   // see POELTL note below
  'sporcle',
  'kot4q',
  'quordle',
  'dordle',
  'absurdle',
  'semantle',
  'contexto',
  'goltexto',
  'globle',
  'worldle',
  'heardle',
  'nerdle',
  'redactle',
  'tradle',
  'new york times',
  '\\bnyt\\b',

  // --- rival football/sports puzzle sites ---
  'box2box',
  'box ?2 ?box',
  'futbol ?11',
  'futbol-11',
  'playfootball\\.games',
  'tiki[- ]?taka[- ]?toe',
  'whoareya',

  // --- TV game show formats ---
  'who wants to be a (?:sports )?millionaire',
  'deal or no deal',
  'deal-or-no-deal',
  'family feud',
  'family fortunes',
  // 'pointless' was on this list for the TV quiz show and it had to come off.
  // It is also an ordinary English word, and it fired on the phrase "a pointless
  // half pixel scroll" in a scroll hook comment. A guard that fails the build on
  // normal English gets switched off, which is worse than the thing it guards.
  // The show is caught by the fuller phrasing below instead.
  'pointless quiz show',
  'beat the chaser',
  'only connect',
  'the weakest link',
  'jeopardy',

  // --- board and party games ---
  'risk[- ]?(?:style|like|likes)',
  'monopoly',
  'cluedo',
  'catan',
  'blooket',
  'kahoot',

  // --- other games people would recognise ---
  'minecraft',
  'fortnite',
  'candy crush',
  'rocket league',
  'The Sims',                   // case-sensitive, see below
  // Round 580: the idle sports app the owner cited as the tycoon merge's
  // inspiration (docs/TWEAKS-2026-08-28.md). All three words, with a boundary at
  // both ends: the two word prefix alone already matches ordinary copy ("the
  // worst line in sports starts moving" in src/lib/nhlCareerLifeA.ts).
  // scripts/simTycoonRooms.mjs section B4 proves both halves of that.
  '\\bsports ?star ?idle\\b',
];

/* Matched with a capital letter required, because the lowercase form is
   ordinary English in this repo. "the sims have real depth" on the About page
   is talking about OUR simulation games. "The Sims" is the other thing. */
const CASE_SENSITIVE = new Set(['The Sims']);

/* ===========================================================================
   ⚠ THE FIFA DISTINCTION. DO NOT "SIMPLIFY" THIS AWAY.

   FIFA is two different things sharing one name, and only one of them goes.

   1. FIFA the governing body. It runs the World Cup and publishes the world
      rankings. "FIFA World Cup", "FIFA rankings", "FIFA points" and the legal
      disclaimer in the site footer are TRUE STATEMENTS ABOUT REAL FOOTBALL.
      The international games are built on the real ranking numbers. Deleting
      the word out of those sentences would make the site factually wrong, and
      data correctness beats every other rule here.

   2. FIFA the video game. "FIFA card", "90+ Rated FIFA Card", "FIFA 23",
      "FIFA-style", "EA Sports FIFA", "EA FC". That is a product made by
      another company and it does not belong anywhere in this repo.

   So FIFA is handled by an ALLOWLIST, not a blocklist: a FIFA mention passes
   only if it reads as the organisation or one of its competitions. Anything
   else fails. That way a brand new "FIFA Ultimate Team" reference nobody
   thought to ban still gets caught on the day someone types it.
   =========================================================================== */
const FIFA_ALLOWED = [
  // Competitions the organisation runs.
  // The space is optional so the no-space form in source domains and
  // identifiers (fifaworldcupnews, FifaWorldCup) reads as the tournament too.
  /FIFA['\u2019]?s? ?(?:Men's |Women's |Club |Beach |Futsal |U-?\d+ )?World ?Cup/i,
  /FIFA Confederations Cup/i,
  /World Cup/i,
  // The world rankings, which the international games are actually built on.
  // Both orders, because the sentence can put either word first, and the
  // no-space form catches identifiers like getFifaRank.
  /FIFA[ _-]?(?:world[ _-]?)?rank/i,
  /FIFA standard/i,
  /rank[^.]{0,40}FIFA/i,
  /FIFA points/i,
  // Round 133 additions, all of them the organisation rather than the game.
  // Round 124 built the entire international career on the real world ranking
  // and the real qualifying slots, and web-verified both, so these are FACTS.
  // Stripping them would leave the game quietly wrong, which breaks the rule
  // that data correctness comes before everything.
  /FIFA[ _\/-]?(?:Coca-Cola )?(?:Men's |Women's )?[ _-]?World[ _-]?Rank/i,
  /FIFA_Men's_World_Ranking/i,
  // Source URLs use underscores, so the tournament reads as FIFA_World_Cup.
  /FIFA[ _-]World[ _-]Cup/i,
  // "FIFA's ranking", and the honesty note that says a number is NOT a FIFA
  // figure, are both the organisation. The second one is the guard catching a
  // sentence whose whole job is to admit where the real data stops.
  /FIFA['\u2019]s ranking/i,
  /NOT a FIFA figure/i,
  /FIFA Council/i,
  /FIFA['\u2019]?s \d+/i,
  /FIFA_POINTS/,
  /fifaPointsOf|fifaRankOf|hasPublishedRank/,
  // Awards the organisation actually gives out.
  /FIFA Best/i,
  /FIFA World Player of the Year/i,
  /FIFA FIFPro/i,
  /FIFA Puskas/i,
  // FIFA.com is the governing body's own site, cited as a source for verified
  // real world lineups. Removing the citation would break the audit trail.
  /FIFA\.com/i,
  /FIFA archive/i,
  // Round 730 verified public.ballon_dor row by row. From 2010 to 2015 the
  // Ballon d'Or and the governing body's World Player of the Year were one
  // merged prize, and the independent source for those six winners is RSSSF's
  // page on the governing body's awards, whose path carries the word. It is a
  // citation in a record file and a migration header, the same case as
  // fifa.com above, and it is scoped to that one path so nothing else rides in
  // on it. The record's own prose describes the era as "the merged award".
  /rsssf\.org\/miscellaneous\/fifa-awards/i,
  // The format of a real tournament, as set by the organisation.
  /format follows FIFA/i,
  // Every legal page carries a disclaimer listing FIFA as a governing body
  // alongside the NFL, NBA, UEFA, the IOC and the rest. Stripping the word out
  // of a disclaimer would be the one edit here that actually creates risk.
  /not affiliated with/i,
  /MLB(?:PA)?, FIFA/i,
  /FIFA, (?:UEFA|IOC)/i,
];

/* ===========================================================================
   LIVE IDENTIFIERS THAT CANNOT CHANGE WITHOUT A DATA MIGRATION.

   Every one of these is a URL a player may have bookmarked, a localStorage key
   holding somebody's saved game, or a table name in the live Supabase
   database. The human-readable copy around them has all been changed; these
   strings themselves are load-bearing. Renaming them is a migration job with
   redirects and a backfill, not a find and replace, so they are listed here
   rather than quietly edited.
   =========================================================================== */
const LIVE_IDENTIFIERS = [
  '/jeopardy',        // retired route since Round 305, redirects to /quiz-board so old links live
  "'jeopardy'",       // game completion key, holds every player's streak history
  'jeopardy-',        // localStorage prefix for saved boards
  'jeopardy_clues',   // Supabase table name
  '/deal-or-no-deal', // retired route, still redirects to /squad-deal so old links live
  "'fifa_cover'",     // old saved sponsorship value, read once by the save migration in repairCareer
];

/* ===========================================================================
   REAL PEOPLE WHOSE NAME HOLDS A BANNED WORD. Round 829 review.

   A real player whose surname is also a product's name is a person, not the
   product. Like the live identifiers above, each entry is blanked out of the
   line before matching, and only as his exact full name, the way the record
   spells it, and only in the files that carry that record. So the product
   name written any other way in those same files (a bare surname, another
   case, a title with a year, a comment) still fails, and so does his name in
   any other file. SIM_RIVAL_CONTROL=person proves it.

   Add a man only when a league's own record names him and a second source
   agrees he is real. Never add a word, only a person.
   =========================================================================== */
const REAL_PEOPLE = [
  /* Detroit Tigers pitcher, born 2000-02-21: MLB's Stats API record of the
     2026-09-27 roster and ESPN's Detroit roster (read 2026-10-01) agree. */
  { name: 'Ty Madden', files: ['scripts/data/mlbRosters2026.json', 'scripts/data/mlbStats2026.json', 'src/data/mlbFoRosters2026.ts', 'scripts/data/mlbOpeningRatingInputs2026.json', 'src/data/mlbOpeningRatings2026.ts'] },
];
const PERSON_CONTROL = process.env.SIM_RIVAL_CONTROL === 'person';

/* A line ending in this marker is skipped. Only two places use it: the two
   older sims that carry their own list of banned brand names, which would
   otherwise trip this guard by doing the same job it does. */
const INLINE_ALLOW = 'rival-names-allow';

/* ===========================================================================
   What gets scanned. Everything shipped or published, which for a public repo
   means everything except dependencies, build output and binaries.
   =========================================================================== */
const SCAN = ['src', 'public', 'supabase', 'scripts', 'index.html'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.playwright-mcp', 'coverage', '.cache']);
/* Round 406: the NFL answer key is a derived data file of real careers, and a
   player whose surname is Madden is a person, not a product. It carries no
   prose (every string is a name, a code or a rule the generator wrote), so
   it is skipped by name rather than line by line. scripts/.cache holds the
   downloaded nflverse files, gitignored, never shipped. Round 611: the
   College Grid answer key is the same kind of file (it holds Maddens too).
   Round 829's MLB files are NOT skipped: their one real Madden is allowed by
   his full name in REAL_PEOPLE above, and every other line is scanned. */
const SKIP_FILES = new Set(['simNoRivalNames.mjs', 'nflGridPlayers.json', 'collegeGridPlayers.json']);
const BINARY = /\.(png|jpe?g|gif|ico|webp|avif|svg|woff2?|ttf|eot|mp3|mp4|webm|pdf|zip|lockb)$/i;

/* docs/ is deliberately NOT scanned. It holds competitor research whose entire
   job is naming competitors, and stripping the names would leave a document
   that says nothing. That is a separate call for the owner: either those files
   get deleted from the public repo or they get git-ignored. Flagging them here
   would just mean a permanently red build nobody can fix. */

function walk(p, out = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    if (SKIP_DIRS.has(path.basename(p))) return out;
    for (const e of fs.readdirSync(p)) walk(path.join(p, e), out);
    return out;
  }
  if (SKIP_FILES.has(path.basename(p))) return out;
  if (BINARY.test(p)) return out;
  out.push(p);
  return out;
}

/* Word boundaries matter more than they look. Without them "eFootball" fires
   on useFootballGrid, "ea fc" fires on "Chelsea FC", "wordle" fires on
   wordLen and "worldle" fires on WorldLeague. Every pattern that starts or
   ends on a word character gets wrapped. */
function bounded(src) {
  let out = src;
  if (/^[A-Za-z0-9]/.test(out)) out = '\\b' + out;
  if (/[A-Za-z0-9)]$/.test(out)) out = out + '\\b';
  return out;
}

const patterns = RIVAL_NAMES.map(src => ({
  src,
  re: new RegExp(bounded(src), CASE_SENSITIVE.has(src) ? 'g' : 'gi'),
}));

const files = [];
for (const entry of SCAN) {
  const full = path.join(ROOT, entry);
  if (fs.existsSync(full)) walk(full, files);
}

const findings = [];
/* SIM_RIVAL_CONTROL=person: five other spellings of the one banned word that
   rides on a real name. Each must still be a finding in every file the person
   is allowed in. */
const CONTROL_PROBES = [
  '{"name":"Madden"}',
  '{"name":"ty madden"}',
  '{"name":"Ty  Madden"}',
  '// ratings borrowed from Madden 26',
  '{"name":"Tyler Madden"}',
];
const controlProblems = [];

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue; // binary that slipped past the extension list
  const rel = path.relative(ROOT, file);
  const relFwd = rel.split(path.sep).join('/');
  const people = REAL_PEOPLE.filter(p => p.files.includes(relFwd)).map(p => p.name);
  /* The control: in each file a person is allowed in, the person must be there
     (or the allowance is dead weight), and the product name written five
     other ways, appended to that file's text here and nowhere on disk, must
     each still fail. */
  if (PERSON_CONTROL && people.length) {
    for (const name of people) if (!text.includes(name)) controlProblems.push(`${relFwd} no longer holds ${name}, so the allowance there is dead weight`);
    text += `\n${CONTROL_PROBES.join('\n')}`;
  }
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    if (line.includes(INLINE_ALLOW)) return;

    // Blank out the live identifiers before matching, so "/jeopardy" in a route
    // does not fire but "Jeopardy scoring" in a comment still does.
    let probe = line;
    for (const id of LIVE_IDENTIFIERS) {
      probe = probe.split(id).join(' '.repeat(id.length));
    }
    // Round 829 review: and a real person, by his exact full name, in his own files.
    for (const name of people) {
      probe = probe.split(name).join(' '.repeat(name.length));
    }

    for (const { src, re } of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(probe)) !== null) {
        findings.push({ rel, line: i + 1, hit: m[0], text: line.trim().slice(0, 140) });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }

    // FIFA, by allowlist. See the long comment above before touching this.
    let fifa;
    const fifaRe = /FIFA/gi;
    fifaRe.lastIndex = 0;
    while ((fifa = fifaRe.exec(probe)) !== null) {
      const window = probe.slice(Math.max(0, fifa.index - 70), fifa.index + 70);
      if (FIFA_ALLOWED.some(ok => ok.test(window))) continue;
      findings.push({
        rel,
        line: i + 1,
        hit: 'FIFA (not the governing body)',
        text: line.trim().slice(0, 140),
      });
    }
  });
}

if (PERSON_CONTROL) {
  const scoped = REAL_PEOPLE.flatMap(p => p.files);
  const missed = [];
  for (const f of scoped) {
    for (const probe of CONTROL_PROBES) {
      if (!findings.some(x => x.rel.split(path.sep).join('/') === f && x.text === probe.trim())) missed.push(`${f}: ${probe}`);
    }
  }
  const real = findings.filter(x => !CONTROL_PROBES.includes(x.text));
  console.log(`control person: ${scoped.length} files x ${CONTROL_PROBES.length} other spellings, ${scoped.length * CONTROL_PROBES.length - missed.length} caught; ${real.length} findings outside the probes`);
  for (const m of [...controlProblems, ...missed].slice(0, 10)) console.log(`   NOT CAUGHT ${m}`);
  if (controlProblems.length || missed.length || real.length) { console.log('FAIL: control person did not fire as designed'); process.exit(1); }
  console.log('simNoRivalNames: control person fired as designed (the full name passes, every other spelling fails)');
  process.exit(0);
}

if (findings.length) {
  console.log(`\nRIVAL NAMES FOUND: ${findings.length}\n`);
  for (const f of findings) {
    console.log(`  ${f.rel}:${f.line}  [${f.hit}]`);
    console.log(`      ${f.text}`);
  }
  console.log(`\nScanned ${files.length} files. ${findings.length} findings.`);
  console.log('Replace each one with a plain description of the thing itself, not a redaction.');
  process.exit(1);
}

/* Round 133: this used to print two lines, and runAllSims flagged the whole
   run as EMPTY because a harness that prints almost nothing is usually one
   that threw on import and died. That heuristic was right to fire: a guard
   whose entire output is "fine" tells you nothing about whether it looked in
   the right places. Every other harness in this repo prints what it measured,
   so this one does too. */
console.log(`Checked ${RIVAL_NAMES.length} product names against ${files.length} files`);
console.log(`  scanned: ${SCAN.join(', ')}`);
console.log(`  skipped: ${[...SKIP_DIRS].join(', ')}, and docs/ on purpose (see the note above)`);
console.log(`  FIFA is allowlisted in ${FIFA_ALLOWED.length} shapes, so the governing body, its`);
console.log('    rankings and its World Cup all pass while the video game does not');
console.log(`  ${LIVE_IDENTIFIERS.length} live identifiers are left alone because renaming them is a`);
console.log('    data migration, not a copy edit: routes, save keys and one Supabase table');
console.log(`  lines ending in "${INLINE_ALLOW}" are skipped, for the sims that carry`);
console.log('    a banned-name list of their own because checking for them IS their job');
console.log('');
console.log('No rival product names found. 0 findings.');
