/**
 * Round 1143 harness: one disclaimer a page, one game count.
 *
 * WHY. An audit of the saved pages on 2026-10-08 measured two things a visitor
 * and an ad reviewer can both see, and no check saw either.
 *   - /privacy, /terms and /whats-new printed a short trademark disclaimer of
 *     their own right above the footer's full one (/about and /contact too),
 *     so the five pages a reviewer opens first read as two footers stacked.
 *   - The number of games read five ways: 120+, 130+, 133, "over 100" and
 *     "100+", two of them on one screen of the home page, while the registry
 *     held 133.
 * Both were typed copies of something the code already knew: the footer's
 * disclaimer, and GAME_COUNT_LABEL in src/data/gameRegistry.ts.
 *
 * RULE 1, ONE DISCLAIMER. In src (code, comments stripped, tests left out) a
 * disclaimer sentence (the site saying it is "not affiliated with" somebody,
 * or "property of their respective owners") lives in exactly two places: the
 * footer, once, and section 6 of the Terms, which is the legal clause itself
 * and not a second footer. Any other file that prints one fails, because the
 * footer is under every page.
 *
 * RULE 2, ONE COUNT. Nothing types a count of the site's games. A count is
 * read from the registry (GAME_COUNT_LABEL, or TOTAL_GAMES where the exact
 * number is wanted). What counts as "a count of the site's games" is a shape,
 * measured on main as it stood before this round (14fc5d8c, 2026-10-09: 1,344
 * source files, index.html and public/llms.txt), where the three shapes found
 * 13 phrases, 12 about the site and 1 about a sport:
 *   a. a number in front of "games" with free, sports, trivia, browser or
 *      online between them ("120+ free sports games"): 9 hits, every one about
 *      the site;
 *   b. a round floor from 100 to 300 with no such word ("100+ games", "over
 *      100 games"), unless "played" or the like follows: 4 hits, 3 about the
 *      site and 1 a college career column, which is on NOT_THE_SITE below;
 *   c. an exact number within two of the registry's count after "all" or
 *      "there are", or before "here" ("all 133 games", "all 133 of them"):
 *      0 hits, and it is here because the Daily Legend card once said "all 37
 *      games" long after there were more.
 * A season's length ("all 82 games", "over 162 games") is none of the three.
 * Run on that tree this harness reports 10 failures: the 3 pages with a
 * disclaimer of their own and 7 typed counts in 4 files.
 *
 * Three kinds of place may still carry a count:
 *   - LITERALS. index.html (three description tags and the static block) and
 *     the home description in src/pages/Index.tsx cannot run code, so they are
 *     typed, and each must be EXACTLY the registry's label. simHomeCopy lets a
 *     floor trail the real count by up to a fifth, which is how the home page
 *     came to say 130+ and 120+ at once; this is the stricter half. The day
 *     the label moves up a ten this goes red and names the places to retype.
 *   - HISTORY. src/pages/WhatsNew.tsx is a dated log. "There are 113 games
 *     here" was true the week it was written and stays as written.
 *   - HELD. Nine files the other lane is redrafting on 2026-10-09. Whatever
 *     they print is listed on every run and fails nothing. Take a file off
 *     HELD the day its draft lands, and fix what the list then shows.
 * And one is owed: public/llms.txt is a literal too, says 100+ and was outside
 * this round. It sits on OWED, which is a ratchet: the entry fails the moment
 * the file stops saying exactly that, so a fix has to delete the entry and the
 * file is held to the label from then on.
 *
 * NEGATIVE CONTROLS, each an edit in memory that refuses to run if the text it
 * changes is not there, and each must produce its own failure and no other
 * (exit 0 means exactly that happened, the way simLegalPages reports it):
 *   TRUST_CONTROL=seconddisclaimer  the old short line back in PrivacyPolicy
 *   TRUST_CONTROL=typedcount        Footle's guide types "100+ free sports games"
 *   TRUST_CONTROL=barecount         the dead address page types "See all 100+ games"
 *   TRUST_CONTROL=exactcount        Search types today's exact count
 *   TRUST_CONTROL=staleliteral      one template tag falls a ten behind the label
 *
 * Run: node scripts/simTrustCopy.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failureMessages = [];
const fail = m => { failureMessages.push(m); console.error('  FAIL: ' + m); };

/* ── the registry's own numbers ───────────────────────────────────────── */
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-trust-copy-${process.pid}-`));
let TOTAL_GAMES, GAME_COUNT_LABEL;
try {
  const out = path.join(temp, 'gameRegistry.cjs');
  await build({
    entryPoints: [path.join(ROOT, 'src/data/gameRegistry.ts')],
    bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
  });
  ({ TOTAL_GAMES, GAME_COUNT_LABEL } = createRequire(import.meta.url)(out));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
if (!Number.isInteger(TOTAL_GAMES) || TOTAL_GAMES < 50 || !/^\d+0\+$/.test(String(GAME_COUNT_LABEL))) {
  console.error(`the registry gave ${TOTAL_GAMES} games and the label ${JSON.stringify(GAME_COUNT_LABEL)}, which is not a count and a rounded floor`);
  process.exit(1);
}
console.log(`simTrustCopy: the registry holds ${TOTAL_GAMES} games and prints them as ${GAME_COUNT_LABEL}`);

/* ── the lists ────────────────────────────────────────────────────────── */
const FOOTER = 'src/components/game/Footer.tsx';
const TERMS = 'src/pages/TermsOfService.tsx';
const HISTORY = 'src/pages/WhatsNew.tsx';
/** Typed because they cannot run code (or, for the home description, because
    simHomeCopy holds it equal to the template as a plain string). Each count
    in them must be exactly the label, and each file must carry at least this
    many, so an empty read cannot pass for a clean one. */
const LITERAL_FILES = { 'index.html': 4, 'src/pages/Index.tsx': 1, 'public/llms.txt': 1 };
/** The other lane's held drafts on 2026-10-09: listed, never failed. */
const HELD = new Set([
  'src/pages/About.tsx', 'src/pages/Contact.tsx', 'src/lib/sportHub.ts',
  'src/data/gameContent/baseball.ts', 'src/data/gameContent/basketball.ts',
  'src/data/gameContent/college.ts', 'src/data/gameContent/hockey.ts',
  'src/data/gameContent/moreSports.ts', 'src/data/gameContent/soccer2.ts',
]);
/** A literal this round could not reach. The file must still say exactly
    this, so the fix deletes the line and the label rule takes the file over. */
const OWED = [
  { file: 'public/llms.txt', says: '100+ games', why: 'public/ was outside Round 1143; the lead retypes it at release' },
];
/** A number in front of "games" that has the shape of a site count and is not
    one. The words must still be in the file, or the line is stale. */
const NOT_THE_SITE = [
  { file: 'src/pages/CbbGrid.tsx', says: '120+ games', why: 'a board column: games a player appeared in' },
  { file: 'src/data/seoMeta.ts', says: 'all 162 games', why: 'a baseball season; listed ahead of the day the registry reaches 162' },
];

/* ── the controls ─────────────────────────────────────────────────────── */
const CONTROL = process.env.TRUST_CONTROL || '';
const SHORT_LINE = '<p>All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL.</p>';
const lowerLabel = `${Number(GAME_COUNT_LABEL.slice(0, -1)) - 10}+`;
const CONTROLS = {
  seconddisclaimer: {
    file: 'src/pages/PrivacyPolicy.tsx', from: '      </section>\n    </div>', to: `      </section>\n      ${SHORT_LINE}\n    </div>`,
    expect: 'src/pages/PrivacyPolicy.tsx prints a trademark disclaimer of its own',
  },
  typedcount: {
    file: 'src/pages/Footle.tsx', from: 'One of ${GAME_COUNT_LABEL} free sports games', to: 'One of 100+ free sports games',
    expect: 'src/pages/Footle.tsx types a count of the site\'s games: "100+ free sports games"',
  },
  barecount: {
    file: 'src/pages/NotFound.tsx', from: 'See all ${GAME_COUNT_LABEL} games', to: 'See all 100+ games',
    expect: 'src/pages/NotFound.tsx types a count of the site\'s games: "100+ games"',
  },
  exactcount: {
    file: 'src/pages/Search.tsx', from: 'All ${TOTAL_GAMES} of them.', to: `All ${TOTAL_GAMES} of them.`,
    expect: `src/pages/Search.tsx types a count of the site's games: "All ${TOTAL_GAMES} of them"`,
  },
  staleliteral: {
    file: 'index.html', from: `<meta name="description" content="${GAME_COUNT_LABEL} free sports games`, to: `<meta name="description" content="${lowerLabel} free sports games`,
    expect: `index.html types "${lowerLabel} free sports games" and the registry's label is ${GAME_COUNT_LABEL}`,
  },
};
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`TRUST_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* ── reading ──────────────────────────────────────────────────────────── */
/* Block comments go first and on their own. A pattern for the JSX form, a
   brace, a comment and a brace, was tried first and ate the footer's whole
   disclaimer: from the brace that opens a function it ran on past one comment
   after another to the first one that happened to close on a brace. The
   footer's own count caught it. */
const stripCode = t => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')
  .replace(/([\s;,{}()])\/\/ .*$/gm, '$1');
const stripHtml = t => t.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

let controlApplied = false;
/** A file's text as shipped (LF), with the control's one edit and no comments. */
function read(rel) {
  let text = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
  const c = CONTROLS[CONTROL];
  if (c && c.file === rel) {
    const hits = text.split(c.from).length - 1;
    if (hits !== 1) {
      console.error(`control ${CONTROL}: ${JSON.stringify(c.from)} is in ${rel} ${hits} times, not once, so it would prove nothing`);
      process.exit(1);
    }
    text = text.replace(c.from, () => c.to);
    controlApplied = true;
    console.log(`   NEGATIVE CONTROL ON (${CONTROL}): in memory, ${rel} now reads ${JSON.stringify(c.to.trim().slice(0, 90))}`);
  }
  if (rel.endsWith('.html')) return stripHtml(text);
  if (rel.endsWith('.txt')) return text;
  return stripCode(text);
}

const sources = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })
  .map(f => 'src/' + String(f).split(path.sep).join('/'))
  .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f))
  /* src/test is tests, and seoMetaParts is the build's copy of seoMeta.ts */
  .filter(f => !f.startsWith('src/test/') && !f.startsWith('src/data/seoMetaParts/'))
  .sort();
const code = new Map(sources.map(f => [f, read(f)]));
const heldSeen = new Map();
const held = (file, what) => heldSeen.set(file, [...(heldSeen.get(file) ?? []), what]);

/* ── rule 1: one disclaimer ───────────────────────────────────────────── */
console.log('1) one disclaimer a page');
/* "not affiliated with" only counts when the site is the one saying it of
   itself, in the same sentence: a club puzzle may say two clubs are not
   affiliated with each other. */
const DISCLAIMER = [/\bDoUKnowBall\b[^.]{0,80}?\bnot affiliated with\b/gi, /\bpropert(?:y|ies) of their respective owners\b/gi];
const disclaimersIn = text => DISCLAIMER.map(re => (text.match(re) ?? []).length);
/** Section 6 of the Terms is the clause itself, so it is cut out before the
    count. With no such heading nothing is cut and the clause fails as a stray,
    which is the safe way round. */
function outsideTheClause(text) {
  const start = text.indexOf('Intellectual Property');
  if (start < 0) return text;
  const next = text.indexOf('<h2', start);
  return text.slice(0, start) + (next < 0 ? '' : text.slice(next));
}
let clauseKept = 0;
for (const [file, text] of code) {
  const [aff, own] = disclaimersIn(file === TERMS ? outsideTheClause(text) : text);
  if (file === TERMS) clauseKept = disclaimersIn(text)[0] - aff;
  if (file === FOOTER) {
    if (aff !== 1 || own !== 1) fail(`the footer says DoUKnowBall is "not affiliated with" ${aff} times and "property of their respective owners" ${own} times; once each is the one disclaimer every page shows`);
    continue;
  }
  if (!aff && !own) continue;
  if (HELD.has(file)) { held(file, 'a trademark disclaimer of its own'); continue; }
  fail(`${file} prints a trademark disclaimer of its own. The footer is under every page (src/App.tsx) and already says it in full, so this one shows as a second footer: take it out`);
}
console.log(`   ${sources.length} source files read with comments stripped; the footer says it once, section 6 of the Terms keeps its clause (${clauseKept})`);

/* ── rule 2: one count ────────────────────────────────────────────────── */
console.log('2) one game count');
const SITE_WORD = /\b(?:free|sports|trivia|browser|online)\b/i;
const COUNT = /(?<![\d.,/:-])(?:(?<plus>\d{2,4})\+|(?<word>over|more than|nearly|almost)\s+(?<wn>\d{2,4}|a hundred)|(?<exact>\d{2,4}))\s+(?<adj>(?:(?:free|sports|trivia|browser|online|daily|playable|different|other|more)\s+)*)games\b/gi;
const ALL_OF_THEM = /\ball\s+(?<exact>\d{2,4})\s+of them\b/gi;
const NOT_A_SITE_TAIL = /^\s+(?:played|started|in a row|straight|a season|per)\b/i;
const nearTotal = n => n >= TOTAL_GAMES - 2 && n <= TOTAL_GAMES;
const oneLine = s => s.replace(/\s+/g, ' ');

/** Every count of the site's games a text types, as { says, label }: label is
    "N+" when it is written as a floor with a plus, else null. Shapes a, b and
    c of the header, in that order. */
function siteCounts(text) {
  const out = [];
  for (const m of text.matchAll(COUNT)) {
    const g = m.groups;
    const n = g.plus ? Number(g.plus) : g.wn ? (/hundred/i.test(g.wn) ? 100 : Number(g.wn)) : Number(g.exact);
    const lead = (text.slice(Math.max(0, m.index - 12), m.index).match(/\b(?:all|there are)\s+$/i) ?? [''])[0];
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 24);
    let says = null;
    if (SITE_WORD.test(g.adj)) says = m[0];
    else if ((g.plus || g.word) && n >= 100 && n <= 300 && n % 10 === 0 && !NOT_A_SITE_TAIL.test(tail)) says = m[0];
    else if (g.exact && nearTotal(n) && (lead || /^\s+(?:here|on the site|on this site|on DoUKnowBall)\b/i.test(tail))) says = lead + m[0];
    if (says) out.push({ says: oneLine(says), label: g.plus ? `${g.plus}+` : null });
  }
  for (const m of text.matchAll(ALL_OF_THEM)) {
    if (nearTotal(Number(m.groups.exact))) out.push({ says: oneLine(m[0]), label: null });
  }
  return out;
}

/* The shapes, proved on fixed sentences before any file is trusted to them:
   the first list is the audit's own findings, the second is sport. */
{
  const MUST = [
    '120+ free sports games in the browser', 'One of 100+ free sports games on DoUKnowBall', '100+ free games across every sport',
    'over 100 free sports trivia games', 'Over 100 games covering soccer', 'a puzzle site with 100+ games',
    `all ${TOTAL_GAMES} games`, `All ${TOTAL_GAMES} of them.`, `There are ${TOTAL_GAMES - 1} games here`,
  ];
  const MUST_NOT = [
    'the sim plays all 82 games', 'decides your fate over 162 games', '900+ games played', '120+ Games Played', '2,000+ Games Played',
    'not more than 50 games with their NBA team', 'Finish 100 games.', 'played all 17 games on a joint', '1,130+ RBI', 'more than thirty soccer games',
  ];
  const missed = MUST.filter(s => siteCounts(s).length !== 1);
  const wrong = MUST_NOT.filter(s => siteCounts(s).length !== 0);
  if (missed.length) fail(`the count shapes no longer catch ${JSON.stringify(missed)}`);
  if (wrong.length) fail(`the count shapes now take sport for the site: ${JSON.stringify(wrong)}`);
  console.log(`   the shapes catch ${MUST.length - missed.length} of ${MUST.length} site counts and leave ${MUST_NOT.length - wrong.length} of ${MUST_NOT.length} sport ones alone`);
}

const texts = new Map(code);
for (const file of Object.keys(LITERAL_FILES)) if (!texts.has(file)) texts.set(file, read(file));
const literalSeen = Object.fromEntries(Object.keys(LITERAL_FILES).map(f => [f, 0]));
const owedSeen = new Set();
let history = 0, notTheSite = 0;
const sameWords = (a, b) => a.toLowerCase() === b.toLowerCase();
for (const [file, text] of texts) {
  for (const c of siteCounts(text)) {
    if (HELD.has(file)) { held(file, `types ${JSON.stringify(c.says)}`); continue; }
    if (file === HISTORY) { history += 1; continue; }
    if (NOT_THE_SITE.some(x => x.file === file && sameWords(x.says, c.says))) { notTheSite += 1; continue; }
    if (file in LITERAL_FILES) {
      literalSeen[file] += 1;
      if (c.label === GAME_COUNT_LABEL) continue;
      if (OWED.some(o => o.file === file && o.says === c.says)) { owedSeen.add(file); continue; }
      fail(`${file} types ${JSON.stringify(c.says)} and the registry's label is ${GAME_COUNT_LABEL}. This file cannot read the registry, so retype it. When the label has moved up a ten: the three description tags in index.html and the description in src/pages/Index.tsx by hand, then node scripts/genHomeCopy.mjs for the static block`);
      continue;
    }
    fail(`${file} types a count of the site's games: ${JSON.stringify(c.says)}. Print GAME_COUNT_LABEL (or TOTAL_GAMES for the exact number) from src/data/gameRegistry.ts instead. If the number is not about this site, add the file and the words to NOT_THE_SITE with the reason`);
  }
}
for (const [file, least] of Object.entries(LITERAL_FILES)) {
  if (literalSeen[file] < least) fail(`${file} carries ${literalSeen[file]} count(s) of the site's games and at least ${least} are expected there, so either the copy lost its count or this harness has stopped reading it`);
}
for (const o of OWED) {
  if (owedSeen.has(o.file)) console.log(`   owed, not failed: ${o.file} still types ${JSON.stringify(o.says)} (${o.why})`);
  else fail(`${o.file} is on OWED for typing ${JSON.stringify(o.says)} and no longer does: delete its line from OWED, and the label rule holds the file from then on`);
}
for (const x of NOT_THE_SITE) {
  if (!(texts.get(x.file) ?? '').toLowerCase().includes(x.says.toLowerCase())) fail(`NOT_THE_SITE lists ${JSON.stringify(x.says)} in ${x.file} and the file no longer says it: delete the line`);
}
console.log(`   typed counts read and held to ${GAME_COUNT_LABEL}: ${Object.entries(literalSeen).map(([f, n]) => `${f} ${n}`).join(', ')}`);
console.log(`   allowed as written: ${history} in the What's New log, ${notTheSite} on NOT_THE_SITE`);

/* ── the held files, said out loud every run ──────────────────────────── */
console.log(`3) held by the other lane, listed and not failed (${HELD.size} files, ${heldSeen.size} with something to show)`);
for (const [file, what] of heldSeen) console.log(`   ${file}: ${what.join('; ')}`);

/* ── the verdict ──────────────────────────────────────────────────────── */
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!controlApplied) { console.error(`\ncontrol ${CONTROL}: ${c.file} was never read, so the control changed nothing`); process.exit(1); }
  const owned = failureMessages.filter(m => m.startsWith(c.expect)).length;
  const other = failureMessages.length - owned;
  if (owned === 1 && other === 0) {
    console.log(`\nsimTrustCopy control ${CONTROL}: green. The planted line was reported and nothing else was.`);
    process.exit(0);
  }
  console.error(`\nsimTrustCopy control ${CONTROL}: RED. Wanted exactly one failure starting ${JSON.stringify(c.expect)}, got ${owned}, with ${other} other failure(s).`);
  process.exit(1);
}
if (failureMessages.length) { console.error(`\nsimTrustCopy: ${failureMessages.length} failure(s)`); process.exit(1); }
console.log('   teeth: comments stripped before any match, the footer counted, the shapes proved on fixed sentences, five TRUST_CONTROL runs that plant one defect each');
console.log('\nsimTrustCopy: green. One disclaimer under every page and one count of the games, the registry\'s own.');
