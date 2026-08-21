/**
 * Round 167 harness: every line on the ticker is derived or personal, and
 * none of it can lie or crash. The ticker reads THREE different games' saves
 * straight out of localStorage plus the game registry, so the failure modes
 * are: a save shape it did not expect throws and takes the whole app shell
 * down with it (the ticker renders on every route), a save line that
 * disagrees with the save (wrong position, wrong leader), or counts that
 * drift from the registry. This feeds it real shapes, hostile shapes and
 * garbage, and checks the lines against independently computed truth.
 *
 * Run: node scripts/simTicker.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/tickerEntry.mjs';
const BUNDLE = '/tmp/ticker.bundle.mjs';

fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const mod = await import('${ROOT}/src/components/layout/TopTicker.tsx');
const reg = await import('${ROOT}/src/data/gameRegistry.ts');
export const buildItems = mod.buildItems;
export const CATEGORIES = reg.CATEGORIES;
export const LS = globalThis.localStorage;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --jsx=automatic --loader:.tsx=tsx`, { stdio: 'inherit' });

const { buildItems, CATEGORIES, LS } = await import(BUNDLE);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const texts = items => items.map(i => i.text).join(' | ');

/* ---------- 1. No saves: dailies and counts still fill the wire ---------- */
console.log('1) A brand new visitor still gets a live wire');
{
  LS.clear();
  const items = buildItems();
  const all = CATEGORIES.flatMap(c => c.games);
  console.log(`   ${items.length} items with no saves`);
  if (items.length < 5) fail(`only ${items.length} items for a fresh visitor`);
  if (items.some(i => i.text.includes('Your save') || i.text.includes('Your pro') || i.text.includes('stadium empire'))) {
    fail('a personal line appeared with no saves on the device');
  }
  if (!items.some(i => i.text === `${all.length} free games, no sign-up, no downloads`)) {
    fail('the game count does not match the registry');
  }
  const dailyItems = items.filter(i => i.text.startsWith('Fresh daily:'));
  if (dailyItems.length < 3) fail(`only ${dailyItems.length} daily lines`);
  for (const d of dailyItems) {
    const game = all.find(g => g.path === d.to);
    if (!game) fail(`daily line links to unknown path ${d.to}`);
    else if (!game.daily) fail(`${game.label} is on the daily wire but is not a daily game`);
    else if (d.text !== `Fresh daily: ${game.label}`) fail(`daily line text mismatch for ${game.label}`);
  }
  // Every item must carry a real route.
  for (const it of items) {
    if (it.to !== '/' && it.to !== '/whats-new' && !all.some(g => g.path === it.to)) {
      fail(`ticker links to ${it.to}, which is no game and no known page`);
    }
  }
}

/* ---------- 2. The Club Manager line tells the save's truth ---------- */
console.log('2) The save lines match the saves');
{
  LS.clear();
  const table = [
    { club: 'Arsenal', pts: 10, gf: 12, ga: 3, w: 3, d: 1, l: 0 },
    { club: 'Chelsea', pts: 10, gf: 9, ga: 4, w: 3, d: 1, l: 0 },
    { club: 'Everton', pts: 7, gf: 6, ga: 6, w: 2, d: 1, l: 1 },
    { club: 'Fulham', pts: 1, gf: 2, ga: 9, w: 0, d: 1, l: 3 },
  ];
  LS.setItem('dukb-club-manager-save', JSON.stringify({
    clubName: 'Everton', season: 2, table,
    scorerRace: [{ name: 'Erling Haaland', goals: 7 }, { name: 'Alexander Isak', goals: 5 }],
  }));
  LS.setItem('stadiumTycoonSaveV1', JSON.stringify({ money: 2500000, rep: 3 }));
  LS.setItem('soccerCareerSave', JSON.stringify({ playerName: 'Tony Salguero', overall: 84, currentClub: 'Ajax', age: 24 }));
  const items = buildItems();
  const t = texts(items);
  // Everton are third on 7 points: pts 10 > 10 > 7 > 1 with Arsenal ahead of
  // Chelsea on goal difference, computed here independently.
  if (!t.includes('Everton sit 3rd on 7 pts')) fail(`CM line wrong: ${t.slice(0, 160)}`);
  if (!t.includes('Golden boot race: Erling Haaland leads on 7')) fail('boot line wrong or missing');
  if (!t.includes('Your stadium empire: $2.5M banked · 3⭐ rep')) fail('tycoon line wrong or missing');
  if (!t.includes('Your pro: Tony Salguero, 84 OVR at Ajax')) fail('career line wrong or missing');
  console.log('   position, boot leader, bank and OVR all read back correct');

  // Pre-season save: zero games played says so instead of claiming 1st.
  LS.setItem('dukb-club-manager-save', JSON.stringify({
    clubName: 'Everton', season: 1,
    table: table.map(r => ({ ...r, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 })),
  }));
  const pre = texts(buildItems());
  if (!pre.includes('Everton, season 1 awaits kick off')) fail(`pre-season line wrong: ${pre.slice(0, 120)}`);
  if (pre.includes('sit 1st')) fail('a zero-game save claims a league position');
}

/* ---------- 3. Hostile and garbage saves never throw ---------- */
console.log('3) Garbage in, wire still up');
{
  const bombs = [
    ['dukb-club-manager-save', 'not json {{{'],
    ['dukb-club-manager-save', JSON.stringify({ clubName: 42, table: 'yes' })],
    ['dukb-club-manager-save', JSON.stringify({ clubName: 'X', table: [{}] })],
    ['dukb-club-manager-save', JSON.stringify({ clubName: 'X', table: [], scorerRace: {} })],
    ['stadiumTycoonSaveV1', JSON.stringify({ money: 'NaN bonanza', rep: [] })],
    ['stadiumTycoonSaveV1', JSON.stringify({ money: -5 })],
    ['soccerCareerSave', JSON.stringify({ playerName: '', overall: 'high' })],
    ['soccerCareerSave', '[]'],
  ];
  for (const [key, raw] of bombs) {
    LS.clear();
    LS.setItem(key, raw);
    try {
      const items = buildItems();
      if (!items.length) fail(`a bad ${key} emptied the whole wire`);
      const t = texts(items);
      if (t.includes('undefined') || t.includes('NaN') || t.includes('null')) {
        fail(`a bad ${key} leaked into the copy: ${t.slice(0, 120)}`);
      }
    } catch (e) {
      fail(`a bad ${key} THREW (${String(e).slice(0, 80)}), which kills the app shell on every route`);
    }
  }
  console.log(`   ${bombs.length} hostile saves absorbed silently`);
}

/* ---------- 4. Copy check: dashes and rival names ---------- */
console.log('4) Copy check');
{
  const text = fs.readFileSync(path.join(ROOT, 'src/components/layout/TopTicker.tsx'), 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/[–—]/.test(line)) fail(`TopTicker.tsx:${i + 1} contains an em or en dash`);
  });
  // The house rule from the S-2 item: never write the rival broadcaster's
  // name into src, not even in a comment. Zero hits, no exceptions.
  if (/espn/i.test(text)) fail('the broadcaster is named in TopTicker.tsx');
  console.log('   clean');
}

console.log(failures === 0 ? '\nALL TICKER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
