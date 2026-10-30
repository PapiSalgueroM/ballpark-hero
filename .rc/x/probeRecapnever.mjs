// probe (never committed): write the recapnever copy of the NFL board as controlFrontOfficeBoard does, then run two of
// its six test files on it with the default reporter, so the reason the copy fails to load is printed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const ROOT = process.cwd();
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const board = fs.readFileSync(path.join(ROOT, BOARD), 'utf8').split('\r\n').join('\n');
const from = '  const careerKit = useGmCareerKit(nflCareerKitLoader, {\n    phase,\n';
const to = "  const careerKit = useGmCareerKit(nflCareerKitLoader, {\n    phase: phase === 'recap' ? 'draft' : phase,\n";
const hits = board.split(from).length - 1;
console.log('hits', hits);
const src = board.replace(from, () => to);
const dir = path.join(ROOT, 'dist', '.fo-board-control');
fs.mkdirSync(dir, { recursive: true });
const copy = path.join(dir, 'Board.probe.tsx');
fs.writeFileSync(copy, src);
const files = process.argv.slice(2);
const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...files, '--testTimeout=600000', '--hookTimeout=120000'],
  { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FO_BOARD_NFL: copy.replaceAll('\\', '/'), CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
const out = ((r.stdout || '') + (r.stderr || '')).split('\n');
console.log(out.filter(l => /Error|error|FAIL|Cannot|expected|✓|×|Test Files|Tests /.test(l)).slice(0, 80).join('\n'));
console.log('exit', r.status);
