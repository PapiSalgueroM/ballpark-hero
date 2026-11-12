import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nrlSeasonPlan, NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import {
  nrlAcademyAvailableRoles, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerSquad, nrlContractOffer,
  nrlCoachQuote, nrlCoachSpend, nrlDevelopmentPreview, nrlMedicalSpend, nrlMedicalUpgradeQuote, nrlOffseasonClubs, type NrlCareerAction, type NrlCareerState,
  type NrlDevelopmentFocus, type NrlMedicalLevel,
} from '@/lib/nrlCareer';
import { NRL_COACHING_BONUS, NRL_ROLES, type NrlCoachRole, type NrlRole } from '@/lib/nrlManager';
import { nrlArchivedScoringLeaders, nrlTryLeaders } from '@/lib/nrlPlayerScoring';
import { nrlBoardBenchmark, nrlBoardTarget } from '@/lib/nrlBoardTarget';

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
});
const money = (amount: number) => currency.format(amount);
const labelForClub = (year: number, id: string) => nrlSeasonPlan(year).clubs.find(club => club.id === id)?.shortName ?? id;

type OfficeScreen = 'contracts' | 'recruitment' | 'academy' | 'finances' | 'history';
type MarketEntry = ReturnType<typeof nrlCareerMarket>[number];
type CareerPlayer = ReturnType<typeof nrlCareerSquad>[number];
type Dispatch = (action: NrlCareerAction) => boolean;

const control = 'min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const developmentLabels = { balanced: 'Balanced', youth: 'Youth development', veterans: 'Veteran conditioning' };
const medicalLabels = { 1: 'Standard care', 2: 'Treatment room', 3: 'Recovery centre' };
const coachLabels = { attack: 'Attack assistant', defense: 'Defence assistant' };
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
  const preview = nrlContractOffer(career, entry.player.id, Number(salary), years);
  return (
    <form className="mt-3 rounded-xl border border-border bg-background p-3" onSubmit={event => {
      event.preventDefault();
      if (preview.ok && !disabled) onAction({ type: 'offerContract', playerId: entry.player.id, salary: Number(salary), years });
    }}>
      <h3 className="font-bold">Offer {entry.player.name} a contract</h3>
      <p className="mt-1 text-sm text-muted-foreground">Asking {money(entry.askingSalary)} per season · Starts {entry.startYear}</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <label className="min-w-0 space-y-1 text-sm font-semibold">
          <span>Annual salary (AUD)</span>
          <input className={control} type="number" inputMode="numeric" min={0} step={1} required value={salary}
            onChange={event => setSalary(event.target.value)} disabled={disabled} />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          <span>Term</span>
          <select className={control} value={years} disabled={disabled} onChange={event => setYears(Number(event.target.value))}>
            <option value={1}>1 season</option>
            <option value={2}>2 seasons</option>
            <option value={3}>3 seasons</option>
            <option value={4}>4 seasons</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-sm text-muted-foreground" role="status">
        {preview.ok === true ? `${money(preview.contract.salary)} per season through ${preview.contract.endYear}.` : preview.reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="lg" variant="outline" className="px-4" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" className="px-4" disabled={!preview.ok || disabled}>Agree contract</Button>
      </div>
    </form>
  );
}

function PlayerRow({ player, entry, career, onAction, disabled }: {
  player: CareerPlayer; entry?: MarketEntry; career: NrlCareerState; onAction: Dispatch; disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { contract, futureContract } = player;
  const action = entry?.kind === 'renewal' ? 'Extend' : 'Make offer';
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{player.name}</p>
          <p className="text-sm text-muted-foreground">{player.role} · Age {player.age} · {player.rating} OVR · {player.potential} potential</p>
          {contract && (
            <p className="text-sm text-muted-foreground">
              {entry?.kind === 'rival' ? `${labelForClub(career.season.year, contract.clubId)} · ` : ''}
              {money(contract.salary)} per season through {contract.endYear}
            </p>
          )}
          {entry && entry.kind !== 'renewal' && <p className="text-sm text-muted-foreground">Asks {money(entry.askingSalary)} · Available {entry.startYear}</p>}
          {futureContract && <p className="text-sm text-primary">Agreed through {futureContract.endYear} at {money(futureContract.salary)} per season</p>}
          {agreed && <p role="status" className="text-sm font-semibold text-primary">Contract agreed</p>}
        </div>
        {entry && !editing && <Button type="button" size="lg" variant="outline" className="px-3" disabled={disabled}
          onClick={() => { setAgreed(false); setEditing(true); }} aria-label={`${action} for ${player.name}`}>{action}</Button>}
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

function Contracts({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const squad = nrlCareerSquad(career);
  const offers = new Map(nrlCareerMarket(career).filter(entry => entry.kind === 'renewal').map(entry => [entry.player.id, entry]));
  const year = career.season.year;
  const expiring = squad.filter(player => player.contract?.endYear === year && !player.futureContract).length;
  return (
    <>
      <h2 className="font-display text-xl font-bold">Squad contracts</h2>
      <p className="mt-1 text-sm text-muted-foreground">{squad.length} players · {expiring} deals expire this season</p>
      <ul className="mt-3 divide-y divide-border">
        {squad.map(player => <PlayerRow key={player.id} player={player} entry={offers.get(player.id)} career={career} onAction={onAction} disabled={disabled} />)}
      </ul>
    </>
  );
}

function Recruitment({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const [role, setRole] = useState('');
  const [visible, setVisible] = useState(12);
  const market = useMemo(() => nrlCareerMarket(career).filter(entry => entry.kind !== 'renewal'), [career]);
  const filtered = role ? market.filter(entry => entry.player.role === role) : market;
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
      <label className="mt-3 block max-w-xs space-y-1 text-sm font-semibold">
        <span>Position</span>
        <select className={control} value={role} onChange={event => { setRole(event.target.value); setVisible(12); }}>
          <option value="">All positions</option>
          {NRL_ROLES.map(position => <option key={position}>{position}</option>)}
        </select>
      </label>
      {filtered.length ? (
        <ul className="mt-3 divide-y divide-border">
          {filtered.slice(0, visible).map(entry => <PlayerRow key={entry.player.id} player={entry.player} entry={entry} career={career} onAction={onAction} disabled={disabled} />)}
        </ul>
      ) : <p className="mt-3 text-sm text-muted-foreground">No eligible players at this position right now.</p>}
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

function MoneyRows({ entries }: { entries: readonly (readonly [string, number])[] }) {
  return (
    <dl className="mt-2 divide-y divide-border text-sm">
      {entries.map(([name, amount]) => (
        <div key={name} className="flex flex-wrap justify-between gap-x-3 py-2">
          <dt className="text-muted-foreground">{name}</dt><dd className="font-semibold tabular-nums">{money(amount)}</dd>
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
                ['Gate receipts', cash.gateReceipts], ['Wages paid', cash.wagesPaid],
                ['Operating costs', cash.operatingCosts],
                ...(medicalSpend ? [['Medical upgrades', medicalSpend] as [string, number]] : []),
                ...(cash.coachHire ? [['Coach signing fee', coachSpend.signingFee], ['Coach wages paid', coachSpend.wages]] as [string, number][] : []),
                ['Profit or loss', cash.profit], ['Cash balance', cash.cash],
              ]} />
            </>
          ) : <p className="mt-2 text-sm text-muted-foreground">This completed save predates club accounts. Tracking starts next season.</p>}
        </div>
      </div>
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

function History({ career, onAction, disabled }: { career: NrlCareerState; onAction: Dispatch; disabled: boolean }) {
  const { year, phase, clubId } = career.season;
  const finished = phase === 'complete';
  const target = nrlBoardTarget(career);
  const pastPlaces = new Map(career.history.map(record => [`${record.clubId}:${record.year}`, record.rank]));
  const [nextClubId, setNextClubId] = useState('');
  const clubs = nrlOffseasonClubs(career);
  const nextClub = clubs.find(club => club.id === nextClubId);
  return (
    <>
      <h2 className="font-display text-xl font-bold">Season review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {finished ? 'Review the year and settle your squad before the new season.' : 'Completed seasons stay here as your career moves on.'}
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
      {!career.legacySeason && year < NRL_LAST_YEAR && <DevelopmentFocus career={career} onAction={onAction} disabled={disabled} />}
      {finished && year < NRL_LAST_YEAR && (
        <Button type="button" size="lg" className="mt-3 w-full" disabled={disabled} onClick={() => onAction({ type: 'startNextSeason' })}>
          Start {year + 1}<ArrowRight aria-hidden="true" />
        </Button>
      )}
      {clubs.length > 0 && (
        <details className="group mt-3 rounded-xl border border-border bg-background px-3">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Change clubs for {year + 1}<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="space-y-2 pb-3 text-sm">
            <p className="text-muted-foreground">Take over the new club’s squad and contracts. If you return to a club, you resume its last balance and medical facilities.</p>
            <label className="block font-semibold" htmlFor="nrl-next-club">Club to manage</label>
            <select id="nrl-next-club" className={control} value={nextClubId} disabled={disabled} onChange={event => setNextClubId(event.target.value)}>
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
                {benchmark && <p className="text-sm text-muted-foreground" data-nrl-board-benchmark>
                  Board benchmark · {benchmark.label} · {record.rank <= benchmark.targetRank ? 'Met' : 'Missed'}
                </p>}
                {points && <p className="text-sm text-muted-foreground" data-nrl-archived-scoring>
                  {tries ? `Try leader ${tries.name} (${tries.tries}) · ` : ''}Points leader {points.name} ({points.points})
                </p>}
                {record.development && <p className="text-sm text-muted-foreground" data-nrl-development-receipt>
                  {developmentLabels[record.development.focus]} · {developmentSummary(record.development.focus, record.development.affected, false)}
                </p>}
                {coach && staffSpend && <p className="text-sm text-muted-foreground" data-nrl-coach-receipt>
                  {coachLabels[coach.role]} · {money(staffSpend.signingFee + staffSpend.wages)} total staff cost
                </p>}
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
