// Round 924: where the MLB Career Path chain keeps its downloads and working files. They are never
// committed (the raw pages run to about 50 MB): the default is .tmp-fx/mlbcp/ at the repo root, which git
// excludes, and MLBCP_WORK points it somewhere else.
//
// The chain, in order (node scripts/mlbCareerPath/<step>.mjs from the repo root):
//   search      league person ids for every name in players.mjs (network: statsapi.mlb.com)
//   fetchApi    the league person record for each id, cached in <work>/raw (network: statsapi.mlb.com)
//   fetchBbref  the baseball-reference player page for each row, cached, paced (network: baseball-reference.com)
//   extract     both sources side by side into <work>/facts.json (files only from here on)
//   compare     prints where the two sources disagree
//   build       applies the record's rules, writes <work>/record.players.json
//   writeRecord writes scripts/data/mlbCareerPathVerified2026-10.json
//   genData     writes src/data/baseballCareerPlayers.ts from the record alone
// Re-read due: after the 2026 World Series and the November 2026 awards (the record's rereadBy date,
// which scripts/simMlbCareerPathFacts.mjs enforces). Delete <work>/raw first so the pages are fetched fresh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.resolve(process.env.MLBCP_WORK || path.join(root, '.tmp-fx', 'mlbcp'));
fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
export const WORK = pathToFileURL(dir + path.sep);
