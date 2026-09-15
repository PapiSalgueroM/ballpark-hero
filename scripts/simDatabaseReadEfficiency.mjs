/* Local fake-fetch proof only. This harness never contacts the database. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as pages from './lib/stintPages.mjs';
import * as memo from './lib/rarityProminenceMemo.mjs';

const origin = 'https://fixture.invalid';
const pageSource = readFileSync(new URL('./lib/stintPages.mjs', import.meta.url), 'utf8');
const memoSource = readFileSync(new URL('./lib/rarityProminenceMemo.mjs', import.meta.url), 'utf8');
const mutate = async (source, before, after) => {
  assert.equal(source.split(before).length, 2, 'control anchor must occur exactly once');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change executable source');
  return import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`);
};

function fixture(size) {
  return Array.from({ length: size }, (_, i) => ({
    // Consecutive boundary ids catch an off-by-one cursor; later ids have gaps.
    id: i < 1100 ? i : i * 2,
    player_name: `Repeated name ${Math.floor(i / 7) % 31}`,
    name_folded: `repeated name ${Math.floor(i / 7) % 31}`,
    club: `Club ${i % 13}`,
  })).reverse();
}

async function scan(api, data, columns) {
  const calls = [];
  const result = [];
  const sorted = [...data].sort((a, b) => a.id - b.id);
  const fetchStub = async input => {
    const url = new URL(input);
    calls.push(url);
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, '/rest/v1/soccer_player_club_stints');
    assert.equal(url.searchParams.get('order'), 'id.asc', 'scan must use primary-key order');
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.has('offset'), false);
    assert.equal(url.searchParams.get('select'), `id,${columns}`);
    const cursor = url.searchParams.get('id');
    const [operator, value] = cursor ? cursor.split('.') : [];
    const available = sorted.filter(row => !cursor || (operator === 'gte' ? row.id >= Number(value) : row.id > Number(value)));
    return new Response(JSON.stringify(available.slice(0, 1000)));
  };
  for await (const page of api.stintPages(async cursor => {
    const response = await fetchStub(api.stintPageUrl(origin, columns, cursor));
    return response.json();
  })) result.push(...page);
  assert.deepEqual(result, sorted, 'complete rowset must match independent full fixture');
  assert.equal(calls.length, Math.floor(data.length / 1000) + 1, 'exact multiples need a final empty page');
  return calls.length;
}

async function pageProof(api) {
  let calls = 0;
  for (const size of [0, 999, 1000, 1001, 2000, 2503]) {
    for (const columns of ['player_name,club', 'player_name,name_folded']) calls += await scan(api, fixture(size), columns);
  }
  assert.equal(await scan(api, fixture(1001), 'player_name,club'), 2, 'new invocation reads fresh pages');
  return calls;
}

async function invalidPages(api) {
  const collect = async read => { for await (const _page of api.stintPages(read)) { /* drain */ } };
  for (const page of [[{ id: 2 }, { id: 2 }], [{ id: 2 }, { id: 1 }], [{ id: 0.5 }], [{ id: '1' }], [{ id: Number.MAX_SAFE_INTEGER + 1 }]]) {
    await assert.rejects(() => collect(async () => page), /Stint ids must advance strictly/, 'bad page must fail closed');
  }
  await assert.rejects(() => collect(async () => null), /Invalid stint page/);
  const readFailure = new Error('fixture read failure');
  await assert.rejects(() => collect(async () => { throw readFailure; }), error => error === readFailure);
  let calls = 0;
  await assert.rejects(() => collect(async cursor => {
    calls += 1;
    return Array.from({ length: 1000 }, (_, i) => ({ id: (cursor ?? -1) + i + 1 }));
  }), /200-page limit before completion/, 'cap must reject incomplete traversal');
  assert.equal(calls, 200);
}

function request(category = 'fixture', changes = {}) {
  const url = new URL('/rest/v1/player_market_values', origin);
  Object.entries({ select: 'player_name,market_value_usd,year,club,nationality,position',
    nationality: `eq.${category}`, order: 'market_value_usd.desc,year.desc,player_name.asc', limit: '1000', ...changes })
    .forEach(([key, value]) => url.searchParams.set(key, value));
  return url.href;
}
const responseFor = (url, init) => new Response(JSON.stringify([{ request: String(url), headers: [...new Headers(init?.headers)] }]),
  { status: 206, headers: { 'content-type': 'application/json', 'content-range': '0-999/1000' } });
const snapshot = async response => [response.status, [...response.headers], await response.text()];

async function memoProof(api) {
  let calls = 0;
  const cached = api.rarityProminenceMemo(async (url, init) => { calls += 1; return responseFor(url, init); });
  const headers = { authorization: 'fixture-public-auth' };
  for (let category = 0; category < 33; category += 1) {
    for (let prefix = 0; prefix < 36; prefix += 1) {
      const direct = request(`category-${category}`, { name_folded: `ilike.prefix-${prefix}*`, limit: '200' });
      for (const url of [direct, request(`category-${category}`)]) {
        assert.deepEqual(await snapshot(await cached.fetch(url, { headers })), await snapshot(responseFor(url, { headers })), 'memo response must equal independent fetch response');
      }
    }
  }
  assert.equal(calls, 1221, '33 prominence reads plus every one of 1188 direct reads');
  const direct = request('repeat-direct', { name_folded: 'ilike.same*', limit: '200' });
  const before = calls;
  await cached.fetch(direct, { headers });
  await cached.fetch(direct, { headers });
  assert.equal(calls - before, 2, 'identical direct searches must remain live');
  assert.deepEqual(cached.stats, { live: 33, hits: 1155 }, 'only prominence reads may enter memo statistics');
}

async function memoFailures(api) {
  let calls = 0;
  const cached = api.rarityProminenceMemo(async () => {
    calls += 1;
    if (calls === 1) return new Response('["temporarily failed"]', { status: 500 });
    if (calls === 2) throw new Error('fixture network failure');
    if (calls === 3) return new Response('malformed JSON', { status: 200 });
    if (calls === 4) return new Response('{"error":"wrong shape"}', { status: 200 });
    return new Response('["recovered"]', { status: 200 });
  });
  const url = request();
  assert.equal((await cached.fetch(url)).status, 500);
  await assert.rejects(() => cached.fetch(url), /fixture network failure/, 'HTTP failure must not be cached');
  assert.equal(await (await cached.fetch(url)).text(), 'malformed JSON', 'network failure must not be cached');
  assert.equal(await (await cached.fetch(url)).text(), '{"error":"wrong shape"}', 'invalid JSON must not be cached');
  assert.equal(await (await cached.fetch(url)).text(), '["recovered"]', 'wrong body shape must not be cached');
  assert.deepEqual(await (await cached.fetch(url)).json(), ['recovered']);
  assert.equal(calls, 5);
}

async function memoIsolation(api) {
  let calls = 0;
  const fetchStub = async (url, init) => { calls += 1; return responseFor(url, init); };
  const cached = api.rarityProminenceMemo(fetchStub);
  for (const [url, headers] of [
    [request('first'), { authorization: 'one' }],
    [request('second'), { authorization: 'one' }],
    [request('first', { select: 'player_name' }), { authorization: 'one' }],
    [request('first'), { authorization: 'two' }],
    [request('first'), { authorization: 'one', range: '0-99' }],
  ]) {
    const expected = await snapshot(responseFor(url, { headers }));
    assert.deepEqual(await snapshot(await cached.fetch(url, { headers })), expected, 'request identity must isolate filters, projection and headers');
    assert.deepEqual(await snapshot(await cached.fetch(url, { headers })), expected);
  }
  assert.equal(calls, 5);
  await api.rarityProminenceMemo(fetchStub).fetch(request('first'), { headers: { authorization: 'one' } });
  assert.equal(calls, 6, 'new invocation must read a fresh response');
  const aborted = AbortSignal.abort();
  await cached.fetch(request('first'), { headers: { authorization: 'one' }, signal: aborted });
  assert.equal(calls, 7, 'an aborted request must reach the fetcher, not return cached success');
}

console.log('1) Primary-key traversal: empty, partial, exact-boundary and repeated-name fixtures');
console.log(`   ${await pageProof(pages)} pages, two projections, complete payload equality`);
console.log('2) Invalid cursors/pages, read failure and 200-page cap fail closed');
await invalidPages(pages);
console.log('3) Successful prominence memo: 2376 requested reads become 1221 fetches, all direct reads retained');
await memoProof(memo);
console.log('4) Failure recovery and request/invocation identity remain independent');
await memoFailures(memo);
await memoIsolation(memo);

const controls = [
  ['skip', pageSource, 'afterId = page[page.length - 1].id;', 'afterId = page[page.length - 1].id + 1;', pageProof, /complete rowset/],
  ['duplicate', pageSource, '&id=gt.', '&id=gte.', pageProof, /Stint ids must advance strictly/],
  ['order', pageSource, '&order=id.asc', '&order=player_name.asc', pageProof, /primary-key order/],
  ['invalid', pageSource, '!Number.isSafeInteger(row.id) || (previous !== null && row.id <= previous)', 'false', invalidPages, /bad page must fail closed/],
  ['cap', pageSource, "throw new Error('Stint scan reached its 200-page limit before completion');", 'return;', invalidPages, /cap must reject incomplete traversal/],
  ['nomemo', memoSource, 'if (responses.has(key))', 'if (false)', memoProof, /33 prominence reads/],
  ['failed', memoSource, 'if (response.ok)', 'if (true)', memoFailures, /HTTP failure must not be cached/],
  ['body', memoSource, 'if (Array.isArray(body))', 'if (true)', memoFailures, /invalid JSON must not be cached/],
  ['direct', memoSource, 'if (!prominence) return fetcher(input, init);', "if (!prominence && !url.searchParams.has('name_folded')) return fetcher(input, init);", memoProof, /identical direct searches/],
  ['key', memoSource, 'JSON.stringify([request.url, [...request.headers.entries()]])', 'url.pathname', memoIsolation, /request identity must isolate/],
  ['abort', memoSource, ' && !request.signal.aborted', '', memoIsolation, /aborted request must reach/],
];
for (const [name, source, before, after, prove, expected] of controls) {
  const changed = await mutate(source, before, after);
  await assert.rejects(() => prove(changed), expected, `${name} control must fail its intended assertion`);
  console.log(`   CONTROL PROVED ${name}`);
}
console.log('ALL DATABASE READ EFFICIENCY CHECKS PASSED (local fixtures, no network)');
