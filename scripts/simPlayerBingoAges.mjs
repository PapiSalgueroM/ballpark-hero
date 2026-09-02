/* Player Bingo current-age harness.

   Database ages belong to historical snapshot years. They remain untouched
   for career identity checks. Current-age tiles use an exact verified DOB
   where available, then a conservative year-sensitive interval for rows
   whose entire interval is safely on one side of a rule.

   What it holds:
     1. The exact 73-record DOB ledger.
     2. A two-source receipt for every DOB, with Diogo Jota's death receipts.
     3. Birthday, invalid-date and leap-day behavior.
     4. Exact identity, including the Pepê and Pepe collision.
     5. Year-sensitive safe bounds and fail-closed ambiguous rows.
     6. Diogo Jota is excluded from both current-age rules.
     7. Board criteria read explicit eligibility, never historical age.
     8. The seed query has a deterministic total order before its limit.
     9. Every live pool player's age flags match an independent full-pool oracle.
    10. Both current-age tiles keep the complete oracle support above the floor.

   Every negative control must produce only its exact expected failures.

   Run: node scripts/simPlayerBingoAges.mjs
*/
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_BINGO_AGE_CONTROL || '';

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
const fail = message => {
  failures += 1;
  bySection[section] += 1;
  console.error('  FAIL: ' + message);
};
const abort = message => { throw new Error(message); };

/* Independent oracle. Order is not significant, but identity spelling is. */
const EXPECTED = [
  ['Abdukodir Khusanov', 'Uzbekistan', 'Centre-Back', '2004-02-29'],
  ['Habib Diarra', 'Senegal', 'Central Midfield', '2004-01-03'],
  ['Yegor Yarmolyuk', 'Ukraine', 'Central Midfield', '2004-03-01'],
  ['Gonzalo García', 'Spain', 'Centre-Forward', '2004-03-24'],
  ['Savinho', 'Brazil', 'Left Winger', '2004-04-10'],
  ['Joel Ordóñez', 'Ecuador', 'Centre-Back', '2004-04-21'],
  ['Johan Bakayoko', 'Belgium', 'Right Winger', '2003-04-20'],
  ['Andrey Santos', 'Brazil', 'Central Midfield', '2004-05-03'],
  ['Samu Aghehowa', 'Spain', 'Centre-Forward', '2004-05-05'],
  ['Bilal El Khannouss', 'Morocco', 'Attacking Midfield', '2004-05-10'],
  ['Cristhian Mosquera', 'Spain', 'Centre-Back', '2004-06-27'],
  ['Hugo Larsson', 'Sweden', 'Central Midfield', '2004-06-27'],
  ['Alejandro Garnacho', 'Argentina', 'Left Winger', '2004-07-01'],
  ['Mateus Fernandes', 'Portugal', 'Central Midfield', '2004-07-10'],
  ['Michael Kayode', 'Italy', 'Right-Back', '2004-07-10'],
  ['Yankuba Minteh', 'The Gambia', 'Right Winger', '2004-07-22'],
  ['Valentín Barco', 'Argentina', 'Central Midfield', '2004-07-23'],
  ['Gavi', 'Spain', 'Central Midfield', '2004-08-05'],
  ['Jamie Gittens', 'England', 'Left Winger', '2004-08-08'],
  ['João Neves', 'Portugal', 'Central Midfield', '2004-09-27'],
  ['Nico Paz', 'Argentina', 'Attacking Midfield', '2004-09-08'],
  ['Lewis Hall', 'England', 'Left-Back', '2004-09-08'],
  ['Patrick Dorgu', 'Denmark', 'Left-Back', '2004-10-26'],
  ['Santiago Castro', 'Argentina', 'Centre-Forward', '2004-09-18'],
  ['Rico Lewis', 'England', 'Right-Back', '2004-11-21'],
  ['Noah Sadiki', 'DR Congo', 'Central Midfield', '2004-12-17'],
  ['Evan Ferguson', 'Ireland', 'Centre-Forward', '2004-10-19'],
  ['Brais Méndez', 'Spain', 'Attacking Midfield', '1997-01-07'],
  ['Luis Díaz', 'Colombia', 'Left Winger', '1997-01-13'],
  ['Pau Torres', 'Spain', 'Centre-Back', '1997-01-16'],
  ['Nicolò Barella', 'Italy', 'Central Midfield', '1997-02-07'],
  ['Pepê', 'Brazil', 'Right Winger', '1997-02-24'],
  ['David Neres', 'Brazil', 'Right Winger', '1997-03-03'],
  ['Bremer', 'Brazil', 'Centre-Back', '1997-03-18'],
  ['Gabriel Jesus', 'Brazil', 'Centre-Forward', '1997-04-03'],
  ['Mikel Oyarzabal', 'Spain', 'Centre-Forward', '1997-04-21'],
  ['Youri Tielemans', 'Belgium', 'Central Midfield', '1997-05-07'],
  ['Richarlison', 'Brazil', 'Centre-Forward', '1997-05-10'],
  ['Frenkie de Jong', 'Netherlands', 'Central Midfield', '1997-05-12'],
  ['Rúben Dias', 'Portugal', 'Centre-Back', '1997-05-14'],
  ['Ousmane Dembélé', 'France', 'Centre-Forward', '1997-05-15'],
  ['Kaoru Mitoma', 'Japan', 'Left Winger', '1997-05-20'],
  ['Maximilian Kilman', 'England', 'Centre-Back', '1997-05-23'],
  ['Konrad Laimer', 'Austria', 'Right-Back', '1997-05-27'],
  ['Unai Simón', 'Spain', 'Goalkeeper', '1997-06-11'],
  ['Albert Gudmundsson', 'Iceland', 'Second Striker', '1997-06-15'],
  ['Artem Dovbyk', 'Ukraine', 'Centre-Forward', '1997-06-21'],
  ['Jean-Philippe Mateta', 'France', 'Centre-Forward', '1997-06-28'],
  ['Marcus Thuram', 'France', 'Centre-Forward', '1997-08-06'],
  ['Antonee Robinson', 'United States', 'Left-Back', '1997-08-08'],
  ['Leon Bailey', 'Jamaica', 'Right Winger', '1997-08-09'],
  ['Lautaro Martínez', 'Argentina', 'Centre-Forward', '1997-08-22'],
  ['Lucas Paquetá', 'Brazil', 'Attacking Midfield', '1997-08-27'],
  ['Dominic Solanke', 'England', 'Centre-Forward', '1997-09-14'],
  ['Tammy Abraham', 'England', 'Centre-Forward', '1997-10-02'],
  ['Theo Hernández', 'France', 'Left-Back', '1997-10-06'],
  ['Ben White', 'England', 'Right-Back', '1997-10-08'],
  ['Nikola Milenković', 'Serbia', 'Centre-Back', '1997-10-12'],
  ['Ademola Lookman', 'Nigeria', 'Left Winger', '1997-10-20'],
  ['Ezri Konsa', 'England', 'Centre-Back', '1997-10-23'],
  ['Federico Chiesa', 'Italy', 'Right Winger', '1997-10-25'],
  ['Marcus Rashford', 'England', 'Left Winger', '1997-10-31'],
  ['Federico Dimarco', 'Italy', 'Left-Back', '1997-11-10'],
  ['Christopher Nkunku', 'France', 'Centre-Forward', '1997-11-14'],
  ['Noussair Mazraoui', 'Morocco', 'Right-Back', '1997-11-14'],
  ['Viktor Tsygankov', 'Ukraine', 'Right Winger', '1997-11-15'],
  ['Bruno Guimarães', 'Brazil', 'Central Midfield', '1997-11-16'],
  ['Gregor Kobel', 'Switzerland', 'Goalkeeper', '1997-12-06'],
  ['Harvey Barnes', 'England', 'Left Winger', '1997-12-09'],
  ['Dávid Hancko', 'Slovakia', 'Centre-Back', '1997-12-13'],
  ['Gabriel', 'Brazil', 'Centre-Back', '1997-12-19'],
  ['Fikayo Tomori', 'England', 'Centre-Back', '1997-12-19'],
  ['Diogo Jota', 'Portugal', 'Left Winger', '1996-12-04'],
];

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'player-bingo-ages-'));
  const entry = path.join(tempDir, 'entry.mjs');
  const bundle = path.join(tempDir, 'bundle.mjs');
  try {
    fs.writeFileSync(entry, `
export {
  PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY,
  calculatePlayerAgeOnDate,
  getPlayerBingoAgeEligibility,
  getVerifiedPlayerBingoCurrentAge,
  isPlayerBingoCurrentAgeExcluded,
  playerBingoIdentityKey,
} from '${ROOT_URL}/src/data/playerBingoBirthDates.ts';
export { buildCriteria, fetchBingoData, MIN_TILE_SUPPORT } from '${ROOT_URL}/src/lib/playerBingo.ts';
`);
    const esbuild = path.join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild');
    execFileSync(process.execPath, [
      esbuild, entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${bundle}`, '--log-level=error',
    ], { stdio: 'inherit' });
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const {
      PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY,
      buildCriteria,
      calculatePlayerAgeOnDate,
      fetchBingoData,
      getPlayerBingoAgeEligibility,
      getVerifiedPlayerBingoCurrentAge,
      isPlayerBingoCurrentAgeExcluded,
      MIN_TILE_SUPPORT,
      playerBingoIdentityKey,
    } = await import(pathToFileURL(bundle).href);

    section = 1;
    console.log('1) The exact-identity DOB ledger matches all 73 audited records');
    {
      const ledger = CONTROL === 'ledger'
        ? new Map([...PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY].slice(1))
        : PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY;
      if (ledger.size !== EXPECTED.length) fail(`ledger has ${ledger.size} records, expected ${EXPECTED.length}`);
      for (const [name, nationality, position, dob] of EXPECTED) {
        const actual = ledger.get(playerBingoIdentityKey({ name, nationality, position }));
        if (actual !== dob) fail(`${name} (${nationality}, ${position}) has DOB ${String(actual)}, expected ${dob}`);
      }
    }

    section = 2;
    console.log('2) Every DOB has two independent source receipts');
    {
      const receiptPath = path.join(ROOT, 'docs', 'data', 'player-bingo-age-audit-2026-09-02.json');
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      if (CONTROL === 'receipt') receipt.records[0].sources = receipt.records[0].sources.slice(0, 1);
      if (CONTROL === 'slug') {
        const benWhite = receipt.records.find(record => record.name === 'Ben White');
        if (!benWhite) abort('slug control cannot find Ben White');
        benWhite.sources[0] = 'https://www.premierleague.com/players/14548/Mikel-Merino/stats';
      }
      if (receipt.auditDate !== '2026-09-02') fail(`receipt date is ${String(receipt.auditDate)}, expected 2026-09-02`);
      if (receipt.records.length !== EXPECTED.length) fail(`receipt has ${receipt.records.length} records, expected ${EXPECTED.length}`);
      const byKey = new Map(receipt.records.map(record => [playerBingoIdentityKey(record), record]));
      if (byKey.size !== receipt.records.length) fail('receipt contains a duplicate exact identity');
      for (const [name, nationality, position, dob] of EXPECTED) {
        const record = byKey.get(playerBingoIdentityKey({ name, nationality, position }));
        if (!record) { fail(`${name} has no source receipt`); continue; }
        if (record.dob !== dob) fail(`${name} receipt says ${String(record.dob)}, expected ${dob}`);
        const sources = Array.isArray(record.sources) ? record.sources : [];
        const hosts = new Set();
        for (const url of sources) {
          try {
            const parsed = new URL(url);
            hosts.add(parsed.hostname.replace(/^www\./, ''));
            const playerSlug = parsed.hostname.endsWith('premierleague.com')
              ? /\/players\/\d+\/([^/]+)/i.exec(parsed.pathname)?.[1]
              : null;
            const nameTokens = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
            const slugTokens = playerSlug?.toLowerCase().match(/[a-z0-9]+/g) || [];
            if (playerSlug && nameTokens.length >= 2
                && !nameTokens.some(token => token.length >= 3 && slugTokens.includes(token))) {
              fail(`${name} has an obvious cross-player Premier League URL slug: ${playerSlug}`);
            }
          } catch { /* counted below */ }
        }
        if (sources.length < 2 || hosts.size < 2) fail(`${name} does not have two independent direct source URLs`);
      }
      const jota = byKey.get(playerBingoIdentityKey({ name: 'Diogo Jota', nationality: 'Portugal', position: 'Left Winger' }));
      if (jota?.status !== 'excluded-deceased' || jota.sources.length < 3) fail('Diogo Jota receipt does not carry the DOB and two death notices');
      const state = fs.readFileSync(path.join(ROOT, 'docs', 'PROJECT-STATE.md'), 'utf8');
      if (!state.includes('docs/data/player-bingo-age-audit-2026-09-02.json')) fail('PROJECT-STATE does not link the audit receipt');
    }

    section = 3;
    console.log('3) Birthdays, leap days and invalid dates derive correctly');
    {
      const cases = [
        ['day before birthday', '2000-09-02', '2026-09-01', 25],
        ['on birthday', '2000-09-02', '2026-09-02', 26],
        ['day after birthday', '2000-09-02', '2026-09-03', 26],
        ['leap DOB before March in a common year', '2004-02-29', '2026-02-28', 21],
        ['leap DOB after February in a common year', '2004-02-29', '2026-03-01', 22],
        ['leap DOB on leap birthday', '2004-02-29', '2028-02-29', 24],
        ['invalid DOB', '2004-02-30', '2026-09-02', null],
        ['invalid game date', '2004-02-29', '2026-09-31', null],
        ['future DOB', '2027-01-01', '2026-09-02', null],
      ];
      if (CONTROL === 'birthday') cases[1][3] = 25;
      for (const [label, dob, onDate, expectedAge] of cases) {
        const actual = calculatePlayerAgeOnDate(dob, onDate);
        if (actual !== expectedAge) fail(`${label}: got ${String(actual)}, expected ${String(expectedAge)}`);
      }
    }

    section = 4;
    console.log('4) Same-name players do not inherit another identity\'s DOB');
    {
      const portoPepe = { name: 'Pepê', nationality: 'Brazil', position: 'Right Winger' };
      const otherPepe = CONTROL === 'identity'
        ? portoPepe
        : { name: 'Pepe', nationality: 'Brazil', position: 'Centre-Back' };
      if (getVerifiedPlayerBingoCurrentAge(portoPepe, '2026-09-02') !== 29) fail('FC Porto winger Pepê should derive age 29');
      if (getVerifiedPlayerBingoCurrentAge(otherPepe, '2026-09-02') !== null) fail('the other Pepe inherited Pepê\'s DOB');
      if (getVerifiedPlayerBingoCurrentAge({ ...portoPepe, position: 'Centre-Back' }, '2026-09-02') !== null) {
        fail('a same-name player with a different position inherited Pepê\'s DOB');
      }
    }

    section = 5;
    console.log('5) Year-sensitive bounds keep safe rows and reject ambiguous rows');
    {
      const base = { nationality: 'Test', position: 'Goalkeeper' };
      const cases = [
        ['same-year age 20 is safely young', 20, 2026, true, false, 'snapshot-bound'],
        ['same-year age 21 is ambiguous', 21, 2026, false, false, 'snapshot-bound'],
        ['same-year age 28 is ambiguous', 28, 2026, false, false, 'snapshot-bound'],
        ['same-year age 29 is safely old', 29, 2026, false, true, 'snapshot-bound'],
        ['2025 age 19 is safely young', 19, 2025, true, false, 'snapshot-bound'],
        ['2025 age 20 can cross young', 20, 2025, false, false, 'snapshot-bound'],
        ['2025 age 27 can cross old', 27, 2025, false, false, 'snapshot-bound'],
        ['2025 age 28 can cross old', 28, 2025, false, false, 'snapshot-bound'],
        ['2025 age 29 is safely old', 29, 2025, false, true, 'snapshot-bound'],
        ['2024 age 18 is safely young', 18, 2024, true, false, 'snapshot-bound'],
        ['2024 age 19 can cross young', 19, 2024, false, false, 'snapshot-bound'],
        ['2024 age 26 can cross old', 26, 2024, false, false, 'snapshot-bound'],
        ['2024 age 28 is safely old', 28, 2024, false, true, 'snapshot-bound'],
        ['future row fails closed', 20, 2027, false, false, 'unresolved'],
        ['invalid age fails closed', 0, 2026, false, false, 'unresolved'],
      ];
      if (CONTROL === 'bounds') cases[0][3] = false;
      for (const [name, age, year, young, old, basis] of cases) {
        const actual = getPlayerBingoAgeEligibility({ name, ...base, age, year }, '2026-09-02');
        if (actual.is21OrUnder !== young || actual.is29OrOlder !== old || actual.basis !== basis) {
          fail(`${name}: got young=${actual.is21OrUnder}, old=${actual.is29OrOlder}, basis=${actual.basis}`);
        }
        if (actual.exactAge !== null) fail(`${name}: a snapshot bound was exposed as exact age ${actual.exactAge}`);
      }
      const neves = getPlayerBingoAgeEligibility({
        name: 'João Neves', nationality: 'Portugal', position: 'Central Midfield', age: 22, year: 2026,
      }, '2026-09-02');
      if (neves.exactAge !== 21 || !neves.is21OrUnder || neves.basis !== 'verified-dob') {
        fail('an exact verified DOB did not override the snapshot interval');
      }
    }

    section = 6;
    console.log('6) Diogo Jota is excluded from both current-age rules');
    {
      const jota = CONTROL === 'deceased'
        ? { name: 'Diogo Jota', nationality: 'Portugal', position: 'Centre-Forward', age: 28, year: 2025 }
        : { name: 'Diogo Jota', nationality: 'Portugal', position: 'Left Winger', age: 28, year: 2025 };
      if (!isPlayerBingoCurrentAgeExcluded(jota)) fail('Diogo Jota is not in the exact-identity deceased exclusion');
      const eligibility = getPlayerBingoAgeEligibility(jota, '2026-09-02');
      if (eligibility.basis !== 'excluded') fail(`Diogo Jota eligibility basis is ${eligibility.basis}, expected excluded`);
      if (eligibility.exactAge !== null || eligibility.is21OrUnder || eligibility.is29OrOlder) {
        fail('Diogo Jota received current-age eligibility after his death');
      }
      if (isPlayerBingoCurrentAgeExcluded({ ...jota, position: 'Centre-Forward' })) {
        fail('the deceased exclusion leaked to a different exact identity');
      }
    }

    section = 7;
    console.log('7) Current-age criteria use explicit eligibility, not historical age');
    {
      const rows = [
        { name: 'Safe Young Bound', nationality: 'Test', position: 'Goalkeeper', age: 20, year: 2026 },
        { name: 'Ambiguous Young', nationality: 'Test', position: 'Goalkeeper', age: 21, year: 2026 },
        { name: 'Safe Old Bound', nationality: 'Test', position: 'Goalkeeper', age: 29, year: 2026 },
        { name: 'Ambiguous Old', nationality: 'Test', position: 'Goalkeeper', age: 28, year: 2026 },
        { name: 'João Neves', nationality: 'Portugal', position: 'Central Midfield', age: 22, year: 2026 },
        { name: 'Abdukodir Khusanov', nationality: 'Uzbekistan', position: 'Centre-Back', age: 21, year: 2026 },
        { name: 'Brais Méndez', nationality: 'Spain', position: 'Attacking Midfield', age: 28, year: 2026 },
        { name: 'Diogo Jota', nationality: 'Portugal', position: 'Left Winger', age: 28, year: 2025 },
      ];
      const pool = rows.map(row => {
        const eligibility = getPlayerBingoAgeEligibility(row, '2026-09-02');
        return {
          ...row, club: 'Test Club', value: 50_000_000,
          is21OrUnder: eligibility.is21OrUnder,
          is29OrOlder: eligibility.is29OrOlder,
        };
      });
      if (CONTROL === 'category') {
        const ambiguous = pool.find(player => player.name === 'Ambiguous Young');
        ambiguous.is21OrUnder = true;
        ambiguous.is29OrOlder = true;
      }
      const data = {
        pool,
        clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(),
        worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
      };
      const criteria = buildCriteria(data);
      const younger = criteria.find(criterion => criterion.id === 'age-21-under');
      const older = criteria.find(criterion => criterion.id === 'age-29-plus');
      const youngNames = [...(younger?.support || [])].sort().join('|');
      const oldNames = [...(older?.support || [])].sort().join('|');
      if (youngNames !== ['João Neves', 'Safe Young Bound'].sort().join('|')) fail(`young support is ${youngNames}`);
      if (oldNames !== ['Brais Méndez', 'Safe Old Bound'].sort().join('|')) fail(`old support is ${oldNames}`);
    }

    section = 8;
    console.log('8) The seed query has a deterministic total order before limit');
    {
      const source = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'playerBingo.ts'), 'utf8');
      const start = source.indexOf('async function fetchPool()');
      const end = source.indexOf('\n/**', start);
      if (start < 0 || end < 0) abort('could not isolate fetchPool source');
      let body = source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (CONTROL === 'order') body = body.replace(/\s*\.order\('player_name',[^\n]+\)/, '');
      const orderedPieces = [
        ".order('market_value_usd', { ascending: false })",
        ".order('player_name', { ascending: true })",
        ".order('year', { ascending: false })",
        ".order('id', { ascending: true })",
        '.limit(POOL_ROW_FETCH)',
      ];
      let previous = -1;
      for (const piece of orderedPieces) {
        const at = body.indexOf(piece);
        if (at < 0) fail(`seed query is missing ${piece}`);
        else if (at <= previous) fail(`seed query places ${piece} outside the total tie order`);
        if (at >= 0) previous = at;
      }
    }

    if (!CONTROL || CONTROL === 'population' || CONTROL === 'support') {
    const receipt = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'data', 'player-bingo-age-audit-2026-09-02.json'),
      'utf8',
    ));
    const receiptByKey = new Map(receipt.records.map(record => [
      JSON.stringify([record.name, record.nationality, record.position]),
      record,
    ]));
    const gameDateParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    const gameDate = `${gameDateParts.year}-${gameDateParts.month}-${gameDateParts.day}`;
    const gameYear = Number(gameDateParts.year);
    const exactAge = (dob) => {
      const [birthYear, birthMonth, birthDay] = dob.split('-').map(Number);
      const birthdayPassed = Number(gameDateParts.month) > birthMonth
        || (Number(gameDateParts.month) === birthMonth && Number(gameDateParts.day) >= birthDay);
      return gameYear - birthYear - (birthdayPassed ? 0 : 1);
    };
    const snapshotBounds = (player) => {
      if (!Number.isInteger(player.age) || player.age <= 0 || !Number.isInteger(player.year)
          || player.year <= 0 || player.year > gameYear) return null;
      const elapsed = gameYear - player.year;
      return elapsed === 0
        ? { minimum: player.age, maximum: player.age + 1 }
        : { minimum: player.age + elapsed - 1, maximum: player.age + elapsed + 1 };
    };
    const oracleEligibility = (player) => {
      const key = JSON.stringify([player.name, player.nationality, player.position]);
      const audited = receiptByKey.get(key);
      if (audited?.status === 'excluded-deceased') return { is21OrUnder: false, is29OrOlder: false };
      if (audited) {
        const age = exactAge(audited.dob);
        return { is21OrUnder: age <= 21, is29OrOlder: age >= 29 };
      }
      const bounds = snapshotBounds(player);
      return {
        is21OrUnder: Boolean(bounds && bounds.maximum <= 21),
        is29OrOlder: Boolean(bounds && bounds.minimum >= 29),
      };
    };

    let data = null;
    for (let attempt = 1; attempt <= 3 && !data; attempt += 1) {
      try { data = await fetchBingoData(); } catch { data = null; }
      if (!data && attempt < 3) await new Promise(resolve => setTimeout(resolve, 1500));
    }
    if (!data) abort('Supabase unreachable or Player Bingo pool too small. Full-pool age checks did not run.');

    section = 9;
    console.log(`9) All ${data.pool.length} live pool players match the independent current-age oracle`);
    const oracleByName = new Map();
    {
      let ambiguous = 0;
      const unresolved = [];
      const mismatches = [];
      for (const player of data.pool) {
        const bounds = snapshotBounds(player);
        const straddlesYoung = Boolean(bounds && bounds.minimum <= 21 && bounds.maximum > 21);
        const straddlesOld = Boolean(bounds && bounds.minimum < 29 && bounds.maximum >= 29);
        const key = JSON.stringify([player.name, player.nationality, player.position]);
        if (straddlesYoung || straddlesOld) {
          ambiguous += 1;
          if (!receiptByKey.has(key)) unresolved.push(player.name);
        }
        const expected = oracleEligibility(player);
        oracleByName.set(player.name, expected);
        const judged = CONTROL === 'population' && mismatches.length === 0 && expected.is21OrUnder
          ? { ...player, is21OrUnder: !player.is21OrUnder }
          : player;
        if (judged.is21OrUnder !== expected.is21OrUnder || judged.is29OrOlder !== expected.is29OrOlder) {
          mismatches.push(`${player.name}: got ${judged.is21OrUnder}/${judged.is29OrOlder}, expected ${expected.is21OrUnder}/${expected.is29OrOlder}`);
        }
        if ('currentAge' in player || 'exactAge' in player) {
          mismatches.push(`${player.name}: pool exposes a synthetic current age`);
        }
      }
      if (CONTROL === 'population' && mismatches.length === 0) abort('population control could not flip an eligible young player');
      if (ambiguous !== 72) fail(`live pool has ${ambiguous} ambiguous snapshot identities, expected the audited 72`);
      if (unresolved.length > 0) fail(`ambiguous identities missing receipts: ${unresolved.join(', ')}`);
      if (mismatches.length > 0) fail(`${mismatches.length} full-pool age mismatch(es): ${mismatches.slice(0, 4).join('; ')}`);
      console.log(`   ${ambiguous} ambiguous snapshot identities are all covered by exact receipts`);
    }

    section = 10;
    console.log('10) Both current-age tiles match full-pool oracle support and stay playable');
    {
      const criteria = buildCriteria(data);
      const young = criteria.find(criterion => criterion.id === 'age-21-under');
      const old = criteria.find(criterion => criterion.id === 'age-29-plus');
      if (!young || !old) abort('current-age criteria are missing from buildCriteria');
      const expectedYoung = new Set(data.pool.filter(player => oracleByName.get(player.name)?.is21OrUnder).map(player => player.name));
      const expectedOld = new Set(data.pool.filter(player => oracleByName.get(player.name)?.is29OrOlder).map(player => player.name));
      const actualYoung = new Set(young.support);
      const actualOld = new Set(old.support);
      if (CONTROL === 'support') actualYoung.add('__support_control__');
      const sameSet = (left, right) => left.size === right.size && [...left].every(value => right.has(value));
      if (!sameSet(actualYoung, expectedYoung)) fail(`young support has ${actualYoung.size}, oracle has ${expectedYoung.size}`);
      if (!sameSet(actualOld, expectedOld)) fail(`older support has ${actualOld.size}, oracle has ${expectedOld.size}`);
      if (expectedYoung.size < MIN_TILE_SUPPORT) fail(`young support ${expectedYoung.size} is below ${MIN_TILE_SUPPORT}`);
      if (expectedOld.size < MIN_TILE_SUPPORT) fail(`older support ${expectedOld.size} is below ${MIN_TILE_SUPPORT}`);
      console.log(`   age 21 or under: ${expectedYoung.size}; age 29 or older: ${expectedOld.size}; minimum: ${MIN_TILE_SUPPORT}`);
    }
    }

    if (CONTROL) {
      const expected = {
        ledger: { section: 1, count: 2 },
        receipt: { section: 2, count: 1 },
        slug: { section: 2, count: 1 },
        birthday: { section: 3, count: 1 },
        identity: { section: 4, count: 1 },
        bounds: { section: 5, count: 1 },
        deceased: { section: 6, count: 2 },
        category: { section: 7, count: 2 },
        order: { section: 8, count: 1 },
        population: { section: 9, count: 1 },
        support: { section: 10, count: 1 },
      }[CONTROL];
      if (!expected) abort(`unknown control "${CONTROL}"`);
      const fired = bySection[expected.section];
      if (fired === expected.count && failures === expected.count) {
        console.log(`\ncontrol "${CONTROL}": exactly ${expected.count} expected failure(s), the check works`);
        return;
      }
      abort(`control "${CONTROL}": got ${fired} target and ${failures} total failures, expected exactly ${expected.count}`);
    }

    if (failures > 0) {
      console.error(`\nsimPlayerBingoAges: ${failures} failure(s)`);
      process.exitCode = 1;
      return;
    }
    console.log('\nsimPlayerBingoAges: all green');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
