/* Every other dugout has a manager, the summer turns them over, and no name
   is ever a real person's.

   Round 308, owner tweaks item 11 arc two ("different managers on different
   teams"). The rules this harness pins:

   1. a fresh career names every dugout in the league except yours, all
      distinct, all generated: not one of them may collide with any name in
      the full modern bake or the trivia pool, because an invented career
      under a real name is the simNoInventedQuotes exposure;
   2. the record is deterministic (two identical careers agree on every
      name) and the ensure is idempotent (a second call changes nothing);
   3. the merry-go-round turns chairs over at a believable rate, measured
      across many summers, and every sack headline tells the truth: the
      name it prints was that club's manager the season before;
   4. changing clubs writes its own truths: your new club's entry is gone
      (the chair is yours), your old club gets a new appointment;
   5. a save from before the feature grows a full record on load repair and
      never an entry for its own club.

   Round 1606, real dugouts (decision A: a real manager's name is a dated
   fact in a display slot and nothing else). Proven with a SENTINEL, a made
   up name registered as real ("Testa Realmann", checked absent from every
   roster and generator), injected into a bundled copy of the engine in a
   temp folder (scripts/lib/cmDugoutSentinel.mjs), never a hook in shipped
   code, beside a twin bundled with an EMPTY table:
   7a. the sentinel holds every covered chair on day one, only in a season
       one start at the table's year (a later world, a season two repair
       and a job move made in a later season seat nobody real);
   7b. over 200 summers with the sentinel's chair emptied (five eras), no
       string the engine produces outside the dugout record and the vacancy
       list contains it, he is never recycled into another chair, and each
       summer has as many chair lines as the empty table's twin;
   7c. stripped of the record, the vacancy names, the chair lines' words and
       the offer prefix, every state equals the twin's, draw for draw;
   7d. never your club, a club you managed, a Hot Seat club or a mid season
       predecessor;
   7e. an old save fixture loads with its managers record byte identical.
   7f. 20 whole seasons with the sentinel seated (4 per era), read the way
       simNoInventedQuotes pass 1 reads them (every match result, the feed,
       the inbox and the desk after each entry, then the season end and the
       summer): nothing outside the record says him, and each season is its
       empty table twin's draw for draw. Measured: 823 entries, 44 matches
       against his club, 1849 distinct lines; floors a third below (29 and
       1200).
   7g. in every league, the summer you take the sentinel's own job (a move
       into his chair, the call an accepted offer makes) reads "You take
       over at {club}." and nothing names him, then or after.
   7h. the offer from his emptied chair, built in every league with a club
       a tier below his (a title season there, his club bottom), says only
       that the club is making a change, and accepting it names nobody.
       Floor 10 offers (7b alone meets one in 200 summers).
   8.  with SIM_MANAGERS_BASE=<commit>, a fleet (12 seeds by 5 eras by 3
       seasons, mid season starts, Hot Seat runs) saves the same bytes as
       that commit's engine (after the 7c strip once the table has rows).
       NOT RUN without the variable, and the run says so.

   Negative controls (SIM_MANAGERS_CONTROL=<name>; a control that fires
   exits 0 with a last line saying FIRED, one that does not exits 1, one
   that cannot run exits 2):
     sever      cuts the ensure call out of startCareer, section 1 fails.
     namedsack  the old sack line for a real holder, 7b must name the sentinel.
     recycle    a real name recycled into another chair, 7b must go red.
     takeover   the takeover line names the real man you replace, 7g must
                name the sentinel.
     liveevent  every match writes the other manager into a live event, 7f
                must name the sentinel.
     offer      the offer blurb names the real man on his way out, 7h must
                name the sentinel.

   Run: node scripts/simManagers.mjs
*/
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SENTINEL, SENTINEL_MONTH, ERAS, seeded, hashSeed, bundleEngine, baseTree, strip, spoken, chairLines, sentinelPlan, firstDiff } from './lib/cmDugoutSentinel.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL_NAME = process.env.SIM_MANAGERS_CONTROL || '';
/* Round 1606: the sentinel controls, each judged on its own section's failures. */
const SENTINEL_CONTROLS = { namedsack: '7b', recycle: '7b', takeover: '7g', liveevent: '7f', offer: '7h' };
if (CONTROL_NAME && CONTROL_NAME !== 'sever' && !SENTINEL_CONTROLS[CONTROL_NAME]) {
  console.error(`SIM_MANAGERS_CONTROL=${CONTROL_NAME} is not a control this harness knows (sever, ${Object.keys(SENTINEL_CONTROLS).join(', ')})`);
  process.exit(2);
}
const CONTROL = CONTROL_NAME === 'sever';
/* Round 1606: the sentinel controls run section 7 alone and are judged on their own section's failures only. */
const MODE = SENTINEL_CONTROLS[CONTROL_NAME] ? CONTROL_NAME : '';
const refuse = why => { console.error(`control or setup cannot run: ${why}; refusing a dead check`); process.exit(2); };

const ENTRY = path.join(os.tmpdir(), 'managers.entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'managers.bundle.mjs');
let cmPath = `${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts`;
if (CONTROL) {
  // A Windows checkout writes the engine with CRLF, and a needle spelt with
  // bare newlines never matched it, so the control refused to run on every
  // desktop build. Normalise first, as the harness rules say.
  const src = fs.readFileSync(cmPath, 'utf8').replace(/\r\n/g, '\n');
  /* Round 1606: the startCareer call passes the world's own offset now, so the needle is that call. */
  const needle = '  ensureManagers(state, startYearsOn);\n  state.wageCap';
  if (src.split(needle).length !== 2) { console.error('control run: the startCareer ensure call to sever is not in the source exactly once, refusing a dead control'); process.exit(2); }
  cmPath = path.join(os.tmpdir(), 'clubManager.severed.ts').replaceAll('\\', '/');
  fs.writeFileSync(cmPath, src.replace(needle, '  state.wageCap'));
}
fs.writeFileSync(ENTRY, `
export * as cm from '${cmPath}';
export { CM_ROSTERS } from '${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts';
export { players as POOL } from '${ROOT.replaceAll('\\', '/')}/src/data/players.ts';
export { CM_DUGOUTS } from '${ROOT.replaceAll('\\', '/')}/src/data/clubManagerDugouts.ts';
export * as rd from '${ROOT.replaceAll('\\', '/')}/src/lib/realDugouts.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm, CM_ROSTERS, POOL, CM_DUGOUTS, rd } = await import(pathToFileURL(BUNDLE).href);

const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const realNames = new Set();
for (const roster of Object.values(CM_ROSTERS)) for (const p of roster) realNames.add(fold(p.n));
for (const p of POOL) realNames.add(fold(p.name));
/* Round 1606: and every real manager in the dugout table, so no generated name can be one of them either. */
for (const n of rd.realDugoutNames(CM_DUGOUTS)) realNames.add(fold(n));

/* Round 1606: the sentinel controls run section 7 alone and are judged on their own section. recycle only needs a
   failure (the recycled man is in a chair, not a line); every other control must make its section NAME him. */
if (MODE) {
  const sec = SENTINEL_CONTROLS[MODE];
  const { fails, named } = (await realDugoutsSection()).bySection[sec];
  if (fails > 0 && (MODE === 'recycle' || named > 0)) {
    console.log(`\ncontrol run: ${MODE} FIRED, ${sec} went red ${fails} time(s), ${named} naming the sentinel`);
    process.exit(0);
  }
  console.error(`\ncontrol run: ${MODE} changed NOTHING in ${sec} (${fails} failures, ${named} naming the sentinel), the check is dead`);
  process.exit(1);
}

console.log('1) a fresh career names every dugout but yours, no real person among them');
{
  const c = cm.startCareer('Arsenal');
  const m = c.managers ?? {};
  const entries = Object.entries(m);
  const expected = c.leagueClubs.length - 1;
  if (entries.length !== expected) fail(`${entries.length} dugouts named, expected ${expected}`);
  if (m['Arsenal']) fail('your own club has an AI manager, the chair is supposed to be yours');
  const names = entries.map(([, v]) => v.name);
  if (new Set(names).size !== names.length) fail('two clubs share a manager name');
  /* Round 1606: a chair marked real holds the table's sourced man on purpose; every OTHER name is generated
     and must still never be a real person's. */
  let realChairs = 0;
  for (const [club, v] of entries) {
    if (v.real === 1) {
      realChairs += 1;
      if (rd.realDugoutFor(CM_DUGOUTS, c.eraId ?? 'now', club)?.name !== v.name) fail(`${club}'s chair is marked real but "${v.name}" is not the table's man for it`);
      continue;
    }
    if (realNames.has(fold(v.name))) fail(`generated manager "${v.name}" is a real person's name`);
  }
  console.log(`   ${entries.length} dugouts named, all distinct, ${realChairs} from the real table, no generated one real, yours empty`);
}

console.log('2) deterministic and idempotent');
{
  const a = cm.startCareer('Liverpool');
  const b = cm.startCareer('Liverpool');
  if (JSON.stringify(a.managers) !== JSON.stringify(b.managers)) fail('two identical careers disagree on the dugouts');
  const before = JSON.stringify(a.managers);
  cm.ensureManagers(a);
  cm.ensureManagers(a);
  if (JSON.stringify(a.managers) !== before) fail('a second ensure changed the record, the repair is not idempotent');
  console.log('   same career twice, same names; double ensure, no change');
}

console.log('3) the summer turns chairs over honestly');
{
  let c = cm.startCareer('Chelsea');
  let changes = 0, chairs = 0, badLines = 0, checkedLines = 0;
  for (let s = 0; s < 10; s++) {
    const prev = c;
    c = cm.startNextSeason(c);
    const before = prev.managers ?? {};
    const after = c.managers ?? {};
    for (const club of Object.keys(after)) {
      if (before[club] && before[club].name !== after[club].name) changes += 1;
      chairs += 1;
    }
    for (const line of c.aiHeadlines) {
      if (!line.includes('sack')) continue;
      checkedLines += 1;
      const truth = Object.keys(before).some(club => line.includes(club) && line.includes(before[club].name));
      if (!truth) { badLines += 1; fail(`a sack headline names nobody the record ever held: "${line}"`); }
    }
    const missing = c.leagueClubs.filter(x => x !== c.clubName && !after[x]);
    if (missing.length) fail(`season ${s + 2}: ${missing.length} dugouts empty after the rollover`);
    if (after[c.clubName]) fail(`season ${s + 2}: your own club grew an AI manager`);
  }
  const rate = changes / chairs;
  console.log(`   ${changes} changes across ${chairs} chair seasons (${(rate * 100).toFixed(1)}% churn), ${checkedLines} sack lines checked, ${badLines} untrue`);
  if (rate < 0.03) fail(`churn ${(rate * 100).toFixed(1)}% is a job for life, the merry-go-round is dead`);
  if (rate > 0.45) fail(`churn ${(rate * 100).toFixed(1)}% is a revolving door beyond any real league`);
}

console.log('4) moving clubs writes its own truths');
{
  let c = cm.startCareer('Everton');
  const target = 'Aston Villa';
  const hadName = c.managers?.[target]?.name;
  const moved = cm.startNextSeason(c, target);
  if (moved.clubName !== target) fail(`the move to ${target} did not happen, the section is not testing anything`);
  else {
    if (moved.managers?.[target]) fail('your new club still has an AI manager after you took the chair');
    if (!moved.managers?.['Everton']) fail('the club you left has nobody in the dugout');
    if (hadName && !moved.aiHeadlines.some(l => l.includes(hadName))) {
      /* The takeover line can be pushed out by a busy summer; the record is
         the contract, the line is a bonus, so this is a note not a failure. */
      console.log(`   note: the takeover line for ${hadName} did not survive the 8 item feed cap this run`);
    }
    console.log(`   moved to ${target}: their chair cleared, Everton appointed ${moved.managers?.['Everton']?.name}`);
  }
}

console.log('5) an old save grows a record on load, never for its own club');
{
  const c = cm.startCareer('Newcastle');
  const old = JSON.parse(JSON.stringify(c));
  delete old.managers;
  cm.ensureManagers(old);
  const m = old.managers ?? {};
  if (Object.keys(m).length !== old.leagueClubs.length - 1) fail('the load repair did not fill the dugouts');
  if (m['Newcastle']) fail('the load repair gave your own club a manager');
  console.log('   repaired in one call, own chair left alone');
}

console.log('6) offers and the merry-go-round agree on one vacancy list');
{
  /* Round 309. Drive many season ends with the offer gate forced open (a
     trophy) and check the contract: every vacancy offer names the outgoing
     manager truthfully, and every decided vacancy the player declines is
     filled by a NEW name at the rollover. */
  let offersSeen = 0, vacancyOffers = 0, blurbLies = 0, refills = 0, staleRefills = 0;
  for (let i = 0; i < 30; i++) {
    let c = cm.startCareer('Brighton');
    c.trophies.push({ name: 'League Title', emoji: '\u{1F3C6}', season: c.season });
    const { state: fin } = cm.finishSeason(c);
    if (!Array.isArray(fin.pendingVacancies)) { fail('finishSeason wrote no vacancy list'); break; }
    const byClub = new Map(fin.pendingVacancies.map(v => [v.club, v.name]));
    for (const o of fin.pendingSummary?.offers ?? []) {
      offersSeen += 1;
      if (byClub.has(o.club)) {
        vacancyOffers += 1;
        /* Round 1606: a real outgoing man is never named; the blurb says the club is making a change. */
        if (fin.managers?.[o.club]?.real === 1) {
          if (o.blurb.includes(byClub.get(o.club)) || !o.blurb.includes('making a change in the dugout')) { blurbLies += 1; fail(`vacancy offer for ${o.club} narrates a real manager's exit: "${o.blurb}"`); }
        } else if (!o.blurb.includes(byClub.get(o.club))) { blurbLies += 1; fail(`vacancy offer for ${o.club} does not name ${byClub.get(o.club)}: "${o.blurb}"`); }
      }
    }
    const next = cm.startNextSeason(fin);
    for (const v of fin.pendingVacancies) {
      if (v.club === next.clubName) continue;
      /* Round 310: promotion and relegation can carry a vacancy's club out
         of the division over the same summer, and the record only ever
         tracks the CURRENT league's dugouts, so a chair that left is no
         longer this record's to fill. */
      if (!next.leagueClubs.includes(v.club)) continue;
      refills += 1;
      const now = next.managers?.[v.club];
      if (!now) { staleRefills += 1; fail(`declined vacancy at ${v.club} left an empty chair`); }
      else if (now.name === v.name) { staleRefills += 1; fail(`declined vacancy at ${v.club} kept ${v.name}, the sacking never happened`); }
    }
    if (next.pendingVacancies !== undefined) fail('the rollover did not clear the consumed vacancy list');
  }
  console.log(`   ${offersSeen} offers over 30 summers, ${vacancyOffers} from real vacancies (${blurbLies} untrue blurbs), ${refills} declined chairs refilled (${staleRefills} stale)`);
  if (vacancyOffers === 0) fail('30 trophy summers produced zero vacancy offers, the queue jump is dead');
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) FIRED as expected`); process.exit(0); }
  console.error('\ncontrol run: severing the ensure changed NOTHING, the checks are dead');
  process.exit(1);
}
await realDugoutsSection();
await fleetSection();
console.log('   teeth: real names from the live bakes, truth checked headlines, churn measured not asserted per run');
if (failures > 0) { console.error(`\nsimManagers: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimManagers: all green');

/* ---------- 7. Round 1606: the real dugouts, proven with a sentinel ---------- */
async function realDugoutsSection() {
  console.log('7) real dugouts: a sentinel registered as real is a display fact and nothing else');
  /* Each sentinel section counts its own failures, and how many of them name him, so a control is judged on its own. */
  const bySection = {};
  const failer = sec => {
    bySection[sec] = { fails: 0, named: 0 };
    return m => { bySection[sec].fails += 1; if (m.includes(SENTINEL)) bySection[sec].named += 1; fail(`${sec}: ${m}`); };
  };
  const failB = failer('7b');
  const failG = failer('7g');
  const failF = failer('7f');
  const failH = failer('7h');
  /* Everything a state says outside the record and the vacancy list, in one pass (spoken() copies the state first). */
  const said = state => JSON.stringify({ ...state, managers: undefined, pendingVacancies: undefined });
  /* The sentinel must be nobody: no shipped file under src (every roster, bake, pool and generator bank) carries
     it. Tests are not shipped, and src/test/clubDetailDugout.test.tsx swaps in this same sentinel on purpose. */
  const carriers = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'test') walk(p); }
      else if (/\.(ts|tsx|json)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && fs.readFileSync(p, 'utf8').includes(SENTINEL.split(' ')[1])) carriers.push(p);
    }
  })(path.join(ROOT, 'src'));
  if (carriers.length) refuse(`the sentinel surname is in ${carriers.length} src file(s) (${carriers[0]}), it is not nobody`);
  if (realNames.has(fold(SENTINEL))) refuse('the sentinel is a real name in the bakes or the pool');

  const plan = await sentinelPlan(cm);
  const edit = MODE === 'namedsack' ? { from: 'const holderReal = realOut.has(s.name);', to: 'const holderReal = false;' }
    : MODE === 'recycle' ? { from: 'if (recycled && !realOut.has(recycled)) {', to: 'if (recycled) {' }
    : MODE === 'takeover' ? { from: 'const displacedReal = isRealChair(record[state.clubName]);', to: 'const displacedReal = false;' }
    : MODE === 'offer' ? { from: 'const outReal = !!out && (', to: 'const outReal = false && (' }
    /* A round that writes the other manager into a live event: one line per match naming whoever is in their chair. */
    : MODE === 'liveevent' ? { from: '  let trophyWon: string | null = null;', to: '  let trophyWon: string | null = null; { const oppMgr = state.managers?.[fx.opponent]?.name; if (oppMgr) events.push(`The other bench, ${oppMgr}, never sat down.`); }' }
    : null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'managers-1606-'));
  const nodeModules = path.join(ROOT, 'node_modules');
  const srcDir = path.join(ROOT, 'src');
  const S = await bundleEngine({ srcDir, tmp, name: 'sentinel', table: plan.table, partial: plan.partial, edit, nodeModules, refuse });
  const Z = await bundleEngine({ srcDir, tmp, name: 'empty', table: {}, partial: {}, nodeModules, refuse });
  for (const era of ERAS) { await S.cm.ensureEraRosters(era); await Z.cm.ensureEraRosters(era); }
  const leagues = plan.leagues;
  const byEra = era => leagues.filter(l => l.era === era);
  console.log(`   sentinel "${SENTINEL}" is in no src file; ${leagues.length} leagues across ${ERAS.length} eras hold it`);

  /* 7b and 7c. Summers with the sentinel's chair emptied: the vacancy list finishSeason decided gets the
     sentinel's chair and one more (so the recycle draw has a real name to pick), in both twins alike. */
  const PER_ERA = 40;
  let summers = 0, emptied = 0, natural = 0, offersChecked = 0, recycleChances = 0, sameStrip = 0, realOffers = 0;
  const t0 = Date.now();
  for (const era of ERAS) {
    const pool = byEra(era);
    for (let k = 0; k < PER_ERA; k++) {
      const L = pool[k % pool.length];
      const seed = hashSeed(`7b|${era}|${k}`);
      const run = E => {
        const a = seeded(seed, () => E.cm.startCareer(L.career, era));
        const c = a.value;
        if (k % 2 === 0) c.trophies.push({ name: 'League Title', emoji: '\u{1F3C6}', season: c.season });
        const f = seeded(seed + 1, () => E.cm.finishSeason(c));
        const fin = f.value.state;
        const wasDecided = (fin.pendingVacancies ?? []).some(v => v.club === L.sentinel);
        const offers = JSON.parse(JSON.stringify(fin.pendingSummary?.offers ?? []));
        const finStrip = strip(fin);
        const vac = [...(fin.pendingVacancies ?? [])];
        for (const [club, pos] of [[L.sentinel, fin.leagueClubs.length], [L.second, fin.leagueClubs.length - 1]]) {
          if (club !== fin.clubName && fin.managers?.[club] && !vac.some(v => v.club === club)) vac.push({ club, name: fin.managers[club].name, pos });
        }
        fin.pendingVacancies = vac;
        const n = seeded(seed + 2, () => E.cm.startNextSeason(fin));
        return { start: c, fin, finStrip, offers, next: n.value, wasDecided, draws: [a.draws, f.draws, n.draws] };
      };
      const s = run(S), z = run(Z);
      summers += 1;
      if (s.wasDecided) natural += 1;
      if (s.start.managers?.[L.sentinel]?.name !== SENTINEL) { fail(`7b: ${era} ${L.id} seed ${k}: the sentinel was not in his chair to be emptied`); continue; }
      emptied += 1;
      if ((s.fin.pendingVacancies ?? []).length >= 2) recycleChances += 1;
      for (const o of s.offers) {
        offersChecked += 1;
        if (JSON.stringify(o).includes(SENTINEL)) failB(`${era} ${L.id} seed ${k}: an offer names ${SENTINEL}: "${o.blurb}"`);
        if (o.club === L.sentinel && s.wasDecided) {
          realOffers += 1;
          if (!o.blurb.includes('making a change in the dugout')) fail(`7b: ${era} ${L.id} seed ${k}: the offer for the emptied real chair does not say only that the club is making a change: "${o.blurb}"`);
        }
      }
      for (const [label, state] of [['the season end', s.fin], ['the new season', s.next]]) {
        const said = spoken(state);
        if (said.includes(SENTINEL)) {
          const line = (state.aiHeadlines ?? []).find(h => h.includes(SENTINEL)) ?? said.slice(Math.max(0, said.indexOf(SENTINEL) - 80), said.indexOf(SENTINEL) + 40);
          failB(`${era} ${L.id} seed ${k}: ${label} says ${SENTINEL} outside the record: "${line}"`);
        }
      }
      const kept = Object.entries(s.next.managers ?? {}).filter(([, v]) => v.name === SENTINEL || v.real === 1);
      if (kept.length) failB(`${era} ${L.id} seed ${k}: after his chair was emptied ${SENTINEL} still sits at ${kept.map(([club]) => club).join(', ')}`);
      if (chairLines(s.next) !== chairLines(z.next)) failB(`${era} ${L.id} seed ${k}: ${chairLines(s.next)} chair lines against the empty table's ${chairLines(z.next)}`);
      /* 7c: the random stream and everything outside the strip are untouched. */
      const same = s.draws.join() === z.draws.join()
        && JSON.stringify(strip(s.start)) === JSON.stringify(strip(z.start))
        && JSON.stringify(s.finStrip) === JSON.stringify(z.finStrip)
        && JSON.stringify(strip(s.next)) === JSON.stringify(strip(z.next));
      if (same) sameStrip += 1;
      else {
        const where = firstDiff(strip(s.start), strip(z.start)) ?? firstDiff(s.finStrip, z.finStrip) ?? firstDiff(strip(s.next), strip(z.next)) ?? 'the draws';
        fail(`7c: ${era} ${L.id} seed ${k}: the sentinel twin differs from the empty table's outside the strip (draws ${s.draws.join('/')} vs ${z.draws.join('/')}), first at ${where}`);
      }
    }
  }
  console.log(`   7b: ${summers} summers, ${emptied} with the sentinel's chair emptied (${natural} by the sim's own draw), ${recycleChances} with a second chair to recycle into, ${offersChecked} offers read (${realOffers} for the emptied real chair, all saying only that the club is making a change), ${bySection['7b'].fails} failures (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  console.log(`   7c: ${sameStrip} of ${summers} sentinel careers equal their empty table twin after the strip, draw for draw`);
  if (emptied < 200) fail(`7b: only ${emptied} summers emptied the sentinel's chair (floor 200)`);
  if (!MODE || MODE === 'liveevent') playedSeasons();
  /* 7a runs after 7b and 7c on purpose: the engine numbers its youth ids with a counter, so the two twins must have run the same calls before they are compared. */
  /* 7a. day one, and only day one of the table's own year */
  let held = 0, partialSeen = 0;
  for (const L of leagues) {
    const c = seeded(hashSeed(`7a|${L.era}|${L.id}`), () => S.cm.startCareer(L.career, L.era)).value;
    if (!c.leagueClubs.includes(L.sentinel)) { fail(`7a: ${L.era} ${L.id}: the career at ${L.career} has no ${L.sentinel} in its league`); continue; }
    const e = c.managers?.[L.sentinel];
    if (!e || e.name !== SENTINEL || e.real !== 1 || e.appointed !== SENTINEL_MONTH) fail(`7a: ${L.era} ${L.id}: ${L.sentinel}'s chair on day one is ${JSON.stringify(e)}`);
    else held += 1;
    const twice = Object.entries(c.managers ?? {}).filter(([club, v]) => club !== L.sentinel && (v.name === SENTINEL || v.real === 1));
    if (twice.length) fail(`7a: ${L.era} ${L.id}: ${twice.length} other chair(s) hold a real man`);
    const view = S.cm.dugoutOf(c, L.sentinel);
    if (!view || view.real !== 1 || view.name !== SENTINEL || view.appointed !== SENTINEL_MONTH) fail(`7a: ${L.era} ${L.id}: the display slot shows ${JSON.stringify(view)}`);
    const pv = S.cm.dugoutOf(c, L.partial);
    if (!pv || pv.real || pv.partial !== true || pv.name === SENTINEL) fail(`7a: ${L.era} ${L.id}: the partial chair ${L.partial} shows ${JSON.stringify(pv)}`);
    else partialSeen += 1;
    if (spoken(c).includes(SENTINEL)) fail(`7a: ${L.era} ${L.id}: a day one string outside the record names the sentinel`);
  }
  console.log(`   7a: ${held} of ${leagues.length} sentinel chairs held on day one, ${partialSeen} partial chairs made up and marked`);
  if (held !== leagues.length) fail(`7a: only ${held} of ${leagues.length} sentinel chairs were held`);
  {
    const L = byEra('now').find(l => l.id === 'premier') ?? byEra('now')[0];
    const later = seeded(11, () => S.cm.startCareer(L.career, 'now', undefined, undefined, { yearsOn: 2, uclField: null, keepLeagueOverrides: false })).value;
    if (JSON.stringify(later.managers ?? {}).includes(SENTINEL)) fail('7a: a fresh save for a job taken two years on seated the sentinel');
    const c = seeded(12, () => S.cm.startCareer(L.career, 'now')).value;
    const two = seeded(13, () => S.cm.startNextSeason(c)).value;
    /* The partial mark blames a sourcing gap, so it belongs only to the made up man in the opening day chair the
       table describes: he keeps it in season two, a man the summer appointed there never wears it, and neither does
       anyone in a world started two years on or after a season two repair. */
    let partialRead = 0;
    const carried = two.managers?.[L.partial];
    if (carried) {
      partialRead += 1;
      const pv2 = S.cm.dugoutOf(two, L.partial);
      if (carried.since === 1 && pv2?.partial !== true) fail(`7a: the opening day's made up man at ${L.partial} lost the partial mark in season two (${JSON.stringify(pv2)})`);
      if (carried.since !== 1 && pv2?.partial) fail(`7a: a man the summer appointed at ${L.partial} wears the partial mark (${JSON.stringify(pv2)})`);
    }
    if (later.leagueClubs.includes(L.partial)) {
      partialRead += 1;
      if (S.cm.dugoutOf(later, L.partial)?.partial) fail(`7a: in a world started two years on, ${L.partial}'s made up man wears the partial mark`);
    }
    delete two.managers;
    S.cm.ensureManagers(two);
    if (JSON.stringify(two.managers ?? {}).includes(SENTINEL)) fail('7a: a season two load repair seated the sentinel');
    if (two.managers?.[L.partial]) {
      partialRead += 1;
      if (S.cm.dugoutOf(two, L.partial)?.partial) fail(`7a: after a season two repair, ${L.partial}'s new made up man wears the partial mark`);
    }
    if (partialRead < 3) fail(`7a: only ${partialRead} of 3 partial mark reads ran, the check tests too little`);
    /* An outside club: another league's sentinel club that the summer did not bring into this league (a club
       promoted into it gets a made up name from season two, which is right and is not this check). */
    const outside = byEra('now').find(l => l.id !== L.id && !two.leagueClubs.includes(l.sentinel) && !c.leagueClubs.includes(l.sentinel))?.sentinel ?? '';
    if (!outside) fail('7a: no outside club to read, the check tests nothing');
    const cupView = S.cm.dugoutOf(two, outside);
    if (cupView) fail(`7a: a club outside the league shows ${JSON.stringify(cupView)} in season two`);
    const cupOne = S.cm.dugoutOf(c, outside);
    if (!cupOne || cupOne.name !== SENTINEL) fail(`7a: a club outside the league does not show its opening day man in season one (${JSON.stringify(cupOne)})`);
    console.log('   7a: a later world and a season two repair seat nobody real; an outside club shows him in season one only');
  }
  /* 7g. Taking his job. In every league the summer moves you into the sentinel's chair, the call an accepted offer
     makes (useClubManager passes the club to startNextSeason). The vacancy list stays as finishSeason drew it, so
     the move comes from a chair the axe also picked as often as the sim picks it, and from one it did not. The
     takeover line can be cut when the summer has four chair lines before it, so it is counted, and floored. */
  {
    let moves = 0, lines = 0;
    for (const L of leagues) {
      const seed = hashSeed(`7g|${L.era}|${L.id}`);
      const c = seeded(seed, () => S.cm.startCareer(L.career, L.era)).value;
      if (c.managers?.[L.sentinel]?.name !== SENTINEL) { fail(`7g: ${L.era} ${L.id}: the sentinel was not in his chair to be taken`); continue; }
      const fin = seeded(seed + 1, () => S.cm.finishSeason(c).state).value;
      const next = seeded(seed + 2, () => S.cm.startNextSeason(fin, L.sentinel)).value;
      if (next.clubName !== L.sentinel) { fail(`7g: ${L.era} ${L.id}: the move into ${L.sentinel} did not happen, the check tests nothing`); continue; }
      moves += 1;
      const took = (next.aiHeadlines ?? []).filter(h => typeof h === 'string' && h.startsWith(`\u{1F91D} You take over at ${L.sentinel}`));
      if (took.length) {
        lines += 1;
        for (const h of took) if (h !== `\u{1F91D} You take over at ${L.sentinel}.`) failG(`${L.era} ${L.id}: the takeover line is "${h}"`);
      }
      const text = said(next);
      if (text.includes(SENTINEL)) failG(`${L.era} ${L.id}: the summer you took his job says ${SENTINEL}: "${text.slice(Math.max(0, text.indexOf(SENTINEL) - 80), text.indexOf(SENTINEL) + 40)}"`);
      const kept = Object.entries(next.managers ?? {}).filter(([, v]) => v.name === SENTINEL || v.real === 1);
      if (kept.length) failG(`${L.era} ${L.id}: after you took his job ${SENTINEL} still sits at ${kept.map(([club]) => club).join(', ')}`);
      if (S.cm.dugoutOf(next, L.sentinel) !== null) failG(`${L.era} ${L.id}: your own new club shows a dugout`);
    }
    console.log(`   7g: ${moves} summers took the sentinel's own job, ${lines} takeover lines read (all "You take over at {club}."), ${bySection['7g'].fails} failures`);
    if (moves !== leagues.length) fail(`7g: only ${moves} of ${leagues.length} leagues moved you into his chair`);
    if (lines < Math.ceil(leagues.length / 2)) fail(`7g: only ${lines} of ${moves} takeover lines survived the feed's cut, too few to read (floor half the leagues)`);
  }
  /* 7h. The offer from an emptied real chair, built rather than waited for (7b meets one in 200 summers). In every
     league with a club one (else two) tiers below the sentinel's, a career there finishes a title season (90 points) with his
     club bottom (0, the rest 40), so the axe picks his chair often and his club calls; the first seed of up to 16
     whose offers carry his club is read, then accepted the way the hook accepts it. The offer may only say the
     club is making a change, and nothing then or after may name him. Floor 10 offers. */
  if (!MODE || MODE === 'offer') {
    let tried = 0, unseated = 0, offers = 0, accepted = 0;
    for (const L of leagues) {
      const tierOf = club => S.cm.eraClubDefFor(club, L.era)?.tier;
      const probe = seeded(hashSeed(`7h|${L.era}|${L.id}`), () => S.cm.startCareer(L.career, L.era)).value;
      const playable = new Set((L.era === 'now' ? S.cm.playableClubs(L.id) : S.cm.eraPlayableClubs(L.era, L.id)).map(c => c.name));
      /* One tier below his club calls after any title; two below only after a top flight one (offerStepOk), tried
         when the league has no club one tier below. */
      const st = tierOf(L.sentinel);
      const pickAt = t => [...probe.leagueClubs].sort().find(n => n !== L.sentinel && n !== L.partial && playable.has(n) && tierOf(n) === t);
      const club = pickAt(st + 1) ?? pickAt(st + 2);
      if (!club) continue;
      tried += 1;
      for (let k = 0; k < 16; k++) {
        const seed = hashSeed(`7h|${L.era}|${L.id}|${k}`);
        const c = seeded(seed, () => S.cm.startCareer(club, L.era)).value;
        if (c.managers?.[L.sentinel]?.name !== SENTINEL) { unseated += 1; break; }
        for (const row of c.table) row.pts = row.club === club ? 90 : row.club === L.sentinel ? 0 : 40;
        const fin = seeded(seed + 1, () => S.cm.finishSeason(c).state).value;
        const o = (fin.pendingSummary?.offers ?? []).find(x => x.club === L.sentinel);
        if (!o || !(fin.pendingVacancies ?? []).some(v => v.club === L.sentinel)) continue;
        offers += 1;
        if (JSON.stringify(o).includes(SENTINEL)) failH(`${L.era} ${L.id}: the offer from ${L.sentinel} names ${SENTINEL}: "${o.blurb}"`);
        else if (!o.blurb.includes('making a change in the dugout')) failH(`${L.era} ${L.id}: the offer from ${L.sentinel} does not say only that the club is making a change: "${o.blurb}"`);
        const next = seeded(seed + 2, () => S.cm.startNextSeason(fin, L.sentinel)).value;
        if (next.clubName === L.sentinel) accepted += 1;
        const text = said(next);
        if (text.includes(SENTINEL)) failH(`${L.era} ${L.id}: accepting the offer from ${L.sentinel} says ${SENTINEL}: "${text.slice(Math.max(0, text.indexOf(SENTINEL) - 80), text.indexOf(SENTINEL) + 40)}"`);
        break;
      }
    }
    console.log(`   7h: ${tried} leagues with a club below his, ${offers} offers from his emptied chair read and ${accepted} accepted (all saying only that the club is making a change), ${unseated} skipped unseated, ${bySection['7h'].fails} failures`);
    if (offers < 10) fail(`7h: only ${offers} offers from the emptied real chair were read (floor 10)`);
  }
  await ownAndManaged(S, byEra('now').find(l => l.id === 'premier') ?? byEra('now')[0], leagues);
  return { bySection };

  /* 7f. Whole seasons with the sentinel seated, read the way simNoInventedQuotes pass 1 reads them: every match
     result (its events and the rest of its report), the feed, the inbox and the desk after every entry, answered as
     pass 1 answers them, then the season end (offers, awards, the summary) and the summer. Nothing outside the
     record may say him, and each season must be its empty table twin's, draw for draw, after the 7c strip. Floors
     on the distinct lines read and on the matches played against his club (measured numbers in the header). */
  function playedSeasons() {
    const PER_ERA_F = 4;
    let seasons = 0, entries = 0, vsHim = 0, twins = 0, hidden = 0;
    const seen = new Set();
    const t1 = Date.now();
    for (const era of ERAS) {
      const pool = byEra(era);
      for (let k = 0; k < PER_ERA_F; k++) {
        const L = pool[(k * 2 + 1) % pool.length];
        const seed = hashSeed(`7f|${era}|${k}`);
        let shown = 0;
        const hit = (label, text) => {
          const i = text.indexOf(SENTINEL);
          if (i < 0) return;
          shown += 1;
          const m = `${era} ${L.id} seed ${k}: ${label} says ${SENTINEL}: "${text.slice(Math.max(0, i - 80), i + 40)}"`;
          if (shown <= 3) failF(m);
          else { hidden += 1; failures += 1; bySection['7f'].fails += 1; bySection['7f'].named += 1; }
        };
        const line = t => { if (typeof t === 'string' && t) seen.add(t); };
        const read = {
          entry: (r, s) => {
            entries += 1;
            /* The match is r.report (PlayResult has no result field: pass 1's r.result?.events reads nothing). */
            const res = r.report;
            if (res && (res.home === L.sentinel || res.away === L.sentinel)) vsHim += 1;
            for (const e of res?.events ?? []) line(e);
            for (const h of s.aiHeadlines ?? []) line(h);
            for (const m of s.inbox ?? []) { line(m.text); line(m.resolved); }
            for (const d of Array.isArray(s.decisions) ? s.decisions : []) { line(d.text); line(d.resolved); for (const o of d.options ?? []) line(o.label); }
            hit(`the match report of week ${s.week}`, JSON.stringify(res ?? null));
            hit(`week ${s.week}`, said(s));
          },
          state: (st, label) => hit(label, said(st)),
        };
        const play = (E, rd) => seeded(seed, () => {
          let s = E.cm.startCareer(L.career, era);
          const seated = s.managers?.[L.sentinel]?.name === SENTINEL;
          E.cm.ensureRoles(s);
          s.xiIds = E.cm.autoPickXI(s.squad, E.cm.FORMATIONS[s.formationIndex] ?? E.cm.FORMATIONS[0]);
          for (const h of s.aiHeadlines ?? []) if (rd) line(h);
          let guard = 0;
          while (s.week < s.calendar.length && guard < 140) {
            guard += 1;
            const r = E.cm.playNextEntry(s, { skipHalftime: true });
            s = r.state;
            if (rd) rd.entry(r, s);
            const open = [...(s.inbox ?? []), ...(Array.isArray(s.decisions) ? s.decisions : [])].filter(m => !m.resolved && (m.options?.length ?? 0) > 0);
            for (const m of open) s = E.cm.answerMessage(s, m.id, guard % m.options.length);
            if (rd) rd.state(s, `week ${s.week} after answering`);
            if (r.kind === 'seasonOver') break;
          }
          const fin = E.cm.finishSeason(s).state;
          if (rd) rd.state(fin, 'the season end');
          const next = E.cm.startNextSeason(fin);
          if (rd) rd.state(next, 'the new season');
          return { seated, s, fin, next };
        });
        const a = play(S, read), z = play(Z, null);
        seasons += 1;
        if (!a.value.seated) { fail(`7f: ${era} ${L.id} seed ${k}: the sentinel was not seated at ${L.sentinel}, the season tests nothing`); continue; }
        const keys = ['s', 'fin', 'next'];
        if (a.draws === z.draws && keys.every(key => JSON.stringify(strip(a.value[key])) === JSON.stringify(strip(z.value[key])))) twins += 1;
        else {
          const where = keys.map(key => firstDiff(strip(a.value[key]), strip(z.value[key]))).find(Boolean) ?? 'the draws';
          fail(`7f: ${era} ${L.id} seed ${k}: the season differs from the empty table's twin (draws ${a.draws} vs ${z.draws}), first at ${where}`);
        }
      }
    }
    console.log(`   7f: ${seasons} whole seasons with the sentinel seated, ${entries} entries, ${vsHim} matches against his club, ${seen.size} distinct lines read, ${twins} of ${seasons} equal to their empty table twin, ${bySection['7f'].fails} failures${hidden ? ` (${hidden} not shown)` : ''} (${((Date.now() - t1) / 1000).toFixed(0)} s)`);
    if (seasons !== ERAS.length * PER_ERA_F) fail(`7f: only ${seasons} seasons played`);
    /* Measured (r1606-fx-c, head e3aa0fd09): 823 entries, 44 matches against his club, 1849 distinct lines. The run
       is seeded, so it repeats those numbers until the engine changes; the floors sit a third below, pass 1's rule. */
    if (vsHim < 29) fail(`7f: only ${vsHim} matches against the sentinel's club (floor 29, measured 44)`);
    if (seen.size < 1200) fail(`7f: only ${seen.size} distinct lines read, the harvest did not exercise the narrative (floor 1200, measured 1849)`);
  }
}

/* 7d and 7e. Never your club, a club you managed, a Hot Seat club or a mid season predecessor; an old save
   loads with its record untouched. L is the 'now' league whose first club holds the sentinel. */
async function ownAndManaged(S, L, sentinelLeagues) {
  const says = (state, label) => { if (JSON.stringify(state).includes(SENTINEL)) fail(`7d: ${label} carries the sentinel`); };
  const own = seeded(21, () => S.cm.startCareer(L.sentinel, 'now')).value;
  says(own, `a career at ${L.sentinel}, the sentinel's own club,`);
  if (S.cm.dugoutOf(own, L.sentinel) !== null) fail('7d: your own club shows a dugout');
  const moved = seeded(22, () => S.cm.startNextSeason(own, L.career)).value;
  if (moved.clubName !== L.career) fail(`7d: the move from ${L.sentinel} to ${L.career} did not happen, the check tests nothing`);
  says(moved, `the season after leaving ${L.sentinel}`);
  /* A club out of the league keeps no chair in the record (Round 310). The zero point season can send it down when a
     control skips sections 1 to 6 and the save's shuffle differs; the plain run must read the chair. */
  if (!moved.leagueClubs.includes(L.sentinel)) {
    if (MODE) console.log(`   7d: ${L.sentinel} left the league over that summer under this control, so the chair you left is not read`);
    else fail(`7d: ${L.sentinel} left the league over the summer, so the chair you left was not read`);
  } else if (!moved.managers?.[L.sentinel]) fail(`7d: ${L.sentinel} has nobody in its dugout after you left`);
  /* A club this career managed, reached another way (a job taken mid season): the record is scrubbed. */
  const other = seeded(23, () => S.cm.startCareer(L.career, 'now')).value;
  other.careerStats = { ...other.careerStats, clubsManaged: [...(other.careerStats.clubsManaged ?? []), L.sentinel] };
  if (S.cm.dugoutOf(other, L.sentinel) !== null) fail('7d: the display slot shows the real man at a club this career managed');
  S.cm.ensureManagers(other);
  const scrubbed = other.managers?.[L.sentinel];
  if (!scrubbed || scrubbed.name === SENTINEL || scrubbed.real === 1) fail(`7d: the repair left ${JSON.stringify(scrubbed)} at a club this career managed`);
  /* The same chair with no entry at all (a season one load of a career that left it): the repair fills it with a
     made up man, never the opening day's real one. */
  delete other.managers[L.sentinel];
  S.cm.ensureManagers(other);
  const refilled = other.managers?.[L.sentinel];
  if (!refilled || refilled.name === SENTINEL || refilled.real === 1) fail(`7d: the repair seated ${JSON.stringify(refilled)} in an empty chair at a club this career managed`);
  /* A club this career managed outside the league now (a season one move abroad, then their cup or European tie):
     the slot shows him before the club is yours to have managed, and nobody after. */
  const abroad = sentinelLeagues.find(l => l.era === 'now' && l.id !== L.id && !other.leagueClubs.includes(l.sentinel))?.sentinel ?? '';
  if (!abroad) fail('7d: no sentinel club outside the league to read, the check tests nothing');
  else {
    const before = S.cm.dugoutOf(other, abroad);
    if (!before || before.name !== SENTINEL) fail(`7d: ${abroad}, outside the league, does not show its opening day man before you managed it (${JSON.stringify(before)}), the check tests nothing`);
    other.careerStats.clubsManaged = [...other.careerStats.clubsManaged, abroad];
    if (S.cm.dugoutOf(other, abroad) !== null) fail(`7d: the display slot shows the real man at ${abroad}, a club this career managed outside the league`);
  }
  /* Manager Hot Seat at the sentinel's club, and a mid season start there: the job you take was his. */
  try {
    let run = S.hs.startHotSeat({ club: L.sentinel, seed: 4242 });
    for (let i = 0; i < 3 && !run.verdict; i++) {
      if (S.hs.pendingPress(run)) run = S.hs.answerHotSeatPress(run, 0);
      run = S.hs.playHotSeatMatch(run, 'balanced', null);
    }
    says(run, `a Hot Seat run at ${L.sentinel}`);
    let away = S.hs.startHotSeat({ club: L.career, seed: 4243 });
    away = S.hs.playHotSeatMatch(away, 'balanced', null);
    if (spoken(away.state).includes(SENTINEL)) fail(`7d: a Hot Seat run at ${L.career} says the sentinel outside the record`);
  } catch (error) { fail(`7d: Manager Hot Seat could not run at ${L.sentinel}: ${String(error?.message ?? error).slice(0, 120)}`); }
  const mid = seeded(24, () => S.cal.startMidSeason(S.cm.startCareer(L.sentinel, 'now'), 'newYear')).value;
  says(mid, `a mid season start at ${L.sentinel}`);
  const midAway = seeded(25, () => S.cal.startMidSeason(S.cm.startCareer(L.career, 'now'), 'runIn')).value;
  if (spoken(midAway).includes(SENTINEL)) fail(`7d: a mid season start at ${L.career} says the sentinel outside the record`);
  console.log(`   7d: nothing at ${L.sentinel} as your club, the club you left, a club you managed, Hot Seat or a mid season start`);

  /* 7e. The old save: a season one record of made up names at the sentinel's own club loads unchanged. */
  const raw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveEvertonFixture.json'), 'utf8');
  const fixture = JSON.parse(raw);
  if (fixture.eraId !== 'now' || !fixture.managers?.[L.sentinel]) refuse(`7e: the old save fixture has no chair at ${L.sentinel}, it would test nothing`);
  store.clear();
  store.set(S.cm.SAVE_KEY, raw);
  const loaded = S.cm.loadCareer();
  if (!loaded) fail('7e: the old save fixture did not load');
  else if (JSON.stringify(loaded.managers) !== JSON.stringify(fixture.managers)) fail('7e: loading the old save changed its managers record');
  else console.log(`   7e: the old save loads with its ${Object.keys(fixture.managers).length} chairs byte identical (${L.sentinel}: ${fixture.managers[L.sentinel].name})`);
  store.clear();
}

/* ---------- 8. Round 1606: the byte identity fleet against a base commit ---------- */
async function fleetSection() {
  const BASE = process.env.SIM_MANAGERS_BASE || '';
  if (!BASE) { console.log('8) NOT RUN: the byte identity fleet needs SIM_MANAGERS_BASE=<commit>, the round\'s base on main'); return; }
  const empty = rd.realDugoutNames(CM_DUGOUTS).length === 0;
  console.log(`8) the fleet against ${BASE}: ${empty ? 'the table is empty, so every save must be the same bytes' : 'the table has rows, so every save must match after the 7c strip'}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'managers-fleet-'));
  const nodeModules = path.join(ROOT, 'node_modules');
  let base = null;
  try { base = baseTree(ROOT, BASE, tmp); } catch (error) { refuse(`the base ${BASE} could not be read (${String(error?.message ?? error).split('\n')[0]})`); }
  const B = await bundleEngine({ srcDir: base.src, tmp, name: 'base', nodeModules, refuse });
  const C = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'cand', nodeModules, refuse });
  for (const era of ERAS) { await B.cm.ensureEraRosters(era); await C.cm.ensureEraRosters(era); }
  const bytes = (E, state) => { store.clear(); E.cm.saveCareer(state); const out = store.get(E.cm.SAVE_KEY); store.clear(); return out; };
  const view = text => (empty ? text : JSON.stringify(strip(JSON.parse(text))));
  let compared = 0, differ = 0;
  const cmp = (label, a, b, asSave = true) => {
    compared += 1;
    const x = asSave ? view(bytes(B, a.value)) : JSON.stringify(empty ? a.value : strip(a.value.state));
    const y = asSave ? view(bytes(C, b.value)) : JSON.stringify(empty ? b.value : strip(b.value.state));
    if (a.draws === b.draws && x === y) return true;
    differ += 1;
    if (differ <= 8) fail(`8: ${label}: differs from the base (draws ${a.draws} vs ${b.draws})`);
    return false;
  };
  const twice = (seed, fn) => [seeded(seed, () => fn(B)), seeded(seed, () => fn(C))];
  const t0 = Date.now();
  let careers = 0;
  for (const era of ERAS) {
    const defs = C.cm.worldLeagueDefs({ eraId: era });
    for (let k = 0; k < 12; k++) {
      const def = defs[k % defs.length];
      const clubs = (era === 'now' ? C.cm.playableClubs(def.id) : C.cm.eraPlayableClubs(era, def.id)).map(c => c.name).sort();
      if (!clubs.length) continue;
      const club = clubs[(k * 7) % clubs.length];
      const seed = hashSeed(`8|${era}|${k}`);
      const tag = `${era} ${club} seed ${k}`;
      careers += 1;
      let [a, b] = twice(seed, E => E.cm.startCareer(club, era));
      if (!cmp(`${tag} day one`, a, b)) continue;
      let sa = a.value, sb = b.value;
      fleet: for (let season = 1; season <= 3; season++) {
        for (let i = 0; i < 4; i++) {
          const ra = seeded(seed + season * 100 + i, () => B.cm.playNextEntry(sa, { skipHalftime: true }));
          const rb = seeded(seed + season * 100 + i, () => C.cm.playNextEntry(sb, { skipHalftime: true }));
          sa = ra.value.state; sb = rb.value.state;
          if (!cmp(`${tag} season ${season} entry ${i + 1}`, { value: sa, draws: ra.draws }, { value: sb, draws: rb.draws })) break fleet;
        }
        const fa = seeded(seed + season * 100 + 50, () => B.cm.finishSeason(sa).state);
        const fb = seeded(seed + season * 100 + 50, () => C.cm.finishSeason(sb).state);
        if (!cmp(`${tag} season ${season} end`, fa, fb)) break;
        const na = seeded(seed + season * 100 + 60, () => B.cm.startNextSeason(fa.value));
        const nb = seeded(seed + season * 100 + 60, () => C.cm.startNextSeason(fb.value));
        if (!cmp(`${tag} summer ${season}`, na, nb)) break;
        sa = na.value; sb = nb.value;
      }
    }
  }
  const premier = C.cm.playableClubs('premier').map(c => c.name).sort();
  for (const [i, entry] of ['autumn', 'newYear', 'runIn'].entries()) {
    const club = premier[(i * 6) % premier.length];
    const [a, b] = twice(hashSeed(`8|mid|${entry}`), E => E.cal.startMidSeason(E.cm.startCareer(club, 'now'), entry));
    cmp(`mid season start at ${club} (${entry})`, a, b);
  }
  for (let i = 0; i < 3; i++) {
    const setup = { club: premier[(i * 5 + 2) % premier.length], seed: 9100 + i };
    const [a, b] = twice(1, E => {
      let run = E.hs.startHotSeat(setup);
      for (let m = 0; m < 3 && !run.verdict; m++) {
        if (E.hs.pendingPress(run)) run = E.hs.answerHotSeatPress(run, 0);
        run = E.hs.playHotSeatMatch(run, m % 2 ? 'attacking' : 'balanced', null);
      }
      return run;
    });
    cmp(`Hot Seat at ${setup.club}`, a, b, false);
  }
  console.log(`   ${careers} careers over 3 seasons, 3 mid season starts and 3 Hot Seat runs: ${compared} states compared, ${differ} differ (${((Date.now() - t0) / 1000).toFixed(0)} s, base ${base.sha.slice(0, 9)})`);
  if (careers < 60) fail(`8: only ${careers} fleet careers ran (floor 60)`);
}
