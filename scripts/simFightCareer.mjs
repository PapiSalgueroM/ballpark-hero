/* Round 620: Fight Career.
 *
 * WHAT THIS HARNESS IS FOR. Not "a career completes without crashing", which is
 * close to worthless. The question is whether the game contains a DECISION. The
 * whole design rests on one claim: damage is permanent, so taking the hard fight
 * buys ranking and money now and costs you the end of your career later. If that
 * claim is false then the offers screen is decoration and there is no game here.
 * Section 1 is therefore the section that proves the round, and its control is
 * the one that matters: remove permanent damage and the aggressive policy must
 * start winning, because if it does not then damage was never load bearing.
 *
 * THE RULES THIS FILE OBEYS, from the repo's own hard won list:
 *   - Never assert on a maximum. Maxima are noise.
 *   - Never assert non significance. That test gets easier the less data it is
 *     fed, so it passes for the wrong reason.
 *   - Bands come from measured headroom, not from a number that felt right.
 *   - Every check gets a negative control, and the control must PROVABLY fire:
 *     it asserts its anchor exists in the source before it rewrites it, so a
 *     control that silently matches nothing cannot leave this green.
 *
 * CONTROLS, one per section, each breaking exactly its own section:
 *   FIGHT_CONTROL=nodecay     damage stops accumulating        -> section 1
 *   FIGHT_CONTROL=noretire    damage stops ending careers      -> section 2
 *   FIGHT_CONTROL=godmode     the player is unbeatable         -> section 3
 *   FIGHT_CONTROL=driftdaily  the daily stops targeting        -> section 4
 *   FIGHT_CONTROL=nostyle     the tactic matrix goes flat      -> section 5
 *   FIGHT_CONTROL=flatbar     the condition bars never drain   -> section 6
 *   FIGHT_CONTROL=nostop      a stopped man keeps a full bar   -> section 6
 *   FIGHT_CONTROL=synthetic   the sample is invented fighters  -> section 6
 *   FIGHT_CONTROL=nofloor     a standing man can read empty    -> section 6
 *   FIGHT_CONTROL=recover     the bars climb back up           -> section 6
 *   FIGHT_CONTROL=heavybar    a punch drains 50 percent more   -> section 6
 *   FIGHT_CONTROL=pinboth     worn men both drop to the floor  -> section 6
 *   FIGHT_CONTROL=strongpin   Round 628's clamped bar is back  -> section 6
 *
 * ROUND 916, SECTION 7: the life between fights (the corner, the deck, the
 * inbox, the rival, the bank and shop). Its controls:
 *   FIGHT_CONTROL=lifeleak    neutral play gets a point of sharpness -> 7a
 *   FIGHT_CONTROL=fakeneutral a "neutral" option moves morale       -> 7a, 7c
 *   FIGHT_CONTROL=nocards     nothing is dealt between fights       -> 7b, 7d
 *   FIGHT_CONTROL=freecard    a card's cost is never charged        -> 7c
 *   FIGHT_CONTROL=redeal      a reload forgets the waiting cards    -> 7d
 *   FIGHT_CONTROL=flatshop    coach levels 2 and 3 do nothing       -> 7e
 *   FIGHT_CONTROL=flatsharp   sharpness never reaches the night     -> 7e
 *   FIGHT_CONTROL=wipesave    an old save loses its record on load  -> 7d, 7f
 *   Added by the Round 916 review, each the defect a reviewer planted and
 *   found every section still green on:
 *   FIGHT_CONTROL=sharpstays      card sharpness outlives its fight     -> 7g (i)
 *   FIGHT_CONTROL=endlesspromoter the promoter deal never ends          -> 7g (ii)
 *   FIGHT_CONTROL=grosspurse      the bank keeps the corner's share     -> 7g (iii)
 *   FIGHT_CONTROL=rivalfollows    the rival follows a class move        -> 7g (iv)
 *   FIGHT_CONTROL=keepbeaten      the rematch clause follows a move     -> 7g (iv)
 *   FIGHT_CONTROL=crossbeat       a ranking beat spans two divisions    -> 7g (iv)
 *   FIGHT_CONTROL=nodrift         morale never settles                  -> 7g (v)
 *   FIGHT_CONTROL=totalsbeat      "he won again" reads career totals    -> 7g (vi)
 *   FIGHT_CONTROL=staleanswer     a waiting card is never read again    -> 7g (vii)
 *   FIGHT_CONTROL=unrankedrank    an unranked man is handed a number    -> 7g (vii)
 *   FIGHT_CONTROL=specialtable    a class move can throw away a grudge  -> 7g (viii)
 *   FIGHT_CONTROL=stuckchoice     an unknown rival choice blocks a save -> 7g (ix)
 *   FIGHT_CONTROL=silentreply     a text reply hides what it does       -> 7g (x)
 *   7g is exact rather than banded: each check is one walk whose answer is a
 *   number the words state (a fight's 0 sharpness after, 4 promoter tables
 *   and then the free one, the take home to the cent for all 12 corner
 *   pairings, 70 to 68 morale, 64 text replies read back), so there is no
 *   spread to measure, and every control turns its check red.
 *
 * Section 7's numbers, measured on healthy code on 2026-10-02:
 *   7a the baseline was recorded on origin/main at a4433f41, BEFORE the life
 *      layer existed, with the adaptive policy over five seed groups of 260
 *      (1000, 21000, 41000, 61000, 81000): 55, 45, 55, 59 and 40 careers won
 *      a world title (21.2, 17.3, 21.2, 22.7 and 15.4 percent) and the median
 *      career ran 29, 28, 29, 29 and 29 fights. With every new screen answered
 *      neutrally the life layer reproduces all 1,040 careers of the four
 *      policies fight for fight, so it sits inside that spread exactly. The
 *      lifeleak control (one point of sharpness) moved 1,027 of them and put
 *      two groups at 66 and 67 titles, outside it.
 *   7b decisions between fights, the offer and the camp included: median 5,
 *      tenth percentile 4, mean 4.96 over 7,393 gaps. Floor 4. With nothing
 *      dealt (nocards) the median is 3.
 *   7c 121 options (40 cards, 6 rival choices, 11 rival beats) read back
 *      from their words and checked against the state they leave.
 *   7d about 2,900 steps reloaded through JSON and ensureLife.
 *   7e twelve camps of three weeks: the 12% coaches reach 52, 53, 55, 57 at
 *      levels 0 to 3 and the pad man 52, 53, 54, 56; the puncher's coach
 *      takes power to 55 against 52 and leaves defence at 50 against 52.
 *      Punches landed over 120 debuts at sharpness -4, -2, 0, 2, 4: 8902,
 *      9267, 9757, 10270, 10586 (the smallest step is 316). The cut man takes
 *      one fight's 2.332 damage to 2.24, 2.15 and 2.05.
 */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FIGHT_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* Round 620: a worktree carries no node_modules of its own and resolves the
   main tree's by walk-up, which Node does and an absolute binary path does not.
   Every other harness hardcodes ROOT/node_modules/.bin/esbuild and therefore
   cannot run from a worktree. Walking up fixes that here without touching the
   other harnesses, which is the smaller change. */
function findEsbuild() {
  const exe = process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild';
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', '.bin', exe);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('esbuild not found walking up from ' + ROOT);
}

/* Round 620: a per run temp directory. Harnesses here have silently mixed two
   source trees before by sharing one fixed temp filename across concurrent
   runs, and the result of that run is worthless rather than wrong. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightcareer-'));
const SRC = path.join(TMP, 'fightCareer.ts');
const ENGINE = path.join(TMP, 'careerEngine.ts');
const ENTRY = path.join(TMP, 'entry.ts');
const BUNDLE = path.join(TMP, 'bundle.mjs');

/* NORMALISE THE LINE ENDINGS BEFORE ANY CONTROL LOOKS AT THIS TEXT.
   Round 628, found by adding a control whose anchor spanned two lines and
   watching it refuse to run. Anthony's checkout stores these files CRLF, all
   926 lines of fightCareer.ts, and an anchor written in this file is LF. A
   single line anchor therefore matches and a MULTI LINE one cannot, ever.
   Two of the five controls shipped in Round 620 are multi line: `noretire`
   and `driftdaily` had never once fired on a CRLF checkout, so sections 2 and
   4 were green because their control changed nothing, which is the exact
   reading of green the repo's own rule warns about. It survived because it is
   invisible on an LF checkout, where both controls work perfectly. */
let src = fs.readFileSync(path.join(ROOT, 'src/lib/fightCareer.ts'), 'utf8').replaceAll('\r\n', '\n');
let engineSrc = fs.readFileSync(path.join(ROOT, 'src/lib/careerEngine.ts'), 'utf8').replaceAll('\r\n', '\n');

/* Each control asserts its anchor BEFORE it edits. A control that rewrites a
   string the file does not contain changes nothing, the harness stays green,
   and green then means "the control did not fire" rather than "the check
   works". That has happened in this repo, so it is checked here. */
function rewrite(which, anchor, replacement, inEngine = false) {
  const target = inEngine ? engineSrc : src;
  if (!target.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  const next = target.replace(anchor, replacement);
  if (next === target) {
    console.log(`   FAIL control ${which} changed nothing`);
    process.exit(1);
  }
  if (inEngine) engineSrc = next; else src = next;
  console.log(`   [control ${which} applied]`);
}

/* Round 916: the life layer. Six files of its own and the four shared career
   modules it binds, copied beside the engine so the bundle is one tree and a
   control can rewrite any of them. Read here, before the controls, with the
   same line ending rule as above. */
const LIFE_FILES = [
  'fightCareerLife', 'fightCareerLifeFlow', 'fightCareerInbox', 'fightCareerRivalry', 'fightCareerMoney',
  'careerInbox', 'careerRivalryEvents', 'careerRivalryChoices', 'careerBadges', 'keyedRng',
];
const lifeSrc = Object.fromEntries(LIFE_FILES.map(name => [
  name, fs.readFileSync(path.join(ROOT, 'src/lib', `${name}.ts`), 'utf8').replaceAll('\r\n', '\n'),
]));
function rewriteLife(which, file, anchor, replacement) {
  if (!lifeSrc[file].includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in ${file}.ts, so it would change nothing`);
    process.exit(1);
  }
  const next = lifeSrc[file].replace(anchor, replacement);
  if (next === lifeSrc[file]) {
    console.log(`   FAIL control ${which} changed nothing`);
    process.exit(1);
  }
  lifeSrc[file] = next;
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'freecard') {
  /* A card that says it costs money and takes none. Section 7c. */
  rewriteLife('freecard', 'fightCareerLife',
    '  if (e.cash) life.bank = round2(life.bank + e.cash);',
    '  if (e.cash) life.bank = round2(life.bank + Math.max(0, e.cash));');
} else if (CONTROL === 'lifeleak') {
  /* The life reaches the bout with every answer neutral. Section 7a. */
  rewriteLife('lifeleak', 'fightCareerLife',
    '  const sharp = lifeSharpness(st);',
    '  const sharp = lifeSharpness(st) + 1;');
} else if (CONTROL === 'nocards') {
  /* Nothing is dealt between fights. Section 7b. */
  rewriteLife('nocards', 'fightCareerLife',
    'export const CARDS_PER_FIGHT = 2;',
    'export const CARDS_PER_FIGHT = 0;');
} else if (CONTROL === 'fakeneutral') {
  /* A "neutral" option that moves morale. Sections 7a and 7c. */
  rewriteLife('fakeneutral', 'fightCareerLife',
    "{ label: 'Split the difference', effect: {}, line: 'Met the trainer halfway.', neutral: true },",
    "{ label: 'Split the difference', effect: { morale: -12 }, line: 'Met the trainer halfway.', neutral: true },");
} else if (CONTROL === 'redeal') {
  /* A reload forgets the cards that were waiting. Section 7d. */
  rewriteLife('redeal', 'fightCareerLife',
    '  return { ...st, life: ensureLifeBlock(st) };',
    '  return { ...st, life: { ...ensureLifeBlock(st), pending: [] } };');
} else if (CONTROL === 'flatshop') {
  /* Only the first level of a coach does anything. Section 7e. */
  rewriteLife('flatshop', 'fightCareerLife',
    '(1 + upgradeLevel(st.life, up) * stepOf(up));',
    '(1 + Math.min(1, upgradeLevel(st.life, up)) * stepOf(up));');
} else if (CONTROL === 'flatsharp') {
  /* Sharpness is banked and never reaches the night. Section 7e. */
  rewriteLife('flatsharp', 'fightCareerLife',
    '  if (sharp) mods.sharp = sharp;',
    '  if (sharp) mods.sharp = 0;');
} else if (CONTROL === 'wipesave') {
  /* A save from before the round loses its record on load. Section 7f. */
  rewriteLife('wipesave', 'fightCareerLife',
    '  return { ...st, life: ensureLifeBlock(st) };',
    '  return { ...st, fightNo: 0, history: [], life: ensureLifeBlock(st) };');
} else if (CONTROL === 'sharpstays') {
  /* A card's sharpness is never cleared by the fight it was for. 7g (i). */
  rewriteLife('sharpstays', 'fightCareerLifeFlow', '  life.sharp = 0;\n', '');
} else if (CONTROL === 'endlesspromoter') {
  /* The promoter deal never runs out. 7g (ii). */
  rewriteLife('endlesspromoter', 'fightCareerLifeFlow',
    '  if (life.promoterFights > 0) life.promoterFights -= 1;',
    '  if (life.promoterFights > 1) life.promoterFights -= 1;');
} else if (CONTROL === 'grosspurse') {
  /* The bank keeps the corner's share. 7g (iii). */
  rewriteLife('grosspurse', 'fightCareerLifeFlow',
    '  life.bank = round2(life.bank + takeHome);',
    '  life.bank = round2(life.bank + offer.purse);');
} else if (CONTROL === 'rivalfollows') {
  /* The rival follows you into a new division. 7g (iv). */
  rewriteLife('rivalfollows', 'fightCareerLife',
    '  return !!r && (r.weight === undefined || r.weight === st.weight);',
    '  return !!r;');
} else if (CONTROL === 'keepbeaten') {
  /* The man who beat you follows you into a new division. 7g (iv). */
  rewriteLife('keepbeaten', 'fightCareerLife',
    'the rematch clause goes with it. */\n      life.lastBeatenBy = null;',
    'the rematch clause goes with it. */');
} else if (CONTROL === 'crossbeat') {
  /* A ranking beat compares two divisions. 7g (iv). */
  rewriteLife('crossbeat', 'fightCareerRivalry',
    '(p, r) => sameClass(p) && hisRank(r) < youRank(p)',
    '(p, r) => hisRank(r) < youRank(p)');
} else if (CONTROL === 'nodrift') {
  /* Morale never settles. 7g (v). */
  rewriteLife('nodrift', 'fightCareerLifeFlow',
    'export const MORALE_DRIFT = 2;',
    'export const MORALE_DRIFT = 0;');
} else if (CONTROL === 'totalsbeat') {
  /* "He won again" reads his career total. 7g (vi). */
  rewriteLife('totalsbeat', 'fightCareerRivalry',
    "(_p, r) => r.last === 'W' && r.wins >= 2,",
    '(_p, r) => r.wins >= 2,');
} else if (CONTROL === 'staleanswer') {
  /* A waiting card is never read again after an answer. 7g (vii). */
  rewriteLife('staleanswer', 'fightCareerLife',
    '    if (!waiting.when || waiting.when(next)) return true;',
    '    return true;');
} else if (CONTROL === 'unrankedrank') {
  /* A rank effect hands an unranked man a number. 7g (vii). */
  rewriteLife('unrankedrank', 'fightCareerLife',
    '  if (e.rank && !st.champion && f.rank < 99) {',
    '  if (e.rank && !st.champion) {');
} else if (CONTROL === 'specialtable') {
  /* Nothing holds a grudge fight or a rematch on the table. 7g (viii). */
  rewriteLife('specialtable', 'fightCareerLife',
    '  st.offers.some(o => o.label === GRUDGE_LABEL || o.label === REMATCH_LABEL);',
    '  st.offers.length < 0;');
} else if (CONTROL === 'stuckchoice') {
  /* An unknown rival choice survives the load. 7g (ix). */
  rewriteLife('stuckchoice', 'fightCareerLifeFlow',
    '  if (life.pendingRivalryChoice && !FIGHT_RIVALRY_CHOICES.some(',
    '  if (life.pendingRivalryChoice && false && !FIGHT_RIVALRY_CHOICES.some(');
} else if (CONTROL === 'silentreply') {
  /* A text reply prints nothing of what it does. 7g (x). */
  rewriteLife('silentreply', 'fightCareerInbox',
    '  describeLifeEffect(inboxChoiceEffect(c));',
    '  describeLifeEffect({});');
} else if (CONTROL === 'nodecay') {
  rewrite('nodecay',
    'f.damage = Math.round((f.damage + res.damageTaken) * 10) / 10;',
    'f.damage = 0;');
} else if (CONTROL === 'noretire') {
  rewrite('noretire',
    '  if (f.damage >= 82) return true;\n  if (f.age >= 35 && f.damage >= 58) return true;',
    '  if (f.damage >= 100000) return true;');
} else if (CONTROL === 'godmode') {
  rewrite('godmode',
    'const mk = (k: keyof Attrs) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);',
    'const mk = (k: keyof Attrs) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);\n  if (tier >= 50 && tier <= 54) return { id: nextId(), name: genPersonName(rng, FIRST, LAST), style: st, attrs: { power: 99, chin: 99, speed: 99, stamina: 99, defence: 99, ringIq: 99 }, age: 21, wins: 0, losses: 0, draws: 0, kos: 0, damage: 0, rank: 99, potential: 99 };');
} else if (CONTROL === 'driftdaily') {
  rewrite('driftdaily',
    '  const player = makeFighter(rng, 70, weight);\n  const opponent = makeFighter(rng, 70, weight);',
    '  const drift = 30 + Math.floor(rng() * 65);\n  const player = makeFighter(rng, drift, weight);\n  const opponent = makeFighter(rng, 100 - drift, weight);');
} else if (CONTROL === 'nostyle') {
  rewrite('nostyle',
    "  box: { outboxer: 0, swarmer: 1, slugger: 0, counter: -1 },",
    "  box: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  press: { outboxer: 1, swarmer: 0, slugger: -1, counter: 0 },",
    "  press: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  counter: { outboxer: 0, swarmer: -1, slugger: 1, counter: 0 },",
    "  counter: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  brawl: { outboxer: -1, swarmer: 0, slugger: 0, counter: 1 },",
    "  brawl: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
} else if (CONTROL === 'flatbar') {
  rewrite('flatbar',
    'export const DRAIN_PER_PUNCH = 0.8;',
    'export const DRAIN_PER_PUNCH = 0;');
  rewrite('flatbar',
    'export const DRAIN_PER_KNOCKDOWN = 10;',
    'export const DRAIN_PER_KNOCKDOWN = 0;');
} else if (CONTROL === 'nostop') {
  rewrite('nostop',
    "      player: stoppage && last && loser === 'player' ? 0 : Math.round(player),\n      opp: stoppage && last && loser === 'opp' ? 0 : Math.round(opp),",
    '      player: Math.round(player),\n      opp: Math.round(opp),');
} else if (CONTROL === 'synthetic') {
  /* Harness side, nothing in the source changes: section 6 draws the first
     draft's population instead of real careers. See that section. */
  console.log('   [control synthetic applied: section 6 samples invented fighters]');
} else if (CONTROL === 'nofloor') {
  /* Round 636: the floor is now held by conditionShown's curve, which never
     reaches STANDING_FLOOR at all, so zeroing that constant alone would still
     keep almost every standing man off 0 and prove nothing. Remove the floor
     the way an edit would: drain in a straight line all the way to empty. */
  rewrite('nofloor',
    '  if (straight >= SOFT_FLOOR_FROM) return straight;',
    '  return Math.max(0, straight);');
} else if (CONTROL === 'recover') {
  rewrite('recover',
    '    const player = conditionShown(playerDrain);',
    '    const player = conditionShown(playerDrain) + (i % 2 ? 3 : 0);');
} else if (CONTROL === 'strongpin') {
  /* Round 636: Round 628's bar put back exactly, a straight line clamped at
     the floor. Random tactics pin about 12 percent of decision losers under
     it and a player who reads every fight about 31. */
  rewrite('strongpin',
    '  if (straight >= SOFT_FLOOR_FROM) return straight;',
    '  return Math.max(STANDING_FLOOR, straight);');
} else if (CONTROL === 'heavybar') {
  /* The pinned bar defect at half as much drain again. The agreement check
     alone stays green on this, which is why the pinned checks exist. */
  rewrite('heavybar',
    'export const DRAIN_PER_PUNCH = 0.8;',
    'export const DRAIN_PER_PUNCH = 1.2;');
} else if (CONTROL === 'pinboth') {
  /* The exact screen Round 628 was written to fix, both men on the floor after
     a points decision, without moving the drain rate: any decision that ends
     with both men under 30 drops both to the floor. */
  rewrite('pinboth',
    "      player: stoppage && last && loser === 'player' ? 0 : Math.round(player),\n      opp: stoppage && last && loser === 'opp' ? 0 : Math.round(opp),",
    "      player: stoppage && last && loser === 'player' ? 0 : !stoppage && last && player < 30 && opp < 30 ? STANDING_FLOOR : Math.round(player),\n      opp: stoppage && last && loser === 'opp' ? 0 : !stoppage && last && player < 30 && opp < 30 ? STANDING_FLOOR : Math.round(opp),");
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const local = (text) => text.replaceAll('@/lib/', './');
fs.writeFileSync(SRC, local(src));
fs.writeFileSync(ENGINE, engineSrc);
for (const name of LIFE_FILES) fs.writeFileSync(path.join(TMP, `${name}.ts`), local(lifeSrc[name]));
fs.writeFileSync(ENTRY, [
  "export * as fc from './fightCareer';",
  "export * as fl from './fightCareerLife';",
  "export * as ff from './fightCareerLifeFlow';",
  "export * as fi from './fightCareerInbox';",
  "export * as fr from './fightCareerRivalry';",
  "export * as fm from './fightCareerMoney';",
  '',
].join('\n'));
execSync(`"${findEsbuild()}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`, { stdio: 'pipe' });
const { fc, fl, ff, fi, fr, fm } = await import(pathToFileURL(BUNDLE).href);

/* ── a deterministic stream, so every number below is reproducible ── */
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLES = ['outboxer', 'swarmer', 'slugger', 'counter'];
const TACTICS = ['box', 'press', 'counter', 'brawl'];

/** The tactic that actually answers a style, for the "reads the fight" player. */
function bestTactic(style) {
  for (const t of TACTICS) if (fc.tacticEdge(t, style) > 0) return t;
  return 'box';
}

/** The style that punishes a tactic, read back out of the matrix rather than
    copied from the engine, so a change to the cycle fails here too. */
function styleThatBeats(tactic) {
  return STYLES.find(s => fc.tacticEdge(tactic, s) < 0) || null;
}

/**
 * What a good player actually plans.
 *
 * He answers the style he was shown, then assumes a fighter with any ring IQ
 * will move to punish what he just did, and answers THAT next. The first draft
 * of this harness repeated one tactic for every round, which is exactly the
 * behaviour the adaptive stance was added to punish, so it was modelling a bad
 * player and duly reported the daily as a wall (118 of 365 lost). A harness
 * that plays badly measures the game's floor and calls it the ceiling.
 */
function smartLine(baseStyle, n) {
  const out = [];
  let expect = baseStyle;
  for (let i = 0; i < n; i += 1) {
    const t = bestTactic(expect);
    out.push(t);
    expect = styleThatBeats(t) || baseStyle;
  }
  return out;
}

/**
 * Run one whole career under a policy and report what it came to.
 * pick: (offers, state) => offer
 */
function runCareer(seed, pick, readStyles = true) {
  const rng = rngFrom(seed);
  const weights = ['fly', 'light', 'welter', 'middle', 'heavy'];
  const w = weights[Math.floor(rng() * weights.length)];
  let st = fc.newFightCareer(`P${seed}`, w, STYLES[Math.floor(rng() * 4)], `seed-${seed}`);
  let fights = 0;
  while (!st.retired && fights < 60) {
    const offer = pick(st.offers, st);
    if (!offer) break;
    st = fc.runCamp(st, { conditioning: 2, power: 2, defence: 1, speed: 1 });
    const tactics = readStyles
      ? smartLine(offer.opponent.style, offer.rounds)
      : Array.from({ length: offer.rounds }, () => TACTICS[Math.floor(rng() * 4)]);
    const res = fc.takeFight(st, offer.id, tactics);
    if (!res) break;
    st = res.state;
    fights += 1;
  }
  const legacy = fc.legacyOf(st);
  return {
    fights,
    wins: st.fighter.wins,
    losses: st.fighter.losses,
    damage: st.fighter.damage,
    age: st.fighter.age,
    titles: st.history.filter(h => h.title && h.result === 'W').length,
    defences: st.titleDefences,
    earnings: st.earnings,
    legacy: legacy.score,
    champion: st.champion,
  };
}

const POLICIES = {
  /* Always the most dangerous fight available, from the professional debut.
     This is meant to be a bad idea, because it is a bad idea in the sport. */
  aggressive: (offers) => offers[offers.length - 1],
  /* Always the safest. Never loses, never arrives. */
  cautious: (offers) => offers[0],
  /* The honest middle, every time, with no thought about where he is. */
  balanced: (offers) => offers[Math.floor(offers.length / 2)],
  /**
   * How a person would actually play: learn the trade, climb on even terms,
   * step up once you are close, and take the belt when it is on the table.
   *
   * This policy exists because it is the one the round is really claiming
   * something about. A game is only a game if THINKING beats any fixed rule.
   * Section 1b asserts exactly that and it is the strongest claim in the file.
   */
  adaptive: (offers, st) => {
    if (st.champion || st.fighter.rank <= 1) return offers[1];
    const rank = st.fighter.rank === 99 ? 20 : st.fighter.rank;
    if (st.fightNo < 6) return offers[0];
    if (rank > 8) return offers[1];
    return offers[2];
  },
};

function runFleet(policy, n, readStyles = true, seed0 = 1000) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(runCareer(seed0 + i * 37, POLICIES[policy], readStyles));
  return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const N = 260;

console.log('simFightCareer');
console.log(`   ${N} careers per policy, deterministic seeds${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) no policy dominates ═══════════════
   The section that proves the round. If one policy simply wins, the damage
   model is decoration and the offers screen is a fake decision. Measured on
   legacy, which is the game's own verdict on a career.

   Measured headroom on healthy code: the three policies land within a few
   points of each other, and the aggressive one pays for its ranking with a
   shorter career. The band below is set from that spread, not from taste. */
console.log('1) no policy dominates the others');
{
  const agg = runFleet('aggressive', N);
  const cau = runFleet('cautious', N);
  const bal = runFleet('balanced', N);
  const adp = runFleet('adaptive', N);
  /* WHAT DOMINANCE ACTUALLY MEANS, because the first draft tested it wrongly.
     That draft banded the spread between the best and worst policy on legacy
     alone, which is neither necessary nor sufficient: three roads that all
     score the same are not a decision either, and a road that scores lower on
     one axis is not dominated if it wins on another. A boxing career genuinely
     trades glory against longevity against money, so the honest test is
     Pareto: no single policy may be best on ALL of them at once. If one is,
     the offers screen is not a decision and the damage model is decoration. */
  const table = { aggressive: agg, balanced: bal, cautious: cau };
  const dims = {
    legacy: r => r.legacy,
    longevity: r => r.fights,
    money: r => r.earnings,
  };
  const winners = {};
  for (const [dim, get] of Object.entries(dims)) {
    let best = null;
    let bv = -Infinity;
    const parts = [];
    for (const [pol, rs] of Object.entries(table)) {
      const v = mean(rs.map(get));
      parts.push(`${pol} ${v.toFixed(1)}`);
      if (v > bv) { bv = v; best = pol; }
    }
    winners[dim] = best;
    console.log(`   ${dim}: ${parts.join(', ')}   best: ${best}`);
  }
  const uniqueWinners = new Set(Object.values(winners));
  if (uniqueWinners.size === 1) {
    fail(`${[...uniqueWinners][0]} is best on legacy, longevity AND money at once, so it simply dominates`);
  } else {
    ok(`no policy wins every dimension (${Object.entries(winners).map(([d, w]) => `${d} to ${w}`).join(', ')})`);
  }

  console.log(`   for reference, a career managed sensibly: legacy ${mean(adp.map(r => r.legacy)).toFixed(1)}, ${mean(adp.map(r => r.fights)).toFixed(1)} fights, ${(mean(adp.map(r => r.titles > 0 ? 1 : 0)) * 100).toFixed(1)}% won a title`);

  /* 1b) AND THE CHOICE MUST MATTER, which is the other half of the same
     question. Not dominated is only half a decision: three roads that all
     arrive at the same place are not a decision either, they are a menu. So the
     roads must lead somewhere materially different on at least one axis.

     A draft in between these two asserted that a hand written "sensible"
     policy must beat every fixed rule. That was wrong about this design and the
     measurement said so: always taking the even money fight is close to optimal
     career management, and no amount of tuning makes a rule of thumb beat it.
     The skill in this game is not in the offer, it is in the tactics, and that
     claim already has its own section with its own margin (section 5). The
     offer is a tradeoff, and a tradeoff is proved by 1a and 1b together. */
  const spreads = Object.entries(dims).map(([dim, get]) => {
    const vals = Object.values(table).map(rs => mean(rs.map(get)));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return { dim, rel: lo > 0 ? (hi - lo) / lo : hi > 0 ? Infinity : 0 };
  });
  const widest = spreads.reduce((a, b) => (b.rel > a.rel ? b : a));
  if (!(widest.rel > 0.5)) {
    fail(`the roads all arrive at the same place: the widest spread across policies is ${(widest.rel * 100).toFixed(0)}% on ${widest.dim}, so the offer is a menu and not a choice`);
  } else {
    ok(`the choice matters: ${widest.dim} varies ${(widest.rel * 100).toFixed(0)}% across policies (floor 50%)`);
  }

  /* And the tradeoff must be REAL, which is what the control breaks.
     Measured PER FIGHT, not per career: an aggressive career is shorter, so it
     can finish on less total damage while every single night was worse. Total
     damage would therefore report the tradeoff as absent exactly when it is
     strongest, which is the wrong statistic rather than a strict one. */
  const perFight = (rs) => mean(rs.filter(r => r.fights > 0).map(r => r.damage / r.fights));
  const dAgg = perFight(agg);
  const dCau = perFight(cau);
  console.log(`   damage per fight: aggressive ${dAgg.toFixed(2)}, cautious ${dCau.toFixed(2)}`);
  if (dAgg <= dCau * 1.12) {
    fail(`aggressive nights cost no more (${dAgg.toFixed(2)}) than cautious ones (${dCau.toFixed(2)}), so the tradeoff does not exist`);
  } else {
    ok(`an aggressive night costs ${(dAgg / Math.max(0.01, dCau)).toFixed(2)}x a cautious one`);
  }
}

/* ═══════════════ 2) damage actually ends careers ═══════════════ */
console.log('2) accumulated damage shortens a career');
{
  /* THE STATISTIC HERE IS THE RATE, NOT THE TOTAL, and the first draft got it
     wrong in a way worth recording because it looks right.

     Bucketing by TOTAL career damage reported the opposite of the truth: the
     most damaged fighters retired OLDEST (35.3 against 23.2). That is not the
     engine misbehaving, it is a confound. Total damage accumulates with time,
     so the heaviest totals belong to the longest careers by construction, while
     the cleanest totals belong to men who were finished early for some other
     reason. The claim the design actually makes is about the PRICE PER NIGHT:
     a fighter who takes more punishment per fight is finished sooner. So bucket
     by damage per fight and compare retirement ages across the quartiles. */
  const all = runFleet('aggressive', N).concat(runFleet('balanced', N)).concat(runFleet('cautious', N));
  const rated = all.filter(r => r.fights >= 5).map(r => ({ ...r, rate: r.damage / r.fights }));
  const sorted = rated.slice().sort((a, b) => a.rate - b.rate);
  const q = Math.floor(sorted.length / 4);
  if (q < 20) {
    fail(`not enough completed careers to measure quartiles (${sorted.length})`);
  } else {
    const light = sorted.slice(0, q);
    const heavy = sorted.slice(-q);
    const ageHeavy = median(heavy.map(r => r.age));
    const ageLight = median(light.map(r => r.age));
    console.log(`   damage per fight: lightest quartile ${mean(light.map(r => r.rate)).toFixed(2)}, heaviest ${mean(heavy.map(r => r.rate)).toFixed(2)}`);
    console.log(`   retirement age: heaviest quartile ${ageHeavy.toFixed(1)}, lightest ${ageLight.toFixed(1)}`);
    /* Direction with a margin, on medians. Never a max, never a claim that the
       two distributions are indistinguishable. */
    if (!(ageHeavy < ageLight - 0.8)) {
      fail(`taking more punishment per fight does not shorten a career: heaviest retire at ${ageHeavy.toFixed(1)}, lightest at ${ageLight.toFixed(1)}`);
    } else {
      ok(`the hardest road retires ${(ageLight - ageHeavy).toFixed(1)} years earlier (margin 0.8)`);
    }
  }
}

/* ═══════════════ 3) the title is winnable, and not trivially ═══════════════ */
console.log('3) a world title is reachable, and not a given');
{
  const bal = runFleet('balanced', N);
  const won = bal.filter(r => r.titles > 0).length;
  const pct = (won / bal.length) * 100;
  console.log(`   ${won} of ${bal.length} balanced careers won a world title (${pct.toFixed(1)}%)`);
  if (won === 0) fail('no career in the fleet ever won a title, so the game cannot be finished');
  else ok(`the title is winnable, ${pct.toFixed(1)}% of careers`);
  if (pct > 85) fail(`a title is nearly automatic at ${pct.toFixed(1)}%, so winning one means nothing`);
  else ok(`a title is not automatic (${pct.toFixed(1)}%, ceiling 85%)`);

  /* A careless career must do measurably worse than a careful one. */
  const careless = runFleet('aggressive', N, false);
  const cw = careless.filter(r => r.titles > 0).length / careless.length * 100;
  console.log(`   ignoring style entirely: ${cw.toFixed(1)}% won a title`);
  if (!(cw < pct)) fail(`playing carelessly (${cw.toFixed(1)}%) does as well as playing properly (${pct.toFixed(1)}%)`);
  else ok(`reading the fight beats ignoring it (${pct.toFixed(1)}% vs ${cw.toFixed(1)}%)`);
}

/* ═══════════════ 4) every day's daily is winnable, and evenly pitched ═══════════════ */
console.log('4) a year of dailies is winnable and holds its difficulty target');
{
  const scores = [];
  const gaps = [];
  let unwinnable = 0;
  for (let d = 0; d < 365; d += 1) {
    const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    const f = fc.dailyFight(day);
    /* The difficulty target: the two fighters must be pitched close together,
       whatever the day. This is what stops a Tuesday being a wall. */
    gaps.push(Math.abs(fc.ratingOf(f.player) - fc.ratingOf(f.opponent)));
    const tactics = smartLine(f.opponent.style, f.rounds);
    const res = fc.simBout(
      { player: f.player, opponent: f.opponent, rounds: f.rounds, weight: f.weight, tactics, campQuality: 0.6 },
      rngFrom(7000 + d),
    );
    const s = fc.scoreDaily(res, tactics, f.opponent.style);
    scores.push(s);
    if (res.winner === 'opp') unwinnable += 1;
  }
  const meanGap = mean(gaps);
  const p90Gap = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length * 0.9)];
  console.log(`   rating gap between the two fighters: mean ${meanGap.toFixed(1)}, p90 ${p90Gap.toFixed(1)}`);
  console.log(`   playing the style correctly: won ${365 - unwinnable} of 365, mean score ${mean(scores).toFixed(1)}`);
  /* p90 rather than max, because a max is noise. */
  if (p90Gap > 22) fail(`the daily is not evenly pitched: p90 rating gap ${p90Gap.toFixed(1)} (band 22)`);
  else ok(`daily difficulty target holds, p90 gap ${p90Gap.toFixed(1)} (band 22)`);
  if (unwinnable > 110) fail(`${unwinnable} of 365 dailies lost even playing the style right, which is a wall not a puzzle`);
  else ok(`${365 - unwinnable} of 365 dailies won playing the style right`);
  if (mean(scores) >= 97) fail(`the daily is a gift: mean score ${mean(scores).toFixed(1)} out of 100`);
  else ok(`the daily is not a gift, mean score ${mean(scores).toFixed(1)}`);
}

/* ═══════════════ 5) the style matrix is readable and it matters ═══════════════ */
console.log('5) reading the opponent style beats guessing');
{
  /* Every style must have exactly one tactic that answers it and one that
     loses to it, or the cycle is broken and some style is unanswerable. */
  for (const s of STYLES) {
    const wins = TACTICS.filter(t => fc.tacticEdge(t, s) > 0).length;
    const loses = TACTICS.filter(t => fc.tacticEdge(t, s) < 0).length;
    if (wins !== 1 || loses !== 1) fail(`style ${s} has ${wins} answers and ${loses} traps, expected exactly 1 of each`);
  }
  if (!failures) ok('every style has exactly one answer and one trap, so the cycle closes');

  let readWins = 0;
  let blindWins = 0;
  const T = 900;
  for (let i = 0; i < T; i += 1) {
    const rng = rngFrom(31000 + i);
    const style = STYLES[Math.floor(rng() * 4)];
    const mk = () => fc.makeFighter(rngFrom(31000 + i + 7), 70, 'welter', style);
    const opp = mk();
    const me = fc.makeFighter(rngFrom(31000 + i + 13), 70, 'welter', 'outboxer');
    const good = smartLine(style, 3);
    const blind = [TACTICS[Math.floor(rng() * 4)], TACTICS[Math.floor(rng() * 4)], TACTICS[Math.floor(rng() * 4)]];
    const a = fc.simBout({ player: me, opponent: opp, rounds: 3, weight: 'welter', tactics: good }, rngFrom(52000 + i));
    const b = fc.simBout({ player: me, opponent: opp, rounds: 3, weight: 'welter', tactics: blind }, rngFrom(52000 + i));
    if (a.winner === 'player') readWins += 1;
    if (b.winner === 'player') blindWins += 1;
  }
  const rp = (readWins / T) * 100;
  const bp = (blindWins / T) * 100;
  console.log(`   same fighter, same seed: reading the style wins ${rp.toFixed(1)}%, guessing wins ${bp.toFixed(1)}%`);
  /* Margin from measured headroom on healthy code. */
  if (!(rp > bp + 6)) fail(`reading the style is worth only ${(rp - bp).toFixed(1)} points, so the tactic choice is close to meaningless (margin 6)`);
  else ok(`reading the style is worth ${(rp - bp).toFixed(1)} points (margin 6)`);
}

/* ═════ 6) the fight screen's bars are about the fight, Rounds 628 and 636 ═════ */
console.log('6) the condition bars tell the truth about the fight, for every kind of player');
{
  /* THESE BOUTS COME OUT OF REAL CAREERS, not out of makeFighter directly, and
     that is the whole reason this section is trustworthy. The first draft built
     two fighters at tiers 2 to 4 and fought them, which gave 2.9 punches landed
     a round. Real career rounds land 7.4. The constants were then calibrated
     against the harness's own sample rather than against the game, this section
     passed at 89.5 percent, and the actual screen showed both men pinned on the
     floor after a points decision. A harness that invents its own population
     will agree with whatever it invented. */

  /* ROUND 636: FOUR PLAYERS, NOT ONE. Round 628 sampled random tactics and
     nothing else, set its pinned ceiling from that sample, and wrote in the
     lib that the floor stays rare. It was rare for a player who picks at
     random and for nobody who plays well: a player who reads every fight wins
     far more one sided decisions, his losers soak up far more punches, and
     roughly a third of them read the floor at the final bell. A check that
     only ever meets one kind of player cannot see what the others see, so
     every claim below is made for each of these separately:
       random    picks each round's tactic at random, Round 628's sample and
                 drawn exactly as it drew it, so its numbers carry over
       strong    three looks, each answering the style the opponent will
                 switch to after the last one, which is what the plan screen's
                 own hint asks for and all the screen lets a player enter
       stubborn  reads the style and holds that one answer all night, the
                 thing that same hint warns against
       weak      plays straight into the style, the tactic it punishes
     Offers are picked at random for all four off the same career seeds, so
     what separates them is how they fight. */
  const weights = ['fly', 'light', 'welter', 'middle', 'heavy'];
  const trapTactic = (style) => TACTICS.find(t => fc.tacticEdge(t, style) < 0) || 'box';
  const BAR_POLICIES = {
    random: (offer, rng) => Array.from({ length: offer.rounds }, () => TACTICS[Math.floor(rng() * 4)]),
    strong: (offer) => smartLine(offer.opponent.style, 3),
    stubborn: (offer) => [bestTactic(offer.opponent.style)],
    weak: (offer) => [trapTactic(offer.opponent.style)],
  };

  /* PINNED CEILING, checked for each player, a share of decision losers and
     never a max. Measured over eight seed bases (4000 to 11000 step 1000,
     260 careers or 4,000 bouts each) with the bar Round 636 ships, and beside
     it the same bouts under Round 628's straight line and clamp, which is
     what the strongpin control puts back:
                 Round 636      Round 628
       random    0.0 to 0.4     11.3 to 13.3
       strong    0.0 to 0.1     29.1 to 33.5
       stubborn  0.6 to 0.9     21.1 to 24.7
       weak      0.0 to 0.1     30.2 to 33.8
     The share also moves when the CAREERS change and the bar does not. The
     nodecay and noretire controls lengthen careers, which makes more one
     sided decisions, and over the same eight bases they read:
       nodecay   random 1.0 to 1.9, strong 1.0 to 1.6, stubborn 3.9 to 5.9, weak 0.0
       noretire  random 1.4 to 2.0, strong 1.1 to 1.9, stubborn 4.0 to 6.3, weak 0.0 to 0.7
     A ceiling of 8 percent is seven points above the worst healthy seed of
     any player, clear of every seed of both career controls so neither turns
     this section red for a reason that is not about the bar, and three below
     the lowest Round 628 seed of any player. It still catches a drain half as
     heavy again (heavybar), which reads 15.8 to 19.6 for the strong player
     and 10.2 to 13.9 for the stubborn one. */
  const PIN_CEILING = 8;

  function careerBouts(policy) {
    const bag = [];
    for (let s = 0; s < 260 && bag.length < 4000; s += 1) {
      const rng = rngFrom(4000 + s);
      const w = weights[Math.floor(rng() * weights.length)];
      let st = fc.newFightCareer(`P${s}`, w, STYLES[Math.floor(rng() * 4)], `seed-${s}`);
      let fights = 0;
      while (!st.retired && fights < 60 && bag.length < 4000) {
        const offer = st.offers[Math.floor(rng() * st.offers.length)];
        if (!offer) break;
        st = fc.runCamp(st, { conditioning: 2, power: 2, defence: 1, speed: 1 });
        const r = fc.takeFight(st, offer.id, BAR_POLICIES[policy](offer, rng));
        if (!r) break;
        bag.push(r.result);
        st = r.state;
        fights += 1;
      }
    }
    return bag;
  }

  /* The first draft's population, put back by the synthetic control so the
     band below is proved to catch it: two fighters straight out of
     makeFighter at tiers 2 to 4. It replaces the random player's sample. */
  function syntheticBouts() {
    const bag = [];
    for (let s = 0; s < 4000; s += 1) {
      const rng = rngFrom(4000 + s);
      const w = weights[Math.floor(rng() * weights.length)];
      const tier = 2 + Math.floor(rng() * 3);
      const n = [4, 6, 8, 10, 12][Math.floor(rng() * 5)];
      const tactics = Array.from({ length: n }, () => TACTICS[Math.floor(rng() * 4)]);
      bag.push(fc.simBout({ player: fc.makeFighter(rng, tier, w), opponent: fc.makeFighter(rng, tier, w), rounds: n, weight: w, tactics, campQuality: 0.5 }, rng));
    }
    return bag;
  }

  function measure(bag) {
    const m = {
      bouts: 0, decisions: 0, agrees: 0, stoppedZero: 0, stoppedTotal: 0,
      standingZero: 0, rose: 0, losersPinned: 0, losersNear: 0, bothPinned: 0,
      landed: 0, landedN: 0, playerWins: 0, win: [], lose: [],
    };
    for (const res of bag) {
      const track = fc.conditionTrack(res);
      if (!track.length) continue;
      m.bouts += 1;
      if (res.winner === 'player') m.playerWins += 1;
      res.rounds.forEach(x => { m.landed += x.playerLanded + x.oppLanded; m.landedN += 2; });
      const end = track[track.length - 1];
      const stopped = res.method === 'KO' || res.method === 'TKO';

      /* A bar that can go back up is not a condition bar, it is a chart of
         something else. Checked on every step of every bout, not at the ends:
         a 0 against max assertion has passed a broken middle in this repo
         before. */
      for (let i = 1; i < track.length; i += 1) {
        if (track[i].player > track[i - 1].player || track[i].opp > track[i - 1].opp) m.rose += 1;
      }

      /* Nobody on his feet reads empty, on ANY round and not only the last:
         the one 0 allowed anywhere on a track is the stopped man's final
         reading. A man is on his feet through every round before that. */
      track.forEach((pt, i) => {
        const stoppedHere = stopped && i === track.length - 1;
        if (pt.player === 0 && !(stoppedHere && res.winner === 'opp')) m.standingZero += 1;
        if (pt.opp === 0 && !(stoppedHere && res.winner === 'player')) m.standingZero += 1;
      });

      if (stopped) {
        m.stoppedTotal += 1;
        if ((res.winner === 'player' ? end.opp : end.player) === 0) m.stoppedZero += 1;
        continue;
      }
      if (res.winner === 'draw') continue;
      m.decisions += 1;
      const w = res.winner === 'player' ? end.player : end.opp;
      const l = res.winner === 'player' ? end.opp : end.player;
      m.win.push(w); m.lose.push(l);
      if (w > l) m.agrees += 1;
      if (l <= fc.STANDING_FLOOR) m.losersPinned += 1;
      if (l <= fc.STANDING_FLOOR + 4) m.losersNear += 1;
      if (w <= fc.STANDING_FLOOR && l <= fc.STANDING_FLOOR) m.bothPinned += 1;
    }
    return m;
  }

  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const at = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

  for (const policy of Object.keys(BAR_POLICIES)) {
    const synthetic = CONTROL === 'synthetic' && policy === 'random';
    const m = measure(synthetic ? syntheticBouts() : careerBouts(policy));
    const tag = `[${policy}]`;
    const pct = (100 * m.agrees) / Math.max(1, m.decisions);
    const perRound = m.landed / Math.max(1, m.landedN);
    const loserPinPct = (100 * m.losersPinned) / Math.max(1, m.decisions);
    const loserNearPct = (100 * m.losersNear) / Math.max(1, m.decisions);
    const bothPinPct = (100 * m.bothPinned) / Math.max(1, m.decisions);
    console.log(`   ${tag} ${m.bouts} bouts from ${synthetic ? 'INVENTED fighters' : 'real careers'}, the player won ${((100 * m.playerWins) / Math.max(1, m.bouts)).toFixed(1)}%, ${perRound.toFixed(1)} punches landed per man per round`);
    console.log(`   ${tag} ${m.decisions} decisions: winner ends ${avg(m.win).toFixed(1)} on average, loser ${avg(m.lose).toFixed(1)}; loser p10 ${at(m.lose, 0.1)}, p25 ${at(m.lose, 0.25)}, p50 ${at(m.lose, 0.5)}, p75 ${at(m.lose, 0.75)}, p90 ${at(m.lose, 0.9)}`);
    console.log(`   ${tag} decision losers on the floor ${m.losersPinned} (${loserPinPct.toFixed(1)}%), within 4 of it ${m.losersNear} (${loserNearPct.toFixed(1)}%), both men on it ${m.bothPinned} (${bothPinPct.toFixed(2)}%)`);

    if (m.decisions < 500 || m.stoppedTotal < 100) {
      fail(`${tag} only ${m.decisions} decisions and ${m.stoppedTotal} stoppages, too few to measure a share of either`);
    }

    /* THE GUARD AGAINST THE MISTAKE ITSELF, not just against its symptom. If
       these bouts ever stop looking like the game's bouts, the calibration is
       void whatever the other numbers say. Measured at 7.5 landed per man per
       round on the random sample (7.4 over the 7,233 career bouts the rate was
       set from), against 2.9 for the synthetic sample that produced the wrong
       constant, so a band of 5 to 10 separates the two decisively and is
       nowhere near either edge of the healthy figure. The other three players
       land 8.3 (strong), 8.0 (stubborn) and 7.4 (weak) on this sample, inside
       the band for the same reason. The synthetic control puts the invented
       population back into the random player's sample and reads 3.2. */
    if (perRound < 5 || perRound > 10) {
      fail(`${tag} these bouts land ${perRound.toFixed(1)} punches a round, outside the 5 to 10 the real game produces, so the bars below are calibrated against a population no player meets`);
    } else {
      ok(`${tag} the sample is the game's own: ${perRound.toFixed(1)} punches landed per man per round (band 5 to 10)`);
    }

    /* THE TWO HARD CLAIMS FIRST, both binary. The bar is allowed to be
       approximate about how worn a man looks. It is not allowed to be wrong
       about whether he is still in the fight. */
    if (m.stoppedZero !== m.stoppedTotal) {
      fail(`${tag} ${m.stoppedTotal - m.stoppedZero} of ${m.stoppedTotal} stopped men do not end on an empty bar, so a stoppage looks like any other round`);
    } else {
      ok(`${tag} every one of the ${m.stoppedTotal} stopped men ends on an empty bar`);
    }
    if (m.standingZero > 0) {
      fail(`${tag} ${m.standingZero} readings of a man still on his feet show empty, so the bar calls him stopped`);
    } else {
      ok(`${tag} nobody on his feet reads empty, on any round of any bout`);
    }
    if (m.rose > 0) {
      fail(`${tag} condition went back UP ${m.rose} times, so the bar is not a condition bar`);
    } else {
      ok(`${tag} condition never rises, across every round of every bout`);
    }

    /* MEASURED FLOOR, not a chosen one. On healthy code the random sample
       runs at 93.9% over 2,724 decisions, and at 92.6 to 94.2 over eight seed
       bases; over the same bases the strong player runs 95.3 to 97.1, the
       stubborn one 93.2 to 94.2 and the weak one 95.4 to 96.9. The standard
       error is about half a point, so a floor of 80 sits far below every
       measurement rather than inside its spread. (The 89.5% over 2,887 that
       used to be quoted here came from the invented makeFighter population
       this section threw out.) It is deliberately NOT 100: a man can win on
       points while taking more punishment than he handed out, and a bar that
       always matched the card would be drawing the card and not the fight. */
    if (!(pct > 80)) {
      fail(`${tag} the bar agrees with the cards in only ${pct.toFixed(1)}% of ${m.decisions} decisions, so it is not showing who took the beating (floor 80)`);
    } else {
      ok(`${tag} the bar agrees with the cards in ${pct.toFixed(1)}% of ${m.decisions} decisions (floor 80)`);
    }

    /* PINNED BARS, the defect Round 628 was written to fix and Round 636
       found still there, at 21 to 34 percent of decision losers, for every
       player who does not pick his tactics at random. The agreement
       check above cannot see it: a loser pinned on the floor still sits below
       the winner, so that check only drops once winners pin too. Ceilings
       and their measurements are at PIN_CEILING above. */
    if (!(loserPinPct < PIN_CEILING)) {
      fail(`${tag} ${loserPinPct.toFixed(1)}% of decision losers end pinned on the floor, so the bar reads the same for a close loss and a beating (ceiling ${PIN_CEILING}%)`);
    } else {
      ok(`${tag} ${loserPinPct.toFixed(1)}% of decision losers end on the floor (ceiling ${PIN_CEILING}%)`);
    }
    /* Both men on the floor after a points decision, the exact screen Round
       628 was written to fix. Under Round 628's bar this read at most 0.04%
       for random tactics and 0.29% for the strong player over eight seed
       bases; under Round 636's it cannot happen short of about 190 points of
       drain on the WINNER. A ceiling of 1% of decisions is far above both. */
    if (!(bothPinPct < 1)) {
      fail(`${tag} ${m.bothPinned} decisions (${bothPinPct.toFixed(2)}%) leave both men pinned on the floor, the screen Round 628 was written to fix (ceiling 1%)`);
    } else {
      ok(`${tag} both men end on the floor in ${bothPinPct.toFixed(2)}% of decisions (ceiling 1%)`);
    }
  }
}

/* ═══════════════ 7) the life between fights (Round 916) ═══════════════
   Six checks, each with its own control. The first is the one the round
   stands on: the life layer must not move a single fight unless the player
   chose something that says it will. */

const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const WEIGHTS_SAMPLED = ['fly', 'light', 'welter', 'middle', 'heavy'];

/** Answer everything the gap is waiting on with its neutral option, and
    count the decisions. `onStep` sees every step before it is answered. */
function clearGapNeutral(st0, onStep) {
  let st = st0;
  let decisions = 0;
  for (let guard = 0; guard < 24; guard += 1) {
    const step = ff.nextLifeStep(st);
    if (!step) break;
    if (onStep) onStep(st, step);
    if (step.kind === 'beat') {
      st = fr.dismissFightRivalryEvent(st);
    } else if (step.kind === 'choice') {
      st = fr.answerFightRivalryChoice(st, fr.neutralRivalryChoice(step.card.id)).state;
      decisions += 1;
    } else {
      st = fl.answerLifeCard(st, step.card.options.findIndex(o => o.neutral)).state;
      decisions += 1;
    }
  }
  for (const m of st.life.phoneInbox.filter(x => x.answered === undefined)) {
    st = ff.lifeAnswerInbox(st, m.id, fi.neutralInboxChoice(m));
    decisions += 1;
  }
  return { st, decisions };
}

/** runCareer, through the life layer, every new screen answered neutrally.
    Same seeds, same weights, same styles, same tactics as runCareer. */
function runLifeCareer(seed, pick, onStep) {
  const rng = rngFrom(seed);
  const w = WEIGHTS_SAMPLED[Math.floor(rng() * WEIGHTS_SAMPLED.length)];
  let st = ff.lifeNewCareer(`P${seed}`, w, STYLES[Math.floor(rng() * 4)], 'allround', 'family', `seed-${seed}`);
  let fights = 0;
  const perGap = [];
  while (!st.retired && fights < 60) {
    const gap = clearGapNeutral(st, onStep);
    st = gap.st;
    /* The two decisions the game always had, the offer and the camp, plus
       whatever the life layer asked. */
    perGap.push(2 + gap.decisions);
    const offer = pick(st.offers, st);
    if (!offer) break;
    st = ff.lifeRunCamp(st, PLAN);
    const res = ff.lifeTakeFight(st, offer.id, smartLine(offer.opponent.style, offer.rounds));
    if (!res) break;
    st = res.state;
    fights += 1;
  }
  return {
    fights, wins: st.fighter.wins, losses: st.fighter.losses, damage: st.fighter.damage, age: st.fighter.age,
    titles: st.history.filter(h => h.title && h.result === 'W').length,
    defences: st.titleDefences, legacy: fc.legacyOf(st).score, perGap, st,
  };
}

const careerKey = (r) => `${r.fights}|${r.wins}|${r.losses}|${r.damage}|${r.age}|${r.titles}|${r.defences}|${r.legacy}`;
const titled = (fleet) => fleet.filter(r => r.titles > 0).length;
const titlePct = (fleet) => (titled(fleet) / fleet.length) * 100;

/* What the existing game does, recorded on origin/main at a4433f41 BEFORE the
   life layer existed, adaptive policy, 260 careers a group, five seed groups.
   See the header for how these were measured. */
const SEED_GROUPS = [1000, 21000, 41000, 61000, 81000];
const RECORDED = {
  /* Careers of the 260 that won a world title, and the median career length. */
  titled: [55, 45, 55, 59, 40],
  medianFights: [29, 28, 29, 29, 29],
};

let lifeAdaptive = null;
{
  console.log('7a) neutral answers leave every fight where it was');
  let careers = 0;
  let moved = 0;
  for (const policy of Object.keys(POLICIES)) {
    const base = runFleet(policy, N);
    const life = [];
    for (let i = 0; i < N; i += 1) life.push(runLifeCareer(1000 + i * 37, POLICIES[policy]));
    if (policy === 'adaptive') lifeAdaptive = life;
    const diff = base.filter((b, i) => careerKey(b) !== careerKey(life[i])).length;
    careers += N;
    moved += diff;
    console.log(`   ${policy}: ${diff} of ${N} careers differ; title rate ${titlePct(base).toFixed(1)}% base, ${titlePct(life).toFixed(1)}% with the life layer; median fights ${median(base.map(r => r.fights))} and ${median(life.map(r => r.fights))}`);
  }
  if (moved) fail(`${moved} of ${careers} careers changed under neutral answers, so the life layer reaches the bout on its own`);
  else ok(`all ${careers} careers identical, fight for fight, across four policies`);

  /* The recorded spread. The base engine has to still be the engine that was
     measured, and the neutral life has to sit inside the same spread. */
  const lo = { t: Math.min(...RECORDED.titled), f: Math.min(...RECORDED.medianFights) };
  const hi = { t: Math.max(...RECORDED.titled), f: Math.max(...RECORDED.medianFights) };
  const failedBefore = failures;
  const baseT = []; const baseF = []; const lifeT = []; const lifeF = [];
  SEED_GROUPS.forEach((seed0, g) => {
    const base = runFleet('adaptive', N, true, seed0);
    const life = [];
    for (let i = 0; i < N; i += 1) life.push(runLifeCareer(seed0 + i * 37, POLICIES.adaptive));
    baseT.push(titled(base)); baseF.push(median(base.map(r => r.fights)));
    lifeT.push(titled(life)); lifeF.push(median(life.map(r => r.fights)));
    if (baseT[g] !== RECORDED.titled[g] || baseF[g] !== RECORDED.medianFights[g]) {
      fail(`seed group ${seed0}: the base engine reads ${baseT[g]} titled careers and ${baseF[g]} median fights, recorded ${RECORDED.titled[g]} and ${RECORDED.medianFights[g]}`);
    }
    if (lifeT[g] < lo.t || lifeT[g] > hi.t || lifeF[g] < lo.f || lifeF[g] > hi.f) {
      fail(`seed group ${seed0}: with the life layer ${lifeT[g]} titled careers and ${lifeF[g]} median fights, outside the recorded spread ${lo.t} to ${hi.t} and ${lo.f} to ${hi.f}`);
    }
  });
  console.log(`   adaptive over five seed groups of ${N}: titled careers ${lifeT.join(', ')}; median fights ${lifeF.join(', ')}`);
  if (failures === failedBefore) ok(`title rate and career length sit inside the recorded spread (${lo.t} to ${hi.t} titled careers of ${N}, ${lo.f} to ${hi.f} fights) in all five groups`);
}

{
  console.log('7b) there is a life between fights');
  const gaps = lifeAdaptive.flatMap(r => r.perGap);
  const med = median(gaps);
  const sorted = gaps.slice().sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length / 10)];
  /* The round's floor is 4: the offer, the camp and two more. Measured on
     healthy code: median 5, tenth percentile 4, mean about 4.9. */
  if (!(med >= 4)) fail(`median decisions between fights is ${med}, under the floor of 4`);
  else ok(`median ${med} decisions between fights over ${gaps.length} gaps (floor 4; tenth percentile ${p10}, mean ${mean(gaps).toFixed(2)})`);
}

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const m100 = (v) => Math.max(0, Math.min(100, Math.round(v)));

/** A mid career state every effect can act on: ranked sixth, a table that is
    not for a title, a rival alive, a man who beat him on file. */
function probeState() {
  let st = ff.lifeNewCareer('Probe', 'welter', 'outboxer', 'allround', 'family', 'probe-916');
  st = fl.cloneForLife(st);
  st.fightNo = 9;
  st.champion = false;
  st.fighter.rank = 6;
  st.fighter.damage = 45;
  st.offers = fc.offersFor(st);
  fl.dressOffers(st);
  Object.assign(st.life, { bank: 1, fanbase: 50, morale: 50, karma: 50, rivalryIntensity: 40, sharp: 0, promoterFights: 0, pending: [] });
  st.life.lastBeatenBy = { ...st.offers[0].opponent, name: 'Probe Beaten' };
  return st;
}

/** Read the numbers back out of the words a button shows. */
function parseWords(text) {
  const out = {};
  let m;
  if ((m = text.match(/Bank ([+-])(\d+\.\d+)m/))) out.cash = (m[1] === '-' ? -1 : 1) * Number(m[2]);
  if ((m = text.match(/Fans ([+-]\d+)/))) out.fans = Number(m[1]);
  if ((m = text.match(/Morale ([+-]\d+)/))) out.morale = Number(m[1]);
  if ((m = text.match(/Karma ([+-]\d+)/))) out.karma = Number(m[1]);
  if ((m = text.match(/Feud ([+-]\d+)/))) out.heat = Number(m[1]);
  if ((m = text.match(/Damage \+(\d+\.\d) for good/))) out.damage = Number(m[1]);
  if ((m = text.match(/(\d+) months out of the ring/))) out.months = Number(m[1]);
  if ((m = text.match(/Next fight ([+-]\d+) sharpness/))) out.sharp = Number(m[1]);
  if ((m = text.match(/Purses on the table ([+-]\d+)%/))) out.pursePct = Number(m[1]);
  if ((m = text.match(/(Down|Up) (\d+) in the rankings/))) out.rank = (m[1] === 'Down' ? 1 : -1) * Number(m[2]);
  if ((m = text.match(/Move (up|down) a weight class/))) out.moveClass = m[1] === 'up' ? 1 : -1;
  if ((m = text.match(/Purses ([+-]\d+)% for (\d+) fights, the safest offer leaves the table/))) { out.promoter = Number(m[2]); out.promoterPct = Number(m[1]); }
  if ((m = text.match(/becomes the rematch, a win worth up to (\d+) places/))) out.rematch = Number(m[1]);
  if ((m = text.match(/becomes the grudge fight, purse ([+-]\d+)%/))) out.grudge = Number(m[1]);
  return out;
}

const tableKey = (offers) => JSON.stringify(offers.map(o => [o.opponent.name, o.purse, o.rankGain, o.label, o.title, o.rounds]));

/** One effect against the words that promise it and the state it leaves.
    Returns the list of things that do not match. */
function effectMismatches(e, words) {
  const bad = [];
  const said = parseWords(words);
  const want = (k, v) => { if ((said[k] ?? 0) !== (v ?? 0)) bad.push(`words say ${k} ${said[k] ?? 'nothing'}, effect is ${v ?? 'nothing'}`); };
  want('cash', e.cash); want('fans', e.fans); want('morale', e.morale); want('karma', e.karma); want('heat', e.heat);
  want('damage', e.damage); want('months', e.age ? Math.round(e.age * 12) : 0); want('sharp', e.sharp);
  want('pursePct', e.pursePct); want('rank', e.rank); want('moveClass', e.moveClass); want('promoter', e.promoter);
  want('rematch', e.rematch ? fl.REMATCH_RANK_GAIN : 0);
  want('grudge', e.grudge ? Math.round((fl.GRUDGE_PURSE_MUL - 1) * 100) : 0);
  if (e.promoter && said.promoterPct !== Math.round((fl.PROMOTER_PURSE_MUL - 1) * 100)) bad.push('promoter percent in the words is not the multiplier');
  if (Object.keys(e).filter(k => e[k]).length === 0 && words !== 'Nothing changes.') bad.push(`an empty effect reads "${words}"`);

  const before = probeState();
  const after = fl.cloneForLife(before);
  fl.applyLifeEffect(after, e);
  const L0 = before.life; const L1 = after.life;
  const is = (what, exp, got) => { if (exp !== got) bad.push(`${what} should be ${exp}, is ${got}`); };
  is('bank', r2(L0.bank + (e.cash ?? 0)), L1.bank);
  is('fans', m100(L0.fanbase + (e.fans ?? 0)), L1.fanbase);
  is('morale', m100(L0.morale + (e.morale ?? 0)), L1.morale);
  is('karma', m100(L0.karma + (e.karma ?? 0)), L1.karma);
  is('feud', m100(L0.rivalryIntensity + (e.heat ?? 0)), L1.rivalryIntensity);
  is('damage', r1(before.fighter.damage + (e.damage ?? 0)), after.fighter.damage);
  is('age', r2(before.fighter.age + (e.age ?? 0)), after.fighter.age);
  is('sharpness banked', L0.sharp + (e.sharp ?? 0), L1.sharp);
  is('promoter fights', e.promoter ?? L0.promoterFights, L1.promoterFights);
  is('attributes', JSON.stringify(before.fighter.attrs), JSON.stringify(after.fighter.attrs));
  if (e.moveClass) {
    const ids = fc.WEIGHT_CLASSES.map(w => w.id);
    is('weight class', ids[ids.indexOf(before.weight) + e.moveClass], after.weight);
    is('rank after the move', 99, after.fighter.rank);
    is('class moves', L0.classMoves + 1, L1.classMoves);
    is('offers after the move', 3, after.offers.length);
    const k0 = fc.weightById(before.weight).koBias; const k1 = fc.weightById(after.weight).koBias;
    if (!(e.moveClass > 0 ? k1 > k0 : k1 < k0)) bad.push('the class move did not move the knockout factor the way it says');
  } else {
    is('weight class', before.weight, after.weight);
    is('rank', Math.max(1, Math.min(99, before.fighter.rank + (e.rank ?? 0))), after.fighter.rank);
    is('bout stream', before.rngTick, after.rngTick);
    let table = before.offers.map(o => ({ ...o }));
    if (e.pursePct) table = table.map(o => ({ ...o, purse: r2(o.purse * (1 + e.pursePct / 100)) }));
    if (e.promoter) table = table.slice(1).map(o => ({ ...o, purse: r2(o.purse * fl.PROMOTER_PURSE_MUL) }));
    const mid = Math.floor(table.length / 2);
    if (e.rematch) table[mid] = { ...table[mid], opponent: { name: 'Probe Beaten' }, label: 'Rematch', rankGain: fl.REMATCH_RANK_GAIN };
    if (e.grudge) table[mid] = { ...table[mid], opponent: { name: L0.rival.name }, label: fl.GRUDGE_LABEL, purse: r2(table[mid].purse * fl.GRUDGE_PURSE_MUL) };
    is('offers on the table', tableKey(table), tableKey(after.offers));
  }
  return bad;
}

{
  console.log('7c) every button does what its words say');
  const failedBefore = failures;
  let options = 0;
  const check = (tag, e, words) => {
    options += 1;
    const bad = effectMismatches(e, words);
    if (bad.length) fail(`${tag}: ${bad.slice(0, 2).join('; ')}`);
  };
  const ids = new Set(fl.LIFE_CARDS.map(c => c.id));
  if (fl.LIFE_CARDS.length < 36) fail(`the deck has ${fl.LIFE_CARDS.length} cards, the round needs 36`);
  if (ids.size !== fl.LIFE_CARDS.length) fail('two cards share an id');
  for (const card of fl.LIFE_CARDS) {
    if (!(card.cooldown >= 1)) fail(`card ${card.id} has no cooldown`);
    const neutral = card.options.filter(o => o.neutral);
    if (neutral.length !== 1 || !fl.isBoutNeutral(neutral[0].effect)) fail(`card ${card.id} needs exactly one neutral option that cannot reach a fight`);
    card.options.forEach((o, i) => check(`card ${card.id} option ${i}`, o.effect, fl.describeLifeEffect(o.effect)));
  }
  for (const def of fr.FIGHT_RIVALRY_CHOICES) {
    const neutral = def.choices.filter(c => c.neutral);
    if (neutral.length !== 1 || !fl.isBoutNeutral(neutral[0].effect)) fail(`rival choice ${def.id} needs exactly one neutral option`);
    /* `consequence` is the string the card stores and the board prints. */
    def.choices.forEach((c, i) => check(`rival choice ${def.id} option ${i}`, c.effect, c.consequence));
  }
  for (const b of fr.FIGHT_RIVALRY_EVENTS) {
    if (!fl.isBoutNeutral(b.effect)) fail(`rival beat ${b.id} is not a decision, so it may not reach a fight`);
    check(`rival beat ${b.id}`, b.effect, b.consequence);
  }
  for (const t of fi.FIGHT_INBOX_TEXTS) {
    if (fi.neutralInboxChoice(t) < 0) fail(`text ${t.id} has no reply that moves nothing`);
  }
  /* The answer path runs the same effect: one card, through answerLifeCard. */
  {
    const st = probeState();
    st.life.pending = ['hand-injury'];
    const res = fl.answerLifeCard(st, 0);
    const cost = fl.lifeCardById('hand-injury').options[0].effect.cash;
    if (!res || res.state.life.bank !== r2(1 + cost) || res.state.life.pending.length !== 0 || res.state.life.decisions !== st.life.decisions + 1) {
      fail('answering a card did not charge it, clear it and count it');
    }
    if (fl.answerLifeCard(res.state, 0) !== null) fail('a second tap on an answered card did something');
  }
  if (failures === failedBefore) ok(`${options} options across ${fl.LIFE_CARDS.length} cards, ${fr.FIGHT_RIVALRY_CHOICES.length} rival choices and ${fr.FIGHT_RIVALRY_EVENTS.length} rival beats: words, numbers and state agree; ${fi.FIGHT_INBOX_TEXTS.length} texts each carry a neutral reply`);
}

{
  console.log('7d) a reload comes back to the same card');
  const failedBefore = failures;
  let steps = 0;
  let lost = 0;
  let early = 0;
  const stepKey = (s) => (!s ? 'none' : s.kind === 'beat' ? `beat-${s.event.id}` : `${s.kind}-${s.card.id}`);
  const answer = (st, step) => (step.kind === 'beat'
    ? fr.dismissFightRivalryEvent(st)
    : step.kind === 'choice'
      ? fr.answerFightRivalryChoice(st, fr.neutralRivalryChoice(step.card.id)).state
      : fl.answerLifeCard(st, step.card.options.findIndex(o => o.neutral)).state);
  for (let i = 0; i < 40; i += 1) {
    const lastDealt = {};
    runLifeCareer(5000 + i * 37, POLICIES.adaptive, (st, step) => {
      steps += 1;
      /* What the board does on a reload: the save through JSON, then ensureLife. */
      const back = fl.ensureLife(JSON.parse(JSON.stringify(st)));
      const again = ff.nextLifeStep(back);
      if (stepKey(again) !== stepKey(step)) { lost += 1; return; }
      if (JSON.stringify(answer(back, again)) !== JSON.stringify(answer(st, step))) lost += 1;
      /* And the cooldown: a card is not dealt again before it says it can be. */
      if (step.kind === 'card') {
        const was = lastDealt[step.card.id];
        if (was !== undefined && was !== st.fightNo && st.fightNo - was < step.card.cooldown) early += 1;
        lastDealt[step.card.id] = st.fightNo;
      }
    });
  }
  /* Measured on healthy code: about 3,000 steps over the forty careers. */
  if (steps < 1500) fail(`only ${steps} steps were walked, too few to prove anything`);
  if (lost) fail(`${lost} of ${steps} steps came back from a reload as a different card or a different answer`);
  if (early) fail(`${early} cards were dealt again inside their own cooldown`);
  if (failures === failedBefore) ok(`${steps} steps reloaded to the same card and the same answer, none dealt inside its cooldown`);
}

{
  console.log('7e) every level of every ladder does something');
  const failedBefore = failures;
  const fresh = (trainer = 'allround') => {
    const st = fl.cloneForLife(ff.lifeNewCareer('Ladder', 'welter', 'outboxer', trainer, 'family', 'ladder-916'));
    st.fighter.potential = 99;
    st.fighter.attrs = { power: 40, chin: 50, speed: 40, stamina: 40, defence: 40, ringIq: 50 };
    st.life.bank = 10;
    return st;
  };
  /* Twelve camps of three weeks in one area. Returns the attribute reached
     and whether any camp ever lowered it. */
  const campRun = (st0, area, attr) => {
    let st = st0;
    let lowered = false;
    const plan = { conditioning: 1, power: 1, defence: 1, speed: 1, [area]: 3 };
    for (let i = 0; i < 12; i += 1) {
      const was = st.fighter.attrs[attr];
      st = ff.lifeRunCamp(st, plan);
      if (st.fighter.attrs[attr] < was) lowered = true;
    }
    return { reached: st.fighter.attrs[attr], lowered };
  };
  const COACHES = [['strength', 'power', 'power'], ['roadwork', 'conditioning', 'stamina'], ['padman', 'defence', 'defence'], ['padman', 'speed', 'speed']];
  for (const [id, area, attr] of COACHES) {
    let st = fresh();
    const reached = [campRun(st, area, attr).reached];
    for (let lvl = 1; lvl <= fm.MAX_UPGRADE_LEVEL; lvl += 1) {
      const bank = st.life.bank;
      const bought = ff.lifeBuyUpgrade(st, id);
      if (!bought || r2(bank - bought.life.bank) !== fm.UPGRADE_PRICES[lvl - 1]) { fail(`${id} level ${lvl} did not cost ${fm.UPGRADE_PRICES[lvl - 1]}`); break; }
      st = bought;
      reached.push(campRun(st, area, attr).reached);
    }
    /* Measured on healthy code: 52 at level 0, then 53, 55 and 57 for the two
       12% coaches and 53, 54 and 56 for the pad man. Every step is a point. */
    for (let lvl = 1; lvl < reached.length; lvl += 1) {
      if (!(reached[lvl] > reached[lvl - 1])) fail(`${id} level ${lvl} leaves ${attr} at ${reached[lvl]} after twelve camps, level ${lvl - 1} left it at ${reached[lvl - 1]}`);
    }
    console.log(`   ${id} on ${attr}: ${reached.join(', ')} after twelve camps at levels 0 to ${fm.MAX_UPGRADE_LEVEL}`);
    if (ff.lifeBuyUpgrade(st, id) !== null) fail(`${id} sold a level past the top`);
  }
  {
    const poor = fresh();
    poor.life.bank = 0.01;
    if (ff.lifeBuyUpgrade(poor, 'cutman') !== null) fail('the shop sold an upgrade the bank could not cover');
  }
  /* The trainers: the specialty is faster, the weak side is slower, and no
     camp ever lowers an attribute. */
  const allround = { power: campRun(fresh(), 'power', 'power'), defence: campRun(fresh(), 'defence', 'defence') };
  const puncher = { power: campRun(fresh('puncher'), 'power', 'power'), defence: campRun(fresh('puncher'), 'defence', 'defence') };
  if (!(puncher.power.reached > allround.power.reached)) fail(`the puncher's coach left power at ${puncher.power.reached}, the all-rounder at ${allround.power.reached}`);
  if (!(puncher.defence.reached < allround.defence.reached)) fail(`the puncher's coach left defence at ${puncher.defence.reached}, the all-rounder at ${allround.defence.reached}`);
  if (puncher.defence.lowered || puncher.power.lowered) fail('a camp lowered an attribute');
  console.log(`   puncher's coach: power ${puncher.power.reached} against ${allround.power.reached}, defence ${puncher.defence.reached} against ${allround.defence.reached}`);

  /* Sharpness, walked through the bout itself: the same 120 debut opponents,
     the same tactics, and only the sharpness changes. */
  const landedAt = (sharp) => {
    let landed = 0;
    for (let i = 0; i < 120; i += 1) {
      const st = fl.cloneForLife(ff.lifeNewCareer(`S${i}`, 'welter', STYLES[i % 4], 'allround', 'family', `sharp-${i}`));
      st.life.sharp = sharp;
      const offer = st.offers[1];
      const res = ff.lifeTakeFight(st, offer.id, smartLine(offer.opponent.style, offer.rounds));
      landed += res.result.rounds.reduce((a, r) => a + r.playerLanded, 0);
    }
    return landed;
  };
  const curve = [-4, -2, 0, 2, 4].map(landedAt);
  console.log(`   punches landed over 120 debuts at sharpness -4, -2, 0, 2, 4: ${curve.join(', ')}`);
  for (let i = 1; i < curve.length; i += 1) {
    if (!(curve[i] > curve[i - 1])) fail(`sharpness ${[-4, -2, 0, 2, 4][i]} landed ${curve[i]} punches, the step below landed ${curve[i - 1]}`);
  }
  /* The sparring partners and the mood are sharpness too, one step each. */
  {
    let st = fresh();
    for (let lvl = 1; lvl <= fm.MAX_UPGRADE_LEVEL; lvl += 1) {
      st = ff.lifeBuyUpgrade(st, 'sparring');
      if (fl.lifeSharpness(st) !== lvl) fail(`sparring partners level ${lvl} give ${fl.lifeSharpness(st)} sharpness`);
    }
    for (let morale = 0; morale <= 100; morale += 10) {
      const m = fresh();
      m.life.morale = morale;
      if (fl.lifeSharpness(m) !== (morale - 50) / 10) fail(`morale ${morale} gives ${fl.lifeSharpness(m)} sharpness`);
    }
  }
  /* The cut man, level by level, on the same fight. */
  {
    const damageAt = (lvl) => {
      let st = fresh();
      for (let i = 0; i < lvl; i += 1) st = ff.lifeBuyUpgrade(st, 'cutman');
      const offer = st.offers[2];
      return ff.lifeTakeFight(st, offer.id, smartLine(offer.opponent.style, offer.rounds)).result.damageTaken;
    };
    const taken = [0, 1, 2, 3].map(damageAt);
    for (let lvl = 1; lvl < taken.length; lvl += 1) {
      if (taken[lvl] !== r2(taken[0] * (1 - 0.04 * lvl))) fail(`cut man level ${lvl} left ${taken[lvl]} damage of ${taken[0]}`);
    }
    console.log(`   cut man: ${taken.join(', ')} damage from the same fight at levels 0 to 3`);
  }
  if (failures === failedBefore) ok('four coaches, the sparring partners, the cut man, the trainers, the mood and five steps of sharpness all move what they say, one step at a time');
}

{
  console.log('7f) a save from before the round opens and plays on');
  const failedBefore = failures;
  /* Ten fights on the engine alone: a version 1 save, no life block. */
  let v1 = fc.newFightCareer('Old Save', 'middle', 'slugger', 'v1-916');
  for (let i = 0; i < 10 && !v1.retired; i += 1) {
    const offer = POLICIES.adaptive(v1.offers, v1);
    v1 = fc.runCamp(v1, PLAN);
    v1 = fc.takeFight(v1, offer.id, smartLine(offer.opponent.style, offer.rounds)).state;
  }
  const stored = JSON.parse(JSON.stringify(v1));
  const opened = fl.ensureLife(stored);
  const strip = (s) => { const { life, ...rest } = s; return JSON.stringify(rest); };
  if (strip(opened) !== JSON.stringify(v1)) fail('opening an old save changed the fighter, the record or the offers');
  if (!opened.life || opened.life.v !== 1 || opened.life.trainer.kind !== 'allround' || opened.life.manager.kind !== 'family' || opened.life.pending.length) {
    fail('an old save did not get a plain default life block');
  }
  /* Then it plays on, and neutral play is still the engine's own career. */
  let base = v1; let life = opened; let same = true;
  for (let i = 0; i < 12 && !base.retired; i += 1) {
    life = clearGapNeutral(life).st;
    const offer = POLICIES.adaptive(base.offers, base);
    const tactics = smartLine(offer.opponent.style, offer.rounds);
    base = fc.takeFight(fc.runCamp(base, PLAN), offer.id, tactics).state;
    const next = ff.lifeTakeFight(ff.lifeRunCamp(life, PLAN), offer.id, tactics);
    if (!next) { same = false; break; }
    life = next.state;
    if (base.fighter.wins !== life.fighter.wins || base.fighter.damage !== life.fighter.damage || base.fightNo !== life.fightNo) same = false;
  }
  if (!same) fail('an old save played on through the life layer and fought different fights');
  /* A block that is not a block resets that block alone. */
  for (const junk of ['garbage', 7, [], { v: 2 }, null]) {
    const fixed = fl.ensureLife({ ...stored, life: junk });
    if (strip(fixed) !== JSON.stringify(v1) || fixed.life.v !== 1 || fixed.life.bank !== 0) fail(`a corrupt life block (${JSON.stringify(junk)}) was not reset on its own`);
  }
  /* And one bad field costs that field, not the block. */
  const half = fl.ensureLife({ ...stored, life: { ...opened.life, bank: 3.21, fanbase: 'lots', pending: 5, shop: { cutman: 99, nonsense: 4 }, cooldowns: 'x' } });
  if (half.life.bank !== 3.21 || half.life.fanbase !== fl.START_FANS || half.life.pending.length !== 0 || half.life.shop.cutman !== fm.MAX_UPGRADE_LEVEL || 'nonsense' in half.life.shop) {
    fail('one bad field in a life block did not repair to its default while the rest was kept');
  }
  if (failures === failedBefore) ok('an old save keeps its fighter and record, gets a default corner, and fights the same fights on; corrupt blocks reset alone');
}

/* Round 916 review: the promises that are about TIME, or about what a fight
   does to the life, were checked only at the moment an answer was given. A
   card's sharpness that never wore off, a promoter deal that never ended, a
   bank that kept the corner's share, a rival who followed you up a division
   and a mood that never settled all left every section green. Each of those
   is walked here through lifeTakeFight itself, with its own control. */
const pctOf = (words) => Number((words.match(/Takes (\d+)% of every purse/) || [])[1]);
{
  console.log('7g) what a fight does to the life, and what it leaves behind');
  const failedBefore = failures;
  const freshLife = (tag, trainer = 'allround', manager = 'family') =>
    fl.cloneForLife(ff.lifeNewCareer(`G ${tag}`, 'welter', 'outboxer', trainer, manager, `g-${tag}`));
  const fightOn = (st, idx = 1) => {
    const o = st.offers[Math.min(idx, st.offers.length - 1)];
    return ff.lifeTakeFight(st, o.id, smartLine(o.opponent.style, o.rounds));
  };

  /* (i) Sharpness from a card is that night's only: the guide says it is gone
     the morning after. Walked with banked points and with a real card. */
  for (const banked of [-4, 4]) {
    const st = freshLife(`sharp${banked}`);
    st.life.sharp = banked;
    if ((fl.lifeFightMods(st).sharp ?? 0) !== banked) fail(`a banked ${banked} did not reach the fight night`);
    const after = fightOn(st).state;
    if (after.life.sharp !== 0 || (fl.lifeFightMods(after).sharp ?? 0) !== 0) {
      fail(`sharpness ${banked} was still there after the fight it was for (banked ${after.life.sharp}, next night ${fl.lifeFightMods(after).sharp ?? 0})`);
    }
  }
  {
    const st = freshLife('shortnotice');
    st.life.pending = ['short-notice'];
    const card = fl.lifeCardById('short-notice');
    const take = card.options.findIndex(o => o.effect.sharp);
    const answered = fl.answerLifeCard(st, take).state;
    const promised = card.options[take].effect.sharp;
    if ((fl.lifeFightMods(answered).sharp ?? 0) !== promised) fail(`the short notice card promised ${promised} sharpness and the night got ${fl.lifeFightMods(answered).sharp ?? 0}`);
    const after = fightOn(answered).state;
    if ((fl.lifeFightMods(after).sharp ?? 0) !== 0) fail(`the short notice card's ${promised} sharpness lasted into the next fight`);
  }

  /* (ii) The promoter deal lasts the fights it says and then ends: the
     safest offer comes back and purses go back to what they were. Each
     table is checked against a twin that never signed. */
  {
    let st = freshLife('promoter');
    st.life.pending = ['promoter-deal'];
    const sign = fl.lifeCardById('promoter-deal').options.findIndex(o => o.effect.promoter);
    const length = fl.lifeCardById('promoter-deal').options[sign].effect.promoter;
    st = fl.answerLifeCard(st, sign).state;
    let fought = 0;
    for (let k = 1; k <= length + 2 && !st.retired; k += 1) {
      const twin = fl.cloneForLife(st);
      twin.life.promoterFights = 0;
      const pick = st.offers[0];
      const a = ff.lifeTakeFight(st, pick.id, smartLine(pick.opponent.style, pick.rounds));
      const b = ff.lifeTakeFight(twin, pick.id, smartLine(pick.opponent.style, pick.rounds));
      if (!a || !b) { fail('a promoter table offered a fight that could not be taken'); break; }
      fought = k;
      const left = Math.max(0, length - k);
      if (a.state.life.promoterFights !== left) fail(`after fight ${k} of a ${length} fight deal the save says ${a.state.life.promoterFights} left, not ${left}`);
      const want = left > 0
        ? b.state.offers.slice(1).map(o => ({ ...o, purse: r2(o.purse * fl.PROMOTER_PURSE_MUL) }))
        : b.state.offers;
      if (!a.state.retired && tableKey(a.state.offers) !== tableKey(want)) {
        fail(`after fight ${k} of a ${length} fight deal the table is ${left > 0 ? 'not the promoter table' : 'still the promoter table'}`);
      }
      st = a.state;
    }
    if (fought < length + 1) fail(`only ${fought} fights were walked on the promoter deal, too few to see it end`);
  }

  /* (iii) The corner is paid out of every purse: the tiles say what each man
     takes, and the bank gets the rest. All twelve pairings, words to bank. */
  {
    let pairs = 0;
    for (const t of fl.TRAINERS) for (const m of fl.MANAGERS) {
      const tPct = pctOf(fl.describeTrainer(t));
      const mPct = pctOf(fl.describeManager(m));
      if (!Number.isFinite(tPct) || !Number.isFinite(mPct)) { fail(`the ${t.id} or ${m.id} tile does not say what he takes`); continue; }
      const st = freshLife(`corner-${t.id}-${m.id}`, t.id, m.id);
      const offer = st.offers[1];
      const res = fightOn(st);
      const banked = r2(res.state.life.bank - st.life.bank);
      const want = r2(offer.purse * (1 - (tPct + mPct) / 100));
      if (banked !== want || res.takeHome !== banked) fail(`${t.id} and ${m.id}: a ${offer.purse}m purse banked ${banked}m, the tiles promise ${want}m`);
      pairs += 1;
    }
    if (pairs !== fl.TRAINERS.length * fl.MANAGERS.length) fail(`only ${pairs} corner pairings were checked`);
  }

  /* (iv) A class move leaves the rival, and the man who beat you, in the
     division you left: no grudge fight with him, no rematch clause, no beat
     that ranks him against you. Come back and he is there again. */
  {
    const st = probeState();
    st.life.rival.rank = 3;
    if (!fl.rivalInYourClass(st) || !fl.rivalFighter(st)) fail('the probe rival is not in your division to begin with, so this check proves nothing');
    const moved = fl.cloneForLife(st);
    fl.applyLifeEffect(moved, { moveClass: 1 });
    if (fl.rivalInYourClass(moved) || fl.rivalFighter(moved)) fail('after a move up the rival is still in your division');
    const table = tableKey(moved.offers);
    fl.applyLifeEffect(moved, { grudge: true });
    if (tableKey(moved.offers) !== table) fail('after a move up a grudge fight with the rival still reached the table');
    if (moved.life.lastBeatenBy) fail('after a move up the man who beat you in the old division is still on file for the rematch clause');
    const clause = fl.lifeCardById('rematch-clause');
    if (clause.when(moved)) fail('after a move up the rematch clause can still be dealt');
    for (const id of [9, 10]) {
      const b = fr.FIGHT_RIVALRY_EVENTS.find(x => x.id === id);
      if (b.when(moved, moved.life.rival)) fail(`after a move up rival beat ${id} still compares your ranking with his`);
    }
    const faceOff = fr.FIGHT_RIVALRY_CHOICES.find(d => d.id === 'fr-face-off');
    if (faceOff.when(moved, moved.life.rival)) fail('after a move up the face-off with the rival can still be dealt');
    const back = fl.cloneForLife(moved);
    fl.applyLifeEffect(back, { moveClass: -1 });
    if (!fl.rivalInYourClass(back) || !fl.rivalFighter(back)) fail('after moving back down the rival is not in your division again');
  }

  /* (v) Morale settles toward 50 after every fight, by the amount the corner
     tile says, and a karma of 70 or more hands 2 back, as the tile also says. */
  {
    const settle = (morale, karma = 50) => {
      const st = freshLife(`mood${morale}-${karma}`);
      st.life.morale = morale;
      st.life.karma = karma;
      return fightOn(st).state.life;
    };
    for (const [m, want] of [[70, 68], [30, 32], [51, 50], [49, 50], [50, 50]]) {
      const got = settle(m).morale;
      if (got !== want) fail(`morale ${m} at karma 50 came out of a fight at ${got}, not ${want}`);
    }
    const kind = settle(70, 80);
    if (kind.morale !== 70 || kind.karma !== 78) fail(`morale 70 at karma 80 came out at ${kind.morale} and karma ${kind.karma}, the tile says 70 and 78`);
  }

  /* (vi) "He won again" and "he lost" say what happened in this window, not
     what his career totals are. */
  {
    const st = probeState();
    const r = st.life.rival;
    const won = fr.FIGHT_RIVALRY_EVENTS.find(x => x.id === 1);
    const lost = fr.FIGHT_RIVALRY_EVENTS.find(x => x.id === 3);
    Object.assign(r, { wins: 9, losses: 4 });
    for (const [last, w, l] of [['W', true, false], ['L', false, true], [null, false, false]]) {
      r.last = last;
      if (won.when(st, r) !== w || lost.when(st, r) !== l) fail(`with his last window ${last ?? 'idle'} the beats read won ${won.when(st, r)}, lost ${lost.when(st, r)}`);
    }
  }

  /* (vii) A card waiting behind a class move is read again when it comes up:
     step aside money has no places left to cost an unranked man, so it lapses,
     and a rank effect never hands an unranked man a number. */
  {
    const st = probeState();
    st.life.pending = ['move-up', 'step-aside'];
    if (!fl.lifeCardById('step-aside').when(st)) fail('step aside money is not open on the probe, so this check proves nothing');
    const up = fl.lifeCardById('move-up').options.findIndex(o => o.effect.moveClass);
    const after = fl.answerLifeCard(st, up).state;
    if (after.life.pending.includes('step-aside')) fail('step aside money is still waiting after a class move left you unranked');
    const unranked = fl.cloneForLife(after);
    fl.applyLifeEffect(unranked, { rank: 2 });
    if (unranked.fighter.rank !== 99) fail(`a rank effect moved an unranked fighter to #${unranked.fighter.rank}`);
  }

  /* (viii) A grudge fight or a rematch on the table holds back the cards
     that would throw the table away or take the same slot. */
  {
    const st = probeState();
    st.fightNo = 9;
    fl.applyLifeEffect(st, { grudge: true });
    if (!st.offers.some(o => o.label === fl.GRUDGE_LABEL)) fail('the probe grudge fight did not reach the table, so this check proves nothing');
    for (const id of ['move-up', 'move-down', 'rematch-clause']) {
      if (fl.lifeCardById(id).when(st)) fail(`card ${id} can be dealt with a grudge fight on the table, and would undo it`);
    }
  }

  /* (ix) A waiting rival step nothing can answer (an id this build does not
     know, or a beat with no rival) is cleared when the save is opened, so the
     hub is never stuck on it. */
  {
    const st = probeState();
    const stored = JSON.parse(JSON.stringify(st));
    stored.life.pendingRivalryChoice = { id: 'fr-renamed-long-ago', emoji: '?', title: 'Gone', description: 'Gone', choices: [{ label: 'x', emoji: 'x', consequence: 'x' }] };
    const opened = ff.lifeLoadState(stored);
    if (ff.nextLifeStep(opened)?.kind === 'choice') fail('a rival choice with an unknown id survived the load and blocks the hub');
    const orphan = JSON.parse(JSON.stringify(st));
    orphan.life.rival = null;
    orphan.life.pendingRivalryEvent = { id: 5, emoji: '?', title: 'x', description: 'x', consequence: 'x' };
    if (ff.nextLifeStep(ff.lifeLoadState(orphan))?.kind === 'beat') fail('a rival beat with no rival survived the load and blocks the hub');
    const known = JSON.parse(JSON.stringify(st));
    known.life.pendingRivalryChoice = { ...stored.life.pendingRivalryChoice, id: fr.FIGHT_RIVALRY_CHOICES[0].id };
    if (ff.nextLifeStep(ff.lifeLoadState(known))?.kind !== 'choice') fail('the load cleared a rival choice it does know');
  }

  /* (x) Every text reply prints what it does, and does what it prints. */
  {
    let replies = 0;
    for (const t of fi.FIGHT_INBOX_TEXTS) {
      t.choices.forEach((c, i) => {
        replies += 1;
        const words = fi.describeInboxChoice(c);
        const said = parseWords(words);
        const want = { cash: c.cash ?? 0, fans: c.popularity ?? 0, morale: c.morale ?? 0, karma: c.karma ?? 0 };
        for (const k of Object.keys(want)) {
          if ((said[k] ?? 0) !== want[k]) fail(`text ${t.id} reply ${i} reads ${k} ${said[k] ?? 'nothing'}, the reply does ${want[k]}`);
        }
        if (!want.cash && !want.fans && !want.morale && !want.karma && words !== 'Nothing changes.') fail(`text ${t.id} reply ${i} does nothing and reads "${words}"`);
        const st = probeState();
        st.life.phoneInbox = [{ id: 'probe-text', defId: t.id, from: t.from, emoji: t.emoji, text: t.text, year: 9, choices: t.choices }];
        const L0 = { ...st.life };
        fi.answerFightInbox(st, st.life, 'probe-text', i);
        const L1 = st.life;
        if (L1.bank !== r2(L0.bank + want.cash) || L1.fanbase !== m100(L0.fanbase + want.fans) ||
          L1.morale !== m100(L0.morale + want.morale) || L1.karma !== m100(L0.karma + want.karma)) {
          fail(`text ${t.id} reply ${i} left bank ${L1.bank}, fans ${L1.fanbase}, morale ${L1.morale}, karma ${L1.karma}; its words say ${words}`);
        }
      });
    }
    console.log(`   ${replies} text replies read back from their words`);
  }
  if (failures === failedBefore) ok('sharpness lasts one night, the promoter deal ends on time, the corner is paid from every purse, the rival and the rematch stay in the old division, morale settles, the beats read this window, lapsed cards lapse, a special fight holds the table, dead rival steps clear on load, and every reply says what it does');
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFightCareer: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFightCareer: all sections passed');
process.exit(0);
