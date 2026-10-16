/* Runner children only. This is a transport guard for our harnesses, not a
   sandbox for arbitrary executables or raw sockets. Live runs do not load it. */
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const { syncBuiltinESMExports, createRequire } = require('node:module');

function isLoopback(value, base) {
  try {
    const raw = String(value);
    const url = new URL(raw, base);
    const authority = raw.match(/^(?:[a-z]+:)?\/\/([^/?#]+)/i)?.[1];
    const normalizedHost = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const host = authority
      ? authority.replace(/^.*@/, '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase()
      : normalizedHost;
    return /^(https?|wss?):$/.test(url.protocol)
      && normalizedHost === host
      && (host === 'localhost' || host === '127.0.0.1' || host === '::1');
  } catch { return false; }
}

function blocked(value, via) {
  let origin = 'invalid URL';
  try { origin = new URL(String(value)).origin; } catch { /* no credentials or query in logs */ }
  const kind = /^https?:\/\/[^/]*\.supabase\.co(?::\d+)?$/i.test(origin) ? 'database' : 'external';
  const line = `[SIM_OFFLINE_BLOCK] ${kind} ${via} ${origin}\n`;
  if (process.env.SIM_OFFLINE_RECEIPT) fs.appendFileSync(process.env.SIM_OFFLINE_RECEIPT, line);
  process.stderr.write(line);
  const error = new Error(`Offline harness blocked ${via} to ${origin}`);
  error.code = 'SIM_OFFLINE_BLOCK';
  return error;
}

function requireLoopback(value, via, base) {
  if (!isLoopback(value, base)) throw blocked(value, via);
}

for (const name of Object.keys(process.env)) {
  if (/^(https?|all)_proxy$|^node_use_env_proxy$/i.test(name)) delete process.env[name];
}
// Node24 may already have copied proxy env into its agents before preloads run.
http.globalAgent = new http.Agent({ keepAlive: true, scheduling: 'lifo', timeout: 5000 });
https.globalAgent = new https.Agent({ keepAlive: true, scheduling: 'lifo', timeout: 5000 });
http.setGlobalProxyFromEnv?.();

const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, options = {}) => {
  requireLoopback(input instanceof Request ? input.url : input, 'fetch');
  let request = new Request(input, options);
  requireLoopback(request.url, 'fetch');
  if (options.dispatcher) throw blocked(request.url, 'fetch dispatcher');
  for (let hop = 0; hop <= 20; hop++) {
    const nextBody = request.clone();
    const response = await nativeFetch(request, { redirect: 'manual' });
    const location = response.headers.get('location');
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) return response;
    if (request.redirect === 'manual') return response;
    if (request.redirect === 'error') throw new TypeError('Redirect encountered with redirect=error');
    requireLoopback(location, 'fetch redirect', request.url);
    const target = new URL(location, request.url).href;
    await response.body?.cancel();
    const toGet = response.status === 303 && request.method !== 'HEAD'
      || [301, 302].includes(response.status) && request.method === 'POST';
    const headers = new Headers(request.headers);
    if (toGet) {
      headers.delete('content-type');
      headers.delete('content-length');
    }
    request = new Request(target, {
      method: toGet ? 'GET' : request.method, headers,
      body: toGet || ['GET', 'HEAD'].includes(request.method) ? undefined : nextBody.body,
      duplex: 'half', signal: request.signal, redirect: request.redirect,
    });
  }
  throw new TypeError('Too many local redirects');
};
if (globalThis.WebSocket) {
  const NativeWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = class extends NativeWebSocket {
    constructor(url, protocols) {
      requireLoopback(url, 'WebSocket');
      super(url, protocols);
    }
  };
}

for (const [module, protocol] of [[http, 'http:'], [https, 'https:']]) {
  for (const method of ['request', 'get']) {
    const original = module[method];
    module[method] = function (...args) {
      const firstIsUrl = typeof args[0] === 'string' || args[0] instanceof URL;
      const options = (firstIsUrl ? args[1] : args[0]) || {};
      const host = options.hostname || options.host || 'localhost';
      const authority = host === '::1' ? '[::1]' : host;
      let target = firstIsUrl ? String(args[0]) : `${options.protocol || protocol}//${authority}`;
      if (options.hostname || options.host) target = `${options.protocol || protocol}//${authority}`;
      requireLoopback(target, `${protocol}${method}`);
      if (/^https?:\/\//i.test(options.path || '')) requireLoopback(options.path, 'HTTP proxy path');
      const agent = options.agent;
      const customAgent = agent && agent !== false && (
        ![http.Agent.prototype, https.Agent.prototype].includes(Object.getPrototypeOf(agent))
        || ![http.Agent.prototype.createConnection, https.Agent.prototype.createConnection].includes(agent.createConnection)
        || agent.addRequest !== http.Agent.prototype.addRequest
        || agent.createSocket !== http.Agent.prototype.createSocket
        || agent.options?.proxyEnv || agent.proxy
        || ['lookup', 'createConnection', 'hostname', 'host', 'port', 'socketPath'].some(key => agent.options?.[key])
      );
      if (customAgent || options.createConnection || options.socketPath) {
        throw blocked(target, `${protocol}${method} custom transport`);
      }
      const safeOptions = { ...options, lookup(hostname, lookupOptions, callback) {
        if (typeof lookupOptions === 'function') { callback = lookupOptions; lookupOptions = {}; }
        const address = hostname.includes(':') ? '::1' : '127.0.0.1';
        const family = address === '::1' ? 6 : 4;
        callback(null, lookupOptions?.all ? [{ address, family }] : address, family);
      } };
      if (firstIsUrl) {
        if (typeof args[1] === 'function') args.splice(1, 0, safeOptions);
        else args[1] = safeOptions;
      } else args[0] = safeOptions;
      return original.apply(this, args);
    };
  }
}
syncBuiltinESMExports();

function noProxy(options = {}) {
  if (options.proxy || (options.args || []).some(arg => /^--proxy-(server|pac-url)/.test(arg))) {
    throw blocked(options.proxy?.server || 'invalid:', 'browser proxy');
  }
}

function protectRequest(request, baseURL) {
  const original = request._innerFetch.bind(request);
  request._innerFetch = async (options = {}) => {
    const raw = options.url ?? options.request?.url();
    requireLoopback(raw, 'browser API request', baseURL);
    const target = new URL(raw, baseURL).href;
    const response = await original({ ...options, maxRedirects: 0, maxRetries: 0 });
    const location = response.headers().location;
    if (location && [301, 302, 303, 307, 308].includes(response.status())) {
      requireLoopback(location, 'browser API redirect', target);
      // Callers may follow an allowed local redirect explicitly. Never let the
      // driver's HTTP client follow an unchecked next hop.
    }
    return response;
  };
}

function protectDispatch(owner) {
  const original = owner._onRoute.bind(owner);
  owner._onRoute = async route => {
    if (!route._simOfflineProtected) {
      route._simOfflineProtected = true;
      route._innerContinue = async () => {
        if (!isLoopback(route.request().url())) {
          blocked(route.request().url(), 'browser route continue');
          return route._channel.abort({ errorCode: 'blockedbyclient' }, { timeout: 0 });
        }
        // Browser routing does not intercept every redirect hop. Fetch with
        // the guarded API context first, then fulfill only a checked response.
        try { await route._innerFulfill({ response: await route.fetch() }); }
        catch (error) {
          if (error.code !== 'SIM_OFFLINE_BLOCK') throw error;
          return route._channel.abort({ errorCode: 'blockedbyclient' }, { timeout: 0 });
        }
      };
    }
    return original(route);
  };
  const originalSocket = owner._onWebSocketRoute.bind(owner);
  owner._onWebSocketRoute = async route => {
    if (!isLoopback(route.url())) {
      blocked(route.url(), 'browser WebSocket');
      return route.close();
    }
    return originalSocket(route);
  };
}

function protectContext(context) {
  protectRequest(context.request, context._options.baseURL);
  protectDispatch(context);
  context.on('page', protectDispatch);
  context.pages().forEach(protectDispatch);
  const guard = route => route.continue();
  const install = async () => {
    if (!context._routes.some(entry => entry.handler === guard)) await context.route('**/*', guard);
  };
  for (const method of ['unroute', 'unrouteAll']) {
    const original = context[method].bind(context);
    context[method] = async (...args) => { await original(...args); await install(); };
  }
  return Promise.all([
    install(), context.routeWebSocket('**/*', route => route.connectToServer()),
    // Fulfilled documents lack Chromium's local IP address-space metadata.
    // Keep loopback WebSockets usable; their route guard still blocks outside.
    context.grantPermissions(['local-network-access']),
  ]);
}

// Both direct package imports and the shared loader use this same singleton.
let playwright;
try { playwright = require('playwright-core'); }
catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  try { playwright = createRequire('/home/claude/.npm-global/lib/node_modules/playwright/index.js')('playwright-core'); }
  catch (fallbackError) { if (fallbackError.code !== 'MODULE_NOT_FOUND') throw fallbackError; }
}
if (playwright) {
  playwright.chromium._playwright._instrumentation.addListener({
    runBeforeCreateBrowserContext(options) { noProxy(options); options.serviceWorkers = 'block'; },
    runAfterCreateBrowserContext: protectContext,
    runBeforeCreateRequestContext: noProxy,
  });
  const newRequest = playwright.request.newContext.bind(playwright.request);
  playwright.request.newContext = async (options = {}) => {
    const context = await newRequest(options);
    protectRequest(context, options.baseURL);
    return context;
  };
  for (const type of [playwright.chromium, playwright.firefox, playwright.webkit]) {
    const launch = type.launch.bind(type);
    type.launch = options => { noProxy(options); return launch(options); };
    for (const method of ['connect', 'connectOverCDP', 'launchServer']) {
      if (type[method]) type[method] = () => { throw blocked('invalid:', `browser ${method}`); };
    }
  }
}

module.exports = { isLoopback };
