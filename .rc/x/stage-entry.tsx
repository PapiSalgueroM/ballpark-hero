// @ts-nocheck
/* Reviewer's stage for Round 1223 (runner only, never committed). Nothing mounts the three career boxes yet, so this
 * page mounts them the way a bind will: the REAL GmDeskMount, GM_CAREER_PANELS, the real NHL engine and its read
 * adapter, and handlers that call the host's own functions (hostTakeSeat, hostSeasonAway, hostSpendPoint). */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GmDeskMount } from '@/components/front-office-shared/GmDeskMount';
import { GM_CAREER_PANELS } from '@/components/front-office-shared/gmCareerDesk';
import * as H from '@/lib/gmDeskHost';
import * as SEAT from '@/lib/gmSeat';
import * as XP from '@/lib/gmXp';
import * as G from '@/lib/gmDesk';
import * as E from '@/lib/nhlFrontOffice';
import { nhlDeskHost } from '@/lib/gmDeskHostNhl';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import { NHL_TEAM_MAP } from '@/data/conquestDataNhl';
import { leagueNames } from '@/lib/foNames';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clone = v => JSON.parse(JSON.stringify(v));
const nameOf = id => { const t = NHL_TEAM_MAP.get(id); return t ? `${t.city} ${t.name}` : id; };
const q = new URLSearchParams(location.search);
const SCEN = q.get('s') || 'offers';
const rng = mulberry32(Number(q.get('seed') || 5));
const USER = 'TOR';

function playSeason(lg) {
  for (;;) { E.simNhlRound(lg, USER, rng); E.nhlAiMoves(lg, USER, rng); if (lg.round >= E.NHL_FO_ROUNDS) break; lg.round += 1; }
  const po = E.runNhlFoPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  return po.champion;
}
const byGrade = cls => [...cls].sort((a, b) => b.grade - a.grade || a.id.localeCompare(b.id))[0];
function draftNhl(lg, team, r) {
  const mine = lg.teams[team];
  let cls = E.nhlDraftClass(r, Math.max(24, (E.nhlDraftCapital(mine) ?? 0) + 10), leagueNames(lg));
  let left = 2, picksLeft = E.nhlDraftCapital(mine) ?? 0;
  const aiBatch = () => { cls = E.nhlAiDraftPicks(lg, cls, E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), r).remaining; left -= 1; };
  while (picksLeft > 0 && mine.picks.length > 0 && cls.length > 0) {
    const pr = byGrade(cls);
    if (!E.nhlConsumeDraftPick(mine)) break;
    mine.players.push(E.nhlProspectToPlayer(pr, r, lg.ratingModelVersion));
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    for (let i = nextPicks === 0 ? left : Math.min(1, left); i > 0; i--) aiBatch();
    picksLeft = nextPicks;
  }
  while (left > 0) aiBatch();
}
function firedSeat(team, tier, season, grades, out = 0) {
  let c = SEAT.newGmCareer(team, tier, season - out - grades.length + 1);
  for (const g of grades) c = SEAT.recordSeatSeason(c, g);
  c = SEAT.endSeatStint(c, 'fired');
  return { v: 1, career: c, last: season };
}

const league0 = E.initNhlLeague(rng, NHL_OPENING_RATINGS);
playSeason(league0);
const tiers = SEAT.leagueTiers(H.hostSeatTeams(nhlDeskHost, league0, id => id));
const ids = Object.keys(league0.teams).sort();
const LADDERS = {
  offers: [['title', 'title', 'title', 'title', 'title', 'overachieved', 'overachieved', 'overachieved', 'missed'], ['met', 'overachieved', 'title', 'met']],
  quiet: [['missed', 'missed', 'missed', 'missed'], ['met', 'missed', 'missed'], ['missed', 'missed'], ['badly', 'missed', 'missed']],
  climb: [['badly', 'badly'], ['badly', 'badly', 'missed'], ['badly', 'missed', 'badly']],
  closed: [['badly', 'badly', 'badly']],
  shutoffers: [['badly', 'badly', 'badly'], ['badly', 'badly', 'badly', 'badly'], ['met', 'badly', 'badly', 'badly'], ['badly', 'badly', 'missed', 'badly']],
};
const WANT = {
  offers: m => m.state === 'offers' && m.offers.length >= 3,
  quiet: m => m.state === 'quiet' && m.nextYear === 'open',
  climb: m => m.state === 'quiet' && m.nextYear === 'climb',
  closed: m => m.state === 'closed',
  shutoffers: m => m.state === 'offers' && m.nextYear === 'shut',
};
function find(kind) {
  for (const grades of LADDERS[kind]) for (const old of ids) {
    const seat = firedSeat(old, tiers.get(old), league0.season, grades);
    const m = H.hostMarket(nhlDeskHost, league0, seat, nameOf);
    if (m && WANT[kind](m)) return { old, grades, seat };
  }
  return null;
}
/* How many of every (club, ladder) pair read offers today while next year is shut: the sit out button's blind spot. */
function census() {
  const out = { markets: 0, offers: 0, offersShut: 0, quietOpen: 0, quietClimb: 0, closed: 0 };
  const all = Object.values(LADDERS).flat();
  for (const grades of all) for (const old of ids) {
    const m = H.hostMarket(nhlDeskHost, league0, firedSeat(old, tiers.get(old), league0.season, grades), nameOf);
    out.markets++;
    if (m.state === 'offers') { out.offers++; if (m.nextYear === 'shut') out.offersShut++; }
    else if (m.state === 'closed') out.closed++;
    else if (m.nextYear === 'climb') out.quietClimb++; else out.quietOpen++;
  }
  return out;
}

const LIVE = ['ownership', 'media'];
const HUB = { roster: [], freeAgents: [], capRoom: 12, wins: 3, losses: 1, period: 5, periods: 20, playWord: 'Play', periodWord: 'round', hasFixtures: false, nextOpponent: null, lastResult: null, place: 2, cut: 8, tableName: 'the conference', tradeLine: null, titles: 0 };

function initial() {
  const xp = XP.addXp(XP.defaultGmXp(), Number(q.get('xp') || 1300));
  if (SCEN === 'held' || SCEN === 'legacy') {
    const save = { myTeam: USER, seasonsPlayed: SCEN === 'legacy' ? 9 : 1, titles: SCEN === 'legacy' ? 2 : 0, fired: false, trust: 60, mandate: null };
    return { league: league0, save, desk: G.withGmBlock(G.freshGmDesk(), 'xp', xp), found: { kind: SCEN } };
  }
  const f = find(SCEN);
  if (!f) return { league: league0, save: null, desk: null, found: null };
  const t = SEAT.careerTotals(f.seat.career);
  const save = { myTeam: f.old, seasonsPlayed: t.seasons, titles: t.titles, fired: true, trust: 0, mandate: null, pressTilt: 1, seasonTradeLine: 'a deal' };
  let desk = G.withGmBlock(G.freshGmDesk(), 'seat', f.seat);
  desk = G.withGmBlock(desk, 'xp', xp);
  return { league: league0, save, desk, found: { kind: SCEN, old: f.old, grades: f.grades } };
}

function Stage() {
  const [st, setSt] = useState(initial);
  const [open, setOpen] = useState(null);
  const [log, setLog] = useState([]);
  const say = s => setLog(l => [...l, s]);
  if (!st.save) return <pre id="stage-info">{JSON.stringify({ scenario: SCEN, found: null, census: census() })}</pre>;
  const { league, save, desk } = st;
  const legacy = H.hostLegacy(nhlDeskHost, league, { team: save.myTeam, seasonsPlayed: save.seasonsPlayed, titles: save.titles, fired: !!save.fired, seasonCounted: true });
  const seat = H.hostSeatOf(desk, legacy);
  const market = save.fired ? H.hostMarket(nhlDeskHost, league, seat, nameOf) : null;
  const away = {
    awayDraft: (l, r) => { draftNhl(l, save.myTeam, r); },
    awaySummer: (l, r) => { E.nhlOffseason(l, r, save.myTeam); },
    periods: () => E.NHL_FO_ROUNDS,
    playRound: (l, r) => { E.simNhlRound(l, save.myTeam, r); E.nhlAiMoves(l, save.myTeam, r); if (l.round < E.NHL_FO_ROUNDS) l.round += 1; },
    playoffs: (l, r) => { const po = E.runNhlFoPlayoffs(l, r); l.champions.push({ season: l.season, team: po.champion }); return po.champion; },
  };
  const career = {
    pack: nhlDeskHost.pack, seat, market, nameOf, live: LIVE, deskOn: true, earns: H.hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']),
    take(offer) {
      const out = H.hostTakeSeat({ host: nhlDeskHost, league, desk, save, legacy, teamId: offer.teamId, nameOf, blocks: H.HOST_BLOCK_RULES });
      if (!out) { say('TAKE REFUSED'); return; }
      setSt({ ...st, save: out.save, desk: out.desk }); setOpen(null); say(`TOOK ${out.offer.teamId} ask ${out.offer.ask.season}`);
    },
    sitOut() {
      const copy = clone(league);
      const res = H.hostSeasonAway({ host: nhlDeskHost, away, league: copy, desk, legacy, rng });
      if (res.ok !== true) { say(`AWAY REFUSED ${res.reason}`); return; }
      setSt({ ...st, league: copy, desk: res.desk }); setOpen(null); say(`AWAY ${res.report.season} champion ${res.report.champion}`);
    },
    spend(tree) { const next = H.hostSpendPoint(desk, tree, LIVE); if (!next) { say(`SPEND REFUSED ${tree}`); return; } setSt({ ...st, desk: next }); say(`SPENT ${tree}`); },
  };
  const phase = save.fired ? 'fired' : 'hub';
  const facts = { teamId: save.myTeam, teamLabel: nameOf(save.myTeam), seasonsPlayed: save.seasonsPlayed, phase, hub: HUB, career };
  const card = market ? H.hostOutOfWorkCard(nhlDeskHost, league, seat, market, nameOf) : null;
  const info = {
    scenario: SCEN, found: st.found, team: save.myTeam, fired: !!save.fired, season: league.season,
    state: market && market.state, nextYear: market && market.nextYear, climbTo: market && market.climbTo, offers: market ? market.offers.map(o => `${o.teamId}:t${o.tier}`) : null,
    line: market && market.line, sitArm: (market ? H.hostSitArmLine(market, true) : null), stints: seat.career.stints.length, seasonsOut: seat.career.seasonsOut,
    arriving: H.hostArriving(seat, league.season), mandateSeason: save.mandate ? save.mandate.season : null, census: census(), log,
  };
  return (
    <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
      {card && (
        <div className="mb-3 rounded-2xl border border-border bg-card p-3" data-stage-card>
          <div className="text-xs font-bold text-foreground">{card.title}</div>
          {card.lines.map(l => <p key={l} className="text-[11px] text-muted-foreground">{l}</p>)}
        </div>
      )}
      <GmDeskMount sport="nhl" desk={desk} facts={facts} panels={GM_CAREER_PANELS} open={open} onOpen={setOpen} onDesk={d => setSt({ ...st, desk: d })} />
      <pre id="stage-info" style={{ display: 'none' }}>{JSON.stringify(info)}</pre>
    </main>
  );
}
createRoot(document.getElementById('stage')).render(<Stage />);
