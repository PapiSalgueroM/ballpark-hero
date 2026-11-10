/* Remote-only fictional receipts for NBA Chain initials and resolver guards. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline QA only');
assert(process.env.NBA_CHAIN_NAME_VARIANTS_RAW && process.env.NBA_CHAIN_NAME_VARIANTS_GUARDS_RAW, 'Both exact RAW evidence destinations are required');
const root = process.cwd();
const output = path.resolve(root, process.env.NBA_CHAIN_NAME_VARIANTS_RAW);
const guardOutput = path.resolve(root, process.env.NBA_CHAIN_NAME_VARIANTS_GUARDS_RAW);
assert(output !== guardOutput && [output, guardOutput].every(file => file.startsWith(root + path.sep)), 'Both receipts stay in the isolated checkout');

const edgePath = 'supabase/functions/nba-chain-validate/index.ts';
const originalBlob = 'ae48e575f499f4ad6ca9d4930aae30bd636652b3';
const fixedBlob = '02ad604c9115af575d57eb648bfb7a3e48dbef2d';
const expectedBlob = process.env.NBA_CHAIN_NAME_VARIANTS_EDGE_BLOB || fixedBlob;
assert.match(expectedBlob, /^[a-f0-9]{40}$/);
const edgeBytes = readFileSync(path.join(root, edgePath));
const blob = createHash('sha1').update('blob ' + edgeBytes.length + '\0').update(edgeBytes).digest('hex');
const sourceSHA = createHash('sha256').update(edgeBytes).digest('hex');
assert.equal(blob, expectedBlob, 'Exact physically held edge handler');
if (blob === originalBlob) assert.equal(sourceSHA, 'ea05cc652d9e361e69f636feab23c96c594a20bc78955501615a69a65b7af6d5');
if (blob === fixedBlob) assert.equal(sourceSHA, '831f2d7b064f2f8e87626823ccab4e46d74aed7ac13b2ae4c2100c5996cc5446');
assert.equal(ts.version, '5.8.3', 'Exact locked TypeScript version');

const expectedImports = [
  ['https://deno.land/std@0.168.0/http/server.ts', 'serve'],
  ['https://esm.sh/@supabase/supabase-js@2.45.0', 'createClient'],
];
const edgeText = edgeBytes.toString('utf8');
const parsed = ts.createSourceFile(edgePath, edgeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.deepEqual(parsed.parseDiagnostics, []);
const importNodes = parsed.statements.filter(ts.isImportDeclaration);
const imports = importNodes.map(node => {
  assert(ts.isStringLiteral(node.moduleSpecifier));
  const clause = node.importClause;
  assert(clause && !clause.isTypeOnly && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings));
  const [binding] = clause.namedBindings.elements;
  assert.equal(clause.namedBindings.elements.length, 1);
  assert(!binding.propertyName && !binding.isTypeOnly);
  return [node.moduleSpecifier.text, binding.name.text];
});
assert.deepEqual(imports, expectedImports, 'Exact executable import list');
const transpiled = ts.transpileModule(edgeText, {
  fileName: edgePath,
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.deepEqual(transpiled.diagnostics ?? [], [], 'Clean locked transpilation');
const source = { path: edgePath, blob, sha256: sourceSHA, typescript: ts.version, imports: imports.map(([url]) => url) };

const teams = [
  { team_code: "FIC", team_name: "Fixture Comets" },
  { team_code: "FXO", team_name: "Fixture Lynx" },
];
const stint = (player_name, name_folded, team, first_season, last_season) => ({
  player_name, name_folded, team, first_season, last_season,
});
const harbor = stint("Fixture Lead Harbor", "fixture lead harbor", "FIC", 2019, 2021);
const summit = stint("Fixture Lead Summit", "fixture lead summit", "FXO", 2019, 2021);
const timberJr = stint("Fixture Rowan Timber Jr", "fixture rowan timber jr", "FIC", 2020, 2023);
const timberIII = stint("Fixture Rowan Timber III", "fixture rowan timber iii", "FXO", 2020, 2023);
const input = (id, kind, previousPlayer, newPlayer, stints, rejectFoldedToken = null) => ({
  id, kind, request: { previousPlayer, newPlayer }, fixture: { stints, teams, rejectFoldedToken },
});
const inputs = [
  input("initials-variant", "variant", "Fixture Lead Harbor", "Fixture J.R. Avery", [
    harbor,
    stint("Fixture JR Avery", "fixture jr avery", "FIC", 2020, 2023),
  ]),
  input("suffix-variant", "variant", "Fixture Lead Harbor", "Fixture Rowan Timber III", [
    harbor,
    stint("Fixture Rowan Timber", "fixture rowan timber", "FIC", 2020, 2023),
  ]),
  input("exact-overlap", "control", "Fixture Lead Harbor", "Fixture Exact Lane", [
    harbor,
    stint("Fixture Exact Lane", "fixture exact lane", "FIC", 2020, 2023),
  ]),
  input("no-overlap", "control", "Fixture Lead Harbor", "Fixture Late Stone", [
    harbor,
    stint("Fixture Late Stone", "fixture late stone", "FIC", 2022, 2023),
  ]),
  input("explicit-iii-no-jr-overlap", "control", "Fixture Lead Harbor", "Fixture Rowan Timber III", [
    harbor,
    timberJr,
    timberIII,
  ]),
  input("explicit-jr-no-iii-overlap", "control", "Fixture Lead Summit", "Fixture Rowan Timber Jr", [
    summit,
    timberJr,
    timberIII,
  ]),
  input("recent-coverage-gap", "control", "Fixture Current Vale", "Fixture Current Reed", [
    stint("Fixture Current Vale", "fixture current vale", "FIC", 2023, 2024),
    stint("Fixture Current Reed", "fixture current reed", "FXO", 2024, 2024),
  ]),
  input("fixture-read-failure", "control", "Fixture Lead Harbor", "Fixture Read Fault", [
    harbor,
    stint("Fixture Read Fault", "fixture read fault", "FIC", 2020, 2023),
  ], "fault"),
];

const compactAvery = stint("Fixture JR Avery", "fixture jr avery", "FIC", 2020, 2023);
const exactLane = stint("Fixture Exact Lane", "fixture exact lane", "FIC", 2020, 2023);
const dottedAvery = stint("Fixture J.R. Avery", "fixture j r avery", "FIC", 2020, 2023);
const dottedAveryOtherTeam = stint("Fixture J.R. Avery", "fixture j r avery", "FXO", 2020, 2023);
const capFillers = Array.from({ length: 400 }, (_, index) => {
  const suffix = String(index).padStart(3, '0');
  return stint('Fixture Filler ' + suffix + ' Avery', 'fixture filler ' + suffix + ' avery', 'FXO', 2020, 2023);
});
const guardInput = (id, previousPlayer, newPlayer, stints, foldedErrorToken = null) => ({
  id, kind: 'guard', request: { previousPlayer, newPlayer },
  fixture: { stints, teams, rejectFoldedToken: null, foldedErrorToken },
});
const alternateAvery = stint('Fixture Jr Avery', 'fixture jr avery', 'FXO', 2016, 2018);
const keyedAvery = { ...compactAvery, person_key: 'fixture-avery-one' };
const keyedAlternateAvery = { ...alternateAvery, person_key: 'fixture-avery-one' };
const identityGuard = (id, rows, error = null) => {
  const fixture = guardInput(id, 'Fixture Lead Harbor', 'Fixture J.R. Avery', [harbor, compactAvery, alternateAvery]);
  fixture.fixture.identity = { rows, error };
  return fixture;
};
const guardInputs = [
  guardInput("reverse-compact-input-dotted-row", "Fixture Lead Harbor", "Fixture JR Avery", [
    harbor,
    dottedAvery,
  ]),
  guardInput("spaced-initials-stay-distinct", "Fixture Lead Harbor", "Fixture J R Avery", [
    harbor,
    compactAvery,
  ]),
  guardInput("resolved-self-link", "Fixture J.R. Avery", "Fixture JR Avery", [
    compactAvery,
  ]),
  guardInput("exact-spelling-precedence", "Fixture Lead Harbor", "Fixture J.R. Avery", [
    harbor,
    compactAvery,
    dottedAveryOtherTeam,
  ]),
  guardInput("ambiguous-dotted-initials", "Fixture Lead Harbor", "Fixture J.R. Kai T.V. Avery", [
    harbor,
    stint("Fixture JR Kai T.V. Avery", "fixture jr kai t v avery", "FIC", 2020, 2023),
    stint("Fixture J.R. Kai TV Avery", "fixture j r kai tv avery", "FIC", 2020, 2023),
  ]),
  guardInput("truncated-folded-fallback", "Fixture Lead Harbor", "Fixture J.R. Avery", [
    harbor,
    compactAvery,
    ...capFillers,
  ]),
  guardInput("folded-error-raw-exact-only", "Fixture Lead Harbor", "Fixture J.R. Avery", [
    harbor,
    compactAvery,
  ], "avery"),
  guardInput("folded-error-raw-exact-positive", "Fixture Lead Harbor", "Fixture Exact Lane", [
    harbor,
    exactLane,
  ], "lane"),
  identityGuard('keyed-multiple-stints-reordered', [keyedAlternateAvery, keyedAvery]),
  identityGuard('conflicting-person-keys', [keyedAvery, { ...keyedAlternateAvery, person_key: 'fixture-avery-two' }]),
  identityGuard('mixed-keyed-and-unkeyed-stints', [keyedAvery, { ...keyedAlternateAvery, person_key: null }]),
  identityGuard('blank-person-keys', [{ ...keyedAvery, person_key: '  ' }, { ...keyedAlternateAvery, person_key: '  ' }]),
  identityGuard('same-count-changed-stint-tuple', [keyedAvery, { ...keyedAlternateAvery, team: 'FIC' }]),
  identityGuard('partial-identity-read', [keyedAvery]),
  identityGuard('failed-identity-read', [], 'Fictional keyed stint read failed'),
];

const expectedOutcomes = [
  {
    valid: true,
    connection: "Fixture Comets (2020-2021)",
    reason: "Fixture JR Avery and Fixture Lead Harbor were teammates on the Fixture Comets in 2020-2021.",
    fullName: "Fixture JR Avery",
  },
  {
    valid: false,
    reason: "Fixture Rowan Timber III does not appear in our NBA records (1949-2024).",
    fullName: "Fixture Rowan Timber III",
  },
  {
    valid: true,
    connection: "Fixture Comets (2020-2021)",
    reason: "Fixture Exact Lane and Fixture Lead Harbor were teammates on the Fixture Comets in 2020-2021.",
    fullName: "Fixture Exact Lane",
  },
  {
    valid: false,
    reason: "Fixture Late Stone and Fixture Lead Harbor were never teammates.",
    fullName: "Fixture Late Stone",
  },
  {
    valid: false,
    reason: "Fixture Rowan Timber III and Fixture Lead Harbor were never teammates.",
    fullName: "Fixture Rowan Timber III",
  },
  {
    valid: false,
    reason: "Fixture Rowan Timber Jr and Fixture Lead Summit were never teammates.",
    fullName: "Fixture Rowan Timber Jr",
  },
  {
    valid: false,
    reason: "We cannot confirm Fixture Current Reed and Fixture Current Vale shared a roster. Our NBA records currently run through 2024, so a 2025-26 pairing may be missing.",
    fullName: "Fixture Current Reed",
    coverageGap: true,
  },
  {
    valid: false,
    unverified: true,
    reason: "Something went wrong verifying that one, so it cannot be counted.",
  },
];

const identityUnverified = {
  valid: false,
  unverified: true,
  reason: "We couldn't confirm that player's identity. Try another spelling.",
};
const expectedGuards = [
  {
    valid: true,
    connection: "Fixture Comets (2020-2021)",
    reason: "Fixture J.R. Avery and Fixture Lead Harbor were teammates on the Fixture Comets in 2020-2021.",
    fullName: "Fixture J.R. Avery",
  },
  {
    valid: false,
    reason: "Fixture J R Avery does not appear in our NBA records (1949-2024).",
    fullName: "Fixture J R Avery",
  },
  {
    valid: false,
    reason: "That is the same player.",
  },
  {
    valid: false,
    reason: "Fixture J.R. Avery and Fixture Lead Harbor were never teammates.",
    fullName: "Fixture J.R. Avery",
  },
  identityUnverified,
  {
    valid: false,
    reason: "Fixture J.R. Avery does not appear in our NBA records (1949-2024).",
    fullName: "Fixture J.R. Avery",
  },
  {
    valid: false,
    reason: "Fixture J.R. Avery does not appear in our NBA records (1949-2024).",
    fullName: "Fixture J.R. Avery",
  },
  {
    valid: true,
    connection: "Fixture Comets (2020-2021)",
    reason: "Fixture Exact Lane and Fixture Lead Harbor were teammates on the Fixture Comets in 2020-2021.",
    fullName: "Fixture Exact Lane",
  },
  expectedOutcomes[0],
  identityUnverified,
  identityUnverified,
  identityUnverified,
  identityUnverified,
  identityUnverified,
  identityUnverified,
];

const healthyReadBoundaries = [
  [
    ["nba_player_team_stints","name_folded","%harbor%",["Fixture Lead Harbor"],null],
    ["nba_player_team_stints","name_folded","%lane%",["Fixture Exact Lane"],null],
    ["nba_team_codes","team_code","FIC","Fixture Comets",null],
  ],
  [
    ["nba_player_team_stints","name_folded","%harbor%",["Fixture Lead Harbor"],null],
    ["nba_player_team_stints","name_folded","%stone%",["Fixture Late Stone"],null],
  ],
  [
    ["nba_player_team_stints","name_folded","%harbor%",["Fixture Lead Harbor"],null],
    ["nba_player_team_stints","name_folded","%iii%",["Fixture Rowan Timber III"],null],
  ],
  [
    ["nba_player_team_stints","name_folded","%summit%",["Fixture Lead Summit"],null],
    ["nba_player_team_stints","name_folded","%jr%",["Fixture Rowan Timber Jr"],null],
  ],
  [
    ["nba_player_team_stints","name_folded","%vale%",["Fixture Current Vale"],null],
    ["nba_player_team_stints","name_folded","%reed%",["Fixture Current Reed"],null],
  ],
  [
    ["nba_player_team_stints","name_folded","%harbor%",["Fixture Lead Harbor"],null],
    ["nba_player_team_stints","name_folded","%fault%",null,"Fictional stint read failed"],
  ],
];

const guardReadBoundaries = [
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",1,null],
    ["nba_team_codes","eq","team_code","FIC",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%avery%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",400,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",null,"Fictional folded column unavailable"],
    ["nba_player_team_stints","ilike","player_name","%Avery%",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%lane%",null,"Fictional folded column unavailable"],
    ["nba_player_team_stints","ilike","player_name","%Lane%",1,null],
    ["nba_team_codes","eq","team_code","FIC",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",2,null],
    ["nba_team_codes","eq","team_code","FIC",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",2,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",1,null],
  ],
  [
    ["nba_player_team_stints","ilike","name_folded","%harbor%",1,null],
    ["nba_player_team_stints","ilike","name_folded","%avery%",2,null],
    ["nba_player_team_stints","eq","name_folded","fixture jr avery",null,"Fictional keyed stint read failed"],
  ],
];

const fixtureOrigin = 'https://fixture.invalid';
const fixtureKey = 'fixture-service-role-no-network';
const requestOrigin = 'https://douknowball.com';
const stintsColumns = 'player_name, team, first_season, last_season';
const identityColumns = stintsColumns + ', person_key';
const readError = 'Fictional stint read failed';
const foldedError = 'Fictional folded column unavailable';
const fixtureEnv = { SUPABASE_URL: fixtureOrigin, SUPABASE_SERVICE_ROLE_KEY: fixtureKey };
const harnessErrors = [];
let active;
let handle;
function guard(ok, message) {
  if (!ok) {
    harnessErrors.push(message);
    throw new Error(message);
  }
}
function fixtureClient(url, key) {
  guard(active && url === fixtureOrigin && key === fixtureKey, 'Unexpected client or environment access');
  active.clientCalls++;
  return {
    from(table) {
      guard(table === 'nba_player_team_stints' || table === 'nba_team_codes', 'Unexpected fixture table');
      return {
        select(columns) {
          const stintTable = table === 'nba_player_team_stints';
          const keyedStints = stintTable && columns === identityColumns;
          guard(keyedStints || columns === (stintTable ? stintsColumns : 'team_name'), 'Unexpected fixture projection');
          const calls = [['select', columns]];
          if (keyedStints) {
            return {
              eq(column, spelling) {
                const identity = active.fixture.identity;
                guard(identity && column === 'name_folded' && spelling === 'fixture jr avery', 'Unexpected keyed fixture filter');
                calls.push(['eq', column, spelling]);
                return {
                  limit(limit) {
                    guard(limit === 400, 'Unexpected keyed fixture lookup limit');
                    calls.push(['limit', limit]);
                    const { rows, error } = identity;
                    const data = error ? null : rows.filter(row => row.name_folded === spelling).slice(0, limit)
                      .map(({ player_name, team, first_season, last_season, person_key }) => ({ player_name, team, first_season, last_season, person_key }));
                    active.reads.push({ table, calls, data, error });
                    return Promise.resolve({ data, error: error ? { message: error } : null });
                  },
                };
              },
            };
          }
          if (stintTable) {
            return {
              ilike(column, pattern) {
                guard(column === 'name_folded' || column === 'player_name', 'Unexpected fixture filter column');
                const match = /^%([a-z0-9]+)%$/i.exec(pattern);
                guard(match, 'Unexpected fixture filter token');
                calls.push(['ilike', column, pattern]);
                return {
                  limit(limit) {
                    guard(limit === 400, 'Unexpected fixture lookup limit');
                    calls.push(['limit', limit]);
                    const token = match[1].toLowerCase();
                    const failed = column === 'name_folded' && token === active.fixture.rejectFoldedToken;
                    const fallback = column === 'name_folded' && token === active.fixture.foldedErrorToken;
                    const error = failed ? readError : fallback ? foldedError : null;
                    const data = error ? null : active.fixture.stints
                      .filter(row => row[column].toLowerCase().includes(token))
                      .slice(0, limit)
                      .map(({ player_name, team, first_season, last_season }) => ({ player_name, team, first_season, last_season }));
                    active.reads.push({ table, calls, data, error });
                    if (failed) return Promise.reject(new Error(readError));
                    return Promise.resolve({ data, error: fallback ? { message: foldedError } : null });
                  },
                };
              },
            };
          }
          return {
            eq(column, code) {
              guard(column === 'team_code' && /^[A-Z]{3}$/.test(code), 'Unexpected fixture team key');
              calls.push(['eq', column, code]);
              return {
                maybeSingle() {
                  calls.push(['maybeSingle']);
                  const match = active.fixture.teams.find(row => row.team_code === code);
                  const data = match ? { team_name: match.team_name } : null;
                  active.reads.push({ table, calls, data, error: null });
                  return Promise.resolve({ data, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}
function captureLog(level, label, detail) {
  guard(active, 'Unexpected module-level log');
  active.logs.push({ level, label: String(label), detail: detail === undefined ? null : String(detail?.message ?? detail) });
}
const modules = new Map([
  [expectedImports[0][0], Object.freeze({
    serve(fn) {
      guard(!handle && typeof fn === 'function', 'Unexpected edge serve registration');
      handle = fn;
    },
  })],
  [expectedImports[1][0], Object.freeze({ createClient: fixtureClient })],
]);
const loaded = [];
const context = vm.createContext({
  exports: {},
  require(url) {
    guard(modules.has(url), 'Unexpected module import');
    loaded.push(url);
    return modules.get(url);
  },
  Request,
  Response,
  Deno: Object.freeze({ env: Object.freeze({
    get(key) {
      guard(active && Object.hasOwn(fixtureEnv, key), 'Unexpected environment lookup');
      active.envReads.push(key);
      return fixtureEnv[key];
    },
  }) }),
  console: Object.freeze({
    log: (...args) => captureLog('log', ...args),
    error: (...args) => captureLog('error', ...args),
  }),
  fetch() {
    guard(false, 'Unexpected direct network request');
  },
}, { name: 'fictional-nba-chain-edge', codeGeneration: { strings: false, wasm: false } });
new vm.Script(transpiled.outputText, { filename: edgePath }).runInContext(context, { timeout: 5000 });
assert.deepEqual(loaded, expectedImports.map(([url]) => url), 'Only two exact local module stubs loaded');
assert.equal(typeof handle, 'function');

async function runInputs(list) {
  const cases = [];
  for (const input of list) {
    active = { ...input, envReads: [], clientCalls: 0, reads: [], logs: [] };
    const response = await handle(new Request(fixtureOrigin + '/functions/v1/nba-chain-validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: requestOrigin },
      body: JSON.stringify(input.request),
    }));
    active.outcome = {
      status: response.status,
      contentType: response.headers.get('content-type'),
      allowOrigin: response.headers.get('access-control-allow-origin'),
      body: await response.json(),
    };
    cases.push(active);
    active = undefined;
  }
  return cases;
}
const cases = await runInputs(inputs);
const guardCases = await runInputs(guardInputs);
writeFileSync(output, JSON.stringify({ schema: 'nba-chain-name-variants-v1', source, cases }) + '\n', { flag: 'wx' });
writeFileSync(guardOutput, JSON.stringify({ schema: 'nba-chain-name-variants-fixed-guards-v1', source, cases: guardCases }) + '\n', { flag: 'wx' });

assert.deepEqual(harnessErrors, [], 'Only exact fixture transport calls were used');
if (process.env.SIM_OFFLINE_RECEIPT) assert.equal(statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'No live transport');
for (const row of [...cases, ...guardCases]) {
  assert.deepEqual(row.envReads, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], row.id);
  assert.equal(row.clientCalls, 1, row.id);
  assert.deepEqual([row.outcome.status, row.outcome.contentType, row.outcome.allowOrigin], [200, 'application/json', requestOrigin], row.id);
}
for (const [index, row] of cases.slice(2).entries()) {
  const boundaries = row.reads.map(read => [
    read.table, read.calls[1][1], read.calls[1][2],
    Array.isArray(read.data) ? read.data.map(item => item.player_name) : read.data?.team_name ?? null, read.error,
  ]);
  assert.deepEqual(boundaries, healthyReadBoundaries[index], row.id);
  assert.deepEqual(row.outcome.body, expectedOutcomes[index + 2], row.id);
  assert.deepEqual(row.logs, row.id === 'fixture-read-failure'
    ? [{ level: 'error', label: 'nba-chain-validate error:', detail: readError }] : [], row.id);
}
const actualVariantVector = cases.slice(0, 2).map(row => row.outcome.body);
assert.deepEqual(actualVariantVector, expectedOutcomes.slice(0, 2),
  'NBA_CHAIN_NAME_VARIANTS: dotted initials resolve and an unproven suffix stays distinct');
assert.equal(cases.reduce((sum, row) => sum + row.reads.length, 0), 18);
for (const [index, row] of guardCases.entries()) {
  const boundaries = row.reads.map(read => [
    read.table, ...read.calls[1],
    Array.isArray(read.data) ? read.data.length : read.data === null ? null : 1, read.error,
  ]);
  assert.deepEqual(boundaries, guardReadBoundaries[index], row.id);
  assert.deepEqual(row.outcome.body, expectedGuards[index], row.id);
  const expectedLogs = row.fixture.foldedErrorToken ? [{
    level: 'log',
    label: 'nba-chain-validate: name_folded unavailable (' + foldedError + '), falling back to the raw column',
    detail: null,
  }] : [];
  assert.deepEqual(row.logs, expectedLogs, row.id);
}
assert.equal(guardCases.reduce((sum, row) => sum + row.reads.length, 0), 42);
console.log('PASS exact fictional NBA Chain initials, held suffix rejection, six healthy cases and fifteen guards');
