import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const ref = process.env.FOOTBALL_CONNECT4_NAMESAKES_REF;
const read = relative => ref
  ? execFileSync('git', ['show', `${ref}:${relative}`], { cwd: fileURLToPath(root), encoding: 'utf8' })
  : readFileSync(new URL(relative, root), 'utf8');
const source = read('supabase/functions/football-connect4-validate/index.ts');
const leafPath = 'supabase/functions/_shared/soccerGridNamesakes.json';
const facts = source.includes('soccerGridNamesakes.json') ? JSON.parse(read(leafPath)) : undefined;
const normalized = text => text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
const compile = code => ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const types = { exports: {} };
runInNewContext(compile(read('src/types/footballConnect4.ts')), types);
const board = (id, row, column) => {
  const match = types.exports.FOOTBALL_CONNECT4_BOARDS.find(entry => entry.id === id);
  assert.ok(match.rowAttributes.includes(row) && match.columnAttributes.includes(column));
  return { rowAttribute: row, columnAttribute: column };
};

const nico = 'Nico González';
const ivan = 'Nicolás Iván González';
const iglesias = 'Nicolás González Iglesias';
const ferreira = 'Vítor Machado Ferreira';
const oliveira = 'Vítor Manuel Carvalho Oliveira';
const atléticoSpanish = board('classic-2', 'Played for Atletico Madrid', 'Spanish');
const atléticoArgentine = board('classic-2', 'Played for Atletico Madrid', 'Argentine');
const barcelonaArgentine = board('classic-13', 'Played for Barcelona', 'Argentine');
const psgBrazilian = board('classic-12', 'Brazilian', 'Played for PSG');
const psgPortuguese = board('classic-16', 'Portuguese', 'Played for PSG');
const italianArgentine = board('classic-9', 'Played in Serie A', 'Argentine');
const isakDortmund = board('classic-10', 'Played in the Premier League', 'Played for Dortmund');
const game = 'football-connect4';
const pair = (name, cell) => normalized(`${name}|${cell.rowAttribute}|${cell.columnAttribute}`);
const fact = (name, clue) => ({ game, cache_key: `attr|${normalized(name)}|${normalized(clue)}`,
  verdict: { match: true, fullName: name } });
const positivePair = (name, cell) => ({
  game, cache_key: pair(name, cell), verdict: { valid: true, fullName: name, matchesRow: true, matchesColumn: true },
});

// Projection of the exact #1054 captured stint rows. Only the columns the
// Connect 4 loader reads are present and the tests run without a database.
const stints = [
  { player_name: nico, club: 'Atlético de Madrid', nationality: 'Argentina' },
  { player_name: nico, club: 'FC Barcelona', nationality: 'Spain' },
  { player_name: nico, club: 'Juventus FC', nationality: 'Argentina' },
  { player_name: 'Vitinha', club: 'CD Feirense', nationality: 'Brazil' },
  { player_name: 'Vitinha', club: 'FC Porto', nationality: 'Portugal' },
  { player_name: 'Vitinha', club: 'Genoa CFC', nationality: 'Portugal' },
  { player_name: 'Alexander Isak', club: 'Borussia Dortmund', nationality: 'Sweden' },
].map(row => ({ ...row, name_folded: normalized(row.player_name) }));

export function fixture(cache = [], aiAnswer) {
  const cacheEntryKey = row => `${row.game}|${row.cache_key}`;
  const tables = { ai_validation_cache: new Map(cache.map(row => [cacheEntryKey(row), row])), soccer_player_club_stints: stints };
  const writes = [];
  const reads = [];
  const prompts = [];
  let handler;
  const createClient = () => ({
    from(table) {
      let rows = [...tables[table].values()];
      const query = {
        select() { reads.push(table); return query; },
        eq(key, value) { rows = rows.filter(row => row[key] === value); return query; },
        in(key, values) { rows = rows.filter(row => values.includes(row[key])); return query; },
        limit(count) { rows = rows.slice(0, count); return query; },
        maybeSingle() { return Promise.resolve({ data: rows[0] ?? null }); },
        then(resolve) { return Promise.resolve({ data: rows }).then(resolve); },
        upsert(entries) {
          for (const row of Array.isArray(entries) ? entries : [entries]) {
            writes.push(row);
            tables[table].set(cacheEntryKey(row), row);
          }
          return Promise.resolve({ error: null });
        },
      };
      return query;
    },
  });
  runInNewContext(compile(source), {
    exports: {}, Request, Response, console, setInterval() {}, setTimeout,
    Deno: { env: { get: name => aiAnswer && name === 'GEMINI_API_KEY' ? 'local-test-only' : '' } },
    require(id) {
      if (id.startsWith('https://deno.land/')) return { serve: callback => { handler = callback; } };
      if (id.startsWith('https://esm.sh/')) return { createClient };
      if (id === '../_shared/soccerGridNamesakes.json') return { default: facts };
      assert.fail('Unexpected module ' + id);
    },
    fetch(_url, { body }) {
      assert.ok(aiAnswer, 'No external verifier is available in this fixture');
      prompts.push(JSON.parse(body).messages.map(message => message.content).join('\n'));
      return Promise.resolve(Response.json({ choices: [{ message: { content: JSON.stringify(aiAnswer) } }] }));
    },
  }, { filename: fileURLToPath(new URL('supabase/functions/football-connect4-validate/index.ts', root)) });
  const ask = async (playerName, cell, cacheOnly = true) => {
    const request = new Request('https://isolated.invalid/football-connect4-validate', {
      method: 'POST', body: JSON.stringify({ playerName, ...cell, cacheOnly }),
    });
    return (await handler(request)).json();
  };
  return { ask, reads, writes, prompts };
}

const checks = {
  'bare Nico cannot use a Spanish namesake fact or an old positive pair': async () => {
    for (const initial of [[fact(nico, 'Spanish')], [positivePair(nico, atléticoSpanish)]]) {
      const { ask, reads, writes } = fixture(initial);
      const verdict = await ask(nico, atléticoSpanish);
      assert.equal(verdict.valid, false);
      assert.equal(verdict.unverified, true);
      assert.deepEqual(reads, []);
      assert.deepEqual(writes, []);
    }
  },
  'Argentine Nico can claim Atlético, including when a legacy bare-name pair was refused': async () => {
    const old = positivePair(nico, atléticoArgentine);
    old.verdict.valid = false;
    const { ask, writes } = fixture([old]);
    const verdict = await ask('Nicolas Ivan Gonzalez', atléticoArgentine);
    assert.equal(verdict.valid, true);
    assert.equal(verdict.fullName, ivan);
    assert.ok(writes.some(row => row.verdict.valid && row.cache_key !== old.cache_key));
    assert.equal((await ask(ivan, atléticoArgentine)).cached, true);
  },
  'an old client can submit a nickname when records verify exactly one player against both clues': async () => {
    const { ask, reads, writes } = fixture([positivePair(nico, atléticoSpanish)]);
    const oldNico = await ask(nico, atléticoArgentine);
    assert.equal(oldNico.valid, true);
    assert.equal(oldNico.fullName, ivan);
    assert.equal((await ask('Vitinha', psgPortuguese)).fullName, ferreira);
    assert.equal((await ask(nico, italianArgentine, false)).unverified, true);
    assert.deepEqual(reads, []);
    assert.deepEqual(writes, []);
  },
  'the Spanish Nico cannot claim Atlético or borrow the other Nico’s nationality': async () => {
    const { ask, writes } = fixture([fact(nico, 'Spanish'), fact(nico, 'Argentine'),
      positivePair(nico, atléticoSpanish), positivePair(nico, barcelonaArgentine)]);
    assert.equal((await ask(iglesias, atléticoSpanish)).valid, false);
    assert.equal((await ask(iglesias, barcelonaArgentine)).valid, false);
    assert.ok(writes.every(row => row.verdict.valid !== true));
  },
  'PSG Vitinha keeps his correct nationality and club, with no other Vitinha facts': async () => {
    const seeded = [fact('Vitinha', 'Brazilian'), fact('Vitinha', 'Played for PSG')];
    const { ask } = fixture(seeded);
    assert.equal((await ask('Vitinha', psgBrazilian)).valid, false);
    assert.equal((await ask(ferreira, psgBrazilian)).valid, false);
    const correct = await ask(ferreira, psgPortuguese);
    assert.equal(correct.valid, true);
    assert.equal(correct.fullName, ferreira);
    assert.equal((await ask(oliveira, psgPortuguese)).valid, false);
    assert.equal((await ask('Vitor Manuel Carvalho de Oliveira', psgPortuguese)).valid, false);
  },
  'the verifier can still check another clue for the selected person': async () => {
    const { ask, prompts } = fixture([], { valid: true, fullName: ivan, matchesRow: true, matchesColumn: true });
    assert.equal((await ask(ivan, italianArgentine, false)).valid, true);
    assert.equal(prompts.length, 1);
    assert.ok(prompts[0].includes(ivan));
  },
  'an ambiguous verifier identity cannot establish or cache a positive answer': async () => {
    const { ask, writes, prompts } = fixture([positivePair(ivan, italianArgentine)],
      { valid: true, fullName: nico, matchesRow: true, matchesColumn: true });
    const verdict = await ask(ivan, italianArgentine, false);
    assert.equal(verdict.valid, false);
    assert.equal(verdict.unverified, true);
    assert.equal(prompts.length, 1);
    assert.ok(writes.every(row => row.verdict.valid !== true));
  },
  'an ordinary name keeps its legitimate existing cache match': async () => {
    const { ask, writes } = fixture([positivePair('Alexander Isak', isakDortmund)]);
    const verdict = await ask('Alexander Isak', isakDortmund);
    assert.equal(verdict.valid, true);
    assert.equal(verdict.cached, true);
    assert.deepEqual(writes, []);
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let failed = 0;
  for (const [name, check] of Object.entries(checks)) {
    try {
      await check();
      console.log('PASS', name);
    } catch (error) {
      failed += 1;
      console.error('FAIL', name, error.message);
    }
  }
  if (failed) process.exitCode = 1;
}
