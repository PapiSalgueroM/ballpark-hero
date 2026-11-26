import { useState } from 'react';
import { moneyIn, type CareerState } from '@/lib/clubManager';
import {
  buySeniorClub, chooseSeniorPlan, seniorClubOf, seniorMatchdays, seniorPreseason, seniorStandings,
  CIRCUIT_DATES, CIRCUIT_FINANCES, SECOND_CLUB_FACILITIES, SECOND_CLUB_PRICE, SECOND_CLUB_RESERVE, SECOND_CLUB_SQUAD_COST, SENIOR_CIRCUIT,
} from '@/lib/clubManagerSecondClub';
import type { StandingRow } from '@/lib/season/core';

function CircuitTable({ rows }: { rows: StandingRow[] }) {
  return <table className="w-full text-left text-xs tabular-nums">
    <caption className="sr-only">Senior circuit standings</caption>
    <thead><tr>{['Club', 'W', 'D', 'L', 'Pts'].map(h => <th key={h} scope="col" className="py-1">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={row.slot} className={row.slot === 0 ? 'font-bold text-primary' : ''}>
      <th scope="row" className="py-1 font-medium">{i + 1}. {SENIOR_CIRCUIT[row.slot]}</th>
      <td>{row.w}</td><td>{row.d}</td><td>{row.l}</td><td>{row.pts}</td>
    </tr>)}</tbody>
  </table>;
}

export default function SecondClubPanel({ career, onCommit }: {
  career: CareerState; onCommit?: (make: (current: CareerState) => CareerState | null) => boolean;
}) {
  const [notice, setNotice] = useState('');
  const club = seniorClubOf(career), money = moneyIn(career), name = SENIOR_CIRCUIT[0];
  const preseason = seniorPreseason(career);
  const facility = career.academy?.facilities ?? 0;
  const actionable = !!onCommit && preseason;
  const button = 'min-h-11 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50';
  const commit = (make: (c: CareerState) => CareerState | null) => {
    if (onCommit) setNotice(onCommit(make) ? '' : 'The club could not save this decision. Reopen the active career and check the terms.');
  };
  const closed = club?.history.find(r => r.season === career.season);
  const plan = club?.order?.season === career.season ? club.order.plan : undefined;
  const dates = closed ? CIRCUIT_DATES : seniorMatchdays(career);
  const { operatingIncome, runningCosts, placeBonus } = CIRCUIT_FINANCES;
  if (!onCommit && !club) return null;
  return <details className="mt-3 rounded-xl border border-border bg-card px-3 text-left text-sm">
    <summary className="min-h-11 cursor-pointer py-3 font-bold">{club ? name + ' boardroom' : 'Buy a second club'}</summary>
    <div className="space-y-3 pb-3">
      {!club && career.seniorClub !== undefined ? <p>Unable to read the saved ownership record.</p> : !club ? <>
        <p>Buy {name}, a fictional senior club, for {money(SECOND_CLUB_PRICE)}. The price includes {money(SECOND_CLUB_RESERVE)} for its own board to run the team.</p>
        <p>Academy facilities level {facility} · Level {SECOND_CLUB_FACILITIES} required · Transfer budget {money(career.budget)}</p>
        <p>Sales open before the first fixture. Your club keeps ownership if you take another job.</p>
        <button type="button" className={button} disabled={!actionable || facility < SECOND_CLUB_FACILITIES || career.budget < SECOND_CLUB_PRICE}
          onClick={() => commit(c => buySeniorClub(c, career.clubName, career.season))}>Buy {name} for {money(SECOND_CLUB_PRICE)}</button>
      </> : <>
        <p>Owned by <strong>{club.parent}</strong> since season {club.bought} · Club cash <strong>{money(club.balance)}</strong></p>
        {actionable && club.parent === career.clubName && !plan && !closed ? <>
          <p>Spend {money(SECOND_CLUB_SQUAD_COST)} on the squad for this season to improve its chances at both ends, or keep the cash. Unspent funds carry forward.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={club.balance < SECOND_CLUB_SQUAD_COST}
              onClick={() => commit(c => chooseSeniorPlan(c, career.clubName, career.season, 'squad'))}>Strengthen squad · {money(SECOND_CLUB_SQUAD_COST)}</button>
            <button type="button" className={button} onClick={() => commit(c => chooseSeniorPlan(c, career.clubName, career.season, 'reserve'))}>Keep cash in reserve</button>
          </div>
        </> : <p>{plan === 'squad' ? 'Squad investment' : 'Cash in reserve'} · Season {career.season}{club.parent !== career.clubName && ' · Decisions belong to the parent club'}</p>}
        <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Senior circuit · {dates}/{CIRCUIT_DATES} matchdays</summary>
          <p className="mb-2">Eight fictional clubs play home and away. See new results as the league calendar advances. The board closes its accounts at season end.</p>
          <CircuitTable rows={closed?.table ?? seniorStandings(club, career.season, dates)} />
        </details>
        {club.history.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Season accounts ({club.history.length})</summary>
          {[...club.history].reverse().map(r => {
            const position = r.table.findIndex(t => t.slot === 0) + 1;
            return <details className="border-t border-border" key={r.season}>
              <summary className="min-h-11 cursor-pointer py-3">Season {r.season} · #{position} · {r.table[position - 1].pts} pts</summary>
              <p>Opening cash {money(r.opening)} · Squad spend {money(r.spend)}</p>
              <p>Operating income and prize money {money(r.income)} · Running costs {money(r.runningCosts)}</p>
              <p className="mb-2">Closing cash {money(r.closing)}</p><CircuitTable rows={r.table} />
            </details>;
          })}
        </details>}
      </>}
      {(club || career.seniorClub === undefined) && <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">How the second club earns money</summary>
        <p>Its gates and sponsors bring in {money(operatingIncome)} per season. Running costs are {money(runningCosts)}. Each place above eighth adds {money(placeBonus)} in prize money.</p>
        <p>Finish fourth and the board banks {money(operatingIncome - runningCosts + (SENIOR_CIRCUIT.length - 4) * placeBonus)} after running costs, before any squad investment. All earnings stay with the second club.</p>
      </details>}
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>;
}
