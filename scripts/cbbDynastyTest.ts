import { CBB_SCHOOLS, CBB_SCHOOL_MAP, CBB_CONFS, CBB_ROUNDS, DANCE_SIZE, initCbb, simCbbRound, cbbRankings, cbbConfStandings, runMarch, poyRace, cbbRecruitClass, cbbPortalPool, cbbSignRecruit, cbbOffseason, cbbNilFor, cbbStrength } from '@/lib/cbbDynasty';

let seed = 7;
const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

if (CBB_SCHOOLS.length !== 40) throw new Error(`schools ${CBB_SCHOOLS.length}`);
if (new Set(CBB_SCHOOLS.map(s => s.id)).size !== 40) throw new Error('dup ids');
for (const conf of CBB_CONFS) {
  const n = CBB_SCHOOLS.filter(s => s.conf === conf).length;
  if (n < 4) throw new Error(`${conf} needs 4+ for a tournament, has ${n}`);
}

const st = initCbb('DUKE', rng);
for (const t of Object.values(st.teams)) {
  if (t.players.length !== 8) throw new Error(`${t.id} roster ${t.players.length}`);
  for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) {
    if (!t.players.some(p => p.pos === pos)) throw new Error(`${t.id} missing ${pos}`);
  }
}
console.log('40 real programs, 8 fictional players each, full five on the floor everywhere');

let cinderellas = 0;
for (let s2 = 0; s2 < 5; s2++) {
  for (let r = 1; r <= CBB_ROUNDS; r++) {
    const { games, myGames } = simCbbRound(st, rng);
    if (games.length !== 40) throw new Error(`round games ${games.length} (need 40: two per school)`);
    if (myGames.length !== 2) throw new Error(`my games ${myGames.length}`);
    for (const g of games) if (g.hs === g.as) throw new Error('tie in hoops');
    st.round += 1;
  }
  for (const t of Object.values(st.teams)) {
    if (t.wins + t.losses !== 20) throw new Error(`${t.id} played ${t.wins + t.losses}`);
  }
  const march = runMarch(st, rng);
  if (march.confFinals.length !== 6) throw new Error('need 6 conference finals');
  if (march.autoBids.length !== 6) throw new Error('need 6 auto bids');
  if (march.field.length !== DANCE_SIZE || new Set(march.field).size !== DANCE_SIZE) throw new Error('field');
  for (const bid of march.autoBids) if (!march.field.includes(bid)) throw new Error(`auto bid ${bid} missed field`);
  if (march.bracket.length !== 31) throw new Error(`bracket ${march.bracket.length}`);
  if (!march.champion) throw new Error('no champion');
  // round名 counts: 16 + 8 + 4 + 2 + 1
  const counts: Record<string, number> = {};
  for (const g of march.bracket) counts[g.name] = (counts[g.name] ?? 0) + 1;
  if (counts['Round of 32'] !== 16 || counts['Sweet 16'] !== 8 || counts['Elite Eight'] !== 4 || counts['Final Four'] !== 2 || counts['National Championship'] !== 1) {
    throw new Error('bracket round shape wrong: ' + JSON.stringify(counts));
  }
  // seeds valid and the title winner survived 5 games
  for (const g of march.bracket) {
    if (g.homeSeed < 1 || g.homeSeed > 32 || g.awaySeed < 1 || g.awaySeed > 32) throw new Error('bad seed');
  }
  const champGames = march.bracket.filter(g => g.winner === march.champion).length;
  if (champGames !== 5) throw new Error(`champion won ${champGames} games`);
  if (march.cinderella) cinderellas += 1;

  st.poyWinners = st.poyWinners ?? [];
  const poy = poyRace(st, rng);
  if (poy.length !== 4) throw new Error('poy finalists');
  st.poyWinners.push(poy[0].name);
  if (new Set(st.poyWinners).size !== st.poyWinners.length) throw new Error('repeat POY');

  st.nil = cbbNilFor(CBB_SCHOOL_MAP.get('DUKE')!.prestige, st.teams['DUKE'].wins);
  const cls = cbbRecruitClass(rng);
  if (cls.length !== 14) throw new Error('class size');
  const target = cls.find(r => r.nilAsk <= st.nil);
  if (target && !cbbSignRecruit(st, target, 'FR', rng)) throw new Error('sign failed');
  const portal = cbbPortalPool(rng);
  if (portal.some(p => p.grade !== p.trueOvr)) throw new Error('portal must be exact');
  st.titles.push({ season: st.season, team: march.champion });
  const notes = cbbOffseason(st, rng);
  console.log(`season ${st.season - 1}: champ ${march.champion}, POY ${poy[0].name} (${poy[0].team}), my exit: ${march.myExit}, notes ${notes.length}${march.cinderella ? `, CINDERELLA ${march.cinderella.team} (${march.cinderella.seed} seed)` : ''}`);
}

for (const t of Object.values(st.teams)) {
  if (t.players.length < 8) throw new Error(`${t.id} thin`);
  const s3 = cbbStrength(t);
  if (!(s3 > 50 && s3 < 100)) throw new Error(`strength ${t.id} ${s3}`);
}
const table = cbbRankings(st);
if (table[0].wins < table[39].wins) throw new Error('rankings inverted');
console.log(`cinderella runs in 5 seasons: ${cinderellas} (0 fine, but the door is open)`);
console.log('CBB DYNASTY ENGINE OK across 5 seasons');
