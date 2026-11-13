import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RetireDoor from '@/components/club-manager/RetireDoor';
import NrlBoardChallengeNotice from '@/components/nrl-manager/NrlBoardChallengeNotice';
import { nrlSeasonPlan, NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import {
  isNrlOpeningMatchdayPlayer,
  nrlAcademyAvailableRoles, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerRecord, nrlCareerSquad,
  nrlContractCounteroffer, nrlContractOffer,
  nrlCoachQuote, nrlCoachSpend, nrlDevelopmentPreview, nrlFinanceForecast, nrlMedicalSpend, nrlMedicalUpgradeQuote, nrlOffseasonClubs, nrlOffseasonOpportunities,
  type NrlCareerAction, type NrlCareerState,
  nrlSponsorIncome, nrlSponsorRefusal, nrlTakeoverOffers, nrlTakeoverPlayers, nrlTicketPricingRefusal,
  NRL_SHORTLIST_LIMIT, NRL_SPONSOR_OFFERS, NRL_TICKET_GATE_CHANGES,
  type NrlDevelopmentFocus, type NrlMedicalLevel, type NrlSponsorOffer, type NrlTicketTier,
} from '@/lib/nrlCareer';
import { nrlArchivedFinals, NRL_COACHING_BONUS, NRL_FINALS_ROUND_TITLES, NRL_ROLES, type NrlCoachRole, type NrlRole } from '@/lib/nrlManager';
import {
  archiveNrlPlayerSeasons, archiveNrlScoring, nrlArchivedPlayerSeason, nrlArchivedScoringLeaders,
  nrlScorePoints, nrlTryLeaders, type NrlScoringLeader,
} from '@/lib/nrlPlayerScoring';
import { nrlBoardBenchmark, nrlBoardChallengeStatus, nrlBoardTarget } from '@/lib/nrlBoardTarget';

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
});
const money = (amount: number) => currency.format(amount);
const moneyRange = (low: number, high: number) => low === high ? money(low) : `${money(low)} to ${money(high)}`;
const labelForClub = (year: number, id: string) => nrlSeasonPlan(year).clubs.find(club => club.id === id)?.shortName ?? id;

type OfficeScreen = 'contracts' | 'recruitment' | 'academy' | 'finances' | 'history';
type MarketEntry = ReturnType<typeof nrlCareerMarket>[number];
type CareerPlayer = ReturnType<typeof nrlCareerSquad>[number];
type Dispatch = (action: NrlCareerAction) => boolean;

const control = 'min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const developmentLabels = { balanced: 'Balanced', youth: 'Youth development', veterans: 'Veteran conditioning' };
const medicalLabels = { 1: 'Standard care', 2: 'Treatment room', 3: 'Recovery centre' };
const coachLabels = { attack: 'Attack assistant', defense: 'Defence assistant' };
const ticketLabels = { value: 'Value', standard: 'Standard', premium: 'Premium' };
const ticketTiers = ['value', 'standard', 'premium'] as const;
const coachEffect = (role: NrlCoachRole) => role === 'attack' ? `+${NRL_COACHING_BONUS} attack rating with the Attack tactic.`
  : `+${NRL_COACHING_BONUS} defence rating with the Defence tactic.`;

function developmentSummary(focus: Exclude<NrlDevelopmentFocus, 'balanced'>, affected: number, preview: boolean) {
  if (!affected) return preview ? 'No returning players would get an extra point.' : 'No ratings changed from this focus.';
  const players = `${affected} ${affected === 1 ? 'player' : 'players'}`;
  return focus === 'youth'
    ? `${players} ${preview ? 'will gain' : 'gained'} 1 extra OVR.`
    : `${players} ${preview ? 'will keep' : 'kept'} 1 OVR they would have lost.`;
}

function OfferForm({ career, entry, onAction, onClose, disabled }: {
  career: NrlCareerState; entry: MarketEntry; onAction: Dispatch; onClose: () => void; disabled: boolean;
}) {
  const [salary, setSalary] = useState(String(entry.askingSalary));
  const [years, setYears] = useState(2);
  const [requested, setRequested] = useState(false);
  const annualSalary = Number(salary);
  const preview = nrlContractOffer(career, entry.player.id, annualSalary, years);
  const canRequest = !career.legacySeason && Number.isSafeInteger(annualSalary)
    && annualSalary >= nrlSeasonPlan(entry.startYear).minimumSalary && annualSalary < entry.askingSalary;
  const counter = requested ? nrlContractCounteroffer(career, entry.player.id, annualSalary) : null;
  return (
    <form className="mt-3 rounded-xl border border-border bg-background p-3" onSubmit={event => {
      event.preventDefault();
      if (preview.ok && !disabled) onAction({ type: 'offerContract', playerId: entry.player.id, salary: annualSalary, years });
    }}>
      <h3 className="font-bold">Offer {entry.player.name} a contract</h3>
      <p className="mt-1 text-sm text-muted-foreground">Asking {money(entry.askingSalary)} per season · Starts {entry.startYear}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <label className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Annual salary (AUD)</span>
          <input className={control} type="number" inputMode="numeric" min={0} step={1} required value={salary}
            onChange={event => { setSalary(event.target.value); setRequested(false); }} disabled={disabled} />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          <span>Term</span>
          <select className={control} value={years} disabled={disabled} onChange={event => { setYears(Number(event.target.value)); setRequested(false); }}>
            <option value={1}>1 season</option>
            <option value={2}>2 seasons</option>
            <option value={3}>3 seasons</option>
            <option value={4}>4 seasons</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-sm text-muted-foreground" role="status">
        {counter?.ok === true ? <>
          <span className="block font-semibold text-foreground">{money(counter.contract.salary)} per season from {counter.contract.startYear} through {counter.contract.endYear}.</span>
          <span>Lower annual salary in exchange for three seasons. These are simulated contract terms.</span>
        </> : counter?.ok === false ? counter.reason
          : canRequest ? 'Request a simulated three-season deal or raise your offer to the asking salary.'
          : preview.ok === true ? `${money(preview.contract.salary)} per season through ${preview.contract.endYear}.` : preview.reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="lg" variant="outline" className="px-4" onClick={onClose}>Cancel</Button>
        {canRequest && <Button type="button" size="lg" variant="outline" className="px-4" disabled={disabled}
          onClick={() => setRequested(!requested)}>{requested ? 'Decline counteroffer' : 'Request counteroffer'}</Button>}
        {counter?.ok === true && <Button type="button" size="lg" className="px-4" disabled={disabled} onClick={() => onAction({
          type: 'acceptCounteroffer', playerId: entry.player.id, year: career.season.year, offeredSalary: annualSalary, contract: counter.contract,
        })}>Accept counteroffer</Button>}
        <Button type="submit" size="lg" className="px-4" disabled={!preview.ok || disabled}>Agree contract</Button>
      </div>
    </form>
  );
}

function PlayerRow({ player, entry, career, onAction, disabled, onShortlist, expiryStatus }: {
  player: CareerPlayer; entry?: MarketEntry; career: NrlCareerState; onAction: Dispatch; disabled: boolean;
  onShortlist?: (saved: boolean) => void;
  expiryStatus?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { contract, futureContract } = player;
  const leaving = contract?.clubId === career.season.clubId && futureContract && futureContract.clubId !== contract.clubId;
  const action = entry?.kind === 'renewal' ? 'Extend' : 'Make offer';
  const shortlisted = career.shortlist?.includes(player.id) ?? false;
  const shortlistFull = (career.shortlist?.length ?? 0) >= NRL_SHORTLIST_LIMIT;
  const offer = entry && !editing && <Button type="button" size="lg" variant="outline" className="px-3" disabled={disabled}
    onClick={() => { setAgreed(false); setEditing(true); }} aria-label={`${action} for ${player.name}`}>{action}</Button>;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{player.name}{career.openingRoster && !isNrlOpeningMatchdayPlayer(player.id) && ' (generated)'}</p>
          {expiryStatus && <p className="text-sm font-semibold">{expiryStatus}</p>}
          <p className="text-sm text-muted-foreground">{player.role} · Age {player.age} · {player.rating} OVR · {player.potential} potential</p>
          {contract && (
            <p className="text-sm text-muted-foreground">
              {entry?.kind === 'rival' ? `${labelForClub(career.season.year, contract.clubId)} · ` : ''}
              {money(contract.salary)} per season through {contract.endYear}
            </p>
          )}
          {entry && entry.kind !== 'renewal' && <p className="text-sm text-muted-foreground">Asks {money(entry.askingSalary)} · Available {entry.startYear}</p>}
          {futureContract && <p className="text-sm text-primary">{leaving ? <>
            <span>Moving to {labelForClub(futureContract.startYear, futureContract.clubId)} in {futureContract.startYear}</span>
            <span className="block text-muted-foreground">{money(futureContract.salary)} per season through {futureContract.endYear}</span>
          </> : `Agreed through ${futureContract.endYear} at ${money(futureContract.salary)} per season`}</p>}
          {agreed && <p role="status" className="text-sm font-semibold text-primary">Contract agreed</p>}
        </div>
        {onShortlist ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="lg" variant="outline" className="w-11 px-0"
              aria-label={`Shortlist ${player.name}`} aria-pressed={shortlisted} disabled={disabled || (shortlistFull && !shortlisted)}
              onClick={() => onShortlist(!shortlisted)}>
              <Bookmark size={16} fill={shortlisted ? 'currentColor' : 'none'} aria-hidden="true" />
            </Button>
            {offer}
          </div>
        ) : offer}
      </div>
      {editing && entry && (
        <OfferForm career={career} entry={entry} onClose={() => setEditing(false)} disabled={disabled}
          onAction={action => {
            if (!onAction(action)) return false;
            setEditing(false);
            setAgreed(true);
            return true;
          }} />
      )}
    </li>
  );
}

function ContractTakeover({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const [playerId, setPlayerId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const summary = useRef<HTMLElement>(null);
  const { year, clubId } = career.season;
  if (career.legacySeason || career.retired || year === NRL_LAST_YEAR) return null;
  const candidates = nrlTakeoverPlayers(career);
  const player = candidates.find(candidate => candidate.id === playerId);
  const offers = player ? nrlTakeoverOffers(career, playerId) : [];
  const quote = offers.find(offer => offer.clubId === destinationId);
  const reset = () => {
    setPlayerId('');
    setDestinationId('');
    summary.current?.focus();
  };
  return (
    <details className="group mt-3 rounded-lg border border-border">
      <summary ref={summary} className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
        Arrange an offseason move<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border p-3 text-sm">
        <p className="text-muted-foreground">Simulated offers depend on each club’s position needs and salary cap.</p>
        {career.season.live ? <p className="text-muted-foreground">Finish the live match before arranging a move.</p>
          : candidates.length === 0 ? <p className="text-muted-foreground">No player has a remaining deal available to move.</p> : (
          <label className="block space-y-1 font-semibold">
            <span>Player to move</span>
            <select className={control} value={playerId} disabled={disabled} onChange={event => {
              setPlayerId(event.target.value);
              setDestinationId('');
            }}>
              <option value="">Choose a player</option>
              {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}
            </select>
          </label>
        )}
        {player && (offers.length ? (
          <label className="block space-y-1 font-semibold">
            <span>Receiving club</span>
            <select className={control} value={destinationId} disabled={disabled} onChange={event => setDestinationId(event.target.value)}>
              <option value="">Choose an interested club</option>
              {offers.map(offer => <option key={offer.clubId} value={offer.clubId}>{labelForClub(offer.startYear, offer.clubId)}</option>)}
            </select>
          </label>
        ) : <p className="text-muted-foreground">No club can take over this deal.</p>)}
        {player && quote && (
          <>
            <div className="space-y-1 text-muted-foreground" role="status">
              <p>{player.name} stays with {labelForClub(year, clubId)} for {year}.</p>
              <p>{labelForClub(quote.startYear, quote.clubId)} will pay {money(quote.salary)} per season from {quote.startYear} through {quote.endYear}.</p>
              <p>Adds {money(quote.salary - nrlCareerCap(career, quote.startYear).minimumSalary)} of {quote.startYear} cap space after reserving a roster place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="lg" variant="outline" className="px-4" onClick={reset}>Cancel move</Button>
              <Button type="button" size="lg" className="px-4" disabled={disabled} onClick={() => {
                if (onAction({ type: 'arrangeTakeover', year, clubId, playerId, destinationId })) reset();
              }}>Confirm offseason move</Button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function Contracts({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const squad = nrlCareerSquad(career);
  const offers = new Map(nrlCareerMarket(career).filter(entry => entry.kind === 'renewal').map(entry => [entry.player.id, entry]));
  const year = career.season.year;
  const expiring = squad.filter(player => player.contract?.endYear === year && !player.futureContract).length;
  return (
    <>
      <h2 className="font-display text-xl font-bold">Squad contracts</h2>
      <p className="mt-1 text-sm text-muted-foreground">{squad.length} players · {expiring} deals expire this season</p>
      <ContractTakeover career={career} onAction={onAction} disabled={disabled} />
      <ul className="mt-3 divide-y divide-border">
        {squad.map(player => <PlayerRow key={player.id} player={player} entry={offers.get(player.id)} career={career} onAction={onAction} disabled={disabled} />)}
      </ul>
    </>
  );
}

function ExpiringDeals({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { year, clubId } = career.season;
  const expiring = nrlCareerSquad(career).filter(player => player.contract?.endYear === year);
  if (expiring.length === 0) return null;
  const unsigned = expiring.filter(player => !player.futureContract).length;
  const offers = new Map(nrlCareerMarket(career).filter(entry => entry.kind === 'renewal' && entry.startYear === year + 1)
    .map(entry => [entry.player.id, entry]));
  return (
    <details className="group mt-3 rounded-xl border border-border bg-background px-3">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>Deals ending this season <span className="font-normal text-muted-foreground">· {unsigned} unsigned</span></span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <p className="text-sm text-muted-foreground">Unsigned deals end when the next season starts. The game fills any open squad places.</p>
      <ul className="mt-1 divide-y divide-border">
        {expiring.map(player => (
          <PlayerRow key={player.id} player={player} entry={offers.get(player.id)} career={career} onAction={onAction} disabled={disabled}
            expiryStatus={player.futureContract ? player.futureContract.clubId === clubId ? 'Renewed' : 'Agreed elsewhere' : 'Unsigned'} />
        ))}
      </ul>
    </details>
  );
}

function Recruitment({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const [role, setRole] = useState('');
  const [shortlistedOnly, setShortlistedOnly] = useState(false);
  const [visible, setVisible] = useState(12);
  const shortlistFilter = useRef<HTMLButtonElement>(null);
  const selectRole = (position: string) => { setRole(position); setVisible(12); };
  const nextYear = career.season.year + 1;
  const signed = nextYear <= NRL_LAST_YEAR ? nrlCareerSquad(career, nextYear) : [];
  const depth = NRL_ROLES.map(position => ({
    position, count: signed.filter(player => player.role === position).length,
  })).sort((a, b) => a.count - b.count);
  const market = useMemo(() => nrlCareerMarket(career).filter(entry => entry.kind !== 'renewal'), [career]);
  const shortlist = career.shortlist ?? [];
  const filtered = market.filter(({ player }) => (!role || player.role === role) && (!shortlistedOnly || shortlist.includes(player.id)));
  const act: Dispatch = action => {
    if (!onAction(action)) return false;
    if (shortlistedOnly && (action.type === 'offerContract' || action.type === 'acceptCounteroffer'
      || (action.type === 'setShortlist' && !action.saved))) {
      shortlistFilter.current?.focus();
    }
    return true;
  };
  const arrivals = career.players.filter(player => player.futureContract?.clubId === career.season.clubId
    && player.contract?.clubId !== career.season.clubId);
  return (
    <>
      <h2 className="font-display text-xl font-bold">Recruitment</h2>
      <p className="mt-1 text-sm text-muted-foreground">Agree future deals with eligible players. Check next season’s cap before filling the squad.</p>
      {arrivals.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
          <h3 className="font-bold">Agreed arrivals</h3>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {arrivals.map(player => <li key={player.id}>{player.name} · {player.role} · joins {player.futureContract?.startYear}</li>)}
          </ul>
        </div>
      )}
      {nextYear <= NRL_LAST_YEAR && (
        <details className="group mt-3 rounded-lg border border-border bg-background px-3">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Next season’s position depth<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="pb-3 text-sm">
            <p className="text-muted-foreground">{signed.length} players signed for {nextYear}. The game fills open places at rollover.</p>
            <p className="mt-1 text-muted-foreground">Choose a position to filter the market.</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {depth.map(({ position, count }) => (
                <li key={position} className="min-w-0">
                  <Button type="button" size="lg" variant={role === position ? 'default' : 'outline'} aria-pressed={role === position}
                    className="h-auto min-h-11 w-full flex-col items-start gap-0 whitespace-normal px-2 py-1 text-left text-xs"
                    onClick={() => selectRole(position)}>
                    <span>{position}</span><span>{count} signed</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <label className="mt-3 block max-w-xs space-y-1 text-sm font-semibold">
        <span>Position</span>
        <select className={control} value={role} onChange={event => selectRole(event.target.value)}>
          <option value="">All positions</option>
          {NRL_ROLES.map(position => <option key={position}>{position}</option>)}
        </select>
      </label>
      {(market.length > 0 || shortlistedOnly) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button ref={shortlistFilter} type="button" size="lg" variant="outline" className="px-3" aria-pressed={shortlistedOnly}
            onClick={() => { setShortlistedOnly(value => !value); setVisible(12); }}>Shortlisted only</Button>
          <p className="text-sm text-muted-foreground">{shortlist.length}/{NRL_SHORTLIST_LIMIT} saved</p>
        </div>
      )}
      {filtered.length ? (
        <ul className="mt-3 divide-y divide-border">
          {filtered.slice(0, visible).map(entry => <PlayerRow key={entry.player.id} player={entry.player} entry={entry} career={career}
            onAction={act} disabled={disabled} onShortlist={saved => act({ type: 'setShortlist', playerId: entry.player.id, saved, year: career.season.year })} />)}
        </ul>
      ) : <p className="mt-3 text-sm text-muted-foreground">{shortlistedOnly
        ? (role ? 'No shortlisted players at this position.' : 'Your shortlist is empty.')
        : 'No eligible players at this position right now.'}</p>}
      {filtered.length > visible && <Button type="button" variant="outline" size="lg" className="mt-3" onClick={() => setVisible(count => count + 12)}>Show more players</Button>}
    </>
  );
}

function Academy({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const [position, setPosition] = useState<NrlRole>('Fullback');
  const reports = nrlAcademyReports(career);
  const available = nrlAcademyAvailableRoles(career);
  const scouting = reports.find(report => report.status === 'scouting');
  const role = available.includes(position) ? position : available[0];
  const year = career.season.year + 1;
  return (
    <>
      <h2 className="font-display text-xl font-bold">Academy</h2>
      <p className="mt-1 text-sm text-muted-foreground">Scout a position and choose who earns a place in next season’s Top 30.</p>
      {scouting ? (
        <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm" role="status" data-nrl-scouting>
          Scouting {scouting.role}. Advance a round for the report. Byes count.
        </p>
      ) : role ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1 text-sm font-semibold sm:max-w-xs">
            <span>Position to scout</span>
            <select className={control} value={role} disabled={disabled} onChange={event => setPosition(event.target.value as NrlRole)}>
              {available.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <Button type="button" size="lg" disabled={disabled} onClick={() => onAction({ type: 'scoutAcademy', role })}>Assign scout</Button>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">Scouting is closed for this season.</p>}
      {reports.some(report => report.player) && (
        <ul className="mt-4 divide-y divide-border" aria-label="Academy reports">
          {reports.flatMap(report => {
            const { player } = report;
            if (!player) return [];
            const offer = report.status === 'signed' ? null : nrlAcademyOffer(career, player.id);
            return [(
              <li key={player.id} className="py-3" data-nrl-academy-report={player.id}>
                <h3 className="break-words font-semibold">{player.name}</h3>
                <p className="text-sm text-muted-foreground">{player.role} · age {player.age} · {player.rating} OVR · {player.potential} potential</p>
                {offer === null ? <p className="mt-1 text-sm font-semibold">Signed for {year}</p>
                  : offer.ok === false ? <p className="mt-1 text-sm text-muted-foreground">{offer.reason}</p>
                  : (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="lg" disabled={disabled} aria-label={`Promote ${player.name}`}
                        onClick={() => onAction({ type: 'promoteAcademy', playerId: player.id })}>Promote for {year}</Button>
                      <span className="text-sm text-muted-foreground">1 year · {money(offer.contract.salary)}</span>
                    </div>
                  )}
              </li>
            )];
          })}
        </ul>
      )}
    </>
  );
}

function MoneyRows({ entries }: { entries: readonly (readonly [string, number | string])[] }) {
  return (
    <dl className="mt-2 divide-y divide-border text-sm">
      {entries.map(([name, amount]) => (
        <div key={name} className="flex flex-wrap justify-between gap-x-3 py-2">
          <dt className="text-muted-foreground">{name}</dt><dd className="font-semibold tabular-nums">{typeof amount === 'number' ? money(amount) : amount}</dd>
        </div>
      ))}
    </dl>
  );
}

function MedicalFacilities({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { level, nextLevel, cost, reason } = nrlMedicalUpgradeQuote(career);
  const effect = (step: NrlMedicalLevel) => step === 1 ? 'New knocks use the standard recovery time.'
    : `New knocks are ${step - 1} ${step === 2 ? 'round' : 'rounds'} shorter, with at least one round out.`;
  return (
    <section className="mt-5 rounded-xl border border-border bg-background p-3" aria-labelledby="nrl-medical-facilities">
      <h3 id="nrl-medical-facilities" className="font-bold">Medical facilities</h3>
      <p className="mt-2 text-sm font-semibold" data-nrl-medical-level>Level {level} of 3 · {medicalLabels[level]}</p>
      <p className="mt-1 text-sm text-muted-foreground">{effect(level)}</p>
      {nextLevel !== null && cost !== null && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm font-semibold">{medicalLabels[nextLevel]}</p>
          <p className="mt-1 text-sm text-muted-foreground">{effect(nextLevel)}</p>
          <Button type="button" size="lg" className="mt-2 w-full px-3 sm:w-auto" disabled={disabled || reason !== null}
            onClick={() => onAction({ type: 'upgradeMedical', level: nextLevel })}>
            Upgrade for {money(cost)}
          </Button>
          <p className="mt-1 text-sm text-muted-foreground">One-time charge from club cash.</p>
        </div>
      )}
      {reason && <p className="mt-2 text-sm text-muted-foreground" data-nrl-medical-reason>{reason}</p>}
    </section>
  );
}

function CoachingStaff({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { year, round } = career.season;
  const { candidates, current, fee, wagePerRound, remainingWages, reason } = nrlCoachQuote(career);
  return (
    <details className="group mt-5 rounded-xl border border-border bg-background px-3">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Coaching staff <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="pb-3 text-sm">
        {current ? (
          <>
            <p className="font-semibold" data-nrl-coach-current>{current.name} · {coachLabels[current.role]}</p>
            <p className="mt-1 text-muted-foreground">{coachEffect(current.role)}</p>
            <p className="mt-2 text-muted-foreground">Signed through this season. Remaining wages {money(remainingWages)}.</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Sign one fictional assistant through the end of this season.</p>
            <p className="mt-1 text-muted-foreground">{money(fee)} signing fee · {money(wagePerRound)} per settled round, including byes and finals.</p>
            {remainingWages > 0 && <p className="mt-1 font-semibold" data-nrl-coach-commitment>{money(fee + remainingWages)} total commitment</p>}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {candidates.map(candidate => (
                <li key={candidate.role} className="min-w-0 rounded-lg border border-border p-2">
                  <p className="break-words font-semibold">{candidate.name}</p>
                  <p className="text-muted-foreground">{coachLabels[candidate.role]}</p>
                  <p className="mt-1 text-muted-foreground">{coachEffect(candidate.role)}</p>
                  <Button type="button" size="lg" variant="outline" className="mt-2 w-full px-3" disabled={disabled || reason !== null}
                    onClick={() => onAction({ type: 'hireCoach', role: candidate.role, year, round })}>
                    Hire {coachLabels[candidate.role].toLowerCase()}
                  </Button>
                </li>
              ))}
            </ul>
            {reason && <p className="mt-2 text-muted-foreground">{reason}</p>}
          </>
        )}
      </div>
    </details>
  );
}

function TicketPricing({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { year, round } = career.season;
  const tier = career.finance.ticketTier ?? 'standard';
  const reason = nrlTicketPricingRefusal(career);
  const gateTypes = [
    ['Regular home loss or draw', 'regularNonWin'], ['Regular home win', 'regularWin'], ['Home final', 'homeFinal'],
  ] as const;
  return (
    <section className="mt-4 rounded-xl border border-border bg-background p-3">
      <label htmlFor="nrl-ticket-pricing" className="block text-sm font-bold">Home ticket pricing</label>
      <p className="mt-1 text-sm text-muted-foreground" id="nrl-ticket-pricing-status">
        {reason ?? 'Set before your first home game. Your choice then stays in place until next season.'}
      </p>
      <select id="nrl-ticket-pricing" aria-describedby="nrl-ticket-pricing-status" className={control + ' mt-2 sm:max-w-xs'}
        value={tier} disabled={disabled || reason !== null}
        onChange={event => onAction({ type: 'setTicketTier', tier: event.target.value as NrlTicketTier, year, round })}>
        {ticketTiers.map(choice => <option key={choice} value={choice}>{ticketLabels[choice]}</option>)}
      </select>
      <table className="mt-3 w-full text-left text-xs">
        <caption className="text-left text-muted-foreground">Changes to simulated gate receipts</caption>
        <thead>
          <tr>
            <th scope="col" className="py-1.5">Home match</th>
            {ticketTiers.map(choice => <th key={choice} scope="col" className="py-1.5 text-right">{ticketLabels[choice]}</th>)}
          </tr>
        </thead>
        <tbody>
          {gateTypes.map(([label, gate]) => <tr key={gate} className="border-t border-border">
            <th scope="row" className="py-1.5 pr-1 font-normal">{label}</th>
            {ticketTiers.map(choice => {
              const change = NRL_TICKET_GATE_CHANGES[choice][gate];
              return <td key={choice} className="whitespace-nowrap py-1.5 text-right">{(change > 0 ? '+' : '') + money(change)}</td>;
            })}
          </tr>)}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted-foreground">Away games, byes and the neutral Grand Final earn no home gate.</p>
    </section>
  );
}

const sponsorLabels: Record<NrlSponsorOffer, string> = { fixed: 'Fixed offer', finals: 'Finals offer' };

function SeasonSponsor({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { season, finance } = career;
  const sponsor = finance.sponsor;
  const reason = nrlSponsorRefusal(career);
  const summary = useRef<HTMLElement>(null);
  return (
    <details className="group mt-4 rounded-lg border border-border bg-background px-3">
      <summary ref={summary} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Season sponsor<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-2 pb-3 text-sm">
        <p className="text-muted-foreground">Simulated one-season offers in AUD. Choose before Round 1 starts.</p>
        {sponsor ? (
          <div role="status">
            <p className="font-semibold">{sponsorLabels[sponsor.offer]} · {season.year}</p>
            <p>{money(nrlSponsorIncome(finance))} received</p>
            {sponsor.offer === 'finals' && (
              <p className="text-muted-foreground">
                {sponsor.bonusPaid ? 'Top-eight bonus paid.'
                  : season.phase === 'regular' ? money(NRL_SPONSOR_OFFERS.finals.bonus) + ' more for finishing in the top eight.'
                    : 'Top-eight bonus missed.'}
              </p>
            )}
          </div>
        ) : reason ? <p className="text-muted-foreground">{reason}</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(['fixed', 'finals'] as const).map(offer => {
              const { upfront, bonus } = NRL_SPONSOR_OFFERS[offer];
              return (
                <div key={offer} className="flex flex-col items-start gap-2 rounded-md border border-border p-2">
                  <p>{money(upfront)} now{bonus > 0 && <> · {money(bonus)} for finishing in the top eight</>}</p>
                  <Button type="button" variant="outline" size="lg" className="mt-auto px-3" disabled={disabled}
                    onClick={() => {
                      if (onAction({ type: 'signSponsor', offer, year: season.year, clubId: season.clubId })) summary.current?.focus();
                    }}>
                    Sign {sponsorLabels[offer].toLowerCase()}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}

function CashForecast({ career, hasAccounts }: { career: NrlCareerState; hasAccounts: boolean }) {
  const forecast = nrlFinanceForecast(career);
  return (
    <details className="group mt-4 rounded-xl border border-border bg-background px-3">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Season cash forecast<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="pb-3 text-sm">
        {forecast ? (
          <>
            <p className="text-muted-foreground">
              Uses simulated amounts at your current ticket tier. Later finals, new hires and facility purchases can change the final balance.
            </p>
            {career.season.phase === 'regular' && career.finance.sponsor?.offer === 'finals' && (
              <p className="mt-1 text-muted-foreground">This estimate excludes the possible {money(NRL_SPONSOR_OFFERS.finals.bonus)} sponsor bonus.</p>
            )}
            {career.finance.fromRound > 1 && (
              <p className="mt-1 text-muted-foreground">Accounts began in round {career.finance.fromRound}. The estimate uses the cash recorded since then.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Accounting rounds left {forecast.roundsLeft} · Scheduled home gates {forecast.homeMatches} · Scheduled trips {forecast.trips}
            </p>
            <MoneyRows entries={[
              ['Cash now', forecast.cashNow], ['Central funding left', forecast.funding], ['Player wages left', forecast.playerWages],
              ['Assistant wages left', forecast.assistantWages], ['Operations and travel left', forecast.operatingCosts],
              ['Estimated gate income', moneyRange(forecast.gateLow, forecast.gateHigh)],
              ['Estimated closing cash', moneyRange(forecast.closingLow, forecast.closingHigh)],
            ]} />
          </>
        ) : (
          <p className="text-muted-foreground">{hasAccounts ? 'This season’s accounts are final.' : 'Forecast starts next season for this imported save.'}</p>
        )}
      </div>
    </details>
  );
}

function Finances({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const [nextYear, setNextYear] = useState(false);
  const year = career.season.year;
  const capYear = nextYear && year < NRL_LAST_YEAR ? year + 1 : year;
  const cap = nrlCareerCap(career, capYear);
  const cash = nrlCareerFinance(career);
  const medicalSpend = nrlMedicalSpend(cash);
  const coachSpend = nrlCoachSpend(cash);
  const hasAccounts = cash.fromRound <= nrlSeasonPlan(year).draw.length + 4;
  return (
    <>
      <h2 className="font-display text-xl font-bold">Club finances</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-bold">Salary cap</h3>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Cap year">
            <Button type="button" size="lg" variant={nextYear ? 'outline' : 'default'} className="px-3" aria-pressed={!nextYear} onClick={() => setNextYear(false)}>{year}</Button>
            {year < NRL_LAST_YEAR && <Button type="button" size="lg" variant={nextYear ? 'default' : 'outline'} className="px-3" aria-pressed={nextYear} onClick={() => setNextYear(true)}>{year + 1}</Button>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{cap.slots} signed · {cap.openSlots} open slots</p>
          {nrlSeasonPlan(capYear).projected && <p className="mt-1 text-xs text-muted-foreground">Projected season rules</p>}
          <MoneyRows entries={[['Cap limit', cap.cap], ['Contracted wages', cap.committed], ['Reserved for open slots', cap.holds], ['Available to spend', cap.available]]} />
        </div>
        <div>
          <h3 className="font-bold">{year} club accounts</h3>
          {hasAccounts ? (
            <>
              {cash.fromRound > 1 && <p className="mt-2 text-sm text-muted-foreground">This save began tracking finances in round {cash.fromRound}.</p>}
              <MoneyRows entries={[
                ['Opening cash', cash.openingCash], ['Central funding', cash.centralFunding],
                ['Gate receipts', cash.gateReceipts],
                ...(cash.sponsor ? [['Sponsor income', nrlSponsorIncome(cash)] as const] : []),
                ['Wages paid', cash.wagesPaid],
                ['Operating costs', cash.operatingCosts],
                ...(medicalSpend ? [['Medical upgrades', medicalSpend] as [string, number]] : []),
                ...(cash.coachHire ? [['Coach signing fee', coachSpend.signingFee], ['Coach wages paid', coachSpend.wages]] as [string, number][] : []),
                ['Profit or loss', cash.profit], ['Cash balance', cash.cash],
              ]} />
            </>
          ) : <p className="mt-2 text-sm text-muted-foreground">This completed save predates club accounts. Tracking starts next season.</p>}
        </div>
      </div>
      <CashForecast career={career} hasAccounts={hasAccounts} />
      <SeasonSponsor career={career} onAction={onAction} disabled={disabled} />
      <TicketPricing career={career} onAction={onAction} disabled={disabled} />
      <MedicalFacilities career={career} onAction={onAction} disabled={disabled} />
      <CoachingStaff career={career} onAction={onAction} disabled={disabled} />
    </>
  );
}

function DevelopmentFocus({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const focus = career.developmentFocus ?? 'balanced';
  const effect = focus === 'balanced' ? 'Players develop at their usual age-based rate.'
    : focus === 'youth' ? 'Players aged 24 or younger next year can gain 1 extra OVR up to their potential.'
      : 'Players aged 30 or older next year can keep 1 OVR they would otherwise lose.';
  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-3">
      <label htmlFor="nrl-development-focus" className="block text-sm font-bold">Development focus</label>
      <select id="nrl-development-focus" className={`${control} mt-2 sm:max-w-xs`} value={focus} disabled={disabled}
        onChange={event => onAction({ type: 'setDevelopmentFocus', focus: event.target.value as NrlDevelopmentFocus })}>
        <option value="balanced">{developmentLabels.balanced}</option>
        <option value="youth">{developmentLabels.youth}</option>
        <option value="veterans">{developmentLabels.veterans}</option>
      </select>
      <p className="mt-2 text-sm text-muted-foreground">Applies when next season starts, for current players signed to return.</p>
      <p className="mt-1 text-sm text-muted-foreground">{effect}</p>
      {focus !== 'balanced' && (
        <p className="mt-1 text-sm font-medium" role="status" data-nrl-development-preview>
          {developmentSummary(focus, nrlDevelopmentPreview(career), true)}
        </p>
      )}
    </div>
  );
}

function CareerRecord({ history }: { history: NrlCareerState['history'] }) {
  const record = nrlCareerRecord(history);
  if (!record) return null;
  const { bestFinish } = record;
  const stats = [
    ['Completed seasons', record.seasons],
    ['Regular-season record', `${record.wins}W ${record.draws}D ${record.losses}L`],
    ['Regular-season win rate', `${record.winRate}%`],
    ['Finals trips', record.finalsTrips],
    ['Minor premierships', record.minorPremierships],
    ['Premierships', record.premierships],
  ];
  return (
    <details className="group mt-4 rounded-xl border border-border bg-background px-3" data-nrl-career-record>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Career record<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="pb-3 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Best ladder finish</dt>
            <dd className="font-semibold">#{bestFinish.rank} · {labelForClub(bestFinish.year, bestFinish.clubId)} {bestFinish.year}</dd>
          </div>
        </dl>
        {record.clubs.length > 1 && (
          <ul className="mt-3 divide-y divide-border border-t border-border" aria-label="Record by club">
            {record.clubs.map(club => (
              <li key={club.clubId} className="pt-2 pb-1">
                <p className="font-semibold">{labelForClub(club.firstYear, club.clubId)}</p>
                <p className="text-xs text-muted-foreground">
                  {club.seasons} {club.seasons === 1 ? 'season' : 'seasons'} · {club.wins}W {club.draws}D {club.losses}L · {club.premierships} {club.premierships === 1 ? 'premiership' : 'premierships'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

const scoringColumns = [
  ['tries', 'T', 'Tries'],
  ['conversions', 'C', 'Conversions'],
  ['penalties', 'PG', 'Penalty goals'],
  ['fieldGoals', 'FG', 'One-point field goals'],
  ['longFieldGoals', '2FG', 'Two-point field goals'],
  ['points', 'Pts', 'Points'],
] as const;

function ScoringHistory({ year, leaders }: { year: number; leaders: NrlScoringLeader[] }) {
  if (!leaders.length) return <p className="text-sm text-muted-foreground">Player scoring is unavailable for this saved season.</p>;
  return (
    <details className="group mt-2 rounded-lg border border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {year} player scoring<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="border-t border-border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Totals from recorded matches for this club.</p>
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{year} recorded club scoring</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1">Player</th>
              {scoringColumns.map(([field, short, label]) => (
                <th key={field} scope="col" aria-label={label} className="px-1 text-right">{short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaders.map(player => (
              <tr key={player.playerId} className="border-t border-border tabular-nums">
                <th scope="row" className="break-words py-1.5 pr-1 font-medium">{player.name}</th>
                {scoringColumns.map(([field]) => <td key={field} className="px-1 text-right">{player[field]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">T tries · C conversions · PG penalty goals · FG one-point field goals · 2FG two-point field goals.</p>
      </div>
    </details>
  );
}

function PlayerHistory({ career }: { career: NrlCareerState }) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const years = useMemo(() => {
    if (!open) return [];
    const { season, history } = career;
    return [
      ...history.filter(row => row.year !== season.year),
      {
        year: season.year, clubId: season.clubId, playerSeasons: archiveNrlPlayerSeasons(season),
        scoring: season.kickerId ? archiveNrlScoring(season) : undefined,
      },
    ];
  }, [career, open]);
  const choices = useMemo(() => {
    const players = new Map<string, { name: string; year: number; clubId: string }>();
    for (const { scoring, playerSeasons, year, clubId } of years) {
      for (const [id, name] of scoring ?? []) players.set(id, { name, year, clubId });
      for (const [id, name] of playerSeasons ?? []) players.set(id, { name, year, clubId });
    }
    const names = new Map<string, number>();
    for (const { name } of players.values()) names.set(name, (names.get(name) ?? 0) + 1);
    const labels = new Map<string, number>();
    const rows = [...players].map(([id, { name, year, clubId }]) => {
      const qualifier = names.get(name) === 1 ? '' : labelForClub(year, clubId) + ', ' + year;
      const label = qualifier ? name + ' (' + qualifier + ')' : name;
      labels.set(label, (labels.get(label) ?? 0) + 1);
      return { id, name, qualifier, label };
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(({ id, name, qualifier, label }) => ({
      id, label: qualifier && (labels.get(label) ?? 0) > 1 ? name + ' (' + qualifier + ', ' + id + ')' : label,
    }));
  }, [years]);
  const selected = choices.some(choice => choice.id === playerId) ? playerId : choices[0]?.id;
  let previous: { year: number; rating: number } | undefined;
  const rows = years.flatMap(year => {
    const row = year.playerSeasons?.find(entry => entry[0] === selected);
    const total = year.scoring?.find(entry => entry[0] === selected);
    if (!row && !total) return [];
    const stats = row ? nrlArchivedPlayerSeason(row, total) : undefined;
    const change = stats && previous?.year === year.year - 1 ? stats.rating - previous.rating : undefined;
    if (stats) previous = { year: year.year, rating: stats.rating };
    return [{ year: year.year, clubId: year.clubId, stats, total, change }];
  }).reverse();
  return (
    <details className="group mt-3 rounded-lg border border-border" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Player history<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      {open && <div className="space-y-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">Records cover matches at clubs you managed. A season appears here when a player has a saved appearance or scoring record.</p>
        {years.some(year => !year.playerSeasons && year.year < career.season.year) && (
          <p className="text-xs text-muted-foreground">Some older seasons have only scoring totals or no player records.</p>
        )}
        {!career.season.kickerId && <p className="text-xs text-muted-foreground">Player match records are unavailable for this saved season. Tracking starts next season.</p>}
        {choices.length > 0 ? (
          <div>
            <label htmlFor="nrl-history-player" className="block text-sm font-semibold">Player</label>
            <select id="nrl-history-player" className={control + ' mt-1 sm:max-w-xs'} value={selected} onChange={event => setPlayerId(event.target.value)}>
              {choices.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
        ) : <p className="text-sm text-muted-foreground">No player records have been saved yet.</p>}
        {rows.map(({ year, clubId, stats, total, change }) => {
          const label = year + ' ' + labelForClub(year, clubId);
          return (
            <div key={year} className="space-y-1 border-t border-border pt-2">
              <h4 className="text-sm font-bold">{label}</h4>
              {stats ? <>
                <p className="text-xs text-muted-foreground">
                  {year === career.season.year && career.season.phase !== 'complete' ? 'Current rating' : 'Rating'} {stats.rating} OVR
                  {change !== undefined && ' (' + (change > 0 ? '+' : '') + change + ' from prior recorded season)'}
                </p>
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">{label} player history</caption>
                  <thead><tr>
                    <th scope="col">Match scope</th>
                    <th scope="col" aria-label="Appearances" className="px-1 text-right">Apps</th>
                    <th scope="col" className="px-1 text-right">Starts</th>
                    <th scope="col" aria-label="Bench appearances" className="px-1 text-right">Bench</th>
                    <th scope="col" className="px-1 text-right">Tries</th>
                    <th scope="col" aria-label="Points" className="text-right">Pts</th>
                  </tr></thead>
                  <tbody>{([['Regular season', stats.regular], ['Finals', stats.finals]] as const).map(([scope, line]) => (
                    <tr key={scope} className="border-t border-border tabular-nums">
                      <th scope="row" className="py-1 pr-1 font-medium">{scope}</th>
                      <td className="px-1 text-right">{line.apps}</td>
                      <td className="px-1 text-right">{line.starts}</td>
                      <td className="px-1 text-right">{line.bench}</td>
                      <td className="px-1 text-right">{line.tries}</td>
                      <td className="text-right">{line.points}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </> : total && (
                <p className="text-xs text-muted-foreground">
                  {total[2]} tries · {nrlScorePoints({ tries: total[2], conversions: total[3], penalties: total[4], fieldGoals: total[5], longFieldGoals: total[6] })} points.
                  Appearances, match split and rating are unavailable.
                </p>
              )}
            </div>
          );
        })}
      </div>}
    </details>
  );
}

function FinalsHistory({ record, season }: { record: NrlCareerState['history'][number]; season: NrlCareerState['season'] }) {
  const { year, finals } = record;
  const matches = year === season.year ? season.results.filter(match => match.finalsRound !== undefined)
    : nrlArchivedFinals(finals, year)?.matches;
  if (!matches?.length) return <p className="text-sm text-muted-foreground">Finals scores aren’t saved for this season.</p>;
  return (
    <details className="group mt-2 rounded-lg border border-border">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
        {year} finals results<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-border p-3 text-sm sm:grid-cols-2">
        {NRL_FINALS_ROUND_TITLES.map((title, index) => (
          <div key={title}>
            <h4 className="font-semibold">{title}</h4>
            <ul aria-label={title} className="mt-1 space-y-1 text-muted-foreground">
              {matches.filter(match => match.finalsRound === index + 1).map(match => (
                <li key={match.tieId} className="break-words">
                  {`${labelForClub(year, match.homeId)} ${match.homeScore} - ${match.awayScore} ${labelForClub(year, match.awayId)}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function History({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { year, phase, clubId } = career.season;
  const finished = phase === 'complete';
  const retired = career.retired === true;
  const target = nrlBoardTarget(career);
  const challengeStatus = nrlBoardChallengeStatus(career);
  const mustMove = challengeStatus === 'must-move';
  const pastPlaces = new Map(career.history.map(record => [`${record.clubId}:${record.year}`, record.rank]));
  const [nextClubId, setNextClubId] = useState('');
  const clubSelect = useRef<HTMLSelectElement>(null);
  const clubs = nrlOffseasonClubs(career);
  const nextClub = clubs.find(club => club.id === nextClubId);
  const openings = nrlOffseasonOpportunities(career);
  return (
    <>
      <h2 className="font-display text-xl font-bold">Season review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {retired ? `Retired after the ${year} season.`
          : finished ? 'Review the year and settle your squad before the new season.' : 'Completed seasons stay here as your career moves on.'}
      </p>
      {target && (
        <section className="mt-4 rounded-xl border border-border bg-background p-3" aria-labelledby="nrl-board-target">
          <h3 id="nrl-board-target" className="text-sm font-bold">Board target</h3>
          <p className="mt-1 text-sm font-semibold">{target.label}</p>
          <p className="mt-1 text-sm text-muted-foreground" data-nrl-board-status>
            {target.place === null ? 'Your ladder place appears after your first match.'
              : target.result === null ? `Current ladder place ${target.place}`
                : `Target ${target.result} · Final ladder place ${target.place}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on the club’s modeled rating{pastPlaces.has(`${clubId}:${year - 1}`) ? ' and last season’s finish.' : '.'}
          </p>
        </section>
      )}
      {!retired && challengeStatus && <div className="mt-3"><NrlBoardChallengeNotice season={career.season} status={challengeStatus} /></div>}
      {!retired && !career.legacySeason && year < NRL_LAST_YEAR && <DevelopmentFocus career={career} onAction={onAction} disabled={disabled} />}
      {finished && !retired && year < NRL_LAST_YEAR && <ExpiringDeals career={career} onAction={onAction} disabled={disabled} />}
      {finished && !retired && year < NRL_LAST_YEAR && !mustMove && (
        <Button type="button" size="lg" className="mt-3 w-full" disabled={disabled} onClick={() => onAction({ type: 'startNextSeason' })}>
          Start {year + 1}<ArrowRight aria-hidden="true" />
        </Button>
      )}
      {clubs.length > 0 && (
        <details className="group mt-3 rounded-xl border border-border bg-background px-3" open={mustMove || undefined}>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {mustMove ? 'Choose a new club for' : 'Change clubs for'} {year + 1}<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="space-y-2 pb-3 text-sm">
            <p className="text-muted-foreground">Take over the new club’s squad and contracts. If you return to a club, you resume its last balance and medical facilities.</p>
            {openings.length > 0 && <section className="rounded-lg border border-border p-2" aria-labelledby="nrl-openings-title">
              <h3 id="nrl-openings-title" className="font-bold">Suggested openings</h3>
              <p className="text-muted-foreground">Simulated suggestions based on expansion and this career’s results. You can choose any club in the list.</p>
              <ul className="divide-y divide-border">
                {openings.map(opening => {
                  const club = clubs.find(candidate => candidate.id === opening.clubId)!;
                  return <li key={club.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-semibold">{club.name}</p>
                      <p className="text-muted-foreground">{opening.reason === 'expansion' ? `Enters the league in ${year + 1}`
                        : `Ladder place ${opening.rank}. Missed its modeled target by ${opening.missedBy} ${opening.missedBy === 1 ? 'place' : 'places'}.`}</p>
                      <p className="text-muted-foreground">{year + 1} board target · {opening.nextTarget}</p>
                    </div>
                    <Button type="button" size="lg" variant="outline" className="px-3" disabled={disabled} aria-label={`Consider ${club.name}`} onClick={() => {
                      setNextClubId(club.id);
                      clubSelect.current?.focus();
                    }}>Consider</Button>
                  </li>;
                })}
              </ul>
            </section>}
            <label className="block font-semibold" htmlFor="nrl-next-club">Club to manage</label>
            <select ref={clubSelect} id="nrl-next-club" className={control} value={nextClubId} disabled={disabled} onChange={event => setNextClubId(event.target.value)}>
              <option value="">Choose a club</option>
              {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
            {nextClub && <Button type="button" size="lg" variant="outline" className="w-full px-2" disabled={disabled}
              onClick={() => onAction({ type: 'startNextSeason', move: { fromYear: year, clubId: nextClub.id } })}>
              Start {year + 1} with {nextClub.shortName}
            </Button>}
          </div>
        </details>
      )}
      {finished && !retired && !disabled && (
        <RetireDoor className="mt-3" door="Retire from management" title={`Retire after the ${year} season?`}
          lines={['Your career record stays in this save slot.']} keep="Keep managing" confirm="Yes, retire"
          onRetire={() => onAction({ type: 'retireCareer', year, clubId })} />
      )}
      <CareerRecord history={career.history} />
      <PlayerHistory career={career} />
      {career.history.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {[...career.history].reverse().map(record => {
            const leaders = nrlArchivedScoringLeaders(record.scoring);
            const tries = nrlTryLeaders(leaders)[0];
            const points = leaders[0];
            const coach = record.finance?.coachHire;
            const staffSpend = record.finance ? nrlCoachSpend(record.finance) : null;
            const benchmark = record.year === year ? null
              : nrlBoardBenchmark(record.year, record.clubId, pastPlaces.get(`${record.clubId}:${record.year - 1}`));
            return (
              <li key={record.year} className="space-y-1 py-3">
                <p className="font-bold">{record.year} {labelForClub(record.year, record.clubId)}</p>
                <p className="text-sm text-muted-foreground">Ladder place {record.rank} · {record.wins} wins · {record.draws} draws · {record.losses} losses</p>
                <p className="text-sm text-muted-foreground">Premiers {labelForClub(record.year, record.championId)}{record.finance ? ` · Profit or loss ${money(record.finance.profit)}` : ''}</p>
                {record.finance?.ticketTier && <p className="text-sm text-muted-foreground">Home ticket pricing {ticketLabels[record.finance.ticketTier]}</p>}
                {record.finance?.sponsor && <p className="text-sm text-muted-foreground">Sponsor income {money(nrlSponsorIncome(record.finance))}</p>}
                {benchmark && <p className="text-sm text-muted-foreground" data-nrl-board-benchmark>
                  Board benchmark · {benchmark.label} · {record.rank <= benchmark.targetRank ? 'Met' : 'Missed'}
                </p>}
                {points && <p className="text-sm text-muted-foreground" data-nrl-archived-scoring>
                  {tries ? `Try leader ${tries.name} (${tries.tries}) · ` : ''}Points leader {points.name} ({points.points})
                </p>}
                <ScoringHistory year={record.year} leaders={leaders} />
                {record.development && <p className="text-sm text-muted-foreground" data-nrl-development-receipt>
                  {developmentLabels[record.development.focus]} · {developmentSummary(record.development.focus, record.development.affected, false)}
                </p>}
                {record.reserveGrade && <p className="text-sm text-muted-foreground">
                  Reserve-grade development · {record.reserveGrade.playerName} · {record.reserveGrade.ratingGain
                    ? `${record.reserveGrade.rounds} rounds and one rating point`
                    : `Recalled after ${record.reserveGrade.rounds} ${record.reserveGrade.rounds === 1 ? 'round' : 'rounds'}`}
                </p>}
                {coach && staffSpend && <p className="text-sm text-muted-foreground" data-nrl-coach-receipt>
                  {coachLabels[coach.role]} · {money(staffSpend.signingFee + staffSpend.wages)} total staff cost
                </p>}
                <FinalsHistory record={record} season={career.season} />
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-3 text-sm text-muted-foreground">Your first season is in progress.</p>}
    </>
  );
}

export default function NrlCareerOffice({ career, screen, onAction, disabled }: {
  career: NrlCareerState; screen: OfficeScreen; onAction: Dispatch; disabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Club office">
      {screen === 'contracts' && <Contracts career={career} onAction={onAction} disabled={disabled} />}
      {screen === 'recruitment' && <Recruitment career={career} onAction={onAction} disabled={disabled} />}
      {screen === 'academy' && <Academy career={career} onAction={onAction} disabled={disabled} />}
      {screen === 'finances' && <Finances career={career} onAction={onAction} disabled={disabled} />}
      {screen === 'history' && <History career={career} onAction={onAction} disabled={disabled} />}
    </section>
  );
}
