/* patchNbaHallTable.mjs (fixer scratch, Round 1103, never committed).
   Rewrites the NBA calibration 2 legacy table in src/lib/nbaMyCareer.ts from a marks ledger written by
   scripts/genCareerHallMarks.mjs: each position's standout list is the ledger's half rule list, each mark and
   label the ledger's. Usage: node patchNbaHallTable.mjs <ledger.json> <path to nbaMyCareer.ts> */
import { readFileSync, writeFileSync } from 'node:fs';

const [ledgerFile, srcFile] = process.argv.slice(2);
if (!ledgerFile || !srcFile) { console.error('usage: node patchNbaHallTable.mjs <ledger.json> <nbaMyCareer.ts>'); process.exit(2); }
const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
const L = ledger.sports.nba;
const labels = ledger.labels.nba;
const raw = readFileSync(srcFile, 'utf8');
const crlf = raw.includes('\r\n');
const src = raw.replace(/\r\n/g, '\n');

const HEAD = "const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },\n  season: 8,\n  positions: {\n";
const TAIL = "    '*': { terms: [{ stat: 'pts', per: 430 }] },\n  },\n};\n";
const a = src.indexOf(HEAD);
const b = src.indexOf(TAIL, a);
if (a < 0 || b < 0 || src.indexOf(HEAD, a + 1) >= 0) { console.error('the NBA_LEGACY_V2 block is not where this script reads it'); process.exit(1); }

let body = '';
for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) {
  const list = L.standouts[pos] ?? [];
  body += `    ${pos}: {\n      terms: [{ stat: 'pts', per: 430 }],\n`;
  if (list.length) {
    body += '      standout: [\n';
    for (const f of list) {
      const m = L.positions[pos].families[f];
      body += `        { stat: '${f}', from: ${m.from}, to: ${m.to}, label: '${labels[f]}' },\n`;
    }
    body += '      ],\n';
  }
  body += '    },\n';
}
const out = src.slice(0, a) + HEAD + body + src.slice(b);
writeFileSync(srcFile, crlf ? out.replace(/\n/g, '\r\n') : out);
console.log(out === src ? 'table unchanged' : 'table rewritten');
console.log(body);
