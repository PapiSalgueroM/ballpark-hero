/* Build Your XI answers from the site's own records before it asks a model,
 * and this holds that the records pass can only ever CONFIRM.
 *
 * Round 482. Build Your XI was dead in production and the game was not at
 * fault: every pick spent a call on the free Gemini allowance, filling a
 * lineup needs eleven verdicts in a row, and the allowance ran out. The two
 * grid validators survive the same allowance because they answer from stored
 * data first and remember what they are told. validate-player did neither,
 * although player_market_values holds 141,916 rows covering 2004 to 2026 and
 * IS the question the prompt asks: has this man played for this club.
 *
 * A data source that answers first is only safe while it can say YES and
 * never NO. A miss in the table means a spelling, a nickname, a year or a
 * club the table does not carry, and it must fall through to the model; a
 * model that cannot answer must still refuse. So every section here is about
 * the one thing that could turn this from a saving into the July 2026 P1
 * again: a confirm that is not true.
 *
 * WHAT IT HOLDS, against the live table because that is where the answers
 * come from:
 *   1. Every club string the map names really exists. A typo costs a whole
 *      club's coverage in silence, and nothing else would notice.
 *   2. The impostors are refused. Twenty club strings that a loose match
 *      would have swallowed are checked to exist AND to resolve to no club
 *      in the game: RCD Espanyol Barcelona and Barcelona SC Guayaquil are
 *      not Barcelona, Sporting Gijon and Sporting Kansas City are not
 *      Sporting CP, Gremio Foot-Ball Porto Alegrense is not Porto, and
 *      Newcastle United Jets, who play in Australia, are not Newcastle.
 *      Between them they hold more than a thousand rows of wrong answers.
 *   3. The truth battery. Hand-checked pairs run through the same matcher:
 *      NO false pair may ever be confirmed, no wrong position may ever be
 *      confirmed at a right club, and the true pairs must still confirm at
 *      or above a floor, so the pass cannot quietly become a no-op that
 *      passes this file while sending every pick back to the model.
 *   4. The club and the position must come from the SAME ROW, derived from
 *      the table rather than asserted: a name is not a person. Seven men are
 *      on file as Paulinho, one of them played central midfield for
 *      Barcelona in 2018, and a different one is a left-back. Reading the
 *      club off the first and the position off the second confirms a player
 *      who never existed.
 *
 * NEGATIVE CONTROLS, both of which fire on correct code:
 *   VPR_CONTROL=crossrow  relaxes the matcher to any-row, which is the bug
 *     section 4 exists for, and section 4 must go red.
 *   VPR_CONTROL=naiveclub replaces the map with the substring match it was
 *     written to avoid, and section 2 must go red.
 *   VPR_CONTROL=captain stops stripping the armband out of a squad name, which
 *     is how every captain was missed, and section 6 must go red.
 *   VPR_CONTROL=drift edits one of the two club maps, and section 7 must go red.
 *   VPR_CONTROL=noboost drops the capped-players-first ranking, and section 8 must
 *     go red because the eight names on screen stop improving.
 * All five refuse to run if the change they make changes nothing.
 *
 * Run: node scripts/simValidatePlayerRecords.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.VPR_CONTROL || '';
if (CONTROL && !['crossrow', 'naiveclub', 'captain', 'drift', 'noboost'].includes(CONTROL)) {
  console.error(`VPR_CONTROL=${CONTROL} is not a control this harness knows (crossrow, naiveclub, captain, drift, noboost)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/* Retried once, because this harness makes a few hundred requests and a single
   blip used to read as a real finding: a null here makes section 2 report an
   impostor as "no longer in the table" and can abort a control run that was
   working perfectly. A retry is not papering over a failure, it is refusing to
   call a dropped connection a defect. */
async function rest(qs, attempt = 0) {
  try {
    const res = await fetch(`${URL_}/rest/v1/${qs}`, { headers: HEAD });
    if (res.ok) return res.json();
  } catch { /* fall through to the retry */ }
  if (attempt === 0) {
    await new Promise(r => setTimeout(r, 700));
    return rest(qs, 1);
  }
  return null;
}

/* ---- the maps, read out of the deployed source so they cannot drift ---- */
const SRC_PATH = path.join(ROOT, 'supabase', 'functions', 'validate-player', 'index.ts');
const SRC_RAW = fs.readFileSync(SRC_PATH, 'utf8');
/* comments stripped before anything is matched: prose about a rule is the one
   place the rule's own words are guaranteed to appear. */
const SRC = SRC_RAW.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

function literal(name) {
  const at = SRC.indexOf(`const ${name}`);
  if (at < 0) { console.error(`cannot find ${name} in the validator source`); process.exit(1); }
  const open = SRC.indexOf('{', at);
  let depth = 0, end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return new Function(`return (${SRC.slice(open, end + 1)})`)();
}

const CLUB_STRINGS = literal('CLUB_STRINGS');
const POSITION_ROLES = literal('POSITION_ROLES');

const dbFold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const flat = s => dbFold(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/* The matcher under test, in the two shapes: the shipped same-row rule, and
   the any-row relaxation that is the bug. */
function confirms(rows, clubLabel, pos, crossrow) {
  let want = CLUB_STRINGS[flat(clubLabel)] ?? [];
  if (CONTROL === 'naiveclub') want = null; /* substring instead of the map */
  const clubOf = r => String(r.club ?? '').split(' / ').map(s => s.trim());
  const clubHit = r => (want === null
    ? clubOf(r).some(p => flat(p).includes(flat(clubLabel)))
    : clubOf(r).some(p => want.includes(p)));
  const roleHit = r => !pos || (POSITION_ROLES[flat(r.position ?? '')] ?? []).includes(pos);
  if (crossrow) return rows.some(clubHit) && rows.some(roleHit);
  return rows.some(r => clubHit(r) && roleHit(r));
}

const rowsFor = async name => {
  const eq = await rest(`player_market_values?select=player_name,club,position,nationality&name_folded=eq.${encodeURIComponent(dbFold(name))}&limit=200`);
  if (eq && eq.length) return eq;
  const pat = flat(name).replace(/ /g, '_');
  return (await rest(`player_market_values?select=player_name,club,position,nationality&name_folded=like.${encodeURIComponent(pat)}&limit=200`)) ?? [];
};

/* ---------------------------------------------------------------- 1 */
console.log('1) every club string the map names exists in the table');
{
  const all = [...new Set(Object.values(CLUB_STRINGS).flat())];
  let missing = 0;
  for (const s of all) {
    const got = await rest(`player_market_values?select=club&club=eq.${encodeURIComponent(s)}&limit=1`);
    if (!got || got.length === 0) { fail(`the map names "${s}" and the table has no such club`); missing++; }
  }
  const labels = Object.keys(CLUB_STRINGS).length;
  if (labels !== 30) fail(`the game offers 30 clubs and the map covers ${labels}`);
  console.log(`   ${all.length} club strings across ${labels} clubs, ${all.length - missing} found in the table`);
}

/* ---------------------------------------------------------------- 2 */
console.log('2) the impostors exist and are refused');
{
  /* Measured from the table on 2026-09-06 by listing every club string
     containing a token from one of the thirty. Each is a DIFFERENT club that
     a substring match would have accepted as one of the game's. */
  const IMPOSTORS = [
    ['RCD Espanyol Barcelona', 'Barcelona'], ['Barcelona SC Guayaquil', 'Barcelona'],
    ['FC Barcelona Atlètic', 'Barcelona'], ['Sporting Gijón', 'Sporting CP'],
    ['Sporting Kansas City', 'Sporting CP'], ['Ceará Sporting Club', 'Sporting CP'],
    ['Pisa Sporting Club', 'Sporting CP'], ['Liverpool FC Montevideo', 'Liverpool'],
    ['Arsenal Tula', 'Arsenal'], ['Arsenal Kyiv', 'Arsenal'],
    ['Berekum Chelsea FC', 'Chelsea'], ['Real Madrid Castilla', 'Real Madrid'],
    ['FC Porto B', 'Porto'], ['Grêmio Foot-Ball Porto Alegrense', 'Porto'],
    ['Ajax Cape Town', 'Ajax'], ['Juventus Next Gen', 'Juventus'],
    ['Newcastle United Jets', 'Newcastle'], ['Paris FC', 'PSG'],
    ['Olympique de Marseille B', 'Marseille'], ['Manchester City U21', 'Manchester City'],
  ];
  let absent = 0, accepted = 0;
  for (const [club, label] of IMPOSTORS) {
    const got = await rest(`player_market_values?select=club&club=eq.${encodeURIComponent(club)}&limit=1`);
    if (!got || got.length === 0) { fail(`"${club}" is no longer in the table, so this row proves nothing`); absent++; continue; }
    if (confirms([{ club, position: null }], label, null, false)) {
      fail(`"${club}" is accepted as ${label}, and it is a different club`);
      accepted++;
    }
  }
  console.log(`   ${IMPOSTORS.length - absent} impostor clubs present in the table, ${accepted} of them accepted`);
  if (CONTROL === 'naiveclub' && accepted === 0) {
    console.error('   CONTROL naiveclub changed nothing: it must accept impostors');
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- 3 */
console.log('3) the truth battery');
{
  /* Hand-checked football facts, not read back out of the table. The false
     rows are the ones that matter: a single confirm among them is the whole
     defect this pass could introduce.
     The position in a true row is the CAREER position the table records, not
     the one the man played that season: Cristiano Ronaldo is a Centre-Forward
     on all 23 of his rows including his years as a winger at Manchester
     United, and Messi is a Right Winger on all 24 including Inter Miami. So
     a genuinely true pair whose slot differs from the career position is not
     confirmed, and that is the pass being careful rather than being wrong. */
  const TRUE_PAIRS = [
    ['Erling Haaland', 'Manchester City', 'ST'], ['Lionel Messi', 'Barcelona', 'RW'],
    ['Virgil van Dijk', 'Liverpool', 'CB'], ['Kevin De Bruyne', 'Manchester City', 'CM'],
    ['Mohamed Salah', 'Liverpool', 'RW'], ['Harry Kane', 'Tottenham', 'ST'],
    ['Cristiano Ronaldo', 'Real Madrid', 'ST'], ['Zlatan Ibrahimović', 'AC Milan', 'ST'],
    ['Thibaut Courtois', 'Chelsea', 'GK'], ['Sergio Ramos', 'Real Madrid', 'CB'],
    ['Marc-André ter Stegen', 'Barcelona', 'GK'], ['Romelu Lukaku', 'Inter Milan', 'ST'],
    ['Kylian Mbappé', 'PSG', 'ST'], ['Marc Andre ter Stegen', 'Barcelona', 'GK'],
  ];
  const FALSE_PAIRS = [
    /* never at that club */
    ['Erling Haaland', 'Liverpool', 'ST'], ['Lionel Messi', 'Real Madrid', 'RW'],
    ['Mohamed Salah', 'Manchester United', 'RW'], ['Harry Kane', 'Arsenal', 'ST'],
    ['Virgil van Dijk', 'Barcelona', 'CB'], ['Kevin De Bruyne', 'Real Madrid', 'CM'],
    /* right club, wrong position: the owner's ter Stegen at CM report */
    ['Marc-André ter Stegen', 'Barcelona', 'CM'], ['Thibaut Courtois', 'Chelsea', 'ST'],
    ['Virgil van Dijk', 'Liverpool', 'GK'], ['Erling Haaland', 'Manchester City', 'GK'],
  ];
  let confirmed = 0, wrong = 0;
  for (const [name, club, pos] of TRUE_PAIRS) {
    if (confirms(await rowsFor(name), club, pos, CONTROL === 'crossrow')) confirmed++;
    else console.log(`   not confirmed (safe, goes to the model): ${name} at ${club} ${pos}`);
  }
  for (const [name, club, pos] of FALSE_PAIRS) {
    if (confirms(await rowsFor(name), club, pos, CONTROL === 'crossrow')) {
      fail(`CONFIRMED A FALSE ANSWER: ${name} at ${club} in the ${pos} slot`);
      wrong++;
    }
  }
  console.log(`   ${confirmed}/${TRUE_PAIRS.length} true pairs confirmed without the model, ${wrong}/${FALSE_PAIRS.length} false pairs wrongly confirmed`);
  /* The floor is measured, not chosen: all 14 confirm today. 11 leaves room
     for the table losing a season or a spelling without going red, and still
     fails long before the pass could decay into a no-op. */
  if (confirmed < 11) fail(`only ${confirmed} of ${TRUE_PAIRS.length} true pairs confirm, so the records pass is barely saving a call`);
}

/* ---------------------------------------------------------------- 4 */
console.log('4) the club and the position come from one row, because a name is not a person');
{
  const rows = await rowsFor('Paulinho');
  const inMap = new Set(Object.values(CLUB_STRINGS).flat());
  const labelOf = c => Object.keys(CLUB_STRINGS).find(k => CLUB_STRINGS[k].includes(c));
  /* Find it in the data rather than asserting it: a row at one of the game's
     clubs, and a DIFFERENT row whose position that row does not have. */
  let found = null;
  for (const r of rows) {
    const club = String(r.club ?? '').split(' / ').map(s => s.trim()).find(p => inMap.has(p));
    if (!club) continue;
    const mine = new Set(POSITION_ROLES[flat(r.position ?? '')] ?? []);
    for (const other of rows) {
      const theirs = POSITION_ROLES[flat(other.position ?? '')] ?? [];
      const role = theirs.find(x => !mine.has(x));
      if (role) { found = { label: labelOf(club), club, role, at: r.position, from: other.position }; break; }
    }
    if (found) break;
  }
  if (!found) {
    console.log('   no split-identity case in the table today, so this section claims nothing');
  } else {
    console.log(`   "Paulinho" is at ${found.club} as a ${found.at}; another Paulinho is a ${found.from}`);
    const got = confirms(rows, found.label, found.role, CONTROL === 'crossrow');
    if (got) fail(`two different men were added together: Paulinho confirmed at ${found.label} in the ${found.role} slot`);
    if (CONTROL === 'crossrow' && !got) {
      console.error('   CONTROL crossrow changed nothing: it must add the two men together');
      process.exit(1);
    }
  }
}

/* ---------------------------------------------------------------- 5 */
console.log('5) a records confirm still cannot become a records refusal');
{
  /* The shape rule behind all of it. A miss must reach the model, so the AI
     call has to sit AFTER the records block and outside it, and no path in
     the records block may return valid:false. */
  const block = SRC.slice(SRC.indexOf('player_market_values'), SRC.indexOf('const teamType'));
  if (/valid:\s*false/.test(block)) fail('the records block returns valid:false somewhere: a table miss must go to the model, never refuse');
  if (!/callAI|AI_URL/.test(SRC.slice(SRC.indexOf('const teamType')))) fail('nothing calls the model after the records block');
  if (!/unverified:\s*true/.test(SRC)) fail('the function no longer has an unverified refusal');
  console.log('   records block confirms only, the model still runs after it, the refusal still exists');
}

/* ---------------------------------------------------------------- 6 */
console.log('6) the armband is a column, not part of the name');
{
  /* The squad table used to store captains as "Lionel Messi ( captain )", 102
     of its 2,784 rows, and it was the only annotation in it. That lands on
     precisely the men a player is most likely to type, so the nation path
     worked for the reserves and missed every captain.

     Round 482 taught the validator to strip it; Round 484 took it out of the
     data and put the captaincy in its own column, because anything that
     DISPLAYS a squad name would otherwise have shown the parentheses. Both
     halves are held here: the data must stay clean, and the validator must
     keep stripping anyway, because the cleaning lives in a migration and the
     next re-import of this table would undo it. */
  const NEEDLE = 'replace(/' + String.fromCharCode(92) + '([^)]*' + String.fromCharCode(92) + ')/g';
  if (!SRC.includes(NEEDLE)) {
    fail('the validator no longer strips a parenthesised annotation, so a re-import of the squad table would lose every captain again');
  }
  const annotated = await rest('national_team_squads?select=player_name,country&player_name=like.*(*&limit=20');
  const captains = await rest('national_team_squads?select=player_name&is_captain=is.true&limit=200');
  const nAnnotated = (annotated ?? []).length;
  const nCaptains = (captains ?? []).length;
  console.log(`   ${nAnnotated} names still carrying an annotation, ${nCaptains} rows flagged as captain`);
  const expectAnnotated = CONTROL === 'captain';
  if (!expectAnnotated && nAnnotated > 0) {
    fail(`${nAnnotated} squad names still hold "( captain )" inside the name: ${(annotated ?? []).slice(0, 3).map(r => r.player_name).join(', ')}`);
  }
  if (expectAnnotated && nAnnotated === 0) {
    fail('expected the squad names to still carry the armband inside them, and they do not');
  }
  /* The fact must survive the cleaning: stripping the words and recording
     nothing would be data loss dressed as a repair. */
  if (nCaptains === 0) fail('no row is flagged as captain, so the armband was deleted rather than moved');
  if (CONTROL === 'captain' && failures === 0) {
    console.error('   CONTROL captain changed nothing: it must expect the old annotated names and fail');
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- 7 */
console.log('7) the dropdown and the validator name the same thirty clubs');
{
  /* The list lives twice because an edge function cannot import from src, and
     two copies of a fact drift. This is the same guard simSchema keeps over
     the home page's JSON-LD and the registry. It matters more than it looks:
     if the dropdown offers a club string the validator does not know, every
     pick from that club goes to the model instead of being answered free, and
     nothing else in the build would say so. */
  const CLIENT_SRC = fs.readFileSync(path.join(ROOT, 'src', 'data', 'lineupTeams.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const at = CLIENT_SRC.indexOf('const CLUB_TABLE_NAMES');
  if (at < 0) { fail('the dropdown no longer carries CLUB_TABLE_NAMES'); }
  else {
    const open = CLIENT_SRC.indexOf('{', at);
    let depth = 0, end = -1;
    for (let i = open; i < CLIENT_SRC.length; i++) {
      if (CLIENT_SRC[i] === '{') depth++;
      else if (CLIENT_SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    let client = new Function(`return (${CLIENT_SRC.slice(open, end + 1)})`)();
    if (CONTROL === 'drift') client = { ...client, Barcelona: ['FC Barcelona', 'RCD Espanyol Barcelona'] };
    const asFlat = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [flat(k), [...v].sort().join('|')]));
    const a = asFlat(client), b = asFlat(CLUB_STRINGS);
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    let drifted = 0;
    for (const k of keys) {
      if (a[k] !== b[k]) { fail(`"${k}" differs: the dropdown says ${a[k] ?? '(absent)'} and the validator says ${b[k] ?? '(absent)'}`); drifted++; }
    }
    console.log(`   ${keys.length} clubs compared, ${drifted} disagreement(s)`);
    if (CONTROL === 'drift' && drifted === 0) {
      console.error('   CONTROL drift changed nothing: the two maps must disagree');
      process.exit(1);
    }
  }
}

/* ---------------------------------------------------------------- 8 */
console.log('8) a nation slot shows proven internationals in the eight names on screen');
{
  /* Round 484. The nation pool has to stay wide or slots become unfillable
     (Round 442 was spent on exactly that), but wide means wrong-shaped: the
     game asks who has PLAYED FOR a country and the pool is everyone holding
     the passport. Argentina offers 1,567 names against the 76 ever named in a
     squad we hold; Italy offers 1,571 against none at all.

     So the fix ranks rather than filters, and this measures the OUTCOME the
     player sees rather than the mechanism: of the eight suggestions a query
     actually returns, how many are men the country really picked? It is
     measured twice, once with the old prominence-only order as the baseline
     and once with the boost, and the boost has to beat the baseline somewhere
     or it is doing nothing. */
  const NATIONS = [['Argentina', 'Argentina'], ['England', 'England'], ['Japan', 'Japan'], ['Spain', 'Spain']];
  const QUERIES = ['mar', 'san', 'car'];
  const TOP = 8;

  let baseTotal = 0, boostTotal = 0, improvedOn = 0, compared = 0, emptyPools = 0;
  for (const [label, nat] of NATIONS) {
    const squad = await rest(`national_team_squads?select=player_name&country=eq.${encodeURIComponent(label)}&limit=400`);
    const capped = new Set((squad ?? []).map(r => flat(r.player_name)).filter(Boolean));
    for (const q of QUERIES) {
      const rows = await rest(`player_market_values?select=player_name,market_value_usd&nationality=eq.${encodeURIComponent(nat)}&player_name=ilike.*${encodeURIComponent(q)}*&order=market_value_usd.desc&limit=200`);
      if (!rows || rows.length === 0) { emptyPools++; continue; }
      const best = new Map();
      for (const r of rows) {
        const k = flat(r.player_name);
        const v = Number(r.market_value_usd) || 0;
        if (!best.has(k) || best.get(k) < v) best.set(k, v);
      }
      const pool = [...best.entries()].map(([k, v]) => ({ k, v }));
      const byValue = [...pool].sort((a, b) => b.v - a.v);
      const boosted = CONTROL === 'noboost'
        ? byValue
        : [...pool].sort((a, b) => {
            const ab = capped.has(a.k) ? 0 : 1, bb = capped.has(b.k) ? 0 : 1;
            if (ab !== bb) return ab - bb;
            return b.v - a.v;
          });
      const countCapped = list => list.slice(0, TOP).filter(x => capped.has(x.k)).length;
      const base = countCapped(byValue), lift = countCapped(boosted);
      baseTotal += base; boostTotal += lift; compared++;
      if (lift > base) improvedOn++;
      console.log(`   ${label} "${q}": ${Math.min(pool.length, TOP)} shown, proven internationals ${base} -> ${lift}`);
    }
  }
  if (emptyPools > 0) console.log(`   ${emptyPools} query/nation pairs returned an empty pool and were not counted`);
  console.log(`   across ${compared} queries: ${baseTotal} proven names in the top ${TOP} before, ${boostTotal} after, improved on ${improvedOn}`);
  if (compared === 0) fail('no nation pool could be measured, so this section proved nothing');
  else if (boostTotal < baseTotal) fail('the ranking made the eight names on screen WORSE');
  else if (improvedOn === 0) fail('the capped-first ranking changed nothing on any query, so it is not reaching the suggestions');

  /* The pool must never be empty for any of the twenty five nations: an empty
     dropdown is a dead slot, which is the failure this round refused to cause. */
  const GAME_NATIONS = ['Argentina', 'France', 'Brazil', 'England', 'Belgium', 'Croatia', 'Netherlands',
    'Portugal', 'Spain', 'Italy', 'Germany', 'Uruguay', 'Colombia', 'United States', 'Mexico', 'Senegal',
    'Japan', 'Korea, South', 'Nigeria', 'Denmark', 'Switzerland', 'Morocco', 'Serbia', 'Poland', 'Cameroon'];
  let dead = 0;
  for (const nat of GAME_NATIONS) {
    const got = await rest(`player_market_values?select=player_name&nationality=eq.${encodeURIComponent(nat)}&limit=1`);
    if (!got || got.length === 0) { fail(`the pool for ${nat} is EMPTY, so that slot cannot be filled`); dead++; }
  }
  console.log(`   ${GAME_NATIONS.length - dead}/${GAME_NATIONS.length} nations still have a fillable pool`);
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimValidatePlayerRecords: green. The records answer first and can only ever confirm.'
  : `\nsimValidatePlayerRecords: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
