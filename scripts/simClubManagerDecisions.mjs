/*
 * Round 979 harness: the decisions desk (red card appeals and a situation
 * deck). Before this round a straight red was a ban written at the whistle
 * and nothing else, and nothing between matches asked the manager to choose.
 *
 * Sections:
 *  1. Appeals follow straight reds and only straight reds. Every match of
 *     several seeded seasons is read for who was sent off and how (a straight
 *     red adds a red and no booking to his season line, a second yellow adds
 *     both), and the desk must hold an appeal for every straight red that left
 *     a ban and for nothing else, a second yellow included.
 *  2. The odds are the odds. The verdict for each tier is read over a large
 *     set of card ids shaped exactly like the engine's, and the observed win
 *     rate must sit inside a band around the stated percentage. The appeals
 *     lodged in the seasons of section 3 are reported beside it.
 *  3. The ban moves exactly as the card says. Every appeal met in the seasons
 *     is lodged: won must leave him at zero, lost must leave him at the number
 *     the button printed, which must be the ban plus one, and nothing else in
 *     the save may move but his suspendedMatches and the desk. Accepting is
 *     walked too and must move nothing at all.
 *  4. Each answer moves only the number it names. Every answer of every deck
 *     card is applied to real mid season states; the button's words must end
 *     in the effect's own words, the named number must move by exactly the
 *     stated amount, and the rest of the save must be untouched.
 *  5. Declining everything is main. Seasons are replayed on one seed with the
 *     shipped engine and with a copy that has the desk's two hook lines taken
 *     out (the season settle and the answer route), which is main for this
 *     round's purposes. Ignoring every card, and answering every card with
 *     its no change answer, must both leave a save byte identical to that
 *     copy's once the desk block itself is set aside.
 *  6. Words. Every desk card speaks through a role, carries no quotation
 *     marks, and no em or en dash.
 *
 * Negative controls (each rewrites a copy in memory, asserts the text it
 * rewrites exists first, and must turn its section red):
 *   CM_DECISIONS_CONTROL=freeloss     a lost appeal costs nothing (section 3)
 *   CM_DECISIONS_CONTROL=liar         the verdict uses half the stated odds (2)
 *   CM_DECISIONS_CONTROL=leaky        board patience answers also add money (4)
 *   CM_DECISIONS_CONTROL=dice         the settle draws one Math.random (5)
 *   CM_DECISIONS_CONTROL=yellowappeal a second yellow is offered an appeal (1)
 *
 * MEASURED BANDS: see the constants block below, each with its numbers.
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = path.join(os.tmpdir(), `cmDecisions-${process.pid}`).replaceAll('\\', '/');
fs.mkdirSync(TMP, { recursive: true });

const CONTROL = process.env.CM_DECISIONS_CONTROL || '';
const KNOWN = ['freeloss', 'liar', 'leaky', 'dice', 'yellowappeal'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_DECISIONS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/* esbuild by walk-up, so the harness runs from a worktree with no
   node_modules of its own as well as from the main checkout. */
function findBin(name) {
  let dir = ROOT;
  for (;;) {
    const p = path.join(dir, 'node_modules', '.bin', name);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`no node_modules/.bin/${name} above ${ROOT}`);
    dir = up;
  }
}

const swap = (src, from, to, where) => {
  if (!src.includes(from)) {
    console.error(`control cannot run: ${where} is not in the shape this rewrite expects`);
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  return src.replace(from, to);
};
const read = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');

let desk = read(`${ROOT}/src/lib/clubManagerDecisions.ts`);
let engine = read(`${ROOT}/src/lib/clubManager.ts`);
if (CONTROL === 'freeloss') {
  desk = swap(desk, '    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;', '    const next = won ? 0 : p.suspendedMatches;', 'clubManagerDecisions.ts');
} else if (CONTROL === 'liar') {
  desk = swap(desk, '|verdict`) < (item.odds ?? 0) / 100;', '|verdict`) < (item.odds ?? 0) / 200;', 'clubManagerDecisions.ts');
} else if (CONTROL === 'leaky') {
  desk = swap(desk, 'undefined, { boardConfidence });', 'undefined, { boardConfidence, budget: career.budget + 0.1 });', 'clubManagerDecisions.ts');
} else if (CONTROL === 'dice') {
  desk = swap(desk, '  const before = deskOf(state);', '  Math.random();\n  const before = deskOf(state);', 'clubManagerDecisions.ts');
} else if (CONTROL === 'yellowappeal') {
  engine = swap(engine, '      events.push(`🟥 ${sq.name} picked up a second yellow and walked.`);', '      events.push(`🟥 ${sq.name} picked up a second yellow and walked.`);\n      straightReds.push(sq.id);', 'clubManager.ts');
}
const deskCopy = `${TMP}/clubManagerDecisions.ts`;
fs.writeFileSync(deskCopy, desk);
const DESK_IMPORT = "import { answerDecision, settleDecisionDesk } from '@/lib/clubManagerDecisions';";
engine = swap(engine, DESK_IMPORT, `import { answerDecision, settleDecisionDesk } from '${deskCopy}';`, 'clubManager.ts (the desk import)');
/* Main, for this round: the shipped engine with the desk's two hook lines out. */
const SETTLE = '  settleDecisionDesk(state, straightReds, fx.opponent);\n';
const ROUTE = "  if (messageId.startsWith('desk-')) return answerDecision(career, messageId, optionIdx);\n";
let mainEngine = swap(engine, SETTLE, '', 'clubManager.ts (the settle call)');
mainEngine = swap(mainEngine, ROUTE, '', 'clubManager.ts (the answer route)');
fs.writeFileSync(`${TMP}/engineA.ts`, engine);
fs.writeFileSync(`${TMP}/engineMain.ts`, mainEngine);

const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/* Production is off limits: any network call from the bundled engine throws
   and is counted rather than reaching the live database. */
globalThis.__netCalls = 0;
globalThis.fetch = async () => { globalThis.__netCalls += 1; throw new Error('network blocked in simClubManagerDecisions'); };
export const A = await import('${TMP}/engineA.ts');
export const M = await import('${TMP}/engineMain.ts');
export const D = await import('${deskCopy}');
`);
execSync(
  `"${findBin('esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { A, M, D } = await import(pathToFileURL(BUNDLE).href);

/* One stream per run, reset on purpose, so the shipped engine and main can be
   handed the identical sequence of draws. seedRandom above stays the first
   import (the house rule); this only replaces it with a stream that can be
   restarted. */
function reseed(seed) {
  let a = seed >>> 0;
  /* The engine stamps three kinds of id with Date.now (youth, scouts,
     prospects), so the clock is restarted with the stream: two runs a few
     seconds apart would otherwise differ on the stamp and nothing else. */
  let clock = 1790000000000;
  Date.now = () => (clock += 1000);
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE_SEED = Number.isFinite(Number(process.env.SIM_SEED)) ? Number(process.env.SIM_SEED) : 979;

/* ---------- sizes and bands (measured, see the header) ---------- */
const S5_CLUBS = 2;            // clubs replayed against main, per mode
const S5_SEASONS = 1;          // seasons per replay
const S5_MIN_CARDS = 8;        // desk cards that must be met while declining
const PLAY_SEASONS = 2;        // seasons per club in sections 1, 3 and 4
const MIN_STRAIGHT_REDS = 4;   // straight reds the play seasons must contain
const MIN_SITUATIONS = 10;     // situation answers the play seasons must apply
const ODDS_SAMPLE = 20000;     // synthetic verdicts per tier in section 2
const ODDS_BAND = 1.5;         // points either side of the stated odds

const fails = [];
const fail = (section, msg) => { fails.push(`[${section}] ${msg}`); };
const clone = x => JSON.parse(JSON.stringify(x));
const withoutDesk = s => { const c = { ...s }; delete c.decisions; return c; };
const pendingOf = s => D.deskOf(s).filter(d => !d.resolved);

/** Plays one season. onEntry(state, before, result) may hand back a new state. */
function playSeason(E, s, onEntry) {
  for (let guard = 0; guard < 220; guard++) {
    const before = s;
    const r = E.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (onEntry) s = onEntry(s, before, r) ?? s;
    if (s.sacked || r.kind === 'seasonOver') break;
  }
  return s;
}
function careerOf(E, club, seed, seasons, onEntry) {
  reseed(seed);
  let s = E.startCareer(club);
  for (let season = 1; season <= seasons; season++) {
    s = playSeason(E, s, onEntry);
    if (s.sacked || season === seasons) break;
    s = E.startNextSeason(E.finishSeason(s).state);
  }
  return s;
}

const CLUBS = ['Arsenal', 'Everton', 'Brighton'];
const deskSeen = [];
const noteDesk = s => { for (const d of D.deskOf(s)) if (!deskSeen.some(x => x.id === d.id && x.resolved === d.resolved)) deskSeen.push(d); };

/* ---------- 5. declining everything is main ---------- */
/* Run first and in pairs, so each engine copy's own module counters (the
   message sequence, for one) have walked the same history when compared. */
const noChangeIndex = d => d.options.findIndex(o => o.effect.kind === 'acceptBan' || o.effect.kind === 'none');
const declineAll = s => {
  for (const d of pendingOf(s)) s = A.answerMessage(s, d.id, noChangeIndex(d));
  noteDesk(s);
  return s;
};
const s5 = { pairs: 0, identical: 0, cards: 0, appeals: 0 };
for (const mode of ['ignore', 'decline']) {
  for (let i = 0; i < S5_CLUBS; i++) {
    const club = CLUBS[i];
    const seed = BASE_SEED + 100 * i;
    const a = careerOf(A, club, seed, S5_SEASONS, mode === 'decline' ? declineAll : s => { noteDesk(s); return s; });
    const m = careerOf(M, club, seed, S5_SEASONS);
    s5.pairs += 1;
    const ja = JSON.stringify(withoutDesk(a));
    const jm = JSON.stringify(withoutDesk(m));
    if (ja === jm) s5.identical += 1;
    else {
      let k = 0;
      while (k < ja.length && ja[k] === jm[k]) k++;
      fail(5, `${club} ${mode}: the save differs from main from character ${k}: ...${ja.slice(Math.max(0, k - 80), k + 80)}`);
    }
  }
}
if (deskSeen.length < S5_MIN_CARDS) fail(5, `only ${deskSeen.length} desk cards met in the declined seasons, under the floor of ${S5_MIN_CARDS}, so identity proves little`);
console.log(`5. declining is main: ${s5.identical} of ${s5.pairs} seasons byte identical, ${deskSeen.length} desk cards met and declined`);

/* ---------- the play seasons: sections 1, 3 and 4 ---------- */
const meters = (s, pid) => ({
  board: s.boardConfidence,
  fans: s.books?.fanMood,
  press: s.press?.mood,
  morale: s.squad.find(p => p.id === pid)?.morale,
  budget: s.budget,
});
const BOUNDS = { board: [1, 100], fans: [0, 100], press: [0, 100], morale: [5, 99], budget: [-Infinity, Infinity] };
const r1 = n => Math.round(n * 10) / 10;
/** The save with the desk set aside and the named numbers put back to before. */
function restOf(s, before, pid, keep = []) {
  const c = clone(withoutDesk(s));
  if (keep.includes('board')) c.boardConfidence = before.boardConfidence;
  if (keep.includes('budget')) c.budget = before.budget;
  if (keep.includes('fans') && c.books) c.books.fanMood = before.books?.fanMood;
  if (keep.includes('press') && c.press) c.press.mood = before.press?.mood;
  for (const p of c.squad) {
    const b = before.squad.find(x => x.id === p.id);
    if (!b || p.id !== pid) continue;
    if (keep.includes('morale')) p.morale = b.morale;
    if (keep.includes('ban')) p.suspendedMatches = b.suspendedMatches;
  }
  return JSON.stringify(c);
}

const s1 = { matches: 0, straight: 0, secondYellow: 0, appeals: 0 };
const s3 = { lodged: 0, won: 0, lost: 0, accepted: 0, wonByTier: {}, lodgedByTier: {} };
const s4 = { answered: 0, clamped: 0, pairs: new Set() };
const kept = [];

/** Section 4's check of one answer, from the state before to the state after. */
function checkAnswer(tag, before, after, item, idx) {
  const opt = item.options[idx];
  const eff = opt.effect;
  if (!opt.label.endsWith(`(${D.effectWords(eff, before)})`)) fail(4, `${tag}: "${opt.label}" does not end in its effect's words "${D.effectWords(eff, before)}"`);
  const b = meters(before, item.playerId);
  const a = meters(after, item.playerId);
  const named = eff.kind === 'move' ? eff.meter : null;
  for (const k of Object.keys(b)) {
    const moved = r1((a[k] ?? 0) - (b[k] ?? 0));
    if (k !== named) {
      if (moved !== 0) fail(4, `${tag}: ${k} moved ${moved} on an answer that names ${named ?? 'nothing'}`);
      continue;
    }
    const want = r1(Math.min(BOUNDS[k][1], Math.max(BOUNDS[k][0], b[k] + eff.delta)) - b[k]);
    if (want !== eff.delta) s4.clamped += 1;
    if (moved !== want) fail(4, `${tag}: ${k} moved ${moved}, the button said ${eff.delta}`);
  }
  if (restOf(after, before, item.playerId, named ? [named] : []) !== restOf(before, before, item.playerId, named ? [named] : [])) {
    fail(4, `${tag}: something beyond ${named ?? 'the desk'} moved`);
  }
  s4.answered += 1;
  s4.pairs.add(`${item.deckId}#${idx}`);
}

/** Section 3's check of one appeal, lodged (idx 0) or accepted (idx 1). */
function checkAppeal(tag, before, after, item, idx) {
  const p0 = before.squad.find(p => p.id === item.playerId);
  const p1 = after.squad.find(p => p.id === item.playerId);
  const tier = item.odds;
  if (idx === 1) {
    s3.accepted += 1;
    if (JSON.stringify(withoutDesk(after)) !== JSON.stringify(withoutDesk(before))) fail(3, `${tag}: accepting the ban moved something`);
    return;
  }
  const m = /or it becomes (\d+) match/.exec(item.options[0].label);
  const stated = m ? Number(m[1]) : NaN;
  if (stated !== item.ban + 1) fail(3, `${tag}: the button says ${stated} on a lost appeal against a ${item.ban} match ban`);
  const won = D.appealWins(item, before);
  s3.lodged += 1;
  s3.lodgedByTier[tier] = (s3.lodgedByTier[tier] ?? 0) + 1;
  if (won) {
    s3.won += 1;
    s3.wonByTier[tier] = (s3.wonByTier[tier] ?? 0) + 1;
    if (p1.suspendedMatches !== 0) fail(3, `${tag}: appeal won but the ban reads ${p1.suspendedMatches}`);
  } else {
    s3.lost += 1;
    if (p1.suspendedMatches !== stated) fail(3, `${tag}: appeal lost, the button said ${stated}, the ban reads ${p1.suspendedMatches} (was ${p0.suspendedMatches})`);
  }
  if (restOf(after, before, item.playerId, ['ban']) !== restOf(before, before, item.playerId, ['ban'])) fail(3, `${tag}: an appeal moved more than his ban`);
}

/** Each entry of a play season: read the cards, lodge every appeal (and walk
 *  the accept on a copy), answer every situation with a rotating answer. */
function playEntry(club) {
  let rot = 0;
  return (s, before, r) => {
    const oldIds = new Set(D.deskOf(before).map(d => d.id));
    const fresh = D.deskOf(s).filter(d => !oldIds.has(d.id));
    noteDesk(s);
    if (r.kind === 'match') {
      s1.matches += 1;
      if (s1.matches % 9 === 0 && !s.sacked) kept.push(clone(s));
      const straight = new Set();
      for (const p of s.squad) {
        const b = before.squad.find(x => x.id === p.id);
        if (!b) continue;
        const dr = (p.seasonReds ?? 0) - (b.seasonReds ?? 0);
        const dy = (p.seasonYellows ?? 0) - (b.seasonYellows ?? 0);
        if (dr === 1 && dy === 0) straight.add(p.id);
        else if (dr === 1) s1.secondYellow += 1;
      }
      s1.straight += straight.size;
      const appeals = fresh.filter(d => d.kind === 'appeal');
      s1.appeals += appeals.length;
      for (const d of appeals) if (!straight.has(d.playerId)) fail(1, `${club} week ${s.week}: an appeal for ${d.playerName}, who was not shown a straight red`);
      for (const id of straight) {
        const banned = (s.squad.find(p => p.id === id)?.suspendedMatches ?? 0) > 0;
        if (banned && !appeals.some(d => d.playerId === id)) fail(1, `${club} week ${s.week}: a straight red for ${id} with no appeal on the desk`);
      }
    }
    for (const d of pendingOf(s)) {
      const tag = `${club} s${s.season} w${s.week} ${d.deckId ?? 'appeal'}`;
      if (d.kind === 'appeal') {
        checkAppeal(`${tag} accept`, s, A.answerMessage(s, d.id, 1), d, 1);
        const after = A.answerMessage(s, d.id, 0);
        checkAppeal(tag, s, after, d, 0);
        s = after;
      } else {
        const idx = rot++ % d.options.length;
        const after = A.answerMessage(s, d.id, idx);
        checkAnswer(tag, s, after, d, idx);
        s = after;
      }
      noteDesk(s);
    }
    return s;
  };
}
for (let i = 0; i < CLUBS.length; i++) careerOf(A, CLUBS[i], BASE_SEED + 7 + 31 * i, PLAY_SEASONS, playEntry(CLUBS[i]));

if (s1.straight < MIN_STRAIGHT_REDS) fail(1, `only ${s1.straight} straight reds in the play seasons, under the floor of ${MIN_STRAIGHT_REDS}`);
console.log(`1. appeals: ${s1.matches} matches, ${s1.straight} straight reds, ${s1.secondYellow} second yellows, ${s1.appeals} appeals offered`);
console.log(`3. bans: ${s3.lodged} appeals lodged (${s3.won} won, ${s3.lost} lost), ${s3.accepted} accepts walked; by tier ${JSON.stringify(s3.lodgedByTier)} lodged, ${JSON.stringify(s3.wonByTier)} won`);
if (s3.lodged < 1 || s3.lost < 1) fail(3, `the seasons lodged ${s3.lodged} appeals with ${s3.lost} lost, so the lost branch was never walked`);

/* ---------- 4b. every answer of every card, from real mid season states ---------- */
for (const [k, base] of kept.entries()) {
  for (const card of D.DECK) {
    if (!card.fits(base) || (card.who && !card.who(base))) continue;
    const item = D.buildSituation(base, card);
    const s = { ...base, decisions: [item] };
    item.options.forEach((_, idx) => checkAnswer(`kept ${k} ${card.id}`, s, A.answerMessage(s, item.id, idx), item, idx));
  }
}
const allPairs = D.DECK.reduce((n, c) => n + c.options.length, 0);
if (s4.pairs.size !== allPairs) fail(4, `only ${s4.pairs.size} of ${allPairs} card answers were walked`);
if (s4.answered < MIN_SITUATIONS) fail(4, `only ${s4.answered} situation answers applied`);
console.log(`4. answers: ${s4.answered} applied, ${s4.pairs.size} of ${allPairs} card answers walked, ${s4.clamped} met a bound, from ${kept.length} kept states`);

/* ---------- 2. the odds are the odds ---------- */
/* Every tier of the ladder, each over ids shaped exactly like the engine's
   (season, week, player) and spread over the three clubs. */
const tierLines = [];
for (const odds of D.APPEAL_ODDS) {
  let wins = 0;
  for (let i = 0; i < ODDS_SAMPLE; i++) {
    const item = { id: `desk-${1 + (i % 5)}-${i % 61}-appeal-p${i}`, odds };
    if (D.appealWins(item, { clubName: CLUBS[i % CLUBS.length] })) wins += 1;
  }
  const pct = (100 * wins) / ODDS_SAMPLE;
  tierLines.push(`${odds}% stated, ${pct.toFixed(2)}% observed`);
  if (Math.abs(pct - odds) > ODDS_BAND) fail(2, `stated ${odds}%, observed ${pct.toFixed(2)}% over ${ODDS_SAMPLE}, outside the band of ${ODDS_BAND} points`);
}
for (const [reds, odds] of [[1, 40], [2, 25], [3, 15], [5, 15]]) {
  if (D.appealOddsFor(reds) !== odds) fail(2, `a man on his red number ${reds} is quoted ${D.appealOddsFor(reds)}%, the ladder says ${odds}%`);
}
const e2e = s3.lodged ? `${((100 * s3.won) / s3.lodged).toFixed(1)}% of ${s3.lodged} lodged in the seasons` : 'none lodged in the seasons';
console.log(`2. odds: ${tierLines.join('; ')}; end to end ${e2e}`);

/* ---------- 6. words ---------- */
const ROLES = new Set(['The club secretary', 'The commercial team', 'The board', 'The head coach', 'The community department', 'The press officer', 'The supporters trust']);
for (const d of deskSeen) {
  if (!ROLES.has(d.from)) fail(6, `${d.id} speaks through "${d.from}", which is not a role on the list`);
  for (const t of [d.text, d.resolved ?? '', ...d.options.map(o => o.label)]) {
    if (/["“”]/.test(t)) fail(6, `${d.id} carries a quotation mark: ${t}`);
    if (/[–—]/.test(t)) fail(6, `${d.id} carries an em or en dash: ${t}`);
  }
}
console.log(`6. words: ${deskSeen.length} desk cards read`);

if (globalThis.__netCalls) fail(0, `the engine tried the network ${globalThis.__netCalls} times`);
fs.rmSync(TMP, { recursive: true, force: true });
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (fails.length > 40) console.log(`... and ${fails.length - 40} more`);
console.log(`simClubManagerDecisions${CONTROL ? ` (control ${CONTROL})` : ''}: ${fails.length} findings`);
process.exit(fails.length ? 1 : 0);
