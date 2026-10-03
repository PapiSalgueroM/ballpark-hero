/* Round 909: what simGmPicks and simGmTradePackage share.
 *
 * 1. bundleGm: the three real modules (gmPicks, gmDeadline, gmTradePackage)
 *    bundled with esbuild. A negative control never touches src: it bundles
 *    a rewritten COPY from OS temp behind an esbuild redirect, and refuses to
 *    run when the text it means to change is not in the file, or when the
 *    rewrite changed nothing. Sources are read with line endings normalised,
 *    and every anchor is one line, so a control fires on a CRLF checkout too.
 *
 * 2. A small league: clubs with players, prospects, a cap and a record, and
 *    a random trade desk that sends every proposal through the one real
 *    trade path, proposePackage. It is deliberately NOT one of the four
 *    engines (this round may not edit them and they do not use the ledger
 *    yet): it is the smallest league that exercises every rule the three
 *    modules carry, with the four sports' real rule sets handed in.
 *
 * The numbers in SPORTS are the HARNESS'S OWN expectations, typed here and
 * not read from the modules, so a module that drifts is caught by them. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIB = path.join(ROOT, 'src', 'lib');
const FILES = { picks: 'gmPicks.ts', deadline: 'gmDeadline.ts', pkg: 'gmTradePackage.ts' };

export const normaliseEol = t => t.split('\r\n').join('\n');

/** The source of one of the three modules, line endings normalised. */
export function readModule(key) {
  return normaliseEol(fs.readFileSync(path.join(LIB, FILES[key]), 'utf8'));
}

/** mulberry32: the same seed is the same league on every machine. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* swaps: { picks: [[now, was], ...], deadline: [...], pkg: [...] }. */
export async function bundleGm(tag, control, swaps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-${tag}-`));
  const paths = {};
  for (const key of Object.keys(FILES)) {
    paths[key] = path.join(LIB, FILES[key]);
    const list = swaps?.[key];
    if (!list) continue;
    const src = readModule(key);
    let out = src;
    for (const [now, was] of list) {
      if (now.includes('\n')) throw new Error(`control ${control}: an anchor spans lines. One line anchors only.`);
      if (!src.includes(now)) {
        throw new Error(`control ${control}: ${JSON.stringify(now.slice(0, 80))} is not in ${FILES[key]}, so it would change nothing. Refusing to run.`);
      }
      out = out.split(now).join(was);
    }
    if (out === src) throw new Error(`control ${control}: the rewrite of ${FILES[key]} changed nothing. Refusing to run.`);
    paths[key] = path.join(dir, FILES[key]);
    fs.writeFileSync(paths[key], out);
  }
  /* every import of a module, from the entry and from the other modules,
     lands on the chosen file */
  const redirect = {
    name: 'dukb-gm-control-copies',
    setup(b) {
      b.onResolve({ filter: /gmPicks(\.ts)?$/ }, () => ({ path: paths.picks }));
      b.onResolve({ filter: /gmDeadline(\.ts)?$/ }, () => ({ path: paths.deadline }));
      b.onResolve({ filter: /gmTradePackage(\.ts)?$/ }, () => ({ path: paths.pkg }));
    },
  };
  const entry = path.join(dir, 'entry.mjs');
  const fwd = p => JSON.stringify(p.split(path.sep).join('/'));
  fs.writeFileSync(entry, [
    `export * as picks from ${fwd(path.join(LIB, FILES.picks))};`,
    `export * as deadline from ${fwd(path.join(LIB, FILES.deadline))};`,
    `export * as pkg from ${fwd(path.join(LIB, FILES.pkg))};`,
  ].join('\n') + '\n');
  const out = path.join(dir, 'gm.mjs');
  /* esbuild resolves by walk-up from the repo root, so a worktree with no
     node_modules of its own still finds it */
  const req = createRequire(path.join(ROOT, 'package.json'));
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], outfile: out, logLevel: 'error',
  });
  const mod = await import(pathToFileURL(out).href);
  fs.rmSync(dir, { recursive: true, force: true });
  return mod;
}

/* The harness's own picture of the four leagues. `deadlineAfter` is the
   period this harness expects the window to shut after, worked out here by
   hand from the season lengths the four engines play: NFL 17 weeks (half
   way, the Tuesday after Week 9), NBA 20 rounds, NHL 20 rounds, MLB 27. */
export const SPORTS = [
  { key: 'nfl', clubs: 32, periods: 17, deadlineAfter: 9, rounds: 7, spots: 14, premium: 1.08 },
  { key: 'nba', clubs: 30, periods: 20, deadlineAfter: 12, rounds: 2, spots: 16, premium: 1.07 },
  { key: 'nhl', clubs: 32, periods: 20, deadlineAfter: 15, rounds: 7, spots: 16, premium: 1.07 },
  { key: 'mlb', clubs: 30, periods: 27, deadlineAfter: 18, rounds: 20, spots: 12, premium: 1.07 },
];

const pad = n => String(n).padStart(2, '0');
const ROSTER = 12;
const CAP = 150;

/** A league of `sport.clubs` clubs. Records are empty; the ledger is fresh. */
export function makeLeague(sport, gm, seed, season = 2026) {
  const rng = makeRng(seed);
  const rules = gm.picks.GM_PICK_RULES[sport.key];
  const ids = Array.from({ length: sport.clubs }, (_, i) => `C${pad(i + 1)}`);
  let n = 0;
  const teams = {};
  for (const id of ids) {
    const strength = 0.3 + rng() * 0.4;
    const players = [];
    for (let k = 0; k < ROSTER; k++) {
      const ovr = Math.round(60 + rng() * 22 + strength * 14);
      const age = 20 + Math.floor(rng() * 16);
      /* a fifth of the league is paid well past his rating, so his raw trade
         value is below zero: the pieces the 'offering more never hurts' walk
         has to survive */
      const overpaid = rng() < 0.2;
      const salary = Math.round((overpaid ? 14 + rng() * 10 : (ovr - 55) * 0.3 + rng() * 2) * 10) / 10;
      players.push({ id: `p${++n}`, ovr, age, salary });
    }
    const prospects = [];
    for (let k = 0; k < 4; k++) prospects.push({ id: `q${++n}`, grade: Math.round(40 + rng() * 40) });
    teams[id] = { id, players, prospects, wins: 0, losses: 0, strength };
  }
  return { sport, rules, ids, teams, season, ledger: gm.picks.newLedger(ids, season, rules), rng, nextId: n };
}

export function payroll(t) {
  let s = 0;
  for (const p of t.players) s += p.salary;
  return s;
}

/** A player's raw value in this league: rating, age, and what he is paid. Can be below zero. */
export function rawPlayerValue(p) {
  const ageW = Math.max(0.55, 1.25 - Math.max(0, p.age - 25) * 0.06);
  return (p.ovr - 55) * ageW - p.salary * 1.2;
}

const CURVE = { first: 30, perRound: 0.55, perYear: 0.85 };

/** The trade context for a proposal answered by club `to`, with `periodsPlayed` on the clock. */
export function makeContext(lg, gm, to, periodsPlayed, seasonClosed, stances) {
  const find = id => {
    for (const t of Object.values(lg.teams)) {
      const p = t.players.find(x => x.id === id) ?? t.prospects.find(x => x.id === id);
      if (p) return p;
    }
    return null;
  };
  const stance = stances?.[to] ?? 'holding';
  return {
    ledger: lg.ledger,
    pickRules: lg.rules,
    tradeRules: gm.pkg.GM_TRADE_RULES[lg.sport.key],
    season: lg.season,
    clock: { rules: gm.deadline.GM_DEADLINE_RULES[lg.sport.key], periods: lg.sport.periods, periodsPlayed, seasonClosed },
    premium: lg.sport.premium,
    valueOf: a => {
      if (a.kind === 'pick') {
        const p = gm.picks.findPick(lg.ledger, a.key);
        if (!p) return 0;
        return gm.deadline.stanceValue(stance, gm.pkg.pickValueAt(CURVE, p.round, p.year - lg.season));
      }
      const p = find(a.id);
      if (!p) return 0;
      if (a.kind === 'prospect') return p.grade / 4;
      return gm.deadline.stanceValue(stance, rawPlayerValue(p), p.age);
    },
    capCheck: pkg => {
      const a = lg.teams[pkg.from];
      const b = lg.teams[pkg.to];
      const sal = side => side.reduce((s, x) => s + (x.kind === 'player' ? (find(x.id)?.salary ?? 0) : 0), 0);
      const men = side => side.filter(x => x.kind === 'player').length;
      const aNow = payroll(a) - sal(pkg.give) + sal(pkg.get);
      const bNow = payroll(b) - sal(pkg.get) + sal(pkg.give);
      if (aNow > CAP && aNow > payroll(a)) return 'That puts them over the cap.';
      if (bNow > CAP && bNow > payroll(b)) return 'That puts the other club over the cap.';
      const aMen = a.players.length - men(pkg.give) + men(pkg.get);
      const bMen = b.players.length - men(pkg.get) + men(pkg.give);
      if (aMen < 9 || bMen < 9 || aMen > 15 || bMen > 15) return 'A roster would be too thin or too full.';
      return null;
    },
  };
}

/** Every asset a club could put in a deal: its players, its prospects, the picks it holds. */
export function clubAssets(lg, gm, id) {
  const t = lg.teams[id];
  return [
    ...t.players.map(p => ({ kind: 'player', id: p.id })),
    ...t.prospects.map(p => ({ kind: 'prospect', id: p.id })),
    ...gm.picks.picksHeldBy(lg.ledger, id).map(p => ({ kind: 'pick', key: gm.picks.pickKey(p) })),
  ];
}

export function pickSome(rng, list, n) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** The standings rows deadlineStances and reverseStandings read. */
export function standings(lg) {
  return lg.ids.map(id => ({ id, wins: lg.teams[id].wins, losses: lg.teams[id].losses }));
}

/** One period: every club plays one game against another, the stronger club the likelier winner. */
export function playPeriod(lg) {
  const order = pickSome(lg.rng, lg.ids, lg.ids.length);
  for (let i = 0; i + 1 < order.length; i += 2) {
    const a = lg.teams[order[i]];
    const b = lg.teams[order[i + 1]];
    const pa = Math.min(0.9, Math.max(0.1, 0.5 + (a.strength - b.strength) * 1.6));
    if (lg.rng() < pa) { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
  }
}
