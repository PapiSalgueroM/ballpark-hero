/* Missing XI data integrity harness.

   Born in Round 295 out of three real user reports. The July 2026 daily
   (frozen for weeks by the pre-Round-212 seed) blanked the left forward of
   cl-2021-r16-real, and the entry had the wrong XI: a misremembered 4-3-3
   with the 84th minute super-sub written in as a starter. Players who
   answered with the man who genuinely started ("LW was literally the
   player") were told they were wrong.

   Two lessons enforced here:
   1) Structure: every candidate must occupy the slot it claims, every XI
      must be 11 unique names, dashes stay out of shipped strings, and one
      man has one spelling across the file. This ran as a hand tool
      (xiCheck.ts) but only over four lineups and only when somebody
      remembered; now it sweeps the whole file on every board.
   2) The corrected Atalanta XI is PINNED against an independent copy of the
      teamsheet, because the wrong version of this lineup is the one people
      remember: without a pin, a future editor "fixing" Vinicius back to
      Asensio looks like a data cleanup and no structural check would object.

   Round 383 added sections 4 and 5: a verified database alias must be
   accepted and must key as the same try as the lineup spelling, and the
   surname hint must name the family name (Park, not Ji-sung) and count its
   letters only. Neither touches the network; simMissingXiReach is the live
   half and checks every alias against the table.

   Round 1026 added section 6, which widens the one pinned eleven to all
   207. The record is scripts/data/missingXiVerified2026-10: one row per
   lineup, read from the organiser and an independent host and folded by
   hand (convention.json says how). 117 lineups needed corrections, many of
   them a blank answer who never started, so the file is checked against
   that record, never against itself: 6a one row per lineup in
   LINEUPS order (the daily pick indexes that array), 6b two distinct
   non-wiki hosts vouch for each eleven, 6c the eleven on the pitch is the
   eleven both hosts publish, 6d every blank answer started, 6e every change
   the ledger applied is in the file, 6f the entry equals the ledger on date,
   teams, score, venue, formation and every blank's hint. Two rows are held
   under the lead's rule 6 and skip 6c and 6d only. Measured 2026-10-06:
   207 rows, 205 elevens matched, 790 applied changes in place, 2 held.

   The review fix (same round) widened 6f to everything a player sees:
   dateLabel and competition on all 207 rows, every reveal fact, and the
   held rows' elevens as they stand (hold.entryEleven). Every row now needs
   two hosts with a full eleven; the one-row partial host exemption is gone.
   Section 7 keeps the held lineups out of play: the list in the code equals
   the ledger's held rows, the daily over 1500 days never deals one and moves
   no day that did not land on one, and Unlimited never draws one. Measured
   2026-10-06 after the fix: 833 applied changes in place; over 1500 days
   from 2026-10-06, 10 days land on a held lineup and are stepped on, and
   those are the only days that move.

   The lead then decided (2026-10-06) to rebuild both held rows in place,
   same id and same position in LINEUPS, after every field was re-read on
   two hosts: bundesliga-2016-bayern-title is now the 2-1 at Ingolstadt that
   settled the 2015-16 title, seriea-2010-inter-title the 1-0 at Siena that
   settled the 2009-10 Scudetto. No row is held, HELD_LINEUP_IDS is empty,
   and both rows go through 6c and 6d like the rest. Measured after the
   rebuild: 207 rows, 207 elevens matched, 869 applied changes in place,
   0 held; over 1500 days from 2026-10-06 no day moves. Under heldlive the
   re-held Inter row is dealt on 7 of 1500 days and drawn 19 times in 4000.

   Negative controls (house rule: prove each check can fail):
     SIM_MISSINGXI_CONTROL=wrongxi    swaps the pinned Vinicius entry for the
                                      super-sub; section 2 must FAIL.
     SIM_MISSINGXI_CONTROL=noalias    strips every alias before the accept
                                      check; section 4 must FAIL.
     SIM_MISSINGXI_CONTROL=nosurname  drops Park Ji-sung's surname field;
                                      section 5's pin must FAIL.
     SIM_MISSINGXI_CONTROL=subswap    puts the substitute Serginho in place
                                      of the starter Pirlo (2003 final);
                                      section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=revert     puts Matuidi's 2018 club hint back to
                                      Paris Saint-Germain; section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=onehost    drops espn.com from the 2011 final's
                                      ledger row; section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=fact       gives De Bruyne (Belgium 2018) the false
                                      club filler fact; section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=heldxi     re-holds the rebuilt Inter 2010 row in
                                      memory with its pre-rebuild eleven
                                      pinned; section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=rebuilt    puts Lucio (on the bench) back in place
                                      of Materazzi in the rebuilt Inter 2010
                                      eleven; section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=datelabel  turns the 2011 final into a 2012 one;
                                      section 6 must FAIL.
     SIM_MISSINGXI_CONTROL=heldlive   marks the rebuilt Inter 2010 row held in
                                      the ledger while the code list stays
                                      empty; section 7 must FAIL.
   The seven section 6 controls are judged on section 6 alone, heldlive on 7.
   Each control asserts it actually changed something before running, so a
   stale pin or a drifted file cannot green a control.

   Run: node scripts/simMissingXi.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_MISSINGXI_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'missingXiHarnessEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'missingXiHarness.bundle.mjs');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

fs.writeFileSync(ENTRY, `
export { LINEUPS, isCorrectGuess, guessKey, hintForLevel, HELD_LINEUP_IDS, pickDailyPuzzle, pickUnlimitedPuzzle } from '${ROOT_URL}/src/lib/missingXi.ts';
export { normalizeName } from '${ROOT_URL}/src/lib/playerSearch.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
/* The stub must live in THIS process: an import statement inside the entry
   hoists above any statement beside it, so a stub written into the entry
   runs after the bundled supabase client already asked for localStorage. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { LINEUPS, isCorrectGuess, guessKey, hintForLevel, normalizeName, HELD_LINEUP_IDS, pickDailyPuzzle, pickUnlimitedPuzzle } = await import(pathToFileURL(BUNDLE).href);

console.log('1) Every lineup is structurally sound, every blank sits in its own slot, one man has one spelling');
{
  const ids = new Set();
  for (const lu of LINEUPS) {
    if (ids.has(lu.id)) fail(`${lu.id}: duplicate lineup id`);
    ids.add(lu.id);
    if (lu.slots.length !== 11) fail(`${lu.id}: ${lu.slots.length} slots`);
    const names = new Set(lu.slots.map(s => s.name));
    if (names.size !== lu.slots.length) fail(`${lu.id}: duplicate name in XI`);
    if (lu.slots.filter(s => s.position === 'GK').length !== 1) fail(`${lu.id}: needs exactly one GK`);
    if (lu.blankCandidates.length < 2 || lu.blankCandidates.length > 3) fail(`${lu.id}: ${lu.blankCandidates.length} blank candidates, spec says 2-3`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lu.matchDate)) fail(`${lu.id}: matchDate "${lu.matchDate}" not YYYY-MM-DD`);
    for (const c of lu.blankCandidates) {
      const slot = lu.slots[c.slotIndex];
      if (!slot) { fail(`${lu.id}: "${c.name}" points at slot ${c.slotIndex} of ${lu.slots.length}`); continue; }
      if (slot.name !== c.name) fail(`${lu.id}: candidate "${c.name}" claims slot ${c.slotIndex} but that slot is "${slot.name}" (${slot.position})`);
      if (!isCorrectGuess(c.name, c)) fail(`${lu.id}: "${c.name}" does not match itself through the guess check`);
    }
    const dash = /[–—]/;
    const texts = [lu.dateLabel, lu.competition, lu.scoreLine, lu.venue, ...lu.blankCandidates.map(c => c.fact || '')];
    for (const t of texts) if (dash.test(t)) fail(`${lu.id}: banned dash in shipped string "${t}"`);
  }
  /* Round 383: one man, one spelling. The file had both Nicolo and Nicolò
     Barella, and the roster the page hands the autocomplete keys rows by
     normalized name, so a second spelling was a second identical row. */
  const spellings = new Map();
  for (const lu of LINEUPS) {
    for (const s of lu.slots) {
      const key = normalizeName(s.name);
      if (!spellings.has(key)) spellings.set(key, new Set());
      spellings.get(key).add(s.name);
    }
  }
  for (const set of spellings.values()) {
    if (set.size > 1) fail(`"${[...set].join('" and "')}" are one starter spelled two ways`);
  }
  console.log(`   ${LINEUPS.length} lineups swept, ${spellings.size} distinct starters`);
}

console.log('2) The Atalanta second leg stays the real 3-5-2, pinned against the teamsheet');
{
  /* Independent copy of the XI, from ESPN's match page and theScore's
     confirmed-lineups piece, both read 2026-08-26. Not derived from the
     data file on purpose: if the file drifts, this list is the memory. */
  const PINNED = [
    'Thibaut Courtois',
    'Nacho', 'Raphael Varane', 'Sergio Ramos',
    'Lucas Vazquez', 'Federico Valverde', 'Toni Kroos', 'Luka Modric', 'Ferland Mendy',
    'Karim Benzema', 'Vinicius Junior',
  ];
  const control = CONTROL === 'wrongxi';
  if (control) {
    const i = PINNED.indexOf('Vinicius Junior');
    if (i === -1) { console.error('control cannot run: could not find the pin it is meant to corrupt'); process.exit(1); }
    PINNED[i] = 'Marco Asensio';
  }
  const lu = LINEUPS.find(l => l.id === 'cl-2021-r16-real');
  if (!lu) fail('cl-2021-r16-real is missing from LINEUPS');
  else {
    if (lu.formationLabel !== '3-5-2') fail(`Atalanta leg formation is "${lu.formationLabel}", the misremembered version was a 4-3-3`);
    const actual = lu.slots.map(s => s.name).sort().join('|');
    const pinned = [...PINNED].sort().join('|');
    if (actual !== pinned) fail(`Atalanta leg XI drifted from the pinned teamsheet.\n    pinned: ${pinned}\n    actual: ${actual}`);
    for (const ghost of ['Marco Asensio', 'Casemiro', 'Daniel Carvajal']) {
      if (!control && lu.slots.some(s => s.name === ghost)) fail(`${ghost} is back in the Atalanta XI; he did not start, see the Round 295 comment in missingXi.ts`);
    }
  }
}

console.log('3) The guess check takes case and accent variants, not just exact strings');
{
  const lu = LINEUPS.find(l => l.id === 'cl-2021-r16-real');
  const vini = lu && lu.blankCandidates.find(c => c.name === 'Vinicius Junior');
  if (!vini) fail('Vinicius Junior is not a blank candidate on the corrected lineup');
  else {
    if (!isCorrectGuess('vinicius junior', vini)) fail('lowercase guess rejected');
    if (!isCorrectGuess('VINICIUS JUNIOR', vini)) fail('uppercase guess rejected');
    /* Round 383: the table carries a second Nemanja Vidic row with a
       trailing U+200E, invisible and offered as its own player. Any
       invisible format character must fall away before names are compared. */
    if (!isCorrectGuess('Vinicius Junior' + String.fromCharCode(0x200e), vini)) fail('a trailing invisible mark makes the right name a wrong guess');
    if (!isCorrectGuess(String.fromCharCode(0xfeff) + 'Vinicius Junior', vini)) fail('a leading byte order mark makes the right name a wrong guess');
    if (isCorrectGuess('Marco Asensio', vini)) fail('the super-sub passes as the starter');
  }
}

console.log('4) A verified database alias is accepted, keys as the same try, and no other starter passes');
{
  /* The identity of each alias (same nationality, a club he was at) is
     checked against the live table by simMissingXiReach section 3; this
     offline section pins that the matcher honours the field, that the
     duplicate-guess key folds both spellings together, and that neither
     opens wider than the alias itself. */
  const control = CONTROL === 'noalias';
  let aliased = 0;
  for (const lu of LINEUPS) {
    for (const c of lu.blankCandidates) {
      if (!c.aliases || c.aliases.length === 0) continue;
      aliased += 1;
      const candidate = control ? { ...c, aliases: [] } : c;
      for (const a of c.aliases) {
        if (!isCorrectGuess(a, candidate)) fail(`${lu.id}: alias "${a}" is rejected for "${c.name}"`);
        if (guessKey(a, lu) !== guessKey(c.name, lu)) fail(`${lu.id}: "${a}" and "${c.name}" would burn two guesses`);
      }
      for (const s of lu.slots) {
        if (s.name !== c.name && isCorrectGuess(s.name, c)) fail(`${lu.id}: "${s.name}" passes as "${c.name}"`);
      }
    }
  }
  if (control && aliased === 0) { console.error('control cannot run: no alias to strip'); process.exit(1); }
  if (aliased === 0) fail('no candidate carries an alias; Round 383 added them, so the file has drifted');
  console.log(`   ${aliased} aliased candidates checked`);
}

console.log('5) The surname hint names the family name and counts its letters only');
{
  const control = CONTROL === 'nosurname';
  const surnameHints = (c, lu) => {
    const out = { initial: null, count: null };
    for (const level of [1, 2, 3, 4]) {
      const h = hintForLevel(level, c, lu);
      const i = h && h.match(/^Surname starts with: (.)$/);
      const n = h && h.match(/^Surname has (\d+) letters$/);
      if (i) out.initial = i[1];
      if (n) out.count = Number(n[1]);
    }
    return out;
  };
  let pinned = 0;
  for (const lu of LINEUPS) {
    for (const c of lu.blankCandidates) {
      const words = c.name.trim().split(/\s+/);
      if (c.surname && !words.includes(c.surname)) fail(`${lu.id}: surname "${c.surname}" is not a word of "${c.name}"`);
      const { initial, count } = surnameHints(c, lu);
      if (initial === null || count === null) { fail(`${lu.id}: "${c.name}" has no surname hints on the ladder`); continue; }
      /* The pin: Park is the family name and it has four letters, whatever
         the last word of the string says. */
      if (c.name === 'Park Ji-sung') {
        pinned += 1;
        const candidate = control ? { ...c, surname: undefined } : c;
        const p = surnameHints(candidate, lu);
        if (p.initial !== 'P' || p.count !== 4) fail(`${lu.id}: Park Ji-sung's hints say "${p.initial}" and ${p.count} letters; his surname is Park`);
      }
      if (/\P{L}/u.test(c.surname ?? words[words.length - 1]) && count !== (c.surname ?? words[words.length - 1]).replace(/[^\p{L}]/gu, '').length) {
        fail(`${lu.id}: "${c.name}" counts ${count} letters, punctuation included`);
      }
    }
  }
  if (control && pinned === 0) { console.error('control cannot run: Park Ji-sung is not a blank candidate'); process.exit(1); }
  if (pinned === 0) fail('Park Ji-sung is no longer a blank candidate, so the surname pin has nothing to hold');
  console.log(`   surname hints checked on every candidate, ${pinned} pinned`);
}

console.log('6) Every lineup equals its two host ledger (scripts/data/missingXiVerified2026-10)');
const ledgerFailuresBefore = failures;
{
  /* Round 1026. The ledger is the independent record: every row was read
     from the organiser and an independent host and folded by hand, so the
     file is checked against it rather than against itself. Held rows (lead
     rule 6) keep their entry unchanged and are exempt from 6c and 6d only. */
  const dir = path.join(ROOT, 'scripts', 'data', 'missingXiVerified2026-10');
  const rows = fs.readdirSync(dir).filter(f => /^shard-\d+\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).lineups);
  const lineups = JSON.parse(JSON.stringify(LINEUPS));
  const byId = new Map(lineups.map(l => [l.id, l]));
  const rowById = new Map(rows.map(r => [r.id, r]));
  const anchor = (ok, what) => { if (!ok) { console.error(`control cannot run: ${what}`); process.exit(1); } };
  if (CONTROL === 'subswap') {
    const lu = byId.get('cl-2003-final-milan'); const row = rowById.get('cl-2003-final-milan');
    anchor(lu && lu.slots.filter(s => s.name === 'Andrea Pirlo').length === 1, 'Andrea Pirlo is not a starter of cl-2003-final-milan');
    anchor(row && row.substitutes.some(s => s.includes('Serginho')), 'Serginho is not a ledger substitute of cl-2003-final-milan');
    lu.slots.find(s => s.name === 'Andrea Pirlo').name = 'Serginho';
  }
  if (CONTROL === 'revert') {
    const c = byId.get('wc-2018-final-france')?.blankCandidates.find(x => x.name === 'Blaise Matuidi');
    anchor(c && c.clubAtTime === 'Juventus', 'the Matuidi club hint is not Juventus');
    anchor(rowById.get('wc-2018-final-france')?.applied.some(a => a.path === 'blankCandidates[Blaise Matuidi].clubAtTime' && a.to === 'Juventus'), 'the ledger has no Matuidi club change');
    c.clubAtTime = 'Paris Saint-Germain';
  }
  if (CONTROL === 'onehost') {
    const row = rowById.get('cl-2011-final-barca');
    anchor(row && row.sources.filter(s => s.host === 'espn.com').length === 1, 'cl-2011-final-barca has no single espn.com source to drop');
    row.sources = row.sources.filter(s => s.host !== 'espn.com');
  }
  /* Review fix controls: the false filler fact this round removed from
     national lineups, a held lineup's eleven, and a dateLabel nobody applied. */
  if (CONTROL === 'fact') {
    const c = byId.get('wc-2018-semi-belgium')?.blankCandidates.find(x => x.name === 'Kevin De Bruyne');
    anchor(c && !c.fact, 'De Bruyne is not a fact-free blank of wc-2018-semi-belgium');
    c.fact = 'Started that night for Manchester City.';
  }
  /* The two held rows were rebuilt in place (lead decision, 2026-10-06), so
     no row is held. heldxi now re-holds the rebuilt Inter 2010 row in memory
     with its pre-rebuild eleven pinned: the held branch must see the drift.
     rebuilt puts Lucio (on the bench that day) back in place of Materazzi:
     the rebuilt row is checked against its two host eleven like any other. */
  if (CONTROL === 'heldxi') {
    const row = rowById.get('seriea-2010-inter-title');
    const before = row && row.rebuilt && row.rebuilt.entryElevenBefore;
    anchor(row && row.verdict !== 'held' && Array.isArray(before) && before.includes('Lucio'), 'seriea-2010-inter-title carries no pre-rebuild eleven with Lucio');
    anchor(byId.get('seriea-2010-inter-title')?.slots.some(x => x.name === 'Marco Materazzi'), 'Marco Materazzi is not in the rebuilt seriea-2010 eleven');
    row.verdict = 'held';
    row.hold = { rule: 'control', why: 'control heldxi', entryEleven: before };
  }
  if (CONTROL === 'rebuilt') {
    const s = byId.get('seriea-2010-inter-title')?.slots.find(x => x.name === 'Marco Materazzi');
    anchor(s && rowById.get('seriea-2010-inter-title')?.verdict === 'corrected', 'Marco Materazzi is not in the rebuilt seriea-2010 eleven');
    anchor(!rowById.get('seriea-2010-inter-title').eleven.includes('Lucio'), 'Lucio is in the two host eleven');
    s.name = 'Lucio';
  }
  if (CONTROL === 'datelabel') {
    const lu = byId.get('cl-2011-final-barca');
    anchor(lu && lu.dateLabel === '2011 Champions League Final', 'the 2011 final dateLabel is not the anchor');
    anchor(!rowById.get('cl-2011-final-barca').applied.some(a => a.path === 'dateLabel'), 'the ledger applied a dateLabel change to the 2011 final');
    lu.dateLabel = '2012 Champions League Final';
  }
  const fold = s => normalizeName(s).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const loose = s => fold(s).replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/ae/g, 'a').split(' ').sort().join(' ');
  const sameMan = (entryName, pubName, aka) => fold(entryName) === fold(pubName) || loose(entryName) === loose(pubName) || (aka && aka[entryName] === pubName);
  const side = x => (x < 45 ? 'left' : x > 55 ? 'right' : 'centre');
  const FIELDS = ['matchDate', 'team', 'opponent', 'scoreLine', 'venue', 'formationLabel', 'dateLabel', 'competition'];
  // 6a: one row per lineup, in LINEUPS order (the daily pick indexes this array, so order is part of the record)
  if (rows.length !== lineups.length) fail(`ledger has ${rows.length} rows, LINEUPS has ${lineups.length}`);
  rows.forEach((r, k) => { if (!lineups[k] || lineups[k].id !== r.id || r.position !== k + 1) fail(`ledger row ${k + 1} is ${r.id} (position ${r.position}), LINEUPS has ${lineups[k] && lineups[k].id}`); });
  let held = 0, applied = 0, xiChecked = 0;
  for (const r of rows) {
    const lu = byId.get(r.id);
    if (!lu) { fail(`${r.id}: in the ledger but not in LINEUPS`); continue; }
    // 6b: two distinct non-wiki hosts vouch for the eleven
    const hosts = new Set(r.sources.map(s => s.host));
    if ([...hosts].some(h => /wiki/i.test(h))) fail(`${r.id}: a wiki host is cited`);
    const full = new Set(r.sources.filter(s => s.xi === true).map(s => s.host));
    if (full.size < 2) fail(`${r.id}: ${full.size} host(s) vouch for the eleven (${[...hosts].join(', ')})`);
    if (r.verdict === 'held') {
      held += 1;
      if (!r.hold || !r.hold.why || !r.hold.rule) fail(`${r.id}: held without a recorded reason`);
      /* A held row is not checked against the hosts (they contradict it), so
         its eleven is pinned as it stands: nothing changes it until the
         rebuild the row proposes. */
      const pinned = (r.hold && r.hold.entryEleven) || [];
      if (pinned.length !== 11 || lu.slots.map(s => s.name).join('|') !== pinned.join('|')) fail(`${r.id}: the held eleven drifted from hold.entryEleven`);
    } else {
      // 6c: the eleven on the pitch is the eleven both hosts publish
      if (r.eleven.length !== 11) fail(`${r.id}: ledger eleven has ${r.eleven.length} names`);
      const used = new Set();
      for (const s of lu.slots) {
        const hit = r.eleven.filter(p => sameMan(s.name, p, r.aka));
        if (hit.length !== 1) { fail(`${r.id}: starter "${s.name}" is ${hit.length ? 'ambiguous' : 'not'} in the two host eleven`); continue; }
        if (used.has(hit[0])) fail(`${r.id}: "${hit[0]}" is matched twice`);
        used.add(hit[0]);
      }
      // 6d: every blank answer started on both hosts
      for (const c of lu.blankCandidates) if (!r.eleven.some(p => sameMan(c.name, p, r.aka))) fail(`${r.id}: blank "${c.name}" did not start on the two hosts`);
      xiChecked += 1;
    }
    // 6e: every applied change is in the file
    for (const a of r.applied) {
      if (a.path === 'source' || a.path === 'comment') continue;
      applied += 1;
      let m;
      if (FIELDS.includes(a.path)) { if (lu[a.path] !== a.to) fail(`${r.id}: ${a.path} is "${lu[a.path]}", the ledger applied "${a.to}"`); }
      else if ((m = a.path.match(/^slots\[(\d+)\]\.(name|position|side)$/))) {
        const s = lu.slots[Number(m[1])]; const v = m[2] === 'side' ? side(s.x) : s[m[2]];
        if (v !== a.to) fail(`${r.id}: ${a.path} is "${v}", the ledger applied "${a.to}"`);
      } else if ((m = a.path.match(/^blankCandidates\[(.+)\](?:\.(\w+))?$/))) {
        const c = lu.blankCandidates.find(x => x.name === m[1]);
        if (!m[2]) {
          if (a.to === null && c) fail(`${r.id}: ${m[1]} is still a blank; the ledger dropped him`);
          if (a.to !== null && (!c || c.slotIndex !== a.to.slotIndex || c.nationality !== a.to.nationality || c.clubAtTime !== a.to.clubAtTime)) fail(`${r.id}: blank ${m[1]} differs from the ledger`);
        } else if (!c) fail(`${r.id}: blank ${m[1]} is missing`);
        else if ((c[m[2]] ?? null) !== a.to) fail(`${r.id}: ${a.path} is "${c[m[2]]}", the ledger applied "${a.to}"`);
      } else fail(`${r.id}: applied path "${a.path}" is not one this check knows`);
    }
    // 6f: the entry equals the ledger on every field and hint it records
    for (const k of Object.keys(r.fields)) if (lu[k] !== r.fields[k]) fail(`${r.id}: ${k} is "${lu[k]}", the ledger has "${r.fields[k]}"`);
    /* every field this round's ledger records must be one the entry carries:
       dateLabel and competition are pinned on all 207 rows, not only where applied */
    for (const k of ['dateLabel', 'competition', 'formationLabel']) if (!(k in r.fields)) fail(`${r.id}: the ledger does not pin ${k}`);
    const hints = lu.blankCandidates.map(c => `${c.name}|${lu.slots[c.slotIndex].position}|${c.nationality}|${c.clubAtTime}|${c.fact ?? ''}`).sort().join(' ; ');
    const want = r.hints.map(h => `${h.name}|${h.position}|${h.nationality}|${h.clubAtTime}|${h.fact ?? ''}`).sort().join(' ; ');
    if (hints !== want) fail(`${r.id}: blank hints drifted from the ledger.\n    ledger: ${want}\n    file:   ${hints}`);
  }
  console.log(`   ${rows.length} ledger rows: ${xiChecked} elevens matched, ${applied} applied changes in place, ${held} held under rule 6`);
}
const ledgerFailures = failures - ledgerFailuresBefore;

console.log('7) A held lineup is never dealt, and skipping it moves no other day');
const heldFailuresBefore = failures;
{
  /* Round 1026 review fix. The two held rows describe matches two hosts
     contradict, so no player may be dealt one, yet removing them from
     LINEUPS would re-deal most future days (the daily indexes the array).
     7a the code's list equals the ledger's held rows; 7b over 1500 days the
     daily never deals one, and every day whose pick differs from the
     unskipped pick is a day that landed on a held lineup; 7c Unlimited never
     draws one in 4000 draws.

     Since the lead's decision of 2026-10-06 rebuilt both held rows in place,
     no row is held and the code's list is empty, so 7b also proves the daily
     deals exactly the unskipped pick on every day (no day moves), which is
     the rotation main had before any hold. The checks read the ledger's held
     set, not the code's list, so a row held in the ledger and forgotten in
     the code is caught. Control SIM_MISSINGXI_CONTROL=heldlive marks the
     rebuilt Inter 2010 row held in the ledger (in memory) while the code
     list stays empty: 7a, 7b and 7c must FAIL. */
  const dir = path.join(ROOT, 'scripts', 'data', 'missingXiVerified2026-10');
  const ledgerRows = fs.readdirSync(dir).filter(f => /^shard-\d+\.json$/.test(f))
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).lineups);
  const heldRows = ledgerRows.filter(r => r.verdict === 'held').map(r => r.id);
  if (CONTROL === 'heldlive') {
    const row = ledgerRows.find(r => r.id === 'seriea-2010-inter-title');
    if (!row || row.verdict === 'held' || HELD_LINEUP_IDS.has(row.id)) { console.error('control cannot run: seriea-2010-inter-title is missing or already held'); process.exit(1); }
    heldRows.push(row.id);
  }
  heldRows.sort();
  const codeHeld = [...HELD_LINEUP_IDS].sort();
  if (heldRows.join('|') !== codeHeld.join('|')) fail(`HELD_LINEUP_IDS (${codeHeld.join(', ')}) differs from the ledger's held rows (${heldRows.join(', ')})`);
  const saved = [...HELD_LINEUP_IDS];
  const RealDate = Date;
  const START = RealDate.UTC(2026, 9, 6, 16, 0, 0);
  let now = START;
  globalThis.Date = class extends RealDate {
    constructor(...args) { if (args.length === 0) super(now); else super(...args); }
    static now() { return now; }
  };
  const days = 1500;
  const run = () => { const out = []; for (let d = 0; d < days; d += 1) { now = START + d * 86_400_000; const p = pickDailyPuzzle(); out.push(`${p.lineup.id}#${p.candidate.name}`); } return out; };
  const live = run();
  HELD_LINEUP_IDS.clear();
  const raw = run();
  for (const id of saved) HELD_LINEUP_IDS.add(id);
  globalThis.Date = RealDate;
  let landed = 0, moved = 0;
  raw.forEach((r, d) => {
    const id = r.split('#')[0];
    if (heldRows.includes(id)) landed += 1;
    if (r !== live[d]) { moved += 1; if (!saved.includes(id)) fail(`day ${d}: the skip moved a day that did not land on a held lineup`); }
  });
  const dealtHeld = live.filter(x => heldRows.includes(x.split('#')[0])).length;
  if (dealtHeld) fail(`the daily deals a held lineup on ${dealtHeld} of ${days} days`);
  if (heldRows.length && landed === 0) fail(`no day in ${days} lands on a held lineup, so 7b has nothing to hold`);
  let drawn = 0;
  for (let i = 0; i < 4000; i += 1) if (heldRows.includes(pickUnlimitedPuzzle().lineup.id)) drawn += 1;
  if (drawn) fail(`Unlimited drew a held lineup ${drawn} times in 4000`);
  console.log(`   ${heldRows.length} held in the ledger, ${saved.length} in the code; over ${days} days ${landed} landed on a held lineup, ${moved} days moved in all; Unlimited drew a held lineup ${drawn} times in 4000`);
}
const heldFailures = failures - heldFailuresBefore;

if (CONTROL) {
  if (['subswap', 'revert', 'onehost', 'fact', 'heldxi', 'rebuilt', 'datelabel'].includes(CONTROL) && ledgerFailures === 0) {
    console.error(`\ncontrol "${CONTROL}": section 6 did not fire, the check is dead`);
    process.exit(1);
  }
  if (CONTROL === 'heldlive' && heldFailures === 0) {
    console.error(`\ncontrol "${CONTROL}": section 7 did not fire, the check is dead`);
    process.exit(1);
  }
  if (failures > 0) {
    console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`);
    process.exit(0);
  }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimMissingXi: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimMissingXi: all green');
