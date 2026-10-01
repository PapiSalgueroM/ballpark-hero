/* Round 829: the network half of the MLB Front Office roster bake.

   WHY THIS EXISTS. The 13 man rosters the game shipped since 2026-08-05 came
   from a bake script that was never committed, so nobody could rebuild or
   check them. This file pulls the same public source that bake named, MLB's
   own Stats API (statsapi.mlb.com), and saves a compact record of what it
   said under scripts/data/. scripts/genMlbFrontOfficeRoster.mjs then turns
   that record into the game's data file with no network at all, so the bake
   is reproducible offline from committed files.

   What it saves:
     scripts/data/mlbRosters2026.json   every club's 40 man list on the last
                                        day of the 2026 regular season, one
                                        row per man: id, name, position, list
                                        status, birth date, bats, throws, and
                                        his 2026 regular season line
     scripts/data/mlbStats2026.json     the whole league's 2026 regular season
                                        hitting and pitching lines, the pools
                                        every rating is a percentile against

   The second source is a spot check, not a pipeline (the owner's standing
   rule: documented datasets, never page by page crawling). --spot reads
   ESPN's roster for five clubs picked by a fixed rule and compares ten of the
   shipped men each, then writes the result into the roster record. The rule
   and the result are in that record, and the generator refuses to write a
   data file when the mismatch rate is above its limit.

   Usage (each batch merges into the record, so a cut loses one batch at most):
     node scripts/fetchMlbFoRecord.mjs --teams ARI,ATH,ATL,BAL,BOS
     node scripts/fetchMlbFoRecord.mjs --stats
     node scripts/fetchMlbFoRecord.mjs --spot

   Nothing here is imported by the site. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_TO_API, SPOT_TEAMS, SPOT_PER_TEAM, ESPN_ABBR, selectTwentySix, spotSample, normName } from './lib/mlbFoRecord.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROSTERS = path.join(ROOT, 'scripts', 'data', 'mlbRosters2026.json');
const STATS = path.join(ROOT, 'scripts', 'data', 'mlbStats2026.json');
const API = 'https://statsapi.mlb.com/api/v1';
const SEASON = 2026;

const today = () => new Date().toISOString().slice(0, 10);
const getJson = async url => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw new Error(`${url}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
};

/* A traded man's season comes back as one split per club plus a total with no
   club on it. The total is his season; a man with one club has one split. */
const seasonSplit = (person, group) => {
  const g = (person.stats || []).find(s => s.group && s.group.displayName === group && s.type && s.type.displayName === 'season');
  if (!g || !g.splits || !g.splits.length) return null;
  const total = g.splits.find(s => !s.team);
  return (total || g.splits[0]).stat;
};
const num = v => (v === undefined || v === null || v === '' || String(v).includes('-') ? null : Number(v));
const hitLine = st => (st ? { pa: st.plateAppearances ?? 0, ops: num(st.ops) } : null);
const pitLine = st => (st ? {
  g: st.gamesPitched ?? st.gamesPlayed ?? 0, gs: st.gamesStarted ?? 0, outs: st.outs ?? 0,
  hr: st.homeRuns ?? 0, bb: st.baseOnBalls ?? 0, k: st.strikeOuts ?? 0, sv: st.saves ?? 0,
} : null);

const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

/* One row per line, so a diff of the record reads man by man. */
const writeRecord = (file, obj, rowKeys) => {
  const pretty = (v, key, ind) => {
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const item = x => (rowKeys.includes(key) ? JSON.stringify(x) : pretty(x, '', `${ind}  `));
      return `[\n${v.map(x => `${ind}  ${item(x)}`).join(',\n')}\n${ind}]`;
    }
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      if (!ks.length) return '{}';
      return `{\n${ks.map(k => `${ind}  ${JSON.stringify(k)}: ${pretty(v[k], k, `${ind}  `)}`).join(',\n')}\n${ind}}`;
    }
    return JSON.stringify(v);
  };
  fs.writeFileSync(file, `${pretty(obj, '', '')}\n`);
};

async function seasonDates() {
  const j = await getJson(`${API}/seasons/${SEASON}?sportId=1`);
  const s = j.seasons[0];
  return { regularSeasonEndDate: s.regularSeasonEndDate, postSeasonStartDate: s.postSeasonStartDate };
}

async function fetchTeams(abbrs) {
  const dates = await seasonDates();
  const rosterDate = dates.regularSeasonEndDate;
  const teamsJson = await getJson(`${API}/teams?sportId=1&season=${SEASON}`);
  const byApi = new Map(teamsJson.teams.map(t => [t.abbreviation, t]));
  const record = readJson(ROSTERS, { meta: {}, teams: {} });
  record.meta = {
    source: 'MLB Stats API, statsapi.mlb.com (the league\'s own public data service)',
    season: SEASON,
    rosterType: '40Man',
    rosterDate,
    rosterDateMeaning: 'regularSeasonEndDate from the API\'s own season record, the last day of the 2026 regular season',
    rosterUrlTemplate: `${API}/teams/{teamId}/roster?rosterType=40Man&date={rosterDate}&hydrate=person(stats(group=[hitting,pitching],type=[season],season=${SEASON},sportId=1))`,
    secondSource: 'ESPN team roster pages, spot check only (see spotCheck)',
    ...(record.meta.reads ? { reads: record.meta.reads } : {}),
  };
  for (const abbr of abbrs) {
    const apiAbbr = GAME_TO_API[abbr];
    const team = byApi.get(apiAbbr);
    if (!team) throw new Error(`${abbr}: the API has no club ${apiAbbr} for ${SEASON}`);
    const url = record.meta.rosterUrlTemplate.replace('{teamId}', team.id).replace('{rosterDate}', rosterDate);
    const j = await getJson(url.replace('[hitting,pitching]', '%5Bhitting,pitching%5D').replace('[season]', '%5Bseason%5D'));
    const players = j.roster.map(r => {
      const p = r.person;
      return {
        id: p.id,
        name: p.fullName,
        pos: p.primaryPosition ? p.primaryPosition.abbreviation : (r.position && r.position.abbreviation),
        status: r.status ? r.status.code : null,
        birthDate: p.birthDate || null,
        bats: p.batSide ? p.batSide.code : null,
        throws: p.pitchHand ? p.pitchHand.code : null,
        hit: hitLine(seasonSplit(p, 'hitting')),
        pit: pitLine(seasonSplit(p, 'pitching')),
      };
    }).sort((a, b) => a.id - b.id);
    record.teams[abbr] = {
      teamId: team.id,
      club: team.name,
      read: today(),
      statsapiUrl: url,
      players,
    };
    console.log(`${abbr} (${team.name}): ${players.length} on the 40 man list, read ${today()}`);
  }
  record.teams = Object.fromEntries(Object.entries(record.teams).sort(([a], [b]) => a.localeCompare(b)));
  writeRecord(ROSTERS, record, ['players', 'checked']);
}

async function fetchStats() {
  const hitUrl = `${API}/stats?stats=season&group=hitting&season=${SEASON}&sportId=1&gameType=R&playerPool=ALL&limit=5000`;
  const pitUrl = `${API}/stats?stats=season&group=pitching&season=${SEASON}&sportId=1&gameType=R&playerPool=ALL&limit=5000`;
  const h = await getJson(hitUrl);
  const p = await getJson(pitUrl);
  const hitting = h.stats[0].splits.map(s => ({ id: s.player.id, name: s.player.fullName, ...hitLine(s.stat) })).sort((a, b) => a.id - b.id);
  const pitching = p.stats[0].splits.map(s => ({ id: s.player.id, name: s.player.fullName, ...pitLine(s.stat) })).sort((a, b) => a.id - b.id);
  if (new Set(hitting.map(r => r.id)).size !== hitting.length) throw new Error('hitting: a man appears twice in the league table');
  if (new Set(pitching.map(r => r.id)).size !== pitching.length) throw new Error('pitching: a man appears twice in the league table');
  writeRecord(STATS, {
    meta: {
      source: 'MLB Stats API, statsapi.mlb.com, 2026 regular season (gameType R), every man who appeared',
      season: SEASON, read: today(), hittingUrl: hitUrl, pitchingUrl: pitUrl,
      fields: 'hitting: pa plate appearances, ops. pitching: g games, gs games started, outs recorded, hr, bb, k, sv saves.',
    },
    hitting, pitching,
  }, ['hitting', 'pitching']);
  console.log(`league tables: ${hitting.length} hitters, ${pitching.length} pitchers, read ${today()}`);
}

const ymd = s => (s ? String(s).slice(0, 10) : null);
/* ESPN writes a switch hitter as B (both); the Stats API writes S. Same fact. */
const hand = s => { const c = s ? String(s)[0].toUpperCase() : null; return c === 'B' ? 'S' : c; };
/* ESPN's player record writes the birth date as day/month/year. */
const dmy = s => { const m = s && String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };

/* A man on the 60 day injured list is off the 40 man list by rule, so ESPN's
   roster page does not show him. His own ESPN player record still names his
   club, so the check reads that instead: ESPN's player search for the name,
   the result whose club line is this club, then that player's record. */
async function espnPlayerRecord(name, clubName) {
  const search = await getJson(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=10`);
  const players = (search.results || []).filter(r => r.type === 'player').flatMap(r => r.contents || []);
  const hit = players.find(p => p.description === 'MLB' && p.subtitle === clubName && normName(p.displayName) === normName(name));
  if (!hit) return null;
  const id = String(hit.link && hit.link.web || '').match(/\/id\/(\d+)/);
  if (!id) return null;
  const j = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/${id[1]}`);
  const a = j.athlete;
  const [b, t] = String(a.displayBatsThrows || '').split('/');
  return {
    name: a.fullName, club: a.team ? a.team.displayName : null, list: a.status ? a.status.name : null,
    birthDate: dmy(a.displayDOB), bats: hand(b), throws: hand(t), page: `https://www.espn.com/mlb/player/_/id/${id[1]}`,
  };
}

async function spotCheck() {
  const record = readJson(ROSTERS, null);
  if (!record) throw new Error('no roster record yet');
  const stats = readJson(STATS, null);
  if (!stats) throw new Error('no league tables yet');
  const teams = [];
  let checkedN = 0, mismatchN = 0;
  for (const abbr of SPOT_TEAMS) {
    const rec = record.teams[abbr];
    if (!rec) throw new Error(`${abbr}: not in the record yet`);
    const espn = ESPN_ABBR[abbr];
    const jsonUrl = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${espn}/roster`;
    const pageUrl = `https://www.espn.com/mlb/team/roster/_/name/${espn}`;
    const j = await getJson(jsonUrl);
    const espnMen = (j.athletes || []).flatMap(g => g.items || []);
    const byName = new Map(espnMen.map(a => [normName(a.fullName), a]));
    const chosen = spotSample(selectTwentySix(rec.players).men);
    const checked = [];
    for (const m of chosen) {
      const a = byName.get(normName(m.name));
      let espnFacts = a
        ? { name: a.fullName, where: 'roster page', birthDate: ymd(a.dateOfBirth), bats: hand(a.bats && a.bats.abbreviation), throws: hand(a.throws && a.throws.abbreviation) }
        : null;
      if (!espnFacts) {
        const r = await espnPlayerRecord(m.name, rec.club);
        if (r) espnFacts = { name: r.name, where: `player record (${r.list || 'no list status'}), ${r.page}`, birthDate: r.birthDate, bats: r.bats, throws: r.throws };
      }
      const problems = [];
      if (!espnFacts) problems.push(`neither ESPN's roster nor an ESPN player record puts him with ${rec.club}`);
      else {
        if (espnFacts.birthDate !== m.birthDate) problems.push(`birth date ${m.birthDate} vs ${espnFacts.birthDate}`);
        if (espnFacts.bats && m.bats && espnFacts.bats !== hand(m.bats)) problems.push(`bats ${m.bats} vs ${espnFacts.bats}`);
        if (espnFacts.throws && m.throws && espnFacts.throws !== hand(m.throws)) problems.push(`throws ${m.throws} vs ${espnFacts.throws}`);
      }
      checked.push({ id: m.id, name: m.name, status: m.status, birthDate: m.birthDate, bats: m.bats, throws: m.throws, espn: espnFacts, result: problems.length ? `MISMATCH: ${problems.join('; ')}` : 'agrees' });
    }
    checkedN += checked.length;
    mismatchN += checked.filter(c => c.result !== 'agrees').length;
    teams.push({ team: abbr, espnPage: pageUrl, espnData: jsonUrl, espnRosterSize: espnMen.length, espnSeasonLabel: j.season ? j.season.name : null, read: today(), checked });
    console.log(`${abbr}: ${checked.filter(c => c.result === 'agrees').length} of ${checked.length} agree (ESPN lists ${espnMen.length})`);
    for (const c of checked) if (c.result !== 'agrees') console.log(`   ${c.name}: ${c.result}`);
  }
  record.spotCheck = {
    rule: `The five clubs at positions 6, 12, 18, 24 and 30 of the 30 game abbreviations sorted alphabetically (${SPOT_TEAMS.join(', ')}). In each, the shipped 26 sorted by name and the men at positions floor(i x 26 / ${SPOT_PER_TEAM}) for i = 0 to ${SPOT_PER_TEAM - 1}. Each is compared with ESPN's roster for that club: on it at all, birth date, bats, throws (names compared without accents or case; ESPN's B for a switch hitter is the API's S). A man on the 60 day injured list is off the 40 man list by rule and so off ESPN's roster page, and for him ESPN's own player record is read instead, which must name the same club.`,
    compared: 'membership, birth date, bats, throws',
    limit: 'the generator refuses to write the data file when more than 3 percent of the checked men disagree',
    read: today(),
    checkedMen: checkedN,
    mismatches: mismatchN,
    teams,
  };
  writeRecord(ROSTERS, record, ['players', 'checked']);
  console.log(`spot check: ${mismatchN} of ${checkedN} men disagree`);
}

const args = process.argv.slice(2);
const teamsArg = args.indexOf('--teams');
if (teamsArg >= 0) {
  const list = (args[teamsArg + 1] || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const a of list) if (!GAME_TO_API[a]) { console.error(`unknown club ${a}`); process.exit(1); }
  await fetchTeams(list);
} else if (args.includes('--stats')) {
  await fetchStats();
} else if (args.includes('--spot')) {
  await spotCheck();
} else {
  console.error('usage: --teams A,B,C | --stats | --spot');
  process.exit(1);
}
