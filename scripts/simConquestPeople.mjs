/* scripts/simConquestPeople.mjs

   Round 1547. NFL and NBA Conquest tell the truth about real people.

   Before this round the arcade's "Free Agent Signing" power up dealt "top free
   agents" from a hand typed list: Demaryius Thomas, who died on 9 December 2021,
   and men retired for years beside him. NBA Conquest dealt that same football
   list onto basketball rosters. Both Free Agency panels dealt hand typed pools
   whose blurbs were undated claims about real careers, and all 320 NFL roster
   key stats printed a number with no season (T.J. Watt "19 sacks" was his 2023).

   What it holds, on the real code with the real data:
     1. The sources ledger (scripts/data/conquestPeopleSources2026-10.json): every
        retired great and every deceased row has two sources from two publishers,
        neither a wiki.
     2. The power up's retired greats (src/data/conquestPowerups.ts) are ledger
        rows with the ledger's position and last season; none is on the deceased
        list, none is a franchise legend, none is on a Conquest roster.
     3. The market (src/lib/conquestMarket.ts) over every end state where one team
        stands and every other has fallen, with every legend and every retired great
        signed onto a roster first: no deceased name in either flow, no legend or
        retired great in the Free Agency market, every retired great in the power
        up's list labelled with his ledger season, every other name a real player
        of that sport's own tables. At kick off the power up deals exactly the
        sport's retired greats and the market is empty.
        Who counts as retired is the harness's own set, built from the data (the
        ledger's greats plus every legend on no team table), never from the code
        under test: retiredNames and each hook's own never on market set must equal
        it, and the lists run on the hook's own set and card lookup, read out of the
        bundled hook through a one line export shim (the shipped hook is unchanged).
     4. The wiring, read from the code with comments stripped: each hook deals its
        own sport's retired greats and passes the never on market set to both
        lists, both boards print the "Retired, last played" label, and no Conquest
        source file names a man on the deceased list.
     5. Every NFL key stat is the 2025 line scripts/genConquestKeyStats.mjs derives
        from scripts/data/nfl2025Production.json and carries "2025: "; no NBA key
        stat prints a counting number.

   Measured on the round's head (the checks are deterministic, no seed: two runs print
   the same line):
     before this round: 20 power up names, 1 of them deceased, NBA dealt all 20
     football names; 0 of 320 NFL key stats with a season.
     after: NFL 10 and NBA 9 retired greats; 64 NFL and 60 NBA states (every rotation
     of three fallen clubs, every lone survivor), 340 and 288 labelled greats dealt
     (every great not on a standing roster, in every state; 25 and 27 before the
     review's minor 5 fix, when the fallen stars could push them out of the 30);
     key stats 146 printed with "2025: ", 174 print none; about 75,100 checks.
     Section 3 also checks each list against the harness's own expected list: nobody
     on a standing roster (also after the market's best and a free great are signed
     onto a standing club), each fallen man once with his first fallen club, best
     first, and the 30 holding every free great plus the best fallen men that fit.

   NEGATIVE CONTROLS (CONQUEST_PEOPLE_CONTROL=<name>; each asserts its anchor exists
   and that the rewrite changed the bytes, or it aborts with exit 2; a control that
   does not fire exits 3). Measured red counts on the round's head:
     dt      Demaryius Thomas back in the NFL power up list.        108 red, sections 2, 3, 4
     market  the market stops skipping legends and retired greats.  2,732 red, section 3
     nflnba  NBA Conquest deals the NFL retired greats again.        2 red, section 4
     label   the NBA board drops the "Retired, last played" label.   1 red, section 4
     season  Mahomes's key stat back to the old unseasoned number.   2 red, section 5
     greatsSet    retiredNames drops the retired greats (one character).   744 red, section 3
     hookPred     the NFL hook inverts its never on market predicate.      2,118 red, sections 3, 4
     hookPredNba  the NBA hook inverts its never on market predicate.      1,964 red, sections 3, 4
     greatsCap    the fallen stars may push the greats out of the 30 again.  643 red, section 3
     taken        the market offers men on a standing roster.              140 red, section 3
     greatsTaken  the dialog deals greats already on a standing roster.    745 red, section 3
     sortAsc      the Sign a Player list comes worst first.                124 red, section 3
     pickWorst    the dialog fills its room with the worst fallen men.     110 red, section 3
     marketAsc    the market comes worst first.                            124 red, section 3
   (The last nine were added after the adversarial review: before them the harness
   checked the market against retiredNames itself, so both one character slips stayed
   green, the dialog could offer a retired great while listing none, and the standing
   roster rule, the order and the 30 were held by nothing.)

   Run: node scripts/simConquestPeople.mjs   (offline; reads files, never the network) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { expectedNflKeyStats, parseNflPlayers, CONQUEST_STAT_SEASON } from './lib/conquestKeyStats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fwd = p => p.split(path.sep).join('/');
const rel = p => fwd(path.relative(ROOT, p));
const CONTROL = process.env.CONQUEST_PEOPLE_CONTROL || '';

const CONTROLS = {
  dt: {
    file: 'src/data/conquestPowerups.ts',
    from: "export const RETIRED_GREATS_NFL: RetiredGreat[] = [\n",
    to: "export const RETIRED_GREATS_NFL: RetiredGreat[] = [\n  { name: 'Demaryius Thomas', position: 'WR', overall: 78, lastSeason: '2019' },\n",
  },
  market: {
    file: 'src/lib/conquestMarket.ts',
    from: "if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:",
    to: "if (taken.has(name) || seen.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:",
  },
  nflnba: {
    file: 'src/hooks/useConquestNba.ts',
    from: "    RETIRED_GREATS_NBA,\n  ), [territories, rosters, eliminated]);",
    to: "    RETIRED_GREATS_NFL,\n  ), [territories, rosters, eliminated]);",
  },
  label: {
    file: 'src/components/conquest/ConquestBoardNba.tsx',
    from: '{fa.lastSeason && <span className="block text-[11px] text-muted-foreground">Retired, last played {fa.lastSeason}</span>}',
    to: '',
  },
  season: {
    file: 'src/data/conquestData.ts',
    from: "{ name: 'Patrick Mahomes', position: 'QB', overall: 97, keyStat: '2025: 3,587 pass yds' }",
    to: "{ name: 'Patrick Mahomes', position: 'QB', overall: 97, keyStat: '4,502 pass yds' }",
  },
  greatsSet: {
    file: 'src/lib/conquestMarket.ts',
    from: 'for (const g of retiredGreats) if (!onATeamTable(g.name)) out.add(g.name);',
    to: 'for (const g of retiredGreats) if (onATeamTable(g.name)) out.add(g.name);',
  },
  hookPred: {
    file: 'src/hooks/useConquest.ts',
    from: 'retiredNames(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => onTable.has(n));',
    to: 'retiredNames(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => !onTable.has(n));',
  },
  hookPredNba: {
    file: 'src/hooks/useConquestNba.ts',
    from: 'retiredNames(TEAM_LEGENDS_NBA, RETIRED_GREATS_NBA, n => onTable.has(n));',
    to: 'retiredNames(TEAM_LEGENDS_NBA, RETIRED_GREATS_NBA, n => !onTable.has(n));',
  },
  greatsCap: {
    file: 'src/lib/conquestMarket.ts',
    from: 'return [...greats, ...fallen.slice(0, Math.max(0, SIGNING_LIST_MAX - greats.length))].sort((a, b) => b.overall - a.overall);',
    to: 'return [...greats, ...fallen].sort((a, b) => b.overall - a.overall).slice(0, SIGNING_LIST_MAX);',
  },
  taken: {
    file: 'src/lib/conquestMarket.ts',
    from: "if (taken.has(name) || seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:",
    to: "if (seen.has(name) || state.neverOnMarket.has(name)) continue;\n      seen.add(name);\n      const card = state.cardOf(name);\n      out.push({ name, position: card.position, overall: card.overall, blurb:",
  },
  greatsTaken: {
    file: 'src/lib/conquestMarket.ts',
    from: '.filter(g => !taken.has(g.name))',
    to: '.filter(g => !!g.name)',
  },
  sortAsc: {
    file: 'src/lib/conquestMarket.ts',
    from: '].sort((a, b) => b.overall - a.overall);',
    to: '].sort((a, b) => a.overall - b.overall);',
  },
  pickWorst: {
    file: 'src/lib/conquestMarket.ts',
    from: 'fallen.sort((a, b) => b.overall - a.overall);',
    to: 'fallen.sort((a, b) => a.overall - b.overall);',
  },
  marketAsc: {
    file: 'src/lib/conquestMarket.ts',
    from: 'return out.sort((a, b) => b.overall - a.overall);',
    to: 'return out.sort((a, b) => a.overall - b.overall);',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`CONTROL ABORTED: unknown control ${CONTROL}`); process.exit(2); }

/** A source file as the checks see it: LF line endings, and the control's rewrite when it names this file. */
function sourceOf(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  const c = CONTROLS[CONTROL];
  if (!c || c.file !== file) return raw;
  if (!raw.includes(c.from)) { console.log(`CONTROL ABORTED: ${CONTROL} anchor not found in ${file}`); process.exit(2); }
  const out = raw.replace(c.from, c.to);
  if (out === raw) { console.log(`CONTROL ABORTED: ${CONTROL} changed nothing in ${file}`); process.exit(2); }
  return out;
}

let checks = 0;
const red = [];
function check(section, ok, what) {
  checks++;
  if (!ok) { red.push(`[${section}] ${what}`); console.log(`FAIL [${section}] ${what}`); }
}
/** Code only: block and line comments removed, string contents kept. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/conquestPeopleSources2026-10.json'), 'utf8'));
const DECEASED = new Set(Object.keys(LEDGER.deceased));

/* 1. The ledger: two sources, two publishers, no wiki. */
{
  const rows = [
    ...Object.entries(LEDGER.retiredGreats.nfl).map(([n, r]) => [`nfl ${n}`, r]),
    ...Object.entries(LEDGER.retiredGreats.nba).map(([n, r]) => [`nba ${n}`, r]),
    ...Object.entries(LEDGER.deceased).map(([n, r]) => [`deceased ${n}`, r]),
  ];
  check(1, rows.length >= 20, `the ledger holds ${rows.length} rows, expected at least 20 (10 NFL, 9 NBA, 1 deceased)`);
  for (const [who, r] of rows) {
    const src = r.sources || [];
    check(1, src.length >= 2, `${who}: ${src.length} sources`);
    check(1, new Set(src.map(s => s.publisher)).size >= 2, `${who}: the sources share one publisher`);
    for (const s of src) check(1, /^https:\/\//.test(s.url) && !/wiki/i.test(s.url) && !/wiki/i.test(s.publisher), `${who}: source ${s.url} is not an https non wiki page`);
  }
}

/* The real code, bundled once (with the control's rewrite when it names a bundled file). Each hook is bundled too,
   with a one line shim appended that exports the hook's own never on market set and card lookup, so section 3 runs
   the market through exactly what the game passes it, predicate included (shipped code is not changed). */
const HOOK_SHIMS = {
  'src/hooks/useConquest.ts': ['nflNeverOnMarket', 'lookupPlayerInfo'],
  'src/hooks/useConquestNba.ts': ['nbaNeverOnMarket', 'lookupPlayerInfoNba'],
};
for (const [file, fns] of Object.entries(HOOK_SHIMS)) {
  for (const fn of fns) {
    if (!sourceOf(file).includes(`function ${fn}(`)) { console.log(`simConquestPeople: FAIL, ${file} has no function ${fn}, so the hook's own set cannot be read`); process.exit(1); }
  }
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simConquestPeople-'));
const ENTRY = path.join(TMP, 'entry.ts');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  `export * as market from '${fwd(path.join(ROOT, 'src/lib/conquestMarket.ts'))}';`,
  `export * as powerups from '${fwd(path.join(ROOT, 'src/data/conquestPowerups.ts'))}';`,
  `export { NFL_TEAMS } from '${fwd(path.join(ROOT, 'src/data/conquestData.ts'))}';`,
  `export { NBA_TEAMS, TEAM_LEGENDS_NBA } from '${fwd(path.join(ROOT, 'src/data/conquestDataNba.ts'))}';`,
  `export * as nflHook from '${fwd(path.join(ROOT, 'src/hooks/useConquest.ts'))}';`,
  `export * as nbaHook from '${fwd(path.join(ROOT, 'src/hooks/useConquestNba.ts'))}';`,
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const file = rel(path.resolve(args.path));
        const shim = HOOK_SHIMS[file];
        if (!shim && (!CONTROL || CONTROLS[CONTROL].file !== file)) return undefined;
        const tail = shim ? `\nexport { ${shim[0]} as __neverOnMarket, ${shim[1]} as __cardOf };\n` : '';
        return { contents: sourceOf(file) + tail, loader: file.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  }],
});
const mod = await import(pathToFileURL(OUT).href);
const { market, powerups, NFL_TEAMS, NBA_TEAMS, TEAM_LEGENDS_NBA, nflHook, nbaHook } = mod;
const SPORTS = {
  nfl: { teams: NFL_TEAMS, legends: powerups.TEAM_LEGENDS, greats: powerups.RETIRED_GREATS_NFL, hook: nflHook },
  nba: { teams: NBA_TEAMS, legends: TEAM_LEGENDS_NBA, greats: powerups.RETIRED_GREATS_NBA, hook: nbaHook },
};
const measured = {};

/* 2. The retired greats are ledger rows, alive, and nobody else's. */
for (const [sport, s] of Object.entries(SPORTS)) {
  const onTable = new Set(s.teams.flatMap(t => (t.players || []).map(p => p.name)));
  const legendNames = new Set(Object.values(s.legends).map(l => l.name));
  check(2, Array.isArray(s.greats) && s.greats.length >= 8, `${sport}: ${s.greats?.length} retired greats, expected at least 8`);
  for (const g of s.greats || []) {
    const row = LEDGER.retiredGreats[sport][g.name];
    check(2, !!row, `${sport} ${g.name}: not in the sources ledger`);
    if (row) {
      check(2, row.position === g.position, `${sport} ${g.name}: position ${g.position}, ledger ${row.position}`);
      check(2, row.lastSeason === g.lastSeason, `${sport} ${g.name}: last season ${g.lastSeason}, ledger ${row.lastSeason}`);
    }
    check(2, !DECEASED.has(g.name), `${sport} ${g.name}: on the deceased list`);
    check(2, !legendNames.has(g.name), `${sport} ${g.name}: is a franchise legend already`);
    check(2, !onTable.has(g.name), `${sport} ${g.name}: is on a Conquest roster`);
  }
  const dealtGreats = new Set((s.greats || []).map(g => g.name));
  for (const n of Object.keys(LEDGER.retiredGreats[sport])) check(2, dealtGreats.has(n), `${sport} ${n}: a ledger row the power up does not deal`);
  measured[`${sport}Greats`] = s.greats?.length ?? 0;
}

/* 3. The market over every end state, after every legend and retired great was signed somewhere. */
const DIALOG_MAX = 30; // the Sign a Player dialog's length, as before this round
const bestFirst = list => list.every((c, i) => i === 0 || list[i - 1].overall >= c.overall);
for (const [sport, s] of Object.entries(SPORTS)) {
  const ids = s.teams.map(t => t.id);
  const onTable = new Set(s.teams.flatMap(t => (t.players || []).map(p => p.name)));
  const ledger = LEDGER.retiredGreats[sport];
  /* The harness's own idea of who never hits the market, built from the data and never from the code under test:
     the ledger's retired greats plus every franchise legend on no team table (a legend still playing for a club,
     such as Kevin Durant on Houston's table, keeps his place in the market). */
  const retired = new Set(Object.keys(ledger));
  for (const l of Object.values(s.legends)) if (!onTable.has(l.name)) retired.add(l.name);
  const sameSet = (a, b) => a.size === b.size && [...a].every(n => b.has(n));
  const libSet = market.retiredNames(s.legends, s.greats, n => onTable.has(n));
  check(3, sameSet(libSet, retired), `${sport}: retiredNames gives ${libSet.size} names, the ledger and the legends tables give ${retired.size}`);
  /* What the game itself passes both lists: the hook's own set and card lookup, read through the bundle shim. */
  const neverOnMarket = s.hook.__neverOnMarket();
  check(3, sameSet(neverOnMarket, retired), `${sport}: the hook's never on market set holds ${neverOnMarket.size} names, the ledger and the legends tables give ${retired.size}`);
  const cardOf = s.hook.__cardOf;
  measured[`${sport}Retired`] = retired.size;
  const kickoff = Object.fromEntries(s.teams.map(t => [t.id, (t.players || []).map(p => p.name)]));
  const start = { rosters: kickoff, alive: ids, eliminated: [], cardOf, neverOnMarket };
  const atStart = market.signingList(start, s.greats);
  check(3, atStart.length === s.greats.length && atStart.every(c => c.lastSeason), `${sport} kick off: the power up deals ${atStart.length} names, expected the ${s.greats.length} retired greats, all labelled`);
  check(3, market.fallenTeamMarket(start, x => x).length === 0, `${sport} kick off: the market is not empty`);
  for (const c of atStart) check(3, !DECEASED.has(c.name), `${sport} kick off: the power up deals ${c.name}, who is on the deceased list`);

  /* Every legend on his own club, every retired great signed somewhere: the worst a run can do. */
  const rosters = Object.fromEntries(Object.entries(kickoff).map(([id, r]) => [id, [...r]]));
  for (const [id, l] of Object.entries(s.legends)) if (rosters[id] && !rosters[id].includes(l.name)) rosters[id].push(l.name);
  s.greats.forEach((g, i) => rosters[ids[(i * 7) % ids.length]].push(g.name));

  /* Early states (three clubs fallen, every rotation) and end states (one club standing, where the fallen stars alone
     would fill the dialog's 30): every retired great not on a standing roster must make the list in both, because the
     dialog offers to call one back (review minor 5: before, end states cut every great). */
  const states = [
    ...ids.map((_, k) => { const gone = [0, 1, 2].map(j => ids[(k + j) % ids.length]); return { tag: `early ${gone.join('+')}`, alive: ids.filter(x => !gone.includes(x)), eliminated: gone }; }),
    ...ids.map(survivor => ({ tag: `end ${survivor}`, alive: [survivor], eliminated: ids.filter(x => x !== survivor) })),
  ];
  let dealt = 0, marketSize = 0, labelled = 0;
  for (const st of states) {
    const state = { rosters, alive: st.alive, eliminated: st.eliminated, cardOf, neverOnMarket };
    const sign = market.signingList(state, s.greats);
    const pool = market.fallenTeamMarket(state, x => x);
    dealt += sign.length; marketSize += pool.length;
    for (const c of [...sign, ...pool]) check(3, !DECEASED.has(c.name), `${sport} ${st.tag}: deals ${c.name}, who is on the deceased list`);
    for (const c of pool) check(3, !retired.has(c.name), `${sport} ${st.tag}: the market offers ${c.name}, a retired man, as a free agent`);
    const standing = new Set(st.alive.flatMap(id => rosters[id] || []));
    const signNames = new Set(sign.map(c => c.name));
    for (const g of s.greats) if (!standing.has(g.name)) check(3, signNames.has(g.name), `${sport} ${st.tag}: the dialog offers to call a retired great back but leaves ${g.name} off the list`);

    /* The harness's own expected lists (review minors 3 and 4): nobody on a standing roster, each fallen man once with
       the first fallen club that listed him, best first, and the room the greats leave in the 30 filled by the fallen
       teams' best. */
    const expectedPool = new Map();
    for (const id of st.eliminated) for (const n of rosters[id] || []) if (!standing.has(n) && !retired.has(n) && !expectedPool.has(n)) expectedPool.set(n, id);
    for (const c of [...sign, ...pool]) check(3, !standing.has(c.name), `${sport} ${st.tag}: deals ${c.name}, who is on a standing roster`);
    check(3, pool.length === expectedPool.size && pool.every(c => expectedPool.has(c.name) && c.blurb === `Hit the market when the ${expectedPool.get(c.name)} fell`), `${sport} ${st.tag}: the market deals ${pool.length} men, expected the ${expectedPool.size} fallen men on no standing roster, each once, with his first fallen club`);
    check(3, bestFirst(pool), `${sport} ${st.tag}: the market is not best first`);
    check(3, bestFirst(sign), `${sport} ${st.tag}: the Sign a Player list is not best first`);
    const freeGreats = s.greats.filter(g => !standing.has(g.name));
    const room = Math.max(0, DIALOG_MAX - freeGreats.length);
    const fallenDealt = sign.filter(c => c.lastSeason === undefined);
    check(3, sign.length === freeGreats.length + Math.min(room, expectedPool.size), `${sport} ${st.tag}: the Sign a Player list holds ${sign.length}, expected ${freeGreats.length} greats plus ${Math.min(room, expectedPool.size)} fallen men`);
    const topOvr = [...expectedPool.keys()].map(n => cardOf(n).overall).sort((a, b) => b - a).slice(0, room).join(',');
    const gotOvr = fallenDealt.map(c => c.overall).sort((a, b) => b - a).join(',');
    check(3, gotOvr === topOvr && fallenDealt.every(c => expectedPool.has(c.name)), `${sport} ${st.tag}: the fallen men in the Sign a Player list are not the best ${room} on the market`);

    /* Sign the market's best onto a standing club, and a free great onto one: neither may be offered again, though the
       first still sits on his fallen club's final roster (the "not on a standing roster" rule, which the data alone
       exercises only where a man is on two tables). */
    if (st.alive.length) {
      const club = st.alive[0];
      for (const who of [pool[0]?.name, freeGreats[0]?.name].filter(Boolean)) {
        const after = { ...state, rosters: { ...rosters, [club]: [...rosters[club], who] } };
        const again = [...market.signingList(after, s.greats), ...market.fallenTeamMarket(after, x => x)];
        check(3, !again.some(c => c.name === who), `${sport} ${st.tag}: ${who} signed for ${club} and is still offered`);
      }
    }
    for (const c of sign) {
      if (c.lastSeason !== undefined) {
        labelled++;
        check(3, ledger[c.name]?.lastSeason === c.lastSeason, `${sport} ${st.tag}: ${c.name} labelled last played ${c.lastSeason}, ledger ${ledger[c.name]?.lastSeason}`);
      } else {
        check(3, onTable.has(c.name) && !retired.has(c.name), `${sport} ${st.tag}: deals ${c.name} with no label, who is on no ${sport.toUpperCase()} table or is a retired man`);
      }
    }
  }
  check(3, labelled > 0, `${sport}: no state put a labelled retired great in the dialog, so the label check never ran`);
  measured[`${sport}States`] = states.length;
  measured[`${sport}Dealt`] = dealt;
  measured[`${sport}Market`] = marketSize;
  measured[`${sport}Labelled`] = labelled;
}

/* 4. The wiring, from the code with the comments stripped. */
{
  const code = f => stripComments(sourceOf(f));
  const squash = s => s.replace(/\s+/g, ' ');
  const nfl = squash(code('src/hooks/useConquest.ts'));
  const nba = squash(code('src/hooks/useConquestNba.ts'));
  check(4, /signingList\( \{ [^}]*neverOnMarket: nflNeverOnMarket\(\) \}, RETIRED_GREATS_NFL, \)/.test(nfl), 'useConquest.ts: the power up does not deal RETIRED_GREATS_NFL with the never on market set');
  check(4, /fallenTeamMarket\( \{ [^}]*neverOnMarket: nflNeverOnMarket\(\) \}/.test(nfl), 'useConquest.ts: the Free Agency market does not pass the never on market set');
  check(4, /retiredNames\(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => onTable\.has\(n\)\)/.test(nfl), 'useConquest.ts: the never on market set is not built from TEAM_LEGENDS and RETIRED_GREATS_NFL less the men on a team table');
  check(4, !/RETIRED_GREATS_NBA|TEAM_LEGENDS_NBA/.test(nfl), 'useConquest.ts: names a basketball list');
  check(4, /signingList\( \{ [^}]*neverOnMarket: nbaNeverOnMarket\(\) \}, RETIRED_GREATS_NBA, \)/.test(nba), 'useConquestNba.ts: the power up does not deal RETIRED_GREATS_NBA with the never on market set');
  check(4, /fallenTeamMarket\( \{ [^}]*neverOnMarket: nbaNeverOnMarket\(\) \}/.test(nba), 'useConquestNba.ts: the Free Agency market does not pass the never on market set');
  check(4, /retiredNames\(TEAM_LEGENDS_NBA, RETIRED_GREATS_NBA, n => onTable\.has\(n\)\)/.test(nba), 'useConquestNba.ts: the never on market set is not built from TEAM_LEGENDS_NBA and RETIRED_GREATS_NBA less the men on a team table');
  check(4, !/RETIRED_GREATS_NFL|\bTEAM_LEGENDS\b/.test(nba), 'useConquestNba.ts: names a football list');
  for (const board of ['src/components/conquest/ConquestBoard.tsx', 'src/components/conquest/ConquestBoardNba.tsx']) {
    check(4, code(board).includes('Retired, last played {fa.lastSeason}'), `${board}: the power up dialog does not label a retired great with his last season`);
  }
  const conquestFiles = ['src/data', 'src/lib', 'src/hooks', 'src/components/conquest']
    .flatMap(d => fs.readdirSync(path.join(ROOT, d)).map(f => `${d}/${f}`))
    .filter(f => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter(f => f.startsWith('src/components/conquest/') || /\/(conquest|useConquest)[^/]*$/.test(f));
  check(4, conquestFiles.length >= 10, `only ${conquestFiles.length} Conquest source files found`);
  for (const f of conquestFiles) {
    const c = code(f);
    for (const n of DECEASED) check(4, !c.includes(n), `${f}: names ${n}, who is on the deceased list`);
  }
  measured.conquestFilesScanned = conquestFiles.length;
}

/* 5. Key stats. */
{
  const production = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nfl2025Production.json'), 'utf8'));
  check(5, production.season === CONQUEST_STAT_SEASON, `nfl2025Production.json is season ${production.season}`);
  const rows = expectedNflKeyStats(sourceOf('src/data/conquestData.ts'), production);
  check(5, rows.length >= 300, `only ${rows.length} NFL Conquest players parsed`);
  let printed = 0;
  for (const r of rows) {
    if (r.keyStat) {
      printed++;
      check(5, r.keyStat.startsWith(`${CONQUEST_STAT_SEASON}: `), `${r.team} ${r.name}: key stat "${r.keyStat}" carries no ${CONQUEST_STAT_SEASON} season`);
    }
    check(5, r.keyStat === r.expected, `${r.team} ${r.name}: key stat "${r.keyStat}", the two sourced 2025 line says "${r.expected || '(none)'}" (${r.how})`);
  }
  measured.nflKeyStats = rows.length;
  measured.nflPrinted = printed;
  const nbaSrc = sourceOf('src/data/conquestDataNba.ts');
  const nbaStats = [...nbaSrc.matchAll(/keyStat: (['"])(.*?)\1/g)].map(m => m[2]);
  check(5, nbaStats.length >= 250, `only ${nbaStats.length} NBA key stats parsed`);
  const COUNTING = /\b\d[\d,.]*\s*(pts|points|ppg|reb|rebounds|rpg|ast|assists|apg|stl|blk|threes|3s|yds|yards)\b/i;
  for (const k of nbaStats) check(5, !COUNTING.test(k) || /^\d{4}(-\d{2})?: /.test(k), `NBA key stat "${k}" prints a counting number with no season`);
  measured.nbaKeyStats = nbaStats.length;
}

console.log(`measured: ${JSON.stringify(measured)}`);
if (red.length) {
  console.log(`simConquestPeople: FAIL, ${red.length} of ${checks} checks red${CONTROL ? ` (control ${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`simConquestPeople: ${checks} checks, all green${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(CONTROL ? 3 : 0);
