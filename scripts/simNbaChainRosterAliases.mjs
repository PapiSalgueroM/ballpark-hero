import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const edge = new URL('../supabase/functions/nba-chain-validate/index.ts', import.meta.url);
const { outputText, diagnostics } = ts.transpileModule(readFileSync(edge, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.deepEqual(diagnostics, []);

const stint = (player_name, name_folded, team, first_season, last_season) => ({
  player_name, name_folded, team, first_season, last_season, person_key: null,
});
// Projection of the live 2026-11-10 records relevant to these links.
const rows = [
  stint('J.R. Smith', 'j r smith', 'NOH', 2004, 2004),
  stint('J.R. Smith', 'j r smith', 'NOK', 2005, 2005),
  stint('J.R. Smith', 'j r smith', 'DEN', 2006, 2010),
  stint('J.R. Smith', 'j r smith', 'NYK', 2011, 2014),
  stint('J.R. Smith', 'j r smith', 'CLE', 2014, 2018),
  stint('J.R. Smith', 'j r smith', 'LAL', 2019, 2019),
  stint('LeBron James', 'lebron james', 'CLE', 2014, 2017),
  stint('LeBron James', 'lebron james', 'LAL', 2018, 2024),
  stint('Robert Williams', 'robert williams', 'BOS', 2018, 2022),
  stint('Robert Williams', 'robert williams', 'POR', 2023, 2024),
  stint('Jayson Tatum', 'jayson tatum', 'BOS', 2017, 2024),
];

async function validate(previousPlayer, newPlayer, stints = rows, failToken = '') {
  const supabase = {
    from(table) {
      let data = stints;
      let error = null;
      return {
        select() { return this; },
        ilike(column, pattern) {
          const token = pattern.slice(1, -1).toLowerCase();
          data = data.filter(row => row[column].toLowerCase().includes(token));
          return this;
        },
        in(column, values) {
          if (values.includes(failToken)) error = { message: 'fixture read failed' };
          data = data.filter(row => values.includes(row[column]));
          return this;
        },
        eq(column, value) { data = data.filter(row => row[column] === value); return this; },
        async limit(limit) { return { data: error ? null : data.slice(0, limit), error }; },
        async maybeSingle() {
          assert.equal(table, 'nba_team_codes');
          return { data: null };
        },
      };
    },
  };
  let handler;
  runInNewContext(outputText, {
    exports: {},
    require(url) {
      if (url === 'https://deno.land/std@0.168.0/http/server.ts') {
        return { serve: fn => { handler = fn; } };
      }
      assert.equal(url, 'https://esm.sh/@supabase/supabase-js@2.45.0');
      return { createClient: () => supabase };
    },
    Deno: { env: { get: () => 'fixture' } },
    Response,
    console,
  });
  const response = await handler(new Request('https://fixture.test', {
    method: 'POST',
    body: JSON.stringify({ previousPlayer, newPlayer }),
  }));
  assert.equal(response.status, 200);
  return response.json();
}

const smith = await validate('LeBron James', 'JR Smith');
const williams = await validate('Jayson Tatum', 'Robert Williams III');
assert.deepEqual(
  [[smith.valid, smith.fullName, smith.connection], [williams.valid, williams.fullName, williams.connection]],
  [[true, 'J.R. Smith', 'CLE (2014-2017)'], [true, 'Robert Williams', 'BOS (2018-2022)']],
  'The current roster labels must resolve to the two verified archive overlaps',
);
assert.equal((await validate('JR Smith', 'LeBron James')).valid, true);
assert.equal((await validate('Robert Williams III', 'Jayson Tatum')).valid, true);
console.log(`Both roster spellings resolve in both directions: ${smith.connection} and ${williams.connection}`);
assert.match((await validate('Robert Williams III', 'Robert Williams')).reason, /same player/i);
assert.match((await validate('J.R. Smith', 'JR Smith')).reason, /same player/i);
assert.equal((await validate('Jayson Tatum', 'JR Smith')).valid, false);

const exactRows = [...rows, stint('Robert Williams III', 'robert williams iii', 'FIXTURE', 2001, 2002)];
const exact = await validate('Jayson Tatum', 'Robert Williams III', exactRows);
assert.equal(exact.valid, false, 'An exact spelling must take precedence over the fallback');
assert.equal(exact.fullName, 'Robert Williams III');
assert.equal((await validate('Jayson Tatum', 'Robert Williams Jr.')).valid, false);
console.log('Exact spellings win and repeat, wrong-team and unsupported suffix links are refused');

const missing = await validate('LeBron James', 'JR Smith', rows.filter(row => row.name_folded !== 'j r smith'));
assert.equal(missing.valid, false);
assert.equal(missing.unverified, true);
const failed = await validate('Jayson Tatum', 'Robert Williams III', rows, 'robert williams');
assert.equal(failed.valid, false);
assert.equal(failed.unverified, true);
const rawExactRows = [...rows, stint('JR Smith', 'jr smith', 'CLE', 2014, 2018)];
assert.equal((await validate('LeBron James', 'JR Smith', rawExactRows, 'jr smith')).valid, true);
const full = Array.from({ length: 400 }, (_, i) => stint('Fixture Williams', `fixture ${i} williams`, 'FIXTURE', 2001, 2002));
assert.equal((await validate('Jayson Tatum', 'Robert Williams III', [...full, ...rows])).valid, true);
assert.equal((await validate('Jayson Tatum', 'Robert Williams III', [...full, ...exactRows])).valid, false);
const repeated = Array.from({ length: 400 }, () => rows.find(row => row.name_folded === 'robert williams'));
const truncated = await validate('Jayson Tatum', 'Robert Williams III', [...repeated, ...rows]);
assert.equal(truncated.valid, false);
assert.equal(truncated.unverified, true);

console.log('simNbaChainRosterAliases: missing, failed and capped alias reads defer, with raw exact fallback preserved');

// Same archive spelling, two separate keyed people. Keep the mapped answer retryable.
const williamsRows = rows.filter(row => row.name_folded === 'robert williams');
const withWilliams = variants => [...rows.filter(row => row.name_folded !== 'robert williams'), ...variants];
const rob = stint('Rob Williams', 'rob williams', 'DEN', 1982, 1983);
const denver = stint('Fixture Denver Teammate', 'fixture denver teammate', 'DEN', 1982, 1983);
const boston = stint('Fixture Boston Teammate', 'fixture boston teammate', 'BOS', 2020, 2020);
const normalWilliams = await validate('Jayson Tatum', 'Robert Williams III', [...rows, rob, denver]);
assert.equal(normalWilliams.valid, true);
assert.equal((await validate('Fixture Denver Teammate', 'Robert Williams III', [...rows, rob, denver])).valid, false);
assert.equal((await validate('Fixture Denver Teammate', 'Rob Williams', [...rows, rob, denver])).valid, true);

const keyed = williamsRows.map(row => ({ ...row, person_key: 'fixture-one-person' }));
assert.equal((await validate('Jayson Tatum', 'Robert Williams III', withWilliams(keyed))).valid, true);
for (const variants of [
  [keyed[0], { ...keyed[1], person_key: 'fixture-different-person' }],
  [keyed[0], williamsRows[1]],
  [...williamsRows, stint('Robert Williams', 'robert williams', 'DEN', 1982, 1983)],
  [williamsRows[0]],
  [...williamsRows, williamsRows[0]],
  [stint('Robert Williams', 'robert williams', 'BOS', 2020, 2020), williamsRows[1]],
]) {
  const answer = await validate('Fixture Boston Teammate', 'Robert Williams III', [...withWilliams(variants), boston]);
  assert.equal(answer.valid, false);
  assert.equal(answer.unverified, true);
}
const smithRows = rows.filter(row => row.name_folded === 'j r smith');
const withSmith = variants => [...rows.filter(row => row.name_folded !== 'j r smith'), ...variants];
const keyedSmith = smithRows.map(row => ({ ...row, person_key: 'fixture-smith' }));
assert.equal((await validate('LeBron James', 'JR Smith', withSmith(keyedSmith))).valid, true);
const splitSmith = await validate('LeBron James', 'JR Smith', withSmith([
  { ...keyedSmith[0], person_key: 'fixture-other-smith' }, ...keyedSmith.slice(1),
]));
assert.equal(splitSmith.valid, false);
assert.equal(splitSmith.unverified, true);
console.log('NBA Chain alias identity: exact known unkeyed stints, one shared key and a distinct historical Rob Williams held');
