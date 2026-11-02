import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameShell } from '@/components/game/GameShell';
import { RulesGate } from '@/components/game/RulesGate';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGrandPrixBoss } from '@/hooks/useGrandPrixBoss';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { seasonScore, type CarArea, type Compound, type GrandPrixAction, type GrandPrixCareer, type Pace } from '@/lib/grandPrixBoss';

type Panel = 'Next race' | 'Drivers' | 'Car' | 'Finances' | 'Standings' | 'History';
const PANELS: Panel[] = ['Next race', 'Drivers', 'Car', 'Finances', 'Standings', 'History'];
const DETAILS = ['Two drivers, one race plan', 'Your seats and available drivers', 'Power, aero and reliability', 'Cash and committed costs', 'Both championships', 'Your saved race results'];
const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40';
const select = 'min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm';
const money = (value: number) => '€' + value.toLocaleString('en-US');
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const ownDrivers = (career: GrandPrixCareer) => career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
const standingsOrder = (a: { points: number; wins: number; podiums: number }, b: { points: number; wins: number; podiums: number }) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums;

function Rules() {
  return <RulesGate title="How to play Grand Prix Boss" floatingTrigger={false} className="min-h-11 min-w-11">
    <p>Run two drivers through a twelve-race season. All teams, drivers and tracks are fictional.</p>
    <ol className="list-decimal space-y-2 pl-5">
      <li>Check the track, drivers and car. The cash reserved for remaining race entries and wages cannot be spent on upgrades.</li>
      <li>Run qualifying once, then choose tyres and pace for both drivers. Wet tyres suit a wet race. Soft tyres are quick but wear faster; hard tyres last longer.</li>
      <li>Make decisions at laps 12 and 26, then race to lap 40. Push trades tyre life and reliability for pace. Conserve keeps the tyres and car safer.</li>
      <li>At each later stop, stay out or pit for fresh tyres. A pit costs time, so change only when the fresh tyres can repay it.</li>
      <li>The finish pays the actual prize and race costs once. Both drivers contribute to your team championship.</li>
      <li>Driver changes open before the first qualifying session and after the season. Quotes show the fee paid now, the one-season term and reserved wages. A review signing starts next season.</li>
      <li>Check the next season plan before you continue. It adds sponsor money, pays automatic renewals for expiring seats and protects the next year's entry fees and wages. A renewal paid during review leaves the automatic renewal bill.</li>
      <li>History keeps saved seasons, champions and your race results. Recorded totals stay saved when older details leave the latest twelve-season list. Older saves tell you when their records begin.</li>
    </ol>
    <div><h3 className="font-bold">A two-driver example</h3><p>One driver stays on worn tyres while the other pits for fresh hard tyres. Compare their positions and wear at the next decision. This is a game example, not a real race result.</p></div>
    <p>The top ten score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1. Ties use wins, podiums, then a fixed driver or team order.</p>
    <p>Your local season score gives 80 points for championship points compared with a perfect two-car season, and 20 for bringing both cars home. Every action is saved before the screen advances. If saving is refused, your current team stays on screen.</p>
  </RulesGate>;
}

function Stat({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{title}</p><p data-testid={testId} className="break-words font-semibold tabular-nums">{children}</p></div>;
}

function Championship({ career }: { career: GrandPrixCareer }) {
  return <div className="grid gap-5 md:grid-cols-2">
    {[{ title: 'Driver standings', rows: career.driverStandings.slice().sort((a, b) => standingsOrder(a, b) || a.driverId.localeCompare(b.driverId)).map(row => ({ ...row, name: career.drivers.find(driver => driver.id === row.driverId)!.name, own: career.drivers.find(driver => driver.id === row.driverId)!.contract?.teamId === career.teamId })) },
      { title: 'Team standings', rows: career.constructorStandings.slice().sort((a, b) => standingsOrder(a, b) || a.teamId.localeCompare(b.teamId)).map(row => ({ ...row, name: career.teams.find(team => team.id === row.teamId)!.name, own: row.teamId === career.teamId })) }].map(table => <section key={table.title}>
      <h3 className="mb-2 font-bold">{table.title}</h3>
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="py-2 pr-2">Pos</th><th>Name</th><th className="pl-2 text-right">Pts</th><th className="pl-2 text-right">Wins</th></tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={row.name} className={row.own ? 'border-b border-border bg-sky-400/10 font-bold' : 'border-b border-border/50'}><td className="py-2 pr-2 tabular-nums">{index + 1}</td><td className="break-words">{row.name}{row.own && <span className="sr-only">, your team</span>}</td><td className="pl-2 text-right tabular-nums">{row.points}</td><td className="pl-2 text-right tabular-nums">{row.wins}</td></tr>)}</tbody>
      </table></div>
    </section>)}
  </div>;
}

function Drivers({ career, dispatch, blocked }: { career: GrandPrixCareer; dispatch: (action: GrandPrixAction) => boolean; blocked: boolean }) {
  const [outgoingId, setOutgoingId] = useState('');
  const [incomingId, setIncomingId] = useState('');
  const seatHeadings = useRef<Record<string, HTMLHeadingElement | null>>({});
  const seats = ownDrivers(career);
  const outgoing = seats.find(driver => driver.id === outgoingId) ?? seats[0];
  const offers = career.marketOffers.filter(offer => offer.outgoingDriverId === outgoing.id && offer.incomingDriverId !== outgoing.id);
  const offer = offers.find(value => value.incomingDriverId === incomingId) ?? offers[0];
  return <div className="space-y-4">
    <h3 className="font-bold">Your two seats</h3>
    {seats.map(driver => {
      const contract = driver.contract!;
      const renewal = career.marketOffers.find(value => value.outgoingDriverId === driver.id && value.incomingDriverId === driver.id);
      return <article key={driver.id} className="space-y-3 border-b border-border pb-3">
        <h4 ref={element => { seatHeadings.current[driver.id] = element; }} tabIndex={-1} className="break-words font-bold">{driver.name}, {driver.age}</h4>
        <p className="text-sm text-muted-foreground">{money(contract.wagePerRace)} per race. Signed through year {Math.max(career.season, contract.startsSeason ?? career.season) + contract.years - 1}.{(contract.startsSeason ?? career.season) > career.season ? ' Starts year ' + contract.startsSeason + '.' : ''}</p>
        <p className="text-sm">Pace {driver.skills.pace}, consistency {driver.skills.consistency}, tyre care {driver.skills.tyreCare}, wet {driver.skills.wet}</p>
        {renewal && <div data-testid={'gp-renewal-' + driver.id} className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat title="Renewal fee">{money(renewal.signingFee)}</Stat><Stat title="Wage per race">{money(renewal.wagePerRace)}</Stat>
            <Stat title="Term">{renewal.years} season</Stat><Stat title="Starts">Year {renewal.startsSeason}</Stat>
            <Stat title="Next season reserve">{money(renewal.reserveAfter)}</Stat>
          </div>
          <button type="button" className={button + ' w-full'} disabled={blocked || !renewal.affordable} onClick={() => { if (!blocked && renewal.affordable && dispatch({ type: 'renewDriver', driverId: driver.id, expectedRevision: career.revision })) requestAnimationFrame(() => seatHeadings.current[driver.id]?.focus({ preventScroll: true })); }}>Renew {driver.name}</button>
        </div>}
      </article>;
    })}
    <h3 className="font-bold">Driver market</h3>
    {offers.length > 0 ? <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs"><span>Seat to change</span><select aria-label="Seat to change" className={select} disabled={blocked} value={outgoing.id} onChange={event => setOutgoingId(event.target.value)}>{seats.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
        <label className="space-y-1 text-xs"><span>Incoming driver</span><select aria-label="Incoming driver" className={select} disabled={blocked} value={offer.incomingDriverId} onChange={event => setIncomingId(event.target.value)}>{offers.map(value => {
          const driver = career.drivers.find(row => row.id === value.incomingDriverId)!;
          return <option key={driver.id} value={driver.id}>{driver.name}, pace {driver.skills.pace}</option>;
        })}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
        <Stat title="Wage per race" testId="gp-offer-wage">{money(offer.wagePerRace)}</Stat>
        <Stat title="Signing fee" testId="gp-offer-signing-fee">{money(offer.signingFee)}</Stat>
        <Stat title="Contract buyout" testId="gp-offer-buyout">{money(offer.buyout)}</Stat>
        <Stat title="Fee paid now" testId="gp-offer-total-fee">{money(offer.totalFee)}</Stat>
        <Stat title={career.phase === 'seasonReview' ? 'Next season reserve' : 'Reserve after signing'} testId="gp-offer-reserved">{money(offer.reserveAfter)}</Stat>
        <Stat title="Term" testId="gp-offer-term">{offer.years} season{offer.years === 1 ? '' : 's'}</Stat>
        <Stat title="Starts" testId="gp-offer-start">Year {offer.startsSeason}</Stat>
      </div>
      <p className="text-xs text-muted-foreground">The fee is paid now. Reserved money covers entries and signed wages.{career.phase === 'seasonReview' ? ' This deal starts next season.' : ''}</p>
      {!offer.affordable && <p className="text-sm">This offer leaves too little cash for the fee or reserved costs.</p>}
      <button type="button" className={button + ' w-full bg-primary text-primary-foreground'} disabled={blocked || !offer.affordable} onClick={() => { if (!blocked && offer.affordable) dispatch({ type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId, expectedRevision: career.revision }); }}>Sign driver</button>
    </div> : <p className="text-sm text-muted-foreground">Driver changes open before the first qualifying session and after the season.</p>}
  </div>;
}

function History({ career }: { career: GrandPrixCareer }) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const openers = useRef<Record<number, HTMLButtonElement | null>>({});
  const saved = career.history.find(row => row.season === selectedSeason);
  useEffect(() => { if (saved) heading.current?.focus({ preventScroll: true }); }, [saved?.season]);
  const back = () => { const from = selectedSeason; setSelectedSeason(null); requestAnimationFrame(() => { if (from !== null) openers.current[from]?.focus({ preventScroll: true }); }); };
  const totals = career.careerTotals;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <Stat title="Recorded seasons" testId="gp-history-total-seasons">{totals.archivedSeasons}</Stat>
      <Stat title="Recorded driver titles" testId="gp-history-driver-titles">{totals.driverTitles}</Stat>
      <Stat title="Recorded team titles" testId="gp-history-team-titles">{totals.constructorTitles}</Stat>
    </div>
    <p data-testid="gp-history-coverage" className="text-xs text-muted-foreground">Recorded since year {totals.sinceSeason}.{totals.earlierSeasonsUnknown ? ' Earlier seasons are unknown.' : ''}</p>
    {saved ? <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 ref={heading} tabIndex={-1} className="font-bold outline-none">Season {saved.season}</h3><button type="button" className={button} onClick={back}>Back to history</button></div>
      <p className="text-sm">{saved.team.name}: P{saved.team.position}, {saved.team.points} points.</p>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
        <Stat title="Driver champion" testId="gp-archive-driver-champion">{saved.driverChampion.name}</Stat>
        <Stat title="Champion points" testId="gp-archive-driver-points">{saved.driverChampion.points}</Stat>
        <Stat title="Team champion" testId="gp-archive-team-champion">{saved.constructorChampion.name}</Stat>
        <Stat title="Champion team points" testId="gp-archive-team-points">{saved.constructorChampion.points}</Stat>
        <Stat title="End-of-season cash" testId="gp-archive-end-cash">{money(saved.endCash)}</Stat>
        {(['power', 'aero', 'reliability'] as CarArea[]).map(area => <Stat key={area} title={'Final ' + area} testId={'gp-archive-' + area}>{saved.finalCar[area]}</Stat>)}
      </div>
      <div className="space-y-2">{saved.races.map(result => <details key={result.roundId} data-testid={'gp-archive-race-' + result.roundId} className="rounded-lg border border-border px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{result.trackName}</summary>
        <p className="pb-2 text-sm">{result.drivers.map(driver => driver.name + ': ' + (driver.status === 'retired' ? 'retired' : 'P' + driver.position) + ', ' + driver.points + ' pts').join('. ')}</p>
        <p className="pb-3 text-xs text-muted-foreground">Prize {money(result.teamPrize)}, costs {money(result.operatingCost)}</p>
      </details>)}</div>
    </> : <>
      <h3 className="font-bold">Saved seasons</h3>
      <p className="text-xs text-muted-foreground">The latest twelve season details stay here. Recorded totals include older saved seasons too.</p>
      {career.history.length > 0 ? <div className="grid grid-cols-2 gap-3">{career.history.slice().reverse().map(row => <button type="button" key={row.season} aria-label={'Season ' + row.season} ref={element => { openers.current[row.season] = element; }} className={button + ' text-left'} onClick={() => setSelectedSeason(row.season)}><span className="block">Season {row.season}</span><span className="mt-1 block text-xs font-normal">{row.team.points} team points</span></button>)}</div> : <p className="text-sm text-muted-foreground">A completed season appears here when you start the next one.</p>}
      <h3 className="font-bold">Current season</h3>
      {career.results.length === 0 ? <p className="text-sm text-muted-foreground">Your first result appears after the opening race.</p> : career.results.map(result => <article key={result.roundId} className="border-b border-border pb-3"><h4 className="font-bold">{career.calendar.find(track => track.id === result.roundId)!.name}</h4><p className="text-sm">{result.classification.filter(row => row.teamId === career.teamId).map(row => career.drivers.find(driver => driver.id === row.driverId)!.name + ': ' + (row.status === 'retired' ? 'retired' : 'P' + row.position) + ', ' + row.points + ' pts').join('. ')}</p><p className="text-xs text-muted-foreground">Prize {money(result.teamPrize)}, costs {money(result.operatingCost)}</p></article>)}
    </>}
  </div>;
}

function Race({ career, dispatch, blocked }: { career: GrandPrixCareer; dispatch: (action: GrandPrixAction) => boolean; blocked: boolean }) {
  const [choices, setChoices] = useState<Record<string, { compound?: Compound; pace?: Pace; pitTo?: Compound | '' }>>({});
  const drivers = career.phase === 'seasonReview' && career.race
    ? career.race.entries.filter(entry => entry.teamId === career.teamId).map(entry => career.drivers.find(driver => driver.id === entry.driverId)!)
    : ownDrivers(career);
  const track = career.calendar[career.round];
  const race = career.race;
  const entries = race?.entries.slice().sort((a, b) => Number(a.status === 'retired') - Number(b.status === 'retired') || b.completedLaps - a.completedLaps || a.elapsedMs - b.elapsedMs || a.driverId.localeCompare(b.driverId)) ?? [];
  const result = career.results.find(row => row.roundId === track.id);
  const complete = career.phase === 'raceResult' || career.phase === 'seasonReview';
  const nextLap = [12, 26, 40].find(lap => lap > (race?.lap ?? 0)) ?? 40;
  const run = () => {
    if (career.phase === 'preRace') return dispatch({ type: 'qualify', expectedRevision: career.revision });
    if (career.phase === 'grid') return dispatch({ type: 'startRace', expectedRevision: career.revision, setups: drivers.map(driver => {
      const entry = race!.entries.find(row => row.driverId === driver.id)!;
      return { driverId: driver.id, compound: choices[driver.id]?.compound ?? entry.compound, pace: choices[driver.id]?.pace ?? entry.pace };
    }) });
    if (career.phase === 'race') {
      const saved = dispatch({ type: 'raceInterval', expectedRevision: career.revision, orders: drivers.map(driver => {
        const entry = race!.entries.find(row => row.driverId === driver.id)!;
        const choice = choices[driver.id];
        return { driverId: driver.id, pace: choice?.pace ?? entry.pace, ...(choice?.pitTo ? { pitTo: choice.pitTo } : {}) };
      }) });
      if (saved) setChoices(old => Object.fromEntries(Object.entries(old).map(([id, choice]) => [id, { ...choice, pitTo: '' }])));
      return saved;
    }
    if (career.phase === 'raceResult') { setChoices({}); return dispatch({ type: 'continue', expectedRevision: career.revision }); }
    const saved = dispatch({ type: 'startNextSeason', expectedRevision: career.revision });
    if (saved) setChoices({});
    return saved;
  };
  const action = career.phase === 'preRace' ? 'Run qualifying' : career.phase === 'grid' ? 'Start race' : career.phase === 'race' ? 'Run to lap ' + nextLap : career.phase === 'raceResult' ? 'Next round' : 'Start next season';
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{track.name}</h3><p className="text-xs text-muted-foreground">Round {career.round + 1} of {career.calendar.length}, {track.laps} laps</p></div><p className="rounded-md bg-sky-400/10 px-3 py-2 text-sm font-semibold">{race ? label(race.weather) + ' race' : Math.round(track.rainChance * 100) + '% chance of rain'}</p></div>
    {career.phase === 'preRace' && <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3"><Stat title="Track leans">{track.powerWeight > track.aeroWeight ? 'Power' : track.powerWeight < track.aeroWeight ? 'Aero' : 'Balanced'}</Stat><Stat title="Entry cost">{money(track.entryCost)}</Stat><p className="col-span-2 text-xs text-muted-foreground">Qualifying fixes the grid and weather. Check your car and cash before you go.</p></div>}
    {race && <p className="text-sm font-semibold tabular-nums">Lap {race.lap} of {track.laps}{complete ? ', race finished' : ''}</p>}
    <div className="space-y-3">{drivers.map(driver => {
      const entry = race?.entries.find(row => row.driverId === driver.id);
      const classified = result?.classification.find(row => row.driverId === driver.id);
      const position = complete && classified ? classified.position : entries.findIndex(row => row.driverId === driver.id) + 1;
      const status = complete && classified ? classified.status : entry?.status;
      const choice = choices[driver.id] ?? {};
      const change = (patch: Partial<typeof choice>) => setChoices(old => ({ ...old, [driver.id]: { ...old[driver.id], ...patch } }));
      return <section key={driver.id} className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3"><h4 className="min-w-0 break-words font-bold">{driver.name}</h4><p className="shrink-0 text-sm font-bold tabular-nums">{entry ? status === 'retired' ? 'Retired' : 'P' + position : 'Not qualified'}</p></div>
        {entry && <p className="mt-1 text-xs text-muted-foreground">{label(entry.compound)} tyres, {Math.round(entry.tyreWear)}% wear, {entry.stops} stops</p>}
        {!complete && entry && <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="min-w-0 text-xs">{career.phase === 'grid' ? 'Tyres' : 'Pit choice'}
            {career.phase === 'grid' ? <select aria-label={'Tyres for ' + driver.name} className={select} disabled={blocked} value={choice.compound ?? entry.compound} onChange={event => change({ compound: event.target.value as Compound })}>{['soft', 'medium', 'hard', 'wet'].map(tyre => <option key={tyre} value={tyre}>{label(tyre)}</option>)}</select>
              : <select aria-label={'Pit choice for ' + driver.name} className={select} value={choice.pitTo ?? ''} disabled={blocked || race!.lap === 0 || entry.status === 'retired'} onChange={event => change({ pitTo: event.target.value as Compound | '' })}><option value="">Stay out</option>{['soft', 'medium', 'hard', 'wet'].map(tyre => <option key={tyre} value={tyre}>Pit for {tyre}</option>)}</select>}
          </label>
          <label className="min-w-0 text-xs">Pace<select aria-label={'Pace for ' + driver.name} className={select} value={choice.pace ?? entry.pace} disabled={blocked || entry.status === 'retired'} onChange={event => change({ pace: event.target.value as Pace })}>{['conserve', 'balanced', 'push'].map(pace => <option key={pace} value={pace}>{label(pace)}</option>)}</select></label>
        </div>}
        {!entry && <p className="mt-1 text-xs text-muted-foreground">Pace {driver.skills.pace}, tyre care {driver.skills.tyreCare}, wet skill {driver.skills.wet}</p>}
      </section>;
    })}</div>
    {result && <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3"><Stat title="Race prize">{money(result.teamPrize)}</Stat><Stat title="Entry and wages">{money(result.operatingCost)}</Stat>{career.phase === 'seasonReview' && <p className="col-span-2 font-bold">Season complete. Local score: {seasonScore({ teamPoints: career.constructorStandings.find(row => row.teamId === career.teamId)!.points, rounds: career.calendar.length, roundsBothDriversFinished: career.results.filter(row => row.classification.filter(car => car.teamId === career.teamId && car.status === 'finished').length === 2).length })}/100</p>}</div>}
    {career.phase === 'seasonReview' && career.nextSeasonPlan && <div className="space-y-3 rounded-xl border border-border p-3">
      <h3 className="font-bold">Next season plan: Year {career.nextSeasonPlan.nextSeason}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Stat title="End-of-season cash" testId="gp-season-end-cash">{money(career.cash)}</Stat>
        <Stat title="Sponsor payment" testId="gp-next-sponsor">{money(career.nextSeasonPlan.sponsor)}</Stat>
        <Stat title="Automatic renewal fees" testId="gp-next-renewal-fee">{money(career.nextSeasonPlan.totalRenewalFee)}</Stat>
        <Stat title="Next season reserve" testId="gp-next-reserved">{money(career.nextSeasonPlan.nextReserved)}</Stat>
        <Stat title="Cash after sponsor and renewals" testId="gp-next-cash-after">{money(career.nextSeasonPlan.cashAfter)}</Stat>
      </div>
      {career.nextSeasonPlan.automaticRenewals.map(renewal => <p key={renewal.driverId} className="text-xs text-muted-foreground">Automatic renewal: {career.drivers.find(driver => driver.id === renewal.driverId)!.name}, one season from year {career.nextSeasonPlan!.nextSeason}. Fee {money(renewal.signingFee)}, wage {money(renewal.wagePerRace)} per race.</p>)}
      <p className="text-xs text-muted-foreground">The plan pays the listed renewal fees and keeps next season's entries and wages reserved. Renewals already paid during review leave this bill.</p>
      {!career.nextSeasonPlan.affordable && <p className="text-sm">You need more cash to cover next season's reserve.</p>}
    </div>}
    <button type="button" className={button + ' w-full bg-primary text-primary-foreground'} disabled={blocked || career.phase === 'seasonReview' && !career.nextSeasonPlan?.affordable} onClick={run}>{action}</button>
    {race && <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Whole field</summary><ol className="max-h-72 space-y-1 overflow-y-auto text-sm">{entries.map((entry, index) => <li key={entry.driverId} className="flex justify-between gap-3 border-b border-border py-2"><span>{index + 1}. {career.drivers.find(driver => driver.id === entry.driverId)!.name}</span><span className="shrink-0 tabular-nums">{entry.status === 'retired' ? 'Retired' : entry.completedLaps + ' laps'}</span></li>)}</ol></details>}
  </div>;
}

export default function GrandPrixBoss() {
  const game = useGrandPrixBoss();
  const career = game.career;
  const [panel, setPanel] = useState<Panel | null>(null);
  const openers = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});
  const heading = useRef<HTMLHeadingElement | null>(null);
  const interacted = useRef(false);
  const reveal = useRevealScroll(panel + ':' + (career?.phase ?? game.status));
  useEffect(() => { if (interacted.current) heading.current?.focus({ preventScroll: true }); }, [panel]);
  const open = (next: Panel) => { interacted.current = true; setPanel(next); };
  const back = () => { const from = panel; setPanel(null); requestAnimationFrame(() => { if (from) openers.current[from]?.focus({ preventScroll: true }); }); };
  const blocked = game.status !== 'ready' && game.status !== 'empty' || game.moved;
  const team = career?.teams.find(row => row.id === career.teamId);
  const content = () => {
    if (!career) return <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {game.status === 'empty' && !game.moved ? <><h2 className="text-xl font-bold">Your team starts here</h2><p className="text-sm text-muted-foreground">Choose the car upgrades, hire the drivers and call the race strategy. Play signed out. Your team saves in this browser.</p><button type="button" className={button + ' w-full bg-primary text-primary-foreground'} onClick={() => { interacted.current = true; if (game.start(crypto.getRandomValues(new Uint32Array(1))[0])) requestAnimationFrame(() => openers.current['Next race']?.focus({ preventScroll: true })); }}>Start your team</button></>
        : <><h2 className="text-lg font-bold">Your saved team is protected</h2><p className="text-sm text-muted-foreground">Reload to read it again. Your saved data stays in place.</p><button type="button" className={button + ' w-full'} onClick={game.reload}>Reload saved team</button></>}
    </div>;
    if (!panel) return <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3"><Stat title="Your team">{team!.name}</Stat><Stat title="Season">Year {career.season}, round {career.round + 1}</Stat><Stat title="Cash">{money(career.cash)}</Stat><Stat title="Available to spend">{money(career.cash - career.reserved)}</Stat></div>
      <div className="grid grid-cols-2 gap-3">{PANELS.map((name, index) => <button type="button" key={name} aria-label={name} ref={element => { openers.current[name] = element; }} onClick={() => open(name)} className={button + ' min-h-20 text-left ' + (name === 'Next race' ? 'border-sky-300/50 bg-sky-400/10' : 'bg-card')}><span className="block">{name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{DETAILS[index]}</span></button>)}</div>
    </div>;
    return <section className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4" data-gp-panel={panel}>
      <div className="flex items-center justify-between gap-2"><h2 tabIndex={-1} ref={heading} className="text-xl font-bold outline-none">{panel}</h2><button type="button" className={button} onClick={back}>Back to team</button></div>
      {panel === 'Next race' && <Race career={career} blocked={blocked} dispatch={action => !blocked && game.dispatch(action)} />}
      {panel === 'Car' && <><p className="text-sm text-muted-foreground">Power suits faster tracks. Aero suits tighter tracks. Reliability lowers the chance of a retirement. Each upgrade adds two, up to 100.</p>{(['power', 'aero', 'reliability'] as CarArea[]).map(area => {
        const cost = career.upgradeCosts[area];
        return <div key={area} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div><h3 className="font-bold">{label(area)}: {team!.car[area]}/100</h3><p data-testid={'gp-' + area + '-cost'} className="text-sm text-muted-foreground">{cost === null ? 'At the limit' : money(cost)}</p></div><button type="button" className={button} disabled={blocked || career.phase !== 'preRace' || cost === null || cost > career.cash - career.reserved} onClick={() => game.dispatch({ type: 'upgrade', area, expectedRevision: career.revision })}>Improve {area}</button></div>;
      })}<p className="text-sm">Available after commitments: {money(career.cash - career.reserved)}</p></>}
      {panel === 'Finances' && <><div className="grid grid-cols-2 gap-4"><Stat title="Cash">{money(career.cash)}</Stat><Stat title="Reserved for entries and wages">{money(career.reserved)}</Stat><Stat title="Available to spend">{money(career.cash - career.reserved)}</Stat><Stat title="Your drivers per race">{money(ownDrivers(career).reduce((sum, driver) => sum + driver.contract!.wagePerRace, 0))}</Stat></div><p className="text-sm text-muted-foreground">Remaining entry fees and signed driver wages are already reserved. Race prizes add to your balance only after the finish.</p></>}
      {panel === 'Standings' && <Championship career={career} />}
      {panel === 'Drivers' && <Drivers career={career} blocked={blocked} dispatch={action => !blocked && game.dispatch(action)} />}
      {panel === 'History' && <History career={career} />}
    </section>;
  };
  return <><PageSeo title="Grand Prix Boss: Free Racing Team Manager | DoUKnowBall" description="Run a fictional two-driver racing team. Build the car, protect your budget and choose race strategy through a saved championship." path="/grand-prix-boss" />
    <GameShell width="wide" help="none">
      <header className="mb-4 flex items-start justify-between gap-3"><div><h1 className="font-display text-3xl font-bold">Grand Prix Boss</h1><p className="mt-1 text-xs text-muted-foreground">Fictional teams, drivers and tracks.</p></div><Rules /></header>
      {game.message && <p role="status" className="mb-3 rounded-lg border border-border bg-card p-3 text-sm">{game.message}</p>}
      {career && blocked && <div className="mb-3 space-y-2 rounded-lg border border-amber-400/50 p-3"><p className="text-sm">Reload your saved team before making another decision.</p><button type="button" className={button} onClick={game.reload}>Reload saved team</button></div>}
      <div ref={reveal}>{content()}</div>
      <GameSeoContent pageHasOwnH1 title="Grand Prix Boss" description="A saved fictional racing championship with two-driver strategy, car development and team finances." />
    </GameShell>
  </>;
}
