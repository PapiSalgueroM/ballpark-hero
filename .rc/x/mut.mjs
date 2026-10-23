/* Reviewer mutation applier (runs on the runner only; the request line restores with git checkout).
   node .rc/x/mut.mjs <name>   applies one mutation, asserts its anchor occurs exactly once, and exits 3 otherwise. */
import fs from 'node:fs';

const M = {
  /* stale constant: the position share rule moves from 30 to 50 percent */
  share: ['scripts/lib/usConnectionsCheck.mjs', 'if (share >= 0.3) return true;', 'if (share >= 0.5) return true;'],
  /* dropped filter: the NFL club check stops reading ESPN's seasons (grid table only) */
  espn: ['scripts/lib/usConnectionsCheck.mjs', 'if (c.espn.some(a => espn.has(a) || extra.has(a))) return true;', '/* espn dropped */'],
  /* dropped rule in the shared lib: no second-fit finding is ever pushed */
  nosecond: ['scripts/lib/connectionsCrossCheck.mjs', "if (v === true) out.findings.push({ id: board.id, kind: 'second-fit'", "if (v === 'never') out.findings.push({ id: board.id, kind: 'second-fit'"],
  /* stale constant: the NHL watch reach shrinks from 110 points to 50 */
  reach: ['scripts/lib/usConnectionsCheck.mjs', 'const reach = { P: 110, G: 60, A: 80, GP: 82 }[c.stat] ?? 0;', 'const reach = { P: 50, G: 60, A: 80, GP: 82 }[c.stat] ?? 0;'],
  /* off by one: a legend needs more than five seasons */
  legend: ['scripts/lib/usConnectionsCheck.mjs', 'if (seasons >= 5) return true;', 'if (seasons > 5) return true;'],
  /* loosened rule: a legend group takes any man who played there */
  legendloose: ['scripts/lib/usConnectionsCheck.mjs', 'if (seasons >= 5) return true;', 'if (seasons >= 1) return true;'],
  /* dropped rule: section 6 compares spellings instead of the record's identity */
  identity: ['scripts/simUsConnectionsFacts.mjs', 'const id = sports[s].checker.identity?.(p) ?? fold(p);', 'const id = p;'],
  /* isolation probes (not mutations of the rule): the bell and karlsson controls also seed a two host fact for the
     man they move, so section 3 cannot fire and only the rule each control names can turn the run red */
  bellheld: ['scripts/simUsConnectionsFacts.mjs', `g.players[g.players.indexOf('Ben Roethlisberger')] = "Le'Veon Bell";`,
    `g.players[g.players.indexOf('Ben Roethlisberger')] = "Le'Veon Bell"; ledgerOf('nfl').facts.push({ name: "Le'Veon Bell", label: 'Played for the Steelers', holds: true, sources: [{ host: 'a.example' }, { host: 'b.example' }] });`],
  karlheld: ['scripts/simUsConnectionsFacts.mjs', `g.players[g.players.indexOf('Marc-Edouard Vlasic')] = 'Erik Karlsson';`,
    `g.players[g.players.indexOf('Marc-Edouard Vlasic')] = 'Erik Karlsson'; ledgerOf('nhl').facts.push({ name: 'Erik Karlsson', label: 'Played for the Sharks', holds: true, sources: [{ host: 'a.example' }, { host: 'b.example' }] });`],
  /* data regression: the son back in the father's place among men born in the Dominican Republic (bconn-001) */
  vladjr: ['src/data/baseballConnectionsPuzzles.ts', "'Fernando Tatis Jr.', 'Vladimir Guerrero', 'Nelson Cruz'", "'Fernando Tatis Jr.', 'Vladimir Guerrero Jr.', 'Nelson Cruz'"],
  /* data regression: Mike Mussina back in 300+ career wins (bconn-004) */
  mussina: ['src/data/baseballConnectionsPuzzles.ts', "'Roger Clemens', 'Nolan Ryan', 'Steve Carlton']", "'Roger Clemens', 'Mike Mussina', 'Steve Carlton']"],
  /* data regression: Brent Burns back in the Sharks group of nhlconn-004 (beside 1,000+ career points) */
  burns: ['src/data/nhlConnectionsPuzzles.ts', "'Macklin Celebrini'", "'Brent Burns'"],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`MUTATION ${name} unknown`); process.exit(3); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} ABORTED: anchor occurs ${n} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${name} applied to ${file}`);
