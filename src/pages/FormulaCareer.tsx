import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useFormulaCareer } from '@/hooks/useFormulaCareer';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { formulaCareerStats, formulaStandings, formulaWeekendId,
  type FormulaApproach, type FormulaFocus, type FormulaRace } from '@/lib/formulaCareer';
import { FORMULA_CALENDAR } from '@/data/formulaCareer2025';

type Panel = 'hub' | 'grid' | 'race' | 'drivers' | 'teams' | 'calendar' | 'field' | 'history';
const RULES_KEY = 'dukb-formula-career-rules-v1';
const TITLE = 'Formula Career: F1 Driver Career Sim';
const DESCRIPTION = 'Build a generated F1 driver career, qualify and race a full grid, earn better seats and chase championships. Free saved play with simplified 2025 rules.';
const listClass = 'max-h-[55vh] overflow-y-auto overscroll-contain rounded-xl border border-border divide-y divide-border';
const actionClass = 'min-h-11 h-auto whitespace-normal py-3';
const money = (value: number) => '$' + value.toLocaleString('en-US');
const time = (ms: number) => Math.floor(ms / 60000) + ':' + ((ms % 60000) / 1000).toFixed(3).padStart(6, '0');

export default function FormulaCareer() {
  const game = useFormulaCareer();
  const career = game.career;
  const [name, setName] = useState('');
  const [panel, setPanel] = useState<Panel>('hub');
  const [focus, setFocus] = useState<FormulaFocus>(career?.focus ?? 'pace');
  const [approach, setApproach] = useState<FormulaApproach>(career?.approach ?? 'steady');
  const [season, setSeason] = useState(career?.season ?? 1);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'retire' | 'new' | null>(null);
  const [help, setHelp] = useState(() => {
    try { return localStorage.getItem(RULES_KEY) !== '1'; } catch { return true; }
  });
  const helpButton = useRef<HTMLButtonElement>(null);
  const confirmationButton = useRef<HTMLButtonElement | null>(null);
  const reveal = useRevealScroll(panel + ':' + (career ? formulaWeekendId(career) + ':' + career.phase : 'setup') + ':' + game.error);

  useEffect(() => {
    setPanel('hub');
    setReplayId(null);
    setSeason(career?.season ?? 1);
    setFocus(career?.focus ?? 'pace');
    setApproach(career?.approach ?? 'steady');
  }, [career?.phase, career?.season, career?.round]);

  const player = career?.drivers.find(driver => driver.id === 'player');
  const teams = career?.teams ?? [];
  const playerTeam = teams.find(team => team.id === player?.teamId);
  const teamName = (id: string) => teams.find(team => team.id === id)?.name ?? 'Team not recorded';
  const stats = career ? formulaCareerStats(career) : null;
  const standings = career ? formulaStandings(career, season) : null;
  const latest = career?.races[career.races.length - 1];
  const shownRace = career?.races.find(race => race.id === replayId) ?? latest;
  const id = career ? formulaWeekendId(career) : '';
  const completedSeason = career?.races.filter(race => race.season === season).length === 24;
  const openPanel = (next: Panel) => { setReplayId(null); setPanel(next); };
  const closeHelp = (open: boolean) => {
    setHelp(open);
    if (!open) { try { localStorage.setItem(RULES_KEY, '1'); } catch { /* Help stays available without storage. */ } }
  };
  const renderRace = (race: FormulaRace) => (
    <>
      <h2 className="text-xl font-display font-bold">{race.event} result</h2>
      <p className="text-sm text-muted-foreground">Season {race.season}, Grand Prix {race.round + 1}. Retirements are shown separately from finishers.</p>
      <ol aria-label="Race classification" className={listClass}>
        {race.results.map(result => (
          <li key={result.driverId} className={'flex items-start gap-3 p-3 text-sm ' + (result.driverId === 'player' ? 'bg-primary/10' : '')}>
            <span className="w-8 shrink-0 font-bold">{result.position ?? 'RET'}</span>
            <div className="min-w-0 flex-1 break-words">
              <strong>{result.name}</strong>
              <div className="text-xs text-muted-foreground">{teamName(result.teamId)} · Grid {result.grid}{result.reason ? ' · ' + result.reason : ''}</div>
            </div>
            <span className="shrink-0">{result.points} pts</span>
          </li>
        ))}
      </ol>
    </>
  );

  return (
    <>
      <PageSeo title={TITLE} description={DESCRIPTION} path="/f1-career" />
      <GameShell width="wide" title="Formula Career" emoji="🏎️" subtitle="Build your driver. Earn your next seat." help="none" headerExtra={<div className="mt-3 flex justify-center"><Button ref={helpButton} variant="outline" size="icon" className="h-11 w-11" aria-label="Formula Career rules" onClick={() => setHelp(true)}><HelpCircle /></Button></div>}>
        <p className="mb-4 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Generated drivers and teams. Simplified 2025 Grand Prix-only rules, no Sprints. Later seasons use a fictional calendar template.
        </p>
        {!career ? (
          <form onSubmit={event => { event.preventDefault(); game.start(name); }} className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold">{game.recovery ? 'Start a new saved career' : 'Your first seat'}</h2>
            {game.error && <p role="alert" className="rounded-xl border border-destructive/60 p-3 text-sm">{game.error}</p>}
            <p className="text-sm text-muted-foreground">{game.recovery ? 'Starting a new career replaces the unreadable save only after the new one is saved.' : 'Start at Harbor Racing with a generated twenty-driver field. Your progress stays in this browser.'}</p>
            <label className="block text-sm font-medium" htmlFor="formula-driver-name">Driver name</label>
            <input id="formula-driver-name" maxLength={28} required value={name} onChange={event => setName(event.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3" autoComplete="off" />
            <Button type="submit" className={actionClass + ' w-full'} disabled={help}>Start career</Button>
          </form>
        ) : (
          <div data-formula-career-phase={career.phase} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-bold break-words">{player!.name} · {teamName(player!.teamId)}</p>
              <p className="text-sm text-muted-foreground">Age {player!.age} · Season {career.season}/20 · {money(career.contracts[career.season - 1].salary)} game salary per season</p>
              <p className="text-xs text-muted-foreground">Team pace {playerTeam!.pace.toFixed(1)} · Reliability {playerTeam!.reliability.toFixed(1)}. Generated game attributes.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[['Starts', stats!.starts], ['Points', stats!.points], ['Wins', stats!.wins], ['Podiums', stats!.podiums], ['Titles', stats!.titles], ['Point conversion', stats!.score + '/100']].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted p-2"><div className="text-lg font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Personal score, unranked. Game earnings {money(stats!.earnings)}.</p>
            </div>
            <section ref={reveal} tabIndex={-1} data-formula-career-panel={panel} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              {game.error && !confirm && <p role="alert" className="rounded-xl border border-destructive/60 p-3 text-sm">{game.error}</p>}
              {panel !== 'hub' && <Button variant="outline" className={actionClass} onClick={() => setPanel('hub')}><ArrowLeft /> Back to career</Button>}
              {panel === 'hub' && (
                <>
                  {career.phase === 'weekend' && (
                    <>
                      <h2 className="text-xl font-display font-bold">{FORMULA_CALENDAR[career.round]} weekend</h2>
                      <p className="text-sm text-muted-foreground">Grand Prix {career.round + 1}/24. Your choices lock when qualifying starts.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">Training focus<select aria-label="Training focus" value={focus} onChange={event => setFocus(event.target.value as FormulaFocus)} className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3"><option value="pace">Pace</option><option value="racecraft">Racecraft</option><option value="composure">Composure</option></select></label>
                        <label className="text-sm">Race approach<select aria-label="Race approach" value={approach} onChange={event => setApproach(event.target.value as FormulaApproach)} className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3"><option value="careful">Careful</option><option value="steady">Steady</option><option value="attack">Attack</option></select></label>
                      </div>
                      <Button className={actionClass + ' w-full'} onClick={() => game.qualify(id, focus, approach)}>Run qualifying</Button>
                    </>
                  )}
                  {career.phase === 'grid' && (
                    <>
                      <h2 className="text-xl font-display font-bold">Grid set for {FORMULA_CALENDAR[career.round]}</h2>
                      <p className="text-sm">You start P{career.qualifying!.grid.find(row => row.driverId === 'player')!.position}. Approach: {career.approach}.</p>
                      <Button variant="outline" className={actionClass + ' w-full'} onClick={() => openPanel('grid')}>Qualifying grid</Button>
                      <Button className={actionClass + ' w-full'} onClick={() => game.race(id)}>Run race</Button>
                    </>
                  )}
                  {career.phase === 'result' && latest && (
                    <>
                      {renderRace(latest)}
                      {career.round === 23 && <p className="rounded-lg bg-muted p-3 text-sm">Season complete. The championships use all 24 saved results. Open the standings to read the final ranks.</p>}
                      <Button className={actionClass + ' w-full'} onClick={() => game.advance(id)}>{career.round < 23 ? 'Next weekend' : career.season === 20 ? 'Finish career' : 'Review seat offers'}</Button>
                    </>
                  )}
                  {career.phase === 'contracts' && (
                    <>
                      <h2 className="text-xl font-display font-bold">Your next seat</h2>
                      <p className="text-sm text-muted-foreground">These generated offers cover one season. Negotiate each once or sign the salary shown. A refused raise keeps the original offer.</p>
                      <p className="text-xs text-muted-foreground">Changing teams swaps the outgoing driver into your old seat. The whole generated world develops once when you sign.</p>
                      <div className="space-y-3">
                        {career.offers.map(offer => (
                          <article key={offer.id} className="rounded-xl border border-border p-3" data-formula-offer={offer.id}>
                            <h3 className="font-bold">{teamName(offer.teamId)}</h3>
                            <p className="text-sm">{money(offer.salary)} game salary · One season{offer.teamId === player!.teamId ? ' · Renew your seat' : ''}</p>
                            <p className="text-xs text-muted-foreground">{offer.teamId === player!.teamId ? 'Your teammate stays.' : 'Outgoing seat: ' + (career.drivers.find(driver => driver.id === offer.outgoingDriverId)?.name ?? 'Driver not recorded')}</p>
                            <p className="my-2 text-sm">Negotiation: {offer.decision === 'original' ? 'Not tried' : offer.decision === 'raise' ? 'Raise agreed' : offer.decision === 'counter' ? 'Smaller raise agreed' : 'Raise refused, original salary held'}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" className={actionClass} disabled={offer.negotiated} onClick={() => game.negotiate(offer.id)} aria-label={'Negotiate with ' + teamName(offer.teamId)}>Negotiate</Button>
                              <Button className={actionClass} onClick={() => game.accept(offer.id)} aria-label={'Sign contract with ' + teamName(offer.teamId)}>Sign contract</Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                  {career.phase === 'retired' && (
                    <>
                      <h2 className="text-xl font-display font-bold">Career complete</h2>
                      <p className="text-sm">{stats!.starts} starts, {stats!.wins} wins and {stats!.titles} driver titles. Your complete saved record stays here.</p>
                      <Button className={actionClass + ' w-full'} onClick={event => { confirmationButton.current = event.currentTarget; setConfirm('new'); }}>New career</Button>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {([['drivers', 'Driver standings'], ['teams', 'Team standings'], ['calendar', 'Calendar'], ['field', 'The grid'], ['history', 'Career record']] as const).map(([view, label]) => (
                      <Button key={view} variant="outline" className={actionClass} onClick={() => openPanel(view)}>{label}</Button>
                    ))}
                    {latest && <Button variant="outline" className={actionClass} onClick={() => openPanel('race')}>Last race</Button>}
                  </div>
                  {career.phase !== 'grid' && career.phase !== 'retired' && <Button variant="ghost" className={actionClass + ' w-full'} onClick={event => { confirmationButton.current = event.currentTarget; setConfirm('retire'); }}>Retire</Button>}
                </>
              )}
              {panel === 'grid' && career.qualifying && (
                <>
                  <h2 className="text-xl font-display font-bold">Qualifying grid</h2>
                  <p className="text-xs text-muted-foreground">Generated times. Each session resets; the listed session decides that grid place.</p>
                  <ol aria-label="Qualifying grid" className={listClass}>{career.qualifying.grid.map(row => <li key={row.driverId} className={'flex items-start gap-3 p-3 text-sm ' + (row.driverId === 'player' ? 'bg-primary/10' : '')}><span className="w-6 shrink-0 font-bold">{row.position}</span><div className="min-w-0 flex-1 break-words"><strong>{row.name}</strong><p className="text-xs text-muted-foreground">{teamName(row.teamId)}</p></div><span className="shrink-0 text-right">{time(row.ms)}<br /><span className="text-xs">Q{row.stage}</span></span></li>)}</ol>
                </>
              )}
              {panel === 'race' && shownRace && renderRace(shownRace)}
              {(panel === 'drivers' || panel === 'teams') && standings && (
                <>
                  <h2 className="text-xl font-display font-bold">{panel === 'drivers' ? 'Driver standings' : 'Team standings'}</h2>
                  <label className="block text-sm">Season<select aria-label="Standings season" value={season} onChange={event => setSeason(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg border border-input bg-background px-3">{Array.from({ length: career.season }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
                  <p className="text-xs text-muted-foreground">{completedSeason ? 'Final ranks from all 24 saved Grands Prix.' : 'Season in progress. Ranks can change.'} Exact remaining ties share a rank.</p>
                  <ol aria-label={panel === 'drivers' ? 'Driver standings' : 'Team standings'} className={listClass}>{standings[panel].map(row => <li key={row.id} className={'flex gap-3 p-3 text-sm ' + (row.id === 'player' ? 'bg-primary/10' : '')}><span className="w-6 shrink-0 font-bold">{row.rank}</span><div className="min-w-0 flex-1 break-words"><strong>{row.name}</strong><p className="text-xs text-muted-foreground">{row.wins} wins · {row.podiums} podiums</p></div><span className="shrink-0">{row.points} pts</span></li>)}</ol>
                </>
              )}
              {panel === 'calendar' && (
                <>
                  <h2 className="text-xl font-display font-bold">Season {career.season} calendar</h2>
                  <p className="text-xs text-muted-foreground">The 2025 Grand Prix template, reused for fictional career seasons. No Sprint events.</p>
                  <ol aria-label="Grand Prix calendar" className={listClass}>{FORMULA_CALENDAR.map((event, round) => { const race = career.races.find(row => row.season === career.season && row.round === round); const result = race?.results.find(row => row.driverId === 'player'); return <li key={event} className="flex gap-3 p-3 text-sm"><span className="w-6 shrink-0">{round + 1}</span><div className="min-w-0 flex-1 break-words"><strong>{event}</strong><p className="text-xs text-muted-foreground">{result ? (result.position === null ? 'Retired' : 'P' + result.position) + ' · ' + result.points + ' pts' : round === career.round && career.phase !== 'retired' ? 'Current weekend' : 'Not raced'}</p></div></li>; })}</ol>
                </>
              )}
              {panel === 'field' && (
                <>
                  <h2 className="text-xl font-display font-bold">The generated grid</h2>
                  <p className="text-xs text-muted-foreground">Game attributes, not real driver ratings. Twenty drivers, two per team.</p>
                  <ul aria-label="Generated drivers" className={listClass}>{career.drivers.map(driver => <li key={driver.id} className={'p-3 text-sm ' + (driver.id === 'player' ? 'bg-primary/10' : '')}><strong className="break-words">{driver.name}</strong><p className="text-xs text-muted-foreground">{teamName(driver.teamId)} · Age {driver.age}</p><p className="mt-1 text-xs">Pace {driver.pace.toFixed(1)} · Racecraft {driver.racecraft.toFixed(1)} · Composure {driver.composure.toFixed(1)} · Potential {driver.potential.toFixed(1)}</p></li>)}</ul>
                </>
              )}
              {panel === 'history' && (
                <>
                  <h2 className="text-xl font-display font-bold">Career record</h2>
                  <label className="block text-sm">Season<select aria-label="Career record season" value={season} onChange={event => setSeason(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg border border-input bg-background px-3">{Array.from({ length: career.season }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
                  {completedSeason && standings && <p className="text-sm">Driver champion{standings.drivers.filter(row => row.rank === 1).length > 1 ? 's' : ''}: {standings.drivers.filter(row => row.rank === 1).map(row => row.name).join(', ')}. Team champion{standings.teams.filter(row => row.rank === 1).length > 1 ? 's' : ''}: {standings.teams.filter(row => row.rank === 1).map(row => row.name).join(', ')}.</p>}
                  {career.races.some(race => race.season === season) ? <ol aria-label="Saved career races" className={listClass}>{career.races.filter(race => race.season === season).map(race => { const result = race.results.find(row => row.driverId === 'player')!; return <li key={race.id}><button className="min-h-11 w-full p-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setReplayId(race.id); setPanel('race'); }}><strong>{race.round + 1}. {race.event}</strong><p className="text-xs text-muted-foreground">{result.position === null ? 'Retired' : 'P' + result.position} · {result.points} pts · {teamName(result.teamId)}</p></button></li>; })}</ol> : <p className="text-sm text-muted-foreground">No Grand Prix starts recorded in this season.</p>}
                </>
              )}
            </section>
          </div>
        )}
        <GameSeoContent pageHasOwnH1 title={TITLE} description={DESCRIPTION} />
        <GameNav />
      </GameShell>
      <Dialog open={help} onOpenChange={closeHelp}>
        <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:opacity-100" onCloseAutoFocus={event => { event.preventDefault(); helpButton.current?.focus({ preventScroll: true }); }}>
          <DialogHeader><DialogTitle>Formula Career rules</DialogTitle><DialogDescription>Generated racing, simplified 2025 Grand Prix rules.</DialogDescription></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Build a generated driver's career. Choose a training focus and race approach, qualify all twenty drivers, then race once.</p>
            <p>This is a simplified 2025 Grand Prix-only model. No Sprints, shortened-race rules, penalties or lap physics. All drivers, teams, contracts and results are generated. Future seasons reuse a fictional calendar template.</p>
            <p>Qualifying cuts five drivers after Q1 and five after Q2. Each session resets. The first ten finishers score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1. No fastest-lap bonus; retired entrants score zero in this model.</p>
            <p>Example: you finish fourth for 12 points and your teammate seventh for 6. Your team earns 18. Later seat moves leave those old team points alone.</p>
            <p>Your personal score is rounded 100 × points ÷ (25 × starts), with retirements counted as starts. It is unranked. A completed season records one play; an early retirement after a start can record one too. Retiring just after a season finish does not count twice. Your point-conversion score stays off the leaderboard.</p>
            <p>Offers last one season and allow one negotiation. A team move swaps its outgoing driver into your old seat. Development happens once when you sign. The career ends after twenty seasons, or when you choose to retire from a settled screen.</p>
            <p>Every action saves before it advances. Refresh resumes the same state. Tables, help and Back do not rerun results. If saving fails, your previous career stays in place.</p>
            <Button className={actionClass + ' w-full'} onClick={() => closeHelp(false)}>Let's play</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null); }}>
        <DialogContent className="max-w-md [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:opacity-100" onCloseAutoFocus={event => { event.preventDefault(); const trigger = confirmationButton.current; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); else reveal.current?.focus({ preventScroll: true }); }}>
          <DialogHeader><DialogTitle>{confirm === 'retire' ? 'Retire from racing?' : 'Start another career?'}</DialogTitle></DialogHeader>
          {confirm === 'retire' ? <DialogDescription>Your current career ends. All saved races, points and contracts stay readable.</DialogDescription> : <><DialogDescription>A new generated world replaces this career after the new save succeeds.</DialogDescription><label className="text-sm" htmlFor="formula-new-name">Driver name</label><input id="formula-new-name" maxLength={28} value={name} onChange={event => setName(event.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3" /></>}
          {game.error && <p role="alert" className="rounded-xl border border-destructive/60 p-3 text-sm">{game.error}</p>}
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" className={actionClass} onClick={() => setConfirm(null)}>Keep career</Button><Button className={actionClass} onClick={() => { if (confirm === 'retire' ? game.retire() : game.start(name, true, career!)) setConfirm(null); }}>{confirm === 'retire' ? 'Confirm retirement' : 'Start new career'}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
