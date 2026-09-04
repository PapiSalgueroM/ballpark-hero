/* Round 430: the Fantasy Draft pool always offers something to draft.
 *
 * THE BUG: PlayerPool.tsx built its top ten shortlist from the WHOLE pool,
 * sorted by rating, and only then greyed out the drafted and rule-blocked
 * rows. The ten highest rated players in the table are exactly the ones a
 * rule like Bargain Hunt (60M or less) or Wonderkids (21 or younger) excludes,
 * and a blocked player can never be drafted by either side, so the same ten
 * blocked rows held every slot for the whole draft. The draft never bricked,
 * because the search box reaches everyone, which is why it only LOOKED
 * bricked: the default view the player lands on had nothing to press.
 *
 * WHAT IT HOLDS, on the committed snapshot of fantasy_draft_players, with the
 * REAL PlayerPool component rendered through react-dom/server on every user
 * pick of 100 seeded drafts under each of the six daily rules plus a legacy
 * unenforced label (the AI picks and the snake order replicate the page):
 *   1. WHENEVER A LEGAL PICK EXISTS, THE DEFAULT ALL VIEW OFFERS ONE. At least
 *      one rendered row is enabled on every user pick. Measured with the fix:
 *      0 of 1100 per rule. As shipped: 1100 of 1100 under Bargain Hunt, 1010
 *      of 1100 under Wonderkids, 648 under Under 25s, 473 with no rule at all
 *      (drafted players keep their slots from user pick 8 on).
 *   2. THE SHORTLIST IS STILL THE BEST AVAILABLE. The first enabled row's
 *      rating equals the best rating among legal undrafted players, and the
 *      rendered rows are exactly what the exported poolShortlist returns, so
 *      the fix cannot pass by showing anyone, and the component cannot drift
 *      from the function a future harness reads.
 *   3. EVERY DRAFT COMPLETES LEGALLY. 22 picks, both XIs at eleven, and no
 *      user pick broke the rule while a legal pick existed.
 *
 * THE POOL: scripts/data/fantasyDraftPool.json, the seven columns the page
 * selects, in the order the page receives them. `--refresh` re-pulls it
 * through PostgREST with the URL and key the app itself exports. A missing
 * file fails closed; rows are never synthesised.
 *
 * NEGATIVE CONTROL: SIM_FDPOOL_CONTROL=unfiltered removes the pre-sort filter
 * from a bundled copy of PlayerPool.tsx (the shipped behaviour: shortlist
 * chosen blind, greyed afterwards), refuses to run if that line is not in the
 * source, and section 1 must go red under Bargain Hunt and Wonderkids. A
 * control that fires nothing is itself a failure.
 *
 * Run: node scripts/simFantasyDraftPool.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const POOL_FILE = `${ROOT}/scripts/data/fantasyDraftPool.json`;
const POOL_SRC = `${ROOT}/src/components/fantasy-draft/PlayerPool.tsx`;
const CONTROL = process.env.SIM_FDPOOL_CONTROL || '';
if (CONTROL && CONTROL !== 'unfiltered') { console.error(`SIM_FDPOOL_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const REFRESH = process.argv.includes('--refresh');
const SEEDS = 100;
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/fantasyDraftPool.entry.mjs`;
const BUNDLE = `${TMP}/fantasyDraftPool.bundle.cjs`;

let poolSrcPath = POOL_SRC;
if (CONTROL === 'unfiltered') {
  const src = fs.readFileSync(POOL_SRC, 'utf8');
  const needle = 'if (!searching && (draftedIds.has(p.id) || (isEligible && !isEligible(p)))) return false;';
  if (!src.includes(needle)) { console.error('control run: the pre-sort filter to remove is not in PlayerPool.tsx, refusing to run a dead control'); process.exit(1); }
  poolSrcPath = `${TMP}/PlayerPool.control.tsx`;
  fs.writeFileSync(poolSrcPath, src.replace(needle, ''));
  console.log('NEGATIVE CONTROL ON: the pre-sort drafted and eligibility filter removed from a bundled copy of PlayerPool.tsx, section 1 must now find user picks with nothing to draft');
}

/* The real component, the real rule functions and the app's own Supabase
   constants, bundled once. react-dom/server is CommonJS and requires node
   builtins, so the bundle is CommonJS too (the simWc2026Results recipe). The
   control copy lives outside the tree, so NODE_PATH tells esbuild where its
   bare imports (react, lucide-react) live. */
fs.writeFileSync(ENTRY, `
export * as pool from '${poolSrcPath}';
export * as rules from '${ROOT}/src/lib/fantasyCriteria.ts';
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '${ROOT}/src/integrations/supabase/client.ts';
import React from '${ROOT}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT}/node_modules/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
/* The Supabase client reads localStorage at module scope. */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { pool, rules, render, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = createRequire(import.meta.url)(BUNDLE);
const { PlayerPool, draftRating, poolShortlist } = pool;
const { CRITERIA_RULES, ruleForCriteria, pickIsLegal, anyLegalPick } = rules;

/* ---------- the pool, the seven columns the page selects, ordered by name ---------- */
const COLUMNS = ['id', 'name', 'position', 'nationality', 'market_value_millions', 'dominant_foot', 'age'];
if (REFRESH) {
  const url = `${SUPABASE_URL}/rest/v1/fantasy_draft_players?select=${COLUMNS.join(',')}&order=name`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } });
  if (!res.ok) { console.error(`--refresh: PostgREST answered ${res.status}, the snapshot is unchanged`); process.exit(1); }
  const rows = await res.json();
  const before = fs.existsSync(POOL_FILE) ? fs.readFileSync(POOL_FILE, 'utf8') : '';
  const text = '[\n' + rows.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n';
  fs.writeFileSync(POOL_FILE, text);
  console.log(`--refresh: ${rows.length} rows pulled through PostgREST, snapshot ${text === before ? 'unchanged' : 'rewritten'}`);
}
if (!fs.existsSync(POOL_FILE)) { console.error(`${POOL_FILE} is missing. Run with --refresh to pull it; this harness never synthesises rows.`); process.exit(1); }
const players = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
if (!Array.isArray(players) || players.length === 0 || players.some(r => COLUMNS.some(c => !(c in r)))) { console.error('the pool snapshot is not an array of rows carrying the seven columns the page selects'); process.exit(1); }
if (new Set(players.map(p => p.name)).size !== players.length) { console.error('the pool snapshot repeats a name, rendered rows could not be mapped back to players'); process.exit(1); }
const byName = new Map(players.map(p => [p.name, p]));
console.log(`pool: ${players.length} players (${['GK', 'DEF', 'MID', 'FWD'].map(pos => pos + '=' + players.filter(p => p.position === pos).length).join(' ')})`);

/* ---------- replicas of the page: snake order, the AI pick, the isEligible wiring ---------- */
const TEAM_SIZE = 11;
const TOTAL_PICKS = TEAM_SIZE * 2;
function getPickOwner(pickIndex, userFirst) {
  const round = Math.floor(pickIndex / 2);
  const posInRound = pickIndex % 2;
  const roundStarts = round % 2 === 0 ? (userFirst ? 'user' : 'ai') : (userFirst ? 'ai' : 'user');
  if (posInRound === 0) return roundStarts;
  return roundStarts === 'user' ? 'ai' : 'user';
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const decode = s => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* Render the component as the page mounts it, on the user's turn, with its
   own defaults (no search typed, the All tab), and read the rows back out of
   the markup: a row is what the visitor can press only if its button carries
   no disabled attribute. */
function renderedRows(draftedIds, isEligible, reason) {
  const html = render(PlayerPool, { players, draftedIds, onSelect: () => {}, disabled: false, isEligible, ineligibleReason: reason });
  return html.split('<button').slice(1).filter(c => c.includes('w-full flex items-center')).map(c => {
    const tag = c.slice(0, c.indexOf('>'));
    const m = c.match(/<p class="text-sm font-semibold truncate[^"]*">([^<]*)<\/p>/);
    return { name: m ? decode(m[1]) : null, enabled: !/\sdisabled(=""|\s|$)/.test(tag) };
  });
}
const legalUndrafted = (draftedIds, rule, team, mustFollow) =>
  players.filter(p => !draftedIds.has(p.id) && (!mustFollow || pickIsLegal(rule, team, p)));

function runDraft(label, seed, stats) {
  const rng = mulberry32(seed);
  const rule = ruleForCriteria(label);
  const userFirst = rng() < 0.5;
  const userTeam = [];
  const aiTeam = [];
  const draftedIds = new Set();
  let illegal = 0;
  for (let pickIndex = 0; pickIndex < TOTAL_PICKS; pickIndex += 1) {
    if (getPickOwner(pickIndex, userFirst) === 'ai') {
      /* FantasyDraft.tsx, the AI pick, the seeded generator in place of Math.random */
      const available = players.filter(p => !draftedIds.has(p.id));
      if (available.length === 0) break;
      const legal = available.filter(p => pickIsLegal(rule, aiTeam, p));
      const aiPool = legal.length > 0 ? legal : available;
      const aiHasGk = aiTeam.some(p => p.position === 'GK');
      const gksLeft = aiPool.filter(p => p.position === 'GK');
      const slotsLeft = TEAM_SIZE - aiTeam.length;
      let candidates = aiPool;
      if (!aiHasGk && gksLeft.length > 0 && (gksLeft.length <= 2 || slotsLeft <= 2)) candidates = gksLeft;
      const sorted = [...candidates].sort((a, b) => (b.market_value_millions || 0) - (a.market_value_millions || 0));
      const topN = sorted.slice(0, Math.min(6, sorted.length));
      const pick = topN[Math.floor(rng() * topN.length)];
      aiTeam.push(pick); draftedIds.add(pick.id);
      continue;
    }
    /* FantasyDraft.tsx, the isEligible wiring with its exhaustion valve */
    const mustFollow = !!rule && anyLegalPick(rule, userTeam, players, draftedIds);
    const isEligible = mustFollow ? p => pickIsLegal(rule, userTeam, p) : undefined;
    const rows = renderedRows(draftedIds, isEligible, rule?.blockedReason);
    const enabled = rows.filter(r => r.enabled);
    const legal = legalUndrafted(draftedIds, rule, userTeam, mustFollow);
    const slot = stats.perPick[userTeam.length];
    slot.n += 1;
    slot.enabledSum += enabled.length;
    if (legal.length > 0 && enabled.length === 0) slot.zero += 1;
    if (enabled.length > 0) {
      const first = byName.get(enabled[0].name);
      const best = legal.reduce((b, p) => Math.max(b, draftRating(p)), -Infinity);
      if (!first || draftRating(first) !== best) slot.notBest += 1;
    }
    if (typeof poolShortlist === 'function') {
      const expected = poolShortlist(players, draftedIds, isEligible, 'All', '').map(p => p.name).join('|');
      if (expected !== rows.map(r => r.name).join('|')) slot.drift += 1;
    }
    /* The user takes the first row he can press. With nothing to press, the
       search box is the only way on, so he finds the best legal player by
       hand; that keeps the draft moving so the later picks get measured. */
    let pick = enabled.length > 0 ? byName.get(enabled[0].name) : null;
    if (!pick) {
      slot.search += 1;
      pick = [...legal].sort((a, b) => draftRating(b) - draftRating(a))[0];
    }
    if (!pick) break;
    if (mustFollow && !pickIsLegal(rule, userTeam, pick)) illegal += 1;
    userTeam.push(pick); draftedIds.add(pick.id);
  }
  return { completed: userTeam.length === TEAM_SIZE && aiTeam.length === TEAM_SIZE, illegal };
}

const LABELS = [...CRITERIA_RULES.map(r => r.label), 'Golden Era (legacy, unenforced)'];
const results = [];
for (const label of LABELS) {
  const stats = { perPick: Array.from({ length: TEAM_SIZE }, () => ({ n: 0, zero: 0, enabledSum: 0, notBest: 0, drift: 0, search: 0 })), completed: 0, illegal: 0 };
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const r = runDraft(label, seed, stats);
    if (r.completed) stats.completed += 1;
    stats.illegal += r.illegal;
  }
  const sum = k => stats.perPick.reduce((s, x) => s + x[k], 0);
  results.push({
    label, key: ruleForCriteria(label)?.key ?? 'none', perPick: stats.perPick,
    picks: sum('n'), zero: sum('zero'), meanEnabled: sum('enabledSum') / sum('n'), notBest: sum('notBest'), drift: sum('drift'), search: sum('search'),
    completed: stats.completed, illegal: stats.illegal,
  });
}
const totalPicks = results.reduce((s, r) => s + r.picks, 0);

console.log(`1) whenever a legal pick exists, the default All view offers one (${SEEDS} seeded drafts per rule, the real component rendered on every user pick)`);
for (const r of results) {
  console.log(`   ${r.key.padEnd(12)} zero draftable rows: ${String(r.zero).padStart(4)}/${r.picks}   mean enabled rows ${r.meanEnabled.toFixed(1)}   % zero per user pick 1..11: ${r.perPick.map(x => Math.round(100 * x.zero / x.n)).join(' ')}`);
}
if (CONTROL === 'unfiltered') {
  const bargain = results.find(r => r.key === 'bargain60');
  const kids = results.find(r => r.key === 'wonderkids21');
  if (bargain.zero > 0 && kids.zero > 0) {
    console.log(`simFantasyDraftPool control: green. Unfiltered, ${bargain.zero} of ${bargain.picks} Bargain Hunt picks and ${kids.zero} of ${kids.picks} Wonderkids picks had nothing to draft.`);
    process.exit(0);
  }
  console.error(`simFantasyDraftPool control: RED. The control did not fire: Bargain Hunt ${bargain.zero}, Wonderkids ${kids.zero} zero-draftable picks with the filter removed.`);
  process.exit(1);
}
for (const r of results) if (r.zero > 0) fail(`${r.label}: ${r.zero} of ${r.picks} user picks rendered no draftable row on the All view while a legal pick existed`);

console.log('2) the shortlist is still the best available, and the component shows what poolShortlist returns');
if (typeof poolShortlist !== 'function') fail('PlayerPool.tsx exports no poolShortlist, the rendered rows cannot be checked against the shortlist function');
for (const r of results) {
  if (r.notBest > 0) fail(`${r.label}: on ${r.notBest} of ${r.picks} user picks the first draftable row was not the best legal undrafted player`);
  if (r.drift > 0) fail(`${r.label}: on ${r.drift} of ${r.picks} user picks the rendered rows differed from poolShortlist`);
}
if (results.every(r => r.notBest === 0 && r.drift === 0) && typeof poolShortlist === 'function') {
  console.log(`   first draftable row rated as the best legal undrafted player on all ${totalPicks} user picks, rendered rows equal to poolShortlist on all of them`);
}

console.log('3) every draft completes legally');
for (const r of results) {
  if (r.completed !== SEEDS) fail(`${r.label}: ${r.completed} of ${SEEDS} drafts reached two full XIs`);
  if (r.illegal > 0) fail(`${r.label}: ${r.illegal} user picks broke the rule while a legal pick existed`);
}
const searched = results.reduce((s, r) => s + r.search, 0);
console.log(`   ${results.reduce((s, r) => s + r.completed, 0)} of ${LABELS.length * SEEDS} drafts complete with both XIs at eleven, ${results.reduce((s, r) => s + r.illegal, 0)} illegal user picks, ${searched} of ${totalPicks} user picks needed the search box`);

console.log('');
if (failures > 0) { console.error(`simFantasyDraftPool: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simFantasyDraftPool: green. Every user pick has something to draft on the view the player lands on, and it is the best available.');
