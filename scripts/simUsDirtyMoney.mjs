/**
 * Round 1500 harness: what to do with dirty money, in all four US My Careers (src/lib/careerDirtyMoney.ts).
 *
 * Player report (/nba-my-career, 2026-10-16): "i got shady money and i want to wash it". The desk under the heat
 * meter offers four ways (come clean, give it away, keep it quiet, wash it) and prints every number before you
 * choose; the four "money has nowhere to live" cards wash on the same rule.
 *
 *   1. Words are the effect. A grid of dirty money (0.05 to 40M) by heat (0 to 100) by karma by cash by a pending
 *      ban, every way: the numbers its lines print (parsed back out of the words) are the change the desk applies.
 *   2. Keyed and stream free. Math.random throws on every call while the whole grid runs, and the same career asks
 *      twice gets the same answer.
 *   3. The rule exactly. Caught is the keyed draw below the printed whole percent, for every career of the grid;
 *      the caught share and the mean printed chance are printed side by side, never banded.
 *   7. Never a heat eraser, never a karma farm (the critic's correction 2, binding). Fleet saves of every sport
 *      (real careers through the bindings on the seeded stream, each also at heat 91, at heat 100, holding 20M
 *      more, broke at 1M and just back from a ban), every option of the four corruption decks that adds dirty money, then at once each way:
 *      the heat after is never below the heat before the option (exact), and the heat plus karma the desk hands
 *      back never adds up to more than the heat the option cost (its printed "heat +N"). Every dirty option in the
 *      four deck sources must be dealt at least once, or the fleet is too small. The table prints per option the
 *      worst net heat and the most handed back, and Give it away's karma per million beside the clean ways to give
 *      in the rivalry decks (printed, plus the one assertion that the desk never pays more karma a million than the
 *      cheapest clean gift).
 *   8. The help line holds: every binding's meter turns FLAGGED at 40 (the help's example says so) and every shop
 *      has three washers the desk can read.
 *
 * Controls (US_DIRTY_MONEY_CONTROL), each a one anchor edit of an isolated copy of careerDirtyMoney.ts, asserted
 * present once first. A control that fires exits 1 with its last line "CONTROL <name> FIRED"; one that does not
 * exits 2.
 *   words       the wash banks 60 percent while its line prints 70           -> section 1
 *   mathrandom  the wash draws Math.random                                    -> section 2
 *   flat        Come clean cools a flat 35 (the draft's number)               -> section 7, memorabilia among the red
 *   farm        Give it away pays up to 12 karma                              -> section 7
 *
 * Nothing here reaches the network. Run: node scripts/simUsDirtyMoney.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE = 'src/lib/careerDirtyMoney.ts';
const PER_SPORT = Number(process.env.US_DIRTY_MONEY_CAREERS || 120);
const control = process.env.US_DIRTY_MONEY_CONTROL || '';
const SPORTS = ['nba', 'nfl', 'mlb', 'nhl'];
const DECK_FILE = { nba: 'src/lib/nbaCareerCorruption.ts', nfl: 'src/lib/nflCareerCorruption.ts', mlb: 'src/lib/mlbCareerCorruption.ts', nhl: 'src/lib/nhlCareerCorruption.ts' };

const CONTROLS = {
  words: ['  if (n.way === \'wash\' && !caught) c.netWorth = round1((c.netWorth ?? 0) + n.keep);', '  if (n.way === \'wash\' && !caught) c.netWorth = round1((c.netWorth ?? 0) + round1(n.amount * 0.6));', [1]],
  mathrandom: ['  return keyedRng(launderKey(c))() < caughtPct / 100;', '  return Math.random() < caughtPct / 100;', [2]],
  flat: ['  if (heat >= 100) return 0;\n  return Math.max(0, Math.min(CLEAN_HEAT_CAP, Math.floor(dirty), Math.floor(heat)));', '  return Math.max(0, Math.min(35, Math.floor(heat)));', [7]],
  farm: ['export const GIVE_KARMA_CAP = 6;', 'export const GIVE_KARMA_CAP = 12;', [7]],
};
assert.ok(!control || control in CONTROLS, `Known control (${Object.keys(CONTROLS).join(', ')})`);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replaceAll('\r\n', '\n');
const source = read(MODULE);
for (const [anchor, replacement] of Object.values(CONTROLS)) {
  assert.equal(source.split(anchor).length - 1, 1, `Control anchor held once: ${anchor.slice(0, 60)}`);
  assert.notEqual(source.replace(anchor, () => replacement), source, 'Control changes the module');
}
const moduleText = control ? source.replace(CONTROLS[control][0], () => CONTROLS[control][1]) : source;

let failures = 0;
const red = new Map();
const fail = (section, who, m) => {
  failures += 1;
  const set = red.get(section) ?? new Set();
  if (!set.has(who) && set.size < 6) console.error(`  FAIL [section ${section}] ${who}: ${m}`);
  set.add(who);
  red.set(section, set);
};

/* ---------- one bundle: the module (or its control copy), the four bindings and the four decks ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'us-dirty1500-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const modulePath = path.join(ROOT, MODULE);
const swap = {
  name: 'dirty-money-copy',
  setup(b) {
    b.onLoad({ filter: /careerDirtyMoney\.ts$/ }, args => (path.resolve(args.path) === path.resolve(modulePath) ? { contents: moduleText, loader: 'ts', resolveDir: path.dirname(modulePath) } : undefined));
  },
};
const lib = rel => `${ROOT.replaceAll('\\', '/')}/src/lib/${rel}`;
fs.writeFileSync(path.join(tmp, 'entry.mjs'), [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export * as DM from '${lib('careerDirtyMoney.ts')}';`,
  `export { keyedRng } from '${lib('keyedRng.ts')}';`,
  `export { defaultAppearance } from '${lib('soccerCareerAppearance.ts')}';`,
  `export { NBA_CAREER_SPORT } from '${lib('nbaCareerSport.ts')}';`,
  `export { NFL_CAREER_SPORT } from '${lib('nflCareerSport.ts')}';`,
  `export { MLB_CAREER_SPORT } from '${lib('mlbCareerSport.ts')}';`,
  `export { NHL_CAREER_SPORT } from '${lib('nhlCareerSport.ts')}';`,
  `export { getNbaCorruptionEvents } from '${lib('nbaCareerCorruption.ts')}';`,
  `export { getNflCorruptionEvents } from '${lib('nflCareerCorruption.ts')}';`,
  `export { getMlbCorruptionEvents } from '${lib('mlbCareerCorruption.ts')}';`,
  `export { getNhlCorruptionEvents } from '${lib('nhlCareerCorruption.ts')}';`,
].join('\n'));
const built = await build({
  entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node',
  outfile: path.join(tmp, 'bundle.mjs'), logLevel: 'error', absWorkingDir: ROOT,
  alias: { '@': path.join(ROOT, 'src') }, metafile: true, plugins: [swap],
});
assert.ok(!Object.keys(built.metafile.inputs).some(f => f.includes('supabase')), 'No database client in the bundle');
const E = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
const { DM } = E;
const BIND = { nba: E.NBA_CAREER_SPORT, nfl: E.NFL_CAREER_SPORT, mlb: E.MLB_CAREER_SPORT, nhl: E.NHL_CAREER_SPORT };
const DECK = { nba: E.getNbaCorruptionEvents, nfl: E.getNflCorruptionEvents, mlb: E.getMlbCorruptionEvents, nhl: E.getNhlCorruptionEvents };
const clone = x => JSON.parse(JSON.stringify(x));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

/* ---------- sections 1 to 3: the grid ---------- */
const GRID_DIRTY = [0.05, 0.1, 0.4, 0.9, 1, 1.1, 2.5, 6, 9.5, 20, 40];
const GRID_HEAT = [0, 0.55, 3, 9, 39.5, 40, 64, 81, 88.95, 89, 90, 98, 99, 100];
const host = o => ({ name: 'Grid', year: 2031, seasons: [1, 2, 3], netWorth: 12, dirtyMoney: 5, heat: 40, fanbase: 60, morale: 70, karma: 55, ...o });
const num = (text, re) => { const mm = text.match(re); return mm ? Number(mm[1]) : null; };
function printed(way, lines) {
  const t = lines.join(' | ');
  if (way === 'clean') return { net: -(num(t, /plus a (\d+\.\d)M fine/) ?? 0), heat: num(t, /Heat (-\d+)/) ?? 0, karma: num(t, /Karma \+(\d+)/) ?? 0 };
  if (way === 'give') return { net: 0, heat: 0, karma: num(t, /Karma \+(\d+)/) ?? 0 };
  if (way === 'wash') return { heat: num(t, /Heat \+([\d.]+) now/) ?? 0, pct: num(t, /(\d+) percent chance/), keep: num(t, /Not caught: (\d+\.\d)M/), fan: num(t, /fanbase -(\d+)/), mor: num(t, /morale -(\d+)/), seized: num(t, /Caught: all (\d+\.\d)M/) };
  return {};
}
console.log('1-3) the grid: words, keys and the rule');
let gridCases = 0, caught = 0, washes = 0, pctSum = 0, idx = 0;
const realRandom = Math.random;
let drewRandom = 0;
Math.random = () => { drewRandom += 1; throw new Error('Math.random during the desk'); };
try {
  for (const dirtyMoney of GRID_DIRTY) for (const heat of GRID_HEAT) for (const karma of [undefined, 0, 50, 98, 100]) for (const netWorth of [undefined, 0, 0.3, 40]) for (const suspendedSeasons of [undefined, 0, 1]) {
    const c = host({ name: `Grid ${idx++}`, dirtyMoney, heat, karma, netWorth, suspendedSeasons, fanbase: heat > 50 ? 12 : 60 });
    const frozen = JSON.stringify(c);
    for (const way of DM.DIRTY_WAYS) {
      gridCases += 1;
      const who = `${way} at ${dirtyMoney}M heat ${heat}`;
      let p, r;
      try { p = DM.previewDirty(c, way); r = DM.dealWithDirtyMoney(c, way); } catch (e) { fail(2, way, `threw: ${e.message}`); continue; }
      if (JSON.stringify(c) !== frozen) fail(1, who, 'the desk changed its input');
      if (way === 'quiet') { if (r.state !== c || r.line !== '') fail(1, who, 'keep it quiet changed something'); continue; }
      const s = r.state, w = printed(way, p.lines);
      const dNet = r1((s.netWorth ?? 0) - (netWorth ?? 0)), dHeat = r2((s.heat ?? 0) - heat), dKarma = (s.karma ?? 50) - (karma ?? 50);
      if (s.dirtyMoney !== 0) fail(1, who, `dirty money left: ${s.dirtyMoney}`);
      if ((s.netWorth ?? 0) < 0) fail(1, who, `below zero: ${s.netWorth}`);
      if (way === 'wash') {
        washes += 1; pctSum += w.pct ?? 0;
        const again = DM.dealWithDirtyMoney(c, way);
        if (again.caught !== r.caught) fail(2, who, 'the same career asked twice got two answers');
        const draw = E.keyedRng(DM.launderKey(c))();
        if (r.caught !== (draw < (w.pct ?? -1) / 100)) fail(3, who, `caught ${r.caught} but the draw ${draw.toFixed(4)} against ${w.pct} percent says otherwise`);
        if (r.caught) caught += 1;
        if (dHeat !== w.heat) fail(1, who, `heat ${dHeat} applied, ${w.heat} printed`);
        if (w.seized !== r1(dirtyMoney) && !(dirtyMoney === 0.05 && w.seized === 0.1)) fail(1, who, `printed seized ${w.seized}`);
        if (r.caught) {
          if (dNet !== 0) fail(1, who, `a caught wash banked ${dNet}`);
          if (c.fanbase - s.fanbase !== w.fan || c.morale - s.morale !== w.mor) fail(1, who, `fanbase or morale off the print (${c.fanbase - s.fanbase}, ${c.morale - s.morale} against ${w.fan}, ${w.mor})`);
          if ((s.suspendedSeasons ?? 0) !== 1) fail(1, who, `suspension ${s.suspendedSeasons}`);
        } else {
          if (dNet !== w.keep) fail(1, who, `banked ${dNet}, printed ${w.keep}`);
          if (s.fanbase !== c.fanbase || s.morale !== c.morale || (s.suspendedSeasons ?? 0) !== (suspendedSeasons ?? 0)) fail(1, who, 'a clean wash touched the meters');
        }
      } else {
        if (dNet !== w.net) fail(1, who, `money ${dNet} applied, ${w.net} printed`);
        if (dHeat !== w.heat) fail(1, who, `heat ${dHeat} applied, ${w.heat} printed`);
        if (dKarma !== w.karma) fail(1, who, `karma ${dKarma} applied, ${w.karma} printed`);
      }
    }
  }
} finally {
  Math.random = realRandom;
}
if (drewRandom > 0) fail(2, 'Math.random', `the grid drew Math.random ${drewRandom} times`);
console.log(`   ${gridCases} cases, ${washes} washes: caught ${(100 * caught / Math.max(1, washes)).toFixed(1)} percent of them, mean printed chance ${(pctSum / Math.max(1, washes)).toFixed(1)} percent; Math.random draws ${drewRandom}`);

/* ---------- the fleet: real careers through the four bindings, on the seeded stream ---------- */
function playFleet(slug, n) {
  const sport = BIND[slug];
  const saves = [];
  for (let i = 0; i < n; i++) {
    const pos = sport.create.positions[i % sport.create.positions.length];
    const archs = sport.create.archetypes[pos];
    const eraId = sport.create.eras[i % sport.create.eras.length].id;
    const c = sport.startCareer(`Dirty ${slug} ${i}`, pos, archs[i % archs.length], Math.random, E.defaultAppearance(), eraId);
    let tq = sport.rollTeamQuality(null, Math.random);
    sport.assignRole(c, tq, Math.random);
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(sport.suspendedLine(c));
        sport.progress(c, Math.random);
      } else {
        sport.campBattle(c, tq, Math.random);
        sport.simSeason(c, tq, Math.random);
        sport.progress(c, Math.random);
      }
      saves.push(clone(c));
      const ev = sport.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      tq = sport.rollTeamQuality(tq, Math.random);
      if (sport.shouldRetire(c)) c.retired = true;
    }
  }
  return saves;
}

/* ---------- section 7: never a heat eraser, never a karma farm ---------- */
console.log('7) every corruption card that pays dirty money, followed at once by the desk');
const printedHeat = effect => num(effect, /heat \+(\d+)/i);
const WAYS = ['clean', 'give', 'wash'];
const table = new Map();
let optionRuns = 0;
const fleetSize = {};
for (const slug of SPORTS) {
  const saves = playFleet(slug, PER_SPORT);
  fleetSize[slug] = saves.length;
  for (const [vi, save] of saves.entries()) {
    /* The sixth variant has served a ban (its last season marked SUSPENDED, nothing pending): the only state the
       four "Reinstated" cards are dealt in. On the runner's stream the NFL fleet of 120 never reached one on its
       own (8 of 9 dirty options dealt, r1500-s1), so the variant deals it every time instead of by luck. */
    const banned = clone(save);
    if (banned.seasons.length) banned.seasons[banned.seasons.length - 1] = { ...banned.seasons[banned.seasons.length - 1], teamResult: 'SUSPENDED' };
    banned.suspendedSeasons = 0;
    const variants = [save, { ...clone(save), heat: 91 }, { ...clone(save), heat: 100 }, { ...clone(save), dirtyMoney: r1((save.dirtyMoney ?? 0) + 20) }, { ...clone(save), netWorth: 1 }, banned];
    for (const [k, base] of variants.entries()) {
      const deck = DECK[slug](clone(base), E.keyedRng(`deck|${slug}|${vi}|${k}`));
      for (const card of deck) for (const opt of card.options) {
        /* A cheap first look: an option whose code never names dirty money cannot add any. The applied change
           below is what decides. */
        if (!/dirty/i.test(String(opt.apply))) continue;
        const before = clone(base);
        const c = clone(base);
        opt.apply(c, E.keyedRng(`opt|${slug}|${vi}|${k}|${card.id}`));
        if ((c.dirtyMoney ?? 0) <= (before.dirtyMoney ?? 0)) continue;
        const key = `${slug} ${card.id} / ${opt.label}`;
        let cost = printedHeat(opt.effect);
        if (cost == null) {
          const z = { ...clone(base), heat: 0 };
          opt.apply(z, E.keyedRng(`zero|${slug}|${vi}`));
          cost = z.heat ?? 0;
        }
        const row = table.get(key) ?? { slug, card: card.id, label: opt.label, dirty: r1((c.dirtyMoney ?? 0) - (before.dirtyMoney ?? 0)), cost, saves: 0, worstNet: {}, mostBack: {} };
        row.saves += 1;
        for (const way of WAYS) {
          optionRuns += 1;
          const r = DM.dealWithDirtyMoney(c, way);
          const net = r2((r.state.heat ?? 0) - (before.heat ?? 0));
          const back = r2(Math.max(0, (c.heat ?? 0) - (r.state.heat ?? 0)) + Math.max(0, (r.state.karma ?? 50) - (c.karma ?? 50)));
          row.worstNet[way] = Math.min(row.worstNet[way] ?? Infinity, net);
          row.mostBack[way] = Math.max(row.mostBack[way] ?? -Infinity, back);
          if (net < 0) fail(7, key, `${way} leaves heat ${net} below where it was before the card (heat ${before.heat ?? 0}, ${before.dirtyMoney ?? 0}M held)`);
          if (back > cost) fail(7, key, `${way} hands back ${back} of heat and karma for a card that cost heat +${cost}`);
        }
        table.set(key, row);
      }
    }
  }
}
/* Every dirty option in the four sources must have been dealt: the count of dirty(cc, ...) calls per deck file. */
for (const slug of SPORTS) {
  const inSource = (read(DECK_FILE[slug]).match(/dirty\(cc, /g) ?? []).length;
  const dealt = [...table.values()].filter(r => r.slug === slug).length;
  console.log(`   ${slug}: ${fleetSize[slug]} fleet saves, ${dealt} of ${inSource} dirty options dealt`);
  if (dealt < inSource) fail(7, `${slug} coverage`, `only ${dealt} of the ${inSource} dirty options in ${DECK_FILE[slug]} were dealt: widen the fleet (US_DIRTY_MONEY_CAREERS)`);
}
console.log(`   ${optionRuns} card then desk runs. Per option: dirty paid, heat it cost, saves, then per way the worst net heat and the most handed back:`);
for (const row of [...table.values()].sort((a, b) => a.slug.localeCompare(b.slug) || a.cost - b.cost)) {
  const ways = WAYS.map(w => `${w} ${row.worstNet[w]}/${row.mostBack[w]}`).join(', ');
  console.log(`     ${row.slug} ${row.card} "${row.label}": ${row.dirty}M, heat +${row.cost}, ${row.saves} saves; ${ways}`);
}
/* Give it away's karma a million beside the clean ways to give in the four rivalry decks (cash out, karma in). */
const cleanGifts = [];
for (const slug of SPORTS) {
  const text = read(`src/lib/${slug}CareerRivalryEvents.ts`);
  for (const mm of text.matchAll(/effect: \{ cash: -(\d+(?:\.\d+)?)([^}]*)\}/g)) {
    const karma = num(mm[2], /karma: (\d+)/);
    if (karma) cleanGifts.push({ slug, cash: Number(mm[1]), karma, perM: karma / Number(mm[1]) });
  }
}
const cheapest = Math.min(...cleanGifts.map(g => g.perM));
console.log(`   clean gifts in the rivalry decks: ${cleanGifts.map(g => `${g.slug} ${g.cash}M for karma +${g.karma} (${g.perM.toFixed(1)} a million)`).join('; ')}`);
for (const d of [1, 2.5, 6, 10, 20]) {
  const give = DM.previewDirty(host({ dirtyMoney: d, karma: 0 }), 'give').karma;
  const clean = DM.previewDirty(host({ dirtyMoney: d, karma: 0 }), 'clean').karma;
  console.log(`   desk at ${d}M: give it away karma +${give} (${(give / d).toFixed(2)} a million), come clean karma +${clean}`);
  if (give / d > cheapest) fail(7, `give at ${d}M`, `pays ${(give / d).toFixed(2)} karma a million, more than the cheapest clean gift (${cheapest.toFixed(2)})`);
}
if (!cleanGifts.length) fail(7, 'clean gifts', 'no clean gift found in the rivalry decks: the reader is broken');

/* ---------- section 8: the help line holds ---------- */
console.log('8) the help line: FLAGGED at 40 and three washers in every shop');
for (const slug of SPORTS) {
  const sport = BIND[slug];
  if (sport.heatLabel(40).label !== 'FLAGGED' || sport.heatLabel(39.9).label === 'FLAGGED') fail(8, slug, 'the meter does not turn FLAGGED at 40, and the help example says it does');
  if (DM.washerIds(sport.shopItems).length !== 3) fail(8, slug, `the shop holds ${DM.washerIds(sport.shopItems).length} washers`);
}
if (!DM.US_DIRTY_MONEY_HELP_RULE.includes('just turned FLAGGED')) fail(8, 'help', 'the help line no longer names FLAGGED');

/* ---------- the end ---------- */
const redSections = [...red.keys()].sort();
if (control) {
  const want = CONTROLS[control][2];
  const fired = want.every(s => red.has(s));
  for (const s of want) console.log(`   control ${control}: section ${s} turned ${red.get(s)?.size ?? 0} red`);
  if (control === 'flat' && !(red.get(7)?.has([...table.keys()].find(k => k.includes('ncorr_memorabilia')) ?? 'none'))) {
    console.log('CONTROL flat DID NOT FIRE on the memorabilia card');
    process.exit(2);
  }
  console.log(fired ? `CONTROL ${control} FIRED (red sections ${redSections.join(', ')})` : `CONTROL ${control} DID NOT FIRE (red sections ${redSections.join(', ') || 'none'})`);
  process.exit(fired ? 1 : 2);
}
console.log(failures ? `simUsDirtyMoney: ${failures} failures in sections ${redSections.join(', ')}` : 'simUsDirtyMoney: all sections green');
process.exit(failures ? 1 : 0);
