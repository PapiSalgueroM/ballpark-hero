/* Club Manager: the squad page rows (Round 715, master spec section 39).

   The spec asks every squad row for age, position, rating, potential, role,
   wages, contract, morale, fitness, form, availability and the flag, with a
   click through to performance, morale, wage, game time and role
   satisfaction and transfer interest. Before this round the row had no
   potential, no wage, no contract and no value, nothing sorted, and nothing
   opened. The engine is not touched: every number the row prints is one the
   engine already exposes, and the one it keeps hidden (the true ceiling) is
   only ever shown as the band the club's scouts would give.

   Sections:
     1) the scouts' band, over every day one squad of the first four clubs in
        each current league plus a 2010 save, at every lead scout level:
        a) it always contains the truth;
        b) it is never the truth on its own (always at least two wide);
        c) the same player gets the same band every time (and after a save
           round trip), so it does not flicker between visits;
        d) the middle of the band is not the answer: where no clamp touched
           it, the truth sits dead centre in only a minority of bands;
        e) a better lead scout narrows it: mean width at level 10 against
           level 1.
     2) every sort key, both ways, orders the squad by the number the row
        prints (the ceiling by the band shown, never the hidden truth),
        blanks last.
     3) the rendered list (SquadScreen through react-dom/server): one row a
        player, in rating order by default, and every row's wage, deal,
        worth, ceiling and phone cell is the engine's own figure, in the
        save's currency, at the save's lead scout level; eleven sortable
        heads and a phone picker with the same eleven.
     4) the true ceiling is read in exactly one place: in SquadScreen.tsx
        (comments stripped) every `.potential` sits inside scoutBand.
     5) the tap open detail: eight tiles for every player, the ceiling tile
        is the band, the worth tile is the sale value, and planted states
        come through: a bid, a met clause, a transfer request, a star told
        he is a backup, an injury.
     6) the tile rule: the list renders collapsed (no detail until a tap),
        every row has exactly one phone only number cell, and every desktop
        column is hidden below 768.

   Negative controls (SQUAD_ROWS_CONTROL=<name>), each refusing to run if its
   rewrite matched nothing. The section a control names must go red, and the
   run exits non zero either way (1 when it did, 3 when the named section
   stayed green). Three of them also turn a second section red, because the
   defect they plant is one the later section reads too, and that is the
   later section doing its job rather than the control leaking:
     truth      the band collapses onto the true ceiling          section 1b
                (also 1d and 1e: a collapsed band leaves no unclamped
                bands to centre and no width to narrow)
     centred    the band is centred on the truth                  section 1d
     flatscout  the width ignores the lead scout                  section 1e
     sorttruth  the ceiling sort reads the hidden truth            section 2
                (also 4: that read of .potential sits outside scoutBand,
                which is exactly what section 4 hunts)
     nowage     the row loses its wage cell                       section 3
                (also 6: the wage cell is one of the desktop only
                columns section 6 expects hidden below 768)
     rawpot     the ceiling cell's hover title prints the truth   section 4
     deaf       the interest tile ignores the bids on the table   section 5
     allopen    every row renders opened                          section 6

   Thresholds, measured on this harness's seed and SIM_SEED=1, 2, 3 on
   2026-09-30 (the numbers are printed on every run):
     truth dead centre, unclamped bands   see the MID_CEILING note below
     width ratio, scout 10 over scout 1   see the RATIO_CEILING note below

   Run: node scripts/simSquadRows.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREEN = path.join(ROOT, 'src', 'components', 'club-manager', 'SquadScreen.tsx');
const CONTROL = process.env.SQUAD_ROWS_CONTROL || '';
const CONTROLS = ['truth', 'centred', 'flatscout', 'sorttruth', 'nowage', 'rawpot', 'deaf', 'allopen'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SQUAD_ROWS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(2);
}

let failures = 0;
const failed = new Set();
let section = '';
const fail = m => { failures += 1; failed.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const lf = s => s.replaceAll('\r\n', '\n');

/* ---- the screen, rewritten when a control asks ---- */
const REWRITES = {
  truth: [[
    '  return { low, high };\n}',
    '  return { low: truth, high: truth + 0 * (low + high) };\n}',
  ]],
  centred: [[
    '  let low = truth - Math.round(bandSeed(p.id) * width);\n',
    '  let low = truth - Math.floor(width / 2) + 0 * bandSeed(p.id);\n',
  ]],
  flatscout: [[
    '  const level = Math.min(10, Math.max(1, Math.round(scoutLevel)));\n',
    '  const level = 1 + 0 * scoutLevel;\n',
  ]],
  sorttruth: [[
    '      return b ? (b.low + b.high) / 2 + b.high / 1000 : null;\n',
    '      return b ? (p.potential as number) + 0 * b.low : null;\n',
  ]],
  nowage: [[
    '        <span data-cm-cell="wage" className="hidden md:block text-[11px] text-foreground/80 text-right tabular-nums">{typeof p.wage === \'number\' ? `${p.wage}k` : \'-\'}</span>\n',
    '',
  ]],
  rawpot: [[
    '<span data-cm-cell="pot" title="Where the scouts reckon he tops out"',
    '<span data-cm-cell="pot" title={`Where the scouts reckon he tops out, really ${p.potential}`}',
  ]],
  deaf: [[
    '  const mine = bids.filter(b => b.playerId === p.id);\n',
    '  const mine = bids.filter(b => b.playerId === p.id && false);\n',
  ]],
  allopen: [[
    '  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());\n',
    '  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(squad.map(p => p.id)));\n',
  ]],
};
const screenOnDisk = lf(fs.readFileSync(SCREEN, 'utf8'));
let screenSource = screenOnDisk;
if (CONTROL) {
  for (const [from, to] of REWRITES[CONTROL]) {
    const n = screenSource.split(from).length - 1;
    if (n !== 1) {
      console.error(`control cannot run: SQUAD_ROWS_CONTROL=${CONTROL} expects its target exactly once in SquadScreen.tsx and found it ${n} times (${from.trim().slice(0, 70)}...)`);
      process.exit(1);
    }
    screenSource = screenSource.replace(from, to);
  }
  if (screenSource === screenOnDisk) {
    console.error(`control cannot run: SQUAD_ROWS_CONTROL=${CONTROL} changed nothing`);
    process.exit(1);
  }
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; the section it names must go red`);
}

/* One CommonJS bundle: the engine, the staff module and the real screen (the
   rewritten one under a control), rendered through react-dom/server. */
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-squad-rows-'));
const bundle = path.join(temp, 'squadRows.cjs');
await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      export * as cm from './src/lib/clubManager';
      export * as staff from './src/lib/clubManagerStaff';
      export * as start from './src/lib/clubManagerStart';
      export * as screen from './src/components/club-manager/SquadScreen';
      export const render = (C, props) => renderToStaticMarkup(React.createElement(C, props));
    `,
    resolveDir: ROOT,
    loader: 'tsx',
  },
  bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: bundle,
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  plugins: [{
    name: 'squad-screen-under-test',
    setup(b) {
      b.onLoad({ filter: /SquadScreen\.tsx$/ }, () => ({ contents: screenSource, loader: 'tsx', resolveDir: path.dirname(SCREEN) }));
    },
  }],
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, staff, start, screen, render } = createRequire(import.meta.url)(bundle);
fs.rmSync(temp, { recursive: true, force: true });
const { scoutBand, scoutBandWidth, sortSquad, SQUAD_SORTS, SquadScreen, SquadRowDetail } = screen;

const clone = s => JSON.parse(JSON.stringify(s));
const decode = s => s.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/** A save with the lead scout set to this level (the post is filled with the day one man, then his level is set). */
function withScout(career, level) {
  const next = clone(career);
  const s = staff.ensureStaff(next);
  if (s.scout) s.scout.level = level;
  return next;
}

/* ---- the saves: day one squads across every current league, and a 2010 world ---- */
const careers = [];
for (const lg of cm.REAL_LEAGUES) {
  for (const club of lg.clubs.slice(0, 4)) careers.push(cm.startCareer(club));
}
const era = cm.ERA_LEAGUES.era2010?.[0];
if (era) for (const club of era.clubs.slice(0, 3)) careers.push(cm.startCareer(club, 'era2010'));
const players = careers.flatMap(c => c.squad);
console.log(`   ${careers.length} saves, ${players.length} players`);
if (careers.length < 20 || players.length < 400) { section = 'setup'; fail('too few saves or players to measure anything'); }

/* ================================================================== */
section = '1b';
console.log('1) The scouts\' band');
/* ================================================================== */
{
  let contains = 0, total = 0, alone = 0, unrated = 0, unstable = 0;
  const mids = { unclamped: 0, dead: 0 };
  const widthBy = { 1: [], 10: [] };
  for (const p of players) {
    if (typeof p.potential !== 'number') { unrated += 1; continue; }
    const truth = Math.max(p.potential, p.rating);
    for (let level = 1; level <= 10; level++) {
      const b = scoutBand(p, level);
      total += 1;
      if (b.low <= truth && truth <= b.high) contains += 1;
      if (b.high - b.low < 2) alone += 1;
      const again = scoutBand(clone(p), level);
      if (again.low !== b.low || again.high !== b.high) unstable += 1;
      if (level === 1 || level === 10) widthBy[level].push(b.high - b.low);
      const w = scoutBandWidth(p.age, level);
      if (b.low > p.rating && b.high < 99 && b.high - b.low === w) {
        mids.unclamped += 1;
        const pos = truth - b.low;
        if (pos === Math.floor(w / 2) || pos === Math.ceil(w / 2)) mids.dead += 1;
      }
    }
  }
  console.log(`   ${total} bands read (${unrated} players unrated), ${contains} contain the truth, ${alone} under two points wide, ${unstable} changed on a second read`);
  section = '1a';
  if (unrated > 0) fail(`${unrated} day one players have no ceiling at all, so the band has nothing to read`);
  if (contains !== total) fail(`${total - contains} bands do not contain the true ceiling`);
  section = '1b';
  if (alone > 0) fail(`${alone} bands are under two points wide, which prints the hidden number or next to it`);
  section = '1c';
  if (unstable > 0) fail(`${unstable} bands changed between two reads of the same player`);

  /* MID_CEILING. On the shipped function about a third of the unclamped
     bands put the truth dead centre (uniform placement over a band of w
     points gives roughly 1 in w/2, more for the two point bands where the
     middle is one of three places); centred puts it there every time. The
     line sits between the two. */
  section = '1d';
  const MID_CEILING = 0.6;
  const deadShare = mids.dead / Math.max(1, mids.unclamped);
  console.log(`   truth dead centre in ${(deadShare * 100).toFixed(1)}% of ${mids.unclamped} unclamped bands (ceiling ${MID_CEILING * 100}%)`);
  if (mids.unclamped < 500) fail(`only ${mids.unclamped} unclamped bands, too few to say where the truth sits`);
  if (deadShare >= MID_CEILING) fail(`the truth sits dead centre in ${(deadShare * 100).toFixed(1)}% of bands, so the middle of the band gives the hidden number away`);

  /* RATIO_CEILING. Mean width at scout level 10 over level 1. The shipped
     widths run 9, 6, 4 and 2 by age at level 1 and 4, 3, 2 and 2 at level
     10, which measures near 0.55 on these squads; a width that ignores the
     scout reads exactly 1. */
  section = '1e';
  const RATIO_CEILING = 0.8;
  const ratio = mean(widthBy[10]) / mean(widthBy[1]);
  console.log(`   mean width ${mean(widthBy[1]).toFixed(2)} at scout level 1, ${mean(widthBy[10]).toFixed(2)} at level 10, ratio ${ratio.toFixed(3)} (ceiling ${RATIO_CEILING})`);
  if (!(ratio < RATIO_CEILING)) fail(`a level 10 lead scout reads ceilings ${ratio.toFixed(3)} as wide as a level 1, so hiring one buys nothing on this page`);
}

/* ================================================================== */
section = '2';
console.log('2) Every sort orders by what the row prints');
/* ================================================================== */
{
  /* The harness's own reading of each key, off the engine and the band the
     row prints, never off the screen's sort helper. */
  const shown = (p, key, level) => {
    switch (key) {
      case 'ovr': return p.rating;
      case 'pot': { const b = scoutBand(p, level); return b ? (b.low + b.high) / 2 + b.high / 1000 : null; }
      case 'form': return (p.apps ?? 0) > 0 ? p.ratingSum / p.apps : null;
      case 'age': return p.age;
      case 'wage': return typeof p.wage === 'number' ? p.wage : null;
      case 'deal': return p.onLoan || typeof p.contractYears !== 'number' ? null : p.contractYears;
      case 'worth': return p.onLoan ? null : cm.sellValue(p);
      case 'fit': return p.fitness;
      case 'mood': return p.morale;
      case 'pos': return ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'].indexOf(p.position);
      case 'name': return p.name;
      default: return undefined;
    }
  };
  let orders = 0, bad = 0, moved = 0;
  const keys = SQUAD_SORTS.map(s => s.key);
  if (keys.length !== 11) fail(`expected eleven sort keys, found ${keys.length}`);
  for (const c of careers) {
    /* Played squads carry form and loan men; a fresh one has neither. Give
       half the squad a few games so form is not all blanks. */
    const squad = clone(c.squad);
    squad.forEach((p, i) => { if (i % 2 === 0) { p.apps = 3 + (i % 5); p.ratingSum = p.apps * (6 + ((i * 7) % 30) / 10); } });
    const level = 1 + (orders % 10);
    const byRating = sortSquad(squad, 'ovr', 'desc', level).map(p => p.id).join();
    for (const key of keys) {
      for (const dir of ['asc', 'desc']) {
        orders += 1;
        const out = sortSquad(squad, key, dir, level);
        if (out.length !== squad.length) { bad += 1; fail(`${c.clubName} ${key} ${dir} returned ${out.length} of ${squad.length}`); continue; }
        if (out.map(p => p.id).join() !== byRating) moved += 1;
        const vals = out.map(p => shown(p, key, level));
        let seenNull = false;
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === null) { seenNull = true; continue; }
          if (seenNull) { bad += 1; fail(`${c.clubName} ${key} ${dir}: a blank sorted above a value`); break; }
          if (i > 0 && vals[i - 1] !== null) {
            const a = vals[i - 1], b = vals[i];
            const cmp = typeof a === 'string' ? a.localeCompare(b) : a - b;
            if ((dir === 'asc' && cmp > 0) || (dir === 'desc' && cmp < 0)) {
              bad += 1;
              if (bad <= 5) fail(`${c.clubName} ${key} ${dir}: ${out[i - 1].name} (${a}) above ${out[i].name} (${b})`);
              break;
            }
          }
        }
      }
    }
  }
  console.log(`   ${orders} orderings checked, ${bad} out of order, ${moved} differ from the rating order`);
  if (bad > 0) fail(`${bad} orderings do not follow what the row prints`);
  if (moved < orders / 2) fail(`only ${moved} of ${orders} orderings moved anybody, the sort is not doing anything`);
}

/* ---- markup readers ---- */
function rowsOf(html) {
  return html.split('data-cm-squad-row="').slice(1).map(chunk => {
    const id = chunk.slice(0, chunk.indexOf('"'));
    const band = (chunk.match(/data-cm-pot-band="([^"]*)"/) || [])[1] ?? null;
    const cells = {};
    for (const m of chunk.matchAll(/data-cm-cell="(\w+)"((?:\s+[\w-]+="[^"]*")*)>([^<]*)</g)) {
      if (!(m[1] in cells)) cells[m[1]] = { attrs: m[2], text: decode(m[3]) };
    }
    return { id, band, cells, chunk };
  });
}
function tilesOf(html) {
  const out = {};
  for (const m of html.matchAll(/data-cm-detail="(\w+)"[^>]*><div[^>]*>([^<]*)<\/div><div[^>]*>([^<]*)<\/div>(?:<div[^>]*>([^<]*)<\/div>)?/g)) {
    out[m[1]] = { label: decode(m[2]), value: decode(m[3]), sub: decode(m[4] ?? '') };
  }
  return out;
}

/* ================================================================== */
section = '3';
console.log('3) Every row prints the engine\'s own numbers');
/* ================================================================== */
{
  let rows = 0, wrong = 0, heads = 0, currencies = new Set();
  const CURRENCIES = ['GBP', 'EUR', 'USD', 'BRL', 'JPY'];
  careers.forEach((base, ci) => {
    let career = withScout(base, 1 + ((ci * 3) % 10));
    /* Rotate the money symbol the start options offer, so a save in euros
       prints euros. The option is set the way the page sets it. */
    const cur = CURRENCIES[ci % CURRENCIES.length];
    if (cur !== 'GBP') {
      const withCur = start.setStartOption(career, 'currency', cur);
      if (!withCur) { wrong += 1; fail(`${career.clubName}: the start options refused currency ${cur}`); return; }
      career = withCur;
    }
    const level = staff.staffLevel(career, 'scout');
    const money = cm.moneyIn(career);
    const html = render(SquadScreen, {
      squad: career.squad, xiIds: career.xiIds, eraId: career.eraId,
      captainId: career.setPieces?.captain ?? null, career,
    });
    const found = rowsOf(html);
    rows += found.length;
    if (found.length !== career.squad.length) { wrong += 1; fail(`${career.clubName}: ${found.length} rows for ${career.squad.length} players`); return; }
    const expectOrder = sortSquad(career.squad, 'ovr', 'desc', level).map(p => p.id);
    if (found.map(r => r.id).join() !== expectOrder.join()) { wrong += 1; fail(`${career.clubName}: the default order is not best rated first`); }
    const byId = new Map(career.squad.map(p => [p.id, p]));
    for (const r of found) {
      const p = byId.get(r.id);
      if (!p) { wrong += 1; fail(`${career.clubName}: a row for nobody (${r.id})`); continue; }
      const b = scoutBand(p, level);
      const bandTxt = b ? `${b.low}-${b.high}` : '?';
      const expect = {
        wage: typeof p.wage === 'number' ? `${p.wage}k` : '-',
        deal: p.onLoan ? 'Loan' : `${p.contractYears}y`,
        worth: p.onLoan ? '-' : money(cm.sellValue(p)),
        pot: bandTxt,
        phone: bandTxt,
        ovr: String(p.rating),
        age: String(p.age),
      };
      for (const [cell, want] of Object.entries(expect)) {
        const got = r.cells[cell]?.text;
        if (got !== want) {
          wrong += 1;
          if (wrong <= 6) fail(`${career.clubName} ${p.name}: the ${cell} cell reads "${got ?? '(missing)'}", the engine says "${want}"`);
        }
      }
      if (r.band !== (b ? `${b.low}-${b.high}` : '')) { wrong += 1; fail(`${career.clubName} ${p.name}: the row's band attribute disagrees with the band it prints`); }
      if (cur !== 'GBP' && !p.onLoan) currencies.add(expect.worth.replace(/[\d.,]+[mkbn]*$/, ''));
    }
    const sortHeads = [...html.matchAll(/data-cm-sort="(\w+)"/g)].map(m => m[1]);
    const options = [...html.matchAll(/<option value="(\w+)"/g)].map(m => m[1]);
    heads += sortHeads.length;
    if (new Set(sortHeads).size !== 11) { wrong += 1; fail(`${career.clubName}: ${new Set(sortHeads).size} sortable column heads, not 11`); }
    if (new Set(options).size !== 11 || !/aria-label="Sort squad"/.test(html)) { wrong += 1; fail(`${career.clubName}: the phone sort picker offers ${new Set(options).size} sorts, not 11`); }
  });
  console.log(`   ${rows} rows rendered over ${careers.length} saves, ${heads} sort heads, ${wrong} wrong; money printed as ${[...currencies].join(' ') || '(none)'}`);
  if (rows < 400) fail(`only ${rows} rows rendered`);
  if (currencies.size < 3) fail(`a save in another currency printed ${[...currencies].join(' ') || 'nothing'}, the worth cell is not following the start option`);
  if (wrong > 0) fail(`${wrong} cells or lists disagree with the engine`);
}

/* ================================================================== */
section = '4';
console.log('4) The true ceiling is read in one place');
/* ================================================================== */
{
  /* Code, not comments: the header of the screen talks about p.potential on
     purpose, and a guard that read it would be green for the wrong reason. */
  const code = screenSource
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
  const start = code.indexOf('export function scoutBand(');
  const end = start >= 0 ? code.indexOf('\n}\n', start) : -1;
  if (start < 0 || end < 0) fail('could not find scoutBand in the screen');
  const reads = [...code.matchAll(/\.potential\b/g)].map(m => m.index);
  const outside = reads.filter(i => i < start || i > end);
  const lineOf = i => code.slice(0, i).split('\n').length;
  console.log(`   ${reads.length} reads of .potential in the screen's code, ${outside.length} outside scoutBand`);
  if (reads.length === 0) fail('no read of .potential at all, so the band is not built off the ceiling');
  for (const i of outside) fail(`SquadScreen.tsx line ${lineOf(i)} reads the true ceiling outside scoutBand`);
}

/* ================================================================== */
section = '5';
console.log('5) The detail a tap opens');
/* ================================================================== */
{
  const EXPECT_TILES = ['pot', 'deal', 'worth', 'interest', 'gametime', 'role', 'condition', 'season'];
  let opened = 0, wrong = 0;
  for (const base of careers.slice(0, 6)) {
    const career = withScout(base, 4);
    const level = staff.staffLevel(career, 'scout');
    const money = cm.moneyIn(career);
    for (const p of career.squad) {
      const html = render(SquadRowDetail, { p, career, scoutLevel: level, money });
      const tiles = tilesOf(html);
      opened += 1;
      const missing = EXPECT_TILES.filter(t => !tiles[t]);
      if (missing.length) { wrong += 1; if (wrong <= 4) fail(`${p.name}: the detail is missing ${missing.join(', ')}`); continue; }
      const b = scoutBand(p, level);
      if (tiles.pot.value !== `${b.low} to ${b.high}`) { wrong += 1; fail(`${p.name}: the ceiling tile reads "${tiles.pot.value}"`); }
      const worth = p.onLoan ? 'Not yours to sell' : money(cm.sellValue(p));
      if (tiles.worth.value !== worth) { wrong += 1; fail(`${p.name}: the worth tile reads "${tiles.worth.value}", the engine says ${worth}`); }
      const years = p.contractYears;
      const deal = p.onLoan ? 'On loan' : years === 1 ? 'Final year' : `${years} seasons left`;
      if (tiles.deal.value !== deal) { wrong += 1; fail(`${p.name}: the deal tile reads "${tiles.deal.value}"`); }
      if (!p.onLoan && !tiles.deal.sub.includes(`${cm.renewalTerms(p).wage}k for ${cm.renewalTerms(p).years} years`)) { wrong += 1; fail(`${p.name}: the deal tile does not quote the contracts desk's own renewal terms`); }
      const mood = cm.playingShare(p) === null ? 'Too early to say' : cm.promiseMood(p).text;
      if (tiles.gametime.value !== mood) { wrong += 1; fail(`${p.name}: the game time tile reads "${tiles.gametime.value}", the engine says ${mood}`); }
    }
  }

  /* Planted states, on one save. Each must come through in its own tile. */
  const career = withScout(careers[0], 4);
  const level = staff.staffLevel(career, 'scout');
  const money = cm.moneyIn(career);
  const seniors = career.squad.filter(p => !p.isYouth && !p.onLoan).sort((a, b) => b.rating - a.rating);
  const [star, second, third, fourth] = seniors;
  const buyer = cm.REAL_LEAGUES[1].clubs[0];
  const rival = cm.REAL_LEAGUES[2].clubs[0];
  career.incomingBids = [
    { playerId: second.id, playerName: second.name, club: buyer, offer: 42.5, status: 'open' },
    { playerId: third.id, playerName: third.name, club: rival, offer: 61, status: 'open', clauseMet: true },
  ];
  fourth.wantsOut = true;
  star.role = 'backup';
  star.injuryWeeks = 3;
  const plant = [
    [second, 'interest', t => t.value === `${buyer} want him` && t.sub.includes(money(42.5)), `${buyer} want him, best offer ${money(42.5)}`],
    [third, 'interest', t => t.value === `${rival} met his clause`, `${rival} met his clause`],
    [fourth, 'interest', t => t.value === 'Asked to leave', 'Asked to leave'],
    [star, 'role', t => t.sub.startsWith('Reckons he has earned'), 'Reckons he has earned a better rung'],
    [star, 'condition', t => t.value === 'Injured, 3 weeks', 'Injured, 3 weeks'],
  ];
  let planted = 0;
  for (const [p, tile, ok, want] of plant) {
    const tiles = tilesOf(render(SquadRowDetail, { p, career, scoutLevel: level, money }));
    if (tiles[tile] && ok(tiles[tile])) planted += 1;
    else { wrong += 1; fail(`${p.name}: the ${tile} tile should say "${want}" and reads "${tiles[tile]?.value ?? '(missing)'}" / "${tiles[tile]?.sub ?? ''}"`); }
  }
  console.log(`   ${opened} details rendered, ${planted} of ${plant.length} planted states shown, ${wrong} wrong`);
  if (opened < 100) fail(`only ${opened} details rendered`);
}

/* ================================================================== */
section = '6';
console.log('6) The tile rule: short rows, detail on a tap');
/* ================================================================== */
{
  let collapsedWrong = 0, phoneWrong = 0, deskWrong = 0, rows = 0;
  const DESK_ONLY = ['age', 'pot', 'form', 'wage', 'deal', 'worth', 'fit'];
  for (const career of careers.slice(0, 8)) {
    const html = render(SquadScreen, { squad: career.squad, xiIds: career.xiIds, eraId: career.eraId, captainId: null, career });
    if (/data-cm-squad-detail=/.test(html)) collapsedWrong += 1;
    for (const r of rowsOf(html)) {
      rows += 1;
      const phone = [...r.chunk.split('data-cm-squad-row=')[0].matchAll(/data-cm-cell="phone"[^>]*class="([^"]*)"/g)];
      if (phone.length !== 1 || !/(^|\s)md:hidden(\s|$)/.test(phone[0][1])) phoneWrong += 1;
      for (const cell of DESK_ONLY) {
        const m = r.chunk.match(new RegExp(`data-cm-cell="${cell}"[^>]*class="([^"]*)"`));
        if (!m || !/(^|\s)hidden(\s|$)/.test(m[1]) || !/(^|\s)md:(block|flex)(\s|$)/.test(m[1])) deskWrong += 1;
      }
    }
  }
  console.log(`   ${rows} rows: ${collapsedWrong} lists rendered opened, ${phoneWrong} rows without exactly one phone cell, ${deskWrong} desktop cells showing on a phone`);
  if (rows < 150) fail(`only ${rows} rows`);
  if (collapsedWrong > 0) fail(`${collapsedWrong} lists render with their rows already open, the long stacked page the tile rule forbids`);
  if (phoneWrong > 0) fail(`${phoneWrong} rows do not carry exactly one phone only number`);
  if (deskWrong > 0) fail(`${deskWrong} desktop columns are not hidden below 768`);
}

console.log('');
if (CONTROL) {
  const want = { truth: '1b', centred: '1d', flatscout: '1e', sorttruth: '2', nowage: '3', rawpot: '4', deaf: '5', allopen: '6' }[CONTROL];
  const red = [...failed];
  const others = red.filter(s => s !== want);
  console.log(`CONTROL ${CONTROL}: red sections ${red.join(', ') || '(none)'}; section ${want} must be among them`);
  if (red.includes(want)) {
    console.log(`simSquadRows control ${CONTROL}: RED ON ITS OWN CHECK, as it should be${others.length ? ` (section${others.length > 1 ? 's' : ''} ${others.join(', ')} also read the planted defect, see the header)` : ''}`);
    process.exit(1);
  }
  console.log(`simSquadRows control ${CONTROL}: DID NOT FIRE (the check it names stayed green${others.length ? `, and ${others.join(', ')} went red instead` : ''})`);
  process.exit(3);
}
console.log(failures ? `simSquadRows: ${failures} FAILURE(S)` : 'simSquadRows: all green');
process.exit(failures ? 1 : 0);
