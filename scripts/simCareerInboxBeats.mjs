/**
 * Round 796 harness: the NFL career's inbox on the football calendar, and
 * the rival choices, both on engines lifted out of Soccer Career.
 *
 * His 2026-08-28 backlog row "Bring the Soccer Career depth to the NFL
 * career, then the other US careers": Rounds 469, 470, 521 and 525 shared the
 * money app, the gram, the rival, the badges, the inbox and the rivalry
 * beats. Two things were still not there. The NFL inbox was the flagship's
 * between-seasons phone with football words in it, arriving on no beat of
 * the football year, and the NFL rival never asked you anything: every beat
 * was a card with one Continue button. Round 796 gives careerInbox.ts a
 * calendar and lifts Soccer Career's four rival dilemmas into
 * careerRivalryChoices.ts, then binds the NFL career to both.
 *
 * SECTIONS
 *
 *   1. Soccer unchanged, HARD. scripts/lib/soccerInboxProbe796.mjs drives the
 *      shared inbox through SOCCER_INBOX (60 seeded careers, 6 seasons each,
 *      answers and the three refusals) and applyMoralDilemmaChoice through
 *      every option of the four rival dilemmas (192 resolutions, rival on and
 *      off the save), plus the dilemma list's order. Its output was recorded
 *      into scripts/data/soccerInboxFixture796.json against b04c7897, BEFORE
 *      any Round 796 code moved. Same procedure now; any difference fails.
 *      1b. The soccer trigger's gate for those four, which moved into
 *      careerRivalryChoices.ts, against a golden copy of the three lines it
 *      replaced, over thousands of synthesized states.
 *   2. Source. The delivery rule (one-offs first) and the choice roll live
 *      only in their shared files, comments stripped, and every binding is
 *      actually imported.
 *   3. The NFL inbox delivers on the NFL calendar. 40 seeded careers. Every
 *      delivered text carries a beat, the beat matches its template's tag,
 *      and the season really had it, judged here from the season line's own
 *      result string rather than through nflSeasonBeats: no playoff text in
 *      a year the team went home, no contract text unless the coming season
 *      is the last of a deal, draft night's one text before a down is
 *      played. One-off beats are never skipped when they happened and had a
 *      text left. The four ordinary beats each carry a real share.
 *      3c. A career's final season carries no text about a season to come:
 *      no contract year beat (the calendar marks it `ahead`) and no `ahead`
 *      text (the 6am offseason sessions, a cleat deal, a documentary on next
 *      year). 120 careers played all the way to retirement; careers that go
 *      on must still get those texts, so the gate cannot pass by shutting
 *      them for everybody.
 *   4. Speakers are roles. No sender is a real player's name, none is shaped
 *      like a person's First Last, and no delivered line contains a real
 *      player's full name.
 *   5. Rival choices. 5a every NFL choice reachable and naming the rival;
 *      5b every option does what its button says, to the number, with the
 *      gamble landing at its printed odds (2,000 draws each, on a real save
 *      of the sport): the card's words are read on their own ("Morale +6",
 *      "Net worth -$100k", "the feud cools") and held against what each draw
 *      actually did, and every field of the save outside the five meters
 *      must come out exactly as it went in (review fix: before it, an option
 *      that also moved health, rating or salary, or a button that claimed a
 *      stat it never paid, stayed green); 5c the morale
 *      an option promises really moves the next season's stat line, paired
 *      careers on identical random streams; 5d in 40 real careers the
 *      choice fires at a measured rate, never stacks with a beat, never
 *      repeats until every choice has been seen, and refuses a double tap.
 *   6. Old saves load. A pre-521 save (no inbox, no karma, no rivalry
 *      fields) and a pre-796 save (texts with no beat, no choice fields),
 *      each through JSON and several more seasons: nothing throws, the old
 *      texts stay answerable, the new ones carry beats.
 *   7. The NBA, MLB and NHL careers bind the same choice engine with tables
 *      of their own. For each: 7a every choice reachable, naming the rival,
 *      carrying its own sport's id; 7b honest to the number (5b's check);
 *      7c the morale option reaches that sport's stat line, paired seasons on
 *      identical streams; 7d forty real careers, the same rules as 5d; 7e ten
 *      pre-796 saves of that sport play eight more seasons and meet choices.
 *      Their inboxes are NOT on a calendar yet: that needs a beat-tagged text
 *      bank and a season beat reader per sport, which this round leaves as
 *      the binding point (receiveInboxTextsFor's beats argument).
 *   8. The season stream, HARD. The choice roll runs inside each sport's
 *      season sim on seasonChoiceRng, a generator keyed to the save, never on
 *      the season's own stream. Twenty seeded careers a sport, played with
 *      the roll on and with it blocked: every season line, the final rating
 *      and the age must be identical. A roll that drew from the stream would
 *      reshuffle every seeded career on the site, and with it every harness
 *      that samples them (it did, before this section: it moved simAwards'
 *      NHL All-Star median, a gate that sits within two points of its line
 *      on main).
 *   9. The inbox stream, HARD. The NFL inbox draws from its own generator
 *      keyed to the save and the moment (nflInboxRng), never the season's.
 *      Twenty seeded careers played with the inbox open (every text marked
 *      read the moment it lands, no effect applied, so it delivers every
 *      season) and shut (six unread texts on the save from draft night, so it
 *      delivers nothing): every season line, the final rating and the age
 *      must be identical. Before this section the inbox drew from the season
 *      stream, and simAwards' NFL figures moved with every text the bank
 *      gained.
 *
 * BANDS, measured with BEATS_SEED_BASE=0..5 (six seed sets, 40 careers each,
 * about 546 career-seasons a set):
 *   NFL texts per career-season              1.998 to 2.000   floor 1.6
 *     (the attentive player leaves the newest text unanswered, so a season
 *     wants 3 less 1; the rate sits on 2 until a beat's bank runs dry)
 *   share of all texts on each ordinary beat  camp 14.4 to 15.0%, bye 13.9
 *     to 17.4%, deadline 15.2 to 17.9%, offseason 15.5 to 18.3%   floor 8%
 *   rival choices per career-season           0.157 to 0.202   floor 0.12
 *     (one sd of the rate is about 0.017 at this sample size)
 *   gambles, |realized mean - promise|        at most 0.202    tolerance 1.0
 *   gambles, |hit rate - printed odds|        at most 0.0155   tolerance 0.04
 *   stat score per morale point (5c)          0.369 to 0.411   floor 0.15
 *   paired seasons the morale option led      289 to 293 of 300  floor 70%
 *   3c, 120 careers to retirement: final seasons the summer before a contract
 *     year 57 to 69 (floor 15), final seasons with an ahead text still unsent
 *     95 to 104 (floor 30), forward looking texts in a final season 0 (hard)
 *     (NFL figures re-measured after the inbox moved off the season stream)
 *   section 7, same six seed sets, 40 careers (560 career-seasons) a sport:
 *     choices per career-season   NBA 0.204 to 0.236, MLB 0.195 to 0.239,
 *                                 NHL 0.196 to 0.239            floor 0.12
 *     stat score per morale point NBA 0.139 to 0.151, MLB 0.194 to 0.208,
 *                                 NHL 0.244 to 0.264            floor 0.05
 *       (a lever that stopped reaching the field reads exactly 0, because
 *       the paired seasons share every draw)
 *     paired seasons led          NBA 296 to 300, MLB 252 to 265, NHL 253
 *                                 to 265 of 300                 floor 60%
 *     gambles                     at most 0.259 off the promise, 0.0185 off
 *                                 the odds (same tolerances as 5b)
 *     choices met by ten pre-796 saves in eight more seasons: NBA 15, MLB 14,
 *     NHL 22 (seeded apart from the seed set)            floor 1
 *   section 8: 20 of 20 careers identical in every sport and every seed set,
 *     the roll firing 45 to 69 times a sport along the way   hard, and the
 *     roll must fire at least once
 *   section 9: 20 of 20 careers identical in every seed set, the open inbox
 *     delivering 717 to 743 texts along the way (floor 200), the shut one 0
 *
 * NEGATIVE CONTROLS, BEATS_CONTROL=...
 *
 *   nobeats      the NFL tick stops passing the season's beats, so texts
 *                arrive on the old between-seasons path. Section 3 fails.
 *   allbeats     every season claims a playoff run. Section 3 fails.
 *   realname     the draft night coach text is signed "Tom Brady", a real
 *                player in src/data. Section 4 fails.
 *   soccerline   one soccer rival dilemma outcome line gains a "!". Section
 *                1 fails.
 *   soccerdrift  the shared mood drift moves 3 a season instead of 2.
 *                Section 1 fails.
 *   soccergate   the enemy's call opens at 23 instead of 24. Section 1b
 *                fails.
 *   liar         the shared meter writer doubles every fanbase move, so the
 *                buttons stop doing what they say. Section 5b fails.
 *   sidestat     every option also ages the player a year, a stat no button
 *                names. Sections 5b and 7b fail (the whole save is watched,
 *                not only the five meters).
 *   overpromise  every button's words claim an extra Morale +1 the tap never
 *                pays. Sections 5b and 7b fail (the words are read on their
 *                own and held against each draw's outcome).
 *   nochoice     the NFL rival choice chance is zero. Section 5d fails.
 *   nochoicenba, nochoicemlb, nochoicenhl
 *                that sport's rival choice chance is zero. Section 7d and 7e
 *                fail for that sport.
 *   flatnba      the NBA season stops reading morale. Section 7c fails.
 *   streamnba    the NBA season hands its own stream to the choice roll.
 *                Section 8 fails for the NBA.
 *   inboxstream  the NFL progress hands its own stream to the inbox.
 *                Section 9 fails.
 *   aheadretire  the NFL progress tells the inbox every career goes on, so a
 *                retiring player is sent texts about next season. Section 3c
 *                fails.
 *
 *   Each control asserts the text it rewrites appears exactly once in the
 *   file first, so a control that rewrites nothing cannot pass for the
 *   wrong reason.
 *
 * Run: node scripts/simCareerInboxBeats.mjs
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeSoccer, RIVAL_DILEMMA_IDS } from './lib/soccerInboxProbe796.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.BEATS_CONTROL || '';
const SEED_BASE = Number(process.env.BEATS_SEED_BASE || 0);

/* A control is one [file, from, to] edit, or a list of them (Round 822: the
   nobeats controls swap a call AND the import it needs). */
const IMPORT_CAL = 'receiveCalendarInboxTexts as receiveCalendarInboxTextsFor,';
const IMPORT_BOTH = 'receiveCalendarInboxTexts as receiveCalendarInboxTextsFor, receiveInboxTexts as receiveInboxTextsFor,';
const PATCHES = {
  nobeats: [
    ['src/lib/nflCareerInbox.ts', IMPORT_CAL, IMPORT_BOTH],
    ['src/lib/nflCareerInbox.ts', 'return receiveCalendarInboxTextsFor(c, "pro", NFL_INBOX, rng ?? inboxStream(c, "season"), nflSeasonBeats(c), goesOn && !c.retired);', 'return receiveInboxTextsFor(c, "pro", NFL_INBOX, rng ?? inboxStream(c, "season"));'],
  ],
  allbeats: ['src/lib/nflCareerInbox.ts', 'if ((line.poGames ?? 0) > 0) beats.push("playoffs");', 'beats.push("playoffs");'],
  realname: ['src/lib/nflCareerInbox.ts', 'id: "draft_coach", from: "Head coach"', 'id: "draft_coach", from: "Tom Brady"'],
  soccerline: ['src/lib/soccerCareerEngine.ts', '"🤐 You refused quietly. Somewhere', '"🤐 You refused quietly! Somewhere'],
  soccerdrift: ['src/lib/careerInbox.ts', 'const next = mood > 50 ? mood - 2 :', 'const next = mood > 50 ? mood - 3 :'],
  soccergate: ['src/lib/soccerCareerEngine.ts', 'when: s => s.age >= 24,', 'when: s => s.age >= 23,'],
  liar: ['src/lib/careerRivalryChoices.ts', 'if (e.fanbase) s.fanbase = clamp(s.fanbase + e.fanbase, 0, 100);', 'if (e.fanbase) s.fanbase = clamp(s.fanbase + e.fanbase * 2, 0, 100);'],
  sidestat: ['src/lib/careerRivalryChoices.ts', 'applyMeterEffect(s, promise.effect);', 'applyMeterEffect(s, promise.effect); (s as unknown as { age: number }).age += 1;'],
  overpromise: ['src/lib/careerRivalryChoices.ts', 'consequence: consequence.charAt(0).toUpperCase() + consequence.slice(1),', 'consequence: consequence.charAt(0).toUpperCase() + consequence.slice(1) + ", Morale +1",'],
  nochoice: ['src/lib/nflCareerRivalryEvents.ts', 'export const NFL_RIVALRY_CHOICE_CHANCE = 0.45;', 'export const NFL_RIVALRY_CHOICE_CHANCE = 0;'],
  nochoicenba: ['src/lib/nbaCareerRivalryEvents.ts', 'export const NBA_RIVALRY_CHOICE_CHANCE = 0.45;', 'export const NBA_RIVALRY_CHOICE_CHANCE = 0;'],
  nochoicemlb: ['src/lib/mlbCareerRivalryEvents.ts', 'export const MLB_RIVALRY_CHOICE_CHANCE = 0.45;', 'export const MLB_RIVALRY_CHOICE_CHANCE = 0;'],
  nochoicenhl: ['src/lib/nhlCareerRivalryEvents.ts', 'export const NHL_RIVALRY_CHOICE_CHANCE = 0.45;', 'export const NHL_RIVALRY_CHOICE_CHANCE = 0;'],
  flatnba: ['src/lib/nbaMyCareer.ts', 'const form = c.ovr + (c.morale - 60) / 12 +', 'const form = c.ovr + (60 - 60) / 12 +'],
  streamnba: ['src/lib/nbaMyCareer.ts', 'else nbaRivalryChoiceTick(c);', 'else nbaRivalryChoiceTick(c, rng);'],
  inboxstream: ['src/lib/nflMyCareer.ts', 'receiveNflInboxTexts(c, !shouldRetire(c));', 'receiveNflInboxTexts(c, !shouldRetire(c), rng);'],
  aheadretire: ['src/lib/nflMyCareer.ts', 'receiveNflInboxTexts(c, !shouldRetire(c));', 'receiveNflInboxTexts(c, true);'],
  /* Round 822: the NBA, MLB and NHL calendars (section 10). */
  nobeatsnba: [
    ['src/lib/nbaCareerInbox.ts', IMPORT_CAL, IMPORT_BOTH],
    ['src/lib/nbaCareerInbox.ts', 'return receiveCalendarInboxTextsFor(c, "pro", NBA_INBOX, rng ?? inboxStream(c, "season"), nbaSeasonBeats(c), goesOn && !c.retired);', 'return receiveInboxTextsFor(c, "pro", NBA_INBOX, rng ?? inboxStream(c, "season"));'],
  ],
  allbeatsmlb: ['src/lib/mlbCareerInbox.ts', 'if ((line.poGames ?? 0) > 0) beats.push("october");', 'beats.push("october");'],
  juniorsnhl: ['src/lib/nhlCareerInbox.ts', 'if (line.age <= 19) beats.push("juniors");', 'beats.push("juniors");'],
  aheadretirenba: ['src/lib/nbaMyCareer.ts', 'receiveNbaInboxTexts(c, !nbaShouldRetire(c));', 'receiveNbaInboxTexts(c, true);'],
  aheadretiremlb: ['src/lib/mlbMyCareer.ts', 'receiveMlbInboxTexts(c, !mlbShouldRetire(c));', 'receiveMlbInboxTexts(c, true);'],
  aheadretirenhl: ['src/lib/nhlMyCareer.ts', 'receiveNhlInboxTexts(c, !nhlShouldRetire(c));', 'receiveNhlInboxTexts(c, true);'],
  inboxstreamnba: ['src/lib/nbaMyCareer.ts', 'receiveNbaInboxTexts(c, !nbaShouldRetire(c));', 'receiveNbaInboxTexts(c, !nbaShouldRetire(c), rng);'],
  inboxstreammlb: ['src/lib/mlbMyCareer.ts', 'receiveMlbInboxTexts(c, !mlbShouldRetire(c));', 'receiveMlbInboxTexts(c, !mlbShouldRetire(c), rng);'],
  inboxstreamnhl: ['src/lib/nhlMyCareer.ts', 'receiveNhlInboxTexts(c, !nhlShouldRetire(c));', 'receiveNhlInboxTexts(c, !nhlShouldRetire(c), rng);'],
  realnamemlb: ['src/lib/mlbCareerInbox.ts', 'id: "draft_manager", from: "Manager"', 'id: "draft_manager", from: "Derek Jeter"'],
  oldidsnhl: ['src/lib/nhlCareerInbox.ts', 'id: "billet_family", from: "Old billet family"', 'id: "billet_family_v2", from: "Old billet family"'],
};
if (CONTROL && !PATCHES[CONTROL]) {
  console.error(`BEATS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(PATCHES).join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const norm = s => s.split('\r\n').join('\n');
const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ─── the control, applied to the content esbuild loads ─────────────────── */

/** Every patched file, by absolute path, with its edited contents. */
const patched = new Map();
if (CONTROL) {
  const edits = Array.isArray(PATCHES[CONTROL][0]) ? PATCHES[CONTROL] : [PATCHES[CONTROL]];
  for (const [rel, from, to] of edits) {
    const abs = path.resolve(path.join(ROOT, rel));
    const raw = patched.get(abs) ?? readSrc(rel);
    const count = raw.split(from).length - 1;
    if (count !== 1) {
      console.error(`control ${CONTROL}: ${rel} contains ${JSON.stringify(from)} ${count} times, not once, so this control would prove nothing`);
      process.exit(1);
    }
    patched.set(abs, raw.replace(from, to));
  }
  console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);
}
const controlPlugin = {
  name: 'beats-control',
  setup(b) {
    if (patched.size === 0) return;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const contents = patched.get(path.resolve(args.path));
      if (contents === undefined) return undefined;
      return { contents, loader: args.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  },
};

/* ─── bundle the real engines ────────────────────────────────────────────── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inboxbeats-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${R}/src/lib/soccerCareerEngine.ts');
export const inboxMod = await import('${R}/src/lib/careerInbox.ts');
export const choices = await import('${R}/src/lib/careerRivalryChoices.ts');
export const nfl = await import('${R}/src/lib/nflMyCareer.ts');
export const nflInbox = await import('${R}/src/lib/nflCareerInbox.ts');
export const nflRivalry = await import('${R}/src/lib/nflCareerRivalryEvents.ts');
export const awards = await import('${R}/src/lib/careerAwards.ts');
export const intl = await import('${R}/src/lib/intlNames.ts');
export const nba = await import('${R}/src/lib/nbaMyCareer.ts');
export const nbaRivalry = await import('${R}/src/lib/nbaCareerRivalryEvents.ts');
export const mlb = await import('${R}/src/lib/mlbMyCareer.ts');
export const mlbRivalry = await import('${R}/src/lib/mlbCareerRivalryEvents.ts');
export const nhl = await import('${R}/src/lib/nhlMyCareer.ts');
export const nhlRivalry = await import('${R}/src/lib/nhlCareerRivalryEvents.ts');
export const nbaInbox = await import('${R}/src/lib/nbaCareerInbox.ts');
export const mlbInbox = await import('${R}/src/lib/mlbCareerInbox.ts');
export const nhlInbox = await import('${R}/src/lib/nhlCareerInbox.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [controlPlugin], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const { soccer, inboxMod, choices, nfl, nflInbox, nflRivalry, awards, intl, nba, nbaRivalry, mlb, mlbRivalry, nhl, nhlRivalry, nbaInbox, mlbInbox, nhlInbox } = B;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Soccer unchanged, against the fixture recorded before the lift
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('1) Soccer unchanged: the inbox and the four rival dilemmas against the pre-lift fixture');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/soccerInboxFixture796.json'), 'utf8'));
  const now = JSON.parse(JSON.stringify(probeSoccer({ soccer, inboxMod })));
  /* The first place two JSON values part, as a readable path. */
  const firstDiff = (a, b, where) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return null;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      for (const k of keys) {
        const d = firstDiff(a[k], b[k], `${where}.${k}`);
        if (d) return d;
      }
    }
    return `${where}: fixture ${JSON.stringify(a)?.slice(0, 160)} but now ${JSON.stringify(b)?.slice(0, 160)}`;
  };
  const seasons = fixture.inbox.reduce((n, c) => n + c.seasons.length, 0);
  const delivered = fixture.inbox.reduce((n, c) => n + c.seasons.reduce((m, s) => m + s.fresh.length, 0), 0);
  for (const part of ['dilemmaOrder', 'rivalDilemmaDefs', 'inbox', 'rivalDilemmas']) {
    const d = firstDiff(fixture[part], now[part], part);
    if (d) fail(`Soccer Career changed: ${d}`);
  }
  console.log(`   ${fixture.inbox.length} careers and ${seasons} inbox seasons (${delivered} texts delivered), ${fixture.rivalDilemmas.length} rival dilemma resolutions and the ${fixture.dilemmaOrder.length} dilemma order, compared whole`);
  if (seasons < 300 || delivered < 300 || fixture.rivalDilemmas.length < 150) fail('the fixture is thinner than the probe should produce, so this comparison proves less than it says');
}

console.log('1b) The soccer trigger gate for the four rival dilemmas, against the lines it replaced');
{
  const golden = (id, s) => {
    if (RIVAL_DILEMMA_IDS.includes(id) && (!s.rival || s.rival.retired)) return false;
    if (id === 'rival_club_offer' && s.age < 24) return false;
    if (id === 'goat_debate_show' && s.overall < 85) return false;
    return true;
  };
  const ids = soccer.SOCCER_RIVALRY_CHOICES.map(d => d.id);
  if (JSON.stringify(ids) !== JSON.stringify(RIVAL_DILEMMA_IDS)) fail(`SOCCER_RIVALRY_CHOICES holds ${ids.join(', ')}, not the four rival dilemmas in order`);
  let checks = 0, mismatches = 0, open = 0;
  for (let seed = 1; seed <= 4000; seed += 1) {
    const rng = mulberry32(seed * 271 + 9);
    const roll = rng();
    const s = {
      age: 16 + Math.floor(rng() * 25),
      overall: 60 + Math.floor(rng() * 40),
      rival: roll < 0.2 ? null : { retired: roll < 0.35 },
    };
    for (const def of soccer.SOCCER_RIVALRY_CHOICES) {
      checks += 1;
      const want = golden(def.id, s);
      const got = choices.rivalryChoiceOpen(s, s.rival, def);
      if (got) open += 1;
      if (want !== got) {
        mismatches += 1;
        if (mismatches <= 3) fail(`${def.id} with age ${s.age}, overall ${s.overall}, rival ${JSON.stringify(s.rival)}: the old gate said ${want}, the shared one says ${got}`);
      }
    }
  }
  console.log(`   ${checks} gate checks, ${open} open, ${mismatches} disagreed with the lines they replaced`);
  if (mismatches > 3) fail(`${mismatches - 3} more gate disagreements, not printed`);
  if (open < checks * 0.3 || open > checks * 0.9) fail(`only ${open} of ${checks} gates open, so the states do not exercise both sides of the gate`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Source: the rules live in the shared files, and the bindings are real
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('2) Source: one home for each rule, every binding imported');
{
  function stripComments(t) {
    return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  }
  const code = new Map();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) code.set(path.relative(ROOT, p).split(path.sep).join('/'), stripComments(norm(fs.readFileSync(p, 'utf8'))));
    }
  })(path.join(ROOT, 'src'));
  const RULES = [
    { home: 'src/lib/careerInbox.ts', what: 'the one-offs-first delivery rule', re: /open\.filter\(b => b\.oneOff\)/ },
    { home: 'src/lib/careerInbox.ts', what: 'the one-text-a-beat draw', re: /pickInboxTexts\(atBeat\(b\), age, phase, usedIds, 1, rng\)/ },
    { home: 'src/lib/careerRivalryChoices.ts', what: 'the choice roll', re: /if \(rng\(\) >= chance\) return null;/ },
    { home: 'src/lib/careerRivalryChoices.ts', what: 'the prefer-unseen rule', re: /const unseen = defs\.filter\(d => !seenIds\.includes\(d\.id\)\)/ },
    { home: 'src/lib/careerRivalryChoices.ts', what: 'the shared gate', re: /return !!r && !r\.retired && def\.when\(p, r\)/ },
    /* Round 822: the final season gate and the inbox stream key, which Round
       796 wrote inside the NFL binding, live once for all four sports. */
    { home: 'src/lib/careerInbox.ts', what: 'the final season gate on ahead texts', re: /\.pool\.filter\(t => !t\.ahead\)/ },
    { home: 'src/lib/careerInbox.ts', what: 'the final season gate on ahead beats', re: /filter\(b => b\.ahead\)/ },
    { home: 'src/lib/careerInbox.ts', what: 'the inbox stream key', re: /\|inbox-\$\{moment\}/ },
  ];
  for (const rule of RULES) {
    if (!rule.re.test(code.get(rule.home) ?? '')) fail(`${rule.what} is not in ${rule.home}, so the fingerprint is stale and this check proves nothing`);
    for (const [rel, text] of code) {
      if (rel !== rule.home && rule.re.test(text)) fail(`${rel} carries a private copy of ${rule.what}`);
    }
  }
  const BINDINGS = [
    ['src/lib/nflCareerInbox.ts', /deliverInboxTexts as deliverInboxTextsFor/, 'the NFL inbox uses the shared delivery for draft night'],
    ['src/lib/nflCareerInbox.ts', /receiveCalendarInboxTextsFor\(c, "pro", NFL_INBOX, rng \?\? inboxStream\(c, "season"\), nflSeasonBeats\(c\), goesOn && !c\.retired\)/, 'the NFL season tick passes the season\'s beats, on the inbox\'s own stream'],
    ['src/lib/nbaCareerInbox.ts', /receiveCalendarInboxTextsFor\(c, "pro", NBA_INBOX, rng \?\? inboxStream\(c, "season"\), nbaSeasonBeats\(c\), goesOn && !c\.retired\)/, 'the NBA season tick passes the season\'s beats, on the inbox\'s own stream'],
    ['src/lib/mlbCareerInbox.ts', /receiveCalendarInboxTextsFor\(c, "pro", MLB_INBOX, rng \?\? inboxStream\(c, "season"\), mlbSeasonBeats\(c\), goesOn && !c\.retired\)/, 'the MLB season tick passes the season\'s beats, on the inbox\'s own stream'],
    ['src/lib/nhlCareerInbox.ts', /receiveCalendarInboxTextsFor\(c, "pro", NHL_INBOX, rng \?\? inboxStream\(c, "season"\), nhlSeasonBeats\(c\), goesOn && !c\.retired\)/, 'the NHL season tick passes the season\'s beats, on the inbox\'s own stream'],
    ['src/lib/nbaMyCareer.ts', /receiveNbaInboxTexts\(c, !nbaShouldRetire\(c\)\);/, 'NBA progress runs the inbox off the season stream and tells it whether the career goes on'],
    ['src/lib/mlbMyCareer.ts', /receiveMlbInboxTexts\(c, !mlbShouldRetire\(c\)\);/, 'MLB progress runs the inbox off the season stream and tells it whether the career goes on'],
    ['src/lib/nhlMyCareer.ts', /receiveNhlInboxTexts\(c, !nhlShouldRetire\(c\)\);/, 'NHL progress runs the inbox off the season stream and tells it whether the career goes on'],
    ['src/components/nba-my-career/NbaMyCareerBoard.tsx', /nbaDraftNightInbox\(c\);/, 'the NBA board delivers draft night on the inbox\'s own stream'],
    ['src/components/mlb-my-career/MlbMyCareerBoard.tsx', /mlbDraftNightInbox\(c\);/, 'the MLB board delivers draft day on the inbox\'s own stream'],
    ['src/components/nhl-my-career/NhlMyCareerBoard.tsx', /nhlDraftNightInbox\(c\);/, 'the NHL board delivers draft day on the inbox\'s own stream'],
    ['src/components/nba-my-career/NbaMyCareerBoard.tsx', /calendar=\{NBA_CALENDAR\}/, 'the NBA inbox panel is handed the calendar'],
    ['src/components/mlb-my-career/MlbMyCareerBoard.tsx', /calendar=\{MLB_CALENDAR\}/, 'the MLB inbox panel is handed the calendar'],
    ['src/components/nhl-my-career/NhlMyCareerBoard.tsx', /calendar=\{NHL_CALENDAR\}/, 'the NHL inbox panel is handed the calendar'],
    ['src/lib/nflMyCareer.ts', /receiveNflInboxTexts\(c, !shouldRetire\(c\)\);/, 'progress runs the inbox off the season stream and tells it whether the career goes on'],
    ['src/lib/nflCareerRivalryEvents.ts', /from "\.\/careerRivalryChoices"/, 'the NFL rivalry file binds the shared choices'],
    ['src/lib/soccerCareerEngine.ts', /from "\.\/careerRivalryChoices"/, 'the soccer engine binds the shared choices'],
    ['src/lib/soccerCareerEngine.ts', /if \(rivalChoice && !rivalryChoiceOpen\(s, s\.rival, rivalChoice\)\) return false;/, 'the soccer trigger gates the four through the shared gate'],
    ['src/lib/soccerCareerEngine.ts', /resolveRivalryChoice\(s, s\.rival, dilemma\.id, idx, SOCCER_RIVALRY_CHOICES, Math\.random\)/, 'the soccer dilemma resolves the four through the shared engine'],
    ['src/lib/nflMyCareer.ts', /else nflRivalryChoiceTick\(c\);/, 'the NFL season rolls a choice when no beat came up, off the season stream'],
    ['src/components/nfl-my-career/NflMyCareerBoard.tsx', /nflDraftNightInbox\(c\);/, 'the NFL board delivers draft night on the inbox\'s own stream'],
    ['src/components/nfl-my-career/NflMyCareerBoard.tsx', /<RivalryChoiceCard/, 'the NFL board draws the choice card'],
    ['src/components/nfl-my-career/NflMyCareerBoard.tsx', /calendar=\{NFL_CALENDAR\}/, 'the NFL inbox panel is handed the calendar'],
    ['src/lib/nbaCareerRivalryEvents.ts', /from "\.\/careerRivalryChoices"/, 'the NBA rivalry file binds the shared choices'],
    ['src/lib/nbaMyCareer.ts', /else nbaRivalryChoiceTick\(c\);/, 'the NBA season rolls a choice when no beat came up, off the season stream'],
    ['src/components/nba-my-career/NbaMyCareerBoard.tsx', /<RivalryChoiceCard/, 'the NBA board draws the choice card'],
    ['src/lib/mlbCareerRivalryEvents.ts', /from "\.\/careerRivalryChoices"/, 'the MLB rivalry file binds the shared choices'],
    ['src/lib/mlbMyCareer.ts', /else mlbRivalryChoiceTick\(c\);/, 'the MLB season rolls a choice when no beat came up, off the season stream'],
    ['src/components/mlb-my-career/MlbMyCareerBoard.tsx', /<RivalryChoiceCard/, 'the MLB board draws the choice card'],
    ['src/lib/nhlCareerRivalryEvents.ts', /from "\.\/careerRivalryChoices"/, 'the NHL rivalry file binds the shared choices'],
    ['src/lib/nhlMyCareer.ts', /else nhlRivalryChoiceTick\(c\);/, 'the NHL season rolls a choice when no beat came up, off the season stream'],
    ['src/components/nhl-my-career/NhlMyCareerBoard.tsx', /<RivalryChoiceCard/, 'the NHL board draws the choice card'],
  ];
  for (const [rel, re, what] of BINDINGS) if (!re.test(code.get(rel) ?? '')) fail(`${what}: not found in ${rel}`);
  /* Each rival dilemma outcome is written once, inside SOCCER_RIVALRY_CHOICES,
     not a second time in a leftover switch case. */
  const soccerCode = code.get('src/lib/soccerCareerEngine.ts') ?? '';
  for (const opening of ["📞 You answered the enemy's call", '🟥 Revenge tasted sweet', '📼 You sent a four-minute highlight reel', '💛 One night, one shirt, one cause']) {
    const n = soccerCode.split(opening).length - 1;
    if (n !== 1) fail(`soccerCareerEngine.ts writes "${opening}" ${n} times, not once inside SOCCER_RIVALRY_CHOICES`);
  }
  if (/case "rival_club_offer": \{/.test(soccerCode)) fail('soccerCareerEngine.ts still has its own rival_club_offer case body');
  console.log(`   ${RULES.length} rule fingerprints, ${BINDINGS.length} bindings checked`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. The NFL inbox delivers on the NFL calendar
   ═══════════════════════════════════════════════════════════════════════════ */

const positions = Object.keys(nfl.ARCHETYPES);
const ORDINARY = ['camp', 'bye', 'deadline', 'offseason'];
const NFL = nflInbox.NFL_INBOX;
const poolById = new Map(NFL.pool.map(d => [d.id, d]));
const fitsAge = (d, age) => (d.minAge === undefined || age >= d.minAge) && (d.maxAge === undefined || age <= d.maxAge);
const allDeliveredText = [];

/** Play one NFL career the way the board does, calling `onTick` after every
 *  season's inbox with what the harness needs to judge it. */
function playNflCareer(seed, { onDraft, onTick, onRival, years = 14 } = {}) {
  const rng = mulberry32(SEED_BASE * 100003 + seed * 911 + 7);
  const pos = positions[seed % positions.length];
  const arch = nfl.ARCHETYPES[pos][seed % nfl.ARCHETYPES[pos].length];
  const c = nfl.startCareer(`Beats ${seed}`, pos, arch, rng, null);
  let tq = nfl.rollTeamQuality(null, rng);
  nfl.nflAssignRole(c, tq, rng);
  const draft = nflInbox.nflDraftNightInbox(c);
  onDraft?.(c, draft);
  let state = c;
  for (let year = 0; year < years && !state.retired; year += 1) {
    if (year > 0) tq = nfl.rollTeamQuality(tq, rng);
    if (state.contractYears <= 0) state.contractYears = 2 + (year % 3); /* a new deal, the way free agency would sign one */
    nfl.nflCampBattle(state, tq, rng);
    const usedBefore = new Set(state.phoneUsedIds ?? []);
    const unansweredBefore = (state.phoneInbox ?? []).filter(m => m.answered === undefined).length;
    const { line } = nfl.simSeason(state, tq, rng);
    nfl.progress(state, rng);
    const fresh = (state.phoneInbox ?? []).filter(m => !usedBefore.has(m.defId));
    onTick?.(state, { line, fresh, usedBefore, unansweredBefore });
    for (const m of fresh) { allDeliveredText.push(m.from, m.text); for (const ch of m.choices) allDeliveredText.push(ch.label, ch.reply); }
    if (nfl.shouldRetire(state)) state.retired = true;
    /* An attentive player: everything but the newest text answered. */
    const pending = (state.phoneInbox ?? []).filter(m => m.answered === undefined);
    for (let i = 0; i < pending.length - 1; i += 1) nflInbox.answerNflInboxMessage(state, pending[i].id, (seed + i) % pending[i].choices.length);
    onRival?.(state, rng);
    if (state.pendingRivalryEvent) state = nflRivalry.dismissNflRivalryEvent(state, rng).state;
    if (state.pendingRivalryChoice) {
      const res = nflRivalry.resolveNflRivalryChoice(state, (seed + year) % state.pendingRivalryChoice.choices.length, rng);
      if (res) state = res.state;
    }
  }
  return state;
}

console.log('3) The NFL inbox: every text on a beat its season really had');
{
  let careers = 0, seasons = 0, delivered = 0, draftOk = 0;
  let offBeat = 0, untagged = 0, mistagged = 0, doubled = 0, overWant = 0;
  let playoffSeasons = 0, playoffTexts = 0, playoffMissed = 0, contractSeasons = 0, contractTexts = 0, contractMissed = 0;
  const perBeat = Object.fromEntries(nflInbox.NFL_CALENDAR.map(b => [b.id, 0]));
  for (let seed = 1; seed <= 40; seed += 1) {
    careers += 1;
    playNflCareer(seed, {
      onDraft: (c, draft) => {
        if (draft.length === 1 && draft[0].beat === 'draft' && poolById.get(draft[0].defId)?.beat === 'draft') draftOk += 1;
        else fail(`seed ${seed}: draft night delivered ${JSON.stringify(draft.map(m => [m.defId, m.beat]))}, not one draft text`);
        perBeat.draft += draft.length;
        for (const m of draft) allDeliveredText.push(m.from, m.text);
      },
      onTick: (c, { line, fresh, usedBefore, unansweredBefore }) => {
        seasons += 1;
        delivered += fresh.length;
        /* The truth, read off the season's own result string, not through
           nflSeasonBeats: a season that missed the playoffs says so. */
        const played = line.teamResult !== 'SUSPENDED';
        const madePlayoffs = played && line.teamResult !== 'Missed the playoffs';
        /* The summer before a contract year, for a career that is not about
           to end: shouldRetire is the board's own test, asked right after. */
        const contractAhead = c.contractYears === 1 && !nfl.shouldRetire(c);
        const had = new Set(['offseason']);
        if (played) { had.add('camp'); had.add('bye'); had.add('deadline'); }
        if (madePlayoffs) had.add('playoffs');
        if (contractAhead) had.add('contract');
        const beatsSeen = new Set();
        for (const m of fresh) {
          if (!m.beat) { untagged += 1; fail(`seed ${seed} ${line.year}: "${m.defId}" arrived with no beat`); continue; }
          if (poolById.get(m.defId)?.beat !== m.beat) { mistagged += 1; fail(`seed ${seed} ${line.year}: "${m.defId}" arrived on ${m.beat} but is written for ${poolById.get(m.defId)?.beat}`); }
          if (!had.has(m.beat)) { offBeat += 1; if (offBeat <= 5) fail(`seed ${seed} ${line.year}: "${m.defId}" arrived on ${m.beat}, a beat this season never had (${line.teamResult}, ${c.contractYears} years left)`); }
          if (beatsSeen.has(m.beat)) { doubled += 1; fail(`seed ${seed} ${line.year}: two texts on ${m.beat} in one season`); }
          beatsSeen.add(m.beat);
          perBeat[m.beat] = (perBeat[m.beat] ?? 0) + 1;
        }
        const want = Math.max(0, NFL.wantPerSeason - unansweredBefore);
        if (fresh.length > want) { overWant += 1; fail(`seed ${seed} ${line.year}: ${fresh.length} texts with only ${want} wanted`); }
        /* One-offs are never skipped when they happened, a text was left
           for this player, and the season wanted anything at all. */
        const leftFor = beat => NFL.pool.some(d => d.beat === beat && !usedBefore.has(d.id) && fitsAge(d, c.age));
        if (madePlayoffs) {
          playoffSeasons += 1;
          if (beatsSeen.has('playoffs')) playoffTexts += 1;
          else if (want > 0 && leftFor('playoffs')) { playoffMissed += 1; fail(`seed ${seed} ${line.year}: a playoff season with a playoff text left and room for it delivered none`); }
        }
        if (contractAhead) {
          contractSeasons += 1;
          if (beatsSeen.has('contract')) contractTexts += 1;
          else if (want > (madePlayoffs && leftFor('playoffs') ? 1 : 0) && leftFor('contract')) { contractMissed += 1; fail(`seed ${seed} ${line.year}: the summer before a contract year with a contract text left and room for it delivered none`); }
        }
      },
    });
  }
  const rate = delivered / seasons;
  const totalTexts = Object.values(perBeat).reduce((a, b) => a + b, 0);
  const share = b => perBeat[b] / Math.max(1, totalTexts);
  console.log(`   ${careers} careers, ${draftOk} draft nights with exactly one draft text, ${delivered} season texts over ${seasons} career-seasons (rate ${rate.toFixed(3)} against a want of ${NFL.wantPerSeason})`);
  console.log(`   by beat: ${Object.entries(perBeat).map(([b, n]) => `${b} ${n} (${(share(b) * 100).toFixed(1)}%)`).join(', ')}`);
  console.log(`   ${playoffSeasons} playoff seasons carried ${playoffTexts} playoff texts, ${contractSeasons} contract summers carried ${contractTexts} contract texts; ${offBeat} off-beat, ${untagged} untagged, ${mistagged} mistagged, ${doubled} doubled, ${overWant} over the want, ${playoffMissed + contractMissed} one-offs skipped`);
  if (offBeat > 5) fail(`${offBeat - 5} more texts arrived on a beat their season never had, not printed`);
  if (draftOk < careers) fail(`only ${draftOk} of ${careers} draft nights delivered exactly one draft text`);
  if (rate < 1.6) fail(`the NFL delivers ${rate.toFixed(3)} texts a career-season, under the 1.6 floor (measured 1.995 to 2.000)`);
  for (const b of ORDINARY) if (share(b) < 0.08) fail(`only ${(share(b) * 100).toFixed(1)}% of texts arrived on ${b}, under the 8% floor (measured 13.6% or more on every ordinary beat), so the calendar is not really being used`);
  if (playoffSeasons < 40) fail(`only ${playoffSeasons} playoff seasons across the run, too few to judge the playoff beat`);
  if (contractSeasons < 40) fail(`only ${contractSeasons} contract summers across the run, too few to judge the contract beat`);
  if (playoffTexts === 0 || contractTexts === 0) fail('a one-off beat never delivered at all');

  /* 3c. A career's final season never carries a text about a season to
     come: no contract year beat, no ahead text (the 6am offseason sessions,
     a cleat deal, a documentary on next year). Careers played all the way
     to retirement, so the final season is the one shouldRetire ends. */
  const aheadBeats = new Set(nflInbox.NFL_CALENDAR.filter(b => b.ahead).map(b => b.id));
  const aheadTexts = new Set(NFL.pool.filter(d => d.ahead).map(d => d.id));
  let finals = 0, finalsInContractSummer = 0, finalsAheadLeft = 0, finalsWithAhead = 0, finalTexts = 0, goOnAhead = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    playNflCareer(1000 + seed, {
      years: 22,
      onTick: (c, { fresh, usedBefore }) => {
        const ahead = fresh.filter(m => aheadBeats.has(m.beat) || aheadTexts.has(m.defId));
        if (!nfl.shouldRetire(c)) { goOnAhead += ahead.length; return; }
        finals += 1;
        finalTexts += fresh.length;
        if (c.contractYears === 1) finalsInContractSummer += 1;
        if (NFL.pool.some(d => (aheadBeats.has(d.beat) || aheadTexts.has(d.id)) && !usedBefore.has(d.id) && fitsAge(d, c.age))) finalsAheadLeft += 1;
        if (ahead.length > 0) {
          finalsWithAhead += 1;
          if (finalsWithAhead <= 3) fail(`seed ${1000 + seed}, final season at ${c.age}: the retiring player was sent ${ahead.map(m => `"${m.defId}" on ${m.beat}`).join(', ')}, a text about a season he will never play`);
        }
      },
    });
  }
  console.log(`   3c: ${finals} careers played to retirement, ${finalTexts} texts in their final seasons, ${finalsInContractSummer} of them ending the summer before a contract year, ${finalsAheadLeft} with an ahead text still unsent; ${finalsWithAhead} final seasons carried a forward looking text (careers that go on received ${goOnAhead})`);
  if (finalsWithAhead > 3) fail(`${finalsWithAhead - 3} more final seasons carried a forward looking text, not printed`);
  if (finals < 60) fail(`only ${finals} careers reached retirement, too few to judge the final season`);
  if (finalsInContractSummer < 15 || finalsAheadLeft < 30) fail(`only ${finalsInContractSummer} final seasons fell the summer before a contract year and ${finalsAheadLeft} had an ahead text left, so 3c barely tested the case it exists for`);
  if (goOnAhead === 0) fail('no career that goes on ever received an ahead text, so the ahead gate is shutting them for everybody');

  /* 3b. A suspended year had no football: only the offseason can speak. */
  const c = nfl.startCareer('Suspended', 'QB', nfl.ARCHETYPES.QB[0], mulberry32(5), null);
  c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
  const beats = nflInbox.nflSeasonBeats(c);
  if (JSON.stringify(beats) !== JSON.stringify(['offseason'])) fail(`a suspended season reads as ${JSON.stringify(beats)}, not the offseason alone`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. Speakers are roles, never a real player
   ═══════════════════════════════════════════════════════════════════════════ */

/** Every real player name the site knows: the src/data harvest plus the
 *  international name lists. Built once, shared by sections 4 and 10. */
let REAL_NAMES = null;
function realNames() {
  if (REAL_NAMES) return REAL_NAMES;
  const real = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const t = fs.readFileSync(p, 'utf-8');
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*'([A-Z][^']{2,40})'/g)) real.add(m[1]);
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*"([A-Z][^"]{2,40})"/g)) real.add(m[1]);
      }
    }
  })(path.join(ROOT, 'src/data'));
  for (const n of intl.allIntlNames()) real.add(n);
  REAL_NAMES = real;
  return real;
}

console.log('4) Speakers: roles only, and no real player anywhere in a delivered text');
{
  const real = realNames();
  const NAME_SHAPE = /^[A-Z][a-z]+\s[A-Z][a-z]+/;
  let realSender = 0, nameShaped = 0;
  const senders = new Set(NFL.pool.map(d => d.from));
  for (const from of senders) {
    if (real.has(from)) { realSender += 1; fail(`inbox sender "${from}" is a real player's name`); }
    if (NAME_SHAPE.test(from)) { nameShaped += 1; fail(`inbox sender "${from}" reads as a First Last name rather than a role`); }
  }
  /* Full names only (a space inside), so a common word can never match. */
  const fullNames = [...real].filter(n => n.includes(' ') && n.length >= 7);
  const blob = allDeliveredText.join('\n');
  let inText = 0;
  for (const n of fullNames) {
    if (blob.includes(n)) { inText += 1; if (inText <= 3) fail(`a delivered NFL text contains the real name "${n}"`); }
  }
  console.log(`   ${real.size} real names harvested, ${senders.size} senders in the bank, ${realSender} real, ${nameShaped} shaped like a name, ${inText} real full names inside ${allDeliveredText.length} delivered strings`);
  if (real.size < 8000) fail(`only ${real.size} real names harvested, this check is not checking much`);
  if (allDeliveredText.length < 500) fail('too little delivered text was collected to judge');
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. Rival choices
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('5) Rival choices: reachable, honest to the number, and they move the season');
const CHOICES = nflRivalry.NFL_RIVALRY_CHOICES;
const meterOf = s => ({ morale: s.morale, fanbase: s.fanbase, cash: s.netWorth ?? 0, karma: s.karma ?? 50, heat: s.rivalryIntensity ?? 0 });
const METERS = ['morale', 'fanbase', 'cash', 'karma', 'heat'];
const midState = over => ({
  name: 'Mid', pos: 'QB', ovr: 86, age: 27, seasons: [{}, {}, {}, {}, {}, {}], rings: 0, team: 'KC',
  morale: 50, fanbase: 50, netWorth: 10, karma: 50, rivalryIntensity: 50, ...over,
});
const midRival = over => ({ name: 'Rival Mid', pos: 'QB', team: 'DAL', ovr: 86, pot: 92, age: 27, rings: 0, hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0, ...over });
/* The save fields a rival choice is allowed to move, by the names the four
   American saves use. Anything else that changes is a stat no button names. */
const METER_FIELDS = ['morale', 'fanbase', 'netWorth', 'karma', 'rivalryIntensity'];
const restOf = s => { const o = { ...s }; for (const k of METER_FIELDS) delete o[k]; return JSON.stringify(o); };
/** What a piece of card text claims, read off the words alone, never off the
 *  option's own numbers or the module's describer: "Morale +6", "Net worth
 *  -$100k", "the feud heats up". A "<Word> +N" this reader does not know is
 *  returned in `unknown`, because a button claiming a stat the harness cannot
 *  watch cannot be called honest. */
function claimsOf(text) {
  const c = { morale: 0, fanbase: 0, karma: 0, cash: 0, heat: 0, unknown: [] };
  if (!text) return c;
  for (const m of text.matchAll(/\b(Morale|Fanbase|Karma) ([+-]\d+)\b/gi)) c[m[1].toLowerCase()] += Number(m[2]);
  for (const m of text.matchAll(/\bNet worth ([+-])\$(\d+(?:\.\d+)?)(M|k)\b/gi)) c.cash += (m[1] === '-' ? -1 : 1) * Number(m[2]) * (m[3] === 'k' ? 0.001 : 1);
  if (/feud heats up/i.test(text)) c.heat += 1;
  if (/feud cools/i.test(text)) c.heat -= 1;
  const stripped = text.replace(/\b(Morale|Fanbase|Karma) [+-]\d+\b/gi, '').replace(/\bNet worth [+-]\$\d+(?:\.\d+)?(M|k)\b/gi, '');
  for (const m of stripped.matchAll(/\b[A-Za-z][A-Za-z ]{0,30}? [+-]\$?\d/g)) c.unknown.push(m[0]);
  return c;
}
const addClaims = (a, b) => ({ morale: a.morale + b.morale, fanbase: a.fanbase + b.fanbase, karma: a.karma + b.karma, cash: a.cash + b.cash, heat: a.heat + b.heat });
/** Measured against claimed: the four numbered meters to the number, the
 *  feud by direction (the card says "heats up" or "cools", never a number). */
function claimMismatch(claim, before, after) {
  const d = {
    morale: after.morale - before.morale, fanbase: after.fanbase - before.fanbase,
    karma: (after.karma ?? 50) - (before.karma ?? 50), cash: (after.netWorth ?? 0) - (before.netWorth ?? 0),
    heat: (after.rivalryIntensity ?? 0) - (before.rivalryIntensity ?? 0),
  };
  for (const k of ['morale', 'fanbase', 'karma']) if (d[k] !== claim[k]) return `${k} moved ${d[k]}, the words say ${claim[k]}`;
  if (Math.abs(d.cash - claim.cash) > 1e-6) return `net worth moved ${d.cash.toFixed(3)}, the words say ${claim.cash}`;
  if (Math.sign(d.heat) !== Math.sign(claim.heat)) return `the feud moved ${d.heat}, the words say ${claim.heat > 0 ? 'it heats up' : claim.heat < 0 ? 'it cools' : 'nothing'}`;
  return null;
}
/** 5b and 7b: every option in a sport's table does what its button says.
 *  `base` is a real save of that sport, at mid meters so nothing clamps. */
function honestOptions(defs, base) {
  let options = 0, exact = 0, risky = 0, worstMean = 0, worstOdds = 0, wordDraws = 0, watched = 0;
  const baseJson = JSON.stringify({ ...base, morale: 50, fanbase: 50, netWorth: 10, karma: 50, rivalryIntensity: 50 });
  for (const def of defs) {
    def.choices.forEach((opt, idx) => {
      options += 1;
      const p = opt.promise;
      if (!p) { fail(`${def.id} option ${idx} carries no promise, so its button cannot be checked`); return; }
      /* The words on the button come from the numbers. */
      const words = choices.describeMeterEffect(p.effect);
      if (words && !opt.consequence.toLowerCase().includes(words.toLowerCase())) fail(`${def.id} option ${idx}: the button says "${opt.consequence}" but the numbers say "${words}"`);
      if (p.risk) {
        const hitWords = choices.describeMeterEffect(p.risk.hit);
        const odds = `${Math.round(p.risk.chance * 100)}%`;
        if (!opt.risk || !opt.risk.includes(hitWords) || !opt.risk.startsWith(odds)) fail(`${def.id} option ${idx}: the gamble reads "${opt.risk}" but the numbers say ${odds} for ${hitWords}`);
      }
      /* The words read on their own: what the button says always happens,
         what it says happens otherwise, and the gamble with its printed odds. */
      const parts = opt.consequence.split(/,?\s*otherwise\s+/i);
      const alwaysClaim = claimsOf(parts[0]);
      const missClaim = claimsOf(parts.slice(1).join(', '));
      const riskM = /^(\d+)% chance [^:]*:\s*(.*)$/.exec(opt.risk ?? '');
      const hitClaim = claimsOf(riskM ? riskM[2] : '');
      const printedOdds = riskM ? Number(riskM[1]) / 100 : 0;
      if (opt.risk && !riskM) fail(`${def.id} option ${idx}: the gamble "${opt.risk}" does not read as odds and an outcome`);
      for (const u of [...alwaysClaim.unknown, ...missClaim.unknown, ...hitClaim.unknown]) fail(`${def.id} option ${idx}: the card claims "${u}", a stat this check cannot see move`);
      const expected = Object.fromEntries(METERS.map(k => [k, (p.effect[k] ?? 0) + (p.risk ? p.risk.chance * (p.risk.hit[k] ?? 0) + (1 - p.risk.chance) * (p.risk.miss[k] ?? 0) : 0)]));
      const N = 2000;
      const sum = Object.fromEntries(METERS.map(k => [k, 0]));
      let hits = 0, wordsBroke = false, sideBroke = false;
      for (let t = 0; t < N; t += 1) {
        const s = JSON.parse(baseJson), r = midRival();
        const before = meterOf(s);
        const beforeSave = { ...s };
        const beforeRest = restOf(s);
        watched = Math.max(watched, Object.keys(JSON.parse(beforeRest)).length);
        const rng = mulberry32(SEED_BASE * 7919 + def.id.length * 1009 + idx * 131 + t);
        let firstDraw = null;
        const spy = () => { const v = rng(); if (firstDraw === null) firstDraw = v; return v; };
        const line = opt.apply(s, r, spy);
        if (typeof line !== 'string' || line.length < 5) fail(`${def.id} option ${idx}: no feed line`);
        if (p.risk && firstDraw !== null && firstDraw < p.risk.chance) hits += 1;
        const after = meterOf(s);
        for (const k of METERS) sum[k] += Math.round((after[k] - before[k]) * 1000) / 1000;
        /* Nothing outside the five meters moves: no rating, no health, no
           salary, no contract. A button names every stat it touches. */
        if (!sideBroke && restOf(s) !== beforeRest) {
          sideBroke = true;
          const a = JSON.parse(beforeRest), b = JSON.parse(restOf(s));
          const moved = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
          fail(`${def.id} option ${idx}: the tap moved ${moved.join(', ')}, which the button never names`);
        }
        /* The words against what happened on this draw. */
        if (!wordsBroke) {
          const branch = riskM ? (firstDraw !== null && firstDraw < printedOdds ? hitClaim : missClaim) : { morale: 0, fanbase: 0, karma: 0, cash: 0, heat: 0 };
          const bad = claimMismatch(addClaims(alwaysClaim, branch), beforeSave, s);
          wordDraws += 1;
          if (bad) { wordsBroke = true; fail(`${def.id} option ${idx}: the card reads "${opt.consequence}"${opt.risk ? ` / "${opt.risk}"` : ''} but on a draw of ${firstDraw === null ? 'none' : firstDraw.toFixed(3)} ${bad}`); }
        }
        if (!p.risk) {
          for (const k of METERS) {
            const d = Math.round((after[k] - before[k]) * 1000) / 1000;
            if (Math.abs(d - (p.effect[k] ?? 0)) > 1e-9) { fail(`${def.id} option ${idx}: ${k} moved ${d}, the button promises ${p.effect[k] ?? 0}`); t = N; break; }
          }
        }
      }
      if (!p.risk) { exact += 1; return; }
      risky += 1;
      for (const k of METERS) {
        const gap = Math.abs(sum[k] / N - expected[k]);
        worstMean = Math.max(worstMean, gap);
        if (gap > 1.0) fail(`${def.id} option ${idx}: ${k} moves ${(sum[k] / N).toFixed(2)} on average, the promise works out to ${expected[k].toFixed(2)}`);
      }
      const oddsGap = Math.abs(hits / N - p.risk.chance);
      worstOdds = Math.max(worstOdds, oddsGap);
      if (oddsGap > 0.04) fail(`${def.id} option ${idx}: the gamble came up ${(hits / N * 100).toFixed(1)}% of the time against printed odds of ${Math.round(p.risk.chance * 100)}%`);
    });
  }
  return { options, exact, risky, worstMean, worstOdds, wordDraws, watched };
}
{
  /* 5a. Reachable, and the card names the rival. */
  let reachable = 0;
  for (const def of CHOICES) {
    const s = midState(), r = midRival();
    if (!choices.rivalryChoiceOpen(s, r, def)) { fail(`${def.id} is not open even on a state built for every gate`); continue; }
    reachable += 1;
    const card = choices.rivalryChoiceCard(def, s, r);
    if (!card.description.includes(r.name)) fail(`${def.id}: the card never names the rival`);
    if (card.choices.length < 2) fail(`${def.id}: a choice with fewer than two options is not a choice`);
    if (choices.rivalryChoiceOpen(s, { ...r, retired: true }, def)) fail(`${def.id} opens with a retired rival`);
  }
  console.log(`   5a: ${reachable} of ${CHOICES.length} choices reachable, each naming the rival`);
  if (CHOICES.length < 6) fail(`only ${CHOICES.length} NFL rival choices`);

  /* 5b. Every option does what its button says, on a real NFL save. */
  const nflBase = nfl.startCareer('Honest NFL', 'QB', nfl.ARCHETYPES.QB[0], mulberry32(SEED_BASE * 53 + 11), null);
  const { options, exact, risky, worstMean, worstOdds, wordDraws, watched } = honestOptions(CHOICES, nflBase);
  console.log(`   5b: ${options} options, ${exact} exact to the number on every draw, ${risky} gambles within ${worstMean.toFixed(3)} of their promise on average and ${worstOdds.toFixed(4)} of their printed odds; ${wordDraws} draws held against the card's own words, ${watched} other save fields watched for a stat no button names`);
  if (wordDraws < options * 1000 || watched < 20) fail(`only ${wordDraws} draws read against the words and ${watched} save fields watched, so 5b checked less than it says`);

  /* 5c. Morale is a real lever: paired careers on identical streams. */
  const lateHit = CHOICES.find(d => d.id === 'nfl_rival_late_hit');
  const filmIdx = lateHit.choices.findIndex(o => (o.promise?.effect.morale ?? 0) > 0 && !o.promise.risk);
  const calmIdx = lateHit.choices.findIndex(o => !(o.promise?.effect.morale) && !o.promise?.risk);
  const moraleGap = (lateHit.choices[filmIdx]?.promise.effect.morale ?? 0) - (lateHit.choices[calmIdx]?.promise.effect.morale ?? 0);
  let pairs = 0, ahead = 0, totalGain = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const pos = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE'][seed % 7];
    const base = nfl.startCareer(`Pair ${seed}`, pos, nfl.ARCHETYPES[pos][0], mulberry32(SEED_BASE * 31 + seed), null);
    base.morale = 50; base.role = 'starter';
    const a = JSON.parse(JSON.stringify(base));
    const b = JSON.parse(JSON.stringify(base));
    lateHit.choices[filmIdx].apply(a, a.rival, mulberry32(1));
    lateHit.choices[calmIdx].apply(b, b.rival, mulberry32(1));
    const la = nfl.simSeason(a, 80, mulberry32(SEED_BASE * 977 + seed * 13)).line;
    const lb = nfl.simSeason(b, 80, mulberry32(SEED_BASE * 977 + seed * 13)).line;
    const gain = awards.nflSeasonScore(pos, la) - awards.nflSeasonScore(pos, lb);
    pairs += 1;
    totalGain += gain;
    if (gain > 0) ahead += 1;
  }
  const perPoint = totalGain / pairs / Math.max(1, moraleGap);
  console.log(`   5c: ${pairs} paired seasons, "${lateHit.choices[filmIdx].label}" (morale +${moraleGap} over "${lateHit.choices[calmIdx].label}") came out ahead in ${ahead}, ${perPoint.toFixed(3)} stat score per morale point`);
  if (moraleGap <= 0) fail('the late hit no longer offers a morale option against a calm one, so 5c measures nothing');
  if (perPoint < 0.15) fail(`a morale point is worth ${perPoint.toFixed(3)} of stat score, under the 0.15 floor (measured 0.369 to 0.411): the promise does not reach the field`);
  if (ahead < pairs * 0.7) fail(`the morale option only came out ahead in ${ahead} of ${pairs} paired seasons`);

  /* 5d. Real careers. */
  let careers = 0, seasonsRun = 0, choiceSeasons = 0, stacked = 0, repeatsEarly = 0, resolvedOk = 0, doubleRefused = 0, badIdxRefused = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    careers += 1;
    const final = playNflCareer(seed, {
      onTick: () => { seasonsRun += 1; },
      onRival: (c, rng) => {
        if (c.pendingRivalryChoice && c.pendingRivalryEvent) { stacked += 1; fail(`seed ${seed}: a rival beat and a rival choice pending in the same season`); }
        if (!c.pendingRivalryChoice) return;
        choiceSeasons += 1;
        if (nflRivalry.resolveNflRivalryChoice(c, 9, rng) === null) badIdxRefused += 1;
        else fail(`seed ${seed}: option 9 of a three option card was accepted`);
        const res = nflRivalry.resolveNflRivalryChoice(c, 0, rng);
        if (!res || res.state.pendingRivalryChoice) { fail(`seed ${seed}: answering a pending choice did not clear it`); return; }
        resolvedOk += 1;
        if (nflRivalry.resolveNflRivalryChoice(res.state, 0, rng) === null) doubleRefused += 1;
        else fail(`seed ${seed}: the same choice was answered twice`);
        Object.assign(c, res.state);
      },
    });
    const seen = final.rivalryChoicesSeen ?? [];
    const firstRound = seen.slice(0, CHOICES.length);
    if (new Set(firstRound).size !== firstRound.length) { repeatsEarly += 1; fail(`seed ${seed}: a choice came round again before every choice had been seen (${seen.join(', ')})`); }
  }
  const choiceRate = choiceSeasons / seasonsRun;
  console.log(`   5d: ${careers} careers, ${choiceSeasons} rival choices over ${seasonsRun} career-seasons (rate ${choiceRate.toFixed(3)}), ${resolvedOk} answered, ${doubleRefused} double taps refused, ${badIdxRefused} bad options refused, ${stacked} stacked with a beat, ${repeatsEarly} early repeats`);
  if (choiceRate < 0.12) fail(`rival choices fire ${choiceRate.toFixed(3)} a career-season, under the 0.12 floor (measured 0.185 to 0.206)`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. Old saves load
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('6) Old saves: a pre-521 and a pre-796 NFL save play on');
{
  const NEW_SINCE_521 = ['phoneInbox', 'phoneUsedIds', 'karma', 'pendingRivalryEvent', 'lastRivalryEventId', 'rivalryIntensity'];
  const NEW_SINCE_796 = ['pendingRivalryChoice', 'rivalryChoicesSeen'];
  let loaded = 0, oldAnswered = 0, newTagged = 0;
  for (const era of ['pre521', 'pre796']) {
    for (let seed = 1; seed <= 10; seed += 1) {
      const rng = mulberry32(seed * 4243 + era.length);
      let c = nfl.startCareer(`Old ${era} ${seed}`, 'WR', nfl.ARCHETYPES.WR[0], rng, null);
      for (let y = 0; y < 3; y += 1) { nfl.simSeason(c, 80, rng); nfl.progress(c, rng); }
      for (const k of NEW_SINCE_796) delete c[k];
      for (const m of c.phoneInbox ?? []) delete m.beat;
      if (era === 'pre521') for (const k of NEW_SINCE_521) delete c[k];
      c = JSON.parse(JSON.stringify(c));
      const oldIds = new Set((c.phoneInbox ?? []).filter(m => m.answered === undefined).map(m => m.id));
      try {
        for (const id of oldIds) { if (nflInbox.answerNflInboxMessage(c, id, 0) !== null) oldAnswered += 1; }
        for (const m of c.phoneInbox ?? []) inboxMod.inboxBeatLine(m, nflInbox.NFL_CALENDAR);
        for (let y = 0; y < 5 && !c.retired; y += 1) {
          if (c.contractYears <= 0) c.contractYears = 3;
          nfl.simSeason(c, 80, rng);
          nfl.progress(c, rng);
          if (c.pendingRivalryEvent) c = nflRivalry.dismissNflRivalryEvent(c, rng).state;
          if (c.pendingRivalryChoice) c = nflRivalry.resolveNflRivalryChoice(c, 1, rng)?.state ?? c;
          for (const m of c.phoneInbox ?? []) if (m.answered === undefined) nflInbox.answerNflInboxMessage(c, m.id, 0);
        }
        loaded += 1;
        newTagged += (c.phoneInbox ?? []).filter(m => m.beat).length;
        const ids = (c.phoneInbox ?? []).map(m => m.id);
        if (new Set(ids).size !== ids.length) fail(`${era} seed ${seed}: two texts with one id after loading`);
        if ((c.phoneInbox ?? []).length > NFL.maxInbox) fail(`${era} seed ${seed}: the inbox outgrew its cap after loading`);
      } catch (e) {
        fail(`${era} seed ${seed}: the old save threw: ${e.message}`);
      }
    }
  }
  console.log(`   ${loaded} of 20 old saves played five more seasons, ${oldAnswered} old texts answered after loading, ${newTagged} new texts carrying a beat`);
  if (loaded < 20) fail('an old save failed to play on');
  if (newTagged === 0) fail('no text delivered after loading an old save carried a beat');
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. The NBA, MLB and NHL careers: the same choice engine, their own words
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('7) The NBA, MLB and NHL rival choices: the shared engine, each sport\'s own table');
const US_SPORTS = [
  {
    label: 'NBA', defs: nbaRivalry.NBA_RIVALRY_CHOICES, lever: 'nba_rival_flagrant', arch: nba.NBA_ARCHETYPES,
    start: nba.startNbaCareer, roll: nba.nbaRollTeamQuality, assign: nba.nbaAssignRole, camp: nba.nbaCampBattle,
    sim: nba.simNbaSeason, progress: nba.nbaProgress, retire: nba.nbaShouldRetire,
    resolve: nbaRivalry.resolveNbaRivalryChoice, dismiss: nbaRivalry.dismissNbaRivalryEvent,
    score: (_pos, line) => awards.nbaSeasonScore(line),
  },
  {
    label: 'MLB', defs: mlbRivalry.MLB_RIVALRY_CHOICES, lever: 'mlb_rival_benches_clear', arch: mlb.MLB_ARCHETYPES,
    start: mlb.startMlbCareer, roll: mlb.mlbRollTeamQuality, assign: mlb.mlbAssignRole, camp: mlb.mlbCampBattle,
    sim: mlb.simMlbSeason, progress: mlb.mlbProgress, retire: mlb.mlbShouldRetire,
    resolve: mlbRivalry.resolveMlbRivalryChoice, dismiss: mlbRivalry.dismissMlbRivalryEvent,
    score: (pos, line) => awards.mlbSeasonScore(pos, line),
  },
  {
    label: 'NHL', defs: nhlRivalry.NHL_RIVALRY_CHOICES, lever: 'nhl_rival_cheap_shot', arch: nhl.NHL_ARCHETYPES,
    start: nhl.startNhlCareer, roll: nhl.nhlRollTeamQuality, assign: nhl.nhlAssignRole, camp: nhl.nhlCampBattle,
    sim: nhl.simNhlSeason, progress: nhl.nhlProgress, retire: nhl.nhlShouldRetire,
    resolve: nhlRivalry.resolveNhlRivalryChoice, dismiss: nhlRivalry.dismissNhlRivalryEvent,
    score: (pos, line) => awards.nhlSeasonScore(pos, line),
  },
];

/** One career the way its board plays it, answering every card. `onRival`
 *  sees the save after each season, before anything pending is answered. */
function playUsCareer(sp, seed, onRival) {
  const rng = mulberry32(SEED_BASE * 100019 + seed * 613 + sp.label.charCodeAt(1));
  const positions = Object.keys(sp.arch);
  const pos = positions[seed % positions.length];
  let state = sp.start(`Choices ${sp.label} ${seed}`, pos, sp.arch[pos][seed % sp.arch[pos].length], rng, null);
  let tq = sp.roll(null, rng);
  sp.assign(state, tq, rng);
  let seasons = 0;
  for (let year = 0; year < 14 && !state.retired; year += 1) {
    if (year > 0) tq = sp.roll(tq, rng);
    sp.camp(state, tq, rng);
    sp.sim(state, tq, rng);
    sp.progress(state, rng);
    seasons += 1;
    if (sp.retire(state)) state.retired = true;
    onRival?.(state, rng);
    if (state.pendingRivalryEvent) state = sp.dismiss(state, rng).state;
    if (state.pendingRivalryChoice) state = sp.resolve(state, (seed + year) % state.pendingRivalryChoice.choices.length, rng)?.state ?? state;
  }
  return { state, seasons };
}

for (const sp of US_SPORTS) {
  const tag = sp.label;
  /* 7a. Reachable, naming the rival, and no other sport's table reused. */
  let reachable = 0;
  for (const def of sp.defs) {
    const s = midState(), r = midRival();
    if (!choices.rivalryChoiceOpen(s, r, def)) { fail(`${tag} ${def.id} is not open even on a state built for every gate`); continue; }
    reachable += 1;
    const card = choices.rivalryChoiceCard(def, s, r);
    if (!card.description.includes(r.name)) fail(`${tag} ${def.id}: the card never names the rival`);
    if (card.choices.length < 2) fail(`${tag} ${def.id}: a choice with fewer than two options is not a choice`);
    if (choices.rivalryChoiceOpen(s, { ...r, retired: true }, def)) fail(`${tag} ${def.id} opens with a retired rival`);
    if (!def.id.startsWith(`${tag.toLowerCase()}_`)) fail(`${tag} ${def.id}: an id from another sport's table`);
  }
  if (sp.defs.length < 6) fail(`only ${sp.defs.length} ${tag} rival choices`);

  /* 7b. Honest to the number, the same check as 5b, on a real save of this sport. */
  const basePos = Object.keys(sp.arch)[0];
  const h = honestOptions(sp.defs, sp.start(`Honest ${tag}`, basePos, sp.arch[basePos][0], mulberry32(SEED_BASE * 59 + 13), null));

  /* 7c. The morale option reaches the field: paired seasons, identical streams. */
  const lever = sp.defs.find(d => d.id === sp.lever);
  const upIdx = lever ? lever.choices.findIndex(o => (o.promise?.effect.morale ?? 0) > 0 && !o.promise.risk) : -1;
  const flatIdx = lever ? lever.choices.findIndex(o => !(o.promise?.effect.morale) && !o.promise?.risk) : -1;
  const gap = upIdx >= 0 && flatIdx >= 0 ? lever.choices[upIdx].promise.effect.morale : 0;
  let pairs = 0, ahead = 0, totalGain = 0;
  if (gap > 0) {
    const positions = Object.keys(sp.arch);
    for (let seed = 1; seed <= 300; seed += 1) {
      const pos = positions[seed % positions.length];
      const base = sp.start(`Pair ${tag} ${seed}`, pos, sp.arch[pos][0], mulberry32(SEED_BASE * 37 + seed), null);
      base.morale = 50; base.role = 'starter';
      const a = JSON.parse(JSON.stringify(base));
      const b = JSON.parse(JSON.stringify(base));
      lever.choices[upIdx].apply(a, a.rival, mulberry32(1));
      lever.choices[flatIdx].apply(b, b.rival, mulberry32(1));
      const la = sp.sim(a, 80, mulberry32(SEED_BASE * 983 + seed * 17)).line;
      const lb = sp.sim(b, 80, mulberry32(SEED_BASE * 983 + seed * 17)).line;
      const g = sp.score(pos, la) - sp.score(pos, lb);
      pairs += 1;
      totalGain += g;
      if (g > 0) ahead += 1;
    }
  } else fail(`${tag}: ${sp.lever} no longer offers a morale option against a flat one, so 7c measures nothing`);
  const perPoint = totalGain / Math.max(1, pairs) / Math.max(1, gap);

  /* 7d. Real careers. */
  let seasonsRun = 0, choiceSeasons = 0, stacked = 0, repeatsEarly = 0, resolvedOk = 0, doubleRefused = 0, badIdxRefused = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const { state: final, seasons } = playUsCareer(sp, seed, (c, rng) => {
      if (c.pendingRivalryChoice && c.pendingRivalryEvent) { stacked += 1; fail(`${tag} seed ${seed}: a rival beat and a rival choice pending in the same season`); }
      if (!c.pendingRivalryChoice) return;
      choiceSeasons += 1;
      if (sp.resolve(c, 9, rng) === null) badIdxRefused += 1;
      else fail(`${tag} seed ${seed}: option 9 of a three option card was accepted`);
      const res = sp.resolve(c, 0, rng);
      if (!res || res.state.pendingRivalryChoice) { fail(`${tag} seed ${seed}: answering a pending choice did not clear it`); return; }
      resolvedOk += 1;
      if (sp.resolve(res.state, 0, rng) === null) doubleRefused += 1;
      else fail(`${tag} seed ${seed}: the same choice was answered twice`);
      Object.assign(c, res.state);
    });
    seasonsRun += seasons;
    const seen = final.rivalryChoicesSeen ?? [];
    const firstRound = seen.slice(0, sp.defs.length);
    if (new Set(firstRound).size !== firstRound.length) { repeatsEarly += 1; fail(`${tag} seed ${seed}: a choice came round again before every choice had been seen (${seen.join(', ')})`); }
  }
  const rate = choiceSeasons / Math.max(1, seasonsRun);

  /* 7e. A pre-796 save of this sport plays on and starts getting choices. */
  let loaded = 0, choicesAfter = 0;
  for (let seed = 1; seed <= 10; seed += 1) {
    const rng = mulberry32(seed * 4253 + tag.charCodeAt(0));
    const pos = Object.keys(sp.arch)[seed % Object.keys(sp.arch).length];
    let c = sp.start(`Old ${tag} ${seed}`, pos, sp.arch[pos][0], rng, null);
    for (let y = 0; y < 3; y += 1) { sp.sim(c, 80, rng); sp.progress(c, rng); if (c.pendingRivalryEvent) c = sp.dismiss(c, rng).state; }
    delete c.pendingRivalryChoice;
    delete c.rivalryChoicesSeen;
    c = JSON.parse(JSON.stringify(c));
    try {
      for (let y = 0; y < 8 && !c.retired; y += 1) {
        sp.sim(c, 80, rng);
        sp.progress(c, rng);
        if (c.pendingRivalryEvent) c = sp.dismiss(c, rng).state;
        if (c.pendingRivalryChoice) { choicesAfter += 1; c = sp.resolve(c, 1, rng)?.state ?? c; }
      }
      loaded += 1;
    } catch (e) {
      fail(`${tag} old save seed ${seed} threw: ${e.message}`);
    }
  }

  console.log(`   ${tag}: ${reachable} of ${sp.defs.length} choices reachable; ${h.options} options, ${h.exact} exact, ${h.risky} gambles within ${h.worstMean.toFixed(3)} of their promise and ${h.worstOdds.toFixed(4)} of their odds, ${h.wordDraws} draws against the words, ${h.watched} other fields watched; morale lever ${perPoint.toFixed(3)} a point, ahead in ${ahead} of ${pairs}; ${choiceSeasons} choices over ${seasonsRun} career-seasons (rate ${rate.toFixed(3)}), ${resolvedOk} answered, ${doubleRefused} double taps and ${badIdxRefused} bad options refused, ${stacked} stacked, ${repeatsEarly} early repeats; ${loaded} of 10 pre-796 saves played on with ${choicesAfter} choices after loading`);
  if (h.wordDraws < h.options * 1000 || h.watched < 20) fail(`${tag}: only ${h.wordDraws} draws read against the words and ${h.watched} save fields watched, so 7b checked less than it says`);
  if (rate < 0.12) fail(`${tag} rival choices fire ${rate.toFixed(3)} a career-season, under the 0.12 floor (measured 0.195 or more in every sport)`);
  if (perPoint < 0.05) fail(`${tag}: a morale point is worth ${perPoint.toFixed(3)} of stat score, under the 0.05 floor (measured 0.139 or more in every sport): the promise does not reach the field`);
  if (ahead < pairs * 0.6) fail(`${tag}: the morale option only came out ahead in ${ahead} of ${pairs} paired seasons`);
  if (loaded < 10) fail(`${tag}: a pre-796 save failed to play on`);
  if (choicesAfter === 0) fail(`${tag}: ten pre-796 saves played eight more seasons each and never met a rival choice`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. The choice roll never touches the season's random stream
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('8) The season stream: every career plays the same seasons whether the choice roll runs or not');
{
  const BLOCK = { id: 'block', emoji: '', title: '', description: '', choices: [] };
  const FOUR = [
    {
      label: 'NFL', arch: nfl.ARCHETYPES, start: nfl.startCareer, roll: nfl.rollTeamQuality, assign: nfl.nflAssignRole,
      camp: nfl.nflCampBattle, sim: nfl.simSeason, progress: nfl.progress, retire: nfl.shouldRetire,
    },
    ...US_SPORTS,
  ];
  /* One seeded career, every card left unanswered and cleared, so nothing
     the player does can move a meter. With `block` a dummy card sits on the
     save through every season, so the choice roll returns before it draws. */
  const run = (sp, seed, block) => {
    const rng = mulberry32(SEED_BASE * 7577 + seed * 389 + sp.label.charCodeAt(2));
    const positions = Object.keys(sp.arch);
    const pos = positions[seed % positions.length];
    const c = sp.start(`Stream ${sp.label} ${seed}`, pos, sp.arch[pos][seed % sp.arch[pos].length], rng, null);
    let tq = sp.roll(null, rng);
    sp.assign(c, tq, rng);
    let rolled = 0;
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      if (year > 0) tq = sp.roll(tq, rng);
      if (sp.label === 'NFL' && c.contractYears <= 0) c.contractYears = 2 + (year % 3);
      if (block) c.pendingRivalryChoice = BLOCK;
      sp.camp(c, tq, rng);
      sp.sim(c, tq, rng);
      sp.progress(c, rng);
      if (sp.retire(c)) c.retired = true;
      if (!block && c.pendingRivalryChoice) rolled += 1;
      c.pendingRivalryChoice = null;
      c.pendingRivalryEvent = null;
    }
    return { lines: JSON.stringify(c.seasons), ovr: c.ovr, age: c.age, rolled };
  };
  for (const sp of FOUR) {
    let careers = 0, same = 0, rolled = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const a = run(sp, seed, false);
      const b = run(sp, seed, true);
      careers += 1;
      rolled += a.rolled;
      if (a.lines === b.lines && a.ovr === b.ovr && a.age === b.age) same += 1;
      else if (careers - same <= 2) fail(`${sp.label} seed ${seed}: the career played different seasons once the choice roll ran, so the roll is drawing from the season's stream`);
    }
    console.log(`   ${sp.label}: ${same} of ${careers} careers played identical seasons with the roll on and off, the roll fired ${rolled} times along the way`);
    if (careers - same > 2) fail(`${sp.label}: ${careers - same - 2} more careers changed, not printed`);
    if (rolled === 0) fail(`${sp.label}: the choice roll never fired in twenty careers, so this comparison proves nothing`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. The inbox never touches the season stream
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('9) The inbox stream: every NFL career plays the same seasons whether its inbox delivers or not');
{
  /* Open: every text marked read the moment it lands, with no effect
     applied, so the inbox wants three more every season and delivers all
     career long. Shut: six unread texts sit on the save from draft night, so
     the inbox wants nothing and delivers nothing. Nothing the player does
     moves a meter in either. If a delivery drew from the season's stream,
     every season after it would differ between the two. */
  const run = (seed, shut) => {
    const rng = mulberry32(SEED_BASE * 7759 + seed * 431 + 5);
    const pos = positions[seed % positions.length];
    const c = nfl.startCareer(`Inbox stream ${seed}`, pos, nfl.ARCHETYPES[pos][seed % nfl.ARCHETYPES[pos].length], rng, null);
    let tq = nfl.rollTeamQuality(null, rng);
    nfl.nflAssignRole(c, tq, rng);
    if (shut) c.phoneInbox = Array.from({ length: NFL.maxInbox }, (_, i) => ({ id: `shut-${i}`, defId: `shut-${i}`, from: 'Nobody', emoji: '', text: '', year: c.year, choices: [{ label: 'ok', reply: '', karma: 0 }] }));
    nflInbox.nflDraftNightInbox(c);
    let delivered = 0;
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      if (year > 0) tq = nfl.rollTeamQuality(tq, rng);
      if (c.contractYears <= 0) c.contractYears = 2 + (year % 3);
      nfl.nflCampBattle(c, tq, rng);
      const before = (c.phoneUsedIds ?? []).length;
      nfl.simSeason(c, tq, rng);
      nfl.progress(c, rng);
      delivered += (c.phoneUsedIds ?? []).length - before;
      if (nfl.shouldRetire(c)) c.retired = true;
      c.pendingRivalryEvent = null;
      c.pendingRivalryChoice = null;
      if (!shut) for (const m of c.phoneInbox ?? []) if (m.answered === undefined) m.answered = 0;
    }
    return { lines: JSON.stringify(c.seasons), ovr: c.ovr, age: c.age, delivered };
  };
  let careers = 0, same = 0, delivered = 0, shutDelivered = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    const a = run(seed, false);
    const b = run(seed, true);
    careers += 1;
    delivered += a.delivered;
    shutDelivered += b.delivered;
    if (a.lines === b.lines && a.ovr === b.ovr && a.age === b.age) same += 1;
    else if (careers - same <= 2) fail(`NFL seed ${seed}: the career played different seasons once its inbox delivered, so the inbox is drawing from the season's stream`);
  }
  console.log(`   ${same} of ${careers} careers played identical seasons with the inbox open and shut; the open inbox delivered ${delivered} texts along the way, the shut one ${shutDelivered}`);
  if (careers - same > 2) fail(`${careers - same - 2} more careers changed, not printed`);
  if (delivered < careers * 10 || shutDelivered !== 0) fail(`the open inbox delivered ${delivered} and the shut one ${shutDelivered}, so this comparison is not open against shut`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. Round 822: the NBA, MLB and NHL inboxes on their own calendars
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('10) The NBA, MLB and NHL inboxes: each on its own calendar, held to the NFL\'s rules');

/* The ids of the Round 525 templates, as the three banks stood before this
   round. A save that used one carries it in phoneUsedIds, so it has to stay in
   the bank under the same id or that save could be sent it a second time. */
const ROUND_525_IDS = {
  NBA: ['mom_call', 'kid_dm', 'agent_sneaker', 'teammate_bench', 'lottery_scam', 'equipment_fine', 'charity_clinic', 'aau_coach', 'allstar_party', 'rookie_advice', 'beat_writer_leak', 'lost_wallet', 'cryptobro_college', 'early_lifts', 'tax_scheme', 'injury_teammate', 'documentary', 'podcast_invite', 'hometown_court', 'stylist_fit', 'grandpa_visit', 'league_apology'],
  MLB: ['mom_call', 'kid_dm', 'agent_bats', 'teammate_bench', 'scam_dm', 'equipment_fine', 'charity_gala', 'old_coach', 'offday_party', 'rookie_advice', 'reporter_leak', 'lost_wallet', 'crypto_bro', 'early_cage', 'tax_scheme', 'injury_teammate', 'documentary', 'podcast_invite', 'hometown_field', 'barber_cut', 'grandpa_visit', 'ump_apology'],
  NHL: ['mom_call', 'kid_dm', 'agent_gear', 'teammate_scratched', 'scam_prize', 'equipment_manager_gear', 'charity_game', 'junior_coach', 'billet_family', 'allstar_break_party', 'rookie_advice', 'beat_writer_leak', 'lost_wallet', 'crypto_bro', 'summer_skate', 'tax_scheme', 'injury_teammate', 'documentary', 'podcast_invite', 'hometown_rink', 'rookie_dinner', 'beard_shave', 'grandpa_visit', 'referee_apology'],
};

/* Each sport, with what its season HAD judged from the season line's own
   result string and the save, never through the sport's reader. `goesOn` is
   the board's own retirement test, asked right after the season. */
const CAL_SPORTS = [
  {
    label: 'NBA', sp: US_SPORTS[0], SPORT: nbaInbox.NBA_INBOX, CAL: nbaInbox.NBA_CALENDAR, reader: nbaInbox.nbaSeasonBeats,
    draftBeats: ['draft', 'summer'], draftNight: nbaInbox.nbaDraftNightInbox, answer: nbaInbox.answerNbaInboxMessage,
    ordinary: ['camp', 'deadline', 'allstar', 'offseason'],
    had: (c, line, goesOn) => {
      const had = new Set(['offseason']);
      if (line.teamResult === 'SUSPENDED') return had;
      for (const b of ['camp', 'deadline', 'allstar']) had.add(b);
      if (line.teamResult !== 'Missed the playoffs') had.add('playoffs');
      if (goesOn && c.seasons.length === 1) had.add('summer');
      if (goesOn && c.contractYears === 1) had.add('contract');
      return had;
    },
  },
  {
    label: 'MLB', sp: US_SPORTS[1], SPORT: mlbInbox.MLB_INBOX, CAL: mlbInbox.MLB_CALENDAR, reader: mlbInbox.mlbSeasonBeats,
    draftBeats: ['draft'], draftNight: mlbInbox.mlbDraftNightInbox, answer: mlbInbox.answerMlbInboxMessage,
    ordinary: ['spring', 'allstar', 'deadline', 'september', 'offseason'],
    had: (c, line, goesOn) => {
      const had = new Set(['offseason']);
      if (line.teamResult === 'SUSPENDED') return had;
      for (const b of ['spring', 'allstar', 'deadline', 'september']) had.add(b);
      if (line.teamResult !== 'Missed October') had.add('october');
      if (goesOn && c.seasons.length >= 3 && c.seasons.length <= 5 && c.contractYears >= 1) had.add('arbitration');
      if (goesOn && c.contractYears <= 0) had.add('freeagency');
      return had;
    },
  },
  {
    label: 'NHL', sp: US_SPORTS[2], SPORT: nhlInbox.NHL_INBOX, CAL: nhlInbox.NHL_CALENDAR, reader: nhlInbox.nhlSeasonBeats,
    draftBeats: ['draft'], draftNight: nhlInbox.nhlDraftNightInbox, answer: nhlInbox.answerNhlInboxMessage,
    ordinary: ['camp', 'allstar', 'deadline', 'offseason'],
    had: (c, line, goesOn) => {
      const had = new Set(['offseason']);
      if (line.teamResult === 'SUSPENDED') return had;
      for (const b of ['camp', 'allstar', 'deadline']) had.add(b);
      if (line.age <= 19) had.add('juniors');
      if (line.teamResult !== 'Missed the playoffs') had.add('playoffs');
      if (goesOn && c.contractYears === 1) had.add('contract');
      return had;
    },
  },
];
for (const cs of CAL_SPORTS) cs.text = [];
/* Floors for section 10, set from the measured runs in the header. */
const CAL_FLOOR = { rate: 1.6, share: 0.08, oneOffHad: 20, finalsAheadBeat: 15, finalsAheadLeft: 30 };

/** One career of a calendar sport, played the way its board plays it: draft
 *  night, then camp, season and progress, a new deal whenever one runs out,
 *  an attentive player who answers everything but the newest text, and every
 *  rival card answered. `onTick` sees each season's fresh texts. */
function playCalCareer(cs, seed, { onDraft, onTick, years = 16 } = {}) {
  const sp = cs.sp;
  const rng = mulberry32(SEED_BASE * 100043 + seed * 733 + cs.label.charCodeAt(1));
  const positions = Object.keys(sp.arch);
  const pos = positions[seed % positions.length];
  let state = sp.start(`Calendar ${cs.label} ${seed}`, pos, sp.arch[pos][seed % sp.arch[pos].length], rng, null);
  let tq = sp.roll(null, rng);
  sp.assign(state, tq, rng);
  const draft = cs.draftNight(state);
  onDraft?.(state, draft);
  for (const m of draft) cs.text.push(m.from, m.text);
  for (let year = 0; year < years && !state.retired; year += 1) {
    if (year > 0) tq = sp.roll(tq, rng);
    if (state.contractYears <= 0) state.contractYears = 2 + (year % 3); /* a new deal, the way free agency would sign one */
    sp.camp(state, tq, rng);
    const usedBefore = new Set(state.phoneUsedIds ?? []);
    const unansweredBefore = (state.phoneInbox ?? []).filter(m => m.answered === undefined).length;
    const { line } = sp.sim(state, tq, rng);
    sp.progress(state, rng);
    const goesOn = !sp.retire(state);
    const fresh = (state.phoneInbox ?? []).filter(m => !usedBefore.has(m.defId));
    onTick?.(state, { line, fresh, usedBefore, unansweredBefore, goesOn });
    for (const m of fresh) { cs.text.push(m.from, m.text); for (const ch of m.choices) cs.text.push(ch.label, ch.reply); }
    if (!goesOn) state.retired = true;
    const pending = (state.phoneInbox ?? []).filter(m => m.answered === undefined);
    for (let i = 0; i < pending.length - 1; i += 1) cs.answer(state, pending[i].id, (seed + i) % pending[i].choices.length);
    if (state.pendingRivalryEvent) state = sp.dismiss(state, rng).state;
    if (state.pendingRivalryChoice) state = sp.resolve(state, (seed + year) % state.pendingRivalryChoice.choices.length, rng)?.state ?? state;
  }
  return state;
}

for (const cs of CAL_SPORTS) {
  const tag = cs.label;
  const S = cs.SPORT;
  const byId = new Map(S.pool.map(d => [d.id, d]));
  const calIdx = id => cs.CAL.findIndex(b => b.id === id);

  /* 10a. The bank is whole: every Round 525 id still there, every template on
     a beat of this calendar, every beat with something to say. */
  const missing = ROUND_525_IDS[tag].filter(id => !byId.has(id));
  if (missing.length > 0) fail(`${tag}: the Round 525 template${missing.length === 1 ? '' : 's'} ${missing.join(', ')} left the bank, so a save that already used one can be sent its replacement`);
  if (byId.size !== S.pool.length) fail(`${tag}: two templates share an id`);
  for (const d of S.pool) if (calIdx(d.beat) < 0) fail(`${tag}: "${d.id}" is tagged ${d.beat}, not a beat of the ${tag} calendar`);
  for (const b of cs.CAL) if (!S.pool.some(d => d.beat === b.id)) fail(`${tag}: the ${b.id} beat has no text at all`);

  /* 10b. Every text on a beat its season really had, delivered by the rule. */
  let careers = 0, seasons = 0, delivered = 0, draftOk = 0;
  let offBeat = 0, untagged = 0, mistagged = 0, doubled = 0, overWant = 0, ruleBroke = 0, disorder = 0;
  const perBeat = Object.fromEntries(cs.CAL.map(b => [b.id, 0]));
  const hadCount = Object.fromEntries(cs.CAL.map(b => [b.id, 0]));
  for (let seed = 1; seed <= 40; seed += 1) {
    careers += 1;
    playCalCareer(cs, seed, {
      onDraft: (c, draft) => {
        const ok = JSON.stringify(draft.map(m => m.beat)) === JSON.stringify(cs.draftBeats) && draft.every(m => byId.get(m.defId)?.beat === m.beat);
        if (ok) draftOk += 1;
        else fail(`${tag} seed ${seed}: draft night delivered ${JSON.stringify(draft.map(m => [m.defId, m.beat]))}, not one text on each of ${cs.draftBeats.join(' and ')}`);
      },
      onTick: (c, { line, fresh, usedBefore, unansweredBefore, goesOn }) => {
        seasons += 1;
        delivered += fresh.length;
        const had = cs.had(c, line, goesOn);
        for (const b of had) hadCount[b] += 1;
        const want = Math.max(0, S.wantPerSeason - unansweredBefore);
        const leftFor = beat => S.pool.some(d => d.beat === beat && !usedBefore.has(d.id) && fitsAge(d, c.age) && (goesOn || !d.ahead));
        const open = cs.CAL.filter(b => had.has(b.id) && leftFor(b.id));
        const beatsSeen = new Set();
        for (const m of fresh) {
          if (!m.beat) { untagged += 1; if (untagged <= 3) fail(`${tag} seed ${seed} ${line.year}: "${m.defId}" arrived with no beat`); continue; }
          if (byId.get(m.defId)?.beat !== m.beat) { mistagged += 1; fail(`${tag} seed ${seed} ${line.year}: "${m.defId}" arrived on ${m.beat} but is written for ${byId.get(m.defId)?.beat}`); }
          if (!had.has(m.beat)) { offBeat += 1; if (offBeat <= 5) fail(`${tag} seed ${seed} ${line.year}: "${m.defId}" arrived on ${m.beat}, a beat this season never had (${line.teamResult}, age ${line.age}, ${c.seasons.length} seasons, ${c.contractYears} years left${goesOn ? '' : ', retiring'})`); }
          if (beatsSeen.has(m.beat)) { doubled += 1; fail(`${tag} seed ${seed} ${line.year}: two texts on ${m.beat} in one season`); }
          beatsSeen.add(m.beat);
          perBeat[m.beat] += 1;
        }
        if (fresh.length > want) { overWant += 1; fail(`${tag} seed ${seed} ${line.year}: ${fresh.length} texts with only ${want} wanted`); }
        /* The rule, exactly: as many texts as the season wants or has open
           beats for, whichever is fewer, and the one-off beats first. */
        const oneOffs = open.filter(b => b.oneOff).map(b => b.id);
        const wantOneOffs = oneOffs.slice(0, Math.min(want, oneOffs.length));
        const gotOneOffs = cs.CAL.filter(b => b.oneOff && beatsSeen.has(b.id)).map(b => b.id);
        if (fresh.length !== Math.min(want, open.length) || JSON.stringify(gotOneOffs) !== JSON.stringify(wantOneOffs)) {
          ruleBroke += 1;
          if (ruleBroke <= 3) fail(`${tag} seed ${seed} ${line.year}: delivered ${fresh.length} on ${[...beatsSeen].join(', ') || 'nothing'} with ${want} wanted and ${open.map(b => b.id).join(', ')} open; the rule says ${Math.min(want, open.length)}, one-offs ${wantOneOffs.join(', ') || 'none'}`);
        }
        const order = fresh.map(m => calIdx(m.beat));
        if (order.some((v, i) => i > 0 && v < order[i - 1])) { disorder += 1; fail(`${tag} seed ${seed} ${line.year}: texts out of calendar order (${fresh.map(m => m.beat).join(', ')})`); }
      },
    });
  }
  const rate = delivered / seasons;
  const seasonTexts = Object.values(perBeat).reduce((a, b) => a + b, 0);
  const share = b => perBeat[b] / Math.max(1, seasonTexts);
  console.log(`   ${tag}: ${careers} careers, ${draftOk} draft nights on ${cs.draftBeats.join(' and ')}, ${delivered} season texts over ${seasons} career-seasons (rate ${rate.toFixed(3)} against a want of ${S.wantPerSeason})`);
  console.log(`   ${tag} by beat: ${cs.CAL.map(b => `${b.id} ${perBeat[b.id]} (${(share(b.id) * 100).toFixed(1)}%, had ${hadCount[b.id]})`).join(', ')}`);
  console.log(`   ${tag}: ${offBeat} off-beat, ${untagged} untagged, ${mistagged} mistagged, ${doubled} doubled, ${overWant} over the want, ${ruleBroke} seasons off the delivery rule, ${disorder} out of order`);
  if (offBeat > 5) fail(`${tag}: ${offBeat - 5} more texts arrived on a beat their season never had, not printed`);
  if (untagged > 3) fail(`${tag}: ${untagged - 3} more untagged texts, not printed`);
  if (ruleBroke > 3) fail(`${tag}: ${ruleBroke - 3} more seasons off the delivery rule, not printed`);
  if (draftOk < careers) fail(`${tag}: only ${draftOk} of ${careers} draft nights delivered the draft night texts`);
  if (rate < CAL_FLOOR.rate) fail(`${tag} delivers ${rate.toFixed(3)} texts a career-season, under the ${CAL_FLOOR.rate} floor`);
  for (const b of cs.ordinary) if (share(b) < CAL_FLOOR.share) fail(`${tag}: only ${(share(b) * 100).toFixed(1)}% of season texts arrived on ${b}, under the ${CAL_FLOOR.share * 100}% floor, so the calendar is not really being used`);
  for (const b of cs.CAL.filter(x => x.oneOff && x.id !== 'draft')) {
    if (hadCount[b.id] < CAL_FLOOR.oneOffHad) fail(`${tag}: only ${hadCount[b.id]} seasons had the ${b.id} beat, too few to judge it`);
    if (perBeat[b.id] === 0) fail(`${tag}: the one-off ${b.id} beat never delivered in a season`);
  }
  /* A suspended year had no games: only the offseason can speak. */
  const susp = sp => { const c = sp.start('Suspended', Object.keys(sp.arch)[0], sp.arch[Object.keys(sp.arch)[0]][0], mulberry32(5), null); c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 }); return c; };
  const sb = cs.reader(susp(cs.sp));
  if (JSON.stringify(sb) !== JSON.stringify(['offseason'])) fail(`${tag}: a suspended season reads as ${JSON.stringify(sb)}, not the offseason alone`);

  /* 10c. A career's final season carries no text about a season to come. */
  const aheadBeats = new Set(cs.CAL.filter(b => b.ahead).map(b => b.id));
  const aheadTexts = new Set(S.pool.filter(d => d.ahead).map(d => d.id));
  let finals = 0, finalsAheadBeat = 0, finalsAheadLeft = 0, finalsWithAhead = 0, finalTexts = 0, goOnAhead = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    playCalCareer(cs, 1000 + seed, {
      years: 25,
      onTick: (c, { line, fresh, usedBefore, goesOn }) => {
        const ahead = fresh.filter(m => aheadBeats.has(m.beat) || aheadTexts.has(m.defId));
        if (goesOn) { goOnAhead += ahead.length; return; }
        finals += 1;
        finalTexts += fresh.length;
        const wouldHave = cs.had(c, line, true);
        if ([...aheadBeats].some(b => wouldHave.has(b))) finalsAheadBeat += 1;
        if (S.pool.some(d => (aheadBeats.has(d.beat) || aheadTexts.has(d.id)) && !usedBefore.has(d.id) && fitsAge(d, c.age))) finalsAheadLeft += 1;
        if (ahead.length > 0) {
          finalsWithAhead += 1;
          if (finalsWithAhead <= 3) fail(`${tag} seed ${1000 + seed}, final season at ${c.age}: the retiring player was sent ${ahead.map(m => `"${m.defId}" on ${m.beat}`).join(', ')}, a text about a season he will never play`);
        }
      },
    });
  }
  console.log(`   ${tag} final seasons: ${finals} careers played to retirement, ${finalTexts} texts in their final seasons, ${finalsAheadBeat} ending where a forward beat would have come, ${finalsAheadLeft} with a forward text still unsent; ${finalsWithAhead} carried a forward looking text (careers that go on received ${goOnAhead})`);
  if (finalsWithAhead > 3) fail(`${tag}: ${finalsWithAhead - 3} more final seasons carried a forward looking text, not printed`);
  if (finals < 60) fail(`${tag}: only ${finals} careers reached retirement, too few to judge the final season`);
  if (finalsAheadBeat < CAL_FLOOR.finalsAheadBeat || finalsAheadLeft < CAL_FLOOR.finalsAheadLeft) fail(`${tag}: only ${finalsAheadBeat} final seasons fell where a forward beat would have come and ${finalsAheadLeft} had a forward text left, so the final season gate was barely tested`);
  if (goOnAhead === 0) fail(`${tag}: no career that goes on ever received a forward looking text, so the gate is shutting them for everybody`);

  /* 10d. Speakers are roles, and no real player is named in a delivered text. */
  {
    const real = realNames();
    const NAME_SHAPE = /^[A-Z][a-z]+\s[A-Z][a-z]+/;
    let realSender = 0, nameShaped = 0, inText = 0;
    const senders = new Set(S.pool.map(d => d.from));
    for (const from of senders) {
      if (real.has(from)) { realSender += 1; fail(`${tag} inbox sender "${from}" is a real player's name`); }
      if (NAME_SHAPE.test(from)) { nameShaped += 1; fail(`${tag} inbox sender "${from}" reads as a First Last name rather than a role`); }
    }
    const blob = cs.text.join('\n');
    for (const n of real) {
      if (n.includes(' ') && n.length >= 7 && blob.includes(n)) { inText += 1; if (inText <= 3) fail(`a delivered ${tag} text contains the real name "${n}"`); }
    }
    console.log(`   ${tag} speakers: ${senders.size} senders in a bank of ${S.pool.length}, ${realSender} real, ${nameShaped} shaped like a name, ${inText} real full names inside ${cs.text.length} delivered strings`);
    if (cs.text.length < 500) fail(`${tag}: too little delivered text was collected to judge`);
  }

  /* 10e. The inbox never touches the season stream: open against shut. */
  {
    const sp = cs.sp;
    const run = (seed, shut) => {
      const rng = mulberry32(SEED_BASE * 7759 + seed * 431 + cs.label.charCodeAt(2));
      const positions = Object.keys(sp.arch);
      const pos = positions[seed % positions.length];
      const c = sp.start(`Inbox stream ${tag} ${seed}`, pos, sp.arch[pos][seed % sp.arch[pos].length], rng, null);
      let tq = sp.roll(null, rng);
      sp.assign(c, tq, rng);
      if (shut) c.phoneInbox = Array.from({ length: S.maxInbox }, (_, i) => ({ id: `shut-${i}`, defId: `shut-${i}`, from: 'Nobody', emoji: '', text: '', year: c.year, choices: [{ label: 'ok', reply: '', karma: 0 }] }));
      cs.draftNight(c);
      let sent = 0;
      for (let year = 0; year < 14 && !c.retired; year += 1) {
        if (year > 0) tq = sp.roll(tq, rng);
        if (c.contractYears <= 0) c.contractYears = 2 + (year % 3);
        sp.camp(c, tq, rng);
        const before = (c.phoneUsedIds ?? []).length;
        sp.sim(c, tq, rng);
        sp.progress(c, rng);
        sent += (c.phoneUsedIds ?? []).length - before;
        if (sp.retire(c)) c.retired = true;
        c.pendingRivalryEvent = null;
        c.pendingRivalryChoice = null;
        if (!shut) for (const m of c.phoneInbox ?? []) if (m.answered === undefined) m.answered = 0;
      }
      return { lines: JSON.stringify(c.seasons), ovr: c.ovr, age: c.age, sent };
    };
    let runs = 0, same = 0, openSent = 0, shutSent = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const a = run(seed, false);
      const b = run(seed, true);
      runs += 1;
      openSent += a.sent;
      shutSent += b.sent;
      if (a.lines === b.lines && a.ovr === b.ovr && a.age === b.age) same += 1;
      else if (runs - same <= 2) fail(`${tag} seed ${seed}: the career played different seasons once its inbox delivered, so the inbox is drawing from the season's stream`);
    }
    console.log(`   ${tag} stream: ${same} of ${runs} careers played identical seasons with the inbox open and shut; the open inbox delivered ${openSent} texts, the shut one ${shutSent}`);
    if (runs - same > 2) fail(`${tag}: ${runs - same - 2} more careers changed, not printed`);
    if (openSent < runs * 10 || shutSent !== 0) fail(`${tag}: the open inbox delivered ${openSent} and the shut one ${shutSent}, so this comparison is not open against shut`);
  }

  /* 10f. Old saves load: a pre-525 save (no inbox at all) and a pre-822 save
     (texts from the Round 525 bank, no beats on them) play on. */
  {
    const sp = cs.sp;
    const NEW_SINCE_525 = ['phoneInbox', 'phoneUsedIds', 'karma', 'pendingRivalryEvent', 'lastRivalryEventId', 'rivalryIntensity', 'pendingRivalryChoice', 'rivalryChoicesSeen'];
    let loaded = 0, oldAnswered = 0, newTagged = 0, repeats = 0, oldLines = 0;
    for (const era of ['pre525', 'pre822']) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const rng = mulberry32(seed * 4271 + era.length * 31 + tag.charCodeAt(0));
        const pos = Object.keys(sp.arch)[seed % Object.keys(sp.arch).length];
        let c = sp.start(`Old ${tag} ${era} ${seed}`, pos, sp.arch[pos][0], rng, null);
        for (let y = 0; y < 3; y += 1) { sp.sim(c, 80, rng); sp.progress(c, rng); if (c.pendingRivalryEvent) c = sp.dismiss(c, rng).state; c.pendingRivalryChoice = null; }
        if (era === 'pre525') for (const k of NEW_SINCE_525) delete c[k];
        else {
          /* What a pre-822 save holds: eight Round 525 templates used, the
             last four still on the phone with no beat, two of them unread. */
          const ids = [...ROUND_525_IDS[tag]].sort((a, b) => ((a.length * 7 + seed) % 11) - ((b.length * 7 + seed) % 11)).slice(0, 8);
          c.phoneUsedIds = ids;
          c.phoneInbox = ids.slice(4).map((id, i) => {
            const d = byId.get(id) ?? { from: 'Agent', emoji: '', text: 'old text', choices: [{ label: 'ok', reply: '', karma: 0 }] };
            return { id: `${id}-${c.year - 1}`, defId: id, from: d.from, emoji: d.emoji, text: d.text, year: c.year - 1, choices: d.choices, ...(i < 2 ? { answered: 0 } : {}) };
          });
        }
        c = JSON.parse(JSON.stringify(c));
        const oldUsed = new Set(c.phoneUsedIds ?? []);
        try {
          for (const m of c.phoneInbox ?? []) { if (inboxMod.inboxBeatLine(m, cs.CAL) === null) oldLines += 1; }
          for (const m of (c.phoneInbox ?? []).filter(x => x.answered === undefined)) { if (cs.answer(c, m.id, 0) !== null) oldAnswered += 1; }
          for (let y = 0; y < 5 && !c.retired; y += 1) {
            if (c.contractYears <= 0) c.contractYears = 3;
            const before = new Set(c.phoneUsedIds ?? []);
            sp.sim(c, 80, rng);
            sp.progress(c, rng);
            for (const m of (c.phoneInbox ?? []).filter(x => !before.has(x.defId))) if (oldUsed.has(m.defId)) { repeats += 1; fail(`${tag} ${era} seed ${seed}: "${m.defId}" was sent again after loading a save that had already used it`); }
            if (sp.retire(c)) c.retired = true;
            if (c.pendingRivalryEvent) c = sp.dismiss(c, rng).state;
            if (c.pendingRivalryChoice) c = sp.resolve(c, 1, rng)?.state ?? c;
            for (const m of c.phoneInbox ?? []) if (m.answered === undefined) cs.answer(c, m.id, 0);
          }
          loaded += 1;
          newTagged += (c.phoneInbox ?? []).filter(m => m.beat).length;
          const ids = (c.phoneInbox ?? []).map(m => m.id);
          if (new Set(ids).size !== ids.length) fail(`${tag} ${era} seed ${seed}: two texts with one id after loading`);
          if ((c.phoneInbox ?? []).length > S.maxInbox) fail(`${tag} ${era} seed ${seed}: the inbox outgrew its cap after loading`);
        } catch (e) {
          fail(`${tag} ${era} seed ${seed}: the old save threw: ${e.message}`);
        }
      }
    }
    console.log(`   ${tag} old saves: ${loaded} of 20 played five more seasons, ${oldAnswered} old texts answered after loading, ${oldLines} old texts drawn with no beat line, ${newTagged} new texts carrying a beat, ${repeats} templates sent twice`);
    if (loaded < 20) fail(`${tag}: an old save failed to play on`);
    if (oldAnswered === 0) fail(`${tag}: no old text was answerable after loading`);
    if (newTagged === 0) fail(`${tag}: no text delivered after loading an old save carried a beat`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simCareerInboxBeats: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (control ${CONTROL})` : ''}`);
  process.exit(1);
}
if (CONTROL) console.error(`simCareerInboxBeats: GREEN UNDER CONTROL ${CONTROL}. The control did not fire, so the check it guards proves nothing.`);
else console.log('simCareerInboxBeats: green. Soccer is unchanged, the NFL inbox runs on the football calendar, and every rival choice does what it says.');
