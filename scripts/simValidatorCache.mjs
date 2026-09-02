/**
 * Round 379: the connect-4 validator remembers one attribute at a time.
 *
 * WHAT WAS WRONG. Two players reported the same thing and both were right:
 * "it says couldnt verify your answer every time i click" (soccer-connect-4,
 * 2026-08-30) and "this game does not work at all anything you pick is wrong"
 * (nba-connect-4, 2026-07-21). The validator runs on a free Gemini quota that
 * is DAILY, and Round 378 measured what happens: 42 percent of guesses refused
 * during a normal burst of play, then 14 of 14 once the day's quota was gone,
 * with a retry three seconds later recovering none of them. Once it is spent,
 * the game is dead until it resets.
 *
 * Failing closed is correct and is the July 2026 rule, which is exactly why
 * this looked healthy from the inside: the function behaved as designed. The
 * lie was the message, "please try again", which is true of a blip and false of
 * a spent day, so the player kept clicking into a wall being told to keep
 * clicking.
 *
 * RETRYING HARDER IS NOT THE FIX and was measured not to be. The leverage is in
 * the cache KEY. The old cache stored one row per PAIR of attributes, the
 * narrowest unit there is: the 16 soccer boards hold 507 distinct cells but only
 * 78 distinct attributes, so a pair verdict answers exactly one cell and is
 * thrown away for every other cell asking about the same player. Storing the
 * answer to a SINGLE attribute makes it reusable everywhere. Measured on the
 * live cache: the 105 true verdicts already paid for decompose into 178
 * player-and-attribute facts, which between them answer 590 cells. The same
 * spend, 5.6 times the coverage, and every board added later reuses them free.
 *
 * WHY THIS HARNESS ONLY TALKS TO THE FUNCTION. ai_validation_cache is behind
 * RLS and returns nothing to the anonymous key, which is correct: a public
 * answer cache is a public answer key. A first draft of this file read the
 * table directly, got zero rows and reported the feature missing, which is a
 * harness failing in the same shape as its subject. So it asks the only thing
 * that actually matters anyway: does a player get an answer without the AI.
 *
 * WHAT THIS HOLDS:
 *   1. Cells that were never stored as a pair are answered from cache. These
 *      are real cells, verified live on the day of the round while the AI quota
 *      was completely exhausted, which is what makes the check airtight: with
 *      no quota left, anything other than a refusal MUST have come from the
 *      per attribute facts.
 *   2. Repeating a cell is free. Whatever the function answers it must
 *      remember, which is the property the whole cache rests on.
 *   3. When it does refuse, it tells the truth about why. A refusal that says
 *      "try again" on a day whose quota is gone is the message this round was
 *      partly about.
 *   4. Live coverage probes set cacheOnly, which returns before the AI on a
 *      miss, so a red verification run cannot consume the quota it protects.
 *
 * Round 397 also holds the verified fallback for every cell on classic-8. The
 * research ledger is the source of truth, the migration must contain exactly
 * the same true facts, and the harness proves the 42 cells can be filled with
 * 42 different autocomplete players without asking the AI.
 *
 * NEGATIVE CONTROLS:
 *   VCACHE_CONTROL=nofacts asks section 1 about players nothing has ever been
 *   asked about, so no fact can exist and no cell can be free.
 *   VCACHE_CONTROL=classic8hole removes the two stored facts behind one real
 *   classic-8 candidate, stubs an AI outage, and must catch exactly that cell.
 *   VCACHE_CONTROL=evidencehalf removes one column source from a verified
 *   candidate, and the separate per-attribute evidence fence must catch it.
 *
 * Run: node scripts/simValidatorCache.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.VCACHE_CONTROL || '';
if (CONTROL && !['nofacts', 'classic8hole', 'evidencehalf'].includes(CONTROL)) {
  console.error(`VCACHE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const attrKey = (player, attribute) => `attr|${normalize(player)}|${normalize(attribute)}`;
const pairKey = (player, row, column) => normalize(`${player}|${row}|${column}`);
const sqlText = s => s.replace(/''/g, "'");

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function ask(playerName, rowAttribute, columnAttribute, cacheOnly = false) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 700 * attempt));
    try {
      const r = await fetch(`${URL_}/functions/v1/football-connect4-validate`, {
        method: 'POST', headers: HEAD,
        body: JSON.stringify({ playerName, rowAttribute, columnAttribute, cacheOnly }),
      });
      if (r.ok) return await r.json();
    } catch { /* retry */ }
  }
  return null;
}

/* Cells whose two attributes are each known from OTHER cells, and which were
   never stored as a pair themselves. Verified live in Round 379 with the AI
   quota exhausted, so every one of these came from the per attribute facts.
   If a future round changes the boards these can go stale, and the failure
   message says so rather than blaming the cache. */
const FREE_CELLS = [
  { player: 'Angel Di Maria', row: 'Argentine', col: 'Played for PSG' },
  { player: 'Angel Di Maria', row: 'Argentine', col: 'South American Nationality' },
  { player: 'Angel Di Maria', row: 'Argentine', col: 'Played in the Premier League' },
];

console.log('1) cells never stored as a pair are answered without the AI');
{
  const cases = CONTROL === 'nofacts'
    ? [
        { player: 'zzz nobody atall', row: 'Argentine', col: 'Played for PSG' },
        { player: 'qqq noone either', row: 'Argentine', col: 'Played for PSG' },
      ]
    : FREE_CELLS;
  if (CONTROL === 'nofacts') console.log('   NEGATIVE CONTROL ON (nofacts): asking about players no fact can exist for. Section 1 must go red.');

  let free = 0;
  for (const c of cases) {
    const d = await ask(c.player, c.row, c.col, true);
    const cached = !!d && d.cached === true && d.unverified !== true;
    if (cached) free += 1;
    const how = !d ? 'no answer' : cached ? `free from cache, valid=${d.valid}` : d.cacheMiss ? 'cache-only miss, no AI call' : d.unverified ? 'refused or sent to the AI' : 'answered by the AI';
    console.log(`   ${c.player} / ${c.row} x ${c.col}  ->  ${how}`);
  }
  console.log(`   ${free} of ${cases.length} answered without spending quota`);
  if (free < cases.length) {
    fail(`${cases.length - free} cell(s) had no reusable attribute facts. Either the function stopped consulting the cache, or these probe cells are stale because the boards changed.`);
  }
}

console.log('2) whatever it answers, it remembers');
{
  /* The property the whole cache rests on. Asked twice: the second time must be
     free whatever the first answer was. Uses a cell already known to be cached
     so this costs no quota even on a spent day. */
  const c = FREE_CELLS[0];
  const first = await ask(c.player, c.row, c.col, true);
  const second = await ask(c.player, c.row, c.col, true);
  const ok = !!second && second.cached === true;
  console.log(`   asked twice: first ${first?.cached ? 'cached' : 'live'}, second ${ok ? 'cached' : 'NOT cached'}`);
  if (!ok) fail('the same cell asked twice did not come back from cache the second time, so answers are being paid for repeatedly');
}

console.log('3) a refusal says which kind of refusal it is');
{
  /* Round 378 measured that a spent daily quota does not recover, so telling
     the player to try again is false. This does not force a refusal, because
     doing that on purpose would burn the quota this round exists to protect: it
     checks the honest branch exists in the deployed source instead, and reports
     whether a refusal was seen in passing. */
  const fn = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'football-connect4-validate', 'index.ts'), 'utf8');
  const code = fn.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const hasFlag = /quotaExhausted/.test(code);
  const hasHonestText = /hit its limit for today/.test(code);
  console.log(`   deployed source distinguishes an exhausted day: flag=${hasFlag}, message=${hasHonestText}`);
  if (!hasFlag || !hasHonestText) {
    fail('the validator no longer tells an exhausted quota apart from a momentary failure, so it will invite players to retry into a wall');
  }
  if (!/valid: false, unverified: true/.test(code) && !/valid: false,\s*\n\s*unverified: true/.test(code)) {
    fail('the fail-closed fallback is gone. It must never accept an answer it could not verify (the July 2026 P1).');
  }
  const cacheOnlyIndex = code.indexOf('if (cacheOnly === true)');
  const aiKeyIndex = code.indexOf('const AI_KEY');
  if (cacheOnlyIndex < 0 || aiKeyIndex < 0 || cacheOnlyIndex >= aiKeyIndex) {
    fail('cache-only verification no longer returns before the AI path, so a red live probe can spend quota');
  }
}

console.log('4) classic-8 has a verified, no-quota answer in every cell');
let classic8Control = null;
let evidenceMutationFired = false;
{
  const ledgerPath = path.join(ROOT, 'docs', 'research', 'connect4-classic8-verified.json');
  const migrationPath = path.join(ROOT, 'supabase', 'migrations', '20260901_round_397_connect4_classic8_verified_facts.sql');
  const boardPath = path.join(ROOT, 'src', 'types', 'footballConnect4.ts');
  const sectionStartFailures = failures;

  let ledger = null;
  let migration = '';
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); }
  catch (e) { fail(`the classic-8 research ledger is missing or invalid JSON: ${e.message}`); }
  try { migration = fs.readFileSync(migrationPath, 'utf8'); }
  catch (e) { fail(`the classic-8 verified-facts migration is missing: ${e.message}`); }

  const boardSource = fs.readFileSync(boardPath, 'utf8');
  const boardMatch = boardSource.match(/id:\s*['"]classic-8['"][\s\S]*?columnAttributes:\s*\[([\s\S]*?)\],\s*rowAttributes:\s*\[([\s\S]*?)\]/);
  const boardColumns = boardMatch ? [...boardMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]) : [];
  const boardRows = boardMatch ? [...boardMatch[2].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]) : [];
  if (boardColumns.length !== 7 || boardRows.length !== 6) {
    fail(`classic-8 board parsing found ${boardRows.length} rows by ${boardColumns.length} columns, expected 6 by 7`);
  }

  if (ledger && migration) {
    if (ledger.boardId !== 'classic-8') fail(`ledger boardId is ${JSON.stringify(ledger.boardId)}, expected "classic-8"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ledger.verifiedOn || '')) fail('ledger verifiedOn is not an ISO date');
    if (ledger.verifiedOn > new Date().toISOString().slice(0, 10)) fail(`ledger verification date ${ledger.verifiedOn} is in the future`);
    if (JSON.stringify(ledger.rows) !== JSON.stringify(boardRows)) fail('ledger rows do not exactly match the shipped classic-8 board');
    if (JSON.stringify(ledger.columns) !== JSON.stringify(boardColumns)) fail('ledger columns do not exactly match the shipped classic-8 board');

    const cells = Array.isArray(ledger.cells) ? ledger.cells : [];
    if (CONTROL === 'evidencehalf') {
      const sourceIds = cells[0]?.candidates?.[0]?.columnSourceIds;
      if (!Array.isArray(sourceIds) || sourceIds.length < 2) {
        console.error('control cannot run: the first candidate does not have two column sources to reduce');
        process.exit(1);
      }
      sourceIds.pop();
      evidenceMutationFired = true;
      console.log('   NEGATIVE CONTROL ON (evidencehalf): one verified column source was removed in memory. The evidence fence must go red.');
    }
    const expectedCellKeys = new Set(boardRows.flatMap(row => boardColumns.map(column => `${row}\u0000${column}`)));
    const seenCellKeys = new Set();
    const expectedFacts = new Map();
    const expectedPairs = new Map();
    let evidenceProblems = 0;

    for (const cell of cells) {
      const cellKey = `${cell.row}\u0000${cell.column}`;
      if (!expectedCellKeys.has(cellKey)) { fail(`ledger contains a cell not on classic-8: ${cell.row} x ${cell.column}`); continue; }
      if (seenCellKeys.has(cellKey)) { fail(`ledger repeats the cell ${cell.row} x ${cell.column}`); continue; }
      seenCellKeys.add(cellKey);
      if (!Array.isArray(cell.candidates) || cell.candidates.length === 0) {
        fail(`ledger has no verified candidate for ${cell.row} x ${cell.column}`);
        continue;
      }
      for (const candidate of cell.candidates) {
        if (typeof candidate.player !== 'string' || !candidate.player.trim()) {
          fail(`ledger has a candidate without a player name in ${cell.row} x ${cell.column}`);
          continue;
        }
        const evidenceSets = [
          { attribute: cell.row, sourceIds: candidate.rowSourceIds },
          { attribute: cell.column, sourceIds: candidate.columnSourceIds },
        ];
        for (const evidence of evidenceSets) {
          const sourceIds = Array.isArray(evidence.sourceIds) ? evidence.sourceIds : [];
          const sources = sourceIds.map(id => ledger.sourceCatalog?.[id]).filter(Boolean);
          const domains = new Set();
          for (const source of sources) {
            try { domains.add(new URL(source.url).hostname.replace(/^www\./, '')); }
            catch { /* reported below */ }
          }
          const describedForPlayer = sources.every(source => normalize(source.confirms || '').includes(normalize(candidate.player)));
          if (sources.length !== sourceIds.length || sources.length < 2 || domains.size < 2 || !describedForPlayer || sources.some(source => typeof source.title !== 'string' || typeof source.url !== 'string' || typeof source.confirms !== 'string')) {
            evidenceProblems += 1;
            fail(`${candidate.player} does not carry two independent sources for ${evidence.attribute}, with descriptions that explicitly name the player`);
          }
        }
        expectedFacts.set(attrKey(candidate.player, cell.row), candidate.player);
        expectedFacts.set(attrKey(candidate.player, cell.column), candidate.player);
        expectedPairs.set(pairKey(candidate.player, cell.row, cell.column), candidate.player);
      }
    }
    const missingCellKeys = [...expectedCellKeys].filter(key => !seenCellKeys.has(key));
    if (missingCellKeys.length) fail(`${missingCellKeys.length} classic-8 cell(s) are absent from the ledger`);
    if (cells.length !== 42) fail(`ledger contains ${cells.length} cells, expected exactly 42`);
    console.log(`   ledger: ${seenCellKeys.size}/42 cells, ${expectedPairs.size} pair verdicts, ${expectedFacts.size} attribute facts, ${evidenceProblems} evidence problem(s)`);

    const migratedPairs = new Map();
    const migratedFacts = new Map();
    const verifiedCellBlock = migration.match(/verified_cells\s*\([^)]*\)\s+as\s*\(\s*values([\s\S]*?)\),\s*verified_rows/i)?.[1] || '';
    const migratedCells = [];
    for (const m of verifiedCellBlock.matchAll(/\(\s*'((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\s*\)/g)) {
      const [player, row, column] = [sqlText(m[1]), sqlText(m[2]), sqlText(m[3])];
      migratedCells.push({ player, row, column });
      migratedPairs.set(pairKey(player, row, column), player);
      migratedFacts.set(attrKey(player, row), player);
      migratedFacts.set(attrKey(player, column), player);
    }
    const migrationCode = migration.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, ' ');
    if (!/insert\s+into\s+public\.ai_validation_cache/i.test(migrationCode)) fail('migration does not insert into public.ai_validation_cache');
    if (!/on\s+conflict\s*\(\s*game\s*,\s*cache_key\s*\)\s+do\s+update/i.test(migrationCode)) fail('migration is not idempotent with an upsert on game and cache_key');
    if (!/set\s+verdict\s*=\s*excluded\.verdict/i.test(migrationCode)) fail('migration does not overwrite stale pair verdicts with the verified verdict');
    if (!/jsonb_build_object\s*\(\s*'match'\s*,\s*true/i.test(migrationCode)) fail('migration does not write explicit true attribute verdicts');
    if (!/jsonb_build_object\s*\(\s*'valid'\s*,\s*true/i.test(migrationCode)) fail('migration does not write explicit true pair verdicts');
    if (!/'matchesRow'\s*,\s*true/i.test(migrationCode) || !/'matchesColumn'\s*,\s*true/i.test(migrationCode)) {
      fail('migration pair verdicts do not explicitly preserve both verified attribute results');
    }
    if (/jsonb_build_object\s*\(\s*'match'\s*,\s*false/i.test(migrationCode)) fail('migration contains an inferred false verdict, which this round must never add');
    if (/jsonb_build_object\s*\(\s*'valid'\s*,\s*false/i.test(migrationCode)) fail('migration contains an inferred false pair verdict, which this round must never add');
    if (!/public\.fold_name\s*\(\s*player_name\s*\|\|\s*'\|'\s*\|\|\s*row_attribute\s*\|\|\s*'\|'\s*\|\|\s*column_attribute\s*\)/i.test(migrationCode)) {
      fail('migration pair keys do not use the same accent-folded player|row|column shape as the deployed validator');
    }
    if ((migrationCode.match(/'attr\|'\s*\|\|\s*public\.fold_name/gi) || []).length < 2) {
      fail('migration does not derive both row and column attribute keys with public.fold_name');
    }

    const extraFacts = [...migratedFacts.keys()].filter(key => !expectedFacts.has(key));
    const absentFacts = [...expectedFacts.keys()].filter(key => !migratedFacts.has(key));
    const wrongFactNames = [...expectedFacts].filter(([key, player]) => migratedFacts.has(key) && migratedFacts.get(key) !== player);
    const extraPairs = [...migratedPairs.keys()].filter(key => !expectedPairs.has(key));
    const absentPairs = [...expectedPairs.keys()].filter(key => !migratedPairs.has(key));
    const wrongPairNames = [...expectedPairs].filter(([key, player]) => migratedPairs.has(key) && migratedPairs.get(key) !== player);
    if (extraFacts.length) fail(`migration contains ${extraFacts.length} attribute fact(s) not present in the two-source ledger`);
    if (absentFacts.length) fail(`migration omits ${absentFacts.length} ledger attribute fact(s)`);
    if (wrongFactNames.length) fail(`migration stores the wrong full name for ${wrongFactNames.length} attribute fact(s)`);
    if (extraPairs.length) fail(`migration contains ${extraPairs.length} pair verdict(s) not present in the two-source ledger`);
    if (absentPairs.length) fail(`migration omits ${absentPairs.length} ledger pair verdict(s)`);
    if (wrongPairNames.length) fail(`migration stores the wrong full name for ${wrongPairNames.length} pair verdict(s)`);
    if (migratedCells.length !== expectedPairs.size) fail(`migration contains ${migratedCells.length} verified cell rows, expected ${expectedPairs.size}`);
    console.log(`   migration: ${migratedPairs.size}/${expectedPairs.size} pairs and ${migratedFacts.size}/${expectedFacts.size} attributes present, only true verdicts`);

    const playablePairs = new Map(migratedPairs);
    const playableFacts = new Map(migratedFacts);
    let targetCellKey = null;
    let removedFacts = 0;
    if (CONTROL === 'classic8hole' && cells[0]?.candidates?.[0]) {
      const target = cells[0];
      targetCellKey = `${target.row}\u0000${target.column}`;
      for (const candidate of target.candidates) {
        for (const key of [pairKey(candidate.player, target.row, target.column)]) {
          if (playablePairs.delete(key)) removedFacts += 1;
        }
        for (const key of [attrKey(candidate.player, target.row), attrKey(candidate.player, target.column)]) {
          if (playableFacts.delete(key)) removedFacts += 1;
        }
      }
      console.log(`   NEGATIVE CONTROL ON (classic8hole): removed every pair and attribute path for ${target.candidates.length} real candidate(s), ${removedFacts} rows total. Exactly ${target.row} x ${target.column} must lose its no-quota answer.`);
    }

    const outage = () => ({ valid: false, unverified: true, reason: 'simulated AI outage' });
    const resolve = (player, row, column) => {
      if (playablePairs.has(pairKey(player, row, column))) return { valid: true, cached: true };
      const rowFact = playableFacts.has(attrKey(player, row));
      const columnFact = playableFacts.has(attrKey(player, column));
      return rowFact && columnFact ? { valid: true, cached: true } : outage();
    };
    const uncovered = [];
    for (const cell of cells) {
      const free = cell.candidates.some(candidate => {
        const result = resolve(candidate.player, cell.row, cell.column);
        return result.valid === true && result.cached === true && result.unverified !== true;
      });
      if (!free) uncovered.push(`${cell.row}\u0000${cell.column}`);
    }
    for (const key of uncovered) {
      const [row, column] = key.split('\u0000');
      fail(`classic-8 has no verified cached candidate for ${row} x ${column} during an AI outage`);
    }
    console.log(`   outage fixture: ${42 - uncovered.length}/42 cells still answer from verified cache`);

    const unknown = resolve('zzz unverified player', boardRows[0], boardColumns[0]);
    if (unknown.valid !== false || unknown.unverified !== true || unknown.cached === true) {
      fail('an unknown player was accepted or penalized when the AI outage stub could not verify the answer');
    }

    const matchForPlayer = new Map();
    const visit = (cellIndex, seenPlayers) => {
      for (const candidate of cells[cellIndex]?.candidates || []) {
        const playerKey = normalize(candidate.player);
        if (seenPlayers.has(playerKey)) continue;
        seenPlayers.add(playerKey);
        const previousCell = matchForPlayer.get(playerKey);
        if (previousCell === undefined || visit(previousCell, seenPlayers)) {
          matchForPlayer.set(playerKey, cellIndex);
          return true;
        }
      }
      return false;
    };
    let matching = 0;
    for (let i = 0; i < cells.length; i++) if (visit(i, new Set())) matching += 1;
    if (matching !== 42) fail(`classic-8 has only a ${matching}-cell distinct-player matching, so the board cannot be filled without reusing a name`);
    console.log(`   distinct-player proof: ${matching}/42 cells can use different names`);

    if (CONTROL === '') {
      const playerForCell = new Map([...matchForPlayer].map(([player, cellIndex]) => [cellIndex, player]));
      let liveCached = 0;
      let stoppedForQuota = false;
      for (let batchStart = 0; batchStart < cells.length && !stoppedForQuota; batchStart += 15) {
        const batchEnd = Math.min(batchStart + 15, cells.length);
        for (let i = batchStart; i < batchEnd; i++) {
          const playerKey = playerForCell.get(i);
          const candidate = cells[i].candidates.find(c => normalize(c.player) === playerKey);
          const result = await ask(candidate.player, cells[i].row, cells[i].column, true);
          const cached = !!result && result.valid === true && result.cached === true && result.unverified !== true;
          if (!cached) {
            const how = !result ? 'no response' : result.unverified ? 'AI outage fallback' : `valid=${result.valid}, cached=${result.cached}`;
            fail(`live edge did not return the verified cache hit for ${candidate.player} at ${cells[i].row} x ${cells[i].column}: ${how}`);
            stoppedForQuota = true;
            console.log('   stopped live probes at the first cache miss so an unapplied migration cannot spend the AI quota');
            break;
          }
          liveCached += 1;
        }
        if (!stoppedForQuota && batchEnd < cells.length) {
          console.log(`   live edge: ${liveCached}/42 cached probes passed. Waiting 61 seconds for the 20-per-minute function limit.`);
          await new Promise(resolveWait => setTimeout(resolveWait, 61_000));
        }
      }
      if (!stoppedForQuota && liveCached !== 42) fail(`live edge returned only ${liveCached}/42 required verified cache hits`);
      if (!stoppedForQuota) console.log(`   live edge: ${liveCached}/42 cells returned valid=true, cached=true, unverified=false`);
    }

    const candidateNames = [...new Set(cells.flatMap(cell => (cell.candidates || []).map(candidate => candidate.player)))];
    const autocompleteNames = new Set();
    let autocompleteReadFailed = false;
    for (let i = 0; i < candidateNames.length; i += 20) {
      const chunk = candidateNames.slice(i, i + 20);
      const inList = chunk.map(name => `"${name.replace(/"/g, '\\"')}"`).join(',');
      try {
        const r = await fetch(`${URL_}/rest/v1/player_market_values?select=player_name&player_name=in.(${encodeURIComponent(inList)})&limit=1000`, { headers: HEAD });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        for (const row of await r.json()) autocompleteNames.add(normalize(row.player_name));
      } catch (e) {
        autocompleteReadFailed = true;
        fail(`could not check classic-8 candidates against player_market_values: ${e.message}`);
        break;
      }
    }
    if (!autocompleteReadFailed) {
      const absentPlayers = candidateNames.filter(name => !autocompleteNames.has(normalize(name)));
      if (absentPlayers.length) fail(`${absentPlayers.length} verified candidate(s) are missing from the autocomplete source: ${absentPlayers.join(', ')}`);
      console.log(`   autocomplete: ${candidateNames.length - absentPlayers.length}/${candidateNames.length} verified names reachable`);
    }

    classic8Control = {
      startFailures: sectionStartFailures,
      addedFailures: failures - sectionStartFailures,
      removedFacts,
      expectedRemovedFacts: cells[0]?.candidates?.length * 3,
      targetCellKey,
      uncovered,
    };
  }
}

console.log('');
if (CONTROL) {
  if (CONTROL === 'evidencehalf') {
    const exactEvidenceFailure = evidenceMutationFired && classic8Control &&
      classic8Control.startFailures === 0 && classic8Control.addedFailures === 1;
    if (exactEvidenceFailure) {
      console.log('simValidatorCache control (evidencehalf): green. Removing one attribute source was caught exactly once.');
      process.exit(0);
    }
    console.error('simValidatorCache control (evidencehalf): RED. The source mutation did not produce exactly one evidence failure on an otherwise green baseline.');
    process.exit(1);
  }
  if (CONTROL === 'classic8hole') {
    const exactHole = classic8Control &&
      classic8Control.startFailures === 0 &&
      classic8Control.removedFacts === classic8Control.expectedRemovedFacts &&
      classic8Control.uncovered.length === 1 &&
      classic8Control.uncovered[0] === classic8Control.targetCellKey &&
      classic8Control.addedFailures === 1;
    if (exactHole) {
      console.log('simValidatorCache control (classic8hole): green. Removing one candidate\'s verified facts caught exactly its uncovered cell.');
      process.exit(0);
    }
    console.error('simValidatorCache control (classic8hole): RED. The mutation did not produce exactly one isolated classic-8 hole on an otherwise green baseline.');
    process.exit(1);
  }
  if (failures > 0) { console.log(`simValidatorCache control (${CONTROL}): green. The absent reuse was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simValidatorCache control (${CONTROL}): RED. Cells with no facts behind them came back free.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simValidatorCache: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simValidatorCache: green. One answer per attribute, reused across every board that asks.');
