/* Club Manager: an era's Champions League plays the round of 16 it really
   had, the group tables stay up once the knockouts start, the GROUP tables
   split level points the way the Champions League says, and the league
   tables the way each league says.

   Round 462. His item 4 (docs/TWEAKS-2026-08-28.md) completed, plus the
   three gaps Round 451 measured and named rather than built:

     (a) the era competition went from eight groups straight to the quarter
         finals with no round of 16, where every real season from 2003-04 to
         2023-24 played one;
     (b) the group tables vanished from the Cups tab the week the knockouts
         started (UclGroupsCard returned null once uclKoRound was set), where
         his item 3 asked for the table AND the bracket;
     (c) sortedTable split level points on goal difference everywhere, where
         La Liga and Serie A use head to head, and the engine kept no per pair
         results to read.

   Sections, every era career driven through startCareer and playNextEntry
   the way the page drives them, never a hand built state:
     1) THE FORMAT. Every era save's calendar carries exactly one round of 16
        week, after the January window and before the quarter finals; the
        bracket at the final whistle is eight, four, two, one; the first
        knockout round reached is the round of 16 exactly when Group A sent
        me through; the season ends with Europe settled. The modern control
        careers keep today's shape: no round of 16 week, no round of 16 ties.
     2) THE DRAW, on every seed: the sixteen are exactly the top two of each
        group, every tie is a group winner at home against a runner-up, never
        two clubs from one group, never two from one association (the era
        field's countries, my own club's from its league); the draw is a
        pure function of the save (uclRoundOf16Draw agrees with the bracket,
        twice, and again after the save is written and read back through
        loadCareer).
     3) THE TABLES STAY. UclGroupsCard and UclBracketCard rendered through
        react-dom/server on the knockout states: the groups card still names
        Group A, every group opponent and every group letter and reads as
        final; the bracket card names the round of 16 and all sixteen.
     4) HEAD TO HEAD. At the final whistle of every Spanish and Italian table
        the save simulated (mine and the world's), every neighbouring pair
        level on points is ordered on head to head points, then head to head
        goal difference, then goal difference; the ledger holds every fixture
        of the league; and the count of level pairs the head to head turned
        AGAINST goal difference is measured, because that is the visible
        change. English tables must still read goal difference then goals
        scored. Plus the rule on a built table: two clubs level, one with the
        better goal difference, the other with both wins between them.
     5) A PRE MIGRATION SAVE LOADS AND PLAYS. A mid group era save stripped
        of the ledger and of the round of 16 week, written to localStorage
        and read through loadCareer: the ledger comes back empty, the week is
        put after the window and before the quarter finals and never before
        the week reached, and the season plays out with a round of 16. Every
        wrong ledger shape is dropped rather than trusted. A modern save is
        left exactly as it was. Round 478: a save stripped of its GROUP
        ledger too opens with the group results gone, falls back to goal
        difference, says so under the rows, and plays its groups out.
     6) THE GROUP TABLE'S OWN ORDER (Round 478). Every group of every era
        career, mine and the seven beside it, at EVERY matchday and again at
        the final whistle: the table the engine hands the card and the field
        it seeds the round of 16 from are one order, and that order is the
        one the Champions League regulations give (head to head points, then
        head to head goal difference, then head to head goals, reapplied to
        any smaller subset still level, then overall goal difference and
        goals scored), computed here from the ledger rather than read back
        off the module. The ledger holds every group fixture played and
        nothing else (2 games a night per group), every entry names two
        clubs of one group, and every club's points and goals in the table
        add up from its own results. A modern save reads the league phase
        order instead (goal difference, then goals scored, no head to head,
        because a league phase club plays eight of the other 35). Crafted
        tables put the rule beyond doubt: two clubs where the head to head
        and the goal difference disagree, three clubs where two of them are
        level on the whole mini league and split on their own two games,
        a pair that has met only once, and the footnote wording for both
        orders. And the source is counted: nothing in the engine or in a
        Club Manager card may sort a group table any other way.
        The MEASUREMENT, which is the round's headline: how many groups end
        with clubs level on points, how many of those the head to head puts
        in a different order from goal difference, and how many change who
        tops the group and therefore who hosts the deciding leg.

   Negative controls (house rule: prove the checks can fail, and refuse to
   run if the rewrite finds nothing to rewrite; CRLF normalised first):
     CM_UCL_CONTROL=nor16   bundles a copy of the engine with eraUclHasR16
       answering false, the pre-462 competition. Sections 1, 2 and 5 must go
       red (measured: every era career without a round of 16 week or a round
       of 16 tie).
     CM_UCL_CONTROL=vanish  bundles a copy of UclGroupsCard with the pre-462
       null check back (return null once uclKoRound is set). Section 3 must
       go red (measured: every knockout render empty).
     CM_UCL_CONTROL=gdonly  bundles a copy of the engine whose head to head
       rule reads goal difference then goals scored, the pre-462 sort.
       Section 4 must go red (measured: every level pair the head to head
       had turned now sits the wrong way round).
     CM_UCL_CONTROL=uclgd   bundles a copy of the engine whose group sorter
       hands back sortedTable(rows), which is the pre-478 group order to the
       character: overall goal difference then goals scored, no ledger read.
       Section 6 must go red (measured: 102 findings, one for every group
       night whose level clubs the head to head had put the other way round,
       plus both measurement floors falling to zero).

   Sample floors are measured counts with headroom, set after the first runs
   and recorded beside each check.

   Run: node scripts/simClubManagerEraUcl.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_UCL_CONTROL || '';
if (CONTROL && !['nor16', 'vanish', 'gdonly', 'uclgd'].includes(CONTROL)) {
  console.error(`CM_UCL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const buckets = { format: [], draw: [], render: [], h2h: [], migrate: [], groups: [] };
const note = (bucket, m) => buckets[bucket].push(m);
const lf = s => s.replaceAll('\r\n', '\n');

/* ---- the engine and the card, regressed when a control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'UclGroupsCard.tsx');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
let cardPath = `${ROOT_URL}/src/components/club-manager/UclGroupsCard.tsx`;
function rewrite(file, from, to, outName, what) {
  const src = lf(fs.readFileSync(file, 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${what} is not in the shape CM_UCL_CONTROL=${CONTROL} rewrites`);
    process.exit(1);
  }
  const out = `${TMP}/${outName}`;
  fs.writeFileSync(out, src.replace(from, to));
  return out;
}
if (CONTROL === 'nor16') {
  enginePath = rewrite(ENGINE,
    '  return year >= UCL_R16_FIRST_YEAR && year <= UCL_R16_LAST_YEAR;\n',
    '  return false && year >= UCL_R16_FIRST_YEAR && year <= UCL_R16_LAST_YEAR;\n',
    'clubManagerEraUcl.nor16.ts', 'eraUclHasR16');
  console.log('NEGATIVE CONTROL ON: no era plays a round of 16, the pre-462 competition; sections 1, 2 and 5 must go red');
}
if (CONTROL === 'vanish') {
  cardPath = rewrite(CARD,
    '  if (!group) return null;\n',
    '  if (!group || career.uclKoRound !== null) return null;\n',
    'UclGroupsCardEraUcl.vanish.tsx', "the groups card's null check");
  console.log('NEGATIVE CONTROL ON: the groups card returns null once the knockouts start, the pre-462 card; section 3 must go red');
}
if (CONTROL === 'gdonly') {
  enginePath = rewrite(ENGINE,
    "      case 'h2h': return [h.pts, h.gd, gd, r.gf];\n",
    "      case 'h2h': return [gd, r.gf];\n",
    'clubManagerEraUcl.gdonly.ts', 'the head to head key');
  console.log('NEGATIVE CONTROL ON: Spain and Italy split level points on goal difference again, the pre-462 sort; section 4 must go red');
}
if (CONTROL === 'uclgd') {
  /* Round 478: the pre-478 group order, restored at the one line every
     group table now goes through. Not a copy of the module, the integration
     point, so the card and the round of 16 seeding regress together exactly
     the way they shipped before this round. */
  enginePath = rewrite(ENGINE,
    '  return sortedUclGroupTable(rows, uclGroupRule(state), state.pairResults?.[UCL_GROUP_LEDGER]);\n',
    '  return sortedTable(rows);\n',
    'clubManagerEraUcl.uclgd.ts', 'the group sorter');
  console.log('NEGATIVE CONTROL ON: every Champions League group sorts on goal difference then goals scored again, the pre-478 order; section 6 must go red');
}

/* The engine and the two real cards in one CommonJS bundle (the
   simClubManagerEraMidSeason recipe). A rewritten card still imports the
   engine through the alias, which is the untouched file on disk; the card
   is a pure function of the state it is handed, so that is fine. */
const ENTRY = `${TMP}/clubManagerEraUcl.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerEraUcl.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${enginePath}';
export { UclGroupsCard } from '${cardPath}';
export { UclBracketCard } from '${ROOT_URL}/src/components/club-manager/UclBracketCard.tsx';
import React from '${ROOT_URL}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT_URL}/node_modules/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, UclGroupsCard, UclBracketCard, render } = createRequire(import.meta.url)(BUNDLE);
const {
  startCareer, playNextEntry, sortedTable, sortedLeagueTable, sortedWorldTable, careerLeagueOf, worldLeagueDefs,
  leagueTiebreak, tiebreakFootnote, uclFirstKoRound, uclRoundOf16Draw, saveCareer, loadCareer, clearCareer,
  ERA_UCL_FIELDS, LEAGUE_NATIONS,
  /* Round 478 */
  sortedUclGroup, uclGroupRule, uclGroupTiebreakFootnote,
} = cm;
/* Round 478: the one PairLedger key the whole group stage is recorded
   under. Read off the module rather than retyped, so a rename cannot leave
   this harness quietly reading nothing. */
const GROUP_LEDGER = (() => {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'clubManagerUclGroups.ts'), 'utf8'));
  const m = src.match(/export const UCL_GROUP_LEDGER = '([^']+)'/);
  if (!m) { console.error('cannot read UCL_GROUP_LEDGER out of clubManagerUclGroups.ts'); process.exit(1); }
  return m[1];
})();

/* ---------- driving the engine the way the page does ---------- */
function playUntil(s, stop, onStep) {
  let guard = 0;
  while (guard++ < 200) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    onStep?.(s, r);
    if (r.kind === 'seasonOver' || s.sacked) break;
    if (stop(s, r)) break;
  }
  return s;
}
const clone = s => JSON.parse(JSON.stringify(s));

/** The association of a club, read the way the draw reads it: the era
    field first, my own club's league when it is not in the field. */
function countryOf(s, club) {
  const row = (ERA_UCL_FIELDS[s.eraId] ?? []).find(e => e.name === club);
  if (row) return row.country;
  if (club === s.clubName) return LEAGUE_NATIONS[careerLeagueOf(s).id] ?? null;
  return null;
}

/* ---------- 1. the format ---------- */
function checkFormat(tag, s, koStart, isEra) {
  const cal = s.calendar;
  const r16Weeks = cal.filter(e => e.type === 'uclKo' && e.uclRound === 'R16').length;
  const br = s.uclBracket ?? [];
  const count = r => br.filter(t => t.round === r).length;
  if (isEra) {
    if (r16Weeks !== 1) note('format', `${tag}: the calendar carries ${r16Weeks} round of 16 weeks rather than one (the reported gap)`);
    else {
      const i16 = cal.findIndex(e => e.type === 'uclKo' && e.uclRound === 'R16');
      const iWin = cal.findIndex(e => e.type === 'window');
      const iQf = cal.findIndex(e => e.type === 'uclKo' && e.uclRound === 'QF');
      const lastMd = cal.map((e, i) => (e.type === 'uclGroup' ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
      if (!(i16 > iWin && i16 > lastMd && i16 < iQf)) note('format', `${tag}: the round of 16 week sits at ${i16}, window ${iWin}, last group night ${lastMd}, quarter finals ${iQf}`);
    }
    if (uclFirstKoRound(s) !== 'R16') note('format', `${tag}: uclFirstKoRound says ${uclFirstKoRound(s)} for a ${s.eraId} save`);
    if (s.uclGroup) {
      if (count('R16') !== 8 || count('QF') !== 4 || count('SF') !== 2 || count('F') !== 1) {
        note('format', `${tag}: the bracket is ${count('R16')} / ${count('QF')} / ${count('SF')} / ${count('F')} ties rather than 8 / 4 / 2 / 1 (the reported gap)`);
      }
      if (br.some(t => t.winner === null)) note('format', `${tag}: a tie is still unplayed at the final whistle`);
      if (koStart) {
        const pos = sortedUclGroup(koStart, koStart.uclGroup.table).findIndex(r => r.club === s.clubName) + 1;
        const want = pos <= 2 ? 'R16' : 'out';
        if (koStart.uclKoRound !== want) note('format', `${tag}: I finished ${pos} in Group A and the knockouts opened with uclKoRound ${koStart.uclKoRound} rather than ${want}`);
      }
      if (s.uclKoRound !== 'won' && s.uclKoRound !== 'out') note('format', `${tag}: the season ended with Europe unsettled (uclKoRound ${s.uclKoRound})`);
    }
  } else {
    if (r16Weeks !== 0) note('format', `${tag}: a modern save carries ${r16Weeks} round of 16 weeks`);
    if (count('R16') !== 0) note('format', `${tag}: a modern bracket has ${count('R16')} round of 16 ties`);
    if (s.uclGroup && count('QF') !== 4) note('format', `${tag}: a modern bracket has ${count('QF')} quarter finals`);
    if (uclFirstKoRound(s) !== 'QF') note('format', `${tag}: uclFirstKoRound says ${uclFirstKoRound(s)} for a modern save`);
  }
}

/* ---------- 2. the draw ---------- */
function checkDraw(tag, s, tally) {
  const ties = (s.uclBracket ?? []).filter(t => t.round === 'R16');
  if (ties.length !== 8) { note('draw', `${tag}: ${ties.length} round of 16 ties to check (the reported gap)`); return; }
  const groups = [{ letter: 'A', table: s.uclGroup.table }, ...(s.uclWorld ?? []).map(g => ({ letter: g.letter, table: g.table }))];
  const winners = new Map();
  const runners = new Map();
  const groupOf = new Map();
  for (const g of groups) {
    /* Round 478: the group's own order, the one the engine seeds from. */
    const rows = sortedUclGroup(s, g.table).map(r => r.club);
    winners.set(rows[0], g.letter);
    runners.set(rows[1], g.letter);
    for (const c of rows) groupOf.set(c, g.letter);
  }
  const seen = new Set();
  for (const t of ties) {
    tally.ties += 1;
    for (const c of [t.home, t.away]) { if (seen.has(c)) note('draw', `${tag}: ${c} is in two round of 16 ties`); seen.add(c); }
    if (!winners.has(t.home)) note('draw', `${tag}: ${t.home} is at home in the round of 16 without winning a group`);
    if (!runners.has(t.away)) note('draw', `${tag}: ${t.away} is away in the round of 16 without finishing second in a group`);
    if (groupOf.get(t.home) === groupOf.get(t.away)) note('draw', `${tag}: ${t.home} v ${t.away} pairs Group ${groupOf.get(t.home)} against itself`);
    const ch = countryOf(s, t.home);
    const ca = countryOf(s, t.away);
    if (ch && ca && ch === ca) note('draw', `${tag}: ${t.home} v ${t.away} pairs two ${ch === 'England' ? 'English' : ch} clubs in the round of 16`);
    if (ch && ca) tally.countryChecked += 1;
    if (t.mine !== (t.home === s.clubName || t.away === s.clubName)) note('draw', `${tag}: the mine flag is wrong on ${t.home} v ${t.away}`);
  }
  if (seen.size !== 16) note('draw', `${tag}: ${seen.size} clubs in the round of 16 rather than sixteen`);
  for (const [w] of winners) if (!seen.has(w)) note('draw', `${tag}: group winner ${w} is missing from the round of 16`);
  for (const [r] of runners) if (!seen.has(r)) note('draw', `${tag}: runner-up ${r} is missing from the round of 16`);
  // A pure function of the save: the same tables draw the same ties, twice,
  // and again after the save has been written and read back.
  const key = arr => arr.map(t => `${t.home}>${t.away}`).sort().join(';');
  const bracketKey = key(ties);
  const a = uclRoundOf16Draw(s);
  const b = uclRoundOf16Draw(clone(s));
  if (!a || key(a) !== bracketKey) note('draw', `${tag}: uclRoundOf16Draw does not reproduce the bracket the save carries`);
  if (!b || key(b) !== key(a ?? [])) note('draw', `${tag}: two draws from the same tables disagree`);
  saveCareer(s);
  const back = loadCareer();
  clearCareer();
  if (!back) note('draw', `${tag}: the knockout save would not load back`);
  else {
    const c = uclRoundOf16Draw(back);
    if (!c || key(c) !== bracketKey) note('draw', `${tag}: the draw changes across a save and reload`);
    if (key((back.uclBracket ?? []).filter(t => t.round === 'R16')) !== bracketKey) note('draw', `${tag}: the bracket changes across a save and reload`);
  }
  tally.draws += 1;
}

/* ---------- 3. the tables stay rendered ---------- */
function checkRender(tag, s, tally) {
  const groupsHtml = render(UclGroupsCard, { career: s });
  const bracketHtml = render(UclBracketCard, { career: s });
  tally.renders += 2;
  if (!groupsHtml.includes('UCL Group A')) note('render', `${tag}: the groups card does not show Group A once the knockouts have started (the reported gap, ${groupsHtml.length} chars rendered)`);
  if (!groupsHtml.includes('final table')) note('render', `${tag}: the groups card does not read as a final table`);
  for (const c of s.uclGroup?.opponents ?? []) if (!groupsHtml.includes(c)) note('render', `${tag}: the groups card never prints my group opponent ${c}`);
  for (const g of s.uclWorld ?? []) if (!groupsHtml.includes(`Group ${g.letter}`)) note('render', `${tag}: the groups card lost Group ${g.letter}`);
  if (/Projected (quarter-finals|round of 16)/.test(groupsHtml)) note('render', `${tag}: the groups card still projects a draw that has already been made`);
  /* Round 478: and it says how level points were split, the way the league
     tables do. Which of the two orders is asserted in section 6 on states
     nothing has rewritten; here the question is only whether the card prints
     the engine's footnote at all, because a control that regresses the
     engine reaches this harness's copy and not the card's, and the card is
     the thing section 3 is about. */
  if (s.uclGroup && !/(games between the level clubs first|splits on goal difference, then goals scored)/.test(groupsHtml)) {
    note('render', `${tag}: the groups card prints no footnote saying how level points in a group were split`);
  }
  const r16 = (s.uclBracket ?? []).filter(t => t.round === 'R16');
  if (r16.length) {
    if (!bracketHtml.includes('Round of 16')) note('render', `${tag}: the bracket card has no round of 16`);
    for (const t of r16) for (const c of [t.home, t.away]) if (!bracketHtml.includes(c)) note('render', `${tag}: the bracket card never prints ${c}`);
  }
}

/* ---------- 4. head to head ---------- */
const h2hLine = (pairs, a, b) => {
  const home = pairs[`${a}|${b}`];
  const away = pairs[`${b}|${a}`];
  if (!home || !away) return null;
  const pts = (home[0] > home[1] ? 3 : home[0] === home[1] ? 1 : 0) + (away[1] > away[0] ? 3 : away[0] === away[1] ? 1 : 0);
  return { pts, gd: (home[0] - home[1]) + (away[1] - away[0]) };
};
function checkTable(tag, leagueId, rows, sorted, clubs, ledger, tally) {
  const rule = leagueTiebreak(leagueId);
  const pairs = ledger?.[leagueId] ?? {};
  const n = clubs.length;
  if (rule !== 'gdGfOnly') {
    const have = Object.keys(pairs).length;
    if (have !== n * (n - 1)) note('h2h', `${tag}: the ${leagueId} ledger holds ${have} of ${n * (n - 1)} fixtures at the final whistle`);
    for (const [k, v] of Object.entries(pairs)) {
      const [h, a] = k.split('|');
      if (!clubs.includes(h) || !clubs.includes(a)) note('h2h', `${tag}: ${leagueId} ledger names ${k}, not two clubs of the league`);
      if (!Array.isArray(v) || v.length !== 2) note('h2h', `${tag}: ${leagueId} ledger entry ${k} is not a score`);
    }
    // The ledger and the table agree: every club's points and goals add up
    // from its own results.
    for (const c of clubs) {
      let pts = 0, gf = 0, ga = 0;
      for (const o of clubs) {
        if (o === c) continue;
        const h = pairs[`${c}|${o}`];
        const a = pairs[`${o}|${c}`];
        if (h) { gf += h[0]; ga += h[1]; pts += h[0] > h[1] ? 3 : h[0] === h[1] ? 1 : 0; }
        if (a) { gf += a[1]; ga += a[0]; pts += a[1] > a[0] ? 3 : a[0] === a[1] ? 1 : 0; }
      }
      const row = rows.find(r => r.club === c);
      if (row && (row.pts !== pts || row.gf !== gf || row.ga !== ga)) note('h2h', `${tag}: ${leagueId} ${c} reads ${row.pts} pts ${row.gf}:${row.ga} in the table and ${pts} pts ${gf}:${ga} in the ledger`);
    }
  }
  /* Level clubs come in runs. Spain and Italy read the mini league of every
     game among the run (two clubs: their two games; three or more: all of
     them), so the check is on the run, not on each pair in isolation. */
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].pts === sorted[i].pts) j += 1;
    const run = sorted.slice(i, j);
    i = j;
    if (run.length < 2) continue;
    if (rule === 'h2h') {
      const line = new Map();
      let complete = true;
      for (const r of run) {
        let pts = 0;
        let gd = 0;
        for (const o of run) {
          if (o.club === r.club) continue;
          const l = h2hLine(pairs, r.club, o.club);
          if (!l) { complete = false; break; }
          pts += l.pts;
          gd += l.gd;
        }
        if (!complete) break;
        line.set(r.club, { pts, gd });
      }
      if (!complete) { note('h2h', `${tag}: ${leagueId} ${run.map(r => r.club).join(', ')} are level with games missing from the ledger`); continue; }
      for (let k = 1; k < run.length; k++) {
        const up = run[k - 1];
        const dn = run[k];
        const a = line.get(up.club);
        const b = line.get(dn.club);
        const gdUp = up.gf - up.ga;
        const gdDn = dn.gf - dn.ga;
        tally.levelPairs += 1;
        const wrong = a.pts < b.pts
          || (a.pts === b.pts && a.gd < b.gd)
          || (a.pts === b.pts && a.gd === b.gd && gdUp < gdDn)
          || (a.pts === b.pts && a.gd === b.gd && gdUp === gdDn && up.gf < dn.gf);
        if (wrong) note('h2h', `${tag}: ${leagueId} ${dn.club} sits below ${up.club} with the better head to head among the ${run.length} level clubs (${b.pts} v ${a.pts} pts, ${b.gd} v ${a.gd} gd; overall gd ${gdDn} v ${gdUp}) (the reported gap)`);
        if (a.pts !== b.pts) tally.byH2hPts += 1;
        else if (a.gd !== b.gd) tally.byH2hGd += 1;
        else tally.byGd += 1;
        if (gdUp < gdDn || (gdUp === gdDn && up.gf < dn.gf)) tally.turned += 1;
      }
    } else if (rule === 'gdGf') {
      for (let k = 1; k < run.length; k++) {
        const up = run[k - 1];
        const dn = run[k];
        const gdUp = up.gf - up.ga;
        const gdDn = dn.gf - dn.ga;
        if (gdUp < gdDn || (gdUp === gdDn && up.gf < dn.gf)) note('h2h', `${tag}: ${leagueId} ${dn.club} sits below ${up.club} with the better goal difference or goals scored, which England does not allow`);
        tally.englishPairs += 1;
      }
    }
  }
}
function checkH2H(tag, s, tally) {
  const my = careerLeagueOf(s);
  checkTable(tag, my.id, s.table, sortedLeagueTable(s), s.leagueClubs, s.pairResults, tally);
  for (const lg of worldLeagueDefs(s)) {
    if (lg.id === my.id) continue;
    const w = s.world?.[lg.id];
    if (!w) continue;
    checkTable(tag, lg.id, w.table, sortedWorldTable(s, lg.id, w.table), lg.clubs, s.pairResults, tally);
  }
  tally.tables += 1 + worldLeagueDefs(s).filter(l => l.id !== my.id && s.world?.[l.id]).length;
}
function checkRule() {
  // Two clubs level on points: Beta has the better goal difference, Alpha
  // won both games between them.
  const rows = [
    { club: 'Alpha', w: 10, d: 0, l: 5, gf: 30, ga: 20, pts: 30 },
    { club: 'Beta', w: 10, d: 0, l: 5, gf: 40, ga: 15, pts: 30 },
    { club: 'Gamma', w: 12, d: 0, l: 3, gf: 33, ga: 12, pts: 36 },
  ];
  const both = { 'Alpha|Beta': [2, 0], 'Beta|Alpha': [0, 1] };
  const one = { 'Alpha|Beta': [2, 0] };
  const order = (rule, pairs) => sortedTable(rows, { rule, pairs }).map(r => r.club).join(',');
  if (order('h2h', both) !== 'Gamma,Alpha,Beta') note('h2h', `Spain and Italy: Alpha won both games and still sits below Beta (${order('h2h', both)}) (the reported gap)`);
  if (order('gdGf', both) !== 'Gamma,Beta,Alpha') note('h2h', `England: goal difference should come before head to head (${order('gdGf', both)})`);
  if (order('gdGfAgg', both) !== 'Gamma,Beta,Alpha') note('h2h', `Germany: goal difference should come before the direct aggregate (${order('gdGfAgg', both)})`);
  if (order('gdH2h', both) !== 'Gamma,Beta,Alpha') note('h2h', `France: goal difference should come first (${order('gdH2h', both)})`);
  // Delta and Epsilon level on points, goal difference and goals scored;
  // Delta won the aggregate of their two games (3-1, 1-1) and Epsilon took
  // more points from them (1-1 draw plus... no: 3-1 and 1-1 is 4 points to
  // 1, so points and aggregate agree). Use 2-0 and 0-1 instead: Delta wins
  // the aggregate 2-1 while each side won once, so points are level and only
  // the aggregate splits them. Germany reads that; England, with level head
  // to head points, falls through to the name.
  const twins = [
    { club: 'Delta', w: 10, d: 5, l: 5, gf: 30, ga: 20, pts: 35 },
    { club: 'Epsilon', w: 11, d: 2, l: 7, gf: 30, ga: 20, pts: 35 },
  ];
  const split = { 'Delta|Epsilon': [2, 0], 'Epsilon|Delta': [1, 0] };
  const twinOrder = (rule, pairs) => sortedTable(twins, { rule, pairs }).map(r => r.club).join(',');
  if (twinOrder('gdGfAgg', split) !== 'Delta,Epsilon') note('h2h', `Germany: Delta won the direct aggregate 2-1 and still sits below Epsilon (${twinOrder('gdGfAgg', split)})`);
  if (twinOrder('gdGf', split) !== 'Delta,Epsilon') note('h2h', `England: level on everything, the name should decide (${twinOrder('gdGf', split)})`);
  // France reads goals scored before wins: Zeta and Eta level on points, goal
  // difference and the two games between them (1-1 twice); Eta scored more,
  // Zeta won more games. Goals scored is the fourth step, wins the fifth.
  const pair = [
    { club: 'Zeta', w: 11, d: 2, l: 7, gf: 30, ga: 20, pts: 35 },
    { club: 'Eta', w: 10, d: 5, l: 5, gf: 40, ga: 30, pts: 35 },
  ];
  const drawn = { 'Zeta|Eta': [1, 1], 'Eta|Zeta': [1, 1] };
  const pairOrder = sortedTable(pair, { rule: 'gdH2h', pairs: drawn }).map(r => r.club).join(',');
  if (pairOrder !== 'Eta,Zeta') note('h2h', `France: Eta scored more with everything else level and sits below Zeta, so wins were read before goals scored (${pairOrder})`);
  if (order('h2h', one) !== 'Gamma,Beta,Alpha') note('h2h', `Spain and Italy with one game played: should fall back to goal difference (${order('h2h', one)})`);
  if (order('h2h', {}) !== 'Gamma,Beta,Alpha') note('h2h', `Spain and Italy with no ledger: should fall back to goal difference (${order('h2h', {})})`);
  if (sortedTable(rows).map(r => r.club).join(',') !== 'Gamma,Beta,Alpha') note('h2h', 'a bare sortedTable(rows) no longer reads goal difference then goals scored');
  const foot = tiebreakFootnote('h2h', rows, one);
  if (!/head to head/.test(foot) || !/1 level pair has not met twice/.test(foot)) note('h2h', `the Spanish footnote does not say the pair has not met twice: "${foot}"`);
  if (/not met twice/.test(tiebreakFootnote('h2h', rows, both))) note('h2h', 'the Spanish footnote reports a waiting pair after both games were played');
  if (!/goal difference, then goals scored, then head to head/.test(tiebreakFootnote('gdGf', rows, both))) note('h2h', 'the English footnote does not give the English order');
  if (leagueTiebreak('laliga') !== 'h2h' || leagueTiebreak('laliga2005') !== 'h2h' || leagueTiebreak('seriea') !== 'h2h' || leagueTiebreak('seriea2015') !== 'h2h') note('h2h', 'La Liga or Serie A is not on head to head');
  if (leagueTiebreak('premier') !== 'gdGf' || leagueTiebreak('bundesliga') !== 'gdGfAgg' || leagueTiebreak('ligue1') !== 'gdH2h') note('h2h', 'England, Germany or France is on the wrong rule');
  if (!/aggregate of the two games/.test(tiebreakFootnote('gdGfAgg', rows, both))) note('h2h', 'the German footnote does not name the direct aggregate');
  if (!/then goals scored, then wins/.test(tiebreakFootnote('gdH2h', rows, both))) note('h2h', 'the French footnote does not read goals scored before wins');
  if (leagueTiebreak('eredivisie') !== 'gdGfOnly' || leagueTiebreak(undefined) !== 'gdGfOnly') note('h2h', 'an unverified league is not on the plain order');
}

/* ---------- 5. a pre migration save ---------- */
function checkMigration(tally) {
  // An era save three group nights in, in the shape the old engine saved it.
  let s = startCareer('Barcelona', 'era2005');
  s = playUntil(s, st => (st.uclGroup?.matchday ?? 0) >= 3);
  if (s.sacked || (s.uclGroup?.matchday ?? 0) < 3) { note('migrate', 'could not reach the third group night for the migration save'); return; }
  const old = clone(s);
  delete old.pairResults;
  old.calendar = old.calendar.filter(e => !(e.type === 'uclKo' && e.uclRound === 'R16'));
  const oldLen = old.calendar.length;
  if (old.calendar.length === s.calendar.length) note('migrate', 'the fresh calendar carried no round of 16 week to strip (the reported gap)');
  saveCareer(old);
  const back = loadCareer();
  clearCareer();
  if (!back) { note('migrate', 'the pre migration era save would not load'); return; }
  if (JSON.stringify(back.pairResults) !== '{}') note('migrate', `the pre migration save opened with a ledger of ${JSON.stringify(back.pairResults)} rather than empty`);
  const idx = back.calendar.findIndex(e => e.type === 'uclKo' && e.uclRound === 'R16');
  const n16 = back.calendar.filter(e => e.type === 'uclKo' && e.uclRound === 'R16').length;
  if (n16 !== 1) note('migrate', `the repaired calendar carries ${n16} round of 16 weeks`);
  if (back.calendar.length !== oldLen + 1) note('migrate', `the repaired calendar has ${back.calendar.length} entries where the old one had ${oldLen}`);
  const iWin = back.calendar.findIndex(e => e.type === 'window');
  const iQf = back.calendar.findIndex(e => e.type === 'uclKo' && e.uclRound === 'QF');
  if (!(idx > iWin && idx < iQf)) note('migrate', `the repaired round of 16 week sits at ${idx}, window ${iWin}, quarter finals ${iQf}`);
  if (idx < back.week) note('migrate', `the repaired round of 16 week (${idx}) sits before the week already reached (${back.week})`);
  for (let i = 0; i < back.week; i++) if (JSON.stringify(back.calendar[i]) !== JSON.stringify(old.calendar[i])) note('migrate', `the repair changed calendar entry ${i}, which was already played`);
  // The footnote is honest about the empty ledger.
  const foot = tiebreakFootnote(leagueTiebreak(careerLeagueOf(back).id), sortedLeagueTable(back), back.pairResults?.[careerLeagueOf(back).id]);
  const level = (() => { const t = sortedLeagueTable(back); let k = 0; for (let i = 1; i < t.length; i++) if (t[i].pts === t[i - 1].pts) k += 1; return k; })();
  if (level > 0 && !/not met twice/.test(foot)) note('migrate', `the table has ${level} level pairs, the ledger is empty, and the footnote does not say so: "${foot}"`);
  // And it plays out, round of 16 included.
  let koStart = null;
  const end = playUntil(back, () => false, st => { if (!koStart && st.uclKoRound !== null) koStart = clone(st); });
  if (!end.sacked) {
    checkFormat('pre migration save', end, koStart, true);
    if (koStart) { checkDraw('pre migration save', koStart, tally); checkRender('pre migration save', koStart, tally); }
    // Its second half was recorded, its first half was not, and both halves
    // of every pair the ledger holds are real scores.
    const lg = careerLeagueOf(end).id;
    const have = Object.keys(end.pairResults?.[lg] ?? {}).length;
    const n = end.leagueClubs.length;
    if (!(have > 0 && have < n * (n - 1))) note('migrate', `a save that started mid season ended with ${have} of ${n * (n - 1)} fixtures in its ledger; it should hold the rest of the season and nothing before`);
    tally.migrated += 1;
  }
  // Every wrong ledger shape is dropped, never trusted.
  const shapes = [
    ['a string', 'ledger'],
    ['an array', [1, 2]],
    ['a number for a league', { laliga2005: 5 }],
    ['an array for a league', { laliga2005: [] }],
    ['a string score', { laliga2005: { 'Barcelona|Sevilla': '2-1' } }],
    ['a three number score', { laliga2005: { 'Barcelona|Sevilla': [2, 1, 0] } }],
    ['a negative score', { laliga2005: { 'Barcelona|Sevilla': [-1, 0] } }],
  ];
  for (const [what, bad] of shapes) {
    const t = clone(s);
    t.pairResults = bad;
    saveCareer(t);
    const b = loadCareer();
    clearCareer();
    if (!b) { note('migrate', `a ledger that is ${what} stopped the save loading`); continue; }
    const kept = Object.values(b.pairResults ?? {}).flatMap(p => Object.values(p ?? {}));
    if (kept.length) note('migrate', `a ledger that is ${what} kept ${kept.length} entries`);
    tally.shapes += 1;
  }
  // A modern save is left exactly as it was.
  let m = startCareer('Real Madrid');
  m = playUntil(m, st => (st.uclGroup?.matchday ?? 0) >= 3);
  const mOld = clone(m);
  delete mOld.pairResults;
  saveCareer(mOld);
  const mBack = loadCareer();
  clearCareer();
  if (!mBack) note('migrate', 'the modern save would not load');
  else {
    if (JSON.stringify(mBack.calendar) !== JSON.stringify(mOld.calendar)) note('migrate', 'the repair touched a modern calendar');
    if (JSON.stringify(mBack.pairResults) !== '{}') note('migrate', 'the modern save did not open with an empty ledger');
  }
}

/* ---------- 6. Round 478: the group table's own order ---------- */

/** Every group of one save, mine first, with the clubs that are in it. */
function groupsOf(s) {
  const out = [];
  if (s.uclGroup) out.push({ letter: 'A', clubs: [s.clubName, ...s.uclGroup.opponents], table: s.uclGroup.table });
  for (const g of s.uclWorld ?? []) out.push({ letter: g.letter, clubs: g.clubs, table: g.table });
  return out;
}

/**
 * The mini league of every game among a run of level clubs, written here
 * from the regulations (points, goal difference, goals scored in the
 * matches between the teams in question) and read out of the ledger. Null
 * when a pair of them has not met twice, which is when the rule cannot be
 * applied and the engine must fall back.
 */
function groupMini(run, pairs) {
  const line = new Map();
  for (const r of run) {
    let pts = 0;
    let gd = 0;
    let gf = 0;
    for (const o of run) {
      if (o.club === r.club) continue;
      const home = pairs[`${r.club}|${o.club}`];
      const away = pairs[`${o.club}|${r.club}`];
      if (!home || !away) return null;
      pts += home[0] > home[1] ? 3 : home[0] === home[1] ? 1 : 0;
      pts += away[1] > away[0] ? 3 : away[0] === away[1] ? 1 : 0;
      gd += (home[0] - home[1]) + (away[1] - away[0]);
      gf += home[0] + away[1];
    }
    line.set(r.club, { pts, gd, gf });
  }
  return line;
}

const byOverallGd = run => [...run].sort((a, b) =>
  (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.club.localeCompare(b.club));

/**
 * The order the regulations give, built here rather than read back off the
 * module under test: points; then, among a run level on points, the mini
 * league of the games between them, with those same criteria reapplied to
 * any SMALLER subset still level on all three; then, for a subset nothing
 * has separated, overall goal difference and goals scored. A save that does
 * not play the group stage (the modern one, standing in for the league
 * phase) has no head to head step at all.
 */
function expectedGroupOrder(rows, pairs, groupStage) {
  const level = run => {
    const line = groupMini(run, pairs);
    if (!line) return byOverallGd(run);
    const k = r => line.get(r.club);
    const s = [...run].sort((a, b) => {
      const x = k(a);
      const y = k(b);
      return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || a.club.localeCompare(b.club);
    });
    const out = [];
    let i = 0;
    while (i < s.length) {
      const x = k(s[i]);
      let j = i + 1;
      while (j < s.length) {
        const y = k(s[j]);
        if (y.pts !== x.pts || y.gd !== x.gd || y.gf !== x.gf) break;
        j += 1;
      }
      const sub = s.slice(i, j);
      if (sub.length === 1) out.push(sub[0]);
      else if (sub.length < run.length) out.push(...level(sub));
      else out.push(...byOverallGd(sub));
      i = j;
    }
    return out;
  };
  const byPts = [...rows].sort((a, b) => b.pts - a.pts || a.club.localeCompare(b.club));
  const out = [];
  let i = 0;
  while (i < byPts.length) {
    let j = i + 1;
    while (j < byPts.length && byPts[j].pts === byPts[i].pts) j += 1;
    const run = byPts.slice(i, j);
    out.push(...(run.length === 1 ? run : groupStage ? level(run) : byOverallGd(run)));
    i = j;
  }
  return out;
}

/** Every group of one save against the rule, and the measurement. */
function checkGroupOrder(tag, s, tally, final) {
  if (!s.uclGroup) return;
  const pairs = s.pairResults?.[GROUP_LEDGER] ?? {};
  const groupStage = uclGroupRule(s) === 'groupStage';
  const wantRule = eraUclHasR16Local(s) ? 'groupStage' : 'leaguePhase';
  if (uclGroupRule(s) !== wantRule) note('groups', `${tag}: a ${s.eraId ?? 'modern'} save sorts its groups on the ${uclGroupRule(s)} order rather than ${wantRule}`);
  const all = groupsOf(s);
  const md = s.uclGroup.matchday;
  /* Two games a night in every group, and nothing else in the ledger. */
  const want = 2 * all.length * md;
  const have = Object.keys(pairs).length;
  if (have !== want) note('groups', `${tag}: after ${md} group nights the ledger holds ${have} of ${want} fixtures across ${all.length} groups`);
  const clubOfGroup = new Map();
  for (const g of all) for (const c of g.clubs) clubOfGroup.set(c, g.letter);
  for (const k of Object.keys(pairs)) {
    const [h, a] = k.split('|');
    if (!clubOfGroup.has(h) || !clubOfGroup.has(a)) { note('groups', `${tag}: the group ledger names ${k}, which is not two clubs of the draw`); continue; }
    if (clubOfGroup.get(h) !== clubOfGroup.get(a)) note('groups', `${tag}: the group ledger names ${k}, two clubs of different groups`);
  }
  for (const g of all) {
    tally.groupTables += 1;
    const engine = sortedUclGroup(s, g.table).map(r => r.club);
    const want2 = expectedGroupOrder(g.table, pairs, groupStage).map(r => r.club);
    if (engine.join() !== want2.join()) {
      note('groups', `${tag}: Group ${g.letter} after ${md} nights reads ${engine.join(', ')} where the competition's own order is ${want2.join(', ')} (the reported gap)`);
    }
    /* The table and the ledger are the same season: every club's points and
       goals add up from its own recorded results. */
    if (final) {
      for (const c of g.clubs) {
        let pts = 0;
        let gf = 0;
        let ga = 0;
        for (const o of g.clubs) {
          if (o === c) continue;
          const h = pairs[`${c}|${o}`];
          const a = pairs[`${o}|${c}`];
          if (h) { gf += h[0]; ga += h[1]; pts += h[0] > h[1] ? 3 : h[0] === h[1] ? 1 : 0; }
          if (a) { gf += a[1]; ga += a[0]; pts += a[1] > a[0] ? 3 : a[0] === a[1] ? 1 : 0; }
        }
        const row = g.table.find(r => r.club === c);
        if (row && (row.pts !== pts || row.gf !== gf || row.ga !== ga)) {
          note('groups', `${tag}: Group ${g.letter} ${c} reads ${row.pts} pts ${row.gf}:${row.ga} in the table and ${pts} pts ${gf}:${ga} in the ledger`);
        }
      }
      /* The measurement: what the head to head actually changed. */
      const plain = sortedTable(g.table).map(r => r.club);
      let level = false;
      const byPts = [...g.table].sort((a, b) => b.pts - a.pts);
      for (let i = 1; i < byPts.length; i++) if (byPts[i].pts === byPts[i - 1].pts) level = true;
      tally.finalGroups += 1;
      if (level) tally.groupsLevel += 1;
      if (plain.join() !== engine.join()) tally.groupsTurned += 1;
      if (plain[0] !== engine[0]) tally.winnerChanged += 1;
    }
  }
  /* The field the round of 16 is seeded from IS this order. Round 462 takes
     rows[0] and rows[1] of every group, so a table and a bracket that
     disagreed would be the whole reported defect wearing a different hat. */
  if (final && s.uclBracket?.some(t => t.round === 'R16') && all.length >= 8) {
    const seeded = new Set();
    for (const t of s.uclBracket.filter(t => t.round === 'R16')) { seeded.add(t.home); seeded.add(t.away); }
    for (const g of all.slice(0, 8)) {
      const rows = sortedUclGroup(s, g.table).map(r => r.club);
      for (const c of rows.slice(0, 2)) {
        if (!seeded.has(c)) note('groups', `${tag}: Group ${g.letter} finished with ${rows[0]} and ${rows[1]} in the top two and ${c} is not in the round of 16 (the reported gap)`);
      }
      for (const c of rows.slice(2)) {
        if (seeded.has(c)) note('groups', `${tag}: Group ${g.letter} sent ${c} to the round of 16 from ${rows.indexOf(c) + 1}th`);
      }
      tally.seededGroups += 1;
    }
  }
}

/** The era predicate the harness needs, read the way the format section
 *  already reads it, so this check does not become a second opinion. */
function eraUclHasR16Local(s) {
  return uclFirstKoRound(s) === 'R16';
}

/** Crafted tables, so the rule is proved and not only agreed with. */
function checkGroupRule(tally) {
  const era = { eraId: 'era2005', pairResults: {} };
  const modern = { eraId: undefined, pairResults: {} };
  const mk = (club, w, d, l, gf, ga, pts) => ({ club, w, d, l, gf, ga, pts });
  /* Two level on points. Blue has the better goal difference by a mile;
     Red won both games between them. The group stage takes Red. */
  const two = [
    mk('Red', 3, 1, 2, 8, 7, 10),
    mk('Blue', 3, 1, 2, 14, 4, 10),
    mk('Green', 1, 1, 4, 4, 12, 4),
  ];
  const met = { 'Red|Blue': [2, 0], 'Blue|Red': [0, 1] };
  const order = (state, rows, pairs) => sortedUclGroup({ ...state, pairResults: { [GROUP_LEDGER]: pairs } }, rows).map(r => r.club).join(',');
  if (order(era, two, met) !== 'Red,Blue,Green') note('groups', `the group stage: Red won both games and still sits below Blue (${order(era, two, met)}) (the reported gap)`);
  if (order(modern, two, met) !== 'Blue,Red,Green') note('groups', `the league phase: goal difference should come first with no head to head step (${order(modern, two, met)})`);
  /* Met once only: the rule is not readable yet and the fall back is goal
     difference, the same convention the league tables use. */
  if (order(era, two, { 'Red|Blue': [2, 0] }) !== 'Blue,Red,Green') note('groups', `the group stage with one game played: should fall back to goal difference (${order(era, two, { 'Red|Blue': [2, 0] })})`);
  if (order(era, two, {}) !== 'Blue,Red,Green') note('groups', `the group stage with no ledger: should fall back to goal difference (${order(era, two, {})})`);
  /* The reapplication step, which is the one a three way tie needs. Theta,
     Iota and Kappa finish level on 10 points. The mini league of the six
     games between them takes Kappa clear on 9 points, and leaves Theta and
     Iota level on ALL THREE of its numbers (4 points, -1, 3 scored), so the
     regulations reapply those same three to the subset that is still level,
     which here is Theta and Iota's own two games: Theta won one and drew the
     other. Overall goal difference says the opposite (Iota +7, Theta +1,
     Kappa 0), so nothing but the rule can produce this order. */
  const three = [
    mk('Theta', 3, 1, 2, 5, 4, 10),
    mk('Iota', 3, 1, 2, 11, 4, 10),
    mk('Kappa', 3, 1, 2, 3, 3, 10),
    mk('Lambda', 1, 1, 4, 2, 10, 4),
  ];
  const trio = {
    'Theta|Iota': [2, 1], 'Iota|Theta': [1, 1],
    'Theta|Kappa': [0, 1], 'Kappa|Theta': [1, 0],
    'Iota|Kappa': [1, 0], 'Kappa|Iota': [1, 0],
    'Theta|Lambda': [1, 0], 'Lambda|Theta': [0, 1],
    'Iota|Lambda': [4, 0], 'Lambda|Iota': [0, 4],
    'Kappa|Lambda': [0, 0], 'Lambda|Kappa': [2, 0],
  };
  /* The fixture has to be the shape the check claims, or the check is not
     testing the reapplication at all. */
  const line = groupMini(three.slice(0, 3), trio);
  const flat = line && ['pts', 'gd', 'gf'].every(k => line.get('Theta')[k] === line.get('Iota')[k]);
  if (!flat) note('groups', 'the crafted three way table does not leave Theta and Iota level on the whole mini league, so it is not testing the reapplication');
  if (line && line.get('Kappa').pts <= line.get('Theta').pts) note('groups', 'the crafted three way table does not separate Kappa on the mini league, so the subset left level is all three and nothing is reapplied');
  const pairOnly = groupMini(three.slice(0, 2), trio);
  if (!pairOnly || pairOnly.get('Theta').pts <= pairOnly.get('Iota').pts) note('groups', 'the crafted three way table does not split Theta and Iota on their own two games');
  const gdOf = c => { const r = three.find(x => x.club === c); return r.gf - r.ga; };
  if (!(gdOf('Iota') > gdOf('Theta') && gdOf('Theta') > gdOf('Kappa'))) note('groups', 'the crafted three way table does not make overall goal difference disagree with the rule, so it proves nothing');
  const got = order(era, three, trio);
  if (got !== 'Kappa,Theta,Iota,Lambda') note('groups', `the reapplication to a subset still level: wanted Kappa, Theta, Iota, Lambda and got ${got}`);
  if (order(modern, three, trio) !== 'Iota,Theta,Kappa,Lambda') note('groups', `the league phase on the same table should read overall goal difference (${order(modern, three, trio)})`);
  /* The footnotes name the order that sorted the rows. */
  const footEra = uclGroupTiebreakFootnote({ ...era, pairResults: { [GROUP_LEDGER]: met } }, two);
  const footMod = uclGroupTiebreakFootnote({ ...modern, pairResults: { [GROUP_LEDGER]: met } }, two);
  if (!/games between the level clubs first/.test(footEra)) note('groups', `the group stage footnote does not name the head to head step: "${footEra}"`);
  if (/games between the level clubs/.test(footMod)) note('groups', `the league phase footnote claims a head to head step it does not have: "${footMod}"`);
  if (/not met twice/.test(footEra)) note('groups', `the group stage footnote reports a waiting pair after both games were played: "${footEra}"`);
  const footOne = uclGroupTiebreakFootnote({ ...era, pairResults: { [GROUP_LEDGER]: { 'Red|Blue': [2, 0] } } }, two);
  if (!/1 level pair has not met twice/.test(footOne)) note('groups', `the group stage footnote does not say the pair has not met twice: "${footOne}"`);
  tally.crafted = 6;
}

/**
 * The source, counted. A group table sorted anywhere else, by anything
 * else, is the defect coming back through a door nobody watched, so the
 * number of places that sort at all is held rather than the shape of the
 * ones this round happened to touch.
 */
function checkGroupPaths() {
  const engine = lf(fs.readFileSync(ENGINE, 'utf8'));
  const cards = fs.readdirSync(path.join(ROOT, 'src', 'components', 'club-manager'))
    .filter(f => f.endsWith('.tsx'))
    .map(f => [f, lf(fs.readFileSync(path.join(ROOT, 'src', 'components', 'club-manager', f), 'utf8'))]);
  const count = (src, needle) => src.split(needle).length - 1;
  /* Measured on the shipped tree: sortedTable is declared once and called at
     the three league helpers; sortedUclGroup is declared once and called at
     the five places a group's standing is read (two in the seeding field,
     one in the winners-only branch, one in the round of 16 field, one at the
     final whistle). If either number moves, a new path is reading a table
     and somebody has to say which order it should read. */
  const plain = count(engine, 'sortedTable(');
  const group = count(engine, 'sortedUclGroup(');
  if (plain !== 4) note('groups', `clubManager.ts calls sortedTable in ${plain} places rather than 4 (one declaration and the three league helpers); if a new one sorts a Champions League group it must use sortedUclGroup`);
  if (group !== 6) note('groups', `clubManager.ts names sortedUclGroup in ${group} places rather than 6 (one declaration and the five group reads); a new group reader must be checked against this section`);
  for (const [f, src] of cards) {
    if (count(src, 'sortedTable(')) note('groups', `${f} sorts a table with the plain sortedTable; a Club Manager card showing a group must use sortedUclGroup`);
  }
  const cardGroup = cards.reduce((n, [, src]) => n + count(src, 'sortedUclGroup('), 0);
  if (cardGroup !== 1) note('groups', `the Club Manager cards call sortedUclGroup in ${cardGroup} places rather than 1 (the groups card)`);
}

/** A save from before this round: the group results are gone, the fall back
 *  is honest, and the groups play out. */
function checkGroupMigration(tally) {
  let s = startCareer('Barcelona', 'era2005');
  s = playUntil(s, st => (st.uclGroup?.matchday ?? 0) >= 4);
  if (s.sacked || (s.uclGroup?.matchday ?? 0) < 4) { note('groups', 'could not reach the fourth group night for the pre-478 save'); return; }
  const old = clone(s);
  if (!Object.keys(old.pairResults?.[GROUP_LEDGER] ?? {}).length) note('groups', 'the fresh save carried no group ledger to strip, so this check is not testing anything');
  delete old.pairResults[GROUP_LEDGER];
  saveCareer(old);
  const back = loadCareer();
  clearCareer();
  if (!back) { note('groups', 'the pre-478 save would not load'); return; }
  if (Object.keys(back.pairResults?.[GROUP_LEDGER] ?? {}).length) note('groups', 'the pre-478 save invented group results it never played');
  /* With nothing to read, every group falls back to goal difference and the
     footnote says which pairs are waiting. */
  const g = back.uclGroup;
  const plain = sortedTable(g.table).map(r => r.club).join();
  if (sortedUclGroup(back, g.table).map(r => r.club).join() !== plain) note('groups', 'a pre-478 save with an empty group ledger did not fall back to goal difference');
  let levelPairs = 0;
  const sorted = sortedUclGroup(back, g.table);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].pts === sorted[i - 1].pts) levelPairs += 1;
  const foot = uclGroupTiebreakFootnote(back, g.table);
  if (levelPairs > 0 && !/not met twice/.test(foot)) note('groups', `the pre-478 group table has ${levelPairs} level pairs with an empty ledger and the footnote does not say so: "${foot}"`);
  /* And it plays out: the nights still to come are recorded, the ones
     already played are not reconstructed. */
  const end = playUntil(back, st => (st.uclGroup?.matchday ?? 0) >= 6);
  const have = Object.keys(end.pairResults?.[GROUP_LEDGER] ?? {}).length;
  const groups = 1 + (end.uclWorld?.length ?? 0);
  if (!(have > 0 && have < 2 * groups * 6)) note('groups', `a save that lost its group ledger mid season ended the groups with ${have} of ${2 * groups * 6} fixtures; it should hold the rest and nothing before`);
  if (end.uclKoRound === null) note('groups', 'the pre-478 save never settled its group stage');
  tally.migratedGroups += 1;
}

/* ---------- the driver ---------- */
const tally = {
  careers: 0, sacked: 0, ties: 0, countryChecked: 0, draws: 0, renders: 0, levelPairs: 0,
  byH2hPts: 0, byH2hGd: 0, byGd: 0, turned: 0, englishPairs: 0, tables: 0, migrated: 0, shapes: 0,
  /* Round 478 */
  groupTables: 0, finalGroups: 0, groupsLevel: 0, groupsTurned: 0, winnerChanged: 0,
  seededGroups: 0, crafted: 0, migratedGroups: 0, groupNights: 0,
};
function runCareer(tag, club, eraId) {
  const isEra = !!eraId;
  let koStart = null;
  let s = eraId ? startCareer(club, eraId) : startCareer(club);
  /* Round 478: every group of every save is read on every group night, not
     only at the final whistle, so the mid group fall back is walked too. */
  let seenMd = -1;
  s = playUntil(s, () => false, st => {
    if (!koStart && st.uclKoRound !== null) koStart = clone(st);
    const md = st.uclGroup?.matchday ?? -1;
    if (md > seenMd && md >= 1 && md <= 6) {
      seenMd = md;
      tally.groupNights += 1;
      checkGroupOrder(`${tag} after group night ${md}`, st, tally, md >= 6);
    }
  });
  if (s.sacked) { tally.sacked += 1; return; }
  tally.careers += 1;
  checkFormat(tag, s, koStart, isEra);
  if (s.uclGroup) checkGroupOrder(`${tag} at the final whistle`, s, tally, false);
  if (isEra && s.uclGroup) {
    if (!koStart) note('format', `${tag}: the knockouts never started`);
    else {
      checkDraw(tag, koStart, tally);
      checkRender(`${tag} at the draw`, koStart, tally);
      checkRender(`${tag} at the final whistle`, s, tally);
    }
    checkH2H(tag, s, tally);
  }
}
const ERA_CAREERS = [
  ['Barcelona 2005 career 1', 'Barcelona', 'era2005'],
  ['Barcelona 2005 career 2', 'Barcelona', 'era2005'],
  ['Barcelona 2005 career 3', 'Barcelona', 'era2005'],
  ['Chelsea 2005', 'Chelsea', 'era2005'],
  ['Real Madrid 2005', 'Real Madrid', 'era2005'],
  ['Barcelona 2010 career 1', 'Barcelona', 'era2010'],
  ['Barcelona 2010 career 2', 'Barcelona', 'era2010'],
  ['Chelsea 2010', 'Chelsea', 'era2010'],
  ['Juventus 2015 career 1', 'Juventus', 'era2015'],
  ['Juventus 2015 career 2', 'Juventus', 'era2015'],
  ['Barcelona 2015', 'Barcelona', 'era2015'],
  ['Arsenal 2015', 'Arsenal', 'era2015'],
  /* Round 478 widened the list. The group order is measured rather than
     asserted, and twelve careers put 36 level groups in front of the check
     where the floors below want room under three seeds, so the sample is
     roughly tripled. It costs about eight seconds. */
  ['Arsenal 2005', 'Arsenal', 'era2005'],
  ['Juventus 2005 career 1', 'Juventus', 'era2005'],
  ['Juventus 2005 career 2', 'Juventus', 'era2005'],
  ['Real Madrid 2005 career 2', 'Real Madrid', 'era2005'],
  ['Chelsea 2005 career 2', 'Chelsea', 'era2005'],
  ['Real Madrid 2010 career 1', 'Real Madrid', 'era2010'],
  ['Real Madrid 2010 career 2', 'Real Madrid', 'era2010'],
  ['Arsenal 2010', 'Arsenal', 'era2010'],
  ['Juventus 2010', 'Juventus', 'era2010'],
  ['Chelsea 2010 career 2', 'Chelsea', 'era2010'],
  ['Barcelona 2010 career 3', 'Barcelona', 'era2010'],
  ['Chelsea 2015 career 1', 'Chelsea', 'era2015'],
  ['Chelsea 2015 career 2', 'Chelsea', 'era2015'],
  ['Real Madrid 2015 career 1', 'Real Madrid', 'era2015'],
  ['Real Madrid 2015 career 2', 'Real Madrid', 'era2015'],
  ['Barcelona 2015 career 2', 'Barcelona', 'era2015'],
  ['Juventus 2015 career 3', 'Juventus', 'era2015'],
  ['Arsenal 2015 career 2', 'Arsenal', 'era2015'],
];
for (const [tag, club, era] of ERA_CAREERS) runCareer(tag, club, era);
runCareer('Real Madrid (modern control)', 'Real Madrid');
runCareer('Arsenal (modern control)', 'Arsenal');
checkRule();
checkMigration(tally);
checkGroupRule(tally);
checkGroupPaths();
checkGroupMigration(tally);

/* ---------- the report ---------- */
let failures = 0;
function section(title, bucket, lines, extra) {
  console.log(title);
  for (const l of lines) console.log('   ' + l);
  extra?.();
  for (const m of buckets[bucket]) console.error('  FAIL: ' + m);
  failures += buckets[bucket].length;
}
section('1) The format: an era plays eight groups into a round of 16, the modern save keeps its shape', 'format', [
  `${tally.careers} careers played to the final whistle (${ERA_CAREERS.length} era, 2 modern), ${tally.sacked} ended in the sack first`,
], () => {
  if (tally.careers < 10) note('format', `only ${tally.careers} careers reached the final whistle (floor 10)`);
});
section('2) The draw: winners against runners-up, never the same group, never the same country, a function of the save', 'draw', [
  `${tally.draws} draws checked, ${tally.ties} ties, the association rule readable on ${tally.countryChecked} of them; every draw reproduced twice and across a save and reload`,
], () => {
  if (tally.draws < 8) note('draw', `only ${tally.draws} draws checked (floor 8)`);
  if (tally.countryChecked < tally.ties * 0.9) note('draw', `the association was readable on only ${tally.countryChecked} of ${tally.ties} ties`);
});
section('3) The group tables stay on the Cups tab once the knockouts start', 'render', [
  `${tally.renders} cards rendered through react-dom/server on knockout states`,
], () => {
  if (tally.renders < 24) note('render', `only ${tally.renders} knockout cards rendered (floor 24)`);
});
section('4) Level points split on head to head in Spain and Italy, on goal difference in England', 'h2h', [
  `${tally.tables} final tables read; ${tally.levelPairs} neighbouring pairs level on points in Spanish and Italian tables: ${tally.byH2hPts} split on head to head points, ${tally.byH2hGd} on head to head goal difference, ${tally.byGd} fell through to goal difference; ${tally.turned} of them sit the other way round from goal difference (the visible change); ${tally.englishPairs} English level pairs, all on goal difference then goals scored`,
], () => {
  if (tally.levelPairs < 20) note('h2h', `only ${tally.levelPairs} level pairs in Spanish and Italian tables (floor 20)`);
  if (tally.turned < 3) note('h2h', `head to head turned only ${tally.turned} level pairs against goal difference, too few to know the rule is being read (floor 3)`);
});
section('5) A pre migration save loads, is repaired honestly and plays out', 'migrate', [
  `${tally.migrated} pre migration era save played to the final whistle with its round of 16; ${tally.shapes} wrong ledger shapes dropped; the modern save untouched`,
]);
section('6) A Champions League group is sorted by the Champions League rule, and the round of 16 is seeded from that order', 'groups', [
  `${tally.groupTables} group tables read across ${tally.groupNights} group nights, every one against the regulations' order rebuilt here from the ledger; ${tally.seededGroups} final groups checked against the round of 16 field; ${tally.crafted} crafted tables; ${tally.migratedGroups} pre-478 save played its groups out with the results it lost left lost`,
  `THE MEASUREMENT: of ${tally.finalGroups} groups at the final whistle, ${tally.groupsLevel} finished with clubs level on points, the head to head put ${tally.groupsTurned} of them in a different order from goal difference, and ${tally.winnerChanged} of those changed who topped the group and therefore who hosts the deciding leg of the round of 16`,
], () => {
  if (tally.groupTables < 1200) note('groups', `only ${tally.groupTables} group tables read (floor 1200)`);
  if (tally.seededGroups < 180) note('groups', `only ${tally.seededGroups} final groups checked against the round of 16 field (floor 180)`);
  if (tally.migratedGroups < 1) note('groups', 'the pre-478 group ledger migration never ran');
  if (tally.crafted < 6) note('groups', 'the crafted group tables did not run');
  /* Floors from the measured spread, not from a number that felt right.
     Over its own seed and SIM_SEED 1 to 5 the shipped engine produced 248 to
     256 final groups, 88 to 104 of them with clubs level on points, 25 to 33
     reordered by the head to head and 6 to 14 with a new group winner. Every
     floor sits well under the lowest of those six runs, because a run that
     drops through one of them is not a bad night, it is the rule going
     unread. */
  if (tally.groupsLevel < 60) note('groups', `only ${tally.groupsLevel} of ${tally.finalGroups} final groups ended with clubs level on points (floor 60, measured 88 to 104), too few to know the rule is being exercised`);
  if (tally.groupsTurned < 15) note('groups', `the head to head reordered only ${tally.groupsTurned} groups against goal difference (floor 15, measured 25 to 33), too few to know it is being read`);
  if (tally.winnerChanged < 2) note('groups', `the head to head changed the group winner in only ${tally.winnerChanged} groups (floor 2, measured 6 to 14), which is the outcome this round exists for`);
});

console.log('');
if (CONTROL === 'nor16') {
  const hit = buckets.format.length + buckets.draw.length + buckets.migrate.length;
  if (hit > 0 && buckets.render.length === 0) { console.log(`simClubManagerEraUcl control: green. The pre-462 competition was reported (${hit} findings across sections 1, 2 and 5).`); process.exit(0); }
  console.error(`simClubManagerEraUcl control: RED. The pre-462 competition went unreported (${hit} findings).`); process.exit(1);
}
if (CONTROL === 'vanish') {
  if (buckets.render.length > 0) { console.log(`simClubManagerEraUcl control: green. The vanishing group tables were reported (${buckets.render.length} findings).`); process.exit(0); }
  console.error('simClubManagerEraUcl control: RED. The pre-462 groups card went unreported.'); process.exit(1);
}
if (CONTROL === 'gdonly') {
  if (buckets.h2h.length > 0) { console.log(`simClubManagerEraUcl control: green. The goal difference only sort was reported (${buckets.h2h.length} findings).`); process.exit(0); }
  console.error('simClubManagerEraUcl control: RED. The pre-462 sort went unreported.'); process.exit(1);
}
if (CONTROL === 'uclgd') {
  if (buckets.groups.length > 0) { console.log(`simClubManagerEraUcl control: green. The pre-478 group order was reported (${buckets.groups.length} findings in section 6).`); process.exit(0); }
  console.error('simClubManagerEraUcl control: RED. Every Champions League group sorted on goal difference again and section 6 said nothing.'); process.exit(1);
}
if (failures > 0) { console.error(`\nsimClubManagerEraUcl: ${failures} FAILURE(S)`); process.exit(1); }
console.log('simClubManagerEraUcl: PASS. The era Champions League plays its round of 16, the group tables stay up, and Spain and Italy split level points on head to head.');
