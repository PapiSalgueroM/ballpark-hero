/**
 * Rounds 70+72: bake real rosters for Club Manager from the Transfermarkt
 * style data in Supabase (player_market_values_dedup view), then apply the
 * VERIFIED summer 2026 transfer overlay (scripts/transferOverlay2026.mjs)
 * so squads reflect August 2026 after the window, not the pre-window
 * snapshot the dataset was imported from.
 *
 * Leagues baked: the big five (2026-27 memberships), EFL Championship,
 * Saudi Pro League, MLS East + West, Eredivisie, the later leagues the
 * written file's own header lists (Serie B, Ligue 2 and the Segunda División since Round 1040), plus the UCL
 * flavor clubs.
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
import { POS_MAP, ratingOf, gbpM } from './lib/cmValueCurve.mjs';

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
/* Round 876: Abha, Erzurumspor, Çorum FK, Volos and Nürnberg left this list;
   the table carried their players under spellings scripts/lib/dbClubNames.mjs
   now maps. */
const KNOWN_EMPTY = ['ADO Den Haag', 'Cambuur',
  'Marítimo', 'Académico de Viseu', 'St Mirren',
  'Amedspor', 'Kocaelispor',
  // Round 177: verified 2026-27 members with zero current dataset rows.
  'Austria Lustenau', 'Iraklis', 'Kalamata', 'Kifisia',
  // Round 185: verified 2026-27 members with zero usable (2025/2026) rows.
  // AC Horsens have 28 rows in the dataset, every one from older seasons.
  'AC Horsens', 'SønderjyskE',
  // Round 189: verified 2026-27 HNL members with zero usable rows. Istra
  // 1961's single 2025 row (Moris Valincic) is superseded by his own 2026
  // row at Dinamo Zagreb, which empties them honestly.
  'Varaždin', 'Lokomotiva Zagreb', 'Gorica', 'Rudeš', 'Istra 1961',
  // Round 394: 2. Bundesliga and Belgian members with no 2025/2026 rows.
  'Dynamo Dresden', 'Osnabrück', 'Energie Cottbus', 'Lommel',
  // Round 876: Brazil's Serie A 2026. Chapecoense have no 2026 row in the
  // table and their one 2025 row belongs to a man whose 2026 row is at
  // Fortaleza, so their spelling is left unmapped and they ship empty.
  'Chapecoense',
  // Round 883: Liga MX 2026-27. Atlante have no row in the table under any
  // spelling (they were in the second tier until this season).
  'Atlante',
  // Round 1040: Serie B 2026-27. Arezzo, up from Serie C, have no row in the
  // table under any spelling (a grep of the 2026-10-02 dump for "arezzo"
  // finds nothing).
  'Arezzo',
  // Round 1040: Ligue 2 2026-27. Sochaux, Dijon and Rodez have no row under
  // any spelling (grep of the 2026-10-02 dump for sochaux, dijon, rodez).
  'Sochaux', 'Dijon', 'Rodez',
  // Round 1040: the Segunda División 2026-27. Tenerife, Córdoba and Eldense
  // have no row under any spelling (grep of the dump for tenerife, c.rdoba,
  // eldense finds only two Argentine clubs, left unmapped).
  'Tenerife', 'Córdoba', 'Eldense'];

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

/* Round 1035: the position map, the value to rating curve and the pounds
   conversion live in scripts/lib/cmValueCurve.mjs, shared with
   scripts/genClubManagerALeague.mjs so both rate on one curve. */

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
/* Round 883 review: the table has no id that spans years (its id is a row
   id), so a name is the only key, and keying on it alone merged two men who
   share one. Mapping Liga MX let Toluca's Paulinho (2026 row, age 33, a
   striker) overwrite Palmeiras's Paulinho (2025 row, age 24) and Vasco's Jose
   Luis Rodriguez (a right back) overwrite FC Juarez's (a winger), deleting two
   real players from clubs they really play for. A newer row now replaces an
   older one of the same name only when they can be the same man: the age moves
   by -1 to 3 years between the two rows and the position stays in its group
   (keeper, defence, midfield, attack, with midfield and attack counted as one,
   since wingers and number tens are filed as either). Measured on the
   2026-10-02 dump: of 1,213 such pairs at two modelled clubs, 1,199 move by
   exactly a year, eight left midfielders by -1 and one by 3 (all the same
   men, a quirk of the table), and six fail the test, all six two different
   men. The other man is kept as his own record under a separate key; the
   overlay and the ledger below act on the name, which is the newer man. */
const POS_GROUP = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', CDM: 'MA', CM: 'MA', CAM: 'MA', LM: 'MA', RM: 'MA', LW: 'MA', RW: 'MA', ST: 'MA', CF: 'MA' };
function canBeSameMan(newer, older) {
  if (newer.year === older.year) return true;
  const d = newer.rawAge - older.rawAge;
  return d >= -1 && d <= 3 && POS_GROUP[newer.p] === POS_GROUP[older.p];
}
const errors = [];
const byPlayer = new Map();
const namesakes = [];
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
  const isFallback = r.year === 2025;
  const rec = {
    name,
    year: r.year,
    rawAge: age,
    club: engineClub,
    p: pos,
    a: isFallback ? age + 1 : age,
    usd: isFallback ? usd * 0.95 : usd,
  };
  if (!byPlayer.has(name)) byPlayer.set(name, []);
  byPlayer.get(name).push(rec);
}
for (const [name, recs] of byPlayer) {
  // Newest row first; the first row of a year wins a tie, as before.
  const order = recs.map((x, i) => [x, i]).sort((a, b) => b[0].year - a[0].year || a[1] - b[1]).map(x => x[0]);
  const kept = [];
  for (const rec of order) {
    if (kept.some(k => canBeSameMan(k, rec))) continue;
    kept.push(rec);
  }
  byPlayer.set(name, kept[0]);
  for (const other of kept.slice(1)) namesakes.push(other);
}
for (const other of namesakes) {
  byPlayer.set(`${other.name}\u0000${other.club}`, other);
  console.log(`Namesake kept apart: ${other.name} at ${other.club} (${other.year} row, age ${other.rawAge}, ${other.p})`);
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
   rows still unresolved (332 after Round 542, 314 after Round 616's two source
   web pass over the Premier League rows) stay in the file and stay listed as
   pending, so nobody mistakes "not yet checked" for "checked and fine".
   A season-long loanee is placed at the club he plays for; the ledger's
   loan and loanFrom fields are information only and this step ignores them.

   scripts/data/rosterConfirmation2026.json is the ledger and
   scripts/simRosterAdjudication.mjs holds the shipped file to it. */
const adjudication = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/rosterConfirmation2026.json'), 'utf8'));
let adjMoved = 0;
let adjRemoved = 0;
for (const m of adjudication.movedTo) {
  // A namesake kept apart above sits under name plus his table club, which
  // is the ledger's "from"; the man the name alone finds is the other one.
  const rec = byPlayer.get(`${m.name}\u0000${m.from}`) ?? byPlayer.get(m.name);
  if (!engineClubSet.has(m.to)) { errors.push(`ADJUDICATION: unknown destination "${m.to}" for ${m.name}`); continue; }
  if (rec) { rec.club = m.to; adjMoved += 1; }
}
for (const r of [...adjudication.removedClubNotModelled, ...adjudication.notCurrent]) {
  if (byPlayer.delete(r.name)) adjRemoved += 1;
}
/* Round 1015: a pending row marked withheld (scripts/foldRosterAdjudication.mjs)
   is one whose 2026-27 squad list leaves him out of the club recorded here,
   so he ships in no squad until two families say where he is. Every withheld
   man must be found, or the run fails: a name that silently stays is the
   exact bug this step exists for. */
let adjWithheld = 0;
for (const r of adjudication.pending.filter(p => p.withheld)) {
  const k = byPlayer.get(`${r.name}\u0000${r.club}`) ? `${r.name}\u0000${r.club}` : r.name;
  if (byPlayer.get(k)?.club === r.club && byPlayer.delete(k)) adjWithheld += 1;
  else errors.push(`ADJUDICATION: withheld ${r.name} is not in the dataset at ${r.club}`);
}
console.log(`Adjudication applied: ${adjMoved} moved, ${adjRemoved} removed, ${adjWithheld} withheld, ${adjudication.pending.length - adjWithheld} still pending a second source at their recorded club`);

/* ------------------------------------------------------------------ */
/* Group by club + validate                                           */
/* ------------------------------------------------------------------ */
const byClub = new Map(engineClubs.map(c => [c, []]));
for (const [name, rec] of byPlayer) {
  byClub.get(rec.club).push({ n: rec.name ?? name, p: rec.p, a: rec.a, v: gbpM(rec.usd), r: ratingOf(rec.usd) });
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
/* Round 876, from the review of the Brazil re-bake: two 2025 fallback rows
   planted men at clubs they had left. Grêmio announced Weverton on 2026-01-15
   (gremio.net/noticias/detalhes/29912, band.com.br); Atlanta United signed
   Júnior Alonso in July 2026 (atlutd.com, atlantanewsfirst.com). The ledger
   rows carry the sources. */
if (at('Palmeiras', 'Weverton') || !at('Grêmio', 'Weverton')) errors.push('ANCHOR: Weverton must be at Grêmio, not Palmeiras');
if (at('Atlético Mineiro', 'Júnior Alonso') || !at('Atlanta United', 'Júnior Alonso')) errors.push('ANCHOR: Júnior Alonso must be at Atlanta United, not Atlético Mineiro');

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
// Round 876: Brazil's giants outrate the sides the table barely sees. Flamengo
// against Remo (2 real players) mostly proves Flamengo kept its mapping; the
// Palmeiras pair is against Vitória, which ships 9 real players, so it compares
// real ratings rather than the 60s xiAvg pads a near empty club with.
if (!(xiAvg('Flamengo') > xiAvg('Remo'))) errors.push('SANITY: Flamengo <= Remo');
if (!(xiAvg('Palmeiras') > xiAvg('Vitória'))) errors.push('SANITY: Palmeiras <= Vitória');
// Round 883: Liga MX's two biggest clubs outrate two smaller ones, every side
// with real players (America 21, Necaxa 10, Guadalajara 13, Juarez 8 in the
// 2026-10-02 bake), so both pairs compare real ratings and neither leans on
// the pads of an empty club.
if (!(xiAvg('América') > xiAvg('Necaxa'))) errors.push('SANITY: América <= Necaxa');
if (!(xiAvg('Guadalajara') > xiAvg('FC Juárez'))) errors.push('SANITY: Guadalajara <= FC Juárez');
// Round 1040: Serie B. Only Pisa (18 real men), Verona (13) and Cremonese
// (10) carry 8 or more in the 2026-10-02 bake; every other member is under
// it and padded, so both pairs compare real squads against a real squad.
if (!(xiAvg('Pisa') > xiAvg('Cremonese'))) errors.push('SANITY: Pisa <= Cremonese');
if (!(xiAvg('Verona') > xiAvg('Cremonese'))) errors.push('SANITY: Verona <= Cremonese');
// Round 1040: Ligue 2. Nantes (14), Saint-Étienne (13) and Reims (12) carry
// 8 or more real men; Pau (3) is mostly pads, so this only asks that a real
// squad clears a padded one.
if (!(xiAvg('Saint-Étienne') > xiAvg('Pau'))) errors.push('SANITY: Saint-Étienne <= Pau');
// Round 1040: the Segunda División. Girona (13), Mallorca (12), Real Oviedo (9)
// and Las Palmas (8) carry 8 or more real men; Castellón (4) is mostly pads.
if (!(xiAvg('Girona') > xiAvg('Castellón'))) errors.push('SANITY: Girona <= Castellón');
if (!(xiAvg('Girona') > xiAvg('Real Oviedo'))) errors.push('SANITY: Girona <= Real Oviedo');

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
// Greece, Danish Superliga, Swiss Super League, SuperSport HNL,
// Brazil's Serie A, Liga MX, Serie B, Ligue 2 and the Segunda División.
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
