/* Round1432 delegates to its complete QA CLI with the caller environment held. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
assert.equal(process.env.SIM_NETWORK, 'offline');
const child = spawnSync(process.execPath, [fileURLToPath(new URL('./qa/checkGridSearchAccessibility1432.mjs', import.meta.url))], {
  cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env }, stdio: 'inherit', timeout: 2_700_000,
});
assert.ifError(child.error);
assert.equal(child.signal, null, 'Complete accessibility QA CLI must finish');
assert(Number.isInteger(child.status), 'Accessibility QA child must report an exit status');
process.exitCode = child.status;
