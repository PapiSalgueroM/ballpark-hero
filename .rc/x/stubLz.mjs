// Reviewer facts-screens-weight, Release AZ. Never committed. Replaces the one lz-string import of a COPY of
// src/lib/clubManagerWorldRoster.ts with two identity functions, failing closed unless the line stands once.
import fs from 'node:fs';
const file = process.argv[2];
const from = "import { compressToUTF16, decompressFromUTF16 } from 'lz-string';";
const to = 'const compressToUTF16 = (s: string): string => s; const decompressFromUTF16 = (s: string): string | null => s;';
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`stubLz: ABORT the import stands ${n} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log('stubLz: the lz-string import is replaced in the copy');
