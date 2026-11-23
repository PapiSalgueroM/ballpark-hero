/**
 * Runs the actual Soccer Grid edge handler against allowlisted, read-only
 * 2026-11-23 sports records and archived puzzle labels. No service calls.
 * Option --v26 runs the exact historical source and asserts the old defects.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = JSON.parse(fs.readFileSync(new URL('./data/soccerGridNamesakes1054.json', import.meta.url), 'utf8'));
const verifiedNamesakes = JSON.parse(fs.readFileSync(new URL('../supabase/functions/_shared/soccerGridNamesakes.json', import.meta.url), 'utf8'));
const deployed = process.argv.includes('--v26');
const handlerPath = 'supabase/functions/soccer-grid-validate/index.ts';
const digest = value => createHash('sha256').update(value).digest('hex');
const source = deployed
  ? execFileSync('git', ['show', `${fixture.sourceCommit}:${handlerPath}`], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(new URL(`../${handlerPath}`, import.meta.url), 'utf8');
if (deployed) assert.equal(digest(source), fixture.handlerSha256, 'Archived live v26 and source bytes must agree');

const stints = fixture.stints.map(row => Object.fromEntries(fixture.columns.map((field, i) => [field, row[i]])));
const encoded = transformSync(source.replace(/^import [^\n]+\n/gm, ''), { loader: 'ts', format: 'cjs' }).code;
let serve;
let cachedVerdict;
let calls = [];
const put = (table, type, detail) => calls.push({ table, type, detail });
const responses = [];
const fakeClient = {
  from(table) {
    let filters = [];
    const query = {
      select() { return query; },
      eq(field, value) { filters.push([field, value]); return query; },
      like() { return query; },
      limit() { return query; },
      maybeSingle() {
        put(table, 'read');
        return Promise.resolve({ data: cachedVerdict ? { verdict: cachedVerdict } : null });
      },
      upsert(value) {
        put(table, 'stage', value);
        return Promise.resolve({ data: null });
      },
      then(resolve, reject) {
        put(table, 'read', filters);
        const data = table === 'soccer_player_club_stints'
          ? stints.filter(row => filters.every(([field, value]) => row[field] === value))
          : [];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return query;
  },
};
new Function('serve', 'createClient', 'Deno', 'fetch', 'verifiedNamesakes', encoded)(
  handler => { serve = handler; },
  () => fakeClient,
  { env: { get: name => name === 'GEMINI_API_KEY' ? 'offline-only' : undefined } },
  async () => {
    put('model', 'request');
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ valid: true, fullName: 'Vitinha' }) } }] }), { status: 200 });
  },
  verifiedNamesakes,
);
assert.equal(typeof serve, 'function');

const club = name => `Played for ${name}`;
const FWD = 'Forward (FWD)';
const MID = 'Midfielder (MID)';
const badCache = { valid: true, reason: 'Verified from career records.', fullName: 'Vitinha' };
const miss = { valid: false, reason: 'Former cached refusal.', fullName: 'Vitinha' };

async function replay(playerName, rowAttribute, colAttribute, expected, options = {}) {
  cachedVerdict = options.cached ?? null;
  calls = [];
  const response = await serve(new Request('http://offline.invalid/soccer-grid-validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `offline-case-${responses.length}` },
    body: JSON.stringify({ playerName, rowAttribute, colAttribute }),
  }));
  assert.equal(response.status, 200);
  const text = await response.text();
  const verdict = JSON.parse(text);
  const actual = verdict.valid ? 'yes' : verdict.unverified ? 'hold' : 'no';
  const label = [playerName, rowAttribute, colAttribute].join(' | ');
  responses.push({ label, status: actual, sha256: digest(text) });
  assert.equal(actual, expected, label);
  if (options.namesake) {
    assert.equal(calls.length, 0, `${label} must resolve before shared cache, records or model`);
    assert.equal(verdict.cached, undefined);
  }
  if (Object.hasOwn(options, 'for')) assert.equal(verdict.fullName, options.for, label);
  if (options.stages) assert(calls.some(call => call.type === 'stage' && call.detail.verdict.valid));
}

const published = (left, right) => fixture.publishedCells.filter(([, row, col]) => row === left && col === right).map(([id]) => id);
assert.deepEqual(published(club('Porto'), FWD), ['sg-016', 'sg-145', 'sg-171']);
assert.deepEqual(published(club('Porto'), 'Brazilian'), ['sg-094', 'sg-187']);
assert.deepEqual(published(club('Juventus'), 'Spanish'), ['sg-512']);

if (deployed) {
  await replay('Vitinha', club('Porto'), FWD, 'yes', { stages: true });
  await replay('Vitinha', FWD, club('Porto'), 'yes', { stages: true });
  await replay('Vitinha', club('Porto'), club('Genoa'), 'yes', { stages: true });
  await replay('Vitinha', club('Porto'), 'Brazilian', 'yes', { stages: true });
  await replay('Nico González', club('Juventus'), 'Spanish', 'yes', { stages: true });
  await replay('Vitinha', club('Porto'), FWD, 'yes', { cached: badCache });
} else {
  const namesake = { namesake: true };
  for (const [name, a, b] of [
    ['Vitinha', club('Porto'), FWD],
    ['Vitinha', club('Porto'), club('Genoa')],
    ['Vitinha', club('Porto'), 'Brazilian'],
    ['Nico González', club('Juventus'), 'Spanish'],
    ['Nicolás González', club('Juventus'), club('Barcelona')],
    ['Vítor Machado Ferreira', club('Marseille'), FWD],
    ['Vitor Manuel Carvalho de Oliveira', club('PSG'), MID],
  ]) {
    await replay(name, a, b, 'no', { ...namesake, cached: badCache });
    await replay(name, b, a, 'no', { ...namesake, cached: badCache });
  }
  for (const [name, a, b] of [
    ['Vitinha', club('FC Porto'), MID],
    ['VÍTOr Machado Ferreira', club('Paris Saint-Germain'), club('Wolves')],
    ['Vitinha', club('Porto'), club('PSG')],
    ['Vitinha', club('PSG'), MID],
    ['Vitinha', club('Olympique Marseille'), club('SC Braga')],
    ['Vitinha', club('Genoa'), FWD],
    ['Vítor Manuel Carvalho Oliveira', club('Marseille'), 'Portuguese'],
    ['Vitinha', club('Feirense'), 'Brazilian'],
    ['Nico González', club('Juventus'), 'Argentine'],
    ['Nicolás Iván González', club('Juventus'), FWD],
    ['Nico González', club('Atlético Madrid'), club('Juventus')],
    ['Nico González', club('VfB Stuttgart'), club('Fiorentina')],
    ['Nicolás González Iglesias', club('Barcelona'), MID],
    ['Nico González', club('Valencia'), 'Spanish'],
    ['Nico González', club('Manchester City'), club('Porto')],
  ]) {
    await replay(name, a, b, 'yes', { ...namesake, cached: miss });
    await replay(name, b, a, 'yes', namesake);
  }
  for (const [name, a, b] of [
    ['Vitinha', club('Porto'), 'Champions League Winner'],
    ['Vitinha', club('Something with Porto'), MID],
    ['Nico González', club('Juventus'), 'Played in Serie A'],
    ['Nico González', club('Juventus'), MID],
    ['Vitinha', club('Genoa'), MID],
    ['Vítor Manuel Carvalho Oliveira', MID, club('Braga')],
    ['Nico González', club('Arsenal'), MID],
    ['Nico González', club('CD Guadalajara'), club('Orihuela CF')],
  ]) await replay(name, a, b, 'hold', { ...namesake, cached: badCache });
  await replay('Josenaldo Vitor Santos', club('Feirense'), 'Brazilian', 'yes', { ...namesake, for: 'Josenaldo Vitor Santos' });
  await replay('Vitinha', club('PSG'), MID, 'yes', { ...namesake, for: 'Vítor Machado Ferreira' });
  await replay('Vitinha', club('Genoa'), FWD, 'yes', { ...namesake, for: 'Vítor Manuel Carvalho Oliveira' });
  await replay('Nico González', club('Juventus'), 'Argentine', 'yes', { ...namesake, for: 'Nicolás Iván González' });
  await replay('Nico González', club('Barcelona'), MID, 'yes', { ...namesake, for: 'Nicolás González Iglesias' });
}
await replay('Alexander Isak', club('Liverpool'), club('Newcastle'), 'yes', { stages: true });
await replay('Marcus Rashford', club('Barcelona'), club('Aston Villa'), 'yes', { stages: true });
await replay('Marcus Rashford', club('Barcelona'), club('Aston Villa'), 'yes', { cached: { valid: true, fullName: 'Marcus Rashford' }, for: 'Marcus Rashford' });
console.log(JSON.stringify({ validator: deployed ? 'archived v26' : 'working source', handlerSha256: digest(source), responses }, null, 2));
console.log(`simSoccerGridNamesakes: ${responses.length} exact handler cases passed, zero external requests or writes.`);
