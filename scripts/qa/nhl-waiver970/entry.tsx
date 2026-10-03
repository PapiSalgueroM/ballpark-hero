import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import * as E from '@/lib/nhlFrontOffice';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import { leagueNames } from '@/lib/foNames';
import { deadMoneyFor, deadCapUsed } from '@/lib/frontOfficeCuts';
const KEY = 'nhl-front-office-save-v1';
const random = (value: number) => () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; };
let draws = 0;
const stream = random(970);
Math.random = () => { draws++; return stream(); };
if (!sessionStorage.getItem('native970-seeded')) {
  const initial = E.initNhlLeague(random(1), NHL_OPENING_RATINGS), [sender, receiver] = Object.keys(initial.teams);
  let league: E.NhlLeague | undefined;
  outer: for (const a of initial.teams[sender].players) for (const b of initial.teams[receiver].players) {
    const copy = JSON.parse(JSON.stringify(initial));
    if (E.nhlTrade(copy.teams[sender], copy.teams[receiver], a.id, b.id, true, copy.cap) === 'accepted'
      && E.nhlExecuteTalksTrade(copy.teams[sender], copy.teams[receiver], b.id, a.id, true, copy.cap) === 'done') { league = copy; break outer; }
  }
  if (!league || league.teams[receiver].picks.length !== 4) throw new Error('Actual acquired draft-rights fixture refused');
  for (const team of Object.values(league.teams)) team.players.forEach((p, i) => { p.name = `Simulated roster person ${team.abbr} ${i}`; });
  league.freeAgents.forEach((p, i) => { p.name = `Simulated market person ${i}`; });
  const draw = random(101); let prospects = E.nhlDraftClass(draw, 24, leagueNames(league));
  for (let n = 0; n < 4; n++) {
    const chosen = prospects.shift()!;
    if (!E.nhlConsumeDraftPick(league.teams[receiver])) throw new Error('Actual draft fixture token unavailable');
    league.teams[receiver].players.push(E.nhlProspectToPlayer(chosen, draw, league.ratingModelVersion));
    if (n < 2) prospects = E.nhlAiDraftPicks(league, prospects, E.nhlFoStandings(league).map(t => t.abbr).reverse().filter(a => a !== receiver), draw).remaining;
  }
  E.nhlOffseason(league, draw, receiver);
  if (league.teams[receiver].players.length !== 17) throw new Error('Actual offseason did not create the measured17-person overage');
  const state = { league, myTeam: receiver, phase: 'hub', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, draftBatchesLeft: 0, trust: 70, fired: false };
  const ids = league.teams[receiver].players.slice(-2).map(p => p.id);
  const costs = ids.map(id => deadMoneyFor(league!.teams[receiver].players.find(p => p.id === id)!));
  localStorage.setItem(KEY, JSON.stringify(state));
  localStorage.setItem('native970-unrelated', 'exact unrelated save bytes');
  sessionStorage.setItem('native970-meta', JSON.stringify({ initial: state, ids, costs, receiver, trades: 2, drafted: 4, actualOffseasons: 1 }));
  sessionStorage.setItem('native970-seeded', '1');
}
(window as any).__native970 = {
  read: () => {
    const raw = localStorage.getItem(KEY), save = JSON.parse(raw!);
    return { raw, save, meta: JSON.parse(sessionStorage.getItem('native970-meta')!), deadMoney: deadCapUsed(save.league.teams[save.myTeam]),
      unrelated: localStorage.getItem('native970-unrelated'), draws, writes: (window as any).__native970Writes ?? [] };
  },
  expectedRelease: (id: string) => {
    const save = JSON.parse(localStorage.getItem(KEY)!);
    const team = save.league.teams[save.myTeam], player = team.players.find((p: E.NhlGmPlayer) => p.id === id);
    if (!player) throw new Error('Expected real selected fixture player missing');
    const before = { roster: team.players.length, cap: E.nhlCapRoom(team, save.league.cap) };
    if (!E.nhlRelease(save.league.teams[save.myTeam], save.league.freeAgents, id, save.league.ratingModelVersion)) throw new Error('Actual expected release refused');
    return { league: save.league, playerName: player.name, rosterBefore: before.roster, rosterAfter: team.players.length,
      capBefore: before.cap, capAfter: E.nhlCapRoom(team, save.league.cap), deadMoneyAfter: deadCapUsed(team) };
  },
  expectedNextRound: () => {
    const save = JSON.parse(localStorage.getItem(KEY)!);
    let calls = 0; const stream = random(970);
    const baseline = () => { calls++; return stream(); };
    while (calls < draws) baseline();
    E.simNhlRound(save.league, save.myTeam, baseline);
    E.nhlAiMoves(save.league, save.myTeam, baseline);
    save.league.round++;
    return { league: save.league, draws: calls };
  },
};
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/nhl-front-office']}>
    <main className="container mx-auto max-w-2xl px-4 py-6 pb-20">
      <h1 className="mb-3 text-center text-lg font-bold">Offline NHL waiver receipt</h1>
      <p className="mb-4 text-xs text-muted-foreground">Actual accepted trades, four generated draft selections and an actual offseason create this 17-player simulation roster. Local simulated people, no full season claim.</p>
      <RouteErrorBoundary resetKey="/nhl-front-office"><Board /></RouteErrorBoundary>
    </main>
  </MemoryRouter>,
);
