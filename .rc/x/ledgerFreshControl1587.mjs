// Round 1587 control for the apply step "genArsenalLedger1587.mjs --market <fresh Q2> --check":
// (1) the committed export passed through --market must give exit 0; (2) a copy with ONE extra tripwire row (a made up
// Argentine "Arsenal FC" row, written to a temp file only, never committed) must give exit 1 with the FAIL line.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const ROOT = process.cwd();
const GEN = path.join(ROOT, 'scripts', 'qa', 'genArsenalLedger1587.mjs');
const SRC = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584', 'arsenalMarket-2026-10-29.json');
const run = (file) => spawnSync(process.execPath, [GEN, '--market', file, '--check'], { cwd: ROOT, encoding: 'utf8' });
const same = run(SRC);
console.log(`committed export via --market: exit ${same.status} | ${same.stdout.trim().split('\n').pop()}`);
const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const extra = { ...rows.find((r) => r.nationality === 'Argentina') };
extra.id = 99999999; extra.player_name = 'Control Rowadded'; extra.name_folded = 'control rowadded'; extra.year = 2026;
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgerfresh-'));
const tweaked = path.join(T, 'q2-fresh.json');
fs.writeFileSync(tweaked, JSON.stringify([...rows, extra]));
const moved = run(tweaked);
console.log(`export with one new tripwire row: exit ${moved.status} | ${moved.stdout.trim().split('\n').pop()}`);
const ok = same.status === 0 && moved.status === 1 && /FAIL/.test(moved.stdout);
console.log(ok ? 'control freshrow FIRED (and the unchanged export passed)' : 'control freshrow DID NOT FIRE');
process.exit(ok ? 0 : 1);
