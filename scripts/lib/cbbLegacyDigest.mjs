/* Round 823: the legacy CBB Dynasty scenario, shared by simCbbStaff and by
   anyone recomputing its golden digest. The CBB twin of cfbLegacyDigest.mjs.

   A save written before Round 823 has no staff, no rivalry record and no
   schedule log, and it must play exactly as it did: same pairings, same
   scores, same March, same recruits for the same seed. This walks five
   seeds through ten full seasons using only functions the pre-823 engine
   already exported, in the order the board calls them, and returns one
   sha256 over everything a player can see. Ids are left out on purpose: they
   carry a per page load token (src/lib/entityIds.ts), so they differ between
   runs by design. */
import crypto from 'node:crypto';

export const LEGACY_SEEDS = [11, 22, 33, 44, 55];
export const LEGACY_SEASONS = 10;

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const pickGame = g => [g.home, g.away, g.hs, g.as, g.winner, g.name ?? null, g.homeSeed ?? null, g.awaySeed ?? null];
const pickPlayer = p => [p.name, p.pos, p.cls, p.ovr, p.pot, p.stars];

export function legacyScenario(cbb) {
  const out = [];
  for (const seed of LEGACY_SEEDS) {
    const rng = lehmer(seed * 1009);
    const st = cbb.initCbb('UK', rng);
    for (let season = 1; season <= LEGACY_SEASONS; season += 1) {
      for (let r = 1; r <= cbb.CBB_ROUNDS; r += 1) {
        const { games, myGames } = cbb.simCbbRound(st, rng);
        out.push(games.map(pickGame), myGames.length);
        if (r < cbb.CBB_ROUNDS) st.round += 1;
      }
      out.push(cbb.cbbRankings(st).map(t => [t.id, t.wins, t.losses, Math.round(cbb.cbbStrength(t) * 1000)]));
      for (const conf of cbb.CBB_CONFS) out.push(cbb.cbbConfStandings(st, conf).map(t => t.id));
      const march = cbb.runMarch(st, rng);
      out.push(march.confFinals.map(pickGame), march.autoBids, march.field, march.bracket.map(pickGame), march.champion, march.cinderella, march.myExit);
      const race = cbb.poyRace(st, rng);
      out.push(race.map(p => [p.name, p.team, p.pos, p.score]));
      if (race[0]) st.poyWinners = [...(st.poyWinners ?? []), race[0].name];
      st.titles.push({ season: st.season, team: march.champion });
      if (march.champion === st.myTeam) st.myTitles += 1;
      st.seasonsPlayed += 1;
      /* The board's offseason, the way it ran before Round 823. */
      st.nil = cbb.cbbNilFor(cbb.CBB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
      const cls = cbb.cbbRecruitClass(rng);
      const por = cbb.cbbPortalPool(rng);
      out.push(cls.map(r => [r.name, r.pos, r.stars, r.grade, r.trueOvr, r.nilAsk]), por.map(r => [r.name, r.pos, r.grade, r.nilAsk]));
      for (const r of [...por.slice(0, 2), ...cls]) cbb.cbbSignRecruit(st, r, por.includes(r) ? 'SO' : 'FR', rng);
      out.push(st.nil);
      out.push(cbb.cbbOffseason(st, rng));
      out.push(Object.values(st.teams).map(t => [t.id, t.confChamp, t.players.map(pickPlayer)]));
    }
    out.push([st.season, st.myTitles, st.seasonsPlayed, st.titles, st.poyWinners]);
  }
  return crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
}
