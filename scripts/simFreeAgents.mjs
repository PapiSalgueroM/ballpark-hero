/* Round 619: free agents and contract termination in Club Manager.
 *
 * Contract: docs/design/round-619-free-agents-contract.md, from the owner's
 * footer report.
 *
 * WHAT THIS HARNESS IS FOR. The round has one claim it lives or dies on:
 * ending a contract must COST. wageBill reduced over state.squad alone before
 * this round, so a released man's wage left the bill the instant he left the
 * squad, the cap loosened on every release, and sacking your worst contracts
 * would have beaten selling them or playing them. Section 1 is therefore the
 * section that proves the round. Section 2 proves the settlement is sized as
 * the design says: about half of what keeping him would have cost, over the
 * weeks his deal had left (capped at two seasons), both as cap room and as
 * money. A settlement cut from 108 weeks to 16 is exactly the kind of release
 * that starts beating keeping, and section 2 is what goes red on it.
 *
 * Sections 11 to 15 came out of the adversarial review of the first build:
 * a release has to leave the squad the way every other exit does, nobody can
 * be in the squad and the pool at once, a new save needs free agents that are
 * made up rather than real men moved off real clubs, the projection has to
 * bill a settlement only for the weeks it has left, and the contracts card has
 * to agree with the engine on every button it shows.
 *
 * House rules as everywhere: never assert on a maximum, never assert non
 * significance, bands from measured headroom, and a control per check that
 * provably fires. Every control asserts its anchor appears EXACTLY once in the
 * line ending normalised source before it rewrites it. Each turns exactly the
 * checks listed red and nothing else; the three that reach several sections
 * break something those sections all genuinely depend on (no settlement at
 * all, a bill blind to settlements, interest switched off).
 *
 * CONTROLS (FA_CONTROL=name):
 *   nosev          a release writes no settlement                    -> sections 1, 2, 7 and 8
 *   billblind      the wage bill ignores settlements                 -> sections 1, 2 and 14
 *   shortsev       settlements capped at 0.3 seasons, not 2          -> section 2
 *   openall        startNegotiation stops checking the window        -> section 3
 *   offeropen      makeOffer stops checking the window               -> section 3
 *   bidopen        acceptBid stops checking the window               -> section 3
 *   keenall        every free agent will sign for anyone             -> sections 4 and 9
 *   nodecay        the pool never ages out                           -> section 4
 *   nodecaywire    the rollover skips the decay                      -> section 4
 *   nodedupe       the pool accepts a duplicate                      -> section 5
 *   noretired      a retired name can enter the pool                 -> section 5
 *   stalekeep      an old pool record survives a fresh release       -> section 5
 *   nomigrate      an old save's settlement list is not repaired     -> section 6
 *   nanbill        the bill of an unrepaired save is not a number    -> section 6
 *   weekkey        the week keyed countdown guard is back            -> section 7
 *   tickwild       a week is counted off twice                       -> section 7
 *   countfirst     the countdown runs before the week is charged     -> section 7
 *   resignnow      a man whose deal ran out comes straight back      -> section 9
 *   resignreleased a man you released comes back a season later      -> section 9
 *   livefree       a release works with a match paused               -> section 11
 *   gkfree         a release skips the shared squad rules            -> section 11
 *   refsleft       a release leaves his XI slot, jobs and bids       -> section 11
 *   buykeeps       a man bought off the market stays in the pool     -> section 12
 *   fillkeeps      a man the summer fill signed stays in the pool    -> section 12
 *   fillreleased   the summer fill signs a man you released          -> section 12
 *   faid           signFreeAgent builds ids that can repeat          -> section 12
 *   nojourneymen   the pool is never topped up                       -> section 13
 *   goodjourneymen journeymen rated above the club's level           -> section 13
 *   unflagged      journeymen not flagged as made up                 -> section 13
 *   realname       a journeyman wears a real player's name           -> section 13
 *   novalue        journeymen carry no value, so wages come out wild -> section 13
 *   projall        the projection bills a settlement all season      -> section 14
 *   cardrelease    the card ignores the engine's release refusal     -> section 15
 *   cardsign       the card ignores the engine's signing refusal     -> section 15
 *   termsdrift     a signing commits a wage the card did not quote   -> section 15
 *   onetap         Release fires on the first tap                    -> section 15
 */

import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.FA_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* Walk up for the binary so this runs from a worktree too, which the harnesses
   that hardcode ROOT/node_modules cannot. The same walk finds node_modules for
   React, which the card render in section 15 bundles. */
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
const ESBUILD = findEsbuild();
const NM = path.dirname(path.dirname(ESBUILD)).replaceAll('\\', '/');

/* Per run temp dir: concurrent runs sharing a fixed name have silently mixed
   two source trees in this repo. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'freeagents-'));
const TMP_URL = TMP.replaceAll('\\', '/');
const BUNDLE = path.join(TMP, 'bundle.cjs');

const lf = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replaceAll('\r\n', '\n');
const sources = {
  engine: lf('src/lib/clubManager.ts'),
  fin: lf('src/lib/clubManagerFinances.ts'),
  card: lf('src/components/club-manager/ContractsCard.tsx'),
};

/* Every control asserts its anchor exists EXACTLY ONCE before it edits, so a
   control that matches nothing (or the wrong one of two) cannot leave this
   green for the wrong reason. */
function rewrite(which, file, anchor, replacement) {
  const count = sources[file].split(anchor).length - 1;
  if (count !== 1) {
    console.log(`   FAIL control ${which} anchor appears ${count} times in ${file}, so it would not change exactly one thing`);
    process.exit(1);
  }
  sources[file] = sources[file].replace(anchor, () => replacement);
  console.log(`   [control ${which} applied to ${file}]`);
}

const COUNTDOWN = '  if (state.severance && state.severance.length) {\n    state.severance = state.severance\n      .map(r => ({ ...r, weeksLeft: r.weeksLeft - 1 }))\n      .filter(r => r.weeksLeft > 0);\n  }\n';

if (CONTROL === 'nosev') {
  rewrite('nosev', 'engine',
    "severance: [...(career.severance ?? []), { name: p.name, weekly: sev.weekly, weeksLeft: sev.weeksLeft }],",
    'severance: [...(career.severance ?? [])],');
} else if (CONTROL === 'billblind') {
  rewrite('billblind', 'engine',
    'return career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0) + severanceBill(career);',
    'return career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0);');
} else if (CONTROL === 'shortsev') {
  rewrite('shortsev', 'engine',
    'export const SEVERANCE_CAP_SEASONS = 2;',
    'export const SEVERANCE_CAP_SEASONS = 0.3;');
} else if (CONTROL === 'openall') {
  rewrite('openall', 'engine',
    'export function startNegotiation(career: CareerState, mp: MarketPlayer): CareerState | null {\n  if (career.transferWindow === null) return null;',
    'export function startNegotiation(career: CareerState, mp: MarketPlayer): CareerState | null {\n  if (false) return null;');
} else if (CONTROL === 'offeropen') {
  rewrite('offeropen', 'engine',
    "  if (neg.phase === 'terms') return null;\n  if (career.transferWindow === null) return null;",
    "  if (neg.phase === 'terms') return null;\n  if (false) return null;");
} else if (CONTROL === 'bidopen') {
  rewrite('bidopen', 'engine',
    '  if (!bid) return null;\n  if (career.transferWindow === null) return null;',
    '  if (!bid) return null;\n  if (false) return null;');
} else if (CONTROL === 'keenall') {
  rewrite('keenall', 'engine',
    '  return fa.rating <= mine - 6;',
    '  return true;');
} else if (CONTROL === 'nodecay') {
  rewrite('nodecay', 'engine',
    '.filter(f => !gone.has(f.name) && nextSeason - f.since < 2)',
    '.filter(f => !gone.has(f.name))');
} else if (CONTROL === 'nodecaywire') {
  rewrite('nodecaywire', 'engine',
    'const carried = decayFreeAgents(career.freeAgents ?? [], career.season + 1, gone);',
    'const carried = career.freeAgents ?? [];');
} else if (CONTROL === 'nodedupe') {
  rewrite('nodedupe', 'engine',
    '  return [...pool.filter(x => x.name !== fa.name), fa];',
    '  return [...pool, fa];');
} else if (CONTROL === 'noretired') {
  rewrite('noretired', 'engine',
    '  if ((state.retiredNames ?? []).includes(fa.name)) return pool;\n',
    '');
} else if (CONTROL === 'stalekeep') {
  rewrite('stalekeep', 'engine',
    '  return [...pool.filter(x => x.name !== fa.name), fa];',
    '  if (pool.some(x => x.name === fa.name)) return pool;\n  return [...pool.filter(x => x.name !== fa.name), fa];');
} else if (CONTROL === 'nomigrate') {
  rewrite('nomigrate', 'engine',
    '  if (fresh) state.freeAgents = [];\n  if (!Array.isArray(state.severance)) state.severance = [];',
    '  if (false) state.severance = [];');
} else if (CONTROL === 'nanbill') {
  rewrite('nanbill', 'engine',
    'return (career.severance ?? []).reduce((s, r) => s + r.weekly, 0);',
    'return career.severance ? career.severance.reduce((s, r) => s + r.weekly, 0) : NaN;');
} else if (CONTROL === 'weekkey') {
  /* The second draft's guard, exactly: count down only when the week has
     moved on since the last countdown. It is the real drift the review found. */
  rewrite('weekkey', 'engine',
    '  if (state.severance && state.severance.length) {\n    state.severance = state.severance',
    '  if (state.severance && state.severance.length && (state as { k619?: number }).k619 !== state.week) {\n    (state as { k619?: number }).k619 = state.week;\n    state.severance = state.severance');
} else if (CONTROL === 'tickwild') {
  rewrite('tickwild', 'engine',
    '      .map(r => ({ ...r, weeksLeft: r.weeksLeft - 1 }))\n      .filter(r => r.weeksLeft > 0);\n  }\n  /* Round 471',
    '      .map(r => ({ ...r, weeksLeft: r.weeksLeft - 2 }))\n      .filter(r => r.weeksLeft > 0);\n  }\n  /* Round 471');
} else if (CONTROL === 'countfirst') {
  rewrite('countfirst', 'engine', COUNTDOWN, '');
  rewrite('countfirst', 'engine',
    '  tickFacilities(state);\n  tickBooks(state);',
    `${COUNTDOWN}  tickFacilities(state);\n  tickBooks(state);`);
} else if (CONTROL === 'resignnow') {
  rewrite('resignnow', 'engine',
    "  if (fa.fromMyClub && fa.since === career.season) return 'justLeft';",
    "  if (false) return 'justLeft';");
} else if (CONTROL === 'resignreleased') {
  rewrite('resignreleased', 'engine',
    "  if (releasedByYou(fa)) return 'releasedByYou';",
    "  if (false) return 'releasedByYou';");
} else if (CONTROL === 'livefree') {
  rewrite('livefree', 'engine',
    "  if (career.live) return 'midMatch';",
    "  if (false) return 'midMatch';");
} else if (CONTROL === 'gkfree') {
  rewrite('gkfree', 'engine',
    '  if (!canLeaveSquad(career, p)) {\n    /* canLeaveSquad is the gate.',
    '  if (false) {\n    /* canLeaveSquad is the gate.');
} else if (CONTROL === 'refsleft') {
  rewrite('refsleft', 'engine',
    '    xiIds: career.xiIds.map(id => (id === playerId ? null : id)),\n    setPieces: setPiecesWithout(career.setPieces, playerId),\n    incomingBids: (career.incomingBids ?? []).filter(b => b.playerId !== playerId),\n    severance: [...(career.severance ?? []), { name: p.name, weekly: sev.weekly, weeksLeft: sev.weeksLeft }],',
    '    severance: [...(career.severance ?? []), { name: p.name, weekly: sev.weekly, weeksLeft: sev.weeksLeft }],');
} else if (CONTROL === 'buykeeps') {
  rewrite('buykeeps', 'engine',
    '    freeAgents: (career.freeAgents ?? []).filter(f => f.name !== mp.name),\n',
    '');
} else if (CONTROL === 'fillkeeps') {
  rewrite('fillkeeps', 'engine',
    '      return out.filter(f => !inSquad.has(f.name));',
    '      return out;');
} else if (CONTROL === 'fillreleased') {
  rewrite('fillreleased', 'engine',
    '  const letGo = new Set(realPool.filter(releasedByYou).map(f => f.name));',
    '  const letGo = new Set<string>();');
} else if (CONTROL === 'faid') {
  rewrite('faid', 'engine',
    '    id: freeSquadId(career.squad, `fa-${slug(fa.name)}-s${career.season}`),',
    '    id: `fa-${slug(fa.name)}-s${career.season}`,');
} else if (CONTROL === 'nojourneymen') {
  rewrite('nojourneymen', 'engine',
    '  if (have >= FREE_AGENT_POOL_TARGET) return;',
    '  return;');
} else if (CONTROL === 'goodjourneymen') {
  rewrite('goodjourneymen', 'engine',
    '    const rating = clamp(Math.round(level) - cInt(`${seed}|r`, 20, 26), 40, 99);',
    '    const rating = clamp(Math.round(level) + 2, 40, 99);');
} else if (CONTROL === 'unflagged') {
  rewrite('unflagged', 'engine',
    '      generated: true,\n      since: state.season,',
    '      since: state.season,');
} else if (CONTROL === 'novalue') {
  rewrite('novalue', 'engine',
    '      value: squadScaledValue(state.squad, rating, age),',
    '      value: undefined,');
} else if (CONTROL === 'projall') {
  rewrite('projall', 'fin',
    '  const wagesLeft = round2((squadWeekly * weeksLeft + settlementsLeft) / 1000);',
    '  const wagesLeft = round2((wageBill(state) / 1000) * weeksLeft);');
} else if (CONTROL === 'cardrelease') {
  rewrite('cardrelease', 'card',
    '              const block = releaseBlock(career, p);',
    '              const block = null as ReleaseBlock | null;');
} else if (CONTROL === 'cardsign') {
  rewrite('cardsign', 'card',
    '              const block = freeAgentBlock(career, f);',
    '              const block = null as FreeAgentBlock | null;');
} else if (CONTROL === 'termsdrift') {
  rewrite('termsdrift', 'engine',
    '  const { wage, years } = freeAgentTerms(fa);',
    '  const { wage, years } = { wage: freeAgentTerms(fa).wage + 1, years: freeAgentTerms(fa).years };');
} else if (CONTROL === 'onetap') {
  rewrite('onetap', 'card',
    '                      onClick={() => setConfirmId(confirming ? null : p.id)}',
    '                      onClick={() => onRelease(p.id)}');
} else if (CONTROL === 'realname') {
  /* Filled in below, once the real names are loaded: the control needs a real
     name nothing in this world already uses, or the used set re-rolls it. */
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const SRC = `${TMP_URL}/clubManager.ts`;
const FIN = `${TMP_URL}/clubManagerFinances.ts`;
const CARD = `${TMP_URL}/ContractsCard.tsx`;

/* The finance module and the card import the engine through the alias, which
   would be the untouched file on disk. Pointing both at the rewritten copy
   keeps one engine behind everything this harness calls, so a card control
   and an engine control are measured against the same rules. */
const toEngine = (s) => s.replaceAll("from '@/lib/clubManager'", `from '${SRC}'`);

function bundle(outfile) {
  fs.writeFileSync(SRC, sources.engine);
  fs.writeFileSync(FIN, toEngine(sources.fin));
  fs.writeFileSync(CARD, toEngine(sources.card));
  fs.writeFileSync(path.join(TMP, 'entry.mjs'), `
export * as cm from '${SRC}';
export * as fin from '${FIN}';
export { ContractsCard } from '${CARD}';
export { HISTORIC_ROSTERS } from '${ROOT_URL}/src/lib/clubManagerEras.ts';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
  execSync(`"${ESBUILD}" "${path.join(TMP, 'entry.mjs')}" --bundle --format=cjs --platform=node --jsx=automatic --outfile="${outfile}" --alias:@=${JSON.stringify(`${ROOT_URL}/src`)} --log-level=error`, {
    stdio: 'pipe',
    env: { ...process.env, NODE_PATH: NM },
  });
}

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

if (CONTROL === 'realname') {
  /* The control needs a real name that nothing in this world already uses,
     or the used set re-rolls it away and the control changes nothing: a man
     from a historic era who is not in the 2026 rosters. Read off a first
     bundle of the untouched source, written to its own file so the require
     cache cannot hand it back as the real bundle. */
  const PRE = path.join(TMP, 'pre.cjs');
  bundle(PRE);
  const pre = createRequire(import.meta.url)(PRE);
  const now = new Set(Object.values(pre.cm.CM_ROSTERS).flat().map(p => p.n));
  const realName = Object.values(pre.HISTORIC_ROSTERS).flatMap(w => Object.values(w).flat()).map(p => p.n).find(n => !now.has(n));
  if (!realName) { console.log('   FAIL control realname found no historic name outside the 2026 world'); process.exit(1); }
  rewrite('realname', 'engine',
    '    let name = makeGeneratedName(seed);\n    for (let j = 1; used.has(name) && j < 25; j++)',
    `    let name = ${JSON.stringify(realName)};\n    for (let j = 1; used.has(name) && j < 25; j++)`);
}

bundle(BUNDLE);
const { cm, fin, ContractsCard, HISTORIC_ROSTERS, render } = createRequire(import.meta.url)(BUNDLE);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const CLUBS = ['Everton', 'Brentford', 'Napoli', 'Ajax', 'Arsenal'];
const REAL_NAMES = new Set([
  ...Object.values(cm.CM_ROSTERS).flat().map(p => p.n),
  ...Object.values(HISTORIC_ROSTERS).flatMap(w => Object.values(w).flat()).map(p => p.n),
]);

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const real = Math.random;
const seeded = (seed, fn) => { Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const seniorsOf = (st) => st.squad.filter(p => !p.isYouth && p.age >= 20);

/** The worst contract on the books: what an exploiting manager would sack. */
const worstContract = (st) => st.squad
  .filter(p => !p.onLoan && !p.isYouth && p.age >= 20)
  .slice()
  .sort((a, b) => (b.wage ?? 0) / Math.max(1, b.rating) - (a.wage ?? 0) / Math.max(1, a.rating))[0];

console.log('simFreeAgents');
console.log(`   ${CLUBS.length} clubs${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) THE SECTION THAT PROVES THE ROUND ═══════════════ */
console.log('1) ending a contract costs, and the wage bill still sees it');
{
  const drops = [];
  const kept = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(4000 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const p = worstContract(st);
      if (!p) return;
      const before = cm.wageBill(st);
      const wage = p.wage ?? 0;
      const after = cm.releasePlayer(st, p.id);
      if (!after) { fail(`${CLUBS[i]}: could not release the worst contract at all`); return; }
      const now = cm.wageBill(after);
      /* How much of his wage actually left the bill. 1 means the release was
         free, 0 means it cost exactly what he cost. */
      drops.push((before - now) / Math.max(1, wage));
      kept.push(cm.severanceBill(after) / Math.max(1, wage));
    });
  }
  if (drops.length < 3) fail(`only ${drops.length} clubs produced a release to measure`);
  console.log(`   of the released wage, ${(mean(drops) * 100).toFixed(1)}% left the bill and ${(mean(kept) * 100).toFixed(1)}% stayed as a settlement`);
  if (!(mean(drops) < 0.75)) {
    fail(`releasing a man removed ${(mean(drops) * 100).toFixed(1)}% of his wage from the bill, so termination is close to free (ceiling 75%)`);
  } else {
    ok(`a release keeps ${(mean(kept) * 100).toFixed(1)}% of the wage on the books as a settlement`);
  }
  if (!(mean(kept) > 0.2)) fail(`the settlement is only ${(mean(kept) * 100).toFixed(1)}% of the wage, which is not a cost (floor 20%)`);
  else ok(`the settlement is a real liability, not a token`);
}

/* ═══════════════ 2) and it is sized so releasing does not beat keeping ═══════════════ */
console.log('2) sacking the worst contracts does not beat keeping them');
{
  /* TWO MEASUREMENTS, because the first draft had only one and it could not
     see the thing that matters. Cap room freed straight after a release is the
     WEEKLY half of the cost and reads the same whatever the settlement's
     length: cut a 108 week settlement to 16 and it still printed 49.6%, and
     every section stayed green while a release cost about 15% of what keeping
     the man would have. So the second measurement is the whole settlement,
     weekly times weeks, against what keeping him would have cost over the
     weeks his deal had left, worked out here off the state rather than read
     back from severanceFor, so the helper cannot mark its own homework. */
  const capHeadroom = (st) => (st.wageCap ?? cm.wageCapFrom(cm.wageBill(st))) - cm.wageBill(st);
  const ratios = [];
  const shares = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(4200 + i, () => {
      const base = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(base);
      const before = capHeadroom(base);
      let st = base;
      let wagesOut = 0;
      for (let k = 0; k < 2; k += 1) {
        const p = worstContract(st);
        if (!p) break;
        const next = cm.releasePlayer(st, p.id);
        if (!next) break;
        const wage = p.wage ?? 0;
        wagesOut += wage;
        const seasonWeeks = st.calendar.length;
        const remaining = (seasonWeeks - st.week) + Math.max(0, (p.contractYears ?? 1) - 1) * seasonWeeks;
        const keepingCost = wage * Math.min(remaining, 2 * seasonWeeks);
        const row = next.severance[next.severance.length - 1];
        if (row && keepingCost > 0) shares.push((row.weekly * row.weeksLeft) / keepingCost);
        st = next;
      }
      if (wagesOut > 0) ratios.push((capHeadroom(st) - before) / wagesOut);
    });
  }
  if (ratios.length < 3) fail(`only ${ratios.length} clubs produced two releases to measure`);
  console.log(`   of the wages sacked, ${(mean(ratios) * 100).toFixed(1)}% came back as cap headroom`);
  /* Ceiling from the mechanism rather than taste: the settlement rate is half,
     so a correct engine returns about half and anything near all of it means
     the liability is not being counted. */
  if (!(mean(ratios) < 0.75)) {
    fail(`sacking returned ${(mean(ratios) * 100).toFixed(1)}% of the wages as cap room, so the release button is a way to buy space (ceiling 75%)`);
  } else {
    ok(`sacking returns only ${(mean(ratios) * 100).toFixed(1)}% of the wages as cap room (ceiling 75%)`);
  }
  /* Floor from the mechanism too: half the wage for every week he was owed
     reads about 0.5 (a touch over, because the weekly figure rounds up), and a
     settlement that ends early is what drags it down. */
  console.log(`   over ${shares.length} releases, the settlement is ${(mean(shares) * 100).toFixed(1)}% of what keeping the man would have cost`);
  if (shares.length < 6) fail(`only ${shares.length} releases produced a settlement to size`);
  else if (!(mean(shares) > 0.4)) {
    fail(`a settlement is only ${(mean(shares) * 100).toFixed(1)}% of what keeping him would have cost, so releasing beats keeping (floor 40%)`);
  } else {
    ok(`a settlement costs ${(mean(shares) * 100).toFixed(1)}% of keeping him over the rest of his deal (floor 40%)`);
  }
}

/* ═══════════════ 3) the window bypass is exactly one door wide ═══════════════ */
console.log('3) a free agent signs out of window, and nothing else does');
{
  /* EACH PROBE MUST WORK WITH THE WINDOW OPEN FIRST. The first draft called
     makeOffer with no negotiation and acceptBid with no bid, so both returned
     null for reasons that had nothing to do with the window, and deleting
     either window guard left this section green. Now every door is opened
     with the window open (and must open), then tried again with only the
     window changed (and must stay shut). */
  const st = seeded(4400, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const open = { ...st, transferWindow: 'summer', windowWeeksLeft: 4 };
  const shut = { ...st, transferWindow: null, windowWeeksLeft: 0 };
  const mp = { name: 'Window Probe', club: 'Probe Town', position: 'MID', age: 25, rating: 70, price: 10 };
  const negotiating = seeded(4401, () => cm.startNegotiation(open, mp));
  const seller = st.squad.find(p => !p.onLoan && p.position !== 'GK' && cm.canLeaveSquad(st, p));
  const bid = seller ? { playerId: seller.id, playerName: seller.name, club: 'Probe Town', offer: 5, status: 'open' } : null;
  const doors = [
    ['startNegotiation', () => cm.startNegotiation(open, mp), () => cm.startNegotiation(shut, mp)],
    ['makeOffer', () => negotiating && cm.makeOffer(negotiating, 1), () => negotiating && cm.makeOffer({ ...negotiating, transferWindow: null, windowWeeksLeft: 0 }, 1)],
    ['acceptBid', () => bid && cm.acceptBid({ ...open, incomingBids: [bid] }, seller.id), () => bid && cm.acceptBid({ ...shut, incomingBids: [bid] }, seller.id)],
  ];
  let openDoors = 0;
  let blind = 0;
  for (const [name, withOpen, withShut] of doors) {
    const a = seeded(4402, () => { try { return withOpen(); } catch { return null; } });
    if (!a) { blind += 1; fail(`${name} refuses even with the window open, so it cannot show the window doing anything`); continue; }
    const b = seeded(4402, () => { try { return withShut(); } catch { return null; } });
    if (b) { openDoors += 1; fail(`${name} still works with the window shut, so the bypass is wider than one door`); }
  }
  if (!openDoors && !blind) ok(`all ${doors.length} transfer paths work with the window open and refuse with it shut`);

  /* And the one door that must be open. */
  const pool = [{ name: 'Free Man', position: 'MID', age: 27, rating: 60, since: shut.season, reason: 'expired' }];
  const withPool = { ...shut, freeAgents: pool };
  const signed = cm.signFreeAgent(withPool, 'Free Man');
  if (!signed) fail('a free agent cannot be signed with the window shut, which is the one thing this round is for');
  else if (!signed.squad.some(p => p.name === 'Free Man')) fail('signFreeAgent returned a state without the man in it');
  else if ((signed.freeAgents ?? []).some(f => f.name === 'Free Man')) fail('the man is in the squad AND still in the pool');
  else ok('a free agent signs with the window shut, and leaves the pool when he does');
}

/* ═══════════════ 4) the pool is not a free upgrade rack ═══════════════ */
console.log('4) the pool stays weak and clears itself out');
{
  const st = seeded(4600, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const level = st.clubStrengths[st.clubName];
  /* THE CAP IS LIFTED, so interest is the only rule that can refuse him. The
     first draft left it in place, the 95 rated man's wage blew through it, and
     making every free agent keen left this check green. The weak twin must
     sign in the same conditions, or the refusal proves nothing. */
  const lifted = { ...st, wageCap: Number.MAX_SAFE_INTEGER };
  const star = { name: 'Superstar', position: 'ST', age: 26, rating: 95, value: 1, since: st.season - 1, reason: 'unattached' };
  const journeyman = { ...star, name: 'Journeyman', rating: Math.floor(level) - 10 };
  if (!cm.signFreeAgent({ ...lifted, freeAgents: [journeyman] }, 'Journeyman')) {
    fail('a weak free agent is refused with the cap lifted, so the refusal of a strong one cannot be pinned on interest');
  } else if (cm.signFreeAgent({ ...lifted, freeAgents: [star] }, 'Superstar')) {
    fail('a 95 rated free agent signs for a mid table club, so the pool is a free upgrade rack');
  } else {
    ok('a far better player than the club refuses to sign, and a weak one in the same spot signs');
  }
  /* And it decays rather than piling up. Two seasons and an unsigned man is
     gone, so a save cannot accumulate a bench of good free agents. */
  const poolNow = [
    { name: 'Fresh', position: 'MID', age: 27, rating: 70, since: 5, reason: 'expired' },
    { name: 'Stale', position: 'MID', age: 30, rating: 70, since: 3, reason: 'expired' },
    { name: 'Dead', position: 'GK', age: 36, rating: 66, since: 5, reason: 'expired' },
  ];
  const after = cm.decayFreeAgents(poolNow, 6, new Set(['Dead']));
  const names = after.map(f => f.name);
  if (names.includes('Stale')) fail('a free agent unsigned for three seasons is still in the pool');
  else if (!names.includes('Fresh')) fail('a man who has been free for one season was dropped too early');
  else if (names.includes('Dead')) fail('a retired man survived the summer in the pool');
  else ok(`the pool ages out: kept ${names.join(', ')}, dropped Stale and Dead`);
  const fresh = after.find(f => f.name === 'Fresh');
  if (!(fresh && fresh.rating === 69 && fresh.age === 28)) {
    fail(`an unsigned free agent does not decay: expected 69 rated and 28, got ${fresh ? `${fresh.rating} and ${fresh.age}` : 'nothing'}`);
  } else {
    ok('an unsigned man loses a year and a rating point over the summer');
  }
  /* AND THE ROLLOVER ACTUALLY CALLS IT. The first draft tested the exported
     function alone, with a note saying the rollover could not be driven from a
     synthetic state. It can: startNextSeason runs on a startCareer state. This
     one asks only whether the summer runs the decay at all (the man ages),
     because which men the decay keeps is the check above. */
  const st2 = seeded(4610, () => cm.startCareer('Everton'));
  st2.freeAgents = [
    { name: 'Fresh Probe', position: 'CM', age: 27, rating: 60, since: st2.season, reason: 'expired' },
  ];
  const n = seeded(4611, () => cm.startNextSeason(st2));
  const fp = (n.freeAgents ?? []).find(f => f.name === 'Fresh Probe');
  if (!(fp && fp.rating === 59 && fp.age === 28)) fail(`a real rollover did not run the decay: Fresh Probe came out ${fp ? `${fp.rating} rated and ${fp.age}` : 'missing'}, expected 59 and 28`);
  else ok('a real rollover runs the decay over the pool');
}

/* ═══════════════ 5) the pool cannot hold a duplicate or a dead man ═══════════════ */
console.log('5) no duplicates, and nobody who retired');
{
  const st = seeded(4800, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player to test with');
  else {
    const once = cm.releasePlayer(st, p.id);
    if (!once) fail('could not release');
    else {
      /* OFFER THE DUPLICATE, do not just count the pool after one release.
         The first draft released one man and asserted his one name appeared
         once, which is true of any list built by one push: addFreeAgent's
         dedupe was never reached, and deleting it outright left this section
         entirely green. A check the control cannot break is not checking
         anything.

         So put him back in the squad under a new id, the way a man who walked
         free and came back would arrive, and release him a second time. */
      const back = {
        ...once,
        squad: [...once.squad, { ...p, id: `${p.id}-again` }],
      };
      const twice = cm.releasePlayer(back, `${p.id}-again`);
      const names = ((twice ?? once).freeAgents ?? []).map(f => f.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      if (!twice) {
        fail('releasing a man whose name is already in the pool returned null, so the second release is refused rather than deduped');
      } else if (dupes.length) {
        fail(`the pool holds duplicates after the same man was offered twice: ${dupes.slice(0, 3).join(', ')}`);
      } else {
        ok(`the same man offered to the pool twice appears once (pool holds ${names.length})`);
      }
      /* A retired name can never enter. RELEASED FROM A SQUAD THAT CAN SPARE
         HIM. The first draft released Ghost from `once`, which sat on the
         senior floor, so the release itself was refused and the check printed
         ok without addFreeAgent ever running. A refusal now fails. */
      const withRetired = { ...back, retiredNames: [...(back.retiredNames ?? []), 'Ghost'] };
      const q = withRetired.squad.find(x => !x.isYouth && x.age >= 20 && !x.onLoan && x.position !== 'GK' && x.id !== `${p.id}-again`);
      if (!q) fail('no senior to rename Ghost');
      else {
        const after = cm.releasePlayer({ ...withRetired, squad: withRetired.squad.map(x => (x.id === q.id ? { ...x, name: 'Ghost' } : x)) }, q.id);
        if (!after) fail('the Ghost release was refused, so the retired name guard was never reached');
        else if ((after.freeAgents ?? []).some(f => f.name === 'Ghost')) fail('a retired name entered the free agent pool');
        else ok('a retired name cannot enter the pool, on a release that went through');
      }
      /* A FRESH RELEASE REPLACES AN OLD RECORD. The first build kept whatever
         record the pool already had for the name, so a man with a stale row
         (not from my club, an old season) kept it through a new release and
         signFreeAgent took him straight back while his new settlement ran. */
      const stale = {
        ...back,
        freeAgents: [...(back.freeAgents ?? []).filter(f => f.name !== p.name),
          { name: p.name, position: p.position, age: p.age, rating: p.rating, value: p.value, since: back.season - 1, reason: 'unattached' }],
      };
      const again = cm.releasePlayer(stale, `${p.id}-again`);
      const records = (again?.freeAgents ?? []).filter(f => f.name === p.name);
      if (!again) fail('the release over a stale record was refused, so the record rule was never reached');
      else if (!records.some(f => f.reason === 'released' && f.fromMyClub === true && f.since === again.season)) {
        fail(`a fresh release left the old record in charge (${records.map(f => `${f.reason} since ${f.since}`).join(', ') || 'none'}), so he can be signed straight back`);
      } else {
        ok('a fresh release replaces a stale record for the same man');
      }
    }
  }
}

/* ═══════════════ 6) a save written before this round still loads ═══════════════ */
console.log('6) an old save opens and plays on');
{
  /* READ BEFORE ANYTHING REPAIRS IT, then played. The first draft repaired the
     save and then read the bill, which reads the same with or without the
     repair, and its check was `bill <= 0`, which a NaN passes. The card reads
     wageBill the moment a save loads, before any week is played, so that is
     where a missing list has to be survivable. The leftover field from the
     second draft (severanceTickedWeek) rides along, because real saves carry
     it and it must be harmless. */
  const st = seeded(5000, () => cm.startCareer('Everton'));
  const old = clone(st);
  delete old.freeAgents;
  delete old.severance;
  old.severanceTickedWeek = old.week;
  const bill = cm.wageBill(old);
  if (!Number.isFinite(bill) || bill <= 0) fail(`the wage bill of an old save is not a real number before it is repaired (${bill})`);
  else ok(`an old save's wage bill reads ${bill} thousand before anything repairs it`);
  const r = seeded(5001, () => cm.playNextEntry(old, { skipHalftime: true }));
  if (!Array.isArray(r.state.freeAgents) || !Array.isArray(r.state.severance)) {
    fail('an old save is not repaired on its first week, so every screen that reads the two lists breaks');
  } else if (!(r.state.week > old.week)) {
    fail(`an old save did not play on: week ${old.week} became ${r.state.week}`);
  } else {
    ok('an old save plays a week and comes out with both lists');
  }
}

/* ═══════════════ 7) THE CLOCK ═══════════════ */
console.log('7) one week billed is one week counted off the settlement');
{
  /* MEASURED PER WEEK CHARGED, NOT PER CALL. Two earlier drafts divided the
     countdown by playNextEntry calls, and one call can run several calendar
     entries (a window week, the weeks somebody else plays), each charged by
     tickBooks. That read the correct engine as counting 1.25 a week, so a
     week keyed guard went in to "fix" it, and the guard then skipped the
     countdown whenever a bye came before a match: 73 weeks charged against a
     54 week quote at Everton. books.season.weeks goes up once per charge, so
     it is the clock the countdown has to keep. */
  const st = seeded(6000, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player');
  else {
    const quoted = cm.severanceFor(st, p).weeksLeft;
    let s2 = cm.releasePlayer(st, p.id);
    const left = (s) => (s.severance ?? []).find(r => r.name === p.name)?.weeksLeft ?? 0;
    if (!s2) fail('could not release');
    else {
      let charges = 0;
      let counted = 0;
      let calls = 0;
      seeded(6001, () => {
        while (calls < 40 && left(s2) > 0) {
          const weeksBefore = s2.books?.season?.weeks ?? 0;
          const leftBefore = left(s2);
          const r = cm.playNextEntry(s2, { skipHalftime: true });
          if (r.kind === 'seasonOver' || r.state.season !== s2.season) break;
          /* The call that clears the row is left out: it can charge weeks after
             the row has gone (a window week and a bye in the same call), and
             those are not weeks the settlement was running. */
          if (left(r.state) === 0) break;
          charges += (r.state.books?.season?.weeks ?? 0) - weeksBefore;
          counted += leftBefore - left(r.state);
          s2 = r.state;
          calls += 1;
          if (s2.sacked) break;
        }
      });
      const rate = counted / Math.max(1, charges);
      console.log(`   ${calls} calls charged ${charges} weeks and counted ${counted} off a quote of ${quoted}: ${rate.toFixed(2)} counted per week charged`);
      if (charges < 8) {
        fail(`only ${charges} weeks were charged, too few to measure the rate`);
      } else if (rate > 1.05) {
        fail(`the settlement counts down ${rate.toFixed(2)} times per week charged, so it ends sooner than the ${quoted} weeks quoted and the cost is never paid`);
      } else if (rate < 0.95) {
        /* BOTH directions. A quote wrong in the manager's favour is still
           wrong, and the first draft of this check only caught an overrun. */
        fail(`the settlement counts down only ${rate.toFixed(2)} times per week charged, so it is billed for longer than the ${quoted} weeks quoted`);
      } else {
        ok(`one week charged is one week counted (${rate.toFixed(2)} over ${charges} weeks)`);
      }
    }
  }
  /* AND THE LAST WEEK IS BILLED. A row with one week left must be charged
     that week before it clears; counting first cleared it before the charge,
     so a 54 week quote billed 53. Measured as money, paired: the same save
     with and without the row, played the same entry with the same seed. The
     squad's wages are identical in both, so the difference in player wages
     is exactly what the row was billed. */
  const base = seeded(6010, () => cm.startCareer('Everton'));
  const withRow = { ...clone(base), severance: [{ name: 'Last Week Probe', weekly: 7, weeksLeft: 1 }] };
  const withoutRow = { ...clone(base), severance: [] };
  const a = seeded(6011, () => cm.playNextEntry(withRow, { skipHalftime: true }).state);
  const b = seeded(6011, () => cm.playNextEntry(withoutRow, { skipHalftime: true }).state);
  const billed = Math.round(((a.books?.season?.playerWages ?? 0) - (b.books?.season?.playerWages ?? 0)) * 1000);
  if ((a.severance ?? []).some(r => r.name === 'Last Week Probe')) fail('a settlement with one week left survived the week');
  else if (billed !== 7) fail(`a settlement with one week left at 7k was billed ${billed}k, not 7k`);
  else ok('a settlement with one week left is billed that week, then clears');
}

console.log('8) a settlement does not follow you to a new club');
{
  /* It belongs to the club that agreed it. Carrying it across a move handed the
     new employer a permanently higher wage ceiling for a liability somebody
     else incurred, which is the sack-for-cap-space exploit by the back door. */
  const st = seeded(6100, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player');
  else {
    const rel = cm.releasePlayer(st, p.id);
    if (!rel) fail('could not release');
    else if ((rel.severance ?? []).length === 0) fail('the release wrote no settlement');
    else {
      /* startNextSeason with a move: the engine drops it. Checked on the shape
         rather than by driving a whole job offer, because the rule is one
         expression and this is the claim it makes. */
      const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
      if (!/severance:\s*moving \? \[\]/.test(src)) {
        fail('the rollover carries severance across a move, so a new club inherits a liability and a higher wage ceiling');
      } else {
        ok('a settlement is dropped when the manager changes club');
      }
    }
  }
}

console.log('9) letting deals expire does not beat renewing them');
{
  /* The exploit: run every contract down, then re-sign the same men out of
     window for no fee. Measured at Arsenal before the fix, that was 936k a week
     and no fee against 1,415k and 246.2m, with the first eleven unchanged. */
  /* ACROSS EVERY CLUB, because one club is a sample of one and the ceiling has
     to sit outside the spread rather than inside it. Measured on one club the
     first draft read 57 percent against a ceiling of 60, which is a threshold
     in the middle of the distribution and a coin toss dressed as a rule. */
  const pcts = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(6200 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const mine = st.clubStrengths?.[st.clubName] ?? 66;
      const seniors = st.squad.filter(p => !p.isYouth && p.age >= 20);
      const wouldSign = seniors.filter(p => cm.freeAgentInterest(st, { name: p.name, position: p.position, age: p.age, rating: p.rating, since: st.season, reason: 'expired' }));
      const pct = (wouldSign.length / Math.max(1, seniors.length)) * 100;
      pcts.push(pct);
      console.log(`   ${CLUBS[i]} level ${mine.toFixed(1)}: ${wouldSign.length} of ${seniors.length} of its own seniors (${pct.toFixed(0)}%) would sign as free agents`);
    });
  }
  const pctOwn = mean(pcts);
  console.log(`   mean across ${pcts.length} clubs: ${pctOwn.toFixed(0)}%, worst ${Math.max(...pcts).toFixed(0)}%`);
  /* If the whole squad clears the interest bar, the pool is a free rack holding
     your own team at full rating rather than the weak bin it claims to be. */
  /* THE PERCENTAGE IS REPORTED, NOT ASSERTED ON, and that is deliberate. It
     will not threshold cleanly: at a weak club the squad clusters around the
     club's own level, so any rule loose enough to be useful there admits a
     large share of the squad, and any ceiling tight enough to exclude it lands
     inside the spread of the other clubs. Two drafts tried it, at 60 percent
     against a measured 43 to 69, and at 40 against 13 to 48. Both were
     thresholds sitting in the middle of the distribution.

     What is actually load bearing is binary, so assert that instead: the club's
     BEST player must never be signable for nothing. That is the whole "the pool
     is not an upgrade rack" claim, it is true or false rather than a
     percentage, and it is the thing a player would exploit first. */
  let rackAt = null;
  for (let i = 0; i < CLUBS.length && !rackAt; i += 1) {
    seeded(6300 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const best = st.squad.filter(p => !p.isYouth && p.age >= 20).sort((a2, b2) => b2.rating - a2.rating)[0];
      if (!best) return;
      const keen = cm.freeAgentInterest(st, { name: best.name, position: best.position, age: best.age, rating: best.rating, since: st.season, reason: 'expired' });
      if (keen) rackAt = `${CLUBS[i]} (${best.name}, ${best.rating} rated)`;
    });
  }
  if (rackAt) {
    fail(`the club's own best player would sign as a free agent at ${rackAt}, so the pool is an upgrade rack rather than the weak bin the round describes`);
  } else {
    ok(`no club's best player would sign for nothing, at any of the ${CLUBS.length} clubs`);
  }
  /* And a man whose deal ran out at your club cannot be taken straight back,
     while a man you RELEASED can never be taken back at all.

     Its own career, because the two blocks above build theirs inside a loop
     and none of their names reach this far. The first draft read `seniors`
     from one of them, threw a ReferenceError, and took section 10 down with it
     on the full suite, after the controls had been proven on the draft before.

     The refusal also has to come from the re-sign rules and not from something
     else. The first draft offered a man rated one point above the interest
     bar, so interest refused him whatever the guard did and the check could
     not fail. So the same man is offered three ways: his deal ran out LAST
     season, which must be accepted (proving interest, the cap and the squad
     size all allow him); his deal ran out THIS season, which must be refused;
     and released by you last season, which must be refused too. The review
     found the last one: a release was blocked only for its own season, so
     releasing an expiring man before the final match got him back in August
     with no renewal fee (12.8m dodged for 37k at Manchester City).

     His value goes with him, exactly as releasePlayer writes it. Without it
     wageFor falls back to a rating formula about ten times his real wage (a 72
     rated backup on 8k asked 82k), the cap refused both offers, and the
     twin failed on healthy code. The cap is lifted for the same reason: this
     check is about the re-sign rules, and section 1 already owns the cap. */
  seeded(6400, () => {
    const st = cm.startCareer(CLUBS[0]);
    cm.ensureFreeAgents(st);
    const mine = st.clubStrengths?.[st.clubName] ?? 66;
    const weakest = st.squad.filter(p => !p.isYouth && p.age >= 20).sort((a2, b2) => a2.rating - b2.rating)[0];
    if (!weakest) { fail('no senior at the club to test the re-sign guard with'); return; }
    const rating = Math.min(weakest.rating, Math.floor(mine) - 8);
    const without = { ...st, squad: st.squad.filter(x => x.id !== weakest.id), transferWindow: null, wageCap: Number.MAX_SAFE_INTEGER };
    const offered = (since, reason) => ({ ...without, freeAgents: [{ name: weakest.name, position: weakest.position, age: weakest.age, rating, value: weakest.value, generated: weakest.generated, since, reason, fromMyClub: true }] });
    if (!cm.signFreeAgent(offered(st.season - 1, 'expired'), weakest.name)) {
      fail('the same man whose deal ran out LAST season is refused too, so a refusal cannot be pinned on the re-sign rules');
      return;
    }
    if (cm.signFreeAgent(offered(st.season, 'expired'), weakest.name)) {
      fail('a man whose deal ran out this season can be re-signed at once, so letting a deal run down costs nothing');
    } else {
      ok('a man whose deal ran out this season cannot be taken back, and the same man a season later can');
    }
    if (cm.signFreeAgent(offered(st.season - 1, 'released'), weakest.name)) {
      fail('a man you released last season can be signed back, so releasing an expiring player dodges the renewal fee');
    } else {
      ok('a man you released cannot be taken back, even a season later');
    }
  });
}

console.log('10) the release wiring goes to the right function');
{
  /* A source check, because the defect was a wiring one that no engine test
     could see: a blanket rename pointed the ACADEMY release button at the new
     contract termination, which looks ids up in the squad, so releasing a
     scouted prospect silently did nothing. */
  const page = fs.readFileSync(path.join(ROOT, 'src/pages/ClubManager.tsx'), 'utf8');
  const academy = /AcademyScreen[\s\S]{0,600}?onRelease=\{g\.(\w+)\}/.exec(page);
  const contracts = /ContractsCard[\s\S]{0,400}?onRelease=\{g\.(\w+)\}/.exec(page);
  if (!academy) fail('cannot find the academy screen release wiring to check it');
  else if (academy[1] !== 'release') fail(`the academy release is wired to g.${academy[1]}, which looks ids up in the squad, so releasing a prospect does nothing`);
  else ok('the academy release goes to the prospect release');
  if (!contracts) fail('cannot find the contracts card release wiring to check it');
  else if (contracts[1] !== 'terminate') fail(`the contracts release is wired to g.${contracts[1]}, not the contract termination`);
  else ok('the contracts release goes to the contract termination');
}

/* A save paused at half time, used by sections 11 and 15. */
const halftime = (() => {
  let s = seeded(6500, () => cm.startCareer('Everton'));
  let half = null;
  seeded(6501, () => {
    for (let i = 0; i < 12 && !half; i += 1) {
      const r = cm.playNextEntry(s);
      s = r.state;
      if (r.kind === 'halftime') half = r.state;
    }
  });
  return half;
})();

console.log('11) a release leaves the squad the way every other exit does');
{
  /* Mid match. The first build let a man be released at half time, and the
     second half kicked off a man short because the lineup still named him. */
  if (!halftime || !halftime.live) fail('could not reach a half time to test with');
  else {
    const free = { ...halftime, live: null };
    const victim = halftime.squad.find(p => halftime.live.onPitch.includes(p.id) && cm.releaseBlock(free, p) === null);
    if (!victim) fail('nobody on the pitch could be released even with the match over, so this cannot see the match rule');
    else if (!cm.releasePlayer(free, victim.id)) fail('the same release with no match on is refused, so the refusal proves nothing');
    else if (cm.releasePlayer(halftime, victim.id)) fail(`${victim.name} was released with the match paused at half time, and the second half plays a man short`);
    else ok('nobody can be released with a match paused, and the same man can once it is over');
  }
  /* The last keeper. The shared exit rule every sale, bid and loan passes. */
  const bst = seeded(6600, () => cm.startCareer('Brentford'));
  const keepers = bst.squad.filter(p => p.position === 'GK');
  if (keepers.length < 2) fail(`Brentford started with ${keepers.length} keepers, so the last keeper rule cannot be isolated`);
  else {
    const one = { ...bst, squad: bst.squad.filter(p => p.position !== 'GK' || p.id === keepers[0].id) };
    if (!cm.releasePlayer(bst, keepers[0].id)) fail('a keeper is refused with another keeper in the squad, so the refusal proves nothing');
    else if (cm.releasePlayer(one, keepers[0].id)) fail('the last keeper can be released, so a club plays on with an outfielder in goal');
    else if (cm.releaseBlock(one, keepers[0]) !== 'lastKeeper') fail(`the last keeper is refused as ${cm.releaseBlock(one, keepers[0])}, not as the last keeper, so the card names the wrong rule`);
    else ok('the last keeper cannot be released, and one of two can');
  }
  /* References. acceptBid and loanOutPlayer clear the XI slot, the set piece
     jobs and his bids; the first build's release cleared none of them. */
  const est = seeded(6700, () => cm.startCareer('Everton'));
  const target = est.squad.find(p => !p.isYouth && p.position !== 'GK' && cm.releaseBlock(est, p) === null);
  if (!target) fail('nobody releasable at Everton to test the references with');
  else {
    const xiIds = [target.id, ...est.xiIds.filter(id => id !== target.id).slice(1)];
    const loaded = {
      ...est,
      xiIds,
      setPieces: { captain: target.id, cornersLeft: target.id, cornersRight: null, freeKicks: null, penalties: target.id },
      incomingBids: [{ playerId: target.id, playerName: target.name, club: 'Probe Town', offer: 9, status: 'open', clauseMet: true }],
    };
    const gone = cm.releasePlayer(loaded, target.id);
    if (!gone) fail('the reference release was refused');
    else {
      const left = [
        gone.xiIds.includes(target.id) ? 'the XI' : null,
        Object.values(gone.setPieces ?? {}).includes(target.id) ? 'a set piece job' : null,
        (gone.incomingBids ?? []).some(b => b.playerId === target.id) ? 'a bid' : null,
      ].filter(Boolean);
      if (left.length) fail(`a released man is still named in ${left.join(', ')}, so a met clause for him collapses on deadline day with a false headline`);
      else ok('a released man leaves the XI, every set piece job and every bid');
    }
  }
}

console.log('12) nobody is in the squad and the pool at once');
{
  /* A man bought off the market leaves the pool. Only signFreeAgent used to
     take anyone out, so a man bought while listed as a free agent was in both. */
  const st = seeded(6800, () => cm.startCareer('Everton'));
  const mp = cm.buildMarket(st).filter(m => m.price <= st.budget && m.rating < 75)[0];
  if (!mp) fail('nobody affordable on the market to test a purchase with');
  else {
    const listed = { ...st, freeAgents: [...(st.freeAgents ?? []), { name: mp.name, position: mp.position, age: mp.age, rating: mp.rating, value: mp.value, since: st.season, reason: 'unattached' }] };
    const bought = cm.buyPlayer(listed, mp);
    if (!bought) fail('the purchase was refused, so the pool rule was never reached');
    else if (!bought.squad.some(p => p.name === mp.name)) fail('the purchase did not add the man to the squad');
    else if ((bought.freeAgents ?? []).some(f => f.name === mp.name)) fail(`${mp.name} was bought and is still listed as a free agent`);
    else ok('a man bought off the market leaves the free agent pool');
  }

  /* The summer emergency fill. It signs out of the pool first, and nothing
     took the men it signed back out; and it must never sign a man you
     released, which is taking him back by another door. One released and one
     expired probe per position group, the released one a point lower so the
     fill, which reaches for the weakest first, would pick him if it could. */
  const fst = seeded(6900, () => cm.startCareer('Everton'));
  const baseline = cm.projectedXIAvg(fst.clubName, cm.yearsOn(fst) + 1, fst.eraId) ?? 66;
  const r = Math.round(baseline) - 20;
  const probes = [];
  for (const pos of ['GK', 'CB', 'CM', 'ST']) {
    probes.push({ name: `Released ${pos} Probe`, position: pos, age: 27, rating: r - 1, value: 0.5, since: fst.season, reason: 'released', fromMyClub: true });
    /* Since this season, so a man the fill signs would survive the decay and
       still be listed if nothing took him out. */
    probes.push({ name: `Expired ${pos} Probe`, position: pos, age: 27, rating: r, value: 0.5, since: fst.season, reason: 'expired', fromMyClub: true });
  }
  /* Five seniors kept: players turning 20 count as seniors too, and keeping
     eight left the fill only one gap to fill. */
  const keep = new Set(seniorsOf(fst).sort((a, b) => b.rating - a.rating).slice(0, 5).map(p => p.id));
  const thin = {
    ...fst,
    freeAgents: probes,
    squad: fst.squad.map(p => (!p.isYouth && p.age >= 20 ? { ...p, contractYears: keep.has(p.id) ? 3 : 1 } : p)),
  };
  const n = seeded(6901, () => cm.startNextSeason(thin));
  const tookProbe = n.squad.filter(p => p.name.endsWith(' Probe'));
  const inBoth = n.squad.filter(p => (n.freeAgents ?? []).some(f => f.name === p.name));
  if (!tookProbe.length) fail('the summer fill signed nobody from the pool, so this cannot see what it does with pool men');
  else {
    if (tookProbe.some(p => p.name.startsWith('Released '))) fail(`the summer fill signed a man you released: ${tookProbe.filter(p => p.name.startsWith('Released ')).map(p => p.name).join(', ')}`);
    else ok(`the summer fill took ${tookProbe.length} ${tookProbe.length === 1 ? 'man' : 'men'} from the pool and none you released`);
  }
  if (inBoth.length) fail(`after the summer ${inBoth.length} men are in the squad and the pool at once: ${inBoth.slice(0, 3).map(p => p.name).join(', ')}`);
  else ok('after the summer nobody in the squad is still listed as a free agent');

  /* Ids. Round 567's rule: slug() is not injective, so two free agents whose
     names slug the same shared one id, and releasing either took both off. */
  const ist = seeded(7000, () => cm.startCareer('Everton'));
  const level = ist.clubStrengths[ist.clubName];
  const twin = (name) => ({ name, position: 'CM', age: 26, rating: Math.floor(level) - 20, value: 0.5, since: ist.season - 1, reason: 'unattached' });
  const roomy = { ...ist, wageCap: Number.MAX_SAFE_INTEGER, freeAgents: [twin('Probe Michał Twin'), twin('Probe Michal Twin')] };
  const s1 = cm.signFreeAgent(roomy, 'Probe Michał Twin');
  const s2 = s1 && cm.signFreeAgent(s1, 'Probe Michal Twin');
  if (!s2) fail('the two twins could not both be signed, so the id rule was never reached');
  else {
    const ids = s2.squad.filter(p => p.name.endsWith(' Twin')).map(p => p.id);
    if (new Set(ids).size !== 2) fail(`two free agents whose names slug the same share one id (${ids.join(', ')}), so releasing one removes both`);
    else ok(`two free agents whose names slug the same get two ids (${ids.join(', ')})`);
  }
}

console.log('13) a new save has free agents, and they are made up cover');
{
  /* The first build filled the pool only with your own ex-players, so a new
     save showed no free agents at all. The fix tops it up with GENERATED
     journeymen, never real men moved off real clubs, which would be inventing
     a transfer. They must be there on day one and after every summer, flagged
     made up, never wearing a real name, weak enough to be cover rather than an
     upgrade, and priced like squad players rather than at the raw curve. */
  let presentEverywhere = true;
  let allFlagged = true;
  const realHits = [];
  const notCover = [];
  const wageRatios = [];
  const curveRatios = [];
  const clash = [];
  let seen = 0;
  const inspect = (st, when) => {
    const jm = (st.freeAgents ?? []).filter(f => f.reason === 'unattached');
    if (jm.length !== cm.FREE_AGENT_POOL_TARGET) { presentEverywhere = false; console.log(`   ${when}: ${jm.length} journeymen, expected ${cm.FREE_AGENT_POOL_TARGET}`); }
    const level = st.clubStrengths[st.clubName];
    const squadNames = new Set(st.squad.map(p => p.name));
    const seniorWage = median(seniorsOf(st).map(p => p.wage ?? 0));
    for (const f of jm) {
      seen += 1;
      if (f.generated !== true || f.fromMyClub) allFlagged = false;
      if (REAL_NAMES.has(f.name)) realHits.push(`${f.name} (${when})`);
      if (squadNames.has(f.name)) clash.push(`${f.name} (${when})`);
      if (!(cm.freeAgentInterest(st, f) && f.rating <= level - 14)) notCover.push(`${f.name} ${f.rating} at level ${level.toFixed(1)} (${when})`);
      curveRatios.push(cm.freeAgentTerms(f).wage / cm.freeAgentTerms({ ...f, value: undefined }).wage);
    }
    if (jm.length && seniorWage > 0) wageRatios.push(mean(jm.map(f => cm.freeAgentTerms(f).wage)) / seniorWage);
  };
  for (let i = 0; i < CLUBS.length; i += 1) {
    const st = seeded(7100 + i, () => cm.startCareer(CLUBS[i]));
    inspect(st, `${CLUBS[i]} day one`);
    const n1 = seeded(7150 + i, () => cm.startNextSeason(st));
    inspect(n1, `${CLUBS[i]} season 2`);
    const n2 = seeded(7175 + i, () => cm.startNextSeason(n1));
    inspect(n2, `${CLUBS[i]} season 3`);
    if (i === 0) {
      const dayOne = (st.freeAgents ?? []).filter(f => f.reason === 'unattached').map(f => f.name);
      const lingering = (n2.freeAgents ?? []).filter(f => dayOne.includes(f.name)).length;
      console.log(`   ${CLUBS[i]}: ${lingering} of the day one journeymen still listed two summers later`);
    }
  }
  console.log(`   ${seen} journeymen inspected across ${CLUBS.length} clubs and three seasons each`);
  if (!presentEverywhere || seen === 0) fail('a save is missing its journeymen on day one or after a summer, so the free agent list can be empty');
  else ok(`every save holds ${cm.FREE_AGENT_POOL_TARGET} journeymen on day one and after each of two summers`);
  if (!allFlagged) fail('a journeyman is not flagged as made up, so the MADE UP label never shows');
  else ok('every journeyman is flagged made up and none claims to be from your club');
  if (realHits.length) fail(`a journeyman wears a real player's name: ${realHits.slice(0, 3).join(', ')}`);
  else if (clash.length) fail(`a journeyman shares a name with the squad: ${clash.slice(0, 3).join(', ')}`);
  else ok('no journeyman wears a real name or a name already in the squad');
  if (notCover.length) fail(`${notCover.length} journeymen are not cover (must pass interest and sit 14 or more below the club): ${notCover.slice(0, 3).join(', ')}`);
  else ok('every journeyman is willing and sits 14 or more below the club, so none is an upgrade');
  /* PRICED OFF HIS SQUAD, NOT THE RAW CURVE. Without a value wageFor prices a
     man off the raw rating curve, which at a real club is about ten times what
     the club's own real values say (the review's 72 rated backup on 8k asked
     82k). So the asserted number is his wage against the wage the raw curve
     would ask for the same man: exactly 1 with no value. The share of the
     median senior wage is what a player actually sees and is printed beside
     it, but it moves with the journeyman's rating as well as his value, so it
     cannot tell a mispriced man from a better one. */
  const cr = mean(curveRatios);
  const wr = mean(wageRatios);
  console.log(`   a journeyman asks ${(cr * 100).toFixed(0)}% of the raw curve wage, and ${(wr * 100).toFixed(0)}% of his squad's median senior wage`);
  if (!(cr < 0.6)) fail(`a journeyman asks ${(cr * 100).toFixed(0)}% of the raw curve wage, so his wage ignores what his squad is really worth (ceiling 60%)`);
  else ok(`a journeyman is priced off his squad's values, ${(cr * 100).toFixed(0)}% of the raw curve wage (ceiling 60%)`);
}

console.log('14) the projection bills a settlement only for the weeks it has left');
{
  const st = seeded(7300, () => cm.startCareer('Everton'));
  const weeksLeft = st.calendar.length - st.week;
  const wages = (s) => fin.projectFinances(s).spend.find(l => l.id === 'playerWages').projected;
  const none = wages({ ...st, severance: [] });
  const short = wages({ ...st, severance: [{ name: 'Short Probe', weekly: 40, weeksLeft: 5 }] }) - none;
  const long = wages({ ...st, severance: [{ name: 'Long Probe', weekly: 40, weeksLeft: 500 }] }) - none;
  const expectShort = (40 * 5) / 1000;
  const expectLong = (40 * weeksLeft) / 1000;
  console.log(`   a 5 week row adds ${short.toFixed(3)}m (expected ${expectShort.toFixed(3)}m), a 500 week row adds ${long.toFixed(3)}m (expected ${expectLong.toFixed(3)}m over ${weeksLeft} weeks)`);
  if (Math.abs(short - expectShort) > 0.011) fail(`a settlement with 5 weeks left is projected at ${short.toFixed(3)}m, not the ${expectShort.toFixed(3)}m it can still cost`);
  else if (Math.abs(long - expectLong) > 0.011) fail(`a long settlement is projected at ${long.toFixed(3)}m, not the ${expectLong.toFixed(3)}m this season can bill`);
  else ok('each settlement is projected for the weeks it still runs, and no further than the season');
}

console.log('15) the contracts card agrees with the engine on every button');
{
  /* Rendered through react-dom/server, then every Release and Sign button is
     compared with what the engine would do if it were pressed. The first
     build showed live buttons the engine refused (every Release at the senior
     floor, Sign over the cap or with a full squad, Release at half time), and
     its Sign never said the wage or the length. */
  const noop = () => {};
  const everton = seeded(7400, () => cm.startCareer('Everton'));
  const floor = cm.releasePlayer(everton, worstContract(everton).id);
  const overCap = { ...everton, wageCap: cm.wageBill(everton) };
  const full = { ...everton, squad: [...everton.squad, ...Array.from({ length: 30 - everton.squad.length }, (_, k) => ({ ...everton.squad[everton.squad.length - 1], id: `pad-${k}`, name: `Pad Probe ${k}` }))] };
  const letGo = everton.squad.filter(p => !p.isYouth && p.age >= 20)[0];
  const rules = {
    ...everton,
    freeAgents: [
      ...(everton.freeAgents ?? []),
      { name: 'Released Card Probe', position: 'CM', age: 27, rating: 55, value: 0.5, since: everton.season - 1, reason: 'released', fromMyClub: true },
      { name: 'Expired Card Probe', position: 'CM', age: 27, rating: 55, value: 0.5, since: everton.season, reason: 'expired', fromMyClub: true },
      { name: 'Star Card Probe', position: 'ST', age: 26, rating: 95, value: 1, since: everton.season, reason: 'unattached' },
      { name: letGo.name, position: letGo.position, age: letGo.age, rating: 55, value: 0.5, since: everton.season, reason: 'unattached' },
    ],
  };
  const states = [['a new save', everton], ['at the senior floor', floor], ['at half time', halftime], ['at the wage cap', overCap], ['with 30 players', full], ['with every re-sign rule in the pool', rules]];
  let compared = 0;
  let enabled = 0;
  let disabled = 0;
  const wrong = [];
  const badFaces = [];
  const drift = [];
  for (const [label, st] of states) {
    if (!st) { fail(`no state ${label} to render`); continue; }
    const html = render(ContractsCard, { career: st, onRenew: noop, onRenewWithClause: noop, onRelease: noop, onSignFreeAgent: noop });
    for (const m of html.matchAll(/<button([^>]*)data-release-id="([^"]*)"([^>]*)>/g)) {
      const isDisabled = /\sdisabled=""/.test(m[1] + m[3]);
      const engine = cm.releasePlayer(clone(st), m[2]) !== null;
      compared += 1;
      if (isDisabled) disabled += 1; else enabled += 1;
      if (engine === isDisabled) wrong.push(`Release ${m[2]} ${label}: card ${isDisabled ? 'off' : 'on'}, engine ${engine ? 'allows' : 'refuses'}`);
    }
    for (const m of html.matchAll(/<button([^>]*)data-sign-index="(\d+)"([^>]*)>([^<]*)<\/button>/g)) {
      const f = st.freeAgents[Number(m[2])];
      const isDisabled = /\sdisabled=""/.test(m[1] + m[3]);
      const after = cm.signFreeAgent(clone(st), f.name);
      compared += 1;
      if (isDisabled) disabled += 1; else enabled += 1;
      if ((after !== null) === isDisabled) wrong.push(`Sign ${f.name} ${label}: card ${isDisabled ? 'off' : 'on'}, engine ${after ? 'allows' : 'refuses'}`);
      if (!isDisabled) {
        const t = cm.freeAgentTerms(f);
        if (!m[4].includes(`${t.wage}k/w`) || !m[4].includes(`${t.years}y`)) badFaces.push(`${f.name}: "${m[4]}" for ${t.wage}k and ${t.years} years`);
        const man = after?.squad.find(p => p.name === f.name);
        if (man && (man.wage !== t.wage || man.contractYears !== t.years)) drift.push(`${f.name}: quoted ${t.wage}k for ${t.years}, signed on ${man.wage}k for ${man.contractYears}`);
      }
    }
  }
  console.log(`   ${compared} buttons over ${states.length} saves: ${enabled} live, ${disabled} off`);
  if (compared < 40 || enabled < 5 || disabled < 5) fail(`only ${compared} buttons (${enabled} live, ${disabled} off), too few both ways to trust the comparison`);
  else if (wrong.length) fail(`${wrong.length} buttons disagree with the engine: ${wrong.slice(0, 3).join(' | ')}`);
  else ok('every Release and Sign button is live exactly when the engine would go through with it');
  if (badFaces.length) fail(`a Sign button does not quote the terms: ${badFaces.slice(0, 2).join(' | ')}`);
  else if (drift.length) fail(`a signing commits different terms from the ones the button quoted: ${drift.slice(0, 2).join(' | ')}`);
  else ok('every live Sign button quotes the wage and length the signing then commits');
  /* Two taps. SSR cannot press a button, so this reads the card's code with
     comments stripped: onRelease is called in exactly one place, and that
     place is inside the confirmation that states the cost. */
  const code = fs.readFileSync(CARD, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const calls = code.split('onRelease(p.id)').length - 1;
  const confirmAt = code.indexOf('data-release-confirm');
  if (calls !== 1 || confirmAt < 0 || code.indexOf('onRelease(p.id)') < confirmAt) {
    fail(`Release is not behind a confirmation: onRelease is called in ${calls} places and ${confirmAt < 0 ? 'there is no confirmation block' : 'not only inside it'}`);
  } else {
    ok('a release only fires from the confirmation that states the cost');
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFreeAgents: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFreeAgents: all sections passed');
process.exit(0);
