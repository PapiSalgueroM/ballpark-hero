/**
 * Rounds 70+72: bake real rosters for Club Manager from the Transfermarkt
 * style data in Supabase (player_market_values_dedup view), then apply the
 * VERIFIED summer 2026 transfer overlay (scripts/transferOverlay2026.mjs)
 * so squads reflect August 2026 after the window, not the pre-window
 * snapshot the dataset was imported from.
 *
 * Leagues baked: the big five (2026-27 memberships), EFL Championship,
 * Saudi Pro League, MLS East + West, Eredivisie, plus the UCL flavor clubs.
 * Preference order per player: year 2026 row, else year 2025 row (value
 * discounted 5%, age +1). Clubs with fewer than 8 real players are listed
 * in CM_PARTIAL so the UI can say so honestly.
 *
 * Re-run whenever the data or the overlay moves:
 *   node scripts/bakeClubManagerRosters.mjs
 *
 * FAILS CLOSED on unmapped positions, missing anchor players, or thin CORE
 * league clubs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* Supabase client from the app's own hardcoded values                */
/* ------------------------------------------------------------------ */
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
if (!urlMatch || !keyMatch) {
  console.error('FATAL: could not extract Supabase URL/key from client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* DB club name -> engine club name: scripts/lib/dbClubNames.mjs      */
/* (Round 531: shared with scripts/bakePlayers.mjs, one copy)         */
/* ------------------------------------------------------------------ */

/** Engine clubs with no dataset rows at all: baked as empty, youth-padded in game.
 *  Round 140 additions: the import ranks players by value worldwide, so newly
 *  promoted sides and the smallest top flight squads sit below its floor.
 *  They are real clubs in verified 2026-27 memberships, marked CM_PARTIAL. */
const KNOWN_EMPTY = ['Abha', 'ADO Den Haag', 'Cambuur',
  'Marítimo', 'Académico de Viseu', 'St Mirren',
  'Erzurumspor', 'Amedspor', 'Çorum FK', 'Kocaelispor',
  // Round 177: verified 2026-27 members with zero current dataset rows.
  'Austria Lustenau', 'Iraklis', 'Kalamata', 'Kifisia', 'Volos',
  // Round 185: verified 2026-27 members with zero usable (2025/2026) rows.
  // AC Horsens have 28 rows in the dataset, every one from older seasons.
  'AC Horsens', 'SønderjyskE',
  // Round 189: verified 2026-27 HNL members with zero usable rows. Istra
  // 1961's single 2025 row (Moris Valincic) is superseded by his own 2026
  // row at Dinamo Zagreb, which empties them honestly.
  'Varaždin', 'Lokomotiva Zagreb', 'Gorica', 'Rudeš', 'Istra 1961',
  // Round 394: 2. Bundesliga and Belgian members with no 2025/2026 rows.
  'Dynamo Dresden', 'Nürnberg', 'Osnabrück', 'Energie Cottbus', 'Lommel'];

/** Core clubs (big five leagues) must have 7+ players or the bake fails. */
const CORE_LEAGUE_CLUBS = new Set([
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea', 'Coventry City',
  'Crystal Palace', 'Everton', 'Fulham', 'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool',
  'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest', 'Sunderland', 'Tottenham',
  'Alavés', 'Athletic Club', 'Atlético Madrid', 'Barcelona', 'Real Betis', 'Celta Vigo', 'Elche',
  'Espanyol', 'Getafe', 'Levante', 'Osasuna', 'Rayo Vallecano', 'Real Madrid', 'Real Sociedad',
  'Sevilla', 'Valencia', 'Villarreal',
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Fiorentina', 'Genoa', 'Inter Milan', 'Juventus',
  'Lazio', 'Lecce', 'AC Milan', 'Napoli', 'Parma', 'Roma', 'Sassuolo', 'Torino', 'Udinese', 'Venezia',
  'Augsburg', 'Bayer Leverkusen', 'Bayern Munich', 'Borussia Dortmund', 'Gladbach',
  'Eintracht Frankfurt', 'Freiburg', 'Hamburg', 'Hoffenheim', 'Köln', 'Mainz', 'RB Leipzig',
  'Schalke 04', 'Stuttgart', 'Union Berlin', 'Werder Bremen',
  'Angers', 'Auxerre', 'Brest', 'Le Havre', 'Lens', 'Lille', 'Lorient', 'Lyon', 'Marseille',
  'Monaco', 'Nice', 'Paris FC', 'PSG', 'Rennes', 'Strasbourg', 'Toulouse',
]);

const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
};

/** USD market value -> game rating on a 48-94 curve ($216m -> 94, $1m -> 64). */
function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(48, Math.min(94, r));
}

/** USD -> pounds sterling millions, one decimal. */
function gbpM(usd) {
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Fetch: 2026 preferred, 2025 fallback                               */
/* ------------------------------------------------------------------ */
const dbNames = Object.keys(DB_TO_ENGINE);
const rows = [];

/* Round 140: `--dump=path.json` runs the bake OFFLINE from a rows dump,
 * because the cloud sandbox's network egress does not reach Supabase
 * directly. The dump is produced through the Supabase MCP with:
 *   SELECT id,player_name,club,position,age,market_value_usd,year
 *   FROM player_market_values_dedup WHERE year IN (2025,2026)
 * saved as {"rows":[...]}. Same columns, same source view, so the two
 * paths bake identical files. With no flag it fetches live as always. */
const dumpArg = process.argv.find(a => a.startsWith('--dump='));
if (dumpArg) {
  const dumpPath = dumpArg.slice('--dump='.length);
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const all = dump.rows ?? dump;
  const nameSet = new Set(dbNames);
  rows.push(...all.filter(r => [2025, 2026].includes(r.year) && nameSet.has(r.club)));
  console.log(`Loaded ${rows.length} usable rows from dump ${dumpPath} (${all.length} in file)`);
} else {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select('id,player_name,club,position,age,market_value_usd,year')
      .in('year', [2025, 2026])
      .in('club', dbNames)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) {
      console.error('FATAL: query failed:', error.message);
      process.exit(1);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  console.log(`Fetched ${rows.length} rows (2025+2026)`);
}

/* ------------------------------------------------------------------ */
/* Assemble: per player keep the 2026 row, else discounted 2025       */
/* ------------------------------------------------------------------ */
const errors = [];
const byPlayer = new Map();
for (const r of rows) {
  const engineClub = DB_TO_ENGINE[r.club];
  if (!engineClub) continue;
  const pos = POS_MAP[r.position];
  if (!pos) { errors.push(`Unmapped position "${r.position}" (${r.player_name})`); continue; }
  const name = String(r.player_name ?? '').trim();
  if (!name) continue;
  const age = Number(r.age);
  const usd = Number(r.market_value_usd);
  if (!Number.isFinite(age) || age < 14 || age > 45) continue;
  if (!Number.isFinite(usd) || usd <= 0) continue;
  const existing = byPlayer.get(name);
  if (existing && existing.year >= r.year) continue;
  const isFallback = r.year === 2025;
  byPlayer.set(name, {
    year: r.year,
    club: engineClub,
    p: pos,
    a: isFallback ? age + 1 : age,
    usd: isFallback ? usd * 0.95 : usd,
  });
}

/* ------------------------------------------------------------------ */
/* Apply the verified summer 2026 overlay                             */
/* ------------------------------------------------------------------ */
/* Round 393: one set over both lists. Five HNL clubs (Gorica, Istra 1961,
   Lokomotiva Zagreb, Rudes, Varazdin) are mapped dataset clubs AND listed as
   known empty, and concat emitted each of them twice, which tsc refuses as a
   duplicate object key. The committed roster predates that overlap. */
const engineClubs = [...new Set([...Object.values(DB_TO_ENGINE), ...KNOWN_EMPTY])];
const engineClubSet = new Set(engineClubs);
let overlayMoved = 0;
let overlayDropped = 0;
for (const move of TRANSFER_OVERLAY_2026) {
  const rec = byPlayer.get(move.name);
  if (move.to === null) {
    if (rec) { byPlayer.delete(move.name); overlayDropped += 1; }
    continue;
  }
  if (!engineClubSet.has(move.to)) { errors.push(`OVERLAY: unknown destination "${move.to}" for ${move.name}`); continue; }
  if (rec) {
    rec.club = move.to;
    overlayMoved += 1;
  } else if (move.add) {
    const pos = POS_MAP[move.add.p];
    if (!pos) { errors.push(`OVERLAY ADD: bad position for ${move.name}`); continue; }
    byPlayer.set(move.name, { year: 2026, club: move.to, p: pos, a: move.add.a, usd: move.add.usd });
    overlayMoved += 1;
  } else {
    errors.push(`OVERLAY: "${move.name}" not found in dataset and no add data`);
  }
}
console.log(`Overlay applied: ${overlayMoved} moved, ${overlayDropped} left the modeled world`);

/* ------------------------------------------------------------------ */
/* Round 542: apply the 2026 roster adjudication                      */
/* ------------------------------------------------------------------ */
/* The 2025 fallback above carries the player's 2025 CLUB, so anyone the market
   dataset stopped tracking is planted at last season's club and looks exactly
   like a verified current row. A player reported it on 2026-09-11 (Joao Felix
   at Chelsea), and the measurement was 356 rows in that state.

   These are NOT dropped on the absence, because absence from one dataset is
   not evidence of a transfer: the 2026 World Cup squads confirm ten of them,
   David Alaba and Wout Weghorst among them, are exactly where the bake put
   them. Only rows a named source actually resolves are changed here, and the
   332 still unresolved stay in the file and stay listed as pending, so nobody
   mistakes "not yet checked" for "checked and fine".

   scripts/data/rosterConfirmation2026.json is the ledger and
   scripts/simRosterAdjudication.mjs holds the shipped file to it. */
const adjudication = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/rosterConfirmation2026.json'), 'utf8'));
let adjMoved = 0;
let adjRemoved = 0;
for (const m of adjudication.movedTo) {
  const rec = byPlayer.get(m.name);
  if (!engineClubSet.has(m.to)) { errors.push(`ADJUDICATION: unknown destination "${m.to}" for ${m.name}`); continue; }
  if (rec) { rec.club = m.to; adjMoved += 1; }
}
for (const r of [...adjudication.removedClubNotModelled, ...adjudication.notCurrent]) {
  if (byPlayer.delete(r.name)) adjRemoved += 1;
}
console.log(`Adjudication applied: ${adjMoved} moved, ${adjRemoved} removed, ${adjudication.pending.length} still pending a second source`);

/* ------------------------------------------------------------------ */
/* Group by club + validate                                           */
/* ------------------------------------------------------------------ */
const byClub = new Map(engineClubs.map(c => [c, []]));
for (const [name, rec] of byPlayer) {
  byClub.get(rec.club).push({ n: name, p: rec.p, a: rec.a, v: gbpM(rec.usd), r: ratingOf(rec.usd) });
}
for (const list of byClub.values()) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));

/* Round 393: the file carries two leagues the bake never mapped, the
   2. Bundesliga (Round 142) and the Belgian Pro League (Round 143), spliced
   in by hand under comment markers. A plain re-bake dropped all 35 of them,
   which is how this was found. Any club block in the existing file whose key
   this bake does not generate is carried verbatim, counted, and flagged
   partial by the same rule, so the bake can be re-run for a transfer window
   without losing a league. Mapping those leagues into DB_TO_ENGINE is the
   real fix and is filed on the board. */
const existingPath = path.join(ROOT, 'src/data/clubManagerRosters.ts');
const carried = [];
if (fs.existsSync(existingPath)) {
  const prev = fs.readFileSync(existingPath, 'utf8').split('\r\n').join('\n');
  const blockRe = /^  '((?:[^'\\]|\\.)+)': \[\n([\s\S]*?)^  \],\n/gm;
  let m;
  while ((m = blockRe.exec(prev))) {
    const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    if (engineClubSet.has(key)) continue;
    carried.push({ key, body: m[2], players: (m[2].match(/\{ n: /g) || []).length });
  }
}
const carriedPlayers = carried.reduce((s, c) => s + c.players, 0);
console.log(`Carried from the previous file: ${carried.length} clubs, ${carriedPlayers} players (leagues the bake does not map)`);

const partial = [];
for (const c of carried) if (c.players < 8) partial.push(c.key);
for (const club of engineClubs) {
  const n = byClub.get(club).length;
  if (CORE_LEAGUE_CLUBS.has(club) && n < 7) errors.push(`CORE club too thin: ${club} has ${n}`);
  if (n < 8) partial.push(club);
}

// Anchors: the owner's exact complaints and verified window facts must hold.
const at = (club, frag) => (byClub.get(club) ?? []).some(p => p.n.includes(frag));
if (!at('Chicago Fire', 'Lewandowski')) errors.push('ANCHOR: Lewandowski not at Chicago Fire');
if (!at('Ajax', 'ter Stegen')) errors.push('ANCHOR: ter Stegen not at Ajax');
if (!at('Chelsea', 'Morgan Rogers')) errors.push('ANCHOR: Rogers not at Chelsea');
if (!at('Orlando City', 'Griezmann')) errors.push('ANCHOR: Griezmann not at Orlando City');
if (!at('Real Madrid', 'Mbapp')) errors.push('ANCHOR: Mbappé missing from Real Madrid');
if (!at('Al-Nassr', 'Ronaldo')) errors.push('ANCHOR: Ronaldo missing from Al-Nassr');
if (at('Barcelona', 'Lewandowski')) errors.push('ANCHOR: Lewandowski still at Barcelona');
/* Round 542, from the 2026-09-11 player report. The 2026 World Cup squads put
   Felix at Al-Nassr; the bake had him at Chelsea off a 2025 fallback row. */
if (at('Chelsea', 'João Félix')) errors.push('ANCHOR: Joao Felix still at Chelsea, reported wrong by a player 2026-09-11');
if (!at('Al-Nassr', 'João Félix')) errors.push('ANCHOR: Joao Felix missing from Al-Nassr');
if (at('Liverpool', 'Diogo Jota')) errors.push('ANCHOR: Diogo Jota must not ship in any 2026-27 squad');

const xiAvg = club => {
  const rs = (byClub.get(club) ?? []).map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (rs.length < 11) rs.push(60);
  return rs.reduce((s, r) => s + r, 0) / 11;
};
if (!(xiAvg('Real Madrid') > xiAvg('Racing Santander'))) errors.push('SANITY: Real Madrid <= Racing');
if (!(xiAvg('Al-Hilal') > xiAvg('Al-Riyadh'))) errors.push('SANITY: Al-Hilal <= Al-Riyadh');
if (!(xiAvg('Inter Miami') > xiAvg('San Jose Earthquakes'))) errors.push('SANITY: Miami <= San Jose');
// Round 185: the new pair's giants outrate their thinnest members.
if (!(xiAvg('FC Copenhagen') > xiAvg('Lyngby'))) errors.push('SANITY: Copenhagen <= Lyngby');
if (!(xiAvg('Basel') > xiAvg('Vaduz'))) errors.push('SANITY: Basel <= Vaduz');
// Round 189: the HNL giants outrate the promoted side.
if (!(xiAvg('Dinamo Zagreb') > xiAvg('Rudeš'))) errors.push('SANITY: Dinamo <= Rudeš');
if (!(xiAvg('Hajduk Split') > xiAvg('Gorica'))) errors.push('SANITY: Hajduk <= Gorica');

const total = [...byClub.values()].reduce((s, l) => s + l.length, 0);
if (total < 2800) errors.push(`Only ${total} players total (expected 2800+)`);

if (errors.length) {
  console.error('FAILED CLOSED, nothing written. Problems:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Emit                                                               */
/* ------------------------------------------------------------------ */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = engineClubs.slice().sort();
const stamp = new Date().toISOString().slice(0, 10);
let out = `// Rounds 70+72: real rosters for every Club Manager club, generated ${stamp}
// Source: Supabase player_market_values_dedup (2026 rows, 2025 fallback at a
// 5% discount) PLUS the verified summer 2026 transfer overlay
// (scripts/transferOverlay2026.mjs), so squads reflect August 2026 after the
// window. ${total + carriedPlayers} players, ${clubsSorted.length + carried.length} clubs across the big five leagues
// (2026-27 memberships), EFL Championship, Saudi Pro League, MLS East and
// West, Eredivisie, Primeira Liga, Scottish Premiership, Süper Lig,
// 2. Bundesliga, Belgian Pro League, Austrian Bundesliga, Super League
// Greece, Danish Superliga, Swiss Super League and SuperSport HNL.
// Values in £m, ratings 48-94 from the value curve.
// Regenerate with: node scripts/bakeClubManagerRosters.mjs
// DO NOT EDIT BY HAND.
import type { Position } from '@/types/game';

export interface BakedPlayer {
  /** Full name. */
  n: string;
  /** Position. */
  p: Position;
  /** Age. */
  a: number;
  /** Market value in £m. */
  v: number;
  /** Game rating 48-94 derived from market value. */
  r: number;
}

export const CM_ROSTER_META = {
  generated: '${stamp}',
  asOf: 'August 2026, after the summer window',
  players: ${total + carriedPlayers},
  clubs: ${clubsSorted.length + carried.length},
  overlayMoves: ${overlayMoved},
};

/** Clubs where the dataset runs thin (under 8 real players); the game pads
 *  these squads with youth players and the picker says so. */
export const CM_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

export const CM_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
if (carried.length) {
  out += `\n  /* ---- Carried from the previous file, not regenerated: the bake does not
     map these leagues (2. Bundesliga from Round 142, Belgian Pro League from
     Round 143). Round 393 made the bake keep them instead of dropping them. ---- */\n`;
  for (const c of carried) out += `  '${esc(c.key)}': [\n${c.body}  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), out);
console.log(`Wrote src/data/clubManagerRosters.ts (${(out.length / 1024).toFixed(0)}KB), ${partial.length} partial clubs`);

for (const club of clubsSorted) {
  const list = byClub.get(club);
  const top = list[0] ? `${list[0].n} (£${list[0].v}m, ${list[0].r})` : 'EMPTY';
  console.log(`${club.padEnd(24)} ${String(list.length).padStart(3)}  XI ${xiAvg(club).toFixed(1)}  ${top}`);
}
