'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = fs.realpathSync(process.cwd());
const nativeFetch = globalThis.fetch;
const offline = path.join(root, 'scripts/lib/offlineTransport.cjs');
require(offline);
const guardedFetch = globalThis.fetch;
const tables = {
  nba_player_stats: { select: 'id,player_name,teams,points,trb,ast,games', filter: 'teams', order: 'player_name.asc' },
  mlb_grid_players: { select: 'playerid,player_name,franchises,hits,hrs,games', filter: 'franchises', order: 'player_name.asc' },
  nhl_player_stats: { select: 'id,player_name,teams,points,goals,assists,games', filter: 'teams', order: 'player_name.asc' },
  ncaa_player_stats: { select: 'player_slug,player_name,schools,points,trb,ast,games,position,year_from,year_to', filter: 'schools', order: 'id.asc' },
};
function validate(request, options = {}) {
  const u = new URL(request.url), table = u.pathname.split('/').pop(), row = tables[table];
  assert.equal(u.protocol, 'https:'); assert.equal(u.hostname, 'flawuiqbvjobmkfkauhw.supabase.co');
  assert.equal(u.port, ''); assert.equal(u.username, ''); assert.equal(u.password, ''); assert.equal(u.hash, '');
  assert(row); assert.equal(u.pathname, '/rest/v1/' + table); assert.equal(request.method, 'GET');
  assert.equal(request.body, null); assert(!options.dispatcher);
  assert.deepEqual([...u.searchParams.keys()].sort(), ['select', row.filter, 'order', 'offset', 'limit'].sort());
  assert.equal(u.searchParams.get('select').replace(/\s+/g, ''), row.select);
  assert.equal(u.searchParams.get(row.filter), 'not.is.null'); assert.equal(u.searchParams.get('order'), row.order);
  assert.match(u.searchParams.get('offset'), /^(0|[1-9][0-9]*)$/);
  assert.equal(Number(u.searchParams.get('offset')) % 1000, 0); assert.equal(u.searchParams.get('limit'), '1000');
  return { method: request.method, host: u.hostname, path: u.pathname, query: Object.fromEntries(u.searchParams), table };
}
module.exports = { validate };
if (process.argv[2] === '--self-test' && process.argv[1] === __filename) {
  const checks = [];
  for (const [table, row] of Object.entries(tables)) {
    const u = new URL('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/' + table);
    for (const [key, value] of Object.entries({ select: row.select, [row.filter]: 'not.is.null', order: row.order, offset: '0', limit: '1000' })) u.searchParams.set(key, value);
    assert.equal(validate(new Request(u)).table, table);
    const cases = [new Request(u, { method: 'POST', body: '{}' }), new Request(u.href.replace('/rest/v1/', '/rest/v1/rpc/')), new Request(u.href.replace('flawuiqbvjobmkfkauhw.supabase.co', 'example.com')), new Request(u.href + '&unknown=1')];
    for (const request of cases) { assert.throws(() => validate(request)); checks.push({ method: request.method, host: new URL(request.url).host, path: new URL(request.url).pathname, refusedBeforeNetwork: true }); }
  }
  console.log(JSON.stringify({ validReadShapes: 4, rejectedShapes: checks.length, requestsSent: 0, checks }));
} else if (process.argv[1] === path.join(root, 'scripts/genGridArchive.mjs')) {
  assert.equal(process.env.GEN_ARCHIVE_READ_ONLY, 'four-source-reads-v1');
  const out = fs.realpathSync(process.env.GEN_ARCHIVE_WIRE_OUT);
  assert(out !== root && !out.startsWith(root + path.sep));
  let number = 0;
  globalThis.fetch = async (input, options = {}) => {
    const request = new Request(input, options), url = new URL(request.url);
    if (url.hostname !== 'flawuiqbvjobmkfkauhw.supabase.co') return guardedFetch(input, options);
    const safe = validate(request, options), id = ++number;
    fs.appendFileSync(path.join(out, 'requests.jsonl'), JSON.stringify({ id, event: 'start', at: new Date().toISOString(), ...safe }) + '\n');
    const response = await nativeFetch(request, { redirect: 'manual' });
    assert(![301, 302, 303, 307, 308].includes(response.status), 'GEN_ARCHIVE_NO_REDIRECT');
    const body = Buffer.from(await response.clone().arrayBuffer()), file = String(id).padStart(4, '0') + '.body.json';
    fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
    fs.appendFileSync(path.join(out, 'requests.jsonl'), JSON.stringify({ id, event: 'response', at: new Date().toISOString(), ...safe, status: response.status, file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') }) + '\n');
    return response;
  };
}
