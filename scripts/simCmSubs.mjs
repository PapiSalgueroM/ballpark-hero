/* Round 1331: five changes in three stoppages where the league and season really had them, three before.

   Bundles the real engine (src/lib/clubManager.ts) the way simCmQuickSubs does and plays it. Sections,
   chosen with --part=a,b (default: every section this file holds):
     ledger    scripts/data/cmSubsRuleSources.json has two sources on two hosts for every law line and
               every league fact, none on a wiki host, each dated and quoted; the module's rows equal
               the ledger's.
     rule      through changeLive: a 2005-06 Everton match takes a third change and refuses a fourth;
               a 2026-27 Liverpool match takes two at half time, then one each at 60, 70 and 80, and
               refuses a sixth; with one change at the break and three stoppages used, a change at a
               fourth minute is refused but a second change at the third stoppage's minute is taken.
     opponent  over a quick sim fleet (2026-27 Liverpool, Barcelona and Bayern on the current rules and
               again on the base rules, 2005-06 Everton and 2015-16 Real Madrid; SUBS_SEEDS seeds of
               SUBS_MATCHES matches each), the other dugout never passes its rule's changes or stoppages,
               and under five makes more changes than on the base rules by at least OPP_GAP.
     coach     over the same fleet, the quick sim coach never passes the rule, writes no stoppage mark
               under three, and keeps a change and a stoppage back with every change he makes for legs;
               prints his mean changes a match under each rule (no real world average is claimed).
     press     over a quick sim fleet, every bigGame or derby question asked at a whistle names the next
               fixture's opponent (a second meeting with the same club is allowed); the 2026-10-12 Hot Seat
               daily at Westerlo still asks about Cercle Brugge (it is dated before the rules), and a stamped
               free run on its seed asks about Gent. Prints the count of each question kind, and the base's
               beside it when SUBS_BASE is set.
   With SUBS_BASE=<a checkout of the commit this branch started from> three more run (the default then):
     legacy    Everton 2005-06, Barcelona 2015-16 and Liverpool 2026-27 (quick sims with the coach and with
               noCoach) and two Hot Seat style careers, seeds 0 to SUBS_LEGACY_SEEDS-1, SUBS_LEGACY_SEASONS
               seasons, matchRules 'base' on the head side only: every save byte (that key taken off) and
               the count of draws equal to the base engine's.
     three     the 2005-06 and 2015-16 careers on the current rules, the press read put back to the old
               week in memory: equal to the base byte for byte (the rule table changes nothing in three).
     hotseat   the 30 dailies before HOT_SEAT_RULES_FROM (2026-09-24 on) play the base rules and replay
               exactly as on the base; a free run saved without the stamp too; the career carried on to
               Club Manager carries no matchRules.

   Controls (SUBS_CONTROL=<name>), each asserting its anchor is present first and printing how many
   checks it turned red; a control that fires nothing is a failed run:
     onesource  one league fact loses a source in memory: ledger red.
     oldcap     the rule answers three everywhere (the plan's control): the 2026 checks red.
     nostops    the stoppage check off: rule red.
     htstop     half time counts as a stoppage: rule red.
     opproom    the other dugout's room back to MAX_HALFTIME_SUBS less the changes made: opponent red.
     coachall   the coach keeps nothing back (his three keep back lines opened): coach red.
     pressold   the press at the whistle reads the match just played again: press red.
     legacyleak matchRuleOf ignores matchRules: legacy red (needs SUBS_BASE).
     pressnew   the base rules' press reads the next week too: legacy red (needs SUBS_BASE).
     nodate     rulesOf ignores HOT_SEAT_RULES_FROM: hotseat red on every date (needs SUBS_BASE).

   Exit 0 green, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const LEDGER = 'scripts/data/cmSubsRuleSources.json';
const CONTROL = process.env.SUBS_CONTROL ?? '';
const partArg = process.argv.find(a => a.startsWith('--part='));
const HS_FILE = 'src/lib/managerHotSeat.ts';
/* The base arm's sections run only with SUBS_BASE, a checkout of the commit this branch started from. */
const BASE_PARTS = ['legacy', 'three', 'hotseat'];
const ALL_PARTS = ['ledger', 'rule', 'opponent', 'coach', 'press', ...(process.env.SUBS_BASE ? BASE_PARTS : [])];
/** The engine sections past rule register here as they are defined below. */
const SECTIONS = {};

const CONTROLS = {
  onesource: { part: 'ledger' },
  oldcap: { part: 'rule', from: '  return subsRuleFor(subsLeagueBase(careerLeagueOf(career).id), worldYear(career));', to: '  return { subs: MAX_SUBS, stops: null, partial: false };' },
  nostops: { part: 'rule', from: '    if (inPlay && !sharesStop(live, m, p) && stopsUsed(live) >= rule!.stops!) return null;', to: '' },
  htstop: { part: 'rule', from: '  if (!live.h2Drawn && minute >= 46) return true;', to: '  if (false) return true;' },
  legacyleak: { part: 'legacy', from: "  if (career.matchRules === 'base') return { subs: MAX_SUBS, stops: null, partial: false };", to: '' },
  pressnew: { part: 'legacy', from: "  maybeAskPress(state, state.matchRules === 'base' ? undefined : live.week + 1);", to: '  maybeAskPress(state, live.week + 1);' },
  pressold: { part: 'press', from: "  maybeAskPress(state, state.matchRules === 'base' ? undefined : live.week + 1);", to: '  maybeAskPress(state);' },
  nodate: { part: 'hotseat', file: HS_FILE, from: "  if (setup.daily) return setup.daily < HOT_SEAT_RULES_FROM ? 'base' : undefined;", to: '  if (setup.daily) return undefined;' },
  opproom: { part: 'opponent', from: '  const room = rule.subs - made.length;', to: '  const room = MAX_HALFTIME_SUBS - made.length;' },
  coachall: { part: 'coach', patches: [
    ['    if (live.subsUsed >= rule.subs - 1 || (live.minute ?? 0) > at || benchFor(state).length < 2) return false;',
      '    if (live.subsUsed >= rule.subs || (live.minute ?? 0) > at || benchFor(state).length < 2) return false;'],
    ['    if (rule.stops !== null && (stopsLeftOf(state) ?? 0) - (isBreakChange(live, at) || sharesStop(live, at) ? 0 : 1) < 1) return false;',
      '    if (rule.stops !== null && (stopsLeftOf(state) ?? 0) - (isBreakChange(live, at) || sharesStop(live, at) ? 0 : 1) < 0) return false;'],
    ['if (state.live!.subsUsed >= rule.subs - 1 || (rule.stops !== null', 'if (state.live!.subsUsed >= rule.subs || (rule.stops !== null'],
  ] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`unknown control ${CONTROL}`); process.exit(2); }
const PARTS = CONTROL ? [CONTROLS[CONTROL].part] : partArg ? partArg.slice(7).split(',') : ALL_PARTS;

/** Every draw any seeded call made, so two engines can be held to the same count. */
export const DRAWS = { n: 0 };
export function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => {
    DRAWS.n += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}

const results = [];
function check(part, name, ok, detail = '') {
  results.push({ part, name, ok: !!ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${part}] ${name}${detail ? ` (${detail})` : ''}`);
}

const require = createRequire(import.meta.url);
/** Manager Hot Seat, bundled with each engine (the engine module is the key). */
const HS = new Map();
/** The engine (src/lib/clubManager.ts as `text`) bundled with Manager Hot Seat beside it. `srcRoot` is the
 *  src tree everything else comes from (SUBS_BASE's for the base arm); `hsText` a patched Hot Seat file. */
async function bundleEngine(text, name, folder, { srcRoot = path.join(root, 'src'), hsText = null } = {}) {
  const target = path.join(folder, `${name}.ts`);
  const output = path.join(folder, `${name}.cjs`);
  const entry = path.join(folder, `${name}-entry.ts`);
  await writeFile(target, text);
  const alias = { '@/lib/clubManager': target, '@': srcRoot };
  if (hsText !== null) {
    const hsFile = path.join(folder, `${name}-hs.ts`);
    await writeFile(hsFile, hsText);
    alias['@/lib/managerHotSeat'] = hsFile;
  }
  await writeFile(entry, "export * as cm from '@/lib/clubManager';\nexport * as hs from '@/lib/managerHotSeat';\n");
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias, nodePaths: [path.join(root, 'node_modules')] });
  const mod = require(output);
  HS.set(mod.cm, mod.hs);
  return mod.cm;
}
async function bundleRule(folder) {
  const output = path.join(folder, 'rule.cjs');
  await build({ entryPoints: [path.join(root, 'src/lib/clubManagerSubsRule.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent' });
  return require(output);
}

/* ---------------- section ledger ---------------- */
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const bare = h => String(h).toLowerCase().replace(/^www\./, '');
export function ledgerLines(ledger) {
  const factSources = f => (typeof f.sources === 'string' ? ledger.shared?.[f.sources] : f.sources) ?? [];
  return [
    ...ledger.laws.map(l => ({ what: `law ${l.id}`, sources: l.sources ?? [] })),
    ...ledger.rows.flatMap(r => (r.facts ?? []).map(f => ({ what: `${r.league}: ${f.claim}`, sources: factSources(f) }))),
  ];
}
function ledgerSection(ledger, rule) {
  const P = 'ledger';
  const wiki = v => /wiki|fandom/i.test(String(v));
  const lines = ledgerLines(ledger);
  check(P, 'the ledger holds law lines and league rows', ledger.laws.length >= 3 && ledger.rows.length >= 5, `${ledger.laws.length} laws, ${ledger.rows.length} rows`);
  for (const row of ledger.rows) check(P, `${row.league}: has at least one sourced fact`, (row.facts ?? []).length >= 1);
  for (const l of lines) {
    const hosts = new Set(l.sources.map(x => bare(x.host)));
    const bad = l.sources.filter(x => !x.url || !bare(new URL(x.url).hostname).endsWith(bare(x.host)) || !isDate(x.read) || !isDate(x.published)
      || String(x.quote ?? '').length < 12 || wiki(x.host) || wiki(x.url));
    check(P, `${l.what}: two sources on two hosts, dated, quoted, no wiki`, l.sources.length >= 2 && hosts.size >= 2 && bad.length === 0,
      `${l.sources.length} sources, ${hosts.size} hosts, ${bad.length} malformed`);
  }
  const sortObj = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  const rows = Object.fromEntries(ledger.rows.map(r => [r.league, r.fiveFrom]));
  check(P, 'the module rows equal the ledger rows', JSON.stringify(sortObj(rows)) === JSON.stringify(sortObj({ ...rule.CM_SUBS_FIVE_FROM })));
  check(P, 'the module partial list equals the ledger', [...ledger.partial.leagues].sort().join() === [...rule.CM_SUBS_PARTIAL].sort().join());
}

/* ---------------- section rule ---------------- */
const isGk = (s, id) => s.squad.find(p => p.id === id)?.position === 'GK';
function legalPair(cm, s, m) {
  const live = s.live;
  const gone = cm.liveGoneIds(live, m);
  const cameOn = new Set((live.subs ?? []).map(x => x.onId));
  const reds = new Set([...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(c => c.kind === 'red' && c.minute <= m).map(c => c.id));
  const outs = live.onPitch.filter(id => !gone.has(id) && !isGk(s, id) && !cameOn.has(id) && !reds.has(id));
  const ins = cm.benchFor(s).filter(p => !gone.has(p.id) && p.position !== 'GK');
  return outs.length && ins.length ? { outId: outs[0], inId: ins[0].id } : null;
}
function sub(cm, s, m, plus) {
  const pair = legalPair(cm, s, m);
  if (!pair) throw new Error(`no legal pair at ${m}`);
  return cm.changeLive(s, m, { kind: 'sub', ...pair }, plus);
}
/** A fresh career at this club and era, played to its first match's half time. */
export function toHalftime(cm, club, era, seed) {
  let s = withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
  s.squad = s.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  for (let i = 0; i < 12; i++) {
    const r = withSeed(seed + 1 + i, () => cm.playNextEntry(s));
    if (r.kind === 'halftime') return r.state;
    s = r.state;
  }
  throw new Error(`${club} ${era ?? 'now'}: no half time in 12 entries`);
}
const ruleText = r => `${r.subs}/${r.stops ?? 'none'}`;
function ruleSection(cm) {
  const P = 'rule';
  // 2005-06 Everton: three, whenever you like.
  let s = toHalftime(cm, 'Everton', 'era2005', 501);
  check(P, '2005-06 Everton plays three with no stoppage limit', ruleText(cm.matchRuleOf(s)) === '3/none', ruleText(cm.matchRuleOf(s)));
  s = sub(cm, s, 46);
  s = s && cm.startSecondHalf(s);
  s = s && sub(cm, s, 60);
  s = s && sub(cm, s, 70);
  check(P, '2005-06 Everton takes a third change', !!s && s.live.subsUsed === 3);
  check(P, '2005-06 Everton refuses a fourth', !!s && sub(cm, s, 80) === null);
  check(P, '2005-06 writes no stoppage marks', !!s && (s.live.subs ?? []).every(x => !('stop' in x)));
  // 2026-27 Liverpool: two at half time, then 60, 70 and 80.
  const ht = toHalftime(cm, 'Liverpool', null, 2601);
  check(P, '2026-27 Liverpool plays five in three stoppages', ruleText(cm.matchRuleOf(ht)) === '5/3', ruleText(cm.matchRuleOf(ht)));
  let a = sub(cm, ht, 46);
  a = a && sub(cm, a, 46);
  check(P, '2026-27 two changes at half time use no stoppage', !!a && a.live.subsUsed === 2 && cm.stopsUsed(a.live) === 0);
  a = a && cm.startSecondHalf(a);
  for (const m of [60, 70, 80]) a = a && sub(cm, a, m);
  check(P, '2026-27 takes one each at 60, 70 and 80: five changes, three stoppages', !!a && a.live.subsUsed === 5 && cm.stopsUsed(a.live) === 3,
    a ? `${a.live.subsUsed} changes, ${cm.stopsUsed(a.live)} stoppages` : 'refused');
  check(P, '2026-27 refuses a sixth', !!a && sub(cm, a, 85) === null);
  // One at the break, three stoppages used: a fourth minute is refused, the third stoppage's minute is not.
  let b = sub(cm, ht, 46);
  b = b && cm.startSecondHalf(b);
  for (const m of [60, 70, 80]) b = b && sub(cm, b, m);
  check(P, '2026-27 one at the break then 60, 70, 80: four changes, three stoppages', !!b && b.live.subsUsed === 4 && cm.stopsUsed(b.live) === 3);
  check(P, '2026-27 refuses a change at a fourth minute', !!b && sub(cm, b, 85) === null);
  const shared = b && sub(cm, b, 80);
  check(P, '2026-27 takes a second change at the third stoppage\'s minute', !!shared && shared.live.subsUsed === 5 && cm.stopsUsed(shared.live) === 3);
  // The base rules (an older Hot Seat day) are three with no limit whatever the season.
  check(P, 'matchRules base plays three with no limit', ruleText(cm.matchRuleOf({ ...ht, matchRules: 'base' })) === '3/none');
  // 2020-21: England three, Spain five.
  const pl20 = withSeed(2020, () => cm.startCareer('Liverpool', 'era2020'));
  const ll20 = withSeed(2021, () => cm.startCareer('Barcelona', 'era2020'));
  check(P, '2020-21 Premier League plays three', ruleText(cm.matchRuleOf(pl20)) === '3/none', ruleText(cm.matchRuleOf(pl20)));
  check(P, '2020-21 La Liga plays five in three', ruleText(cm.matchRuleOf(ll20)) === '5/3', ruleText(cm.matchRuleOf(ll20)));
}

/* ---------------- the quick sim fleet (sections opponent and coach) ---------------- */
/* Five change careers in 2026-27 (England, Spain, Germany), the same careers on the base rules, and two
   three change eras. SEEDS and MATCHES are environment knobs; the bands below were set at the defaults. */
const SEEDS = Number(process.env.SUBS_SEEDS ?? 3);
const MATCHES = Number(process.env.SUBS_MATCHES ?? 14);
const SEED_BASE = Number(process.env.SUBS_SEED_BASE ?? 7100);
const FIVE = [['Liverpool', null], ['Barcelona', null], ['Bayern Munich', null]];
const THREE = [['Everton', 'era2005'], ['Real Madrid', 'era2015']];
const fleetCache = new Map();
const keyOf = (minute, plus) => `${minute}|${plus ?? 0}`;
/** Every match of the fleet: the rule, my changes (with their stoppage marks), my injuries, their changes. */
export function quickFleet(cm) {
  if (fleetCache.has(cm)) return fleetCache.get(cm);
  const careers = [];
  for (let k = 0; k < SEEDS; k++) {
    for (const [club, era] of FIVE) careers.push({ club, era, seed: SEED_BASE + 37 * k, base: false, kind: 'five' });
    for (const [club, era] of FIVE) careers.push({ club, era, seed: SEED_BASE + 37 * k, base: true, kind: 'base' });
    for (const [club, era] of THREE) careers.push({ club, era, seed: SEED_BASE + 37 * k, base: false, kind: 'three' });
  }
  const rows = [];
  for (const c of careers) {
    let s = withSeed(c.seed, () => (c.era ? cm.startCareer(c.club, c.era) : cm.startCareer(c.club)));
    if (c.base) s.matchRules = 'base';
    let played = 0;
    for (let i = 0; played < MATCHES && i < MATCHES * 4; i++) {
      const r = withSeed(c.seed * 1000 + i, () => cm.playNextEntry(s));
      if (r.kind === 'seasonOver') break;
      if (r.kind !== 'halftime') { s = r.state; continue; }
      const rule = cm.matchRuleOf(r.state);
      const coached = withSeed(c.seed * 1000 + i + 500, () => cm.coachQuickMatch(r.state));
      const live = coached.live;
      const fin = withSeed(c.seed * 1000 + i + 700, () => cm.resumeMatch(coached));
      rows.push({
        kind: c.kind, club: c.club, rule, mine: live.subs ?? [],
        injuries: [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])],
        opp: fin.report?.detail?.oppSubs ?? [], named: !!live.oppXi,
      });
      s = fin.state;
      played += 1;
    }
  }
  fleetCache.set(cm, rows);
  return rows;
}
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* Section opponent. Measured on the runner at the defaults (3 seeds, 14 matches, seed base 7100; remote check
   r1331-s3c): 3.43 changes a match from them under five against 1.61 on the base rules, a gap of 1.82; with the
   opproom control in, 2.76 against 1.61, a gap of 1.15. The band sits between the two (see the notes for the
   gap over other seed bases). */
const OPP_GAP = Number(process.env.SUBS_OPP_GAP ?? 1.5);
function opponentSection(cm) {
  const P = 'opponent';
  const rows = quickFleet(cm).filter(r => r.named);
  let over = 0;
  for (const r of rows) {
    const stops = new Set(r.opp.map(s => s.minute)).size;
    if (r.opp.length > r.rule.subs || (r.rule.stops !== null && stops > r.rule.stops)) over += 1;
  }
  check(P, 'the other dugout never passes its rule\'s changes or stoppages', over === 0, `${over} of ${rows.length} matches over`);
  const five = rows.filter(r => r.kind === 'five'), base = rows.filter(r => r.kind === 'base');
  const m5 = mean(five.map(r => r.opp.length)), m3 = mean(base.map(r => r.opp.length));
  console.log(`   the other dugout: ${m5.toFixed(2)} changes a match under five (${five.length} matches), ${m3.toFixed(2)} on the base rules (${base.length})`);
  check(P, `under five they make more changes than on the base rules, by at least ${OPP_GAP}`, five.length >= 20 && base.length >= 20 && m5 - m3 >= OPP_GAP, `gap ${(m5 - m3).toFixed(2)}`);
  const fourPlus = five.filter(r => r.opp.length > 3).length;
  check(P, 'under five some matches see a fourth or fifth change from them', fourPlus > 0, `${fourPlus} of ${five.length}`);
  const doubled = five.filter(r => r.opp.length > new Set(r.opp.map(s => s.minute)).size).length;
  console.log(`   ${fourPlus} of ${five.length} five change matches saw them make four or five; ${doubled} had a double change`);
}

/* Section coach. */
function coachSection(cm) {
  const P = 'coach';
  const rows = quickFleet(cm);
  let over = 0, kept = 0, marks = 0, legs = 0;
  for (const r of rows) {
    const stops = new Set(r.mine.filter(s => s.stop).map(s => keyOf(s.minute, s.plus))).size;
    if (r.mine.length > r.rule.subs || (r.rule.stops !== null && stops > r.rule.stops)) over += 1;
    if (r.rule.stops === null && r.mine.some(s => 'stop' in s)) marks += 1;
    const seen = new Set();
    r.mine.forEach((s, i) => {
      if (s.stop) seen.add(keyOf(s.minute, s.plus));
      const injured = r.injuries.some(j => j.id && j.id === s.offId && j.minute <= s.minute);
      if (injured) return;
      legs += 1;
      /* A change at the break costs no stoppage, so only a change in play must leave one. */
      if (i + 1 > r.rule.subs - 1 || (r.rule.stops !== null && s.stop && seen.size > r.rule.stops - 1)) kept += 1;
    });
  }
  check(P, 'the coach never passes the rule\'s changes or stoppages', over === 0, `${over} of ${rows.length} matches over`);
  check(P, 'a three change match carries no stoppage marks', marks === 0, `${marks} matches marked`);
  check(P, 'every change he makes for legs keeps a change and a stoppage back', kept === 0 && legs > 0, `${kept} of ${legs} changes for legs kept nothing back`);
  for (const kind of ['five', 'base', 'three']) {
    const k = rows.filter(r => r.kind === kind);
    console.log(`   the coach: ${mean(k.map(r => r.mine.length)).toFixed(2)} changes a match, ${kind} (${k.length} matches)`);
  }
}
SECTIONS.opponent = opponentSection;
SECTIONS.coach = coachSection;

/* ---------------- the base arm (sections legacy, three, hotseat) ---------------- */
const SUBS_BASE = process.env.SUBS_BASE ?? '';
const LEGACY_SEEDS = Number(process.env.SUBS_LEGACY_SEEDS ?? 5);
const LEGACY_SEASONS = Number(process.env.SUBS_LEGACY_SEASONS ?? 2);
const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.matchRules; return c; };
const hashOf = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const QUICK = { coach: { skipHalftime: true }, noCoach: { skipHalftime: true, noCoach: true } };
const HOT_STYLE = { skipHalftime: true, noCoach: true, noBook: true };
/** A career played LEGACY_SEASONS seasons on one engine: the hash of its end state (matchRules taken off)
 *  and the draws it took. `base` sets matchRules 'base' after every call (a season roll may drop it). */
function playSeasons(cm, { club, era, seed, opts, base }) {
  DRAWS.n = 0;
  let s = withSeed(seed, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
  const setBase = () => { if (base) s.matchRules = 'base'; };
  setBase();
  for (let season = 0; season < LEGACY_SEASONS; season++) {
    for (let i = 0; i < 140; i++) {
      const r = withSeed(seed * 7919 + season * 997 + i + 1, () => cm.playNextEntry(s, opts));
      s = r.state;
      setBase();
      if (r.kind === 'seasonOver') break;
    }
    if (season + 1 < LEGACY_SEASONS) { s = withSeed(seed * 31 + season + 5, () => cm.startNextSeason(cm.finishSeason(s).state)); setBase(); }
  }
  return { hash: hashOf(strip(s)), draws: DRAWS.n, at: `season ${s.season} week ${s.week}` };
}
function compareArms(P, label, head, base, runs) {
  let bad = 0, first = '';
  for (const r of runs) {
    const h = playSeasons(head, { ...r, base: label === 'legacy' });
    const b = playSeasons(base, { ...r, base: false });
    if (h.hash !== b.hash || h.draws !== b.draws) { bad += 1; first ||= `${r.club} ${r.era ?? 'now'} seed ${r.seed} ${r.mode}: head ${h.hash} ${h.draws} draws, base ${b.hash} ${b.draws} draws (${h.at})`; }
  }
  check(P, `${runs.length} careers, every save byte and every draw equal to SUBS_BASE`, bad === 0 && runs.length > 0, bad ? `${bad} differ; first ${first}` : '');
}
function legacySection(cm, { base }) {
  const runs = [];
  for (let seed = 0; seed < LEGACY_SEEDS; seed++) {
    for (const [club, era] of [['Everton', 'era2005'], ['Barcelona', 'era2015'], ['Liverpool', null]]) {
      for (const mode of Object.keys(QUICK)) runs.push({ club, era, seed, mode, opts: QUICK[mode] });
    }
    for (const club of ['Westerlo', 'Nottingham Forest']) runs.push({ club, era: null, seed, mode: 'hotseat', opts: HOT_STYLE });
  }
  compareArms('legacy', 'legacy', cm, base, runs);
}
function threeSection(cm, { base, threeHead }) {
  const runs = [];
  for (let seed = 0; seed < LEGACY_SEEDS; seed++) {
    for (const [club, era] of [['Everton', 'era2005'], ['Barcelona', 'era2015']]) {
      for (const mode of Object.keys(QUICK)) runs.push({ club, era, seed, mode, opts: QUICK[mode] });
    }
  }
  compareArms('three', 'three', threeHead, base, runs);
}

/* Section press: every bigGame or derby question asked at a whistle names the next fixture's opponent. */
const PRESS_MATCHES = Number(process.env.SUBS_PRESS_MATCHES ?? 30);
function pressFleet(cm, onAsk) {
  const kinds = {};
  for (let k = 0; k < SEEDS; k++) {
    for (const [club, era] of [['Liverpool', null], ['Everton', null], ['Barcelona', null], ['Everton', 'era2005'], ['Burnley', null]]) {
      let s = withSeed(8300 + 41 * k, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
      for (let i = 0, played = 0; played < PRESS_MATCHES && i < PRESS_MATCHES * 3; i++) {
        const before = s.press?.pending ?? null;
        const week = s.week;
        const last = cm.nextFixture(s);
        const r = withSeed(8300 + 41 * k + 1000 * i, () => cm.playNextEntry(s, { skipHalftime: true }));
        if (r.kind === 'seasonOver') break;
        s = r.state;
        if (r.kind !== 'match') continue;
        played += 1;
        const q = s.press?.pending ?? null;
        if (!q || q === before || s.press.lastWeek !== week) continue;
        kinds[q.kind] = (kinds[q.kind] ?? 0) + 1;
        if (onAsk && (q.kind === 'bigGame' || q.kind === 'derby')) onAsk(q, cm.nextFixtureFrom ? cm.nextFixtureFrom(s, s.week) : null, last);
      }
    }
  }
  return kinds;
}
function pressSection(cm, { base }) {
  const P = 'press';
  let asked = 0, wrong = 0, first = '';
  const kinds = pressFleet(cm, (q, next, last) => {
    asked += 1;
    const lastOpp = last?.kind === 'match' ? last.opponent : null;
    const nextOpp = next?.kind === 'match' ? next.opponent : null;
    const ok = nextOpp !== null && q.text.includes(nextOpp) && (nextOpp === lastOpp || !lastOpp || !q.text.includes(lastOpp));
    if (!ok) { wrong += 1; first ||= `${q.kind}: "${q.text}" with ${lastOpp} just played and ${nextOpp} next`; }
  });
  check(P, 'every bigGame or derby question asked at a whistle names the next fixture\'s opponent', asked > 0 && wrong === 0, `${wrong} of ${asked} wrong${first ? `; first ${first}` : ''}`);
  console.log(`   question kinds at the whistle, head: ${JSON.stringify(kinds)}`);
  if (base) console.log(`   question kinds at the whistle, base: ${JSON.stringify(pressFleet(base, null))}`);
  const hs = HS.get(cm);
  const daily = withSeed(1, () => hs.dailyHotSeat('2026-10-12'));
  const acts = [{ t: 'match', m: 'balanced', talk: null }, { t: 'match', m: 'balanced', talk: null }];
  const dayRun = withSeed(2, () => hs.replayHotSeat({ club: daily.club, seed: daily.seed, daily: daily.daily }, acts));
  const freeRun = withSeed(3, () => hs.replayHotSeat({ club: daily.club, seed: daily.seed, rules: 1331 }, acts));
  const dayQ = dayRun.state.press?.pending?.text ?? '(none)', freeQ = freeRun.state.press?.pending?.text ?? '(none)';
  console.log(`   2026-10-12 daily at ${daily.club}: "${dayQ}"; the stamped free run on its seed: "${freeQ}"`);
  check(P, 'the 2026-10-12 daily still asks about Cercle Brugge (it is dated before the rules)', daily.club === 'Westerlo' && dayQ.includes('Cercle Brugge'));
  check(P, 'a stamped free run on the same seed asks about Gent after Cercle Brugge', freeQ.includes('Gent') && !freeQ.includes('Cercle Brugge'));
}

/* Section hotseat: the 30 dailies before the cutover and an unstamped free run replay exactly as on SUBS_BASE. */
function hotseatSection(cm, { base }) {
  const P = 'hotseat';
  const hs = HS.get(cm), hb = HS.get(base);
  const SCRIPT = Array.from({ length: 6 }, () => ({ t: 'match', m: 'balanced', talk: null }));
  const from = hs.HOT_SEAT_RULES_FROM;
  const dates = [];
  for (let d = new Date(Date.UTC(2026, 8, 24)); dates.length < 30; d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10));
  let bad = 0, unmarked = 0, first = '';
  for (const date of dates) {
    const sh = hs.dailyHotSeat(date), sb = hb.dailyHotSeat(date);
    const h = withSeed(11, () => hs.replayHotSeat({ club: sh.club, seed: sh.seed, daily: sh.daily }, SCRIPT));
    const b = withSeed(11, () => hb.replayHotSeat({ club: sb.club, seed: sb.seed, daily: sb.daily }, SCRIPT));
    if (date < from && h.state.matchRules !== 'base') unmarked += 1;
    const same = sh.club === sb.club && hashOf(strip(h.state)) === hashOf(strip(b.state)) && h.points === b.points && JSON.stringify(h.log) === JSON.stringify(b.log);
    if (!same) { bad += 1; first ||= `${date} ${sh.club}`; }
  }
  check(P, `the cutover ${from} falls after the 30 dates (${dates[0]} to ${dates.at(-1)})`, dates.at(-1) < from);
  check(P, 'every daily before the cutover plays the base rules', unmarked === 0, `${unmarked} of 30 unmarked`);
  check(P, 'every daily before the cutover replays exactly as on SUBS_BASE', bad === 0, bad ? `${bad} differ, first ${first}` : '');
  const free = { club: 'Westerlo', seed: 424242 };
  const fh = withSeed(12, () => hs.replayHotSeat(free, SCRIPT)), fb = withSeed(12, () => hb.replayHotSeat(free, SCRIPT));
  check(P, 'a free run saved without the stamp replays exactly as on SUBS_BASE', hashOf(strip(fh.state)) === hashOf(strip(fb.state)) && fh.points === fb.points);
  const carried = hs.handoverState(fh);
  check(P, 'the career carried on to Club Manager carries no matchRules', !('matchRules' in carried));
}
SECTIONS.legacy = legacySection;
SECTIONS.three = threeSection;
SECTIONS.press = pressSection;
SECTIONS.hotseat = hotseatSection;

/* ---------------- main ---------------- */
async function main() {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'simCmSubs-'));
  const source = await readFile(path.join(root, ENGINE), 'utf8');
  const ledger = JSON.parse(await readFile(path.join(root, LEDGER), 'utf8'));
  let text = source;
  const hsSource = await readFile(path.join(root, HS_FILE), 'utf8');
  let hsText = hsSource;
  const spec = CONTROLS[CONTROL];
  for (const [from, to] of spec?.patches ?? (spec?.from !== undefined ? [[spec.from, spec.to]] : [])) {
    const inHs = spec.file === HS_FILE;
    const n = (inHs ? hsText : text).split(from).length - 1;
    if (n !== 1) { console.log(`control ${CONTROL}: its anchor is in ${spec.file ?? ENGINE} ${n} times, not once; could not run`); process.exit(2); }
    if (inHs) hsText = hsText.replace(from, to); else text = text.replace(from, to);
  }
  if (CONTROL === 'onesource') {
    const fact = ledger.rows.find(r => r.league === 'premier')?.facts?.[0];
    if (!fact || !Array.isArray(fact.sources) || fact.sources.length < 2) { console.log('control onesource: no two sourced Premier League fact to cut; could not run'); process.exit(2); }
    fact.sources = fact.sources.slice(0, 1);
  }
  const needsEngine = PARTS.some(p => p !== 'ledger');
  const cm = needsEngine ? await bundleEngine(text, CONTROL || 'head', folder, { hsText: hsText === hsSource ? null : hsText }) : null;
  const ctx = { folder, source, text, base: null, threeHead: null };
  if (PARTS.some(p => BASE_PARTS.includes(p))) {
    if (!SUBS_BASE) { console.log('the base arm needs SUBS_BASE, a checkout of the base commit; could not run'); process.exit(2); }
    const baseText = await readFile(path.join(SUBS_BASE, ENGINE), 'utf8');
    ctx.base = await bundleEngine(baseText, 'base', folder, { srcRoot: path.join(SUBS_BASE, 'src') });
    await ctx.base.ensureAllEraRosters();
  } else if (SUBS_BASE && PARTS.includes('press')) {
    ctx.base = await bundleEngine(await readFile(path.join(SUBS_BASE, ENGINE), 'utf8'), 'base', folder, { srcRoot: path.join(SUBS_BASE, 'src') });
    await ctx.base.ensureAllEraRosters();
  }
  if (PARTS.includes('three')) {
    /* Section three: the current rules with the press read put back to the old week, so only the rule table can differ. */
    const pressLine = "  maybeAskPress(state, state.matchRules === 'base' ? undefined : live.week + 1);";
    if (text.split(pressLine).length - 1 !== 1) { console.log('section three: the press line is not in the engine once; could not run'); process.exit(2); }
    ctx.threeHead = await bundleEngine(text.replace(pressLine, '  maybeAskPress(state);'), 'three', folder, { hsText: hsText === hsSource ? null : hsText });
    await ctx.threeHead.ensureAllEraRosters();
  }
  /* The past seasons' squads load on demand in the game; every era this file plays is loaded first. */
  if (cm) await cm.ensureAllEraRosters();
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  const rule = await bundleRule(folder);
  for (const part of PARTS) {
    if (part === 'ledger') ledgerSection(ledger, rule);
    else if (part === 'rule') ruleSection(cm);
    else if (SECTIONS[part]) await SECTIONS[part](cm, ctx);
    else { console.log(`unknown part ${part}`); process.exit(2); }
  }
  const red = results.filter(r => !r.ok);
  if (CONTROL) {
    if (red.length) { console.log(`control ${CONTROL} FIRED: ${red.length} of ${results.length} checks red`); process.exit(1); }
    console.log(`control ${CONTROL} DID NOT FIRE: all ${results.length} checks stayed green`); process.exit(3);
  }
  console.log(`simCmSubs ${red.length ? 'RED' : 'GREEN'}: ${results.length - red.length} of ${results.length} checks green (parts ${PARTS.join(', ')})`);
  process.exit(red.length ? 1 : 0);
}
main().catch(e => { console.log(`simCmSubs could not run: ${e?.stack ?? e}`); process.exit(2); });
