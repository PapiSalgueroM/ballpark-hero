import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(fixtureRoot, '../../..');
const out = process.env.WALL_SHOT_OUT;
assert(out && path.isAbsolute(out), 'WALL_SHOT_OUT must be absolute');
assert(path.resolve(out) !== sourceRoot && !path.resolve(out).startsWith(sourceRoot + path.sep), 'Output outside source');
const outDir = path.join(out, 'fixture-dist');
assert(!fs.existsSync(outDir), 'Fresh fixture output required');
export default defineConfig({
  root: fixtureRoot, publicDir: false, plugins: [react()],
  resolve: { alias: { '@': path.join(sourceRoot, 'src') } },
  build: { outDir, emptyOutDir: false, rollupOptions: { input: path.join(fixtureRoot, 'wallShotModern.html') } },
});
