/**
 * Round 1327 harness: Soccer Career's event cards do what they say.
 *
 * The card prints its consequence before you choose, and the choice's code
 * did something else. The depth hunt (hunt-sc.md, sc MAJOR 5, runner walks on
 * 48cb9d4b) applied every printed claim 30 times: Late Winner printed
 * "Social media +50k", Puskas Nominee "Social media +100k" and International
 * Debut Goal "Social media +75k", and none of the three moved a follower,
 * while Puskas Nominee handed out a Popularity +15 it never printed. This is
 * that audit, kept.
 *
 * THE RULE, both ways, on the 40 cards written inline in getAllEvents
 * (ids 1 to 40). Every clause the card prints moves what it names, by what
 * it says, the moment the choice is made; and every meter the choice moves is
 * named by some clause. A "next season" clause is read on
 * statBoostNextSeason. A choice that rolls (the 30 applies disagree) must be
 * in CHANCE below with its printed text and every outcome, and each outcome
 * must turn up. A clause that names no number is allowed only from FIELD
 * (it moves a field this file checks) or FLAVOR (it claims nothing, with the
 * verdict written beside it).
 *
 * THE SECTIONS
 *   1  HARD. The rule above, on six fixed saves driven through the real
 *      engine with a seeded Math.random and then set to known meters: a mid
 *      career striker (the hunt's shape), a goalkeeper, a centre back, a
 *      capped international, one with a stat boost already queued for next
 *      season, and one with a partner and a boot deal. Every choice of every
 *      inline card, 30 applies each on deep copies, seeds 1 to 30.
 *   2  REPORT. The same reading of every other catalog the deck draws from
 *      (eras, life, realism, corruption, critic, boot): never kept claims
 *      and unnamed effects are printed as owed, never failed. Those files
 *      belong to other rounds and to the other lane.
 *   3  HARD. The inline 40 keep the base's ids, choice count and choice
 *      order (labels by index), because an old save answers a pending card
 *      by its id and the index of the choice (applyEventChoice).
 *
 * MEASURED. On the base (8fea14e2, before this round; BASE is now main at c9c77eba, Release BB), section 1 failed on
 * the three follower claims and on the effects nobody printed; the full
 * readings are in docs/audits/ROUND-1327-NOTES.md and the header is updated
 * with each step.
 *
 * NEGATIVE CONTROLS (SIM_SOCCER_EVENT_PROMISES_CONTROL), each on a COPY of the
 * engine bundled in place of the real one. A control whose text is not in
 * the file exactly once refuses to run. The run ends with a line saying
 * whether the control FIRED (its section failed) or not; both exit 1.
 *   breakapply   card 1's follower line comes out: section 1 fails.
 *   unannounced  card 5's reject choice bumps popularity: section 1 fails.
 *   reorder      card 13's first two choices swap places: section 3 fails.
 *
 * Run: node scripts/simSoccerEventPromises.mjs
 * Reads no network: the bundle is local, offlineTransport blocks sockets.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* The tree this round was cut from. Section 3 bundles it from git. */
const BASE = 'c9c77ebab727b9bd624459388e33b6579538e4ca';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const CONTROL = process.env.SIM_SOCCER_EVENT_PROMISES_CONTROL || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1327-promises-'));

let failures = 0;
let SECTION = '0';
const failedSections = new Set();
const fail = m => { failures += 1; failedSections.add(SECTION); if (failures <= 80) console.error(`  FAIL (section ${SECTION}): ${m}`); };

/* ─── the controls ─────────────────────────────────────────────────────── */

const swapChoices = (src, a, b) => {
  const block = label => new RegExp(`        \\{ label: "${label}"[^\\n]*\\n[^\\n]*\\n`, 'g');
  const ma = src.match(block(a)) || [];
  const mb = src.match(block(b)) || [];
  if (ma.length !== 1 || mb.length !== 1) return null;
  const at = src.indexOf(ma[0]);
  if (src.slice(at + ma[0].length, at + ma[0].length + mb[0].length) !== mb[0]) return null;
  return src.slice(0, at) + mb[0] + ma[0] + src.slice(at + ma[0].length + mb[0].length);
};
const CONTROLS = {
  breakapply: {
    from: 's.socialMediaFollowers += 0.05; s.events = [...s.events, "⚽ Scored a last-minute winner!',
    to: 's.events = [...s.events, "⚽ Scored a last-minute winner!',
    note: 'card 1 no longer adds the followers it prints', breaks: '1',
  },
  unannounced: {
    from: 'apply: s => { s.events = [...s.events, "👟 Rejected sponsorship offers"]; return s; }',
    to: 'apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "👟 Rejected sponsorship offers"]; return s; }',
    note: 'card 5 rejecting every offer bumps popularity without printing it', breaks: '1',
  },
  reorder: {
    swap: ['Apologize publicly', 'Deny it'],
    note: 'card 13 shows its first two choices the other way round', breaks: '3',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_SOCCER_EVENT_PROMISES_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let controlApply = null;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const src = fs.readFileSync(path.join(ROOT, ENGINE), 'utf8').replace(/\r\n/g, '\n');
  let out = null;
  if (c.swap) out = swapChoices(src, ...c.swap);
  else if (src.split(c.from).length === 2) out = src.replace(c.from, () => c.to);
  if (!out || out === src) { console.error(`control cannot run: ${ENGINE} is not in the shape the ${CONTROL} control rewrites (its text must be there exactly once)`); process.exit(1); }
  controlApply = out;
  fs.writeFileSync(path.join(TMP, `${CONTROL}.control.ts`), out);
  console.log(`NEGATIVE CONTROL ON: ${c.note} (section ${c.breaks} must fail)`);
}

/* ─── bundle ───────────────────────────────────────────────────────────── */

/* Every src file is read either from the working tree or, for the base arm,
   from git at BASE (imports still resolve against the tree on disk). The
   engine gains one appended line so the harness reaches the real deck and
   paper on any version, exported or not. */
async function bundle(tag, { ref = null, control = null } = {}) {
  let hits = 0;
  const plugin = { name: 'r1327-source', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      let source = ref
        ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
        : fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (control && rel === ENGINE) { source = control; hits += 1; }
      if (rel === ENGINE) source += '\nexport { generateRandomEvents as __r1327Deck, generateNewsArticles as __r1327News };\n';
      return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({
    stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as contracts from './src/lib/soccerCareerContracts';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  });
  if (control) assert.equal(hits, 1, 'the control copy of the engine was loaded exactly once');
  return import(pathToFileURL(out).href);
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear(),
};

const HEAD = await bundle('head', { control: controlApply });
const BASEMOD = await bundle('base', { ref: BASE });
const E = HEAD.engine;

/* ─── seeded careers ──────────────────────────────────────────────────── */

const seeded = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const withSeed = (seed, fn) => { const real = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = real; } };
const copy = v => JSON.parse(JSON.stringify(v));
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/* Plays a career until the season card batch after `playing` pro seasons. */
function driveTo(M, { name, nat, pos, ovr, seed, playing }) {
  return withSeed(seed, () => {
    const clubs = M.FALLBACK_CLUBS;
    let s = M.initCareer(name, nat, pos, '2020s', stats(ovr), ovr, 2020, clubs, null);
    let n = 0;
    for (let guard = 0; guard < 400 && !s.retired; guard += 1) {
      if (s.phase === 'random_events' && n >= playing) return s;
      switch (s.phase) {
        case 'youth': s = M.advanceYouthYear(s, clubs); break;
        case 'contract_offer': s = s.pendingOffers?.length ? M.acceptOffer(s, s.pendingOffers.find(o => !o.isLoan) || s.pendingOffers[0]) : { ...s, phase: 'playing' }; break;
        case 'playing': s = M.advanceProSeason(s, clubs); n += 1; break;
        case 'newspaper': s = M.dismissNewspaper(s); break;
        case 'season_summary': s = M.dismissSummary(s, clubs); break;
        case 'rehab_choice': s = M.applyRehabChoice(s, 0); break;
        case 'random_events': s = M.applyEventChoice(s, 0, clubs); break;
        case 'moral_dilemma': s = M.dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': s = M.dismissSocialMediaPhase(s, clubs); break;
        case 'red_card_appeal_result': s = M.dismissAppealResult(s, clubs); break;
        case 'international_debut': s = M.dismissDebut(s, clubs); break;
        case 'world_cup': s = M.dismissWorldCup(s, clubs); break;
        case 'rivalry_event': s = M.dismissRivalryEvent(s, clubs); break;
        case 'ballon_dor': s = M.dismissBallonDor(s, clubs); break;
        case 'transfer_window': s = M.stayAtClub(s); break;
        case 'retirement_suggestion': s = M.acceptRetirementSuggestion(s); break;
        default: throw new Error(`driveTo: no move for phase ${s.phase}`);
      }
    }
    throw new Error(`driveTo: ${name} never reached a card batch after ${playing} seasons`);
  });
}

/* ─── the meters a choice may move ─────────────────────────────────────── */

const STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const meters = s => ({
  popularity: s.popularity, morale: s.morale, socialMediaFollowers: s.socialMediaFollowers,
  marketValue: s.marketValue, netWorth: s.netWorth, totalEarnings: s.totalEarnings, weeklyWage: s.weeklyWage,
  contractYearsLeft: s.contractYearsLeft,
  ...Object.fromEntries(STATS.map(k => [k, s[k]])),
  ...Object.fromEntries(STATS.map(k => [`boost.${k}`, s.statBoostNextSeason?.[k] ?? 0])),
  sponsorBonus: s.sponsorBonus ?? 0, integrityBonus: s.integrityBonus ?? 0,
  pendingSuspensionMatches: s.pendingSuspensionMatches ?? 0,
  internationalCareer: !!s.internationalCareer, intRetired: !!s.intStats?.isRetired,
  debutYear: s.intStats?.debutYear ?? null, debutAge: s.intStats?.debutAge ?? null,
  sponsorDeal: s.sponsorDeal ?? null, hasRelationship: !!s.hasRelationship,
  isClubCaptain: !!s.isClubCaptain, isLeader: !!s.isLeader,
  properties: (s.properties || []).length, investments: (s.investments || []).length,
  mentor: s.mentor ? 1 : 0, reducedRole: s.reducedRole ? 1 : 0,
});
const near = (a, b) => Math.abs(a - b) < 1e-6;
function delta(b, a) {
  const d = {};
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') {
      const v = Math.round((a[k] - b[k]) * 1e6) / 1e6;
      if (v !== 0) d[k] = v;
    } else if (a[k] !== b[k]) d[k] = a[k];
  }
  return d;
}
const sameDelta = (x, y) => {
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) {
    const a = x[k] ?? 0, b = y[k] ?? 0;
    if (typeof a === 'number' && typeof b === 'number') { if (!near(a, b)) return false; } else if (a !== b) return false;
  }
  return true;
};

/* ─── reading a printed consequence ───────────────────────────────────── */

const METER_OF = {
  'popularity': 'popularity', 'morale': 'morale', 'social media': 'socialMediaFollowers', 'followers': 'socialMediaFollowers',
  'market value': 'marketValue', 'net worth': 'netWorth', 'legacy': 'integrityBonus',
  'income': 'sponsorBonus', 'sponsorship income': 'sponsorBonus', 'wage': 'weeklyWage',
  'pace': 'pace', 'shooting': 'shooting', 'passing': 'passing', 'dribbling': 'dribbling', 'defending': 'defending', 'physical': 'physical',
};
const CLAUSE = /^(Popularity|Morale|Social media|Followers|Market value|Net worth|Legacy|Sponsorship income|Income|Wage|Pace|Shooting|Passing|Dribbling|Defending|Physical|All stats) ([+-])(€?)(\d+(?:\.\d+)?)(k|M|%)?( next season| a year| from travel)?$/i;
/** [[meter, amount]] for a numeric clause, or null. Money and followers are
 *  held in millions, so k is a thousandth and M is one. */
function parseNumeric(p) {
  const m = p.match(CLAUSE);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const sign = m[2] === '-' ? -1 : 1;
  let n = Number(m[4]) * sign;
  if (m[5] === 'k') n /= 1000;
  const tail = (m[6] || '').trim();
  if (m[5] === '%' && word !== 'wage') return null;
  if (word === 'all stats') {
    if (tail !== 'next season') return null;
    return STATS.map(k => [`boost.${k}`, n]);
  }
  const meter = METER_OF[word];
  if (tail === 'a year' && meter !== 'sponsorBonus') return null;
  if (meter === 'sponsorBonus' && tail !== 'a year') return null;
  if (tail === 'next season') return STATS.includes(meter) ? [[`boost.${meter}`, n]] : null;
  if (m[5] === '%') return [['weeklyWage%', n]];
  return [[meter, n]];
}
const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function expectedDelta(meter, b, x) {
  if (meter === 'popularity' || meter === 'morale') return clampTo(b[meter] + x, 0, 100) - b[meter];
  if (STATS.includes(meter)) return clampTo(b[meter] + x, 20, 99) - b[meter];
  if (meter === 'marketValue' && x < 0) return Math.max(0.1, b[meter] + x) - b[meter];
  return x;
}
const splitClauses = text => text.split(/,\s+|\s+but\s+|\.\s+/).map(p => p.trim()).filter(Boolean);

/* Clauses with no number that move a field: what they move, and the check. */
const FIELD = {
  'Leadership role': { moves: ['isClubCaptain', 'isLeader'], ok: (b, a) => a.isClubCaptain && a.isLeader },
  'Property added': { moves: ['properties'], ok: (b, a) => a.properties === b.properties + 1 },
  'Fund added to your investments': { moves: ['investments'], ok: (b, a) => a.investments === b.investments + 1 },
  'International career begins': { moves: ['internationalCareer', 'debutYear', 'debutAge'], ok: (b, a) => a.internationalCareer === true },
  'International career ends': { moves: ['internationalCareer', 'intRetired'], ok: (b, a) => a.internationalCareer === false && a.intRetired === true },
  'now in a relationship': { moves: ['hasRelationship'], ok: (b, a) => a.hasRelationship === true },
  /* card 5: the deal pays its first year on signing (totalEarnings) and the
     named brand pays the same every year after (calcSponsorshipIncome) */
  '+€2M/year income': { moves: ['sponsorDeal', 'totalEarnings'], ok: (b, a) => a.sponsorDeal === 'Vortex' && near(a.totalEarnings - b.totalEarnings, 2) },
  '+€1.5M/year income': { moves: ['sponsorDeal', 'totalEarnings'], ok: (b, a) => a.sponsorDeal === 'Kinetiq' && near(a.totalEarnings - b.totalEarnings, 1.5) },
  '3-match ban next season': { moves: ['pendingSuspensionMatches'], ok: (b, a) => a.pendingSuspensionMatches - b.pendingSuspensionMatches === 3 },
  '4 fewer planned league games next season at this club': { moves: ['reducedRole'], ok: (b, a) => a.reducedRole === 1 },
  'Begin your saved academy mentorship': { moves: ['mentor'], ok: (b, a) => a.mentor === 1 },
  'Contract not renewed, become free agent sooner': { whole: true, moves: ['contractYearsLeft'], ok: (b, a) => a.contractYearsLeft === Math.min(b.contractYearsLeft, 1) },
};
/* Clauses that claim nothing a field could hold, each with its verdict. */
const FLAVOR = {
  'No deal, stay independent': 'nothing changes, and nothing does',
  'Appeal submitted': 'the appeal result is the next screen; a lost appeal queues its ban there (dismissAppealResult)',
  'result in 3-5 days': 'scenery: the result is the very next screen',
  'family support': 'scenery beside the Physical +1',
  'appearances maintained': 'nothing else changes, and nothing does',
  'No risk, no reward': 'nothing changes, and nothing does',
  'Smart financial decision': 'nothing changes, and nothing does',
  'Save the money': 'nothing changes, and nothing does',
  'Smart move? Or missed opportunity?': 'nothing changes, and nothing does',
  'Stay professional': 'nothing changes, and nothing does',
  'No investment made': 'nothing changes, and nothing does',
  'Status symbol': 'describes the watches, claims no effect',
  'Stay focused on football': 'nothing changes, and nothing does',
  'Stay low-key': 'nothing changes, and nothing does',
  'Privacy maintained': 'nothing changes, and nothing does',
  'No change': 'nothing changes, and nothing does',
  'stay focused': 'nothing changes, and nothing does',
  'Focus on football': 'nothing changes, and nothing does',
  'Postpone the dream': 'nothing changes, and nothing does',
  'it goes viral anyway': 'scenery beside the followers it prints',
  'Stay out of politics': 'nothing changes, and nothing does',
  '50% chance manager explains': 'the roll decides only the line in your event log',
  'Keep your existing mentorship and its history': 'the saved mentorship is kept as it was',
};
/* Choices that roll: the text they must print, and every outcome. */
const CHANCE = {
  '11:1': { text: 'Pace -1, with a 30% chance of reinjury (Pace -3 instead)', outcomes: [{ pace: -1 }, { pace: -3 }] },
  '13:1': { text: '50% chance: believed, or Popularity -8', outcomes: [{}, { popularity: -8 }] },
  /* card 16 is Release AW's (veteran pay); "relationship damaged" is the Morale -10 its miss applies */
  '16:1': { dynamic: (save, C) => { const d = C.soccerWageDemand(save); return { text: d.consequence, outcomes: [{ weeklyWage: d.weeklyWage - save.weeklyWage }, { morale: -10 }] }; } },
  '22:0': { text: 'Random: +€1M profit or -€500k loss', outcomes: [{ netWorth: 1, investments: 1 }, { netWorth: -0.5, investments: 1 }] },
  '26:0': { text: 'Could go 10x (+€2M), double (+€200k) or crash (-€200k)', outcomes: [{ netWorth: 2, investments: 1 }, { netWorth: 0.2, investments: 1 }, { netWorth: -0.2, investments: 1 }] },
};

/** Applies one choice 30 times and reads it against its printed text.
 *  Returns a list of problems, empty when the card keeps its word. */
function judge(card, ci, save, C) {
  const choice = card.choices[ci];
  const text = choice.consequence || '';
  const key = `${card.id}:${ci}`;
  const mb = meters(save);
  const runs = [];
  for (let k = 1; k <= 30; k += 1) {
    const after = withSeed(k * 7919 + card.id * 31 + ci, () => choice.apply({ ...copy(save) }));
    const ma = meters(after);
    runs.push({ ma, d: delta(mb, ma) });
  }
  const bad = [];
  const entry = CHANCE[key] && (CHANCE[key].dynamic ? CHANCE[key].dynamic(save, C) : CHANCE[key]);
  const varies = new Set(runs.map(r => JSON.stringify(r.d))).size > 1;
  if (entry || varies) {
    if (!entry) return [`"${text}" rolls (its 30 applies disagree) and has no CHANCE entry saying what it may do`];
    if (entry.text !== text) bad.push(`prints "${text}" where its CHANCE entry vouches for "${entry.text}"`);
    const seen = new Set();
    for (const r of runs) {
      const i = entry.outcomes.findIndex(o => sameDelta(o, r.d));
      if (i < 0) { bad.push(`rolled ${JSON.stringify(r.d)}, which "${text}" does not print`); break; }
      seen.add(i);
    }
    entry.outcomes.forEach((o, i) => { if (!seen.has(i)) bad.push(`never rolled ${JSON.stringify(o)} in 30 seeded applies`); });
    return bad;
  }
  const { ma, d } = runs[0];
  const expected = {};
  const accounted = new Set();
  const parts = (FIELD[text]?.whole || FLAVOR[text]) ? [text] : splitClauses(text);
  for (const p of parts) {
    const f = FIELD[p];
    if (f) { f.moves.forEach(m => accounted.add(m)); if (!f.ok(mb, ma)) bad.push(`"${p}" did not happen`); continue; }
    if (FLAVOR[p]) continue;
    const n = parseNumeric(p);
    if (!n) { bad.push(`"${p}" is a claim with no field this harness can check`); continue; }
    for (const [m, x] of n) {
      if (m === 'weeklyWage%') { expected.weeklyWage = Math.round(mb.weeklyWage * (1 + x / 100)) - mb.weeklyWage; accounted.add('weeklyWage'); continue; }
      expected[m] = (expected[m] ?? 0) + x; accounted.add(m);
    }
  }
  for (const [m, x] of Object.entries(expected)) {
    const want = m === 'weeklyWage' ? x : expectedDelta(m, mb, x);
    if (!near(d[m] ?? 0, want)) bad.push(`promised ${m} ${want >= 0 ? '+' : ''}${Math.round(want * 1000) / 1000}, applied ${d[m] ?? 0}`);
  }
  for (const [m, v] of Object.entries(d)) if (!accounted.has(m)) bad.push(`moved ${m} by ${typeof v === 'number' ? v : JSON.stringify(v)} and never said so`);
  return bad;
}

/* ─── the fixed saves ──────────────────────────────────────────────────── */

const SHAPES = [
  { tag: 'striker', nat: 'England', pos: 'ST', ovr: 66, seed: 11, playing: 5 },
  { tag: 'keeper', nat: 'Brazil', pos: 'GK', ovr: 64, seed: 23, playing: 5 },
  { tag: 'centreback', nat: 'France', pos: 'CB', ovr: 65, seed: 37, playing: 6 },
  { tag: 'international', nat: 'Nigeria', pos: 'CM', ovr: 70, seed: 41, playing: 6, set: s => { s.internationalCareer = true; s.intStats = { ...s.intStats, caps: 14, goals: 2, isRetired: false }; } },
  { tag: 'queuedboost', nat: 'Japan', pos: 'LW', ovr: 66, seed: 53, playing: 5, set: s => { s.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1, reflexes: 1 }; } },
  { tag: 'partner', nat: 'Argentina', pos: 'RB', ovr: 65, seed: 67, playing: 5, set: s => { s.hasRelationship = true; s.sponsorDeal = 'Kinetiq'; } },
];
/* Known meters, away from every clamp, so a printed number is read exactly. */
function settle(s) {
  Object.assign(s, {
    popularity: 50, morale: 50, netWorth: 60, marketValue: 20, socialMediaFollowers: 6, sponsorBonus: 0, integrityBonus: 0,
    pendingSuspensionMatches: 0, statBoostNextSeason: {}, hasRelationship: false, sponsorDeal: null,
    isClubCaptain: false, isLeader: false, contractYearsLeft: 3, weeklyWage: 60000, internationalCareer: false,
    intStats: { ...s.intStats, isRetired: false },
  });
  for (const k of STATS) s[k] = 60;
  delete s.mentor; delete s.reducedRole;
  return s;
}
const saves = [];
for (const shape of SHAPES) {
  const s = settle(copy(driveTo(E, { name: `Promise ${shape.tag}`, ...shape })));
  if (shape.set) shape.set(s);
  saves.push({ tag: shape.tag, s: copy(s) });
}
console.log(`Fixed saves: ${saves.map(v => `${v.tag} (${v.s.position}, ${v.s.seasons.length} rows, ${v.s.currentClub}${v.s.loan ? ', on loan' : ''})`).join('; ')}`);

const catalogOf = (M, s) => withSeed(4242, () => M.getAllEvents(copy(s)));

/* ─── 1. the inline 40 keep their word ─────────────────────────────────── */

SECTION = '1';
console.log('1) The inline 40: every printed clause applied, nothing unprinted applied');
{
  let choices = 0, kept = 0;
  const badCards = new Map();
  for (const { tag, s } of saves) {
    const inline = catalogOf(E, s).filter(e => e.id >= 1 && e.id <= 40);
    if (inline.length !== 40) fail(`${tag}: the catalog offers ${inline.length} inline cards, not 40`);
    for (const card of inline) {
      for (let ci = 0; ci < card.choices.length; ci += 1) {
        choices += 1;
        const bad = judge(card, ci, s, HEAD.contracts);
        if (bad.length === 0) { kept += 1; continue; }
        const k = `${card.id} "${card.title}" choice ${ci + 1} "${card.choices[ci].label}"`;
        if (!badCards.has(k)) badCards.set(k, new Set());
        for (const b of bad) badCards.get(k).add(`${b} [${tag}]`);
      }
    }
  }
  console.log(`   ${choices} choices judged on ${saves.length} saves (30 seeded applies each), ${kept} kept their word`);
  for (const [k, set] of badCards) fail(`card ${k}: ${[...set].slice(0, 3).join('; ')}${set.size > 3 ? ` (and ${set.size - 3} more)` : ''}`);
  if (choices < 6 * 70) fail(`only ${choices} choices were judged, too few to have covered the 40`);
}

/* ─── 2. every other catalog, reported ─────────────────────────────────── */

SECTION = '2';
console.log('2) REPORT: the same reading of every other catalog (owed to other rounds, never failed)');
{
  const ranges = [['eras 41 to 199', 41, 199], ['life 200 to 299', 200, 299], ['corruption 300 to 399', 300, 399], ['realism 400 to 499', 400, 499], ['critic and boot 500+', 500, 1e9]];
  const tally = new Map(ranges.map(r => [r[0], { choices: 0, kept: 0, cards: new Set() }]));
  for (const { s } of saves.slice(0, 2)) {
    for (const card of catalogOf(E, s).filter(e => e.id > 40)) {
      const r = ranges.find(x => card.id >= x[1] && card.id <= x[2]);
      const t = tally.get(r[0]);
      for (let ci = 0; ci < card.choices.length; ci += 1) {
        t.choices += 1;
        let bad;
        try { bad = judge(card, ci, s, HEAD.contracts); } catch (err) { bad = [`threw ${err.message}`]; }
        if (bad.length === 0) t.kept += 1; else t.cards.add(card.id);
      }
    }
  }
  for (const [name, t] of tally) console.log(`   ${name}: ${t.kept} of ${t.choices} choices read as kept; owed: ${t.cards.size} cards (${[...t.cards].sort((a, b) => a - b).slice(0, 30).join(' ')}${t.cards.size > 30 ? ' ...' : ''})`);
}

/* ─── 3. same ids, choice count and order as the base ──────────────────── */

SECTION = '3';
console.log('3) The inline 40 keep the base\'s ids, choice counts and choice order');
{
  const s = saves[0].s;
  const head = new Map(catalogOf(E, s).filter(e => e.id <= 40).map(e => [e.id, e]));
  const base = new Map(catalogOf(BASEMOD.engine, s).filter(e => e.id <= 40).map(e => [e.id, e]));
  let same = 0;
  for (const [id, b] of base) {
    const h = head.get(id);
    if (!h) { fail(`card ${id} is gone`); continue; }
    if (h.choices.length !== b.choices.length) { fail(`card ${id} has ${h.choices.length} choices, the base had ${b.choices.length}`); continue; }
    const moved = b.choices.findIndex((c, i) => c.label !== h.choices[i].label);
    if (moved >= 0) { fail(`card ${id} choice ${moved + 1} reads "${h.choices[moved].label}", the base's was "${b.choices[moved].label}"`); continue; }
    same += 1;
  }
  for (const id of head.keys()) if (!base.has(id)) fail(`card ${id} is new among the inline cards`);
  console.log(`   ${same} of ${base.size} inline cards match the base by id, choice count and label order`);
  if (base.size !== 40) fail(`the base offered ${base.size} inline cards, not 40`);
}

/* ─── verdict ──────────────────────────────────────────────────────────── */

if (CONTROL) {
  const t = CONTROLS[CONTROL].breaks;
  console.log(failedSections.has(t)
    ? `CONTROL ${CONTROL} FIRED: section ${t} failed (${failures} failures in all)`
    : `CONTROL ${CONTROL} DID NOT FIRE: section ${t} stayed green`);
  process.exit(1);
}
console.log(failures ? `simSoccerEventPromises: ${failures} failures in section ${[...failedSections].sort().join(', ')}` : 'simSoccerEventPromises: all sections green');
process.exit(failures ? 1 : 0);
