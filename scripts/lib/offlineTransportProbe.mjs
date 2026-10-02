// Disposable local server stimulus for simRunnerTransport. No live endpoint is used.
import assert from 'node:assert/strict';
import http, { get as namedGet } from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const [mode, local, remote, reportPath, profile] = process.argv.slice(2);
const checks = [];
const failures = [];
async function check(name, fn) {
  try { await fn(); checks.push(name); }
  catch (error) { failures.push({ name, error: String(error.message) }); }
}
const blocked = promise => assert.rejects(promise, error => error.code === 'SIM_OFFLINE_BLOCK');
const get = (url, method = http.get) => new Promise((resolve, reject) => {
  try { method(url, response => { let text = ''; response.on('data', chunk => text += chunk); response.on('end', () => resolve(text)); }).on('error', reject).setTimeout(3000, function () { this.destroy(new Error('owned HTTP probe timeout')); }); }
  catch (error) { reject(error); }
});

if (mode === 'nested') {
  await check('nested child inherited fetch guard', () => blocked(fetch(`${remote}/nested`)));
} else if (mode === 'node') {
  const require = createRequire(import.meta.url);
  const { isLoopback } = require(process.env.TRANSPORT_PROBE_PRELOAD);
  await check('literal loopback host rules', () => {
    for (const url of [local, 'http://localhost:1/', 'http://[::1]:2/', 'ws://127.0.0.1:3/']) assert.equal(isLoopback(url), true, url);
    for (const url of [remote, 'http://localhost.evil/', 'http://localhost./', 'http://127.1/', 'http://2130706433/', 'http://0x7f000001/', 'http://evil\\@localhost/', 'https://example.invalid/']) assert.equal(isLoopback(url), false, url);
    assert.equal(isLoopback('//127.1/alias', local), false);
  });
  await check('fetch local work', async () => assert.equal(await (await fetch(`${local}/ok`)).text(), 'local-ok'));
  await check('fetch local redirect work', async () => assert.equal(await (await fetch(`${local}/local-redirect`)).text(), 'local-ok'));
  await check('fetch local POST body held across307', async () => assert.equal(await (await fetch(`${local}/post-redirect`, { method: 'POST', body: 'held-body' })).text(), 'POST:held-body'));
  await check('fetch local POST becomes GET across303', async () => assert.equal(await (await fetch(`${local}/post-to-get`, { method: 'POST', body: 'held-body' })).text(), 'GET:'));
  await check('fetch external blocked', () => blocked(fetch(`${remote}/fetch`)));
  await check('fetch Request external blocked', () => blocked(fetch(new Request(`${remote}/request`))));
  await check('fetch remote redirect blocked', () => blocked(fetch(`${local}/remote-redirect`)));
  await check('fetch numeric host alias blocked', () => blocked(fetch(`http://127.1:${new URL(local).port}/alias`)));
  await check('fetch custom dispatcher blocked', () => blocked(fetch(`${local}/dispatcher`, { dispatcher: {} })));
  await check('http local work', async () => assert.equal(await get(`${local}/ok`), 'local-ok'));
  await check('named ESM http local work', async () => assert.equal(await get(`${local}/ok`, namedGet), 'local-ok'));
  await check('http external blocked', () => blocked(get(`${remote}/http`)));
  await check('named ESM http external blocked', () => blocked(get(`${remote}/named`, namedGet)));
  await check('https external blocked', () => blocked(get(remote.replace('http:', 'https:') + '/https', https.get)));
  await check('http options effective remote hostname blocked', () => blocked(get(local, (url, callback) => http.get(url, { hostname: '127.0.0.2' }, callback))));
  await check('http proxy absolute request path blocked', () => blocked(get(local, (url, callback) => http.get(url, { path: `${remote}/proxy` }, callback))));
  await check('stock HTTP Agent local work', async () => {
    const agent = new http.Agent();
    try { assert.equal(await get(`${local}/ok`, (url, callback) => http.get(url, { agent }, callback)), 'local-ok'); }
    finally { agent.destroy(); }
  });
  await check('custom Agent cannot redirect socket to sentinel', async () => {
    const agent = new http.Agent();
    agent.createConnection = () => net.connect({ host: '127.0.0.2', port: Number(new URL(remote).port) });
    try { await blocked(get(`${local}/agent`, (url, callback) => http.get(url, { agent }, callback))); }
    finally { agent.destroy(); }
  });
  await check('stock Agent options cannot override loopback destination', async () => {
    const agent = new http.Agent({ host: '127.0.0.2' });
    try { await blocked(get(`${local}/agent-options`, (url, callback) => http.get(url, { agent }, callback))); }
    finally { agent.destroy(); }
  });
  await check('Node WebSocket external blocked', () => {
    let socket;
    try { assert.throws(() => { socket = new WebSocket(remote.replace('http:', 'ws:')); }, { code: 'SIM_OFFLINE_BLOCK' }); }
    finally { socket?.close(); }
  });
  await check('Node WebSocket local work', async () => {
    const socket = new WebSocket(local.replace('http:', 'ws:') + '/node-local-socket');
    try {
      assert.equal(await new Promise(resolve => {
        const timer = setTimeout(() => resolve('timeout'), 3000);
        socket.onopen = () => { clearTimeout(timer); resolve('opened'); };
        socket.onerror = () => { clearTimeout(timer); resolve('error'); };
      }), 'opened');
    } finally { socket.close(); }
  });
  await check('proxy environment removed', () => { for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NODE_USE_ENV_PROXY']) assert.equal(process.env[key], undefined); });
  await check('nested child inherited guard', () => {
    const result = spawnSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), 'nested', local, remote, `${reportPath}.nested`], { env: process.env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const nested = JSON.parse(fs.readFileSync(`${reportPath}.nested`, 'utf8'));
    assert.deepEqual(nested.failures, []);
    assert.deepEqual(nested.checks, ['nested child inherited fetch guard']);
  });
} else if (mode === 'browser') {
  // Import the package directly, deliberately bypassing the shared loader.
  const pw = (await import('playwright')).default;
  let browser;
  let persistent;
  const contexts = [];
  const apiContexts = [];
  try {
    browser = await pw.chromium.launch({ headless: true, args: ['--no-proxy-server'] });
    const context = await browser.newContext({ serviceWorkers: 'allow', baseURL: local });
    contexts.push(context);
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error' && /WebSocket/.test(message.text())) console.error(`Owned WebSocket diagnostic: ${message.text()}`); });
    page.setDefaultTimeout(5000);
    await check('service workers forcibly blocked', () => assert.equal(context._options.serviceWorkers, 'block'));
    await check('actual local page interaction', async () => {
      await page.goto(`${local}/page`);
      await page.getByRole('button', { name: 'Add' }).click();
      assert.equal(await page.locator('#count').textContent(), '1');
    });
    const pageFetch = url => page.evaluate(async target => { try { return await (await fetch(target)).text(); } catch { return 'blocked'; } }, url);
    await check('browser remote fetch blocked', async () => assert.equal(await pageFetch(`${remote}/browser`), 'blocked'));
    await context.route('**/*', route => route.continue());
    await page.route(`${remote}/late-page`, route => route.continue());
    await check('late page continue cannot bypass guard', async () => assert.equal(await pageFetch(`${remote}/late-page`), 'blocked'));
    await check('late context continue cannot bypass guard', async () => assert.equal(await pageFetch(`${remote}/late-context`), 'blocked'));
    await page.route(`${local}/rewritten`, route => route.continue({ url: `${remote}/rewritten` }));
    await check('continue rewritten target cannot bypass guard', async () => assert.equal(await pageFetch(`${local}/rewritten`), 'blocked'));
    let fetchBlocked = false;
    await page.route(`${remote}/route-fetch`, async route => {
      try { await route.fetch(); }
      catch (error) { fetchBlocked = error.code === 'SIM_OFFLINE_BLOCK'; }
      await route.abort();
    });
    await check('route fetch external blocked', async () => { assert.equal(await pageFetch(`${remote}/route-fetch`), 'blocked'); assert.equal(fetchBlocked, true); });
    let rewrittenFetchBlocked = false;
    await page.route(`${local}/rewritten-fetch`, async route => {
      try { await route.fetch({ url: `${remote}/rewritten-fetch` }); }
      catch (error) { rewrittenFetchBlocked = error.code === 'SIM_OFFLINE_BLOCK'; }
      await route.abort();
    });
    await check('route fetch rewritten target blocked', async () => { assert.equal(await pageFetch(`${local}/rewritten-fetch`), 'blocked'); assert.equal(rewrittenFetchBlocked, true); });
    await page.route(`${local}/rewritten-post`, route => route.continue({ url: `${local}/echo`, method: 'POST', postData: 'rewritten-body', headers: { ...route.request().headers(), 'x-local-check': 'held' } }));
    await check('local rewritten POST headers and body held', async () => assert.equal(await pageFetch(`${local}/rewritten-post`), 'POST:rewritten-body:held'));
    await page.route(`${remote}/mocked`, route => route.fulfill({ body: 'fixture-only', headers: { 'access-control-allow-origin': '*' } }));
    await check('transport-free fixture fulfillment held', async () => assert.equal(await pageFetch(`${remote}/mocked`), 'fixture-only'));
    await check('context API local work', async () => assert.equal(await (await context.request.get(`${local}/ok`)).text(), 'local-ok'));
    await check('context API external blocked', () => blocked(context.request.get(`${remote}/api`)));
    await check('context API remote redirect blocked', () => blocked(context.request.get(`${local}/remote-redirect`)));
    const api = await pw.request.newContext({ baseURL: local });
    apiContexts.push(api);
    await check('standalone API relative local work', async () => assert.equal(await (await api.get('/ok')).text(), 'local-ok'));
    await check('standalone API external blocked', () => blocked(api.post(`${remote}/standalone`, { data: 'no-write' })));
    await check('standalone API remote redirect blocked', () => blocked(api.get('/remote-redirect')));
    await check('standalone API proxy refused', () => blocked(pw.request.newContext({ proxy: { server: local } })));
    await check('browser local proxy refused', () => assert.throws(() => pw.chromium.launch({ headless: true, proxy: { server: local } }), { code: 'SIM_OFFLINE_BLOCK' }));
    await context.routeWebSocket('**/*', route => route.connectToServer());
    await page.routeWebSocket('**/*', route => route.connectToServer());
    await check('browser WebSocket local work', async () => {
      assert.equal(await page.evaluate(url => new Promise(resolve => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => { socket.close(); resolve('timeout'); }, 3000);
        socket.onopen = () => { clearTimeout(timer); socket.close(); resolve('opened'); };
        socket.onclose = event => { clearTimeout(timer); resolve(`closed:${event.code}:${event.reason}`); };
        socket.onerror = event => { clearTimeout(timer); resolve(`error:${event.message || ''}`); };
      }), local.replace('http:', 'ws:') + '/browser-local-socket'), 'opened');
    });
    await check('later WebSocket routes cannot bypass guard', async () => {
      assert.equal(await page.evaluate(url => new Promise(resolve => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => { socket.close(); resolve('timeout'); }, 3000);
        socket.onopen = () => { clearTimeout(timer); socket.close(); resolve('opened'); };
        socket.onclose = socket.onerror = () => { clearTimeout(timer); resolve('blocked'); };
      }), remote.replace('http:', 'ws:') + '/socket'), 'blocked');
    });
    await context.unrouteAll();
    await check('unrouteAll reinstalls transport guard', async () => assert.equal(await pageFetch(`${remote}/unroute`), 'blocked'));
    await context.unroute('**/*');
    await check('unroute reinstalls transport guard', async () => assert.equal(await pageFetch(`${remote}/unroute-one`), 'blocked'));
    await check('browser document remote redirect blocked', async () => {
      const redirectPage = await context.newPage();
      try { await assert.rejects(redirectPage.goto(`${local}/remote-redirect`)); }
      finally { await redirectPage.close(); }
    });
    await check('browser document local redirect held', async () => { await page.goto(`${local}/page-redirect`); assert.equal(await page.locator('#count').textContent(), '0'); });
    await check('browser.newPage receives guard', async () => {
      const directPage = await browser.newPage();
      contexts.push(directPage.context());
      await directPage.goto(`${local}/page`);
      assert.equal(await directPage.evaluate(async url => { try { return await (await fetch(url)).text(); } catch { return 'blocked'; } }, `${remote}/new-page`), 'blocked');
    });
    persistent = await pw.chromium.launchPersistentContext(profile, { headless: true, serviceWorkers: 'allow', args: ['--no-proxy-server'] });
    await check('persistent context receives guard', async () => {
      const tab = persistent.pages()[0] || await persistent.newPage();
      await tab.goto(`${local}/page`);
      assert.equal(persistent._options.serviceWorkers, 'block');
      assert.equal(await tab.evaluate(async url => { try { return await (await fetch(url)).text(); } catch { return 'blocked'; } }, `${remote}/persistent`), 'blocked');
    });
    await check('existing browser attachment refused', () => assert.throws(() => pw.chromium.connectOverCDP(local), { code: 'SIM_OFFLINE_BLOCK' }));
  } finally {
    await Promise.all(apiContexts.map(context => context.dispose()));
    await Promise.all(contexts.map(context => context.close()));
    await persistent?.close();
    await browser?.close();
  }
} else { throw new Error(`Unknown local probe mode: ${mode}`); }

fs.writeFileSync(reportPath, JSON.stringify({ checks, failures }, null, 2));
console.log(`${mode}: ${checks.length} intended checks passed; ${failures.length} assertions failed.`);
for (const failure of failures) console.error(`FAIL ${failure.name}: ${failure.error}`);
process.exitCode = failures.length ? 1 : 0;
