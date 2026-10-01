/* Round 728: the legacy CFB Dynasty scenario, shared by simCfbStaff and by
   anyone recomputing its golden digest.

   A save written before Round 728 has no staff, no rivalry record and no
   schedule log, and it must play exactly as it did: same pairings, same
   scores, same champions, same recruits for the same seed. This walks five
   seeds through ten full seasons using only functions the pre-728 engine
   already exported, and returns one sha256 over everything a player can see.
   Ids are left out on purpose: they carry a per page load token
   (src/lib/entityIds.ts), so they differ between runs by design. */
import crypto from 'node:crypto';

export const LEGACY_SEEDS = [11, 22, 33, 44, 55];
export const LEGACY_SEASONS = 10;

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const pickGame = g => [g.home, g.away, g.hs, g.as, g.winner, g.conference ?? null, g.name ?? null];
const pickPlayer = p => [p.name, p.pos, p.cls, p.ovr, p.pot, p.stars];

export function legacyScenario(cfb) {
  const out = [];
  for (const seed of LEGACY_SEEDS) {
    const rng = lehmer(seed * 1009);
    const st = cfb.initCfb('UGA', rng);
    for (let season = 1; season <= LEGACY_SEASONS; season += 1) {
      for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) {
        const { games } = cfb.simCfbRound(st, rng);
        out.push(games.map(pickGame));
        if (r < cfb.CFB_ROUNDS) st.round += 1;
      }
      out.push(cfb.cfbRankings(st).map(t => [t.id, t.wins, t.losses, Math.round(cfb.cfbStrength(t) * 1000)]));
      for (const conf of cfb.CFB_CONFS) out.push(cfb.confStandings(st, conf).map(t => t.id));
      const post = cfb.runCfbPostseason(st, rng);
      out.push(post.ccgs.map(pickGame), post.bracket.map(pickGame), post.champion, post.field);
      const race = cfb.heismanRace(st, rng);
      out.push(race.map(h => [h.name, h.team, h.pos, h.score]));
      if (race[0]) st.heismanWinners = [...(st.heismanWinners ?? []), race[0].name];
      st.natties.push({ season: st.season, team: post.champion });
      if (post.champion === st.myTeam) st.myTitles += 1;
      st.seasonsPlayed += 1;
      /* The board's offseason, the way it ran before Round 728. */
      st.nil = cfb.nilBudgetFor(cfb.CFB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
      const cls = cfb.cfbRecruitClass(rng);
      const por = cfb.cfbPortalPool(rng);
      out.push(cls.map(r => [r.name, r.pos, r.stars, r.grade, r.trueOvr, r.nilAsk]), por.map(r => [r.name, r.pos, r.grade, r.nilAsk]));
      for (const r of [...por.slice(0, 2), ...cls]) cfb.signRecruit(st, r, por.includes(r) ? 'SO' : 'FR', rng);
      out.push(st.nil);
      out.push(cfb.cfbOffseason(st, rng));
      out.push(Object.values(st.teams).map(t => [t.id, t.players.map(pickPlayer)]));
    }
    out.push([st.season, st.myTitles, st.seasonsPlayed, st.natties, st.heismanWinners]);
  }
  return crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
}
