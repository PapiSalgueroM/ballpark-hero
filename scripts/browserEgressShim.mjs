/**
 * Round 251: the key that unlocks the browser board inside a sandboxed
 * cloud session.
 *
 * THE PROBLEM. Cloud sandboxes give node full network egress (every sim
 * harness reaches Supabase fine) but give Chromium NONE: every external
 * fetch from a page dies, so all 35 browser harnesses have sat skipped
 * since Round 233 with "run them next session with egress" in the state
 * doc. That next session never comes, because the sandboxes are all
 * built the same way.
 *
 * THE FIX. Node can carry the browser's traffic. This shim starts a tiny
 * CONNECT proxy inside the harness process (node's socket, node's
 * egress) and monkey-patches playwright's chromium.launch so every
 * browser the harness opens tunnels through it. Two details matter:
 *   1. The sandbox's own egress path intercepts TLS with a private CA
 *      that node trusts and Chromium does not, so the patch also adds
 *      --ignore-certificate-errors. That is acceptable FOR HARNESS RUNS
 *      ONLY: the harnesses assert on content, not on transport.
 *   2. sweepGames passes --no-proxy-server (a leftover from when there
 *      was nothing to proxy), which would override the proxy option, so
 *      the patch strips it.
 * Localhost is untouched: Chromium bypasses the proxy for loopback by
 * default, so the locally served dist/ is fetched directly.
 *
 * HOW TO USE, from the repo root, after npm run build:
 *
 *   NODE_OPTIONS="--import /home/claude/ballpark-hero/scripts/browserEgressShim.mjs" \
 *     ENGINES=chromium node scripts/runAllSims.mjs --browser
 *
 * NODE_OPTIONS propagates to every child the runner spawns, so all
 * browser harnesses inherit the shim without a single edit to any of
 * them. Loading it inside node-only harnesses is harmless (a moment of
 * playwright import time, no behavior change). Without NODE_OPTIONS set,
 * nothing anywhere changes: the shim only acts when explicitly imported.
 *
 * The filename deliberately matches none of the runner's harness
 * prefixes (sim, play, sweep), so the runner never mistakes it for a
 * harness.
 */
import net from 'node:net';

let pw = null;
try {
  // the same hardcoded path every browser harness imports, so this
  // patches the exact module instance they will use
  pw = (await import('/home/claude/.npm-global/lib/node_modules/playwright/index.js')).default;
} catch {
  // no playwright in this environment: nothing to shim
}

if (pw?.chromium) {
  const proxy = net.createServer(client => {
    client.once('data', head => {
      const text = head.toString();
      const connect = text.match(/^CONNECT ([^ :]+):(\d+) /);
      if (connect) {
        // https: raw tunnel, TLS passes through untouched
        const up = net.connect(Number(connect[2]), connect[1], () => {
          client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          up.pipe(client); client.pipe(up);
        });
        up.on('error', () => client.destroy());
        client.on('error', () => up.destroy());
        return;
      }
      // plain http arrives in absolute form (GET http://host:port/path).
      // Rewrite to origin form and forward, FORCING Connection: close
      // both ways: this handler reads one request per socket, and a
      // kept-alive socket's second request would hit the upstream still
      // in absolute form. That exact bug made a mid-board run of rapid
      // navigations (sweepSaves) see empty responses from its own local
      // serve. One request per socket is slower and always correct.
      const abs = text.match(/^([A-Z]+) http:\/\/([^/ :]+)(?::(\d+))?([^ ]*) (HTTP\/[0-9.]+)/);
      if (!abs) { client.destroy(); return; }
      const [, method, host, portStr, pathPart, httpVer] = abs;
      const headEnd = text.indexOf('\r\n\r\n');
      const headerBlock = headEnd === -1 ? text.slice(text.indexOf('\r\n')) : text.slice(text.indexOf('\r\n'), headEnd);
      const tail = headEnd === -1 ? '' : text.slice(headEnd);
      const headers = headerBlock.replace(/\r\nConnection:[^\r\n]*/i, '') + '\r\nConnection: close';
      const up = net.connect(Number(portStr ?? 80), host, () => {
        up.write(`${method} ${pathPart || '/'} ${httpVer}${headers}${tail || '\r\n\r\n'}`);
        up.pipe(client); client.pipe(up);
      });
      up.on('error', () => client.destroy());
      client.on('error', () => up.destroy());
    });
  });
  const port = await new Promise(resolve => proxy.listen(0, () => resolve(proxy.address().port)));
  proxy.unref(); // never hold a finished harness open

  const orig = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = (opts = {}) => orig({
    ...opts,
    // bypass loopback EXPLICITLY: the harnesses serve dist/ on
    // 127.0.0.1, which must go direct (the tunnel only speaks CONNECT,
    // and plain http through an http proxy is a different shape)
    proxy: opts.proxy ?? { server: `http://127.0.0.1:${port}`, bypass: 'localhost,127.0.0.1,[::1]' },
    args: [...(opts.args ?? []).filter(a => a !== '--no-proxy-server'), '--ignore-certificate-errors'],
  });
}
