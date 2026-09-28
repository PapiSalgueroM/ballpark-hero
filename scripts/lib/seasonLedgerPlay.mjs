/* Round 647 fix: the four front offices and the two dynasties, played
   headless the way their boards play them, for any harness that has to
   measure what a season records.

   Given a bundle of the six engines (nfl, nba, mlb, nhl, cfb, cbb), the
   season ledger (L) and the season shapes (F), career(key, seed, policy)
   plays one GM's career through the real engines in the board's order:

     front office  every period of the regular season (the injury pass, the
                   AI's weekly moves and the games, in the order each board
                   runs them), then the close: the playoffs, the row scored
                   against the projection the save carries, and the next
                   season projected at the close (L.projectNext); then the
                   draft the board runs (F.FO_DRAFTS: the class, the GM's
                   picks, the rival takes in the board's order, all held to
                   the board by simSeasonLedger section 1) and the offseason.
     dynasty       every round, the close the same way, then the trail the
                   board opens (the NIL, a class and a portal drawn, signed
                   or not) and the offseason.

   The first season is projected at the pick, from the league the pick
   hands over. The GM is the team at (seed * 7) mod the league size in
   order of opening strength, so seeds cover every strength of pick.

   Policies:
     idle        the board's minimum: the draft's first name at every pick
                 (the draft cannot be skipped) and nothing else; a dynasty
                 signs nobody. The zero skill GM.
     worst       the draft's last name at every pick (front offices only).
     skill       idle plus DELTA points of rating on every man of the GM's
                 roster after the pick and after every offseason: the same
                 skill for every pick, in the units the engines play with.
     sign        idle plus the best free agents that raise the team's
                 strength, up to three after every offseason and one at
                 midseason, while the cap allows (front offices).
     recruit     the trail's best graded names, class and portal together,
                 while the NIL lasts (dynasties).
     cutBefore   season one: cut the three best men before the last period
                 of the regular season (the last moment a board allows a
                 cut before the close), then sign back whoever is still
                 free after the offseason. Rivals sign most of them in that
                 last period.
     cutPlayoffs season one: cut them between the last period and the
                 playoffs, which only the engine allows (a board plays the
                 two in one click), and sign them back after the offseason:
                 the review's measured dodge, with nobody left to poach them.
     cutAfter    season one: cut them at the close, after the projection,
                 and sign them back after the offseason.

   Each row: { s, season, pick (opening strength), result, value, exp (the
   projection it was scored against), score, resigned (how many cut men
   came back) }. Everything draws from one seeded stream per career, the way
   a board draws from Math.random; nothing reads the clock. */

export const SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'cfb', 'cbb'];
export const DYNASTIES = ['cfb', 'cbb'];

export function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function seasonPlayer(M, { delta = 1.5 } = {}) {
  const { nfl, nba, mlb, nhl, cfb, cbb, L, F } = M;
  const names = lg => {
    const out = new Set();
    for (const t of Object.values(lg.teams)) for (const p of t.players) out.add(p.name);
    for (const p of lg.freeAgents ?? []) out.add(p.name);
    return out;
  };
  const flatNfl = rounds => rounds.flatMap(r => r.games.map(g => ({ name: r.name, home: g.home, away: g.away, winner: g.winner })));
  /* The board's draft: the class it draws, the GM's pick, then the rival
     takes in the board's order, pick after pick. */
  const draft = (d, gen, conv, orderOf) => (lg, me, rng, last) => {
    let cls = gen(rng, d.size, names(lg));
    for (let k = 0; k < d.picks && cls.length; k += 1) {
      const pr = last ? cls[cls.length - 1] : cls[0];
      const pl = conv(pr, rng);
      if (pl) lg.teams[me].players.push(pl);
      const rest = cls.filter(p => p.id !== pr.id);
      const takes = rest.slice(0, d.rivals);
      const order = orderOf(lg).filter(a => a !== me);
      takes.forEach((p, i) => { const q = conv(p, rng); if (q) lg.teams[order[i % order.length]].players.push(q); });
      cls = rest.filter(p => !takes.includes(p));
    }
  };
  const PRO = {
    nfl: {
      shape: F.NFL_SEASON, periods: nfl.REGULAR_WEEKS, strength: nfl.teamStrength,
      init: rng => nfl.initLeague(rng),
      period: (lg, k, me, rng) => { nfl.injuryPass(lg.teams, rng); nfl.aiWeeklyMoves(lg, me, rng); for (const g of lg.schedule[k - 1]) nfl.simGame(g, lg.teams, rng); if (k < nfl.REGULAR_WEEKS) lg.week = k + 1; },
      record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
      post: (lg, rng) => { const { rounds, champion } = nfl.runPlayoffs(lg.teams, rng); lg.champions.push({ season: lg.season, team: champion }); return { games: flatNfl(rounds), champion }; },
      draft: draft(F.FO_DRAFTS.nfl, nfl.generateDraftClass, nfl.prospectToPlayer, lg => nfl.draftOrder(lg.teams)),
      offseason: (lg, rng) => nfl.runOffseason(lg, rng),
      release: (lg, me, id) => nfl.releasePlayer(lg.teams[me], lg.freeAgents, id),
      sign: (lg, me, id) => nfl.signPlayer(lg.teams[me], lg.freeAgents, id, lg.cap),
    },
    nba: {
      shape: F.NBA_SEASON, periods: nba.NBA_ROUNDS, strength: nba.nbaStrength,
      init: rng => nba.initNbaLeague(rng),
      period: (lg, k, me, rng) => { nba.simRound(lg, me, rng); if (k < nba.NBA_ROUNDS) lg.round = k + 1; },
      record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
      post: (lg, rng) => { const { series, champion } = nba.runNbaPlayoffs(lg, rng); lg.champions.push({ season: lg.season, team: champion }); return { games: series, champion }; },
      draft: draft(F.FO_DRAFTS.nba, nba.nbaDraftClass, nba.nbaProspectToPlayer, lg => nba.nbaStandings(lg).map(t => t.abbr).reverse()),
      offseason: (lg, rng) => nba.nbaOffseason(lg, rng),
      release: (lg, me, id) => nba.nbaRelease(lg.teams[me], lg.freeAgents, id),
      sign: (lg, me, id) => nba.nbaSign(lg.teams[me], lg.freeAgents, id, lg.cap),
    },
    mlb: {
      shape: F.MLB_SEASON, periods: mlb.MLB_ROUNDS, strength: mlb.mlbStrength,
      init: rng => mlb.initMlbLeague(rng),
      period: (lg, k, me, rng) => { mlb.simMlbRound(lg, me, rng); mlb.mlbAiMoves(lg, me, rng); if (k < mlb.MLB_ROUNDS) lg.round = k + 1; },
      record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
      post: (lg, rng) => { const { series, champion } = mlb.runMlbPlayoffs(lg, rng); lg.champions.push({ season: lg.season, team: champion }); return { games: series, champion }; },
      draft: draft(F.FO_DRAFTS.mlb, mlb.mlbDraftClass, mlb.mlbProspectToPlayer, lg => mlb.mlbStandings(lg).map(t => t.abbr).reverse()),
      offseason: (lg, rng) => mlb.mlbOffseason(lg, rng),
      release: (lg, me, id) => mlb.mlbRelease(lg.teams[me], lg.freeAgents, id),
      sign: (lg, me, id) => mlb.mlbSign(lg.teams[me], lg.freeAgents, id, lg.cap),
    },
    nhl: {
      shape: F.NHL_SEASON, periods: nhl.NHL_FO_ROUNDS, strength: nhl.nhlStrength,
      init: rng => nhl.initNhlLeague(rng),
      period: (lg, k, me, rng) => { nhl.simNhlRound(lg, me, rng); nhl.nhlAiMoves(lg, me, rng); if (k < nhl.NHL_FO_ROUNDS) lg.round = k + 1; },
      record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses + lg.teams[id].otLosses }),
      post: (lg, rng) => { const { series, champion } = nhl.runNhlFoPlayoffs(lg, rng); lg.champions.push({ season: lg.season, team: champion }); return { games: series, champion }; },
      draft: draft(F.FO_DRAFTS.nhl, nhl.nhlDraftClass, nhl.nhlProspectToPlayer, lg => nhl.nhlFoStandings(lg).map(t => t.abbr).reverse()),
      offseason: (lg, rng) => nhl.nhlOffseason(lg, rng),
      release: (lg, me, id) => nhl.nhlRelease(lg.teams[me], lg.freeAgents, id),
      sign: (lg, me, id) => nhl.nhlSign(lg.teams[me], lg.freeAgents, id, lg.cap),
    },
  };
  const DYN = {
    cfb: {
      shape: F.CFB_SEASON, rounds: cfb.CFB_ROUNDS,
      init: rng => cfb.initCfb('UGA', rng),
      round: (st, rng) => cfb.simCfbRound(st, rng),
      post: (st, rng) => { const p = cfb.runCfbPostseason(st, rng); st.natties.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion, ccgs: p.ccgs }; },
      record: (st, id, p) => cfb.cfbRegularRecord(st, p.ccgs, id),
      trail: st => { st.nil = cfb.nilBudgetFor(cfb.CFB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins); },
      pools: rng => ({ cls: cfb.cfbRecruitClass(rng), por: cfb.cfbPortalPool(rng) }),
      sign: (st, r, c, rng) => cfb.signRecruit(st, r, c, rng),
      offseason: (st, rng) => cfb.cfbOffseason(st, rng),
    },
    cbb: {
      shape: F.CBB_SEASON, rounds: cbb.CBB_ROUNDS,
      init: rng => cbb.initCbb(cbb.CBB_SCHOOLS[0].id, rng),
      round: (st, rng) => cbb.simCbbRound(st, rng),
      post: (st, rng) => { const p = cbb.runMarch(st, rng); st.titles.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion }; },
      record: (st, id) => cbb.cbbRegularRecord(st, id),
      trail: st => { st.nil = cbb.cbbNilFor(cbb.CBB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins); },
      pools: rng => ({ cls: cbb.cbbRecruitClass(rng), por: cbb.cbbPortalPool(rng) }),
      sign: (st, r, c, rng) => cbb.cbbSignRecruit(st, r, c, rng),
      offseason: (st, rng) => cbb.cbbOffseason(st, rng),
    },
  };
  const boost = players => { for (const p of players) p.ovr = Math.min(99, p.ovr + delta); };
  /* Free agents that raise the team's strength, best first, while the cap and roster allow. */
  const signUpgrades = (e, lg, me, most) => {
    for (let n = 0, tries = 0; n < most && tries < 12; tries += 1) {
      const before = e.strength(lg.teams[me]);
      let signed = false;
      for (const fa of [...lg.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 10)) {
        if (!e.sign(lg, me, fa.id)) continue;
        if (e.strength(lg.teams[me]) > before + 0.05) { n += 1; signed = true; break; }
        const t = lg.teams[me];
        lg.freeAgents.push(...t.players.splice(t.players.findIndex(p => p.id === fa.id), 1));
      }
      if (!signed) break;
    }
  };
  const threeBest = (lg, me) => [...lg.teams[me].players].sort((a, b) => b.ovr - a.ovr).slice(0, 3).map(p => p.id);

  function proCareer(key, seed, policy, seasons) {
    const e = PRO[key];
    const rng = lehmer(seed * 7919 + 13);
    const lg = e.init(rng);
    const order = e.shape.teams(lg).sort((a, b) => a.strength - b.strength || (a.id < b.id ? -1 : 1));
    const me = order[(seed * 7) % order.length].id;
    const pick = order.find(t => t.id === me).strength;
    let exp = L.projectionFor(e.shape.teams(lg), e.shape.format, lg.season, me);
    if (policy === 'skill') boost(lg.teams[me].players);
    const rows = [];
    let cut = [];
    for (let s = 1; s <= seasons; s += 1) {
      for (let k = 1; k <= e.periods; k += 1) {
        if (policy === 'sign' && k === Math.ceil(e.periods / 2)) signUpgrades(e, lg, me, 1);
        if (policy === 'cutBefore' && s === 1 && k === e.periods) { cut = threeBest(lg, me); for (const id of cut) e.release(lg, me, id); }
        e.period(lg, k, me, rng);
      }
      const record = e.record(lg, me);
      if (policy === 'cutPlayoffs' && s === 1) { cut = threeBest(lg, me); for (const id of cut) e.release(lg, me, id); }
      const post = e.post(lg, rng);
      const result = L.seasonResultOf(lg.season, me, record, post, e.shape);
      rows.push({ s, season: lg.season, pick, result, value: L.seasonValue(result), exp, score: L.scoreSeason(result, exp), resigned: 0 });
      const next = L.projectNext(e.shape, lg, me, lg.season + 1);
      if (policy === 'cutAfter' && s === 1) { cut = threeBest(lg, me); for (const id of cut) e.release(lg, me, id); }
      e.draft(lg, me, rng, policy === 'worst');
      e.offseason(lg, rng);
      if (cut.length && s === 1) rows[0].resigned = cut.filter(id => e.sign(lg, me, id)).length;
      if (policy === 'sign') signUpgrades(e, lg, me, 3);
      if (policy === 'skill') boost(lg.teams[me].players);
      exp = next;
    }
    return rows;
  }

  function dynCareer(key, seed, policy, seasons) {
    const e = DYN[key];
    const rng = lehmer(seed * 7919 + 17);
    const st = e.init(rng);
    const order = e.shape.teams(st).sort((a, b) => a.strength - b.strength || (a.id < b.id ? -1 : 1));
    const me = order[(seed * 7) % order.length].id;
    st.myTeam = me;
    const pick = order.find(t => t.id === me).strength;
    let exp = L.projectionFor(e.shape.teams(st), e.shape.format, st.season, me);
    if (policy === 'skill') boost(st.teams[me].players);
    const rows = [];
    for (let s = 1; s <= seasons; s += 1) {
      for (let r = 1; r <= e.rounds; r += 1) { e.round(st, rng); if (r < e.rounds) st.round += 1; }
      const post = e.post(st, rng);
      const result = L.seasonResultOf(st.season, me, e.record(st, me, post), post, e.shape);
      rows.push({ s, season: st.season, pick, result, value: L.seasonValue(result), exp, score: L.scoreSeason(result, exp), resigned: 0 });
      const next = L.projectNext(e.shape, st, me, st.season + 1);
      e.trail(st);
      const { cls, por } = e.pools(rng);
      if (policy === 'recruit') {
        for (const [r, c] of [...cls.map(x => [x, 'FR']), ...por.map(x => [x, 'SO'])].sort((a, b) => b[0].grade - a[0].grade)) e.sign(st, r, c, rng);
      }
      e.offseason(st, rng);
      if (policy === 'skill') boost(st.teams[me].players);
      exp = next;
    }
    return rows;
  }

  return {
    PRO, DYN,
    career: (key, seed, policy, seasons = 4) => (DYN[key] ? dynCareer(key, seed, policy, seasons) : proCareer(key, seed, policy, seasons)),
  };
}
