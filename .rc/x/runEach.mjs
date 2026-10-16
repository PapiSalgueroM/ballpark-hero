// Runner side: run the named harnesses three at a time, each with its own temp folder and a 25 minute cap, and
// append one line per harness to <out> the moment it ends, so a line killed by the 70 minute cap keeps what finished.
// node .rc/x/runEach.mjs <out> name1 name2 ...
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [out, ...names] = process.argv.slice(2);
fs.writeFileSync(out, `runEach: ${names.length} harnesses\n`);
let next = 0;
let red = 0;
const one = name => new Promise(resolve => {
  const t0 = Date.now();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `each-${name}-`));
  /* The suite's own offline transport, as runAllSims loads it: no database or external fetch leaves the runner. */
  const receipt = path.join(tmp, 'receipt.log');
  fs.writeFileSync(receipt, '');
  const preload = path.resolve('scripts/lib/offlineTransport.cjs').replaceAll('\\', '/');
  const child = spawn(process.execPath, [path.join('scripts', `${name}.mjs`)], {
    env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp, SIM_OFFLINE_RECEIPT: receipt,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${JSON.stringify(preload)}`.trim() },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let buf = '';
  const keep = d => { buf = (buf + d).slice(-6000); };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  const timer = setTimeout(() => child.kill('SIGKILL'), Number(process.env.EACH_CAP_MIN || 25) * 60 * 1000);
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    const lines = buf.trim().split('\n').filter(l => l.trim());
    const fails = lines.filter(l => /FAIL/.test(l)).slice(0, 2).map(l => l.trim().slice(0, 160));
    if (code !== 0) red++;
    fs.appendFileSync(out, `${name} exit=${code ?? signal} ${((Date.now() - t0) / 1000).toFixed(0)}s | ${(lines.pop() ?? '').slice(0, 200)}${fails.length ? ` || ${fails.join(' / ')}` : ''}\n`);
    resolve();
  });
});
await Promise.all([0, 1, 2].map(async () => { while (next < names.length) await one(names[next++]); }));
fs.appendFileSync(out, `runEach: done, ${red} of ${names.length} exited non zero\n`);
console.log(`runEach: done, ${red} of ${names.length} exited non zero`);
