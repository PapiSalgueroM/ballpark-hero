/**
 * Round 585 harness: gems and packs. Sixth round of the tycoon merge
 * (docs/design/round-580-tycoon-merge.md, sections 6 and 14).
 *
 * A pack is the one place chance decides what a player gets, so this harness is
 * about the lines a pack must never cross: odds that are not the odds drawn, a
 * guarantee that is not kept, gems from anywhere but playing, a draw a reload can
 * repeat, a kid delivered twice, scouting quietly changed, or words and shapes
 * that belong to gambling.
 *
 * NODE, over the bundled libs:
 *   S1 odds: every pack's odds sum to 100, and the Packs panel's code types no
 *      percentage (its numbers are PACKS', printed as they are)
 *   S2 the draw: 200,000 seeded draws per pack land within 0.3 points of every
 *      published odd, and the same count detects a one point shift (power)
 *   S3 better packs are better: the expected ceiling strictly rises, and the
 *      guarantee's mean gap between Stars equals the exact figure (6.51, 1.96)
 *   S4 the guarantee fires exactly on the Nth pack since the last Star, never later
 *   S5 one way: 100,000 random sequences of every action but a result never move
 *      `earned`; a watched win, draw and loss pay 3, 1 and 0, a title 20 and a
 *      runner-up 6 on top, an away win 1, and a replayed full time 0
 *   S8 scouting unchanged: 500 scout finds are byte identical to the baseline
 *      committed before this round (scripts/data/academyScoutBaseline.json)
 *   S9 rollback: an academy save with pack kids loads in the frozen V1 loader
 *   S10 fences: one writer of the ledger key, no `.earned =` outside the ledger,
 *      no Math.random in the ledger, no timer or confetti on the panel, and none
 *      of spin, jackpot, lucky, bet, loot or crate in the pack code
 *   S11 dry spells in the draw: 100,000 players of 30 Club and 30 Elite Packs
 *      never wait past the guarantee; the share who hit the longest wait is printed
 *   S12 every new ledger draws its own sequence: two fresh ledgers never share a
 *      seed, and neither is the constant (the review found every player drawing
 *      the same packs in the same order)
 *   S13 a kid is never lost: a pack not yet in a bed cannot be dismissed, and a
 *      ledger lost while the academy remembers its packs numbers the next one past them
 *   S15 the dry-spell fence (contract section 5): a greedy bot plays 40 hours of
 *      stadium, academy and packs over 50 seeds; the 90th percentile of its
 *      longest stretch without an unlock stays under 1.5 times the first measurement
 * VITEST, src/test/tycoonPacks.test.tsx over the real academy page:
 *   1 the panel prints PACKS above each button, 2 prices, the free first Scout
 *   Pack and the disabled button, 3 (S6) the card tier is the tier drawn, 4 (S7) a
 *   reload mid-reveal shows the same kid delivered once, 5 a watched win pays its
 *   gems and taps and purchases pay none, 6 a kid waiting for a bed cannot be
 *   waved away, 7 a lost ledger's next pack still reaches a bed, 8 away wins and a
 *   watched title pay their gems through the real stadium hook, 9 malformed saved
 *   card fields are safe, 10 a refused academy write recovers in place and after
 *   reload, 11 dismissal waits for its save, 12 opening waits for a durable debit
 *
 * CONTROLS: skew, nopity, late, leak, reroll, scoutdrift, words, oddsliteral,
 * twowriters, panelodds, freeprice, tiercard, gemtap, wavedaway, seqreuse,
 * sameseed, forgetful, dear, rawkid, unsaveddelivery, unsaveddismiss, unsaveddebit. The review before this round shipped found the
 * shared seed, the kid lost to "Welcome him in" and the missing controls; S12, S13,
 * S15 and the last eight controls are its cases. Control copies go to
 * dist/.tycoon-packs-control-<name>/.
 *
 * Run: node scripts/simTycoonPacks.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoutFinds } from './genAcademyScoutBaseline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACADEMY_LIB = path.join(ROOT, 'src/lib/wonderkidFactory.ts');
const REWARDS_LIB = path.join(ROOT, 'src/lib/tycoonRewards.ts');
const PANEL = path.join(ROOT, 'src/components/tycoon/PacksPanel.tsx');
const FROZEN_ACADEMY = path.join(ROOT, 'scripts/fixtures/tycoonV1/wonderkidFactory.ts');
const BASELINE = path.join(ROOT, 'scripts/data/academyScoutBaseline.json');
const TEST = 'src/test/tycoonPacks.test.tsx';
const SECTIONS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S15'];
const STADIUM_LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const STADIUM_HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const ACADEMY_PANEL = path.join(ROOT, 'src/components/tycoon/AcademyPanel.tsx');
const ACADEMY_HOOK = path.join(ROOT, 'src/hooks/useWonderkidFactory.ts');
const TEST_COUNT = 12;
/* Measured on the first run (Round 585): over 50 seeds the greedy bot's longest
   stretch without an unlock has a 90th percentile of 52.8 minutes, the stretches
   all ending in an affordable pack late in the run. The contract sets the fence at
   1.5 times that, and every later round must stay under it. */
const DRY_FENCE_MIN = 79;

/* The ledger writes to localStorage; node gets a plain one. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
};
const BANNED = ['spin', 'jackpot', 'lucky', 'bet', 'loot', 'crate'];
const TOLERANCE = 0.3;
const DRAWS = 200000;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const stripComments = code => code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonpacks-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});
function mustReplace(text, from, to, what) {
  if (text.split(from).length - 1 !== 1) abort(`  control: ${what} does not carry exactly one ${JSON.stringify(from.slice(0, 70))}, so this control would prove nothing`);
  return text.replace(from, to);
}
async function bundle(entry, name, aliases = {}) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  const extra = Object.entries(aliases).map(([k, v]) => `--alias:${k}=${v}`).join(' ');
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node ${extra} --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`, { cwd: ROOT, shell: true });
  return import('file:///' + out.split(path.sep).join('/'));
}
const mulberry = seed => {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

/** Every source file under src, for the fences. */
function srcFiles(dir = path.join(ROOT, 'src')) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'test') out.push(...srcFiles(p)); } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function sections({ W, R, V1, T, panelSource, sources, baseline }) {
  const out = Object.fromEntries(SECTIONS.map(k => [k, []]));
  const notes = {};
  const TIER_IDS = W.TIERS.map(t => t.id);

  /* S1 */
  for (const p of W.PACKS) {
    const sum = TIER_IDS.reduce((n, t) => n + p.odds[t], 0);
    if (sum !== 100) out.S1.push(`the ${p.name}'s odds sum to ${sum}`);
  }
  const panelCode = stripComments(panelSource);
  const typed = [...panelCode.matchAll(/\d+(?:\.\d+)?\s*(?:%|percent\b)/g)].map(m => m[0]);
  if (typed.length) out.S1.push(`the Packs panel types ${typed.length} percentage(s) of its own (${typed.slice(0, 3).join(', ')}), so what it prints is not read from PACKS`);
  if (!/pack\.odds\[t\.id\]/.test(panelCode)) out.S1.push('the Packs panel no longer prints pack.odds, so its odds come from somewhere else');
  notes.S1 = `${W.PACKS.length} packs sum to 100; the panel types no percentage and prints pack.odds`;

  /* S2 */
  const drift = [];
  let worst = 0;
  for (const p of W.PACKS) {
    const roll = mulberry(20260915 + p.price);
    const counts = Object.fromEntries(TIER_IDS.map(t => [t, 0]));
    for (let i = 0; i < DRAWS; i += 1) counts[R.drawTier(p, 0, roll)] += 1;
    for (const t of TIER_IDS) {
      const got = (100 * counts[t]) / DRAWS;
      const gap = Math.abs(got - p.odds[t]);
      worst = Math.max(worst, gap);
      if (gap > TOLERANCE) drift.push(`${p.name} ${t}: drew ${got.toFixed(2)}% against ${p.odds[t]}%`);
    }
  }
  out.S2.push(...drift.slice(0, 3));
  /* power: the same count must see a one point shift in the Club Pack */
  const club = W.PACKS.find(p => p.id === 'club');
  const shifted = { ...club, odds: { ...club.odds, prospect: club.odds.prospect - 1, star: club.odds.star + 1 } };
  const rollP = mulberry(31337);
  let stars = 0;
  for (let i = 0; i < DRAWS; i += 1) if (R.drawTier(shifted, 0, rollP) === 'star') stars += 1;
  const seen = Math.abs((100 * stars) / DRAWS - club.odds.star);
  if (!(seen > TOLERANCE)) out.S2.push(`a one point shift in the Club Pack's Star odds reads as ${seen.toFixed(2)} points at ${DRAWS} draws, inside the tolerance, so this section could not see it`);
  notes.S2 = `${DRAWS} draws per pack, worst gap ${worst.toFixed(3)} points (tolerance ${TOLERANCE}); a one point shift reads ${seen.toFixed(2)}`;

  /* S3 */
  const mid = t => { const b = W.TIERS.find(x => x.id === t); return (b.potMin + b.potMax) / 2; };
  const ceilings = W.PACKS.map(p => TIER_IDS.reduce((n, t) => n + (p.odds[t] / 100) * mid(t), 0));
  for (let i = 1; i < ceilings.length; i += 1) if (!(ceilings[i] > ceilings[i - 1])) out.S3.push(`the ${W.PACKS[i].name}'s expected ceiling ${ceilings[i].toFixed(1)} is not above the ${W.PACKS[i - 1].name}'s ${ceilings[i - 1].toFixed(1)}`);
  const gaps = [];
  for (const p of W.PACKS.filter(x => x.guarantee !== null)) {
    const hit = W.GUARANTEED_TIERS.reduce((n, t) => n + p.odds[t] / 100, 0);
    let exact = 0;
    for (let k = 0; k < p.guarantee; k += 1) exact += Math.pow(1 - hit, k);
    const want = { club: 6.51, elite: 1.96 }[p.id];
    if (want !== undefined && Math.round(exact * 100) / 100 !== want) out.S3.push(`the ${p.name}'s exact mean gap is ${exact.toFixed(3)}, the design says ${want}`);
    let l = { ...R.newLedger(99 + p.price), earned: 1e9 };
    let since = 0;
    let total = 0;
    let n = 0;
    for (let i = 0; i < 100000; i += 1) {
      l = R.openPack(l, p.id, true, (lo, hi, rng) => ({ id: 1, name: 'x', nation: 'Spain', pos: 'MF', age: 16, ageClock: 0, rating: 50, potential: Math.round(lo + rng() * (hi - lo)) }));
      since += 1;
      if (W.GUARANTEED_TIERS.includes(l.pending.tier)) { total += since; n += 1; since = 0; }
      l = { ...l, pending: null };
    }
    const measuredGap = total / n;
    gaps.push(`${p.name} ${measuredGap.toFixed(3)} (exact ${exact.toFixed(3)})`);
    if (Math.abs(measuredGap - exact) > 0.08) out.S3.push(`the ${p.name}'s measured mean gap is ${measuredGap.toFixed(3)} against the exact ${exact.toFixed(3)}`);
  }
  notes.S3 = `expected ceilings ${ceilings.map(c => c.toFixed(1)).join(' < ')}; mean packs between Stars: ${gaps.join(', ')}`;

  /* S4 */
  for (const p of W.PACKS.filter(x => x.guarantee !== null)) {
    const roll = mulberry(4040 + p.price);
    for (let i = 0; i < 20000; i += 1) {
      const t = R.drawTier(p, p.guarantee - 1, roll);
      if (!W.GUARANTEED_TIERS.includes(t)) { out.S4.push(`the ${p.name} drew ${t} on the ${p.guarantee}th pack since the last Star`); break; }
    }
    let early = 0;
    const roll2 = mulberry(4141 + p.price);
    for (let i = 0; i < 20000; i += 1) if (!W.GUARANTEED_TIERS.includes(R.drawTier(p, p.guarantee - 2, roll2))) early += 1;
    if (early === 0) out.S4.push(`the ${p.name}'s guarantee fires a pack early`);
  }
  notes.S4 = `the ${W.PACKS.filter(x => x.guarantee !== null).map(p => `${p.name} guarantee fired on pack ${p.guarantee}, never on ${p.guarantee - 1}`).join('; ')}`;

  /* S5 */
  const roll5 = mulberry(555);
  let moved = 0;
  const kid = (lo, hi, rng) => ({ id: 1, name: 'x', nation: 'Spain', pos: 'MF', age: 16, ageClock: 0, rating: 50, potential: Math.round(lo + rng() * (hi - lo)) });
  for (let i = 0; i < 100000; i += 1) {
    let l = { ...R.newLedger(i), earned: Math.floor(roll5() * 2000), lastMatch: Math.floor(roll5() * 50) };
    const before = l.earned;
    for (let j = 0; j < 4; j += 1) {
      const a = Math.floor(roll5() * 6);
      const id = W.PACKS[Math.floor(roll5() * W.PACKS.length)].id;
      if (a === 0) l = R.openPack(l, id, roll5() < 0.8, kid) ?? l;
      else if (a === 1) l = { ...l, pending: null };
      else if (a === 2) l = R.cleanLedger(JSON.parse(JSON.stringify(l)));
      else if (a === 3) R.priceOf(l, id);
      else if (a === 4) R.canOpen(l, id, true);
      else l = R.creditFullTimes(l, [{ totalMatches: l.lastMatch, result: 'win', away: false }]);
    }
    if (l.earned !== before) { moved += 1; if (out.S5.length < 2) out.S5.push(`sequence ${i} moved earned from ${before} to ${l.earned} without a new result`); }
  }
  const one = (ft, l = R.newLedger()) => R.creditFullTimes({ ...l, lastMatch: 10 }, [{ totalMatches: 11, ...ft }]).earned - l.earned;
  const pays = {
    win: one({ result: 'win', away: false }), draw: one({ result: 'draw', away: false }), loss: one({ result: 'loss', away: false }),
    title: one({ result: 'win', away: false, position: 1 }) - one({ result: 'win', away: false }),
    runnerUp: one({ result: 'loss', away: false, position: 2 }), awayWin: one({ result: 'win', away: true }), awayDraw: one({ result: 'draw', away: true }),
  };
  const want5 = { win: 3, draw: 1, loss: 0, title: 20, runnerUp: 6, awayWin: 1, awayDraw: 0 };
  for (const [k, v] of Object.entries(want5)) if (pays[k] !== v) out.S5.push(`a ${k} pays ${pays[k]} gems, the rule says ${v}`);
  const replay = R.creditFullTimes({ ...R.newLedger(), lastMatch: 11, earned: 5 }, [{ totalMatches: 11, result: 'win', away: false }]).earned;
  if (replay !== 5) out.S5.push(`a replayed full time paid ${replay - 5} gems`);
  notes.S5 = `100,000 action sequences moved earned ${moved} times; a win, draw and loss pay ${pays.win}, ${pays.draw}, ${pays.loss}, a title ${pays.title} more, second place ${pays.runnerUp}, an away win ${pays.awayWin}, a replay ${replay - 5}`;

  /* S8 */
  const today = scoutFinds(W, baseline.length);
  const diff = today.findIndex((f, i) => f !== baseline[i]);
  if (diff !== -1) out.S8.push(`scout find ${diff + 1} differs from the baseline: ${today[diff]?.slice(0, 100)} against ${baseline[diff].slice(0, 100)}`);
  notes.S8 = `${today.length} scout finds byte identical to the pre-round baseline`;

  /* S9 */
  const a = W.newFactory(0, 9);
  a.levels = { ...a.levels, dorms: 2 };
  const drawn = R.openPack({ ...R.newLedger(3), earned: 1e6 }, 'elite', true, (lo, hi, rng) => W.makeProspectInBand({ ...a, prospects: [...a.prospects] }, lo, hi, rng));
  W.deliverPack(a, drawn.pending.seq, drawn.pending.kid, drawn.pending.tier);
  const raw = W.serialize(a);
  const today9 = W.deserialize(raw, 0);
  const v1 = V1.deserialize(raw, 0);
  if (!v1) out.S9.push('the frozen V1 loader refuses an academy save with a pack kid');
  else if (v1.prospects.length !== a.prospects.length || v1.prospects[0].name !== a.prospects[0].name) out.S9.push('the frozen V1 loader drops the pack kid');
  if (!today9 || today9.prospects[0].tier !== drawn.pending.tier || today9.packsDelivered !== 1) out.S9.push('today\'s loader loses the pack kid\'s tier or the delivery count');
  const movedUp = W.newFactory(0, 11);
  movedUp.packsDelivered = 3;
  movedUp.lifetime = W.REGIONS[0].goal;
  W.moveUp(movedUp);
  if (movedUp.packsDelivered !== 3) out.S9.push(`moving the academy up lost its delivery count (${movedUp.packsDelivered})`);
  notes.S9 = `a save with a ${drawn.pending.tier} pack kid loads in the frozen V1 loader (${v1 ? v1.prospects.length : 0} kid) and keeps its tier and delivery count today`;

  /* S10 */
  const writers = sources.filter(s => s.rel !== 'src/lib/tycoonRewards.ts' && /tycoonRewardsV1|REWARDS_KEY/.test(stripComments(s.code)));
  for (const w of writers) out.S10.push(`${w.rel} names the ledger key, and only src/lib/tycoonRewards.ts may touch it`);
  const earners = sources.filter(s => s.rel !== 'src/lib/tycoonRewards.ts' && /\.earned\s*(?:[+\-*/]?=)(?!=)/.test(stripComments(s.code)));
  for (const w of earners) out.S10.push(`${w.rel} assigns .earned`);
  const rewardsCode = stripComments(sources.find(s => s.rel === 'src/lib/tycoonRewards.ts')?.code ?? '');
  const seedFn = /export function freshSeed\(\)[^{]*\{[\s\S]*?\n\}/.exec(rewardsCode);
  if (!seedFn) out.S10.push('the ledger has no freshSeed, so a new ledger cannot get a seed of its own');
  if (/Math\.random|Date\.now/.test(seedFn ? rewardsCode.replace(seedFn[0], '') : rewardsCode)) out.S10.push('the ledger reads Math.random or the clock outside freshSeed, so a draw is not its own generator');
  const credits = sources.flatMap(s => [...stripComments(s.code).matchAll(/\brecordFullTimes\s*\(/g)].map(() => s.rel)).filter(r => r !== 'src/lib/tycoonRewards.ts');
  const hookCredits = credits.filter(r => r === 'src/hooks/useStadiumTycoon.ts').length;
  if (credits.some(r => r !== 'src/hooks/useStadiumTycoon.ts') || hookCredits !== 2) out.S10.push(`gems are credited from ${credits.length} place(s) (${[...new Set(credits)].join(', ')}), and the only two are the stadium hook's full time and its away settle`);
  if (/setInterval|setTimeout|Confetti/.test(panelCode)) out.S10.push('the Packs panel has a timer or confetti');
  const academyCode = stripComments(sources.find(s => s.rel === 'src/components/tycoon/AcademyPanel.tsx')?.code ?? '');
  const academyPanelsCode = stripComments(sources.find(s => s.rel === 'src/components/tycoon/AcademyLegacyPanel.tsx')?.code ?? '');
  const academyProspectsCode = stripComments(sources.find(s => s.rel === 'src/components/tycoon/AcademyProspects.tsx')?.code ?? '');
  const packCode = [panelCode, rewardsCode, academyCode, academyPanelsCode, academyProspectsCode].join('\n').toLowerCase();
  for (const word of BANNED) if (new RegExp(`\\b${word}\\b`).test(packCode)) out.S10.push(`the pack code uses the word "${word}"`);
  notes.S10 = `one writer of the ledger key across ${sources.length} source files, no .earned assignment elsewhere, no Math.random in the ledger, no timer or confetti on the panel, none of ${BANNED.join(', ')}`;

  /* S11 */
  const spells = {};
  for (const p of W.PACKS.filter(x => x.guarantee !== null)) {
    let longest = 0;
    let atLimit = 0;
    for (let player = 0; player < 100000; player += 1) {
      const roll = mulberry(player * 13 + p.price);
      let dry = 0;
      let mine = 0;
      for (let i = 0; i < 30; i += 1) {
        const t = R.drawTier(p, dry, roll);
        dry = W.GUARANTEED_TIERS.includes(t) ? 0 : dry + 1;
        mine = Math.max(mine, dry);
      }
      longest = Math.max(longest, mine);
      if (mine >= p.guarantee - 1) atLimit += 1;
    }
    spells[p.id] = `${p.name}: longest ${longest} without a Star, ${((100 * atLimit) / 100000).toFixed(1)}% of players waited the full ${p.guarantee - 1}`;
    if (longest > p.guarantee - 1) out.S11.push(`a player opened ${longest} ${p.name}s in a row without a Star, past the guarantee of ${p.guarantee}`);
  }
  notes.S11 = Object.values(spells).join('; ');
  /* S12 */
  const seeds = [];
  for (let i = 0; i < 3; i += 1) {
    store.clear();
    R.recordFullTimes([{ totalMatches: 1, result: 'win', away: false }]);
    seeds.push(JSON.parse(store.get(R.REWARDS_KEY)).seed);
  }
  store.clear();
  if (new Set(seeds).size !== seeds.length || seeds.includes(R.newLedger().seed)) out.S12.push(`three new ledgers were seeded ${seeds.join(', ')}; the constant is ${R.newLedger().seed}`);
  notes.S12 = `three new ledgers took seeds ${seeds.join(', ')}, none shared and none the constant ${R.newLedger().seed}`;

  /* S13 */
  store.clear();
  const kidOf = (lo, hi, rng) => ({ id: 1, name: 'Kid', nation: 'Spain', pos: 'MF', age: 16, ageClock: 0, rating: 50, potential: Math.round(lo + rng() * (hi - lo)) });
  store.set(R.REWARDS_KEY, JSON.stringify({ ...R.newLedger(5), earned: 500 }));
  const waiting = R.commitOpenPack('club', true, kidOf, 1);
  const refused = R.clearPendingPack(waiting.seq - 1);
  const stillThere = R.loadLedger().pending !== null;
  const accepted = R.clearPendingPack(waiting.seq);
  if (refused || !stillThere) out.S13.push('a pack whose kid had not reached a bed was dismissed');
  if (!accepted || R.loadLedger().pending !== null) out.S13.push('a delivered pack could not be dismissed');
  const lost = R.openPack({ ...R.newLedger(6), earned: 500 }, 'club', true, kidOf, 5);
  if (lost.pending.seq !== 5 || lost.nextSeq !== 6) out.S13.push(`a lost ledger's next pack carried number ${lost.pending.seq} against an academy at 4`);
  const cleaned = R.cleanLedger(JSON.parse(JSON.stringify(lost)));
  if (!cleaned.pending || cleaned.pending.seq !== 5) out.S13.push('a pack numbered past the packs opened was dropped on load');
  store.clear();
  notes.S13 = `an undelivered pack refused to be dismissed and a delivered one was; a lost ledger numbered its next pack ${lost.pending.seq}, and it survived a reload`;

  /* S15 */
  if (T) {
    const spells = [];
    for (let k = 1; k <= 50; k += 1) spells.push(longestDrySpell(T, W, R, k * 101));
    const mins = spells.map(x => x.longest / 60).sort((x, y) => x - y);
    const p90 = mins[Math.ceil(0.9 * mins.length) - 1];
    const ends = [...new Set(spells.map(x => x.where))].join(', ');
    if (!(p90 < DRY_FENCE_MIN)) out.S15.push(`the 90th percentile dry spell is ${p90.toFixed(1)} minutes, over the fence of ${DRY_FENCE_MIN}`);
    notes.S15 = `p90 longest stretch without an unlock ${p90.toFixed(1)} minutes over 50 seeds of 40 hours (fence ${DRY_FENCE_MIN}); median ${mins[25].toFixed(0)}; the stretches ended in ${ends}`;
  }
  return { out, notes };
}

/** The contract's dry-spell bot: 40 hours of greedy stadium, academy and packs,
 *  in 10 second steps. An unlock is a star, a league title, a badge, a milestone,
 *  a new academy region, or a pack becoming affordable (which it then opens). */
function longestDrySpell(T, W, R, seed, hours = 40, step = 10) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  const a = W.newFactory(0, seed);
  let l = R.newLedger(seed);
  let last = 0;
  let longest = 0;
  let where = '';
  const unlock = (t, what) => { if (t - last > longest) { longest = t - last; where = what; } last = t; };
  let affordable = false;
  const end = hours * 3600;
  for (let t = step; t <= end; t += step) {
    const before = { rep: s.rep, titles: s.leagueTitles ?? 0, ach: (s.ach ?? []).length, claimed: (s.claimed ?? []).length, region: a.rep };
    const r = T.tick(s, step, roll);
    s = r.state;
    const ft = r.events.find(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss');
    if (ft) {
      const season = r.events.find(e => (e.kind === 'title' || e.kind === 'seasonEnd') && e.position !== undefined);
      l = R.creditFullTimes(l, [{ totalMatches: s.totalMatches, result: ft.kind, away: false, position: season?.position }]);
    }
    for (let guard = 0; guard < 40; guard += 1) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const opts = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((x, y) => T.costOf(s, x.id) * (full && x.id === 'stands' ? 0.55 : 1) - T.costOf(s, y.id) * (full && y.id === 'stands' ? 0.55 : 1));
      if (!opts.length) break;
      s = T.buy(s, opts[0].id);
    }
    if (T.canPrestige(s)) s = T.prestige(s, 0);
    W.tick(a, step);
    for (const k of [...a.prospects]) if (k.rating >= k.potential - 0.5 || k.age >= 22) W.sellProspect(a, k.id);
    for (const fac of [...W.FACILITIES].sort((x, y) => W.facilityCost(a, x.id) - W.facilityCost(a, y.id))) W.buyFacility(a, fac.id);
    if (W.canMoveUp(a)) W.moveUp(a);
    const cheapest = Math.min(...W.PACKS.map(p => R.priceOf(l, p.id)));
    const nowAffordable = R.balance(l) >= cheapest && W.bedFree(a) && l.pending === null;
    if (nowAffordable && !affordable) unlock(t, 'a pack');
    affordable = nowAffordable;
    if (nowAffordable) {
      const id = [...W.PACKS].reverse().find(p => R.canOpen(l, p.id, W.bedFree(a)))?.id;
      const next = id ? R.openPack(l, id, true, (lo, hi, rng) => W.makeProspectInBand({ ...a, prospects: [...a.prospects] }, lo, hi, rng), (a.packsDelivered ?? 0) + 1) : null;
      if (next) { W.deliverPack(a, next.pending.seq, next.pending.kid, next.pending.tier); l = { ...next, pending: null }; affordable = false; }
    }
    if (s.rep > before.rep) unlock(t, 'a star');
    if ((s.leagueTitles ?? 0) > before.titles) unlock(t, 'a title');
    if ((s.ach ?? []).length > before.ach) unlock(t, 'a badge');
    if ((s.claimed ?? []).length > before.claimed) unlock(t, 'a milestone');
    if (a.rep > before.region) unlock(t, 'a region');
  }
  unlock(end, 'the end of the run');
  return { longest, where };
}

const report = (r, withNotes) => {
  for (const k of SECTIONS) console.log(`   ${r.out[k].length ? 'RED ' : 'ok  '} ${k}${r.out[k].length ? `: ${r.out[k][0]}` : withNotes ? `: ${r.notes[k]}` : ''}`);
};

function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) { console.error(text.slice(-3000)); return null; }
  const rep = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  rows.notes = [...text.matchAll(/PACKS\| (.+)/g)].map(m => m[1].trim());
  for (const file of rep.testResults || []) for (const a of file.assertionResults || []) rows.push({ title: a.title || '', status: a.status, messages: (a.failureMessages || []).join('\n') });
  return rows;
}
const sectionOf = title => Number((title.match(/^(\d+)/) || [])[1] || 0);
const detail = m => (m.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('at ')) || '').replace(/^AssertionError: /, '').slice(0, 220);

console.log('Round 585: gems and packs');
console.log('');
console.log('A) the shipped code');
const W = await bundle(ACADEMY_LIB, 'academy');
const R = await bundle(REWARDS_LIB, 'rewards');
const V1 = await bundle(FROZEN_ACADEMY, 'v1-academy');
const baseline = JSON.parse(read(BASELINE)).finds;
const sources = srcFiles().map(f => ({ rel: path.relative(ROOT, f).split(path.sep).join('/'), code: read(f) }));
const T = await bundle(STADIUM_LIB, 'stadium');
const inputs = { W, R, V1, T, panelSource: read(PANEL), sources, baseline };
const plain = sections(inputs);
report(plain, true);
for (const k of SECTIONS) for (const m of plain.out[k]) fail(`${k}: ${m}`);

console.log('');
console.log('A.page) the real academy page, src/test/tycoonPacks.test.tsx');
const live = runSuite({});
if (!live) abort('  FAIL: the packs suite produced no report');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < TEST_COUNT) fail(`only ${live.length} of the ${TEST_COUNT} page tests ran`);
for (const note of live.notes) console.log(`     ${note}`);

async function libControl(name, file, text) {
  const dir = path.join(ROOT, 'dist', `.tycoon-packs-control-${name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, path.basename(file));
  fs.writeFileSync(target, text);
  if (file === ACADEMY_LIB) {
    const rw = path.join(dir, 'tycoonRewards.ts');
    fs.writeFileSync(rw, read(REWARDS_LIB).split("from '@/lib/wonderkidFactory'").join(`from '${target.split(path.sep).join('/')}'`));
    return { W: await bundle(target, `${name}-academy`), R: await bundle(rw, `${name}-rewards`), dir, target };
  }
  if (file === REWARDS_LIB) return { W, R: await bundle(target, `${name}-rewards`), dir, target };
  return { W, R, dir, target };
}

const CONTROLS = [
  { name: 'skew', why: 'the draw uses Star odds three points above the printed ones', red: ['S2'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '    x -= pack.odds[t];', "    x -= pack.odds[t] + (t === 'star' ? 3 : 0);", 'tycoonRewards.ts')] },
  { name: 'nopity', why: 'the guarantee never fires', red: ['S3', 'S4', 'S11'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  const due = pack.guarantee !== null && dry >= pack.guarantee - 1;', '  const due = false && dry >= 0;', 'tycoonRewards.ts')] },
  { name: 'late', why: 'the guarantee fires one pack late', red: ['S3', 'S4', 'S11'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  const due = pack.guarantee !== null && dry >= pack.guarantee - 1;', '  const due = pack.guarantee !== null && dry >= pack.guarantee;', 'tycoonRewards.ts')] },
  { name: 'leak', why: 'opening a pack also earns a gem', red: ['S5'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '    spent: l.spent + priceOf(l, id),', '    spent: l.spent + priceOf(l, id),\n    earned: l.earned + 1,', 'tycoonRewards.ts')] },
  { name: 'reroll', why: 'a stored draw is dropped on load, so a reload loses the kid on the card', red: ['S13'], vRed: [4, 6, 9],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '    if (kid) out.pending = { seq: p.seq, pack: p.pack, tier: p.tier, kid };', '    out.pending = null;', 'tycoonRewards.ts')], vitest: 'TYCOON_PACKS_REWARDS' },
  { name: 'scoutdrift', why: 'the generator draws the position before the nation', red: ['S8'],
    lib: () => [ACADEMY_LIB, mustReplace(read(ACADEMY_LIB), '  const nation = NATIONS[Math.floor(rng() * NATIONS.length)];\n  const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];', '  const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];\n  const nation = NATIONS[Math.floor(rng() * NATIONS.length)];', 'wonderkidFactory.ts')] },
  { name: 'words', why: 'the panel tells you that you got lucky', red: ['S10'],
    panel: t => mustReplace(t, 'Welcome him in', 'You got lucky', 'PacksPanel.tsx') },
  { name: 'oddsliteral', why: 'the panel types a 9% of its own', red: ['S1'],
    panel: t => mustReplace(t, '<div className="text-[10px] uppercase tracking-wider text-muted-foreground">The odds</div>', '<div className="text-[10px] uppercase tracking-wider text-muted-foreground">The odds (Star 9%)</div>', 'PacksPanel.tsx') },
  { name: 'twowriters', why: 'a second file writes the ledger key', red: ['S10'],
    sources: list => [...list, { rel: 'src/components/tycoon/GemCheat.tsx', code: "localStorage.setItem('tycoonRewardsV1', '{}');" }] },
  { name: 'panelodds', why: 'the panel prints each odd one point higher than the table', red: [], vRed: [1], vitest: 'TYCOON_PACKS_PANEL',
    panelFile: t => mustReplace(t, '<span className="tabular-nums font-bold">{pack.odds[t.id]}%</span>', '<span className="tabular-nums font-bold">{pack.odds[t.id] + 1}%</span>', 'PacksPanel.tsx') },
  { name: 'freeprice', why: 'the first Scout Pack is not free after all', red: [], vRed: [2],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  return pack.firstFree && l.opened[id] === 0 ? 0 : pack.price;', '  return pack.price;', 'tycoonRewards.ts')], vitest: 'TYCOON_PACKS_REWARDS' },
  { name: 'tiercard', why: 'the card always calls the kid Grassroots', red: [], vRed: [3], vitest: 'TYCOON_PACKS_PANEL',
    panelFile: t => mustReplace(t, '<p data-tier-label className="mt-1 font-display text-lg font-black text-gold">{pendingTier.label}</p>', '<p data-tier-label className="mt-1 font-display text-lg font-black text-gold">{TIERS[0].label}</p>', 'PacksPanel.tsx') },
  { name: 'gemtap', why: 'a tap credits a win to the ledger', red: ['S10'], vRed: [5], vitest: 'TYCOON_LOADS_STADIUM_HOOK',
    hookFile: t => mustReplace(t, '    markSessionPlay();\n    const before = stateRef.current;\n    const after = tap(before);', "    markSessionPlay();\n    const before = stateRef.current;\n    recordFullTimes([{ totalMatches: Date.now(), result: 'win', away: false }]);\n    const after = tap(before);", 'useStadiumTycoon.ts') },
  { name: 'wavedaway', why: 'the card offers Welcome him in before he has a bed', red: [], vRed: [6, 10], vitest: 'TYCOON_PACKS_PANEL',
    panelFile: t => mustReplace(t, '          {delivered ? (', '          {true || delivered ? (', 'PacksPanel.tsx') },
  { name: 'seqreuse', why: 'a pack ignores the packs the academy already delivered', red: ['S13'], vRed: [7],
    lib: () => [REWARDS_LIB, mustReplace(mustReplace(read(REWARDS_LIB), '    nextSeq: Math.max(l.nextSeq, minSeq) + 1,', '    nextSeq: l.nextSeq + 1,', 'tycoonRewards.ts (next)'), '    pending: { seq: Math.max(l.nextSeq, minSeq), pack: id, tier, kid },', '    pending: { seq: l.nextSeq, pack: id, tier, kid },', 'tycoonRewards.ts (seq)')], vitest: 'TYCOON_PACKS_REWARDS' },
  { name: 'sameseed', why: 'a new ledger keeps the shared constant seed', red: ['S12'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  return stored ? l : { ...l, seed: freshSeed() };', '  return stored ? l : l;', 'tycoonRewards.ts')] },
  { name: 'forgetful', why: 'a pack is dismissed whether or not its kid reached a bed', red: ['S13'],
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  if (!l.pending || deliveredUpTo < l.pending.seq) return false;', '  if (!l.pending || deliveredUpTo < -1) return false;', 'tycoonRewards.ts')] },
  { name: 'dear', why: 'every pack costs four times as much', red: ['S15'],
    lib: () => [ACADEMY_LIB, ['30', '100', '250'].reduce((t, p) => mustReplace(t, `price: ${p}, firstFree:`, `price: ${Number(p) * 4}, firstFree:`, 'wonderkidFactory.ts'), read(ACADEMY_LIB))] },
  { name: 'rawkid', why: 'the reveal receives unvalidated kid fields from storage', red: [], vRed: [9], vitest: 'TYCOON_PACKS_REWARDS',
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '    const kid = cleanPackKid(p.kid, p.tier);', '    const kid = p.kid;', 'tycoonRewards.ts')] },
  { name: 'unsaveddelivery', why: 'an academy write refusal still counts the kid as delivered', red: [], vRed: [10], vitest: 'TYCOON_LOADS_ACADEMY_HOOK',
    lib: () => [ACADEMY_HOOK, mustReplace(read(ACADEMY_HOOK), '      setPackSaveBlocked(true);\n      return false;', '      setPackSaveBlocked(true);', 'useWonderkidFactory.ts')] },
  { name: 'unsaveddismiss', why: 'dismissal clears the pending draw despite a refused academy save', red: [], vRed: [11], vitest: 'TYCOON_LOADS_ACADEMY_HOOK',
    lib: () => [ACADEMY_HOOK, mustReplace(read(ACADEMY_HOOK), '    try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch {\n      setPackSaveBlocked(true);\n      return;\n    }', '    try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch {\n      setPackSaveBlocked(true);\n    }', 'useWonderkidFactory.ts')] },
  { name: 'unsaveddebit', why: 'opening accepts a ledger write refusal and delivers a kid without a durable debit', red: [], vRed: [12], vitest: 'TYCOON_PACKS_REWARDS',
    lib: () => [REWARDS_LIB, mustReplace(read(REWARDS_LIB), '  saveLedger(next, true);', '  saveLedger(next);', 'tycoonRewards.ts')] },
];
const SLOW = ['S15'];
for (const control of CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control: ${control.why}`);
  let W2 = W;
  let R2 = R;
  let dir = null;
  let target = null;
  if (control.lib) {
    const [file, text] = control.lib();
    ({ W: W2, R: R2, dir, target } = await libControl(control.name, file, text));
  } else if (control.panelFile) {
    ({ dir, target } = await libControl(control.name, PANEL, control.panelFile(read(PANEL))));
  } else if (control.hookFile) {
    ({ dir, target } = await libControl(control.name, STADIUM_HOOK, control.hookFile(read(STADIUM_HOOK))));
  }
  /* S15 takes a minute a run, so only the controls that aim at it or change a price pay for it. */
  const slow = control.red.includes('S15') || control.name === 'freeprice';
  const hookSource = control.hookFile ? control.hookFile(read(STADIUM_HOOK)) : null;
  const result = sections({
    ...inputs, W: W2, R: R2, T: slow ? T : null,
    panelSource: control.panel ? control.panel(inputs.panelSource) : control.panelFile ? control.panelFile(inputs.panelSource) : inputs.panelSource,
    sources: control.sources ? control.sources(inputs.sources)
      : hookSource ? inputs.sources.map(x => (x.rel === 'src/hooks/useStadiumTycoon.ts' ? { ...x, code: hookSource } : x)) : inputs.sources,
  });
  report(result, false);
  for (const sec of control.red) if (result.out[sec].length === 0) fail(`control ${control.name}: ${sec} stayed green, so that check is dead`);
  for (const sec of SECTIONS.filter(x => !control.red.includes(x) && (slow || !SLOW.includes(x)))) {
    if (result.out[sec].length > 0) fail(`control ${control.name}: ${sec} went red too (${result.out[sec][0]})`);
  }
  if (control.vRed) {
    const rows = runSuite({ [control.vitest]: target.split(path.sep).join('/') });
    if (!rows || rows.loadError) fail(`control ${control.name}: the vitest run did not load${rows?.loadError ? `:\n${rows.loadError}` : ''}`);
    else for (const row of rows) {
      const n = sectionOf(row.title);
      const want = control.vRed.includes(n) ? 'failed' : 'passed';
      console.log(`   ${row.status === want ? 'ok  ' : 'BAD '} ${row.status.padEnd(6)} ${row.title}`);
      if (row.status !== want) fail(`control ${control.name}: vitest "${row.title}" ${want === 'failed' ? 'stayed green' : `went red (${detail(row.messages)})`}`);
      else if (want === 'failed') console.log(`         measured: ${detail(row.messages)}`);
    }
  }
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonPacks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonPacks: green.');
console.log('   The odds printed are the odds drawn, the guarantees keep their word, and only results earn gems.');
console.log('   A draw is stored before it is shown and delivered once; scouting did not move; no gambling words or shapes.');
console.log(`   All ${CONTROLS.length} controls fired exactly where they should.`);
