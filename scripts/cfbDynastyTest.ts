import { CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_CONFS, CFB_ROUNDS, initCfb, simCfbRound, cfbRankings, confStandings, runCfbPostseason, heismanRace, cfbRecruitClass, cfbPortalPool, signRecruit, cfbOffseason, nilBudgetFor, cfbStrength } from '@/lib/cfbDynasty';

let seed = 42;
const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// data integrity
if (CFB_SCHOOLS.length !== 44) throw new Error(`schools ${CFB_SCHOOLS.length}`);
const ids = new Set(CFB_SCHOOLS.map(s => s.id));
if (ids.size !== CFB_SCHOOLS.length) throw new Error('duplicate school ids');
for (const conf of CFB_CONFS) {
  const n = CFB_SCHOOLS.filter(s => s.conf === conf).length;
  if (n < 2) throw new Error(`${conf} too small for a title game`);
}
for (const s of CFB_SCHOOLS) {
  if (s.prestige < 60 || s.prestige > 97) throw new Error(`prestige ${s.id}`);
}

const st = initCfb('UGA', rng);
for (const t of Object.values(st.teams)) {
  if (t.players.length !== 12) throw new Error(`${t.id} roster ${t.players.length}`);
  if (!t.players.some(p => p.pos === 'QB')) throw new Error(`${t.id} no QB`);
}
console.log('44 real schools, 12 fictional players each, every conf can stage a CCG');

for (let s2 = 0; s2 < 4; s2++) {
  for (let r = 1; r <= CFB_ROUNDS; r++) {
    const { games, myGame } = simCfbRound(st, rng);
    if (games.length !== 22) throw new Error(`round ${r}: ${games.length} games (must pair all 44)`);
    if (!myGame) throw new Error(`round ${r}: my team idle`);
    const conf = r >= 5;
    for (const g of games) {
      if (g.hs === g.as) throw new Error('tie in college football');
      const sameConf = CFB_SCHOOL_MAP.get(g.home)!.conf === CFB_SCHOOL_MAP.get(g.away)!.conf;
      if (g.conference !== sameConf) throw new Error('conference flag wrong');
      if (conf && !sameConf && games.filter(x => CFB_SCHOOL_MAP.get(x.home)!.conf !== CFB_SCHOOL_MAP.get(x.away)!.conf).length > 4) {
        throw new Error('too many cross-conf games in conference season');
      }
    }
    st.round += 1;
  }
  // 12-game season for everyone
  for (const t of Object.values(st.teams)) {
    if (t.wins + t.losses !== 12) throw new Error(`${t.id} played ${t.wins + t.losses}`);
  }
  const { ccgs, bracket, champion, field } = runCfbPostseason(st, rng);
  if (ccgs.length !== 5) throw new Error('need 5 CCGs');
  if (field.length !== 12 || new Set(field).size !== 12) throw new Error('CFP field');
  // the five conference champions are all in the field
  const champs = ccgs.map(c => c.winner);
  for (const c of champs) if (!field.includes(c)) throw new Error(`champ ${c} missed the field`);
  // bracket: 4 first round + 4 QF + 2 SF + 1 title = 11
  if (bracket.length !== 11) throw new Error(`bracket ${bracket.length}`);
  if (!champion) throw new Error('no champion');
  st.heismanWinners = st.heismanWinners ?? []; const heisman = heismanRace(st, rng); st.heismanWinners.push(heisman[0].name); if (new Set(st.heismanWinners).size !== st.heismanWinners.length) throw new Error('repeat heisman');
  if (heisman.length !== 4) throw new Error('heisman finalists');
  if (!['QB', 'RB', 'WR'].includes(heisman[0].pos)) throw new Error('heisman pos');

  // recruiting cycle
  st.nil = nilBudgetFor(CFB_SCHOOL_MAP.get('UGA')!.prestige, st.teams['UGA'].wins);
  const cls = cfbRecruitClass(rng);
  if (cls.length !== 18) throw new Error('class size');
  const affordable = cls.find(r => r.nilAsk <= st.nil);
  if (affordable && !signRecruit(st, affordable, 'FR', rng)) throw new Error('sign failed');
  const portal = cfbPortalPool(rng);
  if (portal.some(p => p.grade !== p.trueOvr)) throw new Error('portal must have no scouting error');
  st.natties.push({ season: st.season, team: champion });
  const notes = cfbOffseason(st, rng);
  console.log(`season ${st.season - 1}: natty ${champion}, heisman ${heisman[0].name} (${heisman[0].team}), my notes ${notes.length}`);
}

// post-4-season sanity
for (const t of Object.values(st.teams)) {
  if (t.players.length < 12) throw new Error(`${t.id} thin after offseasons`);
  const s3 = cfbStrength(t);
  if (!(s3 > 50 && s3 < 100)) throw new Error(`strength ${t.id} ${s3}`);
  for (const p of t.players) {
    if (!['FR', 'SO', 'JR', 'SR'].includes(p.cls)) throw new Error('bad class');
    if (Number.isNaN(p.ovr)) throw new Error('NaN ovr');
  }
}
// rankings sane: unbeaten teams above winless
const table = cfbRankings(st);
if (table[0].wins < table[table.length - 1].wins) throw new Error('rankings inverted');
console.log('CFB DYNASTY ENGINE OK across 4 seasons');
