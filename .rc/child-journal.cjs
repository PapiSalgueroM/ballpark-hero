'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const { errorMonitor } = require('node:events');

module.exports = { active: false };
(function activate() {
  let root, directory;
  const outside = (base, target) => {
    const rel = path.relative(base, target);
    return rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel);
  };
  try {
    root = fs.realpathSync(process.cwd());
    if (process.argv[1] !== path.join(root, 'scripts', 'runAllSims.mjs')) return;
    const requested = process.env.STADIUM_CHILD_JOURNAL_DIR;
    if (!requested || !path.isAbsolute(requested) || !outside(root, path.resolve(requested))) return;
    let ancestor = path.resolve(requested);
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    if (!outside(root, fs.realpathSync(ancestor))) return;
    fs.mkdirSync(requested, { recursive: true });
    directory = fs.realpathSync(requested);
    if (!outside(root, directory)) return;
  } catch { return; }

  const epoch = process.hrtime.bigint(), journal = path.join(directory, 'journal.jsonl');
  let serial = 0;
  const record = row => {
    try { fs.appendFileSync(journal, JSON.stringify({ utc: new Date().toISOString(), parentPid: process.pid, ...row }) + '\n'); }
    catch (error) {
      try { fs.appendFileSync(path.join(directory, 'journal-errors.jsonl'), JSON.stringify({ utc: new Date().toISOString(), error: String(error) }) + '\n'); } catch {}
    }
  };
  record({ event: 'journal-active', root, argv: process.argv, cwd: process.cwd() });
  const original = cp.spawn;
  cp.spawn = function (...callArgs) {
    const [command, args, options] = callArgs;
    if (command !== process.execPath || !Array.isArray(args) || args.length !== 1
      || !path.isAbsolute(args[0] || '') || path.dirname(args[0]) !== path.join(root, 'scripts')
      || options?.cwd !== root) {
      return Reflect.apply(original, this, callArgs);
    }
    const started = process.hrtime.bigint(), id = process.pid + '-' + String(++serial).padStart(4, '0');
    const durationMs = () => Number(process.hrtime.bigint() - started) / 1e6;
    const stem = id + '.' + path.basename(args[0]).replace(/[^A-Za-z0-9._-]/g, '_');
    let child;
    try { child = Reflect.apply(original, this, callArgs); }
    catch (error) { record({ event: 'spawn-throw', id, command, args, cwd: options?.cwd ?? process.cwd(), durationMs: durationMs(), error: String(error) }); throw error; }
    record({ event: 'start', id, pid: child.pid ?? null, command, args, cwd: options?.cwd ?? process.cwd(), stdout: stem + '.stdout.log', stderr: stem + '.stderr.log' });
    const fds = [];
    for (const [label, stream] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
      if (!stream) continue;
      let fd;
      try { fd = fs.openSync(path.join(directory, stem + '.' + label + '.log'), 'wx'); fds.push(fd); }
      catch (error) { record({ event: 'journal-error', id, stream: label, error: String(error) }); continue; }
      stream.on('data', chunk => {
        try { const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); let offset = 0;
          while (offset < bytes.length) { const written = fs.writeSync(fd, bytes, offset, bytes.length - offset); if (written <= 0) throw new Error('Journal write made no progress'); offset += written; } }
        catch (error) { record({ event: 'journal-error', id, stream: label, error: String(error) }); }
      });
    }
    child.once('spawn', () => record({ event: 'pid', id, pid: child.pid ?? null, durationMs: durationMs() }));
    child.once(errorMonitor, error => record({ event: 'error', id, pid: child.pid ?? null, durationMs: durationMs(), error: String(error), code: error.code ?? null }));
    child.once('close', (code, signal) => {
      for (const fd of fds) { try { fs.closeSync(fd); } catch {} }
      record({ event: 'close', id, pid: child.pid ?? null, code, signal, durationMs: durationMs(), journalElapsedMs: Number(process.hrtime.bigint() - epoch) / 1e6 });
    });
    return child;
  };
  syncBuiltinESMExports();
  module.exports = { active: true, directory };
})();
