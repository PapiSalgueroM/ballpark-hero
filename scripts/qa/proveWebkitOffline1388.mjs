/* Remote WebKit compatibility and transport preservation on owned local servers.
 * 127.0.0.2 is a denied policy sentinel, not an internet or production endpoint.
 */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.WEBKIT_OFFLINE_OUT && path.isAbsolute(process.env.WEBKIT_OFFLINE_OUT), 'Absolute WEBKIT_OFFLINE_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), OUT = process.env.WEBKIT_OFFLINE_OUT;
fs.mkdirSync(OUT, { recursive: true }); assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never replace evidence');
const sha = value => createHash('sha256').update(value).digest('hex');
const FILES = ['scripts/lib/offlineTransport.cjs', 'scripts/lib/offlineTransportProbe.mjs', 'scripts/simRunnerTransport.mjs', 'scripts/qa/proveWebkitOffline1388.mjs'];
const held = new Map(FILES.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const report = { status: 'running', head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  scope: 'WebKit transport compatibility only; no game or physical Safari qualification', checks: [], sources: [], requests: [], deniedTCP: [], qualified: false };
const write = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
for (const [file, bytes] of held) {
  const target = path.join(OUT, 'source', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  report.sources.push({ file, bytes: bytes.length, sha256: sha(bytes) });
}
const previousReceipt = process.env.SIM_OFFLINE_RECEIPT, receipt = path.join(OUT, 'expected-blocks.log');
assert(!fs.existsSync(receipt)); process.env.SIM_OFFLINE_RECEIPT = receipt;
const lines = () => fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8').trim().split('\n').filter(Boolean) : [];
async function bounded(promise, label, ms = 10000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded ' + ms + 'ms')), ms); })]); }
  finally { clearTimeout(timer); }
}
const sockets = new Set();
const server = http.createServer((request, response) => {
  report.requests.push({ host: request.headers.host, path: request.url });
  response.setHeader('access-control-allow-origin', '*');
  if (request.url === '/page') {
    response.setHeader('content-type', 'text/html');
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><button id="add" style="min-height:48px;min-width:120px">Add</button><output id="count">0</output><script>window.nativeClicks=[];document.getElementById("add").addEventListener("click",e=>{nativeClicks.push({trusted:e.isTrusted});document.getElementById("count").textContent=String(nativeClicks.length)})</script>');
  } else response.end(request.headers.host?.startsWith('127.0.0.2:') ? 'sentinel-response' : 'local-ok');
});
server.on('connection', socket => {
  sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  if (socket.localAddress?.replace(/^::ffff:/, '') === '127.0.0.2') report.deniedTCP.push({ localAddress: socket.localAddress, remoteAddress: socket.remoteAddress });
});
let browser, context, api;
write();
try {
  await bounded(new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '0.0.0.0', resolve); }), 'owned local server');
  const port = server.address().port, local = 'http://127.0.0.1:' + port, denied = 'http://127.0.0.2:' + port;
  report.local = local; report.denied = denied; write();
  browser = await bounded(pw.webkit.launch({ headless: true }), 'actual WebKit launch', 30000);
  context = await bounded(browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' }), 'actual protected WebKit context');
  const page = await bounded(context.newPage(), 'actual protected WebKit page');
  const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.goto(local + '/page', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  const button = await page.getByRole('button', { name: 'Add', exact: true }).boundingBox(); assert(button);
  await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
  await page.getByText('1', { exact: true }).waitFor({ state: 'visible' });
  const click = await bounded(page.evaluate(() => ({ clicks: window.nativeClicks, count: document.getElementById('count').textContent, ua: navigator.userAgent })), 'native useful outcome');
  assert.deepEqual(click.clicks, [{ trusted: true }]); assert.equal(click.count, '1');
  report.browser = { version: browser.version(), userAgent: click.ua };
  report.checks.push({ id: 'actual-webkit-native-loopback-work', ...click }); write();

  async function deniedCase(id, action, expectedVia) {
    const start = lines().length, tcp = report.deniedTCP.length;
    const result = await bounded(action(denied + '/' + id), id);
    const observed = lines().slice(start);
    const row = { id, result, blockedReceipts: observed, deniedTCPBefore: tcp, deniedTCPAfter: report.deniedTCP.length };
    report.checks.push(row); write();
    assert.equal(result.ok, false, id + ' must be rejected');
    assert(observed.length > 0 && observed.every(line => line.includes('[SIM_OFFLINE_BLOCK]') && line.includes(denied)), 'Actual guard receipt must name the owned denied endpoint');
    assert(observed.some(line => line.includes(expectedVia)), 'Actual intended transport guard must execute');
    assert.equal(report.deniedTCP.length, tcp, 'Denied endpoint must receive no actual TCP connection');
  }
  const browserFetch = url => page.evaluate(async target => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
    try { const response = await fetch(target, { signal: controller.signal }); return { ok: true, status: response.status, body: await response.text() }; }
    catch (error) { return { ok: false, name: error.name, message: error.message }; }
    finally { clearTimeout(timer); }
  }, url);
  await deniedCase('normal-browser-fetch', browserFetch, 'browser route continue');
  let pageCalls = 0;
  const latePage = async route => { if (route.request().url().startsWith(denied + '/')) pageCalls++; await route.continue(); };
  await page.route('**/*', latePage);
  try { await deniedCase('late-page-continue', browserFetch, 'browser route continue'); assert.equal(pageCalls, 1); }
  finally { await page.unroute('**/*', latePage); }
  let contextCalls = 0;
  const lateContext = async route => { if (route.request().url().startsWith(denied + '/')) contextCalls++; await route.continue(); };
  await context.route('**/*', lateContext);
  try { await deniedCase('late-context-continue', browserFetch, 'browser route continue'); assert.equal(contextCalls, 1); }
  finally { await context.unroute('**/*', lateContext); }
  report.lateHandlers = { pageCalls, contextCalls }; write();
  const apiRead = request => async url => {
    try { const response = await request.get(url, { timeout: 5000 }); return { ok: true, status: response.status(), body: await response.text() }; }
    catch (error) { return { ok: false, code: error.code, message: error.message }; }
  };
  const usefulContext = await apiRead(context.request)(local + '/ok'); assert.deepEqual(usefulContext, { ok: true, status: 200, body: 'local-ok' });
  await deniedCase('context-api-read', apiRead(context.request), 'browser API request');
  api = await bounded(pw.request.newContext(), 'standalone protected API context');
  const usefulApi = await apiRead(api)(local + '/ok'); assert.deepEqual(usefulApi, usefulContext);
  await deniedCase('standalone-api-read', apiRead(api), 'browser API request');
  assert.equal(pageErrors.length, 0); report.pageErrors = pageErrors; report.usefulApi = { context: usefulContext, standalone: usefulApi };
  assert.equal(report.deniedTCP.length, 0); assert(!report.requests.some(row => row.host?.startsWith('127.0.0.2:')));
  assert.equal(report.checks.length, 6); report.actualCasesComplete = true; write();
} catch (error) { report.error = error.stack || String(error); throw error; }
finally {
  const cleanupErrors = [];
  for (const [name, action] of [['API', () => api?.dispose()], ['context', () => context?.close()], ['browser', () => browser?.close()]]) {
    try { await bounded(Promise.resolve().then(action), name + ' cleanup'); } catch (error) { cleanupErrors.push(String(error)); }
  }
  for (const socket of sockets) socket.destroy();
  if (server.listening) try { await bounded(new Promise(resolve => server.close(resolve)), 'owned server cleanup'); } catch (error) { cleanupErrors.push(String(error)); }
  report.cleanupErrors = cleanupErrors; report.sourceHeld = [...held].every(([file, bytes]) => bytes.equals(fs.readFileSync(path.join(ROOT, file))));
  report.expectedBlockCount = lines().length; report.status = 'complete';
  report.qualified = !!report.actualCasesComplete && report.sourceHeld && cleanupErrors.length === 0 && !report.error;
  write();
  if (previousReceipt === undefined) delete process.env.SIM_OFFLINE_RECEIPT; else process.env.SIM_OFFLINE_RECEIPT = previousReceipt;
}
assert(report.qualified, 'Actual WebKit transport preservation did not qualify');
console.log('WebKit offline1388: real loopback page and trusted tap;5 blocked browser/API paths;0 denied-sentinel TCP;late handlers effective;source held.');
console.log('Owned local endpoints only. This is transport compatibility, not Safari-device or game qualification.');
