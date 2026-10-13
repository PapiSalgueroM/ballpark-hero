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

   Controls (SUBS_CONTROL=<name>), each asserting its anchor is present first and printing how many
   checks it turned red; a control that fires nothing is a failed run:
     onesource  one league fact loses a source in memory: ledger red.
     oldcap     the rule answers three everywhere (the plan's control): the 2026 checks red.
     nostops    the stoppage check off: rule red.
     htstop     half time counts as a stoppage: rule red.
     opproom    the other dugout's room back to MAX_HALFTIME_SUBS less the changes made: opponent red.
     coachall   the coach keeps nothing back (his three keep back lines opened): coach red.

   Exit 0 green, 1 red or a control fired, 2 could not run, 3 a control did not fire. */
import './lib/offlineTransport.cjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const LEDGER = 'scripts/data/cmSubsRuleSources.json';
const CONTROL = process.env.SUBS_CONTROL ?? '';
const partArg = process.argv.find(a => a.startsWith('--part='));
const ALL_PARTS = ['ledger', 'rule', 'opponent', 'coach'];
/** The engine sections past rule register here as they are defined below. */
const SECTIONS = {};

const CONTROLS = {
  onesource: { part: 'ledger' },
  oldcap: { part: 'rule', from: '  return subsRuleFor(subsLeagueBase(careerLeagueOf(career).id), worldYear(career));', to: '  return { subs: MAX_SUBS, stops: null, partial: false };' },
  nostops: { part: 'rule', from: '    if (inPlay && !sharesStop(live, m, p) && stopsUsed(live) >= rule!.stops!) return null;', to: '' },
  htstop: { part: 'rule', from: '  if (!live.h2Drawn && minute >= 46) return true;', to: '  if (false) return true;' },
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

export function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => {
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
async function bundleEngine(text, name, folder) {
  const target = path.join(folder, `${name}.ts`);
  const output = path.join(folder, `${name}.cjs`);
  await writeFile(target, text);
  await build({ entryPoints: [target], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias: { '@/lib/clubManager': target, '@': path.join(root, 'src') } });
  return require(output);
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
const FIVE = [['Liverpool', null], ['Barcelona', null], ['Bayern Munich', null]];
const THREE = [['Everton', 'era2005'], ['Real Madrid', 'era2015']];
const fleetCache = new Map();
const keyOf = (minute, plus) => `${minute}|${plus ?? 0}`;
/** Every match of the fleet: the rule, my changes (with their stoppage marks), my injuries, their changes. */
export function quickFleet(cm) {
  if (fleetCache.has(cm)) return fleetCache.get(cm);
  const careers = [];
  for (let k = 0; k < SEEDS; k++) {
    for (const [club, era] of FIVE) careers.push({ club, era, seed: 7100 + 37 * k, base: false, kind: 'five' });
    for (const [club, era] of FIVE) careers.push({ club, era, seed: 7100 + 37 * k, base: true, kind: 'base' });
    for (const [club, era] of THREE) careers.push({ club, era, seed: 7100 + 37 * k, base: false, kind: 'three' });
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

/* Section opponent. Measured at the defaults (3 seeds, 14 matches): see OPP_GAP. */
const OPP_GAP = Number(process.env.SUBS_OPP_GAP ?? 1.2);
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

/* ---------------- main ---------------- */
async function main() {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'simCmSubs-'));
  const source = await readFile(path.join(root, ENGINE), 'utf8');
  const ledger = JSON.parse(await readFile(path.join(root, LEDGER), 'utf8'));
  let text = source;
  const spec = CONTROLS[CONTROL];
  for (const [from, to] of spec?.patches ?? (spec?.from !== undefined ? [[spec.from, spec.to]] : [])) {
    const n = text.split(from).length - 1;
    if (n !== 1) { console.log(`control ${CONTROL}: its anchor is in the engine ${n} times, not once; could not run`); process.exit(2); }
    text = text.replace(from, to);
  }
  if (CONTROL === 'onesource') {
    const fact = ledger.rows.find(r => r.league === 'premier')?.facts?.[0];
    if (!fact || !Array.isArray(fact.sources) || fact.sources.length < 2) { console.log('control onesource: no two sourced Premier League fact to cut; could not run'); process.exit(2); }
    fact.sources = fact.sources.slice(0, 1);
  }
  const needsEngine = PARTS.some(p => p !== 'ledger');
  const cm = needsEngine ? await bundleEngine(text, CONTROL || 'head', folder) : null;
  /* The past seasons' squads load on demand in the game; every era this file plays is loaded first. */
  if (cm) await cm.ensureAllEraRosters();
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  const rule = await bundleRule(folder);
  for (const part of PARTS) {
    if (part === 'ledger') ledgerSection(ledger, rule);
    else if (part === 'rule') ruleSection(cm);
    else if (SECTIONS[part]) await SECTIONS[part](cm, { folder, source, text });
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
