// Round 1547 run-lens review: one small plausible mutation per name, applied in the runner's checkout.
// Usage: node .rc/x/mut1547.mjs <name>   (the request line restores with git checkout -- src scripts)
// Exit 9 with "MUT ABORTED" when the anchor is missing or the edit changed nothing.
import fs from 'node:fs';

const M = {
  // retiredNames drops the "not on a team table" guard for retired greats the wrong way round (one character).
  greatsSet: ['src/lib/conquestMarket.ts',
    'for (const g of retiredGreats) if (!onATeamTable(g.name)) out.add(g.name);',
    'for (const g of retiredGreats) if (onATeamTable(g.name)) out.add(g.name);'],
  // The NFL hook's never-on-market predicate inverted (one character).
  hookPred: ['src/hooks/useConquest.ts',
    'retiredNames(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => onTable.has(n))',
    'retiredNames(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => !onTable.has(n))'],
  // signingList stops skipping retired greats already on a standing roster (dropped filter).
  greatsTaken: ['src/lib/conquestMarket.ts',
    '    .filter(g => !taken.has(g.name))\n',
    ''],
  // fallenTeamMarket stops skipping men already on a standing roster (dropped term, first occurrence only).
  marketTaken: ['src/lib/conquestMarket.ts',
    'if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:',
    'if (seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:'],
  // signingList sorts worst first (swapped comparator arguments).
  sortAsc: ['src/lib/conquestMarket.ts',
    'return out.sort((a, b) => b.overall - a.overall).slice(0, SIGNING_LIST_MAX);',
    'return out.sort((a, b) => a.overall - b.overall).slice(0, SIGNING_LIST_MAX);'],
  // signingList's fallen-roster half stops skipping legends (dropped term), so a legend is dealt unlabelled.
  signNever: ['src/lib/conquestMarket.ts',
    'if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall });',
    'if (taken.has(name) || seen.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall });'],
  // The NFL board's dialog drops the retired label (the shipped controls only drop the NBA one).
  nflLabel: ['src/components/conquest/ConquestBoard.tsx',
    '{fa.lastSeason && <span className="block text-[11px] text-muted-foreground">Retired, last played {fa.lastSeason}</span>}',
    ''],
  // One stale key stat number on a row the shipped control does not touch (Kelce 851 to 815).
  kelce: ['src/data/conquestData.ts',
    "keyStat: '2025: 851 rec yds'",
    "keyStat: '2025: 815 rec yds'"],
};

const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`MUT ABORTED: unknown mutation ${name}`); process.exit(9); }
const [file, from, to] = m;
const raw = fs.readFileSync(file, 'utf8');
const lf = raw.replace(/\r\n/g, '\n');
const count = lf.split(from).length - 1;
if (count < 1) { console.log(`MUT ABORTED: ${name} anchor not found in ${file}`); process.exit(9); }
const out = lf.replace(from, to);
if (out === lf) { console.log(`MUT ABORTED: ${name} changed nothing`); process.exit(9); }
fs.writeFileSync(file, out);
console.log(`MUT APPLIED ${name} in ${file} (anchor seen ${count} time(s), first replaced)`);
