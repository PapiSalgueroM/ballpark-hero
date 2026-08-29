/**
 * Round 137 permanent guard: no invented words in a real person's mouth.
 *
 * WHY THIS EXISTS
 *
 * Club Manager squads are real people. clubManagerRosters.ts is baked out of
 * the market value table, 2942 named professionals across 196 clubs. A real
 * name next to a factual number is reporting and it is defensible. A real name
 * next to a sentence he supposedly said, or next to a thing he supposedly did
 * on a Tuesday night, is not, and both this repo and the site are public and
 * indexable.
 *
 * Before Round 137 the inbox shipped lines like a named international saying
 * "You told me I was a star here", and a drama pool that had named men
 * crashing cars at 2am, sitting in casinos two nights before a match, and
 * falling out with their wives on Instagram. None of that ever happened. All
 * of it was rendered with a real name in front of it.
 *
 * THE LINE THIS ENFORCES
 *
 *   Football events inside the sim KEEP the name. Minutes, selection, morale,
 *   transfer requests, bids. That is what a management sim is, the name is
 *   doing honest work, and none of it is presented as speech.
 *
 *   Invented speech and invented off pitch conduct LOSE the name. Attributed
 *   to a squad role instead, so no roster name shares a string with them.
 *
 * HOW IT MEASURES, AND WHY IT IS NOT A "DOES NOT CRASH" HARNESS
 *
 * Three passes, and the third is the one that makes the other two worth having:
 *
 *   1. RUNTIME. Drives real seasons at real clubs, harvests every string the
 *      game can actually put on screen (inbox text, resolved outcomes, match
 *      events), and checks each against the real roster. This is the pass that
 *      matters, because it tests rendered output rather than source code.
 *
 *   2. STATIC. Scans src for a literal roster name sharing a line with
 *      first person speech. Catches hand written copy the runtime pass never
 *      reaches.
 *
 *   3. SELF TEST, against a baseline of the exact strings Round 137 removed.
 *      A detector that finds nothing passes for two very different reasons:
 *      the code is clean, or the detector is broken. So the known bad lines
 *      from Round 136 are kept here as fixtures and the detector MUST flag
 *      every one of them. If pass 3 fails, passes 1 and 2 mean nothing and
 *      this harness says so rather than reporting green.
 *
 * The counts are printed on purpose. A run that harvested 4 strings and found
 * no violations has not tested anything, so pass 1 fails below a floor.
 *
 * Run: node scripts/simNoInventedQuotes.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'quotesEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'quotes.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const rosters = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts');
const era2010 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2010.ts');
export const cm = mod;
// Round 146: the 2010 era ships real people too, so its 802 names join the
// never-quote set through the same {"n":"..."} harvest below.
export const rs = { modern: rosters, era2010 };
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);

const { cm, rs } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry, answerMessage, autoPickXI, FORMATIONS, ensureRoles } = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------- the real people we must never quote ---------- */

/**
 * Every name in the baked rosters, plus every surname long enough to be
 * unambiguous. Surnames matter because narrative copy says "Salah", not
 * "Mohamed Salah", and a full name match alone would sail straight past it.
 */
/**
 * Surnames that are also ordinary English. Without this the guard fires on
 * the word "March" in a sentence about the run-in, on "Small money now" in a
 * boot deal, and on "you gamble on Arnold Palmer" in a golf explainer, and a
 * guard that cries wolf three times a round gets deleted in the fourth.
 * Every entry here is a real collision that was observed, not a guess.
 */
const SURNAME_STOPLIST = new Set([
  'March', 'Small', 'Young', 'Palmer', 'Doku', 'Silva', 'Santos', 'Costa',
  'Moreno', 'Sarr', 'Bright', 'Church', 'Cash', 'Dean', 'Fry', 'Long',
  'Love', 'Mount', 'Reed', 'Rice', 'Sharp', 'Ward', 'White', 'Wood',
  // Round 146: the 2010 bake brought David Villa, whose surname is also a
  // club (Aston Villa), and Minefield's trivia line about the club tripped
  // the guard. The full name check still protects the man himself.
  'Villa',
]);

function realNames() {
  const full = new Set();
  const rosterBlob = JSON.stringify(rs);
  for (const m of rosterBlob.matchAll(/"n":"([^"]{3,})"/g)) full.add(m[1]);
  const surnames = new Set();
  for (const n of full) {
    const parts = n.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    // Short surnames (Sun, Ba, Vini) collide with ordinary words, so they are
    // carried by the full name check only.
    if (parts.length > 1 && last.length >= 5 && !SURNAME_STOPLIST.has(last)) surnames.add(last);
  }
  return { full, surnames };
}

const { full: FULL_NAMES, surnames: SURNAMES } = realNames();

/* ---------- the detector ---------- */

/**
 * Strip diacritics before any word-boundary test.
 *
 * This is not cosmetic, it fixed a real false positive. JavaScript's \b treats
 * an accented letter as a non-word character unless the pattern is unicode
 * aware, so "Jérémy" reads to the engine as J | r | my, and \bmy\b matched
 * inside the man's first name. The guard duly reported that Jérémy Doku was
 * being quoted in a data row that contains no speech at all.
 *
 * Folding accents also makes the name match stricter in the useful direction:
 * copy that writes "Mbappe" for "Mbappé" is now caught rather than missed.
 */
const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** A run inside quote marks that reads as somebody talking. */
const QUOTED = /["“”][^"“”]{8,}["“”]/g;
const FIRST_PERSON = /\b(I|I'm|I am|I've|I'll|my|me|mine|we|we're|us|our|boss|gaffer)\b/;
const isSpeech = s => FIRST_PERSON.test(deaccent(s));

/**
 * Speech-shaped copy that is not wrapped in quote marks: a colon or a dash
 * handing over to a first person sentence, which is the other way a line ends
 * up reading as something he said.
 */
const UNQUOTED_SPEECH = /(?::|,)\s+(?:I|I'm|I am|I've|my|we|we're)\b/;

/**
 * Conduct we will not allege about a named person, quoted or not.
 * Deliberately narrow. An earlier draft banned the word "gamble" outright and
 * lit up three per-game strategy guides that were telling the reader to take a
 * risk, which is not an allegation about anybody.
 */
const ALLEGATION = /\b(casino|gambling debts?|drunk|drink driv\w*|crashed his|arrested|having an affair|cheating on|missed training|hungover|assaulted)\b/i;

function namesIn(text) {
  const flat = deaccent(text);
  const hits = new Set();
  for (const n of FULL_NAMES) if (n.length >= 6 && flat.includes(deaccent(n))) hits.add(n);
  if (hits.size === 0) {
    for (const s of SURNAMES) {
      // word boundary so "Kane" does not fire inside "Kanejumper"
      const flatSur = deaccent(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${flatSur}\\b`).test(flat)) { hits.add(s); break; }
    }
  }
  return [...hits];
}

/**
 * Returns a reason string when this text puts words in a real person's mouth
 * or alleges conduct about him, and null when it is clean.
 */
/**
 * Returns a reason string when this text puts words in a real person's mouth
 * or alleges conduct about him, and null when it is clean.
 *
 * `strict` is for source lines, where one line of TypeScript routinely holds
 * several unrelated quoted runs. `{ name: "Jérémy Doku", style: "..." }` is a
 * data row, not a man talking, so in strict mode the name and the first person
 * speech have to be inside the SAME quoted run before it counts. Rendered
 * output has no such structure, so runtime uses the looser whole-string rule.
 */
function violation(text, strict = false) {
  if (typeof text !== 'string' || text.length < 8) return null;
  const names = namesIn(text);
  if (names.length === 0) return null;
  const quoted = text.match(QUOTED) ?? [];
  for (const q of quoted) {
    if (!isSpeech(q)) continue;
    if (strict && namesIn(q).length === 0) continue;
    return `real name (${names[0]}) shares a line with quoted speech ${q.slice(0, 60)}`;
  }
  if (UNQUOTED_SPEECH.test(deaccent(text))) return `real name (${names[0]}) hands over to a first person sentence`;
  const alleged = text.match(ALLEGATION);
  if (alleged) return `real name (${names[0]}) next to alleged conduct "${alleged[0]}"`;
  return null;
}

/* ---------- pass 3 first: prove the detector actually detects ---------- */

console.log('3) Self test: the detector still catches what Round 137 removed');
{
  /* Verbatim from clubManager.ts at Round 136, with {P} resolved the way the
     game resolved it. If the detector stops flagging these, it has been broken
     and every green result below is meaningless. */
  const KNOWN_BAD = [
    'Mohamed Salah caught you in the corridor. "You told me I was a star man here. 2 of the last 10, boss. Which is it?"',
    'Mohamed Salah knocked on your office door: "I did not join this club to model the warmup jacket. I want to start."',
    "Mohamed Salah's agent texts you at midnight: my client trains like a machine and sits like furniture. Start him.",
    'Mohamed Salah after the win: "That one was for you, boss. The lads would run through a wall for you right now."',
    'Mohamed Salah put it in writing. "Look at the squad list, boss. Star man is what you have me down as. I am worth more than that somewhere else."',
    'Mohamed Salah was spotted at a casino until 4am two nights before the match. He says he was "networking".',
    'Mohamed Salah crashed his brand new Lamborghini into the training ground fountain at 2am. The fountain lost.',
    'Mohamed Salah missed training because he flew to Milan "for a haircut". The haircut is admittedly immaculate.',
    // An accented name must still be caught. The accent folding that fixed the
    // Jérémy Doku false positive must not have opened a hole the other way.
    'Kylian Mbappé caught you in the corridor. "I want to start on Saturday, boss."',
    'Kylian Mbappe caught you in the corridor. "I want to start on Saturday, boss."',
  ];
  let caught = 0;
  for (const bad of KNOWN_BAD) {
    if (violation(bad)) caught += 1;
    else console.error(`  MISSED: ${bad.slice(0, 90)}`);
  }
  console.log(`   ${caught} of ${KNOWN_BAD.length} known bad lines flagged`);
  if (caught !== KNOWN_BAD.length) {
    fail(`the detector only catches ${caught} of ${KNOWN_BAD.length} lines it is supposed to catch, so nothing else this harness reports can be trusted`);
  }

  /* And the other half of a working detector: it must leave the defensible
     shapes alone, or it turns permanently red and gets deleted. */
  const KNOWN_GOOD = [
    'Mohamed Salah put it in writing. He is down as a star man and he has started 2 of the last 10, so he wants to leave.',
    'You promised Mohamed Salah a start and he was not on the teamsheet. He noticed, and so did the dressing room.',
    'One of your midfielders adopted an emotional support alpaca and wants to bring it to the training ground.',
    'Mohamed Salah scored twice and set up a third. Match rating 8.4.',
    'Your star man has started a podcast. Episode one is called Why My Manager Does Not Understand Football.',
    // The Soccer Career protagonist is created by the player, so quoting him is fine.
    '"I never gave up," they revealed.',
    /* The regression that produced this fixture: \b treats an accent as a word
       break, so "Jérémy" parsed as J, r, my and the guard read the "my" in his
       own first name as him talking. A data row is not speech. */
    '{ name: "Jérémy Doku", positions: ["RW", "LW"], style: "Pure chaos, dribbles at fullbacks all day" }',
  ];
  let falsePositives = 0;
  for (const good of KNOWN_GOOD) {
    const v = violation(good);
    if (v) { falsePositives += 1; console.error(`  FALSE POSITIVE: ${good.slice(0, 80)} :: ${v}`); }
  }
  console.log(`   ${KNOWN_GOOD.length - falsePositives} of ${KNOWN_GOOD.length} defensible lines left alone`);
  if (falsePositives > 0) fail(`${falsePositives} defensible lines were flagged, so this guard would be deleted within a week`);
}

/* ---------- pass 1: drive real seasons and read what shows up ---------- */

console.log('1) Runtime: every line real seasons can put on screen');
{
  const CLUBS = ['Everton', 'Manchester City', 'Burnley', 'Real Madrid', 'Ajax', 'Leeds United', 'Inter Miami', 'Wolverhampton Wanderers'];
  const harvested = [];
  const seen = new Set();
  const keep = t => { if (typeof t === 'string' && t && !seen.has(t)) { seen.add(t); harvested.push(t); } };

  for (const club of CLUBS) {
    for (let run = 0; run < 3; run++) {
      let s = startCareer(club);
      ensureRoles(s);
      s.xiIds = autoPickXI(s.squad, FORMATIONS[s.formationIndex] ?? FORMATIONS[0]);
      let guard = 0;
      while (s.week < s.calendar.length && guard < 140) {
        guard += 1;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        for (const e of r.result?.events ?? []) keep(e);
        for (const h of s.aiHeadlines ?? []) keep(h);
        for (const m of s.inbox ?? []) { keep(m.text); keep(m.resolved); }
        /* Answer things, because half the copy in this system only exists
           after a decision and an unanswered inbox never renders it. */
        const open = (s.inbox ?? []).filter(m => !m.resolved && m.options.length > 0);
        for (const m of open) {
          s = answerMessage(s, m.id, guard % m.options.length);
        }
        for (const m of s.inbox ?? []) { keep(m.text); keep(m.resolved); }
        if (r.kind === 'seasonOver') break;
      }
    }
  }

  console.log(`   harvested ${harvested.length} distinct lines across ${CLUBS.length} clubs`);
  /* A run that harvested almost nothing proves nothing, so the pass fails
     below a floor rather than reporting a hollow green.
     Measured, ten trials of this exact loop: 221 225 228 231 233 236 238 240
     241 248. Floor set at 150, which is a third below the worst trial and so
     will not flake, while still catching the failure this guards against:
     the harvest loop silently stopping (a changed playNextEntry signature,
     an inbox that no longer populates) and dropping the count to single
     figures. */
  if (harvested.length < 150) {
    fail(`only ${harvested.length} lines harvested, so this pass did not actually exercise the narrative and its green result is meaningless`);
  }

  const bad = [];
  for (const t of harvested) {
    const v = violation(t);
    if (v) bad.push({ t, v });
  }
  console.log(`   ${bad.length} of them put words in a real player's mouth`);
  for (const b of bad.slice(0, 12)) console.error(`     ${b.v}\n       ${b.t.slice(0, 150)}`);
  if (bad.length > 0) fail(`${bad.length} rendered lines attribute invented speech or conduct to a real player`);
}

/* ---------- pass 2: literal names in source copy ---------- */

console.log('2) Static: hand written copy in src');
{
  const SKIP = /node_modules|\.git|dist|build/;
  /* Data files are name plus factual attributes, which is the defensible case
     and the entire point of the site. They are not narrative. */
  const SKIP_FILE = /\/src\/data\/(?!gameContent)/;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP.test(p)) walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !SKIP_FILE.test(p)) files.push(p);
    }
  })(path.join(ROOT, 'src'));

  /* ROUND 335: THE OWNER IS ALLOWED TO SPEAK FOR HIMSELF, AND ONLY HIMSELF.
   *
   * Round 346 shipped the maker note, Anthony's own first person hello on the
   * home page, written by him and shipped at his request. This scan flagged it,
   * because "Anthony" is also a surname in the roster set, so his own sentence
   * about his own site read exactly like words put in a footballer's mouth.
   *
   * The rule this harness enforces protects THIRD PARTIES: never invent words
   * or conduct for a real person who did not say or do them. It cannot sensibly
   * protect a man from a sentence he wrote about himself, so the owner's own
   * voice file is exempt, and the exemption is drawn as tightly as it can be:
   *   - it applies to that one file, not to the site;
   *   - it applies only when the ONLY real name on the line is the owner's own,
   *     so a footballer named in his note still fails there like anywhere else;
   *   - the owner's name anywhere else in src still fails, so nobody can smuggle
   *     an invented quote in behind his first name.
   * Section 3b below plants a real player's quote inside the exempt file and
   * requires it to fail, which is what stops this being a back door. */
  const OWNER_VOICE = /src[/\\]components[/\\]home[/\\]MakerNote\.tsx$/;
  const OWNER_NAME = 'anthony';
  const ownersOwnSentence = (file, line) => {
    if (!OWNER_VOICE.test(file)) return false;
    const names = namesIn(line);
    return names.length === 1 && names[0].toLowerCase() === OWNER_NAME;
  };

  const bad = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    txt.split('\n').forEach((ln, i) => {
      const v = violation(ln, true);
      if (v && !ownersOwnSentence(f, ln)) bad.push({ f: f.replace(ROOT + '/', ''), i: i + 1, v, ln: ln.trim().slice(0, 130) });
    });
  }
  console.log(`   scanned ${files.length} files, ${bad.length} offending lines`);
  for (const b of bad.slice(0, 15)) console.error(`     ${b.f}:${b.i} ${b.v}\n       ${b.ln}`);
  if (bad.length > 0) fail(`${bad.length} source lines put invented words or conduct on a real player`);

  /* 2b. The owner exemption is not a back door, proven rather than asserted.
     Three planted lines, judged against the exempt file itself: his own
     sentence passes, a footballer quoted in his file fails, and his own words
     moved to any other file fail. If the first stops passing the exemption is
     dead weight; if either of the others stops failing, it is a hole. */
  const OWNER_FILE = path.join(ROOT, 'src/components/home/MakerNote.tsx');
  const OTHER_FILE = path.join(ROOT, 'src/pages/Index.tsx');
  const ownLine = "Hey, I'm Anthony. DoUKnowBall is my first ever coding project, an independent site";
  /* The planted player line is deliberately the SAME SHAPE that caught the
     maker note, a real name handing over to a first person sentence, with the
     person swapped. An earlier draft planted 'Mohamed Salah told me: "..."',
     which the strict source rule ignores by design (the name sits outside the
     quoted run, so a data row like { name: "..." } cannot false positive), so
     the probe proved nothing about the exemption and said so. */
  const playerLine = "Hey, I'm Mohamed Salah. DoUKnowBall is my first ever coding project, an independent site";
  const probes = [
    ['the owner\'s own sentence in his own file', OWNER_FILE, ownLine, false],
    ['a real player quoted inside the owner\'s file', OWNER_FILE, playerLine, true],
    ['the owner\'s sentence moved to another file', OTHER_FILE, ownLine, true],
  ];
  for (const [label, file, line, shouldFlag] of probes) {
    const flagged = !!violation(line, true) && !ownersOwnSentence(file, line);
    console.log(`   ${flagged ? 'flags' : 'passes'}: ${label}`);
    if (flagged !== shouldFlag) {
      fail(shouldFlag
        ? `the owner exemption is a back door: ${label} was allowed through`
        : `the owner exemption is dead: ${label} is still flagged`);
    }
  }
}

/* ---------- ---------- */

console.log('');
if (failures > 0) {
  console.error(`simNoInventedQuotes: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNoInventedQuotes: green. No real player is quoted or accused anywhere.');
